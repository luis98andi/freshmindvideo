/* Módulo de Historial de Reproducciones */
(function () {
  'use strict';
  var LS_HIST = "fmv_historial";

  function leerHist() {
    try {
      var v = window.FMV_getItem ? window.FMV_getItem(LS_HIST) : localStorage.getItem(LS_HIST);
      return JSON.parse(v) || [];
    } catch (e) { return []; }
  }

  function guardarHist(list) {
    try {
      var str = JSON.stringify(list);
      if (window.FMV_setItem) window.FMV_setItem(LS_HIST, str);
      else localStorage.setItem(LS_HIST, str);
    } catch (e) {}
  }

  function abrirHistorial() {
    var hist = leerHist();
    var modalFn = window.FMV_modal || window.modal;
    if (!modalFn) return;

    var html = '<h3 style="margin:0 0 8px">🕘 Historial de reproducción</h3>' +
      '<p style="font-size:13.5px;opacity:.8;margin:0 0 16px;line-height:1.4">Videos vistos recientemente en todos los perfiles.</p>';

    if (!hist.length) {
      html += '<p style="font-size:14px;opacity:.7;margin:20px 0;text-align:center">Aún no hay historial de reproducción.</p>';
    } else {
      html += '<div data-hist-list style="max-height:320px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;margin-bottom:16px">';
      hist.forEach(function (item, idx) {
        html += '<div style="display:flex;justify-content:space-between;align-items:center;background:#f8fafc;padding:10px 12px;border-radius:10px;border:1px solid #e2e8f0">' +
          '<div style="overflow:hidden;margin-right:8px"><div style="font-weight:700;font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + (item.titulo || item.id || 'Video') + '</div>' +
          '<div style="font-size:12px;opacity:.65">' + (item.canal || '') + (item.fecha ? ' • ' + item.fecha : '') + '</div></div>' +
          '<button type="button" data-del="' + idx + '" style="border:0;background:#fee2e2;color:#ef4444;font-size:12px;font-weight:800;padding:4px 8px;border-radius:6px;cursor:pointer">✕</button>' +
        '</div>';
      });
      html += '</div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center">' +
          '<button type="button" data-clear style="border:0;background:#ef4444;color:#fff;font-weight:800;padding:8px 14px;border-radius:8px;cursor:pointer;font-size:13px">🗑 Limpiar todo</button>' +
          '<button type="button" data-x style="border:0;background:#5b6b7a;color:#fff;font-weight:800;padding:8px 14px;border-radius:8px;cursor:pointer;font-size:13px">Cerrar</button>' +
        '</div>';
    }

    var m = modalFn(html, 520);
    var q = function (s) { return m.caja.querySelector(s); };

    var btnX = q("[data-x]"); if (btnX) btnX.addEventListener("click", m.cerrar);
    var btnClear = q("[data-clear]");
    if (btnClear) {
      btnClear.addEventListener("click", function () {
        guardarHist([]);
        m.cerrar();
        if (window.FMV_mostrarToast) window.FMV_mostrarToast("✓ Historial borrado.");
      });
    }

    m.caja.querySelectorAll("[data-del]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var idx = parseInt(btn.getAttribute("data-del"), 10);
        var cur = leerHist();
        cur.splice(idx, 1);
        guardarHist(cur);
        m.cerrar();
        abrirHistorial();
      });
    });
  }

  window.FMV_abrirHistorial = abrirHistorial;
})();
