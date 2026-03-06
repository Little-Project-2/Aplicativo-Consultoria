const CACHE_VERSION = "consultoria-fallback-v3";
const RUNTIME_CACHE = "consultoria-runtime-fallback-v3";
const APP_REVISION = "2026-03-06";

const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./trainer.html",
  "./style.css",
  "./script.js",
  "./manifest.webmanifest",
  "./offline.html",
  "./pwa-register.js",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/apple-touch-icon.png"
];

let workboxEnabled = false;

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

try {
  importScripts("https://storage.googleapis.com/workbox-cdn/releases/7.1.0/workbox-sw.js");

  if (self.workbox) {
    workboxEnabled = true;

    const { core, routing, strategies, precaching, expiration, cacheableResponse } = self.workbox;

    core.setCacheNameDetails({
      prefix: "consultoria",
      suffix: "v3"
    });

    core.skipWaiting();
    core.clientsClaim();

    precaching.precacheAndRoute(
      PRECACHE_URLS.map((url) => ({ url, revision: APP_REVISION })),
      { cleanURLs: false }
    );

    routing.registerRoute(
      ({ request }) => request.mode === "navigate",
      new strategies.NetworkFirst({
        cacheName: "pages",
        networkTimeoutSeconds: 4,
        plugins: [
          new expiration.ExpirationPlugin({
            maxEntries: 40,
            maxAgeSeconds: 7 * 24 * 60 * 60
          })
        ]
      })
    );

    routing.registerRoute(
      ({ request, url }) =>
        url.origin === self.location.origin &&
        ["style", "script", "manifest", "worker"].includes(request.destination),
      new strategies.StaleWhileRevalidate({
        cacheName: "assets",
        plugins: [
          new expiration.ExpirationPlugin({
            maxEntries: 80,
            maxAgeSeconds: 30 * 24 * 60 * 60
          })
        ]
      })
    );

    routing.registerRoute(
      ({ request, url }) => url.origin === self.location.origin && request.destination === "image",
      new strategies.CacheFirst({
        cacheName: "images",
        plugins: [
          new cacheableResponse.CacheableResponsePlugin({ statuses: [0, 200] }),
          new expiration.ExpirationPlugin({
            maxEntries: 120,
            maxAgeSeconds: 30 * 24 * 60 * 60
          })
        ]
      })
    );

    routing.registerRoute(
      ({ url }) =>
        url.origin === "https://fonts.googleapis.com" ||
        url.origin === "https://fonts.gstatic.com",
      new strategies.StaleWhileRevalidate({
        cacheName: "google-fonts",
        plugins: [
          new expiration.ExpirationPlugin({
            maxEntries: 20,
            maxAgeSeconds: 60 * 24 * 60 * 60
          })
        ]
      })
    );

    routing.setCatchHandler(async ({ event }) => {
      if (event.request.mode === "navigate") {
        const offlinePage = await precaching.matchPrecache("./offline.html");
        if (offlinePage) return offlinePage;
      }
      return Response.error();
    });
  }
} catch (err) {
  // If Workbox CDN is blocked, fallback SW below keeps app usable.
}

if (!workboxEnabled) {
  self.addEventListener("install", (event) => {
    event.waitUntil(
      caches.open(CACHE_VERSION).then((cache) => cache.addAll(PRECACHE_URLS))
    );
    self.skipWaiting();
  });

  self.addEventListener("activate", (event) => {
    event.waitUntil(
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_VERSION && key !== RUNTIME_CACHE)
            .map((key) => caches.delete(key))
        )
      )
    );
    self.clients.claim();
  });

  self.addEventListener("fetch", (event) => {
    const { request } = event;
    if (request.method !== "GET") return;

    const url = new URL(request.url);
    const isSameOrigin = url.origin === self.location.origin;

    if (request.mode === "navigate") {
      event.respondWith(
        fetch(request)
          .then((response) => {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, responseClone));
            return response;
          })
          .catch(async () => {
            const cachedPage = await caches.match(request);
            if (cachedPage) return cachedPage;
            const home = await caches.match("./index.html");
            if (home) return home;
            return caches.match("./offline.html");
          })
      );
      return;
    }

    if (!isSameOrigin) return;

    const cacheableDestinations = ["style", "script", "image", "font", "manifest"];
    if (cacheableDestinations.includes(request.destination)) {
      event.respondWith(
        caches.match(request).then((cached) => {
          const networkFetch = fetch(request)
            .then((response) => {
              if (response && response.ok) {
                const clone = response.clone();
                caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
              }
              return response;
            })
            .catch(() => cached);

          return cached || networkFetch;
        })
      );
    }
  });
}
