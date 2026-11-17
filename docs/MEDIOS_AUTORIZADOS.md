
1UP Anime puede mostrar portadas, sinopsis y enlaces oficiales sin almacenar videos. La reproducción integrada es opcional y solamente se activa para archivos que tengas derecho a distribuir.

## Manifiesto


Ejemplo de estructura:

```json
{
    "version": 1,
    "entries": {
        "mal-12345": {
            "episodes": [
                {
                    "title": "Episodio 1",
                    "mime": "video/mp4",
                    "subtitles_es": "./media/episodio-01.es.vtt"
                }
            ]
        }
    }
}
```

El identificador y los URL son de ejemplo. La reproducción no se inicia sola; el usuario pulsa reproducir. Safari de iPhone puede reproducir videos MP4 y pistas WebVTT en HTML5, sujeto a compatibilidad/CORS.

## Subtítulos automáticos a español


```bash
python -m pip install faster-whisper argostranslate
python scripts/video_a_subtitulos.py ./mi-video.mp4 --model small --output ./media/mi-video.es.vtt
```

La herramienta detecta la voz, reconoce el texto y traduce del inglés o japonés al español con Argos. Si ya está en español, crea los subtítulos sin traducir. No dobla voces ni recrea actores, y requiere revisar ortografía, nombres propios y tiempos. Necesita modelos que se descargan una vez.

## Alojar video

GitHub Pages no es un servidor de distribución de video pesado.



1UP Anime permite ahora varias fuentes HTTPS por episodio.

Cada fuente incluye `name` (nombre visible), `src` (HTTPS) y `mime` (`video/mp4`, `video/webm` o `application/vnd.apple.mpegurl`). Puedes incluir un archivo de subtítulos `subtitles_es` en formato WebVTT.

Estas URLs son ficticias.


Existen extractores no oficiales de JKAnime que recuperan enlaces a otros servidores. Los enlaces a las páginas originales del sitio pueden abrirse fuera de 1UP Anime.

## Proveedores externos (iQIYI, AnimeOnline) y reproductores integrables

- La página principal de 1UP incluye dos **catálogos externos**, configurados en `data/external-providers.json`: AnimeOnline (castellano) e iQIYI (catálogo oficial internacional).



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
                    "name": "YouTube oficial",
                    "language": "es",
                    "quality": "HD (dependiente del proveedor)"
                }]
            }]
        }
    }
}
```

El ID `12345678901` es ilustrativo; no representa un episodio de anime real.

Un botón de reproducción de YouTube se cargará con dominio `youtube-nocookie.com` solo tras interacción, y siempre habrá un enlace para abrir el video en YouTube.
