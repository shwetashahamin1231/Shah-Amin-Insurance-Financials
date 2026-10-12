/**
 * ════════════════════════════════════════════════════════════════════
 *  FORM ENGINE — shared by the RSVP form and the booking scheduler
 * ════════════════════════════════════════════════════════════════════
 *    const engine = createFormEngine(form, { kind: 'rsvp', onSuccess(data) { … } });
 *
 *  What it does:
 *   • checks a field when the visitor leaves it, and clears the error
 *     the moment it's fixed; checks everything again on Send;
 *   • lists problems in the error summary and moves focus there;
 *   • spam protection — a hidden "website" field (honeypot) plus a
 *     minimum time on the page before sending (MIN_FILL_SECONDS);
 *   • busy Send button, then the form's own success screen, or an error
 *     panel with "Try again" and both phone numbers;
 *   • on success the peacock mascot celebrates (event `sa:peacock`).
 *
 *  Markup it looks for inside the form (all rendered by the components in
 *  src/components/forms/): [data-field] fields, [data-error-summary],
 *  [data-submit] button, [data-form-error] panel with [data-retry],
 *  [data-form-live] announcer, and the honeypot input name="website".
 * ════════════════════════════════════════════════════════════════════
 */
import { FORM_MESSAGES, MIN_FILL_SECONDS } from '../../config/forms';
import { formatPhone, normalizePhone } from '../../lib/validation';
import { whenActivated } from '../lib/env';
import { checkField, collectIssues, controlsOf, setFieldError, valueOf, type CustomValidator } from './fields';
import { hideSummary, pruneSummary, showSummary, wireSummaryLinks } from './summary';
import { friendlyError, sendForm, type FormKind } from './submit';
import { announce, hidePanel, setBusy, showErrorPanel } from './status';

export interface FormEngineOptions {
  /** Which Apps Script receives it (URLs in src/config/forms.ts). */
  kind: FormKind;
  /** Extra checks for custom widgets, keyed by their data-validate name. */
  validators?: Record<string, CustomValidator>;
  /** Fill in hidden fields just before sending (page address, event date…). */
  prepare?: (form: HTMLFormElement) => void;
  /** A last check right before sending; return a message to stop and show it. */
  beforeSend?: () => string | null;
  /** Runs after a successful send with everything that was sent. */
  onSuccess: (data: FormData) => void;
  /** Multi-step forms call submit() themselves instead of on the form's submit event. */
  manualSubmit?: boolean;
  /** What "Try again" does (default: submit again). Multi-step forms can re-run their own checks first. */
  retry?: () => void;
}

export interface FormEngine {
  /** Check the fields inside `scope` (default: the whole form). Returns true when all is well. */
  validate(scope?: ParentNode, options?: { summary?: boolean; show?: boolean }): boolean;
  /** Validate everything and send. */
  submit(): Promise<void>;
  showError(message: string, canRetry?: boolean): void;
  hideError(): void;
  hideSummary(): void;
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function createFormEngine(form: HTMLFormElement, options: FormEngineOptions): FormEngine {
  const validators = options.validators ?? {};
  const summary = form.querySelector<HTMLElement>('[data-error-summary]');
  const button = form.querySelector<HTMLButtonElement>('[data-submit]');
  const errorPanel = form.querySelector<HTMLElement>('[data-form-error]');
  const live = form.querySelector<HTMLElement>('[data-form-live]');
  const honeypot = form.querySelector<HTMLInputElement>('input[name="website"]');

  form.noValidate = true; // we show our own, friendlier messages
  let busy = false;

  // Time on the page starts when it's actually shown (not while being prerendered).
  let startedAt = Date.now();
  whenActivated(() => {
    startedAt = Date.now();
  });

  /* ── Checking as the visitor goes ── */
  const touched = new WeakSet<HTMLElement>();
  const fieldOf = (target: EventTarget | null) => (target instanceof Element ? target.closest<HTMLElement>('[data-field]') : null);

  const recheck = (field: HTMLElement) => {
    setFieldError(field, checkField(field, validators));
    if (summary) {
      pruneSummary(summary, (id) => Boolean(document.getElementById(id)?.closest('[data-field]')?.classList.contains('is-invalid')));
    }
  };

  form.addEventListener('input', (e) => {
    const field = fieldOf(e.target);
    if (!field) return;
    if (valueOf(field)) touched.add(field);
    if (field.classList.contains('is-invalid')) recheck(field); // clear the error as soon as it's fixed
  });

  form.addEventListener('change', (e) => {
    const field = fieldOf(e.target);
    if (!field) return;
    touched.add(field);
    if (field.classList.contains('is-invalid')) recheck(field);
  });

  form.addEventListener('focusout', (e) => {
    const field = fieldOf(e.target);
    if (!field) return;
    // Moving between parts of one field (radio options, − / + buttons) isn't "leaving" it.
    const next = (e as FocusEvent).relatedTarget;
    if (next instanceof Node && field.contains(next)) return;
    if (field.dataset.format === 'phone') {
      const control = controlsOf(field)[0];
      if (control && normalizePhone(control.value)) control.value = formatPhone(control.value);
    }
    // Don't complain about fields the visitor hasn't started yet.
    if (!touched.has(field) && !field.classList.contains('is-invalid')) return;
    recheck(field);
  });

  if (summary) wireSummaryLinks(summary);

  /* ── Public actions ── */
  const validate: FormEngine['validate'] = (scope = form, opts = {}) => {
    const { summary: useSummary = true, show = true } = opts;
    const issues = collectIssues(scope, validators, { show });
    if (show && summary) {
      if (issues.length && useSummary) showSummary(summary, issues);
      else if (!issues.length) hideSummary(summary);
    }
    return issues.length === 0;
  };

  const showError = (message: string, canRetry = true) => {
    if (errorPanel) showErrorPanel(errorPanel, message, canRetry);
  };
  const hideError = () => hidePanel(errorPanel);

  const submit = async () => {
    if (busy) return;
    hideError();
    if (!validate(form)) return;

    const stop = options.beforeSend?.();
    if (stop) {
      showError(stop, false);
      return;
    }
    options.prepare?.(form);

    // Spam check: real people never fill the hidden field, and take more than a few seconds.
    const looksLikeBot = Boolean(honeypot?.value.trim()) || Date.now() - startedAt < MIN_FILL_SECONDS * 1000;

    busy = true;
    if (button) setBusy(button, true);
    announce(live, FORM_MESSAGES.sending);
    try {
      if (looksLikeBot) {
        if (import.meta.env.DEV) console.info('[forms] spam check triggered (honeypot filled or sent within a few seconds) — nothing was sent.');
        await wait(900); // quietly pretend, so bots learn nothing
      } else {
        await sendForm(form, options.kind);
      }
    } catch (err) {
      busy = false;
      if (button) setBusy(button, false);
      const { message, canRetry } = friendlyError(err);
      showError(message, canRetry);
      return;
    }
    busy = false;
    if (button) setBusy(button, false);
    window.dispatchEvent(new CustomEvent('sa:peacock', { detail: { action: 'celebrate' } }));
    options.onSuccess(new FormData(form));
  };

  form.querySelectorAll<HTMLElement>('[data-retry]').forEach((el) =>
    el.addEventListener('click', () => {
      if (options.retry) options.retry();
      else void submit();
    }),
  );

  if (!options.manualSubmit) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      void submit();
    });
  }

  return {
    validate,
    submit,
    showError,
    hideError,
    hideSummary: () => {
      if (summary) hideSummary(summary);
    },
  };
}
