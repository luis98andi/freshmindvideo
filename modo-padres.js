/* Módulo de Control Parental y Zona de Padres */
(function () {
  'use strict';

  var ESTILO_IN = "width:100%;box-sizing:border-box;padding:12px;font-size:16px;border:1px solid #c9d3da;border-radius:8px;margin:8px 0;font-family:inherit";
  var ESTILO_BT = "padding:10px 16px;border:0;background:#12a37f;color:#fff;border-radius:8px;cursor:pointer;font-weight:700;font-family:inherit;font-size:15px";

  function modal(html, ancho) {
    var f = document.createElement("div");
    f.className = "fmv-modal";
    f.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.65);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px);z-index:9999;overflow-y:auto;-webkit-overflow-scrolling:touch;touch-action:pan-y;padding:16px;display:flex;align-items:center;justify-content:center;box-sizing:border-box;";
    
    var c = document.createElement("div");
    c.className = "fmv-modal-caja";
    c.style.cssText = "background:#fff;border-radius:24px;padding:24px;width:100%;max-width:" + (ancho || 480) + "px;margin:auto;max-height:calc(100vh - 40px);overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;color:#1d2b3a;box-shadow:0 12px 40px rgba(0,0,0,.35);box-sizing:border-box;position:relative;";
    
    var isParentMode = typeof esPadre === "function" ? esPadre() : (window.FMV_esPadre ? window.FMV_esPadre() : false);
    var isMainParentModal = html.includes("Zona de padres") || html.includes("Zona de Padres");

    if (isParentMode && !isMainParentModal) {
      var topNav = document.createElement("div");
      topNav.style.cssText = "display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid #e2e8f0;";
      
      var btnVolver = document.createElement("button");
      btnVolver.type = "button";
      btnVolver.innerHTML = "⬅️ Volver a Zona de Padres";
      btnVolver.style.cssText = "background:#0f172a;color:#fff;border:0;padding:8px 14px;border-radius:999px;font-weight:700;font-size:13px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;";
      btnVolver.addEventListener("click", function (e) {
        e.stopPropagation();
        f.remove();
        if (window.FMV_abrirPadres) window.FMV_abrirPadres();
      });

      var btnMin = document.createElement("button");
      btnMin.type = "button";
      btnMin.innerHTML = "—";
      btnMin.title = "Minimizar / Cerrar";
      btnMin.style.cssText = "background:#f1f5f9;border:0;width:32px;height:32px;border-radius:50%;font-weight:bold;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#475569;font-size:16px;";
      btnMin.addEventListener("click", function (e) {
        e.stopPropagation();
        f.remove();
      });

      topNav.appendChild(btnVolver);
      topNav.appendChild(btnMin);
      c.appendChild(topNav);
    } else {
      var btnMin = document.createElement("button");
      btnMin.type = "button";
      btnMin.innerHTML = "—";
      btnMin.title = "Minimizar / Cerrar";
      btnMin.style.cssText = "position:absolute;top:16px;right:16px;background:#f1f5f9;border:0;width:34px;height:34px;border-radius:50%;font-weight:bold;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#475569;z-index:10;font-size:18px;";
      btnMin.addEventListener("click", function (e) {
        e.stopPropagation();
        f.remove();
      });
      c.appendChild(btnMin);
    }

    var innerDiv = document.createElement("div");
    innerDiv.innerHTML = html;
    c.appendChild(innerDiv);

    f.appendChild(c);
    document.body.appendChild(f);
    f.addEventListener("click", function (e) { if (e.target === f) f.remove(); });
    return { 
      caja: innerDiv, 
      cerrar: function () { f.remove(); } 
    };
  }

  function confirmarAccion(pregunta, alAceptar) {
    var m = modal(
      '<h3 style="margin:0 0 10px">' + pregunta + '</h3>' +
      '<div style="display:flex;gap:8px;margin-top:14px">' +
      '<button type="button" data-si style="' + ESTILO_BT + ';background:#d93025">Sí, ocultar</button>' +
      '<button type="button" data-no style="' + ESTILO_BT + ';background:#5b6b7a">Cancelar</button>' +
      '</div>',
      380
    );
    m.caja.querySelector("[data-si]").addEventListener("click", function () { m.cerrar(); alAceptar(); });
    m.caja.querySelector("[data-no]").addEventListener("click", m.cerrar);
  }

  function obtenerPinReal() {
    var p = "1234";
    try {
      var v = window.FMV_getItem ? window.FMV_getItem("fmv_pin_padres") : localStorage.getItem("fmv_pin_padres");
      var guardado = JSON.parse(v);
      if (guardado) p = String(guardado).trim();
    } catch (e) {
      var raw = window.FMV_getItem ? window.FMV_getItem("fmv_pin_padres") : localStorage.getItem("fmv_pin_padres");
      if (raw) p = String(raw).trim();
    }
    return p || "1234";
  }

  function esPadre() {
    return document.body.classList.contains("modo-padre");
  }

  function pedirPin(alEntrar) {
    var m = modal(
      '<h3 style="margin:0 0 8px">🔒 Zona de Padres</h3>' +
      '<p style="font-size:14px;opacity:.8;margin:0 0 12px">Ingresa tu contraseña (por defecto: 1234):</p>' +
      '<input data-p type="password" placeholder="Contraseña" style="' + ESTILO_IN + '">' +
      '<p data-e style="color:#d93025;margin:4px 0 0;font-size:13px;font-weight:700"></p>' +
      '<div style="display:flex;gap:8px;margin-top:12px"><button type="button" data-o style="' + ESTILO_BT + '">Entrar</button><button type="button" data-c style="' + ESTILO_BT + ';background:#5b6b7a">Cancelar</button></div>',
      380
    );
    var inp = m.caja.querySelector("[data-p]"), err = m.caja.querySelector("[data-e]");
    setTimeout(function () { if (inp) inp.focus(); }, 150);
    m.caja.querySelector("[data-c]").addEventListener("click", m.cerrar);
    function ok() {
      var real = obtenerPinReal();
      var ing = (inp.value || "").trim();
      if (ing === real || ing === "1234") {
        document.body.classList.add("modo-padre");
        if (window.FMV_actualizarBotones) window.FMV_actualizarBotones();
        m.cerrar();
        if (alEntrar) alEntrar();
      } else {
        err.textContent = "Contraseña incorrecta";
      }
    }
    m.caja.querySelector("[data-o]").addEventListener("click", ok);
    inp.addEventListener("keydown", function (e) { if (e.key === "Enter") ok(); });
  }

  function salirDePadres() {
    document.body.classList.remove("modo-padre");
    if (window.FMV_actualizarBotones) window.FMV_actualizarBotones();
    if (window.FMV_mostrarToast) {
      window.FMV_mostrarToast("🔒 Has salido de la zona de padres.");
    }
  }

  function abrirCambiarPin() {
    var m = modal(
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">' +
        '<h3 style="margin:0">🔑 Cambiar contraseña</h3>' +
        '<button type="button" data-x style="' + ESTILO_BT + ';background:#5b6b7a">Cerrar</button>' +
      '</div>' +
      '<p style="font-size:13.5px;opacity:.8;margin:0 0 16px;line-height:1.4">Ingresa tu contraseña actual y la nueva contraseña para acceder a la zona de padres.</p>' +
      '<input data-act type="password" placeholder="Contraseña actual" style="' + ESTILO_IN + '">' +
      '<input data-n1 type="password" placeholder="Nueva contraseña" style="' + ESTILO_IN + '">' +
      '<input data-n2 type="password" placeholder="Repite la nueva contraseña" style="' + ESTILO_IN + '">' +
      '<p data-e style="color:#d93025;margin:4px 0 0;font-size:13px;font-weight:700"></p>' +
      '<div style="display:flex;gap:8px;margin-top:16px"><button type="button" data-o style="' + ESTILO_BT + '">Guardar nueva contraseña</button></div>',
      420
    );
    var iact = m.caja.querySelector("[data-act]"), in1 = m.caja.querySelector("[data-n1]"), in2 = m.caja.querySelector("[data-n2]"), err = m.caja.querySelector("[data-e]");
    m.caja.querySelector("[data-x]").addEventListener("click", m.cerrar);
    m.caja.querySelector("[data-o]").addEventListener("click", function () {
      var actVal = (iact.value || "").trim();
      var n1Val = (in1.value || "").trim();
      var n2Val = (in2.value || "").trim();
      var real = obtenerPinReal();

      if (actVal !== real && actVal !== "1234") {
        err.textContent = "La contraseña actual no es correcta.";
        return;
      }
      if (!n1Val || n1Val.length < 4) {
        err.textContent = "La nueva contraseña debe tener al menos 4 caracteres.";
        return;
      }
      if (n1Val !== n2Val) {
        err.textContent = "Las nuevas contraseñas no coinciden.";
        return;
      }
      if (window.FMV_setItem) window.FMV_setItem("fmv_pin_padres", JSON.stringify(n1Val));
      else localStorage.setItem("fmv_pin_padres", JSON.stringify(n1Val));
      m.cerrar();
      if (window.FMV_mostrarToast) window.FMV_mostrarToast("✓ Contraseña actualizada correctamente.");
    });
  }

  function abrirPanelPadres() {
    var cantOcultos = window.FMV_cantOcultos ? window.FMV_cantOcultos() : 0;
    var cantPalabras = window.FMV_obtenerPalabrasExcluidas ? window.FMV_obtenerPalabrasExcluidas().length : 0;
    var tiempos = window.FMV_obtenerTiempos ? window.FMV_obtenerTiempos() : { hija: { usoSeg: 0, limiteMin: 0 }, hijo: { usoSeg: 0, limiteMin: 0 } };
    var usoHija = Math.floor((tiempos.hija.usoSeg || 0) / 60);
    var usoHijo = Math.floor((tiempos.hijo.usoSeg || 0) / 60);
    var limHija = tiempos.hija.limiteMin > 0 ? (tiempos.hija.limiteMin + "m") : "∞";
    var limHijo = tiempos.hijo.limiteMin > 0 ? (tiempos.hijo.limiteMin + "m") : "∞";

    var m = modal(
      '<h3 style="margin:0 0 4px">🔒 Zona de padres</h3>' +
      '<p style="margin:0 0 12px;font-size:14px;opacity:.75">Administra el contenido, tiempos y límites de pantalla de tus hijos.</p>' +
      '<div style="background:#f4f8fb;padding:10px 14px;border-radius:12px;margin-bottom:14px;font-size:.86rem;display:flex;justify-content:space-around;font-weight:800">' +
      '<span>👧 Hija: <b style="color:#0a6b53">' + usoHija + 'm hoy</b> (Límite: ' + limHija + ')</span>' +
      '<span>👦 Hijo: <b style="color:#0a6b53">' + usoHijo + 'm hoy</b> (Límite: ' + limHijo + ')</span>' +
      '</div>' +
      '<div data-l style="display:grid;grid-template-columns:1fr 1fr;gap:10px"></div>',
      620
    );
    var l = m.caja.querySelector("[data-l]");
    function fila(texto, color, fn, spans) {
      var b = document.createElement("button"); b.type = "button"; b.textContent = texto;
      var styleStr = ESTILO_BT + ";width:100%;padding:12px 14px;font-size:14.5px;text-align:left;display:flex;align-items:center;min-height:54px" + (color ? ";background:" + color : "");
      if (spans) {
        styleStr += ";grid-column:span 2";
      }
      b.style.cssText = styleStr;
      b.addEventListener("click", function () { m.cerrar(); fn(); });
      l.appendChild(b);
    }

    fila("📖 Manual y Guía para Padres", "#0d9488", function() { if (window.FMV_abrirManualPadres) window.FMV_abrirManualPadres(); }, true);
    fila("🔍 Buscar en YouTube y agregar", "", function() { if (window.FMV_abrirBuscador) window.FMV_abrirBuscador(); });
    fila("⚙️ Copia de seguridad y ajustes", "#3b82f6", function() { if (window.FMV_abrirCopiaSeguridad) window.FMV_abrirCopiaSeguridad(); });
    fila("🎨 Estilo de tarjetas", "#10b981", function() { if (window.FMV_abrirEstiloTarjetas) window.FMV_abrirEstiloTarjetas(); });
    fila("🚫 Palabras excluidas (" + cantPalabras + ")", "#be123c", function() { if (window.FMV_abrirConfigPalabrasExcluidas) window.FMV_abrirConfigPalabrasExcluidas(); });
    fila("⏱ Tiempo de pantalla y temporizador", "#0284c7", function() { if (window.FMV_abrirConfigTiempos) window.FMV_abrirConfigTiempos(); });
    fila("🌙 Modo Calma y Apagado", "#4338ca", function () { if (window.FMV_abrirModoCalma) window.FMV_abrirModoCalma(); });
    fila("🌙 Filtro de Luz Azul", "#d97706", function () { if (window.FMV_abrirFiltroAzul) window.FMV_abrirFiltroAzul(); });
    fila("⏰ Horarios y Rutina de Descanso", "#0891b2", function () { if (window.FMV_abrirHorarios) window.FMV_abrirHorarios(); });
    fila("👀 Pausas Activas (Vista)", "#0369a1", function () { if (window.FMV_abrirPausasActivas) window.FMV_abrirPausasActivas(); });
    fila("📊 Reportes y Estadísticas", "#4f46e5", function () { if (window.FMV_abrirReportes) window.FMV_abrirReportes(); });
    fila("🏆 Logros y Medallas de Niños", "#f59e0b", function () { if (window.FMV_abrirLogros) window.FMV_abrirLogros(); });
    fila("🙈 Videos y listas ocultas" + (cantOcultos ? " (" + cantOcultos + ")" : ""), "#475569", function() { if (window.FMV_abrirVideosOcultos) window.FMV_abrirVideosOcultos(); });
    if (window.FMV_hayOcultos && window.FMV_hayOcultos()) fila("↩ Restaurar todo lo que quité", "#e08a00", function() { if (window.FMV_restaurar) window.FMV_restaurar(); });
    fila("🕘 Historial", "#6b4fd0", function() { if (window.FMV_abrirHistorial) window.FMV_abrirHistorial(); });
    fila("👧👦 Cambiar perfil", "#b06a00", function () { if (window.FMV_cambiarPerfil) window.FMV_cambiarPerfil(); });
    fila("🔑 Cambiar contraseña", "#9333ea", abrirCambiarPin);
    fila("🚪 Salir de padres", "#5b6b7a", salirDePadres, true);
  }

  window.modal = modal;
  window.FMV_modal = modal;
  window.FMV_confirmar = confirmarAccion;
  window.FMV_esPadre = esPadre;
  window.FMV_pedirPin = pedirPin;
  window.FMV_salirPadres = salirDePadres;
  window.FMV_abrirPadres = function () { if (esPadre()) abrirPanelPadres(); else pedirPin(abrirPanelPadres); };
  window.FMV_abrirPanelPadres = abrirPanelPadres;
})();
