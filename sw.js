// らーめんメモ — offline support. Bump VERSION when files change so phones pick up the update.
const VERSION = 'ramen-memo-v4';
const FONTS = VERSION + '-fonts';
const SHELL = ['./', './index.html', './manifest.webmanifest', './vendor/maplibre-gl.js', './vendor/maplibre-gl.css', './icons/link-tiktok.png', './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png',
  './splash/1.jpg', './splash/2.jpg', './splash/3.jpg', './splash/logo.png', './splash/seal.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== FONTS).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === location.origin) {
    if (req.mode === 'navigate') {
      // Network first so updates arrive; cached copy when offline (e.g. in a basement ramen shop).
      e.respondWith(
        fetch(req, {cache: 'no-store'}).then(res => {
          const copy = res.clone();
          caches.open(VERSION).then(c => c.put('./index.html', copy));
          return res;
        }).catch(() => caches.match('./index.html'))
      );
      return;
    }
    e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
    return;
  }

  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONTS).then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      try { const res = await fetch(req); c.put(req, res.clone()); return res; }
      catch { return Response.error(); }
    }));
  }
});
