/**
 * ════════════════════════════════════════════════════════════════════
 *  Shah & Amin Financial Services — event RSVPs → Google Sheet
 * ════════════════════════════════════════════════════════════════════
 *  Receives the RSVP form on the website's event pages and adds one row
 *  per RSVP to the "RSVPs" tab of the spreadsheet this script belongs to.
 *  Same structure as your existing registration script.
 *
 *  Setup, step by step: apps-script/SETUP.md
 *  After changing anything here, publish a new version:
 *    Deploy → Manage deployments → ✎ Edit → Version: New version → Deploy
 *  (that keeps the same /exec web address, so the website needs no change).
 * ════════════════════════════════════════════════════════════════════
 */
const SHEET_NAME = 'RSVPs';
const HEADERS = ['Timestamp', 'Event', 'Event date', 'Name', 'Email', 'Phone', 'Guests', 'Notes', 'Page'];

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
  // Say "ok" without saving anything.
  if (clean(data.website)) return { ok: true };

  const event = clean(data.event);
  const eventDate = clean(data.eventDate); // e.g. "Monday, October 19, 2026 · 10:00 AM ET"
  const name = clean(data.name);
  const email = clean(data.email);
  const phone = clean(data.phone); // optional
  const guests = Number(clean(data.guests));
  const notes = cleanLong(data.notes);
  const page = clean(data.page);

  if (!event) throw new Error('Please choose an event.');
  if (!name) throw new Error('Please enter your name.');
  if (!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(email)) throw new Error('Please enter a valid email address.');
  if (phone && phone.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '').length !== 10) throw new Error('Please enter a 10-digit U.S. phone number, or leave it blank.');
  if (!(Number.isInteger(guests) && guests >= 1 && guests <= 20)) throw new Error('Please choose how many people are coming.');

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getSheet_();
    // Stop spreadsheet formulas sneaking in: text starting with = + - @ is stored as plain text.
    const safe = v => (/^[=+\-@]/.test(v) ? "'" + v : v);
    sheet.appendRow([new Date(), safe(event), safe(eventDate), safe(name), safe(email), safe(phone), guests, safe(notes), safe(page)]);
  } finally {
    lock.releaseLock();
  }
  return { ok: true, event: event };
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#1A3719').setFontColor('#F6EEDD');
    sheet.setFrozenRows(1);
    sheet.setColumnWidths(1, HEADERS.length, 170);
  }
  return sheet;
}

/** Run this once from the editor (▶ Run) to create the "RSVPs" tab and grant permissions. */
function setup() {
  getSheet_();
}
