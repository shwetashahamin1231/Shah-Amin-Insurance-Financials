// Astro build configuration. Business details live in src/config/site.ts, not here.
import { defineConfig, fontProviders } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { SITE } from './src/config/site';

// When hosting under a sub-path (e.g. username.github.io/repo-name/), set BASE_PATH=/repo-name/.
// With a custom domain this stays "/".
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  site: SITE.url,
  base,
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'auto' },
  // Lossless whitespace handling (keeps spaces between inline elements intact).
  compressHTML: true,

  integrations: [
    sitemap({
      // Internal reference pages stay out of search results.
      filter: (page) => !/\/(styleguide|dev)\//.test(page),
    }),
  ],

  // Self-hosted fonts with metric-matched fallbacks (no layout shift when they load).
  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: 'Cormorant Garamond',
      cssVariable: '--font-display',
      weights: [500, 600],
      styles: ['normal', 'italic'],
      subsets: ['latin'],
      fallbacks: ['Georgia', 'Times New Roman', 'serif'],
    },
    {
      provider: fontProviders.fontsource(),
      name: 'Jost',
      cssVariable: '--font-body',
      weights: ['400 600'],
      styles: ['normal', 'italic'],
      subsets: ['latin'],
      fallbacks: ['Helvetica Neue', 'Arial', 'sans-serif'],
    },
  ],

  image: {
    // Generated responsive images get sensible defaults.
    responsiveStyles: true,
  },

  vite: {
    build: { assetsInlineLimit: 2048 },
  },
});
