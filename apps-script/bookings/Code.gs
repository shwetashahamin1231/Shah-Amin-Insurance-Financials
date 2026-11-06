/**
 * ════════════════════════════════════════════════════════════════════
 *  Shah & Amin Financial Services — appointment requests → Google Sheet + Calendar
 * ════════════════════════════════════════════════════════════════════
 *  For every request from the website's "Book an Appointment" form it:
 *   1. checks the time is still free on the "Shah & Amin — Appointments" calendar,
 *   2. adds a row to the "Bookings" tab of this spreadsheet,
 *   3. puts a 2-hour event on that calendar (so the website stops offering it),
 *   4. emails the visitor a copy of their request (with a calendar file),
 *   5. emails everyone in NOTIFY.
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

/* ── The visitor's confirmation email ─────────────────────────────────
 *  Keep these in step with src/config/site.ts on the website.          */
/** false = stop emailing visitors (the team alert still goes out). */
const SEND_CONFIRMATION = true;
const BUSINESS_NAME = 'Shah & Amin Financial Services';
const WEBSITE = 'https://www.shahandamin.com';
const HOURS_TEXT = 'Open 7 days a week, 11:00 AM – 7:00 PM Eastern (closed on federal holidays)';
const ADVISORS = [
  { name: 'Gautam Shah', first: 'Gautam', phone: '(973) 722-9191', email: 'gautampanna.shah@gmail.com' },
  { name: 'Shweta Shah Amin', first: 'Shweta', phone: '(732) 543-9835', email: 'shwetashahamin1231@gmail.com' },
];
/**
 * CMS requires this disclaimer in emails to people on Medicare (42 CFR 422.2267(e)(41)).
 * Same wording as COMPLIANCE.medicareDisclaimer on the website — never reword it.
 * Put the numbers in place of [#] when MEDICARE_COUNTS on the website is filled in.
 */
const MEDICARE_DISCLAIMER = 'We do not offer every plan available in your area. Currently we represent [#] organizations which offer [#] products in your area. Please contact Medicare.gov or 1-800-MEDICARE to get information on all of your options.';
const GOVERNMENT_DISCLAIMER = 'Not connected with or endorsed by the United States government or the federal Medicare program.';
/** At most this many confirmation emails to one address in 6 hours (stops the form being used to flood someone's inbox). */
const MAX_EMAILS_PER_ADDRESS = 3;

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

  // Emails. A problem sending either one never loses the request (the row and event are already saved).
  let confirmation = 'not sent — please call or email them yourself';
  let emailed = false;
  if (SEND_CONFIRMATION) {
    try {
      if (mayEmail_(email)) {
        sendConfirmation_({ name, email, start, end, time, advisor, topic, meetingType });
        emailed = true;
        confirmation = 'sent to ' + email;
      } else {
        confirmation = 'not sent (too many emails to this address today) — please call or email them yourself';
      }
    } catch (err) {
      console.warn('Confirmation email not sent: ' + err.message);
    }
  }
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
        `Confirmation email to the client: ${confirmation}`,
        `Spreadsheet: ${SpreadsheetApp.getActiveSpreadsheet().getUrl()}`,
      ].join('\n'),
      replyTo: email,
    });
  } catch (err) {
    console.warn('Booking email not sent: ' + err.message);
  }
  return { ok: true, date: date, time: time, emailed: emailed };
}

/**
 * Room to email this address? Keeps enough daily quota for the team alert, and limits
 * how many emails one address can be sent (so nobody can use the form to spam someone).
 */
function mayEmail_(email) {
  if (MailApp.getRemainingDailyQuota() < NOTIFY.length + 1) return false;
  const cache = CacheService.getScriptCache();
  const key = 'confirm:' + email.toLowerCase();
  const sent = Number(cache.get(key) || 0);
  if (sent >= MAX_EMAILS_PER_ADDRESS) return false;
  cache.put(key, String(sent + 1), 6 * 60 * 60);
  return true;
}

/**
 * "We've received your request" email to the visitor, with a calendar file attached.
 * Only fixed wording and checked values go in it (never their free-text message), so the
 * form can't be used to send someone else an email with made-up content.
 */
