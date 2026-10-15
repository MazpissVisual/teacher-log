import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // .env uses the NEXT_PUBLIC_ prefix; expose it alongside Vite's default VITE_
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  plugins: [
    preact(),
    VitePWA({
      registerType: 'prompt', // the app shows an "update available" toast instead of reloading mid-edit
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'GuruLog — Personal Teaching Companion',
        short_name: 'GuruLog',
        description: 'Jurnal, perencanaan, dan sumber belajar guru dalam satu tempat.',
        lang: 'id',
        theme_color: '#635bdb',
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
          { name: 'Catatan baru', short_name: 'Catat', url: '/#/journal' },
          { name: 'Tugas', short_name: 'Tugas', url: '/#/tasks' },
        ],
      },
    }),
  ],
  test: { environment: 'jsdom', include: ['src/**/*.test.ts'] },
});
