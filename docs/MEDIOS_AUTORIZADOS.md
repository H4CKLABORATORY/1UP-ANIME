# Reproducción y subtítulos de videos autorizados

1UP Anime puede mostrar portadas, sinopsis y enlaces oficiales sin almacenar videos. La reproducción integrada es opcional y solamente se activa para archivos que tengas derecho a distribuir.

## Manifiesto

El archivo data/licensed-media.json contiene `entries` cuyo índice es el identificador del anime (por ejemplo, `mal-59741`). Cada episodio requiere URL HTTPS directa que controles o tengas permiso de publicar.

Ejemplo de estructura:

```json
{
  "version": 1,
  "entries": {
    "mal-12345": {
      "episodes": [
        {
          "title": "Episodio 1",
          "src": "https://tu-cdn-autorizado.example/episodio-01.mp4",
          "mime": "video/mp4",
          "subtitles_es": "./media/episodio-01.es.vtt"
        }
      ]
    }
  }
}
```

El identificador y los URL son de ejemplo. No se incluyen episodios ni URLs reales y el sitio no afirma que se puedan reproducir. La reproducción no se inicia sola; el usuario pulsa reproducir. Safari de iPhone puede reproducir videos MP4 y pistas WebVTT en HTML5, sujeto a compatibilidad/CORS.

## Subtítulos automáticos a español

Para generar subtítulos desde un archivo que ya tengas de forma legítima:

```bash
python -m pip install faster-whisper argostranslate
python scripts/video_a_subtitulos.py ./mi-video.mp4 --model small --output ./media/mi-video.es.vtt
```

La herramienta detecta la voz, reconoce el texto y traduce del inglés o japonés al español con Argos. Si ya está en español, crea los subtítulos sin traducir. No dobla voces ni recrea actores, y requiere revisar ortografía, nombres propios y tiempos. Necesita modelos que se descargan una vez.

## Alojar video

GitHub Pages no es un servidor de distribución de video pesado. Se recomienda almacenamiento CDN con derechos de publicación y enlaces HTTPS, junto con reglas CORS que permitan servir los subtítulos. Evita alojar credenciales, claves privadas, señales IPTV o contenido de terceros sin permiso en el repositorio.

No se implementa extracción de señales de streaming, capturas de sesiones protegidas, evasión de DRM o copia automática de episodios de JKAnime, Netflix u otros distribuidores.

## Selección de servidores de video autorizados

1UP Anime permite ahora varias fuentes HTTPS por episodio. El visitante elige entre los servidores sin abandonar el reproductor, siempre que el propietario tenga permiso de distribución.

En data/licensed-media.json, además del formato anterior `src`, cada episodio puede tener una lista `sources`. Cada fuente incluye `name` (nombre visible), `src` (HTTPS) y `mime` (`video/mp4`, `video/webm` o `application/vnd.apple.mpegurl`). Puedes incluir un archivo de subtítulos `subtitles_es` en formato WebVTT.

Ejemplo: para un episodio autorizado, usa las fuentes `{ name: "Servidor principal", src: "https://cdn.example.com/episodio.mp4", mime: "video/mp4" }` y `{ name: "Alternativo", src: "https://cdn2.example.com/episodio.m3u8", mime: "application/vnd.apple.mpegurl" }` dentro de `sources`. Estas URLs son ficticias.

En iPhone, Safari ofrece reproducción HLS nativa cuando el proveedor admite el navegador y los permisos necesarios. La página no descifra DRM ni copia emisiones de otro servicio.

Existen extractores no oficiales de JKAnime que recuperan enlaces a otros servidores. Eso no acredita autorización para redistribuir ni incrustar tales transmisiones. Los enlaces a las páginas originales del sitio pueden abrirse fuera de 1UP Anime.

## Botón «⚡ Actualizar» y revalidación de fuentes

El botón `⚡ Actualizar` del reproductor **no descarga episodios ni consulta JKAnime**. Revalida las fuentes declaradas por el editor en `data/licensed-media.json`:

1. El cliente solicita `GET /api/anime/:id/episodes/:n/links?refresh=1&season=N` al servicio local (`npm run serve:catalog` o `npm start`).
2. `server/src/authorized-media.js` localiza la entrada por identificador, slug, alias o título, y el episodio por `number`/`episode` y `season`.
3. Cada URL directa se comprueba con `HEAD`; si el servidor rechaza `HEAD`, se reintenta con `GET` y `Range: bytes=0-0`. Solo se aceptan URLs HTTPS públicas, sin credenciales ni puertos personalizados. Una respuesta HTML se marca como enlace caído.
4. Los iframes de proveedores oficiales no se sondean: su disponibilidad la decide el proveedor.
5. Si el anime está declarado pero el episodio no, la respuesta queda vacía y **no** se recurre a scraping de terceros.
6. En GitHub Pages no existe `/api`: el cliente lee el manifiesto público directamente. Las fuentes configuradas se muestran, pero **sin verificación HTTP del servidor**.

