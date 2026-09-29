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
  function misVideos() {
    var oc = leer(LS_VOCULTOS, []), vistos = {}, salida = [];
    videosBase.concat(leer(LS_VID, [])).forEach(function (v) {
      if (!v || !v.id || vistos[v.id] || oc.indexOf(v.id) >= 0) return;
      vistos[v.id] = 1;
      salida.push(v);
    });
    return salida;
  }
  
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

  function pintar() {
    window.FMV_CANALES = todos; // lo usa el buscador (buscador.js)
    grid.innerHTML = "";
    if (window.FMV_tabVideos) FMV_tabVideos(misVideos().length);
    if (window.FMV_repintarSelector) FMV_repintarSelector();
    todos.forEach(function (c, i) {
      var t = crearTarjeta(c, i);
      if (!t) return;
      if (esPadre()) {
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
      }
      grid.appendChild(t);
    });
    msg.hidden = grid.children.length > 0;
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
        return resolver(todos).then(pintar).then(function () { if (window.FMV_alListo) window.FMV_alListo(); });
      });
  }

  var ESTILO_IN = "width:100%;box-sizing:border-box;padding:12px;font-size:16px;border:1px solid #c9d3da;border-radius:8px;margin:8px 0;font-family:inherit";
  var ESTILO_BT = "padding:10px 16px;border:0;background:#12a37f;color:#fff;border-radius:8px;cursor:pointer;font-weight:700;font-family:inherit;font-size:15px";
  function modal(html, ancho) {
    var f = document.createElement("div");
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
      if (inp.value === PIN_PADRES) { setPadre(true); m.cerrar(); actualizarBotones(); pintar(); if (alEntrar) alEntrar(); }
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

  function mostrar(canales, videos) {
    pr.textContent = "";
    pm.textContent = (canales.length || videos.length) ? "Toca «+ Agregar» en lo que quieras" : "No encontré resultados. Prueba con otras palabras.";
    if (canales.length) {
      var g1 = seccion("Canales");
      canales.forEach(function (it) {
        var id = typeof it.id === "string" ? it.id : it.id.channelId, nombre = dec(it.snippet.title || it.snippet.channelTitle), img = foto(it);
        g1.appendChild(tarjeta(img, nombre, botonAgregar(yaEsta(id), function () {
          var nuevo = { nombre: nombre, id: id, url: "https://www.youtube.com/channel/" + id, imagen: img };
          var ex = leer(LS_EXTRA, []); ex.push(nuevo); guardar(LS_EXTRA, ex);
          nuevo.extra = true; todos.push(nuevo); pintar();
        })));
      });
    }
    if (videos.length) {
      var g2 = seccion("Videos");
      videos.forEach(function (it) {
        var vid = typeof it.id === "string" ? it.id : it.id.videoId, titulo = dec(it.snippet.title), img = foto(it);
        var ya = misVideos().some(function (o) { return o.id === vid; });
        g2.appendChild(tarjeta(img, titulo, botonAgregar(ya, function () {
          var vs = leer(LS_VID, []); vs.push({ id: vid, titulo: titulo, img: img }); guardar(LS_VID, vs);
          guardar(LS_VOCULTOS, leer(LS_VOCULTOS, []).filter(function (o) { return o !== vid; }));
          pintar(); actualizarBotones();
        })));
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
      return "    " + JSON.stringify({ nombre: c.nombre, id: c.id, url: c.url, imagen: c.imagen || "" });
    });
    var videos = misVideos().map(function (v) {
      return "    " + JSON.stringify({ id: v.id, titulo: v.titulo, img: v.img });
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
  function salirDePadres() { setPadre(false); actualizarBotones(); pintar(); }
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
    fila("🚪 Salir de padres", "#5b6b7a", salirDePadres);
  }
  window.FMV_abrirPadres = function () { if (esPadre()) abrirPanelPadres(); else pedirPin(abrirPanelPadres); };
  actualizarBotones();

  var n = 0, w = setInterval(function () {
    if (grid.children.length || /No se pudo/.test(msg.textContent) || ++n > 50) { clearInterval(w); iniciar(); }
  }, 100);
})();
