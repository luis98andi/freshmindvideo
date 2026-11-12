import { Capacitor, registerPlugin } from "@capacitor/core";

interface FMVScreenOrientationPlugin {
  lock(options: { orientation: "landscape" | "portrait" }): Promise<void>;
}

const screenOrientation = registerPlugin<FMVScreenOrientationPlugin>("FMVScreenOrientation");
Object.assign(window, { FMVScreenOrientation: screenOrientation });

if (Capacitor.isNativePlatform()) {
  const savedLayout = localStorage.getItem("fmv_distribucion_reproductor_v2");
  if (savedLayout === "horizontal" || savedLayout === "vertical") {
    screenOrientation
      .lock({ orientation: savedLayout === "horizontal" ? "landscape" : "portrait" })
      .catch((error: unknown) => console.warn("No se pudo restaurar la orientación guardada.", error));
  }
}
