# 1UP ANIME — Inventario de ramas remotas (documento de decisión)

**Fecha:** 2026-11-07 · **Fase:** 7 (infraestructura) · **Rama del inventario:** `feature/phase7-infra`
**Alcance:** SOLO inventario y recomendaciones. En esta fase **no se borró ni se renombró ninguna rama**; cada borrado es una decisión de Douglas.

## Resumen (verificado con `git branch -r`, `git branch -r --merged origin/main` y `gh pr list`)

| Categoría | Cantidad |
|---|---|
| Ramas remotas en total (sin el puntero `origin/HEAD`) | 98 (97 de trabajo + `main`) |
| Con PR abierto asociado | 40 |
| Ya fusionadas en `origin/main` | 30 |
| Ni fusionadas en `main` ni con PR abierto | 30 |
| Cadena activa de fases (nov 2026, NO tocar) | 9 (incluye esta, `feature/phase7-infra`) |

El grueso son ramas de trabajo de octubre de 2026: salvo la cadena de fases, **ninguna rama remota tiene commits posteriores al 2026-10-21**. Ese es el riesgo de higiene señalado en la auditoría: con ~90 ramas es fácil pushear, abrir un PR o desplegar desde la rama equivocada.

## 1. Cadena activa de fases — NO BORRAR

La pila de PRs #71–#78 (y esta fase) vive en estas ramas; borrar cualquiera rompe la cadena de PRs apilados:

| Rama | Último commit |
|---|---|
| `feature/native-auth` | 2026-11-07 |
| `feature/phase1-stability` | 2026-11-07 |
| `feature/phase1-rates` | 2026-11-07 |
| `feature/phase2-detail-pages` | 2026-11-07 |
| `feature/phase3-catalog` | 2026-11-07 |
| `feature/phase4-player` | 2026-11-07 |
| `feature/phase5-community` | 2026-11-07 |
| `feature/phase6-episode-admin` | 2026-11-07 |
| `feature/phase7-infra` | ? |

Detalle: `feature/native-auth` y las sub-ramas de la Fase 1 (`phase1-rates`, `phase1-repro`, `phase1-licensed-media`, `phase1-cleanup`) ya están fusionadas en `feature/phase1-stability` (verificado con `git branch -r --merged origin/feature/phase1-stability`), pero `phase1-rates` sostiene el PR #72 y `native-auth` el PR #71: se conservan mientras esos PRs estén abiertos.

## 2. Ya fusionadas en `main` — candidatas seguras a borrar (decisión de Douglas)

