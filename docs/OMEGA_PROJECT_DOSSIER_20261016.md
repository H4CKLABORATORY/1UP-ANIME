# EXPEDIENTE MAESTRO 1UP Anime — base técnica y visual verificada 2026-10-16

> Este documento anticipa información para Codex sin obligarlo a descubrir todo desde cero. Para modificaciones exactas y cambios posteriores, el **código en Git** prevalece sobre cualquier resumen. Fuente: repositorio y API GitHub inspeccionados en esta conversación, `main` observado a commit `0f5df57560a3a7f5391b47ef4dca643889364a9e`. No transcribir secretos.

## 1. Identidad
- Nombre y lema: **1UP Anime — Tu siguiente vida es anime**.
- Repositorio https://github.com/H4CKLABORATORY/1UP-ANIME
- Despliegue https://h4cklaboratory.github.io/1UP-ANIME/
- Hosting actual: **GitHub Pages** / sitio estático HTML-CSS-JS, soporte PWA. No hay motor Node persistente en GitHub Pages.
- Presupuesto **cero dólares** para creación/comunidad; visitante gratuito, sin publicidad propia y sin necesidad de registro para explorar.
- Originalidad del producto: no copiar exactamente Crunchyroll, JKAnime, Kokomi comercial ni series/animes; conservar la identidad existente.

## 2. Estado de producción actualizado
- `main` observado a `0f5df575` 2026-10-16 (antes `c7517070`; actualizar antes de trabajar).
- GitHub Pages workflow del anterior `c7517070`: `success` (run `38908714690`). Para commits posteriores verificar despliegue nuevo, no asumir.
- PR #23 fusionado: reproductor con 7 posiciones y fallback manual al fallar, MP4/WebM/HLS, WebVTT, validación de URLs públicas/HTTPS; workflows HLS, UI, browser, contrato y Kokomi pasaron en pruebas documentadas.
- Logo animado publicado mediante merge `e4a8ef9d`, recursos originales `assets/1up-anime-intro-firma-3seg.mp4`, `assets/1up-anime-logo-poster.jpg`, `assets/1up-anime-app-icon-512.png`, `themes/kokomi-mobile-preview/brand-signature.css/.js` y test `scripts/verify-video-logo.mjs`. **Confirmado en árbol Git, no test físico de audio Safari**.
- Árbol actualizado: **194 entradas** (directorios incluidos), registrar ruta/SHA individual en `docs/OMEGA_REPO_INVENTORY_20261016.md`.
- PRs de línea Kokomi #14 #18 #19 #20 figuran abiertos/draft en consulta previa; no fusionar sin comparación con `main`.
- Único inventario real de media editorial `data/licensed-media.json`: `{"version":1,"entries":{}}`. NO hay episodios configurados. Selector de fuentes no equivale a siete servidores reales.
- Configuración backend remota: `firebase-config.js`, `auth-config.js`, `social-config.js` y `supabase-config.js` contienen valores `null`. No afirmar que Google login / comentarios / moderación remotos estén conectados.
- Archivo `data/guild-license.json` tiene universo **ficticio Nébula** (`fictional_alternate_reality`), no concede licencia de difusión para animes reales.

## 3. Arquitectura de dependencias
```text
GitHub Pages / Safari iOS / Android / Desktop
 ├─ index.html  →  studio.js, studio.css, spotlight.css, brand-v2.css
 │   ├─ Catálogo remoto AniList/Jikan → data/catalog.json → data/translations-es.json
 │   ├─ Programación ← data/airing.json / airing-ui.js
 │   ├─ Temas Kokomi + preview móvil + October 2026
 │   ├─ Reproductor episode-player.js ← data/licensed-media.json
 │   │     └─ hls-adapter.js [HLS nativo Safari, adaptador para otros]
 │   ├─ Comentarios episodio episode-comments.js
 │   │     └─ social-backend.js / Firebase opcional / Supabase opcional
 │   ├─ Autenticación auth.js / auth-google.js / auth-config.js
 │   ├─ Proveedores externos external-providers.js → data/external-providers.json
 │   └─ PWA manifest.webmanifest + sw.js
 ├─ comunidad.html + community.js
 ├─ moderacion.html + moderacion.js
 ├─ gremio.html / studio.html
 └─ motor.html + motor.js → data/dexter/status.json, data/guard/status.json
GitHub Actions → catálogo / emisión / DexterAnimeSync / Guard / pruebas / Pages
Firebase Functions / firestore.rules → backend PREPARADO, no desplegado/verificado
Supabase SQL / RLS / supabase-episode-backend.js → alternativa OPT-IN desactivada
```

