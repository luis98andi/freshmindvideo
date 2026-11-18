with open("canales-auto.js", "r", encoding="utf-8") as f:
    code = f.read()

actualizar_func = """
  function abrirActualizar() {
    var m = modal(
      '<h3 style="margin:0 0 8px">🌐 Actualizar para todos (Archivos JSON)</h3>' +
      '<p style="font-size:13.5px;opacity:.8;margin:0 0 16px;line-height:1.4">Puedes descargar los archivos actualizados canales.json y mis_videos.json para subirlos a tu servidor, hosting o compartirlos en tus dispositivos.</p>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px">' +
        '<button type="button" data-c1 style="' + ESTILO_BT + ';background:#2f6fdd">Descargar canales.json</button>' +
        '<button type="button" data-c2 style="' + ESTILO_BT + ';background:#0d9488">Descargar mis_videos.json</button>' +
      '</div>' +
      '<div style="display:flex;justify-content:flex-end"><button type="button" data-x style="' + ESTILO_BT + ';background:#5b6b7a">Cerrar</button></div>',
      480
    );
    var q = function (s) { return m.caja.querySelector(s); };
    q("[data-x]").addEventListener("click", m.cerrar);
    q("[data-c1]").addEventListener("click", function () {
      var blob = new Blob([armarJson()], { type: "application/json;charset=utf-8" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url; a.download = "canales.json";
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      mostrarToast("✓ Archivo canales.json descargado.");
    });
    q("[data-c2]").addEventListener("click", function () {
      var blob = new Blob([armarMisVideosJson()], { type: "application/json;charset=utf-8" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url; a.download = "mis_videos.json";
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      mostrarToast("✓ Archivo mis_videos.json descargado.");
    });
  }
  window.FMV_abrirActualizar = abrirActualizar;
"""

target = "  function abrirCambiarPin() {"
if target in code and "function abrirActualizar" not in code:
    code = code.replace(target, actualizar_func + "\n" + target)
    print("Added abrirActualizar function successfully")

old_btn_target = '    fila("🙈 Videos y listas ocultas"'
new_btns = '    fila("🌐 Actualizar para todos", "#2f6fdd", abrirActualizar);\n    fila("🙈 Videos y listas ocultas"'

if old_btn_target in code and "🌐 Actualizar para todos" not in code:
    code = code.replace(old_btn_target, new_btns)
    print("Added button in abrirPanelPadres successfully")

with open("canales-auto.js", "w", encoding="utf-8") as f:
    f.write(code)

print("canales-auto.js successfully updated!")
