import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './styles/index.css'
import 'primeicons/primeicons.css'
import { registerSW } from 'virtual:pwa-register'

/**
 * Emergency cache reset. Visiting <site>/?reset=1 unregisters every
 * service worker, wipes every Cache Storage entry, and reloads. Use this
 * when a stale PWA install is shipping mismatched HTML/JS/CSS and the user
 * can't get unstuck via a normal refresh.
 */
const handleHardResetRequest = async () => {
  if (typeof window === 'undefined') return
  const params = new URLSearchParams(window.location.search)
  if (params.get('reset') !== '1') return

  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map((reg) => reg.unregister()))
    }
    if (typeof caches !== 'undefined') {
      const keys = await caches.keys()
      await Promise.all(keys.map((key) => caches.delete(key)))
    }
  } catch (err) {
    console.warn('[reset] cache cleanup failed', err)
  }

  // Strip the ?reset=1 query param and hard-reload from network.
  params.delete('reset')
  const remaining = params.toString()
  const nextSearch = remaining ? `?${remaining}` : ''
  const base = import.meta.env.BASE_URL ?? '/'
  window.location.replace(`${base.replace(/\/$/, '/')}${nextSearch}`)
}

void handleHardResetRequest().then(() => {
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  // If a reset was requested we already triggered location.replace above, so
  // we skip the normal app boot — the reload will re-enter main.ts cleanly.
  if (params?.get('reset') === '1') return

  const app = createApp(App)
  app.use(createPinia())
  app.use(router)
  app.mount('#app')

  registerSW({ immediate: true })
})
