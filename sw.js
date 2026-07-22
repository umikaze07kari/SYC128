const CACHE = "dan-island-odyssey-v50";
const ASSETS = ["./", "./index.html", "./leaderboard.html", "./diagnostics.html", "./styles.css", "./songs.js", "./config.js", "./vendor/qrcode.js", "./audio.js", "./app.js", "./leaderboard.js", "./diagnostics.js", "./manifest.webmanifest", "./assets/icon.svg", "./assets/island.svg", "./assets/cover-fallback.svg", "./assets/covers/default.jpg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).then((response) => {
    if (response.ok) {
      const copy = response.clone();
      caches.open(CACHE).then((cache) => cache.put(event.request, copy));
    }
    return response;
  }).catch(() => caches.match(event.request).then((cached) => {
    if (cached) return cached;
    if (event.request.mode === "navigate") return caches.match("./index.html");
    return Response.error();
  })));
});