Su contenido ya está en `main`; borrar la rama no pierde código. Tres de ellas (`fix/codex-pwa-popularity-20261016` PR #20, `design/brand-continuity-20261016` PR #19, `feature/free-streaming-foundation-20261016` PR #18) mantienen un PR abierto **cuya base no es `main`**, así que antes de borrarlas hay que cerrar o re-apuntar esos PRs.

| Rama | Último commit |
|---|---|
| `design/brand-continuity-20261016` | 2026-10-16 |
| `feature/anime1v-safe-integration-20261016` | 2026-10-16 |
| `feature/automatic-new-chat-handoff-20261017` | 2026-10-17 |
| `feature/cinematic-motion-layers-v3-20261017` | 2026-10-17 |
| `feature/cinematic-v3-production-opening-20261017` | 2026-10-17 |
| `feature/depth-mode-ui` | 2026-10-17 |
| `feature/free-streaming-foundation-20261016` | 2026-10-16 |
| `feature/futuristic-depth-preview-20261018` | 2026-10-18 |
| `feature/netflix-style-opening-20261016` | 2026-10-16 |
| `feature/official-anime-streaming-20261017` | 2026-10-17 |
| `feature/player-failover-security-20261016` | 2026-10-16 |
| `fix/anime1v-search-abort-race-20261021` | 2026-10-21 |
| `fix/catalog-transient-5xx-retry-20261021` | 2026-10-21 |
| `fix/codex-pwa-popularity-20261016` | 2026-10-16 |
| `fix/handoff-accurate-app-state-20261017` | 2026-10-17 |
| `fix/handoff-accurate-code-status-20261017` | 2026-10-17 |
| `fix/handoff-public-v3-reality-20261017` | 2026-10-17 |
| `fix/iphone-detail-close-20261017` | 2026-10-17 |
| `fix/keyboard-skip-main-20261018` | 2026-10-18 |
| `fix/keyboard-skip-to-content-20261017` | 2026-10-18 |
| `fix/mission-control-opening-inert-20261017` | 2026-10-17 |
| `fix/omega-episode-lifecycle-20261016` | 2026-10-16 |
| `fix/oneup-playback-readiness-audit-20261021` | 2026-10-21 |
| `fix/oneup-public-https-trailing-dot-20261021` | 2026-10-21 |
| `fix/prepaint-palette-hydration-20261017` | 2026-10-18 |
| `fix/preserve-spanish-catalog-refresh-20261021` | 2026-10-21 |
| `release/anime1v-real-discovery-20261017` | 2026-10-17 |
| `release/codex-kokomi-live-20261016` | 2026-10-16 |
| `release/oneup-original-video-brand-20261016` | 2026-10-16 |
| `release/vertical-intro-render-catalog-20261017` | 2026-10-17 |

## 3. Con PR abierto (no fusionadas en `main`) — decidir el PR primero

Mientras el PR esté abierto la rama debe existir. La decisión es sobre el PR (fusionar / cerrar), no sobre la rama.

### 3a. Dependabot (6)

| PR | Rama | Último commit |
|---|---|---|
| #6 | `dependabot/github_actions/google-github-actions/auth-3` | 2026-10-15 |
| #5 | `dependabot/npm_and_yarn/functions/firebase-admin-14.5.0` | 2026-10-15 |
| #4 | `dependabot/npm_and_yarn/functions/firebase-functions-7.4.0` | 2026-10-15 |
| #3 | `dependabot/github_actions/actions/setup-python-7` | 2026-10-19 |
| #2 | `dependabot/github_actions/actions/setup-node-7` | 2026-10-15 |
| #1 | `dependabot/github_actions/actions/upload-artifact-7` | 2026-10-19 |

Ojo: dos son de paquetes de Firebase dentro de `functions/` (`firebase-admin`, `firebase-functions`) — ese directorio fue eliminado en el rework a Supabase, así que los PRs #4 y #5 parecen **obsoletos**: recomendación, cerrarlos y borrar sus ramas. Los de GitHub Actions (#1, #2, #3, #6) actualizan acciones que los workflows ya usan fijadas por versión mayor.

### 3b. PRs abiertos anteriores a la cadena de fases (26)

| PR | Rama | Último commit |
|---|---|---|
| #70 | `feature/lu-memory-continuity-20261021` | 2026-10-21 |
| #69 | `fix/catalog-corrupt-cache-20261020` | 2026-10-20 |
| #68 | `feature/1up-auth` | 2026-10-20 |
| #67 | `feature/firebase-google-login-20261020` | 2026-10-20 |
| #61 | `feature/release-official-episode-qa-20261019` | 2026-10-19 |
| #54 | `feature/official-tms-episode-scraping-notes-20261019` | 2026-10-19 |
| #51 | `feature/oneup-manga-licensed-ingest-20261019` | 2026-10-19 |
| #50 | `docs/mal-updater-research-20261019` | 2026-10-19 |
| #46 | `feature/oneup-live-presence-counter-20261018` | 2026-10-18 |
| #45 | `feature/full-anime-detail-media-comments-20261018` | 2026-10-18 |
| #44 | `audit/release-readiness-20261018` | 2026-10-18 |
| #40 | `design/oneup-editorial-pro-preview-20261017` | 2026-10-17 |
| #39 | `feature/parallel-crunchyroll-metadata-20261017` | 2026-10-17 |
| #38 | `feature/scrapling-private-metadata-20261017` | 2026-10-17 |
| #33 | `feature/cinematic-v2-editorial-20261017` | 2026-10-17 |
| #20 | `fix/codex-pwa-popularity-20261016` | 2026-10-16 |
| #19 | `design/brand-continuity-20261016` | 2026-10-16 |
| #18 | `feature/free-streaming-foundation-20261016` | 2026-10-16 |
| #15 | `coordination/omega-swarm-codex-20261016` | 2026-10-16 |
| #14 | `design/kokomi-mobile-reference-2026-10-15` | 2026-10-16 |
| #13 | `design/kokomi-mobile-reference` | 2026-10-15 |
| #11 | `feature/supabase-community-adapter-20261015` | 2026-10-15 |
| #10 | `feature/oneup-hls-crossbrowser-20261015` | 2026-10-15 |
| #9 | `feature/webflow-mcp-1up-readiness-20261015` | 2026-10-15 |
| #8 | `feature/dexter-media-source-contract-20261015` | 2026-10-15 |
| #7 | `feature/episode-players-comments-20261015` | 2026-10-15 |

## 4. Ni fusionadas ni con PR — candidatas a revisión de obsolescencia

Sin PR que las reclame y sin estar en `main`. Varias fueron trabajo de octubre ya superado por la cadena de fases (p. ej. las de DEXTER Motion, cuyo cierre verificado quedó registrado en `docs/PROJECT_CONTINUITY.md`, y las sub-ramas de la Fase 1 ya integradas en `phase1-stability`). Recomendación: revisar una a una contra `PROJECT_CONTINUITY.md`; si su trabajo ya vive en otra rama, borrar; si contiene algo único, abrir PR o archivarla como etiqueta antes de borrar.

| Rama | Último commit |
|---|---|
| `feature/anime-api-franchise-discovery-20261019` | 2026-10-19 |
| `feature/anime-scraper-metadata-search-20261019` | 2026-10-19 |
| `feature/anime1v-metadata-runtime-20261017` | 2026-10-17 |
| `feature/brand-signature-video-20261016` | 2026-10-16 |
| `feature/dexter-cinematic-studio-and-mp4-20261020` | 2026-10-20 |
| `feature/dexter-motion-engine-20261020` | 2026-10-20 |
| `feature/dexter-motion-studio-v2-camera-depth-20261020` | 2026-10-20 |
| `feature/educational-anime-scraper-20261019` | 2026-10-19 |
| `feature/educational-metadata-scraper-20261019` | 2026-10-19 |
| `feature/hermes-portable-checkpoints-20261020` | 2026-10-20 |
| `feature/ios-native-subtitle-intro-20261019` | 2026-10-19 |
| `feature/official-crunchyroll-episode-links-20261019` | 2026-10-19 |
| `feature/official-crunchyroll-links-20261018` | 2026-10-18 |
| `feature/omega-continuidad-memoria-handoff-20261016` | 2026-10-16 |
| `feature/omega-ingenio-memoria-20261016` | 2026-10-16 |
| `feature/oneup-editorial-finale-20261019` | 2026-10-19 |
| `feature/oneup-green-theme-picker-20261017` | 2026-10-17 |
| `feature/oneup-premiere-cinematic-hero-20261019` | 2026-10-19 |
| `feature/oneup-premium-window-motion-20261017` | 2026-10-17 |
| `feature/oneup-stream-platform-integration-20261015` | 2026-10-15 |
| `feature/phase1-cleanup` | 2026-11-07 |
| `feature/phase1-licensed-media` | 2026-11-07 |
| `feature/phase1-repro` | 2026-11-07 |
| `feature/puppeteer-qa-integration-20261019` | 2026-10-19 |
| `feature/render-anime1v-discovery-20261016` | 2026-10-17 |
| `feature/sitewide-mobile-ux-quality-20261018` | 2026-10-18 |
| `fix/handoff-app-commit-selection-20261017` | 2026-10-17 |
| `fix/handoff-preserve-pr-evidence-20261021` | 2026-10-21 |
| `fix/oneup-theme-focus-return-20261020` | 2026-10-20 |
| `test/franchise-browser-verification-20261019` | 2026-10-19 |

## 5. Recomendación ordenada (solo para cuando Douglas decida)

1. Cerrar los PRs obsoletos de Dependabot/Firebase (#4, #5) y borrar sus ramas.
2. Borrar las 30 ramas ya fusionadas en `main` (tras resolver los PRs #18–#20 de la sección 2).
3. Revisar la sección 4 contra la bitácora y borrar lo superado; el objetivo razonable es quedarse con `main` + la cadena de fases activa + los PRs que Douglas quiera mantener vivos.
4. A partir de la Fase 7, cada fase nueva usa UNA rama y se borra al fusionar su PR (GitHub puede hacerlo automáticamente: *Automatically delete head branches*).

**Estado: DOCUMENTO DE DECISIÓN — ninguna rama fue borrada ni renombrada en la Fase 7.**
