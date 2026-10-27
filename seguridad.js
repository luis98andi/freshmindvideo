/* Preserve app behavior if a restricted WebView blocks persistent browser storage. */
(function () {
  try {
    void window.localStorage.length;
  } catch (error) {
    var memory = Object.create(null);
    var fallback = {
      getItem: function (key) { return Object.prototype.hasOwnProperty.call(memory, key) ? memory[key] : null; },
      setItem: function (key, value) { memory[String(key)] = String(value); },
      removeItem: function (key) { delete memory[key]; },
      clear: function () { memory = Object.create(null); },
      key: function (index) { return Object.keys(memory)[index] || null; }
    };
    Object.defineProperty(fallback, "length", { get: function () { return Object.keys(memory).length; } });
    try {
      Object.defineProperty(window, "localStorage", { configurable: true, value: fallback });
      window.FMV_storageUnavailable = true;
      console.error("FreshMindVideo: almacenamiento local no disponible; se usará almacenamiento temporal.", error);
    } catch (overrideError) {
      console.error("FreshMindVideo: no fue posible habilitar almacenamiento temporal.", overrideError);
    }
  }
})();
window.addEventListener("DOMContentLoaded", function () {
  if (!window.FMV_storageUnavailable) return;
  var aviso = document.createElement("div");
  aviso.setAttribute("role", "status");
  aviso.style.cssText = "position:fixed;left:12px;right:12px;bottom:12px;z-index:10000;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;background:#7f1d1d;color:#fff;border-radius:12px;font:600 14px/1.4 sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.3)";
  aviso.appendChild(document.createTextNode("El almacenamiento del dispositivo no está disponible. Los cambios solo se guardarán durante esta sesión."));
  var cerrar = document.createElement("button");
  cerrar.type = "button";
  cerrar.setAttribute("aria-label", "Cerrar aviso");
  cerrar.textContent = "×";
  cerrar.style.cssText = "border:0;background:transparent;color:inherit;font-size:24px;cursor:pointer;line-height:1";
  cerrar.addEventListener("click", function () { aviso.remove(); });
  aviso.appendChild(cerrar);
  document.body.appendChild(aviso);
});

/* Seguridad del PWA: bloquear salidas a sitios externos, guardar el contexto dentro de la app y evitar que
   el navegador reabra el flujo de navegación mientras el usuario está viendo el contenido infantil. */
(function () {
  var YT_OK = /^https:\/\/(www\.youtube\.com|www\.youtube-nocookie\.com|i\.ytimg\.com|yt3\.ggpht\.com)/i;

  try {
    var abrir = window.open;
    window.open = function (url, name, features) {
      try {
        var target = String(url || "");
        if (!target) return abrir ? abrir.call(window, url, name, features) : null;
        var parsed = new URL(target, location.href);
        if (parsed.origin !== location.origin && !YT_OK.test(parsed.href)) return null;
      } catch (e) {}
      return abrir ? abrir.call(window, url, name, features) : null;
    };
  } catch (e) {}

  try {
    if (window.navigation) {
      navigation.addEventListener("navigate", function (e) {
        try {
          var u = new URL(e.destination.url, location.href);
          if (u.origin !== location.origin && !YT_OK.test(u.href)) e.preventDefault();
        } catch (x) {}
      });
    }
  } catch (e) {}

  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest && e.target.closest("a[href]");
    if (!a || !a.href) return;
    try {
      var u = new URL(a.href, location.href);
      if (u.origin !== location.origin && !YT_OK.test(u.href)) {
        e.preventDefault();
        e.stopPropagation();
      }
    } catch (x) {}
  }, true);

  window.addEventListener("beforeinstallprompt", function (e) {
    try { e.preventDefault(); } catch (x) {}
  });

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") {
      try { history.pushState(null, "", location.href); } catch (e) {}
    }
  });
})();
