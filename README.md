# FreshMindVideo 🌈

Un reproductor web infantil y seguro que transforma la experiencia de YouTube en un entorno limpio, educativo y protegido para niños, con control parental exhaustivo.

## 🚀 Características Principales

* 🔒 **Zona de Padres Protegida por PIN:** Configuración aislada de canales, límites y bloqueos.
* ⏱️ **Límites de Tiempo de Pantalla:** Temporizadores individuales por perfil (Hija / Hijo).
* 🌙 **Filtro de Luz Azul:** Atenuación ámbar con horarios automáticos para proteger el sueño.
* ⏰ **Horarios y Rutinas de Descanso:** Bloqueo automático para horas de dormir y tareas escolares.
* 👀 **Pausas Activas (Regla 20-20-20):** Descanso visual periódico para prevenir fatiga ocular.
* 🏆 **Sistema de Medallas y Logros:** Gamificación con refuerzo positivo al consumir contenido educativo.
* 📊 **Estadísticas de Uso:** Monitoreo semanal de tiempo consumido y canales más vistos.
* 🎙️ **Búsqueda por Voz:** Búsqueda intuitiva mediante voz para niños pequeños.
* 📱 **Dispositivos familiares:** Emparejamiento y sincronización automática de canales, videos y ajustes con Supabase.
* 🇪🇸 **Pistas de Audio en Español:** Preferencia automática de audio en español para videos multilingües (ej: Dr. Plants).
* 📱 **PWA Instalable:** Funciona como aplicación nativa en Android, iOS y escritorio sin app store.

## 📖 Manual de Uso Completo

Para conocer en detalle cada una de las opciones, visita la [Guía Completa para Padres (MANUAL_PADRES.md)](./MANUAL_PADRES.md).

## 🛠️ Tecnologías

* HTML5 / CSS3 / JavaScript Modular (Vanilla JS, sin dependencias pesadas).
* YouTube Iframe Player API & YouTube Data API v3.
* Web Speech API (reconocimiento de voz).
* Service Worker (`sw.js`) y Web App Manifest (`manifest.json`) para soporte PWA y carga instantánea.

## Estructura del frontend

* `index.html` es el único punto de entrada de la aplicación.
* `public/css/` contiene los estilos estáticos.
* `public/js/` organiza los scripts por área: núcleo, reproductor, canales, búsqueda, PWA, control parental y funcionalidades.
* `src/js/search/` contiene la búsqueda por voz, que Vite compila como módulo ES porque integra las dependencias de Capacitor.
* `public/` también contiene los datos y recursos estáticos. Vite copia su contenido a la raíz del sitio compilado (`dist/`); por eso el HTML y el service worker usan rutas relativas como `./js/`, `./css/` y `canales.json`, válidas en Pages y dentro del APK.

Los scripts clásicos se cargan en un orden explícito desde `index.html` porque algunas funcionalidades comparten la API global `window.FMV_*`. Las vistas de Mis canales, Mis videos y Zona de padres tienen archivos separados del reproductor y del controlador de datos.

## Compilar y publicar

* `npm run build` genera la web y la PWA en `dist/`.
* GitHub Pages debe configurarse para publicar mediante **GitHub Actions**. El workflow `.github/workflows/deploy-pages.yml` compila `dist/` y publica ese artefacto al actualizar `main` o al ejecutarlo manualmente.
* `npm run build:android` genera `dist/` y sincroniza esos archivos con Capacitor para Android. El proyecto Android también debe compilarse para generar un APK.
* Para publicar en Google Play, usa una clave de subida propia y genera un Android App Bundle (`bundleRelease`). Configura `FMV_UPLOAD_STORE_FILE`, `FMV_UPLOAD_STORE_PASSWORD`, `FMV_UPLOAD_KEY_ALIAS` y `FMV_UPLOAD_KEY_PASSWORD` en `~/.gradle/gradle.properties` o en el entorno local; no guardes la clave ni sus contraseñas en Git. La compilación release se detiene si falta alguno de esos valores. Activa Play App Signing en Play Console y distribuye a través de una pista de pruebas internas.
* La carga de `canales.json` y `mis_videos.json` comparte un lector con validación y caché local. El service worker incluye ambos archivos en la caché inicial para el uso sin conexión; la app Android también los lleva dentro del paquete web.
* La Zona de Padres mantiene un módulo principal y paneles separados para el manual, las copias de seguridad y el estilo. Las imágenes de canales de YouTube se precargan y se guardan en una caché del navegador con límite de tamaño para mejorar reaperturas y uso sin conexión.

## Cuentas infantiles y datos locales

La selección de Hija o Hijo se recuerda en el almacenamiento local del navegador. El historial, los logros, los reportes y el tiempo de uso se almacenan separados por perfil en ese mismo dispositivo; no se sincronizan. Al migrar videos antiguos sin perfil, se asignan a Hija para evitar mostrarlos en ambas cuentas. El almacenamiento del navegador no está cifrado: no debe considerarse un mecanismo para proteger información frente a otras personas que tengan acceso al dispositivo.

## Sincronización de dispositivos familiares

La sección **Zona de Padres → Dispositivos y sincronización** permite crear un grupo familiar y emparejar cada navegador o APK con un código aleatorio de un solo uso, válido durante 10 minutos. Los dispositivos emparejados muestran su última conexión; mientras la app está visible, actualizan su presencia cada 45 segundos. La sincronización funciona a través de internet tanto por Wi‑Fi como por datos móviles.

Para activarla:

1. Crea un proyecto Supabase y ejecuta `supabase/migrations/202611120001_device_sync.sql` en su SQL Editor.
2. Activa el proveedor de autenticación anónima en Supabase.
3. En desarrollo, copia `.env.example` a `.env.local` y completa `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
4. Para GitHub Pages, agrega las variables de repositorio `SUPABASE_URL` y `SUPABASE_ANON_KEY` en GitHub Actions y vuelve a publicar. El sitio solo necesita la clave pública `anon`; nunca configures ni publiques la clave `service_role`.
5. Configura esos valores públicos de Supabase al generar una nueva distribución Android.

El esquema aplica Row Level Security y solo admite las claves permitidas de canales, videos y ajustes. No sincroniza el PIN parental, perfil activo, historial ni estadísticas de uso. La clave `anon` se entrega al cliente web, por lo que la seguridad depende de las políticas de la migración. Los cambios simultáneos sobre la misma clave se resuelven por el último guardado en el servidor. Las actualizaciones recibidas mientras se reproduce un video quedan aplicadas en el almacenamiento y la pantalla se recarga al regresar a la vista principal.

Al agregar un recurso esencial, actualiza la lista de precarga en `public/sw.js` y aumenta la versión de su caché. Los recursos se resuelven desde la carpeta de la app para que también funcionen cuando el sitio está publicado bajo una subruta.
