const CACHE_NAME = 'expense-tracker-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/history.html',
  '/style.css',
  '/script.js',
  '/history.js',
  '/manifest.json',
  '/offline.html',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // For navigation requests, try network first, then fallback to cache/offline
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then((res) => {
        // put a copy in cache for later
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return res;
      }).catch(() => caches.match('/offline.html') || caches.match('/index.html'))
    );
    return;
  }

  // For other requests, serve from cache first, then network
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      try { const copy = res.clone(); caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)); } catch(e){}
      return res;
    }))
  );
});
