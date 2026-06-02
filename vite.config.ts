import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(() => {
  const base = process.env.BASE_PATH ?? '/'

  return {
    base,
    plugins: [
      tailwindcss(),
      vue(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['logo.png', 'logo-192.png', 'logo-512.png', 'apple-touch-icon.png'],
        manifest: {
          name: 'Gümmi Masters',
          short_name: 'Gümmi Masters',
          description: 'Darts Scoring & Statistik App',
          theme_color: '#16A34A',
          background_color: '#FFFFFF',
          display: 'standalone',
          icons: [
            {
              src: '/logo-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/logo-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/logo-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ]
        },
        devOptions: {
          enabled: true
        }
      })
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    }
  }
})
