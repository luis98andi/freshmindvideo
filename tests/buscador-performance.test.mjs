import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

class Element {
  constructor(document) {
    this.document = document;
    this.children = [];
    this.listeners = {};
    this.attributes = {};
    this.style = { setProperty() {} };
    this.classNames = new Set();
    this.classList = {
      add: (...names) => names.forEach((name) => this.classNames.add(name)),
      remove: (...names) => names.forEach((name) => this.classNames.delete(name)),
      contains: (name) => this.classNames.has(name),
      toggle: (name, force) => {
        const enabled = force === undefined ? !this.classNames.has(name) : Boolean(force);
        if (enabled) this.classNames.add(name);
        else this.classNames.delete(name);
        return enabled;
      }
    };
  }

  set className(value) {
    this.classNames = new Set(String(value).split(/\s+/).filter(Boolean));
  }

  addEventListener(name, callback) {
    this.listeners[name] = callback;
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  insertBefore(child) {
    this.children.unshift(child);
    return child;
  }

  set textContent(value) {
    this._textContent = value;
    if (value === "") this.children = [];
  }

  get textContent() {
    return this._textContent || "";
  }

  setAttribute(name, value) {
    this.attributes[name] = value;
  }

  getAttribute(name) {
    return this.attributes[name] || null;
  }

  querySelector(selector) {
    if (this.id === "buscador" && selector === "input") return this.document.input;
    if (this.id === "buscador" && selector === ".estado") return this.document.status;
    if (selector === ".sug-box") return null;
    const stack = [...this.children];
    while (stack.length) {
      const item = stack.shift();
      if (selector[0] === "." && item.classList.contains(selector.slice(1))) return item;
      stack.push(...item.children);
    }
    return null;
  }
}

test("una búsqueda de una letra se limita a resultados locales y no inicia solicitudes de YouTube", async () => {
  const source = await readFile(new URL("../public/js/search/buscador.js", import.meta.url), "utf8");
  const timers = [];
  let fetchCount = 0;
  const document = {
    body: new Element(null),
    documentElement: new Element(null),
    head: new Element(null),
    input: new Element(null),
    status: new Element(null),
    getElementById(id) {
      if (id === "vista-principal") return this.main;
      if (id === "cuadricula") return this.grid;
      return null;
    },
    createElement() {
      return new Element(this);
    },
    querySelector() {
      return null;
    },
    main: new Element(null),
    grid: new Element(null)
  };
  const videos = Array.from({ length: 40 }, (_, i) => ({
    id: "video-" + i,
    titulo: "Animales y canciones " + i
  }));
  const window = {
    FMV_API_KEY: "test-key",
    FMV_CANALES: [],
    FMV_misVideos: () => videos,
    FMV_bloqueados: () => ["video-1"],
    FMV_palabrasExcluidas: () => [],
    FMV_esPadre: () => false,
    addEventListener() {}
  };
  document.input.document = document;
  document.status.document = document;
  document.body.document = document;
  document.documentElement.document = document;
  document.head.document = document;
  document.main.document = document;
  document.grid.document = document;

  vm.runInNewContext(source, {
    window,
    document,
    indexedDB: { open() { throw new Error("IndexedDB no disponible"); } },
    fetch() {
      fetchCount++;
      return Promise.reject(new Error("No se esperaba una solicitud de red."));
    },
    setTimeout(callback) {
      timers.push(callback);
      return timers.length;
    },
    clearTimeout() {},
    console
  });

  document.input.value = "a";
  document.input.listeners.focus();
  assert.equal(fetchCount, 0);
  document.input.listeners.input();
  timers.shift()();

  const results = document.main.querySelector(".fmv-res");
  assert.equal(results.children.length, 24);
  assert.equal(
    results.children.some((item) => item.querySelector(".t")?.textContent === "Animales y canciones 1"),
    false
  );
  assert.equal(fetchCount, 0);
});
