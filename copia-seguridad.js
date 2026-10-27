/* Módulo de Copia de Seguridad y Respaldo de Configuración */
(function () {
  'use strict';

  function abrirCopiaSeguridad() {
    var modalFn = window.FMV_modal || window.modal;
    if (!modalFn) return;

    var ESTILO_BT = "padding:10px 16px;border:0;background:#12a37f;color:#fff;border-radius:8px;cursor:pointer;font-weight:700;font-family:inherit;font-size:15px";

    var mt = modalFn(
      '<h3 style="margin:0 0 4px">⚙️ Copia de Seguridad y Configuración</h3>' +
      '<p style="margin:0 0 16px;font-size:14px;opacity:.75">Exporta todas tus configuraciones (canales, videos, palabras excluidas, horarios, límites de tiempo, contraseñas, etc.) en un archivo JSON, o restáuralas importando un respaldo previo.</p>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px">' +
        '<button type="button" data-export style="' + ESTILO_BT + ';background:#3b82f6;flex:1">💾 Exportar Configuración</button>' +
        '<label style="' + ESTILO_BT + ';background:#10b981;flex:1;text-align:center;cursor:pointer;display:inline-block;padding:12px">📂 Importar Configuración<input type="file" data-import accept=".json" style="display:none"></label>' +
      '</div>' +
      '<p data-msg style="font-size:13px;font-weight:700;margin:0;color:#12a37f"></p>',
      480
    );

    var q = function (s) { return mt.caja.querySelector(s); };

    q("[data-export]").addEventListener("click", function () {
      var data = {};
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k) {
          data[k] = window.FMV_getItem ? window.FMV_getItem(k) : localStorage.getItem(k);
        }
      }
      var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = "freshmind_backup_" + new Date().toISOString().slice(0, 10) + ".json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      q("[data-msg]").textContent = "✓ Copia de seguridad exportada con éxito.";
    });

    q("[data-import]").addEventListener("change", function (e) {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function (evt) {
        try {
          var data = JSON.parse(evt.target.result);
          if (!data || typeof data !== "object") throw new Error("Archivo inválido");
          Object.keys(data).forEach(function (k) {
            if (typeof data[k] === "string") {
              if (window.FMV_setItem) window.FMV_setItem(k, data[k]);
              else localStorage.setItem(k, data[k]);
            }
          });
          q("[data-msg]").textContent = "✓ Configuración importada con éxito. Recargando...";
          setTimeout(function () { location.reload(); }, 1500);
        } catch (err) {
          q("[data-msg]").style.color = "#d93025";
          q("[data-msg]").textContent = "⚠️ Error al importar: archivo JSON no válido.";
        }
      };
      reader.readAsText(file);
    });
  }

  window.FMV_abrirCopiaSeguridad = abrirCopiaSeguridad;
})();
