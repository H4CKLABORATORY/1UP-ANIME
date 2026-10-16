# 1UP ANIME — EXPEDIENTE MAESTRO DE TRANSFERENCIA PARA CODEX
**Corte técnico:** 2026-10-16, con estado observado después del merge del logo audiovisual.
**Repositorio:** https://github.com/H4CKLABORATORY/1UP-ANIME
**Hosting actual:** https://h4cklaboratory.github.io/1UP-ANIME/
**Rama de producción:** main
**HEAD observado de main al cerrar el inventario:** `0f5df57560a3a7f5391b47ef4dca643889364a9e`
**Fuente primaria:** GitHub, archivos, commits, workfows y documentación. Esta información es un snapshot: verificar el HEAD y sus diffs al iniciar; si main avanza, el código vence a este expediente.

## 0. Lo que pide el propietario
1UP Anime será una **web y PWA gratuita para la comunidad**, con diseño de alto nivel, optimizada para iPhone y PC, sin anuncios propios, sin cobrar acceso, con catálogo de anime amplio, reproductor integrado cuando haya fuentes cuya inserción/distribución se permita y comunidad por episodio. Presupuesto obligatorio para la primera fase: **USD 0**. No contratar servidores, abrir facturación o activar gastos automáticamente. No rehacer desde cero.

Prefiere el diseño más reciente **Kokomi/Codex**, no volver al prototipo Nebula 0.2. Quiere identidad propia 1UP, microinteracciones tipo After Effects, magia/Halloween *discreta* y control de sonidos. El original **logo elegido** es el video `1UP_ANIME_INTRO_FIRMA_3SEG.mp4`, ya integrado en main según el historial de Git. Priorizar fidelidad a lo aprobado sin copiar diseños ni activos comerciales.

El usuario pide ejecución autónoma y sin preguntas innecesarias, coordinación modular de especialistas reales cuando se pueda, corrección continua y memoria durable. Interpretar sus frases informales por su intención. No fingir subagentes, background, superpoderes, memoria interna reprogramada, autorizaciones o funcionalidades no comprobadas.

## 1. Estado comprobado, no inferido
- Web publicada mediante GitHub Pages; despliegue exitoso reportado para commits recientes, sin equivaler a pruebas integrales de producción.
- SPA estática con HTML/CSS/JavaScript; sin servidor propio 24/7. PWA `manifest.webmanifest`, `sw.js`, iconos, instalación Safari mediante “Añadir a pantalla de inicio”.
- Catálogo editorial con AniList principal, Jikan fallback y JSON cacheados. Popularidad, temporadas, programación y sinopsis en español tienen código específico.
- `episode-player.js` + `hls-adapter.js`: hasta 7 posiciones por episodio, MP4/WebM/HLS, WebVTT multilingüe, consentimiento para iframe admitido, retiro de instancias previas al navegar y botón manual de servidor alternativo en fallos.
- `data/licensed-media.json` tiene `entries: {}`. **CERO episodios de anime reales reproducibles en el manifiesto público.** Que se detecten 200 episodios mediante catálogo NO significa fuentes de video.
- `firebase-config.js`, `auth-config.js`, `social-config.js`, `supabase-config.js` contienen `null`; la comunidad remota y Google login no se declaran activados en producción. Modo invitado y favoritos/perfiles locales sí están preparados.
- Logo audiovisual original H.264/AAC de 3.2 segundos en `assets/1up-anime-intro-firma-3seg.mp4`; `assets/1up-anime-logo-poster.jpg` y `assets/1up-anime-app-icon-512.png`. PR #24 merge `e4a8ef9d85a0bf762c88ff23502e062d6b2cbfd6`. El JS/CSS `themes/kokomi-mobile-preview/brand-signature.*` provee animación silenciosa por defecto y reproducción con sonido tras tocar el botón ♫. El Service Worker no debe guardar el MP4 pesado completo.
- `data/guild-license.json` contiene `universe_type: fictional_alternate_reality` y `real_world.grants_copyright_or_streaming_rights: false`: es **documentación narrativa**, NO licencia universal real.
- Solo usar medios propios o con derechos independientes y comprobables; no extraer contenidos protegidos ni crear ingeniería para eludir DRM o controles.

