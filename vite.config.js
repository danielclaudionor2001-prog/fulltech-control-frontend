
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        navigateFallbackDenylist: [/^\/api\//],
        skipWaiting: true,
      },
      includeAssets: [
        'favicon.ico',
        'apple-touch-icon.png',
        'genfavicon-180.png',
        'genfavicon-256.png',
        'genfavicon-512.png',
      ],
      manifest: {
        name: 'Fulltech Control',
        short_name: 'Fulltech',
        description: 'Sistema de Gestão de OS e Localização',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'genfavicon-180.png',
            sizes: '180x180',
            type: 'image/png'
          },
          {
            src: 'genfavicon-256.png',
            sizes: '256x256',
            type: 'image/png'
          },
          {
            src: 'genfavicon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  build: {
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
