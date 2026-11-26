const CACHE_NAME = "pulso-propio-shell-v10";
const PRECACHE = [
  "/",
  "/index.html",
  "/vendor/plyr.css",
  "/styles.css",
  "/guide.css",
  "/studio.css",
  "/gallery.css",
  "/catalog.css",
  "/checklist.css",
  "/community.css",
  "/admin.css",
  "/app.js",
  "/curriculum.js",
  "/cases.js",
  "/guide.js",
  "/studio.js",
  "/lab-tools.js",
  "/gallery.js",
  "/catalog.js",
  "/checklist.js",
  "/community.js",
  "/admin.js",
  "/vendor/lenis.mjs",
  "/vendor/fuse.min.mjs",
  "/vendor/plyr.min.mjs",
  "/vendor/plyr.svg",
  "/vendor/wavesurfer.esm.js",
  "/media/films.js",
  "/assets/pulso.svg",
  "/manifest.webmanifest"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Never cache API responses, byte-range requests, or streaming audio/video media
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/media/") ||
    request.headers.has("Range") ||
    /\.(webm|mp4|wav|mp3|ogg)$/i.test(url.pathname)
  ) return;

  if (request.mode === "navigate" || url.pathname === "/" || url.pathname.endsWith(".html") || url.pathname.endsWith(".js") || url.pathname.endsWith(".css")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response && response.ok && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
          }
          return response;
        })
    )
  );
});
