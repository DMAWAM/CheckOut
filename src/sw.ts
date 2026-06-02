/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

declare const self: ServiceWorkerGlobalScope

// Workbox-managed precache list — injected at build time by vite-plugin-pwa.
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// ---------------------------------------------------------------------------
// Push notification handling
// ---------------------------------------------------------------------------

interface PushPayload {
  title?: string
  body?: string
  /** Path within the app to open when the notification is clicked. */
  url?: string
  /** Optional notification tag — same tag collapses repeats. */
  tag?: string
}

self.addEventListener('push', (event) => {
  let payload: PushPayload = {}
  if (event.data) {
    try {
      payload = event.data.json() as PushPayload
    } catch {
      payload = { body: event.data.text() }
    }
  }

  const title = payload.title ?? 'CheckOut'
  const options: NotificationOptions = {
    body: payload.body ?? '',
    icon: '/icon.svg',
    badge: '/icon.svg',
    tag: payload.tag,
    data: {
      url: payload.url ?? '/'
    },
    // iOS PWA respects vibrate when the OS allows it; harmless elsewhere.
    // @ts-expect-error -- vibrate is supported but missing from the lib type
    vibrate: [120, 60, 120]
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = (event.notification.data as { url?: string } | null)?.url ?? '/'

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      // If a tab is already open, focus it and route to the target URL.
      for (const client of allClients) {
        if ('focus' in client) {
          await client.focus()
          if ('navigate' in client && typeof client.navigate === 'function') {
            try {
              await client.navigate(targetUrl)
            } catch {
              // navigate() throws for cross-origin or about:blank — fall back to
              // posting a route message that the app can pick up.
              client.postMessage({ type: 'push-navigate', url: targetUrl })
            }
          } else {
            client.postMessage({ type: 'push-navigate', url: targetUrl })
          }
          return
        }
      }
      // No open tab — open a new one.
      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl)
      }
    })()
  )
})
