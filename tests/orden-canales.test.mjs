import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(new URL("../public/js/channels/orden-canales.js", import.meta.url), "utf8");
const window = {};
vm.runInNewContext(source, { window });

test("ordena marcas de alta recientes y antiguas", () => {
  const canales = [
    { id: "antiguo", agregadoEn: 10 },
    { id: "nuevo", agregadoEn: 30 },
    { id: "medio", agregadoEn: 20 }
  ];

  assert.deepEqual(window.FMV_ordenarCanales(canales, "recent").map((canal) => canal.id), ["nuevo", "medio", "antiguo"]);
  assert.deepEqual(window.FMV_ordenarCanales(canales, "oldest").map((canal) => canal.id), ["antiguo", "medio", "nuevo"]);
});

test("invierte el orden histórico cuando los canales antiguos no tienen fecha", () => {
  const canales = [{ id: "primero" }, { id: "segundo" }, { id: "último" }];

  assert.deepEqual(window.FMV_ordenarCanales(canales, "recent").map((canal) => canal.id), ["último", "segundo", "primero"]);
  assert.deepEqual(window.FMV_ordenarCanales(canales, "oldest").map((canal) => canal.id), ["primero", "segundo", "último"]);
});
