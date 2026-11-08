# 1UP ANIME — Lista de lanzamiento (Fase 9)

**Fecha:** 2026-11-07 · **Rama:** `feature/phase9-qa` · **Estado: LISTO PARA LANZAR — el lanzamiento es decisión de Douglas (fusionar).**
Esta fase entrega **preparación** (readiness), no el lanzamiento: nadie ha fusionado nada y `main` no se ha tocado.

## Estado de QA (Fase 9 — verificado en dexter, worktree `1up-phase9-qa`)

| Superficie | Resultado |
|---|---|
| Lint (`npm run lint`) | PASS — `node --check` 108/108, Python 10/10, JSON 22/22, guardias no-Firebase/no-Jikan OK |
| `npm test` (ahora incluye `scripts/check-ui.mjs`) | PASS — 11/11 suites; Node 103 (89 pass, 0 fail, 14 omitidas sin stack), Python 16/16, check-ui 152 aserciones |
| Playwright (`npm run test:e2e`, stack abajo) | PASS — 26 pasadas, 4 omitidas, 0 fallos |
| Puppeteer (`npm run test:puppeteer`) | PASS — 12/12 |
| Legados: `e2e-browser` / `e2e-franchise` / `e2e-oneup-finale` / `e2e-oneup-motion` | PASS — 38 / 2 / 2 / 4 comprobaciones |
| Legado: `e2e-kokomi-preview` | FALLO PREEXISTENTE (21 PASS, 5 FAIL) — idéntico en la base prístina de la Fase 8 (`a846127`): su arnés espera un elemento `#original-signature` que el marcado actual de la apertura ya no tiene. No está en ninguna puerta (ni `npm test` ni CI) y la apertura funciona según las demás suites. No bloquea el lanzamiento; queda como seguimiento para la Fase 10. |
| Stack Supabase local LEVANTADO: `tests/auth-supabase.test.mjs` | PASS — 7/7 (0 omitidas) |
| Stack LEVANTADO: `tests/licensed-media-supabase.test.mjs` | PASS — 7/7 (0 omitidas) |
| Stack LEVANTADO: `tests/phase5-community.spec.js` | PASS — 2/2 (incluye GIF en cuarentena y rechazo de tipo/tamaño en vivo) |
| Stack LEVANTADO: `tests/phase6-episode-admin.spec.js` | PASS — 2/2 |
| CI en GitHub Actions (rama `feature/phase9-qa`) | Verificado tras el push de la fase — ver la entrada de la Fase 9 en `docs/PROJECT_CONTINUITY.md` |

**Diagnóstico check-ui (cerrado en esta fase):** la aserción de Storage era la que estaba mal, no el SQL. La Fase 5 añadió GIF a propósito (bucket `allowed_mime_types`, regex del cliente en `social-backend.js` y regex SQL, commit `5ba7168`) y lo verificó en vivo; la aserción quedó con la lista anterior `(jpg|png|webp|mp4)`. La aserción ahora espera exactamente la política vigente `(jpg|png|webp|gif|mp4)`, y la semántica del regex se re-probó en Postgres real: GIF/JPG/MP4 permitidos, BMP rechazado, el punto escapado no casa `mediaXgif`. `check-ui` corre desde ahora dentro de `npm test`, y por tanto en CI y en la puerta de despliegue.

## Ruta exacta a producción (en orden)

### 1. Douglas fusiona la cadena de PRs, en este orden
Cada PR está apilado sobre el anterior; **al fusionar uno, GitHub re-apunta automáticamente el siguiente a la nueva base** (retarget): hay que fusionar en orden y no saltarse ninguno.

| Orden | PR | Rama → base al abrirse | Qué trae |
|---|---|---|---|
| 1 | #71 | `feature/native-auth` → `main` | Cuentas nativas Supabase (sin Google ni Firebase) |
| 2 | #73 | `feature/phase1-stability` → `main` | Fase 1: estabilidad (integra #71 y las sub-ramas de la Fase 1, incluido el trabajo de #72) |
| 3 | #74 | `feature/phase2-detail-pages` → `feature/phase1-stability` | Fase 2: páginas de detalle `/anime/<id>` |
| 4 | #75 | `feature/phase3-catalog` → `feature/phase2-detail-pages` | Fase 3: catálogo |
| 5 | #76 | `feature/phase4-player` → `feature/phase3-catalog` | Fase 4: reproductor |
| 6 | #77 | `feature/phase5-community` → `feature/phase4-player` | Fase 5: comunidad multimedia |
| 7 | #78 | `feature/phase6-episode-admin` → `feature/phase5-community` | Fase 6: admin de episodios con licencia |
| 8 | #79 | `feature/phase7-infra` → `feature/phase6-episode-admin` | Fase 7: infraestructura / CI |
| 9 | #80 | `feature/phase8-design` → `feature/phase7-infra` | Fase 8: diseño premium |
| 10 | PR de la Fase 9 (lo abre el coordinador) | `feature/phase9-qa` → `feature/phase8-design` | Fase 9: QA completa + esta lista |
| 11 | Fase 10 | (rama futura) | Cierre final |

