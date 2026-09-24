const CACHE = 'mystuff-v1'
const PRECACHE = ['/', '/index.html']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)))
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  )
})

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return
  if (e.request.url.includes('/api/') || e.request.url.includes('/uploads/')) return
  // ponytail: network-first for navigations only; assets are content-hashed so cache-first stays safe
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then((r) => {
          const copy = r.clone()
          caches.open(CACHE).then((c) => c.put('/', copy))
          return r
        })
        .catch(() => caches.match(e.request).then((c) => c ?? caches.match('/')))
    )
    return
  }
  e.respondWith(
    caches.match(e.request).then((cached) => cached ?? fetch(e.request))
  )
})
