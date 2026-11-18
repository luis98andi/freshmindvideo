import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

function crearIndexedDBSimulado() {
  const tabla = new Map();
  return {
    tabla,
    open() {
      const req = {};
      queueMicrotask(() => {
        const db = {
          objectStoreNames: { contains: () => true },
          createObjectStore() {},
          transaction() {
            const tx = { oncomplete: null, onerror: null };
            return {
              set oncomplete(fn) { tx.oncomplete = fn; },
              get oncomplete() { return tx.oncomplete; },
              set onerror(fn) { tx.onerror = fn; },
              get onerror() { return tx.onerror; },
              objectStore() {
                return {
                  getAll() {
                    const r = {};
                    queueMicrotask(() => {
                      r.onsuccess?.({ target: { result: Array.from(tabla.values()) } });
                    });
                    return r;
                  },
                  put(valor) {
                    tabla.set(valor.url, valor);
                    queueMicrotask(() => { tx.oncomplete?.(); });
                  }
                };
              }
            };
          }
        };
        req.onsuccess?.({ target: { result: db } });
      });
      return req;
    }
  };
}

function crearEntorno(indexedDB) {
  const window = {};
  const document = {
    baseURI: "https://app.example/",
    createElement(tag) {
      if (tag === "canvas") {
        return {
          width: 0,
          height: 0,
          getContext() { return { drawImage() {} }; },
          toDataURL() {
            return "data:image/webp;base64," + "A".repeat(80);
          }
        };
      }
      return {};
    }
  };
  const navigator = {};
  return { window, document, navigator, indexedDB };
}

test("guarda imágenes verificadas en IndexedDB, rechaza imágenes rotas y evita recargar en reinicios", async () => {
  const source = await readFile(new URL("../public/js/core/imagenes.js", import.meta.url), "utf8");
  const idb = crearIndexedDBSimulado();
  const env1 = crearEntorno(idb);

  vm.runInNewContext(source, { ...env1, URL, Promise, Object, Array, Math, Date, setTimeout });

  const urlOk = "https://yt3.ggpht.com/canal-valido=s240";
  const urlRota = "https://yt3.ggpht.com/canal-roto=s240";

  // Rechaza una imagen con dimensiones 0 (error)
  const guardoRota = await env1.window.FMV_guardarImagenCache(urlRota, { naturalWidth: 0, naturalHeight: 0 });
  assert.equal(guardoRota, false);
  assert.equal(idb.tabla.has(urlRota), false);

  // Guarda una imagen válida verificada
  const guardoOk = await env1.window.FMV_guardarImagenCache(urlOk, { naturalWidth: 240, naturalHeight: 240 });
  assert.equal(guardoOk, true);
  assert.equal(idb.tabla.has(urlOk), true);

  // Simula reinicio completo de la app (nuevo contexto con mismo IndexedDB)
  const env2 = crearEntorno(idb);
  vm.runInNewContext(source, { ...env2, URL, Promise, Object, Array, Math, Date, setTimeout });

  const enCache = await env2.window.FMV_obtenerImagenCache(urlOk);
  assert.ok(enCache.startsWith("data:image/webp;base64,"));
  assert.equal(env2.window.FMV_obtenerImagenCacheSync(urlOk), enCache);
  assert.equal(await env2.window.FMV_obtenerImagenCache(urlRota), "");
});
