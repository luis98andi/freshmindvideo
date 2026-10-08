/* FreshMindVideo - service worker
   Red primero: siempre intenta traer la versión nueva; solo usa lo guardado si no hay internet.
   Solo toca archivos de este mismo sitio (nunca YouTube, la API ni GitHub). */
var VERSION = "fmv-v24";
var BASICOS = [
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

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(VERSION)
      .then(function (c) { return c.addAll(BASICOS); })
      .catch(function () {})
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); })); })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var r = e.request;
  if (r.method !== "GET" || new URL(r.url).origin !== self.location.origin) return;   // lo demás pasa directo
  e.respondWith(
    fetch(r).then(function (resp) {
      if (resp && resp.ok) {
        var copia = resp.clone();
        caches.open(VERSION).then(function (c) { c.put(r, copia); }).catch(function () {});
      }
      return resp;
    }).catch(function () {
      return caches.match(r).then(function (g) { return g || caches.match("index.html"); });
    })
  );
});
