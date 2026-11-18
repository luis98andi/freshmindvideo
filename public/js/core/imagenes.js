/* Caché permanente verificada en IndexedDB (+ respaldo Service Worker) para imágenes de canales (PC, web móvil y APK). */
(function () {
  var DB_NAME = "fmv_imagenes_canales";
  var DB_VERSION = 1;
  var STORE_NAME = "imagenes";
  var MAX_BYTES = 2 * 1024 * 1024;
  var MAX_DIM = 320;
  var hostsPermitidos = {
    "i.ytimg.com": true,
    "yt3.ggpht.com": true,
    "yt3.googleusercontent.com": true
  };
  var enviadas = Object.create(null);
  var cacheMemoria = Object.create(null);
  var guardando = Object.create(null);
  var bdInstancia = null;
  var bdLista = false;

  function urlImagenValida(valor) {
    if (!valor || typeof valor !== "string") return false;
    try {
      var url = new URL(valor, document.baseURI);
      return url.protocol === "https:" && !!hostsPermitidos[url.hostname];
    } catch (error) {
      return false;
    }
  }

  function esDataUrlImagenValida(valor) {
    return typeof valor === "string" && valor.indexOf("data:image/") === 0 && valor.length > 64;
  }

  function abrirBD() {
    if (bdInstancia) return Promise.resolve(bdInstancia);
    if (typeof indexedDB === "undefined") return Promise.resolve(null);
    return new Promise(function (resolve) {
      try {
        var req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = function (evento) {
          var db = evento.target.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: "url" });
          }
        };
        req.onsuccess = function (evento) {
          bdInstancia = evento.target.result;
          resolve(bdInstancia);
        };
        req.onerror = function () { resolve(null); };
      } catch (error) {
        resolve(null);
      }
    });
  }

  var promesaInicio = abrirBD().then(function (db) {
    if (!db) {
      bdLista = true;
      return cacheMemoria;
    }
    return new Promise(function (resolve) {
      try {
        var tx = db.transaction(STORE_NAME, "readonly");
        var store = tx.objectStore(STORE_NAME);
        var req = store.getAll ? store.getAll() : store.openCursor();
        req.onsuccess = function (evento) {
          var res = evento.target.result;
          if (Array.isArray(res)) {
            res.forEach(function (item) {
              if (item && item.url && esDataUrlImagenValida(item.dataUrl)) {
                cacheMemoria[item.url] = item.dataUrl;
              }
            });
            bdLista = true;
            resolve(cacheMemoria);
            return;
          }
          if (res && res.value) {
            var item = res.value;
            if (item && item.url && esDataUrlImagenValida(item.dataUrl)) {
              cacheMemoria[item.url] = item.dataUrl;
            }
            res.continue();
          } else {
            bdLista = true;
            resolve(cacheMemoria);
          }
        };
        req.onerror = function () {
          bdLista = true;
          resolve(cacheMemoria);
        };
      } catch (error) {
        bdLista = true;
        resolve(cacheMemoria);
      }
    });
  });

  function escribirEnBD(urlOriginal, dataUrl, ancho, alto) {
    if (!esDataUrlImagenValida(dataUrl)) return Promise.resolve(false);
    cacheMemoria[urlOriginal] = dataUrl;
    return abrirBD().then(function (db) {
      if (!db) return true;
      return new Promise(function (resolve) {
        try {
          var tx = db.transaction(STORE_NAME, "readwrite");
          tx.objectStore(STORE_NAME).put({
            url: urlOriginal,
            dataUrl: dataUrl,
            ancho: ancho || 0,
            alto: alto || 0,
            guardadaEn: Date.now()
          });
          tx.oncomplete = function () { resolve(true); };
          tx.onerror = function () { resolve(false); };
        } catch (error) {
          resolve(false);
        }
      });
    });
  }

  function elementoADataUrl(img) {
    if (!img || !img.naturalWidth || !img.naturalHeight) return "";
    if (typeof document === "undefined") return "";
    try {
      var w = img.naturalWidth;
      var h = img.naturalHeight;
      if (w > MAX_DIM || h > MAX_DIM) {
        var escala = Math.min(MAX_DIM / w, MAX_DIM / h);
        w = Math.max(1, Math.round(w * escala));
        h = Math.max(1, Math.round(h * escala));
      }
      var canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      var ctx = canvas.getContext("2d");
      if (!ctx) return "";
      ctx.drawImage(img, 0, 0, w, h);
      var out = canvas.toDataURL("image/webp", 0.88);
      if (!esDataUrlImagenValida(out)) {
        out = canvas.toDataURL("image/png");
      }
      return esDataUrlImagenValida(out) ? out : "";
    } catch (error) {
      return "";
    }
  }

  function verificarYConvertirBlob(blob) {
    if (!blob || !blob.size || blob.size > MAX_BYTES) return Promise.resolve(null);
    if (blob.type && blob.type.indexOf("image/") !== 0) return Promise.resolve(null);
    return new Promise(function (resolve) {
      if (typeof FileReader === "undefined") { resolve(null); return; }
      var reader = new FileReader();
      reader.onload = function () {
        var dataUrl = reader.result;
        if (!esDataUrlImagenValida(dataUrl)) { resolve(null); return; }
        if (typeof Image === "undefined") {
          resolve({ dataUrl: dataUrl, ancho: 0, alto: 0 });
          return;
        }
        var verificador = new Image();
        verificador.onload = function () {
          if (verificador.naturalWidth > 0 && verificador.naturalHeight > 0) {
            resolve({
              dataUrl: dataUrl,
              ancho: verificador.naturalWidth,
              alto: verificador.naturalHeight
            });
          } else {
            resolve(null);
          }
        };
        verificador.onerror = function () { resolve(null); };
        verificador.src = dataUrl;
      };
      reader.onerror = function () { resolve(null); };
      reader.readAsDataURL(blob);
    });
  }

  function descargarYVerificar(urlOriginal, urlAlternativa) {
    if (typeof fetch !== "function") return Promise.resolve(null);
    function intentarFetch(objetivo) {
      return fetch(objetivo, { mode: "cors", credentials: "omit", cache: "force-cache" })
        .then(function (resp) {
          if (!resp || !resp.ok) throw new Error("HTTP " + (resp ? resp.status : 0));
          return resp.blob();
        })
        .then(verificarYConvertirBlob)
        .then(function (info) {
          if (!info) throw new Error("Imagen inválida");
          return info;
        });
    }

    return intentarFetch(urlAlternativa || urlOriginal).catch(function () {
      try {
        var parsed = new URL(urlOriginal, document.baseURI);
        if (parsed.hostname === "yt3.ggpht.com") {
          parsed.hostname = "yt3.googleusercontent.com";
          return intentarFetch(parsed.href).catch(function () { return null; });
        }
      } catch (e) {}
      return null;
    });
  }

  window.FMV_obtenerImagenCacheSync = function (url) {
    if (!urlImagenValida(url)) return "";
    return cacheMemoria[url] || "";
  };

  window.FMV_obtenerImagenCache = function (url, callback) {
    if (!urlImagenValida(url)) {
      if (typeof callback === "function") callback("");
      return Promise.resolve("");
    }
    if (cacheMemoria[url]) {
      if (typeof callback === "function") callback(cacheMemoria[url]);
      return Promise.resolve(cacheMemoria[url]);
    }
    return promesaInicio.then(function () {
      var res = cacheMemoria[url] || "";
      if (typeof callback === "function") callback(res);
      return res;
    });
  };

  window.FMV_guardarImagenCache = function (urlOriginal, img, urlResuelta) {
    if (!urlImagenValida(urlOriginal)) return Promise.resolve(false);
    if (guardando[urlOriginal]) return guardando[urlOriginal];

    guardando[urlOriginal] = promesaInicio.then(function () {
      if (cacheMemoria[urlOriginal]) return true;

      if (img && typeof img.naturalWidth === "number") {
        if (img.naturalWidth <= 0 || img.naturalHeight <= 0) return false;
        var dataUrl = elementoADataUrl(img);
        if (esDataUrlImagenValida(dataUrl)) {
          return escribirEnBD(urlOriginal, dataUrl, img.naturalWidth, img.naturalHeight);
        }
      }

      return descargarYVerificar(urlOriginal, urlResuelta).then(function (info) {
        if (!info) return false;
        return escribirEnBD(urlOriginal, info.dataUrl, info.ancho, info.alto);
      });
    }).then(function (ok) {
      delete guardando[urlOriginal];
      return ok;
    }, function () {
      delete guardando[urlOriginal];
      return false;
    });

    return guardando[urlOriginal];
  };

  window.FMV_precargarImagenes = function (urls) {
    if (!Array.isArray(urls)) return;
    var seleccionadas = [];
    urls.forEach(function (valor) {
      if (seleccionadas.length >= 60 || !urlImagenValida(valor) || enviadas[valor]) return;
      enviadas[valor] = true;
      seleccionadas.push(valor);
    });
    if (!seleccionadas.length) return;

    promesaInicio.then(function () {
      var pendientes = seleccionadas.filter(function (u) { return !cacheMemoria[u]; });
      if (!pendientes.length) return;
      var indice = 0;
      function siguiente() {
        if (indice >= pendientes.length) return Promise.resolve();
        var actual = pendientes[indice++];
        return descargarYVerificar(actual).then(function (info) {
          if (info) return escribirEnBD(actual, info.dataUrl, info.ancho, info.alto);
        }).catch(function () {}).then(siguiente);
      }
      var hilos = Math.min(3, pendientes.length);
      for (var i = 0; i < hilos; i++) siguiente();
    }).catch(function () {});

    if ("serviceWorker" in navigator && navigator.serviceWorker.ready) {
      navigator.serviceWorker.ready.then(function (registro) {
        var worker = navigator.serviceWorker.controller || registro.active;
        if (worker) worker.postMessage({ type: "CACHE_YOUTUBE_IMAGES", urls: seleccionadas.slice(0, 40) });
      }).catch(function () {});
    }
  };

  window.FMV_estadoCacheImagenes = function () {
    return promesaInicio.then(function () {
      return { lista: bdLista, total: Object.keys(cacheMemoria).length };
    });
  };
})();
