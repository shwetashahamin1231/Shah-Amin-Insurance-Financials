/**
 * ════════════════════════════════════════════════════════════════════
 *  BOOKING SCHEDULER — the three-step "Book an Appointment" form
 * ════════════════════════════════════════════════════════════════════
 *  Step 1 · Choose a date (calendar + times)  →  Step 2 · Your details
 *  →  Step 3 · Review  →  Send  →  "Request received" (+ add to calendar)
 *
 *  All three steps live in ONE <form>; hidden steps keep their values,
 *  so going Back never loses anything. Sent to the "Bookings" Apps
 *  Script with: name, email, phone, advisor, topic, meetingType, date,
 *  time, message, website (spam trap) and page.
 *
 *  Links can preselect choices:  /book/?advisor=gautam  or  ?advisor=shweta
 *                                /book/?topic=medicare-plans  (any service slug,
 *                                plus "medicare-review" and "other")
 *  Markup: src/components/forms/BookingScheduler.astro
 * ════════════════════════════════════════════════════════════════════
 */
import { ADVISORS, ADVISOR_LIST, SITE, formattedAddress } from '../../config/site';
import { BOOKING, FORM_MESSAGES } from '../../config/forms';
import { etToUtc, formatDateLong, formatDateNoYear, localSlotTime, localTimeZone } from '../../lib/time';
import { getAvailableSlots, getDayStatus, groupByPeriod, isSlotBookable } from '../../lib/slots';
import { buildIcs, downloadIcs, googleCalendarUrl, type CalendarEvent } from '../../lib/ics';
import { firstName, formatPhone } from '../../lib/validation';
import { whenActivated } from '../lib/env';
import { createCalendar, type SelectVia } from './calendar';
import { createFormEngine } from './engine';
import { animateIn, announce, revealPanel } from './status';

const reducedMotion = () => document.documentElement.classList.contains('reduce-motion');

