/**
 * Footer switches: "Motion on/off" and "Peacock shown/hidden".
 * Choices are remembered on this device (localStorage). The Motion switch
 * overrides the operating-system "reduce motion" setting.
 */
import { emit } from './lib/env';

const root = document.documentElement;

function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode etc. */
  }
}

export function initPreferences(): void {
  const buttons = document.querySelectorAll<HTMLButtonElement>('[data-pref]');

  const sync = () =>
    buttons.forEach((btn) => {
      const kind = btn.dataset.pref;
      const on = kind === 'motion' ? !root.classList.contains('reduce-motion') : !root.classList.contains('peacock-hidden');
      btn.setAttribute('aria-pressed', String(on));
      const state = btn.querySelector('[data-pref-state]');
      if (state) state.textContent = kind === 'motion' ? (on ? 'on' : 'off') : on ? 'shown' : 'hidden';
    });

  buttons.forEach((btn) =>
    btn.addEventListener('click', () => {
      if (btn.dataset.pref === 'motion') {
        const turnOn = root.classList.contains('reduce-motion');
        save('sa-motion', turnOn ? 'on' : 'off');
        (window as Window & { __saApplyMotion?: () => void }).__saApplyMotion?.();
        emit('sa:motion-change', { reduced: root.classList.contains('reduce-motion') });
      } else {
        const hide = !root.classList.contains('peacock-hidden');
        root.classList.toggle('peacock-hidden', hide);
        save('sa-peacock', hide ? 'hidden' : 'shown');
        emit('sa:peacock-visibility', { hidden: hide });
      }
      sync();
    }),
  );

  // The OS setting can change while the page is open.
  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', () => {
    (window as Window & { __saApplyMotion?: () => void }).__saApplyMotion?.();
    emit('sa:motion-change', { reduced: root.classList.contains('reduce-motion') });
    sync();
  });

  sync();
}
