import { useEffect, useRef } from 'react'
import { authFetch } from '../lib/auth'

const STORAGE_KEY = 'rdn_push_subscribed'

async function urlBase64ToUint8Array(base64String: string): Promise<Uint8Array> {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

export function usePushNotifications(userId?: number) {
  const attempted = useRef(false)

  useEffect(() => {
    if (!userId || attempted.current) return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    if (localStorage.getItem(STORAGE_KEY) === 'denied') return
    attempted.current = true

    // Wait a moment so as not to bombard the user immediately on load
    const timer = setTimeout(async () => {
      try {
        // Request permission if not already granted
        if (Notification.permission === 'denied') return
        if (Notification.permission === 'default') {
          const perm = await Notification.requestPermission()
          if (perm !== 'granted') {
            localStorage.setItem(STORAGE_KEY, 'denied')
            return
          }
        }

        const reg = await navigator.serviceWorker.ready
        const existing = await reg.pushManager.getSubscription()
        if (existing) return // already subscribed

        const { publicKey } = await authFetch('/api/push/vapid-key').then(r => r.json())
        if (!publicKey) return

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: await urlBase64ToUint8Array(publicKey),
        })

        await authFetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sub.toJSON()),
        })

        localStorage.setItem(STORAGE_KEY, 'subscribed')
      } catch {
        // silent — push is a nice-to-have
      }
    }, 8000) // 8 second delay after login

    return () => clearTimeout(timer)
  }, [userId])
}
