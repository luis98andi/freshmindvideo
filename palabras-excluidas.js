/* Módulo de Palabras Excluidas y Filtro de Contenido */
(function () {
  'use strict';
  var LS_EXCL = "fmv_palabras_excluidas";

  function obtenerPalabrasExcluidas() {
    try {
      var v = window.FMV_getItem ? window.FMV_getItem(LS_EXCL) : localStorage.getItem(LS_EXCL);
      return JSON.parse(v) || [];
    } catch (e) { return []; }
  }

  function guardarPalabrasExcluidas(arr) {
    try {
      var str = JSON.stringify(arr);
      if (window.FMV_setItem) window.FMV_setItem(LS_EXCL, str);
      else localStorage.setItem(LS_EXCL, str);
      if (window.FMV_recargarBuscador) window.FMV_recargarBuscador();
    } catch (e) {}
  }

  function abrirConfigPalabrasExcluidas() {
    var lista = obtenerPalabrasExcluidas();
    var modalFn = window.FMV_modal || window.modal;
    if (!modalFn) return;

    var html = '<h3 style="margin:0 0 8px">🚫 Palabras excluidas</h3>' +
      '<p style="font-size:13.5px;opacity:.8;margin:0 0 16px;line-height:1.4">Los videos o canales que contengan estas palabras no aparecerán en la búsqueda ni en la lista.</p>' +
      '<div style="display:flex;gap:8px;margin-bottom:14px">' +
        '<input data-inp placeholder="Escribe una palabra o frase..." style="flex:1;padding:10px 12px;border:1px solid #c9d3da;border-radius:8px;font-size:14px;font-family:inherit">' +
        '<button type="button" data-add style="padding:10px 16px;border:0;background:#be123c;color:#fff;border-radius:8px;font-weight:700;cursor:pointer;font-size:14px">Agregar</button>' +
      '</div>' +
      '<div data-tag-list style="display:flex;flex-wrap:wrap;gap:8px;max-height:220px;overflow-y:auto;margin-bottom:16px">';

    if (!lista.length) {
      html += '<p style="font-size:13px;opacity:.65;margin:8px 0">No hay palabras excluidas registradas.</p>';
    } else {
      lista.forEach(function (p, idx) {
        html += '<span style="background:#ffe4e6;color:#9f1239;font-weight:700;font-size:13px;padding:6px 10px;border-radius:999px;display:inline-flex;align-items:center;gap:6px">' + p + ' <button type="button" data-del="' + idx + '" style="border:0;background:none;color:#9f1239;font-weight:800;cursor:pointer;padding:0;font-size:14px">✕</button></span>';
      });
    }

    html += '</div>' +
      '<div style="display:flex;justify-content:flex-end"><button type="button" data-x style="padding:8px 16px;border:0;background:#5b6b7a;color:#fff;border-radius:8px;font-weight:700;cursor:pointer">Cerrar</button></div>';

    var m = modalFn(html, 500);
    var q = function (s) { return m.caja.querySelector(s); };

    q("[data-x]").addEventListener("click", m.cerrar);

    function agregar() {
      var inp = q("[data-inp]");
      var val = inp ? inp.value.trim().toLowerCase() : "";
      if (!val) return;
      var cur = obtenerPalabrasExcluidas();
      if (!cur.includes(val)) {
        cur.push(val);
        guardarPalabrasExcluidas(cur);
      }
      m.cerrar();
      abrirConfigPalabrasExcluidas();
    }

    q("[data-add]").addEventListener("click", agregar);
    var inp = q("[data-inp]");
    if (inp) inp.addEventListener("keydown", function (e) { if (e.key === "Enter") agregar(); });

    m.caja.querySelectorAll("[data-del]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var idx = parseInt(btn.getAttribute("data-del"), 10);
        var cur = obtenerPalabrasExcluidas();
        cur.splice(idx, 1);
        guardarPalabrasExcluidas(cur);
        m.cerrar();
        abrirConfigPalabrasExcluidas();
      });
    });
  }

  window.FMV_obtenerPalabrasExcluidas = obtenerPalabrasExcluidas;
  window.FMV_guardarPalabrasExcluidas = guardarPalabrasExcluidas;
  window.FMV_abrirConfigPalabrasExcluidas = abrirConfigPalabrasExcluidas;
})();
