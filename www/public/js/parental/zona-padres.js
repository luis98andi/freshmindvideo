/* Parent-zone menu and its standalone settings panels. */
(function () {
  function obtenerAPI() {
    if (!window.FMV_padresAPI) throw new Error("La zona de padres todavía no está disponible.");
    return window.FMV_padresAPI;
  }

  function abrirManual(api) {
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
  }

  function abrirCopiaSeguridad(api) {
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
  }

  function abrirEstiloTarjetas(api) {
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
  }

  function abrirPanel() {
    var api = obtenerAPI();
    var tiempos = api.tiempos();
    var usoHija = Math.floor((tiempos.hija.usoSeg || 0) / 60);
    var usoHijo = Math.floor((tiempos.hijo.usoSeg || 0) / 60);
    var limiteHija = tiempos.hija.limiteMin > 0 ? tiempos.hija.limiteMin + "m" : "∞";
    var limiteHijo = tiempos.hijo.limiteMin > 0 ? tiempos.hijo.limiteMin + "m" : "∞";
    var cantidadOcultos = api.ocultos();
    var modal = api.modal(
      '<h3 style="margin:0 0 4px">🔒 Zona de padres</h3>' +
      '<p style="margin:0 0 12px;font-size:14px;opacity:.75">Administra el contenido, tiempos y límites de pantalla de tus hijos.</p>' +
      '<div style="background:#f4f8fb;padding:10px 14px;border-radius:12px;margin-bottom:14px;font-size:.86rem;display:flex;justify-content:space-around;font-weight:800">' +
      '<span>👧 Hija: <b style="color:#0a6b53">' + usoHija + 'm hoy</b> (Límite: ' + limiteHija + ')</span>' +
      '<span>👦 Hijo: <b style="color:#0a6b53">' + usoHijo + 'm hoy</b> (Límite: ' + limiteHijo + ')</span></div>' +
      '<div data-actions style="display:grid;grid-template-columns:1fr 1fr;gap:10px"></div>',
      620
    );
    var acciones = modal.caja.querySelector("[data-actions]");

    function agregarAccion(texto, color, callback, anchoCompleto) {
      var boton = document.createElement("button");
      boton.type = "button";
      boton.textContent = texto;
      boton.style.cssText = api.estiloBoton + ";width:100%;padding:12px 14px;text-align:left;min-height:54px;background:" + color;
      if (anchoCompleto) boton.style.gridColumn = "span 2";
      boton.addEventListener("click", function () {
        modal.cerrar();
        callback();
      });
      acciones.appendChild(boton);
    }

    agregarAccion("📖 Manual y Guía para Padres", "#0d9488", function () { abrirManual(api); }, true);
    agregarAccion("🔍 Buscar en YouTube y agregar", "#12a37f", api.abrirBuscador);
    agregarAccion("⚙️ Copia de seguridad y ajustes", "#3b82f6", function () { abrirCopiaSeguridad(api); });
    agregarAccion("🎨 Estilo de tarjetas", "#10b981", function () { abrirEstiloTarjetas(api); });
    agregarAccion("🚫 Palabras excluidas (" + api.palabrasExcluidas().length + ")", "#be123c", api.abrirConfigPalabras);
    agregarAccion("⏱ Tiempo de pantalla y temporizador", "#0284c7", api.abrirConfigTiempos);
    agregarAccion("🌙 Modo Calma y Apagado", "#4338ca", function () { if (window.FMV_abrirModoCalma) window.FMV_abrirModoCalma(); });
    agregarAccion("🌙 Filtro de Luz Azul", "#d97706", function () { if (window.FMV_abrirFiltroAzul) window.FMV_abrirFiltroAzul(); });
    agregarAccion("⏰ Horarios y Rutina de Descanso", "#0891b2", function () { if (window.FMV_abrirHorarios) window.FMV_abrirHorarios(); });
    agregarAccion("👀 Pausas Activas (Vista)", "#0369a1", function () { if (window.FMV_abrirPausasActivas) window.FMV_abrirPausasActivas(); });
    agregarAccion("📊 Reportes y Estadísticas", "#4f46e5", function () { if (window.FMV_abrirReportes) window.FMV_abrirReportes(); });
    agregarAccion("🏆 Logros y Medallas de Niños", "#f59e0b", function () { if (window.FMV_abrirLogros) window.FMV_abrirLogros(); });
    agregarAccion("🙈 Videos y listas ocultas" + (cantidadOcultos ? " (" + cantidadOcultos + ")" : ""), "#475569", api.abrirVideosOcultos);
    if (api.hayOcultos()) agregarAccion("↩ Restaurar contenido oculto", "#e08a00", api.restaurar);
    agregarAccion("🕘 Historial", "#6b4fd0", api.abrirHistorial);
    agregarAccion("👧👦 Cambiar perfil", "#b06a00", function () { if (window.FMV_cambiarPerfil) window.FMV_cambiarPerfil(); });
    agregarAccion("🔑 Cambiar contraseña", "#9333ea", api.abrirCambiarPin);
    agregarAccion("🚪 Salir de padres", "#5b6b7a", api.salir, true);
  }

  window.FMV_mostrarZonaPadres = abrirPanel;
  window.FMV_abrirPadres = function () {
    var api = obtenerAPI();
    if (api.esPadre()) abrirPanel();
    else api.pedirPin(abrirPanel);
  };
})();
