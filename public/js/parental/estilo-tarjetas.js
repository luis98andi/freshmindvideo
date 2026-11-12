/* Card appearance settings as an independent parent-zone panel. */
(function () {
  window.FMV_abrirEstiloTarjetas = function (api) {
    var formaActual = localStorage.getItem("fmv_card_shape") || "rounded";
    var modal = api.modal(
      '<h3 style="margin:0 0 12px">🎨 Estilo de tarjetas</h3>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
      '<button type="button" data-shape="rounded">🔵 Redondeado</button>' +
      '<button type="button" data-shape="circle">⚪ Círculo</button>' +
      '<button type="button" data-shape="square">◼ Cuadrado</button>' +
      '<button type="button" data-shape="modern">🌟 Moderno</button></div>',
      500
    );

    modal.caja.querySelectorAll("[data-shape]").forEach(function (boton) {
      var forma = boton.getAttribute("data-shape");
      boton.style.cssText = api.estiloBoton + ";padding:14px;background:" + (forma === formaActual ? "#10b981" : "#2f6fdd");
      boton.addEventListener("click", function () {
        localStorage.setItem("fmv_card_shape", forma);
        document.body.classList.remove("card-circle", "card-square", "card-modern");
        if (forma !== "rounded") document.body.classList.add("card-" + forma);
        modal.cerrar();
      });
    });
  };
})();
