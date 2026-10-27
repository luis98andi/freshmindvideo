import { Capacitor } from "@capacitor/core";
import { SpeechRecognition as NativeSpeechRecognition } from "@capacitor-community/speech-recognition";

(function () {
  var WebSpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  var esAndroidNativo = Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";

  function montarBotonVoz() {
    var cajaBuscador = document.getElementById("buscador");
    if (!cajaBuscador || document.getElementById("btn-voz-ninos")) return;

    var input = cajaBuscador.querySelector('input[type="search"]');
    if (!input || (!esAndroidNativo && !WebSpeechRecognition)) return;

    input.style.paddingRight = "54px";

    var btnVoz = document.createElement("button");
    btnVoz.type = "button";
    btnVoz.id = "btn-voz-ninos";
    btnVoz.title = "Buscar con tu voz";
    btnVoz.setAttribute("aria-label", "Buscar con tu voz");
    btnVoz.style.cssText =
      "position:absolute;right:8px;top:50%;transform:translateY(-50%);width:40px;height:40px;border-radius:50%;" +
      "border:0;background:#10b981;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;" +
      "box-shadow:0 2px 6px rgba(16,185,129,.3);transition:transform .2s,background .2s;z-index:2";
    function centrarBotonVoz() {
      btnVoz.style.top = (input.offsetTop + input.offsetHeight / 2) + "px";
    }
    btnVoz.innerHTML =
      '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">' +
      '<path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>' +
      '<path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>' +
      '</svg>';
    cajaBuscador.appendChild(btnVoz);
    centrarBotonVoz();
    window.addEventListener("resize", centrarBotonVoz);

    var estado = cajaBuscador.querySelector(".estado");
    var placeholder = input.placeholder;
    var escuchando = false;
    var reconocimiento = null;

    function actualizarEstado(mensaje) {
      if (estado) estado.textContent = mensaje || "";
    }

    function mostrarResultado(texto) {
      if (!texto) {
        actualizarEstado("No se reconoció ninguna frase. Inténtalo de nuevo.");
        return;
      }
      input.value = texto;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      actualizarEstado("");
    }

    function detener() {
      escuchando = false;
      btnVoz.style.background = "#10b981";
      btnVoz.style.transform = "translateY(-50%)";
      input.placeholder = placeholder;
    }

    function iniciarWeb() {
      if (!reconocimiento) {
        reconocimiento = new WebSpeechRecognition();
        reconocimiento.lang = "es-ES";
        reconocimiento.continuous = false;
        reconocimiento.interimResults = false;
        reconocimiento.onresult = function (event) {
          var resultado = event.results && event.results[0] && event.results[0][0];
          mostrarResultado(resultado && resultado.transcript);
        };
        reconocimiento.onerror = function (event) {
          actualizarEstado("No se pudo usar el micrófono: " + (event.error || "error de reconocimiento"));
          detener();
        };
        reconocimiento.onend = detener;
        reconocimiento.onstart = function () {
          escuchando = true;
          btnVoz.style.background = "#ef4444";
          btnVoz.style.transform = "translateY(-50%) scale(1.08)";
          input.placeholder = "Escuchando… di lo que quieres ver";
          actualizarEstado("");
        };
      }
      reconocimiento.start();
    }

    async function iniciarAndroid() {
      var disponibilidad = await NativeSpeechRecognition.available();
      if (!disponibilidad.available) throw new Error("El dispositivo no tiene reconocimiento de voz disponible.");

      var permiso = await NativeSpeechRecognition.checkPermissions();
      if (permiso.speechRecognition !== "granted") {
        permiso = await NativeSpeechRecognition.requestPermissions();
      }
      if (permiso.speechRecognition !== "granted") throw new Error("Se necesita permiso para usar el micrófono.");

      escuchando = true;
      btnVoz.style.background = "#ef4444";
      btnVoz.style.transform = "translateY(-50%) scale(1.08)";
      input.placeholder = "Escuchando… di lo que quieres ver";
      actualizarEstado("");
      var resultado = await NativeSpeechRecognition.start({
        language: "es-ES",
        maxResults: 1,
        prompt: "Di el nombre del video que quieres buscar",
        partialResults: false,
        popup: true
      });
      mostrarResultado(resultado.matches && resultado.matches[0]);
    }

    btnVoz.addEventListener("click", function () {
      actualizarEstado("");
      if (escuchando) {
        if (esAndroidNativo) {
          NativeSpeechRecognition.stop().catch(function (error) {
            actualizarEstado("No se pudo detener el micrófono: " + (error.message || error));
          });
        } else if (reconocimiento) {
          reconocimiento.stop();
        }
        detener();
        return;
      }

      if (esAndroidNativo) {
        iniciarAndroid()
          .catch(function (error) {
            actualizarEstado("No se pudo iniciar la búsqueda por voz: " + (error.message || error));
          })
          .finally(detener);
      } else {
        try {
          iniciarWeb();
        } catch (error) {
          actualizarEstado("No se pudo iniciar la búsqueda por voz: " + (error.message || error));
          detener();
        }
      }
    });
  }

  var esperaBuscador = setInterval(function () {
    if (!document.getElementById("buscador")) return;
    clearInterval(esperaBuscador);
    montarBotonVoz();
  }, 200);
})();
