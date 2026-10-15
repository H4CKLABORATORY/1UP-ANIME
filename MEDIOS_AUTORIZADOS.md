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
