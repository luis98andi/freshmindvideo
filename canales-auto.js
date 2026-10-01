/* FreshMindVideo - Zona de padres: buscar y agregar canales de YouTube */
(function () {
  var API_KEY = "AIzaSyA7R_xoLnmY__-8cuNoP40rHhWyLyLBlbk";
  window.FMV_API_KEY = API_KEY; // la usa index.html para leer los títulos de los videos
  var PIN_PADRES = "1234"; // cámbialo por el PIN que quieras
  var LS_EXTRA = "fmv_extra", LS_CACHE = "fmv_cache", LS_VID = "fmv_videos", LS_OCULTOS = "fmv_ocultos", LS_VOCULTOS = "fmv_videos_ocultos";
  var BASE = "https://www.googleapis.com/youtube/v3/";
  var ID_OK = /^UC[\w-]{22}$/;
  var grid = document.getElementById("cuadricula"), msg = document.getElementById("mensaje");
  var sinClave = !API_KEY || API_KEY.indexOf("PEGA") === 0;
  var todos = [];
  var videosBase = []; // videos que vienen de canales.json (para todos los dispositivos)

  function leer(k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } }
  function guardar(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function esPadre() { try { return sessionStorage.getItem("fmv_padres") === "1"; } catch (e) { return false; } }
  function setPadre(v) { try { sessionStorage.setItem("fmv_padres", v ? "1" : "0"); } catch (e) {} }
  function handleDe(u) { var m = /youtube\.com\/@([^\/?#]+)/.exec(u || ""); return m ? decodeURIComponent(m[1]) : ""; }
  function idDe(u) { var m = /youtube\.com\/channel\/(UC[\w-]{22})/.exec(u || ""); return m ? m[1] : ""; }
  function foto(it) { var t = it.snippet.thumbnails || {}; return (t.medium || t.default || t.high || {}).url || ""; }
  function dec(t) { var d = document.createElement("textarea"); d.innerHTML = t || ""; return d.value; }

  var LS_BLOQ = "fmv_bloqueados", bloqBase = [];
  function videoDe(u) { var m = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/.exec(u || ""); return m ? m[1] : ""; }
  window.FMV_esPadre = esPadre;
  window.FMV_misVideos = function () { return misVideos(); };
  window.FMV_bloqueados = function () { return bloqBase.concat(leer(LS_BLOQ, [])).filter(function (x, i, a) { return a.indexOf(x) === i; }); };
  window.FMV_bloquear = function (id) { var b = leer(LS_BLOQ, []); if (b.indexOf(id) < 0) { b.push(id); guardar(LS_BLOQ, b); } };
  window.FMV_quitarPropio = function (id) {
    guardar(LS_VID, leer(LS_VID, []).filter(function (o) { return o.id !== id; }));
    var ocv = leer(LS_VOCULTOS, []); if (ocv.indexOf(id) < 0) { ocv.push(id); guardar(LS_VOCULTOS, ocv); }
    pintar(); actualizarBotones();
  };

  /* Videos = los de canales.json + los de este dispositivo, sin repetir y sin los quitados */
  function misTodos() {
    var oc = leer(LS_VOCULTOS, []), vistos = {}, salida = [];
    videosBase.concat(leer(LS_VID, [])).forEach(function (v) {
      if (!v || !v.id || vistos[v.id] || oc.indexOf(v.id) >= 0) return;
      vistos[v.id] = 1;
      salida.push(v);
    });
    return salida;
  }
  function misVideos() { var p = window.FMV_perfil; return misTodos().filter(function (v) { return visibleV(v, p); }); }
  
  function api(ruta, p) {
    return fetch(BASE + ruta + "?key=" + API_KEY + "&" + p)
      .then(function (r) {
        return r.json().then(function (d) {
          if (!r.ok || d.error) {
            var mensajeError = (d.error && d.error.message) ? d.error.message : "Error HTTP " + r.status;
            throw new Error(mensajeError);
          }
          return d.items || [];
        });
      })
      .catch(function (err) {
        if (err.message.includes("Failed to fetch") || err.message.includes("NetworkError")) {
          throw new Error("Sin conexión o clave bloqueada/restringida.");
        }
        throw err;
      });
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
        var x = document.createElement("button"); x.textContent = "×"; x.title = "Quitar video";
        x.style.cssText = "position:absolute;top:6px;right:6px;width:34px;height:34px;border:0;border-radius:50%;background:rgba(0,0,0,.7);color:#fff;font-size:20px;cursor:pointer;z-index:2";
        x.addEventListener("click", function (ev) {
          ev.stopPropagation();
          if (!confirm("¿Quitar este video?")) return;
          var ps = vperf(v).filter(function (q) { return q !== p; });
          if (p && ver && ps.length) { var m = leer(LS_VPERF, {}); m[v.id] = ps; guardar(LS_VPERF, m); pintar(); }
          else FMV_quitarPropio(v.id);
        });
        t.appendChild(x);
        t.appendChild(chipsPerfil(v, function () { return vperf(v); }, function (ps) { var m = leer(LS_VPERF, {}); m[v.id] = ps; guardar(LS_VPERF, m); pintar(); }));
      }
      gm.appendChild(t);
    });
  }

  function pintar() {
    var perfil = window.FMV_perfil;
    window.FMV_CANALES = todos.filter(function (c) { return visibleEn(c, perfil); }); // lo usa el buscador (buscador.js)
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
          if (!confirm("¿Quitar " + c.nombre + "?")) return;
          if (c.extra) guardar(LS_EXTRA, leer(LS_EXTRA, []).filter(function (o) { return o.id !== c.id; }));
          else { var oc = leer(LS_OCULTOS, []); oc.push(c.url); guardar(LS_OCULTOS, oc); }
          todos = todos.filter(function (o) { return o !== c; });
          pintar(); actualizarBotones();
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
    return fetch("canales.json", { cache: "no-cache" })
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
        // YouTube NO bloquea la aparición inicial de los canales.
        pintar();
        if (window.FMV_alListo) window.FMV_alListo();

        // 🔄 Resolver/actualizar IDs e imágenes en segundo plano.
        // La caché fmv_cache evita consultas innecesarias durante 7 días.
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

  function pedirPin(alEntrar) {
    var m = modal('<h3 style="margin:0 0 6px">Zona de padres</h3><input type="password" inputmode="numeric" placeholder="PIN" style="' + ESTILO_IN + '"><button style="' + ESTILO_BT + '">Entrar</button>');
    var inp = m.caja.querySelector("input"), b = m.caja.querySelector("button");
    function ok() {
      if (inp.value === PIN_PADRES) { setPadre(true); vigilar(); m.cerrar(); actualizarBotones(); pintar(); if (alEntrar) alEntrar(); }
      else { alert("PIN incorrecto"); inp.value = ""; }
    }
    b.addEventListener("click", ok);
    inp.addEventListener("keydown", function (e) { if (e.key === "Enter") ok(); });
    inp.focus();
  }

  function yaEsta(id) { return todos.some(function (c) { return c.id === id; }); }

  var panel = document.createElement("div");
  panel.style.cssText = "margin:0";
  panel.innerHTML = '<div style="display:flex;gap:8px"><input type="search" placeholder="Buscar o pegar enlace de YouTube…" style="flex:1;min-width:0;padding:14px 20px;font-size:16px;border:2px solid #12a37f;border-radius:999px;font-family:inherit;outline:0;background:#fff"><button type="button" style="' + ESTILO_BT + ';border-radius:999px;padding:0 22px">Buscar</button></div><p style="text-align:center;font-weight:600;margin:14px 0 0"></p><div data-r style="margin-top:8px"></div>';
  var pq = panel.querySelector("input"), pb = panel.querySelector("button"), pm = panel.querySelector("p"), pr = panel.querySelector("[data-r]");

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
    pintar(); actualizarBotones();
  }
  function verVideos(id, nombre) {
    pr.textContent = ""; pm.textContent = "Videos de " + nombre + " — toca «+ Agregar» en los que quieras";
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
          (d.items || []).forEach(function (it) {
            var s = it.snippet, vid = s && s.resourceId && s.resourceId.videoId;
            if (!vid || s.title === "Private video" || s.title === "Deleted video") return;
            var titulo = dec(s.title), img = foto(it), ya = misVideos().some(function (o) { return o.id === vid; });
            g.appendChild(tarjeta(img, titulo, botonAgregar(ya, function () { agregarVideo(vid, titulo, img); })));
          });
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
  function mostrar(canales, videos) {
    ultimo = [canales, videos];
    pr.textContent = "";
    pm.textContent = (canales.length || videos.length) ? "Toca «+ Agregar» en lo que quieras" : "No encontré resultados. Prueba con otras palabras.";
    if (canales.length) {
      var g1 = seccion("Canales");
      canales.forEach(function (it) {
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
    if (videos.length) {
      var g2 = seccion("Videos");
      videos.forEach(function (it) {
        var vid = typeof it.id === "string" ? it.id : it.id.videoId, titulo = dec(it.snippet.title), img = foto(it);
        var ya = misVideos().some(function (o) { return o.id === vid; });
        g2.appendChild(tarjeta(img, titulo, botonAgregar(ya, function () { agregarVideo(vid, titulo, img); })));
      });
    }
  }

  function ir() {
    if (sinClave) { pm.textContent = "Falta la clave de YouTube en canales-auto.js"; return; }
    var t = pq.value.trim();
    if (!t) return;
    pm.textContent = "Buscando…"; pr.textContent = "";
    var vid = videoDe(t), id = idDe(t), h = handleDe(t), q = encodeURIComponent(t), p;
    if (vid) p = api("videos", "part=snippet,status&id=" + vid).then(function (v) {
      var ok = v.filter(function (x) { return !x.status || x.status.embeddable !== false; });
      if (v.length && !ok.length) throw new Error("Ese video no permite reproducirse fuera de YouTube.");
      return [[], ok];
    });
    else if (id) p = api("channels", "part=snippet&id=" + id).then(function (c) { return [c, []]; });
    else if (h) p = api("channels", "part=snippet&forHandle=" + encodeURIComponent("@" + h)).then(function (c) { return [c, []]; });
    else p = Promise.all([
      api("search", "part=snippet&type=channel&maxResults=6&safeSearch=strict&relevanceLanguage=es&q=" + q),
      api("search", "part=snippet&type=video&maxResults=12&safeSearch=strict&videoEmbeddable=true&relevanceLanguage=es&q=" + q)
    ]);
    p.then(function (r) { mostrar(r[0], r[1]); }).catch(function (e) { pm.textContent = "No se pudo buscar: " + (e && e.message ? e.message : "error desconocido"); });
  }
  pb.addEventListener("click", ir);
  pq.addEventListener("keydown", function (e) { if (e.key === "Enter") ir(); });

  function abrirBuscador() {
    var m = modal('<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><h3 style="margin:0">Buscar en YouTube</h3><button type="button" style="' + ESTILO_BT + ';background:#5b6b7a">Cerrar</button></div><div data-h></div>', 900);
    m.caja.querySelector("button").addEventListener("click", m.cerrar);
    m.caja.querySelector("[data-h]").appendChild(panel);
    pq.focus();
  }

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
        .then(function (r) { if (r.status === 404) return {}; if (!r.ok) throw r.status; return r.json(); })
        .then(function (a) {
          var cuerpo = { message: "Actualizar canales y videos", content: b64(texto), branch: cfg.rama };
          if (a.sha) cuerpo.sha = a.sha;
          return fetch(url, { method: "PUT", headers: cab, body: JSON.stringify(cuerpo) });
        })
        .then(function (r) { if (!r.ok) throw r.status; });
    }
    return intento().catch(function (s) { if (s === 409 || s === 422) return intento(); throw s; });
  }
  function errorGh(s) {
    if (s === 401) return "El token no es válido o venció.";
    if (s === 403 || s === 404) return "El token no tiene permiso en ese repositorio, o el repositorio, la rama o el archivo están mal escritos.";
    return typeof s === "number" ? "GitHub respondió con error " + s + "." : "No hay conexión con GitHub.";
  }

  function abrirActualizar() {
    var cfg = leer(LS_GH, null);
    var m = modal(
      '<h3 style="margin:0 0 8px">Actualizar para todos</h3>' +
      '<details' + (cfg ? '' : ' open') + '><summary style="cursor:pointer;font-weight:700">Datos de GitHub</summary>' +
      '<input data-a placeholder="usuario/repositorio" style="' + ESTILO_IN + '">' +
      '<input data-b placeholder="Rama (main)" style="' + ESTILO_IN + '">' +
      '<input data-c placeholder="Archivo (canales.json)" style="' + ESTILO_IN + '">' +
      '<input data-t type="password" placeholder="' + (cfg ? 'Token guardado (vacío = conservarlo)' : 'Token de GitHub') + '" style="' + ESTILO_IN + '">' +
      '<p style="font-size:13px;margin:0;line-height:1.4">Crea un token fine-grained en GitHub, solo para este repositorio, con permiso <b>Contents: Read and write</b>. Se guarda solo en este dispositivo.</p></details>' +
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
      bp.disabled = true; st.textContent = "Publicando…";
      publicar(nuevo, armarJson()).then(function () {
        guardar(LS_GH, nuevo); cfg = nuevo;
        st.textContent = "✓ Publicado. En uno o dos minutos se verá en todos los dispositivos.";
      }).catch(function (e) { st.textContent = errorGh(e); }).then(function () { bp.disabled = false; });
    });
  }

  /* ---------- Panel de padres (se abre desde el botón 🔒 de la barra inferior) ---------- */
  function actualizarBotones() { document.body.classList.toggle("padre", esPadre()); }
  function hayOcultos() { return leer(LS_OCULTOS, []).length || leer(LS_VOCULTOS, []).length || leer(LS_BLOQ, []).length; }
  function restaurar() {
    if (confirm("¿Volver a mostrar los canales y videos que quitaste?")) {
      guardar(LS_OCULTOS, []); guardar(LS_VOCULTOS, []); guardar(LS_BLOQ, []); bloqBase = []; try { localStorage.removeItem("fmv_listas"); } catch (e) {}
      iniciar().then(actualizarBotones);
    }
  }
  function salirDePadres() {
    setPadre(false); clearTimeout(tInac);
    [].forEach.call(document.querySelectorAll(".fmv-modal"), function (m) { m.remove(); });
    actualizarBotones(); pintar();
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
      f.innerHTML = '<img src="https://i.ytimg.com/vi/' + encodeURIComponent(x.id) + '/mqdefault.jpg" alt="" style="width:120px;aspect-ratio:16/9;object-fit:cover;border-radius:10px;background:#000;flex:none"><div style="min-width:0"><div data-n style="font-weight:700;line-height:1.25"></div><div data-s style="font-size:.8rem;opacity:.7"></div></div>';
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
  function abrirPanelPadres() {
    var m = modal('<h3 style="margin:0 0 4px">🔒 Zona de padres</h3><p style="margin:0 0 14px;font-size:14px;opacity:.75">Aquí agregas y quitas contenido para tus hijos.</p><div data-l style="display:flex;flex-direction:column;gap:10px"></div>', 420);
    var l = m.caja.querySelector("[data-l]");
    function fila(texto, color, fn) {
      var b = document.createElement("button"); b.type = "button"; b.textContent = texto;
      b.style.cssText = ESTILO_BT + ";width:100%;padding:15px 18px;font-size:16px;text-align:left" + (color ? ";background:" + color : "");
      b.addEventListener("click", function () { m.cerrar(); fn(); });
      l.appendChild(b);
    }
    fila("🔍 Buscar en YouTube y agregar", "", abrirBuscador);
    fila("🌐 Actualizar para todos", "#2f6fdd", abrirActualizar);
    if (hayOcultos()) fila("↩ Restaurar lo que quité", "#e08a00", restaurar);
    fila("🕘 Historial", "#6b4fd0", abrirHistorial);
    fila("👧👦 Cambiar perfil", "#b06a00", function () { if (window.FMV_cambiarPerfil) FMV_cambiarPerfil(); });
    fila("🚪 Salir de padres", "#5b6b7a", salirDePadres);
  }
  window.FMV_abrirPadres = function () { if (esPadre()) abrirPanelPadres(); else pedirPin(abrirPanelPadres); };
  actualizarBotones(); vigilar();

  var n = 0, w = setInterval(function () {
    if (grid.children.length || /No se pudo/.test(msg.textContent) || ++n > 50) { clearInterval(w); iniciar(); }
  }, 100);
})();