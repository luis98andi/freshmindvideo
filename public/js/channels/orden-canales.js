/* Ordena canales con marca de alta y conserva una secuencia histórica para los datos antiguos. */
(function () {
  window.FMV_ordenarCanales = function (lista, orden) {
    var elementos = (Array.isArray(lista) ? lista : []).map(function (canal, indice) {
      var fecha = Number(canal && canal.agregadoEn);
      return {
        canal: canal,
        indice: indice,
        fecha: Number.isFinite(fecha) && fecha > 0 ? fecha : indice + 1
      };
    });

    elementos.sort(function (a, b) {
      if (orden === "alphabetical") {
        return String(a.canal.nombre || a.canal.name || "")
          .localeCompare(String(b.canal.nombre || b.canal.name || ""), "es", { sensitivity: "base" });
      }
      if (orden === "oldest") return a.fecha - b.fecha || a.indice - b.indice;
      return b.fecha - a.fecha || b.indice - a.indice;
    });

    return elementos.map(function (item) { return item.canal; });
  };
})();