## 2. Arquitectura real y dependencias
```text
GitHub Pages https://h4cklaboratory.github.io/1UP-ANIME/
├─ index.html → studio.css + motion.css + spotlight.css + player.css + brand-v2.css
│  ├─ auth-config.js → auth.js (invitado/perfiles; Google pendiente Firebase)
│  ├─ social-config.js → social-backend.js (comunidad pendiente de despliegue)
│  ├─ supabase-config.js → supabase-episode-backend.js (opcional, desactivado)
│  ├─ studio.js → AniList/Jikan/snapshot, home, dialog, búsquedas
│  ├─ episode-comments.js → conversación episodio/temporada
│  ├─ hls-adapter.js → episode-player.js → data/licensed-media.json
│  ├─ airing-ui.js → data/airing.json
│  ├─ external-providers.js → data/external-providers.json
│  ├─ themes/kokomi-studio/theme.css + theme.js
│  ├─ themes/october-2026/theme.css + theme.js
│  └─ themes/kokomi-mobile-preview/{theme,pages,watch-comments,brand-signature}.{css,js}
├─ comunidad.html / community.js / community.css
├─ gremio.html (comunidad, NO derechos ficticios reales)
├─ moderacion.html / moderacion.js / moderacion.css
├─ motor.html / motor.js / motor.css (monitor y fuentes declaradas)
├─ studio.html / app.js / styles.css (herencia original)
├─ preview-kokomi.html / preview-kokomi-mobile.html / preview-october.html
├─ manifest.webmanifest + sw.js → PWA/offline
└─ .github/workflows/* + scripts/* → catálogo, pruebas, guardia y despliegues
```
Ver mapa de **todos** los archivos y SHAs en `docs/OMEGA_REPO_FILEMAP_20261016.md` y `docs/OMEGA_REPO_SNAPSHOT_20261016.json`, incluyendo assets SVG, PNG, JPG, MP4, rutas de código, pruebas, CSS y directorios. No reescribir archivos ajenos al frente de trabajo.

## 3. Marcado exacto de HTML verificado
`index.html` usa `html lang="es"`, viewport `width=device-width, initial-scale=1,viewport-fit=cover`, fuentes **Barlow Condensed** (500–900) y **Outfit** (400–800). Marca OG: “1UP Anime · Tu siguiente vida es anime”.

IDs actualmente identificados:
- Cabecera y auth: `header-search`, `auth-open`, `auth-label`, `auth-dialog`, `google-login`, `guest-login`, `auth-signout`, `auth-message`, `auth-close`.
- Portada: `home-screen`, `hero-poster`, `hero-title`, `hero-description`, `hero-badges`, `hero-detail`, `hero-save`, `hero-picks`, `hero-feature-cover`, `hero-feature-title`, `hero-feature-caption`.
- Búsqueda/navegación: `search-form`, `search-input`, `genre-pills`, `browse-screen`, `browse-eyebrow`, `browse-title`, `browse-summary`, `browse-controls`, `browse-status`, `browse-grid`, `browse-next`.
- Secciones: `continue-section`, `continue-rail`, `trending-rail`, `season-rail`, `schedule-preview-list`, `recent-rail`, `movies-rail`.
- Diálogos y feedback: `anime-dialog`, `anime-dialog-body`, `anime-close`, `toast`, `startup`.
- Reproductor: `oneup-embed-play`, `oneup-embed-frame`, `oneup-watch-episode`, `oneup-watch-episode-number`, `oneup-watch-language`, `oneup-now-watching`, `oneup-playback-display`, `oneup-player-message`.

Mantener relaciones entre selectores y scripts. Muchos controles se crean dinámicamente: un grep HTML no identifica cada nodo en tiempo de ejecución. El mapa de códigos original en Git es la descripción exhaustiva, no un screenshot inventado.

