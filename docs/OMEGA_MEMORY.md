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


### 2026-10-20 — 1UP Auth (feature/1up-auth; PR #68 draft)
- Base observada main 18e56f0. Alta con usuario/contraseña, OTP nativo Supabase de seis dígitos, recuperación con bearer de alcance exclusivo y sesiones opacas de vida corta. Broker Edge Function, tablas cerradas/RLS, límites SQL atómicos, CAPTCHA nativo obligatorio al activar, Resend SMTP.
- Diálogo existente extendido con panel colapsado; conserva temas, intro, Google/Firebase, perfiles locales y claves de listas. No hay vinculación automática por correo, eliminación ni migración de datos. PR #67 de Firebase independiente, reconciliar auth-config.js al integrar.
- Verificado localmente: 12 pruebas broker simuladas, flujos UI simulados Edge headless 390/1366 px, 26 regresiones existentes y scripts/check-supabase-option.mjs; sintaxis JS y diff sin errores. No son pruebas de correo ni Safari físico. PostgreSQL real se comprobará en CI.
- Backend desactivado por defecto. La conexión Supabase devolvió cero proyectos; faltan proyecto Free, dominio con DNS verificado en Resend, SMTP, Turnstile, deploy de función, auditor de configuración y E2E real. No se creó infraestructura ni se fusionó/desplegó este cambio.
- Evidencia/activación/rollback/migración: docs/ONEUP_AUTH.md; checkpoint .hermes/checkpoints/1up-auth.json. Próximo paso: publicar PR y comprobar CI, después activación externa por titular con el ensayo de correo.

PR de esta entrega: https://github.com/H4CKLABORATORY/1UP-ANIME/pull/68 . Código publicado inicialmente 40d4bf64, normalización sin cambios semánticos 8ad0bf4f. CI inicial 1UP Auth security SUCCESS (PostgreSQL 17 + broker + Chromium 390/1366): https://github.com/H4CKLABORATORY/1UP-ANIME/actions/runs/39501966897 . Se amplían pruebas de sesión revocada con JWT aún válido, ownership/expiración SQL y recuperación del nombre de usuario tras demostrar correo; verificar CI del siguiente SHA. No hay entrega SMTP real ni despliegue.


### 2026-10-20 — Google retirado por instrucción expresa del propietario
- PR #68: retirados botones y rutas OAuth/restauración Google del acceso principal, antiguo y comunidad. 1UP Auth, invitado y perfiles locales se conservan; no se borraron cuentas, UID, Firebase ni favoritos.
- La publicación/chat de comunidad sigue pendiente de migración de backend y se informa en pantalla. No reintroducir Google desde PR #67. No se retiraron Google Fonts ni el almacenamiento Firebase histórico: no afirmar desvinculación total de Google.
- Pruebas: 12 broker tests y chequeo Supabase opcional pasaron; verificar UI móvil/escritorio y CI del nuevo commit. Backend 1UP/SMTP real sigue desactivado.
