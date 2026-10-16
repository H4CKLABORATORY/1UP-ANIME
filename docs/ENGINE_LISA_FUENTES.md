# 1UP ANIME — Motor de fuentes v2

Implementación aislada para no interferir con el diseño Kokomi/Black Clover ni con el PR #7 de siete servidores y comentarios por capítulo.

## Código incorporado

- scripts/media-source-contract.mjs: contrato y saneamiento de fuentes sin dependencias NPM.
- scripts/dexter-anime-sync.mjs: convierte fuentes de la biblioteca autorizada en registros del motor.
- scripts/test-media-source-contract.mjs: comprueba siete servidores, HLS, YouTube oficial, filtros de URL y manifest.
- Hasta siete fuentes por episodio, con idioma, calidad y subtítulos VTT opcionales.
- Solo se admite HTTPS público y modo de inserción oficial YouTube con videoId de 11 caracteres.
- Los registros conservan status configurada_sin_verificar: no se promete reproducción sin comprobarla.

## Ejemplo de manifiesto ilustrativo

data/licensed-media.json:

    {
      "version": 1,
      "entries": {
        "mal-12345": {
          "episodes": [{
            "episode": 1,
            "rights": "authorized",
            "sources": [
              {"name":"Principal","src":"https://cdn.example.com/ep1.m3u8","mime":"application/vnd.apple.mpegurl","language":"es"},
              {"mode":"official_embed","provider":"youtube","videoId":"dQw4w9WgXcQ","name":"Canal oficial"}
            ],
            "subtitles_es": "./media/ep1.es.vtt"
          }]
        }
      }
    }

Este ejemplo NO es contenido disponible. El editor debe confirmar los derechos de emisión antes de publicarlo. Una URL pública o un atributo rights no demuestran titularidad.

## Arquitectura

Manifiesto autorizado -> normalización de fuentes -> DexterAnimeSync -> data/dexter/records.json -> interfaz de episodios.

Los episodios obtenidos de calendarios de emisión son metadatos, no archivos reproducibles.
El motor no extrae tokens protegidos ni realiza proxys de video de sitios de terceros.

## Compatibilidad

- Safari iPhone tiene reproducción HLS nativa en el elemento HTML5 video.
- En Chrome/Firefox la reproducción HLS puede necesitar hls.js. Integrar con el PR #7 después de consolidarlo.
- HLS exige HTTPS, MIME correctos, CORS compatible y un proveedor que autorice la distribución.
- GitHub Pages sirve la interfaz y JSON públicos, pero no es apropiado para una biblioteca grande de video.
- El módulo de fuente restringe nombres de hosts y URLs, pero no comprueba que un video tenga derechos ni que esté en línea.

## Investigación — fuentes oficiales consultadas en octubre de 2026

1. AniList rate limiting: https://docs.anilist.co/guide/rate-limiting — límite normal de 90/min y aviso actual de degradación a 30/min; respetar 429 y Retry-After.
2. Jikan API: https://github.com/jikan-me/jikan-rest — límite de 3/s y 60/min, API no oficial de MyAnimeList.
3. hls.js: https://github.com/video-dev/hls.js — HLS en navegadores con Media Source Extensions, Safari soporta reproducción nativa.
4. Apple HLS: https://developer.apple.com/documentation/http-live-streaming/deploying-a-basic-http-live-streaming-hls-stream
5. GitHub Pages: https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits — sitio máximo 1 GB y límite blando 100 GB/mes.
6. Cloudflare Pages: https://developers.cloudflare.com/pages/platform/limits/ — opción gratuita de hosting estático, con restricciones de tamaño de archivo y número de builds.

## Verificación

Ejecutar: node scripts/test-media-source-contract.mjs

Las pruebas del contrato no sustituyen pruebas reales de reproducción en Safari, Chrome o Firefox ni validación de licencias.
