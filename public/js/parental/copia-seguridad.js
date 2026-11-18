/* Export and restore local settings as a user-managed backup file. */
(function () {
  window.FMV_abrirCopiaSeguridad = function (api) {
    var modal = api.modal(
      '<h3 style="margin:0 0 8px">⚙️ Copia de seguridad y configuración</h3>' +
      '<p>Exporta o restaura los ajustes guardados en este dispositivo.</p>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px">' +
      '<button type="button" data-export style="' + api.estiloBoton + ';background:#3b82f6;flex:1">💾 Exportar configuración</button>' +
      '<label style="' + api.estiloBoton + ';background:#10b981;flex:1;text-align:center;cursor:pointer">📂 Importar configuración<input type="file" data-import accept=".json" style="display:none"></label>' +
      '</div><p data-message role="status"></p>',
      480
    );
    var mensaje = modal.caja.querySelector("[data-message]");
    modal.caja.querySelector("[data-export]").addEventListener("click", function () {
      var copia = {};
      for (var i = 0; i < localStorage.length; i++) {
        var clave = localStorage.key(i);
        if (clave) copia[clave] = localStorage.getItem(clave);
      }

      var archivo = new Blob([JSON.stringify(copia, null, 2)], { type: "application/json;charset=utf-8" });
      var url = URL.createObjectURL(archivo);
      var enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = "freshmind_backup_" + new Date().toISOString().slice(0, 10) + ".json";
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      URL.revokeObjectURL(url);
      mensaje.textContent = "Copia de seguridad exportada.";
    });

    modal.caja.querySelector("[data-import]").addEventListener("change", function (event) {
      var archivo = event.target.files && event.target.files[0];
      if (!archivo) return;
      var lector = new FileReader();
      lector.onerror = function () {
        mensaje.textContent = "No se pudo leer el archivo seleccionado.";
      };
      lector.onload = function () {
        try {
          var copia = JSON.parse(lector.result);
          if (!copia || typeof copia !== "object" || Array.isArray(copia)) throw new Error("Formato de copia no válido.");
          Object.keys(copia).forEach(function (clave) {
            if (typeof copia[clave] === "string") localStorage.setItem(clave, copia[clave]);
          });
          mensaje.textContent = "Configuración importada. Recargando…";
          setTimeout(function () { location.reload(); }, 1200);
        } catch (error) {
          console.error("No se pudo importar la copia de seguridad.", error);
          mensaje.textContent = "No se pudo importar: comprueba que el JSON sea válido y que haya espacio disponible.";
        }
      };
      lector.readAsText(archivo);
    });
  };
})();
