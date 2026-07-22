// Hand-written service worker (no workbox/webpack-plugin build step needed —
// next-pwa's SW generation relies on a webpack plugin, and this project
// builds with Turbopack, which doesn't run webpack plugins).
//
// Scope: cache-first for map tiles only, so a plot the user has already
// viewed keeps rendering its map when offline. Everything else (pages, data)
// passes straight through to the network — this is not a full app-shell PWA.

const TILE_CACHE = "landly-map-tiles-v1";
const TILE_HOSTS = ["tiles.openfreemap.org", "server.arcgisonline.com"];
const MAX_ENTRIES = 4000;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || !TILE_HOSTS.includes(url.hostname)) return;

  event.respondWith(
    caches.open(TILE_CACHE).then(async (cache) => {
      const cached = await cache.match(event.request);
      if (cached) return cached;
      try {
        const response = await fetch(event.request);
        if (response.ok) {
          await cache.put(event.request, response.clone());
          trimCache(cache);
        }
        return response;
      } catch (err) {
        if (cached) return cached;
        throw err;
      }
    }),
  );
});

async function trimCache(cache) {
  const keys = await cache.keys();
  if (keys.length <= MAX_ENTRIES) return;
  await cache.delete(keys[0]);
}
