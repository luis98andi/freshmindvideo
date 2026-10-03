/* FreshMindVideo - Buscador de videos de los canales agregados */
(function () {
  var ID_OK = /^UC[\w-]{22}$/;
  var TOPE = 2000;          // máximo de videos por canal en el índice
  var DOS_DIAS = 1728e5;    // cada cuánto se revisan videos nuevos
  var POR_PAGINA = 48;      // resultados que se muestran cada vez

  var vista = document.getElementById("vista-principal");
  var cuadricula = document.getElementById("cuadricula");
  if (!vista || !cuadricula) return;

  var indice = {};          // id de canal -> { id, nombre, t, ids, titulos, norm }
  var db = null, cargado = false, pendiente = false;
  var ocupado = false, hechos = 0, total = 0, fallos = 0, sinClave = false;
  var textoActual = "", resultados = [], mostrados = 0, espera = null, sugerenciaActual = "";

  /* ---------- Estilos y caja de búsqueda ---------- */
  var css = document.createElement("style");
  css.textContent =
    "#buscador{margin:0 0 22px}" +
    "#buscador input{width:100%;padding:16px 22px;font-size:17px;border:0;border-radius:999px;font-family:inherit;outline:0;background:#fff;color:var(--texto);box-shadow:0 3px 10px rgba(20,60,100,.2);-webkit-appearance:none;appearance:none}" +
    "#buscador .estado{text-align:center;font-weight:700;margin:12px 0 0;min-height:1.2em;font-size:.95rem}" +
    ".fmv-res{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,260px),1fr));gap:16px;margin-top:16px}" +
    ".fmv-res button{border:0;padding:0;background:var(--tarjeta);color:var(--texto);border-radius:20px;overflow:hidden;cursor:pointer;text-align:left;font-family:inherit;display:flex;flex-direction:column;box-shadow:0 3px 10px rgba(20,60,100,.2);transition:transform .15s ease,box-shadow .15s ease}" +
    ".fmv-res button:hover{transform:translateY(-3px);box-shadow:0 6px 14px rgba(29,43,58,.18)}" +
    ".fmv-res img{width:100%;aspect-ratio:16/9;object-fit:cover;display:block;background:#000}" +
    ".fmv-res .t{padding:12px 16px 2px;font-size:1rem;font-weight:800;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}" +
    ".fmv-res .c{padding:0 16px 14px;font-size:.78rem;opacity:.7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
    ".fmv-mas{display:block;margin:18px auto 0;padding:10px 22px;border:0;background:var(--acento);color:#fff;border-radius:999px;cursor:pointer;font-weight:800;font-family:inherit;font-size:15px}" +
    ".fmv-item-wrapper{position:relative;display:flex;flex-direction:column;width:100%}" +
    ".fmv-btn-ocultar-item{position:absolute;top:8px;right:8px;z-index:10;display:none;align-items:center;gap:4px;background:#e11d48;color:#fff;border:0;border-radius:999px;padding:6px 12px;font-size:12.5px;font-weight:800;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.4);transition:transform .15s ease,background .15s ease}" +
    ".fmv-btn-ocultar-item:hover{transform:scale(1.06);background:#be123c}" +
    "body.padre .fmv-btn-ocultar-item{display:inline-flex !important}";
  document.head.appendChild(css);

  var caja = document.createElement("div");
  caja.id = "buscador";
  caja.innerHTML = '<input type="search" placeholder="Buscar videos en mis canales…" aria-label="Buscar videos" autocomplete="off"><p class="estado"></p>';
  var entrada = caja.querySelector("input"), estado = caja.querySelector(".estado");
  var zona = document.createElement("div");
  zona.hidden = true;
  zona.id = "fmv-zona";
  vista.insertBefore(caja, vista.firstChild);
  vista.insertBefore(zona, cuadricula);

  /* ---------- Utilidades ---------- */
  function norm(t) {
    var s = String(t || "").toLowerCase();
    try { s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); } catch (e) {}
    return s;
  }

  function canalesActuales() {
    var l = window.FMV_CANALES;
    return Array.isArray(l) ? l.filter(function (c) { return c && ID_OK.test((c.id || "").trim()); }) : [];
  }

  /* ---------- Guardado en el navegador (IndexedDB) ---------- */
  function abrirDB(cb) {
    var r, hecho = false;
    function fin(x) { if (!hecho) { hecho = true; cb(x); } }
    try { r = indexedDB.open("fmv_buscador", 1); } catch (e) { fin(null); return; }
    r.onupgradeneeded = function () { r.result.createObjectStore("canales", { keyPath: "id" }); };
    r.onsuccess = function () { fin(r.result); };
    r.onerror = function () { fin(null); };
    r.onblocked = function () { fin(null); };
  }

  var cacheVocabulario = null;

  function guardarCanal(r) {
    if (!db) return;
    try {
      db.transaction("canales", "readwrite").objectStore("canales")
        .put({ id: r.id, nombre: r.nombre, t: r.t, ids: r.ids, titulos: r.titulos, playlists: r.playlists });
      cacheVocabulario = null;
    } catch (e) {}
  }

  function terminarCarga() {
    if (cargado) return;
    cargado = true;
    if (textoActual) refrescar();
    if (pendiente) sincronizar();
  }

  abrirDB(function (d) {
    db = d;
    if (!db) { terminarCarga(); return; }
    try {
      var q = db.transaction("canales", "readonly").objectStore("canales").getAll();
      q.onsuccess = function () {
        (q.result || []).forEach(function (r) {
          if (r && r.ids && r.titulos) {
            r.norm = r.titulos.map(norm);
            indice[r.id] = r;
          }
        });
        cacheVocabulario = null;
        terminarCarga();
      };
      q.onerror = terminarCarga;
    } catch (e) { terminarCarga(); }
  });

  /* ---------- Traer los videos de un canal (YouTube Data API) ---------- */
  function pagina(lista, token) {
    var url = "https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=" +
      encodeURIComponent(lista) + "&key=" + encodeURIComponent(window.FMV_API_KEY) +
      (token ? "&pageToken=" + encodeURIComponent(token) : "");
    return fetch(url)
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d.error) throw new Error(d.error.message || "error");
        var v = [];
        (d.items || []).forEach(function (it) {
          var s = it.snippet;
          if (!s || !s.resourceId || !s.resourceId.videoId) return;
          if (s.title === "Private video" || s.title === "Deleted video") return;
          v.push({ id: s.resourceId.videoId, titulo: s.title });
        });
        return { videos: v, siguiente: d.nextPageToken || "" };
      });
  }

  function traerPlaylists(c) {
    if (!window.FMV_API_KEY) return Promise.resolve([]);
    var url = "https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&maxResults=50&channelId=" +
      encodeURIComponent(c.id) + "&key=" + encodeURIComponent(window.FMV_API_KEY);
    return fetch(url)
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d.error) return [];
        var pls = [];
        (d.items || []).forEach(function (it) {
          var s = it.snippet;
          if (!s) return;
          var title = s.title || "";
          var desc = s.description || "";
          if (window.FMV_contienePalabraExcluida && (window.FMV_contienePalabraExcluida(title) || window.FMV_contienePalabraExcluida(desc))) {
            return;
          }
          var thumbs = s.thumbnails || {};
          var img = (thumbs.medium || thumbs.default || thumbs.high || {}).url || "";
          var count = it.contentDetails ? it.contentDetails.itemCount : 0;
          pls.push({ id: it.id, titulo: title, count: count, img: img });
        });
        return pls;
      })
      .catch(function () { return []; });
  }

  function indexarCanal(c) {
    var lista = "UU" + c.id.slice(2), ids = [], tit = [];
    function sig(token) {
      return pagina(lista, token).then(function (p) {
        p.videos.forEach(function (v) { ids.push(v.id); tit.push(v.titulo); });
        if (p.siguiente && ids.length < TOPE) return sig(p.siguiente);
      });
    }
    return sig("").then(function () {
      return traerPlaylists(c).then(function (pls) {
        var r = { id: c.id, nombre: c.nombre, t: Date.now(), ids: ids, titulos: tit, norm: tit.map(norm), playlists: pls };
        indice[c.id] = r;
        guardarCanal(r);
      });
    });
  }

  /* Si el canal ya estaba indexado, solo se piden los 50 videos más nuevos */
  function refrescarCanal(c) {
    var r = indice[c.id];
    return Promise.all([
      pagina("UU" + c.id.slice(2), ""),
      traerPlaylists(c)
    ]).then(function (res) {
      var p = res[0];
      var pls = res[1];
      var ya = {};
      r.ids.forEach(function (id) { ya[id] = 1; });
      var nuevos = p.videos.filter(function (v) { return !ya[v.id]; });
      if (nuevos.length) {
        r.ids = nuevos.map(function (v) { return v.id; }).concat(r.ids);
        r.titulos = nuevos.map(function (v) { return v.titulo; }).concat(r.titulos);
        r.norm = r.titulos.map(norm);
      }
      r.nombre = c.nombre;
      r.playlists = pls;
      r.t = Date.now();
      guardarCanal(r);
    });
  }

  function sincronizar() {
    if (!window.FMV_API_KEY) { sinClave = true; avisar(); return; }
    if (!cargado) { pendiente = true; return; }
    if (ocupado) return;
    var ahora = Date.now();
    var pend = canalesActuales().filter(function (c) {
      var r = indice[c.id];
      return !r || !r.playlists || ahora - r.t > DOS_DIAS;
    });
    if (!pend.length) return;
    ocupado = true; total = pend.length; hechos = 0; fallos = 0;
    avisar();
    function siguiente() {
      var c = pend.shift();
      if (!c) return Promise.resolve();
      return (indice[c.id] ? refrescarCanal(c) : indexarCanal(c))
        .catch(function () { fallos++; })
        .then(function () { hechos++; refrescar(); return siguiente(); });
    }
    Promise.all([siguiente(), siguiente(), siguiente()]).then(function () {
      ocupado = false;
      refrescar();
    });
  }

  /* ---------- Diccionario de términos relacionados para búsquedas infantiles ---------- */
  var RELACIONES = {
    marioneta: ["titere", "titeres", "juguete de mano", "muñeco", "muñecos", "muneco"],
    titere: ["marioneta", "juguete de mano", "muñeco", "muneco"],
    titeres: ["marionetas", "juguete de mano", "muñecos"],
    gato: ["gatito", "gatitos", "miau", "felino", "mascotas"],
    gatito: ["gato", "miau", "felino"],
    gatitos: ["gato", "gatos", "miau"],
    perro: ["perrito", "perritos", "canino", "guau", "cachorro", "mascotas"],
    perrito: ["perro", "guau", "cachorro"],
    auto: ["carro", "coche", "vehiculo", "camion", "ruedas"],
    carro: ["auto", "coche", "camion", "ruedas"],
    coche: ["auto", "carro", "vehiculo"],
    dinosaurio: ["dino", "dinos", "rex", "t-rex", "jurasico"],
    cancion: ["canciones", "musica", "cantar", "ronda", "tema"],
    musica: ["cancion", "canciones", "melodia", "ritmo"],
    dormir: ["sueño", "cuna", "nana", "luna", "estrellita", "noche"],
    comer: ["comida", "fruta", "frutas", "verdura", "verduras", "alimento"],
    bebe: ["bebes", "nene", "pequeño", "chiquito"],
    jugar: ["juego", "juguete", "juguetes", "diversion"],
    colores: ["color", "pintar", "arcoiris", "amarillo", "azul", "rojo", "verde"],
    numeros: ["contar", "123", "numero"],
    letras: ["abecedario", "alfabeto", "abc", "vocal", "vocales"],
    flauta: ["musica", "cancion", "canciones", "instrumento", "melodia", "cantar"],
    guitarra: ["musica", "cancion", "canciones", "instrumento", "melodia", "cantar"],
    piano: ["musica", "cancion", "canciones", "instrumento", "melodia", "cantar"],
    violin: ["musica", "cancion", "canciones", "instrumento", "melodia", "cantar"],
    tambor: ["musica", "cancion", "canciones", "instrumento", "melodia", "cantar", "ritmo"],
    trompeta: ["musica", "cancion", "canciones", "instrumento", "melodia", "cantar"],
    instrumento: ["musica", "cancion", "canciones", "melodia", "cantar", "guitarra", "piano", "flauta"]
  };
  var resultadosRelacionados = [];

  /* ---------- Corrector ortográfico ligero (Distancia de Levenshtein) ---------- */
  function distancia(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    var matrix = [];
    for (var i = 0; i <= b.length; i++) matrix[i] = [i];
    for (var j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (var i = 1; i <= b.length; i++) {
      for (var j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // sustitución
            Math.min(
              matrix[i][j - 1] + 1, // inserción
              matrix[i - 1][j] + 1  // eliminación
            )
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }

  function obtenerVocabulario() {
    if (cacheVocabulario) return cacheVocabulario;
    var voc = {};
    canalesActuales().forEach(function (c) {
      var r = indice[c.id];
      if (!r) return;
      (r.titulos || []).forEach(function (t) {
        var palabras = norm(t).split(/\W+/).filter(function (w) { return w.length > 2; });
        palabras.forEach(function (w) { voc[w] = (voc[w] || 0) + 1; });
      });
      if (r.playlists) {
        r.playlists.forEach(function (pl) {
          var palabras = norm(pl.titulo).split(/\W+/).filter(function (w) { return w.length > 2; });
          palabras.forEach(function (w) { voc[w] = (voc[w] || 0) + 1; });
        });
      }
    });
    cacheVocabulario = voc;
    return voc;
  }

  function corregirPalabra(w, voc) {
    var mejor = null, mejorDist = 99, mejorFreq = 0;
    var lim = w.length <= 4 ? 1 : 2;
    for (var v in voc) {
      if (v === w) return w;
      if (Math.abs(v.length - w.length) > lim) continue;
      var d = distancia(w, v);
      if (d <= lim) {
        if (d < mejorDist || (d === mejorDist && voc[v] > mejorFreq)) {
          mejorDist = d;
          mejorFreq = voc[v];
          mejor = v;
        }
      }
    }
    return mejor || w;
  }

  /* ---------- Buscar y mostrar ---------- */
  function calcular(texto) {
    var palabras = norm(texto).split(/\s+/).filter(Boolean);
    var res = [], resRel = [];
    var exactos = {};
    var excluidas = (window.FMV_palabrasExcluidas ? window.FMV_palabrasExcluidas() : []).map(norm).filter(Boolean);
    canalesActuales().forEach(function (c) {
      var r = indice[c.id];
      if (!r) return;

      // Buscar en las listas de reproducción (playlists) de este canal
      if (r.playlists && r.playlists.length) {
        r.playlists.forEach(function (pl) {
          var tituloNorm = norm(pl.titulo);
          var omitirPl = false;
          for (var ex = 0; ex < excluidas.length; ex++) {
            if (tituloNorm.indexOf(excluidas[ex]) >= 0) {
              omitirPl = true;
              break;
            }
          }
          if (omitirPl) return;

          // Filtrar stop-words genéricas que el usuario usa al buscar listas, p.ej. "lista de cuna" -> buscar "cuna"
          var palabrasPl = palabras.filter(function (p) {
            return ["lista", "listas", "reproduccion", "reproducciones", "de", "la", "el", "un", "para", "los", "las", "con", "en", "del", "mi", "mis", "canal", "canales"].indexOf(p) < 0;
          });
          if (palabrasPl.length === 0) palabrasPl = palabras;

          var ok = true;
          for (var k = 0; k < palabrasPl.length; k++) {
            if (tituloNorm.indexOf(palabrasPl[k]) < 0) { ok = false; break; }
          }
          if (ok) {
            res.push({ canal: c, esPlaylist: true, id: pl.id, titulo: pl.titulo, img: pl.img, count: pl.count });
          }
        });
      }

      var bloq = window.FMV_bloqueados ? FMV_bloqueados() : [];
      for (var i = 0; i < r.norm.length; i++) {
        var vid = r.ids[i];
        if (bloq.indexOf(vid) >= 0) continue;
        var omitirPorExclusion = false;
        for (var ex = 0; ex < excluidas.length; ex++) {
          if (r.norm[i].indexOf(excluidas[ex]) >= 0) {
            omitirPorExclusion = true;
            break;
          }
        }
        if (omitirPorExclusion) continue;
        var ok = true;
        for (var k = 0; k < palabras.length; k++) {
          if (r.norm[i].indexOf(palabras[k]) < 0) { ok = false; break; }
        }
        if (ok) {
          exactos[vid] = 1;
          res.push({ canal: c, id: vid, titulo: r.titulos[i] });
        }
      }
    });

    // Búsqueda de términos relacionados (sinónimos como marioneta -> juguete de mano, gato -> miau, felino)
    var terminosRel = [];
    palabras.forEach(function (p) {
      if (RELACIONES[p]) {
        RELACIONES[p].forEach(function (sin) { terminosRel.push(norm(sin)); });
      }
    });

    if (terminosRel.length) {
      var yaRel = {};
      canalesActuales().forEach(function (c) {
        var r = indice[c.id];
        if (!r) return;
        var bloq = window.FMV_bloqueados ? FMV_bloqueados() : [];
        for (var j = 0; j < r.norm.length; j++) {
          var idRel = r.ids[j];
          if (exactos[idRel] || yaRel[idRel] || bloq.indexOf(idRel) >= 0) continue;
          var omitirRel = false;
          for (var exr = 0; exr < excluidas.length; exr++) {
            if (r.norm[j].indexOf(excluidas[exr]) >= 0) {
              omitirRel = true;
              break;
            }
          }
          if (omitirRel) continue;
          var coincide = false;
          for (var m = 0; m < terminosRel.length; m++) {
            if (r.norm[j].indexOf(terminosRel[m]) >= 0) { coincide = true; break; }
          }
          if (coincide) {
            yaRel[idRel] = 1;
            resRel.push({ canal: c, id: idRel, titulo: r.titulos[j], esRelacionado: true });
          }
        }
      });
    }

    resultados = res;
    resultadosRelacionados = resRel;

    // Calcular sugerencia de corrección si no hay resultados exactos
    sugerenciaActual = "";
    if (resultados.length === 0) {
      var voc = obtenerVocabulario();
      var palabrasCorregidas = palabras.map(function (w) {
        return corregirPalabra(w, voc);
      });
      var textoCorregido = palabrasCorregidas.join(" ");
      if (textoCorregido !== palabras.join(" ")) {
        sugerenciaActual = textoCorregido;
      }
    }
  }

  function avisar() {
    var partes = [];
    if (!textoActual) {
      estado.textContent = ocupado ? "Preparando el buscador… " + hechos + "/" + total + " canales" : "Escribe lo que quieres ver 🔍";
      var sugEl = caja.querySelector(".sug-box");
      if (sugEl) sugEl.remove();
      return;
    }
    var cant = resultados.length;
    var cantRel = resultadosRelacionados.length;
    if (cant > 0) {
      partes.push(cant + " video" + (cant > 1 ? "s" : "") + " encontrados");
      if (cantRel > 0) partes.push("(+ " + cantRel + " relacionados)");
    } else if (cantRel > 0) {
      partes.push(cantRel + " videos relacionados encontrados");
    } else if (sinClave) {
      partes.push("El buscador necesita la clave de YouTube.");
    } else {
      partes.push("No encontré nada relacionado con tu búsqueda.");
    }
    if (ocupado) partes.push("(aún preparando: " + hechos + "/" + total + " canales)");
    else if (fallos) partes.push("(" + fallos + " canales no se pudieron cargar)");
    estado.textContent = partes.join(" ");

    var sugEl = caja.querySelector(".sug-box");
    if (sugEl) sugEl.remove();

    if (resultados.length === 0 && sugerenciaActual && sugerenciaActual !== norm(textoActual)) {
      var sBox = document.createElement("p");
      sBox.className = "sug-box";
      sBox.style.cssText = "text-align:center;font-size:1rem;margin:10px 0 0;font-weight:700;color:var(--texto);opacity:.95";
      sBox.innerHTML = '¿Quizás quisiste decir: <span style="color:var(--acento);cursor:pointer;text-decoration:underline" data-sug>' + sugerenciaActual + '</span>?';
      sBox.querySelector("[data-sug]").addEventListener("click", function () {
        entrada.value = sugerenciaActual;
        lanzar();
      });
      caja.appendChild(sBox);
    }
  }

  function tarjeta(r) {
    var cont = document.createElement("div");
    cont.className = "fmv-item-wrapper";

    if (r.esPlaylist) {
      // Es una tarjeta de lista de reproducción (carpeta)
      var b = document.createElement("button");
      b.type = "button";
      b.style.cssText = "display:flex;flex-direction:column;align-items:stretch;width:100%;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 3px 10px rgba(20,60,100,.15);cursor:pointer;border:3px solid #6b2fa8;transition:transform 0.15s;padding:0;height:100%";
      
      var port = document.createElement("div");
      port.style.cssText = "aspect-ratio:16/9;position:relative;background:#dfe6ea;width:100%";
      
      if (r.img) {
        var im = document.createElement("img");
        im.src = r.img;
        im.alt = "";
        im.style.cssText = "width:100%;height:100%;object-fit:cover;display:block;";
        port.appendChild(im);
      }
      
      var tag = document.createElement("span");
      tag.style.cssText = "position:absolute;bottom:8px;right:8px;background:rgba(107,47,168,0.95);color:#fff;font-weight:800;font-size:11px;padding:3px 8px;border-radius:6px;box-shadow:0 2px 4px rgba(0,0,0,0.25);";
      tag.textContent = "📂 " + r.count + " videos";
      port.appendChild(tag);
      
      var info = document.createElement("div");
      info.style.cssText = "padding:12px 12px 2px;font-weight:800;font-size:14px;color:#1d2b3a;text-align:left;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;height:36px;box-sizing:content-box;";
      info.textContent = r.titulo;
      
      var canalName = document.createElement("span");
      canalName.style.cssText = "display:block;padding:0 12px 12px;font-size:.78rem;opacity:.7;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis";
      canalName.textContent = "En canal: " + r.canal.nombre;
      
      b.appendChild(port);
      b.appendChild(info);
      b.appendChild(canalName);
      
      b.addEventListener("click", function () {
        window.scrollTo(0, 0);
        if (typeof window.FMV_abrirPlaylistDesdeBuscador === "function") {
          window.FMV_abrirPlaylistDesdeBuscador(r.canal.id, r.canal.nombre, r.id, r.titulo);
        }
      });
      cont.appendChild(b);
      return cont;
    }

    var b = document.createElement("button");
    b.type = "button";
    b.style.cssText = "width:100%;height:100%";
    var img = document.createElement("img");
    img.src = "https://i.ytimg.com/vi/" + r.id + "/mqdefault.jpg";
    img.alt = "";
    img.loading = "lazy";
    var t = document.createElement("span"); t.className = "t"; t.textContent = r.titulo;
    var c = document.createElement("span"); c.className = "c"; c.textContent = r.canal.nombre;
    b.appendChild(img); b.appendChild(t); b.appendChild(c);
    b.addEventListener("click", function () {
      window.scrollTo(0, 0);
      if (typeof window.FMV_abrirCanal === "function") window.FMV_abrirCanal(r.canal.id, r.canal.nombre, r.id);
    });
    cont.appendChild(b);

    if (window.FMV_esPadre && window.FMV_esPadre()) {
      var btnOcultar = document.createElement("button");
      btnOcultar.type = "button";
      btnOcultar.className = "fmv-btn-ocultar-item";
      btnOcultar.title = "Ocultar este video para siempre";
      btnOcultar.innerHTML = "🙈 <span>Ocultar</span>";
      btnOcultar.addEventListener("click", function (ev) {
        ev.stopPropagation();
        ev.preventDefault();
        function ejecutarOcultar() {
          if (window.FMV_ocultarVideo) {
            window.FMV_ocultarVideo(r.id, r.titulo, r.canal.nombre, "padre");
          } else if (window.FMV_bloquear) {
            window.FMV_bloquear(r.id, r.titulo, r.canal.nombre, "padre");
          }
          cont.style.transition = "transform .25s ease, opacity .25s ease";
          cont.style.transform = "scale(0.85)";
          cont.style.opacity = "0";
          setTimeout(function () {
            cont.remove();
            resultados = resultados.filter(function (x) { return x.id !== r.id; });
            if (resultadosRelacionados) {
              resultadosRelacionados = resultadosRelacionados.filter(function (x) { return x.id !== r.id; });
            }
            avisar();
          }, 260);
        }
        function proceder() {
          if (window.FMV_confirmar) {
            window.FMV_confirmar("¿Ocultar este video («" + r.titulo + "»)? No volverá a aparecer.", ejecutarOcultar);
          } else {
            ejecutarOcultar();
          }
        }
        proceder();
      });
      cont.appendChild(btnOcultar);
    }

    return cont;
  }

  function agregarMas() {
    var g = zona.querySelector(".fmv-res"), viejo = zona.querySelector(".fmv-mas");
    if (viejo) viejo.remove();
    var hasta = Math.min(resultados.length, mostrados + POR_PAGINA);
    for (var i = mostrados; i < hasta; i++) g.appendChild(tarjeta(resultados[i]));
    mostrados = hasta;
    if (mostrados < resultados.length) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "fmv-mas";
      b.textContent = "Mostrar más (" + (resultados.length - mostrados) + ")";
      b.addEventListener("click", agregarMas);
      zona.appendChild(b);
    }
  }

  var mostradosRel = 0;

  function pintarResultados() {
    zona.textContent = "";
    var g = document.createElement("div");
    g.className = "fmv-res";
    zona.appendChild(g);
    mostrados = 0;
    agregarMas();

    if (resultadosRelacionados && resultadosRelacionados.length) {
      var secRel = document.createElement("div");
      secRel.style.cssText = "margin-top:34px;padding-top:22px;border-top:3px dashed rgba(20,60,100,.18)";
      
      var hRel = document.createElement("h4");
      hRel.style.cssText = "margin:0 0 6px;font-size:1.15rem;font-weight:800;color:var(--texto);display:flex;align-items:center;gap:8px";
      hRel.innerHTML = "<span style='font-size:1.4rem'>💡</span> Videos relacionados a tu búsqueda (coincidencias no exactas)";
      
      var pRel = document.createElement("p");
      pRel.style.cssText = "margin:0 0 16px;font-size:.9rem;opacity:.8;font-weight:600";
      pRel.textContent = "Estos videos tratan sobre temas parecidos a lo que buscas (por ejemplo títeres, juguetes de mano, canciones o animalitos).";
      
      var gRel = document.createElement("div");
      gRel.className = "fmv-res";
      
      secRel.appendChild(hRel);
      secRel.appendChild(pRel);
      secRel.appendChild(gRel);
      zona.appendChild(secRel);

      mostradosRel = 0;
      function agregarMasRel() {
        var viejoRel = secRel.querySelector(".fmv-mas-rel");
        if (viejoRel) viejoRel.remove();
        var hastaRel = Math.min(resultadosRelacionados.length, mostradosRel + POR_PAGINA);
        for (var i = mostradosRel; i < hastaRel; i++) gRel.appendChild(tarjeta(resultadosRelacionados[i]));
        mostradosRel = hastaRel;
        if (mostradosRel < resultadosRelacionados.length) {
          var bRel = document.createElement("button");
          bRel.type = "button"; bRel.className = "fmv-mas fmv-mas-rel";
          bRel.textContent = "Mostrar más relacionados (" + (resultadosRelacionados.length - mostradosRel) + ")";
          bRel.addEventListener("click", agregarMasRel);
          secRel.appendChild(bRel);
        }
      }
      agregarMasRel();
    }
  }

  /* Mientras se indexa, vuelve a buscar y solo repinta si cambió la cantidad */
  function refrescar() {
    if (textoActual) {
      var n = resultados.length + resultadosRelacionados.length;
      calcular(textoActual);
      if (resultados.length + resultadosRelacionados.length !== n) pintarResultados();
    }
    avisar();
  }

  function lanzar() {
    textoActual = entrada.value.trim();
    if (!textoActual) {
      resultados = [];
      zona.hidden = true;
      zona.textContent = "";
      avisar();
      return;
    }
    sincronizar();
    calcular(textoActual);
    zona.hidden = false;
    pintarResultados();
    avisar();
  }

  entrada.addEventListener("focus", sincronizar);
  entrada.addEventListener("input", function () {
    clearTimeout(espera);
    espera = setTimeout(lanzar, 220);
  });
  entrada.addEventListener("keydown", function (e) {
    if (e.key === "Enter") { clearTimeout(espera); lanzar(); }
  });

  window.FMV_recargarBuscador = function () {
    cacheVocabulario = null;
    if (textoActual) {
      calcular(textoActual);
      pintarResultados();
    }
    avisar();
  };
})();