Notas:
- El PR **#72** (`feature/phase1-rates` → `feature/native-auth`) **no** forma parte de la cadena principal: su contenido ya está integrado en la Fase 1 (#73, verificado con `git branch -r --merged origin/feature/phase1-stability`). Decisión de Douglas: cerrarlo como redundante cuando #73 esté fusionado.
- Cada fusión dispara la puerta de despliegue (ver paso 7): si un PR fusionado rompe la puerta, **no se despliega nada** y hay que arreglar antes de seguir con el siguiente.

### 2. Douglas crea el proyecto Supabase y ejecuta el SQL + despliega las funciones
Guía exacta, paso a paso: **`docs/SUPABASE_SETUP.md`**. Resumen de lo que hay que hacer allí:
1. Crear el proyecto en https://supabase.com/dashboard y activar **solo** el proveedor Email (nada de Google ni Anonymous).
2. En el SQL Editor, ejecutar **en este orden** (si uno falla, no seguir con el siguiente):
   - `supabase/sql/oneup_auth.sql`
   - `supabase/sql/oneup_community_optional.sql`
   - `supabase/sql/oneup_community.sql`
   - `supabase/sql/oneup_storage.sql`
   - `supabase/sql/oneup_licensed_media.sql` ← tabla de episodios con licencia de la Fase 6 (Regla 12 en el esquema); no saltársela.
3. Desplegar las Edge Functions (comando exacto en `docs/SUPABASE_SETUP.md` §4): `moderation-dashboard moderate-post review-report review-verification moderate-episode-comment moderate-global-message moderate-community-reply anime1v-discovery` (o el workflow **Activate 1UP Community Supabase** con sus secretos).
4. Configurar en Supabase: Site URL `https://h4cklaboratory.github.io/1UP-ANIME/` y Redirect URLs `https://h4cklaboratory.github.io/1UP-ANIME/**`.
5. Crear su propia cuenta en el sitio y darse el rol de propietario (SQL exacto en `docs/SUPABASE_SETUP.md` §7); sin ese paso, `moderacion.html` dice «Acceso denegado».

### 3. Pegar la configuración pública (`supabase-config.js`)
En el repo, abrir `supabase-config.js` y reemplazar `null` por la **Project URL** y la clave **publishable** (`sb_publishable_...`) de **Project Settings → API** (detalle en `docs/SUPABASE_SETUP.md` §5). **Nunca** la clave `service_role`/`sb_secret_`. Commit de ese archivo en una rama + PR, o directamente en el flujo que Douglas prefiera tras fusionar la cadena.

### 4. Redesplegar el gateway en Render (panel de Douglas)
El servicio de Render sigue con código viejo porque Render despliega desde su propio panel, no desde GitHub Actions (ver `docs/INFRA.md` §4 y `docs/RENDER_ANIME1V.md`):
- Panel de Render → servicio `oneup-anime-discovery` → **Manual Deploy → Deploy latest commit** (con la rama ya fusionada que contiene el código bueno) → comprobar `GET /health` en la URL del servicio.

### 5. Decisión de limpieza de ramas
Inventario y recomendaciones: **`docs/BRANCH_INVENTORY.md`** (~98 ramas remotas; 30 ya fusionadas en `main` = candidatas seguras a borrar, 30 sin PR ni fusión = revisar una a una). **No borrar la cadena activa de fases** hasta que todos sus PRs estén fusionados. Borrado = decisión de Douglas, rama a rama.

### 6. Comprobación física en Safari (iPhone)
La única superficie que ningún arnés de dexter/CI puede verificar: abrir https://h4cklaboratory.github.io/1UP-ANIME/ en el iPhone de Douglas y comprobar: carga e intro, héroe, ficha de un anime (`/anime/<id>` con deep-link), reproductor, crear cuenta / entrar, comunidad y el diálogo de autenticación (`#auth-dialog`). Si algo se ve mal ahí, anotarlo antes de anunciar el lanzamiento.

### 7. Qué entra en vivo automáticamente
- Al fusionar a `main`, `.github/workflows/deploy-pages.yml` corre su **puerta** completa — lint → `npm test` (que desde la Fase 9 **incluye `scripts/check-ui.mjs`**, 152 aserciones) → Playwright → Puppeteer — y su job `deploy` tiene `needs: test`: **si la puerta falla, no se despliega nada**.
- `.github/workflows/ci.yml` corre la misma puerta en cada push de rama y cada PR (sin desplegar nada nunca).
- GitHub Pages publica la raíz del repo en https://h4cklaboratory.github.io/1UP-ANIME/ cuando la puerta pasa.
- Lo que **no** es automático: Supabase (paso 2–3), Render (paso 4) y la limpieza de ramas (paso 5) son pasos manuales de Douglas.

## Bloqueos de lanzamiento (solo Douglas)
1. Fusionar la cadena del paso 1. 2. Proyecto Supabase real (pasos 2–3). 3. Redespliegue en Render (paso 4). 4. Safari físico (paso 6).
Sin esos cuatro, el sitio fusionado se despliega pero **cuentas/comunidad quedan sin backend en vivo** (el código está verificado contra el stack local de Supabase; el proyecto en la nube aún no existe).
