/* Precalienta en el service worker las imágenes oficiales de YouTube que se muestran en canales. */
(function () {
  var hostsPermitidos = {
    "i.ytimg.com": true,
    "yt3.ggpht.com": true,
    "yt3.googleusercontent.com": true
  };
  var enviadas = Object.create(null);

  function urlImagenValida(valor) {
    try {
      var url = new URL(valor, document.baseURI);
      return url.protocol === "https:" && hostsPermitidos[url.hostname];
    } catch (error) {
      return false;
    }
  }

  window.FMV_precargarImagenes = function (urls) {
    if (!Array.isArray(urls) || !("serviceWorker" in navigator)) return;
    var seleccionadas = [];
    urls.forEach(function (valor) {
      if (seleccionadas.length >= 40 || !urlImagenValida(valor) || enviadas[valor]) return;
      enviadas[valor] = true;
      seleccionadas.push(valor);
    });
    if (!seleccionadas.length) return;

    navigator.serviceWorker.ready.then(function (registro) {
      var worker = navigator.serviceWorker.controller || registro.active;
      if (worker) worker.postMessage({ type: "CACHE_YOUTUBE_IMAGES", urls: seleccionadas });
    }).catch(function (error) {
      console.warn("No se pudieron precargar las imágenes de canales.", error);
    });
  };
})();
