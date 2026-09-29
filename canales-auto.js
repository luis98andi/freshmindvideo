/* FreshMindVideo - Zona de padres: buscar y agregar canales de YouTube */
(function () {
  var API_KEY = "AIzaSyA7R_xoLnmY__-8cuNoP40rHhWyLyLBlbk";
  var PIN_PADRES = "1234"; // cámbialo por el PIN que quieras
  var LS_EXTRA = "fmv_extra", LS_CACHE = "fmv_cache", LS_VID = "fmv_videos";
  var BASE = "https://www.googleapis.com/youtube/v3/";
  var ID_OK = /^UC[\w-]{22}$/;
  var grid = document.getElementById("cuadricula"), msg = document.getElementById("mensaje");
  var sinClave = !API_KEY || API_KEY.indexOf("PEGA") === 0;
  var todos = [];

  function leer(k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } }
  function guardar(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function esPadre() { try { return sessionStorage.getItem("fmv_padres") === "1"; } catch (e) { return false; } }
  function setPadre(v) { try { sessionStorage.setItem("fmv_padres", v ? "1" : "0"); } catch (e) {} }
  function handleDe(u) { var m = /youtube\.com\/@([^\/?#]+)/.exec(u || ""); return m ? decodeURIComponent(m[1]) : ""; }
  function idDe(u) { var m = /youtube\.com\/channel\/(UC[\w-]{22})/.exec(u || ""); return m ? m[1] : ""; }
  function foto(it) { var t = it.snippet.thumbnails || {}; return (t.medium || t.default || t.high || {}).url || ""; }
  function dec(t) { var d = document.createElement("textarea"); d.innerHTML = t || ""; return d.value; }
  function api(ruta, p) {
    return fetch(BASE + ruta + "?key=" + API_KEY + "&" + p).then(function (r) { return r.json(); })
      .then(function (d) { if (d.error) throw new Error(d.error.message); return d.items || []; });
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
    grid.innerHTML = "";
    var vs = leer(LS_VID, []);
    if (vs.length) grid.appendChild(tarjetaMisVideos(vs));
    todos.forEach(function (c, i) {
      var t = crearTarjeta(c, i);
      if (!t) return;
      if (c.extra && esPadre()) {
        var x = document.createElement("button");
        x.textContent = "×"; x.title = "Quitar canal";
        x.style.cssText = "position:absolute;top:6px;right:6px;width:34px;height:34px;border:0;border-radius:50%;background:rgba(0,0,0,.7);color:#fff;font-size:20px;cursor:pointer;z-index:2";
        x.addEventListener("click", function (e) {
          e.stopPropagation();
          if (!confirm("¿Quitar " + c.nombre + "?")) return;
          guardar(LS_EXTRA, leer(LS_EXTRA, []).filter(function (o) { return o.id !== c.id; }));
          todos = todos.filter(function (o) { return o !== c; });
          pintar();
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
      .then(function (d) { return Array.isArray(d) ? d : (d.canales || d.channels || []); })
      .catch(function () { return []; })
      .then(function (base) {
        var extra = leer(LS_EXTRA, []).map(function (c) { c.extra = true; return c; });
        todos = base.concat(extra);
        return resolver(todos).then(pintar);
      });
  }

  /* ---------- Ventanas (funcionan bien en celular) ---------- */
  var ESTILO_IN = "width:100%;box-sizing:border-box;padding:12px;font-size:16px;border:1px solid #c9d3da;border-radius:8px;margin:8px 0;font-family:inherit";
  var ESTILO_BT = "padding:10px 16px;border:0;background:#12a37f;color:#fff;border-radius:8px;cursor:pointer;font-weight:700;font-family:inherit;font-size:15px";
  function modal(html, ancho) {
    var f = document.createElement("div");
    f.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:100;overflow:auto;padding:16px";
    var c = document.createElement("div");
    c.style.cssText = "background:#fff;border-radius:12px;padding:18px;width:100%;max-width:" + (ancho || 480) + "px;margin:4vh auto;color:#1d2b3a";
    c.innerHTML = html;
    f.appendChild(c);
    document.body.appendChild(f);
    f.addEventListener("click", function (e) { if (e.target === f) f.remove(); });
    return { caja: c, cerrar: function () { f.remove(); } };
  }

  function pedirPin() {
    var m = modal('<h3 style="margin:0 0 6px">Zona de padres</h3><input type="password" inputmode="numeric" placeholder="PIN" style="' + ESTILO_IN + '"><button style="' + ESTILO_BT + '">Entrar</button>');
    var inp = m.caja.querySelector("input"), b = m.caja.querySelector("button");
    function ok() {
      if (inp.value === PIN_PADRES) { setPadre(true); m.cerrar(); actualizarBotones(); pintar(); }
      else { alert("PIN incorrecto"); inp.value = ""; }
    }
    b.addEventListener("click", ok);
    inp.addEventListener("keydown", function (e) { if (e.key === "Enter") ok(); });
    inp.focus();
  }

  function yaEsta(id) { return todos.some(function (c) { return c.id === id; }); }

  /* ---------- Mis videos (lista de videos sueltos) ---------- */
  function tarjetaMisVideos(vs) {
    var card = document.createElement("div"); card.className = "tarjeta";
    var media = document.createElement("div"); media.className = "media";
    var im = document.createElement("img"); im.src = vs[0].img; im.alt = ""; media.appendChild(im);
    var nom = document.createElement("p"); nom.className = "nombre"; nom.textContent = "⭐ Mis videos (" + vs.length + ")";
    card.appendChild(media); card.appendChild(nom);
    card.addEventListener("click", abrirVideos);
    return card;
  }

  function abrirVideos() {
    var vs = leer(LS_VID, []);
    var m = modal('<h3 style="margin:0 0 10px">⭐ Mis videos</h3><div style="aspect-ratio:16/9;background:#000;border-radius:10px;overflow:hidden"><iframe style="width:100%;height:100%;border:0" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe></div><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;margin-top:12px"></div>', 760);
    var fr = m.caja.querySelector("iframe"), lista = m.caja.querySelector("div:last-child");
    function poner(id, auto) { fr.src = "https://www.youtube.com/embed/" + id + "?rel=0&playsinline=1&modestbranding=1" + (auto ? "&autoplay=1" : ""); }
    function dibujar() {
      lista.textContent = "";
      vs = leer(LS_VID, []);
      vs.forEach(function (v) {
        var w = document.createElement("div"); w.style.cssText = "position:relative;cursor:pointer";
        var im = document.createElement("img"); im.src = v.img; im.alt = v.titulo; im.title = v.titulo;
        im.style.cssText = "width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:8px;display:block;background:#000";
        w.appendChild(im);
        w.addEventListener("click", function () { poner(v.id, true); });
        if (esPadre()) {
          var x = document.createElement("button"); x.type = "button"; x.textContent = "×"; x.title = "Quitar video";
          x.style.cssText = "position:absolute;top:4px;right:4px;width:30px;height:30px;border:0;border-radius:50%;background:rgba(0,0,0,.7);color:#fff;font-size:18px;cursor:pointer";
          x.addEventListener("click", function (e) {
            e.stopPropagation();
            guardar(LS_VID, leer(LS_VID, []).filter(function (o) { return o.id !== v.id; }));
            dibujar(); pintar();
          });
          w.appendChild(x);
        }
        lista.appendChild(w);
      });
    }
    dibujar();
    if (vs.length) poner(vs[0].id, false);
  }

  /* ---------- Buscador en la página (estilo YouTube Kids) ---------- */
  var panel = document.createElement("div");
  panel.style.cssText = "margin-bottom:26px;display:none";
  panel.innerHTML = '<div style="display:flex;gap:8px"><input type="search" placeholder="Buscar en YouTube… (ej: dibujos osos)" style="flex:1;min-width:0;padding:14px 20px;font-size:16px;border:2px solid #12a37f;border-radius:999px;font-family:inherit;outline:0;background:#fff"><button type="button" style="' + ESTILO_BT + ';border-radius:999px;padding:0 22px">Buscar</button></div><p style="text-align:center;font-weight:600;margin:14px 0 0"></p><div data-r style="margin-top:8px"></div>';
  var pq = panel.querySelector("input"), pb = panel.querySelector("button"), pm = panel.querySelector("p"), pr = panel.querySelector("[data-r]");
  document.getElementById("vista-principal").insertBefore(panel, document.getElementById("vista-principal").firstChild);

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
        var vid = it.id.videoId, titulo = dec(it.snippet.title), img = foto(it);
        var ya = leer(LS_VID, []).some(function (o) { return o.id === vid; });
        g2.appendChild(tarjeta(img, titulo, botonAgregar(ya, function () {
          var vs = leer(LS_VID, []); vs.push({ id: vid, titulo: titulo, img: img }); guardar(LS_VID, vs); pintar();
        })));
      });
    }
  }

  function ir() {
    if (sinClave) { pm.textContent = "Falta la clave de YouTube en canales-auto.js"; return; }
    var t = pq.value.trim();
    if (!t) return;
    pm.textContent = "Buscando…"; pr.textContent = "";
    var id = idDe(t), h = handleDe(t), q = encodeURIComponent(t), p;
    if (id) p = api("channels", "part=snippet&id=" + id).then(function (c) { return [c, []]; });
    else if (h) p = api("channels", "part=snippet&forHandle=" + encodeURIComponent("@" + h)).then(function (c) { return [c, []]; });
    else p = Promise.all([
      api("search", "part=snippet&type=channel&maxResults=6&safeSearch=strict&relevanceLanguage=es&q=" + q),
      api("search", "part=snippet&type=video&maxResults=12&safeSearch=strict&videoEmbeddable=true&relevanceLanguage=es&q=" + q)
    ]);
    p.then(function (r) { mostrar(r[0], r[1]); }).catch(function () { pm.textContent = "No se pudo buscar. Intenta de nuevo."; });
  }
  pb.addEventListener("click", ir);
  pq.addEventListener("keydown", function (e) { if (e.key === "Enter") ir(); });

  /* ---------- Botón del encabezado ---------- */
  var bPrincipal = document.createElement("button");
  bPrincipal.type = "button";
  bPrincipal.style.cssText = ESTILO_BT;
  bPrincipal.addEventListener("click", function () {
    if (esPadre()) { setPadre(false); actualizarBotones(); pintar(); } else pedirPin();
  });
  document.querySelector("header").appendChild(bPrincipal);
  function actualizarBotones() {
    bPrincipal.textContent = esPadre() ? "Salir de padres" : "🔒 Padres";
    bPrincipal.style.background = esPadre() ? "#5b6b7a" : "#12a37f";
    panel.style.display = esPadre() ? "" : "none";
  }
  actualizarBotones();

  /* Espera a que la página termine su carga normal y luego la reemplaza */
  var n = 0, w = setInterval(function () {
    if (grid.children.length || /No se pudo/.test(msg.textContent) || ++n > 50) { clearInterval(w); iniciar(); }
  }, 100);
})();
