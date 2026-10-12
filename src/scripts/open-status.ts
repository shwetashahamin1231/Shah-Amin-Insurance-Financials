/**
 * Fills every [data-open-status] element with a live "Open now" line,
 * calculated in Eastern Time (holidays included), refreshed each minute.
 */
import { getOpenStatus } from '../lib/hours';

function render() {
  const status = getOpenStatus();
  document.querySelectorAll<HTMLElement>('[data-open-status]').forEach((el) => {
    el.textContent = status.detail ? `${status.label} — ${status.detail}` : status.label;
    el.dataset.open = String(status.open);
    el.hidden = false;
  });
}

render();
setInterval(render, 60_000);
