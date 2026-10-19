# OMEGA MEMORY — memoria portable de 1UP Anime

Actualización inicial: 2026-10-16. Archivo compartido para Codex/otras IA que trabajen **en este repositorio**. Se revisa al iniciar una tarea y se modifica en cambios materiales; no representa la memoria interna de ChatGPT ni el historial completo de chats.

## Propósito y restricciones
- Plataforma de anime original orientada a comunidad: gratuitamente accesible, presupuesto inicial **USD 0**; no activar facturación.
- El usuario busca una web real, grande, rápida, estética y completa; valora ejecución proactiva, investigación profunda, soluciones ingeniosas y documentación exhaustiva.
- Quiere una IA que preserve contexto continuamente, reutilice lo aprendido y mejore sus procedimientos. Crear registros versionados; jamás fingir memoria persistente si no hay escritura real.
- Idioma predeterminado español, instrucciones directas y exhaustivas. Preferir ejecutar antes de simplemente asesorar, siempre dentro de accesos reales.
- Preferencia de diseño registrada: **línea visual de Codex + Kokomi**, no volver a una maqueta Nebula más simple. Identidad independiente 1UP; Halloween/magia como acentos sutiles de temporada.
- PWA compatible con iPhone/Safari, Android y PC; no sonido obligatorio y respetar reducción de movimiento.
- En episodio mostrar comentarios de ese episodio; permitir elegir hasta siete fuentes de video cuando estén registradas y sean válidas; seleccionar idioma, subtítulos, temporada y episodio; recuperación tras error y cambio manual.
- Catálogo de metadatos global, películas/OVA/ONA/especiales, búsqueda y temporadas; no confundir con medios disponibles.
- La «licencia universal» de Nébula es un artefacto de ficción, no da derechos de animes reales.

## Estado técnico verificado al 2026-10-16 (revalidar)
- Repositorio público H4CKLABORATORY/1UP-ANIME, rama `main`, commit observado actualizado `0f5df57560a3a7f5391b47ef4dca643889364a9e`.
- El workflow de GitHub Pages del commit anterior dio `success` (38908714690). No evidencia de video real.
- Árbol remoto inspeccionado: 194 entradas (incluye directorios) y 17 workflows bajo `.github/workflows/`.
- PR #23 fusionó mejoras: 7 posiciones, HLS/MP4/WebM, WebVTT idiomas, filtro de URL HTTPS públicas, botón manual para siguiente fuente. Tests UI/navegación/HLS/contrato con éxito.
- PRs #14, #18, #19, #20 son cadena de cambios de UI en revisión/draft (estado de consulta anterior); el logo animado fue fusionado en `main` posteriormente desde su línea de desarrollo. Verificar PRs actuales y evitar merges duplicados.
- `data/licensed-media.json` tiene `entries: {}`, sin episodios reales.
- `firebase-config.js`, `auth-config.js`, `social-config.js` y `supabase-config.js` tienen configuraciones null. Backend remoto no confirmado.
- `data/guild-license.json` tiene `universe_type: fictional_alternate_reality`. No aplicar a títulos reales.
- **ACTUALIZACIÓN post-snapshot:** commit `e4a8ef9d` integró intro original H.264/AAC ~3.2 s, poster JPG e icono PNG además de brand-signature.js/css. En árbol `main` actualizado ya aparecen. No asegurar que su reproducción en iPhone real haya sido verificada. PR #22 se había visto draft antes del merge: consultar estado actual.

## Árbol y arquitectura — fuente definitiva
- Frontend: `index.html`, `studio.html`, `studio.js`, `studio.css`, `spotlight.css`, `brand-v2.css`, `motion.css/js`.
- Kokomi: `themes/kokomi-studio/*`, `themes/kokomi-mobile-preview/*`, `preview-kokomi-mobile.html`; octubre: `themes/october-2026/*`.
- Multimedia: `episode-player.js`, `hls-adapter.js`, `episode-comments.js`, `player.css`, `data/licensed-media.json`, `scripts/media-source-contract.mjs`.
- Social: `comunidad.html`, `community.js`, `social-backend.js`, `moderacion.*`, `auth.*`, `functions/index.js`, `firestore.rules`, SQL Supabase opcional.
- Contenido: `data/catalog.json`, `data/airing.json`, `data/translations-es.json`, `scripts/refresh-catalog.mjs`, `scripts/refresh-airing.mjs`.
- DevOps: `.github/workflows/*`, `scripts/oneup-guard.mjs`, `data/guard/*`, `scripts/dexter-anime-sync.mjs`.
- Lea expediente completo `docs/OMEGA_PROJECT_DOSSIER_20261016.md` (si existe) y `docs/PROJECT_CONTINUITY.md`; no basar cambios de detalle solo en este resumen.

