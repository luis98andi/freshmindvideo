/* Módulo de Gestión y Renderizado de Canales en Pantalla Principal */
(function () {
  'use strict';

  var LS_CACHE = "fmv_cache";
  var LS_OCULTOS = "fmv_bloqueados";
  var PERFS = ["hija", "hijo"];

  function leer(k, d) {
    try {
      var v = window.FMV_getItem ? window.FMV_getItem(k) : localStorage.getItem(k);
      return JSON.parse(v) || d;
    } catch (e) { return d; }
  }

  function guardar(k, v) {
    try {
      var str = JSON.stringify(v);
      if (window.FMV_setItem) window.FMV_setItem(k, str);
      else localStorage.setItem(k, str);
    } catch (e) {}
  }

  function perfilesDe(c) {
    if (!c.perfiles || !Array.isArray(c.perfiles)) return PERFS.slice();
    return c.perfiles.filter(function (p) { return PERFS.includes(p); });
  }

  function obtenerOcultos() { return leer(LS_OCULTOS, []); }
  function hayOcultos() { return obtenerOcultos().length > 0; }
  function cantOcultos() { return obtenerOcultos().length; }

  window.FMV_hayOcultos = hayOcultos;
  window.FMV_cantOcultos = cantOcultos;

  var grid = document.getElementById("grid-canales");
  var msg = document.getElementById("mensaje-canales");
  var todos = [];

  function foto(it) {
    if (!it || !it.snippet || !it.snippet.thumbnails) return "";
    var th = it.snippet.thumbnails;
    return (th.medium || th.high || th.default || {}).url || "";
  }

  function resolver(arr) {
    var cache = leer(LS_CACHE, {}), pend = [], ahora = Date.now();
    arr.forEach(function (c) {
      var h = cache[c.url];
      if (h && ahora - h.t < 6048e5) { c.id = h.id; c.imagen = h.img; }
      else pend.push(c);
    });
    if (!pend.length) return Promise.resolve();
    return Promise.all(pend.map(function (c) {
      var id = (c.url.match(/channel\/([\w-]+)/) || [])[1];
      if (id) {
        c.id = id;
        cache[c.url] = { id: id, img: c.imagen || "", t: ahora };
      }
      return Promise.resolve();
    })).then(function () { guardar(LS_CACHE, cache); });
  }

  function pintar() {
    if (!grid) return;
    grid.innerHTML = "";
    var perfActual = typeof window.FMV_perfilActual === "function" ? window.FMV_perfilActual() : "hija";
    var ocultos = obtenerOcultos();

    var filtrados = todos.filter(function (c) {
      if (ocultos.includes(c.id || c.url)) return false;
      var ps = perfilesDe(c);
      return ps.includes(perfActual);
    });

    if (!filtrados.length) {
      if (msg) msg.textContent = "No hay canales para este perfil.";
      return;
    }
    if (msg) msg.textContent = "";

    filtrados.forEach(function (c) {
      var card = document.createElement("button");
      card.type = "button";
      card.className = "canal-tarjeta";
      card.setAttribute("data-id", c.id || "");
      
      var img = document.createElement("img");
      img.src = c.imagen || "apple-touch-icon.png";
      img.alt = c.nombre || "";
      img.loading = "lazy";

      var txt = document.createElement("span");
      txt.textContent = c.nombre || "";

      card.appendChild(img);
      card.appendChild(txt);

      card.addEventListener("click", function () {
        if (typeof window.FMV_abrirCanal === "function") {
          window.FMV_abrirCanal(c.id, c.nombre);
        }
      });

      grid.appendChild(card);
    });
  }

  function abrirManualPadres() {
    var modalFn = window.FMV_modal || window.modal;
    if (!modalFn) return;
    var ESTILO_BT = "padding:10px 16px;border:0;background:#12a37f;color:#fff;border-radius:8px;cursor:pointer;font-weight:700;font-family:inherit;font-size:15px";
    var mm = modalFn(
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">' +
      '<div style="display:flex;align-items:center;gap:8px">' +
      '<span style="font-size:26px">📖</span>' +
      '<h2 style="margin:0;font-size:1.35rem">Manual y Guía para Padres</h2>' +
      '</div>' +
      '<button type="button" data-x style="' + ESTILO_BT + ';background:#5b6b7a;padding:6px 14px;border-radius:999px">Cerrar</button>' +
      '</div>' +
      '<div style="max-height:60vh;overflow-y:auto;padding-right:6px;line-height:1.6;font-size:14.5px">' +
      '<p><b>FreshMindVideo</b> está diseñado para brindar un entorno 100% seguro de entretenimiento infantil.</p>' +
      '<ul>' +
      '<li><b>Control de Tiempo:</b> Configura límites diarios para Hija e Hijo.</li>' +
      '<li><b>Palabras Excluidas:</b> Filtra términos no deseados.</li>' +
      '<li><b>Filtros y Descanso:</b> Activa Pausas Activas y Filtro Azul.</li>' +
      '</ul>' +
      '</div>',
      600
    );
    mm.caja.querySelector("[data-x]").addEventListener("click", mm.cerrar);
  }

  function abrirEstiloTarjetas() {
    var modalFn = window.FMV_modal || window.modal;
    if (!modalFn) return;
    var ESTILO_BT = "padding:10px 16px;border:0;background:#12a37f;color:#fff;border-radius:8px;cursor:pointer;font-weight:700;font-family:inherit;font-size:15px";
    var formaActual = window.FMV_getItem ? window.FMV_getItem("fmv_card_shape", "rounded") : (localStorage.getItem("fmv_card_shape") || "rounded");
    var mt = modalFn(
      '<h3 style="margin:0 0 4px">🎨 Estilo y Forma de Tarjetas</h3>' +
      '<p style="margin:0 0 16px;font-size:14px;opacity:.75">Elige cómo se ven las tarjetas de los canales en la pantalla principal.</p>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
      '<button type="button" data-shape="rounded" style="' + ESTILO_BT + ';padding:14px;background:' + (formaActual === 'rounded' ? '#10b981' : '#2f6fdd') + '">🔵 Redondeado (Clásico)</button>' +
      '<button type="button" data-shape="circle" style="' + ESTILO_BT + ';padding:14px;background:' + (formaActual === 'circle' ? '#10b981' : '#2f6fdd') + '">⚪ Círculo / Avatar</button>' +
      '<button type="button" data-shape="square" style="' + ESTILO_BT + ';padding:14px;background:' + (formaActual === 'square' ? '#10b981' : '#2f6fdd') + '">◼ Cuadrado</button>' +
      '<button type="button" data-shape="modern" style="' + ESTILO_BT + ';padding:14px;background:' + (formaActual === 'modern' ? '#10b981' : '#2f6fdd') + '">🌟 Moderno (Sombra)</button>' +
      '</div>',
      500
    );
    mt.caja.querySelectorAll("[data-shape]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var sh = btn.getAttribute("data-shape");
        if (window.FMV_setItem) window.FMV_setItem("fmv_card_shape", sh);
        else localStorage.setItem("fmv_card_shape", sh);
        document.body.classList.remove("card-circle", "card-square", "card-modern");
        if (sh !== "rounded") {
          document.body.classList.add("card-" + sh);
        }
        mt.cerrar();
      });
    });
  }

  function abrirVideosOcultos() {
    var modalFn = window.FMV_modal || window.modal;
    if (!modalFn) return;
    var ESTILO_BT = "padding:10px 16px;border:0;background:#12a37f;color:#fff;border-radius:8px;cursor:pointer;font-weight:700;font-family:inherit;font-size:15px";
    var list = obtenerOcultos();
    var html = '<h3 style="margin:0 0 8px">🙈 Canales y videos ocultos</h3>' +
      '<p style="font-size:13.5px;opacity:.8;margin:0 0 16px">Elementos que has ocultado para los niños.</p>';
    if (!list.length) {
      html += '<p style="font-size:14px;opacity:.7;margin:20px 0;text-align:center">No hay canales ni videos ocultos.</p>';
    } else {
      html += '<div style="max-height:280px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;margin-bottom:16px">';
      list.forEach(function (id) {
        html += '<div style="display:flex;justify-content:space-between;align-items:center;background:#f8fafc;padding:10px 12px;border-radius:10px;border:1px solid #e2e8f0">' +
          '<span style="font-weight:700;font-size:13.5px">' + id + '</span>' +
          '<button type="button" data-rest="' + id + '" style="' + ESTILO_BT + ';padding:4px 10px;font-size:12px">Restaurar</button>' +
        '</div>';
      });
      html += '</div>';
    }
    html += '<div style="display:flex;justify-content:flex-end"><button type="button" data-x style="' + ESTILO_BT + ';background:#5b6b7a">Cerrar</button></div>';

    var m = modalFn(html, 480);
    m.caja.querySelector("[data-x]").addEventListener("click", m.cerrar);
    m.caja.querySelectorAll("[data-rest]").forEach(function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-rest");
        var cur = obtenerOcultos().filter(function (x) { return x !== id; });
        guardar(LS_OCULTOS, cur);
        m.cerrar();
        pintar();
        abrirVideosOcultos();
      });
    });
  }

  function restaurar() {
    guardar(LS_OCULTOS, []);
    pintar();
    if (window.FMV_mostrarToast) window.FMV_mostrarToast("✓ Se han restaurado todos los canales y videos.");
  }

  function iniciar() {
    fetch("canales.json?v=26")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        todos = data || [];
        return resolver(todos);
      })
      .then(function () { pintar(); })
      .catch(function (e) {
        if (msg) msg.textContent = "No se pudieron cargar los canales.";
      });
  }

  function aplicarFormaTarjetas() {
    var sh = window.FMV_getItem ? window.FMV_getItem("fmv_card_shape", "rounded") : (localStorage.getItem("fmv_card_shape") || "rounded");
    document.body.classList.remove("card-circle", "card-square", "card-modern");
    if (sh !== "rounded") {
      document.body.classList.add("card-" + sh);
    }
  }

  aplicarFormaTarjetas();
  iniciar();

  window.FMV_pintarCanales = pintar;
  window.FMV_abrirManualPadres = abrirManualPadres;
  window.FMV_abrirEstiloTarjetas = abrirEstiloTarjetas;
  window.FMV_abrirVideosOcultos = abrirVideosOcultos;
  window.FMV_restaurar = restaurar;
})();
