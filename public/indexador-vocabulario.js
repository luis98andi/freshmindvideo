/* Módulo de Indexación, Vocabulario e IndexedDB para Buscador */
(function () {
  'use strict';

  function norm(t) {
    var s = String(t || "").toLowerCase();
    try { s = s.normalize("NFD").replace(/[̀-ͯ]/g, ""); } catch (e) {}
    return s;
  }

  function abrirDB(cb) {
    var r, hecho = false;
    function fin(x) { if (!hecho) { hecho = true; cb(x); } }
    try { r = indexedDB.open("fmv_buscador", 1); } catch (e) { fin(null); return; }
    r.onupgradeneeded = function () { r.result.createObjectStore("canales", { keyPath: "id" }); };
    r.onsuccess = function () { fin(r.result); };
    r.onerror = function () { fin(null); };
    r.onblocked = function () { fin(null); };
  }

  window.FMV_norm = norm;
  window.FMV_abrirDB = abrirDB;
})();