## Protocolo actualización
Al terminar avances reales, añadir al final:
```
### [fecha UTC] — [tarea]
- Pedido:
- Estado previo:
- Cambio y rutas:
- Branch/commit/PR:
- Pruebas realmente ejecutadas:
- Decisión/criterio:
- Limitaciones y siguientes pasos:
```
Excluir secretos, datos personales irrelevantes, suposiciones no etiquetadas, promesas de segundo plano y contenido sin autorización.

### 2026-10-17 — Temas públicos Esmeralda / Original / Violeta, PR #41
- Pedido del propietario: actualizar la web con cada mejora técnica y ofrecer diseño negro/verde inspirado en buenos patrones de plataformas de anime, con cambio de temas. Inspiración no significa acceso al código privado de Crunchyroll.
- Rama `feature/oneup-green-theme-picker-20261017`, PR [#41](https://github.com/H4CKLABORATORY/1UP-ANIME/pull/41). Capa original `themes/oneup-palette/selector.css/js` integrada en `index.html`, modo Esmeralda por defecto, otros dos estilos, ajuste Safari móvil (selector en menú), preferencia local y ARIA.
- `sw.js` nueva versión v28 precachea la función sin limpiar cachés de otros proyectos. No modifica jugadores, contenido, auth ni derechos.
- Pruebas: `scripts/e2e-oneup-palette.mjs` en CI Browser Acceptance, verifica 320/390/1366, persistencia, modo Original, accesibilidad y layout. No atribuir PASS hasta comprobar conclusión del workflow.
- Antes de declarar entrega: CI y merge PR #41, GitHub Pages success, archivos desplegados 200, Safari físico pendiente. Guía: `docs/ONEUP_COLOR_THEMES.md`.


### 2026-10-17 — ONEUP Motion
- El propietario pidió pulido de movimientos comparable en calidad a grandes servicios de streaming, con implementación original.
- Rama `feature/oneup-premium-window-motion-20261017`: `themes/oneup-motion/windows.css/js`; entrada de páginas desde `studio.js` y `pages.js`; animación de apertura y salida de ficha; deslizamiento de drawer, search y temas; PWA v29.
- Requisito invariable: rutas rápidas, modal nativo cerrable por Escape, foco y `prefers-reduced-motion`/modo silencioso. No ocultar resultados de fallos; correr Playwright en CI para 390/1366 y reducción.
- Próximo: comprobar CI, corregir regressiones si las hay y fusionar sólo cuando las pruebas estén verdes; luego verificar GitHub Pages.

### 2026-10-18 — destino Crunchyroll opcional para temporadas
- Rama `feature/official-crunchyroll-links-20261018`: módulo `official-watch.js/css`, UI en calendario/ficha, verificaciones de URLs oficiales y filtrado de `externalLinks` AniList en refresco programado.
- Mantener **dos opciones distintas**: reproducir en 1UP (solo con fuentes válidas y autorizadas en `data/licensed-media.json`) y abrir en el sitio oficial de Crunchyroll. Nunca presentar link externo como permiso de retransmisión ni afirmar que hay capítulos cuando el manifiesto está vacío.
- No fusionar automáticamente ramas con cambios simultáneos en `index.html`/`sw.js` (PR #46 contador online).

### 2026-10-18 — Pulido sitio completo PR #48
- Fotografía real de iPhone mostró logo recargado y demasiado pequeño, modal con grandes vacíos y X sobredimensionada. Se revisó el DOM/CSS/JS reales antes de actuar.
- PR [#48](https://github.com/H4CKLABORATORY/1UP-ANIME/pull/48) crea `assets/oneup-crest-mark.svg` y `ui-quality.css`; modifica modal, perfiles, headers, tipografía para títulos largos y botón de profundidad (el botón antes quedaba dentro del drawer oculto).
- Pruebas reales Chromium y capturas de acceso en GitHub Actions; un segundo render mostró ventana compacta y centrada tras arreglar su altura. No llamar a Chromium Safari ni certificar una prueba en iPhone físico.
- Registrar siguientes revisiones en `docs/SITE_QUALITY_AUDIT_20261018.md`; no sobreescribir la identidad actual ni inventar disponibilidad de login Google/video.

### 2026-10-19 — automatización de navegador Puppeteer
- Integración aislada en herramientas de desarrollo: `puppeteer@25.14.0`, script `scripts/puppeteer-site-audit.mjs` y workflow `ONEUP Puppeteer Browser QA`; no agregar Puppeteer a la carga de Safari/usuarios ni exponer un navegador público.
- Revisión local automatizada (sin APIs externas), generación de capturas/JSON y verificación de UI básica. En `docs/PUPPETEER_QA.md` se explica funcionamiento y límites. No afirmar QA aprobado antes de CI.

### 2026-10-19 — Referencias entre conversaciones y activación de mejoras
- Activador del propietario: **«empieza con las mejoras»** = continuar 1UP Anime desde el último estado comprobado, salvo que indique otro proyecto. Procedimiento completo en `AGENTS.md`. No equivale a memoria total de otros chats ni a un proceso en segundo plano.
- Para trabajar consultar `docs/NEW_CHAT_HANDOFF.md`, `docs/PROJECT_CONTINUITY.md`, `docs/OMEGA_NEXT_ACTIONS.md` y PR/CI reales. Los documentos históricos pueden estar desactualizados.
- **MAL Updater:** https://malupdater.com; estudio documentado en PR #50 (`docs/MAL_UPDATER_REFERENCIA_20261019.md` en la rama `docs/mal-updater-research-20261019`, borrador al registrarse). Ideas: scrobbling web de reproducción autorizada, reanudación de minuto, estados de listas, filtros, calendario, temporadas y sincronización consentida MyAnimeList/AniList mediante APIs oficiales. MAL Updater no proporciona medios audiovisuales; no copiar su código sin licencia.
- **Automatización de navegador:** Puppeteer (https://github.com/puppeteer/puppeteer) como herramienta de QA/de desarrollo, no paquete pesado de la PWA pública; pruebas y procedimientos en `docs/PUPPETEER_QA.md`.
- **Investigación de extracción:** guía Apify https://apify.com/img/web-scraping/beginners-guide-to-web-scraping.pdf; Ben-John Okezie https://benjohnokezie.medium.com/building-a-web-scraper-that-downloads-my-anime-for-me-1b0b89c00bc1; `soumik12345/Manga-Scraper` como referencia técnica. Adaptar solamente extracción de metadatos y automatización de fuentes permitidas, sin descarga/republicación no autorizada, evasión de DRM ni convertir un scraper en permiso.
- **Catálogo, presentación y comunidad:** referencias visuales y de funciones Crunchyroll, Kokomi y vanzero.haarls.dev (contador en línea) para crear experiencia propia; enlaces oficiales opcionales a Crunchyroll; contador real necesita backend de presencia y no debe presentar usuarios ficticios. Revisar PR #46 sobre presencia en línea y PR #47 ya identificado como integrado anteriormente, confirmando estado actual.
- **Directriz de calidad:** diseño cinematográfico original 1UP, nivel profesional móvil/escritorio, Kokomi elegido, negro/verde con temas opcionales, ventanas/motion accesibles, iPhone PWA, español, presupuesto inicial cero, audio y logo originales sin autocargar sonido contra políticas Safari. Mantener selector/configuración de fuentes según arquitectura vigente y nunca exponer secretos en interfaz.
- **Prioridades técnicas repetidas del propietario:** progreso real, continuar viendo, filtros, catálogo/estrenos fiables, acceso opcional, perfiles/comunidad, reproductor robusto para fuentes con derechos, corrección del logo/modales/funciones, QA visual completo y despliegue confirmado. Verificar las prioridades antes de actuar porque pueden cambiar en otro chat.
- No almacenar aquí detalles privados de conversaciones, claves ni datos personales. Mantener este índice actualizado cuando se integren nuevas investigaciones, sin afirmar que cubre literalmente todo lo dicho en todos los chats.
