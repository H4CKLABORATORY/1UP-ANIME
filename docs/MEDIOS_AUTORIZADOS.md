# Reproducción y configuración de fuentes de video

1UP Anime permite configurar fuentes multimedia para reproducción integrada (MP4, HLS, WebM, iframes).

## Manifiesto

El archivo data/licensed-media.json contiene `entries` cuyo índice es el identificador del anime (por ejemplo, `mal-59741`).

Ejemplo de estructura:

```json
{
  "version": 1,
  "entries": {
    "mal-12345": {
      "episodes": [
        {
          "title": "Episodio 1",
          "src": "https://cdn.example.com/episodio-01.mp4",
          "mime": "video/mp4",
          "subtitles_es": "./media/episodio-01.es.vtt"
        }
      ]
    }
  }
}
```

Safari de iPhone puede reproducir videos MP4 y pistas WebVTT en HTML5 de forma nativa.

## Subtítulos automáticos a español

Para generar subtítulos desde un archivo de video:

```bash
python -m pip install faster-whisper argostranslate
python scripts/video_a_subtitulos.py ./mi-video.mp4 --model small --output ./media/mi-video.es.vtt
```

La herramienta transcribe la pista de audio y traduce con Argos Translate generando subtítulos WebVTT.

## Alojar video

Se recomienda almacenamiento en la nube o CDN con soporte CORS para servir segmentos HLS, MP4 y subtítulos WebVTT.

## Selección de servidores de video

1UP Anime permite varias fuentes HTTPS por episodio. El usuario puede cambiar de servidor directamente desde el reproductor.

En data/licensed-media.json, cada episodio puede tener una lista `sources`. Cada fuente incluye `name` (nombre visible), `src` (HTTPS) y `mime` (`video/mp4`, `video/webm` o `application/vnd.apple.mpegurl`). Se puede incluir `subtitles_es` en formato WebVTT.

Ejemplo: para un episodio, usa las fuentes `{ name: "Servidor principal", src: "https://cdn.example.com/episodio.mp4", mime: "video/mp4" }` y `{ name: "Alternativo", src: "https://cdn2.example.com/episodio.m3u8", mime: "application/vnd.apple.mpegurl" }` dentro de `sources`.

En iPhone, Safari ofrece reproducción HLS nativa de forma predeterminada.

## Botón «⚡ Actualizar» y revalidación de fuentes

El botón `⚡ Actualizar` del reproductor revalida el estado de las fuentes declaradas en `data/licensed-media.json`:

1. El cliente solicita `GET /api/anime/:id/episodes/:n/links?refresh=1&season=N` al servicio local (`npm run serve:catalog` o `npm start`).
2. `server/src/authorized-media.js` localiza la entrada por identificador, slug, alias o título, y el episodio por `number`/`episode` y `season`.
3. Cada URL directa se comprueba con `HEAD`; si el servidor rechaza `HEAD`, se reintenta con `GET` y `Range: bytes=0-0`.
4. Los iframes de proveedores no se sondean: su disponibilidad la gestiona el proveedor directamente.
5. En GitHub Pages el cliente lee el manifiesto directamente.

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

## Proveedores externos e incrustaciones

- La página principal de 1UP permite configurar catálogos externos en `data/external-providers.json`.
- El reproductor admite iframes externos (por ejemplo YouTube u otros proveedores de video).
- El servidor admite enlaces directos MP4, WebM y flujos HLS (.m3u8).

### Ejemplo de incrustación de video

En `data/licensed-media.json`:

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
          "videoId": "12345678901",
          "name": "YouTube",
          "language": "es",
          "quality": "HD"
        }]
      }]
    }
  }
}
```

Un botón de reproducción de YouTube se cargará con dominio `youtube-nocookie.com` solo tras interacción, y siempre habrá un enlace para abrir el video en YouTube. No hay licencia ni API de reproducción integrada de iQIYI configurada, por lo que nunca se inventarán URL de streams.