## 4. Diseño minucioso y visual
**Preferencia del propietario:** mantener el diseño de Codex + Kokomi como línea visual, no reimplementar Nebula UI 0.2 como nuevo sitio. El video móvil de Kokomi sirve de referencia; no usar archivos comerciales sin licencia.

- **Identidad permanente** documentada: negro obsidiana `#090C13`, grafito `#151A25`, texto claro `#F2F5F9`.
- **Tema Kokomi móvil** CSS observado: `--km-bg:#111116`, `--km-panel:#1c1d24`, `--km-ink:#f6f6f8`, `--km-muted:#9fabb7`, `--km-turquoise:#40d6c4`, `--km-red:#fd3158`, `--km-blue:#507dff`.
- **Octubre** CSS observado: `--oct-ink:#f6f4ee`, `--oct-muted:#aab6bc`, `--oct-main:#90e1c6`, `--oct-main-deep:#245b58`, `--oct-spark:#e5a866`, `--oct-red:#b14246`.
- Magia/Halloween elegante y discreta, temporal, apagable; no convertir cada pantalla en Halloween; no copiar simbología de Black Clover. Halloween: sello original `themes/october-2026/arcane-seal.svg`.
- Referencia de movimiento After Effects: 2.5D hero 700–1100ms; texto por máscara 400–650ms; botones 120–180ms; posters 300–450ms. CSS/WAAPI, no renderizar proyectos AE en navegador; reduced motion.
- Audio solo tras toque y preferencia activada; intro MP4 3.2s con H.264/AAC añadida a main; observar política Safari de reproducción silenciosa primero.
- Emblema SVG `assets/oneup-crest.svg`: viewBox 512×512, runa uno y portal en U, gradientes plata/azul/violeta, IDs `name`, `desc`, `silver`, `blade`, `black`, `light`, `glow`, `shadow`. Mantener vector, no convertir a raster sin necesidad. Su estatus frente al logotipo de video recién integrado se debe decidir por procedencia comprobada.
- PWA manifest `id:'./'`, `start_url:'./'`, `scope:'./'`, `display:'standalone'`, idioma `es`, `orientation:'any'`, theme `#080b19`; icono PNG/crest SVG.
- Para precisión de **cada punto, borde, margen, icono y pixel**: abrir el CSS/SVG real y comparar capturas en anchos 320, 375, 390, 768, 1366/1440; documento de textuales no sustituye renderizado real. Conservar estructura y pruebas de regresión visual.

### Variables CSS observadas
### themes/kokomi-mobile-preview/theme.css
```css
--km-bg: #111116;
--km-panel: #1c1d24;
--km-ink: #f6f6f8;
--km-muted: #9fabb7;
--km-turquoise: #40d6c4;
--km-red: #fd3158;
--km-blue: #507dff;
```

### themes/october-2026/theme.css
```css
--oct-ink: #f6f4ee;
--oct-muted: #aab6bc;
--oct-main: #90e1c6;
--oct-main-deep: #245b58;
--oct-spark: #e5a866;
--oct-red: #b14246;
--oct-ease: cubic-bezier(.16,1,.3,1);
--bg: #080c11;
--surf: #101820;
--panel: #151b22;
--orange: #90e1c6;
--orange2: #57b69d;
--cream: #f6f1e7;
```


## 5. Estructura de páginas: ID, scripts y estilos observables en archivos
### `index.html`
- ID de elementos observados (52): `ico-search`, `ico-menu`, `ico-play`, `ico-arrow`, `ico-plus`, `ico-check`, `ico-star`, `ico-clock`, `ico-heart`, `header-search`, `auth-open`, `auth-label`, `home-screen`, `hero-poster`, `hero-title`, `hero-description`, `hero-badges`, `hero-detail`, `hero-save`, `hero-picks`, `hero-feature-cover`, `hero-feature-title`, `hero-feature-caption`, `search-form`, `search-input`, `genre-pills`, `continue-section`, `continue-rail`, `trending-rail`, `season-rail`, `schedule-preview-list`, `recent-rail`, `movies-rail`, `browse-screen`, `browse-eyebrow`, `browse-title`, `browse-summary`, `browse-controls`, `browse-status`, `browse-grid`, `browse-next`, `anime-dialog`, `anime-dialog-body`, `anime-close`, `auth-dialog`, `auth-close`, `google-login`, `guest-login`, `auth-signout`, `auth-message`, `toast`, `startup`.
- Scripts explícitos (19): `./auth-config.js`, `./social-config.js`, `./social-backend.js`, `./supabase-config.js`, `./supabase-episode-backend.js`, `./episode-comments.js`, `./auth.js`, `./studio.js`, `./hls-adapter.js`, `./episode-player.js`, `./motion.js`, `./airing-ui.js`, `./external-providers.js`, `./themes/kokomi-studio/theme.js`, `./themes/october-2026/theme.js`, `./themes/kokomi-mobile-preview/theme.js`, `./themes/kokomi-mobile-preview/pages.js`, `./themes/kokomi-mobile-preview/watch-comments.js`, `./themes/kokomi-mobile-preview/brand-signature.js`.
- Hojas CSS explícitas (14): `./studio.css`, `./motion.css`, `./spotlight.css`, `./player.css`, `./brand-v2.css`, `./episode-comments.css`, `./airing-ui.css`, `./external-providers.css`, `./themes/kokomi-studio/theme.css`, `./themes/october-2026/theme.css`, `./themes/kokomi-mobile-preview/theme.css`, `./themes/kokomi-mobile-preview/pages.css`, `./themes/kokomi-mobile-preview/watch-comments.css`, `./themes/kokomi-mobile-preview/brand-signature.css`.

