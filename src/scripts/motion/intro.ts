/**
 * Home-page signature intro — ≈4.2s, first page of a visit only, skippable.
 *
 *   0.10–0.95  the logo draws itself in gold line work at centre stage
 *   0.85–1.45  the real logo appears beneath the lines; the peacock pops up just behind its rim
 *   1.55–2.60  the peacock nuzzles the logo twice (it wobbles, gold sparkles fly),
 *              fans its tail with pride and blinks happily
 *   2.60–3.50  the logo rolls like a coin into place — onto the hero medallion, or onto
 *              the header logo when the medallion is below the fold — as the curtain lifts
 *   2.85–4.20  the peacock hops down to its corner, shrinking as it goes, and turns
 *              around to face the page (phones: it sinks into its bottom-left peek)
 *   3.15–4.20  the headline rises word by word; lead, buttons and header follow
 *
 * The logo always finishes upright (it rolls whole turns) and lands exactly on
 * the real one, which then takes over. Any key, click, wheel or touch (or the
 * "Skip intro" button) fast-forwards. With the peacock switched off, the logo
 * still draws and rolls. Reduced motion never plays the intro (HeadScripts).
 * The peacock controller waits for `sa:intro-done` before it takes over.
 * Transforms and opacity only — nothing here causes a layout shift.
 */
import { gsap } from 'gsap';
import type Lenis from 'lenis';
import { afterFontsAndPaint } from '../lib/env';
import { blink, chirp, createRig, fan, flap, restPose } from '../peacock/rig';

interface IntroDeps {
  lenis: Lenis | null;
  playHeroSplit: (el: HTMLElement, delay?: number) => gsap.core.Tween | null;
  markRevealed: (els: Element[]) => void;
}

const root = document.documentElement;

function releasePage() {
  root.classList.add('intro-done');
  root.classList.remove('intro-running');
  document.querySelectorAll<HTMLElement>('[data-intro-inert]').forEach((el) => (el.inert = false));
  window.dispatchEvent(new CustomEvent('sa:intro-done'));
}

/** Where the logo and the peacock stand on the curtain, from the viewport alone. */
function stage(withBird: boolean, heroTarget: boolean) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const phone = vw < 768;
  const r = phone ? Math.min(vw * 0.24, 100) : Math.max(90, Math.min(vw * 0.15, vh * 0.2, 150));
  const cy = vh * (phone ? 0.42 : 0.46);
  if (!withBird) return { r, cx: vw / 2, cy, bird: null };

  // The peacock stands to the logo's left, just behind its rim, facing it. Facing right,
  // its face reaches 87% across its box and its beak sits 32% down (art viewBox 0 0 200 250).
  const H = (phone ? 1.9 : 2.2) * r;
  const W = H * 0.8;
  const gap = Math.max(6, r * 0.05);
  const faceX = W * 0.87;
  const minCx = 24 + faceX + gap + r;
  const centred = (vw - (faceX + gap + 2 * r)) / 2 + faceX + gap + r;
  // On wide screens the logo starts a little left of centre so its roll to the hero is long enough to read.
  const cx = Math.max(minCx, heroTarget && vw >= 1024 ? Math.min(centred, vw * 0.42) : centred);
  const top = cy - r * 0.15 - H * 0.32;
  return { r, cx, cy, bird: { left: cx - r - gap - faceX, top, H } };
}

const STAR = 'M0-5C.6-1.2 1.2-.6 5 0 1.2.6.6 1.2 0 5-.6 1.2-1.2.6-5 0-1.2-.6-.6-1.2 0-5Z';

