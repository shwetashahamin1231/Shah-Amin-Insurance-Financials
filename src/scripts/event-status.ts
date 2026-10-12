/**
 * Re-checks every event card's status in the visitor's browser, so events
 * switch to "Past Event" and close RSVPs on time even if the site was built
 * days earlier. Runs immediately (the cards are already in the page).
 */
const DAY_END = (iso: string) => `${iso.slice(0, 10)}T23:59:59${iso.match(/([+-]\d{2}:\d{2}|Z)$/)?.[1] ?? '-05:00'}`;
const DAY_START = (iso: string) => `${iso.slice(0, 10)}T00:00:00${iso.match(/([+-]\d{2}:\d{2}|Z)$/)?.[1] ?? '-05:00'}`;
const LABELS = { upcoming: 'Upcoming', today: 'Today', past: 'Past Event' } as const;

export function refreshEventStatus(now = Date.now()): void {
  document.querySelectorAll<HTMLElement>('[data-event-card], [data-event-detail]').forEach((card) => {
    const start = card.dataset.start;
    if (!start) return;
    const end = Date.parse(card.dataset.end || DAY_END(start));
    const status = now > end ? 'past' : now >= Date.parse(DAY_START(start)) ? 'today' : 'upcoming';
    const rsvpOpen = card.dataset.rsvp === '1' && now < Date.parse(card.dataset.rsvpCloses || start);

    card.classList.remove('is-upcoming', 'is-today', 'is-past');
    card.classList.add(`is-${status}`);
    card.querySelectorAll<HTMLElement>('[data-event-status]').forEach((el) => {
      if (el.textContent !== LABELS[status]) el.textContent = LABELS[status];
    });
    card.querySelectorAll<HTMLElement>('[data-rsvp-action]').forEach((el) => (el.hidden = !rsvpOpen));
    card.querySelectorAll<HTMLElement>('[data-rsvp-closed]').forEach((el) => (el.hidden = rsvpOpen || card.dataset.rsvp !== '1'));
  });
}

refreshEventStatus();