### `preview-kokomi-mobile.html`
- ID de elementos observados (52): `ico-search`, `ico-menu`, `ico-play`, `ico-arrow`, `ico-plus`, `ico-check`, `ico-star`, `ico-clock`, `ico-heart`, `header-search`, `auth-open`, `auth-label`, `home-screen`, `hero-poster`, `hero-title`, `hero-description`, `hero-badges`, `hero-detail`, `hero-save`, `hero-picks`, `hero-feature-cover`, `hero-feature-title`, `hero-feature-caption`, `search-form`, `search-input`, `genre-pills`, `continue-section`, `continue-rail`, `trending-rail`, `season-rail`, `schedule-preview-list`, `recent-rail`, `movies-rail`, `browse-screen`, `browse-eyebrow`, `browse-title`, `browse-summary`, `browse-controls`, `browse-status`, `browse-grid`, `browse-next`, `anime-dialog`, `anime-dialog-body`, `anime-close`, `auth-dialog`, `auth-close`, `google-login`, `guest-login`, `auth-signout`, `auth-message`, `toast`, `startup`.
- Scripts explícitos (19): `./auth-config.js`, `./social-config.js`, `./social-backend.js`, `./supabase-config.js`, `./supabase-episode-backend.js`, `./episode-comments.js`, `./auth.js`, `./studio.js`, `./hls-adapter.js`, `./episode-player.js`, `./motion.js`, `./airing-ui.js`, `./external-providers.js`, `./themes/kokomi-studio/theme.js`, `./themes/october-2026/theme.js`, `./themes/kokomi-mobile-preview/theme.js`, `./themes/kokomi-mobile-preview/pages.js`, `./themes/kokomi-mobile-preview/watch-comments.js`, `./themes/kokomi-mobile-preview/brand-signature.js`.
- Hojas CSS explícitas (14): `./studio.css`, `./motion.css`, `./spotlight.css`, `./player.css`, `./brand-v2.css`, `./episode-comments.css`, `./airing-ui.css`, `./external-providers.css`, `./themes/kokomi-studio/theme.css`, `./themes/october-2026/theme.css`, `./themes/kokomi-mobile-preview/theme.css`, `./themes/kokomi-mobile-preview/pages.css`, `./themes/kokomi-mobile-preview/watch-comments.css`, `./themes/kokomi-mobile-preview/brand-signature.css`.

### `comunidad.html`
- ID de elementos observados (45): `open-chat`, `c-login`, `c-compose-hero`, `c-info`, `feed-view`, `feed-title`, `feed-desc`, `c-compose`, `composer`, `post-form`, `post-kind`, `post-text`, `post-media`, `cancel-compose`, `post-result`, `feed-list`, `chat-view`, `global-messages`, `global-form`, `global-text`, `chat-state`, `profile-view`, `profile-form`, `profile-alias`, `profile-icons`, `profile-photo`, `profile-state`, `verification-form`, `verification-reason`, `verification-state`, `c-friend-requests`, `c-friend-list`, `c-friend-state`, `c-auth-dialog`, `c-auth-close`, `c-google`, `c-signout`, `c-auth-state`, `c-reply-dialog`, `c-reply-close`, `c-reply-context`, `reply-list`, `reply-form`, `reply-text`, `reply-state`.
- Scripts explícitos (4): `./auth-config.js`, `./social-config.js`, `./social-backend.js`, `./community.js`.
- Hojas CSS explícitas (1): `./community.css`.

