/**
 * Error summary box (src/components/forms/ErrorSummary.astro).
 * After a failed "Send" or "Continue", it lists every problem as a link;
 * focus moves to the box so screen readers announce it, and each link
 * jumps to its field.
 */
import { focusField, type FieldIssue } from './fields';

/** Fill the summary with links to the problems and move focus to it. */
export function showSummary(summary: HTMLElement, issues: FieldIssue[]): void {
  const list = summary.querySelector<HTMLElement>('[data-error-list]');
  if (!list) return;
  list.replaceChildren(
    ...issues.map((issue) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = `#${issue.focusId}`;
      a.dataset.focusId = issue.focusId;
      a.textContent = issue.message;
      li.append(a);
      return li;
    }),
  );
  summary.hidden = false;
  summary.scrollIntoView({ block: 'nearest' });
  summary.focus({ preventScroll: true });
}

export function hideSummary(summary: HTMLElement): void {
  summary.hidden = true;
  summary.querySelector('[data-error-list]')?.replaceChildren();
}

/** Drop links for fields that are now fixed (without moving focus); hide the box when nothing is left. */
export function pruneSummary(summary: HTMLElement, stillInvalid: (focusId: string) => boolean): void {
  if (summary.hidden) return;
  summary.querySelectorAll<HTMLAnchorElement>('a[data-focus-id]').forEach((a) => {
    if (!stillInvalid(a.dataset.focusId ?? '')) a.closest('li')?.remove();
  });
  if (!summary.querySelector('a[data-focus-id]')) hideSummary(summary);
}

/** Make the summary's links focus their field instead of just scrolling to it. */
export function wireSummaryLinks(summary: HTMLElement): void {
  summary.addEventListener('click', (e) => {
    const link = (e.target as Element).closest<HTMLAnchorElement>('a[data-focus-id]');
    if (!link) return;
    e.preventDefault();
    focusField(link.dataset.focusId ?? '');
  });
}
