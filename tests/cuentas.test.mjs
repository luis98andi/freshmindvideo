import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(new URL("../public/js/core/cuentas.js", import.meta.url), "utf8");

function cargarCuentas(valores = new Map()) {
  const localStorage = {
    getItem: (key) => valores.has(key) ? valores.get(key) : null,
    setItem: (key, value) => valores.set(key, String(value)),
    removeItem: (key) => valores.delete(key)
  };
  const window = { FMV_perfil: "" };
  vm.runInNewContext(source, { window, localStorage });
  return { cuentas: window.FMV_cuentas, valores, window };
}

test("guarda los datos de cada perfil en claves locales independientes", () => {
  const { cuentas, valores } = cargarCuentas();

  assert.equal(cuentas.guardar("fmv_historial", "hija-data", "hija"), true);
  assert.equal(cuentas.guardar("fmv_historial", "hijo-data", "hijo"), true);

  assert.equal(cuentas.leer("fmv_historial", "hija"), "hija-data");
  assert.equal(cuentas.leer("fmv_historial", "hijo"), "hijo-data");
  assert.equal(valores.size, 2);
});

test("recuerda el perfil seleccionado entre cargas y rechaza perfiles desconocidos", () => {
  const { cuentas, valores } = cargarCuentas();

  assert.equal(cuentas.guardarPerfilActivo("hijo"), true);
  assert.equal(cuentas.guardarPerfilActivo("desconocido"), false);
  assert.equal(cargarCuentas(valores).cuentas.perfilActivo(), "hijo");
});

test("usa la cuenta activa para aislar escrituras sin perfil explícito", () => {
  const { cuentas, window } = cargarCuentas();

  window.FMV_perfil = "hija";
  cuentas.guardar("fmv_videos", "videos-hija");
  window.FMV_perfil = "hijo";
  cuentas.guardar("fmv_videos", "videos-hijo");

  assert.equal(cuentas.leer("fmv_videos", "hija"), "videos-hija");
  assert.equal(cuentas.leer("fmv_videos"), "videos-hijo");
});
