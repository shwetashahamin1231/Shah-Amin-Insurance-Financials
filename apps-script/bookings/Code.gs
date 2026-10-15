/**
 * ════════════════════════════════════════════════════════════════════
 *  Shah & Amin Financial Services — appointment requests → Google Sheet
 * ════════════════════════════════════════════════════════════════════
 *  Receives the website's "Book an Appointment" form and adds one row per
 *  request to the "Bookings" tab of the spreadsheet this script belongs to.
 *  Same structure as your existing registration script.
 *
 *  Setup, step by step: apps-script/SETUP.md
 *  After changing anything here, publish a new version:
 *    Deploy → Manage deployments → ✎ Edit → Version: New version → Deploy
 *  (that keeps the same /exec web address, so the website needs no change).
 * ════════════════════════════════════════════════════════════════════
 */
const SHEET_NAME = 'Bookings';
/** Who gets an email for every appointment request. */
const NOTIFY = ['gautampanna.shah@gmail.com', 'shwetashahamin1231@gmail.com'];
const HEADERS = ['Timestamp', 'Name', 'Email', 'Phone', 'Date', 'Time (ET)', 'Advisor', 'Topic', 'Meeting type', 'Message', 'Page'];

function doPost(e) {
  let result;
  try {
    const data = e.postData && e.postData.type === 'application/json' ? JSON.parse(e.postData.contents) : e.parameter;
    result = submitBooking(data);
  } catch (err) {
    result = { ok: false, error: err.message };
  }
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

function submitBooking(data) {
  const clean = v => String(v || '').trim().slice(0, 200);
  const cleanLong = v => String(v || '').trim().slice(0, 1000); // the message box allows up to 1,000 characters

  // Spam trap: visitors never see the hidden "website" field, so anything in it means a bot.
  // Say "ok" without saving anything.
  if (clean(data.website)) return { ok: true };

  const name = clean(data.name);
  const email = clean(data.email);
  const phone = clean(data.phone);
  const date = clean(data.date); // YYYY-MM-DD
  const time = clean(data.time); // e.g. "11:30 AM ET"
  const advisor = clean(data.advisor) || 'No preference';
  const topic = clean(data.topic);
  const meetingType = clean(data.meetingType);
  const message = cleanLong(data.message);
  const page = clean(data.page);

  if (!name) throw new Error('Please enter your name.');
  if (!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(email)) throw new Error('Please enter a valid email address.');
  if (phone.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '').length !== 10) throw new Error('Please enter a 10-digit U.S. phone number.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Please choose a date.');
  if (!/^\d{1,2}:\d{2} [AP]M ET$/.test(time)) throw new Error('Please choose a time.');
  if (!topic) throw new Error('Please choose a topic.');
  if (!meetingType) throw new Error('Please choose how you would like to meet.');

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getSheet_();
    // Stop spreadsheet formulas sneaking in: text starting with = + - @ is stored as plain text.
    const safe = v => (/^[=+\-@]/.test(v) ? "'" + v : v);
    sheet.appendRow([new Date(), safe(name), safe(email), safe(phone), safe(date), safe(time), safe(advisor), safe(topic), safe(meetingType), safe(message), safe(page)]);
  } finally {
    lock.releaseLock();
  }

  // Email alert. A problem sending it never loses the request (the row is already saved).
  try {
    MailApp.sendEmail({
      to: NOTIFY.join(','),
      subject: `New appointment request: ${name} — ${date} ${time}`,
      body: [
        `${name} asked for an appointment (not confirmed yet — please call or email them).`,
        '',
        `When: ${date}, ${time}`,
        `Advisor: ${advisor}`,
        `Topic: ${topic}`,
        `Meeting: ${meetingType}`,
        `Phone: ${phone}`,
        `Email: ${email}`,
        `Message: ${message || '(none)'}`,
        '',
        `Spreadsheet: ${SpreadsheetApp.getActiveSpreadsheet().getUrl()}`,
      ].join('\n'),
      replyTo: email,
    });
  } catch (err) {
    console.warn('Booking email not sent: ' + err.message);
  }
  return { ok: true, date: date, time: time };
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

/** Run this once from the editor (▶ Run): creates the "Bookings" tab, grants permission to save rows and send email alerts, and sends a test email. */
function setup() {
  getSheet_();
  MailApp.sendEmail(NOTIFY.join(','), 'Appointment alerts are on', 'You will get an email like this for every appointment request from shahandamin.com.');
}
