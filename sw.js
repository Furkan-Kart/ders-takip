// Çevrimdışı çalışma: dosyalar önbellekten sunulur, bağlantı varsa arka planda güncellenir.
const ONBELLEK = 'ders-takip-v2';
const DOSYALAR = [
  './', 'index.html', 'styles.css', 'algoritma.js', 'app.js', 'manifest.webmanifest',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(ONBELLEK).then(c => c.addAll(DOSYALAR)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== ONBELLEK).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const istek = e.request;
  if (istek.method !== 'GET' || new URL(istek.url).origin !== location.origin) return;
  e.respondWith(
    caches.open(ONBELLEK).then(async c => {
      const eski = await c.match(istek, { ignoreSearch: true });
      const yeni = fetch(istek).then(r => {
        if (r && r.ok) c.put(istek, r.clone());
        return r;
      }).catch(() => null);
      if (eski) { e.waitUntil(yeni); return eski; }
      const r = await yeni;
      if (r) return r;
      if (istek.mode === 'navigate') return c.match('index.html');
      return new Response('', { status: 504 });
    })
  );
});
