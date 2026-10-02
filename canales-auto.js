/* FreshMindVideo - Zona de padres: buscar y agregar canales de YouTube */
(function () {
  var API_KEY = "AIzaSyA7R_xoLnmY__-8cuNoP40rHhWyLyLBlbk";
  window.FMV_API_KEY = API_KEY; // la usa index.html para leer los títulos de los videos
  var LS_EXTRA = "fmv_extra", LS_CACHE = "fmv_cache", LS_VID = "fmv_videos", LS_OCULTOS = "fmv_ocultos", LS_VOCULTOS = "fmv_videos_ocultos";
  var LS_BLOQ = "fmv_bloqueados", LS_DET_OCULTOS = "fmv_ocultos_det", bloqBase = [];
  var LS_EXCLUIDAS = "fmv_palabras_excluidas";
  var EXCLUIDAS_DEF = ["brujas", "halloween", "haloween"];
  var BASE = "https://www.googleapis.com/youtube/v3/";
  var ID_OK = /^UC[\w-]{22}$/;
  var grid = document.getElementById("cuadricula"), msg = document.getElementById("mensaje");
  var sinClave = !API_KEY || API_KEY.indexOf("PEGA") === 0;
  var todos = [];
  var videosBase = []; // videos que vienen de canales.json (para todos los dispositivos)

  function norm(t) {
    var s = String(t || "").toLowerCase();
    try { s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); } catch (e) {}
    return s.trim();
  }

  function leer(k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } }

  var PIN_PADRES = leer("fmv_pin_padres", "1234");
  window.FMV_hayCambiosPadres = false;

  function guardar(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
      if (k !== LS_CACHE && k !== "fmv_historial" && k !== "fmv_pin_padres" && k !== "fmv_github") {
        window.FMV_hayCambiosPadres = true;
      }
    } catch (e) {}
  }

  function obtenerPalabrasExcluidas() {
    var raw = leer(LS_EXCLUIDAS, null);
    if (!raw || !Array.isArray(raw)) {
      raw = EXCLUIDAS_DEF.slice();
      guardar(LS_EXCLUIDAS, raw);
    }
    return raw;
  }

  function guardarPalabrasExcluidas(arr) {
    var limpias = [];
    (arr || []).forEach(function (w) {
      var s = norm(w);
      if (s && limpias.indexOf(s) < 0) limpias.push(s);
    });
    guardar(LS_EXCLUIDAS, limpias);
    return limpias;
  }

  function contienePalabraExcluida(texto) {
    if (!texto) return false;
    var tNorm = norm(texto);
    if (!tNorm) return false;
    var excl = obtenerPalabrasExcluidas();
    for (var i = 0; i < excl.length; i++) {
      var e = norm(excl[i]);
      if (!e) continue;
      if (tNorm.indexOf(e) >= 0) return true;
    }
    return false;
  }

  window.FMV_palabrasExcluidas = obtenerPalabrasExcluidas;
  window.FMV_guardarPalabrasExcluidas = guardarPalabrasExcluidas;
  window.FMV_contienePalabraExcluida = contienePalabraExcluida;
  function esPadre() { try { return sessionStorage.getItem("fmv_padres") === "1"; } catch (e) { return false; } }
  function setPadre(v) { try { sessionStorage.setItem("fmv_padres", v ? "1" : "0"); } catch (e) {} }
  function handleDe(u) { var m = /youtube\.com\/@([^\/?#]+)/.exec(u || ""); return m ? decodeURIComponent(m[1]) : ""; }
  function idDe(u) { var m = /youtube\.com\/channel\/(UC[\w-]{22})/.exec(u || ""); return m ? m[1] : ""; }
  function foto(it) { var t = it.snippet.thumbnails || {}; return (t.medium || t.default || t.high || {}).url || ""; }
  function dec(t) { var d = document.createElement("textarea"); d.innerHTML = t || ""; return d.value; }

  function videoDe(u) {
    var s = String(u || "").trim();
    if (/^[\w-]{11}$/.test(s)) return s;
    var m = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/.exec(s);
    return m ? m[1] : "";
  }

  function guardarDetalleOculto(id, titulo, canal, motivo, expira) {
    if (!id) return;
    var det = leer(LS_DET_OCULTOS, []).filter(function (x) { return x && x.id !== id; });
    det.unshift({
      id: id,
      titulo: titulo || "Video (" + id + ")",
      canal: canal || "",
      motivo: motivo || "padre",
      expira: expira || 0,
      t: Date.now()
    });
    guardar(LS_DET_OCULTOS, det);
  }

  function obtenerDetallesOcultos() {
    var det = leer(LS_DET_OCULTOS, []);
    var mapa = {};
    det.forEach(function (x) { if (x && x.id) mapa[x.id] = x; });
    var todosIds = window.FMV_bloqueados().concat(leer(LS_VOCULTOS, []));
    var unicos = [];
    todosIds.forEach(function (id) {
      if (id && unicos.indexOf(id) < 0) unicos.push(id);
    });
    return unicos.map(function (id) {
      return mapa[id] || { id: id, titulo: "Video (" + id + ")", canal: "", motivo: "padre", expira: 0, t: 0 };
    });
  }

  window.FMV_esPadre = esPadre;
  window.FMV_misVideos = function () { return misVideos(); };
  window.FMV_bloqueados = function () { return bloqBase.concat(leer(LS_BLOQ, [])).filter(function (x, i, a) { return a.indexOf(x) === i; }); };
  window.FMV_bloquear = function (id, titulo, canal, motivo, expira) {
    var b = leer(LS_BLOQ, []);
    if (b.indexOf(id) < 0) { b.push(id); guardar(LS_BLOQ, b); }
    guardarDetalleOculto(id, titulo, canal, motivo || "padre", expira);
    try { localStorage.removeItem("fmv_listas"); } catch (e) {}
  };
  window.FMV_quitarPropio = function (id, titulo, motivo, expira) {
    var prev = misTodos().filter(function (o) { return o.id === id; })[0];
    guardar(LS_VID, leer(LS_VID, []).filter(function (o) { return o.id !== id; }));
    var ocv = leer(LS_VOCULTOS, []); if (ocv.indexOf(id) < 0) { ocv.push(id); guardar(LS_VOCULTOS, ocv); }
    guardarDetalleOculto(id, titulo || (prev && prev.titulo) || "", "⭐ Mis videos", motivo || "padre", expira);
    pintar(); actualizarBotones();
  };
  window.FMV_ocultarVideo = function (id, titulo, canal, motivo, expira) {
    if (!id) return;
    if (canal === "MIS" || canal === "⭐ Mis videos") {
      window.FMV_quitarPropio(id, titulo, motivo || "padre", expira);
    } else {
      window.FMV_bloquear(id, titulo, canal, motivo || "padre", expira);
      pintar(); actualizarBotones();
    }
  };
  window.FMV_desocultarVideo = function (id) {
    guardar(LS_BLOQ, leer(LS_BLOQ, []).filter(function (x) { return x !== id; }));
    guardar(LS_VOCULTOS, leer(LS_VOCULTOS, []).filter(function (x) { return x !== id; }));
    guardar(LS_DET_OCULTOS, leer(LS_DET_OCULTOS, []).filter(function (x) { return x && x.id !== id; }));
    bloqBase = bloqBase.filter(function (x) { return x !== id; });
    try { localStorage.removeItem("fmv_listas"); } catch (e) {}
    pintar(); actualizarBotones();
    if (window.FMV_recargarCanalActual) window.FMV_recargarCanalActual();
  };

  /* Videos = los de canales.json + los de este dispositivo, sin repetir y sin los quitados */
  function misTodos() {
    var oc = leer(LS_VOCULTOS, []), bl = window.FMV_bloqueados(), vistos = {}, salida = [];
    videosBase.concat(leer(LS_VID, [])).forEach(function (v) {
      if (!v || !v.id || vistos[v.id] || oc.indexOf(v.id) >= 0 || bl.indexOf(v.id) >= 0) return;
      vistos[v.id] = 1;
      salida.push(v);
    });
    return salida;
  }
  function misVideos() { var p = window.FMV_perfil; return misTodos().filter(function (v) { return visibleV(v, p); }); }
  
  function apiCompleta(ruta, p) {
    return fetch(BASE + ruta + "?key=" + API_KEY + "&" + p)
      .then(function (r) {
        return r.json().then(function (d) {
          if (!r.ok || d.error) {
            var mensajeError = (d.error && d.error.message) ? d.error.message : "Error HTTP " + r.status;
            throw new Error(mensajeError);
          }
          return d;
        });
      })
      .catch(function (err) {
        if (err.message.includes("Failed to fetch") || err.message.includes("NetworkError")) {
          throw new Error("Sin conexión o clave bloqueada/restringida.");
        }
        throw err;
      });
  }

  function api(ruta, p) {
    return apiCompleta(ruta, p).then(function (d) { return d.items || []; });
  }

  /* Corrige IDs malos y pone la foto oficial (caché 7 días) */
  function resolver(lista) {
    var cache = leer(LS_CACHE, {}), ahora = Date.now(), pend = [];
    lista.forEach(function (c) {
      var h = cache[c.url];
      if (h && ahora - h.t < 6048e5) { c.id = h.id; c.imagen = h.img; } else pend.push(c);
    });
    if (sinClave || !pend.length) return Promise.resolve();
    var ids = pend.map(function (c) { return (c.id || "").trim(); }).filter(function (i) { return ID_OK.test(i); });
    var lotes = [];
    for (var i = 0; i < ids.length; i += 50) lotes.push(api("channels", "part=snippet&id=" + ids.slice(i, i + 50).join(",")));
    return Promise.all(lotes).then(function (r) {
      var mapa = {};
      [].concat.apply([], r).forEach(function (it) { mapa[it.id] = it; });
      return Promise.all(pend.map(function (c) {
        var it = mapa[(c.id || "").trim()], h = handleDe(c.url);
        if (it) return it;
        return h ? api("channels", "part=snippet&forHandle=" + encodeURIComponent("@" + h)).then(function (x) { return x[0]; }) : null;
      }));
    }).then(function (res) {
      pend.forEach(function (c, i) {
        var it = res[i];
        if (it) { c.id = it.id; c.imagen = foto(it); cache[c.url] = { id: c.id, img: c.imagen, t: ahora }; }
      });
      guardar(LS_CACHE, cache);
    }).catch(function () {});
  }

  /* Canales por perfil: cada canal tiene una lista de perfiles; sin lista = lo ven todos */
  var LS_PERF = "fmv_perfiles", PERFS = ["hija", "hijo"];
  function perfilesDe(c) { return leer(LS_PERF, {})[c.id] || c.perfiles || PERFS; }
  function visibleEn(c, p) { return !p || perfilesDe(c).indexOf(p) >= 0; }
  function chipsPerfil(c, leerP, guardarP) {
    leerP = leerP || function () { return perfilesDe(c); };
    guardarP = guardarP || function (ps) { var m = leer(LS_PERF, {}); m[c.id] = ps; guardar(LS_PERF, m); pintar(); };
    var ch = document.createElement("div");
    ch.style.cssText = "position:absolute;left:6px;top:6px;display:flex;gap:6px;z-index:2";
    PERFS.forEach(function (pid) {
      var on = leerP().indexOf(pid) >= 0, b = document.createElement("button");
      b.type = "button"; b.textContent = ((window.FMV_PERFILES || {})[pid] || {}).e || pid;
      b.title = on ? "Quitar de este perfil" : "Mostrar en este perfil";
      b.style.cssText = "width:34px;height:34px;border:0;border-radius:50%;font-size:18px;cursor:pointer;padding:0;background:" + (on ? "#12a37f" : "rgba(0,0,0,.6)") + ";opacity:" + (on ? 1 : .6);
      b.addEventListener("click", function (e) {
        e.stopPropagation();
        var ps = leerP().slice(), k = ps.indexOf(pid);
        if (k >= 0) { if (ps.length === 1) return; ps.splice(k, 1); } else ps.push(pid);
        guardarP(ps);
      });
      ch.appendChild(b);
    });
    return ch;
  }
  var LS_VPERF = "fmv_vperfiles";
  function vperf(v) { return leer(LS_VPERF, {})[v.id] || v.perfiles || PERFS; }
  function visibleV(v, p) { return !p || vperf(v).indexOf(p) >= 0; }
  window.FMV_repintar = function () { pintar(); };
  function pintarMis() {
    var gm = document.getElementById("cuadricula-mis");
    if (!gm) return;
    gm.innerHTML = "";
    var p = window.FMV_perfil, lista = esPadre() ? misTodos() : misVideos();
    if (!lista.length) {
      var e = document.createElement("p"); e.className = "mensaje"; e.style.gridColumn = "1/-1";
      e.textContent = "Aún no hay videos aquí. Los padres pueden agregarlos desde 🔒 Padres → Buscar en YouTube.";
      gm.appendChild(e); return;
    }
    lista.forEach(function (v) {
      var ver = visibleV(v, p);
      var t = tarjeta(v.img || ("https://i.ytimg.com/vi/" + encodeURIComponent(v.id) + "/mqdefault.jpg"), v.titulo || "Video", document.createDocumentFragment());
      if (ver) { t.style.cursor = "pointer"; t.addEventListener("click", function () { if (window.FMV_abrirMis) FMV_abrirMis(v.id); }); }
      if (esPadre()) {
        if (!ver) t.style.opacity = ".4";
        t.style.position = "relative";
        var x = document.createElement("button"); x.innerHTML = "🙈 Ocultar"; x.title = "Ocultar este video para siempre";
        x.style.cssText = "position:absolute;top:6px;right:6px;padding:6px 12px;border:0;border-radius:999px;background:#e11d48;color:#fff;font-size:12.5px;font-weight:800;cursor:pointer;z-index:2;box-shadow:0 2px 6px rgba(0,0,0,.35)";
        x.addEventListener("click", function (ev) {
          ev.stopPropagation();
          function proceder() {
            confirmarAccion("¿Ocultar este video («" + (v.titulo || v.id) + "»)? No volverá a aparecer.", function () {
              window.FMV_ocultarVideo(v.id, v.titulo, "⭐ Mis videos", "padre");
              pintar();
            });
          }
          if (!esPadre()) {
            pedirPin(proceder);
            return;
          }
          proceder();
        });
        t.appendChild(x);
        t.appendChild(chipsPerfil(v, function () { return vperf(v); }, function (ps) { var m = leer(LS_VPERF, {}); m[v.id] = ps; guardar(LS_VPERF, m); pintar(); }));
      }
      gm.appendChild(t);
    });
  }

  function pintar() {
    var perfil = window.FMV_perfil;
    window.FMV_CANALES = esPadre() ? todos : todos.filter(function (c) { return visibleEn(c, perfil); }); // lo usa el buscador (buscador.js)
    grid.innerHTML = "";
    if (window.FMV_tabVideos) FMV_tabVideos(misVideos().length);
    if (window.FMV_repintarSelector) FMV_repintarSelector();
    todos.forEach(function (c, i) {
      var ver = visibleEn(c, perfil);
      if (!ver && !esPadre()) return;
      var t = crearTarjeta(c, i);
      if (!t) return;
      if (esPadre()) {
        if (!ver) t.style.opacity = ".4";   // los padres ven todos; los que no son de este perfil salen atenuados
        var x = document.createElement("button");
        x.textContent = "×"; x.title = "Quitar canal";
        x.style.cssText = "position:absolute;top:6px;right:6px;width:34px;height:34px;border:0;border-radius:50%;background:rgba(0,0,0,.7);color:#fff;font-size:20px;cursor:pointer;z-index:2";
        x.addEventListener("click", function (e) {
          e.stopPropagation();
          function proceder() {
            confirmarAccion("¿Quitar " + c.nombre + "?", function () {
              if (c.extra) guardar(LS_EXTRA, leer(LS_EXTRA, []).filter(function (o) { return o.id !== c.id; }));
              else { var oc = leer(LS_OCULTOS, []); oc.push(c.url); guardar(LS_OCULTOS, oc); }
              todos = todos.filter(function (o) { return o !== c; });
              pintar(); actualizarBotones();
            });
          }
          if (!esPadre()) {
            pedirPin(proceder);
            return;
          }
          proceder();
        });
        t.style.position = "relative";
        t.appendChild(x);
        t.appendChild(chipsPerfil(c));
      }
      grid.appendChild(t);
    });
    msg.hidden = grid.children.length > 0;
    pintarMis();
  }

  function iniciar() {
    return fetch("canales.json?_t=" + Date.now(), { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        videosBase = (d && !Array.isArray(d) && Array.isArray(d.videos)) ? d.videos : [];
        bloqBase = (d && !Array.isArray(d) && Array.isArray(d.bloqueados)) ? d.bloqueados : [];
        return Array.isArray(d) ? d : (d.canales || d.channels || []);
      })
      .catch(function () { return []; })
      .then(function (base) {
        var enBase = {};
        base.forEach(function (c) { enBase[(c.id || "").trim()] = 1; });
        var extra = leer(LS_EXTRA, [])
          .filter(function (c) { return !enBase[c.id]; })
          .map(function (c) { c.extra = true; return c; });
        var ocu = leer(LS_OCULTOS, []);
        todos = base.concat(extra).filter(function (c) { return ocu.indexOf(c.url) < 0; });

        // ⚡ Pintar inmediatamente con los datos que ya conocemos de canales.json.
        pintar();
        if (window.FMV_alListo) window.FMV_alListo();

        // 🔄 Resolver/actualizar IDs e imágenes en segundo plano.
        resolver(todos).then(function () {
          pintar();
        });
      });
  }

  var ESTILO_IN = "width:100%;box-sizing:border-box;padding:12px;font-size:16px;border:1px solid #c9d3da;border-radius:8px;margin:8px 0;font-family:inherit";
  var ESTILO_BT = "padding:10px 16px;border:0;background:#12a37f;color:#fff;border-radius:8px;cursor:pointer;font-weight:700;font-family:inherit;font-size:15px";
  function modal(html, ancho) {
    var f = document.createElement("div");
    f.className = "fmv-modal";
    f.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:100;overflow:auto;padding:16px";
    var c = document.createElement("div");
    c.style.cssText = "background:#fff;border-radius:22px;padding:20px;width:100%;max-width:" + (ancho || 480) + "px;margin:4vh auto;color:#1d2b3a";
    c.innerHTML = html;
    f.appendChild(c);
    document.body.appendChild(f);
    f.addEventListener("click", function (e) { if (e.target === f) f.remove(); });
    return { caja: c, cerrar: function () { f.remove(); } };
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
  window.FMV_confirmar = confirmarAccion;

  function pedirPin(alEntrar) {
    var m = modal(
      '<h3 style="margin:0 0 6px">Zona de padres</h3>' +
      '<input type="password" inputmode="numeric" placeholder="PIN" style="' + ESTILO_IN + '">' +
      '<p data-err style="color:#d93025;font-weight:700;margin:0 0 8px;display:none">PIN incorrecto</p>' +
      '<button style="' + ESTILO_BT + '">Entrar</button>'
    );
    var inp = m.caja.querySelector("input"), b = m.caja.querySelector("button"), err = m.caja.querySelector("[data-err]");
    function ok() {
      if (inp.value === PIN_PADRES) { setPadre(true); vigilar(); m.cerrar(); actualizarBotones(); pintar(); if (alEntrar) alEntrar(); }
      else { err.style.display = "block"; inp.value = ""; inp.focus(); }
    }
    b.addEventListener("click", ok);
    inp.addEventListener("keydown", function (e) { if (e.key === "Enter") ok(); });
    inp.focus();
  }
  window.FMV_pedirPin = pedirPin;
  window.FMV_esPadre = esPadre;

  function yaEsta(id) { return todos.some(function (c) { return c.id === id; }); }

  var panel = document.createElement("div");
  panel.style.cssText = "margin:0";
  panel.innerHTML =
    '<div style="display:flex;gap:8px">' +
      '<input type="search" placeholder="Buscar o pegar enlace de YouTube…" style="flex:1;min-width:0;padding:14px 20px;font-size:16px;border:2px solid #12a37f;border-radius:999px;font-family:inherit;outline:0;background:#fff">' +
      '<button type="button" data-btn-buscar style="' + ESTILO_BT + ';border-radius:999px;padding:0 22px">Buscar</button>' +
    '</div>' +
    '<div class="fmv-box-filtro" style="margin-top:12px;padding:12px 14px;background:#fff5f5;border:1.5px solid #fecdd3;border-radius:16px;box-shadow:0 2px 6px rgba(225,29,72,.06)">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">' +
        '<div style="display:flex;align-items:center;gap:6px;font-size:13.5px;font-weight:800;color:#9f1239">' +
          '<span>🚫 Palabras excluidas en búsquedas:</span>' +
          '<span data-filtro-conteo style="font-size:12px;font-weight:700;color:#e11d48;background:#ffe4e6;padding:2px 8px;border-radius:999px"></span>' +
        '</div>' +
        '<button type="button" data-toggle-filtro style="border:0;background:none;color:#be123c;font-size:12.5px;font-weight:800;cursor:pointer;padding:2px 6px">⚙️ Configurar palabras ▼</button>' +
      '</div>' +
      '<div data-filtro-detalle style="margin-top:8px;padding-top:8px;border-top:1px dashed #fecdd3">' +
        '<p style="margin:0 0 8px;font-size:12.5px;color:#881337;line-height:1.35">' +
          'No se mostrarán videos ni canales con estas palabras (ej: <b>brujas, halloween, miedo, terror</b>):' +
        '</p>' +
        '<div style="display:flex;gap:6px;align-items:center">' +
          '<input type="text" data-in-excluir placeholder="Nueva palabra a excluir (ej: brujas, halloween)…" style="' + ESTILO_IN + ';margin:0;flex:1;font-size:13.5px;padding:9px 14px;border:1.5px solid #fda4af;border-radius:10px">' +
          '<button type="button" data-btn-add-excluir style="' + ESTILO_BT + ';background:#e11d48;font-size:13px;padding:9px 14px;border-radius:10px;white-space:nowrap">+ Excluir</button>' +
        '</div>' +
      '</div>' +
      '<div data-chips-excluidas style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px"></div>' +
    '</div>' +
    '<p style="text-align:center;font-weight:600;margin:14px 0 0"></p>' +
    '<div data-r style="margin-top:8px"></div>';

  var pq = panel.querySelector('input[type="search"]'),
      pb = panel.querySelector("[data-btn-buscar]"),
      pm = panel.querySelector("p"),
      pr = panel.querySelector("[data-r]");

  var boxFiltroConteo = panel.querySelector("[data-filtro-conteo]"),
      btnToggleFiltro = panel.querySelector("[data-toggle-filtro]"),
      boxFiltroDetalle = panel.querySelector("[data-filtro-detalle]"),
      inExcluir = panel.querySelector("[data-in-excluir]"),
      btnAddExcluir = panel.querySelector("[data-btn-add-excluir]"),
      chipsExcluidas = panel.querySelector("[data-chips-excluidas]");

  function pintarChipsExcluidas() {
    var lista = obtenerPalabrasExcluidas();
    if (boxFiltroConteo) boxFiltroConteo.textContent = lista.length + " activa" + (lista.length === 1 ? "" : "s");
    if (!chipsExcluidas) return;
    chipsExcluidas.innerHTML = "";
    if (!lista.length) {
      var sin = document.createElement("span");
      sin.style.cssText = "font-size:12px;color:#9ca3af;font-style:italic";
      sin.textContent = "No hay palabras excluidas. Agrega palabras arriba.";
      chipsExcluidas.appendChild(sin);
      return;
    }
    lista.forEach(function (w) {
      var chip = document.createElement("span");
      chip.style.cssText = "display:inline-flex;align-items:center;gap:6px;background:#ffe4e6;color:#9f1239;border:1px solid #fecdd3;padding:4px 10px;border-radius:999px;font-size:12.5px;font-weight:700";
      var txt = document.createElement("span");
      txt.textContent = w;
      var btnQ = document.createElement("button");
      btnQ.type = "button";
      btnQ.innerHTML = "&times;";
      btnQ.title = "Quitar «" + w + "»";
      btnQ.style.cssText = "border:0;background:none;color:#e11d48;font-weight:900;cursor:pointer;padding:0 2px;font-size:14px;line-height:1";
      btnQ.addEventListener("click", function (ev) {
        ev.stopPropagation();
        var act = obtenerPalabrasExcluidas().filter(function (x) { return x !== w; });
        guardarPalabrasExcluidas(act);
        pintarChipsExcluidas();
      });
      chip.appendChild(txt);
      chip.appendChild(btnQ);
      chipsExcluidas.appendChild(chip);
    });
  }

  function agregarPalabrasDesdeInput() {
    var val = inExcluir.value.trim();
    if (!val) return;
    var partes = val.split(/[,\n;]+/);
    var act = obtenerPalabrasExcluidas().slice();
    partes.forEach(function (p) {
      var n = norm(p);
      if (n && act.indexOf(n) < 0) act.push(n);
    });
    guardarPalabrasExcluidas(act);
    inExcluir.value = "";
    pintarChipsExcluidas();
  }

  btnAddExcluir.addEventListener("click", agregarPalabrasDesdeInput);
  inExcluir.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      agregarPalabrasDesdeInput();
    }
  });

  btnToggleFiltro.addEventListener("click", function () {
    var estaOculto = boxFiltroDetalle.style.display === "none";
    boxFiltroDetalle.style.display = estaOculto ? "block" : "none";
    btnToggleFiltro.textContent = estaOculto ? "⚙️ Ocultar editor ▲" : "⚙️ Configurar palabras ▼";
  });

  pintarChipsExcluidas();

  function botonAgregar(ya, alAgregar) {
    var ab = document.createElement("button"); ab.type = "button";
    ab.style.cssText = ESTILO_BT + ";width:calc(100% - 28px);margin:0 14px 14px";
    if (ya) { ab.textContent = "Ya está"; ab.disabled = true; ab.style.opacity = ".5"; }
    else {
      ab.textContent = "+ Agregar";
      ab.addEventListener("click", function () {
        alAgregar(); ab.textContent = "✓ Agregado"; ab.disabled = true; ab.style.opacity = ".6";
      });
    }
    return ab;
  }
  function botonOcultarBusqueda(vid, titulo, canal) {
    var yaOculto = window.FMV_bloqueados().indexOf(vid) >= 0;
    var ob = document.createElement("button"); ob.type = "button";
    ob.style.cssText = ESTILO_BT + ";background:#6b7280;width:calc(100% - 28px);margin:0 14px 14px";
    if (yaOculto) { ob.textContent = "🙈 Oculto"; ob.disabled = true; ob.style.opacity = ".5"; }
    else {
      ob.textContent = "🙈 Ocultar video";
      ob.addEventListener("click", function () {
        window.FMV_ocultarVideo(vid, titulo, canal || "", "padre");
        ob.textContent = "🙈 Oculto"; ob.disabled = true; ob.style.opacity = ".5";
      });
    }
    return ob;
  }
  function tarjeta(img, nombre, boton) {
    var card = document.createElement("div"); card.className = "tarjeta"; card.style.cursor = "default";
    var media = document.createElement("div"); media.className = "media";
    var im = document.createElement("img"); im.src = img; im.alt = ""; media.appendChild(im);
    var nom = document.createElement("p"); nom.className = "nombre"; nom.textContent = nombre;
    card.appendChild(media); card.appendChild(nom); card.appendChild(boton);
    return card;
  }
  function seccion(titulo) {
    var h = document.createElement("h3"); h.textContent = titulo; h.style.margin = "22px 0 12px";
    var g = document.createElement("div"); g.className = "cuadricula";
    pr.appendChild(h); pr.appendChild(g);
    return g;
  }

  var ultimo = [[], []];
  function agregarVideo(vid, titulo, img) {
    var p = window.FMV_perfil, ex = misTodos().filter(function (v) { return v.id === vid; })[0];
    if (ex) { if (p) { var ps = vperf(ex).slice(); if (ps.indexOf(p) < 0) ps.push(p); var m = leer(LS_VPERF, {}); m[vid] = ps; guardar(LS_VPERF, m); } }
    else { var vs = leer(LS_VID, []), o = { id: vid, titulo: titulo, img: img }; if (p) o.perfiles = [p]; vs.push(o); guardar(LS_VID, vs); }
    guardar(LS_VOCULTOS, leer(LS_VOCULTOS, []).filter(function (q) { return q !== vid; }));
    guardar(LS_BLOQ, leer(LS_BLOQ, []).filter(function (q) { return q !== vid; }));
    guardar(LS_DET_OCULTOS, leer(LS_DET_OCULTOS, []).filter(function (x) { return x && x.id !== vid; }));
    pintar(); actualizarBotones();
  }
  function verVideos(id, nombre) {
    pr.textContent = ""; pm.textContent = "Videos de " + nombre + " — puedes agregarlos o también ocultarlos";
    var volver = document.createElement("button"); volver.type = "button"; volver.textContent = "← Volver a los resultados";
    volver.style.cssText = ESTILO_BT + ";background:#5b6b7a;margin:6px 0 0";
    volver.addEventListener("click", function () { mostrar(ultimo[0], ultimo[1]); });
    pr.appendChild(volver);
    var g = seccion("Videos"), mas = null;
    function cargar(token) {
      fetch(BASE + "playlistItems?key=" + API_KEY + "&part=snippet&maxResults=50&playlistId=UU" + id.slice(2) + (token ? "&pageToken=" + encodeURIComponent(token) : ""))
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (d.error) throw new Error(d.error.message);
          var omitidos = 0;
          (d.items || []).forEach(function (it) {
            var s = it.snippet, vid = s && s.resourceId && s.resourceId.videoId;
            if (!vid || s.title === "Private video" || s.title === "Deleted video") return;
            var titulo = dec(s.title), desc = dec(s.description || "");
            if (contienePalabraExcluida(titulo) || contienePalabraExcluida(desc)) {
              omitidos++;
              return;
            }
            var img = foto(it), ya = misVideos().some(function (o) { return o.id === vid; });
            var fr = document.createDocumentFragment();
            fr.appendChild(botonAgregar(ya, function () { agregarVideo(vid, titulo, img); }));
            fr.appendChild(botonOcultarBusqueda(vid, titulo, nombre));
            g.appendChild(tarjeta(img, titulo, fr));
          });
          if (omitidos > 0) {
            pm.textContent = "Videos de " + nombre + " · 🛡️ Se excluyeron " + omitidos + " video(s) con palabras no deseadas";
          }
          if (mas) mas.remove();
          if (d.nextPageToken) {
            mas = document.createElement("button"); mas.type = "button"; mas.textContent = "Mostrar más";
            mas.style.cssText = ESTILO_BT + ";display:block;margin:18px auto";
            mas.addEventListener("click", function () { mas.disabled = true; cargar(d.nextPageToken); });
            pr.appendChild(mas);
          }
        })
        .catch(function (e) { pm.textContent = "No se pudo cargar: " + (e && e.message ? e.message : "error"); });
    }
    cargar("");
  }
  function botonVer(id, nombre) {
    var b = document.createElement("button"); b.type = "button"; b.textContent = "📋 Ver videos";
    b.style.cssText = ESTILO_BT + ";background:#2f6fdd;width:calc(100% - 28px);margin:0 14px 14px";
    b.addEventListener("click", function () { verVideos(id, nombre); });
    return b;
  }
  var tokenSiguienteVideos = "", queryVideosActual = "";
  function mostrar(canales, videos) {
    ultimo = [canales, videos];
    pr.textContent = "";

    // Filtrar canales y videos que contengan palabras excluidas
    var canalesFiltrados = (canales || []).filter(function (it) {
      var nombre = dec(it.snippet.title || it.snippet.channelTitle || "");
      var desc = dec(it.snippet.description || "");
      return !contienePalabraExcluida(nombre) && !contienePalabraExcluida(desc);
    });

    var videosFiltrados = (videos || []).filter(function (it) {
      var titulo = dec(it.snippet.title || "");
      var canalTit = dec(it.snippet.channelTitle || "");
      var desc = dec(it.snippet.description || "");
      return !contienePalabraExcluida(titulo) && !contienePalabraExcluida(canalTit) && !contienePalabraExcluida(desc);
    });

    var excluidosTotal = ((canales || []).length - canalesFiltrados.length) + ((videos || []).length - videosFiltrados.length);

    if (canalesFiltrados.length || videosFiltrados.length) {
      var txtInfo = "Toca «+ Agregar» o «🙈 Ocultar video» en lo que quieras";
      if (excluidosTotal > 0) {
        txtInfo += " · 🛡️ Se excluyeron " + excluidosTotal + " resultado" + (excluidosTotal > 1 ? "s" : "") + " por filtro de palabras no deseadas";
      }
      pm.textContent = txtInfo;
    } else {
      if (excluidosTotal > 0) {
        pm.textContent = "Se encontraron resultados en YouTube, pero fueron excluidos por coincidir con tus palabras bloqueadas (" + obtenerPalabrasExcluidas().join(", ") + ").";
      } else {
        pm.textContent = "No encontré resultados. Prueba con otras palabras.";
      }
    }

    if (canalesFiltrados.length) {
      var g1 = seccion("Canales");
      canalesFiltrados.forEach(function (it) {
        var id = typeof it.id === "string" ? it.id : it.id.channelId, nombre = dec(it.snippet.title || it.snippet.channelTitle), img = foto(it);
        var fr = document.createDocumentFragment();
        fr.appendChild(botonAgregar(yaEsta(id), function () {
          var nuevo = { nombre: nombre, id: id, url: "https://www.youtube.com/channel/" + id, imagen: img };
          if (window.FMV_perfil) nuevo.perfiles = [window.FMV_perfil];   // entra solo al perfil activo
          var ex = leer(LS_EXTRA, []); ex.push(nuevo); guardar(LS_EXTRA, ex);
          nuevo.extra = true; todos.push(nuevo); pintar();
        }));
        fr.appendChild(botonVer(id, nombre));
        g1.appendChild(tarjeta(img, nombre, fr));
      });
    }

    if (videosFiltrados.length) {
      var g2 = seccion("Videos");
      videosFiltrados.forEach(function (it) {
        var vid = typeof it.id === "string" ? it.id : it.id.videoId, titulo = dec(it.snippet.title), img = foto(it);
        var ya = misVideos().some(function (o) { return o.id === vid; });
        var fr = document.createDocumentFragment();
        fr.appendChild(botonAgregar(ya, function () { agregarVideo(vid, titulo, img); }));
        fr.appendChild(botonOcultarBusqueda(vid, titulo, dec(it.snippet.channelTitle || "")));
        g2.appendChild(tarjeta(img, titulo, fr));
      });

      if (tokenSiguienteVideos) {
        var bMasVideos = document.createElement("button");
        bMasVideos.type = "button";
        bMasVideos.textContent = "+ Cargar más videos";
        bMasVideos.style.cssText = ESTILO_BT + ";display:block;margin:18px auto;background:#2f6fdd;font-size:15px";
        bMasVideos.addEventListener("click", function () {
          bMasVideos.disabled = true;
          bMasVideos.textContent = "Cargando más videos…";
          apiCompleta("search", "part=snippet&type=video&maxResults=20&safeSearch=strict&videoEmbeddable=true&relevanceLanguage=es&q=" + queryVideosActual + "&pageToken=" + encodeURIComponent(tokenSiguienteVideos))
            .then(function (res) {
              tokenSiguienteVideos = res.nextPageToken || "";
              var masItems = (res.items || []).filter(function (it) {
                var titulo = dec(it.snippet.title || "");
                var canalTit = dec(it.snippet.channelTitle || "");
                var desc = dec(it.snippet.description || "");
                return !contienePalabraExcluida(titulo) && !contienePalabraExcluida(canalTit) && !contienePalabraExcluida(desc);
              });
              masItems.forEach(function (it) {
                var vid = typeof it.id === "string" ? it.id : it.id.videoId, titulo = dec(it.snippet.title), img = foto(it);
                var ya = misVideos().some(function (o) { return o.id === vid; });
                var fr = document.createDocumentFragment();
                fr.appendChild(botonAgregar(ya, function () { agregarVideo(vid, titulo, img); }));
                fr.appendChild(botonOcultarBusqueda(vid, titulo, dec(it.snippet.channelTitle || "")));
                g2.appendChild(tarjeta(img, titulo, fr));
              });
              if (tokenSiguienteVideos) {
                bMasVideos.disabled = false;
                bMasVideos.textContent = "+ Cargar más videos";
                pr.appendChild(bMasVideos);
              } else {
                bMasVideos.remove();
              }
            })
            .catch(function () {
              bMasVideos.disabled = false;
              bMasVideos.textContent = "Reintentar cargar más videos";
            });
        });
        pr.appendChild(bMasVideos);
      }
    }
  }

  function ir() {
    if (sinClave) { pm.textContent = "Falta la clave de YouTube en canales-auto.js"; return; }
    var t = pq.value.trim();
    if (!t) return;
    pm.textContent = "Buscando…"; pr.textContent = "";
    tokenSiguienteVideos = ""; queryVideosActual = "";
    var vid = videoDe(t), id = idDe(t), h = handleDe(t), q = encodeURIComponent(t), p;
    if (vid) p = api("videos", "part=snippet,status&id=" + vid).then(function (v) {
      var ok = v.filter(function (x) { return !x.status || x.status.embeddable !== false; });
      if (v.length && !ok.length) throw new Error("Ese video no permite reproducirse fuera de YouTube.");
      return [[], ok];
    });
    else if (id) p = api("channels", "part=snippet&id=" + id).then(function (c) { return [c, []]; });
    else if (h) p = api("channels", "part=snippet&forHandle=" + encodeURIComponent("@" + h)).then(function (c) { return [c, []]; });
    else {
      queryVideosActual = q;
      p = Promise.all([
        api("search", "part=snippet&type=channel&maxResults=6&safeSearch=strict&relevanceLanguage=es&q=" + q),
        apiCompleta("search", "part=snippet&type=video&maxResults=20&safeSearch=strict&videoEmbeddable=true&relevanceLanguage=es&q=" + q)
      ]).then(function (r) {
        tokenSiguienteVideos = r[1].nextPageToken || "";
        return [r[0], r[1].items || []];
      });
    }
    p.then(function (r) { mostrar(r[0], r[1]); }).catch(function (e) { pm.textContent = "No se pudo buscar: " + (e && e.message ? e.message : "error desconocido"); });
  }
  pb.addEventListener("click", ir);
  pq.addEventListener("keydown", function (e) { if (e.key === "Enter") ir(); });

  function abrirConfigPalabrasExcluidas() {
    var m = modal(
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">' +
        '<h3 style="margin:0">🚫 Palabras excluidas en búsquedas</h3>' +
        '<button type="button" data-x style="' + ESTILO_BT + ';background:#5b6b7a">Cerrar</button>' +
      '</div>' +
      '<p style="margin:0 0 12px;font-size:13.5px;opacity:.8;line-height:1.4">' +
        'Los videos o canales que contengan estas palabras no aparecerán en los resultados de búsqueda (ej: <b>brujas, halloween, terror, miedo, armas</b>).' +
      '</p>' +
      '<div style="display:flex;gap:6px;margin-bottom:12px">' +
        '<input data-inp type="text" placeholder="Escribe palabras separadas por coma…" style="' + ESTILO_IN + ';margin:0;flex:1">' +
        '<button type="button" data-add style="' + ESTILO_BT + ';background:#e11d48;white-space:nowrap">+ Excluir</button>' +
      '</div>' +
      '<div data-chips style="display:flex;flex-wrap:wrap;gap:8px;padding:12px;background:#fff5f5;border:1.5px solid #fecdd3;border-radius:14px;min-height:48px"></div>' +
      '<div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-top:14px">' +
        '<button type="button" data-def style="' + ESTILO_BT + ';background:#5b6b7a;font-size:13px;padding:8px 12px">Sugeridas (brujas, halloween...)</button>' +
        '<button type="button" data-limpiar style="' + ESTILO_BT + ';background:#dc2626;font-size:13px;padding:8px 12px">Vaciar lista</button>' +
      '</div>',
      600
    );
    m.caja.querySelector("[data-x]").addEventListener("click", m.cerrar);
    var box = m.caja.querySelector("[data-chips]"),
        inp = m.caja.querySelector("[data-inp]"),
        btnAdd = m.caja.querySelector("[data-add]"),
        btnDef = m.caja.querySelector("[data-def]"),
        btnLimpiar = m.caja.querySelector("[data-limpiar]");

    function repintar() {
      box.innerHTML = "";
      var lista = obtenerPalabrasExcluidas();
      if (!lista.length) {
        var vac = document.createElement("span");
        vac.style.cssText = "font-size:13px;color:#9ca3af;font-style:italic";
        vac.textContent = "No hay palabras excluidas actualmente.";
        box.appendChild(vac);
      } else {
        lista.forEach(function (w) {
          var c = document.createElement("span");
          c.style.cssText = "display:inline-flex;align-items:center;gap:6px;background:#ffe4e6;color:#9f1239;border:1px solid #fecdd3;padding:5px 12px;border-radius:999px;font-size:13px;font-weight:700";
          var t = document.createElement("span");
          t.textContent = w;
          var bx = document.createElement("button");
          bx.type = "button";
          bx.innerHTML = "&times;";
          bx.title = "Quitar «" + w + "»";
          bx.style.cssText = "border:0;background:none;color:#e11d48;font-weight:900;cursor:pointer;padding:0 2px;font-size:15px;line-height:1";
          bx.addEventListener("click", function () {
            guardarPalabrasExcluidas(obtenerPalabrasExcluidas().filter(function (x) { return x !== w; }));
            repintar();
            pintarChipsExcluidas();
          });
          c.appendChild(t);
          c.appendChild(bx);
          box.appendChild(c);
        });
      }
      pintarChipsExcluidas();
    }

    function add() {
      var v = inp.value.trim();
      if (!v) return;
      var partes = v.split(/[,\n;]+/);
      var act = obtenerPalabrasExcluidas().slice();
      partes.forEach(function (p) {
        var n = norm(p);
        if (n && act.indexOf(n) < 0) act.push(n);
      });
      guardarPalabrasExcluidas(act);
      inp.value = "";
      repintar();
    }

    btnAdd.addEventListener("click", add);
    inp.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); add(); } });
    btnDef.addEventListener("click", function () {
      guardarPalabrasExcluidas(["brujas", "halloween", "haloween", "terror", "miedo"]);
      repintar();
    });
    btnLimpiar.addEventListener("click", function () {
      guardarPalabrasExcluidas([]);
      repintar();
    });

    repintar();
    inp.focus();
  }

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
  /* Arma el contenido completo de canales.json con lo que ves en este dispositivo */
  function armarJson() {
    var canales = todos.map(function (c) {
      var o = { nombre: c.nombre, id: c.id, url: c.url, imagen: c.imagen || "" }, ps = perfilesDe(c);
      if (ps.length < PERFS.length) o.perfiles = ps;
      return "    " + JSON.stringify(o);
    });
    var videos = misTodos().map(function (v) {
      var o = { id: v.id, titulo: v.titulo, img: v.img }, ps = vperf(v);
      if (ps.length < PERFS.length) o.perfiles = ps;
      return "    " + JSON.stringify(o);
    });
    var bloq = window.FMV_bloqueados().map(function (id) { return JSON.stringify(id); }).join(", ");
    return '{\n  "canales": [\n' + canales.join(",\n") + '\n  ],\n  "videos": [\n' + videos.join(",\n") + '\n  ],\n  "bloqueados": [' + bloq + ']\n}\n';
  }

  /* Publica canales.json directo en GitHub con un clic (token guardado solo en este dispositivo) */
  var LS_GH = "fmv_github";
  function b64(t) { var b = new TextEncoder().encode(t), s = ""; b.forEach(function (x) { s += String.fromCharCode(x); }); return btoa(s); }
  function publicar(cfg, texto) {
    var url = "https://api.github.com/repos/" + cfg.repo + "/contents/" + cfg.ruta.split("/").map(encodeURIComponent).join("/");
    var cab = { "Authorization": "Bearer " + cfg.token, "Accept": "application/vnd.github+json", "Content-Type": "application/json" };
    function intento() {
      return fetch(url + "?ref=" + encodeURIComponent(cfg.rama), { headers: cab, cache: "no-store" })
        .then(function (r) {
          if (r.status === 404) return {};
          if (!r.ok) {
            return r.json().then(function (err) {
              throw new Error(err.message || ("Error HTTP " + r.status));
            }).catch(function (err) {
              if (err instanceof Error) throw err;
              throw new Error("Error HTTP " + r.status);
            });
          }
          return r.json();
        })
        .then(function (a) {
          var cuerpo = { message: "Actualizar canales y videos FreshMind", content: b64(texto), branch: cfg.rama };
          if (a.sha) cuerpo.sha = a.sha;
          return fetch(url, { method: "PUT", headers: cab, body: JSON.stringify(cuerpo) });
        })
        .then(function (r) {
          if (!r.ok) {
            return r.json().then(function (err) {
              throw new Error(err.message || ("Error al guardar: " + r.status));
            }).catch(function (err) {
              if (err instanceof Error) throw err;
              throw new Error("Error HTTP " + r.status);
            });
          }
        });
    }
    return intento();
  }
  function errorGh(s) {
    if (s && s.message) return "Error de GitHub: " + s.message;
    if (s === 401) return "El token no es válido o venció (genera uno nuevo en GitHub con permiso Contents: Read and write).";
    if (s === 403 || s === 404) return "El token no tiene permiso en ese repositorio, o el nombre de usuario/repo o rama están mal escritos.";
    return typeof s === "number" ? "GitHub respondió con error " + s + "." : "No hay conexión con GitHub.";
  }

  function abrirActualizar() {
    var cfg = leer(LS_GH, null);
    var m = modal(
      '<h3 style="margin:0 0 8px">Actualizar para todos</h3>' +
      '<details' + (cfg ? '' : ' open') + '><summary style="cursor:pointer;font-weight:700">Datos de GitHub</summary>' +
      '<input data-a placeholder="usuario/repositorio (ej: luis98/freshmind)" style="' + ESTILO_IN + '">' +
      '<input data-b placeholder="Rama (main)" style="' + ESTILO_IN + '">' +
      '<input data-c placeholder="Archivo (canales.json)" style="' + ESTILO_IN + '">' +
      '<input data-t type="password" placeholder="' + (cfg ? 'Token guardado (vacío = conservarlo)' : 'Token de GitHub (ghp_...)') + '" style="' + ESTILO_IN + '">' +
      '<p style="font-size:13px;margin:0;line-height:1.4">Crea un token (Personal Access Token) en GitHub con permiso <b>Contents: Read and write</b> para guardar los canales en tu repositorio.</p></details>' +
      '<p data-s style="margin:10px 0 0;font-weight:600;line-height:1.4"></p>' +
      '<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap"><button type="button" data-p style="' + ESTILO_BT + '">Publicar ahora</button><button type="button" data-x style="' + ESTILO_BT + ';background:#5b6b7a">Cerrar</button></div>',
      520
    );
    var q = function (s) { return m.caja.querySelector(s); };
    var ia = q("[data-a]"), ib = q("[data-b]"), ic = q("[data-c]"), it = q("[data-t]"), st = q("[data-s]"), bp = q("[data-p]");
    ia.value = cfg ? cfg.repo : ""; ib.value = cfg ? cfg.rama : "main"; ic.value = cfg ? cfg.ruta : "canales.json";
    q("[data-x]").addEventListener("click", m.cerrar);
    bp.addEventListener("click", function () {
      var nuevo = { repo: ia.value.trim(), rama: ib.value.trim() || "main", ruta: ic.value.trim() || "canales.json", token: it.value.trim() || (cfg && cfg.token) || "" };
      if (!/^[\w.-]+\/[\w.-]+$/.test(nuevo.repo) || !nuevo.token) { st.textContent = "Completa usuario/repositorio y el token."; return; }
      bp.disabled = true; st.textContent = "Publicando en GitHub…";
      publicar(nuevo, armarJson()).then(function () {
        guardar(LS_GH, nuevo); cfg = nuevo;
        st.innerHTML = "<span style='color:#12a37f'>✓ Guardado con éxito en tu repositorio de GitHub. Todos tus dispositivos verán los cambios al abrir.</span>";
      }).catch(function (e) { st.textContent = errorGh(e); }).then(function () { bp.disabled = false; });
    });
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

  var tUltimoGuardado = 0;
  function guardarGithubAutomatico() {
    if (!window.FMV_hayCambiosPadres) return;
    var cfg = leer(LS_GH, null);
    if (!cfg || !cfg.repo || !cfg.token) return;

    var ahora = Date.now();
    if (ahora - tUltimoGuardado < 10000) {
      setTimeout(guardarGithubAutomatico, 10000 - (ahora - tUltimoGuardado));
      return;
    }
    tUltimoGuardado = ahora;
    window.FMV_hayCambiosPadres = false;

    publicar(cfg, armarJson()).then(function () {
      mostrarToast("Ya se actualizó el repositorio automáticamente.");
    }).catch(function (e) {
      console.error("Error al actualizar automáticamente en GitHub:", e);
    });
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
      var pinActual = PIN_PADRES;
      var vact = iact.value.trim();
      var vn1 = in1.value.trim();
      var vn2 = in2.value.trim();
      
      if (vact !== pinActual) {
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
      mostrarToast("Contraseña actualizada con éxito.");
    });
  }

  /* ---------- Panel de padres (se abre desde el botón 🔒 de la barra superior) ---------- */
  function actualizarBotones() {
    document.body.classList.toggle("padre", esPadre());
    if (window.FMV_recargarCanalActual) window.FMV_recargarCanalActual();
    if (window.FMV_recargarBuscador) window.FMV_recargarBuscador();
  }
  function hayOcultos() { return leer(LS_OCULTOS, []).length || leer(LS_VOCULTOS, []).length || leer(LS_BLOQ, []).length; }
  function restaurar() {
    confirmarAccion("¿Volver a mostrar todos los canales y videos que quitaste?", function () {
      guardar(LS_OCULTOS, []); guardar(LS_VOCULTOS, []); guardar(LS_BLOQ, []); guardar(LS_DET_OCULTOS, []); bloqBase = [];
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
    guardarGithubAutomatico();
  }
  /* Cierre automático: 15 s sin actividad en la página, o al pasar a segundo plano */
  var tInac = null;
  function vigilar() { clearTimeout(tInac); if (esPadre()) tInac = setTimeout(salirDePadres, 15000); }
  ["pointerdown", "touchstart", "keydown", "input", "scroll", "wheel"].forEach(function (ev) { document.addEventListener(ev, vigilar, { capture: true, passive: true }); });
  document.addEventListener("visibilitychange", function () { if (document.hidden && esPadre()) salirDePadres(); });
  window.addEventListener("pagehide", function () { if (esPadre()) salirDePadres(); });

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
      '<p style="font-size:13.5px;opacity:.8;margin:0 0 16px;line-height:1.4">Configura cuánto tiempo puede ver cada perfil al día. Al terminarse el tiempo, la pantalla se bloquea automáticamente y pide tu contraseña de siempre (<b>1234</b>).</p>' +
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
        '<div style="display:flex;gap:6px;flex-wrap:wrap">' +
        '<button type="button" data-m="15" style="' + ESTILO_BT + ';padding:6px 11px;font-size:13px;background:' + (lim === 15 ? '#12a37f' : '#2f6fdd') + '">15 min</button>' +
        '<button type="button" data-m="30" style="' + ESTILO_BT + ';padding:6px 11px;font-size:13px;background:' + (lim === 30 ? '#12a37f' : '#2f6fdd') + '">30 min</button>' +
        '<button type="button" data-m="45" style="' + ESTILO_BT + ';padding:6px 11px;font-size:13px;background:' + (lim === 45 ? '#12a37f' : '#2f6fdd') + '">45 min</button>' +
        '<button type="button" data-m="60" style="' + ESTILO_BT + ';padding:6px 11px;font-size:13px;background:' + (lim === 60 ? '#12a37f' : '#2f6fdd') + '">60 min</button>' +
        '<button type="button" data-m="0" style="' + ESTILO_BT + ';padding:6px 11px;font-size:13px;background:' + (lim === 0 ? '#12a37f' : '#6b7280') + '">Sin límite</button>' +
        '<button type="button" data-r style="' + ESTILO_BT + ';padding:6px 11px;font-size:13px;background:#d97706">Reiniciar hoy</button>' +
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
    }
    bloque("hija", "👧", "Hija", info.hija, mt.caja.querySelector("[data-hija]"));
    bloque("hijo", "👦", "Hijo", info.hijo, mt.caja.querySelector("[data-hijo]"));
  }

  function abrirPanelPadres() {
    var cantOcultos = obtenerDetallesOcultos().length;
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
    fila("🔎 Buscador general de videos", "#0284c7", function () { if (window.FMV_irBuscar) window.FMV_irBuscar(); });
    fila("🔍 Buscar en YouTube y agregar", "", abrirBuscador);
    fila("🚫 Palabras excluidas (" + obtenerPalabrasExcluidas().length + ")", "#be123c", abrirConfigPalabrasExcluidas);
    fila("⏱ Tiempo de pantalla y temporizador", "#0284c7", abrirConfigTiempos);
    fila("🙈 Videos ocultos" + (cantOcultos ? " (" + cantOcultos + ")" : ""), "#475569", abrirVideosOcultos);
    fila("🌐 Actualizar para todos", "#2f6fdd", abrirActualizar);
    if (hayOcultos()) fila("↩ Restaurar todo lo que quité", "#e08a00", restaurar);
    fila("🕘 Historial", "#6b4fd0", abrirHistorial);
    fila("👧👦 Cambiar perfil", "#b06a00", function () { if (window.FMV_cambiarPerfil) window.FMV_cambiarPerfil(); });
    fila("🔑 Cambiar contraseña", "#9333ea", abrirCambiarPin);
    fila("🚪 Salir de padres", "#5b6b7a", salirDePadres, true);
  }
  window.FMV_abrirPadres = function () { if (esPadre()) abrirPanelPadres(); else pedirPin(abrirPanelPadres); };
  actualizarBotones(); vigilar();

  var n = 0, w = setInterval(function () {
    if (grid.children.length || /No se pudo/.test(msg.textContent) || ++n > 50) { clearInterval(w); iniciar(); }
  }, 100);
})();
