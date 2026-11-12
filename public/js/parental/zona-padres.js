/* Parent-zone menu and its standalone settings panels. */
(function () {
  function obtenerAPI() {
    if (!window.FMV_padresAPI) throw new Error("La zona de padres todavía no está disponible.");
    return window.FMV_padresAPI;
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

    agregarAccion("📖 Manual y Guía para Padres", "#0d9488", function () { window.FMV_abrirManualPadres(api); }, true);
    agregarAccion("🔍 Buscar en YouTube y agregar", "#12a37f", api.abrirBuscador);
    agregarAccion("⚙️ Copia de seguridad y ajustes", "#3b82f6", function () { window.FMV_abrirCopiaSeguridad(api); });
    agregarAccion("🎨 Estilo de tarjetas", "#10b981", function () { window.FMV_abrirEstiloTarjetas(api); });
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
