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
  let precargadas = [];
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
      orden: () => "recent",
      establecerOrden() {},
      esPadre: () => false
    },
    FMV_precargarImagenes: (urls) => { precargadas = urls; }
  };

  vm.runInNewContext(source, { window, document });
  window.FMV_pintarMisCanales();

  const firstMedia = grid.children[0].children[0];
  const firstImage = firstMedia.querySelector("img");
  const twelfthImage = grid.children[11].children[0].querySelector("img");
  const thirteenthImage = grid.children[12].children[0].querySelector("img");

  assert.equal(firstMedia.children[0].className, "inicial");
  assert.equal(firstImage.loading, "eager");
  assert.equal(firstImage.fetchPriority, "high");
  assert.equal(twelfthImage.loading, "eager");
  assert.equal(thirteenthImage.loading, "lazy");
  assert.equal(precargadas.length, 14);
});
