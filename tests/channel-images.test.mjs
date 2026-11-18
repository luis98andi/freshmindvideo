import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

class Element {
  constructor(document) {
    this.document = document;
    this.children = [];
    this.dataset = {};
    this.style = {};
    this.listeners = {};
    this.hidden = false;
  }

  appendChild(child) {
    child.parent = this;
    this.children.push(child);
    return child;
  }

  replaceChildren(...children) {
    this.children = [];
    children.forEach((child) => this.appendChild(child));
  }

  addEventListener(name, callback) {
    this.listeners[name] = callback;
  }

  querySelector(selector) {
    const stack = [...this.children];
    while (stack.length) {
      const item = stack.shift();
      if (selector === "img" && item.tagName === "IMG") return item;
      if (selector[0] === "." && item.className === selector.slice(1)) return item;
      stack.push(...item.children);
    }
    return null;
  }

  remove() {
    if (this.parent) this.parent.children = this.parent.children.filter((child) => child !== this);
  }
}

test("muestra un marcador inmediato y prioriza las imágenes de los primeros canales", async () => {
  const source = await readFile(new URL("../public/js/channels/mis-canales.js", import.meta.url), "utf8");
  const canales = Array.from({ length: 14 }, (_, index) => ({
    id: "UC" + String(index).padStart(22, "0"),
    nombre: "Canal " + index,
    url: "https://www.youtube.com/channel/UC" + String(index).padStart(22, "0"),
    imagen: "https://yt3.ggpht.com/canal-" + index
  }));
  const grid = new Element(null);
  const message = new Element(null);
  const sort = new Element(null);
  let currentOrder = "recent";
  let precargaInvocada = false;
  const document = {
    getElementById(id) {
      return { cuadricula: grid, mensaje: message, "orden-canales": sort }[id] || null;
    },
    createElement(tagName) {
      const element = new Element(this);
      element.tagName = tagName.toUpperCase();
      return element;
    }
  };
  const window = {
    FMV_datosMisCanales: {
      listar: () => canales,
      orden: () => currentOrder,
      establecerOrden(orden) { currentOrder = orden; },
      esPadre: () => false
    },
    FMV_precargarImagenes: () => { precargaInvocada = true; }
  };

  vm.runInNewContext(source, {
    window,
    document,
    URL,
    setTimeout: () => 1,
    clearTimeout() {}
  });
  window.FMV_pintarMisCanales();

  const firstMedia = grid.children[0].children[0];
  const firstImage = firstMedia.querySelector("img");
  const secondImage = grid.children[1].children[0].querySelector("img");
  const lastImage = grid.children[13].children[0].querySelector("img");

  assert.equal(sort.textContent, "Orden: Más recientes");
  assert.equal(firstMedia.children[0].className, "inicial");
  assert.equal(firstImage.loading, "eager");
  assert.equal(firstImage.fetchPriority, "high");
  assert.equal(secondImage.loading, "eager");
  assert.equal(lastImage.loading, "eager");
  assert.equal(firstImage.src, canales[0].imagen);
  assert.equal(grid.children[3].children[0].querySelector("img").src, canales[3].imagen);
  assert.equal(lastImage.src, undefined);
  assert.equal(precargaInvocada, false);

  firstImage.onerror();
  assert.equal(new URL(firstImage.src).hostname, "yt3.googleusercontent.com");
  firstImage.onload();
  assert.equal(grid.children[4].children[0].querySelector("img").src, canales[4].imagen);
  for (let index = 1; index < canales.length; index += 1) {
    grid.children[index].children[0].querySelector("img").onload();
  }
  sort.listeners.click();
  assert.equal(currentOrder, "oldest");
  assert.equal(sort.textContent, "Orden: Más antiguos");
});
