/**
 * PEACOCK MASCOT — controller for the server-rendered SVG in
 * src/components/Peacock.astro. Lazy-loaded by src/scripts/main.ts when the
 * browser is idle (never during prerender).
 *
 *  • Gaze: eyes follow the cursor (desktop) or the scroll (touch); idle glances.
 *  • Idle life: breathing, a gentle tail sway, blinks every 2.5–6s (sometimes
 *    double), a head tilt every 6–12s, a wing flap every 15–30s.
 *  • Hover / click / Enter / Space: the tail fans with a shimmer (~1.6s);
 *    pressing again while fanned adds a hop. Phones: a tap pops it up from its peek.
 *  • Page reactions: window event `sa:peacock` with detail.action
 *    'celebrate' | 'wave' (+ 'fan' | 'hop' | 'flap' | 'blink' | 'look' for QA);
 *    waves once when the footer first comes into view.
 *  • Reduced motion (html.reduce-motion, live via `sa:motion-change`): no loops,
 *    no tracking, a static friendly pose; pressing crossfades to the fanned pose.
 *  • Pauses when the tab is hidden, the mascot is switched off, or a dialog is open.
 */
import { gsap } from 'gsap';
import { isReducedMotion } from '../lib/env';
import * as moves from './rig';
import { createGaze } from './gaze';
import { createStage } from './stage';

export type PeacockAction = 'celebrate' | 'wave' | 'fan' | 'hop' | 'flap' | 'blink' | 'look';

/** Calls `fn` again and again after a random delay (seconds) between min and max. */
function every(min: number, max: number, fn: () => void) {
  let call: gsap.core.Tween | undefined;
  const next = () => {
    call = gsap.delayedCall(gsap.utils.random(min, max), () => {
      fn();
      next();
    });
  };
  return {
    start() {
      call?.kill();
      next();
    },
    stop() {
      call?.kill();
      call = undefined;
    },
  };
}

