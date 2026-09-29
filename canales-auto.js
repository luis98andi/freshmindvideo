/* FreshMindVideo - agregar canales solo con el enlace + fotos automáticas */
(function () {
  var API_KEY = "PEGA_AQUI_TU_CLAVE";
  var LS_EXTRA = "fmv_extra", LS_CACHE = "fmv_cache";
  var API = "https://www.googleapis.com/youtube/v3/channels?part=snippet&key=" + API_KEY;
  var ID_OK = /^UC[\w-]{22}$/;
  var grid = document.getElementById("cuadricula"), msg = document.getElementById("mensaje");
  var sinClave = !API_KEY || API_KEY.indexOf("PEGA") === 0;

  function leer(k, def) { try { return JSON.parse(localStorage.getItem(k)) || def; } catch (e) { return def; } }
  function guardar(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function handleDe(u) { var m = /youtube\.com\/@([^\/?#]+)/.exec(u || ""); return m ? decodeURIComponent(m[1]) : ""; }
  function idDe(u) { var m = /youtube\.com\/channel\/(UC[\w-]{22})/.exec(u || ""); return m ? m[1] : ""; }
  function foto(it) { var t = it.snippet.thumbnails; return (t.medium || t.default || t.high).url; }
  function pedir(p) {
    return fetch(API + "&" + p).then(function (r) { return r.json(); }).then(function (d) { return d.items || []; });
  }

  // Corrige IDs malos y pone la foto oficial de cada canal (con caché de 7 días)
  function resolver(lista) {
    var cache = leer(LS_CACHE, {}), ahora = Date.now(), pend = [];
    lista.forEach(function (c) {
      var h = cache[c.url];
      if (h && ahora - h.t < 6048e5) { c.id = h.id; c.imagen = h.img; } else pend.push(c);
    });
    if (sinClave || !pend.length) return Promise.resolve();
    var ids = pend.map(function (c) { return (c.id || "").trim(); }).filter(function (i) { return ID_OK.test(i); });
    var lotes = [];
    for (var i = 0; i < ids.length; i += 50) lotes.push(pedir("id=" + ids.slice(i, i + 50).join(",")));
    return Promise.all(lotes).then(function (r) {
      var mapa = {};
      [].concat.apply([], r).forEach(function (it) { mapa[it.id] = it; });
      return Promise.all(pend.map(function (c) {
        var it = mapa[(c.id || "").trim()];
        if (it) return it;
        var h = handleDe(c.url);
        return h ? pedir("forHandle=" + encodeURIComponent("@" + h)).then(function (x) { return x[0]; }) : null;
      }));
    }).then(function (res) {
      pend.forEach(function (c, i) {
        var it = res[i];
        if (it) { c.id = it.id; c.imagen = foto(it); cache[c.url] = { id: c.id, img: c.imagen, t: ahora }; }
      });
      guardar(LS_CACHE, cache);
    }).catch(function () {});
  }

  function pintar(todos) {
    grid.innerHTML = "";
    todos.forEach(function (c, i) {
      var t = crearTarjeta(c, i);
      if (!t) return;
      if (c.extra) {
        var x = document.createElement("button");
        x.textContent = "×"; x.title = "Quitar canal";
        x.style.cssText = "position:absolute;top:6px;right:6px;width:28px;height:28px;border:0;border-radius:50%;background:rgba(0,0,0,.65);color:#fff;font-size:18px;cursor:pointer;z-index:2";
        x.addEventListener("click", function (e) {
          e.stopPropagation();
          if (!confirm("¿Quitar " + c.nombre + "?")) return;
          guardar(LS_EXTRA, leer(LS_EXTRA, []).filter(function (o) { return o.id !== c.id; }));
          iniciar();
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
        var todos = base.concat(extra);
        return resolver(todos).then(function () { pintar(todos); });
      });
  }

  function agregar() {
    if (sinClave) { alert("Primero pon tu clave de YouTube en canales-auto.js"); return; }
    var url = (prompt("Pega el enlace del canal de YouTube\n(ej: https://www.youtube.com/@nombre)") || "").trim();
    if (!url) return;
    var id = idDe(url), h = handleDe(url);
    if (!id && !h) { alert("No reconozco ese enlace. Usa uno como https://www.youtube.com/@nombre"); return; }
    pedir(id ? "id=" + id : "forHandle=" + encodeURIComponent("@" + h)).then(function (r) {
      var it = r[0];
      if (!it) { alert("No encontré ese canal."); return; }
      var extra = leer(LS_EXTRA, []);
      if (extra.some(function (o) { return o.id === it.id; })) { alert("Ese canal ya está agregado."); return; }
      extra.push({ nombre: it.snippet.title, id: it.id, url: "https://www.youtube.com/channel/" + it.id, imagen: foto(it) });
      guardar(LS_EXTRA, extra);
      return iniciar();
    }).catch(function () { alert("No se pudo conectar con YouTube."); });
  }

  var btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = "+ Agregar canal";
  btn.style.cssText = "padding:8px 16px;border:0;background:#12a37f;color:#fff;border-radius:8px;cursor:pointer;font-weight:700;font-family:inherit";
  btn.addEventListener("click", agregar);
  document.querySelector("header").appendChild(btn);

  // Espera a que la página termine su carga normal y luego la reemplaza
  var n = 0, w = setInterval(function () {
    if (grid.children.length || /No se pudo/.test(msg.textContent) || ++n > 50) { clearInterval(w); iniciar(); }
  }, 100);
})();