export function initScheduler(root: HTMLElement): void {
  const prefix = root.dataset.idPrefix || 'book';
  const form = root.querySelector<HTMLFormElement>('form[data-scheduler-form]');
  const success = root.querySelector<HTMLElement>('[data-form-success]');
  const calRoot = root.querySelector<HTMLElement>('[data-cal]');
  const dateInput = form?.querySelector<HTMLInputElement>('input[name="date"]');
  const pageInput = form?.querySelector<HTMLInputElement>('input[name="page"]');
  const slotsField = form?.querySelector<HTMLElement>('[data-slots-field]');
  const slotsBody = form?.querySelector<HTMLElement>('[data-slots-body]');
  const groupTpl = root.querySelector<HTMLTemplateElement>('template[data-group-template]');
  const slotTpl = root.querySelector<HTMLTemplateElement>('template[data-slot-template]');
  if (!form || !success || !calRoot || !dateInput || !pageInput || !slotsField || !slotsBody || !groupTpl || !slotTpl) return;
  // Start clean: a browser may restore an old hidden date after Back/Forward without restoring the calendar.
  dateInput.value = '';

  const steps = [1, 2, 3].map((n) => form.querySelector<HTMLElement>(`[data-step="${n}"]`));
  if (steps.some((s) => !s)) return;
  const stepEl = (n: number) => steps[n - 1] as HTMLElement;

  const q = <T extends HTMLElement = HTMLElement>(sel: string) => root.querySelector<T>(sel);
  const live = form.querySelector<HTMLElement>('[data-form-live]');
  const zone = localTimeZone();

  let step = 1;
  let returnToReview = false; // came here from a "Change" link on the review step
  let slotGone = false; // the chosen time slipped inside the notice period
  let navigating = false;

  const timeInput = () => form.querySelector<HTMLInputElement>('input[name="time"]:checked');
  const chosenTime = () => timeInput()?.dataset.time ?? '';

  /* ───────────── Step 1: calendar + times ───────────── */

  function updateSelectionLine() {
    const line = q('[data-selection]');
    if (!line) return;
    const date = dateInput!.value;
    const t = timeInput();
    line.textContent = date && t ? `${formatDateLong(date)} at ${t.value}` : '';
    line.closest<HTMLElement>('[data-selection-wrap]')?.toggleAttribute('hidden', !line.textContent);
  }

  function renderSlots(date: string, via: SelectVia | 'refresh') {
    const keep = chosenTime();
    const focusedTime = slotsBody!.contains(document.activeElement) ? (document.activeElement as HTMLInputElement).dataset.time : undefined;
    const prompt = q('[data-slots-prompt]');
    const empty = q('[data-slots-empty]');
    const dateLine = q('[data-slots-date]');
    const localNote = q('[data-local-note]');
    slotsBody!.replaceChildren();

    if (!date) {
      if (prompt) prompt.hidden = false;
      if (empty) empty.hidden = true;
      if (dateLine) dateLine.hidden = true;
      if (localNote) localNote.hidden = true;
      slotsField!.dataset.focusId = calendar.activeCellId();
      updateSelectionLine();
      return;
    }

    if (prompt) prompt.hidden = true;
    if (dateLine) {
      dateLine.hidden = false;
      dateLine.textContent = `For ${formatDateLong(date)}`;
    }
    const now = new Date();
    const slots = getAvailableSlots(date, now);

    if (!slots.length) {
      const status = getDayStatus(date, now);
      if (empty) {
        empty.hidden = false;
        empty.textContent = `${status.note ?? 'No times are available'} — please choose another day.`;
      }
      if (localNote) localNote.hidden = true;
      slotsField!.dataset.focusId = calendar.activeCellId();
      updateSelectionLine();
      if (via !== 'refresh') announce(live, empty?.textContent ?? '');
      return;
    }
    if (empty) empty.hidden = true;

    let showsLocal = false;
    let zoneLabel = '';
    for (const group of groupByPeriod(slots)) {
      const g = groupTpl!.content.firstElementChild?.cloneNode(true) as HTMLElement;
      const heading = g.querySelector<HTMLElement>('.slots__period');
      const list = g.querySelector<HTMLElement>('.slots__list');
      if (!heading || !list) continue;
      heading.id = `${prefix}-period-${group.period}`;
      heading.textContent = group.label;
      g.setAttribute('aria-labelledby', heading.id);

      for (const slot of group.slots) {
        const el = slotTpl!.content.firstElementChild?.cloneNode(true) as HTMLElement;
        const input = el.querySelector<HTMLInputElement>('input');
        if (!input) continue;
        input.id = `${prefix}-time-${slot.time.replace(':', '')}`;
        input.value = slot.value;
        input.dataset.time = slot.time;
        input.required = true;
        input.checked = slot.time === keep;
        const et = el.querySelector('[data-et]');
        if (et) et.textContent = slot.label;
        const local = localSlotTime(date, slot.time, zone);
        if (local.differs) {
          showsLocal = true;
          zoneLabel = local.zone;
          const wrap = el.querySelector<HTMLElement>('[data-local]');
          const text = el.querySelector('[data-local-text]');
          if (wrap && text) {
            wrap.hidden = false;
            text.textContent = local.label;
          }
        }
        list.append(el);
      }
      slotsBody!.append(g);
    }

    if (localNote) {
      localNote.hidden = !showsLocal;
      localNote.textContent = showsLocal ? `Your own time${zoneLabel ? ` (${zoneLabel})` : ''} is shown under each one.` : '';
    }
    const first = slotsBody!.querySelector<HTMLInputElement>('input:checked') ?? slotsBody!.querySelector<HTMLInputElement>('input');
    if (first) slotsField!.dataset.focusId = first.id;
    if (focusedTime) slotsBody!.querySelector<HTMLInputElement>(`input[data-time="${focusedTime}"]`)?.focus();
    updateSelectionLine();

    if (via !== 'refresh') {
      animateIn(slotsBody!, 10);
      announce(live, `${slots.length} ${slots.length === 1 ? 'time is' : 'times are'} available on ${formatDateNoYear(date)}.`);
    }
    // On phones the times appear below the calendar — bring them into view after a tap.
    if (via === 'pointer') {
      const r = slotsField!.getBoundingClientRect();
      if (r.top > window.innerHeight - 120) slotsField!.scrollIntoView({ block: 'start', behavior: reducedMotion() ? 'auto' : 'smooth' });
    }
  }

  const calendar = createCalendar(calRoot, {
    idPrefix: prefix,
    announce: (msg) => announce(live, msg),
    onSelect(date, via) {
      dateInput!.value = date;
      dateInput!.dispatchEvent(new Event('change', { bubbles: true })); // clears a "Please choose a date" error
      renderSlots(date, via);
    },
  });

  slotsBody.addEventListener('change', () => {
    slotGone = false;
    updateSelectionLine();
  });

  /* ───────────── The form engine (validation, sending) ───────────── */

  const engine = createFormEngine(form, {
    kind: 'booking',
    manualSubmit: true,
    validators: {
      date: () => {
        const date = dateInput.value;
        if (!date) return 'Please choose a date.';
        const status = getDayStatus(date);
        if (status.bookable) return null;
        if (status.reason === 'past') return 'That date has passed — please choose another date.';
        if (status.reason === 'no-times-left') return 'There are no times left on that day — please choose another date.';
        return 'That day isn’t available — please choose another date.';
      },
      time: () => {
        const date = dateInput.value;
        if (!date || !getDayStatus(date).bookable) return null; // the date message covers it
        const time = chosenTime();
        if (!time) return slotGone ? FORM_MESSAGES.slotGone : 'Please choose a time.';
        return isSlotBookable(date, time) ? null : FORM_MESSAGES.slotGone;
      },
    },
    prepare() {
      pageInput.value = location.href.split('#')[0];
    },
    retry: () => void finalSubmit(),
    onSuccess: showConfirmation,
  });

  /* ───────────── Moving between steps ───────────── */

  function updateProgress() {
    root.querySelectorAll<HTMLElement>('[data-progress-step]').forEach((li) => {
      const n = Number(li.dataset.progressStep);
      li.classList.toggle('is-current', n === step);
      li.classList.toggle('is-done', n < step);
      if (n === step) li.setAttribute('aria-current', 'step');
      else li.removeAttribute('aria-current');
      const state = li.querySelector('[data-progress-state]');
      if (state) state.textContent = n < step ? ' (completed)' : '';
    });
    form!.querySelectorAll('[data-continue-label]').forEach((el) => (el.textContent = returnToReview ? 'Back to review' : 'Continue'));
  }

  async function swapSteps(from: HTMLElement, to: HTMLElement, dir: number) {
    const reduce = reducedMotion();
    if (!reduce && typeof from.animate === 'function') {
      // Exit ≈ 70% of the entrance, per the motion rules.
      const out = from.animate(
        [
          { opacity: 1, transform: 'none' },
          { opacity: 0, transform: `translateX(${-18 * dir}px)` },
        ],
        { duration: 290, easing: 'cubic-bezier(0.7, 0, 0.84, 0)', fill: 'forwards' },
      );
      try {
        await out.finished;
      } catch {
        /* interrupted — carry on */
      }
    }
    from.hidden = true;
    from.getAnimations().forEach((a) => a.cancel());
    to.hidden = false;
    if (typeof to.animate !== 'function') return;
    if (reduce) to.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: 'ease-out' });
    else
      to.animate(
        [
          { opacity: 0, transform: `translateX(${26 * dir}px)` },
          { opacity: 1, transform: 'none' },
        ],
        { duration: 420, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
      );
  }

  async function goTo(target: number, focusId?: string) {
    if (navigating) return;
    if (target === step) {
      if (focusId) document.getElementById(focusId)?.focus();
      return;
    }
    navigating = true;
    try {
      engine.hideSummary();
      engine.hideError();
      if (target === 3) fillReview();
      if (target === 1) {
        calendar.refresh();
        renderSlots(dateInput!.value, 'refresh');
      }
      const dir = target > step ? 1 : -1;
      await swapSteps(stepEl(step), stepEl(target), dir);
      step = target;
      updateProgress();

      // Focus the new step's heading — or the exact field when arriving from a "Change" link
      // (for radio buttons, the option that's currently chosen).
      let focusEl = (focusId && document.getElementById(focusId)) || stepEl(target).querySelector<HTMLElement>('[data-step-heading]');
      if (focusEl instanceof HTMLInputElement && focusEl.type === 'radio') {
        focusEl = form!.querySelector<HTMLInputElement>(`input[name="${focusEl.name}"]:checked`) ?? focusEl;
      }
      focusEl?.focus({ preventScroll: true });
      const anchor = focusId ? (focusEl?.closest<HTMLElement>('[data-field]') ?? focusEl) : root;
      const r = anchor?.getBoundingClientRect();
      if (anchor && r && (r.top < 0 || r.top > window.innerHeight * 0.75)) anchor.scrollIntoView({ block: focusId ? 'center' : 'start' });
    } finally {
      navigating = false;
    }
  }

  function onContinue() {
    if (step === 1) {
      if (!engine.validate(stepEl(1))) return;
      void goTo(returnToReview && engine.validate(stepEl(2), { show: false }) ? 3 : 2);
    } else if (step === 2) {
      if (!engine.validate(stepEl(2))) return;
      void goTo(3);
    }
  }

  async function finalSubmit() {
    // The chosen time may have slipped inside the notice period while the page sat open.
    if (!isSlotBookable(dateInput!.value, chosenTime())) {
      slotGone = true;
      returnToReview = true;
      await goTo(1);
      engine.validate(stepEl(1));
      return;
    }
    for (const n of [1, 2]) {
      if (!engine.validate(stepEl(n), { show: false })) {
        await goTo(n);
        engine.validate(stepEl(n));
        return;
      }
    }
    await engine.submit();
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (step < 3) onContinue(); // pressing Enter in a field means "Continue"
    else void finalSubmit();
  });
  form.querySelectorAll('[data-next]').forEach((b) => b.addEventListener('click', onContinue));
  form.querySelectorAll('[data-back]').forEach((b) =>
    b.addEventListener('click', () => {
      returnToReview = false;
      void goTo(step - 1);
    }),
  );
  form.querySelectorAll<HTMLElement>('[data-edit-step]').forEach((b) =>
    b.addEventListener('click', () => {
      returnToReview = true;
      const target = Number(b.dataset.editStep);
      const focus = b.dataset.editFocus === 'date' ? calendar.activeCellId() : b.dataset.editFocus;
      void goTo(target, focus);
    }),
  );

  /* ───────────── Step 3: review ───────────── */

  function fillReview() {
    const data = new FormData(form!);
    const text = (key: string) => String(data.get(key) ?? '').trim();
    const set = (key: string, value: string) => {
      const el = form!.querySelector<HTMLElement>(`[data-review="${key}"]`);
      if (el) el.textContent = value;
    };
    const date = dateInput!.value;
    const t = timeInput();
    set('when', date && t ? `${formatDateLong(date)} at ${t.value}` : '');
    const local = date && t?.dataset.time ? localSlotTime(date, t.dataset.time, zone) : null;
    set('local', local?.differs ? `That’s ${local.label} your time.` : '');
    form!.querySelector<HTMLElement>('[data-review="local"]')?.toggleAttribute('hidden', !local?.differs);
    set('name', text('name'));
    set('email', text('email'));
    set('phone', formatPhone(text('phone')));
    set('advisor', text('advisor') || 'No preference');
    set('topic', text('topic'));
    set('meetingType', text('meetingType'));
    set('message', text('message') || 'None');
  }

  /* ───────────── Done: confirmation + add to calendar ───────────── */

  function showConfirmation(data: FormData) {
    const text = (key: string) => String(data.get(key) ?? '').trim();
    const date = text('date');
    const time = chosenTime();
    const advisor = text('advisor') || 'No preference';
    const meeting = text('meetingType');
    const topic = text('topic');
    const name = firstName(text('name'));
    const who = advisor === 'No preference' ? 'One of our advisors' : (advisor.split(' ')[0] ?? advisor);
    const local = localSlotTime(date, time, zone);

    const set = (key: string, value: string) => {
      const el = success!.querySelector<HTMLElement>(`[data-confirm="${key}"]`);
      if (el) el.textContent = value;
    };
    set('thanks', `Thank you${name ? `, ${name}` : ''}. We’ve received your request for ${formatDateLong(date)} at ${text('time')}${local.differs ? ` (${local.label} your time)` : ''}.`);
    set('next', `It isn’t booked until we confirm it: ${who} will call or email you to confirm${meeting === 'Video' ? ' and send the video link' : ''}.`);
    set('meeting', meeting);
    set('topic', topic);
    set('advisor', advisor);

    const start = etToUtc(date, time);
    const end = new Date(start.getTime() + BOOKING.slotMinutes * 60_000);
    const phones = ADVISOR_LIST.map((a) => `${a.firstName} ${a.phone}`).join(' or ');
    const kind = meeting === 'In person' ? 'in-person' : meeting.toLowerCase();
    const entry: CalendarEvent = {
      uid: `booking-${date}-${time.replace(':', '')}-${Math.random().toString(36).slice(2, 10)}@${location.hostname || 'shahandamin.com'}`,
      title: `Appointment request — ${SITE.shortName}`,
      start,
      end,
      location: meeting === 'In person' ? formattedAddress() || `${SITE.name}, New Jersey` : meeting === 'Phone' ? 'Phone call' : 'Video call (link to follow)',
      description: `Requested ${kind} appointment about ${topic}${advisor !== 'No preference' ? ` with ${advisor}` : ''}. Not confirmed yet — we will call or email you to confirm.\n\nQuestions or changes? Call ${phones}.`,
      url: `${location.origin}${location.pathname}`,
    };
    const gcal = success!.querySelector<HTMLAnchorElement>('[data-gcal]');
    if (gcal) gcal.href = googleCalendarUrl(entry);
    success!.querySelector('[data-ics]')?.addEventListener('click', () => downloadIcs(`shah-amin-appointment-${date}.ics`, buildIcs(entry)));

    form!.hidden = true;
    root.querySelector<HTMLElement>('[data-progress]')?.setAttribute('hidden', '');
    revealPanel(success!);
  }

  /* ───────────── Links that preselect choices ───────────── */

  const params = new URLSearchParams(location.search);
  const advisorId = params.get('advisor')?.toLowerCase().trim();
  if (advisorId && Object.hasOwn(ADVISORS, advisorId)) {
    const name = ADVISORS[advisorId as keyof typeof ADVISORS].name;
    form.querySelectorAll<HTMLInputElement>('input[name="advisor"]').forEach((r) => (r.checked = r.value === name));
  }
  const topicSlug = params.get('topic')?.toLowerCase().trim();
  if (topicSlug) {
    const topic = form.querySelector<HTMLSelectElement>('select[name="topic"]');
    const option = topic ? Array.from(topic.options).find((o) => o.dataset.slug === topicSlug) : undefined;
    if (option) option.selected = true;
  }

  /* ───────────── Keep "today" honest ───────────── */

  const refresh = () => {
    if (step !== 1 || form.hidden) return;
    calendar.refresh();
    renderSlots(dateInput.value, 'refresh');
  };
  whenActivated(refresh); // the page may have been prerendered in the background
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refresh();
  });
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) refresh();
  });

  updateProgress();
  renderSlots('', 'refresh');
}
