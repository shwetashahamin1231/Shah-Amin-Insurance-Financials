/**
 * Generic <dialog> wiring (mobile menu, Call sheet, RSVP modals, lightbox):
 *   <button data-dialog-open="dialog-id">   opens it as a modal
 *   <button data-dialog-close>              closes the dialog it sits in
 * Native modals trap focus and close on Escape. While one is open we lock
 * page scrolling and let other scripts (smooth scroll, peacock) know.
 */
import { emit } from './lib/env';

const root = document.documentElement;

function lock(on: boolean) {
  root.classList.toggle('scroll-locked', on);
  emit(on ? 'sa:scroll-lock' : 'sa:scroll-unlock');
}

export function openDialog(dialog: HTMLDialogElement, opener?: HTMLElement | null): void {
  if (dialog.open) return;
  dialog.showModal();
  lock(true);
  opener?.setAttribute('aria-expanded', 'true');
  dialog.addEventListener(
    'close',
    () => {
      lock(false);
      opener?.setAttribute('aria-expanded', 'false');
      opener?.focus({ preventScroll: true });
    },
    { once: true },
  );
}

export function initDialogs(): void {
  document.addEventListener('click', (e) => {
    const target = e.target as Element;

    const opener = target.closest<HTMLElement>('[data-dialog-open]');
    if (opener) {
      const dialog = document.getElementById(opener.dataset.dialogOpen ?? '') as HTMLDialogElement | null;
      if (dialog) {
        e.preventDefault();
        openDialog(dialog, opener);
      }
      return;
    }

    const closer = target.closest('[data-dialog-close]');
    if (closer) {
      closer.closest('dialog')?.close();
      return;
    }

    // Clicking the dimmed backdrop of a sheet/modal (not the full-screen menu) closes it.
    if (target instanceof HTMLDialogElement && target.open && target.hasAttribute('data-backdrop-close')) {
      const r = target.getBoundingClientRect();
      const ev = e as MouseEvent;
      if (ev.clientY < r.top || ev.clientY > r.bottom || ev.clientX < r.left || ev.clientX > r.right) target.close();
    }
  });

  // Following a link inside the menu: close it so the view transition shows the new page cleanly.
  document.querySelectorAll<HTMLDialogElement>('dialog').forEach((dialog) => {
    dialog.addEventListener('click', (e) => {
      const link = (e.target as Element).closest('a[href]');
      if (link && !link.getAttribute('href')?.startsWith('#') && !link.hasAttribute('download') && !link.getAttribute('href')?.startsWith('tel:')) {
        dialog.close();
      }
    });
  });
}
