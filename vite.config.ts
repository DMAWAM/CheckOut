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
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.ts',
        injectRegister: 'auto',
        // -------------------------------------------------------------
        // TEMPORARY: Gümmi Masters tournament branding.
        // The install-prompt name + home-screen icon are temporarily
        // swapped to the Gümmi Masters logo for the duration of the
        // tournament. To revert after the event:
        //   - restore name/short_name to 'CheckOut'
        //   - restore the single icon entry to /icon.svg (512, svg)
        //   - restore includeAssets to ['icon.svg']
        //   - delete the four public/gm-icon-*.png files
        //   - revert the matching block in index.html
        // -------------------------------------------------------------
        includeAssets: [
          'icon.svg',
          'gm-icon-192.png',
          'gm-icon-512.png',
          'gm-icon-180.png',
          'gm-icon-maskable-512.png'
        ],
        manifest: {
          name: 'Gümmi Masters',
          short_name: 'Gümmi Masters',
          description: 'Gümmi Masters – Dart-Turnier-Live-Scoring',
          theme_color: '#16A34A',
          background_color: '#FFFFFF',
          display: 'standalone',
          icons: [
            {
              src: 'gm-icon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'gm-icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'gm-icon-maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ]
        },
        devOptions: {
          enabled: true,
          type: 'module'
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
