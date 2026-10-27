/* Módulo de Modo Calma (Desaceleración Gradual y Ritual de Apagado Nocturno) */
(function () {
  'use strict';
  /* ---------- Verificación de Modo Calma Progresivo ---------- */
  function verificarModoCalma() {
    if (calmaCanceladaHoy) return;
    var cfg = leerCalma();
    if (!cfg.activo || !cfg.horaInicio) {
      if (estadoCalmaActual !== 1.0) aplicarVelocidadGlobal(1.0);
      ocultarPillCalma();
      detenerSonidoCalma();
      if (capaCalmaDormir) capaCalmaDormir.style.display = "none";
      return;
    }

    var d = new Date();
    var minutosAhora = d.getHours() * 60 + d.getMinutes();
    var pIni = cfg.horaInicio.split(":");
    var minInicio = parseInt(pIni[0], 10) * 60 + parseInt(pIni[1] || 0, 10);

    var diff = minutosAhora - minInicio;
    // Si cruza la medianoche (ej: inicio 23:50 y son las 00:05)
    if (diff < -720) diff += 1440;

    if (diff >= 0 && diff <= 300) { // Dentro de las 5 horas siguientes al inicio
      if (diff < 10) {
        // Minutos 0 a 10: 0.75x
        aplicarVelocidadGlobal(0.75);
        mostrarPillCalma("🌙 Modo Calma (0.75x)");
        detenerSonidoCalma();
        if (capaCalmaDormir) capaCalmaDormir.style.display = "none";
      } else if (diff < 15) {
        // Minutos 10 a 15: 0.50x
        aplicarVelocidadGlobal(0.50);
        mostrarPillCalma("🌙 Modo Calma (0.50x)");
        detenerSonidoCalma();
        if (capaCalmaDormir) capaCalmaDormir.style.display = "none";
      } else if (diff < 17) {
        // Minutos 15 a 17: 0.25x
        aplicarVelocidadGlobal(0.25);
        mostrarPillCalma("🌙 Modo Calma (0.25x)");
        detenerSonidoCalma();
        if (capaCalmaDormir) capaCalmaDormir.style.display = "none";
      } else {
        // Minuto 17 en adelante: Bloqueo de sueño + Nana relajante
        aplicarVelocidadGlobal(0.25);
        if (window.FMV_pausarVideo) window.FMV_pausarVideo();
        var c = crearPantallaCalma();
        c.style.display = "flex";
        ocultarPillCalma();
        iniciarSonidoCalma();
      }
    } else {
      if (estadoCalmaActual !== 1.0) aplicarVelocidadGlobal(1.0);
      ocultarPillCalma();
      detenerSonidoCalma();
      if (capaCalmaDormir) capaCalmaDormir.style.display = "none";
    }
  }

  /* ---------- Verificación de Rutina Clásica ---------- */
  function estaEnHorario(inicio, fin) {
    if (!inicio || !fin) return false;
    var d = new Date();
    var minutosAhora = d.getHours() * 60 + d.getMinutes();
    var pIni = inicio.split(":"), pFin = fin.split(":");
    var minIni = parseInt(pIni[0], 10) * 60 + parseInt(pIni[1] || 0, 10);
    var minFin = parseInt(pFin[0], 10) * 60 + parseInt(pFin[1] || 0, 10);
    if (minIni < minFin) return minutosAhora >= minIni && minutosAhora < minFin;
    return minutosAhora >= minIni || minutosAhora < minFin;
  }

  function crearCapaBloqueoRutina() {
    if (capaBloqueoRutina && document.body.contains(capaBloqueoRutina)) return capaBloqueoRutina;
    capaBloqueoRutina = document.getElementById("fmv-bloqueo-rutina");
    if (!capaBloqueoRutina) {
      capaBloqueoRutina = document.createElement("div");
      capaBloqueoRutina.id = "fmv-bloqueo-rutina";
      capaBloqueoRutina.style.cssText =
        "position:fixed;inset:0;background:#0f172a;color:#fff;z-index:99998;display:none;flex-direction:column;" +
        "align-items:center;justify-content:center;padding:24px;text-align:center;font-family:inherit";

      capaBloqueoRutina.innerHTML =
        '<div style="max-width:440px;background:#1e293b;padding:32px 24px;border-radius:28px;box-shadow:0 14px 40px rgba(0,0,0,.6)">' +
        '<div style="font-size:64px;margin-bottom:12px">⏰</div>' +
        '<h2 id="fmv-rutina-titulo" style="margin:0 0 10px;font-size:1.6rem;color:#f8fafc">Hora de Descansar</h2>' +
        '<p id="fmv-rutina-desc" style="margin:0 0 24px;font-size:.95rem;color:#94a3b8;line-height:1.5">' +
        'El horario configurado para este momento es para descansar o hacer deberes. ¡Hasta pronto!' +
        '</p>' +
        '<button type="button" id="btn-rutina-desbloquear" style="border:0;background:#12a37f;color:#fff;border-radius:12px;padding:12px 22px;font-weight:800;font-size:15px;cursor:pointer">' +
        '🔒 Desbloquear (Padres)' +
        '</button>' +
        '</div>';

      document.body.appendChild(capaBloqueoRutina);

      capaBloqueoRutina.querySelector("#btn-rutina-desbloquear").addEventListener("click", function () {
        if (window.FMV_pedirPin) {
          window.FMV_pedirPin(function () {
            rutinaDesbloqueadaTemporal = true;
            capaBloqueoRutina.style.display = "none";
          });
        }
      });
    }
    return capaBloqueoRutina;
  }

  function verificarBloqueoRutina() {
    if (rutinaDesbloqueadaTemporal) return;
    var cfg = leerRutina();
    var capa = crearCapaBloqueoRutina();
    var hoyDia = new Date().getDay();

    if (cfg.activo && cfg.dias.indexOf(hoyDia) !== -1 && estaEnHorario(cfg.horaInicio, cfg.horaFin)) {
      if (window.FMV_pausarVideo) window.FMV_pausarVideo();
      capa.style.display = "flex";
      var t = capa.querySelector("#fmv-rutina-titulo");
      if (t) t.textContent = cfg.nombre || "Hora de Descansar";
    } else {
      capa.style.display = "none";
    }
  }

  function verificarTodo() {
    verificarModoCalma();
    verificarBloqueoRutina();
  }

  setInterval(verificarTodo, 1500);

  /* ---------- Modal: Modo Calma y Apagado Progresivo ---------- */
  window.FMV_abrirModoCalma = function () {
    var cfg = leerCalma();
    var modalEl = document.createElement("div");
    modalEl.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;overflow:auto";

    var caja = document.createElement("div");
    caja.style.cssText = "background:#fff;border-radius:24px;padding:24px;width:100%;max-width:500px;box-shadow:0 12px 36px rgba(0,0,0,.3);font-family:inherit;color:#1d2b3a";

    var BTN_ESTILO = "padding:10px 18px;border:0;border-radius:10px;font-weight:800;cursor:pointer;font-family:inherit;font-size:14.5px;";

    caja.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">' +
      '<div style="display:flex;align-items:center;gap:8px">' +
      '<span style="font-size:26px">🌙</span>' +
      '<h2 style="margin:0;font-size:1.25rem">Modo Calma y Apagado</h2>' +
      '</div>' +
      '<button type="button" data-cerrar style="border:0;background:#e2e8f0;color:#334155;border-radius:999px;padding:6px 14px;font-weight:800;cursor:pointer">Cerrar</button>' +
      '</div>' +
      '<p style="margin:0 0 14px;font-size:.88rem;opacity:.8;line-height:1.4">Desacelera automáticamente todos los videos de la app para relajar a los niños antes de dormir hasta apagarse suavemente.</p>' +

      '<div style="background:#f8fafc;padding:14px;border-radius:16px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center">' +
      '<div>' +
      '<div style="font-weight:800;font-size:.95rem">Activar Modo Calma</div>' +
      '<div style="font-size:.78rem;color:#64748b">Ritual de apagado progresivo</div>' +
      '</div>' +
      '<input type="checkbox" id="chk-calma-activo" ' + (cfg.activo ? 'checked' : '') + ' style="width:22px;height:22px;accent-color:#12a37f;cursor:pointer">' +
      '</div>' +

      '<div style="background:#f8fafc;padding:14px;border-radius:16px;margin-bottom:14px">' +
      '<label style="display:block;font-size:.8rem;font-weight:800;color:#64748b;margin-bottom:6px">Hora de inicio del ritual:</label>' +
      '<input type="time" id="inp-calma-inicio" value="' + (cfg.horaInicio || "20:00") + '" style="width:100%;box-sizing:border-box;padding:10px 14px;border:1px solid #cbd5e1;border-radius:10px;font-family:inherit;font-weight:700;font-size:16px;margin-bottom:12px">' +

      '<div style="background:#eef2ff;padding:12px;border-radius:12px;font-size:.82rem;color:#3730a3;line-height:1.4">' +
      '<div style="font-weight:800;margin-bottom:4px">🌟 Etapas automáticas (17 minutos):</div>' +
      '<div>• <b>Minutos 0 a 10:</b> Velocidad <b>0.75x</b> (baja revoluciones).</div>' +
      '<div>• <b>Minutos 10 a 15:</b> Velocidad <b>0.50x</b> (estado de calma).</div>' +
      '<div>• <b>Minutos 15 a 17:</b> Velocidad <b>0.25x</b> (pre-sueño).</div>' +
      '<div>• <b>Minuto 17:</b> Bloqueo de pantalla nocturna con suave melodía relajante.</div>' +
      '</div>' +
      '</div>' +

      '<div style="display:flex;gap:10px;margin-top:14px">' +
      '<button type="button" id="btn-calma-guardar" style="' + BTN_ESTILO + ';background:#12a37f;color:#fff;flex:1;padding:12px">Guardar Horario</button>' +
      '<button type="button" id="btn-calma-probar" style="' + BTN_ESTILO + ';background:#6366f1;color:#fff;padding:12px" title="Probar ahora la desaceleración y sonido">▶ Probar</button>' +
      '</div>';

    modalEl.appendChild(caja);
    document.body.appendChild(modalEl);

    caja.querySelector("#btn-calma-guardar").addEventListener("click", function () {
      cfg.activo = caja.querySelector("#chk-calma-activo").checked;
      cfg.horaInicio = caja.querySelector("#inp-calma-inicio").value || "20:00";
      calmaCanceladaHoy = false;
      guardarCalma(cfg);
      modalEl.remove();
    });

    caja.querySelector("#btn-calma-probar").addEventListener("click", function () {
      modalEl.remove();
      calmaCanceladaHoy = false;
      aplicarVelocidadGlobal(0.75);
      mostrarPillCalma("🌙 Modo Calma Activo (0.75x)");
      setTimeout(function () {
        aplicarVelocidadGlobal(0.50);
        mostrarPillCalma("🌙 Modo Calma Activo (0.50x)");
      }, 5000);
      setTimeout(function () {
        aplicarVelocidadGlobal(0.25);
        mostrarPillCalma("🌙 Modo Calma Activo (0.25x)");
      }, 10000);
      setTimeout(function () {
        if (window.FMV_pausarVideo) window.FMV_pausarVideo();
        var c = crearPantallaCalma();
        c.style.display = "flex";
        ocultarPillCalma();
        iniciarSonidoCalma();
      }, 15000);
    });

    caja.querySelector("[data-cerrar]").addEventListener("click", function () { modalEl.remove(); });
    modalEl.addEventListener("click", function (e) { if (e.target === modalEl) modalEl.remove(); });
  };


})();