La comprobación se cachea 10 minutos por URL y tipo de uso. `refresh=1` ignora la caché. Si una fuente directa falla, el botón queda deshabilitado y se muestra el motivo; las descargas caídas se marcan como «no disponible» y no se navega a ellas.

### Esquema ampliado

```json
{
  "version": 1,
  "entries": {
    "mal-59741": {
      "title": "Título de la obra",
      "slug": "titulo-de-la-obra",
      "aliases": ["Título alternativo"],
      "episodes": [
        {
          "number": 1,
          "season": 1,
          "title": "Episodio 1",
          "sources": [
            {
              "name": "CDN propio",
              "src": "https://cdn.example/ep01.mp4",
              "mime": "video/mp4",
              "language": "Español latino",
              "quality": "1080p",
              "rights": "owned",
              "subtitles_es": "https://cdn.example/ep01.es.vtt",
              "tracks": [
                {"lang": "es", "label": "Español", "url": "https://cdn.example/ep01.es.vtt"}
              ]
            }
          ],
          "downloads": [
            {"name": "Archivo", "src": "https://cdn.example/ep01.zip", "size": "300 MB", "quality": "1080p"}
          ]
        }
      ]
    }
  }
}
```

`rights` debe ser `owned` o `authorized`. Es una declaración del editor del catálogo, no una prueba automática de derechos. No se admiten `src` con `http://`, `localhost`, direcciones IP ni puertos que no sean 443. Las descargas de Mega con `#` se muestran pero no se sondean.

El navegador lee `client/data/licensed-media.json`; el servidor lee `data/licensed-media.json`. Mantén ambas copias idénticas. El build de Vite copia `data/` a `dist/data/`, pero GitHub Pages sirve el repositorio, no `dist/`; el comprobador avisa si las copias difieren.

### Comprobación local

```bash
npm run check:authorized -- --no-probe   # valida la estructura sin red
npm run check:authorized                 # revalida cada URL directa
npm run check:authorized -- --json       # salida legible por máquina
```

El comando no descarga videos, no extrae streams y no contacta con JKAnime. El manifiesto de este repositorio sigue con `entries: {}`: no hay episodios reales ni se debe afirmar que existan.

## Proveedores externos (iQIYI, AnimeOnline) y reproductores integrables

- La página principal de 1UP incluye dos **catálogos externos**, configurados en `data/external-providers.json`: AnimeOnline (castellano) e iQIYI (catálogo oficial internacional). La página exacta de AnimeOnline no se pudo verificar. iQIYI restringe la reproducción/inserción de videos fuera de su servicio sin permiso específico.
- Ambos enlaces se abren en la web del proveedor, no son espejos, retransmisiones ni promesas de reproducción dentro de 1UP.
- Un tercer modo de reproducción ya admite **iframe oficial de YouTube** al pulsar el visitante el botón. Úsalo solo con contenidos que tengan permisos para esta distribución; el proveedor puede impedir inserción o reproducción.
- El servidor propio admite MP4, WebM y HLS; la interfaz distingue fuentes autorizadas de catálogos externos.

### Ejemplo de un episodio de tercero con permiso

En `data/licensed-media.json`, una serie cuyo ID corresponda al catálogo de anime puede declarar este ejemplo ficticio (reemplazar los IDs y agregar solo un video real cuyo titular permite insertar):

```json
{
  "version": 1,
  "entries": {
    "mal-12345": {
      "episodes": [{
        "title": "Episodio 1",
        "sources": [{
          "mode": "official_embed",
          "provider": "youtube",
          "rights": "authorized",
          "videoId": "12345678901",
          "name": "YouTube oficial",
          "language": "es",
          "quality": "HD (dependiente del proveedor)"
        }]
      }]
    }
  }
}
```

El ID `12345678901` es ilustrativo; no representa un episodio de anime real. La cadena `rights: authorized` es una declaración del editor del catálogo, NO un verificador automático de derechos. No se permite inferir autorización a partir de enlaces públicos, extractores ni archivos de terceros.

Un botón de reproducción de YouTube se cargará con dominio `youtube-nocookie.com` solo tras interacción, y siempre habrá un enlace para abrir el video en YouTube. No hay licencia ni API de reproducción integrada de iQIYI configurada, por lo que nunca se inventarán URL de streams.