function sendConfirmation_(b) {
  const advisor = ADVISORS.find(a => a.name === b.advisor) || null;
  const first = firstName_(b.name);
  const topic = plainText_(b.topic, 60);
  const meeting = ['In person', 'Phone', 'Video'].indexOf(b.meetingType) >= 0 ? b.meetingType : '';
  const isMedicare = /medicare/i.test(topic);

  const dateLong = Utilities.formatDate(b.start, TIME_ZONE, 'EEEE, MMMM d, yyyy');
  const dateShort = Utilities.formatDate(b.start, TIME_ZONE, 'EEE, MMM d');
  const timeText = b.time.replace(/ ET$/, '') + ' Eastern Time';
  const who = advisor ? advisor.first : 'Gautam or Shweta';
  const meetingText = { 'In person': 'In person (we will agree on the place with you)', Phone: 'Phone call', Video: 'Video call (we will send you the link)' }[meeting] || '';
  const nextStep =
    `This is a request, not a confirmed appointment yet. ${who} will call or email you to confirm the time` +
    (meeting === 'Video' ? ' and send the video link.' : meeting === 'In person' ? ' and agree on where to meet.' : '.');
  const callLine = ADVISORS.map(a => `${a.first} at ${a.phone}`).join(' or ');

  const details = [
    ['When', `${dateLong}<br>${timeText}`, `${dateLong}, ${timeText}`],
    meetingText && ['How', meetingText, meetingText],
    topic && ['Topic', topic, topic],
    ['Advisor', advisor ? advisor.name : 'Gautam Shah or Shweta Shah Amin', advisor ? advisor.name : 'Gautam Shah or Shweta Shah Amin'],
  ].filter(Boolean);
  const medicareNotes = [
    'Before we talk about Medicare plans, we will confirm with you which types of plans you would like to discuss (a short “Scope of Appointment”).',
    'As Medicare requires, phone and video conversations about Medicare Advantage and Part D plans are recorded.',
  ];

  /* Plain-text version (for email apps that don't show formatting). */
  const text = [
    first ? `Dear ${first},` : 'Hello,',
    '',
    'Thank you for asking for an appointment with Shah & Amin Financial Services. Here is a copy of your request:',
    '',
    ...details.map(d => `${d[0]}: ${d[2]}`),
    '',
    'WHAT HAPPENS NEXT',
    nextStep,
    '',
    `Need to change or cancel? Reply to this email, or call ${callLine}.`,
    'Please don’t email Social Security, Medicare or account numbers. We will collect anything like that securely when we speak.',
    ...(isMedicare ? ['', 'MEDICARE APPOINTMENTS', ...medicareNotes] : []),
    '',
    'A calendar file is attached if you would like to add this time to your calendar.',
    '',
    'Warm regards,',
    'Gautam Shah and Shweta Shah Amin',
    BUSINESS_NAME,
    WEBSITE,
    HOURS_TEXT,
    '',
    '—',
    MEDICARE_DISCLAIMER,
    GOVERNMENT_DISCLAIMER,
    '',
    'You are receiving this email because an appointment was requested with this address at shahandamin.com. If that wasn’t you, you can ignore this email.',
  ].join('\n');

  /* Formatted version: table layout and inline styles, so it looks right in Gmail, Outlook and Apple Mail. */
  const h = esc_;
  const serif = "Georgia,'Times New Roman',serif";
  const sans = 'Helvetica,Arial,sans-serif';
  const p = (s, extra) => `<p style="margin:0 0 16px;font:17px/1.6 ${sans};color:#1F2A1E;${extra || ''}">${s}</p>`;
  const heading = s => `<h2 style="margin:28px 0 10px;font:600 22px/1.25 ${serif};color:#1A3719;">${s}</h2>`;
  const tel = a => `<a href="tel:+1${a.phone.replace(/\D/g, '')}" style="color:#623E11;font-weight:bold;white-space:nowrap;">${h(a.phone)}</a>`;
  const rows = details
    .map(
      d => `<tr>
        <td style="padding:12px 16px 12px 0;border-top:1px solid #E2D3B6;font:bold 14px/1.5 ${sans};letter-spacing:.08em;text-transform:uppercase;color:#465244;vertical-align:top;width:90px;">${h(d[0])}</td>
        <td style="padding:12px 0;border-top:1px solid #E2D3B6;font:17px/1.5 ${sans};color:#1F2A1E;">${d[0] === 'When' ? `<strong>${h(dateLong)}</strong><br>${h(timeText)}` : h(d[1])}</td>
      </tr>`,
    )
    .join('');

  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Your appointment request</title></head>
<body style="margin:0;padding:0;background:#EDE1CB;">
<div style="display:none;max-height:0;overflow:hidden;">Your request for ${h(dateLong)} at ${h(timeText)} has reached us.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EDE1CB;"><tr><td align="center" style="padding:24px 12px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#FBF7EF;border:1px solid #C49D64;">
    <tr><td style="background:#1A3719;padding:26px 32px;border-bottom:3px double #AF8243;">
      <div style="font:600 26px/1.2 ${serif};color:#DDB579;">Shah &amp; Amin</div>
      <div style="font:13px/1.4 ${sans};letter-spacing:.2em;text-transform:uppercase;color:#CFC6B0;margin-top:4px;">Financial Services</div>
    </td></tr>
    <tr><td style="padding:32px 32px 8px;">
      <h1 style="margin:0 0 18px;font:600 30px/1.15 ${serif};color:#1A3719;">We’ve received your appointment request</h1>
      ${p(first ? `Dear ${h(first)},` : 'Hello,')}
      ${p('Thank you for asking for an appointment with Shah &amp; Amin Financial Services. Here is a copy of your request:')}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 8px;border-bottom:1px solid #E2D3B6;">${rows}</table>
      ${heading('What happens next')}
      ${p(h(nextStep))}
      ${p(`Need to change or cancel? Reply to this email, or call ${ADVISORS.map(a => `${h(a.first)} at ${tel(a)}`).join(' or ')}.`)}
      ${p('Please don’t email Social Security, Medicare or account numbers. We will collect anything like that securely when we speak.', 'color:#465244;font-size:16px;')}
      ${isMedicare ? heading('Medicare appointments') + `<ul style="margin:0 0 16px;padding-left:22px;">${medicareNotes.map(n => `<li style="margin:0 0 8px;font:17px/1.6 ${sans};color:#1F2A1E;">${h(n)}</li>`).join('')}</ul>` : ''}
      ${p('A calendar file is attached if you would like to add this time to your calendar.', 'color:#465244;font-size:16px;')}
      ${p(`Warm regards,<br><span style="font:600 20px/1.4 ${serif};color:#1A3719;">Gautam Shah &amp; Shweta Shah Amin</span>`, 'margin-top:24px;')}
    </td></tr>
    <tr><td style="padding:8px 32px 28px;">
      <div style="border:1px solid #C49D64;padding:14px 16px;background:#F6EEDD;font:15px/1.55 ${sans};color:#1F2A1E;">
        <strong>About Medicare:</strong> ${h(MEDICARE_DISCLAIMER).replace('1-800-MEDICARE', '<span style="white-space:nowrap;">1-800-MEDICARE</span>')} ${h(GOVERNMENT_DISCLAIMER)}
      </div>
    </td></tr>
    <tr><td style="background:#0E240F;padding:22px 32px;font:15px/1.6 ${sans};color:#CFC6B0;">
      <div style="font:600 18px/1.4 ${serif};color:#DDB579;">${h(BUSINESS_NAME)}</div>
      <div><a href="${WEBSITE}" style="color:#F6EEDD;">www.shahandamin.com</a></div>
      <div>${h(HOURS_TEXT)}</div>
      <div style="margin-top:12px;font-size:14px;">You are receiving this email because an appointment was requested with this address at shahandamin.com. If that wasn’t you, you can ignore this email.</div>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;

  const ics = buildIcs_({
    uid: `booking-${Utilities.getUuid()}@shahandamin.com`,
    title: 'Appointment request — Shah & Amin',
    start: b.start,
    end: b.end,
    location: { 'In person': 'In person — place to be confirmed', Phone: 'Phone call', Video: 'Video call (link to follow)' }[meeting] || '',
    description: `Requested appointment${topic ? ' about ' + topic : ''}${advisor ? ' with ' + advisor.name : ''}. Not confirmed yet — we will call or email you to confirm.\n\nQuestions or changes? Call ${callLine}.`,
  });

  const options = {
    to: b.email,
    subject: `Your appointment request — ${dateShort} at ${b.time}`,
    body: text,
    htmlBody: html,
    name: BUSINESS_NAME,
    attachments: [Utilities.newBlob(ics, 'text/calendar', 'shah-amin-appointment.ics')],
  };
  // Replies go to the advisor they chose (with no preference, to this account's inbox).
  if (advisor) options.replyTo = advisor.email;
  MailApp.sendEmail(options);
}

