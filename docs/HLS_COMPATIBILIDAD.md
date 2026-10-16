# Reproducción HLS multiplataforma — 1UP ANIME

Esta implementación es un cambio apilado sobre el PR #7 de siete servidores y comentarios. No toca el diseño Kokomi/Black Clover ni el backend de la comunidad.

## Mejoras funcionales

- `hls-adapter.js`: reproduce HLS usando soporte nativo de Safari/iPhone, y hls.js 1.7.3 bajo demanda cuando lo admite MediaSource en escritorio.
- `episode-player.js`: cada elección de episodio/servidor desmonta la instancia anterior de HLS para liberar buffers y evitar conexiones antiguas.
- `index.html` y `sw.js`: registran el adaptador antes de inicializar el selector de episodios; la librería de terceros NO se almacena en el service worker.
- Video MP4/WebM sigue usando controles nativos; no se habilita autoplay.
- Los errores HLS fatales se muestran al visitante. El código solo intenta una recuperación tras un fallo fatal de decodificación; no entra en un bucle.
- Las URL de reproducción se toman exclusivamente de la biblioteca configurada, sin extracción de servicios de terceros.

## Declaración de derechos del catálogo

El editor debe declarar `rights: authorized` o `rights: owned` por episodio o por fuente. Esta cadena es una declaración manual, NO un sistema de verificación automática de licencias.

Ejemplo de metadatos de archivo propio (URL ficticia):

    {
      "episode": 1,
      "title": "Episodio piloto propio",
      "rights": "owned",
      "sources": [
        {"name": "Servidor HD", "src": "https://cdn.example.com/piloto.m3u8", "mime": "application/vnd.apple.mpegurl", "language": "es"},
        {"name": "Servidor MP4", "src": "https://cdn.example.com/piloto.mp4", "mime": "video/mp4", "language": "es"}
      ]
    }

Los siete botones se conservan: los que no tengan una fuente válida permanecen desactivados.

## Compatibilidad técnica y límites

- El recurso HLS debe publicarse con HTTPS, MIME correcto y CORS permisivo para el origen de 1UP ANIME.
- Safari en iPhone prefiere reproducción nativa. Chrome/Firefox utilizan hls.js cuando el navegador habilita MediaSource.
- La librería se solicita a `https://cdn.jsdelivr.net/npm/hls.js@1.7.3/dist/hls.min.js` solo cuando hace falta; una CDN bloqueada puede impedir la reproducción HLS en algunos navegadores.
- Esta implementación no descifra DRM, no obtiene cookies de otros sitios, no convierte medios que no estén autorizados, ni proporciona un servidor de distribución.
- El simulador de pruebas verifica el ciclo de vida, los errores y el cambio de fuente sin descargar episodios.
- Falta comprobar reproducción real con un archivo propio en Safari iPhone, Chrome y Firefox.

## Pruebas

`node scripts/check-hls-browser.mjs`

## Referencias

- https://github.com/video-dev/hls.js (documentación e integración recomendada)
- https://github.com/video-dev/hls.js/blob/master/docs/API.md (errores y destroy)
- https://www.jsdelivr.com/package/npm/hls.js (versión 1.7.3)
