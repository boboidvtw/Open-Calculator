// ∑ Calc Service Worker — Cache-first for offline support
const CACHE_NAME = 'sigma-calc-v3.11.2';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/js/pro-config.js',
  '/js/license-api.js',
  '/js/pro-manager.js',
  '/js/paypal-integration.js',
  '/js/pro-ui.js'
];

// Bypass cache for Cloudflare Worker license API (always go network-first)
const NETWORK_FIRST_HOSTS = ['workers.dev', 'exchangerate', 'paypal'];

// Install: pre-cache core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: cache-first for same-origin, network-first for API
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Network-first for external APIs (exchange rate, PayPal, Cloudflare Worker)
  if (NETWORK_FIRST_HOSTS.some(host => url.hostname.includes(host))) {
    event.respondWith(
      fetch(event.request).catch(async () => {
        // 只有 GET 有快取可回退；非冪等請求（POST 等）離線就回乾淨的 network error。
        // 關鍵：caches.match 未命中會 resolve 成 undefined，直接回傳會讓
        // respondWith(undefined) 丟 TypeError，把單純的網路失敗變成看不懂的 SW 錯誤。
        if (event.request.method === 'GET') {
          const cached = await caches.match(event.request);
          if (cached) return cached;
        }
        return Response.error();
      })
    );
    return;
  }

  // Cache-first for same-origin assets
  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        const fetchPromise = fetch(event.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
  }
});