/** First word of a name, if it looks like a real name (letters only). Otherwise '' and the email says "Hello,". */
function firstName_(name) {
  const first = String(name || '').trim().split(/\s+/)[0] || '';
  return /^[\p{L}\p{M}'’.-]{1,30}$/u.test(first) && /\p{L}/u.test(first) ? first : '';
}

/** Short, ordinary text only (no web addresses or odd characters), else ''. */
function plainText_(value, max) {
  const v = String(value || '').trim();
  if (!v || v.length > max) return '';
  if (/:\/\/|www\.|@|\.[a-z]{2,}\b/i.test(v)) return '';
  return /^[\p{L}\p{M}\p{N} &()'’,.\-\/]+$/u.test(v) ? v : '';
}

function esc_(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** A calendar file (.ics) — the same format the website's "Add to my calendar" button makes. */
function buildIcs_(ev) {
  const stamp = d => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const escText = s => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r\n|\r|\n/g, '\\n');
  // Fold long lines at 75 bytes, as the calendar standard asks (never splitting a character).
  const fold = line => {
    const parts = [];
    let cur = '';
    let bytes = 0;
    let limit = 75;
    for (const ch of line) {
      const code = ch.codePointAt(0);
      const size = code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4;
      if (bytes + size > limit) {
        parts.push(cur);
        cur = '';
        bytes = 0;
        limit = 74;
      }
      cur += ch;
      bytes += size;
    }
    parts.push(cur);
    return parts.join('\r\n ');
  };
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Shah & Amin Financial Services//Bookings//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${ev.uid}`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(ev.start)}`,
    `DTEND:${stamp(ev.end)}`,
    `SUMMARY:${escText(ev.title)}`,
  ];
  if (ev.location) lines.push(`LOCATION:${escText(ev.location)}`);
  if (ev.description) lines.push(`DESCRIPTION:${escText(ev.description)}`);
  lines.push(`URL:${WEBSITE}/book/`, 'END:VEVENT', 'END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
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
