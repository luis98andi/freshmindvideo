/* FreshMindVideo - Pausas Activas y Descanso Visual
   Muestra un recordatorio amigable cada 20-30 minutos de reproducción continua para cuidar la vista de los niños. */
(function () {
  var LS_KEY = "fmv_pausas_activas";

  var configPorDefecto = {
    activo: true,
    cadaMinutos: 25, // cada cuántos minutos aparece
    duracionSeg: 20  // segundos de la pausa (regla 20-20-20)
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
  }

  var segundosViendoContinuo = 0;
  var pausaEnCurso = false;

  function mostrarPausaVisual() {
    if (pausaEnCurso) return;
    var cfg = leerConfig();
    if (!cfg.activo) return;

    pausaEnCurso = true;
    segundosViendoContinuo = 0;

    // Pausar video si está reproduciendo
    if (window.FMV_pausarVideo) window.FMV_pausarVideo();

    var overlay = document.createElement("div");
    overlay.id = "fmv-pausa-activa-overlay";
    overlay.style.cssText =
      "position:fixed;inset:0;background:rgba(15,23,42,.92);color:#fff;z-index:99999;display:flex;flex-direction:column;" +
      "align-items:center;justify-content:center;padding:24px;text-align:center;font-family:inherit;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)";

    var segRestantes = cfg.duracionSeg || 20;

    overlay.innerHTML =
      '<div style="max-width:440px;background:#1e293b;padding:32px 24px;border-radius:28px;box-shadow:0 16px 40px rgba(0,0,0,.5);border:2px solid #38bdf8">' +
      '<div style="font-size:56px;margin-bottom:12px;animation:fmv-pulso 1.5s infinite">👁️✨</div>' +
      '<h2 style="margin:0 0 10px;font-size:1.55rem;color:#38bdf8">¡Pausa para tus Ojitos!</h2>' +
      '<p style="margin:0 0 18px;font-size:1rem;color:#cbd5e1;line-height:1.5">' +
      'Mira lejos por la ventana, parpadea varias veces y estira tus brazos.' +
      '</p>' +
      '<div style="background:#0f172a;border-radius:999px;display:inline-flex;align-items:center;gap:8px;padding:8px 24px;margin-bottom:20px;border:1.5px solid #38bdf8">' +
      '<span style="font-size:20px">⏳</span>' +
      '<span id="fmv-pausa-seg" style="font-size:1.3rem;font-weight:800;color:#38bdf8;font-variant-numeric:tabular-nums">' + segRestantes + 's</span>' +
      '</div>' +
      '<br>' +
      '<button type="button" id="btn-pausa-listo" style="border:0;background:#10b981;color:#fff;border-radius:12px;padding:12px 24px;font-weight:800;font-size:15px;cursor:pointer">' +
      '¡Listo, ojitos descansados! 👍' +
      '</button>' +
      '</div>';

    document.body.appendChild(overlay);

    var txtSeg = overlay.querySelector("#fmv-pausa-seg");
    var btnListo = overlay.querySelector("#btn-pausa-listo");

    var timer = setInterval(function () {
      segRestantes--;
      if (txtSeg) txtSeg.textContent = segRestantes + "s";
      if (segRestantes <= 0) {
        clearInterval(timer);
        cerrarPausa();
      }
    }, 1000);

    function cerrarPausa() {
      clearInterval(timer);
      if (overlay && overlay.parentNode) overlay.remove();
      pausaEnCurso = false;
      if (window.FMV_reanudarVideo) window.FMV_reanudarVideo();
    }

    btnListo.addEventListener("click", cerrarPausa);
  }

  // Monitor continuo de tiempo viendo
  setInterval(function () {
    var estaViendo = document.body.classList.contains("viendo");
    var esPadre = document.body.classList.contains("padre");
    if (estaViendo && !esPadre && !pausaEnCurso) {
      segundosViendoContinuo += 1;
      var cfg = leerConfig();
      if (cfg.activo && segundosViendoContinuo >= (cfg.cadaMinutos * 60)) {
        mostrarPausaVisual();
      }
    } else if (!estaViendo) {
      segundosViendoContinuo = Math.max(0, segundosViendoContinuo - 1);
    }
  }, 1000);

  // Modal para Padres
  window.FMV_abrirPausasActivas = function () {
    var cfg = leerConfig();
    var modalEl = document.createElement("div");
    modalEl.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;overflow:auto";

    var caja = document.createElement("div");
    caja.style.cssText = "background:#fff;border-radius:24px;padding:24px;width:100%;max-width:480px;box-shadow:0 12px 36px rgba(0,0,0,.3);font-family:inherit;color:#1d2b3a";

    var BTN_ESTILO = "padding:10px 18px;border:0;border-radius:10px;font-weight:800;cursor:pointer;font-family:inherit;font-size:14.5px;";

    caja.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">' +
      '<div style="display:flex;align-items:center;gap:8px">' +
      '<span style="font-size:26px">👀</span>' +
      '<h2 style="margin:0;font-size:1.3rem">Pausas Activas (Vista)</h2>' +
      '</div>' +
      '<button type="button" data-cerrar style="border:0;background:#e2e8f0;color:#334155;border-radius:999px;padding:6px 14px;font-weight:800;cursor:pointer">Cerrar</button>' +
      '</div>' +
      '<p style="margin:0 0 16px;font-size:.88rem;opacity:.8;line-height:1.4">Protege la visión de tus hijos mostrando una pausa breve cada cierto tiempo para parpadear y descansar los ojos (Regla 20-20-20 recomendada por oftalmólogos).</p>' +

      '<div style="background:#f8fafc;padding:14px;border-radius:16px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center">' +
      '<div>' +
      '<div style="font-weight:800;font-size:.95rem">Activar Pausas Activas</div>' +
      '<div style="font-size:.78rem;color:#64748b">Recordatorio de cuidado visual</div>' +
      '</div>' +
      '<input type="checkbox" id="chk-pa-activo" ' + (cfg.activo ? 'checked' : '') + ' style="width:22px;height:22px;accent-color:#12a37f;cursor:pointer">' +
      '</div>' +

      '<div style="background:#f8fafc;padding:14px;border-radius:16px;margin-bottom:16px">' +
      '<label style="display:block;font-size:.8rem;font-weight:800;color:#64748b;margin-bottom:6px">Frecuencia del Recordatorio:</label>' +
      '<select id="sel-pa-min" style="width:100%;padding:10px 14px;border:1px solid #cbd5e1;border-radius:10px;font-family:inherit;font-weight:700;font-size:15px">' +
      '<option value="15" ' + (cfg.cadaMinutos === 15 ? 'selected' : '') + '>Cada 15 minutos</option>' +
      '<option value="20" ' + (cfg.cadaMinutos === 20 ? 'selected' : '') + '>Cada 20 minutos (Recomendado)</option>' +
      '<option value="25" ' + (cfg.cadaMinutos === 25 ? 'selected' : '') + '>Cada 25 minutos</option>' +
      '<option value="30" ' + (cfg.cadaMinutos === 30 ? 'selected' : '') + '>Cada 30 minutos</option>' +
      '</select>' +
      '</div>' +

      '<button type="button" id="btn-pa-guardar" style="' + BTN_ESTILO + ';background:#12a37f;color:#fff;width:100%;padding:14px;font-size:1rem">Guardar Ajustes</button>';

    modalEl.appendChild(caja);
    document.body.appendChild(modalEl);

    caja.querySelector("#btn-pa-guardar").addEventListener("click", function () {
      cfg.activo = caja.querySelector("#chk-pa-activo").checked;
      cfg.cadaMinutos = parseInt(caja.querySelector("#sel-pa-min").value, 10);
      guardarConfig(cfg);
      modalEl.remove();
    });

    caja.querySelector("[data-cerrar]").addEventListener("click", function () { modalEl.remove(); });
    modalEl.addEventListener("click", function (e) { if (e.target === modalEl) modalEl.remove(); });
  };
})();
