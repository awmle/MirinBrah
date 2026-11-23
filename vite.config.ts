import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['apple-touch-icon.png', 'favicon.png'],
      manifest: {
        name: 'You Mirin Brah',
        short_name: 'Mirin Brah',
        description: 'Workout routines, logging and progress — stored on your phone.',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        scope: './',
        background_color: '#0E0F11',
        theme_color: '#0E0F11',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}']
      }
    })
  ],
  test: {
    environment: 'node'
  }
});
