/* Módulo de Buscador de YouTube para Padres (Agregar / Bloquear Canales y Videos) */
(function () {
  'use strict';

  var ESTILO_IN = "width:100%;box-sizing:border-box;padding:12px;font-size:16px;border:1px solid #c9d3da;border-radius:8px;margin:8px 0;font-family:inherit";
  var ESTILO_BT = "padding:10px 16px;border:0;background:#12a37f;color:#fff;border-radius:8px;cursor:pointer;font-weight:700;font-family:inherit;font-size:15px";

  var modal = window.FMV_modal || window.modal;

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
    else { var vs = leer(LS_VID, []), o = { id: vid, titulo: titulo, img: img, t: Date.now() }; if (p) o.perfiles = [p]; vs.push(o); guardar(LS_VID, vs); }
    window.FMV_hayCambiosPadres = true;
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
      fetch(BASE + "playlistItems?key=" + API_KEY + "&hl=es&part=snippet&maxResults=50&playlistId=UU" + id.slice(2) + (token ? "&pageToken=" + encodeURIComponent(token) : ""))
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
          apiCompleta("search", "part=snippet&type=video&maxResults=25&safeSearch=moderate&videoEmbeddable=true&q=" + queryVideosActual + "&pageToken=" + encodeURIComponent(tokenSiguienteVideos))
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
        api("search", "part=snippet&type=channel&maxResults=6&safeSearch=moderate&q=" + q),
        apiCompleta("search", "part=snippet&type=video&maxResults=25&safeSearch=moderate&videoEmbeddable=true&q=" + q)
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



  window.FMV_abrirBuscadorYouTubePadres = abrirBuscador;
  window.FMV_abrirBuscador = abrirBuscador;
})();
