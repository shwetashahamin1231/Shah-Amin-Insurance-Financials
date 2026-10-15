/**
 * ════════════════════════════════════════════════════════════════════
 *  Shah & Amin Financial Services — event RSVPs → Google Sheet
 * ════════════════════════════════════════════════════════════════════
 *  Receives the RSVP form on the website's event pages and adds one row
 *  per RSVP to a tab for that event (e.g. "Medicare Educational Seminar —
 *  Oct 17, 2026"), created automatically the first time someone signs up.
 *  Each RSVP is also emailed to the addresses in NOTIFY.
 *  Same structure as your existing registration script.
 *
 *  Setup, step by step: apps-script/SETUP.md
 *  After changing anything here, publish a new version:
 *    Deploy → Manage deployments → ✎ Edit → Version: New version → Deploy
 *  (that keeps the same /exec web address, so the website needs no change).
 * ════════════════════════════════════════════════════════════════════
 */
/** Who gets an email for every RSVP. */
const NOTIFY = ['gautampanna.shah@gmail.com', 'shwetashahamin1231@gmail.com'];
const HEADERS = ['Timestamp', 'First name', 'Last name', 'Phone', 'Email', 'Guests', 'Notes', 'Event date', 'Page'];

function doPost(e) {
  let result;
  try {
    const data = e.postData && e.postData.type === 'application/json' ? JSON.parse(e.postData.contents) : e.parameter;
    result = submitRsvp(data);
  } catch (err) {
    result = { ok: false, error: err.message };
  }
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

function submitRsvp(data) {
  const clean = v => String(v || '').trim().slice(0, 200);
  const cleanLong = v => String(v || '').trim().slice(0, 1000); // the notes box allows up to 1,000 characters

  // Spam trap: visitors never see the hidden "website" field, so anything in it means a bot.
  if (clean(data.website)) return { ok: true };

  const event = clean(data.event);
  const eventDate = clean(data.eventDate); // e.g. "Saturday, October 17, 2026 · 5:00 PM – 7:00 PM ET"
  const firstName = clean(data.firstName);
  const lastName = clean(data.lastName);
  const phone = clean(data.phone);
  const email = clean(data.email); // optional
  const guests = Number(clean(data.guests));
  const notes = cleanLong(data.notes);
  const page = clean(data.page);

  if (!event) throw new Error('Please choose an event.');
  if (!firstName) throw new Error('Please enter your first name.');
  if (!lastName) throw new Error('Please enter your last name.');
  if (phone.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '').length !== 10) throw new Error('Please enter a 10-digit U.S. phone number.');
  if (email && !/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(email)) throw new Error('Please enter a valid email address, or leave it blank.');
  if (!(Number.isInteger(guests) && guests >= 1 && guests <= 20)) throw new Error('Please choose how many people are coming.');

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  let tab;
  try {
    const sheet = getEventSheet_(event, eventDate);
    tab = sheet.getName();
    // Stop spreadsheet formulas sneaking in: text starting with = + - @ is stored as plain text.
    const safe = v => (/^[=+\-@]/.test(v) ? "'" + v : v);
    sheet.appendRow([new Date(), safe(firstName), safe(lastName), safe(phone), safe(email), guests, safe(notes), safe(eventDate), safe(page)]);
  } finally {
    lock.releaseLock();
  }

  // Email alert. A problem sending it never loses the RSVP (the row is already saved).
  try {
    MailApp.sendEmail({
      to: NOTIFY.join(','),
      subject: `New RSVP: ${firstName} ${lastName} (${guests}) — ${event}`,
      body: [
        `${firstName} ${lastName} RSVP'd for ${event}.`,
        '',
        `When: ${eventDate}`,
        `People coming: ${guests}`,
        `Phone: ${phone}`,
        `Email: ${email || '(not given)'}`,
        `Notes: ${notes || '(none)'}`,
        '',
        `Saved in the "${tab}" tab: ${SpreadsheetApp.getActiveSpreadsheet().getUrl()}`,
      ].join('\n'),
      ...(email ? { replyTo: email } : {}),
    });
  } catch (err) {
    console.warn('RSVP email not sent: ' + err.message);
  }
  return { ok: true, event: event };
}

/** One tab per event, e.g. "Medicare Educational Seminar — Oct 17, 2026". */
function getEventSheet_(event, eventDate) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const d = eventDate.match(/([A-Z][a-z]+) (\d{1,2}), (\d{4})/); // "October 17, 2026"
  const when = d ? `${d[1].slice(0, 3)} ${d[2]}, ${d[3]}` : '';
  const name = (event + (when ? ' — ' + when : '')).replace(/[\[\]*?:\/\\]/g, ' ').slice(0, 95);
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#1A3719').setFontColor('#F6EEDD');
    sheet.setFrozenRows(1);
    sheet.setColumnWidths(1, HEADERS.length, 150);
  }
  return sheet;
}

/**
 * Run this once from the editor (▶ Run) after pasting the code: it asks for
 * permission to save rows AND send the email alerts, then sends a test email.
 */
function setup() {
  SpreadsheetApp.getActiveSpreadsheet();
  MailApp.sendEmail(NOTIFY.join(','), 'RSVP alerts are on', 'You will get an email like this for every RSVP from shahandamin.com.');
}
