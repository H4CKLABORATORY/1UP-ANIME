
Origen: https://github.com/topics/anime-scraper

## Objetivo

El listado de GitHub tiene cientos de proyectos que usan la etiqueta `anime-scraper`; esta revisión **no es un estudio individual de cada repositorio**. Se muestrean herramientas activas, herramientas archivadas, rastreadores, bibliotecas de metadatos y frontends de scraping. La finalidad es seleccionar ideas compatibles con 1UP Anime (estático en GitHub Pages, español, iPhone, presupuesto inicial $0) sin importar descargas o proveedores dudosos.

## Repositorios útiles evaluados

| --- | --- | --- | --- |
| [Normioffi/Aniki](https://github.com/Normioffi/Aniki) | MIT | API wrappers y normalización de metadatos de varias fuentes | Patrón de adaptadores útil; preferir AniList/Jikan existentes en vez de añadir dependencias innecesarias |
| [truelockmc/streambert](https://github.com/truelockmc/streambert) | GPL-3.0 | UI de biblioteca y controles de reproducción | Considerar interacción genérica; no importar descargadores de films ni enlaces de contenido ajeno |


## Mejoras concretas integradas en esta propuesta

1. Añadir `anime-title-search.js`: comparación Unicode segura (NFKC, diacríticos y signos) de título principal, romaji, japonés y alias. Sin nuevas dependencias ni scraping de vídeo.
3. Extender los adaptadores de AniList y Jikan del catálogo online para incluir variantes y sinónimos.
4. Cuando se use un snapshot como respaldo, permitir buscar por título alternativo, sin necesidad de HTTP adicional.

Los snapshots que ya están publicados **no contienen todavía las columnas nuevas**; se agregarán cuando se ejecute exitosamente el siguiente refresco oficial de `scripts/refresh-catalog.mjs`. Si AniList bloquea o limita la ejecución, la búsqueda vuelve a títulos disponibles hasta que se actualice el JSON.


- Índice `anime_id / season / episode / language / subtitles / sha256 / source`.
- Colas y reintentos acotados que verifiquen integridad de archivos antes de su publicación.


## PR relacionados


## Criterios de publicación

Comprobar en el commit final: nueva prueba Node, `node scripts/check-ui.mjs`, Puppeteer móvil/escritorio y browser acceptance; tras fusionar, confirmar GitHub Pages y refresco futuro de `data/catalog.json`. La comprobación de Safari físico sigue pendiente hasta existir una prueba hecha en el dispositivo.
