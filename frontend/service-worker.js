/* Service Worker — офлайн-оболочка PWA. */
const SHELL_CACHE = 'menu-shell-v21';
const IMG_CACHE = 'menu-img-v1';

const SHELL = [
  '/',
  '/index.html',
  '/app.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      await cache.addAll(SHELL).catch(() => {});
      // Tailwind CDN — кэшируем как opaque-ответ (cross-origin).
      try {
        const res = await fetch('https://cdn.tailwindcss.com', { mode: 'no-cors' });
        await cache.put('https://cdn.tailwindcss.com', res);
      } catch (_) {}
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== SHELL_CACHE && k !== IMG_CACHE).map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // API всегда из сети (не кэшируем динамику).
  if (url.origin === self.location.origin && url.pathname.startsWith('/api/')) {
    return;
  }

  // Картинки блюд — cache-first (быстро и работает офлайн после первой загрузки).
  if (url.origin === self.location.origin && url.pathname.startsWith('/static/images/')) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(IMG_CACHE);
        const cached = await cache.match(req);
        if (cached) return cached;
        try {
          const res = await fetch(req);
          if (res.ok) cache.put(req, res.clone());
          return res;
        } catch (_) {
          return cached || Response.error();
        }
      })()
    );
    return;
  }

  // Навигация — сеть, при офлайне отдаём оболочку.
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match('/index.html')));
    return;
  }

  // Остальная статика — cache-first с фолбэком в сеть.
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).catch(() => cached))
  );
});
