import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**']
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      filename: 'service-worker.js',
      injectRegister: null,
      manifestFilename: 'manifest.json',
      registerType: 'prompt',
      includeAssets: [
        'favicon.ico',
        'offline.html',
        'assets/icons/*.png',
        'assets/logo.svg',
        'assets/logo-small.svg',
        'assets/vendor/phosphor/**/*.css',
        'assets/vendor/phosphor/**/*.woff2'
      ],
      manifest: {
        name: 'Aplicativo Consultoria',
        short_name: 'Consultoria',
        description: 'Plataforma de consultoria esportiva para alunos e treinador.',
        id: '/index.html',
        start_url: '/index.html',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#08120f',
        theme_color: '#98E52B',
        lang: 'pt-BR',
        categories: ['health', 'fitness', 'lifestyle', 'productivity'],
        icons: [
          {
            src: 'assets/icons/app-logo.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'assets/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'assets/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'assets/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        shortcuts: [
          {
            name: 'Area do Aluno',
            short_name: 'Aluno',
            url: '/index.html'
          },
          {
            name: 'Area do Treinador',
            short_name: 'Treinador',
            url: '/trainer.html'
          }
        ]
      },
      workbox: {
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{html,js,css,svg,png,ico,woff2}'],
        navigateFallback: '/index.html',
        skipWaiting: true,
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'document',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'consultoria-pages',
              expiration: {
                maxEntries: 12,
                maxAgeSeconds: 60 * 60 * 24 * 7
              }
            }
          },
          {
            urlPattern: ({ request }) =>
              request.destination === 'script' || request.destination === 'style',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'consultoria-assets'
            }
          },
          {
            urlPattern: ({ request }) =>
              request.destination === 'image' || request.destination === 'font',
            handler: 'CacheFirst',
            options: {
              cacheName: 'consultoria-static',
              expiration: {
                maxEntries: 80,
                maxAgeSeconds: 60 * 60 * 24 * 30
              }
            }
          }
        ]
      }
    })
  ]
});
