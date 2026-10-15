import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';
import vercel from './vercel.json';

// Absolute URL for og:image (WhatsApp/Telegram previews need it). Vercel exposes the production host at build time.
const siteUrl = (process.env.SITE_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? 'https://' + process.env.VERCEL_PROJECT_PRODUCTION_URL : '')).replace(/\/$/, '');

// `vite preview` serves the same security headers as production, so CSP problems show up locally.
const previewHeaders = Object.fromEntries(
  (vercel.headers.find((h) => h.source === '/(.*)')?.headers ?? []).map((h) => [h.key, h.value])
);

export default defineConfig({
  // .env uses the NEXT_PUBLIC_ prefix; expose it alongside Vite's default VITE_
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  preview: { headers: previewHeaders },
  plugins: [
    preact(),
    { name: 'site-url', transformIndexHtml: (html) => html.replaceAll('__SITE_URL__', siteUrl) },
    VitePWA({
      registerType: 'prompt', // the app shows an "update available" toast instead of reloading mid-edit
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'GuruLog — Personal Teaching Companion',
        short_name: 'GuruLog',
        description: 'Jurnal, perencanaan, dan sumber belajar guru dalam satu tempat.',
        lang: 'id',
        theme_color: '#f9f9f7',
        background_color: '#f7f8fc',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
        shortcuts: [
          { name: 'Catatan baru', short_name: 'Catat', url: '/journal' },
          { name: 'Tugas', short_name: 'Tugas', url: '/tasks' },
        ],
      },
    }),
  ],
  test: { environment: 'jsdom', include: ['src/**/*.test.ts'] },
});
