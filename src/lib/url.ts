/**
 * Build an internal link that respects the site's base path, so the site works
 * both on a custom domain ("/") and under a sub-path like "/repo-name/".
 *   url('/about/') → '/about/'   (or '/repo-name/about/')
 * External, mailto:, tel: and #hash links pass through untouched.
 */
const BASE = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;

export function url(path = '/'): string {
  if (/^(https?:|mailto:|tel:|#|data:)/.test(path)) return path;
  return BASE + path.replace(/^\//, '');
}

/** True when `href` is the current page (or a parent section of it). */
export function isCurrent(href: string, pathname: string, exact = false): boolean {
  const target = url(href);
  if (exact || href === '/') return pathname === target;
  return pathname === target || pathname.startsWith(target);
}
