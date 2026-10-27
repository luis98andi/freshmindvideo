/* Módulo de Buscador de YouTube para Padres (Agregar / Bloquear Canales y Videos) */
(function () {
  'use strict';

  function abrirBuscador() {
    pintarChipsExcluidas();
    var m = modal('<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><h3 style="margin:0">Buscar en YouTube</h3><button type="button" style="' + ESTILO_BT + ';background:#5b6b7a">Cerrar</button></div><div data-h></div>', 900);
    m.caja.querySelector("button").addEventListener("click", m.cerrar);
    m.caja.querySelector("[data-h]").appendChild(panel);
    pq.focus();
  }

  /* ---------- Sección de Padres: Videos Ocultos (manuales y automáticos por 6 repeticiones en 2 min) ---------- */
  function abrirVideosOcultos() {
    var m = modal(
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">' +
      '<h3 style="margin:0">🙈 Videos ocultos</h3>' +
      '<button type="button" data-x style="' + ESTILO_BT + ';background:#5b6b7a">Cerrar</button>' +
      '</div>' +
      '<p style="margin:0 0 12px;font-size:13.5px;opacity:.8;line-height:1.35">Aquí aparecen los videos que ocultaste manualmente y los que se ocultaron solos al reproducirse <b>6 veces seguidas en menos de 2 minutos</b>.</p>' +
      '<div style="display:flex;gap:8px;margin-bottom:14px">' +
      '<input data-in type="text" placeholder="Pegar enlace o ID de YouTube para ocultar…" style="' + ESTILO_IN + ';margin:0;flex:1">' +
      '<button type="button" data-add style="' + ESTILO_BT + ';white-space:nowrap">🙈 Ocultar</button>' +
      '</div>' +
      '<div data-lista style="display:flex;flex-direction:column;gap:10px"></div>',
      680
    );
    m.caja.querySelector("[data-x]").addEventListener("click", m.cerrar);
    var inp = m.caja.querySelector("[data-in]"), btnAdd = m.caja.querySelector("[data-add]"), box = m.caja.querySelector("[data-lista]");

    function renderLista() {
      box.innerHTML = "";
      var lista = obtenerDetallesOcultos();
      if (!lista.length) {
        var vacio = document.createElement("p");
        vacio.style.cssText = "text-align:center;padding:24px 10px;font-weight:700;opacity:.7;margin:0";
        vacio.textContent = "No hay videos ocultos en este momento.";
        box.appendChild(vacio);
        return;
      }
      lista.forEach(function (item) {
        var fila = document.createElement("div");
        fila.style.cssText = "display:flex;gap:12px;align-items:center;padding:10px;border-radius:14px;background:#f4f8fb";
        var img = document.createElement("img");
        img.src = "https://i.ytimg.com/vi/" + encodeURIComponent(item.id) + "/mqdefault.jpg";
        img.alt = "";
        img.style.cssText = "width:110px;aspect-ratio:16/9;object-fit:cover;border-radius:10px;background:#000;flex:none";

        var info = document.createElement("div");
        info.style.cssText = "flex:1;min-width:0";
        var tit = document.createElement("div");
        tit.style.cssText = "font-weight:800;font-size:.95rem;line-height:1.25;margin-bottom:4px;word-break:break-word";
        tit.textContent = item.titulo || ("Video " + item.id);

        var sub = document.createElement("div");
        sub.style.cssText = "font-size:.78rem;opacity:.8;display:flex;flex-wrap:wrap;gap:6px;align-items:center";
        var badge = document.createElement("span");
        var esAuto = item.motivo === "auto";
        var es20 = item.motivo === "20veces";
        if (es20) {
          badge.style.cssText = "padding:2px 8px;border-radius:999px;font-weight:800;font-size:.72rem;color:#fff;background:#0284c7";
          var dias = Math.max(1, Math.ceil(((item.expira || 0) - Date.now()) / (24 * 3600 * 1000)));
          badge.textContent = "⏳ Visto 20 veces (reaparece en " + dias + " d)";
        } else {
          badge.style.cssText = "padding:2px 8px;border-radius:999px;font-weight:800;font-size:.72rem;color:#fff;background:" + (esAuto ? "#d97706" : "#6b2fa8");
          badge.textContent = esAuto ? "⚡ Auto (6 veces en 2 min)" : "🔒 Ocultado por padres";
        }
        sub.appendChild(badge);
        if (item.canal) {
          var cn = document.createElement("span");
          cn.textContent = "· " + item.canal;
          sub.appendChild(cn);
        }

        info.appendChild(tit);
        info.appendChild(sub);

        var btnMostrar = document.createElement("button");
        btnMostrar.type = "button";
        btnMostrar.style.cssText = ESTILO_BT + ";background:#12a37f;padding:8px 12px;font-size:13.5px;flex:none";
        btnMostrar.textContent = "👁 Mostrar";
        btnMostrar.addEventListener("click", function () {
          window.FMV_desocultarVideo(item.id);
          renderLista();
        });

        fila.appendChild(img);
        fila.appendChild(info);
        fila.appendChild(btnMostrar);
        box.appendChild(fila);
      });

      var listasOcultas = obtenerDetallesListasOcultas();
      if (listasOcultas && listasOcultas.length) {
        var hListas = document.createElement("div");
        hListas.style.cssText = "font-weight:800;font-size:14px;color:#0284c7;margin:16px 0 6px;display:flex;align-items:center;gap:6px";
        hListas.innerHTML = "<span>📂 Listas de reproducción ocultas (" + listasOcultas.length + ")</span>";
        box.appendChild(hListas);

        listasOcultas.forEach(function (pl) {
          var filaPl = document.createElement("div");
          filaPl.style.cssText = "display:flex;gap:12px;align-items:center;padding:10px;border-radius:14px;background:#e0f2fe;border:1px solid #bae6fd";
          var ico = document.createElement("div");
          ico.style.cssText = "width:60px;height:45px;border-radius:8px;background:#0284c7;color:#fff;display:flex;align-items:center;justify-content:center;font-size:22px;flex:none";
          ico.textContent = "📂";
          var inf = document.createElement("div");
          inf.style.cssText = "flex:1;min-width:0";
          var tt = document.createElement("div");
          tt.style.cssText = "font-weight:800;font-size:.95rem;line-height:1.25;margin-bottom:4px;word-break:break-word";
          tt.textContent = pl.titulo || ("Lista " + pl.id);
          var sb = document.createElement("div");
          sb.style.cssText = "font-size:.78rem;opacity:.8;display:flex;gap:6px;align-items:center";
          sb.innerHTML = "<span style='padding:2px 8px;border-radius:999px;font-weight:800;font-size:.72rem;color:#fff;background:#0284c7'>📂 Lista oculta</span>" + (pl.canal ? " · " + pl.canal : "");
          inf.appendChild(tt);
          inf.appendChild(sb);
          var bMost = document.createElement("button");
          bMost.type = "button";
          bMost.style.cssText = ESTILO_BT + ";background:#12a37f;padding:8px 12px;font-size:13.5px;flex:none";
          bMost.textContent = "👁 Mostrar";
          bMost.addEventListener("click", function () {
            window.FMV_desocultarLista(pl.id);
            renderLista();
            if (window.FMV_recargarCanalActual) window.FMV_recargarCanalActual();
          });
          filaPl.appendChild(ico);
          filaPl.appendChild(inf);
          filaPl.appendChild(bMost);
          box.appendChild(filaPl);
        });
      }
    }

    function ocultarManualDesdeInput() {
      var vid = videoDe(inp.value);
      if (!vid) { inp.focus(); return; }
      inp.value = "";
      if (!sinClave) {
        api("videos", "part=snippet&id=" + vid).then(function (it) {
          var s = it[0] && it[0].snippet;
          window.FMV_ocultarVideo(vid, s ? dec(s.title) : ("Video " + vid), s ? dec(s.channelTitle || "") : "", "padre");
          renderLista();
        }).catch(function () {
          window.FMV_ocultarVideo(vid, "Video " + vid, "", "padre");
          renderLista();
        });
      } else {
        window.FMV_ocultarVideo(vid, "Video " + vid, "", "padre");
        renderLista();
      }
    }

    btnAdd.addEventListener("click", ocultarManualDesdeInput);
    inp.addEventListener("keydown", function (e) { if (e.key === "Enter") ocultarManualDesdeInput(); });
    renderLista();
  }
  window.FMV_abrirVideosOcultos = abrirVideosOcultos;

  /* ---------- Actualizar para todos ---------- */
  /* Arma el contenido de canales.json (exclusivo para canales) */
  function armarJson() {
    var canales = todos.map(function (c) {
      var o = { nombre: c.nombre, id: c.id, url: c.url, imagen: c.imagen || "" }, ps = perfilesDe(c);
      if (ps.length < PERFS.length) o.perfiles = ps;
      return "    " + JSON.stringify(o);
    });
    var bloq = window.FMV_bloqueados().map(function (id) { return JSON.stringify(id); }).join(", ");
    return '{\n  "canales": [\n' + canales.join(",\n") + '\n  ],\n  "bloqueados": [' + bloq + ']\n}\n';
  }

  /* Arma el contenido de mis_videos.json (exclusivo para videos individuales) */
  function armarMisVideosJson() {
    var videos = misTodos().map(function (v) {
      var o = { id: v.id, titulo: v.titulo, img: v.img }, ps = vperf(v);
      if (ps.length < PERFS.length) o.perfiles = ps;
      return "    " + JSON.stringify(o);
    });
    return '{\n  "videos": [\n' + videos.join(",\n") + '\n  ]\n}\n';
  }

  function mostrarToast(texto) {
    var div = document.createElement("div");
    div.style.cssText = "position:fixed;bottom:24px;left:50%;transform:translate(-50%, 20px);background:rgba(15,23,32,0.95);color:#fff;padding:12px 24px;border-radius:999px;font-size:14px;font-weight:700;box-shadow:0 4px 16px rgba(0,0,0,0.3);z-index:99999;transition:opacity 0.3s, transform 0.3s;opacity:0;pointer-events:none;white-space:nowrap;border:1px solid rgba(255,255,255,0.1);";
    div.textContent = texto;
    document.body.appendChild(div);
    div.offsetHeight; // force reflow
    div.style.transform = "translate(-50%, 0)";
    div.style.opacity = "1";
    setTimeout(function() {
      div.style.transform = "translate(-50%, 20px)";
      div.style.opacity = "0";
      setTimeout(function() { div.remove(); }, 300);
    }, 4000);
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
      '<p data-err style="color:#d93025;font-weight:700;margin:8px 0;display:none"></p>' +
      '<button type="button" data-save style="' + ESTILO_BT + ';width:100%;margin-top:8px">Guardar nueva contraseña</button>',
      400
    );
    var q = function (s) { return m.caja.querySelector(s); };
    var iact = q("[data-act]"), in1 = q("[data-n1]"), in2 = q("[data-n2]"), err = q("[data-err]"), btn = q("[data-save]");
    q("[data-x]").addEventListener("click", m.cerrar);
    
    btn.addEventListener("click", function () {
      var vact = iact.value.trim();
      var vn1 = in1.value.trim();
      var vn2 = in2.value.trim();
      
      if (!window.FMV_verificarPinPadres || !window.FMV_verificarPinPadres(vact)) {
        err.textContent = "La contraseña actual es incorrecta.";
        err.style.display = "block";
        return;
      }
      if (!vn1) {
        err.textContent = "La nueva contraseña no puede estar vacía.";
        err.style.display = "block";
        return;
      }
      if (vn1 !== vn2) {
        err.textContent = "La nueva contraseña y su repetición no coinciden.";
        err.style.display = "block";
        return;
      }
      
      PIN_PADRES = vn1;
      guardar("fmv_pin_padres", vn1);
      m.cerrar();
      mostrarToast("Contraseña de padres actualizada con éxito.");
    });
  }

  /* ---------- Panel de padres (se abre desde el botón 🔒 de la barra superior) ---------- */
  function actualizarBotones() {
    document.body.classList.toggle("padre", esPadre());
    if (window.FMV_recargarCanalActual) window.FMV_recargarCanalActual();
    if (window.FMV_recargarBuscador) window.FMV_recargarBuscador();
  }
  function hayOcultos() { return leer(LS_OCULTOS, []).length || leer(LS_VOCULTOS, []).length || leer(LS_BLOQ, []).length || leer(LS_LISTAS_OCULTAS, []).length; }
  function restaurar() {
    confirmarAccion("¿Volver a mostrar todos los canales, videos y listas que quitaste?", function () {
      guardar(LS_OCULTOS, []); guardar(LS_VOCULTOS, []); guardar(LS_BLOQ, []); guardar(LS_DET_OCULTOS, []); bloqBase = [];
      guardar(LS_LISTAS_OCULTAS, []); guardar(LS_DET_LISTAS_OCULTAS, []);
      try { localStorage.removeItem("fmv_listas"); } catch (e) {}
      iniciar().then(function () {
        actualizarBotones();
        if (window.FMV_recargarCanalActual) window.FMV_recargarCanalActual();
      });
    });
  }
  function salirDePadres() {
    setPadre(false); clearTimeout(tInac);
    [].forEach.call(document.querySelectorAll(".fmv-modal"), function (m) { m.remove(); });
    actualizarBotones(); pintar();
    if (window.FMV_hayCambiosPadres) {
      mostrarToast("✓ Cambios guardados en este dispositivo.");
      window.FMV_hayCambiosPadres = false;
    }
  }
  window.FMV_salirPadres = salirDePadres;
  /* Cierre automático: 15 s sin actividad en la página, o al pasar a segundo plano */
  var tInac = null;
  function vigilar() { clearTimeout(tInac); if (esPadre()) tInac = setTimeout(salirDePadres, 15000); }
  ["pointerdown", "touchstart", "keydown", "input", "scroll", "wheel"].forEach(function (ev) { document.addEventListener(ev, vigilar, { capture: true, passive: true }); });
  document.addEventListener("visibilitychange", function () { if (document.hidden && esPadre()) salirDePadres(); });
  window.addEventListener("pagehide", function () { if (esPadre()) salirDePadres(); });

  try { localStorage.removeItem("fmv_github"); } catch (e) {}
  var LS_HIST = "fmv_historial", DIAS_HIST = 30, MAX_DIA = 100;
  window.FMV_historial = function (id, titulo, canal, uc) {
    var ahora = Date.now(), hoy = new Date().toDateString();
    var h = leer(LS_HIST, []).filter(function (x) { return ahora - x.t < DIAS_HIST * 864e5 && !(x.id === id && new Date(x.t).toDateString() === hoy); });
    h.push({ id: id, n: titulo || "", c: canal || "", u: uc || "", p: window.FMV_perfil || "", t: ahora });
    var sobran = h.filter(function (x) { return new Date(x.t).toDateString() === hoy; }).length - MAX_DIA;
    if (sobran > 0) h = h.filter(function (x) { if (sobran > 0 && new Date(x.t).toDateString() === hoy) { sobran--; return false; } return true; });
    guardar(LS_HIST, h);
  };
  function abrirHistorial() {
    var m = modal('<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><h3 style="margin:0">🕘 Historial (' + DIAS_HIST + ' días)</h3><button type="button" style="' + ESTILO_BT + ';background:#5b6b7a">Cerrar</button></div><div data-h></div>', 700);
    m.caja.querySelector("button").addEventListener("click", m.cerrar);
    var box = m.caja.querySelector("[data-h]"), h = leer(LS_HIST, []).slice().reverse(), dia = "";
    if (!h.length) box.textContent = "Aún no hay videos en el historial.";
    h.forEach(function (x) {
      var d = new Date(x.t), ds = d.toDateString(), pf = (window.FMV_PERFILES || {})[x.p];
      if (ds !== dia) {
        dia = ds; var t = document.createElement("h4"); t.style.margin = "14px 0 6px";
        t.textContent = ds === new Date().toDateString() ? "Hoy" : d.toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" });
        box.appendChild(t);
      }
      var f = document.createElement("div"); f.style.cssText = "display:flex;gap:10px;align-items:center;padding:6px 0;cursor:pointer";
      f.innerHTML = '<img src="https://i.ytimg.com/vi/' + encodeURIComponent(x.id) + '/mqdefault.jpg" alt="" style="width:120px;aspect-ratio:16/9;object-fit:cover;border-radius:10px;background:#000;flex:none"><div style="flex:1;min-width:0"><div data-n style="font-weight:700;line-height:1.25"></div><div data-s style="font-size:.8rem;opacity:.7"></div></div>';
      f.querySelector("[data-n]").textContent = x.n || "Video";
      f.querySelector("[data-s]").textContent = (pf ? pf.e + " " : "") + x.c + " · " + d.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
      f.addEventListener("click", function () {
        m.cerrar();
        if (x.u === "MIS") { if (window.FMV_abrirMis) FMV_abrirMis(); }
        else if (window.FMV_abrirCanal) FMV_abrirCanal(x.u, x.c, x.id);
      });
      box.appendChild(f);
    });
  }

  function abrirConfigTiempos() {
    var info = window.FMV_obtenerTiempos ? window.FMV_obtenerTiempos() : { hija: { usoSeg: 0, limiteMin: 0 }, hijo: { usoSeg: 0, limiteMin: 0 } };
    var mt = modal(
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">' +
      '<h3 style="margin:0">⏱ Temporizador y límite de tiempo</h3>' +
      '<button type="button" data-x style="' + ESTILO_BT + ';background:#5b6b7a">Cerrar</button>' +
      '</div>' +
      '<p style="font-size:13.5px;opacity:.8;margin:0 0 16px;line-height:1.4">Configura cuánto tiempo puede ver cada perfil al día. Al terminarse el tiempo, la pantalla se bloquea automáticamente y pide tu contraseña de siempre.</p>' +
      '<div data-hija style="background:#f4f8fb;padding:14px;border-radius:14px;margin-bottom:12px"></div>' +
      '<div data-hijo style="background:#f4f8fb;padding:14px;border-radius:14px;margin-bottom:14px"></div>',
      480
    );
    mt.caja.querySelector("[data-x]").addEventListener("click", mt.cerrar);
    function bloque(id, emoji, nombre, datos, cont) {
      var usoMin = Math.floor((datos.usoSeg || 0) / 60);
      var lim = datos.limiteMin || 0;
      cont.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
        '<div style="font-weight:800;font-size:1.05rem">' + emoji + ' ' + nombre + '</div>' +
        '<div style="font-size:.85rem;font-weight:800;color:#0a6b53;background:#e6f7f2;padding:3px 10px;border-radius:999px">⏱ Hoy: ' + usoMin + ' min</div>' +
        '</div>' +
        '<div style="font-size:.85rem;margin-bottom:8px;opacity:.85">Límite diario: <b>' + (lim > 0 ? (lim + ' minutos') : 'Sin límite') + '</b></div>' +
        '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">' +
        '<button type="button" data-m="5" style="' + ESTILO_BT + ';padding:6px 11px;font-size:13px;background:' + (lim === 5 ? '#12a37f' : '#2f6fdd') + '">5 min</button>' +
        '<button type="button" data-m="15" style="' + ESTILO_BT + ';padding:6px 11px;font-size:13px;background:' + (lim === 15 ? '#12a37f' : '#2f6fdd') + '">15 min</button>' +
        '<button type="button" data-m="30" style="' + ESTILO_BT + ';padding:6px 11px;font-size:13px;background:' + (lim === 30 ? '#12a37f' : '#2f6fdd') + '">30 min</button>' +
        '<button type="button" data-m="45" style="' + ESTILO_BT + ';padding:6px 11px;font-size:13px;background:' + (lim === 45 ? '#12a37f' : '#2f6fdd') + '">45 min</button>' +
        '<button type="button" data-m="60" style="' + ESTILO_BT + ';padding:6px 11px;font-size:13px;background:' + (lim === 60 ? '#12a37f' : '#2f6fdd') + '">60 min</button>' +
        '<button type="button" data-m="0" style="' + ESTILO_BT + ';padding:6px 11px;font-size:13px;background:' + (lim === 0 ? '#12a37f' : '#6b7280') + '">Sin límite</button>' +
        '<button type="button" data-r style="' + ESTILO_BT + ';padding:6px 11px;font-size:13px;background:#d97706">Reiniciar hoy</button>' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:6px;background:#fff;padding:6px 10px;border-radius:10px;border:1px solid #cbd5e1;margin-bottom:12px">' +
        '<span style="font-size:12.5px;font-weight:700;color:#64748b">Límite personalizado:</span>' +
        '<input type="number" min="1" max="999" data-custom-min placeholder="ej: 7" style="width:70px;padding:4px 8px;border:1px solid #cbd5e1;border-radius:6px;font-family:inherit;font-weight:800;font-size:13.5px">' +
        '<span style="font-size:12.5px;color:#64748b">minutos</span>' +
        '<button type="button" data-custom-btn style="' + ESTILO_BT + ';padding:5px 12px;font-size:12.5px;background:#0d9488">Fijar</button>' +
        '</div>' +
        '<div style="background:#e0f2fe;padding:10px 12px;border-radius:12px;border:1.5px solid #bae6fd">' +
        '<div style="font-size:12.5px;font-weight:800;color:#0369a1;margin-bottom:6px">⏳ Dar tiempo extra desde este momento (incluso si ya usó varias horas):</div>' +
        '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">' +
        '<button type="button" data-extra="5" style="' + ESTILO_BT + ';padding:5px 10px;font-size:12.5px;background:#059669">+5 min más</button>' +
        '<button type="button" data-extra="10" style="' + ESTILO_BT + ';padding:5px 10px;font-size:12.5px;background:#059669">+10 min más</button>' +
        '<button type="button" data-extra="15" style="' + ESTILO_BT + ';padding:5px 10px;font-size:12.5px;background:#059669">+15 min más</button>' +
        '<button type="button" data-extra="30" style="' + ESTILO_BT + ';padding:5px 10px;font-size:12.5px;background:#059669">+30 min más</button>' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:6px">' +
        '<span style="font-size:12px;font-weight:700;color:#0369a1">Otro tiempo extra:</span>' +
        '<input type="number" min="1" max="999" data-extra-inp placeholder="ej: 5" style="width:65px;padding:4px 6px;border:1px solid #93c5fd;border-radius:6px;font-family:inherit;font-weight:800;font-size:13px;text-align:center">' +
        '<span style="font-size:12px;color:#0369a1">minutos más</span>' +
        '<button type="button" data-extra-btn style="' + ESTILO_BT + ';padding:4px 10px;font-size:12px;background:#0284c7">Dar tiempo</button>' +
        '</div>' +
        '</div>';
      cont.querySelectorAll("[data-m]").forEach(function (b) {
        b.addEventListener("click", function () {
          var m = parseInt(b.getAttribute("data-m"), 10);
          if (window.FMV_fijarLimite) window.FMV_fijarLimite(id, m);
          mt.cerrar();
          abrirConfigTiempos();
        });
      });
      cont.querySelector("[data-r]").addEventListener("click", function () {
        if (window.FMV_reiniciarTiempo) window.FMV_reiniciarTiempo(id);
        mt.cerrar();
        abrirConfigTiempos();
      });
      var customInp = cont.querySelector("[data-custom-min]");
      var customBtn = cont.querySelector("[data-custom-btn]");
      if (customBtn && customInp) {
        customBtn.addEventListener("click", function () {
          var val = parseInt(customInp.value, 10);
          if (val && val > 0) {
            if (window.FMV_fijarLimite) window.FMV_fijarLimite(id, val);
            mt.cerrar();
            abrirConfigTiempos();
          }
        });
      }
      cont.querySelectorAll("[data-extra]").forEach(function (b) {
        b.addEventListener("click", function () {
          var ex = parseInt(b.getAttribute("data-extra"), 10) || 5;
          if (window.FMV_agregarMinutos) window.FMV_agregarMinutos(id, ex);
          mostrarToast("✓ Se dieron " + ex + " minutos más para " + nombre);
          mt.cerrar();
          abrirConfigTiempos();
        });
      });
      var extraInp = cont.querySelector("[data-extra-inp]");
      var extraBtn = cont.querySelector("[data-extra-btn]");
      if (extraBtn && extraInp) {
        extraBtn.addEventListener("click", function () {
          var val = parseInt(extraInp.value, 10);
          if (val && val > 0) {
            if (window.FMV_agregarMinutos) window.FMV_agregarMinutos(id, val);
            mostrarToast("✓ Se dieron " + val + " minutos más para " + nombre);
            mt.cerrar();
            abrirConfigTiempos();
          }
        });
      }
    }
    bloque("hija", "👧", "Hija", info.hija, mt.caja.querySelector("[data-hija]"));
    bloque("hijo", "👦", "Hijo", info.hijo, mt.caja.querySelector("[data-hijo]"));
  }

  
  window.FMV_abrirBuscadorYouTubePadres = abrirBuscador;
  window.FMV_abrirBuscador = abrirBuscador;
})();
