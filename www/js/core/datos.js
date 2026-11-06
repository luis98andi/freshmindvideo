/* Shared static data loader for the web app, PWA, and packaged Android app. */
(function () {
  var DATA_CACHE = "fmv-data-v1";
  var datosCargados = {};
  var solicitudes = {};

  function leerCache(url, errorOriginal) {
    if (!("caches" in window)) return Promise.reject(errorOriginal);

    return caches.open(DATA_CACHE)
      .then(function (cache) { return cache.match(url.href); })
      .then(function (response) {
        if (!response) throw errorOriginal;
        return response.json();
      });
  }

  function cargarJson(ruta, validar) {
    if (datosCargados[ruta]) return Promise.resolve(datosCargados[ruta]);
    if (solicitudes[ruta]) return solicitudes[ruta];

    var url = new URL(ruta, document.baseURI);

    solicitudes[ruta] = fetch(url.href, { cache: "no-cache" })
      .then(function (response) {
        if (!response.ok) throw new Error("HTTP " + response.status + " al cargar " + ruta);
        return response.clone().json().then(function (datos) {
          if (!validar(datos)) throw new Error("Formato JSON no válido en " + ruta);
          if ("caches" in window) {
            caches.open(DATA_CACHE)
              .then(function (cache) { return cache.put(url.href, response); })
              .catch(function (error) { console.warn("No se pudo guardar " + ruta + " para uso sin conexión.", error); });
          }
          return datos;
        });
      })
      .catch(function (error) {
        return leerCache(url, error).then(function (datos) {
          if (!validar(datos)) throw new Error("Formato JSON no válido en caché para " + ruta);
          return datos;
        });
      })
      .then(function (datos) {
        datosCargados[ruta] = datos;
        delete solicitudes[ruta];
        return datos;
      }, function (error) {
        delete solicitudes[ruta];
        throw error;
      });

    return solicitudes[ruta];
  }

  window.FMV_cargarCanalesBase = function () {
    return cargarJson("public/canales.json", function (datos) {
      return Array.isArray(datos) || !!datos && (
        Array.isArray(datos.canales) || Array.isArray(datos.channels)
      );
    });
  };

  window.FMV_cargarMisVideosBase = function () {
    return cargarJson("public/mis_videos.json", function (datos) {
      return Array.isArray(datos) || !!datos && Array.isArray(datos.videos);
    });
  };
})();