### `studio.html`
- ID de elementos observados (50): `ico-search`, `ico-menu`, `ico-play`, `ico-arrow`, `ico-plus`, `ico-check`, `ico-star`, `ico-clock`, `ico-heart`, `header-search`, `auth-open`, `auth-label`, `home-screen`, `hero-poster`, `hero-title`, `hero-description`, `hero-badges`, `hero-detail`, `hero-save`, `search-form`, `search-input`, `genre-pills`, `continue-section`, `continue-rail`, `trending-rail`, `season-rail`, `schedule-preview-list`, `recent-rail`, `movies-rail`, `browse-screen`, `browse-eyebrow`, `browse-title`, `browse-summary`, `browse-controls`, `browse-status`, `browse-grid`, `browse-next`, `anime-dialog`, `anime-close`, `anime-dialog-body`, `auth-dialog`, `auth-close`, `google-login`, `guest-login`, `auth-signout`, `auth-message`, `toast`, `startup`, `startup-sound`, `startup-skip`.
- Scripts explícitos (4): `./sonic.js`, `./auth-config.js`, `./auth.js`, `./studio.js`.
- Hojas CSS explícitas (1): `./studio.css`.

### `gremio.html`
- ID de elementos observados (11): `status`, `license-id`, `license-holder`, `license-issuer`, `license-territory`, `license-date`, `recheck`, `print`, `verification-note`, `rights-count`, `rights`.
- Scripts explícitos (0): .
- Hojas CSS explícitas (0): .

### `motor.html`
- ID de elementos observados (10): `motor-refresh`, `motor-health`, `motor-last-guard`, `motor-anime`, `motor-episodes`, `motor-playback`, `motor-providers`, `motor-checks`, `motor-history`, `motor-status`.
- Scripts explícitos (1): `./motor.js`.
- Hojas CSS explícitas (2): `./community.css`, `./motor.css`.

### `moderacion.html`
- ID de elementos observados (8): `admin-login`, `admin-status`, `admin-dashboard`, `mod-posts`, `mod-reports`, `mod-verification-section`, `mod-verifications`, `admin-refresh`.
- Scripts explícitos (4): `./auth-config.js`, `./social-config.js`, `./social-backend.js`, `./moderacion.js`.
- Hojas CSS explícitas (2): `./community.css`, `./moderacion.css`.


## 6. Kokomi — mapa de 22 páginas/rutas y madurez
Registro original en `docs/KOKOMI_FIDELITY_MATRIX.md`.
1. Inicio `#inicio`; 2. Top `#populares`; 3. Actualizados `#recientes`; 4. Temporada `#temporada`; 5. Próximos `#km/upcoming`; 6. Películas `#peliculas`; 7. Géneros `#catalogo`; 8. Serie `#km/series/ID`; 9. Video episodio `#km/series-play/ID`; 10. Detalle película `#km/movie-single/ID`; 11. Video película `#km/movie-play/ID`; 12. Tráilers `#km/trailers`; 13. Calendario `#programacion`; 14. Blog `#km/blog`; 15. Artículo `#km/blog-single/bienvenida`; 16. Contacto `#km/contact`; 17. Próximamente `#km/coming-soon`; 18. 404 `#km/404`; 19. Perfil `#km/profile`; 20. Notificaciones `#km/notifications`; 21. Mi lista `#milista`; 22. Preferencias `#km/settings`.

22 rutas mapeadas **no equivalen** a 22 funciones completas. Algunas tienen estados vacíos reales (sin notificaciones push, sin medios). Evitar inventar resultados. Preview `preview-kokomi-mobile.html`, `pages.css/js`, `theme.css/js`, `watch-comments.css/js`; original PR #14 draft y posteriores PRs apilados.

## 7. Medios y proveedores
- `episode-player.js`, `hls-adapter.js`: selección por temporada/episodio/idioma/fuente; limpiar video al cambiar; cambio opcional manual tras fallo.
- Contrato `scripts/media-source-contract.mjs`: validación de hasta siete fuentes declaradas.
- `data/licensed-media.json` vacío. No rellenar con ficción para marcar «listo».
- `data/external-providers.json`: páginas externas de referencia, no streams. Identificados One Piece (mal-21), Naruto (mal-20), Black Clover (mal-34572), Hunter x Hunter 2011 (mal-11061), otro título mal-59741, además de links a catálogos iQIYI y AnimeOnline. `kind:external_only` no autoriza iframe de episodios.
- `integrations/jkanime-v2/*`: scripts de información pública; no scrapeo evasivo ni prueba de autorización.
- Formatos directos autorizados: MP4, WebM, HLS, subtítulos WebVTT; embeds oficiales solo cuando están permitidos; no evadir DRM.

