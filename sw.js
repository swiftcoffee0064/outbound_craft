// Bump CACHE_VERSION on every deploy that changes shell files (see README).
const CACHE_VERSION = 1;
const CACHE = `outbound-craft-v${CACHE_VERSION}`;

// Relative URLs resolve against this script's directory, i.e. the Pages subpath.
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/app.js',
  './js/calc.js',
  './js/data.js',
  './js/i18n.js',
  './js/state.js',
  './js/ui/html.js',
  './js/ui/picker.js',
  './js/ui/tree.js',
  './js/ui/inventory.js',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
];
const DATA_URL = new URL('./data/data.json', self.location).href;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  // Recipe data: network-first so corrections appear immediately; cache fallback offline.
  if (request.url === DATA_URL) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request)),
    );
    return;
  }

  // App shell: cache-first; navigations fall back to the cached index.html.
  event.respondWith(
    caches.match(request).then((hit) => {
      if (hit) return hit;
      if (request.mode === 'navigate') {
        return caches.match(new URL('./index.html', self.location).href).then((page) => page ?? fetch(request));
      }
      return fetch(request);
    }),
  );
});
