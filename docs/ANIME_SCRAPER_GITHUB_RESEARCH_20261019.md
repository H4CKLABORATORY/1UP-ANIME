# Investigación educativa de GitHub `anime-scraper` — 19/10/2026

Origen: https://github.com/topics/anime-scraper

## Objetivo

El listado de GitHub tiene cientos de proyectos que usan la etiqueta `anime-scraper`; esta revisión **no es un estudio individual de cada repositorio**. Se muestrean herramientas activas, herramientas archivadas, rastreadores, bibliotecas de metadatos y frontends de scraping. La finalidad es seleccionar ideas compatibles con 1UP Anime (estático en GitHub Pages, español, iPhone, presupuesto inicial $0) sin importar descargas o proveedores dudosos.

## Repositorios útiles evaluados

| Proyecto | Licencia en el repositorio consultado | Lo que enseña | Decisión para 1UP |
| --- | --- | --- | --- |
| [sdaqo/anipy-cli](https://github.com/sdaqo/anipy-cli) | GPL-3.0 | Separar API, UI, gestión de episodios, modo temporadas, integración MAL/AniList y archivos locales | Inspiración arquitectónica; **no** copiar el código GPL ni configurar fuentes de streaming no autorizadas |
| [SenZmaKi/Senpwai](https://github.com/SenZmaKi/Senpwai) | GPL-3.0 | Colas por lote, orden de episodios, actualizaciones y descargas recuperables | Aplicable en un futuro importador de **archivos propios/autorizados** (véase PR #51), nunca descarga automática de catálogos ajenos |
| [Wraient/curd](https://github.com/Wraient/curd) | GPL-3.0 | Identidad de títulos, seguimiento de progreso MAL/AniList, orden de fuentes, historial local | Usar ideas de seguimiento/autorización; descartar bypass de protecciones de acceso y extracción de plataformas |
| [chirag-droid/animeflix](https://github.com/chirag-droid/animeflix) | AGPL-3.0 | Fichas y listas basadas en AniList; frontend responsive | Inspiración conceptual. No copiar código AGPL a PWA sin examinar obligaciones de la licencia |
| [Normioffi/Aniki](https://github.com/Normioffi/Aniki) | MIT | API wrappers y normalización de metadatos de varias fuentes | Patrón de adaptadores útil; preferir AniList/Jikan existentes en vez de añadir dependencias innecesarias |
| [viu-media/viu](https://github.com/viu-media/viu) | Unlicense, archivado | Experiencia de navegación en terminal | Referencia histórica; no usar como fuente activa por falta de mantenimiento |
| [truelockmc/streambert](https://github.com/truelockmc/streambert) | GPL-3.0 | UI de biblioteca y controles de reproducción | Considerar interacción genérica; no importar descargadores de films ni enlaces de contenido ajeno |

Licencia y mantenimiento pueden cambiar; hay que verificar el archivo `LICENSE` y términos de la fuente **antes de cualquier copia**.

## Mejoras concretas integradas en esta propuesta

1. Añadir `anime-title-search.js`: comparación Unicode segura (NFKC, diacríticos y signos) de título principal, romaji, japonés y alias. Sin nuevas dependencias ni scraping de vídeo.
2. Guardar `title_romaji`, `title_native` y `aliases` (máximo 16) desde la API AniList en nuevos snapshots del catálogo. El refresco ya existente conserva IDs MAL/AniList y permisos actuales.
3. Extender los adaptadores de AniList y Jikan del catálogo online para incluir variantes y sinónimos.
4. Cuando se use un snapshot como respaldo, permitir buscar por título alternativo, sin necesidad de HTTP adicional.
5. Verificar mediante `node --test tests/anime-title-search.test.mjs` y Chromium existente. Las fuentes multimedia autorizadas y el reproductor no cambian.

Los snapshots que ya están publicados **no contienen todavía las columnas nuevas**; se agregarán cuando se ejecute exitosamente el siguiente refresco oficial de `scripts/refresh-catalog.mjs`. Si AniList bloquea o limita la ejecución, la búsqueda vuelve a títulos disponibles hasta que se actualice el JSON.

## Descargadores en laboratorio educativo

Las ideas permitidas para una futura biblioteca 1UP de *medios propios o autorizados* incluyen:
- Índice `anime_id / season / episode / language / subtitles / sha256 / source`.
- Colas y reintentos acotados que verifiquen integridad de archivos antes de su publicación.
- Importación manual de archivos locales, Creative Commons u obras de las que se tengan derechos de distribución.
- Verificación de consentimientos, procedencia, licencias y claves de firma sin exponer secretos al navegador.
- Archivos de prueba pequeños sin contenido protegido para QA del reproductor.

**Fuera de alcance:** descargar automáticamente capítulos protegidos de servicios ajenos, extraer links de streaming de pago, superar DRM, eludir defensas anti-bot, resubir episodios o fingir que una ficha en AniList acredita permiso de distribución.

## PR relacionados

- [PR #51 — lector manga y publicación de medios autorizados](https://github.com/H4CKLABORATORY/1UP-ANIME/pull/51): conservar como módulo separado para colas/editorial, no crear un segundo sistema de publicación.
- [PR #52 — laboratorio educativo de metadatos](https://github.com/H4CKLABORATORY/1UP-ANIME/pull/52): no superponer su nuevo extractor de fuente con AniList/Jikan; este cambio solo implementa búsqueda de títulos.
- [PR #50 — MAL Updater](https://github.com/H4CKLABORATORY/1UP-ANIME/pull/50): ideas para seguimiento de progreso y autorización por OAuth, separadas del módulo de búsqueda.

## Criterios de publicación

Comprobar en el commit final: nueva prueba Node, `node scripts/check-ui.mjs`, Puppeteer móvil/escritorio y browser acceptance; tras fusionar, confirmar GitHub Pages y refresco futuro de `data/catalog.json`. La comprobación de Safari físico sigue pendiente hasta existir una prueba hecha en el dispositivo.
