const CACHE_NAME = "rdn-v2"
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/favicon.svg",
]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Never cache API calls
  if (url.pathname.startsWith("/api/")) return

  // Network-first for navigation
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match("/").then((r) => r || fetch(request))
      )
    )
    return
  }

  // Cache-first for static assets
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request).then((response) => {
        if (response.ok && request.method === "GET") {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        }
        return response
      })
    })
  )
})

// Push notification handler
self.addEventListener("push", (event) => {
  let data = {}
  try { data = event.data?.json() || {} } catch {}

  const title = data.title || "Rich Dating Network"
  const options = {
    body: data.body || "You have a new notification",
    icon: data.icon || "/icons/icon-192.svg",
    badge: "/icons/icon-72.svg",
    data: { url: data.url || "/" },
    vibrate: [200, 100, 200],
    requireInteraction: true,
    actions: [
      { action: "open", title: "Open" },
      { action: "dismiss", title: "Dismiss" },
    ],
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()

  if (event.action === "dismiss") return

  const url = event.notification.data?.url || "/"

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})
