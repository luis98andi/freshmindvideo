import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = (await readFile(new URL("../src/js/search/busqueda-voz.js", import.meta.url), "utf8"))
  .replace('import { Capacitor } from "@capacitor/core";', "const Capacitor = globalThis.Capacitor;")
  .replace(
    'import { SpeechRecognition as NativeSpeechRecognition } from "@capacitor-community/speech-recognition";',
    "const NativeSpeechRecognition = globalThis.NativeSpeechRecognition;"
  );

test("muestra el botón de voz aunque el navegador no tenga reconocimiento web", () => {
  let esperaBuscador;
  let botonVoz;
  const estado = { textContent: "" };
  const input = {
    style: {},
    offsetTop: 0,
    offsetHeight: 40,
    placeholder: "Buscar videos",
    dispatchEvent() {}
  };
  const cajaBuscador = {
    querySelector: (selector) => selector === 'input[type="search"]' ? input : estado,
    appendChild: (elemento) => { botonVoz = elemento; }
  };
  const document = {
    getElementById: (id) => id === "buscador" ? cajaBuscador : id === "btn-voz-ninos" ? botonVoz : null,
    createElement: () => ({
      style: {},
      setAttribute() {},
      addEventListener: (_name, callback) => { botonVoz.alPulsar = callback; }
    })
  };
  const window = { addEventListener() {} };

  vm.runInNewContext(source, {
    Capacitor: { isNativePlatform: () => false, getPlatform: () => "web" },
    NativeSpeechRecognition: {},
    document,
    window,
    Event: class {},
    setInterval: (callback) => { esperaBuscador = callback; return 1; },
    clearInterval() {}
  });

  esperaBuscador();
  assert.ok(botonVoz);
  botonVoz.alPulsar();
  assert.equal(estado.textContent, "La búsqueda por voz no está disponible en este navegador.");
});