## 4. Estilo, colores, movimiento y logo: medidas verificadas
Identidad propuesta en `docs/ART_DIRECTION_CINEMATIC_2026.md`:
- Fondo permanente obsidiana `#090C13`; grafito `#151A25`; tinta clara `#F2F5F9`.
- Magia de octubre `#62D5AE`, oro `#EAC790`, diseño oscuro, neblina y destellos muy discretos.
- Variables tema Kokomi móvil: `--km-bg:#111116`, `--km-panel:#1c1d24`, `--km-ink:#f6f6f8`, `--km-muted:#9fabb7`, `--km-turquoise:#40d6c4`, `--km-red:#fd3158`, `--km-blue:#507dff`.
- Variables octubre actual: `--oct-ink:#f6f4ee`, `--oct-muted:#aab6bc`, `--oct-main:#90e1c6`, `--oct-main-deep:#245b58`, `--oct-spark:#e5a866`, `--oct-red:#b14246`.
- Nueva cabecera con logo animado: ancho limitado `max-width:min(43vw,165px)`, video `width:clamp(94px,12vw,160px);height:50px`; debajo de 780px video 112x43, cabecera max-width 125px. Botón audio 30x30px o 28x28px en móvil. Diálogo `width:min(95vw,850px)` y video `aspect-ratio:16/9`. Poster de menú `width:145px;height:70px`.
- Efectos estudiados: parallax 2.5D hero, revelados 400–650ms, carga inicial 700–1100ms, botones 120–180ms, posters 300–450ms; respetar `prefers-reduced-motion`; audio apagado por defecto y habilitado tras interacción táctil.
- No sustituir logo MP4 original por `assets/oneup-crest.svg` salvo como fallback. Preservar el `assets/oneup-mascot.svg` legado sin confundirlo con identidad aprobada.
- Inspiración en Kokomi (no clon): fondo grafito, hero comprimido, menú lateral, categorías, tarjetas de dos columnas móvil, ranking rojo, calendario, películas, secciones editoriales.
- No saturar con decoraciones Halloween; tema temporal y reversible, con gráficos originales.

## 5. Mapa de 22 rutas Kokomi existente
1 `#inicio`; 2 `#populares`; 3 `#recientes`; 4 `#temporada`; 5 `#km/upcoming`; 6 `#peliculas`; 7 `#catalogo`; 8 `#km/series/ID`; 9 `#km/series-play/ID`; 10 `#km/movie-single/ID`; 11 `#km/movie-play/ID`; 12 `#km/trailers`; 13 `#programacion`; 14 `#km/blog`; 15 `#km/blog-single/bienvenida`; 16 `#km/contact`; 17 `#km/coming-soon`; 18 `#km/404`; 19 `#km/profile`; 20 `#km/notifications`; 21 `#milista`; 22 `#km/settings`.

No confundir las 22 rutas con 22 servicios plenamente conectados: hay pantallas con estados vacíos reales. La matriz detallada está en `docs/KOKOMI_FIDELITY_MATRIX.md`.

## 6. Datos y formatos específicos
- `data/catalog.json`: snapshot de AniList/Jikan; el nombre de grupo popular debe reflejar popularidad verdadera y no `trending` etiquetado como top.
- `data/airing.json`: calendario y seguimiento editorial, no fuente de episodios reproducibles.
- `data/translations-es.json`: glosario/traducciones; `data/sinopsis-editoriales-es.json`: correcciones y sinopsis elaboradas. Evitar traducir títulos inventando.
- `data/dexter/status.json` registró sync 2026-10-16 11:57 UTC: 200 episodios detectados, 6 nuevos, **0 playbackSources**, 0 errores. Es dato de sincronización de metadatos.
- `data/external-providers.json`: páginas externas e iQIYI; `external_only` y `destination_unverified` no crean embeds.
- `data/licensed-media.json`: version 1, `entries: {}`, manifiesto editorial de videos legítimos. La política de fuentes valida HTTPS público, MIME, idiomas y subtítulos; placeholders en `examples/licensed-media.example.json`, NO copiar fixtures al catálogo público.
- `config/dexter-providers.json`: adaptadores y canales declarados.
- `data/guild-license.json`: universo ficticio (Nébula) cuya licencia NO tiene efectos jurídicos en el mundo real.

## 7. Cuenta y comunidad
Frontends: `auth.js`, `auth-google.js`, `community.js`, `episode-comments.js`, `social-backend.js`, `moderacion.js`.
Backend opcional Firebase: `firebase.json`, `firestore.rules`, `firestore.indexes.json`, `storage.rules`, `functions/index.js` y `functions/package.json` (Node 22, firebase-admin/functions).
Backend alternativo sin conexión: `supabase/sql/oneup_community_optional.sql`, `supabase-episode-backend.js` y `supabase-config.js`.
- Invitado y hasta seis perfiles locales con favoritos/historial por navegador; no cuenta en nube.
- Google, Firestore y App Check pendientes de credenciales y despliegue del titular. No activar Cloud Functions o Storage si exige factura.
- Supabase no está conectado; nunca suponer sincronización o tablas instaladas.
- Roles deben verificarse en servidor/RLS; reportes, reacciones y mensajes deben tener reglas y antispam.
- Moderación UI no garantiza permisos remotos sin backend activo.

