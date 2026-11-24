// Para publicar uma nova versão: edite os arquivos, aumente o número abaixo e faça o push.
const CACHE = "caderno-al-v10";
const ASSETS = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "jspdf.umd.min.js",
  "config.js",
  "nuvem.js",
  "supabase.js",
  "manrope-latin-wght-normal.woff2",
  "newsreader-latin-wght-normal.woff2",
  "icon-192.png",
  "icon-512.png",
  "maskable-512.png",
  "apple-touch-icon.png",
  "logo-ana-luisa.png",
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
  // cache:"reload" ignora o cache HTTP (o GitHub Pages guarda arquivos por ~10 min) e garante arquivos novos
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.all(ASSETS.map((u) =>
        fetch(new Request(u, { cache: "reload" })).then((r) => { if (!r.ok) throw new Error(u); return c.put(u, r); })
      )))
      .then(() => self.skipWaiting())
  );
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
  const url = new URL(req.url);
  // Servidor de dados (Supabase) e qualquer outro endereço: nunca passam pelo cache do app.
  if (url.origin !== self.location.origin) return;
  // A configuração vem sempre da rede quando há internet (para não ficar presa em versão velha).
  if (url.pathname.endsWith("/config.js")) {
    e.respondWith(fetch(new Request(req, { cache: "no-cache" })).catch(() => caches.match(req, { ignoreSearch: true })));
    return;
  }
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
