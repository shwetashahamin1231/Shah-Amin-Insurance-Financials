/**
 * ════════════════════════════════════════════════════════════════════
 *  FORM FIELDS — checking values and showing / clearing errors
 * ════════════════════════════════════════════════════════════════════
 *  Works from data attributes rendered by src/components/forms/Field.astro:
 *
 *    <div data-field data-validate="email" data-required …>   (or <fieldset> for radio groups)
 *      <label …> · <p id="…-hint"> · <p id="…-error" data-field-error hidden>
 *      <input id="…" aria-describedby="…-hint">
 *
 *  data-validate:  name · email · phone · guests · choice · text
 *                  (forms can add their own, e.g. the booking calendar's "date" and "time")
 *  data-required          the field must be filled in
 *  data-required-message  custom wording for "missing", e.g. "Please choose an event."
 *  data-max / data-min    limits (party size, text length)
 *  data-focus-id          which element an error link should focus (custom widgets)
 *  data-describe-id       which element should reference the error (custom widgets)
 * ════════════════════════════════════════════════════════════════════
 */
import { validateChoice, validateEmail, validateGuests, validateName, validatePhone, validateText } from '../../lib/validation';

export type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

/** One problem to fix: which field, what to focus, what to say. */
export interface FieldIssue {
  field: HTMLElement;
  focusId: string;
  message: string;
}

/** A form-specific check. Return an error message or null. */
export type CustomValidator = (field: HTMLElement) => string | null;

/** All real inputs inside a field (hidden inputs and buttons excluded). */
export function controlsOf(field: HTMLElement): Control[] {
  return Array.from(field.querySelectorAll<Control>('input:not([type="hidden"]), select, textarea'));
}

const isChoiceInput = (c: Control): c is HTMLInputElement => c instanceof HTMLInputElement && (c.type === 'radio' || c.type === 'checkbox');

/** The field's current value (the checked option for radio groups). */
export function valueOf(field: HTMLElement): string {
  const controls = controlsOf(field);
  const choices = controls.filter(isChoiceInput);
  if (choices.length) return choices.find((c) => c.checked)?.value ?? '';
  return controls[0]?.value ?? '';
}

/** Run the field's rule. Returns an error message, or null when it's fine. */
export function checkField(field: HTMLElement, custom: Record<string, CustomValidator> = {}): string | null {
  const rule = field.dataset.validate ?? '';
  const customRule = custom[rule];
  if (customRule) return customRule(field);

  const value = valueOf(field);
  const required = field.hasAttribute('data-required');
  const requiredMessage = field.dataset.requiredMessage;
  const max = Number(field.dataset.max) || undefined;
  const min = Number(field.dataset.min) || undefined;

  switch (rule) {
    case 'name':
      return validateName(value);
    case 'email':
      return !required && !value.trim() ? null : validateEmail(value);
    case 'phone':
      return validatePhone(value, { required });
    case 'guests':
      return validateGuests(value, max ?? 6, min ?? 1);
    case 'choice':
      return required ? validateChoice(value, requiredMessage) : null;
    case 'text':
      return validateText(value, { max: max ?? 1000, required, requiredMessage });
    default:
      return required && !value.trim() ? (requiredMessage ?? 'Please fill in this field.') : null;
  }
}

/** The element an error-summary link should move focus to. */
export function focusIdOf(field: HTMLElement): string {
  if (field.dataset.focusId) return field.dataset.focusId;
  const controls = controlsOf(field).filter((c) => !c.disabled);
  const checked = controls.find((c) => isChoiceInput(c) && c.checked);
  return (checked ?? controls[0])?.id ?? field.id;
}

/** Which element carries aria-describedby, and whether it may carry aria-invalid. */
function describedElement(field: HTMLElement): { el: HTMLElement; invalidOk: boolean } {
  const custom = field.dataset.describeId ? document.getElementById(field.dataset.describeId) : null;
  if (custom) return { el: custom, invalidOk: false };
  if (field instanceof HTMLFieldSetElement) return { el: field, invalidOk: field.getAttribute('role') === 'radiogroup' };
  return { el: controlsOf(field)[0] ?? field, invalidOk: true };
}

/** Show (message) or clear (null) a field's inline error, keeping ARIA in sync. */
export function setFieldError(field: HTMLElement, message: string | null): void {
  const errorEl = field.querySelector<HTMLElement>('[data-field-error]');
  const textEl = errorEl?.querySelector<HTMLElement>('[data-error-text]') ?? errorEl;
  const { el, invalidOk } = describedElement(field);
  const errorId = errorEl?.id ?? '';
  const ids = (el.getAttribute('aria-describedby') ?? '').split(/\s+/).filter((id) => id && id !== errorId);

  if (message) {
    if (textEl) textEl.textContent = message;
    errorEl?.removeAttribute('hidden');
    if (errorId) ids.unshift(errorId); // error is read first, then the hint
    field.classList.add('is-invalid');
    if (invalidOk) el.setAttribute('aria-invalid', 'true');
  } else {
    errorEl?.setAttribute('hidden', '');
    if (textEl) textEl.textContent = '';
    field.classList.remove('is-invalid');
    el.removeAttribute('aria-invalid');
  }
  if (ids.length) el.setAttribute('aria-describedby', ids.join(' '));
  else el.removeAttribute('aria-describedby');
}

/** Check every field inside `scope`; returns the problems in page order. */
export function collectIssues(scope: ParentNode, custom: Record<string, CustomValidator> = {}, options: { show?: boolean } = {}): FieldIssue[] {
  const { show = true } = options;
  const issues: FieldIssue[] = [];
  scope.querySelectorAll<HTMLElement>('[data-field]').forEach((field) => {
    const message = checkField(field, custom);
    if (show) setFieldError(field, message);
    if (message) issues.push({ field, focusId: focusIdOf(field), message });
  });
  return issues;
}

/** Move focus to a field and bring its label into view (used by error-summary links). */
export function focusField(id: string): void {
  const el = document.getElementById(id);
  if (!el) return;
  const field = el.closest<HTMLElement>('[data-field]');
  (field ?? el).scrollIntoView({ block: 'center' });
  el.focus({ preventScroll: true });
}