## 8. Seguridad, privacidad, licencias y contenido
- URLs multimedia HTTPS públicas validadas: prohibición de hosts internos, credenciales, IP literales y puertos no 443 según contrato actual; validar CORS en navegador real.
- Imágenes originales, marcas y voces autorizadas. Para anime comercial se requiere titular y territorio, formato, fecha, subtítulos y permiso de inserción o distribución.
- No scraping de videos protegido, evasión DRM ni publicación desde torrents no autorizados; sí lectura permitida de metadatos públicos respetando ToS.
- Proxy/firewall/CDN para defender origen propio, no para ocultar responsabilidades legales.
- `data/guild-license.json` no sustituye contratos.
- Nunca publicar llaves privadas, service roles, OAuth secrets, tokens ni material personal en GitHub, artifacts ni archivos de memoria.

## 9. Automatización y 16 workflows documentados antes del último corte
`app-icons.yml`, `browser-acceptance.yml`, `codex-cache-catalog-check.yml`, `dexter-anime-sync.yml`, `firebase-deploy.yml`, `hls-compatibility.yml`, `jkanime-v2-adapter.yml`, `kokomi-preview-check.yml`, `media-source-contract.yml`, `oneup-guard.yml`, `oneup-revert-proposal.yml`, `refresh-airing.yml`, `refresh-catalog.yml`, `supabase-optional-check.yml`, `ui-quality.yml`, y workflows adicionales introducidos por la entrega de logo que aparezcan en el snapshot actualizado.

Guardia: `scripts/oneup-guard.mjs`, `scripts/check-guard.mjs`, `scripts/guard-alert.mjs`, `data/guard/status.json`, `data/guard/history.json`. Se ejecuta aproximadamente cada 4h según cron, no vigilancia en tiempo real. Las copias en artifacts duran según retención del repositorio; reversión mediante PR revisable, no auto-merge.

Pruebas: `scripts/check-ui.mjs`, `scripts/e2e-browser.mjs`, `scripts/e2e-kokomi-preview.mjs`, `scripts/e2e-player-languages.mjs`, `scripts/test-episode-player.mjs`, `scripts/test-media-source-contract.mjs`, `scripts/test-cache-catalog.mjs`, `scripts/test-episode-comments.mjs`, `scripts/test-navigation-race.mjs`, `scripts/check-resilience.mjs`, `scripts/check-supabase-option.mjs`, `scripts/check-hls-browser.mjs` y `scripts/verify-video-logo.mjs`.

CI registrada en el merge de streaming: suites de navegador, UI, Kokomi, HLS, contrato multimedia aprobadas, pero no implica Safari físico ni cuenta Firebase real. Logo original: seis suites se anotan en `docs/PROJECT_CONTINUITY.md`.

## 10. Ramas y pull requests: no revivir trabajo antiguo
Integrados: PR #12 (base reproductor), PR #23 (mejoras de seguridad/reintento/subtítulos), PR #24 (logo audiovisual aprobado). PR #22 reemplazado y cerrado sin merge.
Revisión histórica/abiertos al corte: PR #20 (PWA caché/ranking), #19 (marca móvil), #18 (Kokomi/reproductor), #15 (Omega Swarm), #14 (22 vistas Kokomi preview), #13 (diseño móvil anterior), #11 Supabase alternativo, #10 HLS, #9 Webflow readiness, #8 DexterAnimeSync, #7 fuentes/comentarios; Dependabot #1–#6.
**No mezclar todos.** Comprobar commits ya integrados y usar `git merge-base`, `git diff`, `git cherry` o `git log` antes de traer cualquier parte. Evitar duplicar sistemas.

