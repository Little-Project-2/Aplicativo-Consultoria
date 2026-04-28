const PRECACHE_CACHE = "consultoria-precache-v10";
const RUNTIME_CACHE = "consultoria-runtime-v10";
const OFFLINE_URL = "./offline.html";

const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./trainer.html",
  "./style.css",
  "./script.js",
  "./pwa-register.js",
  "./service-worker.js",
  "./manifest.json",
  "./manifest.webmanifest",
  "./favicon.ico",
  OFFLINE_URL,
  "./assets/vendor/phosphor/phosphor-local.css",
  "./assets/vendor/phosphor/bold/style.css",
  "./assets/vendor/phosphor/bold/Phosphor-Bold.woff2",
  "./assets/vendor/phosphor/fill/style.css",
  "./assets/vendor/phosphor/fill/Phosphor-Fill.woff2",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/apple-touch-icon.png"
];

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PRECACHE_CACHE);
      await cache.addAll(PRECACHE_URLS);
    })()
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheKeys = await caches.keys();
      await Promise.all(
        cacheKeys
          .filter((key) => key !== PRECACHE_CACHE && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response && response.ok) {
    const cache = await caches.open(RUNTIME_CACHE);
    cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  if (cached) return cached;
  const network = await networkPromise;
  return network || Response.error();
}

async function navigationResponse(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const network = await fetch(request);
    if (network && network.ok) {
      cache.put(request, network.clone());
      return network;
    }
  } catch (err) {
    // offline fallback below
  }

  const precache = await caches.open(PRECACHE_CACHE);
  const path = new URL(request.url).pathname.toLowerCase();
  const fallbackHtml = path.includes("/trainer") ? "./trainer.html" : "./index.html";
  const cached =
    (await cache.match(request, { ignoreSearch: true })) ||
    (await precache.match(request, { ignoreSearch: true })) ||
    (await precache.match(fallbackHtml, { ignoreSearch: true })) ||
    (await caches.match(fallbackHtml, { ignoreSearch: true }));
  if (cached) return cached;

  const offline = await caches.match(OFFLINE_URL);
  return offline || Response.error();
}

async function handleCompletedWorkoutsSync() {
  // Stub de Background Sync para futuros envios ao backend.
  // Aqui você pode buscar registros offline em IndexedDB e enviá-los para uma API.
  try {
    // Mantém a função resolvendo mesmo sem backend configurado.
    return true;
  } catch (err) {
    return true;
  }
}

self.addEventListener("sync", (event) => {
  if (event.tag === "sync-completed-workouts") {
    event.waitUntil(handleCompletedWorkoutsSync());
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith(navigationResponse(request));
    return;
  }

  if (url.origin !== self.location.origin) return;

  const staticDestinations = ["style", "script", "image", "font", "manifest", "worker"];
  if (staticDestinations.includes(request.destination)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});
