/**
 * ════════════════════════════════════════════════════════════════════
 *  FORM VALIDATION — the checks and the friendly messages
 * ════════════════════════════════════════════════════════════════════
 *  Each validator takes what the visitor typed and returns either an
 *  error message (string) or null when the value is fine. Messages say
 *  what to do, in plain English ("Please enter…"), never just "Invalid".
 *
 *  The Google Apps Scripts in apps-script/ repeat the essential checks on
 *  the server, using the same wording.
 * ════════════════════════════════════════════════════════════════════
 */

/** Returns an error message, or null when the value is acceptable. */
export type Validator = (value: string) => string | null;

export const MESSAGES = {
  nameRequired: 'Please enter your name.',
  nameShort: 'Please enter your full name.',
  nameLong: 'Please shorten your name to 100 characters or fewer.',
  nameLetters: 'Please enter your name using letters.',
  emailRequired: 'Please enter your email address.',
  emailInvalid: 'Please enter an email address in the format name@example.com.',
  phoneRequired: 'Please enter your phone number.',
  phoneInvalid: 'Please enter a 10-digit U.S. phone number, like (973) 555-0123.',
  guestsRange: (max: number) => `Please choose between 1 and ${max} ${max === 1 ? 'person' : 'people'}.`,
  choiceRequired: 'Please choose an option.',
  textLong: (max: number) => `Please shorten this to ${max.toLocaleString('en-US')} characters or fewer.`,
} as const;

/** Same pattern as the Apps Scripts: something@something.something, no spaces. */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;

const trim = (v: string | null | undefined) => String(v ?? '').trim();

export function validateName(value: string): string | null {
  const v = trim(value);
  if (!v) return MESSAGES.nameRequired;
  if (v.length < 2) return MESSAGES.nameShort;
  if (v.length > 100) return MESSAGES.nameLong;
  if (!/\p{L}/u.test(v)) return MESSAGES.nameLetters;
  return null;
}

export function validateEmail(value: string): string | null {
  const v = trim(value);
  if (!v) return MESSAGES.emailRequired;
  if (v.length > 200 || !EMAIL_PATTERN.test(v)) return MESSAGES.emailInvalid;
  return null;
}

/**
 * The 10 digits of a U.S. phone number, or null if it isn't one.
 * Accepts (973) 722-9191 · 973-722-9191 · 973.722.9191 · 9737229191 · +1 973 722 9191 · 1-973-722-9191
 */
export function normalizePhone(value: string): string | null {
  const v = trim(value);
  if (!v || /[a-z]/i.test(v)) return null;
  let digits = v.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) digits = digits.slice(1);
  if (digits.length !== 10) return null;
  // U.S. area codes and exchanges never start with 0 or 1.
  if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(digits)) return null;
  return digits;
}

export function validatePhone(value: string, options: { required?: boolean } = {}): string | null {
  const { required = true } = options;
  const v = trim(value);
  if (!v) return required ? MESSAGES.phoneRequired : null;
  return normalizePhone(v) ? null : MESSAGES.phoneInvalid;
}

/** Pretty display format: '9737229191' → '(973) 722-9191'. Leaves anything unrecognised as typed. */
export function formatPhone(value: string): string {
  const digits = normalizePhone(value);
  if (!digits) return trim(value);
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/** Party size: a whole number from `min` to `max`. */
export function validateGuests(value: string, max = 6, min = 1): string | null {
  const v = trim(value);
  const n = Number(v);
  if (!v || !Number.isInteger(n) || n < min || n > max) return MESSAGES.guestsRange(max);
  return null;
}

/** A required choice (select menu or radio buttons). */
export function validateChoice(value: string, message: string = MESSAGES.choiceRequired): string | null {
  return trim(value) ? null : message;
}

/** Free text (messages, notes): optional unless `required`, limited to `max` characters. */
export function validateText(value: string, options: { max?: number; required?: boolean; requiredMessage?: string } = {}): string | null {
  const { max = 1000, required = false, requiredMessage = 'Please fill in this field.' } = options;
  const v = trim(value);
  if (!v) return required ? requiredMessage : null;
  if (v.length > max) return MESSAGES.textLong(max);
  return null;
}

/** First name for friendly messages: 'Shweta Shah Amin' → 'Shweta'. */
export function firstName(fullName: string): string {
  return trim(fullName).split(/\s+/)[0] ?? '';
}
