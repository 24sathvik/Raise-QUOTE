const CACHE_VERSION = 'zyxen-v2';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  '/',
  '/offline',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== DYNAMIC_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Rule 1 — Never intercept mutations
  if (event.request.method !== 'GET') return;

  // Rule 2 — Never intercept auth
  if (
    url.pathname.startsWith('/api/auth') ||
    url.pathname.startsWith('/auth') ||
    url.pathname.includes('supabase') ||
    url.pathname.includes('token') ||
    url.pathname.includes('session') ||
    url.pathname.includes('callback')
  ) return;

  // Rule 3 — Never cache API calls
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({ error: 'You are offline' }), {
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
    return;
  }

  // Rule 4 — HTML pages always network first
  if (event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/offline'))
    );
    return;
  }

  // Rule 4.5 — Next.js Data/RSC requests always network first (CRITICAL FOR AUTH)
  if (
    event.request.headers.get('RSC') === '1' ||
    event.request.headers.get('Next-Router-Prefetch') === '1' ||
    url.searchParams.has('_rsc') ||
    url.pathname.startsWith('/admin') // Extra safety for admin paths
  ) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/offline'))
    );
    return;
  }

  // Rule 5 — Static assets cache first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        const clone = response.clone();
        caches.open(DYNAMIC_CACHE).then((cache) => cache.put(event.request, clone));
        return response;
      }).catch(() => caches.match('/offline'));
    })
  );
});
