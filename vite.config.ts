import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    preact(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'GuruLog — Personal Teaching Companion',
        short_name: 'GuruLog',
        description: 'Jurnal, perencanaan, dan sumber belajar guru dalam satu tempat.',
        lang: 'id',
        theme_color: '#635bdb',
        background_color: '#f7f8fc',
        display: 'standalone',
        start_url: '/',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
      },
    }),
  ],
});
