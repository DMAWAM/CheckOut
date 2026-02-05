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
        includeAssets: ['icon.svg'],
        manifest: {
          name: 'CheckOut',
          short_name: 'CheckOut',
          description: 'Mobile-first Darts Scoring & Statistik App',
          theme_color: '#16A34A',
          background_color: '#FFFFFF',
          display: 'standalone',
          icons: [
            {
              src: '/icon.svg',
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'any'
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
