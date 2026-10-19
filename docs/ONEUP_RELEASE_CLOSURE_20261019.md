# 1UP Anime — Cierre editorial de producto (2026-10-19)

Se estudiaron patrones de diseño en proyectos de anime públicos y archivados, incluido AniAPI (archivado, GPL-3.0) y crunchyroll-redesign (MIT). Se tomó inspiración conceptual. La capa visual se escribió desde cero para 1UP sin copiar logotipos, ilustraciones, código de terceros ni paquetes GPL.

## Implementación
- oneup-finale.css: capa moderna sobre Kokomi Esmeralda/Violeta, header, hero, jerarquía, tarjetas, búsqueda, filtros, programación, modal, footer, móvil y movimiento reducido. El modo Original conserva el diseño histórico.
- oneup-finale.js e index.html: accesos a Catálogo/Emisión/Calendario/Mi lista mediante rutas reales. Etiqueta con cantidad de fichas únicas en el snapshot local y fecha auténtica, no usuarios ni streams inventados.
- sw.js: cache PWA renovada de forma aislada. Sin dependencias nuevas ni modificaciones al reproductor existente.

## Estado funcional
Disponible sin servicios propios: navegación pública, catálogo y búsqueda de anime, géneros, calendario, favoritos y progreso en el dispositivo, explorador de franquicias, scraping educativo de metadatos.
Necesita pasos del titular para ser operativo: Google OAuth (auth-config.js null), backend comunidad y sincronización (Firebase/Supabase null) y fuentes de reproducción con derechos verificados (data/licensed-media.json tiene entries vacío). Una API de títulos no es servidor de videos.

## Verificación y salida
- node --test tests/oneup-finale.test.mjs
- node scripts/e2e-oneup-finale.mjs (Chromium 390 / 1366 px), Browser Acceptance, Puppeteer, HLS, calidad de sitio.
- Validar pantallas y controles, GitHub Pages, Safari iPhone físico y APIs reales antes de declarar el lanzamiento completo.

Este documento evita declarar 100% o cerrar PR antiguos sin verificarlos. El repositorio debe permanecer activo para mantenimiento y configuración de servicios.
