/* FreshMindVideo - Filtro de Luz Azul para Cuidado Ocular Infantil
   Atenúa la luz azul de la pantalla, ideal para las noches o antes de dormir.
   Permite ajustar intensidad, temporizador y horario automático programado. */
(function () {
  var LS_KEY = "fmv_filtro_azul";

  var configPorDefecto = {
    activo: false,
    intensidad: 25, // porcentaje (10% a 65%)
    modoHorario: true,
    horaInicio: "19:00",
    horaFin: "07:00",
    temporizadorFin: 0 // timestamp
  };

  function leerConfig() {
    try {
      var d = JSON.parse(localStorage.getItem(LS_KEY));
      if (d && typeof d === "object") return Object.assign({}, configPorDefecto, d);
    } catch (e) {}
    return Object.assign({}, configPorDefecto);
  }

  function guardarConfig(cfg) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(cfg)); } catch (e) {}
    aplicarFiltro();
  }

  var capaOverlay = null;

  function crearCapaSiNoExiste() {
    if (capaOverlay && document.body.contains(capaOverlay)) return capaOverlay;
    capaOverlay = document.getElementById("fmv-filtro-luz-azul");
    if (!capaOverlay) {
      capaOverlay = document.createElement("div");
      capaOverlay.id = "fmv-filtro-luz-azul";
      capaOverlay.style.cssText =
        "position:fixed;inset:0;pointer-events:none;z-index:99999;" +
        "transition:background-color .4s ease,opacity .4s ease;opacity:0;";
      document.body.appendChild(capaOverlay);
    }
    return capaOverlay;
  }

  function estaEnHorario(inicio, fin) {
    if (!inicio || !fin) return false;
    var d = new Date();
    var minutosAhora = d.getHours() * 60 + d.getMinutes();

    var pIni = inicio.split(":"), pFin = fin.split(":");
    var minIni = parseInt(pIni[0], 10) * 60 + parseInt(pIni[1] || 0, 10);
    var minFin = parseInt(pFin[0], 10) * 60 + parseInt(pFin[1] || 0, 10);

    if (minIni < minFin) {
      return minutosAhora >= minIni && minutosAhora < minFin;
    } else {
      // Cruza la medianoche (ej: 19:00 a 07:00)
      return minutosAhora >= minIni || minutosAhora < minFin;
    }
  }

  function aplicarFiltro() {
    var cfg = leerConfig();
    var capa = crearCapaSiNoExiste();
    var debeEstarActivo = false;

    // Verificar temporizador
    if (cfg.temporizadorFin && Date.now() < cfg.temporizadorFin) {
      debeEstarActivo = true;
    } else if (cfg.modoHorario && estaEnHorario(cfg.horaInicio, cfg.horaFin)) {
      debeEstarActivo = true;
    } else if (cfg.activo) {
      debeEstarActivo = true;
    }

    if (debeEstarActivo) {
      var op = (cfg.intensidad || 25) / 100;
      // Tono ámbar cálido que bloquea los picos de luz azul dañinos para los ojos
      capa.style.backgroundColor = "rgba(255, 145, 0, " + op + ")";
      capa.style.mixBlendMode = "multiply";
      capa.style.opacity = "1";
    } else {
      capa.style.opacity = "0";
    }
  }

  // Comprobar cada 30 segundos si entró en horario nocturno programado
  setInterval(aplicarFiltro, 30000);

  // Modal de configuración del Filtro de Luz Azul
  window.FMV_abrirFiltroAzul = function () {
    var cfg = leerConfig();
    var modalEl = document.createElement("div");
    modalEl.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;overflow:auto";

    var caja = document.createElement("div");
    caja.style.cssText = "background:#fff;border-radius:24px;padding:24px;width:100%;max-width:480px;box-shadow:0 12px 36px rgba(0,0,0,.3);font-family:inherit;color:#1d2b3a";

    var BTN_ESTILO = "padding:10px 18px;border:0;border-radius:10px;font-weight:800;cursor:pointer;font-family:inherit;font-size:14.5px;";

    caja.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">' +
      '<div style="display:flex;align-items:center;gap:8px">' +
      '<span style="font-size:26px">🌙</span>' +
      '<h2 style="margin:0;font-size:1.3rem">Filtro de Luz Azul</h2>' +
      '</div>' +
      '<button type="button" data-cerrar style="border:0;background:#e2e8f0;color:#334155;border-radius:999px;padding:6px 14px;font-weight:800;cursor:pointer">Cerrar</button>' +
      '</div>' +
      '<p style="margin:0 0 16px;font-size:.88rem;opacity:.8;line-height:1.4">Atenúa los tonos brillantes de la pantalla con un color ámbar cálido para proteger los ojos de tus hijos y favorecer el sueño.</p>' +

      // Encendido Manual
      '<div style="background:#f8fafc;padding:14px;border-radius:16px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center">' +
      '<div>' +
      '<div style="font-weight:800;font-size:.95rem">Activar Ahora Mismo</div>' +
      '<div style="font-size:.78rem;color:#64748b">Enciende el filtro manualmente</div>' +
      '</div>' +
      '<label style="position:relative;display:inline-block;width:50px;height:28px">' +
      '<input type="checkbox" id="chk-fa-activo" ' + (cfg.activo ? 'checked' : '') + ' style="opacity:0;width:0;height:0">' +
      '<span style="position:absolute;cursor:pointer;inset:0;background:' + (cfg.activo ? '#10b981' : '#cbd5e1') + ';border-radius:28px;transition:.3s;display:block">' +
      '<span style="position:absolute;content:\'\';height:22px;width:22px;left:3px;bottom:3px;background:white;border-radius:50%;transition:.3s;transform:' + (cfg.activo ? 'translateX(22px)' : 'none') + ';display:block"></span>' +
      '</span>' +
      '</label>' +
      '</div>' +

      // Slider de Intensidad
      '<div style="background:#f8fafc;padding:14px;border-radius:16px;margin-bottom:12px">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
      '<span style="font-weight:800;font-size:.95rem">Intensidad del Filtro</span>' +
      '<span id="txt-fa-intensidad" style="font-weight:800;color:#d97706">' + cfg.intensidad + '%</span>' +
      '</div>' +
      '<input type="range" id="rng-fa-intensidad" min="10" max="65" value="' + cfg.intensidad + '" style="width:100%;accent-color:#d97706;cursor:pointer">' +
      '<div style="display:flex;justify-content:space-between;font-size:.72rem;color:#94a3b8;margin-top:4px">' +
      '<span>Suave (10%)</span><span>Recomendado (30%)</span><span>Fuerte (65%)</span>' +
      '</div>' +
      '</div>' +

      // Horario Automático Programado
      '<div style="background:#f8fafc;padding:14px;border-radius:16px;margin-bottom:12px">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
      '<div>' +
      '<div style="font-weight:800;font-size:.95rem">Horario Automático Programado</div>' +
      '<div style="font-size:.78rem;color:#64748b">Se activa y apaga solo todos los días</div>' +
      '</div>' +
      '<input type="checkbox" id="chk-fa-horario" ' + (cfg.modoHorario ? 'checked' : '') + ' style="width:20px;height:20px;accent-color:#d97706;cursor:pointer">' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px">' +
      '<div>' +
      '<label style="display:block;font-size:.75rem;font-weight:800;color:#64748b;margin-bottom:4px">Hora Inicio (Noche):</label>' +
      '<input type="time" id="inp-fa-inicio" value="' + cfg.horaInicio + '" style="width:100%;padding:8px 12px;border:1px solid #cbd5e1;border-radius:8px;font-family:inherit;font-weight:700">' +
      '</div>' +
      '<div>' +
      '<label style="display:block;font-size:.75rem;font-weight:800;color:#64748b;margin-bottom:4px">Hora Fin (Mañana):</label>' +
      '<input type="time" id="inp-fa-fin" value="' + cfg.horaFin + '" style="width:100%;padding:8px 12px;border:1px solid #cbd5e1;border-radius:8px;font-family:inherit;font-weight:700">' +
      '</div>' +
      '</div>' +
      '</div>' +

      // Temporizador Rápido
      '<div style="background:#f8fafc;padding:14px;border-radius:16px;margin-bottom:16px">' +
      '<div style="font-weight:800;font-size:.95rem;margin-bottom:6px">⏱ Temporizador Rápido</div>' +
      '<div style="font-size:.78rem;color:#64748b;margin-bottom:10px">Activar solo por cierto tiempo y luego apagar automáticamente:</div>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap">' +
      '<button type="button" data-temp="15" style="' + BTN_ESTILO + ';background:#e2e8f0;color:#1e293b;padding:6px 12px;font-size:.8rem">+15 min</button>' +
      '<button type="button" data-temp="30" style="' + BTN_ESTILO + ';background:#e2e8f0;color:#1e293b;padding:6px 12px;font-size:.8rem">+30 min</button>' +
      '<button type="button" data-temp="60" style="' + BTN_ESTILO + ';background:#e2e8f0;color:#1e293b;padding:6px 12px;font-size:.8rem">+1 hora</button>' +
      '<button type="button" data-temp="0" style="' + BTN_ESTILO + ';background:#fee2e2;color:#991b1b;padding:6px 12px;font-size:.8rem">Cancelar temporizador</button>' +
      '</div>' +
      '</div>' +

      '<button type="button" id="btn-fa-guardar" style="' + BTN_ESTILO + ';background:#12a37f;color:#fff;width:100%;padding:14px;font-size:1rem">Guardar Cambios</button>';

    modalEl.appendChild(caja);
    document.body.appendChild(modalEl);

    var rng = caja.querySelector("#rng-fa-intensidad");
    var txtInt = caja.querySelector("#txt-fa-intensidad");
    var chkActivo = caja.querySelector("#chk-fa-activo");
    var chkHorario = caja.querySelector("#chk-fa-horario");
    var inpInicio = caja.querySelector("#inp-fa-inicio");
    var inpFin = caja.querySelector("#inp-fa-fin");

    rng.addEventListener("input", function () {
      txtInt.textContent = rng.value + "%";
      // Vista previa inmediata
      var capa = crearCapaSiNoExiste();
      capa.style.backgroundColor = "rgba(255, 145, 0, " + (rng.value / 100) + ")";
      capa.style.opacity = "1";
    });

    caja.querySelectorAll("[data-temp]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var min = parseInt(btn.getAttribute("data-temp"), 10);
        if (min > 0) {
          cfg.temporizadorFin = Date.now() + min * 60000;
          cfg.activo = true;
          chkActivo.checked = true;
          btn.style.background = "#d97706";
          btn.style.color = "#fff";
        } else {
          cfg.temporizadorFin = 0;
          btn.style.background = "#fee2e2";
        }
        guardarConfig(cfg);
      });
    });

    caja.querySelector("#btn-fa-guardar").addEventListener("click", function () {
      cfg.activo = chkActivo.checked;
      cfg.intensidad = parseInt(rng.value, 10);
      cfg.modoHorario = chkHorario.checked;
      cfg.horaInicio = inpInicio.value || "19:00";
      cfg.horaFin = inpFin.value || "07:00";
      guardarConfig(cfg);
      modalEl.remove();
    });

    caja.querySelector("[data-cerrar]").addEventListener("click", function () {
      aplicarFiltro(); // restablece lo guardado si solo movió el slider
      modalEl.remove();
    });
    modalEl.addEventListener("click", function (e) {
      if (e.target === modalEl) {
        aplicarFiltro();
        modalEl.remove();
      }
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", aplicarFiltro);
  } else {
    aplicarFiltro();
  }
})();
