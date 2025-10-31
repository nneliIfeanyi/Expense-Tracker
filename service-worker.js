const CACHE_NAME = 'onefifth-v1';
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
    '/icons/icon-512.png',
    '/icons/icon-192.svg',
    '/icons/icon-512.svg'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        const keys = await caches.keys();
        await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
        // Claim clients immediately so the new SW controls pages
        await self.clients.claim();
        // Notify clients that a new version is active
        const clients = await self.clients.matchAll({ includeUncontrolled: true });
        for (const client of clients) {
            try {
                client.postMessage({ type: 'NEW_VERSION_AVAILABLE' });
            } catch (e) { /* ignore */ }
        }
    })());
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    const url = new URL(req.url);

    // For navigation requests, try network first, then fallback to cache/offline
    if (req.mode === 'navigate') {
        event.respondWith(
            fetch(req).then((res) => {
                const copy = res.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
                return res;
            }).catch(() => caches.match('/offline.html') || caches.match('/index.html'))
        );
        return;
    }

    // For other requests: stale-while-revalidate
    event.respondWith((async function () {
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(req);
        const networkFetch = fetch(req).then((networkResponse) => {
            // Only cache successful responses
            try {
                if (networkResponse && networkResponse.status === 200) {
                    cache.put(req, networkResponse.clone());
                }
            } catch (e) { }
            return networkResponse;
        }).catch(() => { return null; });

        // Return cached response immediately if available, otherwise wait for network
        return cachedResponse || networkFetch;
    })());
});
