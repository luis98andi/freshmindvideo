  /* FreshMindVideo - PWA Install Manager (Activado desde Padres -> Instalar app) */
  (function () {
    var deferredPrompt = null;

    function esStandalone() {
      return (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
             (window.navigator && window.navigator.standalone === true);
    }

    var esIOS = /iphone|ipad|ipod/i.test(navigator.userAgent.toLowerCase());
    var esAndroid = /android/i.test(navigator.userAgent.toLowerCase());

    window.addEventListener("beforeinstallprompt", function (e) {
      e.preventDefault();
      deferredPrompt = e;
    });

    window.addEventListener("appinstalled", function () {
      deferredPrompt = null;
      document.body.classList.add("app-instalada");
    });

    function mostrarGuiaModal(html) {
      var overlay = document.createElement("div");
      overlay.style.cssText = "position:fixed;inset:0;background:rgba(15,23,32,0.75);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;animation:pwaSlideUp .2s ease;";
      var card = document.createElement("div");
      card.style.cssText = "background:#fff;border-radius:24px;max-width:440px;width:100%;padding:24px;box-shadow:0 14px 40px rgba(0,0,0,0.35);font-family:Nunito,sans-serif;color:#1e293b;position:relative;";
      card.innerHTML = html + '<div style="margin-top:20px;text-align:center"><button type="button" style="border:0;border-radius:999px;background:#12a37f;color:#fff;font-weight:800;font-size:15px;padding:12px 28px;cursor:pointer;box-shadow:0 3px 10px rgba(18,163,127,.35)">¡Entendido!</button></div>';
      var btnCerrar = card.querySelector("button");
      btnCerrar.addEventListener("click", function () { overlay.remove(); });
      overlay.addEventListener("click", function (e) { if (e.target === overlay) overlay.remove(); });
      document.body.appendChild(overlay);
    }

    function dispararInstalacion() {
      if (esStandalone()) {
        mostrarGuiaModal('<div style="text-align:center"><div style="font-size:3rem;margin-bottom:8px">🎉</div><h3 style="margin:0 0 8px;font-size:1.3rem;color:#12a37f">¡La app ya está instalada!</h3><p style="margin:0;font-size:14px;color:#475569">FreshMindVideo ya se encuentra abierta en tu dispositivo como aplicación nativa.</p></div>');
        return;
      }
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(function (res) {
          if (res.outcome === "accepted") {
            deferredPrompt = null;
            document.body.classList.add("app-instalada");
          }
        }).catch(function () {});
        return;
      }
      if (esIOS) {
        mostrarGuiaModal(
          '<div style="text-align:center"><div style="font-size:2.8rem;margin-bottom:6px">🍎</div>' +
          '<h3 style="margin:0 0 10px;font-size:1.25rem;color:#0f172a">Cómo instalar en iPhone o iPad</h3></div>' +
          '<div style="font-size:14px;color:#334155;line-height:1.6">' +
          '<p style="margin:0 0 10px;display:flex;gap:10px;align-items:flex-start"><b>1.</b> <span>Toca el botón <b>Compartir</b> <svg style="width:18px;height:18px;vertical-align:-3px;display:inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg> en la barra inferior de Safari.</span></p>' +
          '<p style="margin:0 0 10px;display:flex;gap:10px;align-items:flex-start"><b>2.</b> <span>Desliza hacia abajo y presiona <b>«Agregar a pantalla de inicio»</b> ➕.</span></p>' +
          '<p style="margin:0;display:flex;gap:10px;align-items:flex-start"><b>3.</b> <span>Toca <b>«Agregar»</b> arriba a la derecha. ¡Listo! Se abrirá como app nativa.</span></p>' +
          '</div>'
        );
        return;
      }
      mostrarGuiaModal(
        '<div style="text-align:center"><div style="font-size:2.8rem;margin-bottom:6px">📱</div>' +
        '<h3 style="margin:0 0 10px;font-size:1.25rem;color:#0f172a">Cómo instalar en Android</h3></div>' +
        '<div style="font-size:14px;color:#334155;line-height:1.6">' +
        '<p style="margin:0 0 10px;display:flex;gap:10px;align-items:flex-start"><b>1.</b> <span>Abre el menú de Chrome tocando los <b>tres puntos ⋮</b> arriba a la derecha.</span></p>' +
        '<p style="margin:0 0 10px;display:flex;gap:10px;align-items:flex-start"><b>2.</b> <span>Selecciona <b>«Instalar aplicación»</b> o <b>«Agregar a pantalla principal»</b>.</span></p>' +
        '<p style="margin:0;display:flex;gap:10px;align-items:flex-start"><b>3.</b> <span>Confirma tocando <b>«Instalar»</b>. ¡FreshMindVideo aparecerá en tus aplicaciones!</span></p>' +
        '</div>'
      );
    }

    window.FMV_instalarApp = dispararInstalacion;

    if ("serviceWorker" in navigator) {
      window.addEventListener("load", function () {
        navigator.serviceWorker.register("sw.js", { scope: "./" }).catch(function () {});
      });
    }
  })();
