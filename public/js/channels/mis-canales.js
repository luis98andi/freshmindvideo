/* Render the "Mis canales" home section independently from the player. */
(function () {
  var COLORES = ["#ffd166", "#7bdff2", "#b2f7b8", "#ffb3c1", "#cdb4ff", "#ffc98b"];
  var ORDENES = ["recent", "oldest", "alphabetical"];
  var ETIQUETAS_ORDEN = {
    recent: "Más recientes",
    oldest: "Más antiguos",
    alphabetical: "Alfabético"
  };
  var MAX_IMAGENES_SIMULTANEAS = 4;
  var imagenesPendientes = [];
  var imagenesActivas = 0;

  function procesarColaImagenes() {
    while (imagenesActivas < MAX_IMAGENES_SIMULTANEAS && imagenesPendientes.length) {
      (function (trabajo) {
        var img = trabajo.img;
        var urlOriginal = trabajo.url;
        var reintentada = false;
        var finalizada = false;
        var temporizador;

        function terminar() {
          if (finalizada) return;
          finalizada = true;
          clearTimeout(temporizador);
          imagenesActivas -= 1;
          procesarColaImagenes();
        }

        function reintentarOFallar() {
          clearTimeout(temporizador);
          if (!reintentada) {
            reintentada = true;
            var urlAlternativa;
            try {
              urlAlternativa = new URL(urlOriginal, document.baseURI);
            } catch (error) {
              img.remove();
              terminar();
              return;
            }
            if (urlAlternativa.hostname === "yt3.ggpht.com") {
              urlAlternativa.hostname = "yt3.googleusercontent.com";
              img.src = urlAlternativa.href;
              temporizador = setTimeout(reintentarOFallar, 12000);
              return;
            }
          }
          img.remove();
          terminar();
        }

        imagenesActivas += 1;
        img.onload = function () {
          img.style.opacity = "1";
          terminar();
        };
        img.onerror = reintentarOFallar;
        temporizador = setTimeout(reintentarOFallar, 12000);
        img.src = urlOriginal;
      })(imagenesPendientes.shift());
    }
  }

  function inicial(nombre, indice) {
    var contenedor = document.createElement("div");
    contenedor.className = "inicial";
    contenedor.style.background = COLORES[indice % COLORES.length];
    contenedor.textContent = nombre.charAt(0).toUpperCase();
    return contenedor;
  }

  function crearTarjeta(item, indice) {
    var url = item.url || item.enlace || "";
    if (!url) return null;

    var nombre = item.nombre || item.name || "Canal";
    var idCanal = (item.id || "").trim();
    var imagen = item.imagen || item.image || "";
    var tarjeta = document.createElement("div");
    tarjeta.className = "tarjeta";

    var media = document.createElement("div");
    media.className = "media";
    var marcador = inicial(nombre, indice);
    media.appendChild(marcador);
    if (imagen) {
      var img = document.createElement("img");
      img.alt = "";
      img.loading = "eager";
      img.decoding = "async";
      img.fetchPriority = indice < 4 ? "high" : "auto";
      img.style.opacity = "0";
      media.appendChild(img);
      imagenesPendientes.push({ img: img, url: imagen });
      procesarColaImagenes();
    }

    var titulo = document.createElement("p");
    titulo.className = "nombre";
    titulo.textContent = nombre;
    tarjeta.appendChild(media);
    tarjeta.appendChild(titulo);

    if (/^UC[\w-]{22}$/.test(idCanal)) {
      tarjeta.addEventListener("click", function () {
        if (window.FMV_abrirCanal) window.FMV_abrirCanal(idCanal, nombre);
      });
    } else {
      tarjeta.addEventListener("click", function () { window.open(url, "_blank"); });
    }

    return tarjeta;
  }

  window.FMV_pintarMisCanales = function () {
    var datos = window.FMV_datosMisCanales;
    var cuadricula = document.getElementById("cuadricula");
    var mensaje = document.getElementById("mensaje");
    if (!datos || !cuadricula || !mensaje) return;

    var controlOrden = document.getElementById("orden-canales");
    if (controlOrden) {
      controlOrden.textContent = "Orden: " + ETIQUETAS_ORDEN[datos.orden()];
      if (!controlOrden.dataset.fmvBound) {
        controlOrden.addEventListener("click", function () {
          var actual = datos.orden();
          var siguiente = (ORDENES.indexOf(actual) + 1) % ORDENES.length;
          datos.establecerOrden(ORDENES[siguiente]);
          window.FMV_pintarMisCanales();
        });
        controlOrden.dataset.fmvBound = "1";
      }
    }

    var lista = datos.listar();
    var esPadre = datos.esPadre();
    cuadricula.replaceChildren();
    lista.forEach(function (item, indice) {
      var tarjeta = crearTarjeta(item, indice);
      if (!tarjeta) return;
      if (esPadre) {
        if (!datos.visible(item)) tarjeta.style.opacity = ".4";
        var quitar = document.createElement("button");
        quitar.type = "button";
        quitar.textContent = "×";
        quitar.title = "Quitar canal";
        quitar.style.cssText = "position:absolute;top:6px;right:6px;width:34px;height:34px;border:0;border-radius:50%;background:rgba(0,0,0,.7);color:#fff;font-size:20px;cursor:pointer;z-index:2";
        quitar.addEventListener("click", function (evento) {
          evento.stopPropagation();
          datos.quitar(item);
        });
        tarjeta.style.position = "relative";
        tarjeta.appendChild(quitar);
        tarjeta.appendChild(datos.chipsPerfil(item));
      }
      cuadricula.appendChild(tarjeta);
    });
    mensaje.hidden = cuadricula.children.length > 0;
    if (!cuadricula.children.length) mensaje.textContent = "Todavía no hay canales disponibles.";
  };
})();
