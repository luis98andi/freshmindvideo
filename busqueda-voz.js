/* FreshMindVideo - Búsqueda por Voz para Niños
   Permite que los niños que aún no saben escribir busquen sus videos diciendo el nombre en voz alta. */
(function () {
  var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  function montarBotonVoz() {
    var cajaBuscador = document.getElementById("buscador");
    if (!cajaBuscador || document.getElementById("btn-voz-ninos")) return;

    var input = cajaBuscador.querySelector('input[type="search"]');
    if (!input) return;

    // Si el navegador no soporta reconocimiento de voz, no mostrar el botón
    if (!SpeechRecognition) return;

    // Estilos para integrar el botón del micrófono dentro de la barra de búsqueda
    cajaBuscador.style.position = "relative";
    input.style.paddingRight = "54px";

    var btnVoz = document.createElement("button");
    btnVoz.type = "button";
    btnVoz.id = "btn-voz-ninos";
    btnVoz.title = "Buscar con tu voz";
    btnVoz.style.cssText =
      "position:absolute;right:8px;top:50%;transform:translateY(-50%);width:40px;height:40px;border-radius:50%;" +
      "border:0;background:#10b981;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;" +
      "box-shadow:0 2px 6px rgba(16,185,129,.3);transition:transform .2s,background .2s;z-index:2";

    btnVoz.innerHTML =
      '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">' +
      '<path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>' +
      '<path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>' +
      '</svg>';

    cajaBuscador.appendChild(btnVoz);

    var reconocimiento = null;
    var escuchando = false;

    try {
      reconocimiento = new SpeechRecognition();
      reconocimiento.lang = "es-ES";
      reconocimiento.continuous = false;
      reconocimiento.interimResults = false;

      reconocimiento.onstart = function () {
        escuchando = true;
        btnVoz.style.background = "#ef4444";
        btnVoz.style.transform = "translateY(-50%) scale(1.15)";
        input.placeholder = "🎙️ Escuchando... Di lo que quieres ver";
      };

      reconocimiento.onresult = function (event) {
        var texto = event.results && event.results[0] && event.results[0][0] && event.results[0][0].transcript;
        if (texto) {
          input.value = texto;
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.dispatchEvent(new Event("change", { bubbles: true }));
        }
      };

      reconocimiento.onerror = function () {
        detener();
      };

      reconocimiento.onend = function () {
        detener();
      };
    } catch (e) {}

    function detener() {
      escuchando = false;
      btnVoz.style.background = "#10b981";
      btnVoz.style.transform = "translateY(-50%)";
      input.placeholder = "Buscar videos en mis canales…";
    }

    btnVoz.addEventListener("click", function () {
      if (!reconocimiento) return;
      if (escuchando) {
        reconocimiento.stop();
        detener();
      } else {
        try {
          reconocimiento.start();
        } catch (e) {
          detener();
        }
      }
    });
  }

  // Esperar a que el buscador esté listo en pantalla
  var w = setInterval(function () {
    if (document.getElementById("buscador")) {
      clearInterval(w);
      montarBotonVoz();
    }
  }, 200);
})();
