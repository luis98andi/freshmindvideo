  var COLORES = ["#ffd166", "#7bdff2", "#b2f7b8", "#ffb3c1", "#cdb4ff", "#ffc98b"];
  var ICONOS = {
    anterior: '<svg viewBox="0 0 24 24"><path d="M6 5h2v14H6zM20 5v14L9 12z"/></svg>',
    siguiente: '<svg viewBox="0 0 24 24"><path d="M16 5h2v14h-2zM4 5v14l11-7z"/></svg>',
    play: '<svg viewBox="0 0 24 24"><path d="M7 4v16l13-8z"/></svg>',
    pausa: '<svg viewBox="0 0 24 24"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>',
    sonido: '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 4V5L7 9zM16.5 12a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z"/></svg>',
    mudo: '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 4V5L7 9z"/><path d="M15 9l6 6M21 9l-6 6" stroke="currentColor" stroke-width="2" fill="none"/></svg>',
    libre: '<svg viewBox="0 0 24 24"><path d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h1.9c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm0 12H6V10h12v10z"/></svg>',
    subs: '<svg viewBox="0 0 24 24"><path d="M19 4H5c-1.11 0-2 .9-2 2v12c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 7H9.5v-.5h-2v3h2V13H11v1c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1zm7 0h-1.5v-.5h-2v3h2V13H18v1c0 .55-.45 1-1 1h-3c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1z"/></svg>',
    pantalla: '<svg viewBox="0 0 24 24"><path d="M4 4h6v2H6v4H4zm10 0h6v6h-2V6h-4zM4 14h2v4h4v2H4zm14 0h2v6h-6v-2h4z"/></svg>',
    salirPantalla: '<svg viewBox="0 0 24 24"><path d="M4 10V4h6v2H6v4zm10-6h6v6h-2V6h-4zM4 14h2v4h4v2H4zm14 4v-4h2v6h-6v-2z"/></svg>'
  };

  var vistaPrincipal = document.getElementById("vista-principal");
  var vistaCanal = document.getElementById("vista-canal");
  var tituloCanalActivo = document.getElementById("titulo-canal-activo");
  var selectorGrid = document.getElementById("selector-grid");
  var selectorMensaje = document.getElementById("selector-mensaje");
  var contadorTotal = document.getElementById("contador-total");
  var contenedor = document.getElementById("contenedor-reproductor");
  var reproductorArea = document.getElementById("reproductor-area");

  var bPlay = document.getElementById("b-play");
  var bPantalla = document.getElementById("b-pantalla");
  var bAutoplay = document.getElementById("b-autoplay");
  var bSonido = document.getElementById("b-sonido");
  var bAnterior = document.getElementById("b-anterior");
  var bSiguiente = document.getElementById("b-siguiente");
  var rango = document.getElementById("rango");
  var tiempo = document.getElementById("tiempo");
  var tapa = document.getElementById("tapa");
  var cargadorVideo = document.getElementById("cargador-video");
  var cargadorTxt = document.getElementById("cargador-txt");
  var avisoVivo = document.getElementById("aviso-vivo");
  var wrapperVideo = document.querySelector(".video-marco-wrapper");
  var playCirculo = tapa.querySelector(".play-circulo");

  function actualizarIconoCentro(reproduciendo) {
    if (!playCirculo) return;
    playCirculo.innerHTML = reproduciendo
      ? '<svg viewBox="0 0 24 24" style="margin-left:0;"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>'
      : '<svg viewBox="0 0 24 24" style="margin-left:4px;"><path d="M8 5v14l11-7z"/></svg>';
    playCirculo.setAttribute("aria-label", reproduciendo ? "Pausar" : "Reproducir");
  }

  bAnterior.innerHTML = ICONOS.anterior;
  bSiguiente.innerHTML = ICONOS.siguiente;
  bPlay.innerHTML = ICONOS.play;
  bPantalla.innerHTML = ICONOS.pantalla;
  if (bAutoplay) { bAutoplay.textContent = "AUTO"; }
  bSonido.innerHTML = ICONOS.sonido;
  document.getElementById("b-subs").innerHTML = ICONOS.subs;

  var jugador = null, listo = false, canalActual = null;
  var listaVideos = [];   // IDs de los videos del canal
  var titulos = [];       // nombres, en el mismo orden que listaVideos
  var indiceActual = 0;
  var temporizador = null, arrastrando = false, errores = 0, apiPendiente = null;
  var esperandoLista = false; // solo se usa si falla la API de datos
  var videoInicial = null;    // video que se debe dejar listo (viene del buscador)
  var videoActualId = null, yaPreparado = false;
  var tCargador = null, tTextoAnuncio = null, tCambioVideo = null, mudoPorAnuncio = false, ultimoSaltoAnuncio = 0;
  var cambioVideoEnCurso = false, bloqueoAutoplay = false, tBloqueoAutoplay = null;
  var autoplayActivado = true;
  var LS_LISTAS = "fmv_listas", LS_ULT = "fmv_ultimo";

  function actualizarPortadaTapa() {
    tapa.style.backgroundImage = "none";
  }

  function pintarAutoplay() {
    if (!bAutoplay) return;
    var activo = !!autoplayActivado;
    bAutoplay.classList.toggle("activo", activo);
    bAutoplay.setAttribute("aria-pressed", String(activo));
    bAutoplay.setAttribute("aria-label", activo ? "Autoplay activado" : "Autoplay desactivado");
    bAutoplay.title = activo ? "Autoplay activado" : "Autoplay desactivado";
    bAutoplay.textContent = activo ? "AUTO" : "MANUAL";
  }

  function silenciarPreventivo() {
    if (!listo || !jugador || !jugador.mute) return;
    try {
      if (!jugador.isMuted || !jugador.isMuted()) {
        jugador.mute();
        mudoPorAnuncio = true;
      }
    } catch (e) {}
  }

  function restaurarSonidoReal() {
    if (!listo || !jugador) return;
    mudoPorAnuncio = false;
    try {
      if (jugador.unMute) jugador.unMute();
      var v = +volumen.value;
      if (isNaN(v) || v <= 0) v = 100;
      if (jugador.setVolume) jugador.setVolume(v);
    } catch (e) {}
    pintarSonido();
  }

  /* Capa 5: Muestra "Cargando video…" al cargar de verdad sin silenciar innecesariamente en móviles */
  function mostrarCargador(si, texto) {
    clearTimeout(tCargador);
    clearTimeout(tTextoAnuncio);
    cargadorVideo.hidden = !si;
    if (si) {
      cargadorTxt.textContent = texto || "Cargando video…";
      tapa.hidden = true;
      avisoVivo.hidden = true;
      actualizarPortadaTapa();
      // En móviles no silenciamos durante la carga normal para evitar que el navegador bloquee el audio
      /* Respaldo solo si el navegador bloqueó el autoplay (estado 5 / 2) o si es un en vivo programado */
      tCargador = setTimeout(function () {
        if (!vistaCanal.classList.contains("activo")) return;
        if (!listo || !jugador || !jugador.getPlayerState) return;
        var st = jugador.getPlayerState();
        if (vivos[videoActualId] === 2 && st !== 1) {
          cargadorVideo.hidden = true;
          tapa.hidden = true;
          avisoVivo.hidden = false;
        } else if (st === 5 || st === 2) {
          cargadorVideo.hidden = true;
          actualizarPortadaTapa();
          tapa.hidden = false;
        }
      }, 2500);
    } else {
      restaurarSonidoReal();
    }
  }

  /* Capa 4: Escudo Anti-Anuncios en el reproductor (detecta publicidad, la silencia al instante, muestra "Eliminando publicidad…" y la salta) */
  function esPublicidadDetectada() {
    if (!listo || !videoActualId || !jugador) return false;
    if (cambioVideoEnCurso) return false;
    try {
      var vd = (jugador.getVideoData && jugador.getVideoData()) || {};
      var st = jugador.getPlayerState ? jugador.getPlayerState() : -1;
      if (jugador.getAdState && jugador.getAdState() > 0) return true;
      if (jugador.isAdPlaying && jugador.isAdPlaying()) return true;
      if (vd.author && /advertis|sponsored|anuncio|publicidad/i.test(vd.author)) return true;
      if (vd.video_id && vd.video_id !== videoActualId && st === 1) {
        return true;
      }
    } catch (e) {}
    return false;
  }

  function vigilarAnuncios() {
    if (!listo || !videoActualId || !jugador) return false;
    try {
      var st = jugador.getPlayerState ? jugador.getPlayerState() : -1;
      var esAd = esPublicidadDetectada();

      if (esAd) {
        cargadorTxt.textContent = "Eliminando publicidad…";
        cargadorVideo.hidden = false;
        tapa.hidden = true;
        silenciarPreventivo();

        // 1. Acelerar velocidad al máximo para pasarlo en milisegundos
        try { if (jugador.setPlaybackRate) jugador.setPlaybackRate(16); } catch (e) {}
        // 2. Intentar llamar al skip nativo si está disponible
        try { if (jugador.skipAd) jugador.skipAd(); } catch (e) {}
        // 3. Intentar saltar al final del anuncio
        try {
          var durAd = jugador.getDuration ? jugador.getDuration() : 0;
          if (durAd > 0 && jugador.seekTo) jugador.seekTo(durAd + 1, true);
        } catch (e) {}

        // 4. Si el anuncio persiste, forzar la recarga directa del video real
        var ahora = Date.now();
        if (ahora - ultimoSaltoAnuncio > 1200) {
          ultimoSaltoAnuncio = ahora;
          try {
            if (jugador.loadVideoById) {
              jugador.loadVideoById(videoActualId);
            }
          } catch (e) {}
        }
        return true;
      }

      /* Cuando ya está reproduciendo nuestro video real (st === 1), asegurar velocidad y sonido activos */
      if (st === 1) {
        var velDeseada = window.FMV_velocidadActual || 1;
        try { if (jugador.getPlaybackRate && jugador.getPlaybackRate() !== velDeseada) jugador.setPlaybackRate(velDeseada); } catch (e) {}
        if (cargadorVideo && !cargadorVideo.hidden && cargadorTxt.textContent === "Eliminando publicidad…") {
          cargadorVideo.hidden = true;
        }
        restaurarSonidoReal();
      }
    } catch (e) {}
    return false;
  }

  window.FMV_fijarVelocidadVideo = function (vel) {
    window.FMV_velocidadActual = vel;
    try {
      if (jugador && jugador.setPlaybackRate) jugador.setPlaybackRate(vel);
    } catch (e) {}
  };
  window.FMV_pausarVideo = function () {
    try {
      if (jugador) {
        if (jugador.pauseVideo) jugador.pauseVideo();
        if (jugador.stopVideo) jugador.stopVideo();
      }
    } catch (e) {}
  };

  /* ---------- Detector de 6 reproducciones seguidas del mismo video dentro de 2 minutos ---------- */
  var repSeguida = { id: null, tiempos: [], ultimoReg: 0 };
  function registrarReproduccionSeguida(id) {
    if (!id) return false;
    var ahora = Date.now();
    if (repSeguida.id === id && ahora - repSeguida.ultimoReg < 1200) return false; // evita contar doble el mismo evento de arranque
    if (repSeguida.id !== id) {
      repSeguida.id = id;
      repSeguida.tiempos = [ahora];
      repSeguida.ultimoReg = ahora;
      return false;
    }
    /* Mismo video de forma consecutiva: filtramos últimos 2 minutos (120,000 ms) */
    repSeguida.tiempos = repSeguida.tiempos.filter(function (t) { return ahora - t <= 120000; });
    repSeguida.tiempos.push(ahora);
    repSeguida.ultimoReg = ahora;
    if (repSeguida.tiempos.length >= 6) {
      repSeguida = { id: null, tiempos: [], ultimoReg: 0 };
      ocultarPorRepeticion(id);
      return true;
    }
    return false;
  }

  function ocultarPorRepeticion(id) {
    var idx = listaVideos.indexOf(id);
    var tit = (idx >= 0 && titulos[idx]) ? titulos[idx] : ("Video " + id);
    var nomCanal = canalActual === "MIS" ? "⭐ Mis videos" : (tituloCanalActivo.textContent || "");
    if (window.FMV_ocultarVideo) {
      window.FMV_ocultarVideo(id, tit, nomCanal, "auto");
    } else if (window.FMV_bloquear) {
      window.FMV_bloquear(id, tit, nomCanal, "auto");
    }
    if (idx >= 0) {
      listaVideos.splice(idx, 1);
      titulos.splice(idx, 1);
    }
    contadorTotal.textContent = listaVideos.length;
    construirSelector(0);
    if (listaVideos.length) {
      irA(Math.min(idx >= 0 ? idx : 0, listaVideos.length - 1), false);
    } else if (listo && jugador) {
      jugador.stopVideo();
      mostrarCargador(false);
      tapa.hidden = false;
    }
  }

  var AVATAR_SVGS = {
    hija: '<svg viewBox="0 0 40 40" class="svg-avatar-3d" aria-hidden="true"><defs><radialGradient id="avHijaBg" cx="35%" cy="30%" r="70%"><stop offset="0%" stop-color="#fbcfe8"/><stop offset="100%" stop-color="#f472b6"/></radialGradient><radialGradient id="avHijaFace" cx="40%" cy="35%" r="65%"><stop offset="0%" stop-color="#fef08a"/><stop offset="40%" stop-color="#fed7aa"/><stop offset="100%" stop-color="#fdba74"/></radialGradient><linearGradient id="avHijaHair" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#92400e"/><stop offset="100%" stop-color="#451a03"/></linearGradient><linearGradient id="avHijaRibbon" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ec4899"/><stop offset="100%" stop-color="#be185d"/></linearGradient></defs><circle cx="20" cy="20" r="19" fill="url(#avHijaBg)" stroke="#f472b6" stroke-width="1.5"/><circle cx="9" cy="14" r="5.5" fill="url(#avHijaHair)"/><circle cx="31" cy="14" r="5.5" fill="url(#avHijaHair)"/><circle cx="9" cy="14" r="2.2" fill="url(#avHijaRibbon)"/><circle cx="31" cy="14" r="2.2" fill="url(#avHijaRibbon)"/><path d="M11 20 C10 13, 30 13, 29 20 C29 28, 11 28, 11 20 Z" fill="url(#avHijaHair)"/><circle cx="20" cy="21" r="10.5" fill="url(#avHijaFace)"/><path d="M12 17 C15 13, 25 13, 28 17 C26 15, 23 15, 20 16 C17 15, 14 15, 12 17 Z" fill="url(#avHijaHair)"/><ellipse cx="16.5" cy="20.5" rx="1.4" ry="1.8" fill="#1e1b4b"/><circle cx="16.9" cy="19.9" r="0.6" fill="#ffffff"/><ellipse cx="23.5" cy="20.5" rx="1.4" ry="1.8" fill="#1e1b4b"/><circle cx="23.9" cy="19.9" r="0.6" fill="#ffffff"/><circle cx="14.5" cy="23" r="1.8" fill="#fb7185" opacity="0.65"/><circle cx="25.5" cy="23" r="1.8" fill="#fb7185" opacity="0.65"/><path d="M18 24.5 Q20 27 22 24.5" stroke="#9a3412" stroke-width="1.2" stroke-linecap="round" fill="none"/><ellipse cx="20" cy="5" rx="11" ry="3" fill="#ffffff" opacity="0.4"/></svg>',
    hijo: '<svg viewBox="0 0 40 40" class="svg-avatar-3d" aria-hidden="true"><defs><radialGradient id="avHijoBg" cx="35%" cy="30%" r="70%"><stop offset="0%" stop-color="#bae6fd"/><stop offset="100%" stop-color="#38bdf8"/></radialGradient><radialGradient id="avHijoFace" cx="40%" cy="35%" r="65%"><stop offset="0%" stop-color="#fef08a"/><stop offset="40%" stop-color="#fed7aa"/><stop offset="100%" stop-color="#fdba74"/></radialGradient><linearGradient id="avHijoHair" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#78350f"/><stop offset="100%" stop-color="#451a03"/></linearGradient></defs><circle cx="20" cy="20" r="19" fill="url(#avHijoBg)" stroke="#38bdf8" stroke-width="1.5"/><path d="M10 20 C9 11, 31 11, 30 20 Z" fill="url(#avHijoHair)"/><path d="M11 15 L14 9 L19 13 L23 8 L27 12 L29 15 Z" fill="url(#avHijoHair)"/><circle cx="20" cy="21.5" r="10.5" fill="url(#avHijoFace)"/><path d="M13 16 C16 14, 20 15, 23 13 C21 16, 17 17, 13 16 Z" fill="url(#avHijoHair)"/><ellipse cx="16.5" cy="21" rx="1.4" ry="1.8" fill="#1e1b4b"/><circle cx="16.9" cy="20.4" r="0.6" fill="#ffffff"/><ellipse cx="23.5" cy="21" rx="1.4" ry="1.8" fill="#1e1b4b"/><circle cx="23.9" cy="20.4" r="0.6" fill="#ffffff"/><circle cx="14.5" cy="23.5" r="1.6" fill="#fb7185" opacity="0.5"/><circle cx="25.5" cy="23.5" r="1.6" fill="#fb7185" opacity="0.5"/><path d="M17.5 25 Q20 27.5 22.5 25" stroke="#9a3412" stroke-width="1.3" stroke-linecap="round" fill="none"/><ellipse cx="20" cy="5" rx="11" ry="3" fill="#ffffff" opacity="0.4"/></svg>'
  };

  var AVATAR_LIST = [
    { id: "hija", n: "Niña", e: "👧", svg: AVATAR_SVGS.hija },
    { id: "hijo", n: "Niño", e: "👦", svg: AVATAR_SVGS.hijo },
    { id: "leon", n: "León", e: "🦁", svg: '<svg viewBox="0 0 40 40" class="svg-avatar-3d" aria-hidden="true"><circle cx="20" cy="20" r="19" fill="#fef08a" stroke="#f59e0b" stroke-width="1.5"/><circle cx="20" cy="20" r="14" fill="#f59e0b"/><circle cx="20" cy="20" r="11" fill="#fef08a"/><circle cx="16" cy="18" r="1.6" fill="#1e1b4b"/><circle cx="24" cy="18" r="1.6" fill="#1e1b4b"/><polygon points="18,21 22,21 20,23" fill="#b45309"/><path d="M18 24 Q20 26 22 24" stroke="#b45309" stroke-width="1.2" fill="none"/></svg>' },
    { id: "panda", n: "Panda", e: "🐼", svg: '<svg viewBox="0 0 40 40" class="svg-avatar-3d" aria-hidden="true"><circle cx="20" cy="20" r="19" fill="#f1f5f9" stroke="#94a3b8" stroke-width="1.5"/><circle cx="11" cy="12" r="4.5" fill="#1e293b"/><circle cx="29" cy="12" r="4.5" fill="#1e293b"/><circle cx="20" cy="21" r="12" fill="#ffffff"/><ellipse cx="15.5" cy="19" rx="3" ry="2.2" fill="#1e293b"/><ellipse cx="24.5" cy="19" rx="3" ry="2.2" fill="#1e293b"/><circle cx="15.8" cy="18.8" r="1" fill="#ffffff"/><circle cx="24.8" cy="18.8" r="1" fill="#ffffff"/><ellipse cx="20" cy="23" rx="2" ry="1.4" fill="#1e293b"/><path d="M18.5 25 Q20 26.5 21.5 25" stroke="#1e293b" stroke-width="1.2" fill="none"/></svg>' },
    { id: "zorro", n: "Zorro", e: "🦊", svg: '<svg viewBox="0 0 40 40" class="svg-avatar-3d" aria-hidden="true"><circle cx="20" cy="20" r="19" fill="#ffedd5" stroke="#ea580c" stroke-width="1.5"/><polygon points="9,7 15,18 8,18" fill="#ea580c"/><polygon points="31,7 25,18 32,18" fill="#ea580c"/><polygon points="10,9 14,17 9,17" fill="#ffffff"/><polygon points="30,9 26,17 31,17" fill="#ffffff"/><circle cx="20" cy="22" r="11" fill="#ea580c"/><polygon points="12,20 20,28 12,28" fill="#ffffff"/><polygon points="28,20 20,28 28,28" fill="#ffffff"/><circle cx="16" cy="19" r="1.5" fill="#1e1b4b"/><circle cx="24" cy="19" r="1.5" fill="#1e1b4b"/><circle cx="20" cy="25" r="1.6" fill="#1e1b4b"/></svg>' },
    { id: "unicornio", n: "Unicornio", e: "🦄", svg: '<svg viewBox="0 0 40 40" class="svg-avatar-3d" aria-hidden="true"><circle cx="20" cy="20" r="19" fill="#fdf4ff" stroke="#d946ef" stroke-width="1.5"/><polygon points="20,4 17,14 23,14" fill="#facc15" stroke="#eab308"/><circle cx="20" cy="23" r="11" fill="#ffffff"/><path d="M10 18 Q14 12 20 15 Q26 12 30 18" fill="#e879f9" opacity="0.8"/><circle cx="16" cy="21" r="1.5" fill="#1e1b4b"/><circle cx="24" cy="21" r="1.5" fill="#1e1b4b"/><circle cx="14" cy="24" r="1.5" fill="#f472b6" opacity="0.6"/><circle cx="26" cy="24" r="1.5" fill="#f472b6" opacity="0.6"/><path d="M18.5 25.5 Q20 27 21.5 25.5" stroke="#d946ef" stroke-width="1.2" fill="none"/></svg>' },
    { id: "cohete", n: "Astronauta", e: "🚀", svg: '<svg viewBox="0 0 40 40" class="svg-avatar-3d" aria-hidden="true"><circle cx="20" cy="20" r="19" fill="#e0f2fe" stroke="#0284c7" stroke-width="1.5"/><rect x="10" y="11" width="20" height="20" rx="9" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5"/><rect x="13" y="14" width="14" height="12" rx="5" fill="#0284c7"/><circle cx="17" cy="17" r="2" fill="#38bdf8" opacity="0.7"/><circle cx="20" cy="34" r="2.5" fill="#ef4444"/><circle cx="7" cy="20" r="2.5" fill="#94a3b8"/><circle cx="33" cy="20" r="2.5" fill="#94a3b8"/></svg>' },
    { id: "dino", n: "Dino", e: "🦖", svg: '<svg viewBox="0 0 40 40" class="svg-avatar-3d" aria-hidden="true"><circle cx="20" cy="20" r="19" fill="#dcfce7" stroke="#16a34a" stroke-width="1.5"/><path d="M12 26 C10 14, 28 14, 28 26 Z" fill="#22c55e"/><polygon points="14,14 16,10 18,14" fill="#15803d"/><polygon points="20,13 22,9 24,13" fill="#15803d"/><circle cx="16" cy="19" r="1.6" fill="#1e1b4b"/><circle cx="16.5" cy="18.5" r="0.6" fill="#ffffff"/><circle cx="24" cy="19" r="1.6" fill="#1e1b4b"/><circle cx="24.5" cy="18.5" r="0.6" fill="#ffffff"/><circle cx="19" cy="23" r="0.8" fill="#15803d"/><circle cx="21" cy="23" r="0.8" fill="#15803d"/><path d="M16 24 Q20 27 24 24" stroke="#15803d" stroke-width="1.2" fill="none"/></svg>' },
    { id: "estrella", n: "Estrella", e: "⭐", svg: '<svg viewBox="0 0 40 40" class="svg-avatar-3d" aria-hidden="true"><circle cx="20" cy="20" r="19" fill="#fefce8" stroke="#eab308" stroke-width="1.5"/><path d="M20 6 L23.5 14 L32 15 L26 21 L27.5 29.5 L20 25.5 L12.5 29.5 L14 21 L8 15 L16.5 14 Z" fill="#facc15" stroke="#eab308" stroke-width="1"/><circle cx="17" cy="18" r="1.3" fill="#1e1b4b"/><circle cx="23" cy="18" r="1.3" fill="#1e1b4b"/><path d="M18 21 Q20 23 22 21" stroke="#b45309" stroke-width="1.2" fill="none"/></svg>' },
    { id: "gato", n: "Gatito", e: "🐱", svg: '<svg viewBox="0 0 40 40" class="svg-avatar-3d" aria-hidden="true"><circle cx="20" cy="20" r="19" fill="#fff1f2" stroke="#f43f5e" stroke-width="1.5"/><polygon points="10,9 17,17 9,17" fill="#fb7185"/><polygon points="30,9 23,17 31,17" fill="#fb7185"/><polygon points="11,11 16,16 10,16" fill="#fecdd3"/><polygon points="29,11 24,16 30,16" fill="#fecdd3"/><circle cx="20" cy="22" r="11" fill="#f43f5e"/><circle cx="16" cy="20" r="1.5" fill="#1e1b4b"/><circle cx="24" cy="20" r="1.5" fill="#1e1b4b"/><polygon points="19,23 21,23 20,24.5" fill="#fff"/><path d="M14 22 L10 21 M14 23.5 L10 24.5 M26 22 L30 21 M26 23.5 L30 24.5" stroke="#ffe4e6" stroke-width="1"/></svg>' },
    { id: "perro", n: "Perrito", e: "🐶", svg: '<svg viewBox="0 0 40 40" class="svg-avatar-3d" aria-hidden="true"><circle cx="20" cy="20" r="19" fill="#fef3c7" stroke="#d97706" stroke-width="1.5"/><ellipse cx="10" cy="19" rx="3.5" ry="6" fill="#78350f"/><ellipse cx="30" cy="19" rx="3.5" ry="6" fill="#78350f"/><circle cx="20" cy="21" r="11" fill="#fbbf24"/><circle cx="16" cy="19" r="1.5" fill="#1e1b4b"/><circle cx="24" cy="19" r="1.5" fill="#1e1b4b"/><ellipse cx="20" cy="23" rx="2.5" ry="1.8" fill="#78350f"/><path d="M18.5 25 Q20 27 21.5 25" stroke="#78350f" stroke-width="1.2" fill="none"/></svg>' },
    { id: "corona", n: "Corona", e: "👑", svg: '<svg viewBox="0 0 40 40" class="svg-avatar-3d" aria-hidden="true"><circle cx="20" cy="20" r="19" fill="#faf5ff" stroke="#a855f7" stroke-width="1.5"/><path d="M9 28 L11 15 L16 21 L20 11 L24 21 L29 15 L31 28 Z" fill="#facc15" stroke="#ca8a04" stroke-width="1.2"/><circle cx="11" cy="14" r="1.8" fill="#ef4444"/><circle cx="20" cy="10" r="2" fill="#3b82f6"/><circle cx="29" cy="14" r="1.8" fill="#10b981"/><rect x="11" y="27" width="18" height="3" rx="1.5" fill="#ca8a04"/></svg>' },
    { id: "conejo", n: "Conejito", e: "🐰", svg: '<svg viewBox="0 0 40 40" class="svg-avatar-3d" aria-hidden="true"><circle cx="20" cy="20" r="19" fill="#f8fafc" stroke="#94a3b8" stroke-width="1.5"/><ellipse cx="14" cy="11" rx="3" ry="8" fill="#ffffff" stroke="#cbd5e1"/><ellipse cx="26" cy="11" rx="3" ry="8" fill="#ffffff" stroke="#cbd5e1"/><ellipse cx="14" cy="11" rx="1.6" ry="5" fill="#fbcfe8"/><ellipse cx="26" cy="11" rx="1.6" ry="5" fill="#fbcfe8"/><circle cx="20" cy="23" r="10.5" fill="#ffffff" stroke="#cbd5e1"/><circle cx="16" cy="21" r="1.4" fill="#1e1b4b"/><circle cx="24" cy="21" r="1.4" fill="#1e1b4b"/><circle cx="13.5" cy="23.5" r="1.4" fill="#f472b6" opacity="0.6"/><circle cx="26.5" cy="23.5" r="1.4" fill="#f472b6" opacity="0.6"/><polygon points="19,23.5 21,23.5 20,25" fill="#f43f5e"/></svg>' },
    { id: "tigre", n: "Tigre", e: "🐯", svg: '<svg viewBox="0 0 40 40" class="svg-avatar-3d" aria-hidden="true"><circle cx="20" cy="20" r="19" fill="#fff7ed" stroke="#f97316" stroke-width="1.5"/><circle cx="11" cy="12" r="4" fill="#f97316"/><circle cx="29" cy="12" r="4" fill="#f97316"/><circle cx="11" cy="12" r="2" fill="#ffedd5"/><circle cx="29" cy="12" r="2" fill="#ffedd5"/><circle cx="20" cy="22" r="11.5" fill="#f97316"/><path d="M18 11 L20 14 L22 11 M14 18 L17 19 M26 18 L23 19" stroke="#7c2d12" stroke-width="1.5" stroke-linecap="round"/><circle cx="16" cy="20" r="1.5" fill="#1e1b4b"/><circle cx="24" cy="20" r="1.5" fill="#1e1b4b"/><ellipse cx="20" cy="24" rx="2.5" ry="1.8" fill="#ffedd5"/><circle cx="20" cy="23.5" r="1" fill="#7c2d12"/></svg>' },
    { id: "koala", n: "Koala", e: "🐨", svg: '<svg viewBox="0 0 40 40" class="svg-avatar-3d" aria-hidden="true"><circle cx="20" cy="20" r="19" fill="#f1f5f9" stroke="#64748b" stroke-width="1.5"/><circle cx="10" cy="13" r="5" fill="#94a3b8"/><circle cx="30" cy="13" r="5" fill="#94a3b8"/><circle cx="10" cy="13" r="2.8" fill="#fbcfe8"/><circle cx="30" cy="13" r="2.8" fill="#fbcfe8"/><circle cx="20" cy="22" r="11" fill="#94a3b8"/><circle cx="15.5" cy="19" r="1.4" fill="#1e1b4b"/><circle cx="24.5" cy="19" r="1.4" fill="#1e1b4b"/><ellipse cx="20" cy="22" rx="3" ry="4" fill="#1e293b"/></svg>' },
    { id: "super", n: "Héroe", e: "🦸", svg: '<svg viewBox="0 0 40 40" class="svg-avatar-3d" aria-hidden="true"><circle cx="20" cy="20" r="19" fill="#fee2e2" stroke="#dc2626" stroke-width="1.5"/><circle cx="20" cy="21" r="11" fill="#fed7aa"/><path d="M12 18 C14 15, 26 15, 28 18 L27 21 C24 20, 22 21, 20 20 C18 21, 16 20, 13 21 Z" fill="#dc2626"/><circle cx="16" cy="19" r="1.2" fill="#ffffff"/><circle cx="24" cy="19" r="1.2" fill="#ffffff"/><path d="M18 25 Q20 27 22 25" stroke="#9a3412" stroke-width="1.3" fill="none"/></svg>' },
    { id: "robot", n: "Robot", e: "🤖", svg: '<svg viewBox="0 0 40 40" class="svg-avatar-3d" aria-hidden="true"><circle cx="20" cy="20" r="19" fill="#f0fdf4" stroke="#16a34a" stroke-width="1.5"/><line x1="20" y1="5" x2="20" y2="10" stroke="#059669" stroke-width="2"/><circle cx="20" cy="5" r="2" fill="#ef4444"/><rect x="10" y="11" width="20" height="18" rx="5" fill="#6ee7b7" stroke="#059669" stroke-width="1.5"/><rect x="13" y="15" width="5" height="5" rx="1" fill="#1e1b4b"/><rect x="22" y="15" width="5" height="5" rx="1" fill="#1e1b4b"/><line x1="14" y1="24" x2="26" y2="24" stroke="#059669" stroke-width="2" stroke-linecap="round"/></svg>' },
    { id: "delfin", n: "Delfín", e: "🐬", svg: '<svg viewBox="0 0 40 40" class="svg-avatar-3d" aria-hidden="true"><circle cx="20" cy="20" r="19" fill="#e0f2fe" stroke="#0284c7" stroke-width="1.5"/><path d="M10 26 C12 12, 28 12, 30 20 C32 23, 26 27, 18 27 Z" fill="#38bdf8"/><polygon points="20,13 23,8 24,14" fill="#0284c7"/><circle cx="25" cy="19" r="1.4" fill="#1e1b4b"/><circle cx="25.4" cy="18.6" r="0.5" fill="#ffffff"/><path d="M22 23 Q24 25 27 23" stroke="#0284c7" stroke-width="1" fill="none"/></svg>' },
    { id: "arcoiris", n: "Arcoíris", e: "🌈", svg: '<svg viewBox="0 0 40 40" class="svg-avatar-3d" aria-hidden="true"><circle cx="20" cy="20" r="19" fill="#fdf4ff" stroke="#c084fc" stroke-width="1.5"/><path d="M8 26 A12 12 0 0 1 32 26" stroke="#ef4444" stroke-width="2.5" fill="none"/><path d="M11 26 A9 9 0 0 1 29 26" stroke="#f59e0b" stroke-width="2.5" fill="none"/><path d="M14 26 A6 6 0 0 1 26 26" stroke="#10b981" stroke-width="2.5" fill="none"/><path d="M17 26 A3 3 0 0 1 23 26" stroke="#3b82f6" stroke-width="2.5" fill="none"/></svg>' },
    { id: "manzana", n: "Manzana", e: "🍎", svg: '<svg viewBox="0 0 40 40" class="svg-avatar-3d" aria-hidden="true"><circle cx="20" cy="20" r="19" fill="#fef2f2" stroke="#dc2626" stroke-width="1.5"/><path d="M20 7 C21 5, 23 6, 23 8" stroke="#15803d" stroke-width="2" stroke-linecap="round" fill="none"/><ellipse cx="23" cy="7" rx="2.5" ry="1.2" fill="#22c55e"/><circle cx="16.5" cy="21" r="8.5" fill="#ef4444"/><circle cx="23.5" cy="21" r="8.5" fill="#ef4444"/><circle cx="17" cy="19" r="1.3" fill="#ffffff" opacity="0.6"/><circle cx="20" cy="28" r="1.5" fill="#b91c1c"/></svg>' }
  ];

  function obtenerAvatarPerfil(p) {
    var guardadoId = localStorage.getItem("fmv_avatar_" + p);
    if (guardadoId) {
      for (var i = 0; i < AVATAR_LIST.length; i++) {
        if (AVATAR_LIST[i].id === guardadoId) return AVATAR_LIST[i];
      }
    }
    return p === "hijo" ? AVATAR_LIST[1] : AVATAR_LIST[0];
  }

  window.FMV_PERFILES = {
    hija: { n: "Hija", e: "👧", svg: AVATAR_SVGS.hija },
    hijo: { n: "Hijo", e: "👦", svg: AVATAR_SVGS.hijo }
  };
  window.FMV_perfil = "";
  var perfilEdicion = "hija";
  var quienEl = document.getElementById("quien");
  function sesion() { try { return JSON.parse(sessionStorage.getItem("fmv_sesion")) || {}; } catch (e) { return {}; } }
  function guardarSesion(o) { try { var x = sesion(); for (var k in o) x[k] = o[k]; sessionStorage.setItem("fmv_sesion", JSON.stringify(x)); } catch (e) {} }
  
  function pintarAvatarGridPicker() {
    var p = window.FMV_perfil || perfilEdicion || "hija";
    var avSel = obtenerAvatarPerfil(p);
    var grid = document.getElementById("avatar-grid-opciones");
    if (grid) {
      grid.innerHTML = "";
      AVATAR_LIST.forEach(function (item) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn-avatar-item" + (item.id === avSel.id ? " sel" : "");
        btn.title = item.n;
        btn.innerHTML = item.svg;
        btn.addEventListener("click", function (e) {
          e.preventDefault();
          e.stopPropagation();
          localStorage.setItem("fmv_avatar_" + p, item.id);
          var avHija = document.getElementById("quien-av-hija");
          var avHijo = document.getElementById("quien-av-hijo");
          if (avHija) avHija.innerHTML = obtenerAvatarPerfil("hija").svg;
          if (avHijo) avHijo.innerHTML = obtenerAvatarPerfil("hijo").svg;
          var chip = document.getElementById("perfil-chip");
          if (chip && window.FMV_perfil === p) {
            chip.innerHTML = item.svg;
          }
          if (window.FMV_PERFILES && window.FMV_PERFILES[p]) {
            window.FMV_PERFILES[p].svg = item.svg;
          }
          pintarAvatarGridPicker();
        });
        grid.appendChild(btn);
      });
    }

    var avHija = document.getElementById("quien-av-hija");
    var avHijo = document.getElementById("quien-av-hijo");
    if (avHija) avHija.innerHTML = obtenerAvatarPerfil("hija").svg;
    if (avHijo) avHijo.innerHTML = obtenerAvatarPerfil("hijo").svg;

    var btnHija = document.getElementById("btn-perfil-hija");
    var btnHijo = document.getElementById("btn-perfil-hijo");
    if (btnHija) btnHija.classList.toggle("sel-perfil", p === "hija");
    if (btnHijo) btnHijo.classList.toggle("sel-perfil", p === "hijo");
  }

  function aplicarPerfil(p) {
    window.FMV_perfil = p;
    perfilEdicion = p;
    LS_ULT = "fmv_ultimo_" + p;   // cada perfil recuerda su propio video y minuto
    quienEl.hidden = true;
    var av = obtenerAvatarPerfil(p);
    var pf = window.FMV_PERFILES[p] || { n: "Perfil", e: "🧒" };
    pf.svg = av.svg;
    var chip = document.getElementById("perfil-chip");
    if (chip) {
      chip.innerHTML = av.svg;
      chip.title = "Perfil activo: " + pf.n + " (Toca para cambiar)";
      chip.setAttribute("data-perfil", p);
      chip.hidden = false;
    }
    guardarSesion({ perfil: p });
    if (window.FMV_repintar) FMV_repintar();   // muestra solo los canales de este perfil
    revisarLimiteActual();
    pintarAvatarGridPicker();
  }
  var btnToggleAvatar = document.getElementById("btn-toggle-avatar-picker");
  var gridAvatar = document.getElementById("avatar-grid-opciones");
  var flechaToggle = document.getElementById("flecha-toggle-avatar");

  if (btnToggleAvatar && gridAvatar) {
    btnToggleAvatar.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      var estaOculto = gridAvatar.hasAttribute("hidden");
      if (estaOculto) {
        gridAvatar.removeAttribute("hidden");
        btnToggleAvatar.setAttribute("aria-expanded", "true");
        if (flechaToggle) flechaToggle.textContent = "▲";
        pintarAvatarGridPicker();
      } else {
        gridAvatar.setAttribute("hidden", "hidden");
        btnToggleAvatar.setAttribute("aria-expanded", "false");
        if (flechaToggle) flechaToggle.textContent = "▼";
      }
    });
  }

  quienEl.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("button[data-p]");
    if (b) aplicarPerfil(b.getAttribute("data-p"));
  });
  var quienCerrarBtn = document.getElementById("quien-btn-cerrar");
  if (quienCerrarBtn) {
    quienCerrarBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      quienEl.hidden = true;
    });
  }
  document.getElementById("perfil-chip").addEventListener("click", function () {
    if (window.FMV_cambiarPerfil) window.FMV_cambiarPerfil();
  });
  pintarAvatarGridPicker();
  var sesionInicial = sesion();
  if (sesionInicial.perfil && window.FMV_PERFILES[sesionInicial.perfil]) aplicarPerfil(sesionInicial.perfil);   // tras recargar no vuelve a preguntar
  ["gesturestart", "gesturechange", "gestureend"].forEach(function (ev) { document.addEventListener(ev, function (e) { e.preventDefault(); }, { passive: false }); });
  window.FMV_cambiarPerfil = function () {
    perfilEdicion = window.FMV_perfil || "hija";
    if (gridAvatar) gridAvatar.setAttribute("hidden", "hidden");
    if (btnToggleAvatar) btnToggleAvatar.setAttribute("aria-expanded", "false");
    if (flechaToggle) flechaToggle.textContent = "▼";
    pintarAvatarGridPicker();
    quienEl.hidden = false;
  };

  /* ---------- Control de tiempo y temporizador diario por perfil ---------- */
  var LS_TIEMPO_FECHA = "fmv_tiempo_fecha";
  var LS_USO = "fmv_uso_"; // fmv_uso_hija, fmv_uso_hijo
  var LS_LIMITE = "fmv_limite_"; // fmv_limite_hija, fmv_limite_hijo (en minutos)
  var bloqueadoPorTiempo = false;
  var bloqueoTiempoEl = document.getElementById("bloqueo-tiempo");
  var bloqueoTxtEl = document.getElementById("bloqueo-txt");
  var bloqueoPinEl = document.getElementById("bloqueo-pin");
  var bloqueoErrEl = document.getElementById("bloqueo-err");
  var bloqueoBtnEntrar = document.getElementById("bloqueo-btn-entrar");
  var bloqueoBtnCambiar = document.getElementById("bloqueo-btn-cambiar");
  var bloqueoBtnPadres = document.getElementById("bloqueo-btn-padres");

  function hoyStr() {
    var d = new Date();
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  }

  function revisarDiaCambio() {
    var h = hoyStr();
    var guardado = localStorage.getItem(LS_TIEMPO_FECHA);
    if (guardado !== h) {
      localStorage.setItem(LS_TIEMPO_FECHA, h);
      localStorage.setItem(LS_USO + "hija", "0");
      localStorage.setItem(LS_USO + "hijo", "0");
    }
  }
  revisarDiaCambio();

  function obtenerUsoSegundos(p) {
    revisarDiaCambio();
    return parseInt(localStorage.getItem(LS_USO + p) || "0", 10) || 0;
  }
  function guardarUsoSegundos(p, s) {
    revisarDiaCambio();
    localStorage.setItem(LS_USO + p, String(s));
  }
  function obtenerLimiteMinutos(p) {
    return parseInt(localStorage.getItem(LS_LIMITE + p) || "0", 10) || 0;
  }
  function fijarLimiteMinutos(p, m) {
    localStorage.setItem(LS_LIMITE + p, String(m));
    revisarLimiteActual();
  }

  window.FMV_obtenerTiempos = function () {
    return {
      hija: { usoSeg: obtenerUsoSegundos("hija"), limiteMin: obtenerLimiteMinutos("hija") },
      hijo: { usoSeg: obtenerUsoSegundos("hijo"), limiteMin: obtenerLimiteMinutos("hijo") }
    };
  };
  window.FMV_fijarLimite = fijarLimiteMinutos;
  window.FMV_reiniciarTiempo = function (p) {
    guardarUsoSegundos(p, 0);
    bloquearPorTiempo(false);
  };
  window.FMV_agregarMinutos = function (p, min) {
    min = parseInt(min, 10) || 5;
    var segActual = obtenerUsoSegundos(p);
    var usoActualMin = Math.ceil(segActual / 60);
    var limActual = obtenerLimiteMinutos(p);
    // Aunque lleve 2 horas (120 min), garantiza que tenga exactamente `min` minutos más a partir de este momento:
    var nuevoLimite = Math.max(limActual, usoActualMin) + min;
    fijarLimiteMinutos(p, nuevoLimite);
    bloquearPorTiempo(false);
    if (window.FMV_reanudarVideo) window.FMV_reanudarVideo();
  };

  function bloquearPorTiempo(si) {
    bloqueadoPorTiempo = si;
    if (bloqueoTiempoEl) bloqueoTiempoEl.hidden = !si;
    if (si) {
      if (listo && jugador && jugador.pauseVideo) jugador.pauseVideo();
      var pf = (window.FMV_PERFILES || {})[window.FMV_perfil] || { n: "tu cuenta", e: "👦" };
      if (bloqueoTxtEl) bloqueoTxtEl.textContent = "Has alcanzado el tiempo límite para " + pf.e + " " + pf.n + ".";
      if (bloqueoPinEl) { bloqueoPinEl.value = ""; bloqueoPinEl.focus(); }
      if (bloqueoErrEl) bloqueoErrEl.style.display = "none";
    }
  }

  function revisarLimiteActual() {
    var p = window.FMV_perfil;
    if (!p) return false;
    var lim = obtenerLimiteMinutos(p);
    if (lim > 0) {
      var uso = obtenerUsoSegundos(p);
      if (uso >= lim * 60) {
        bloquearPorTiempo(true);
        return true;
      }
    }
    if (bloqueadoPorTiempo) bloquearPorTiempo(false);
    return false;
  }

  setInterval(function () {
    if (document.hidden) return;
    var p = window.FMV_perfil;
    if (!p || bloqueadoPorTiempo) return;
    var s = obtenerUsoSegundos(p) + 1;
    guardarUsoSegundos(p, s);
    revisarLimiteActual();
  }, 1000);

  function obtenerPinPadres() {
    if (window.FMV_obtenerPinPadres) return window.FMV_obtenerPinPadres();
    var p = "1234";
    try {
      var guardado = JSON.parse(localStorage.getItem("fmv_pin_padres"));
      if (guardado) p = String(guardado).trim();
    } catch (e) {
      var raw = localStorage.getItem("fmv_pin_padres");
      if (raw) p = String(raw).trim();
    }
    return p || "1234";
  }

  function validarPinBloqueo(cb) {
    var val = bloqueoPinEl ? bloqueoPinEl.value.trim() : "";
    var ok = false;
    if (window.FMV_verificarPinPadres) {
      ok = window.FMV_verificarPinPadres(val);
    } else {
      var pinReal = obtenerPinPadres();
      ok = (val === pinReal || val === "1234");
    }
    if (ok) {
      if (bloqueoErrEl) bloqueoErrEl.style.display = "none";
      if (bloqueoPinEl) bloqueoPinEl.value = "";
      cb();
    } else {
      if (bloqueoErrEl) {
        bloqueoErrEl.textContent = val ? "Contraseña incorrecta" : "Ingresa la contraseña de padres (o 1234)";
        bloqueoErrEl.style.display = "block";
      }
      if (bloqueoPinEl) { bloqueoPinEl.value = ""; bloqueoPinEl.focus(); }
    }
  }

  document.querySelectorAll(".bloqueo-btn-extra").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var m = parseInt(btn.getAttribute("data-m"), 10) || 5;
      validarPinBloqueo(function () {
        window.FMV_agregarMinutos(window.FMV_perfil || "hija", m);
      });
    });
  });

  var customMinInp = document.getElementById("bloqueo-custom-min");
  var customMinBtn = document.getElementById("bloqueo-btn-custom");
  if (customMinBtn && customMinInp) {
    customMinBtn.addEventListener("click", function () {
      var m = parseInt(customMinInp.value, 10) || 5;
      validarPinBloqueo(function () {
        window.FMV_agregarMinutos(window.FMV_perfil || "hija", m);
      });
    });
  }

  if (bloqueoBtnEntrar) {
    bloqueoBtnEntrar.addEventListener("click", function () {
      validarPinBloqueo(function () {
        var m = (customMinInp && parseInt(customMinInp.value, 10)) || 15;
        window.FMV_agregarMinutos(window.FMV_perfil || "hija", m);
      });
    });
  }
  if (bloqueoBtnCambiar) {
    bloqueoBtnCambiar.addEventListener("click", function () {
      validarPinBloqueo(function () {
        bloquearPorTiempo(false);
        if (window.FMV_cambiarPerfil) window.FMV_cambiarPerfil();
      });
    });
  }
  if (bloqueoBtnPadres) {
    bloqueoBtnPadres.addEventListener("click", function () {
      validarPinBloqueo(function () {
        bloquearPorTiempo(false);
        if (window.FMV_abrirPadres) window.FMV_abrirPadres();
      });
    });
  }
  if (bloqueoPinEl) {
    bloqueoPinEl.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        if (customMinInp && customMinInp.value) customMinBtn.click();
        else bloqueoBtnEntrar.click();
      }
    });
  }

  /* ---------- 20 reproducciones completas -> Ocultar por 1 semana (luego reaparece) ---------- */
  var LS_COMPLETADOS = "fmv_completados_v1";
  var LS_SEMANA = "fmv_ocultos_semana_v1";

  function limpiarExpiradosSemana() {
    var sem = lsLeer(LS_SEMANA);
    var ahora = Date.now(), cambio = false;
    Object.keys(sem).forEach(function (id) {
      if (ahora >= sem[id]) {
        delete sem[id];
        cambio = true;
        if (window.FMV_desocultarVideo) window.FMV_desocultarVideo(id);
      }
    });
    if (cambio) lsGuardar(LS_SEMANA, sem);
  }

  function registrarVideoCompletado(id) {
    if (!id) return;
    limpiarExpiradosSemana();
    var comp = lsLeer(LS_COMPLETADOS);
    var c = (comp[id] || 0) + 1;
    comp[id] = c;
    lsGuardar(LS_COMPLETADOS, comp);
    if (c >= 20) {
      delete comp[id];
      lsGuardar(LS_COMPLETADOS, comp);
      var expira = Date.now() + (7 * 24 * 60 * 60 * 1000); // 1 semana
      var sem = lsLeer(LS_SEMANA);
      sem[id] = expira;
      lsGuardar(LS_SEMANA, sem);
      var idx = listaVideos.indexOf(id);
      var tit = (idx >= 0 && titulos[idx]) ? titulos[idx] : ("Video " + id);
      var nomCanal = canalActual === "MIS" ? "⭐ Mis videos" : (tituloCanalActivo.textContent || "");
      if (window.FMV_ocultarVideo) {
        window.FMV_ocultarVideo(id, tit, nomCanal, "20veces", expira);
      }
      if (idx >= 0) {
        listaVideos.splice(idx, 1);
        titulos.splice(idx, 1);
      }
      contadorTotal.textContent = listaVideos.length;
      construirSelector(0);
    }
  }
  /* vivos[id]: 1 = en vivo ahora, 2 = en vivo programado / no disponible por horario */
  var vivos = {}, revisados = {}, itemActual = null, ticksGuardar = 0;
  var posInicio = 0;      // scroll de la pantalla principal, para volver justo donde estabas

  document.getElementById("aviso-vivo-sig").addEventListener("click", function () {
    avisoVivo.hidden = true;
    siguienteVideo();
  });

  /* ---------- Crear / recrear el reproductor ---------- */
  var modoSubs = false;      // true: este reproductor se creó con subtítulos forzados
  var alEstarListo = null;   // qué hacer cuando el reproductor nuevo esté listo

  function sincronizarTituloEspanol() {
    if (!jugador) return;
    try {
      if (typeof jugador.getVideoData === "function") {
        var vd = jugador.getVideoData();
        if (vd && vd.title && vd.video_id) {
          var curIdx = listaVideos.indexOf(vd.video_id);
          if (curIdx >= 0 && titulos[curIdx] !== vd.title) {
            actualizarTituloEnDOM(curIdx, vd.title);
            guardarTituloCache(vd.video_id, vd.title);
          }
        }
      }
    } catch (e) {}
  }

  var modoControlesNativos = false;
  function crearJugador(conSubs, conControles, despues) {
    if (typeof conControles === "function") {
      despues = conControles;
      conControles = false;
    }
    modoControlesNativos = !!conControles;
    var vars = { controls: modoControlesNativos ? 1 : 0, fs: 0, rel: 0, disablekb: modoControlesNativos ? 0 : 1, iv_load_policy: 3, playsinline: 1, hl: "es", cc_lang_pref: "es", cc_load_policy: conSubs ? 1 : 0 };
    if (location.protocol.indexOf("http") === 0) vars.origin = location.origin;
    modoSubs = conSubs;
    alEstarListo = despues || null;
    jugador = new YT.Player("marco", {
      width: "100%", height: "100%",
      host: "https://www.youtube.com",
      playerVars: vars,
      events: {
        onReady: function () {
          listo = true;
          sincronizarTituloEspanol();
          if (!vistaCanal.classList.contains("activo")) {
            debeAutoreproducir = false;
            try {
              if (jugador && jugador.stopVideo) jugador.stopVideo();
              if (jugador && jugador.pauseVideo) jugador.pauseVideo();
            } catch (err) {}
            return;
          }
          if (alEstarListo) { var f = alEstarListo; alEstarListo = null; f(); }
          else prepararPrimero();
        },
        onStateChange: function (e) {
          if (!vistaCanal.classList.contains("activo")) {
            debeAutoreproducir = false;
            try {
              if (jugador && jugador.stopVideo) jugador.stopVideo();
              if (jugador && jugador.pauseVideo) jugador.pauseVideo();
            } catch (err) {}
            return;
          }
          bPlay.innerHTML = (e.data === 1) ? ICONOS.pausa : ICONOS.play;
          actualizarIconoCentro(e.data === 1);
          if (e.data === 1 && videoActualId && histId !== videoActualId) {
            histId = videoActualId;
            if (window.FMV_historial) FMV_historial(videoActualId, titulos[listaVideos.indexOf(videoActualId)] || "", tituloCanalActivo.textContent, canalUC || "MIS");
            if (window.FMV_registrarEventoLogro) window.FMV_registrarEventoLogro("video_visto", { canalId: canalUC, titulo: titulos[listaVideos.indexOf(videoActualId)] || "" });
          }
          if (debeAutoreproducir && !bloqueoAutoplay && (e.data === 5 || e.data === 2)) {
            debeAutoreproducir = false;
            try { if (jugador.playVideo) jugador.playVideo(); } catch (err) {}
          }
          if (e.data === 1) {
            bloqueoAutoplay = false;
            clearTimeout(tBloqueoAutoplay);
            if (vigilarAnuncios()) return;
            mostrarCargador(false);
            restaurarSonidoReal();
            tapa.hidden = modoControlesNativos;
            avisoVivo.hidden = true;
            errores = 0;
            ocultarYa();
            if (videoConSubs !== videoActualId) { videoConSubs = videoActualId; aplicarSubs(); }
            sincronizarTituloEspanol();
          } else if (e.data === 2) {
            mostrarCargador(false);
            tapa.hidden = modoControlesNativos;
            clearTimeout(tOculta);
            contenedor.classList.remove("inactivo");
          } else if (e.data === 5) {
            sincronizarTituloEspanol();
            mostrarCargador(false);
            if (esperandoLista) {
              esperandoLista = false;
              leerListaDelReproductor(0);
            } else if (vivos[videoActualId] === 2) {
              avisoVivo.hidden = false;
            } else {
              tapa.hidden = modoControlesNativos;
            }
            clearTimeout(tOculta);
            contenedor.classList.remove("inactivo");
          } else if (e.data === -1) {
            if (vivos[videoActualId] === 2) {
              mostrarCargador(false);
              tapa.hidden = true;
              avisoVivo.hidden = false;
            } else {
              vigilarAnuncios();
            }
          }
          if (e.data === 0) {
            registrarVideoCompletado(videoActualId);
            if (autoplayActivado) {
              siguienteVideo();
            }
          }
        },
        onError: function () {
          mostrarCargador(false);
          errores++;
          if (errores < 5) siguienteVideo();
        }
      }
    });
  }

  function recrearJugador(conSubs, despues, conControles) {
    var vol = 100, mudo = false;
    try { vol = jugador.getVolume(); mudo = jugador.isMuted(); } catch (e) {}
    listo = false;
    mostrarCargador(true);
    setTimeout(function () {
      try { jugador.destroy(); } catch (e) {}
      var d = document.createElement("div");
      d.id = "marco";
      wrapperVideo.insertBefore(d, cargadorVideo);
      crearJugador(conSubs, !!conControles, function () {
        try { jugador.setVolume(vol); if (mudo) jugador.mute(); } catch (e) {}
        if (despues) despues();
      });
    }, 30);
  }

  var debeAutoreproducir = true;
  var apiPrecalentada = false;

  function precargarApiYoutube() {
    if (apiPrecalentada || document.getElementById("yt-api")) return;
    apiPrecalentada = true;
    var s = document.createElement("script");
    s.id = "yt-api";
    s.async = true;
    s.defer = true;
    s.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(s);
  }

  /* Si el reproductor quedó con subtítulos forzados, se recrea normal para que el video siguiente arranque sin ellos */
  function cargarVideo(id, seg) {
    if (!vistaCanal.classList.contains("activo")) return;
    cambioVideoEnCurso = true;
    bloqueoAutoplay = true;
    clearTimeout(tCambioVideo);
    clearTimeout(tBloqueoAutoplay);
    tCambioVideo = setTimeout(function () { cambioVideoEnCurso = false; }, 1800);
    tBloqueoAutoplay = setTimeout(function () { bloqueoAutoplay = false; }, 1800);
    mostrarCargador(true);
    debeAutoreproducir = false;
    var arg = seg > 5 ? { videoId: id, startSeconds: seg } : id;
    if (modoSubs) {
      recrearJugador(false, function () {
        if (vistaCanal.classList.contains("activo")) {
          try { jugador.loadVideoById(arg); } catch(e){}
        }
      });
    } else {
      try { jugador.loadVideoById(arg); } catch(e){}
    }
  }

  function cargarApi(cb) {
    if (window.YT && YT.Player) { cb(); return; }
    apiPendiente = cb;
    precargarApiYoutube();
  }
  window.onYouTubeIframeAPIReady = function () {
    if (apiPendiente) { var f = apiPendiente; apiPendiente = null; f(); }
  };

  window.addEventListener("load", function () {
    precargarApiYoutube();
  });

  function formato(seg) {
    seg = Math.max(0, Math.floor(seg || 0));
    var m = Math.floor(seg / 60), s = seg % 60;
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  /* ---------- Caché pequeña de listas (6 horas, máximo 8 canales), caché de títulos y de directos ---------- */
  var LS_TITULOS = "fmv_titulos_v2", LS_VIVOS = "fmv_vivos_v1", LS_VIVOS_CANAL = "fmv_vivos_canal_v1";
  try {
    if (localStorage.getItem("fmv_cache_lang_es") !== "v2") {
      localStorage.removeItem("fmv_cache");
      localStorage.removeItem("fmv_titulos_v1");
      localStorage.setItem("fmv_cache_lang_es", "v2");
    }
  } catch (e) {}
  function lsLeer(k) { try { return JSON.parse(window.FMV_getItem(k)) || {}; } catch (e) { return {}; } }
  function lsGuardar(k, v) { try { window.FMV_setItem(k, JSON.stringify(v)); } catch (e) {} }
  var cacheTitulos = lsLeer(LS_TITULOS);
  var vivosGuardados = lsLeer(LS_VIVOS);
  var vivosPorCanal = lsLeer(LS_VIVOS_CANAL);
  Object.keys(vivosGuardados).forEach(function (k) { vivos[k] = vivosGuardados[k]; });

  function guardarTituloCache(id, tit) {
    if (!id || !tit) return;
    cacheTitulos[id] = tit;
    var ks = Object.keys(cacheTitulos);
    if (ks.length > 1500) ks.slice(0, 300).forEach(function (k) { delete cacheTitulos[k]; });
    lsGuardar(LS_TITULOS, cacheTitulos);
  }
  function registrarVivoDeCanal(id, estado) {
    if (!id || !estado) return;
    vivos[id] = estado;
    vivosGuardados[id] = estado;
    lsGuardar(LS_VIVOS, vivosGuardados);
    if (canalUC) {
      var arr = vivosPorCanal[canalUC] || [];
      if (arr.indexOf(id) < 0) {
        arr.unshift(id);
        vivosPorCanal[canalUC] = arr.slice(0, 40);
        lsGuardar(LS_VIVOS_CANAL, vivosPorCanal);
      }
    }
  }
  function listaEnCache(canal) {
    var listas = lsLeer(LS_LISTAS);
    var e = listas && typeof listas === "object" && !Array.isArray(listas) ? listas[canal] : null;
    return e && Array.isArray(e.ids) && e.ids.length ? e : null;
  }
  function guardarListaCache(canal, ids, nombres) {
    if (!canal || !ids || !ids.length) return;
    var m = lsLeer(LS_LISTAS);
    if (!m || typeof m !== "object" || Array.isArray(m)) m = {};
    m[canal] = { t: Date.now(), ids: ids, titulos: nombres };
    Object.keys(m).sort(function (a, b) { return m[b].t - m[a].t; }).slice(150).forEach(function (k) { delete m[k]; });
    lsGuardar(LS_LISTAS, m);
  }

  /* ---------- Selector de videos (miniatura + título de 2 filas + etiqueta EN VIVO al lado del número) ---------- */
  function crearEtiquetaVivo(estadoVivo) {
    var lv = document.createElement("span");
    lv.className = "vivo" + (estadoVivo === 2 ? " prog" : "");
    lv.textContent = estadoVivo === 2 ? "⏳ EN VIVO · PROGRAMADO" : "● EN VIVO";
    return lv;
  }

  function actualizarTituloEnDOM(idx, texto) {
    if (!texto || idx < 0) return;
    titulos[idx] = texto;
    var card = selectorGrid.children[idx];
    if (card) {
      var sp = card.querySelector(".titulo");
      if (sp && sp.textContent !== texto) sp.textContent = texto;
    }
  }

  /* Si la lista vino sin títulos, los completa en segundo plano de forma suave sin competir con la reproducción */
  var colaTitulosCanal = null;
  function completarTitulosFaltantes() {
    var canal = canalActual;
    colaTitulosCanal = canal;
    var pendientes = [];
    for (var i = 0; i < listaVideos.length; i++) {
      var vid = listaVideos[i];
      if (!titulos[i] && cacheTitulos[vid]) {
        actualizarTituloEnDOM(i, cacheTitulos[vid]);
      }
      if (!titulos[i]) pendientes.push(vid);
    }
    if (!pendientes.length) return;
    var guardados = 0;
    function trabajador() {
      if (colaTitulosCanal !== canal || !pendientes.length) return;
      var vid = pendientes.shift();
      fetch("https://www.youtube.com/oembed?format=json&url=" + encodeURIComponent("https://www.youtube.com/watch?v=" + vid))
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) {
          if (d && d.title) {
            guardarTituloCache(vid, d.title);
            if (colaTitulosCanal === canal) {
              var k = listaVideos.indexOf(vid);
              if (k >= 0) actualizarTituloEnDOM(k, d.title);
              if (++guardados % 15 === 0 && canalActual && canalActual !== "MIS") {
                guardarListaCache(canalActual, listaVideos, titulos);
              }
            }
          }
          if (d && d.width && d.height) {
            guardarOrient(vid, d.height > d.width ? "v" : "h");
          }
        })
        .catch(function () {})
        .then(function () {
          if (colaTitulosCanal === canal && pendientes.length) {
            setTimeout(trabajador, 80);
          } else if (colaTitulosCanal === canal && guardados > 0 && canalActual && canalActual !== "MIS") {
            guardarListaCache(canalActual, listaVideos, titulos);
          }
        });
    }
    setTimeout(trabajador, 300);
  }

  function agregarBoton(i) {
    var w = document.createElement("div");
    w.className = "item";
    var vid = listaVideos[i];
    if (vid === videoActualId) { w.classList.add("actual"); itemActual = w; }
    var b = document.createElement("button");
    b.type = "button";
    var img = document.createElement("img");
    img.src = "https://i.ytimg.com/vi/" + vid + "/mqdefault.jpg";
    img.alt = ""; img.loading = "lazy";
    var num = document.createElement("span"); num.className = "num"; num.textContent = (i + 1);
    var textoTit = titulos[i] || cacheTitulos[vid] || "";
    if (textoTit && !titulos[i]) titulos[i] = textoTit;
    var t = document.createElement("span"); t.className = "titulo"; t.textContent = textoTit || ("Cargando título " + (i + 1) + "…");
    var mc = document.createElement("span"); mc.className = "marcas"; mc.appendChild(num);
    var estVivo = vivos[vid] || (pestana === "UULV" ? 1 : 0);
    if (estVivo) mc.appendChild(crearEtiquetaVivo(estVivo));
    b.appendChild(img); b.appendChild(mc); b.appendChild(t);
    b.addEventListener("click", function () { irA(i, true); });
    w.appendChild(b);
    if (window.FMV_esPadre && window.FMV_esPadre()) {
      var q = document.createElement("span");
      q.className = "quitar-video";
      q.setAttribute("role", "button");
      q.setAttribute("tabindex", "0");
      q.innerHTML = '<span class="ico-mono">🙈</span> <span>Ocultar</span>';
      q.title = "Ocultar este video para siempre";
      q.addEventListener("click", function (e) { e.stopPropagation(); quitarVideo(i); });
      w.appendChild(q);
    }
    selectorGrid.appendChild(w);
  }

  function ejecutarQuitarVideo(i) {
    var id = listaVideos[i], tit = titulos[i] || cacheTitulos[id] || "";
    var nomCanal = canalActual === "MIS" ? "⭐ Mis videos" : (tituloCanalActivo.textContent || "");
    if (window.FMV_ocultarVideo) window.FMV_ocultarVideo(id, tit, nomCanal, "padre");
    else if (canalActual === "MIS") FMV_quitarPropio(id, tit, "padre");
    else FMV_bloquear(id, tit, nomCanal, "padre");
    var eraActual = (id === videoActualId);
    listaVideos.splice(i, 1); titulos.splice(i, 1);
    contadorTotal.textContent = listaVideos.length;
    construirSelector(0);
    if (eraActual) {
      if (listaVideos.length) irA(Math.min(i, listaVideos.length - 1), false);
      else if (listo) { jugador.stopVideo(); mostrarCargador(false); tapa.hidden = false; }
    }
  }

  function quitarVideo(i) {
    var id = listaVideos[i], tit = titulos[i] || cacheTitulos[id] || ("Video " + (i + 1));
    function proceder() {
      if (window.FMV_confirmar) {
        window.FMV_confirmar("¿Ocultar este video («" + tit + "»)? No volverá a reproducirse.", function () {
          ejecutarQuitarVideo(i);
        });
      } else {
        ejecutarQuitarVideo(i);
      }
    }
    // Exclusivo para control de padres: solo si está autenticado
    if (!document.body.classList.contains("padre") || !(window.FMV_esPadre && window.FMV_esPadre())) {
      return;
    }
    proceder();
  }

  var btnOcultarActualEl = document.getElementById("btn-ocultar-actual");
  if (btnOcultarActualEl) {
    btnOcultarActualEl.addEventListener("click", function () {
      if (!videoActualId) return;
      var curId = videoActualId;
      var curTit = "";
      if (listaVideos && listaVideos.length && indiceActual >= 0) {
        curTit = titulos[indiceActual] || cacheTitulos[curId] || "";
      }
      var curCanal = canalActual === "MIS" ? "⭐ Mis videos" : (tituloCanalActivo.textContent || "");
      function doOcultar() {
        if (window.FMV_ocultarVideo) {
          window.FMV_ocultarVideo(curId, curTit, curCanal, "padre");
        } else if (window.FMV_bloquear) {
          window.FMV_bloquear(curId, curTit, curCanal, "padre");
        }
        if (indiceActual >= 0 && indiceActual < listaVideos.length) {
          ejecutarQuitarVideo(indiceActual);
        } else {
          siguienteVideo();
        }
      }
      function proceder() {
        if (window.FMV_confirmar) {
          window.FMV_confirmar("¿Ocultar este video («" + (curTit || curId) + "»)? No volverá a reproducirse.", doOcultar);
        } else {
          doOcultar();
        }
      }
      // Exclusivo para control de padres con contraseña
      if (!document.body.classList.contains("padre") || !(window.FMV_esPadre && window.FMV_esPadre())) {
        return;
      }
      proceder();
    });
  }

  function sinBloqueados() {
    limpiarExpiradosSemana();
    var b = window.FMV_bloqueados ? FMV_bloqueados() : [], ni = [], nt = [];
    /* En la sección 🔴 En vivo, incluimos al inicio los videos en vivo o programados detectados en el canal (como David y Jonatán) */
    if (pestana === "UULV" && canalUC && vivosPorCanal[canalUC]) {
      vivosPorCanal[canalUC].forEach(function (vid) {
        if (listaVideos.indexOf(vid) < 0) {
          listaVideos.unshift(vid);
          titulos.unshift(cacheTitulos[vid] || "");
        }
      });
    }
    listaVideos.forEach(function (id, i) {
      if (b.indexOf(id) >= 0) return;
      /* Si estamos en Todos los videos (🎬 Videos) o Reels, sacamos los videos en vivo o programados para que solo estén en 🔴 En vivo */
      if (pestana !== "UULV" && canalActual !== "MIS" && vivos[id]) return;
      var tit = titulos[i] || cacheTitulos[id] || "";
      if (window.FMV_contienePalabraExcluida && window.FMV_contienePalabraExcluida(tit)) return;
      ni.push(id); nt.push(tit);
    });
    listaVideos = ni; titulos = nt;
  }

  function construirSelector(desde) {
    selectorMensaje.style.display = "none";
    if (!desde) selectorGrid.innerHTML = "";
    
    if (!desde && pestana === "LISTAS" && playlistActivaId) {
      var volverBtn = document.createElement("div");
      volverBtn.style.cssText = "grid-column: 1 / -1; display:flex; gap:10px; align-items:center; background:#efe4fb; color:#6b2fa8; padding:12px 18px; border-radius:14px; font-weight:800; font-size:14px; cursor:pointer; box-shadow:0 2px 6px rgba(0,0,0,0.06); margin-bottom:4px;";
      volverBtn.innerHTML = "<span>👈</span> <b>Volver a todas las listas del canal</b> <span style='opacity:0.6;font-weight:normal;margin-left:auto'>Viendo: " + playlistActivaTitulo + "</span>";
      volverBtn.addEventListener("click", function () {
        playlistActivaId = null;
        playlistActivaTitulo = "";
        cargarLista();
      });
      selectorGrid.appendChild(volverBtn);
    }

    var h3Tit = document.getElementById("titulo-seccion-canal") || document.querySelector(".fila-titulo h3");
    if (h3Tit) {
      if (canalActual === "MIS") {
        h3Tit.innerHTML = 'Videos de ⭐ Mis videos (<span id="contador-total">' + listaVideos.length + '</span>)';
      } else {
        h3Tit.innerHTML = 'Todos los videos del canal (<span id="contador-total">' + listaVideos.length + '</span>)';
      }
      contadorTotal = document.getElementById("contador-total");
    } else if (contadorTotal) {
      contadorTotal.textContent = listaVideos.length;
    }
    for (var i = desde || 0; i < listaVideos.length; i++) agregarBoton(i);
    sincronizarIndice();
    revisarVivos();
    completarTitulosFaltantes();
  }

  /* ---------- Reproducción con nuestra propia lista ---------- */
  function irA(i, subir) {
    if (!vistaCanal.classList.contains("activo")) return;
    if (!listo || !listaVideos.length) return;
    var nuevoId = listaVideos[i];
    /* Registrar si el usuario toca repetidamente el mismo video */
    if (subir && registrarReproduccionSeguida(nuevoId)) return;
    indiceActual = i;
    videoActualId = nuevoId;
    nuevoVideoSubs(); bloquearOtraVez();
    marcarActual(subir); guardarUltimo(0);
    cargarVideo(nuevoId);
    pintarMarca();
    if (subir) {
      if (contenedor && contenedor.classList.contains("mini-popup")) {
        contenedor.classList.remove("mini-popup");
        if (reproductorArea) reproductorArea.style.minHeight = "";
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function precargarSiguiente() {
    // Evitamos el precargado del siguiente video porque cueVideoById puede interferir con el flujo real del player,
    // provocando saltos a 0s, transiciones raras, y la pantalla de "Cargando video…" tras un cambio manual.
    return;
  }

  function siguienteVideo() {
    if (!listaVideos.length) return;
    irA((indiceActual + 1) % listaVideos.length, false);
  }

  function anteriorVideo() {
    if (!listaVideos.length) return;
    irA((indiceActual - 1 + listaVideos.length) % listaVideos.length, false);
  }

  function sincronizarIndice() {
    if (!videoActualId) return;
    var k = listaVideos.indexOf(videoActualId);
    if (k >= 0) indiceActual = k;
    marcarActual(true); pintarMarca();
  }

  /* Saca de la sección 🎬 Videos cualquier video que resulte ser En Vivo o Programado de forma suave y sin titilar */
  var tDepurarVivos = null;
  function depurarVivosEnListaNormal() {
    if (pestana === "UULV" || canalActual === "MIS") return;
    clearTimeout(tDepurarVivos);
    tDepurarVivos = setTimeout(ejecutarDepurarVivos, 200);
  }
  function ejecutarDepurarVivos() {
    if (pestana === "UULV" || canalActual === "MIS") return;
    var habiaActual = false, idxAntes = indiceActual;
    var ni = [], nt = [], cambio = false;
    for (var i = 0; i < listaVideos.length; i++) {
      var id = listaVideos[i];
      if (vivos[id]) {
        cambio = true;
        if (id === videoActualId) habiaActual = true;
      } else {
        ni.push(id);
        nt.push(titulos[i] || cacheTitulos[id] || "");
      }
    }
    if (!cambio) return;
    listaVideos = ni;
    titulos = nt;
    if (canalActual) guardarListaCache(canalActual, listaVideos, titulos);
    selectorGrid.innerHTML = "";
    contadorTotal.textContent = listaVideos.length;
    for (var j = 0; j < listaVideos.length; j++) agregarBoton(j);
    if (habiaActual && listaVideos.length) {
      videoActualId = null;
      irA(Math.min(idxAntes, listaVideos.length - 1), false);
    } else {
      sincronizarIndice();
    }
    completarTitulosFaltantes();
  }

  /* ---------- Marcas: contador 52/500, EN VIVO y video actual ---------- */
  var marcaVideo = document.getElementById("marca-video"), mvNum = document.getElementById("mv-num"), mvVivo = document.getElementById("mv-vivo");
  var miniPopupExpandir = document.getElementById("mini-popup-expandir");

  function pintarMarca() {
    var n = listaVideos.length;
    var estadoVivo = (videoActualId && (vivos[videoActualId] || (pestana === "UULV" ? 1 : 0))) || 0;
    if (listo && videoActualId && jugador && jugador.getVideoData) {
      try {
        var vd = jugador.getVideoData() || {};
        /* Solo aplicar datos si el reproductor ya tiene cargado exactamente el videoActualId */
        if (vd.video_id === videoActualId) {
          if (vd.title) {
            guardarTituloCache(videoActualId, vd.title);
            var idxAct = listaVideos.indexOf(videoActualId);
            if (idxAct >= 0 && vd.title && titulos[idxAct] !== vd.title) actualizarTituloEnDOM(idxAct, vd.title);
          }
          if (vd.isLive) {
            var st = jugador.getPlayerState ? jugador.getPlayerState() : -1;
            var nuevoEstado = (st === 1) ? 1 : 2;
            if (vivos[videoActualId] !== nuevoEstado) {
              registrarVivoDeCanal(videoActualId, nuevoEstado);
              pintarVivos();
              if (pestana !== "UULV" && canalActual !== "MIS") {
                depurarVivosEnListaNormal();
                return;
              }
            }
            estadoVivo = nuevoEstado;
            if (estadoVivo === 2 && st !== 1 && st !== 3) {
              mostrarCargador(false);
              tapa.hidden = true;
              avisoVivo.hidden = false;
            } else if (estadoVivo === 1) {
              avisoVivo.hidden = true;
            }
          }
        }
      } catch (e) {}
    }
    marcaVideo.hidden = !(n && videoActualId);
    var txt = (indiceActual + 1) + "/" + n;
    if (mvNum.textContent !== txt) mvNum.textContent = txt;
    mvVivo.hidden = !estadoVivo;
    if (estadoVivo) {
      mvVivo.className = "vivo" + (estadoVivo === 2 ? " prog" : "");
      mvVivo.textContent = estadoVivo === 2 ? "⏳ EN VIVO · PROGRAMADO" : "● EN VIVO";
    }
  }

  function desplazarAVideoActual(el) {
    if (!el) return;
    setTimeout(function () {
      try {
        var contenedor = el.closest ? el.closest(".selector-grid") : el.parentElement;
        if (!contenedor) contenedor = el.parentElement;
        if (contenedor && contenedor.scrollHeight > contenedor.clientHeight) {
          var topPos = el.offsetTop - contenedor.offsetTop;
          contenedor.scrollTo({ top: Math.max(0, topPos - 12), behavior: "smooth" });
        } else {
          el.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      } catch (e) {
        try { el.scrollIntoView({ behavior: "smooth", block: "nearest" }); } catch (err) {}
      }
    }, 150);
  }

  function marcarActual(autoScroll) {
    var k = listaVideos.indexOf(videoActualId);
    var el = k >= 0 ? selectorGrid.children[k] : null;
    if (itemActual && itemActual !== el) itemActual.classList.remove("actual");
    if (el) el.classList.add("actual");
    itemActual = el;
    if (el && autoScroll === true) {
      desplazarAVideoActual(el);
    }
  }

  /* Mini-reproductor flotante (PiP / Popup): cuando el usuario desliza hacia abajo para explorar videos, el reproductor se convierte en un popup flotante */
  var reproductorArea = document.getElementById("reproductor-area");
  function verificarMiniPlayer() {
    if (!vistaCanal.classList.contains("activo")) {
      if (contenedor.classList.contains("mini-popup")) {
        contenedor.classList.remove("mini-popup");
        if (reproductorArea) reproductorArea.style.minHeight = "";
      }
      return;
    }
    if (!reproductorArea) return;
    var rect = reproductorArea.getBoundingClientRect();
    if (rect.bottom < 50 && window.scrollY > 100) {
      if (!contenedor.classList.contains("mini-popup")) {
        reproductorArea.style.minHeight = rect.height + "px";
        contenedor.classList.add("mini-popup");
      }
    } else if (rect.top > -30 || window.scrollY < 40) {
      if (contenedor.classList.contains("mini-popup")) {
        contenedor.classList.remove("mini-popup");
        reproductorArea.style.minHeight = "";
      }
    }
  }
  window.addEventListener("scroll", verificarMiniPlayer, { passive: true });

  /* Al hacer clic en el popup flotante, regresa suavemente al inicio y restablece el reproductor normal */
  contenedor.addEventListener("click", function (e) {
    if (contenedor.classList.contains("mini-popup")) {
      e.preventDefault();
      e.stopPropagation();
      window.scrollTo({ top: 0, behavior: "smooth" });
      contenedor.classList.remove("mini-popup");
      if (reproductorArea) reproductorArea.style.minHeight = "";
    }
  });
  function pintarVivos() {
    var hijos = selectorGrid.children;
    for (var i = 0; i < hijos.length && i < listaVideos.length; i++) {
      var vid = listaVideos[i];
      var est = vivos[vid] || (pestana === "UULV" ? 1 : 0);
      var mc = hijos[i].querySelector(".marcas");
      if (mc && est) {
        var existente = mc.querySelector(".vivo");
        var nuevo = crearEtiquetaVivo(est);
        if (existente) existente.replaceWith(nuevo);
        else mc.appendChild(nuevo);
      }
    }
  }
  /* Detecta videos en vivo o programados (como David y Jonatán) usando tanto el fotograma mq1.jpg de YouTube como la API de datos */
  var revisadosImg = {};
  function revisarVivos() {
    var clave = window.FMV_API_KEY, canal = canalActual;
    /* 1) Verificación instantánea sin API key: los videos en vivo programados (sin fotogramas VOD) devuelven 120x90 en mq1.jpg en vez de 320x180 */
    listaVideos.slice(0, 30).forEach(function (id) {
      if (revisadosImg[id]) return;
      revisadosImg[id] = 1;
      var im = new Image();
      im.onload = function () {
        if (im.naturalWidth > 0 && im.naturalWidth <= 120) {
          registrarVivoDeCanal(id, 2);
          if (canal === canalActual) {
            pintarVivos();
            depurarVivosEnListaNormal();
            if (videoActualId === id && vivos[id] === 2) {
              mostrarCargador(false);
              tapa.hidden = true;
              avisoVivo.hidden = false;
            }
          }
        }
      };
      im.src = "https://i.ytimg.com/vi/" + id + "/mq1.jpg";
    });

    /* 2) Consulta por lotes a la API de YouTube */
    var pend = listaVideos.filter(function (id) { return !revisados[id]; });
    pend.forEach(function (id) { revisados[id] = 1; });
    if (!clave || !pend.length) {
      pintarVivos();
      depurarVivosEnListaNormal();
      return;
    }
    (function paso() {
      if (!pend.length || canal !== canalActual) return;
      var lote = pend.splice(0, 50);
      fetch("https://www.googleapis.com/youtube/v3/videos?part=snippet,liveStreamingDetails&id=" +
            lote.join(",") + "&key=" + encodeURIComponent(clave))
        .then(function (r) { return r.json(); })
        .then(function (d) {
          (d.items || []).forEach(function (it) {
            if (it.snippet && it.snippet.title) {
              guardarTituloCache(it.id, it.snippet.title);
              var k = listaVideos.indexOf(it.id);
              if (k >= 0 && !titulos[k]) actualizarTituloEnDOM(k, it.snippet.title);
            }
            var bc = it.snippet && it.snippet.liveBroadcastContent;
            var ls = it.liveStreamingDetails;
            if (bc === "live") {
              registrarVivoDeCanal(it.id, 1);
            } else if (bc === "upcoming" || (ls && ls.scheduledStartTime && !ls.actualStartTime && !ls.actualEndTime)) {
              registrarVivoDeCanal(it.id, 2);
            }
          });
          pintarVivos();
          depurarVivosEnListaNormal();
          if (videoActualId && vivos[videoActualId] === 2) {
            mostrarCargador(false);
            tapa.hidden = true;
            avisoVivo.hidden = false;
          }
          paso();
        })
        .catch(function () { paso(); });
    })();
  }

  /* ---------- Recordar en qué video (y minuto) se quedó cada canal ---------- */
  function guardarUltimo(t) {
    if (!canalActual || !videoActualId) return;
    var m = lsLeer(LS_ULT);
    m[canalActual] = { id: videoActualId, t: Math.floor(t || 0) };
    lsGuardar(LS_ULT, m);
  }

  function prepararPrimero() {
    if (!vistaCanal.classList.contains("activo")) return;
    if (!listo || yaPreparado) return;
    var ult = (!videoInicial && canalActual) ? lsLeer(LS_ULT)[canalActual] : null;
    if (ult && window.FMV_bloqueados && FMV_bloqueados().indexOf(ult.id) >= 0) ult = null;
    if (ult && pestana !== "UULV" && canalActual !== "MIS" && vivos[ult.id]) ult = null;
    if (ult && listaVideos.length && listaVideos.indexOf(ult.id) < 0) ult = null;
    var id = videoInicial || (ult && ult.id) || listaVideos[0];
    if (!id) return;
    yaPreparado = true;
    videoActualId = id;
    indiceActual = Math.max(0, listaVideos.indexOf(id));
    nuevoVideoSubs();
    cargarVideo(id, (ult && ult.id === id) ? ult.t : 0);
    sincronizarIndice();
  }

  /* ---------- Cargar la lista del canal (con títulos) ---------- */
  var playlistActivaId = null;
  var playlistActivaTitulo = "";

  function cargarListasDeReproduccionDelCanal() {
    var clave = window.FMV_API_KEY;
    var uc = canalUC;
    if (!clave || !uc) {
      mostrarCargador(false);
      selectorMensaje.style.display = "block";
      selectorMensaje.textContent = "Se necesita clave de API para cargar listas de reproducción.";
      return;
    }
    
    mostrarCargador(true, "Cargando listas de reproducción…");
    selectorGrid.innerHTML = "";
    selectorMensaje.style.display = "none";
    contadorTotal.textContent = "0";

    fetch("https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&maxResults=50&channelId=" +
          encodeURIComponent(uc) + "&key=" + encodeURIComponent(clave))
      .then(function (r) {
        return r.json().then(function (d) {
          if (!r.ok && !d.error) throw new Error("Respuesta HTTP " + r.status);
          return d;
        });
      })
      .then(function (d) {
        if (uc !== canalUC || pestana !== "LISTAS" || playlistActivaId) return;
        mostrarCargador(false);
        if (d.error) throw new Error(d.error.message || "error");
        
        var items = d.items || [];
        var listasOcultas = (window.FMV_listasOcultas ? window.FMV_listasOcultas() : []);
        var esPadreActivo = (window.FMV_esPadre && window.FMV_esPadre());
        items = items.filter(function (it) {
          var plId = it.id;
          if (!esPadreActivo && listasOcultas.indexOf(plId) >= 0) return false;
          var title = it.snippet ? it.snippet.title : "";
          var desc = it.snippet ? it.snippet.description : "";
          if (window.FMV_contienePalabraExcluida && (window.FMV_contienePalabraExcluida(title) || window.FMV_contienePalabraExcluida(desc))) {
            return false;
          }
          return true;
        });

        if (!items.length) {
          selectorMensaje.style.display = "block";
          selectorMensaje.textContent = "Este canal no tiene listas de reproducción creadas.";
          return;
        }

        contadorTotal.textContent = items.length;
        items.forEach(function (it) {
          var plId = it.id;
          var s = it.snippet || {};
          var title = s.title || "Lista de reproducción";
          var thumbs = s.thumbnails || {};
          var img = (thumbs.medium || thumbs.default || thumbs.high || {}).url || "";
          var count = it.contentDetails ? it.contentDetails.itemCount : 0;

          var wrapper = document.createElement("div");
          wrapper.className = "item";
          wrapper.style.position = "relative";
          var estaOculta = (listasOcultas.indexOf(plId) >= 0);
          if (estaOculta) wrapper.style.opacity = "0.65";
          
          var btn = document.createElement("button");
          btn.type = "button";
          btn.style.cssText = "display:flex;flex-direction:column;align-items:stretch;width:100%;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 3px 10px rgba(20,60,100,.15);cursor:pointer;border:3px solid transparent;transition:transform 0.15s, border-color 0.15s;padding:0;";
          
          var port = document.createElement("div");
          port.style.cssText = "aspect-ratio:16/9;position:relative;background:#dfe6ea;";
          
          if (img) {
            var im = document.createElement("img");
            im.src = img;
            im.alt = "";
            im.style.cssText = "width:100%;height:100%;object-fit:cover;display:block;";
            port.appendChild(im);
          }
          
          var tag = document.createElement("span");
          tag.style.cssText = "position:absolute;bottom:8px;right:8px;background:rgba(18,163,127,0.95);color:#fff;font-weight:800;font-size:11px;padding:3px 8px;border-radius:6px;box-shadow:0 2px 4px rgba(0,0,0,0.25);";
          tag.textContent = "📁 " + count + " videos";
          port.appendChild(tag);
          
          var info = document.createElement("div");
          info.style.cssText = "padding:12px;font-weight:800;font-size:14px;color:#1d2b3a;text-align:left;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;height:36px;box-sizing:content-box;";
          info.textContent = (estaOculta ? "🙈 (Oculta) " : "") + title;
          
          btn.appendChild(port);
          btn.appendChild(info);
          wrapper.appendChild(btn);
          
          btn.addEventListener("click", function () {
            playlistActivaId = plId;
            playlistActivaTitulo = title;
            cargarLista();
          });

          if (esPadreActivo) {
            var q = document.createElement("span");
            q.className = "quitar-video";
            q.setAttribute("role", "button");
            q.setAttribute("tabindex", "0");
            q.style.background = estaOculta ? "#12a37f" : "#d93025";
            q.innerHTML = estaOculta ? "👁 <span>Mostrar lista</span>" : '<span class="ico-mono">🙈</span> <span>Ocultar lista</span>';
            q.title = estaOculta ? "Mostrar lista a los niños" : "Ocultar esta lista completa de reproducción";
            q.addEventListener("click", function (e) {
              e.stopPropagation();
              if (estaOculta) {
                if (window.FMV_desocultarLista) window.FMV_desocultarLista(plId);
                cargarListasDeReproduccionDelCanal();
              } else {
                function doOcultar() {
                  if (window.FMV_ocultarLista) window.FMV_ocultarLista(plId, title, tituloCanalActivo.textContent || "");
                  cargarListasDeReproduccionDelCanal();
                }
                if (window.FMV_confirmar) {
                  window.FMV_confirmar("¿Ocultar la lista completa «" + title + "»? Los niños no podrán verla.", doOcultar);
                } else {
                  doOcultar();
                }
              }
            });
            wrapper.appendChild(q);
          }

          selectorGrid.appendChild(wrapper);
        });
      })
      .catch(function (err) {
        if (uc !== canalUC || pestana !== "LISTAS" || playlistActivaId) return;
        mostrarCargador(false);
        selectorMensaje.style.display = "block";
        selectorMensaje.textContent = "Error al cargar las listas: " + (err && err.message ? err.message : "Error de conexión con YouTube.");
      });
  }

  function cargarLista() {
    var canal = canalActual, clave = window.FMV_API_KEY;

    if (pestana === "LISTAS") {
      if (!playlistActivaId) {
        cargarListasDeReproduccionDelCanal();
        return;
      } else {
        var lo = window.FMV_listasOcultas ? window.FMV_listasOcultas() : [];
        if (lo.indexOf(playlistActivaId) >= 0 && (!window.FMV_esPadre || !window.FMV_esPadre())) {
          playlistActivaId = null;
          cargarListasDeReproduccionDelCanal();
          return;
        }
        canal = playlistActivaId;
      }
    }

    var activoActual = (pestana === "LISTAS") ? playlistActivaId : canalActual;

    var cache = listaEnCache(canal);
    if (cache) {
      listaVideos = cache.ids.slice();
      titulos = (cache.titulos || []).slice();
      sinBloqueados();
      construirSelector(0);
      prepararPrimero();
      /* Si el caché tiene menos de 4 horas (14400000 ms) o no hay clave, no consultar red */
      if (!clave || (Date.now() - (cache.t || 0) < 14400000)) {
        return;
      }
    }
    if (!clave) {
      if (!cache) usarListaDelReproductor();
      return;
    }

    var ids = [], nombres = [];
    var bloq = window.FMV_bloqueados ? FMV_bloqueados() : [];
    function pagina(token) {
      fetch("https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&hl=es&playlistId=" +
            encodeURIComponent(canal) + "&key=" + encodeURIComponent(clave) +
            (token ? "&pageToken=" + encodeURIComponent(token) : ""))
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (canal !== activoActual) return; // cambió de canal o lista mientras cargaba
          if (d.error) {
            var err = new Error(d.error.message || "error");
            err.code = d.error.code;
            throw err;
          }
          var antes = ids.length;
          (d.items || []).forEach(function (it) {
            var s = it.snippet;
            if (!s || !s.resourceId || !s.resourceId.videoId) return;
            if (s.title === "Private video" || s.title === "Deleted video") return;
            var vid = s.resourceId.videoId;
            if (bloq.indexOf(vid) >= 0) return;
            guardarTituloCache(vid, s.title);
            if (pestana !== "UULV" && vivos[vid]) return;
            ids.push(vid);
            nombres.push(s.title);
          });
          // Si ya teníamos caché reproduciéndose, solo actualizamos los datos y la cuadrícula suavemente
          if (!cache || antes > 0) {
            listaVideos = ids;
            titulos = nombres;
            if (antes === 0) sinBloqueados();
            construirSelector(antes);
            if (!cache && antes === 0 && listaVideos.length) prepararPrimero();
          }
          if (d.nextPageToken && ids.length < 1000) {
            pagina(d.nextPageToken);
          } else {
            guardarListaCache(canal, ids, nombres);
            if (cache) {
              listaVideos = ids;
              titulos = nombres;
              sinBloqueados();
              construirSelector(0);
            }
          }
        })
        .catch(function (err) {
          if (canal !== activoActual || ids.length || cache) return;
          /* Si la API devolvió 404 (el canal no tiene esa sub-lista), en UULF pasamos a UU; si fue 403/red usamos Plan B con la lista actual */
          if (err && err.code === 404) {
            if (pestana === "UUSH" || pestana === "UULV") {
              if (pestana === "UULV" && canalUC && vivosPorCanal[canalUC] && vivosPorCanal[canalUC].length) {
                listaVideos = []; titulos = [];
                sinBloqueados();
                construirSelector(0);
                prepararPrimero();
                return;
              }
              mostrarCargador(false);
              selectorMensaje.style.display = "block";
              selectorMensaje.textContent = pestana === "UUSH" ? "Este canal no tiene reels." : "Este canal no tiene videos en vivo.";
              return;
            }
            if (pestana === "UULF") { pestana = "UU"; canalActual = "UU" + canalUC.slice(2); pintarPestanas(); cargarLista(); return; }
          }
          usarListaDelReproductor(); // plan B: obtiene la lista desde el reproductor
        });
    }
    pagina("");
  }

  /* Plan B si la API de datos falla o se acaba la cuota: extrae IDs del reproductor y carga títulos con oEmbed */
  function usarListaDelReproductor() {
    var canal = canalActual;
    if (!listo) {
      setTimeout(function () { if (canal === canalActual) usarListaDelReproductor(); }, 300);
      return;
    }
    esperandoLista = true;
    jugador.cuePlaylist({ listType: "playlist", list: canal, index: 0 });
  }

  function leerListaDelReproductor(intento) {
    var canal = canalActual;
    var lista = (jugador.getPlaylist && jugador.getPlaylist()) || [];
    if (lista.length) {
      listaVideos = lista.slice();
      titulos = [];
      sinBloqueados();
      construirSelector(0);
      prepararPrimero();
    } else if (intento < 8) {
      setTimeout(function () { if (canal === canalActual) leerListaDelReproductor(intento + 1); }, 450);
    } else if (pestana === "UULF") {
      pestana = "UU"; canalActual = "UU" + canalUC.slice(2); pintarPestanas(); usarListaDelReproductor();
    } else if (pestana === "UULV" && canalUC && vivosPorCanal[canalUC] && vivosPorCanal[canalUC].length) {
      listaVideos = []; titulos = [];
      sinBloqueados();
      construirSelector(0);
      prepararPrimero();
    } else {
      mostrarCargador(false);
      selectorMensaje.style.display = "block";
      selectorMensaje.textContent = pestana === "UUSH" ? "Este canal no tiene reels." : pestana === "UULV" ? "Este canal no tiene videos en vivo." : "No se pudieron recuperar los videos de este canal.";
    }
  }

  var canalUC = null, canalNombre = "", pestana = "UULF", histId = null;
  var pestanasEl = document.getElementById("pestanas");
  function pintarPestanas() {
    pestanasEl.hidden = !canalUC;
    [].forEach.call(pestanasEl.children, function (b) {
      var p = b.getAttribute("data-p");
      b.classList.toggle("on", p === pestana || (pestana === "UU" && p === "UULF"));
    });
  }
  pestanasEl.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-p]");
    var p = btn && btn.getAttribute("data-p");
    if (!p || !canalUC) return;
    if (p === pestana) {
      if (p === "LISTAS" && playlistActivaId) {
        playlistActivaId = null;
        playlistActivaTitulo = "";
        cargarLista();
      }
      return;
    }
    playlistActivaId = null;
    playlistActivaTitulo = "";
    pestana = p; canalActual = p + canalUC.slice(2);
    guardarSesion({ pest: p });
    pintarPestanas();
    abrirReproductor(canalNombre, null, cargarLista);
  });
  function iniciarCanal(idCanal, nombreCanal, videoId, pest, plId, plTitle) {
    playlistActivaId = plId || null;
    playlistActivaTitulo = plTitle || "";
    canalUC = idCanal; canalNombre = nombreCanal;
    pestana = videoId ? "UU" : (pest || "UULF");
    guardarSesion({ vista: "canal", uc: idCanal, nombre: nombreCanal, pest: pestana });
    canalActual = pestana + idCanal.slice(2);
    pintarPestanas();
    abrirReproductor(nombreCanal, videoId, cargarLista);
  }
  window.FMV_abrirCanal = iniciarCanal;
  window.FMV_abrirPlaylistDesdeBuscador = function (canalId, canalNombre, plId, plTitle) {
    iniciarCanal(canalId, canalNombre, null, "LISTAS", plId, plTitle);
  };
  window.FMV_recargarCanalActual = function () {
    if (!vistaCanal.classList.contains("activo")) return;
    if (canalActual === "MIS") iniciarMisVideos(videoActualId);
    else if (canalUC) cargarLista();
  };

  /* Pestaña "Mis videos": mismo reproductor (con la misma tapa anti-clics) */
  window.FMV_abrirMis = function (id) { iniciarMisVideos(id); };
  function iniciarMisVideos(videoId) {
    playlistActivaId = null;
    playlistActivaTitulo = "";
    guardarSesion({ vista: "mis" });
    canalActual = "MIS"; canalUC = null; pintarPestanas();
    document.body.classList.remove("modo-buscar");
    location.hash = "videos";
    abrirReproductor("⭐ Mis videos", videoId || null, function () {
      var vs = window.FMV_misVideos ? FMV_misVideos() : [];
      listaVideos = vs.map(function (v) { return v.id; });
      titulos = vs.map(function (v) { return v.titulo || ""; });
      if (!listaVideos.length) {
        mostrarCargador(false);
        selectorMensaje.style.display = "block";
        selectorMensaje.textContent = "Aún no hay videos individuales. Los padres pueden agregarlos desde 🔒 Padres → Buscar en YouTube.";
        if (listo) jugador.stopVideo();
        return;
      }
      construirSelector(0);
      prepararPrimero();
    });
  }

  function abrirReproductor(nombreCanal, videoId, cargarFn) {
    if (!vistaCanal.classList.contains("activo")) posInicio = window.scrollY;
    videoInicial = videoId || null;
    videoActualId = null;
    yaPreparado = false;
    tituloCanalActivo.textContent = nombreCanal;
    marcarNav(canalActual === "MIS" ? "mis" : navActual());
    document.body.classList.add("viendo");
    vistaPrincipal.classList.add("oculto");
    vistaCanal.classList.add("activo");
    window.scrollTo(0, 0);   // el reproductor siempre debe quedar a la vista

    listaVideos = [];
    titulos = [];
    esperandoLista = false;
    selectorGrid.innerHTML = "";
    selectorMensaje.style.display = "block";
    selectorMensaje.textContent = "Cargando videos...";
    contadorTotal.textContent = "0";
    mostrarCargador(true);

    cargarApi(function () {
      if (jugador) return;
      crearJugador(false, null);
    });

    cargarFn();
    if (videoInicial) prepararPrimero(); // viene del buscador: dejarlo listo de inmediato

    if (!temporizador) {
      temporizador = setInterval(actualizarCronometro, 250);
    }
  }

  var tCargaTimer = null;
  function verificarEstadoCargando() {
    if (!listo || !videoActualId || !jugador || !jugador.getPlayerState) return;
    try {
      var st = jugador.getPlayerState();
      if (st === 1 || st === 2) {
        if (tCargaTimer) { clearTimeout(tCargaTimer); tCargaTimer = null; }
        mostrarCargador(false);
      } else if (st === 3 || st === -1 || st === 5) {
        if (!tCargaTimer && cargadorVideo.hidden) {
          tCargaTimer = setTimeout(function () {
            tCargaTimer = null;
            if (jugador && jugador.getPlayerState) {
              var currSt = jugador.getPlayerState();
              if (currSt === 3 || currSt === -1 || currSt === 5) {
                cargadorTxt.textContent = "Video cargando…";
                cargadorVideo.hidden = false;
              }
            }
          }, 450);
        }
      }
    } catch (e) {}
  }

  function actualizarCronometro() {
    if (wrapperVideo.classList.contains("libre") && !document.body.classList.contains("padre")) bloquearOtraVez();
    if (vigilarAnuncios()) return;
    verificarEstadoCargando();
    pintarMarca();
    if (cambioVideoEnCurso) {
      if (cargadorVideo && !cargadorVideo.hidden) {
        try { if (jugador && jugador.getPlayerState && jugador.getPlayerState() === 1) cambioVideoEnCurso = false; } catch (e) {}
      }
      return;
    }
    if (!listo || !jugador.getDuration) return;
    var dur = jugador.getDuration() || 0, t = jugador.getCurrentTime() || 0;
    if (!arrastrando && dur > 0) rango.value = Math.round(t / dur * 1000);
    tiempo.textContent = formato(arrastrando ? rango.value / 1000 * dur : t) + " / " + formato(dur);
    pintarSonido();
    if (videoActualId && jugador.getPlayerState() === 1 && (++ticksGuardar % 10 === 0)) guardarUltimo(t);
    if (!moviendoVol && !mudoPorAnuncio) volumen.value = jugador.isMuted() ? 0 : jugador.getVolume();
  }

  function detenerReproductorCompletamente() {
    debeAutoreproducir = false;
    window.FMV_alListo = null;
    clearTimeout(tCargador);
    clearTimeout(tTextoAnuncio);
    clearTimeout(tOculta);
    videoActualId = null;
    yaPreparado = false;
    videoInicial = null;
    alEstarListo = null;
    if (temporizador) {
      clearInterval(temporizador);
      temporizador = null;
    }
    if (tCargaTimer) {
      clearTimeout(tCargaTimer);
      tCargaTimer = null;
    }
    try {
      if (jugador) {
        if (typeof jugador.stopVideo === "function") jugador.stopVideo();
        if (typeof jugador.pauseVideo === "function") jugador.pauseVideo();
        if (typeof jugador.clearVideo === "function") jugador.clearVideo();
      }
    } catch (e) {}

    // Enviar comandos postMessage de parada a todos los iframes
    try {
      var iframes = document.querySelectorAll("iframe");
      iframes.forEach(function (ifr) {
        try {
          ifr.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
          ifr.contentWindow.postMessage('{"event":"command","func":"stopVideo","args":""}', '*');
        } catch (e) {}
      });
    } catch (e) {}

    try {
      document.querySelectorAll("video, audio").forEach(function (v) {
        try { v.pause(); v.currentTime = 0; } catch (e) {}
      });
    } catch (e) {}
  }

  function regresarAprincipal() {
    verMis(false);
    guardarSesion({ vista: "inicio", vermis: false });
    bloquearOtraVez();
    mostrarCargador(false);
    tapa.hidden = true;
    avisoVivo.hidden = true;
    contenedor.classList.remove("mini-popup");
    if (reproductorArea) reproductorArea.style.minHeight = "";
    document.body.classList.remove("viendo");
    document.body.classList.remove("modo-buscar");
    marcarNav("inicio");
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
    if (location.hash) location.hash = "";
    vistaCanal.classList.remove("activo");
    vistaPrincipal.classList.remove("oculto");
    window.scrollTo(0, 0);
    detenerReproductorCompletamente();
  }

  document.getElementById("btn-volver").addEventListener("click", irInicio);
  var btnPadresCanalEl = document.getElementById("btn-padres-canal");
  if (btnPadresCanalEl) {
    btnPadresCanalEl.addEventListener("click", function () {
      if (window.FMV_abrirPadres) window.FMV_abrirPadres();
    });
  }
  /* ---------- Navegación Superior ---------- */
  function marcarNav(cual) {
    var conmCanales = document.querySelector("#conmutador button[data-v='canales']");
    var conmMis = document.querySelector("#conmutador button[data-v='mis']");
    if (conmCanales) conmCanales.classList.toggle("on", cual === "inicio" || cual === "canales");
    if (conmMis) conmMis.classList.toggle("on", cual === "mis");
  }
  function navActual() { return document.body.classList.contains("modo-buscar") ? "buscar" : document.body.classList.contains("ver-mis") ? "mis" : "inicio"; }
  var conmEl = document.getElementById("conmutador");
  function verMis(si) {
    guardarSesion({ vermis: si });
    document.body.classList.toggle("ver-mis", si);
    marcarNav(si ? "mis" : "canales");
    if (si && window.FMV_repintarMis) window.FMV_repintarMis();
  }
  if (conmEl) {
    conmEl.addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest("button[data-v]");
      if (b) {
        regresarAprincipal();
        verMis(b.getAttribute("data-v") === "mis");
      }
    });
  }
  function irInicio() { verMis(false); document.body.classList.remove("modo-buscar"); regresarAprincipal(); window.scrollTo(0, 0); }
  function irBuscar() {
    verMis(false);
    regresarAprincipal();
    document.body.classList.add("modo-buscar");
    marcarNav("buscar");
    window.scrollTo(0, 0);
    var i = document.querySelector("#buscador input");
    if (i) setTimeout(function () { i.focus(); }, 60);
  }
  window.FMV_irBuscar = irBuscar;
  document.getElementById("logo-inicio").addEventListener("click", irInicio);
  function esAndroidMovil() {
    return /android/i.test((navigator.userAgent || "")) && !/ipad|iphone|ipod/i.test((navigator.userAgent || ""));
  }

  function activarBotonPadresConRetencion(btn) {
    if (!btn) return;
    var feedback = null, inicio = 0, activado = false;
    function limpiar() {
      if (feedback) clearInterval(feedback);
      feedback = null;
      btn.classList.remove("padre-hold");
      btn.classList.remove("padre-hold-activado");
      var indicador = btn.querySelector(".padres-hold-feedback");
      if (indicador) indicador.remove();
    }
    function comenzar() {
      if (!esAndroidMovil()) return;
      if (window.FMV_esPadre && window.FMV_esPadre()) {
        if (window.FMV_abrirPadres) window.FMV_abrirPadres();
        return;
      }
      limpiar();
      inicio = Date.now();
      activado = false;
      btn.classList.add("padre-hold");
      var indicador = document.createElement("span");
      indicador.className = "padres-hold-feedback";
      indicador.setAttribute("aria-hidden", "true");
      var contador = document.createElement("span");
      contador.textContent = "2";
      indicador.appendChild(contador);
      btn.appendChild(indicador);
      feedback = setInterval(function () {
        var transcurrido = Date.now() - inicio;
        var restante = Math.max(0, 2000 - transcurrido);
        indicador.style.setProperty("--hold-progress", Math.min(100, transcurrido / 20) + "%");
        contador.textContent = String(Math.max(1, Math.ceil(restante / 1000)));
        if (restante > 0 || activado) return;
        activado = true;
        clearInterval(feedback);
        feedback = null;
        contador.textContent = "✓";
        btn.classList.add("padre-hold-activado");
        if (window.FMV_abrirPadres) window.FMV_abrirPadres();
      }, 50);
    }
    btn.addEventListener("pointerdown", function (e) {
      if (!esAndroidMovil()) return;
      if (window.FMV_esPadre && window.FMV_esPadre()) {
        e.preventDefault();
        e.stopPropagation();
        if (window.FMV_abrirPadres) window.FMV_abrirPadres();
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      comenzar();
    });
    btn.addEventListener("pointerup", limpiar);
    btn.addEventListener("pointerleave", limpiar);
    btn.addEventListener("pointercancel", limpiar);
    btn.addEventListener("click", function (e) {
      if (esAndroidMovil()) {
        e.preventDefault();
        e.stopPropagation();
        if (window.FMV_esPadre && window.FMV_esPadre()) {
          if (window.FMV_abrirPadres) window.FMV_abrirPadres();
        }
        return;
      }
      if (window.FMV_abrirPadres) window.FMV_abrirPadres();
    });
  }

  var navPadres = document.getElementById("nav-padres");
  activarBotonPadresConRetencion(navPadres);
  document.querySelectorAll(".btn-padres-salir").forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (window.FMV_salirPadres) window.FMV_salirPadres();
    });
  });
  var navPremios = document.getElementById("nav-premios");
  if (navPremios) navPremios.addEventListener("click", function () { if (window.FMV_abrirLogros) FMV_abrirLogros(); });

  var navPadresVideoElHold = document.getElementById("nav-padres-video");
  activarBotonPadresConRetencion(navPadresVideoElHold);
  window.FMV_alListo = function () {
    window.FMV_alListo = null;
    var ss = sesion();   // si la página se recargó, vuelve a donde estaba
    if (location.hash === "#videos" || ss.vista === "mis") iniciarMisVideos();
    else if (ss.vista === "canal" && ss.uc) iniciarCanal(ss.uc, ss.nombre, null, ss.pest);
    else if (ss.vermis) verMis(true);
  };
  window.FMV_repintarSelector = function () { if (vistaCanal.classList.contains("activo") && listaVideos.length) construirSelector(0); };
  window.FMV_tabVideos = function (n) { var c = document.getElementById("cuenta-mis"); if (c) { c.textContent = n > 99 ? "99+" : n; c.classList.toggle("hay", n > 0); } };

  function alternarPlayPausa() {
    if (!jugador || !jugador.getPlayerState) return;
    var st = jugador.getPlayerState() || -1;
    bloqueoAutoplay = true;
    clearTimeout(tBloqueoAutoplay);
    tBloqueoAutoplay = setTimeout(function () { bloqueoAutoplay = false; }, 1600);
    if (st === 1) {
      if (jugador.pauseVideo) jugador.pauseVideo();
      bPlay.innerHTML = ICONOS.play;
      actualizarIconoCentro(false);
      clearTimeout(tOculta);
      contenedor.classList.remove("inactivo");
      tapa.hidden = false;
    } else {
      if (jugador.playVideo) jugador.playVideo();
      bPlay.innerHTML = ICONOS.pausa;
      actualizarIconoCentro(true);
      tapa.hidden = true;
      contenedor.classList.add("inactivo");
      clearTimeout(tOculta);
    }
  }

  window.FMV_pausarVideo = function () {
    try {
      if (jugador && jugador.pauseVideo) jugador.pauseVideo();
    } catch (e) {}
    try {
      var iframeMarco = document.querySelector("#marco iframe, #marco, iframe");
      if (iframeMarco && iframeMarco.contentWindow) {
        iframeMarco.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
      }
      document.querySelectorAll("video, audio").forEach(function (el) { el.pause(); });
      if (bPlay) bPlay.innerHTML = ICONOS.play;
      actualizarIconoCentro(false);
      if (tapa) tapa.hidden = false;
    } catch (e) {}
  };
  window.FMV_reanudarVideo = function () { if (jugador && jugador.playVideo) try { jugador.playVideo(); } catch (e) {} };

  // Controles del reproductor
  bAnterior.addEventListener("click", anteriorVideo);
  bSiguiente.addEventListener("click", siguienteVideo);
  if (bAutoplay) {
    bAutoplay.addEventListener("click", function (e) {
      e.stopPropagation();
      autoplayActivado = !autoplayActivado;
      pintarAutoplay();
      if (autoplayActivado && videoActualId && jugador && jugador.getPlayerState && jugador.getPlayerState() === 0) {
        siguienteVideo();
      }
    });
  }
  bPlay.addEventListener("click", function (e) {
    e.stopPropagation();
    alternarPlayPausa();
  });
  tapa.addEventListener("click", function (e) {
    if (e.target && e.target.closest && e.target.closest(".play-circulo")) {
      e.stopPropagation();
      alternarPlayPausa();
    }
  });
  var volPanel = document.getElementById("vol-panel"), tVol = null;
  var volAviso = document.getElementById("vol-aviso");
  var volPorcentaje = document.getElementById("vol-porcentaje");
  var tHoldVol = null, holdStartTime = 0, tAvisoVol = null;

  function cerrarVol() { volPanel.classList.remove("abierto"); }
  function pintarSonido() {
    if (!listo) return;
    bSonido.innerHTML = '<div class="vol-progreso-aro"></div>' + ((jugador.isMuted && jugador.isMuted()) || !jugador.getVolume || !jugador.getVolume() ? ICONOS.mudo : ICONOS.sonido);
  }

  function mostrarAvisoVol(txt, dur) {
    if (!volAviso) return;
    volAviso.textContent = txt || "Mantén 3s para ajustar volumen";
    volAviso.classList.add("visible");
    clearTimeout(tAvisoVol);
    tAvisoVol = setTimeout(function () { volAviso.classList.remove("visible"); }, dur || 2200);
  }

  function iniciarHoldVol(e) {
    clearTimeout(tHoldVol);
    bSonido.classList.add("presionando");
    holdStartTime = Date.now();
    mostrarAvisoVol("Mantén presionado 3s...", 3200);
    tHoldVol = setTimeout(function () {
      bSonido.classList.remove("presionando");
      volPanel.classList.add("abierto");
      mostrarAvisoVol("🔊 ¡Volumen desbloqueado!", 2200);
      try { if (navigator.vibrate) navigator.vibrate(60); } catch (x) {}
      clearTimeout(tVol);
      tVol = setTimeout(cerrarVol, 6000);
    }, 3000);
  }

  function cancelarHoldVol(e) {
    if (tHoldVol) {
      clearTimeout(tHoldVol);
      tHoldVol = null;
      bSonido.classList.remove("presionando");
      if (Date.now() - holdStartTime < 2800 && !volPanel.classList.contains("abierto")) {
        mostrarAvisoVol("🔒 Mantén presionado 3s para desbloquear", 2000);
      }
    }
  }

  bSonido.addEventListener("pointerdown", iniciarHoldVol);
  bSonido.addEventListener("pointerup", cancelarHoldVol);
  bSonido.addEventListener("pointerleave", cancelarHoldVol);
  bSonido.addEventListener("pointercancel", cancelarHoldVol);
  bSonido.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  bSonido.addEventListener("click", function (e) {
    e.stopPropagation();
    if (!volPanel.classList.contains("abierto")) {
      mostrarAvisoVol("🔒 Mantén presionado 3s para desbloquear", 2000);
    }
  });

  volPanel.addEventListener("click", function (e) { e.stopPropagation(); });
  document.addEventListener("click", cerrarVol);
  var rangoDetector = document.getElementById("rango-detector");
  function actualizarDetectorTiempo() {
    if (!rangoDetector) return;
    var dur = (listo && jugador && jugador.getDuration) ? jugador.getDuration() : 0;
    var val = +rango.value;
    var seg = (val / 1000) * dur;
    rangoDetector.textContent = formato(seg);
    var pct = (val / 1000) * 100;
    rangoDetector.style.left = pct + "%";
  }

  rango.addEventListener("pointerenter", function () {
    if (rangoDetector) rangoDetector.hidden = false;
    actualizarDetectorTiempo();
  });
  rango.addEventListener("pointerleave", function () {
    if (!arrastrando && rangoDetector) rangoDetector.hidden = true;
  });
  rango.addEventListener("pointerdown", function () {
    arrastrando = true;
    if (rangoDetector) rangoDetector.hidden = false;
    actualizarDetectorTiempo();
  });
  rango.addEventListener("input", function () {
    arrastrando = true;
    if (rangoDetector) rangoDetector.hidden = false;
    actualizarDetectorTiempo();
  });
  rango.addEventListener("change", function () {
    if (listo) {
      var dur = jugador.getDuration() || 0;
      var nuevoSeg = dur * rango.value / 1000;
      if (nuevoSeg < 5 && videoActualId) {
        if (registrarReproduccionSeguida(videoActualId)) {
          arrastrando = false;
          if (rangoDetector) rangoDetector.hidden = true;
          return;
        }
      }
      jugador.seekTo(nuevoSeg, true);
    }
    arrastrando = false;
    if (rangoDetector) rangoDetector.hidden = true;
  });
  window.addEventListener("pointerup", function () {
    if (arrastrando) {
      arrastrando = false;
      if (rangoDetector) rangoDetector.hidden = true;
    }
  });

  /* ---------- Volumen (desbloqueado con toque sostenido de 3s) ---------- */
  var volumen = document.getElementById("volumen"), moviendoVol = false;
  volumen.addEventListener("input", function () {
    if (!listo) return;
    moviendoVol = true; clearTimeout(tVol);
    var v = +volumen.value;
    if (volPorcentaje) volPorcentaje.textContent = v + "%";
    jugador.setVolume(v);
    if (v === 0) jugador.mute(); else if (jugador.isMuted()) jugador.unMute();
    pintarSonido();
  });
  volumen.addEventListener("change", function () { moviendoVol = false; tVol = setTimeout(cerrarVol, 4000); });

  /* ---------- Subtítulos (función interna de YouTube, solo si el video los tiene) ---------- */
  var bSubs = document.getElementById("b-subs"), subsOn = false, videoConSubs = null;
  try { localStorage.removeItem("fmv_subs"); } catch (e) {}   // ya no se recuerda: cada video arranca sin subtítulos
  function pintarSubs() {
    if (!bSubs) return;
    bSubs.classList.toggle("activo", !!subsOn);
    bSubs.setAttribute("aria-pressed", String(!!subsOn));
    bSubs.setAttribute("aria-label", subsOn ? "Desactivar subtítulos" : "Activar subtítulos");
    bSubs.title = subsOn ? "Desactivar subtítulos" : "Activar subtítulos";
  }
  /* Cada video nuevo empieza sin subtítulos; el botón solo los activa para el video que se está viendo */
  function nuevoVideoSubs() {
    subsOn = false;
    videoConSubs = null;
    pintarSubs();
    try {
      if (jugador && jugador.setOption) {
        jugador.setOption("captions", "track", {});
      }
    } catch (e) {}
    try {
      if (jugador && jugador.unloadModule) {
        jugador.unloadModule("captions");
      }
    } catch (e) {}
  }
  function aplicarSubs() {
    if (!listo) return;
    var vid = videoActualId;
    var quitar = function () {
      if (vid !== videoActualId || !listo) return;
      try { if (jugador && jugador.setOption) jugador.setOption("captions", "track", {}); } catch (e) {}
      try { if (jugador && jugador.unloadModule) jugador.unloadModule("captions"); } catch (e) {}
    };
    quitar(); setTimeout(quitar, 800); setTimeout(quitar, 2500);
  }
  pintarSubs();
  pintarAutoplay();
  /* Plan B (el método anterior): recrear el reproductor con subtítulos forzados */
  function subsPorRecreacion() {
    var id = videoActualId, t = 0;
    try { t = jugador.getCurrentTime() || 0; } catch (e) {}
    recrearJugador(subsOn, function () {
      jugador.loadVideoById({ videoId: id, startSeconds: t });
      if (!subsOn) aplicarSubs();
    });
  }
  /* Interruptor simple, como la tecla C de YouTube: activa/desactiva sin reiniciar el video */
  function alternarSubs() {
    if (!listo || !videoActualId) return;
    subsOn = !subsOn; videoConSubs = videoActualId; pintarSubs();
    var id = videoActualId;
    if (modoSubs) { subsPorRecreacion(); return; }
    if (!subsOn) {
      try { if (jugador && jugador.setOption) jugador.setOption("captions", "track", {}); } catch (e) {}
      try { if (jugador && jugador.unloadModule) jugador.unloadModule("captions"); } catch (e) {}
      return;
    }
    try { if (jugador && jugador.loadModule) jugador.loadModule("captions"); } catch (e) {}
    var intentos = 0;
    (function probar() {
      if (!subsOn || id !== videoActualId) return;
      var pistas = [];
      try { pistas = (jugador && jugador.getOption) ? jugador.getOption("captions", "tracklist") || [] : []; } catch (e) {}
      if (pistas.length) {
        var es = pistas.filter(function (p) { return /^es/.test(p.languageCode || ""); })[0] || pistas[0];
        try { if (jugador && jugador.setOption) jugador.setOption("captions", "track", { languageCode: es.languageCode }); } catch (e) {}
        return;
      }
      if (++intentos < 6) setTimeout(probar, 400);
      else subsPorRecreacion();
    })();
  }

  bSubs.addEventListener("click", alternarSubs);

  /* Atajos de teclado: Espacio (Pausar/Reanudar) y C (Activar/Desactivar subtítulos) */
  document.addEventListener("keydown", function (e) {
    var t = e.target;
    var esInput = t && ((t.tagName === "INPUT" && t.type !== "range") || t.tagName === "TEXTAREA" || t.isContentEditable);
    if (esInput) return;

    // Tecla Espacio: Pausar / Reanudar
    if (e.code === "Space" || e.key === " " || e.keyCode === 32) {
      if (document.body.classList.contains("viendo") || (listo && jugador && videoActualId)) {
        e.preventDefault();
        alternarPlayPausa();
      }
      return;
    }

    // Tecla C: Activar / Desactivar subtítulos
    if (!e.ctrlKey && !e.metaKey && !e.altKey && (e.key === "c" || e.key === "C" || e.code === "KeyC")) {
      if (document.body.classList.contains("viendo") || (listo && jugador && videoActualId)) {
        e.preventDefault();
        alternarSubs();
      }
      return;
    }

    // Flechas del teclado para deslizar abajo y arriba
    if (e.key === "ArrowDown" || e.code === "ArrowDown" || e.keyCode === 40) {
      e.preventDefault();
      window.scrollBy({ top: 320, behavior: "smooth" });
      return;
    }
    if (e.key === "ArrowUp" || e.code === "ArrowUp" || e.keyCode === 38) {
      e.preventDefault();
      window.scrollBy({ top: -320, behavior: "smooth" });
      return;
    }
    if (e.key === "ArrowRight" || e.code === "ArrowRight" || e.keyCode === 39) {
      if (document.body.classList.contains("viendo") || (listo && jugador && videoActualId)) {
        if (jugador && jugador.getCurrentTime && jugador.seekTo) {
          e.preventDefault();
          var actual = jugador.getCurrentTime();
          var dur = jugador.getDuration ? jugador.getDuration() : actual + 10;
          var nuevo = Math.min(dur, actual + 10);
          jugador.seekTo(nuevo, true);
        }
      }
      return;
    }
    if (e.key === "ArrowLeft" || e.code === "ArrowLeft" || e.keyCode === 37) {
      if (document.body.classList.contains("viendo") || (listo && jugador && videoActualId)) {
        if (jugador && jugador.getCurrentTime && jugador.seekTo) {
          e.preventDefault();
          var actual = jugador.getCurrentTime();
          var nuevo = Math.max(0, actual - 10);
          jugador.seekTo(nuevo, true);
        }
      }
      return;
    }
  });

  /* ---------- Modo padres: quitar la barrera transparente y mostrar controles/engranaje de YouTube ---------- */
  // Force update
  var bLibre = document.getElementById("b-libre"), tLibre = null;
  bLibre.innerHTML = ICONOS.libre;
  bLibre.title = "Modo Padres: Toca para mostrar controles y engranaje ⚙️ de YouTube";
  function bloquearOtraVez() {
    clearTimeout(tLibre);
    wrapperVideo.classList.remove("libre");
    bLibre.classList.remove("activo");
    var id = videoActualId, t = 0;
    try { t = Math.floor(jugador.getCurrentTime() || 0); } catch (e) {}
    recrearJugador(modoSubs, function () {
      jugador.loadVideoById({ videoId: id, startSeconds: t });
      try { jugador.playVideo(); } catch (e) {}
    }, false);
  }
  bLibre.addEventListener("click", function () {
    if (wrapperVideo.classList.contains("libre")) { bloquearOtraVez(); return; }
    if (!document.body.classList.contains("padre")) return;
    wrapperVideo.classList.add("libre");
    bLibre.classList.add("activo");
    clearTimeout(tLibre);
    tLibre = setTimeout(bloquearOtraVez, 90000);   // se vuelve a cerrar solo a los 90 segundos

    // Recrear con controles nativos (controls: 1) para que aparezca el engranaje ⚙️ de YouTube
    var id = videoActualId, t = 0;
    try { t = Math.floor(jugador.getCurrentTime() || 0); } catch (e) {}
    recrearJugador(modoSubs, function () {
      jugador.loadVideoById({ videoId: id, startSeconds: t });
      try { jugador.playVideo(); } catch (e) {}
    }, true);
  });

  var tOculta = null;
  var controlesVideo = document.getElementById("controles");
  var interactuandoControles = false;
  function ocultarYa() {
    if (listo && jugador && jugador.getPlayerState && jugador.getPlayerState() === 1) {
      contenedor.classList.add("inactivo");
    }
  }
  function programarOcultar() {
    clearTimeout(tOculta);
    if (listo && jugador && jugador.getPlayerState && jugador.getPlayerState() === 1) {
      tOculta = setTimeout(ocultarYa, 1000);
    }
  }
  function mostrarControles() {
    contenedor.classList.remove("inactivo");
    programarOcultar();
  }
  var scrollAntesPantalla = 0, ultimoGestoPantalla = 0;
  function enPantallaCompleta() {
    return contenedor.classList.contains("en-pantalla") ||
      document.fullscreenElement === contenedor || document.webkitFullscreenElement === contenedor;
  }
  function pintarPantallaCompleta(activa) {
    contenedor.classList.toggle("en-pantalla", activa);
    contenedor.classList.remove("inactivo");
    bPantalla.innerHTML = activa ? ICONOS.salirPantalla : ICONOS.pantalla;
    bPantalla.setAttribute("aria-label", activa ? "Salir de pantalla completa" : "Pantalla completa");
    bPantalla.title = activa ? "Salir de pantalla completa" : "Pantalla completa";
    document.body.style.overflow = activa ? "hidden" : "";
    clearTimeout(tOculta);
    if (activa) {
      programarOcultar();
    } else {
      var y = scrollAntesPantalla;
      requestAnimationFrame(function () { window.scrollTo(0, y); });
    }
  }
  function entrarPantallaCompleta() {
    scrollAntesPantalla = window.scrollY;
    var solicitar = contenedor.requestFullscreen || contenedor.webkitRequestFullscreen;
    if (!solicitar) {
      pintarPantallaCompleta(true);
      return;
    }
    try {
      var resultado = solicitar.call(contenedor);
      if (resultado && typeof resultado.then === "function") {
        resultado.then(function () { pintarPantallaCompleta(true); })
          .catch(function () { pintarPantallaCompleta(true); });
      } else {
        pintarPantallaCompleta(true);
      }
    } catch (error) {
      pintarPantallaCompleta(true);
    }
  }
  function salirPantallaCompleta() {
    var salir = document.exitFullscreen || document.webkitExitFullscreen;
    if ((document.fullscreenElement === contenedor || document.webkitFullscreenElement === contenedor) && salir) {
      try {
        var resultado = salir.call(document);
        if (resultado && typeof resultado.catch === "function") {
          resultado.catch(function () { pintarPantallaCompleta(false); });
        }
      } catch (error) {
        pintarPantallaCompleta(false);
      }
    } else {
      pintarPantallaCompleta(false);
    }
  }
  function sincronizarPantallaCompleta() {
    pintarPantallaCompleta(document.fullscreenElement === contenedor || document.webkitFullscreenElement === contenedor);
  }
  bPantalla.addEventListener("click", function () {
    if (enPantallaCompleta()) salirPantallaCompleta();
    else entrarPantallaCompleta();
  });
  document.addEventListener("fullscreenchange", sincronizarPantallaCompleta);
  document.addEventListener("webkitfullscreenchange", sincronizarPantallaCompleta);

  var gestoInicioX = 0, gestoInicioY = 0, gestoInicioTiempo = 0, gestoXMax = 0;
  var gestoActivo = false, gestoEstabaCompleta = false;
  wrapperVideo.addEventListener("touchstart", function (e) {
    if (e.touches.length !== 1 || (e.target.closest && e.target.closest(".play-circulo"))) {
      gestoActivo = false;
      return;
    }
    gestoActivo = true;
    gestoEstabaCompleta = enPantallaCompleta();
    gestoInicioX = e.touches[0].clientX;
    gestoInicioY = e.touches[0].clientY;
    gestoInicioTiempo = Date.now();
    gestoXMax = 0;
  }, { passive: true });
  wrapperVideo.addEventListener("touchmove", function (e) {
    if (!gestoActivo || e.touches.length !== 1) {
      gestoActivo = false;
      return;
    }
    gestoXMax = Math.max(gestoXMax, Math.abs(e.touches[0].clientX - gestoInicioX));
  }, { passive: true });
  wrapperVideo.addEventListener("touchend", function (e) {
    if (!gestoActivo) return;
    gestoActivo = false;
    if (Date.now() - gestoInicioTiempo > 900 || !e.changedTouches.length) return;
    var touch = e.changedTouches[0];
    var dy = touch.clientY - gestoInicioY;
    var dx = Math.max(Math.abs(touch.clientX - gestoInicioX), gestoXMax);
    if (Math.abs(dy) < 65 || Math.abs(dy) < dx * 1.4) return;
    if (gestoEstabaCompleta && dy < 0) {
      ultimoGestoPantalla = Date.now();
      salirPantallaCompleta();
    } else if (!gestoEstabaCompleta && dy > 0) {
      ultimoGestoPantalla = Date.now();
      entrarPantallaCompleta();
    }
  }, { passive: true });
  wrapperVideo.addEventListener("click", function (e) {
    if (Date.now() - ultimoGestoPantalla < 500) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }, true);
  function alSalirDelReproductor(e) {
    if (e && e.pointerType === "touch") return;
    if (listo && jugador && jugador.getPlayerState && jugador.getPlayerState() === 1) {
      clearTimeout(tOculta);
      contenedor.classList.add("inactivo");
    }
  }
  contenedor.addEventListener("pointerleave", alSalirDelReproductor);
  contenedor.addEventListener("mouseleave", alSalirDelReproductor);

  var ultPtrX = -1, ultPtrY = -1;
  function alMoverSobreReproductor(e) {
    if (interactuandoControles) return;
    if (e && (e.type === "pointermove" || e.type === "mousemove")) {
      if (ultPtrX >= 0 && Math.abs(e.clientX - ultPtrX) < 4 && Math.abs(e.clientY - ultPtrY) < 4) return;
      ultPtrX = e.clientX; ultPtrY = e.clientY;
      mostrarControles();
    }
  }
  contenedor.addEventListener("pointermove", alMoverSobreReproductor);
  controlesVideo.addEventListener("pointerdown", function () {
    interactuandoControles = true;
    clearTimeout(tOculta);
    contenedor.classList.remove("inactivo");
  });
  document.addEventListener("pointerup", function () {
    if (!interactuandoControles) return;
    interactuandoControles = false;
    programarOcultar();
  });
  document.addEventListener("pointercancel", function () {
    if (!interactuandoControles) return;
    interactuandoControles = false;
    programarOcultar();
  });
  wrapperVideo.addEventListener("click", function (e) {
    if (e.target.closest && (e.target.closest("#aviso-vivo") || e.target.closest(".play-circulo")) || wrapperVideo.classList.contains("libre") || !listo) return;
    /* Al tocar en cualquier zona fuera del icono verde:
       Alterna entre ocultar y volver a mostrar la barra de navegación de reproducción.
       Mantiene el temporizador de 1s de desvanecimiento cuando se muestra. */
    if (contenedor.classList.contains("inactivo")) {
      mostrarControles();
    } else {
      contenedor.classList.add("inactivo");
      clearTimeout(tOculta);
    }
  });

  // Generación de tarjetas con imágenes automáticas basadas en el ID del canal
  function inicial(nombre, i) {
    var d = document.createElement("div");
    d.className = "inicial";
    d.style.background = COLORES[i % COLORES.length];
    d.textContent = nombre.charAt(0).toUpperCase();
    return d;
  }

  function crearTarjeta(item, i) {
    var url = item.url || item.enlace || "";
    if (!url) return null;
    var nombre = item.nombre || item.name || "Canal";
    var idCanal = (item.id || "").trim();
    var imagen = item.imagen || item.image || "";

    var a = document.createElement("div");
    a.className = "tarjeta";

    var media = document.createElement("div");
    media.className = "media";

    if (!imagen && /^UC[\w-]{22}$/.test(idCanal)) {
      imagen = "https://yt3.googleusercontent.com/ytc/" + idCanal; 
    }

    if (imagen) {
      var img = document.createElement("img");
      img.src = imagen;
      img.alt = "";
      img.loading = "lazy";
      img.onerror = function () { media.replaceChildren(inicial(nombre, i)); };
      media.appendChild(img);
    } else {
      media.appendChild(inicial(nombre, i));
    }

    var titulo = document.createElement("p");
    titulo.className = "nombre";
    titulo.textContent = nombre;

    a.appendChild(media);
    a.appendChild(titulo);

    if (/^UC[\w-]{22}$/.test(idCanal)) {
      a.addEventListener("click", function () {
        iniciarCanal(idCanal, nombre);
      });
    } else {
      a.addEventListener("click", function () {
        window.open(url, "_blank");
      });
    }

    return a;
  }

  fetch("canales.json?_t=" + Date.now(), { cache: "no-store" })
    .then(function (r) {
      if (!r.ok) throw new Error("No se encontró canales.json");
      return r.json();
    })
    .then(function (datos) {
      var lista = Array.isArray(datos) ? datos : (datos.canales || datos.channels || []);
      var cuadricula = document.getElementById("cuadricula");
      lista.forEach(function (item, i) {
        var t = crearTarjeta(item, i);
        if (t) cuadricula.appendChild(t);
      });
      document.getElementById("mensaje").hidden = cuadricula.children.length > 0;
    })
    .catch(function () {
      document.getElementById("mensaje").textContent = "No se pudo leer canales.json.";
    });
