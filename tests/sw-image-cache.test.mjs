import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");

function crearServiceWorker(fetcher) {
  const listeners = {};
  const almacen = new Map();
  const caches = {
    open: async (name) => {
      if (!almacen.has(name)) almacen.set(name, new Map());
      const entries = almacen.get(name);
      return {
        match: async (request) => {
          const url = typeof request === "string" ? request : request.url;
          const response = entries.get(url);
          return response ? response.clone() : undefined;
        },
        put: async (request, response) => {
          entries.set(typeof request === "string" ? request : request.url, response.clone());
        },
        keys: async () => Array.from(entries.keys()).map((url) => ({ url })),
        delete: async (request) => entries.delete(typeof request === "string" ? request : request.url)
      };
    }
  };
  const self = {
    addEventListener: (name, callback) => { listeners[name] = callback; },
    location: { origin: "https://app.example" },
    registration: { scope: "https://app.example/" },
    skipWaiting: async () => {},
    clients: { claim: async () => {} }
  };
  vm.runInNewContext(source, {
    self,
    caches,
    fetch: fetcher,
    URL,
    Request,
    Response,
    Promise,
    console: { warn() {}, error() {} }
  });
  return { listeners, almacen };
}

function eventoMensaje(data) {
  const promesas = [];
  return {
    data,
    promesas,
    waitUntil: (promise) => promesas.push(promise)
  };
}

test("precachea imágenes de YouTube aprobadas y sirve la copia cuando no hay conexión", async () => {
  let conectado = true;
  let llamadasRed = 0;
  const { listeners, almacen } = crearServiceWorker(async () => {
    llamadasRed += 1;
    if (!conectado) throw new Error("offline");
    return new Response("imagen local");
  });
  const url = "https://yt3.ggpht.com/canal-avatar";
  const mensaje = eventoMensaje({
    type: "CACHE_YOUTUBE_IMAGES",
    urls: [url, "https://sitio-malicioso.example/imagen.jpg"]
  });

  listeners.message(mensaje);
  await Promise.all(mensaje.promesas);
  assert.equal(almacen.get("fmv-youtube-images-v1").size, 1);
  assert.equal(llamadasRed, 1);

  conectado = false;
  const peticion = {
    request: { url, method: "GET", destination: "image" },
    promesas: [],
    waitUntil(promise) { this.promesas.push(promise); },
    respondWith(promise) { this.respuesta = promise; }
  };
  listeners.fetch(peticion);

  assert.equal(await (await peticion.respuesta).text(), "imagen local");
  await Promise.all(peticion.promesas);
  assert.equal(llamadasRed, 2);
});
