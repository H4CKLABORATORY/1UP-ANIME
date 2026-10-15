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

## Vista por episodio con siete reproductores

La ficha de cada anime muestra un selector de episodios y exactamente siete botones de servidor. Cada botón solo se habilita cuando el episodio tiene una fuente configurada y validada. **Esto no significa que los siete servidores estén disponibles ni que el sitio aloje videos.**

El formato `sources` sigue admitiendo videos directos HTTPS (`mp4`, `webm`, `m3u8`) y ahora permite reproductores incrustados `embed` de plataformas que aceptan inserción, exclusivamente cuando el contenido está autorizado.

Ejemplo **ficticio** de una configuración de episodio:

```json
{
  "version": 1,
  "entries": {
    "mal-12345": {
      "episodes": [
        {
          "number": 1,
          "title": "Episodio 1",
          "sources": [
            {
              "name": "Servidor 1",
              "kind": "embed",
              "embed": "https://www.youtube-nocookie.com/embed/AbCdEfGhI12"
            },
            {
              "name": "Servidor 2",
              "src": "https://tu-cdn-autorizado.example/episodio-1.mp4",
              "mime": "video/mp4"
            }
          ]
        }
      ]
    }
  }
}
```

Los enlaces anteriores son solo para describir la estructura: no corresponden a un episodio real ni acreditan permisos. Solo se aceptan dominios de reproducción incrustada específicamente aprobados (YouTube privacy-enhanced, Vimeo player y Archive.org embed). Incluir un dominio en la lista técnica no otorga derecho a redistribuir videos publicados ahí.

Los episodios que no tengan fuentes muestran una indicación clara y siete botones deshabilitados. Los espectadores pueden navegar entre episodios aunque no estén disponibles para reproducir.

**Comentarios sincronizados:** al elegir un episodio en el reproductor, los comentarios pasan al hilo de ese mismo anime y número de episodio. Cambiar de episodio en los comentarios también cambia el reproductor. Los comentarios son públicos y requieren el backend moderado de Firebase correctamente configurado; sin backend no se simula que un mensaje local sea público.
