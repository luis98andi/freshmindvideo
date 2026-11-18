import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

function crearDomMinimo({ reproduciendo = true } = {}) {
  const bodyChildren = [];
  const bodyClasses = new Set(["viendo"]);
  const storage = new Map();
  let intervalFn = null;
  let intervalId = 0;

  function crearElemento(tag) {
    const el = {
      tagName: tag.toUpperCase(),
      id: "",
      style: {},
      children: [],
      listeners: {},
      _innerHTML: "",
      querySelector(sel) {
        if (sel === "#fmv-pausa-seg") return { textContent: "" };
        if (sel === "#btn-pausa-listo") {
          const btn = crearElemento("button");
          el._btnListo = btn;
          return btn;
        }
        return null;
      },
      addEventListener(name, fn) {
        this.listeners[name] = fn;
      },
      appendChild(child) {
        child.parentNode = this;
        this.children.push(child);
        return child;
      },
      remove() {
        const idx = bodyChildren.indexOf(this);
        if (idx >= 0) bodyChildren.splice(idx, 1);
      },
      set innerHTML(val) {
        this._innerHTML = val;
      },
      get innerHTML() {
        return this._innerHTML;
      }
    };
    return el;
  }

  const document = {
    body: {
      classList: {
        contains: (c) => bodyClasses.has(c)
      },
      appendChild(el) {
        el.parentNode = document.body;
        bodyChildren.push(el);
        return el;
      }
    },
    createElement: crearElemento,
    querySelectorAll: () => []
  };

  let estadoReproduciendo = reproduciendo;
  let llamadasPausar = 0;
  let llamadasReanudar = 0;

  const windowObj = {
    FMV_estaReproduciendo: () => estadoReproduciendo,
    FMV_pausarVideo: () => {
      llamadasPausar++;
      estadoReproduciendo = false;
    },
    FMV_reanudarVideo: () => {
      llamadasReanudar++;
      estadoReproduciendo = true;
    }
  };

  const localStorage = {
    getItem: (k) => (storage.has(k) ? storage.get(k) : null),
    setItem: (k, v) => storage.set(k, String(v))
  };

  return {
    storage,
    document,
    windowObj,
    localStorage,
    setReproduciendo: (v) => { estadoReproduciendo = v; },
    getCounts: () => ({ llamadasPausar, llamadasReanudar, overlays: bodyChildren.length }),
    getLastOverlay: () => bodyChildren[bodyChildren.length - 1],
    setIntervalMock: (fn) => {
      intervalId += 1;
      if (!intervalFn) intervalFn = fn;
      return intervalId;
    },
    tickMonitor: (veces = 1) => {
      for (let i = 0; i < veces; i++) intervalFn();
    }
  };
}

test("pausas activas no cuentan tiempo ni reanudan si el video ya estaba pausado", async () => {
  const source = await readFile(new URL("../public/js/features/pausas-activas.js", import.meta.url), "utf8");
  const env = crearDomMinimo({ reproduciendo: false });
  env.storage.set("fmv_pausas_activas", JSON.stringify({ activo: true, cadaMinutos: 1, duracionSeg: 5 }));

  vm.runInNewContext(source, {
    window: env.windowObj,
    document: env.document,
    localStorage: env.localStorage,
    setInterval: env.setIntervalMock,
    clearInterval: () => {}
  });

  // Video pausado durante 65 segundos: no debe abrir pausa visual ni reanudar
  env.tickMonitor(65);
  assert.equal(env.getCounts().overlays, 0);
  assert.equal(env.getCounts().llamadasPausar, 0);
  assert.equal(env.getCounts().llamadasReanudar, 0);

  // Ahora se reproduce por 60 segundos: abre la pausa visual, pausa el video y al cerrar lo reanuda
  env.setReproduciendo(true);
  env.tickMonitor(60);
  assert.equal(env.getCounts().overlays, 1);
  assert.equal(env.getCounts().llamadasPausar, 1);

  const overlay = env.getLastOverlay();
  overlay._btnListo.listeners.click();
  assert.equal(env.getCounts().overlays, 0);
  assert.equal(env.getCounts().llamadasReanudar, 1);
});

test("modo calma está activado por defecto en horarios-rutina (web y android)", async () => {
  const paths = [
    "../public/js/parental/horarios-rutina.js",
    "../android/app/src/main/assets/public/horarios-rutina.js"
  ];
  for (const rel of paths) {
    const source = await readFile(new URL(rel, import.meta.url), "utf8");
    assert.match(source, /var configCalmaDef\s*=\s*\{\s*activo:\s*true/, `${rel} debe tener Modo Calma activo por defecto`);
  }
});

test("caja de palabras excluidas inicia minimizada con botón para expandir", async () => {
  const source = await readFile(new URL("../public/js/channels/canales-auto.js", import.meta.url), "utf8");
  assert.match(source, /data-minimizar-filtro[^>]*aria-expanded="false"/);
  assert.match(source, /data-filtro-cuerpo[^>]*display:none/);
});
