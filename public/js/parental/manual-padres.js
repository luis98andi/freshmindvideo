/* Panel independiente para consultar la guía para padres. */
(function () {
  window.FMV_abrirManualPadres = function (api) {
    var modal = api.modal(
      '<h3 style="margin:0 0 10px">📖 Manual para Padres</h3>' +
      '<p><a data-manual-link>Leer o descargar el manual completo</a></p>' +
      '<pre data-manual style="max-height:55vh;overflow:auto;white-space:pre-wrap;font:13px/1.5 inherit"></pre>',
      600
    );
    var enlace = modal.caja.querySelector("[data-manual-link]");
    enlace.href = new URL("./MANUAL_PADRES.md", document.baseURI).href;
    enlace.target = "_blank";
    enlace.rel = "noopener";

    fetch(enlace.href)
      .then(function (response) {
        if (!response.ok) throw new Error("HTTP " + response.status);
        return response.text();
      })
      .then(function (texto) { modal.caja.querySelector("[data-manual]").textContent = texto; })
      .catch(function (error) {
        console.error("No se pudo cargar el manual para padres.", error);
        modal.caja.querySelector("[data-manual]").textContent = "No se pudo cargar el manual. Usa el enlace para abrirlo directamente.";
      });
  };
})();
