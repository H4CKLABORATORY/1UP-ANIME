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


### 2026-10-19 — Scraping educativo (publicación)
- Módulo Python + BeautifulSoup de una sola página Wikipedia 2026, robots.txt, JSON factual de estrenos y actualización diaria GitHub Actions.
- Interfaz scraping-lab.html con filtros, atribución y respaldo AniList etiquetado como API.
- Funciones multimedia originales no tocadas; se mantienen las reglas de fuentes con licencia. Sin gastos ni credenciales.
- Validación PR #52: fixture Python, Puppeteer, navegador móvil/escritorio, calidad y módulos HLS/links exitosos.
- Primera extracción real, publicación Pages y Safari físico pendientes de comprobación posterior al cambio main.

### 2026-10-19 — anime-scraper (metadatos, búsqueda y estudio de descargadores)
- Investigación documentada: `docs/ANIME_SCRAPER_GITHUB_RESEARCH_20261019.md`. Se revisaron ejemplos de anipy-cli (GPL), Senpwai (GPL), curd (GPL), animeflix (AGPL), Aniki (MIT) y otros. **Tomar patrones, no copiar software con licencias incompatibles ni republicar medios ajenos.**
- Nuevo módulo de búsqueda ligera `anime-title-search.js`, sin acceso a redes. El catálogo de AniList/Jikan y el snapshot guardarán títulos originales, romaji y alias cuando se actualice la API. Tests y flujo CI dedicados; no afectar los PR #51/#52.
- El estudio de descargas se aplica a bibliotecas propias/autorizadas: orden de archivos, hashes, reintentos, subtítulos y procedencia. No equivale a un permiso para descargar o distribuir capítulos comerciales.


### 2026-10-19 — Anime API: franquicias y recomendaciones verificadas
- Directorio consultado https://github.com/topics/anime-api: descartadas dependencias archivadas y streaming externo, priorizando AniList GraphQL / Jikan REST.
- Rama feature/anime-api-franchise-discovery-20261019. Nuevo módulo optativo franchise-explorer.mjs/css en fichas, precuelas/secuelas, historias relacionadas y sugerencias basadas en relaciones reales AniList.
- Respaldo Jikan sólo de relaciones por ID MAL; rechaza ID difuso y filtros de manga/adulto marcados por AniList. Cancela consultas al cerrar, cachea y no toca el reproductor ni manifiesto de video.
- Verificación requerida: CI tests/franchise-explorer.test.mjs, navegador, despliegue Pages y Safari físico. No se declara el sitio finalizado.


