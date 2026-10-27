/* FreshMindVideo - Reportes y Estadísticas de Uso para Padres
   Registra tiempo de visualización diario por perfil y muestra gráficos fáciles de entender. */
(function () {
  var LS_KEY = "fmv_reportes_uso_v1";

  function hoyKey() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function leerReportes() {
    try {
      var d = JSON.parse(localStorage.getItem(LS_KEY));
      if (d && typeof d === "object") return d;
    } catch (e) {}
    return { dias: {}, canales: {} };
  }

  function guardarReportes(r) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(r)); } catch (e) {}
  }

  // Registrar cada 30 segundos mientras se reproduce un video
  setInterval(function () {
    var estaViendo = document.body.classList.contains("viendo");
    var esPadre = document.body.classList.contains("padre");
    if (!estaViendo || esPadre) return;

    var perfil = window.FMV_perfil || "general";
    var hk = hoyKey();
    var r = leerReportes();

    if (!r.dias[hk]) r.dias[hk] = { hija: 0, hijo: 0, general: 0 };
    r.dias[hk][perfil] = (r.dias[hk][perfil] || 0) + 30; // 30 segundos

    // Canal activo
    var titCanal = document.getElementById("titulo-canal-activo");
    var nomCanal = titCanal ? titCanal.textContent.trim() : "";
    if (nomCanal) {
      if (!r.canales[nomCanal]) r.canales[nomCanal] = 0;
      r.canales[nomCanal] += 30;
    }

    guardarReportes(r);
  }, 30000);

  // Modal con Gráficos y Estadísticas de Uso
  window.FMV_abrirReportes = function () {
    var r = leerReportes();
    var modalEl = document.createElement("div");
    modalEl.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;overflow:auto";

    var caja = document.createElement("div");
    caja.style.cssText = "background:#fff;border-radius:24px;padding:24px;width:100%;max-width:540px;max-height:88vh;overflow-y:auto;box-shadow:0 12px 36px rgba(0,0,0,.3);font-family:inherit;color:#1d2b3a";

    // Calcular últimos 7 días
    var diasSemana = [];
    var nombresDias = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    var maxMinutos = 1;
    var totalMinutosSemana = 0;

    for (var i = 6; i >= 0; i--) {
      var f = new Date();
      f.setDate(f.getDate() - i);
      var k = f.getFullYear() + "-" + String(f.getMonth() + 1).padStart(2, "0") + "-" + String(f.getDate()).padStart(2, "0");
      var datosDia = r.dias[k] || { hija: 0, hijo: 0, general: 0 };
      var minHija = Math.round((datosDia.hija || 0) / 60);
      var minHijo = Math.round((datosDia.hijo || 0) / 60);
      var totalDia = minHija + minHijo + Math.round((datosDia.general || 0) / 60);

      totalMinutosSemana += totalDia;
      if (totalDia > maxMinutos) maxMinutos = totalDia;

      diasSemana.push({
        fecha: k,
        etiqueta: nombresDias[f.getDay()],
        minHija: minHija,
        minHijo: minHijo,
        total: totalDia
      });
    }

    // Canales más vistos (top 4)
    var listaCanales = Object.keys(r.canales || {}).map(function (c) {
      return { nombre: c, minutos: Math.round(r.canales[c] / 60) };
    }).sort(function (a, b) { return b.minutos - a.minutos; }).slice(0, 4);

    var html =
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">' +
      '<div style="display:flex;align-items:center;gap:8px">' +
      '<span style="font-size:26px">📊</span>' +
      '<h2 style="margin:0;font-size:1.3rem">Estadísticas y Reporte de Uso</h2>' +
      '</div>' +
      '<button type="button" data-cerrar style="border:0;background:#e2e8f0;color:#334155;border-radius:999px;padding:6px 14px;font-weight:800;cursor:pointer">Cerrar</button>' +
      '</div>' +
      '<p style="margin:0 0 16px;font-size:.88rem;opacity:.8">Monitorea el tiempo de pantalla y los canales favoritos durante los últimos 7 días.</p>' +

      // Resumen
      '<div style="background:#f4f8fb;border-radius:16px;padding:14px;margin-bottom:16px;display:flex;justify-content:space-around;text-align:center">' +
      '<div>' +
      '<div style="font-size:.78rem;font-weight:800;color:#64748b;text-transform:uppercase">Esta Semana</div>' +
      '<div style="font-size:1.5rem;font-weight:800;color:#0a6b53">' + totalMinutosSemana + ' min</div>' +
      '</div>' +
      '<div>' +
      '<div style="font-size:.78rem;font-weight:800;color:#64748b;text-transform:uppercase">Promedio Diario</div>' +
      '<div style="font-size:1.5rem;font-weight:800;color:#2f6fdd">' + Math.round(totalMinutosSemana / 7) + ' min/día</div>' +
      '</div>' +
      '</div>' +

      // Gráfico de Barras Simple
      '<div style="background:#fff;border:1.5px solid #e2e8f0;border-radius:16px;padding:16px;margin-bottom:16px">' +
      '<div style="font-size:.85rem;font-weight:800;margin-bottom:12px;display:flex;justify-content:space-between">' +
      '<span>Minutos por día (Última semana):</span>' +
      '<span style="font-size:.75rem;color:#64748b">👧 Hija / 👦 Hijo</span>' +
      '</div>' +
      '<div style="display:flex;align-items:flex-end;justify-content:space-between;height:120px;padding:10px 4px 0;border-bottom:2px solid #cbd5e1;gap:6px">';

    diasSemana.forEach(function (d) {
      var pctHija = maxMinutos ? Math.min(100, Math.round((d.minHija / maxMinutos) * 100)) : 0;
      var pctHijo = maxMinutos ? Math.min(100, Math.round((d.minHijo / maxMinutos) * 100)) : 0;
      html +=
        '<div style="flex:1;display:flex;flex-direction:column;align-items:center;height:100%;justify-content:flex-end">' +
        '<div style="font-size:10px;font-weight:800;color:#64748b;margin-bottom:4px">' + (d.total ? d.total + 'm' : '') + '</div>' +
        '<div style="width:100%;max-width:24px;display:flex;flex-direction:column;border-radius:6px;overflow:hidden;background:#e2e8f0">' +
        (pctHijo ? '<div style="background:#3b82f6;height:' + pctHijo + '%;min-height:3px" title="Hijo: ' + d.minHijo + 'm"></div>' : '') +
        (pctHija ? '<div style="background:#ec4899;height:' + pctHija + '%;min-height:3px" title="Hija: ' + d.minHija + 'm"></div>' : '') +
        '</div>' +
        '<div style="font-size:11px;font-weight:800;margin-top:6px;color:#475569">' + d.etiqueta + '</div>' +
        '</div>';
    });

    html +=
      '</div>' +
      '<div style="display:flex;justify-content:center;gap:16px;margin-top:10px;font-size:.76rem;font-weight:800">' +
      '<span style="display:inline-flex;align-items:center;gap:4px"><span style="width:10px;height:10px;background:#ec4899;border-radius:2px"></span> Hija</span>' +
      '<span style="display:inline-flex;align-items:center;gap:4px"><span style="width:10px;height:10px;background:#3b82f6;border-radius:2px"></span> Hijo</span>' +
      '</div>' +
      '</div>' +

      // Canales Más Vistos
      '<div style="background:#f8fafc;border-radius:16px;padding:14px;margin-bottom:14px">' +
      '<div style="font-size:.9rem;font-weight:800;margin-bottom:10px">Canales Más Vistos:</div>';

    if (listaCanales.length) {
      listaCanales.forEach(function (c, idx) {
        html +=
          '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #e2e8f0;font-size:.85rem">' +
          '<span style="font-weight:700">#' + (idx + 1) + ' ' + c.nombre + '</span>' +
          '<span style="color:#0a6b53;font-weight:800">' + c.minutos + ' min</span>' +
          '</div>';
      });
    } else {
      html += '<div style="font-size:.82rem;color:#64748b;text-align:center;padding:10px">Aún no hay suficientes datos registrados.</div>';
    }

    html += '</div>';

    caja.innerHTML = html;
    modalEl.appendChild(caja);
    document.body.appendChild(modalEl);

    caja.querySelector("[data-cerrar]").addEventListener("click", function () { modalEl.remove(); });
    modalEl.addEventListener("click", function (e) { if (e.target === modalEl) modalEl.remove(); });
  };
})();
