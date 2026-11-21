const APP_SCOPE = new URL(self.registration.scope);
const APP_ROOT = new URL('./', APP_SCOPE);
const CACHE_PREFIX = `kmo-pos-web-${APP_SCOPE.pathname.replace(/[^A-Za-z0-9_-]/g, '_')}-`;
const CACHE_NAME = `${CACHE_PREFIX}v2`;

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames
      .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'CACHE_URLS' || !Array.isArray(event.data.urls)) return;

  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(event.data.urls.map(async (url) => {
      try {
        const absoluteUrl = new URL(url, APP_SCOPE);
        if (absoluteUrl.origin !== APP_SCOPE.origin || !absoluteUrl.pathname.startsWith(APP_SCOPE.pathname)) return;
        const response = await fetch(absoluteUrl);
        if (response.ok) await cache.put(absoluteUrl.href, response);
      } catch (error) {
        console.warn(`Unable to cache offline resource ${url}:`, error);
      }
    }));
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const requestUrl = new URL(request.url);
  if (
    request.method !== 'GET'
    || requestUrl.origin !== APP_SCOPE.origin
    || !requestUrl.pathname.startsWith(APP_SCOPE.pathname)
  ) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    if (request.mode === 'navigate') {
      try {
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
        return response;
      } catch {
        return (await cache.match(request)) || (await cache.match(APP_ROOT.href));
      }
    }

    const cachedResponse = await cache.match(request);
    if (cachedResponse) return cachedResponse;
    try {
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    } catch {
      return new Response('Offline resource unavailable', { status: 503 });
    }
  })());
});
