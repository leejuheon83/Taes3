const CACHE_NAME = 'taes-fc-v1';
const STATIC_ASSETS = ['/', '/manifest.json', '/taes-emblem.png', '/taes-icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
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

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  // 음악·영상처럼 부분 요청(Range)으로 받는 큰 파일은 캐시하지 않고 그대로 통과시킨다
  if (event.request.headers.has('range') || event.request.destination === 'audio') return;
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
