/**
 * ════════════════════════════════════════════════════════════════════
 *  SENDING A FORM TO GOOGLE SHEETS (Apps Script web app)
 * ════════════════════════════════════════════════════════════════════
 *  Uses the client's existing, proven method (same as their other site):
 *    POST the form fields as URL-encoded data → the script replies with
 *    JSON { ok: true } or { ok: false, error: 'Please …' }.
 *  The script URLs live in src/config/forms.ts.
 * ════════════════════════════════════════════════════════════════════
 */
import { APPS_SCRIPT, FORM_MESSAGES } from '../../config/forms';

export type FormKind = 'booking' | 'rsvp';

/** The URL for this form isn't filled in yet (production only). */
export class NotConnectedError extends Error {}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function endpointFor(kind: FormKind): string {
  return (kind === 'booking' ? APPS_SCRIPT.bookings : APPS_SCRIPT.rsvps).trim();
}

/** The script's reply. `emailed` = the booking script sent the visitor a confirmation email. */
export interface FormReply {
  ok: boolean;
  emailed?: boolean;
}

/** Send the form. Resolves with the script's reply on success; throws an Error with a reason otherwise. */
export async function sendForm(form: HTMLFormElement, kind: FormKind): Promise<FormReply> {
  const URL = endpointFor(kind);

  if (!URL) {
    if (import.meta.env.DEV) {
      // Local preview only: pretend it worked so the form can be tried out.
      console.info(`[forms] ${kind}: no Apps Script URL in src/config/forms.ts yet — simulating success. Payload:`, Object.fromEntries(new FormData(form)));
      await wait(900);
      return { ok: true };
    }
    throw new NotConnectedError(FORM_MESSAGES.notConnected[kind]);
  }

  // ↓ The client's existing submission method — keep exactly as is.
  //   (The cast only tells TypeScript that FormData is a valid URLSearchParams source; it changes nothing at runtime.)
  const res = await fetch(URL, { method: 'POST', body: new URLSearchParams(new FormData(form) as unknown as Record<string, string>) });
  const result = await res.json();
  if (!result.ok) throw new Error(result.error);
  return { ok: true, emailed: result.emailed === true };
}

/**
 * What to tell the visitor when sending fails.
 * The scripts' own messages ("Please enter a valid email address.") are shown as they are;
 * anything technical (network down, script error) becomes a friendly generic message.
 */
export function friendlyError(err: unknown): { message: string; canRetry: boolean } {
  if (err instanceof NotConnectedError) return { message: err.message, canRetry: false };
  const message = err instanceof Error ? err.message.trim() : '';
  if (/^Please\b/.test(message) && message.length <= 240) return { message, canRetry: false };
  return { message: FORM_MESSAGES.genericError, canRetry: true };
}
