import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const buildId = Date.now().toString();

export default defineConfig({
  define: {
    __APP_BUILD_ID__: JSON.stringify(buildId),
  },
  plugins: [
    react({
      include: /\.[jt]sx?$/,
    }),
    VitePWA({
      registerType: 'autoUpdate',
      manifestFilename: 'manifest.json',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'icons.svg', 'pwa-192x192.png', 'pwa-512x512.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Saya Industrial Team App',
        short_name: 'Saya Team',
        description: 'Enterprise team member app for tasks, follow-ups, payments, and notifications.',
        theme_color: '#0D9488',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/dashboard',
        scope: '/',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/icons.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        importScripts: ['firebase-messaging-sw.js'],
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],

        // Denylist Firebase + Admin + API from SW interception entirely
        navigateFallbackDenylist: [
          /^\/admin(?:\/.*)?$/,
          /^\/api(?:\/.*)?$/,
          /^\/_/,
          /\/[^/?]+\.[^/]+$/,  // URLs with file extensions
          /firestore\.googleapis\.com/,
          /identitytoolkit\.googleapis\.com/,
          /securetoken\.googleapis\.com/,
          /firebase/,
          /googleapis/,
        ],

        offlineGoogleAnalytics: false,

        runtimeCaching: [
          // Firebase Firestore — NEVER cache, always network
          {
            urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
            handler: 'NetworkOnly',
          },
          // Firebase Auth — NEVER cache, always network
          {
            urlPattern: /^https:\/\/identitytoolkit\.googleapis\.com\/.*/i,
            handler: 'NetworkOnly',
          },
          // Firebase secure token — NEVER cache
          {
            urlPattern: /^https:\/\/securetoken\.googleapis\.com\/.*/i,
            handler: 'NetworkOnly',
          },
          // Firebase Cloud Functions — NEVER cache
          {
            urlPattern: /^https:\/\/asia-south1-.+\.cloudfunctions\.net\/.*/i,
            handler: 'NetworkOnly',
          },
          // Google Fonts CSS — long-lived cache
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Google Fonts files — long-lived cache
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // App JS/CSS/images — cache first (versioned filenames handle invalidation)
          {
            urlPattern: /\.(?:js|css|woff2?|png|jpg|jpeg|svg|ico|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-assets-v1',
              expiration: {
                maxEntries: 120,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // App HTML navigation — NetworkFirst with generous 8s timeout
          // Falls back to cached index.html only if TRULY offline (not just slow)
          {
            urlPattern: ({ request, url }) => (
              request.mode === 'navigate'
              && !url.pathname.startsWith('/admin')
            ),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'html-nav-cache',
              networkTimeoutSeconds: 8,
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24,
              },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
  css: {
    postcss: './postcss.config.js',
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
    rolldownOptions: {
      output: {
        advancedChunks: {
          groups: [
            { name: 'firebase', test: /node_modules\/firebase/ },
            { name: 'vendor', test: /node_modules\/(react|react-dom|react-router-dom)/ },
            { name: 'charts', test: /node_modules\/recharts/ },
            { name: 'ui', test: /node_modules\/lucide-react/ },
          ],
        },
        minify: {
          compress: {
            dropConsole: true,
            dropDebugger: true,
          },
        },
      },
    },
  },
  optimizeDeps: {
    include: [
      'react', 'react-dom', 'react-router-dom',
      'firebase/app',
      'firebase/auth',
      'firebase/firestore',
      'firebase/messaging',
    ],
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'https://sasasssss.vercel.app',
        changeOrigin: true,
        secure: true,
      }
    }
  },
})
