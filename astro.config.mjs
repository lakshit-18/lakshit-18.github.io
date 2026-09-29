// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';
import expressiveCode from 'astro-expressive-code';
import tailwindcss from '@tailwindcss/vite';
import { remarkReadingTime } from './src/lib/remark-reading-time.mjs';

export default defineConfig({
  site: 'https://lakshit-18.github.io',
  output: 'static',
  trailingSlash: 'never',
  // 'file' emits /work/checkout-platform.html, which GitHub Pages serves at the
  // slash-less URL with no redirect (matches trailingSlash: 'never').
  build: { format: 'file' },
  integrations: [
    expressiveCode({
      themes: ['github-dark', 'github-light'],
      useDarkModeMediaQuery: false,
      themeCssSelector: (theme) =>
        theme.type === 'dark' ? ':root:not([data-theme="light"])' : ':root[data-theme="light"]',
    }),
    mdx(),
    preact(),
    sitemap(),
  ],
  markdown: { remarkPlugins: [remarkReadingTime] },
  // Cast: @tailwindcss/vite and Astro bundle different Vite type versions (harmless at runtime).
  vite: { plugins: [/** @type {any} */ (tailwindcss())] },
});
