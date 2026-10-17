/**
 * ════════════════════════════════════════════════════════════════════
 *  Shah & Amin Financial Services — appointment requests → Google Sheet + Calendar
 * ════════════════════════════════════════════════════════════════════
 *  For every request from the website's "Book an Appointment" form it:
 *   1. checks the time is still free on the "Shah & Amin — Appointments" calendar,
 *   2. adds a row to the "Bookings" tab of this spreadsheet,
 *   3. puts a 2-hour event on that calendar (so the website stops offering it),
 *   4. emails everyone in NOTIFY.
 *  The website also asks this script (doGet) which times are busy. Anything on the
 *  appointments calendar counts — so to block off time, just add an event there.
 *
 *  After changing anything here, publish a new version:
 *    Deploy → Manage deployments → ✎ Edit → Version: New version → Deploy
 *  (that keeps the same /exec web address, so the website needs no change).
 * ════════════════════════════════════════════════════════════════════
 */
const SHEET_NAME = 'Bookings';
/** Who gets an email for every appointment request. */
const NOTIFY = ['gautampanna.shah@gmail.com', 'shwetashahamin1231@gmail.com'];
/** The Google Calendar that holds appointments and blocked-off time (made by setup). */
const CALENDAR_NAME = 'Shah & Amin — Appointments';
/** How long each appointment holds the calendar. Keep in step with blockMinutes in the website's forms.ts. */
const BLOCK_MINUTES = 120;
const TIME_ZONE = 'America/New_York';
/**
 * Personal calendars that also block booking times (timed events only — all-day entries
 * such as birthdays don't). 'primary' = the main calendar of the account running this
 * script (Shweta). Gautam's works once he shares his calendar with that account.
 * Only start and end times are used; event names and details never reach the website.
 */
const ALSO_BLOCK_FROM = ['primary', 'gautampanna.shah@gmail.com'];
const HEADERS = ['Timestamp', 'Name', 'Email', 'Phone', 'Date', 'Time (ET)', 'Advisor', 'Topic', 'Meeting type', 'Message', 'Page'];

/** The website asks for busy times: returns [[startMs, endMs], …] for today through ~100 days ahead. */
function doGet() {
  let result;
  try {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = new Date(from.getTime() + 100 * 24 * 60 * 60 * 1000);
    result = { ok: true, busy: busyBetween_(from, to) };
  } catch (err) {
    result = { ok: false, error: err.message };
  }
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

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
  const cleanLong = v => String(v || '').trim().slice(0, 1000);

  // Spam trap: visitors never see the hidden "website" field, so anything in it means a bot.
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
  const t = time.match(/^(\d{1,2}):(\d{2}) ([AP])M ET$/);
  if (!t) throw new Error('Please choose a time.');
  if (!topic) throw new Error('Please choose a topic.');
  if (!meetingType) throw new Error('Please choose how you would like to meet.');

  const hour24 = (Number(t[1]) % 12) + (t[3] === 'P' ? 12 : 0);
  const start = Utilities.parseDate(`${date} ${hour24}:${t[2]}`, TIME_ZONE, 'yyyy-MM-dd H:mm');
  const end = new Date(start.getTime() + BLOCK_MINUTES * 60 * 1000);

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const cal = getCalendar_();
    // Back-to-back is fine: only a real overlap counts (an event ending at 1:00 doesn't block 1:00).
    const clash = busyBetween_(start, end).some(([s, e]) => s < end.getTime() && e > start.getTime());
    if (clash) throw new Error('Please choose another time — that one was just booked.');

    const sheet = getSheet_();
    // Stop spreadsheet formulas sneaking in: text starting with = + - @ is stored as plain text.
    const safe = v => (/^[=+\-@]/.test(v) ? "'" + v : v);
    sheet.appendRow([new Date(), safe(name), safe(email), safe(phone), safe(date), safe(time), safe(advisor), safe(topic), safe(meetingType), safe(message), safe(page)]);

    cal.createEvent(`Appointment: ${name} — ${topic}`, start, end, {
      description: [
        'Requested on shahandamin.com — not confirmed yet. Please call or email to confirm.',
        '',
        `Advisor: ${advisor}`,
        `Topic: ${topic}`,
        `Meeting: ${meetingType}`,
        `Phone: ${phone}`,
        `Email: ${email}`,
        `Message: ${message || '(none)'}`,
      ].join('\n'),
      location: meetingType === 'In person' ? 'In person — place to be confirmed' : meetingType,
    });
  } finally {
    lock.releaseLock();
  }

  // Email alert. A problem sending it never loses the request (the row and event are already saved).
  try {
    MailApp.sendEmail({
      to: NOTIFY.join(','),
      subject: `New appointment request: ${name} — ${date} ${time}`,
      body: [
        `${name} asked for an appointment (not confirmed yet — please call or email them).`,
        '',
        `When: ${date}, ${time} (2 hours are held on the "${CALENDAR_NAME}" calendar)`,
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

/** Busy [startMs, endMs] pairs between two dates, from the appointments calendar and ALSO_BLOCK_FROM. */
function busyBetween_(from, to) {
  const busy = getCalendar_()
    .getEvents(from, to)
    .map(ev => [ev.getStartTime().getTime(), ev.getEndTime().getTime()]);
  for (const id of ALSO_BLOCK_FROM) {
    const cal = personalCalendar_(id);
    if (!cal) continue;
    try {
      cal.getEvents(from, to)
        .filter(ev => !ev.isAllDayEvent())
        .forEach(ev => busy.push([ev.getStartTime().getTime(), ev.getEndTime().getTime()]));
    } catch (err) {
      console.warn(`Could not read calendar ${id}: ${err.message}`);
    }
  }
  return busy;
}

/** A personal calendar by id ('primary' = this account's own), or null if it isn't shared yet. */
function personalCalendar_(id) {
  if (id === 'primary') return CalendarApp.getDefaultCalendar();
  let cal = CalendarApp.getCalendarById(id);
  if (!cal) {
    try {
      cal = CalendarApp.subscribeToCalendar(id, { hidden: true });
    } catch (err) {
      return null; // not shared with this account yet
    }
  }
  return cal;
}

/** The appointments calendar: found by name, created the first time if missing. */
function getCalendar_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('CALENDAR_ID');
  let cal = id ? CalendarApp.getCalendarById(id) : null;
  if (!cal) {
    cal = CalendarApp.getCalendarsByName(CALENDAR_NAME)[0] || CalendarApp.createCalendar(CALENDAR_NAME, { color: CalendarApp.Color.GREEN, timeZone: TIME_ZONE });
    props.setProperty('CALENDAR_ID', cal.getId());
  }
  return cal;
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

/**
 * Run this once from the editor: choose "setup" in the drop-down next to Debug, then ▶ Run.
 * It creates the Bookings tab and the "Shah & Amin — Appointments" calendar, asks for
 * permission (Sheets, Calendar, email), and sends a test email.
 */
function setup() {
  getSheet_();
  const cal = getCalendar_();
  const reach = ALSO_BLOCK_FROM.map(id => `${id === 'primary' ? 'Your main calendar' : id}: ${personalCalendar_(id) ? 'connected' : 'NOT shared yet'}`);
  console.log(reach.join('\n'));
  MailApp.sendEmail(NOTIFY.join(','), 'Appointment alerts are on', `You will get an email like this for every appointment request from shahandamin.com.\n\nEvery request also goes on the "${cal.getName()}" Google Calendar as a 2-hour block. To block off time, add an event to that calendar.\n\nPersonal calendars that also block times:\n${reach.join('\n')}`);
}
