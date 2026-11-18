import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Mis videos usa distribución 4x4 en escritorio y móvil", async () => {
  const css = await readFile(new URL("../public/css/styles.css", import.meta.url), "utf8");
  const matches = css.match(/body\.ver-mis #cuadricula-mis\s*\{[^}]*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/g) || [];
  assert.ok(matches.length >= 3, "Debe definir 4 columnas en escritorio, <=760px y <=380px");
});

test("botón de orientación horizontal/vertical está al inicio de la fila de orden de canales", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const idxControles = html.indexOf('id="controles-canales"');
  const idxOrientacion = html.indexOf('id="btn-orientacion-canales"');
  const idxOrden = html.indexOf('id="orden-canales"');
  assert.ok(idxControles > 0 && idxOrientacion > idxControles && idxOrden > idxOrientacion);

  const reproductor = await readFile(new URL("../public/js/player/reproductor.js", import.meta.url), "utf8");
  assert.match(reproductor, /bOrientacionCanales\s*=\s*document\.getElementById\("btn-orientacion-canales"\)/);
  assert.match(reproductor, /bOrientacionCanales\.addEventListener\("click",\s*alternarOrientacion\)/);
});

test("Restaurar contenido oculto vive dentro de Videos y listas ocultas con confirmación de advertencia", async () => {
  const zonaPadres = await readFile(new URL("../public/js/parental/zona-padres.js", import.meta.url), "utf8");
  assert.doesNotMatch(zonaPadres, /Restaurar contenido oculto/);

  const canalesAuto = await readFile(new URL("../public/js/channels/canales-auto.js", import.meta.url), "utf8");
  assert.match(canalesAuto, /data-restaurar-ocultos/);
  assert.match(canalesAuto, /btnRestaurar\.addEventListener\("click",\s*function\s*\(\)\s*\{\s*restaurar\(renderLista\);/);
  assert.match(canalesAuto, /Advertencia:.*volverán a mostrarse/);
});
