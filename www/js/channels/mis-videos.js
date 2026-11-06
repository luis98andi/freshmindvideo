/* Render the "Mis videos" section using the channel data/controller API. */
(function () {
  function crearTarjeta(video, indice, datos) {
    var visible = datos.visible(video, datos.perfil());
    var contenedor = document.createElement("div");
    contenedor.className = "item";
    contenedor.style.position = "relative";
    contenedor.style.display = "flex";

    var boton = document.createElement("button");
    boton.type = "button";
    boton.style.width = "100%";
    boton.style.display = "flex";
    boton.style.flexDirection = "column";
    boton.style.border = "0";
    boton.style.padding = "0";
    boton.style.background = "var(--tarjeta)";
    boton.style.borderRadius = "20px";
    boton.style.overflow = "hidden";
    boton.style.textAlign = "left";
    boton.style.boxShadow = "0 3px 10px rgba(20, 60, 100, .2)";
    boton.style.cursor = "pointer";

    var imagen = document.createElement("img");
    imagen.src = video.img || ("https://i.ytimg.com/vi/" + encodeURIComponent(video.id) + "/mqdefault.jpg");
    imagen.referrerPolicy = "no-referrer";
    imagen.alt = "";
    imagen.style.width = "100%";
    imagen.style.aspectRatio = "16 / 9";
    imagen.style.objectFit = "cover";
    imagen.style.display = "block";
    imagen.style.background = "#000";

    var marcas = document.createElement("span");
    marcas.className = "marcas";
    var numero = document.createElement("span");
    numero.className = "num";
    numero.textContent = String(indice + 1);
    marcas.appendChild(numero);

    var titulo = document.createElement("span");
    titulo.className = "titulo";
    titulo.textContent = video.titulo || ("Video " + (indice + 1));

    boton.appendChild(imagen);
    boton.appendChild(marcas);
    boton.appendChild(titulo);
    if (visible) boton.addEventListener("click", function () { datos.abrirVideo(video.id); });
    contenedor.appendChild(boton);

    if (datos.esPadre()) {
      if (!visible) contenedor.style.opacity = ".4";

      var ocultar = document.createElement("span");
      ocultar.className = "quitar-video";
      ocultar.setAttribute("role", "button");
      ocultar.setAttribute("tabindex", "0");
      ocultar.innerHTML = '<span class="ico-mono">🙈</span> <span>Ocultar</span>';
      ocultar.title = "Ocultar este video para siempre";

      function confirmarOcultar(evento) {
        if (evento) evento.stopPropagation();
        datos.confirmar("¿Ocultar este video («" + (video.titulo || video.id) + "»)? No volverá a aparecer.", function () {
          datos.ocultar(video.id, video.titulo, "⭐ Mis videos", "padre");
          window.FMV_repintar();
        });
      }

      ocultar.addEventListener("click", confirmarOcultar);
      ocultar.addEventListener("keydown", function (evento) {
        if (evento.key === "Enter" || evento.key === " ") {
          evento.preventDefault();
          confirmarOcultar(evento);
        }
      });
      contenedor.appendChild(ocultar);
      contenedor.appendChild(datos.chipsPerfil(video));
    }

    return contenedor;
  }

  function pintarMisVideos() {
    var datos = window.FMV_datosMisVideos;
    var cuadricula = document.getElementById("cuadricula-mis");
    if (!datos || !cuadricula) return;

    cuadricula.replaceChildren();
    var orden = datos.orden();
    var botonOrden = document.createElement("button");
    botonOrden.type = "button";
    botonOrden.textContent = "Orden: " + (orden === "recent" ? "Más recientes primero" : "Más antiguos primero");
    botonOrden.setAttribute("aria-label", botonOrden.textContent);
    botonOrden.style.cssText = "padding:6px 14px;border:0;background:#64748b;color:#fff;border-radius:999px;cursor:pointer;font-weight:700;font-family:inherit;font-size:13px;display:inline-block";
    botonOrden.addEventListener("click", function () {
      datos.alternarOrden();
      pintarMisVideos();
    });

    var areaOrden = document.createElement("div");
    areaOrden.style.cssText = "grid-column:1/-1;margin-bottom:8px";
    areaOrden.appendChild(botonOrden);
    cuadricula.appendChild(areaOrden);

    var videos = datos.listar().map(function (video, indice) {
      return { video: video, indice: indice };
    }).sort(function (a, b) {
      var fechaA = Number(a.video.t) || 0;
      var fechaB = Number(b.video.t) || 0;
      var diferencia = fechaA - fechaB;
      if (diferencia) return orden === "recent" ? -diferencia : diferencia;
      return orden === "recent" ? a.indice - b.indice : b.indice - a.indice;
    }).map(function (item) { return item.video; });

    if (!videos.length) {
      var mensaje = document.createElement("p");
      mensaje.className = "mensaje";
      mensaje.style.gridColumn = "1/-1";
      mensaje.textContent = "Aún no hay videos aquí. Los padres pueden agregarlos desde 🔒 Padres → Buscar en YouTube.";
      cuadricula.appendChild(mensaje);
      return;
    }

    videos.forEach(function (video, indice) {
      cuadricula.appendChild(crearTarjeta(video, indice, datos));
    });
  }

  window.FMV_pintarMisVideos = pintarMisVideos;
  pintarMisVideos();
})();
