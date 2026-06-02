import { supabase } from '@/services/supabase'
import { useAuthStore } from '@/stores/authStore'

const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const output = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i += 1) {
    output[i] = rawData.charCodeAt(i)
  }
  return output
}

const arrayBufferToBase64 = (buffer: ArrayBuffer | null): string => {
  if (!buffer) return ''
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i])
  }
  return window.btoa(binary)
}

export const pushNotificationsSupported = (): boolean => {
  if (typeof window === 'undefined') return false
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

export const currentPermission = (): NotificationPermission | 'unsupported' => {
  if (!pushNotificationsSupported()) return 'unsupported'
  return Notification.permission
}

/**
 * Returns the currently-active push subscription, or null. Does not request
 * permission and does not subscribe.
 */
export const getExistingSubscription = async (): Promise<PushSubscription | null> => {
  if (!pushNotificationsSupported()) return null
  const registration = await navigator.serviceWorker.ready
  return registration.pushManager.getSubscription()
}

/**
 * Idempotently persist whatever subscription the browser currently holds to
 * the database, so a recovered/migrated/restored install doesn't sit there
 * "subscribed locally but not reachable from the server" forever.
 */
export const ensureSubscriptionPersisted = async (): Promise<void> => {
  const subscription = await getExistingSubscription()
  if (!subscription) return
  try {
    await persistSubscription(subscription)
  } catch (err) {
    console.warn('push subscription reconcile failed', err)
  }
}

const persistSubscription = async (subscription: PushSubscription) => {
  const authStore = useAuthStore()
  const userId = authStore.session?.user?.id
  if (!userId) {
    throw new Error('Bitte zuerst einloggen, dann Benachrichtigungen aktivieren.')
  }
  const json = subscription.toJSON()
  const p256dh = arrayBufferToBase64(subscription.getKey('p256dh'))
  const authKey = arrayBufferToBase64(subscription.getKey('auth'))
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        user_id: userId,
        endpoint: json.endpoint ?? '',
        p256dh,
        auth: authKey,
        user_agent: navigator.userAgent,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'endpoint' }
    )
  if (error) {
    throw new Error(`Push-Subscription konnte nicht gespeichert werden: ${error.message}`)
  }
}

/**
 * Request notification permission and subscribe to push.
 * @returns the subscription on success
 * @throws if permission was denied or push isn't supported
 */
export const subscribeToPush = async (): Promise<PushSubscription> => {
  if (!pushNotificationsSupported()) {
    throw new Error('Push-Benachrichtigungen werden auf diesem Gerät nicht unterstützt.')
  }
  const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
  if (!publicKey) {
    throw new Error('VAPID_PUBLIC_KEY ist nicht konfiguriert.')
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('Benachrichtigungen wurden abgelehnt.')
  }

  const registration = await navigator.serviceWorker.ready
  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey)
    })
  }

  await persistSubscription(subscription)
  return subscription
}

/** Unsubscribe locally and remove the row from the DB. */
export const unsubscribeFromPush = async (): Promise<void> => {
  if (!pushNotificationsSupported()) return
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (!subscription) return
  const endpoint = subscription.endpoint
  await subscription.unsubscribe()
  await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
}
