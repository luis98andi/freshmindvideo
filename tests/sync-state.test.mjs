import assert from "node:assert/strict";
import test from "node:test";
import {
  encodeStoredValue,
  isSyncableKey,
  snapshotSyncableStorage
} from "../src/js/parental/sync-state.js";

function fakeStorage(entries) {
  const values = new Map(entries);
  return {
    get length() { return values.size; },
    key(index) { return Array.from(values.keys())[index] ?? null; },
    getItem(key) { return values.has(key) ? values.get(key) : null; }
  };
}

test("permite sincronizar canales, videos por perfil y ajustes", () => {
  assert.equal(isSyncableKey("fmv_extra"), true);
  assert.equal(isSyncableKey("fmv_cuenta_hija_fmv_videos"), true);
  assert.equal(isSyncableKey("fmv_cuenta_hijo_limite_minutos"), true);
  assert.equal(isSyncableKey("fmv_horarios_rutina"), true);
});

test("excluye PIN, historial, actividad infantil y perfil activo", () => {
  for (const key of [
    "fmv_pin_padres",
    "fmv_historial",
    "fmv_perfil_activo",
    "fmv_cuenta_hija_uso_segundos",
    "fmv_cuenta_hijo_fecha_tiempo",
    "fmv_reportes_uso_v1"
  ]) {
    assert.equal(isSyncableKey(key), false, key);
  }
});

test("toma solo las claves permitidas y conserva sus valores locales", () => {
  const snapshot = snapshotSyncableStorage(fakeStorage([
    ["fmv_extra", '[{"id":"UC123"}]'],
    ["fmv_pin_padres", '"4321"'],
    ["fmv_card_shape", "rounded"]
  ]));

  assert.deepEqual(Array.from(snapshot), [
    ["fmv_extra", '[{"id":"UC123"}]'],
    ["fmv_card_shape", "rounded"]
  ]);
  assert.equal(encodeStoredValue(snapshot.get("fmv_extra")), '[{"id":"UC123"}]');
});
