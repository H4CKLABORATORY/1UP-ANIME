# 1UP Anime — Exploración de APIs para sagas y recomendaciones

Fecha: 2026-10-19. Inspiración técnica: https://github.com/topics/anime-api (directorio público), https://docs.anilist.co/guide/graphql/queries/media (relaciones reales), https://docs.jikan.moe (Jikan), https://kitsu.docs.apiary.io/ (Kitsu).

## Repositorios valorados
- AniAPI-Team/AniAPI: archivado; no se introduce como dependencia de producción.
- Nekidev/anime-api: wrappers de varias APIs; no es necesario añadir otro intérprete Python al navegador.
- MALSync/MALSync: útil como inspiración de seguimiento; la sincronización de cuentas exige autorización explícita.
- wopian/kitsu: cliente JSON:API para posible respaldo futuro cuando se verifique conectividad, CORS, IDs y condiciones.
- ErickLimaS/anime-website: referencia de arquitectura web; no copiar codebase ni integrar streaming externo.
- AniList y Jikan: ya se usan en la página; se extienden con relaciones confirmadas y respaldo, sin añadir dependencias de terceros.

## Implementado
- franchise-explorer.mjs: escucha la apertura de cada ficha de 1UP, consulta AniList Media.relations.edges (precuelas, secuelas, historias paralelas) y recomendaciones, evita duplicados, excluye entradas de manga y medias marcadas como adultas. No se anuncia orden canónico de visionado ni se prometen videos.
- Al fallar AniList para una ficha con MAL ID, consulta https://api.jikan.moe/v4/anime/{id}/relations sólo para recuperar relaciones. No inventa imágenes, episodios o fechas para Jikan.
- Identificadores exactos MAL/AniList, límites de registros, URLs de imágenes HTTPS, textContent, cancelación al cambiar de ficha, timeout, espacios entre consultas y caché de seis horas por sesión.
- franchise-explorer.css: tarjetas responsive 1UP negro/verde; teclado y modo de movimiento reducido. Evita sobreescribir estilos y componentes existentes.
- index.html, sw.js: conectan la función opcional con la web y la PWA; tests unitarios sin conexión.

## Pendientes verificables
- CI y deploy GitHub Pages; prueba con servicio AniList real y Safari físico. Las pruebas de navegador headless no equivalen a una prueba con iPhone real.
- Kitsu como respaldo futuro sólo si aporta mejora comprobable frente a fuentes actuales, sin falsear identidad de anime.
- Seguimiento OAuth voluntario de MAL/AniList con protección de tokens; APIs de metadatos nunca equivalen a fuentes de capítulos.
