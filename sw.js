// Para publicar uma nova versão: edite os arquivos, aumente o número abaixo e faça o push.
const CACHE = "caderno-al-v1";
const ASSETS = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "vendor/jspdf.umd.min.js",
  "fonts/manrope-latin-wght-normal.woff2",
  "fonts/newsreader-latin-wght-normal.woff2",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/maskable-512.png",
  "icons/apple-touch-icon.png",
  "img/j1.jpg",
  "img/j2.jpg",
  "img/j3.jpg",
  "img/j4.jpg",
  "img/b1.jpg",
  "img/b2.jpg",
  "img/b3.jpg",
  "img/r1.jpg",
  "img/r2.jpg",
  "img/r3.jpg"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      return fetch(req)
        .then((res) => {
          if (res && res.ok && new URL(req.url).origin === self.location.origin) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => (req.mode === "navigate" ? caches.match("index.html") : Response.error()));
    })
  );
});
