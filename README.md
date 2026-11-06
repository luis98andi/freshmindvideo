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
* `public/` también contiene los datos y recursos estáticos que Vite publica desde la raíz del sitio.

Los scripts clásicos se cargan en un orden explícito desde `index.html` porque algunas funcionalidades comparten la API global `window.FMV_*`. Las vistas de Mis canales, Mis videos y Zona de padres tienen archivos separados del reproductor y del controlador de datos.

## Compilar y publicar

* `npm run build` genera la web y la PWA en `dist/` y sincroniza los mismos archivos con `www/` para los despliegues que publican esa carpeta.
* `npm run build:android` genera `dist/` y sincroniza esos mismos archivos con Capacitor para Android. El proyecto Android también debe compilarse para generar un APK.
* La carga de `canales.json` y `mis_videos.json` comparte un lector con validación y caché local. El service worker incluye ambos archivos en la caché inicial para el uso sin conexión; la app Android también los lleva dentro del paquete web.

Al agregar un recurso esencial, actualiza la lista de precarga en `public/sw.js` y aumenta la versión de su caché. Los recursos se resuelven desde la carpeta de la app para que también funcionen cuando el sitio está publicado bajo una subruta.
