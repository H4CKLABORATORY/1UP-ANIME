# PAUSA — Estado 1UP ANIME (7 nov 2026)

> **Nota (Fase 9, 7 nov 2026): pausa levantada el 7 nov 2026 por Douglas; el trabajo se reanudó y se completó — ver `docs/PROJECT_CONTINUITY.md`.** El cuerpo siguiente es el registro histórico de la pausa.

**Pausa:** 7 nov 2026, ~3:35 p.m. EST.
**Motivo:** Douglas está al 96% de su límite semanal gratuito de Muse. El límite se resetea el **11 nov 2026, 12:54 p.m. EST**. No se inicia nada nuevo hasta reanudar (o hasta que Douglas diga lo contrario).
**Repo:** H4CKLABORATORY/1UP-ANIME. Base de auditoría: `main` @ `cee1ed76`. Rama base de trabajo: `feature/native-auth` @ `8cb1626` (rework Supabase, PR #71).

## Fase en curso

**Fase 1 (estabilidad) — EN CURSO, no terminada.** Fase 2 (páginas de detalle `/anime/<id>`) — NO empezada. Fases 3-10 — no empezadas.

## DONE y verificado

### Rework Firebase → Supabase — TERMINADO Y VERIFICADO
- Rama `feature/native-auth`, commits `1163fa1` + `8cb1626`. PR #71 renombrado a «Cuentas nativas 1UP en Supabase (correo + contraseña), sin Google ni Firebase» — OPEN/DRAFT, sin fusionar ni cerrar.
- Auth Supabase solo correo + contraseña (sin Google, sin anónimo); usuario 3–20 caracteres único vía `profiles` + trigger; reset por correo; 4 migraciones SQL (15 tablas `oneup_*`, 28 políticas RLS, triggers de límites); 8 Edge Functions Deno; `docs/SUPABASE_SETUP.md`; `supabase-config.js` en `null`. Cero Firebase en el código.
- Tests en Supabase local (dexter): Node 62/62, Python 16/16, Playwright 13/13, Puppeteer 12/12, `check-ui` 152 aserciones, `npm ci` OK.
- Pendiente solo de Douglas: crear el proyecto Supabase real (pasos exactos en `docs/SUPABASE_SETUP.md`).

### Worker A — reproducibilidad / lint / gate — TERMINADO Y VERIFICADO
- Rama `feature/phase1-repro` @ `bfd774f` (pusheada).
- `npm ci` OK (31 paquetes, 0 vulnerabilidades); `npm test` 10/10 suites (Node 62: 55 pass + 7 skip sin stack local; Python 16/16; scripts 8/8); `npm run lint` OK (`node --check` 104/104, `py_compile` 10/10, JSON 22/22, guardia anti-Firebase OK); Playwright 13 passed; Puppeteer 12 passed.
- Arregló una rotura de la rama base: `functions/anime1v-adapter.js` (borrado con Firebase) seguía siendo requerido por `render/anime1v-gateway.js` — reubicado a `render/anime1v-adapter.js` (cliente de metadatos puro, cero Firebase). `functions/` sigue borrado.
- Gate en `.github/workflows/deploy-pages.yml`: job `test` (npm ci → lint → npm test → Playwright → Puppeteer); `deploy` con `needs: test`.
- No verificado: el gate en GitHub Actions real (solo se dispara con push a `main` o dispatch manual).

### Worker B — tasas AniList/Jikan + refresh robusto — TERMINADO Y VERIFICADO
- Rama `feature/phase1-rates` @ `0b0e982` (pusheada). Draft PR #72 (base `feature/native-auth`, OPEN/DRAFT).
- `studio.js`: AniList cola serializada ≥2.100 ms, 429 con `Retry-After` + backoff (máx. 3), lectura de `X-RateLimit-*`; Jikan 425 ms (patrón de `app.js`). `catalog-plus.js` `ask()`: misma seguridad + fallback a snapshot en caché. `refresh-catalog.mjs`: fallback por sección, nunca deja el catálogo vacío, escritura atómica tmp + rename.
- Tests: suite nueva `tests/phase1-rates.test.mjs` 13/13; Node existente 40/40; Python 16/16; scripts 6/8 (los 2 fallos eran la rotura anime1v preexistente, ya arreglada por A).
- Sin llamadas reales a AniList/Jikan en la verificación (stubs/servidores falsos).

### Worker D — primer medio con licencia + reglas — TERMINADO Y VERIFICADO
- Rama `feature/phase1-licensed-media` @ `1b80530` (pusheada).
- `data/licensed-media.json`: primera entrada TMS/Lupin Part 4 EP01, videoId `K8LrLO_omys`, `mode: official_embed`, `rights: authorized`, fuente `https://tmsanime.com/anime-on-tms-official-channel`. Test de contrato `tests/official-episode.test.mjs` 2/2 (solo manifiesto, sin UI de PR #61). Reglas 1 (primer clic) y 2 (todo automático) copiadas a `AGENTS.md`.
- Tests: Node 42/42, `test-media-source-contract.mjs` PASS (1 episodio con licencia), `check-ui` 152 aserciones, Playwright real PASS (iframe `https://www.youtube-nocookie.com/embed/K8LrLO_omys`, 0 errores de página). Nada descargado ni reproducido.
- Caveat: `mal-27947` no está en `data/catalog.json` — el episodio aparece al abrir el detalle del anime, no en los rieles del catálogo.

### Hallazgos registrados (documentos del coordinador, en `workspace/1up-anime/`)
- **Jikan MUERTO (7 nov 2026):** sonda desde dexter a `api.jikan.moe/v4` → connection timed out, HTTP 000. AniList GraphQL → HTTP 200 en 0,35 s. Regla: **AniList primero**; ninguna dependencia nueva de Jikan; si sigue muerto en la integración, eliminar la dependencia Jikan de `studio.js` / `catalog-plus.js`. Tenrai sin verificar; MAL API v2 con cuota por re-verificar. (Conflicto honesto: la auditoría Fase 0 reportó Jikan en vivo la mañana del 7 nov; la sonda de la tarde da timeout — se trata como muerto hasta ver un éxito en vivo.)
- **Regla 1 (primer clic)** y **Regla 2 (todo automático)** — permanentes, ya aplicadas en el rework y en `AGENTS.md`.

## EN CURSO (a medias)

### Worker C — limpieza / temas / intro video — A MEDIAS, SIN VERIFICAR
- Rama `feature/phase1-cleanup` @ `635cac9` (WIP, pusheado como checkpoint de pausa — **no fusionar**, no verificado).
- 39 archivos (+3.465/−3.702): 6 temas viejos eliminados (cinematic-v3, kokomi-mobile-preview, kokomi-studio, october-2026, oneup-motion, oneup-palette); nuevo tema unificado `themes/oneup/` + `themes/preview-only/`; **`app.js` y `styles.css` ELIMINADOS por completo**; `index.html` y 4 previews modificados; nuevo `tests/intro-video.spec.js` (sin ejecutar).
- **Falta:** correr los tests (incluido el nuevo spec), verificar que el sitio carga sin `app.js`/`styles.css`, actualizar `docs/PROJECT_CONTINUITY.md`, informe final de C (C llevaba ~2h39m sin actividad al pausar; se le envió orden de parada — su informe puede llegar después de esta pausa).
- Scratch sin commitear en el worktree `/data/home/1up-phase1-cleanup`: `probe-phase1.mjs` (no commitear) y `node_modules` (artefacto de instalación).

### Integración Fase 1 — NO EMPEZADA
- Fusionar A + B + C + D en `feature/phase1-stability` (esta rama — creada solo con este archivo), resolver conflictos, correr la suite completa, abrir el PR de Fase 1 (apilado sobre #71, contra `main`).

## NEXT al reanudar (en orden)

1. Confirmar el informe final de C; verificar su WIP con tests reales (si algo está roto, arreglarlo o revertir esa parte).
2. Fusionar A, B, C, D en `feature/phase1-stability`; correr la suite completa (idealmente con el stack Supabase local arriba para que los 7 tests de auth corran en vivo, no en skip).
3. Re-sondear Jikan en vivo desde dexter; si sigue muerto, eliminar la dependencia Jikan.
4. Abrir el PR de Fase 1 (draft) contra `main` para revisión de Douglas.
5. Fase 2: páginas de detalle `/anime/<id>` (History API, scroll restore exacto, sin modal), con la dirección de diseño medida (jkanime + Crunchyroll + identidad Black Clover/anti-magia propia).
6. Decisiones de Douglas pendientes: merge PR #71, #72, #44/#45 (recomendación: fusionar con arreglos), #61 (recomendación: fusionar); crear el proyecto Supabase real.

## EN ESPERA (bloqueos)

- Proyecto Supabase real — solo Douglas (pasos en `docs/SUPABASE_SETUP.md`).
- CSP de higgsfield.app — fuente no disponible en el repo ni en dexter.
- Gate de deploy en Actions real — hasta el primer push a `main` o dispatch.
- DooPlay ZIP — no encontrado en ningún lado (archivo no provisto).
- PR #44/#45 sin fusionar desde el 18 oct 2026 (decisión de Douglas).

## Ramas remotas (tips verificados 7 nov 2026)

| Rama | Commit | Estado |
|---|---|---|
| `feature/native-auth` | `8cb1626` | Base; PR #71 OPEN/DRAFT |
| `feature/phase1-repro` | `bfd774f` | Verificado |
| `feature/phase1-rates` | `0b0e982` | Verificado; PR #72 draft |
| `feature/phase1-licensed-media` | `1b80530` | Verificado |
| `feature/phase1-cleanup` | `635cac9` | WIP, SIN VERIFICAR |
| `feature/phase1-stability` | (esta rama) | Solo este archivo hasta la integración |

Worktrees en dexter: `/data/home/1up-anime` (compartido, en `feature/phase1-rates`, con archivos sucios de D ya commiteados en su rama — ignorar), `/data/home/1up-phase1-repro`, `/data/home/1up-phase1-cleanup`, `/data/home/1up-phase1-stability` (esta).

## Reglas vigentes

- Regla 12 (ABSOLUTA): nada de scraping/descarga/reproducción/redistribución de episodios, subtítulos o contenido protegido sin autorización; AniList/Jikan son solo metadatos.
- Cero Firebase / cero Google en 1UP. Backend: Supabase.
- Regla 1: funciona desde el primer clic, cero configuración para el visitante. Regla 2: todo automático, el usuario no debe elegir.
- AniList primero como fuente de metadatos.
- Ramas + PRs; nunca push a `main`; nunca fusionar sin Douglas.
