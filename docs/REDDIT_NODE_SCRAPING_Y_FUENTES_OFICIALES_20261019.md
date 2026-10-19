# 1UP Anime — aprendizaje de r/node y fuentes audiovisuales oficiales
Fecha de investigación: 2026-10-19

## Fuente y análisis
Hilo: https://www.reddit.com/r/node/comments/zy1skm/i_am_trying_to_scrape_data_from_an_anime_website/

El autor intentaba obtener datos de zoro.to con Node/Axios y pensaba que el sitio detectaba bots. Las respuestas distinguen el **HTML recibido del servidor** (View Source) del **DOM posterior a JavaScript** (Inspect); la diferencia no implica necesariamente bloqueo antibots. Se recomiendan Cheerio para parsear HTML/SSR, Puppeteer para SPA/CSR o datos tras clics y herramientas de inspección HTTP para identificar APIs publicadas, siempre que esté permitido accederlas. Otro comentarista enlaza AnimeAPI basado en Cheerio. Estos consejos no garantizan que una fuente permita reproducir ni redistribuir sus videos.

### Elección por capacidad
| Situación | Método | Uso permitido en 1UP |
|---|---|---|
| Datos disponibles en JSON/API documentada | API oficial (AniList, otras autorizadas) | Prioridad 1; identificadores, temporadas, calendarios |
| HTML público estático y reutilización permitida | HTTP + BeautifulSoup/Cheerio | Metadatos factuales, atribución, comprobaciones de robots/términos |
| Contenido HTML actualizado por JS y acceso permitido | Puppeteer o Playwright solo en jobs controlados | Inspector de DOM y automatización de comprobaciones |
| Listados que cambian diariamente | GitHub Actions + caché/snapshot + diffs | Actualizaciones incrementales sin sobrecargar orígenes |
| Emisión audiovisual | Archivo propio con derechos, reproductor oficial embebible | Únicas fuentes elegibles para botones de reproducción |

No aplicar trucos para evadir Cloudflare, CAPTCHA, DRM, paywalls, controles de región, cabeceras de autorización de terceros o URLs firmadas. No reenviar tráfico de proveedores mediante un servidor proxy para publicar archivos sin derechos. Un scraper que identifica un `.m3u8` NO concede permiso para reproducirlo en 1UP.

## Implementación ya existente (evitar duplicaciones)
- `scripts/scrape-encyclopedia-anime.py`, `docs/EDUCATIONAL_SCRAPING.md` y `data/encyclopedia-anime.json`: scraping educativo de metadatos en Wikipedia, sujeta a reglas y atribución.
- `scripts/puppeteer-site-audit.mjs`: navegador automatizado para QA de nuestro propio sitio, no extractor de video externo.
- `scripts/refresh-airing.mjs`, `scripts/refresh-catalog.mjs`: obtención y caché de datos de anime.
- `episode-player.js`, `scripts/media-source-contract.mjs`, `data/licensed-media.json`: reproductor de fuentes declaradas y validadas, sin descargar contenido.
- `scripts/dexter-anime-sync.mjs`: unificación de emisiones y biblioteca editorial.

## Primer episodio completo oficial propuesto
- Serie: **Lupin III (2015) / Part IV**, MyAnimeList ID `27947`.
- Episodio 1: **The Wedding of Lupin III**, doblaje **inglés**; fuente publicada por **Anime! on TMS Official Channel** (distribuidor TMS Entertainment).
- Fuente audiovisual: https://www.youtube.com/watch?v=K8LrLO_omys
- Fuente corporativa: https://tmsanime.com/anime-on-tms-official-channel
- Referencia sobre integrar el player: https://support.google.com/youtube/answer/171780?hl=en
- Configuración propuesta: `data/licensed-media.json`, `mode: official_embed`, reproductor `youtube-nocookie.com` **al hacer clic**. No descarga, no aloja ni retransmite los bytes del anime. El iframe respeta el origen, las políticas de YouTube, la configuración de inserción del autor, la zona geográfica y los subtítulos/audio ofrecidos por YouTube.
- Si el proveedor bloquea la inserción, la interfaz ya muestra `Abrir en el proveedor oficial ↗`. No emplear métodos de elusión ni anunciar español latino si el video es inglés.

**Estatus del video**: identificado en la página oficial y resultado público de YouTube, pero NO se comprobó reproducción efectiva en Safari iPhone/Estados Unidos ni si el propietario mantiene la inserción activada. No llamarlo reproducción activa hasta verificaciones de navegador y despliegue exitosos.

## Próximas verificaciones
1. Ejecutar `node scripts/test-media-source-contract.mjs`, `node scripts/test-official-episode-library.mjs`, `node scripts/test-episode-player.mjs` y pruebas de UI de proyecto.
2. Probar ficha `mal-27947` en Chromium con localhost/GitHub Pages: elegir episodio 1, pulsar abrir y confirmar YouTube player; validar alternativa 'Abrir en el proveedor oficial'.
3. Revisar restricciones regionales, edad, disponibilidad y permiso de inserción de cada episodio antes de añadirlo a la lista activa; comprobar manualmente Safari físico.
4. Cuando haya más fuentes embebibles oficialmente publicadas, automatizar solo la **detección de metadatos de los canales oficiales** de manera respetuosa, con revisión humana de enlaces/identidad/permiso y sin descargar videos.
5. Ampliar idiomas y subtítulos únicamente conforme a archivos/pistas efectivamente autorizados; no suponer disponibilidad en español.

## Reglas editoriales duraderas
Antes de agregar videos nuevos: verificar procedencia oficial, correspondencia anime/temporada/episodio, licencia/condiciones de inserción, URLs estables, territorialidad, clasificación y compatibilidad móvil. Conservar atribución; ante bajas dejar fallback externo o retirar la fuente del manifiesto. `rights: authorized` es una declaración editorial para integrar **el reproductor de terceros**, no una licencia para reutilizar el archivo.
