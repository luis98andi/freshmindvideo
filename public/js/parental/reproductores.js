/* Player design experiments exposed only in the parent zone. */
(function () {
  var opciones = [
    { id: "normal", titulo: "Original", detalle: "Diseño actual, sin efectos extra.", color: "#0f1720" },
    { id: "cine", titulo: "Cine", detalle: "Tonos cinematográficos y marco oscuro.", color: "#172554" },
    { id: "color", titulo: "Color vivo", detalle: "Colores más intensos y reflejos suaves.", color: "#7c2d5a" }
  ];

  window.FMV_abrirReproductores = function (api) {
    if (typeof window.FMV_aplicarEstiloReproductor !== "function" ||
        typeof window.FMV_obtenerEstiloReproductor !== "function") {
      throw new Error("El reproductor todavía no está disponible.");
    }

    var actual = window.FMV_obtenerEstiloReproductor();
    var modal = api.modal(
      '<h3 style="margin:0 0 6px">🎬 Cambiar reproductores de videos</h3>' +
      '<p style="margin:0 0 14px;font-size:14px;opacity:.78">Prueba el diseño original o dos estilos experimentales. El cambio se aplica y se guarda en este dispositivo.</p>' +
      '<div data-player-options style="display:grid;grid-template-columns:1fr;gap:10px"></div>' +
      '<p data-player-status role="status" aria-live="polite" style="margin:12px 0 0;font-weight:800"></p>',
      520
    );
    var contenedorOpciones = modal.caja.querySelector("[data-player-options]");
    var estado = modal.caja.querySelector("[data-player-status]");

    opciones.forEach(function (opcion) {
      var boton = document.createElement("button");
      boton.type = "button";
      boton.setAttribute("data-player-style", opcion.id);
      boton.setAttribute("aria-pressed", String(opcion.id === actual));
      boton.style.cssText = api.estiloBoton +
        ";width:100%;min-height:72px;padding:12px 14px;text-align:left;background:" +
        (opcion.id === actual ? "#0f9f78" : opcion.color);
      boton.innerHTML = "<strong></strong><span style=\"font-size:.84rem;font-weight:600;opacity:.9\"></span>";
      boton.querySelector("strong").textContent =
        (opcion.id === "normal" ? "▶ " : opcion.id === "cine" ? "🎞 " : "🌈 ") + opcion.titulo;
      boton.querySelector("span").textContent = opcion.detalle;
      boton.addEventListener("click", function () {
        if (!window.FMV_aplicarEstiloReproductor(opcion.id)) {
          throw new Error("No se pudo aplicar el diseño seleccionado.");
        }
        actual = opcion.id;
        contenedorOpciones.querySelectorAll("[data-player-style]").forEach(function (otro) {
          var seleccionado = otro.getAttribute("data-player-style") === actual;
          otro.setAttribute("aria-pressed", String(seleccionado));
          var estiloBase = opciones.find(function (item) {
            return item.id === otro.getAttribute("data-player-style");
          });
          otro.style.background = seleccionado ? "#0f9f78" : estiloBase.color;
        });
        estado.textContent = "Diseño aplicado: " + opcion.titulo + ".";
      });
      contenedorOpciones.appendChild(boton);
    });

    estado.textContent = "Diseño actual: " + opciones.find(function (opcion) {
      return opcion.id === actual;
    }).titulo + ".";
    return modal;
  };
})();