export function initPeacock(): void {
  const host = document.querySelector<HTMLElement>('[data-peacock]');
  const btn = host?.querySelector<HTMLButtonElement>('.peacock__btn');
  const art = host?.querySelector<SVGSVGElement>('.peacock__svg');
  if (!host || !btn || !art || host.hasAttribute('data-peacock-ready')) return;
  host.setAttribute('data-peacock-ready', '');
  const root: HTMLElement = host;
  const button: HTMLButtonElement = btn;
  const svg: SVGSVGElement = art;

  const html = document.documentElement;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const rig = moves.createRig(svg);
  const gaze = createGaze(rig, root);

  let reduced = isReducedMotion();
  let tracking = false;
  let fanTl: gsap.core.Timeline | null = null;
  let hopTl: gsap.core.Timeline | null = null;
  let wingTl: gsap.core.Timeline | null = null;
  let crossTl: gsap.core.Timeline | null = null;
  let lastHoverFan = 0;
  let popTimer = 0;
  let pendingWave = false;

  /* ───────────── Activity: pause everything while it can't be seen ───────────── */
  const visible = () => !document.hidden && !html.classList.contains('peacock-hidden') && !html.classList.contains('scroll-locked');

  let loops: gsap.core.Tween[] = [];
  function startLoops() {
    if (loops.length) return;
    loops = [
      gsap.to(rig.torso, { scaleY: 1.014, scaleX: 0.994, duration: 1.9, ease: 'sine.inOut', yoyo: true, repeat: -1, overwrite: 'auto' }),
      gsap.fromTo(rig.tail, { rotation: -0.6 }, { rotation: 0.6, duration: 2.7, ease: 'sine.inOut', yoyo: true, repeat: -1, overwrite: 'auto' }),
    ];
  }
  function stopLoops(instant = false) {
    loops.forEach((t) => t.kill());
    loops = [];
    if (instant) gsap.set(rig.torso, { scaleX: 1, scaleY: 1 });
    else gsap.to(rig.torso, { scaleX: 1, scaleY: 1, duration: 0.35, ease: 'power2.out', overwrite: 'auto' });
    gsap.to(rig.tail, { rotation: 0, duration: instant ? 0 : 0.35, ease: 'power2.out', overwrite: 'auto' });
  }

  const tilt = { deg: 0 };
  let tiltTl: gsap.core.Timeline | null = null;
  const idle = [
    every(2.5, 6, () => moves.blink(rig, Math.random() < 0.22)),
    every(6, 12, () => {
      const deg = gsap.utils.random(3, 6) * (Math.random() < 0.5 ? -1 : 1);
      tiltTl = gsap
        .timeline({ onUpdate: () => gaze.tilt(tilt.deg) })
        .to(tilt, { deg, duration: 0.5, ease: 'power2.out' })
        .to(tilt, { deg: 0, duration: 0.6, ease: 'power2.inOut' }, '+=0.9');
    }),
    every(15, 30, () => {
      if (!wingTl?.isActive()) wingTl = moves.flap(rig, 2);
    }),
    every(2.4, 4.8, () => {
      if (!tracking || gaze.idleFor() > 3500) gaze.glance();
    }),
  ];

  function pause() {
    stopLoops();
    idle.forEach((s) => s.stop());
    if (tiltTl?.isActive()) {
      tiltTl.kill();
      gsap.to(tilt, { deg: 0, duration: 0.3, onUpdate: () => gaze.tilt(tilt.deg) });
    }
  }
  function resume() {
    if (reduced || !visible() || stage.tucked) return;
    startLoops();
    idle.forEach((s) => s.start());
  }
  const syncActivity = () => (visible() && !reduced ? resume() : pause());

  /* ───────────── Staying out of the way ───────────── */
  const stage = createStage(root, {
    onScrollStart: pause,
    onScroll(dy) {
      if (!tracking && !reduced) gaze.scrolled(dy);
    },
    onScrollEnd(progress) {
      if (!tracking && !reduced) gaze.settle(progress);
      resume();
      if (pendingWave) act('wave');
    },
  });

  /** Phones: rise out of the peek for `ms`, then sink back (unless the button has keyboard focus). */
  function popFor(ms: number) {
    if (!stage.isPeek() || reduced) return;
    window.clearTimeout(popTimer);
    stage.pop(true);
    popTimer = window.setTimeout(() => {
      if (!(document.activeElement === button && button.matches(':focus-visible'))) stage.pop(false);
    }, ms);
  }

  /* ───────────── Moves ───────────── */
  function fanOut(): void {
    if (reduced) {
      if (!crossTl?.isActive()) crossTl = moves.fanCrossfade(rig);
      return;
    }
    fanTl?.kill();
    fanTl = moves.fan(rig);
  }

  function hopOnce(): void {
    if (!hopTl?.isActive()) hopTl = moves.hop(rig);
  }

  function act(action: PeacockAction | string): void {
    if (action === 'wave') pendingWave = false;
    if (!visible()) return;
    if (reduced) {
      // Calm fallback: only the fanned pose, as a crossfade.
      if (action === 'celebrate' || action === 'fan') fanOut();
      return;
    }
    switch (action) {
      case 'celebrate':
        // Flap + fan + hop + sparkle (independent timelines, so a later press never strands the hop mid-air).
        popFor(2600);
        moves.chirp(rig);
        wingTl = moves.flap(rig, 3);
        fanTl?.kill();
        fanTl = moves.fan(rig).delay(0.08);
        if (!hopTl?.isActive()) hopTl = moves.hop(rig).delay(0.3);
        moves.sparkle(rig).delay(0.32);
        break;
      case 'wave':
        if (stage.tucked) {
          pendingWave = true; // play it once scrolling stops
          return;
        }
        popFor(2400);
        wingTl = moves.wave(rig);
        break;
      case 'fan':
        popFor(2200);
        fanOut();
        break;
      case 'hop':
        popFor(1400);
        hopOnce();
        break;
      case 'flap':
        wingTl = moves.flap(rig, 2);
        break;
      case 'blink':
        moves.blink(rig, true);
        break;
      case 'look':
        gaze.glance();
        break;
    }
  }

  /* ───────────── Interaction ───────────── */
  button.addEventListener('click', () => {
    if (reduced) return fanOut();
    if (fanTl?.isActive()) {
      // Pressed again while fanned: a little hop, and the fan holds a moment longer.
      hopOnce();
      moves.chirp(rig);
      if (fanTl.time() > 0.8) fanOut();
      popFor(2000);
      return;
    }
    popFor(2200);
    fanOut();
  });
  button.addEventListener('pointerenter', (e) => {
    if (e.pointerType !== 'mouse' || reduced || fanTl?.isActive()) return;
    const now = performance.now();
    if (now - lastHoverFan < 2500) return;
    lastHoverFan = now;
    fanOut();
  });
  // Keyboard users on phones: rise out of the peek so the focus ring is visible.
  button.addEventListener('focus', () => {
    if (button.matches(':focus-visible')) popFor(60_000);
  });
  button.addEventListener('blur', () => {
    window.clearTimeout(popTimer);
    stage.pop(false);
  });

  window.addEventListener('sa:peacock', (e) => {
    const action = (e as CustomEvent<{ action?: string } | undefined>).detail?.action;
    if (action) act(action);
  });

  // Wave once when the footer first comes into view.
  const footer = document.querySelector('[data-footer]');
  if (footer && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((en) => en.isIntersecting)) return;
        io.disconnect();
        if (reduced) return;
        pendingWave = true;
        if (!stage.tucked) act('wave');
      },
      { rootMargin: '0px 0px -12% 0px' },
    );
    io.observe(footer);
  }

  /* ───────────── Modes ───────────── */
  /** Static, friendly pose: looking a little up and toward the page. */
  const friendlyPose = () => gaze.look(-0.35, -0.25, true);

  function applyMode() {
    reduced = isReducedMotion();
    if (reduced) {
      [fanTl, hopTl, wingTl].forEach((t) => t?.kill());
      fanTl = hopTl = wingTl = null;
      window.clearTimeout(popTimer);
      stage.pop(false);
      pause();
      stopLoops(true);
      tiltTl?.kill();
      gsap.killTweensOf(tilt);
      tilt.deg = 0;
      moves.restPose(rig);
      gaze.track(false);
      tracking = false;
      gaze.tilt(0);
      friendlyPose();
      return;
    }
    crossTl?.kill();
    moves.dropCrossfade(rig);
    tracking = finePointer.matches && !stage.isPeek();
    gaze.track(tracking);
    if (!tracking) gaze.look(0, 0);
    syncActivity();
  }

  window.addEventListener('sa:motion-change', applyMode);
  window.addEventListener('sa:peacock-visibility', syncActivity);
  window.addEventListener('sa:scroll-lock', syncActivity);
  window.addEventListener('sa:scroll-unlock', syncActivity);
  document.addEventListener('visibilitychange', syncActivity);
  window.addEventListener('pageshow', () => {
    gaze.measure();
    stage.refresh();
    syncActivity();
  });
  finePointer.addEventListener('change', applyMode);
  window.matchMedia('(max-width: 47.99rem)').addEventListener('change', applyMode);

  let resizeFrame = 0;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      gaze.measure();
      stage.refresh();
    });
  });

  applyMode();
}
