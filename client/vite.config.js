import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icons/*.png', 'icons/*.svg'],
      manifest: {
        name: 'PitStop',
        short_name: 'PitStop',
        description: 'Personal companion dashboard for TVS NTORQ scooter',
        theme_color: '#09090b',
        background_color: '#09090b',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/icons/icon-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Start ride',
            short_name: 'Ride',
            description: 'Start live GPS tracking',
            url: '/rides/live',
            icons: [{ src: '/icons/shortcut-ride.png', sizes: '96x96' }],
          },
          {
            name: 'Park here',
            short_name: 'Park',
            description: 'Save parking spot location',
            url: '/parking',
            icons: [{ src: '/icons/shortcut-park.png', sizes: '96x96' }],
          },
          {
            name: 'Update odometer',
            short_name: 'Odometer',
            description: 'Enter current odometer reading',
            url: '/odometer?action=new',
            icons: [{ src: '/icons/shortcut-odo.png', sizes: '96x96' }],
          },
          {
            name: 'Log fuel',
            short_name: 'Fuel',
            description: 'Log petrol refill',
            url: '/fuel?action=new',
            icons: [{ src: '/icons/shortcut-fuel.png', sizes: '96x96' }],
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            // Google Fonts cache
            urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
              },
            },
          },
          {
            // Safe GET APIs cached NetworkFirst for offline viewing
            // NEVER cache auth endpoints, uploads, reports, or non-GET requests
            urlPattern: ({ url, request }) =>
              request.method === 'GET' &&
              url.pathname.startsWith('/api/') &&
              !url.pathname.startsWith('/api/auth') &&
              !url.pathname.startsWith('/api/uploads') &&
              !url.pathname.startsWith('/api/reports') &&
              !url.pathname.startsWith('/api/backup'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-data-cache',
              networkTimeoutSeconds: 4,
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
              },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/recharts')) return 'vendor-charts';
          if (id.includes('node_modules/framer-motion')) return 'vendor-motion';
          if (id.includes('node_modules/leaflet')) return 'vendor-leaflet';
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) return 'vendor-react';
        },
      },
    },
  },
});
