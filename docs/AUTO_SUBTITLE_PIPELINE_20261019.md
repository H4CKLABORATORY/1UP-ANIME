# 1UP Anime · Subtítulos automáticos para contenido autorizado

Los datos obtenidos por scraping educativo (AniList, Jikan o Wikipedia) no incluyen los archivos audiovisuales. Para crear subtítulos nuevos se requiere disponer legalmente del video/audio fuente o permiso explícito de procesarlo.

## Generación offline opcional

Instalar en una computadora con Python: pip install faster-whisper argostranslate. Los modelos de voz y traducción se descargan/instalan aparte, pueden ocupar varios GB y deben tener el par de idiomas correspondiente (ja→en, en→es para japonés; es→en para español; etc.). No existe garantía de traducciones perfectas.

Ejemplo:
python scripts/generate-authorized-subtitles.py episodio01.mp4 --rights-confirmed --language auto --output-dir media/subtitles --stem serie_s01e01

El script transcribe un archivo LOCAL mediante faster-whisper. Produce media/subtitles/serie_s01e01.es.vtt y .en.vtt si tiene instalados los modelos apropiados. Si la traducción no está disponible, falla sin fabricar un subtítulo. Es necesario revisar y corregir los tiempos, nombres propios y expresiones de anime antes de publicarlo.

## Publicación
Agregar ambos archivos WebVTT a un origen HTTPS permitido con CORS apropiado. En data/licensed-media.json cada fuente puede incluir:
"tracks":[{"lang":"es","label":"Español","url":"./media/subtitles/serie_s01e01.es.vtt"},{"lang":"en","label":"English","url":"./media/subtitles/serie_s01e01.en.vtt"}]

No crea ni descarga episodios y no ejecuta reconocimiento de voz en visitantes de la web. El reproductor de 1UP ofrece selector de idioma y estilo solo si la fuente realmente incluye las pistas. Iframes de terceros controlan sus propios subtítulos, no los nuestros.
