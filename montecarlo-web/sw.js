// Service worker : garde l'application en cache pour qu'elle s'ouvre même
// sans connexion (le chargement d'un CSV et la simulation se font sur
// l'appareil). Changer VERSION pour publier une mise à jour.
const VERSION = 'montecarlo-v4';
const FILES = ['./', 'index.html', 'worker.js?v=3', 'mc.wasm?v=3', 'manifest.webmanifest',
  'icon-180.png', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith('montecarlo-') && k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    // Page : le réseau d'abord (mises à jour), le cache sans connexion.
    e.respondWith(fetch(req).then((r) => {
      const copy = r.clone();
      caches.open(VERSION).then((c) => c.put('./', copy));
      return r;
    }).catch(() => caches.match('./', { ignoreSearch: true })));
    return;
  }
  if (new URL(req.url).pathname.includes('/data/')) {
    // Cours : le réseau d'abord, la dernière copie téléchargée sans connexion.
    e.respondWith(fetch(req).then((r) => {
      if (r.ok) { const copy = r.clone(); caches.open(VERSION).then((c) => c.put(req.url.split('?')[0], copy)); }
      return r;
    }).catch(() => caches.match(req.url.split('?')[0]).then((hit) => hit || Response.error())));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
});