## 8. Comunidad y cuentas
- `comunidad.html` y `community.js`: UI social existente, verificar estado local/backend.
- `episode-comments.js`: comentarios enlazados al episodio; respaldo opcional.
- `auth.js` / `auth-google.js`: invitado, perfiles locales, Google preparado; el login no está activo hasta configurar Firebase.
- `firebase.json`, `firestore.rules`, `storage.rules`, `firestore.indexes.json`, `functions/index.js`: código backend que requiere despliegue/credenciales y revisar si Cloud Functions obliga plan con facturación.
- `supabase/sql/oneup_community_optional.sql`: esquema Postgres/RLS opt-in, `supabase-episode-backend.js` y `supabase-config.js` null. No duplicar base.
- `moderacion.html/js`: UI para roles reportes; verificación de administración real depende del servidor. Usuarios visitantes no deben ganar permisos por editar JS del navegador.

## 9. Automatización, salud y flujos
- Workflows en `.github/workflows/` para tests UI, aceptación navegador, HLS, contrato, caché, Kokomi, iconos, firma logo, actualizaciones de catálogo/programación, Firebase, Supabase, DexterAnimeSync, ONEUP Guard y propuesta de reversión.
- `scripts/oneup-guard.mjs` ejecuta diagnósticos programados aproximados cada 4h; no es monitoreo continuo. Estados `data/guard/status.json`, historial `data/guard/history.json`; no aplica rollback automático.
- `scripts/dexter-anime-sync.mjs`: sincronizador de **metadatos y fuentes declaradas**. Snapshot `data/dexter/status.json` reportó 200 episodios detectados y 6 nuevos en el ciclo 2026-10-16T11:57Z, `playbackSources:0`: detección ≠ videos.
- Pruebas `scripts/check-ui.mjs`, `scripts/e2e-browser.mjs`, `scripts/e2e-kokomi-preview.mjs`, `scripts/test-episode-player.mjs`, `scripts/test-media-source-contract.mjs`, `scripts/test-episode-comments.mjs`, `scripts/check-resilience.mjs`, y demás según inventario.
- CLI local y GitHub Actions pueden ejecutar pruebas con dependencias de CI; iPhone físico no probado. No inventar E2E móvil real.

## 10. Estado y prioridades de revisión
- Confirmar último SHA main y PRs al iniciar, porque se detectaron merges durante esta auditoría.
- Verificar logo MP4/poster/icono presentes y red funcionando, PWA no bloquea updates.
- Reconciliar PRs Kokomi #14/18/19/20; no merge ciego ni reversión a estilos antiguos.
- Integrar solo cambios ausentes y deseados preservando backend y motor ya fusionados.
- Terminar comunidad online (requiere creación/configuración legítima de backend), pruebas móviles reales y medios autorizados.
- Manejar el presupuesto de $0 con honestidad: web con metadatos y comunidad puede ser gratis bajo cuotas, alojamiento ilimitado de anime comercial no.

## 11. Protocolo de memoria para Codex
Usar `.agents/skills/omega-ingenio-memoria/SKILL.md` y `docs/OMEGA_MEMORY.md`. Registrar cambios significativos al concluir cada tarea. No afirmar «memoria actualizada» si solo se redactó un prompt. Incluye preferencia por método OMEGA SWARM: especialización, tareas paralelas reales cuando se permite, revisión cruzada, versiones y optimización continua sin agentes inventados.

## 12. Lista de documentos complementarios existentes
- `AGENTS.md`, `README.md`, `docs/PROJECT_CONTINUITY.md`, `docs/PROJECT_DECISIONS.md`.
- `docs/ART_DIRECTION_CINEMATIC_2026.md`, `docs/KOKOMI_FIDELITY_MATRIX.md`.
- `docs/FREE_STREAMING_ARCHITECTURE.md`, `docs/STREAMING_IMPLEMENTATION.md`, `MEDIOS_AUTORIZADOS.md`.
- `docs/SUPABASE_COMUNIDAD.md`, `FIREBASE_COMUNIDAD_SETUP.md`, `GOOGLE_LOGIN_SETUP.md`.
- `docs/ONEUP_SELF_HEALING.md`, `docs/OMEGA_AUDIT_20261016.md`, `docs/OMEGA_SWARM_BOARD.md`.
- `docs/OMEGA_SKILLS_CATALOGO_201.md` inventario de 201 skills observadas, NO instalación automática en Codex.
- `docs/OMEGA_REPO_INVENTORY_20261016.md` todas las rutas + tamaños + sha observados.
