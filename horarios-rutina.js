/* FreshMindVideo - Horarios y Rutinas de Descanso
   Permite programar horarios automáticos de bloqueo (ej: Hora de Dormir 20:00 - 07:00 o Tareas 14:00 - 16:00). */
(function () {
  var LS_KEY = "fmv_horarios_rutina";

  var configPorDefecto = {
    activo: false,
    nombre: "Hora de Dormir",
    horaInicio: "20:00",
    horaFin: "07:00",
    dias: [1, 2, 3, 4, 5, 6, 0] // 0=Domingo, 1=Lunes, etc.
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
    verificarBloqueoHorario();
  }

  var capaBloqueo = null;
  var desbloqueadoTemporalmente = false;

  function crearCapaBloqueo() {
    if (capaBloqueo && document.body.contains(capaBloqueo)) return capaBloqueo;
    capaBloqueo = document.getElementById("fmv-bloqueo-rutina");
    if (!capaBloqueo) {
      capaBloqueo = document.createElement("div");
      capaBloqueo.id = "fmv-bloqueo-rutina";
      capaBloqueo.style.cssText =
        "position:fixed;inset:0;background:#0f172a;color:#fff;z-index:99998;display:none;flex-direction:column;" +
        "align-items:center;justify-content:center;padding:24px;text-align:center;font-family:inherit";

      capaBloqueo.innerHTML =
        '<div style="max-width:440px;background:#1e293b;padding:32px 24px;border-radius:28px;box-shadow:0 14px 40px rgba(0,0,0,.6)">' +
        '<div style="font-size:64px;margin-bottom:12px">🌙</div>' +
        '<h2 id="fmv-rutina-titulo" style="margin:0 0 10px;font-size:1.6rem;color:#f8fafc">Hora de Descansar</h2>' +
        '<p id="fmv-rutina-desc" style="margin:0 0 24px;font-size:.95rem;color:#94a3b8;line-height:1.5">' +
        'El horario configurado para este momento es para dormir, hacer tareas o compartir en familia. ¡Hasta pronto!' +
        '</p>' +
        '<button type="button" id="btn-rutina-desbloquear" style="border:0;background:#12a37f;color:#fff;border-radius:12px;padding:12px 22px;font-weight:800;font-size:15px;cursor:pointer">' +
        '🔒 Soy Papá/Mamá (Desbloquear)' +
        '</button>' +
        '</div>';

      document.body.appendChild(capaBloqueo);

      capaBloqueo.querySelector("#btn-rutina-desbloquear").addEventListener("click", function () {
        if (window.FMV_pedirPin) {
          window.FMV_pedirPin(function () {
            desbloqueadoTemporalmente = true;
            capaBloqueo.style.display = "none";
          });
        } else if (window.FMV_abrirPadres) {
          window.FMV_abrirPadres();
        }
      });
    }
    return capaBloqueo;
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
      return minutosAhora >= minIni || minutosAhora < minFin;
    }
  }

  function verificarBloqueoHorario() {
    if (desbloqueadoTemporalmente) return;
    var cfg = leerConfig();
    var capa = crearCapaBloqueo();
    var hoyDia = new Date().getDay();

    if (cfg.activo && cfg.dias.indexOf(hoyDia) !== -1 && estaEnHorario(cfg.horaInicio, cfg.horaFin)) {
      // Detener video si estuviera sonando
      if (window.FMV_pausarVideo) window.FMV_pausarVideo();
      capa.style.display = "flex";
      var t = capa.querySelector("#fmv-rutina-titulo");
      if (t) t.textContent = cfg.nombre || "Hora de Descansar";
    } else {
      capa.style.display = "none";
    }
  }

  setInterval(verificarBloqueoHorario, 20000);

  // Modal de Horarios para Padres
  window.FMV_abrirHorarios = function () {
    var cfg = leerConfig();
    var modalEl = document.createElement("div");
    modalEl.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;overflow:auto";

    var caja = document.createElement("div");
    caja.style.cssText = "background:#fff;border-radius:24px;padding:24px;width:100%;max-width:480px;box-shadow:0 12px 36px rgba(0,0,0,.3);font-family:inherit;color:#1d2b3a";

    var BTN_ESTILO = "padding:10px 18px;border:0;border-radius:10px;font-weight:800;cursor:pointer;font-family:inherit;font-size:14.5px;";

    caja.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">' +
      '<div style="display:flex;align-items:center;gap:8px">' +
      '<span style="font-size:26px">⏰</span>' +
      '<h2 style="margin:0;font-size:1.3rem">Horarios y Rutinas</h2>' +
      '</div>' +
      '<button type="button" data-cerrar style="border:0;background:#e2e8f0;color:#334155;border-radius:999px;padding:6px 14px;font-weight:800;cursor:pointer">Cerrar</button>' +
      '</div>' +
      '<p style="margin:0 0 16px;font-size:.88rem;opacity:.8;line-height:1.4">Configura franjas horarias automáticas para que la app se bloquee sola a la hora de dormir o hacer deberes.</p>' +

      '<div style="background:#f8fafc;padding:14px;border-radius:16px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center">' +
      '<div>' +
      '<div style="font-weight:800;font-size:.95rem">Bloqueo por Horario Automático</div>' +
      '<div style="font-size:.78rem;color:#64748b">Activar restricción automática</div>' +
      '</div>' +
      '<input type="checkbox" id="chk-hr-activo" ' + (cfg.activo ? 'checked' : '') + ' style="width:22px;height:22px;accent-color:#12a37f;cursor:pointer">' +
      '</div>' +

      '<div style="background:#f8fafc;padding:14px;border-radius:16px;margin-bottom:12px">' +
      '<label style="display:block;font-size:.8rem;font-weight:800;color:#64748b;margin-bottom:4px">Nombre de la Rutina:</label>' +
      '<input type="text" id="inp-hr-nombre" value="' + (cfg.nombre || "Hora de Dormir") + '" style="width:100%;box-sizing:border-box;padding:10px 14px;border:1px solid #cbd5e1;border-radius:10px;font-family:inherit;font-weight:700;margin-bottom:12px">' +

      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
      '<div>' +
      '<label style="display:block;font-size:.75rem;font-weight:800;color:#64748b;margin-bottom:4px">Bloquear desde:</label>' +
      '<input type="time" id="inp-hr-inicio" value="' + cfg.horaInicio + '" style="width:100%;box-sizing:border-box;padding:8px 12px;border:1px solid #cbd5e1;border-radius:8px;font-family:inherit;font-weight:700">' +
      '</div>' +
      '<div>' +
      '<label style="display:block;font-size:.75rem;font-weight:800;color:#64748b;margin-bottom:4px">Hasta las:</label>' +
      '<input type="time" id="inp-hr-fin" value="' + cfg.horaFin + '" style="width:100%;box-sizing:border-box;padding:8px 12px;border:1px solid #cbd5e1;border-radius:8px;font-family:inherit;font-weight:700">' +
      '</div>' +
      '</div>' +
      '</div>' +

      '<button type="button" id="btn-hr-guardar" style="' + BTN_ESTILO + ';background:#12a37f;color:#fff;width:100%;padding:14px;font-size:1rem">Guardar Horario</button>';

    modalEl.appendChild(caja);
    document.body.appendChild(modalEl);

    caja.querySelector("#btn-hr-guardar").addEventListener("click", function () {
      cfg.activo = caja.querySelector("#chk-hr-activo").checked;
      cfg.nombre = caja.querySelector("#inp-hr-nombre").value.trim() || "Hora de Dormir";
      cfg.horaInicio = caja.querySelector("#inp-hr-inicio").value || "20:00";
      cfg.horaFin = caja.querySelector("#inp-hr-fin").value || "07:00";
      desbloqueadoTemporalmente = false;
      guardarConfig(cfg);
      modalEl.remove();
    });

    caja.querySelector("[data-cerrar]").addEventListener("click", function () { modalEl.remove(); });
    modalEl.addEventListener("click", function (e) { if (e.target === modalEl) modalEl.remove(); });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", verificarBloqueoHorario);
  } else {
    verificarBloqueoHorario();
  }
})();
