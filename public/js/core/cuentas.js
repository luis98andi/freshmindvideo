/* Almacenamiento local separado por perfil. Los datos permanecen en este navegador. */
(function () {
  var perfilesValidos = ["hija", "hijo"];
  var clavePerfilActivo = "fmv_perfil_activo";

  function perfilValido(perfil) {
    return perfilesValidos.indexOf(perfil) >= 0;
  }

  function perfilActual(perfil) {
    var seleccionado = perfil || window.FMV_perfil;
    return perfilValido(seleccionado) ? seleccionado : "";
  }

  function claveCuenta(clave, perfil) {
    var seleccionado = perfilActual(perfil);
    if (!seleccionado) return "";
    return "fmv_cuenta_" + seleccionado + "_" + clave;
  }

  window.FMV_cuentas = {
    perfilActivo: function () {
      try {
        var perfil = localStorage.getItem(clavePerfilActivo);
        return perfilValido(perfil) ? perfil : "";
      } catch (error) {
        return "";
      }
    },
    guardarPerfilActivo: function (perfil) {
      if (!perfilValido(perfil)) return false;
      try {
        localStorage.setItem(clavePerfilActivo, perfil);
        return true;
      } catch (error) {
        return false;
      }
    },
    leer: function (clave, perfil) {
      var key = claveCuenta(clave, perfil);
      if (!key) return null;
      try {
        return localStorage.getItem(key);
      } catch (error) {
        return null;
      }
    },
    guardar: function (clave, valor, perfil) {
      var key = claveCuenta(clave, perfil);
      if (!key) return false;
      try {
        localStorage.setItem(key, String(valor));
        return true;
      } catch (error) {
        return false;
      }
    },
    quitar: function (clave, perfil) {
      var key = claveCuenta(clave, perfil);
      if (!key) return false;
      try {
        localStorage.removeItem(key);
        return true;
      } catch (error) {
        return false;
      }
    }
  };
})();
