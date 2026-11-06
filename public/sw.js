/* FreshMindVideo - service worker
   Cache de app shell + stale-while-revalidate para que la web arranque rápido,
   sin bloquear el cambio de video ni depender del navegador para todo. */
var STATIC_CACHE = "fmv-static-v34";
var APP_SHELL = [
  "./",
  "index.html",
  "css/styles.css",
  "js/core/seguridad.js",
  "js/core/datos.js",
  "js/player/reproductor.js",
  "js/channels/mis-canales.js",
  "js/pwa/pwa-install.js",
  "canales.json",
  "mis_videos.json",
  "js/channels/canales-auto.js",
  "js/channels/mis-videos.js",
  "js/parental/zona-padres.js",
  "js/search/buscador.js",
  "js/features/logros-premios.js",
  "js/features/filtro-azul.js",
  "js/parental/horarios-rutina.js",
  "js/features/pausas-activas.js",
  "js/parental/reportes-padres.js",
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
      .then(function (cache) {
        return cache.addAll(APP_SHELL.map(function (asset) {
          return new URL(asset, self.registration.scope).href;
        }));
      })
      .catch(function (error) {
        console.error("No se pudo completar la caché sin conexión de FreshMindVideo.", error);
        throw error;
      })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (key) {
        return key.indexOf("fmv-static-") === 0 && key !== STATIC_CACHE;
      }).map(function (key) { return caches.delete(key); }));
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
  var appShellUrl = new URL("index.html", self.registration.scope).href;
  var cacheUrl = new URL(url.href);
  cacheUrl.search = "";

  event.respondWith(
    caches.open(STATIC_CACHE).then(function (cache) {
      return cache.match(req, { ignoreSearch: true }).then(function (cached) {
      var networkFetch = fetch(req).then(function (resp) {
        if (resp && resp.ok && req.url.indexOf("/youtube/") === -1 && req.url.indexOf("/googleapis/") === -1) {
          var clone = resp.clone();
          cache.put(cacheUrl.href, clone).catch(function (error) {
            console.warn("No se pudo actualizar un recurso en caché.", error);
          });
        }
        return resp;
      }).catch(function () {
        if (cached) return cached;
        if (isNavigation) {
          return cache.match(appShellUrl).then(function (fallback) { return fallback || Response.error(); });
        }
        return Response.error();
      });

      if (cached) {
        return Promise.race([networkFetch, Promise.resolve(cached)]);
      }
      return networkFetch;
      });
    })
  );
});

self.addEventListener("message", function (event) {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
