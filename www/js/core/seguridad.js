/* Safe storage helper for Capacitor Android WebViews & browser restrictions */
(function () {
  var mem = {};
  var storageAvailable = true;
  try {
    var testKey = "__fmv_test__";
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
  } catch (e) {
    storageAvailable = false;
  }

  window.FMV_getItem = function (k, def) {
    try {
      if (storageAvailable && window.localStorage) {
        var v = window.localStorage.getItem(k);
        return v !== null ? v : def;
      }
    } catch (e) {}
    return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : def;
  };

  window.FMV_setItem = function (k, v) {
    try {
      mem[k] = String(v);
      if (storageAvailable && window.localStorage) {
        window.localStorage.setItem(k, String(v));
      }
    } catch (e) {}
  };

  window.FMV_removeItem = function (k) {
    try {
      delete mem[k];
      if (storageAvailable && window.localStorage) {
        window.localStorage.removeItem(k);
      }
    } catch (e) {}
  };
})();

/* Security & Navigation protection */
(function () {
  var YT_OK = /^https:\/\/(www\.youtube\.com|www\.youtube-nocookie\.com|i\.ytimg\.com|yt3\.ggpht\.com)/i;
  try {
    var abrir = window.open;
    window.open = function (url, name, features) {
      try {
        var target = String(url || "");
        if (!target) return abrir ? abrir.call(window, url, name, features) : null;
        var parsed = new URL(target, location.href);
        if (parsed.origin !== location.origin && !YT_OK.test(parsed.href)) return null;
      } catch (e) {}
      return abrir ? abrir.call(window, url, name, features) : null;
    };
  } catch (e) {}
  try {
    if (window.navigation) {
      navigation.addEventListener("navigate", function (e) {
        try {
          var u = new URL(e.destination.url, location.href);
          if (u.origin !== location.origin && !YT_OK.test(u.href)) e.preventDefault();
        } catch (x) {}
      });
    }
  } catch (e) {}
  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest && e.target.closest("a[href]");
    if (!a || !a.href) return;
    try {
      var u = new URL(a.href, location.href);
      if (u.origin !== location.origin && !YT_OK.test(u.href)) {
        e.preventDefault();
        e.stopPropagation();
      }
    } catch (x) {}
  }, true);
  window.addEventListener("beforeinstallprompt", function (e) {
    try { e.preventDefault(); } catch (x) {}
  });
})();
