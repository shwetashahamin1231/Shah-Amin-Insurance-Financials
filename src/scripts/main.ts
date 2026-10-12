/**
 * Site entry script (bundled by Astro, loaded on every page).
 * Interactive basics start immediately; animation code waits until the page
 * is actually shown (not while being prerendered in the background).
 */
import { initHeader } from './header';
import { initDialogs } from './dialogs';
import { initPreferences } from './preferences';
import { onIdle, whenActivated } from './lib/env';

initHeader();
initDialogs();
initPreferences();

whenActivated(() => {
  try {
    sessionStorage.setItem('sa-visited', '1');
  } catch {
    /* storage unavailable */
  }
  import('./motion/index').then((m) => m.initMotion());
  // The peacock mascot loads when the browser is idle, so it never competes with page content.
  if (document.querySelector('[data-peacock-root]')) {
    onIdle(() => {
      import('./peacock/index').then((m) => m.initPeacock()).catch((err) => console.warn('[peacock]', err));
    });
  }
});
