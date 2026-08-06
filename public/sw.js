// Service Worker for Zyxen Quotation Management
const CACHE_NAME = 'zyxen-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Pass through all requests cleanly to avoid stale chunks or auth loops
self.addEventListener('fetch', (event) => {
  // Let the browser handle standard network fetching
  return;
});