export async function playIntro({ lenis, playHeroSplit, markRevealed }: IntroDeps): Promise<void> {
  const intro = document.querySelector<HTMLElement>('[data-intro]');
  const hero = document.querySelector<HTMLElement>('[data-intro-hero]');
  const title = hero?.querySelector<HTMLElement>('[data-hero-split]') ?? null;
  const reveals = hero ? Array.from(hero.querySelectorAll<HTMLElement>('[data-reveal]')) : [];

  // The safety timeout already lifted the curtain (slow network) — just reveal the hero normally.
  if (!intro || !hero || root.classList.contains('intro-done')) {
    releasePage();
    intro?.remove();
    if (title) playHeroSplit(title, 0.05);
    gsap.to(reveals, { opacity: 1, y: 0, duration: 0.9, stagger: 0.08, onComplete: () => markRevealed(reveals) });
    hero?.querySelectorAll<HTMLElement>('[data-rosette]').forEach((el) => gsap.fromTo(el, { '--sweep': '0deg' }, { '--sweep': '360deg', duration: 2, ease: 'power2.inOut' }));
    return;
  }

  root.classList.add('intro-running');
  lenis?.stop();

  const curtain = intro.querySelector<HTMLElement>('[data-intro-curtain]');
  const lineart = intro.querySelector<SVGSVGElement>('[data-intro-lineart]');
  const logo = intro.querySelector<HTMLImageElement>('[data-intro-logo]');
  const skipBtn = intro.querySelector<HTMLButtonElement>('[data-intro-skip]');
  const medallion = hero.querySelector<HTMLElement>('[data-hero-medallion]');
  const medallionImg = medallion?.querySelector('img') ?? null;
  const shine = hero.querySelector<HTMLElement>('.hero__shine');
  const rosette = hero.querySelector<HTMLElement>('[data-rosette]');
  const sweep = hero.querySelector<HTMLElement>('.hero__sweep');
  const header = document.querySelector<HTMLElement>('[data-header]');
  const headerMark = header?.querySelector<HTMLElement>('.logo__mark') ?? null;

  // The peacock joins in unless it is switched off (or not on the page).
  const bird = document.querySelector<HTMLElement>('[data-peacock-root]');
  const birdSvg = bird?.querySelector<SVGSVGElement>('.peacock__svg') ?? null;
  const birdBtn = bird?.querySelector<HTMLElement>('.peacock__btn') ?? null;
  const withBird = !!(bird && birdSvg && birdBtn && !root.classList.contains('peacock-hidden'));
  // Phones show the mascot mirrored (facing right) already; elsewhere it turns to face the logo.
  const mirroredAtRest = window.matchMedia('(max-width: 47.99rem)').matches;

  // Where the logo lands: the hero medallion when it is fully on screen, otherwise the header logo.
  const vh = window.innerHeight;
  const heroRect = medallion?.getBoundingClientRect();
  const heroTarget = !!heroRect && heroRect.width > 60 && heroRect.top >= 0 && heroRect.bottom <= vh;
  const landEl = heroTarget ? medallion : headerMark;
  const land = landEl?.getBoundingClientRect() ?? null;

  const S = stage(withBird, heroTarget);
  const D = S.r * 2;

  // Line art and the logo stand at centre stage (transforms only).
  if (lineart) {
    lineart.style.translate = `${S.cx - S.r}px ${S.cy - S.r}px`;
    lineart.style.scale = String(D / 720);
    lineart.style.visibility = 'visible';
  }

  // Fetch (or reuse the head script's early fetch of) the gold line art, then
  // split the headline into words while the curtain still hides it.
  const artPromise: Promise<string> =
    (window as Window & { __saLineart?: Promise<string> }).__saLineart ??
    (lineart?.dataset.src ? fetch(lineart.dataset.src).then((r) => r.text()) : Promise.resolve(''));
  const [art] = await Promise.all([artPromise.catch(() => ''), afterFontsAndPaint()]);
  if (lineart && art) {
    const doc = new DOMParser().parseFromString(art, 'image/svg+xml');
    lineart.replaceChildren(...Array.from(doc.documentElement.childNodes).map((n) => document.importNode(n, true)));
  }

  // The rolling logo is a copy of the hero's own image (already loaded, so no extra download).
  if (logo && medallionImg) {
    logo.src = medallionImg.currentSrc || medallionImg.src;
    await Promise.race([logo.decode().catch(() => undefined), new Promise((r) => setTimeout(r, 600))]);
    Object.assign(logo.style, { width: `${D}px`, height: `${D}px` });
    gsap.set(logo, { x: S.cx - S.r, y: S.cy - S.r, transformOrigin: '50% 50%', opacity: 0, scale: 0.94, visibility: 'visible' });
  }

  let titleTween: gsap.core.Tween | null = null;
  if (title) {
    titleTween = playHeroSplit(title, 0);
    titleTween?.pause(0);
  }
  gsap.set(reveals, { opacity: 0, y: (_i, el: HTMLElement) => (el.dataset.reveal === 'fade' ? 0 : 22) });
  if (header) gsap.set(header, { opacity: 0, y: -18 });
  if (shine) gsap.set(shine, { xPercent: -70 });
  // The real logo waits out of sight until the rolling copy lands on it.
  if (land && landEl && logo) gsap.set(landEl, { visibility: 'hidden' });
  // The skip button fades in via CSS; hand it to GSAP so it can fade out again.
  if (skipBtn) {
    const current = getComputedStyle(skipBtn).opacity;
    skipBtn.style.animation = 'none';
    gsap.fromTo(skipBtn, { opacity: Number(current) }, { opacity: 1, duration: 0.4 });
  }

  const paths = (name: string) => lineart?.querySelectorAll<SVGPathElement>(`[data-group="${name}"] path`) ?? [];

  const skipEvents: (keyof WindowEventMap)[] = ['keydown', 'wheel', 'touchstart', 'pointerdown'];
  let tl: gsap.core.Timeline;
  const skip = () => {
    if (tl && tl.progress() < 1) tl.timeScale(6);
    titleTween?.timeScale(4);
  };
  // A real resize fast-forwards (positions were measured for the old size). Phones fire
  // resize when the address bar slides, so only a change of width counts.
  const startWidth = window.innerWidth;
  const onResize = () => {
    if (Math.abs(window.innerWidth - startWidth) > 2) skip();
  };

  /* ───────────── The peacock: set up beside the logo ───────────── */
  const rig = withBird && birdSvg ? createRig(birdSvg) : null;
  let birdFrom = { x: 0, y: 0, s: 1 };
  if (withBird && bird && birdBtn && rig && S.bird) {
    const rest = bird.getBoundingClientRect();
    const s = S.bird.H / rest.height;
    birdFrom = { x: S.bird.left - rest.left, y: S.bird.top - rest.top, s };
    gsap.set(bird, { transformOrigin: '0 0', x: birdFrom.x, y: birdFrom.y + 30, scale: s * 0.9, opacity: 0 });
    if (!mirroredAtRest) gsap.set(birdBtn, { scaleX: -1, transformOrigin: '50% 50%' });
    // Eyes on the logo (art coordinates: the logo is on the bird's beak side).
    gsap.set(rig.irises, { x: (i: number) => -(rig.irisMax[i]?.[0] ?? 0) * 0.85, y: (i: number) => (rig.irisMax[i]?.[1] ?? 0) * 0.35 });
  }

  // Gold sparkles where beak meets logo.
  const sparks: HTMLElement[] = [];
  if (withBird) {
    for (let i = 0; i < 3; i++) {
      const el = document.createElement('span');
      el.className = 'intro__spark';
      el.innerHTML = `<svg viewBox="-5 -5 10 10" aria-hidden="true"><path d="${STAR}"/></svg>`;
      intro.append(el);
      sparks.push(el);
    }
    const k = S.r / 120;
    const cx = S.cx - S.r;
    const cy = S.cy - S.r * 0.15;
    const at: Array<[number, number, number]> = [
      [-8, -30, 1],
      [12, -46, 0.7],
      [-18, 4, 0.8],
    ];
    gsap.set(sparks, { x: (i: number) => cx + (at[i]?.[0] ?? 0) * k, y: (i: number) => cy + (at[i]?.[1] ?? 0) * k, scale: 0, opacity: 0 });
    gsap.set(sparks, { width: 16 * k, height: 16 * k });
  }

  const finish = () => {
    releasePage();
    window.removeEventListener('resize', onResize);
    skipEvents.forEach((ev) => window.removeEventListener(ev, skip));
    if (landEl) gsap.set(landEl, { clearProps: 'visibility' });
    if (bird && birdBtn && rig) {
      gsap.set([bird, birdBtn], { clearProps: 'all' });
      restPose(rig);
      gsap.set([rig.head, rig.face, ...rig.irises], { x: 0, y: 0, rotation: 0 });
    }
    lenis?.start();
    window.setTimeout(() => intro.remove(), 50);
  };

  /* ───────────── The timeline ───────────── */
  const T = withBird
    ? { birdIn: 0.95, nuzzle1: 1.55, nuzzle2: 2.15, happy: 2.5, roll: 2.6, hops: 2.85 }
    : { birdIn: 0, nuzzle1: 0, nuzzle2: 0, happy: 0, roll: 1.45, hops: 0 };
  const rollDur = 0.9;
  const landAt = T.roll + rollDur;

  tl = gsap.timeline({ defaults: { ease: 'power2.inOut' }, onComplete: finish });

  // 1. The logo draws itself, then the real logo fades in beneath the lines.
  tl.to(paths('rings'), { strokeDashoffset: 0, duration: 0.8, stagger: 0.04 }, 0.1)
    .to(paths('monogram'), { strokeDashoffset: 0, duration: 0.8, stagger: 0.01 }, 0.22)
    .to(paths('wordmark'), { strokeDashoffset: 0, duration: 0.6, stagger: 0.006 }, 0.4)
    .to(paths('tagline'), { strokeDashoffset: 0, duration: 0.5, stagger: 0.006 }, 0.5)
    .to(paths('leaf'), { strokeDashoffset: 0, duration: 0.5, stagger: 0.03 }, 0.6);
  if (logo) tl.to(logo, { opacity: 1, scale: 1, duration: 0.35, ease: 'power2.out' }, 0.85);
  if (lineart) tl.to(lineart, { opacity: 0, duration: 0.4, ease: 'power1.out' }, 1.0);

  // 2. The peacock pops up beside it, then nuzzles it twice.
  if (withBird && bird && rig) {
    tl.to(bird, { opacity: 1, y: birdFrom.y, scale: birdFrom.s, duration: 0.5, ease: 'back.out(1.7)' }, T.birdIn);
    tl.add(blink(rig), T.birdIn + 0.35);

    const nuzzle = (at: number, deg: number, push: number) => {
      tl.to(rig.head, { rotation: -deg, duration: 0.2, ease: 'power2.out' }, at)
        .to(rig.bird, { rotation: -3, x: -3, duration: 0.2, ease: 'power2.out' }, at)
        .to(rig.head, { rotation: 0, duration: 0.34, ease: 'back.out(2)' }, at + 0.26)
        .to(rig.bird, { rotation: 0, x: 0, duration: 0.34, ease: 'power2.out' }, at + 0.26);
      if (logo) {
        const x0 = S.cx - S.r;
        tl.to(logo, { rotation: push, x: x0 + push * 0.8, duration: 0.14, ease: 'power2.out' }, at + 0.14).to(
          logo,
          { rotation: 0, x: x0, duration: 0.45, ease: 'elastic.out(1, 0.4)' },
          at + 0.28,
        );
      }
      tl.fromTo(sparks, { scale: 0, rotation: -50, opacity: 1 }, { scale: 1, rotation: 20, duration: 0.3, ease: 'back.out(3)', stagger: 0.05 }, at + 0.16).to(
        sparks,
        { scale: 0, rotation: 70, opacity: 0, duration: 0.24, ease: 'power2.in', stagger: 0.05 },
        at + 0.42,
      );
    };
    nuzzle(T.nuzzle1, 15, 5);
    nuzzle(T.nuzzle2, 19, 7);
    tl.add(fan(rig), T.nuzzle2 + 0.05);
    tl.add(blink(rig, true), T.happy);
    tl.add(chirp(rig), T.happy);
  }

  // 3. The logo rolls into place — whole turns, so it lands upright — and the curtain lifts.
  if (logo && land) {
    const tx = land.left + land.width / 2;
    const ty = land.top + land.height / 2;
    const dx = tx - S.cx;
    const dist = Math.hypot(dx, ty - S.cy);
    const turns = Math.max(1, Math.round(dist / (Math.PI * ((D + land.width) / 2))));
    tl.to(logo, { x: tx - S.r, y: ty - S.r, scale: land.width / D, rotation: (dx >= 0 ? 1 : -1) * 360 * turns, duration: rollDur, ease: 'power2.inOut' }, T.roll);
    tl.add(() => {
      if (landEl) gsap.set(landEl, { clearProps: 'visibility' });
      gsap.set(logo, { visibility: 'hidden' });
    }, landAt);
  } else if (logo) {
    tl.to(logo, { opacity: 0, scale: 0.9, duration: 0.5, ease: 'power2.in' }, T.roll);
  }
  if (curtain) tl.to(curtain, { opacity: 0, duration: 0.6, ease: 'power2.out' }, T.roll + 0.1);
  if (skipBtn) tl.to(skipBtn, { opacity: 0, duration: 0.3 }, T.roll);
  if (sweep) tl.fromTo(sweep, { xPercent: -45 }, { xPercent: 0, duration: 2.2, ease: 'power2.out', clearProps: 'transform' }, T.roll + 0.1);
  if (rosette && heroTarget) tl.fromTo(rosette, { '--sweep': '0deg' }, { '--sweep': '360deg', duration: 1.6, ease: 'power2.inOut' }, T.roll + 0.5);
  if (shine && heroTarget) tl.to(shine, { xPercent: 70, duration: 1.1, ease: 'power2.inOut' }, landAt);

  // 4. The peacock watches it go, then hops down to its corner and turns to face the page.
  if (withBird && bird && birdBtn && rig) {
    tl.add(flap(rig, 2), T.roll + 0.05);
    const hops = 3;
    const hd = 0.34;
    for (let k = 1; k <= hops; k++) {
      const f = k / hops;
      const at = T.hops + (k - 1) * hd;
      const ty = birdFrom.y * (1 - f);
      const lift = (S.bird?.H ?? 200) * 0.14 * (1 - f * 0.55);
      tl.to(bird, { x: birdFrom.x * (1 - f), scale: birdFrom.s + (1 - birdFrom.s) * f, duration: hd, ease: 'none' }, at)
        .to(bird, { y: ty - lift, duration: hd / 2, ease: 'power2.out' }, at)
        .to(bird, { y: ty, duration: hd / 2, ease: 'power2.in' }, at + hd / 2)
        .to(rig.bird, { scaleY: 0.9, scaleX: 1.06, duration: 0.06, ease: 'power1.out' }, at + hd - 0.03)
        .to(rig.bird, { scaleY: 1, scaleX: 1, duration: 0.2, ease: 'back.out(3)' }, at + hd + 0.03);
    }
    const home = T.hops + hops * hd;
    tl.to(rig.irises, { x: 0, y: 0, duration: 0.3, ease: 'power2.out' }, home);
    if (!mirroredAtRest) tl.to(birdBtn, { scaleX: 1, duration: 0.28, ease: 'power2.inOut' }, home + 0.05);
  }

  // 5. The headline, lead, buttons and header.
  if (titleTween) tl.add(() => void titleTween?.play(0), T.roll + 0.55);
  tl.to(reveals, { opacity: 1, y: 0, duration: 0.9, ease: 'expo.out', stagger: 0.09, onComplete: () => markRevealed(reveals) }, T.roll + 0.8);
  if (header) tl.to(header, { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out', clearProps: 'opacity,transform' }, heroTarget ? T.roll + 0.85 : T.roll + 0.05);
  tl.to({}, { duration: 0.01 }, withBird ? T.hops + 1.35 : landAt + 0.7); // hold until everything settles

  skipEvents.forEach((ev) => window.addEventListener(ev, skip, { once: true, passive: true }));
  window.addEventListener('resize', onResize);
  skipBtn?.addEventListener('click', skip);
}
