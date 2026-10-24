/* FreshMindVideo - service worker
   Cache de app shell + stale-while-revalidate para que la web arranque rápido,
   sin bloquear el cambio de video ni depender del navegador para todo. */
var STATIC_CACHE = "fmv-static-v27";
var APP_SHELL = [
  "./",
  "index.html",
  "canales.json",
  "mis_videos.json",
  "canales-auto.js",
  "buscador.js",
  "logros-premios.js",
  "filtro-azul.js",
  "horarios-rutina.js",
  "pausas-activas.js",
  "reportes-padres.js",
  "busqueda-voz.js",
  "stickers-premios.svg",
  "icon-192.png",
  "icon-512.png",
  "icon-maskable-512.png",
  "apple-touch-icon.png",
  "manifest.json"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(function (cache) { return cache.addAll(APP_SHELL); })
      .catch(function () {})
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (key) { return key !== STATIC_CACHE; }).map(function (key) { return caches.delete(key); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET") return;

  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  var isNavigation = req.mode === "navigate" || req.destination === "document";
  var isAppAsset = /\.(js|css|json|png|svg|ico|webp|jpg|jpeg|gif|map)$/i.test(url.pathname) || isNavigation;
  if (!isAppAsset) return;

  event.respondWith(
    caches.match(req).then(function (cached) {
      var networkFetch = fetch(req).then(function (resp) {
        if (resp && resp.ok && req.url.indexOf("/youtube/") === -1 && req.url.indexOf("/googleapis/") === -1) {
          var clone = resp.clone();
          caches.open(STATIC_CACHE).then(function (cache) { cache.put(req, clone); }).catch(function () {});
        }
        return resp;
      }).catch(function () {
        return cached || caches.match("index.html") || Response.error();
      });

      if (cached) {
        return Promise.race([networkFetch, Promise.resolve(cached)]);
      }
      return networkFetch;
    })
  );
});

self.addEventListener("message", function (event) {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
