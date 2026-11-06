/* FreshMindVideo - Gamificación y Logros Infantiles
   Otorga medallas y stickers virtuales a los niños por buenos hábitos de visualización. */
(function () {
  var LS_LOGROS = "fmv_logros_v1";

  var DEFINICION_LOGROS = [
    {
      id: "primer_vuelo",
      titulo: "Primer Vuelo",
      desc: "¡Viste tu primer video en FreshMindVideo!",
      icono: "#sticker-estrella",
      emoji: "⭐",
      color: "#10b981",
      condicion: function (s) { return (s.videosVistos || 0) >= 1; }
    },
    {
      id: "explorador_5",
      titulo: "Super Explorador",
      desc: "Has descubierto 5 videos geniales.",
      icono: "#sticker-cohete",
      emoji: "🚀",
      color: "#3b82f6",
      condicion: function (s) { return (s.videosVistos || 0) >= 5; }
    },
    {
      id: "mente_curiosa",
      titulo: "Mente Curiosa",
      desc: "Exploraste 3 canales diferentes de aprendizaje.",
      icono: "#sticker-buho",
      emoji: "🦉",
      color: "#8b5cf6",
      condicion: function (s) { return (s.canalesExplorados && s.canalesExplorados.length >= 3); }
    },
    {
      id: "sol_manana",
      titulo: "Sol de Mañana",
      desc: "Aprendiste algo nuevo por la mañana.",
      icono: "#sticker-sol",
      emoji: "☀️",
      color: "#eab308",
      condicion: function (s) { return !!s.vioDeManana; }
    },
    {
      id: "campeon_tiempo",
      titulo: "Campeón del Tiempo",
      desc: "Cumpliste con tu límite de tiempo saludablemente.",
      icono: "#sticker-reloj",
      emoji: "⏰",
      color: "#f97316",
      condicion: function (s) { return (s.diasBuenTiempo || 0) >= 1; }
    },
    {
      id: "super_artista",
      titulo: "Mente Creativa",
      desc: "Exploraste contenidos de arte, música o ciencia.",
      icono: "#sticker-arte",
      emoji: "🎨",
      color: "#ec4899",
      condicion: function (s) { return (s.videosEducativos || 0) >= 2; }
    },
    {
      id: "gran_campeon",
      titulo: "Gran Campeón",
      desc: "¡Desbloqueaste casi todas las medallas de FreshMindVideo!",
      icono: "#sticker-trofeo",
      emoji: "🏆",
      color: "#f59e0b",
      condicion: function (s) { return (s.desbloqueados && Object.keys(s.desbloqueados).length >= 5); }
    }
  ];

  function leerLogros() {
    try {
      var d = JSON.parse(localStorage.getItem(LS_LOGROS));
      if (d && typeof d === "object") return d;
    } catch (e) {}
    return {
      videosVistos: 0,
      videosEducativos: 0,
      canalesExplorados: [],
      diasBuenTiempo: 0,
      vioDeManana: false,
      desbloqueados: {} // id -> timestamp
    };
  }

  function guardarLogros(d) {
    try { localStorage.setItem(LS_LOGROS, JSON.stringify(d)); } catch (e) {}
  }

  // Notificación de logro desbloqueado
  function notificarLogro(logro) {
    var toast = document.createElement("div");
    toast.className = "fmv-toast-logro";
    toast.style.cssText =
      "position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(100px);" +
      "background:#fff;color:#1d2b3a;padding:12px 18px;border-radius:999px;box-shadow:0 8px 30px rgba(0,0,0,.25);" +
      "display:flex;align-items:center;gap:12px;z-index:99999;font-family:inherit;font-size:15px;font-weight:800;" +
      "border:2.5px solid " + logro.color + ";transition:transform .4s cubic-bezier(.175,.885,.32,1.275),opacity .3s;opacity:0";

    toast.innerHTML =
      '<span style="font-size:28px">' + logro.emoji + '</span>' +
      '<div>' +
      '<div style="font-size:11px;text-transform:uppercase;letter-spacing:.6px;color:' + logro.color + '">¡Nuevo Trofeo Desbloqueado!</div>' +
      '<div style="font-size:15px">' + logro.titulo + '</div>' +
      '</div>';

    document.body.appendChild(toast);
    requestAnimationFrame(function () {
      toast.style.opacity = "1";
      toast.style.transform = "translateX(-50%) translateY(0)";
    });

    setTimeout(function () {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(-50%) translateY(60px)";
      setTimeout(function () { toast.remove(); }, 400);
    }, 4500);
  }

  function verificarLogros() {
    var s = leerLogros();
    var huboNuevos = false;
    DEFINICION_LOGROS.forEach(function (logro) {
      if (!s.desbloqueados[logro.id] && logro.condicion(s)) {
        s.desbloqueados[logro.id] = Date.now();
        huboNuevos = true;
        notificarLogro(logro);
      }
    });
    if (huboNuevos) guardarLogros(s);
  }

  window.FMV_registrarEventoLogro = function (tipo, datos) {
    var s = leerLogros();
    var ahora = new Date();
    if (tipo === "video_visto") {
      s.videosVistos = (s.videosVistos || 0) + 1;
      if (ahora.getHours() >= 6 && ahora.getHours() < 12) {
        s.vioDeManana = true;
      }
      if (datos && datos.canalId && (!s.canalesExplorados || s.canalesExplorados.indexOf(datos.canalId) === -1)) {
        s.canalesExplorados = s.canalesExplorados || [];
        s.canalesExplorados.push(datos.canalId);
      }
      var t = ((datos && datos.titulo) || "").toLowerCase();
      if (/arte|musica|cancion|ciencia|planta|animal|experimento|dibuj|matematic|ingles|cuento/i.test(t)) {
        s.videosEducativos = (s.videosEducativos || 0) + 1;
      }
    } else if (tipo === "tiempo_cumplido") {
      s.diasBuenTiempo = (s.diasBuenTiempo || 0) + 1;
    }
    guardarLogros(s);
    verificarLogros();
  };

  // Abrir Vitrina de Medallas y Logros
  window.FMV_abrirLogros = function () {
    var s = leerLogros();
    var modalEl = document.createElement("div");
    modalEl.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;overflow:auto";

    var caja = document.createElement("div");
    caja.style.cssText = "background:#fff;border-radius:24px;padding:24px;width:100%;max-width:520px;max-height:88vh;overflow-y:auto;box-shadow:0 12px 36px rgba(0,0,0,.3);font-family:inherit;color:#1d2b3a";

    var ganados = Object.keys(s.desbloqueados || {}).length;
    var total = DEFINICION_LOGROS.length;

    var html =
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">' +
      '<div style="display:flex;align-items:center;gap:8px">' +
      '<span style="font-size:26px">🏆</span>' +
      '<h2 style="margin:0;font-size:1.35rem">Vitrina de Medallas</h2>' +
      '</div>' +
      '<button type="button" data-cerrar style="border:0;background:#e2e8f0;color:#334155;border-radius:999px;padding:6px 14px;font-weight:800;cursor:pointer">Cerrar</button>' +
      '</div>' +
      '<p style="margin:0 0 16px;font-size:.9rem;opacity:.8">¡Colecciona medallas mirando videos, descubriendo canales y respetando tu tiempo de pantalla!</p>' +
      '<div style="background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:14px;padding:10px 16px;margin-bottom:18px;display:flex;justify-content:space-between;align-items:center;font-weight:800">' +
      '<span style="color:#166534">Medallas Desbloqueadas:</span>' +
      '<span style="background:#16a34a;color:#fff;padding:3px 12px;border-radius:999px;font-size:.85rem">' + ganados + ' de ' + total + '</span>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">';

    DEFINICION_LOGROS.forEach(function (l) {
      var ok = !!(s.desbloqueados && s.desbloqueados[l.id]);
      html +=
        '<div style="padding:14px;border-radius:16px;border:2px solid ' + (ok ? l.color : '#e2e8f0') + ';background:' + (ok ? '#fff' : '#f8fafc') + ';opacity:' + (ok ? '1' : '.55') + ';display:flex;flex-direction:column;align-items:center;text-align:center;gap:6px">' +
        '<div style="font-size:36px;filter:' + (ok ? 'none' : 'grayscale(1)') + '">' + l.emoji + '</div>' +
        '<div style="font-weight:800;font-size:1rem;color:' + (ok ? '#0f172a' : '#64748b') + '">' + l.titulo + '</div>' +
        '<div style="font-size:.76rem;line-height:1.3;color:#64748b">' + l.desc + '</div>' +
        '<div style="margin-top:auto;padding-top:6px;font-size:.72rem;font-weight:800;color:' + (ok ? l.color : '#94a3b8') + '">' + (ok ? '✓ ¡Desbloqueada!' : '🔒 Por conseguir') + '</div>' +
        '</div>';
    });

    html += '</div>';
    caja.innerHTML = html;
    modalEl.appendChild(caja);
    document.body.appendChild(modalEl);

    caja.querySelector("[data-cerrar]").addEventListener("click", function () { modalEl.remove(); });
    modalEl.addEventListener("click", function (e) { if (e.target === modalEl) modalEl.remove(); });
  };

  // Botón flotante accesible para los niños en la cabecera
  function montarBotonLogros() {
    var btn = document.getElementById("nav-premios") || document.getElementById("btn-trofeos-ninos");
    if (btn) {
      if (!btn._boundLogros) {
        btn._boundLogros = true;
        btn.addEventListener("click", window.FMV_abrirLogros);
      }
      return;
    }
    var cabecera = document.querySelector("header .header-der") || document.querySelector("header");
    if (!cabecera) return;
    btn = document.createElement("button");
    btn.type = "button";
    btn.id = "nav-premios";
    btn.className = "btn-cabecera-icono btn-premios";
    btn.title = "Ver mis medallas y trofeos";
    btn.innerHTML = '<span class="ico-premio">🏆</span>';
    btn.addEventListener("click", window.FMV_abrirLogros);
    cabecera.insertBefore(btn, cabecera.firstChild);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", montarBotonLogros);
  } else {
    montarBotonLogros();
  }

  // Verificar al iniciar
  setTimeout(verificarLogros, 1000);
})();
