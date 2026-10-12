/**
 * Visual states around sending a form:
 *  • the Send button while busy (spinner, "Sending…", disabled so it can't be pressed twice)
 *  • success / error panels (src/components/forms/FormStatus.astro) — focus moves to their heading
 *  • polite screen-reader announcements
 */
import { FORM_MESSAGES } from '../../config/forms';

const reduced = () => document.documentElement.classList.contains('reduce-motion');

/** Gentle entrance for panels and steps: rise + fade, or a short fade when motion is reduced. */
export function animateIn(el: HTMLElement, distance = 14): void {
  if (typeof el.animate !== 'function') return;
  if (reduced()) {
    el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: 'ease-out' });
    return;
  }
  el.animate(
    [
      { opacity: 0, transform: `translateY(${distance}px)` },
      { opacity: 1, transform: 'none' },
    ],
    { duration: 560, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
  );
}

/** Switch the Send button into / out of its busy state. */
export function setBusy(button: HTMLButtonElement, busy: boolean): void {
  const text = button.querySelector<HTMLElement>('[data-btn-text]');
  if (busy) {
    if (text) {
      button.dataset.idleText = text.textContent ?? '';
      text.textContent = button.dataset.busyText || FORM_MESSAGES.sending;
    }
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    button.classList.add('is-busy');
  } else {
    if (text && button.dataset.idleText !== undefined) text.textContent = button.dataset.idleText;
    button.disabled = false;
    button.removeAttribute('aria-busy');
    button.classList.remove('is-busy');
  }
}

/** Say something politely to screen-reader users via a [data-form-live] region. */
export function announce(region: HTMLElement | null | undefined, message: string): void {
  if (!region) return;
  region.textContent = '';
  // A short pause lets screen readers notice the same message twice in a row.
  window.setTimeout(() => {
    region.textContent = message;
  }, 80);
}

/** Show a status panel, bring it into view and move focus to its heading. */
export function revealPanel(panel: HTMLElement): void {
  panel.hidden = false;
  animateIn(panel);
  const heading = panel.querySelector<HTMLElement>('[data-status-heading]') ?? panel;
  heading.focus({ preventScroll: true });
  const r = panel.getBoundingClientRect();
  if (r.top < 80 || r.top > window.innerHeight - 120) panel.scrollIntoView({ block: 'center' });
}

/** Fill in and show the error panel. Retry is hidden when trying again can't help. */
export function showErrorPanel(panel: HTMLElement, message: string, canRetry: boolean): void {
  const text = panel.querySelector<HTMLElement>('[data-error-message]');
  if (text) text.textContent = message;
  panel.querySelectorAll<HTMLElement>('[data-retry-wrap]').forEach((el) => (el.hidden = !canRetry));
  revealPanel(panel);
}

export function hidePanel(panel: HTMLElement | null | undefined): void {
  if (panel) panel.hidden = true;
}