## 11. Requisitos gratuitos y expectativas realistas
GitHub Pages distribuye estáticos; no es CDN económica ilimitada de videos. Firebase plan gratuito sujeto a cuotas y a disponibilidad de servicios; Cloudflare Pages o Supabase gratuitos pueden ayudar si se configuran, pero sin garantía de costes ilimitados. Tener 7 espacios de servidor no da derecho ni acceso a 7 orígenes de contenido.
Escala por etapas: landing/catálogo → reproductor de muestra propia/licenciada → comentarios remotos → moderación → medición y seguridad → crecimiento. No introducir compras ni infraestructura obligatoria.

## 12. Habilidades transferibles: 201 skills documentadas, 1 nueva instalada
`docs/OMEGA_ALL_201_SKILLS_CATALOG.md` y `docs/OMEGA_ALL_201_SKILLS_CATALOG.json` contienen nombre, URI y descripción de **todas las 201 skills visibles** en el origen ChatGPT al 16/10/2026. No asumir que Codex tiene esos plugins; una skill necesita herramientas autorizadas reales. Se crea la skill de continuidad en `.agents/skills/omega-continuidad-memoria/SKILL.md`.
Skills especialmente relevantes por función: `plugin-creator/create-plugin`; `plugin-manager-mobile/mobile-project-setup`; `plugin-manager-mobile/nexus-plugin-auto-router`; `aiimagegenerator/brand-visuals`; `animationmaker/web-animation-code`; `animationmaker/motion-graphics`; `figma/figma-design-to-code`; `figma/figma-generate-design`; `supabase/supabase`; `supabase/supabase-postgres-best-practices`; `app-6a624c56bfe081918f7544f7d58f6faf/render-static-sites`; `app-6a3293e129088191abf0875820e839da/website-builder`. Herramientas externamente instalables, no capacidades implícitas.

## 13. Primeras acciones exactas de Codex después de importar
1. Leer `AGENTS.md`, skill OMEGA, `docs/OMEGA_MEMORY_CURRENT.md`, este expediente y `docs/PROJECT_CONTINUITY.md`.
2. Obtener HEAD real de main. Solo explorar diff desde SHA de corte y ramas relevantes; NO inspeccionar de nuevo 194 archivos sin motivo.
3. Confirmar presencia del logo MP4/JPG/PNG, manifiesto PWA y brand-signature; preservar original.
4. Verificar rutas clave HTML, catálogo, reproductor, fuentes y comentarios con tests existentes.
5. Elegir siguiente tarea P0 que sea factible sin licencias o backend configurado: corregir UI/QA; mejorar estados vacíos/avisos; hacer pruebas; preparar activación gratuita.
6. Crear rama con archivos propios, realizar cambios y pruebas, documentar y generar PR. No alterar `main` sin flujo de revisión y aprobación aplicables.
7. Actualizar `docs/OMEGA_MEMORY_CURRENT.md` en el mismo commit, con lo hecho/pendiente/errores/evidencia.
8. Responder en español: qué funciona, pruebas, lo no verificado y enlace concreto.

## 14. Criterio de fidelidad visual al píxel
Para responder a «hasta si hay un punto dibujado»: los **originales** `index.html`, CSS, SVG, JPG, PNG y MP4 en GitHub son la única especificación exacta para cada borde, curva, gradiente, tipografía, icono y píxel. No convertir una descripción textual en geometría exacta sin observar código/render. Preservar hashes de originales, comparar diffs CSS y capturas a 320/375/390/768/1366/1440 px, respetar preferencias de movimiento y comprobar Safari físico cuando haya dispositivo. Nunca recrear un logo de memoria.

## 15. Resumen de riesgo/pendientes ordenados
P0: No hay episodios reales; autenticación remota/comunidad sin configurar; Safari físico no validado; costo de videos comerciales no es cero garantizado.
P1: Revisar rutas interiores Kokomi y decisiones visuales, progreso sincronizado, permisos Firestore/RLS, anti-spam, traducciones, populares reales y ramas apiladas.
P2: Pulir core web vitals, accesibilidad, sonido e intros, backups, pruebas de redes lentas, captura visual, SEO y mantenimiento.
En todo momento, proteger el logo audiovisual ya fusionado y el motor de fuentes del PR #23.

### Documento vivo
No sustituye a GitHub. Fecha de corte 2026-10-16. Si el repositorio avanza, se actualizan SHA, rama, pruebas y continuidad con evidencia. Nunca ocultar que una característica está pendiente.