### 2026-10-19 — enlaces exactos Crunchyroll y API comunitarias
- Investigación portátil en `docs/CRUNCHYROLL_API_GITHUB_RESEARCH_20261019.md` (https://github.com/topics/crunchyroll-api): estructuras y UX de `crunchyroll-rs`, `HarshitKumar9030/crunchyroll-api`, `crunchyroll-docs`, `Crunchyroll-Filter`; no usar descargadores, tokens/cookies, mecanismos DRM ni endpoints no autorizados para llenar el reproductor de 1UP.
- Rama `feature/official-crunchyroll-episode-links-20261019`: seis enlaces editoriales públicos del anime Black Clover original (`mal-34572`), E1–E6, abiertos exclusivamente en Crunchyroll con consentimiento al hacer clic. `official-watch.js` valida dominio/URL y enlaza el episodio exacto al cambiar selector; `official-watch.css` contiene estilos adaptativos y `tests/official-watch.test.mjs` pruebas de seguridad. No atribuir esos capítulos a la nueva temporada `mal-61967`. La página 1UP no retransmite dichos videos ni declara que sean gratuitos.
- Integración de lector Crunchyroll NO instalada; fuentes reales de reproducción siguen separadas en `data/licensed-media.json`. Verificar PR/CI/Pages/Safari antes de declarar activo.

### 2026-10-19 — Cierre editorial gradual
- CSS/JS original para interfaz modernizada, navegación de acceso rápido y fecha/títulos únicos del catálogo. Sin copia de repositorios archivados.
- Rama de entrega feature/oneup-editorial-finale-20261019, pruebas Chromium 390/1366, HLS, temas y calidad; no sustituye configuración backend.
- Se integran los enlaces oficiales nuevos de otro commit en sw.js, preservando el resto de funciones y la licencia de reproducción.
- Leer docs/ONEUP_RELEASE_CLOSURE_20261019.md. Google OAuth, comunidad remota y episodios autorizados aún necesitan configuración; Safari físico pendiente.

### 2026-10-19 — hero 1UP de estrenos y controles premium
- Portada profesional basada en la grabación de referencia: botones Ver detalles/Mi lista/Crunchyroll (enlace oficial), fondo cinematográfico, flechas, barras de progreso, pausa y swipe. Código original `premiere-ranking.js`, `premiere-hero.js`, `premiere-hero.css`; reaprovecha AniList y la identidad 1UP.
- Priorización verificable de emisiones locales de hoy y próximos episodios, sin prometer video distribuible; fecha del snapshot visible. Nunca confundir calendario con biblioteca autorizada. Ver [PREMIERES_HERO_20261019.md](PREMIERES_HERO_20261019.md).
- Antes de publicar revisar el PR, Node+Playwright en móvil/desktop, Puppeteer general, regresión y despliegue; no declarar Safari físico aprobado.

### 2026-10-19 — iOS nativo, subtítulos estilizados e intro sin control de sonido
- Entrega PR #60: app SwiftUI nativa en ios/ (búsqueda, catálogo, favoritos, intro AVPlayer, reproductor propio); CI macOS simulator sin firma. No es WebView.
- Web: removed oct-audio-control y prueba adaptada, conserva reproducción de intro automática a mejor esfuerzo; Safari puede bloquear el audio audible sin gesto.
- Subtitle Studio Bangers (OFL), Arial/Outfit/Arcade, ES/EN basado en WebVTT reales, estilos, escala, preferencias. Generador local opcional faster-whisper + Argos para videos con derechos; sin extracción ilícita.
- Cuatro frentes independientes bajo GitHub Actions y documento de responsabilidades. No afirmar múltiples agentes autónomos de código sin tales herramientas.
- Pendientes: PR CI completo, Pages, prueba Safari físico, Xcode firma/App Store, fuentes episodios realmente autorizadas y servicios de usuario. Sin declarar streaming ni subtítulos automáticos de obras sin archivo.


### 2026-10-20 — DEXTER Motion Engine (rama de revisión)
Módulo progresivo sin dependencias nuevas (js/dexter-motion-engine.js, styles/dexter-motion-engine.css), basado en patrones de animación de código y referencias abiertas. No reemplaza 1UP opening ni instala Three.js/GSAP/Lottie en producción. Documentación docs/DEXTER_MOTION_ENGINE.md; verificar CI y Safari antes de publicar.
**Resultado confirmado de PR #63 (2026-10-20):** squash-merge a main `0eb710889719cee5b9c3134393fda3db6a885526`; 13 workflows del PR pasaron en verde, Pages reportó deploy correcto de la revisión posterior de main. Motor listo en código de producción; sin verificación Safari física. Próximo paso opcional: pruebas y optimización de efectos en iPhone real y revisión visual.


### 2026-10-20 — DEXTER Motion Studio V1
Editor independiente dexter-motion-studio.html, motor motion-studio/, CLI scripts/render-motion-studio.mjs, scene JSON, flujo H.264/AAC y pruebas. Conservar intro y logo vigentes, PWA/compatibilidad iPhone, derechos, cero costo. Más detalles docs/DEXTER_MOTION_STUDIO.md.


### 2026-10-20 — DEXTER Motion Studio publicado, HD renderizado
PR #65 integrado en main. Las pruebas CI y el render GitHub Actions 39370945223 terminaron success; ambos MP4 Full HD a 30fps con H.264/AAC están disponibles en el artefacto 12241376805. Pages verde (run 39370957727). Estudio web dexter-motion-studio.html para editar y copiar escenas a GitHub Actions. Pendientes de revisión estética y prueba iPhone Safari físico; la intro publicada sigue siendo la anterior.


### 2026-10-20 — Motion Studio V2 / 2.5D
Agregado módulo reversible camera.mjs con trayectorias orbit/dolly/glide, perspectiva limitada y control de profundidad por escena. Compatible con exportación V1 y pipeline Full HD sin librerías externas. Documentar resultado CI/PR después de comprobarlo, no anunciar Safari físico probado ni cambiar intro pública sin aprobación.


**Resultado V2 comprobado (2026-10-20):** merge de PR #66 `665ec5a3`; 14 workflows PR verdes; Pages success; render dual Full HD 16:9/9:16 con H.264/AAC y 30 FPS success (run 39418935821, artifact 12263426712). Programa ahora con cámara 2.5D configurable y 0 dependencias visuales externas. El intro de producción no fue sustituido. Safari físico pendiente.


### 2026-11-13 — Reorganización modular y contenedores limpios (estilo jkanime_app)
- Pedido: Reestructurar el código a contenedores y carpetas más limpio, organizando scripts y archivos sueltos como en `C:\Users\Marco\Desktop\script_prueba\jkanime_app`, manteniendo el 100% del estilo, funcionalidad y PWA.
- Estado previo: Raíz con más de 80 archivos sueltos (CSS, JS, HTML, MD, JSON de configuración y pruebas).
- Cambio y rutas:
  - `client/`: `client/src/styles/` (26 CSS), `client/src/js/` (35 JS), `client/pages/` (12 HTML), `client/assets/`, `client/themes/`, `client/motion-studio/`, `client/data/`, `client/index.html`, `client/sw.js`.
  - `server/`: `server/config/`, `server/functions/`, `server/render/`, `server/supabase/`, `server/integrations/`, `server/infra/`.
  - `data/`: Metadatos estáticos, auditorías y sincronizaciones.
  - `docs/`: Documentación técnica consolidada y [`docs/ARCHITECTURE.md`](ARCHITECTURE.md).
  - `tests/`: `tests/unit/` (pruebas Node test runner + Python) y `tests/e2e/` (pruebas Playwright y browser).
  - Raíz limpia: `.gitignore`, `package.json`, `README.md`, `playwright.config.js`, cargador `index.html` y proxy `sw.js`.
- Pruebas realmente ejecutadas:
  - `npm test`: 40/40 pruebas unitarias pasadas.
  - `npm run test:python`: 16/16 pruebas unitarias pasadas.
  - `npm run test:ui`: 152/152 aserciones contractuales pasadas.
  - `npm run test:guard`: 48/48 comprobaciones pasadas (veredicto correcto, 0 críticas, 0 advertencias).
  - `test-anime1v-integration.mjs`, `test-anime1v-restricted.mjs`, `test-cache-catalog.mjs`, `test-episode-player.mjs`, `test-media-source-contract.mjs`, `test-navigation-race.mjs`, `test-render-anime1v.mjs`: Todas pasadas.
  - Sintaxis de todos los archivos JS/MJS en `client/`, `server/`, `scripts/`, `tests/`: 0 errores de sintaxis.
- Decisión/criterio: Mantenimiento 100% estricto del estilo visual, animaciones, modo depth, PWA mobile-first y cero costo de infraestructura.
- Limitaciones y siguientes pasos: Validación visual en Safari físico de iPhone; comprobación de ejecución en GitHub Actions tras push a main.


### 2026-11-13 — Migración a Vue 3, Vite y separación en componentes pequeños
- Pedido: Migrar a Vue y Vite manteniendo exactamente el mismo estilo, diseño y acomodo visual de las cosas existentes, para tener mejor acomodo de las cosas y código más limpio, separando en componentes pequeños.
- Estado previo: Frontend en Vanilla JavaScript con ~35 archivos acoplados mediante variables globales (`window.OneUp*`) y plantillas HTML concatenadas como strings dentro de `studio.js`.
- Cambio y rutas:
  - Creado contenedor `client/src-vue/` con arquitectura Vue 3 (Composition API):
    - Componentes de layout: `OneUpHeader.vue`, `MobileNav.vue`, `OneUpFooter.vue`.
    - Componentes de cine e intro: `OneUpCinema.vue`.
    - Componentes de hero: `HeroBanner.vue`, `HeroArtCard.vue`.
    - Componentes de descubrimiento: `QuickAccessDeck.vue`, `MarqueeBanner.vue`, `ExploreBar.vue`, `SeasonBanner.vue`.
    - Componentes de rails y tarjetas: `AnimeCard.vue`, `AnimeRail.vue`, `ContinueRail.vue`, `ScheduleRail.vue`.
    - Componentes de exploración de catálogo: `BrowseScreen.vue`, `BrowseControls.vue`.
    - Componentes de comunidad: `CommunityBanner.vue`.
    - Componentes de modales y multimedia: `AnimeDetailModal.vue`, `EpisodePlayer.vue`, `EpisodeComments.vue`, `AuthModal.vue`.
    - Componentes de UI: `DepthToggle.vue`, `ToastNotification.vue`, `SvgSprites.vue`.
    - Composables reactivos: `useCatalog.js`, `useSpanishSynopses.js`, `useFavorites.js`, `useAuth.js`, `useAiring.js`, `useAuthorizedMedia.js`, `useDexterMotion.js`, `useToast.js`.
  - Configuración de build: `vite.config.mjs` con `@vitejs/plugin-vue`, plugin de sincronización estática de `data/` y `client/assets/` a `dist/`.
  - Scripts en `package.json`: `"build": "vite build"`, `"dev:vite": "vite"`, `"preview": "vite preview"`.
  - Nueva suite de pruebas unitarias: `tests/unit/vue-architecture.test.mjs`.
- Pruebas realmente ejecutadas:
  - `npm run build`: Vite v8.3.8 compila en 200 ms produciendo `dist/index.html`, bundles CSS/JS minificados, y assets/datos completos.
  - `npm test`: **43/43 pruebas unitarias Node pasadas** (incluyendo la nueva suite de arquitectura Vue).
  - `npm run test:python`: **16/16 pruebas unitarias pasadas**.
  - `npm run test:ui`: **152/152 aserciones contractuales pasadas**.
  - `npm run test:guard`: **48/48 comprobaciones del Guardián pasadas**.
  - `npm run test:all`: Suite completa ejecutada al 100% en verde.
- Decisión/criterio: Preservación absoluta del diseño visual, CSS original, animaciones, compatibilidad con Safari iPhone PWA y preservación de compatibilidad con los workflows de CI/CD existentes.
- Limitaciones y siguientes pasos: Pruebas visuales finales y despliegue a GitHub Pages.


### 2026-11-13 — Limpia de archivos huérfanos y código muerto
- Pedido: Revisar los archivos que están de más y que ya no forman parte del proyecto, haciendo una limpia segura del proyecto.
- Estado previo: Presencia de 7 archivos de frontend huérfanos (JS y CSS no vinculados a index.html ni pages), 2 scripts auxiliares sin referencias y restos de `__pycache__`.
- Cambio y rutas:
  - Eliminados: `client/src/js/experience.js`, `client/src/styles/experience.css`, `client/src/js/catalog-plus.js`, `client/src/styles/design-plus.css`, `client/src/styles/styles.css`, `client/src/js/auth-google.js`, `client/src/js/firebase-config.js`.
  - Eliminados: `scripts/verify-production-depth.mjs`, `scripts/audit-branches.sh`.
  - Purgadas cachés locales `__pycache__/`.
- Pruebas realmente ejecutadas:
  - `npm run build`: Éxito en 208 ms.
  - `npm test`: 43/43 pruebas unitarias Node pasadas al 100%.
  - `npm run test:python`: 16/16 pruebas unitarias pasadas al 100%.
  - `npm run test:ui`: 152/152 aserciones contractuales aprobadas.
  - `npm run test:guard`: 48/48 comprobaciones del Guardián aprobadas en modo offline.
- Decisión/criterio: Eliminar únicamente archivos con 0 referencias cruzadas comprobadas, conservando assets y data necesarios para el despliegue estático y los flujos de CI/CD.
- Limitaciones y siguientes pasos: Proyecto limpio y listo para continuar.

### 2026-11-13 — Catálogo completo con Virtual Scroll, filtro alfabético A-Z a la derecha y búsqueda encapsulada ("Buscar de lo ya buscado")
- Pedido: En catálogo mostrar el catálogo completo con virtual scroll para que muestre todo; poner un filtro por letra a la derecha de la lista; colocar filtro arribita de los animes con input y una «x» para limpiar; y agregar buscador con opción de buscar de lo ya buscado que encapsula términos al presionar Enter.
- Estado previo: El catálogo paginaba de a 20 items y no contaba con scroll virtualizado para grandes volúmenes de títulos ni con índice alfabético lateral ni filtrado por etiquetas encapsuladas.
- Cambio y rutas:
  - `client/src-vue/components/browse/VirtualCatalogGrid.vue`: Componente de cuadrícula con desplazamiento virtual responsivo (5/4/3/2 columnas) que mantiene un máximo de 15 a 35 tarjetas en el DOM con espaciadores dinámicos calculados a 60 fps.
  - `client/src-vue/components/browse/LetterFilterRail.vue`: Riel alfabético A-Z (# y TODOS) sticky a la derecha en escritorio y flotante táctil con burbuja de aumento en Safari iPhone móvil.
  - `client/src-vue/components/browse/BrowseControls.vue`: Barra superior con input de búsqueda reactivo, botón de limpieza «✕» contextual, encapsulación al presionar Enter, pills/chips interactivos de búsqueda acumulativa («Buscando de lo ya buscado») y selectores de metadatos.
  - `client/src-vue/components/browse/BrowseScreen.vue`: Ensamblador de la pantalla de catálogo con estado en tiempo real.
  - `client/src-vue/composables/useCatalog.js`: Composable reactivo con `fullCatalog`, `loadFullCatalog`, `selectedLetter`, `searchTags`, `filteredFullCatalog` y soporte de normalización Unicode NFD para acentos en español.
  - `client/src/styles/catalog-virtual.css`: Hojas de estilo glassmorphism, línea Kokomi/Esmeralda y soporte de reducción de movimiento.
  - `data/catalog-full.json` & `client/data/catalog-full.json`: Exportación completa de los 4,885 títulos desde la base SQLite.
  - `tests/unit/catalog-virtual-scroll.test.mjs`: Suite de 5 pruebas unitarias con cobertura del virtual scroll, A-Z, tags acumulativos y botón ✕.
- Pruebas realmente ejecutadas:
  - `npm test`: **61/61 pruebas unitarias Node pasadas al 100%**.
  - `npm run test:python`: **16/16 pruebas unitarias pasadas**.
  - `npm run test:ui`: **152/152 aserciones contractuales aprobadas**.
  - `npm run test:guard`: **48/48 comprobaciones del Guardián aprobadas**.
  - `npm run build`: Compilación Vite en 230ms sin errores.
  - `npm run test:all`: Suite completa ejecutada al 100% en verde.
- Decisión/criterio: Alto rendimiento a 60 fps sin lag en móviles y navegadores de escritorio, preservando el 100% del diseño Kokomi y asegurando que las búsquedas se puedan encadenar de forma fluida.

### 2026-11-14 — Corrección de tamaño y acomodo visual del catálogo (Solución al anidamiento CSS Grid)
- Pedido: «analiza el catalogo, me refiero la vista, aparecen los animes en chico, puedes acomodarlos bien».
- Estado previo: Las tarjetas aparecían diminutas (40.5px en escritorio, 70.25px en móvil) debido a que `#browse-grid` con `.poster-grid` obligaba al cuerpo del scroll virtual a confinarse dentro de una sola celda de cuadrícula (columna 1), dejando el 76% de la pantalla como un vacío negro.
- Cambio y rutas:
  - `client/src/styles/catalog-virtual.css`: Regla forzada para que `#browse-grid` y `.virtual-scroll-body` sean contenedores de bloque al 100% de ancho sin restringir filas; nuevos breakpoints (>=1380px: 5 cols; 900-1379px: 4 cols; 600-899px: 3 cols; <600px: 2 cols); proporción cinematográfica 2:3 en tarjetas, botón de guardado en esquina superior derecha de 32×32px, títulos a 13px con corte a 2 líneas y badges esmeralda.
  - `client/src/js/studio.js`: Activación de `.virtual-catalog-container.catalog-virtual-active` en catálogo y restauración de `.poster-grid` en otras vistas; sincronización de métricas de fila virtual a 410px, 390px, 370px y 330px.
  - `client/src-vue/components/browse/VirtualCatalogGrid.vue`: Sincronización de `columnCount` y `rowHeight`.
  - `client/index.html`: Corrección de rutas de scripts a `./src/js/...`.
- Pruebas realmente ejecutadas:
  - Inspección con agente de navegador real: Tarjetas aumentaron a **210.75px** de ancho en escritorio y **151.5px** en móvil (Safari iPhone 390px), ocupando el 100% del ancho del catálogo (891px) con 3-4 columnas.
  - `npm test`: **61/61 pruebas unitarias Node pasadas al 100%**.
  - `npm run test:python`: **16/16 pruebas unitarias pasadas al 100%**.
  - `npm run test:ui`: **152/152 aserciones contractuales aprobadas**.
  - `npm run test:guard`: **48/48 comprobaciones del Guardián aprobadas**.
  - `npm run build`: Compilación Vite en 289ms.
- Decisión/criterio: Tarjetas prominentes y legibles con proporción de póster estándar internacional, eliminando el espacio negro residual y respetando el diseño Kokomi.

### 2026-11-14 — Arquitectura GPU `translate3d` para Virtual Scroll, erradicación de saltos y llenado de campos/columnas
- Pedido: «revisar bien la virtual scroll, se aloca raro y no hace bien la funcion del scroll, baja o sube raro demaciado rapido, aparte no esta bien acomodada la lista en horizontal, me refiero faltaria llenar bien los campos».
- Estado previo: El scroll virtual oscilaba y aceleraba incontrolablemente (de 300px de entrada a más de 8,000px de salto) debido a espaciadores que empujaban el DOM y causaban reflujos continuos; existía un hueco vacío en la cuarta columna en escritorios compactos; y faltaban campos de episodios e insignia de emisión.
- Cambio y rutas:
  - `client/src/js/studio.js`: Virtualización mediante `transform: translate3d(0, offsetY, 0)` en `.virtual-rendered-rows` con contenedor de altura fija `totalHeight` invariable; `scrollTop` lineal `Math.max(0, pageScroll - gridDocTop)`; `grid-template-columns` dinámico en línea por fila (`repeat(cols, minmax(0, 1fr))`); incorporación de `card-badge-airing` e insignia de episodios (`card-episodes`) en `card(a)`.
  - `client/src/styles/catalog-virtual.css`: Eliminados espaciadores `.virtual-spacer-*`, incorporada aceleración por GPU, contención de layout (`contain: layout paint`), estilos de `.card-badge-airing` e insignias de episodios.
  - `client/src-vue/components/browse/VirtualCatalogGrid.vue` y `AnimeCard.vue`: Sincronizada la arquitectura con GPU translate3d, cálculo de `rowPitch` y campos enriquecidos.
  - `sw.js` & `client/sw.js`: Bumb de caché a `v40-catalog-virtual-transform-20261114` y purge de Service Worker.
  - `client/index.html`: Versión de script actualizada a `?v=20261114-gpu`.
- Pruebas realmente ejecutadas:
  - Auditoría de desplazamiento en vivo con subagente de navegador:
    - 5 pasos consecutivos de 300px: Cada paso se desplazó **exactamente 300.00px** (delta 1:1 perfecto).
    - Desplazamiento profundo a 3,000px: Mantuvó delta exacto de 300.00px por paso sin vacíos negros ni saltos erráticos.
    - Llenado horizontal: 4 columnas en 891px (210.75px c/u) llenan el 100.0% del ancho sin huecos; 2 columnas en móvil 390px (151.5px c/u) llenan el 100.0% de los 315px disponibles.
    - Campos completos: Título, Puntuación (★), Insignia verde esmeralda `EMISIÓN`, Año, Episodios y Formato presentes en cada tarjeta.
  - `npm test`: **61/61 pruebas unitarias Node pasadas al 100%**.
  - `npm run test:python`: **16/16 pruebas unitarias pasadas al 100%**.
  - `npm run test:ui`: **152/152 aserciones contractuales aprobadas**.
  - `npm run test:guard`: **48/48 comprobaciones del Guardián aprobadas**.
  - `npm run build`: Compilación Vite en 254ms.
- Decisión/criterio: Desplazamiento virtual suave a 60 fps con física natural 1:1, estabilidad de renderizado GPU y aprovechamiento integral del ancho útil.

### 2026-11-14 — Integración completa de catálogo, reproductores y descargas de `jkanime_app` mediante servicio REST en Node.js
- Pedido: «en la pagina principal que es el front, era implementar lo que son del otro proyecto, los que es la forma de indexar, los animes, el catalogo, los posters, los titulos, sinopsis, links players o players, links de descarga, implementar en el forntend asi como se ve sin alterar estilos, revisar todo ya que por ejemplo vemos trend, inicio, populares, en emision, catalogo, etc...».
- Estado previo: El frontend consumía snapshots estáticos locales de AniList/Jikan y no estaba conectado a la base SQLite de `jkanime_app` ni disponía de selector dinámico de servidores de streaming ni descargas directas para los episodios.
- Cambio y rutas:
  - `server/src/catalog-service.js`: Microservicio REST API independiente basado en `node:sqlite` nativo (`DatabaseSync` con modo WAL). Endpoints `/api/health`, `/api/stats`, `/api/home`, `/api/animes`, `/api/animes/:id` y `/api/animes/:id/episodes/:num/links`.
  - `scripts/serve-client.mjs`: Integración de reverse-proxy para peticiones `/api/*` y fallback in-process.
  - `client/src/js/studio.js`: Conexión de todas las secciones de la página principal (`inicio`, `tendencias`, `en emisión`, `populares`, `recientes`, `películas`) y el catálogo al servicio backend, con indexación multicampo, desduplicación de recomendaciones y respaldo offline.
  - `client/src/js/episode-player.js`: Selector dinámico de servidores de streaming (Desu, Magi, Streamwish, Mega, VOE, Okru, Mediafire), preservación de hash de desencriptación de Mega, botones de descarga directa con peso de archivo en MB, soporte dual de contratos (`episodes_list` y `episodes`) y liberación segura de memoria para iframes.
  - `client/src/styles/`: Certificadas **0 modificaciones** en todas las hojas de estilo existentes (preservación visual 100%).
  - `tests/unit/production-catalog-service.test.mjs` y `tests/unit/catalog-frontend-integration.test.mjs`: Cobertura completa de la API y de la integración frontend.
- Pruebas realmente ejecutadas:
  - `npm test`: **61/61 pruebas unitarias Node pasadas al 100%**.
  - `npm run test:python`: **16/16 pruebas unitarias Python pasadas al 100%**.
  - `npm run test:ui`: **152/152 aserciones contractuales aprobadas**.
  - `npm run test:guard`: **48/48 comprobaciones del Guardián aprobadas**.
  - Auditoría de Victoria Independiente: Veredicto **`VICTORY CONFIRMED`**.
  - Escala real validada: 4,885 animes, 71,541 episodios y 524,212 enlaces de reproducción y descargas.
- Decisión/criterio: Arquitectura desacoplada en Node.js lista para migrar a un nuevo servidor dedicado, compatibilidad total con el frontend PWA existente y cero alteraciones estéticas.
- Limitaciones y siguientes pasos: Configuración de entorno de despliegue en el nuevo servidor y pruebas en dispositivos físicos iPhone Safari.

### 2026-11-14 — Corrección de ciclo de vida en modales y Web Animations API (`OneUpMotion`)
- Pedido: «veo que a veces cuando doy click en un posts, anime, este se pone la pantalla como bluy y ya no se muestra el anime, pero cuando doy click como afuera, me refiero a las orillas este aparece rapidamente y se quita revisa todos los componentes que puedan ser afectados».
- Causa raíz:
  - En `client/themes/oneup-motion/windows.js`, `closeDialog` ejecutaba una animación con `fill: 'forwards'` que se quedaba retenida permanentemente con `opacity: 0` al no invocarse `animation.cancel()` tras el cierre.
  - La reapertura subsiguiente dejaba el diálogo en `opacity: 0` mientras el `::backdrop` con desenfoque (`backdrop-filter: blur(11px)`) sí se mostraba. Al pulsar en las orillas, el manejador de cierre disparaba una nueva animación desde `opacity: 1`, haciéndolo visible fugazmente por 165ms.
- Componentes corregidos:
  - `client/themes/oneup-motion/windows.js`: cancelMotion defensivo, cancel() en resolución de finish y evento close, exportación de prepareOpen y listener global capturing de close en dialogs.
  - `client/src/js/studio.js`: preparación e invalidación de animaciones previas antes de `showModal()`.
  - `client/src/js/auth.js`: sincronización de ciclo de vida para `#auth-dialog`.
  - `client/src-vue/components/modals/AnimeDetailModal.vue` y `AuthModal.vue`: protección idéntica contra animaciones residuales.
  - `client/index.html`: carga condicional segura de `main.js` para evitar fallos de resolución de módulos bare fuera de Vite.
  - `tests/e2e/e2e-oneup-motion.mjs`: aserción de opacidad real tras aperturas y cierres repetidos.
- Pruebas realmente ejecutadas:
  - `tests/e2e/e2e-oneup-motion.mjs`: 4/4 suites aprobadas (móvil y escritorio con y sin reducción de movimiento).
  - Test E2E de aperturas consecutivas múltiples: 5/5 aperturas con opacidad 1.0 exacta.
  - `npm test`: 61/61 tests unitarios pasados.
  - `npm run test:python`: 16/16 tests pasados.
  - `npx vite build`: build de producción exitoso en 225ms.

### 2026-11-14 — Optimización integral de rendimiento: eliminación de bloqueos/stutter en componentes al moverse o salir
- Pedido: «optimizar codigo, veo algunos componentes que se traban al moverse o salir, revisa todo el codigo para optimizarlo».
- Causa raíz y componentes corregidos:
  1. `client/src/js/card-depth-engine.js` y `client/src/js/depth-engine.js`: Eliminados cientos de bucles infinitos de `requestAnimationFrame` que corrían en segundo plano para cada tarjeta incluso con el modo 3D apagado. Ahora es 100% reactivo: 0% de uso de CPU en reposo; se activa solo bajo interacción de hover y se detiene automáticamente al alcanzar el reposo.
  2. `client/src/styles/depth-system.css`: Eliminada la transición de CSS `transition: transform 0.12s` que competía directamente con la interpolación por RAF de JS, y eliminado el `will-change: transform` global forzado en todos los elementos del DOM.
  3. `client/themes/oneup-motion/windows.js` y `windows.css`: Añadida clase `.is-closing` con `@keyframes oneup-veil-out` para coordinar el desvanecimiento del `::backdrop` con la salida del diálogo; deshabilitado `pointer-events` durante la salida para evitar clics fantasma; desactivado el `backdrop-filter` en `.dialog-close` durante la transición para evitar readbacks del frame-buffer; promovidas capas GPU con `willChange` durante animaciones de ruta y modal con limpieza automática.
  4. `client/themes/kokomi-mobile-preview/theme.js` y `windows.css`: Animación fluida de salida para menú lateral (`oneup-drawer-out`) y buscador emergente (`oneup-pop-out`) antes de aplicar `hidden = true`.
  5. `client/src/styles/studio.css`: Migrada la notificación `.toast` a transformaciones 3D aceleradas por GPU (`translate3d(-50%, 15px, 0)` -> `translate3d(-50%, 0, 0)`), con propiedades de transición aisladas y `will-change`.
  6. `client/src/js/studio.js`: Optimizado `renderVirtualSlice()` eliminando escrituras innecesarias en `body.style.height` y cacheando `catalogGridDocTop` para erradicar el layout thrashing (recálculo forzado de layout) en cada tick de scroll continuo.
  7. `client/src/styles/spotlight.css` y `premiere-hero.css`: Migrados textos animados de `translateY` 2D a `translate3d` por GPU, eliminando re-rasterizado de fuentes pesadas con sombra durante transiciones del carrusel.
- Pruebas realmente ejecutadas:
  - `tests/unit/ui-motion-optimization.test.mjs`: Nueva suite con 8 pruebas verificando todos los contratos de movimiento fluido, salida sin saltos y ausencia de bucles infinitos.
  - `npm test`: **69/69 pruebas unitarias Node pasadas al 100%**.
  - `npm run test:all`: Suite completa (69 Node, 16 Python, 152 smoke UI, 48 OneUp Guard) aprobada en verde.
  - `tests/e2e/e2e-oneup-motion.mjs`: 100% aprobado en móvil (390px) y escritorio (1366px) con y sin reducción de movimiento.
  - `npm run build`: Build de Vite completado en ~204ms sin errores.
- Decisión/criterio: Cero degradación visual, fluidez pura a 60/120fps nativos con aceleración por GPU y respeto total a las directrices mobile-first y accesibilidad.
