// Para publicar uma nova versão: edite os arquivos, aumente o número abaixo e faça o push.
const CACHE = "caderno-al-v2";
const ASSETS = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "jspdf.umd.min.js",
  "manrope-latin-wght-normal.woff2",
  "newsreader-latin-wght-normal.woff2",
  "icon-192.png",
  "icon-512.png",
  "maskable-512.png",
  "apple-touch-icon.png",
  "j1.jpg",
  "j2.jpg",
  "j3.jpg",
  "j4.jpg",
  "b1.jpg",
  "b2.jpg",
  "b3.jpg",
  "r1.jpg",
  "r2.jpg",
  "r3.jpg"
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
