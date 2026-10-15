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
  // During the home intro the intro script is animating it, so it waits until that ends.
  if (document.querySelector('[data-peacock-root]')) {
    let loaded = false;
    const load = () => {
      if (loaded) return;
      loaded = true;
      onIdle(() => {
        import('./peacock/index').then((m) => m.initPeacock()).catch((err) => console.warn('[peacock]', err));
      });
    };
    const html = document.documentElement;
    if (html.classList.contains('intro-play') && !html.classList.contains('intro-done')) {
      window.addEventListener('sa:intro-done', load, { once: true });
      window.setTimeout(load, 12000); // never left waiting if the intro fails to start
    } else load();
  }
});
