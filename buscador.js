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
  var textoActual = "", resultados = [], mostrados = 0, espera = null;

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
    ".fmv-mas{display:block;margin:18px auto 0;padding:10px 22px;border:0;background:var(--acento);color:#fff;border-radius:999px;cursor:pointer;font-weight:800;font-family:inherit;font-size:15px}";
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

  function guardarCanal(r) {
    if (!db) return;
    try {
      db.transaction("canales", "readwrite").objectStore("canales")
        .put({ id: r.id, nombre: r.nombre, t: r.t, ids: r.ids, titulos: r.titulos });
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
          if (r && r.ids && r.titulos) { r.norm = r.titulos.map(norm); indice[r.id] = r; }
        });
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

  function indexarCanal(c) {
    var lista = "UU" + c.id.slice(2), ids = [], tit = [];
    function sig(token) {
      return pagina(lista, token).then(function (p) {
        p.videos.forEach(function (v) { ids.push(v.id); tit.push(v.titulo); });
        if (p.siguiente && ids.length < TOPE) return sig(p.siguiente);
      });
    }
    return sig("").then(function () {
      var r = { id: c.id, nombre: c.nombre, t: Date.now(), ids: ids, titulos: tit, norm: tit.map(norm) };
      indice[c.id] = r;
      guardarCanal(r);
    });
  }

  /* Si el canal ya estaba indexado, solo se piden los 50 videos más nuevos */
  function refrescarCanal(c) {
    var r = indice[c.id];
    return pagina("UU" + c.id.slice(2), "").then(function (p) {
      var ya = {};
      r.ids.forEach(function (id) { ya[id] = 1; });
      var nuevos = p.videos.filter(function (v) { return !ya[v.id]; });
      if (nuevos.length) {
        r.ids = nuevos.map(function (v) { return v.id; }).concat(r.ids);
        r.titulos = nuevos.map(function (v) { return v.titulo; }).concat(r.titulos);
        r.norm = r.titulos.map(norm);
      }
      r.nombre = c.nombre;
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
      return !r || ahora - r.t > DOS_DIAS;
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

  /* ---------- Buscar y mostrar ---------- */
  function calcular(texto) {
    var palabras = norm(texto).split(/\s+/).filter(Boolean);
    var res = [];
    canalesActuales().forEach(function (c) {
      var r = indice[c.id];
      if (!r) return;
      var bloq = window.FMV_bloqueados ? FMV_bloqueados() : [];
      for (var i = 0; i < r.norm.length; i++) {
        if (bloq.indexOf(r.ids[i]) >= 0) continue;
        var ok = true;
        for (var k = 0; k < palabras.length; k++) {
          if (r.norm[i].indexOf(palabras[k]) < 0) { ok = false; break; }
        }
        if (ok) res.push({ canal: c, id: r.ids[i], titulo: r.titulos[i] });
      }
    });
    resultados = res;
  }

  function avisar() {
    var partes = [];
    if (!textoActual) {
      estado.textContent = ocupado ? "Preparando el buscador… " + hechos + "/" + total + " canales" : "Escribe lo que quieres ver 🔍";
      return;
    }
    if (resultados.length) partes.push(resultados.length + " videos encontrados");
    else if (sinClave) partes.push("El buscador necesita la clave de YouTube.");
    else partes.push("No encontré videos con esas palabras");
    if (ocupado) partes.push("(aún preparando: " + hechos + "/" + total + " canales)");
    else if (fallos) partes.push("(" + fallos + " canales no se pudieron cargar)");
    estado.textContent = partes.join(" ");
  }

  function tarjeta(r) {
    var b = document.createElement("button");
    b.type = "button";
    var img = document.createElement("img");
    img.src = "https://i.ytimg.com/vi/" + r.id + "/mqdefault.jpg";
    img.alt = "";
    img.loading = "lazy";
    var t = document.createElement("span"); t.className = "t"; t.textContent = r.titulo;
    var c = document.createElement("span"); c.className = "c"; c.textContent = r.canal.nombre;
    b.appendChild(img); b.appendChild(t); b.appendChild(c);
    b.addEventListener("click", function () {
      window.scrollTo(0, 0);
      if (typeof iniciarCanal === "function") iniciarCanal(r.canal.id, r.canal.nombre, r.id);
    });
    return b;
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

  function pintarResultados() {
    zona.textContent = "";
    var g = document.createElement("div");
    g.className = "fmv-res";
    zona.appendChild(g);
    mostrados = 0;
    agregarMas();
  }

  /* Mientras se indexa, vuelve a buscar y solo repinta si cambió la cantidad */
  function refrescar() {
    if (textoActual) {
      var n = resultados.length;
      calcular(textoActual);
      if (resultados.length !== n) pintarResultados();
    }
    avisar();
  }

  function lanzar() {
    textoActual = entrada.value.trim();
    if (!textoActual) {
      resultados = [];
      zona.hidden = true;
      zona.textContent = "";
      cuadricula.style.display = "";
      avisar();
      return;
    }
    sincronizar();
    calcular(textoActual);
    cuadricula.style.display = "none";
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
})();
