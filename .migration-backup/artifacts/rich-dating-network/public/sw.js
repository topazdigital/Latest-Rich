const CACHE_NAME = "rdn-v1"
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
  const data = event.data?.json() || {}
  event.waitUntil(
    self.registration.showNotification(data.title || "Rich Dating Network", {
      body: data.body || "You have a new notification",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-72.png",
      data: { url: data.url || "/" },
    })
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || "/")
  )
})
