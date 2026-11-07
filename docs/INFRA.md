# 1UP ANIME — Infraestructura y operaciones (runbook)

**Fase:** 7 (2026-11-07) · **Repo:** `H4CKLABORATORY/1UP-ANIME` · **Sitio:** https://h4cklaboratory.github.io/1UP-ANIME/
Este documento describe cómo se prueba, se despliega y se revierte 1UP ANIME. No contiene secretos; los secretos viven en GitHub Actions Secrets / Render env vars, nunca en el repo.

## 1. CI — `.github/workflows/ci.yml` (nuevo en la Fase 7)

- **Cuándo corre:** en CADA `push` a cualquier rama y en cada `pull_request`. Es la primera vez que la suite completa corre en GitHub Actions sin esperar a `main`.
- **Qué hace (un solo job, `ubuntu-24.04` fijado — Playwright 1.56.1 no soporta chromium en la Ubuntu 26.04 de `ubuntu-latest`, probado en la corrida 42424197404 —, Node 22, Python 3.12):** checkout → `pip install beautifulsoup4` (dependencia de las pruebas Python) → `npm ci` → **instalación de navegadores** (`npx playwright install --with-deps chromium` y `npx puppeteer browsers install chrome-headless-shell`) → `npm run lint` → `npm test` → `npm run test:e2e` → `npm run test:puppeteer`.
- **Por qué los navegadores van ANTES de `npm test`:** dos suites de scripts dentro de `npm test` (`scripts/test-episode-comments.mjs` y `scripts/test-episode-player.mjs`) lanzan directamente el headless shell de Playwright. En un runner nuevo, con el orden original de la puerta de la Fase 1 (instalar después de `npm test`), esas dos suites fallan porque el ejecutable aún no existe. Lo probó la primera corrida real de esta rama (run 42423927652, 2026-11-07): Node 103 (89 pass, 14 omitidas) y Python 16/16 pasaron, y solo fallaron esas dos suites por el navegador ausente. En local nunca se vio porque dexter ya tenía los navegadores en caché. **La misma corrección de orden se aplicó también a `deploy-pages.yml`** (su job `test` tenía el mismo orden y habría fallado igual en su primer despliegue real): solo cambió el orden de los pasos de instalación, sin tocar disparos ni pasos de prueba/despliegue. Esa corrección en `deploy-pages.yml` está verificada de forma ESTÁTICA (YAML + la secuencia idéntica verde en CI); el workflow de despliegue en sí NO se disparó en esta fase.
- **Seguridad:** `permissions: contents: read` y NINGÚN paso de despliegue: no publica Pages, no toca Supabase ni Render, no pushea nada. Desplegar sigue siendo exclusivo de `deploy-pages.yml` en `main`.
- **Supabase en CI:** no hay stack de Supabase en el runner; las pruebas en vivo (`tests/auth-supabase.test.mjs`, `tests/licensed-media-supabase.test.mjs` y las specs de las Fases 5–6) se **omiten limpiamente** (14 omitidas en Node, 4 en Playwright), igual que en la corrida local estándar. No se finge cobertura: la verificación contra backend es la del stack local documentada en cada fase.
- **Concurrencia:** grupo `ci-<ref>` con `cancel-in-progress: true` — un push nuevo cancela la corrida superada de la misma rama.
- **Dónde viven los resultados:** pestaña **Actions** del repo → workflow **CI**; cada PR muestra el check en su pestaña *Checks*. Si el job falla, sube el artefacto `ci-browser-artifacts` (informe Playwright, `test-results/` y salidas de Puppeteer) durante 7 días.
- **Estado:** ver la entrada de la Fase 7 en `docs/PROJECT_CONTINUITY.md` para el enlace/ID de la primera corrida verde verificada.

## 2. Despliegue del sitio — GitHub Pages + puerta de pruebas

- Workflow: `.github/workflows/deploy-pages.yml`. **Disparos:** `push` a `main` o dispatch manual (solo desde `main` tiene sentido).
- Job `test` (la *puerta*): la misma secuencia que CI (lint → `npm test` → Playwright → Puppeteer). Job `deploy`: `needs: test` — si las pruebas fallan, **no se despliega nada**.
- Publicación: `actions/configure-pages` + `upload-pages-artifact` (raíz del repo) + `deploy-pages`, en el entorno `github-pages`. Permisos mínimos: `contents: read`, `pages: write`, `id-token: write`. Concurrencia `pages` sin cancelación (un despliegue en curso nunca se corta).
- Consecuencia práctica: NADA llega a producción sin pasar por la cadena de PRs y fusionarse en `main`.

## 3. Refresco de datos (automático, solo desde `main`)

Ambos workflows exigen `github.ref == refs/heads/main`, tienen `permissions: contents: write` (solo para su commit de datos) y publican con `scripts/oneup-safe-push.sh`.

| Workflow | Horario (UTC) | Qué hace | Archivos que commitea |
|---|---|---|---|
| `refresh-catalog.yml` | Diario 08:17 + al cambiar sus scripts en `main` + manual | `scripts/refresh-catalog.mjs` (AniList) y traducción offline con Argos (`scripts/translate-catalog.py`) | `data/catalog.json`, `data/translations-es.json` |
| `refresh-airing.yml` | Cada 6 h (03:11, 09:11, 15:11, 21:11) + al cambiar su script + manual | `scripts/refresh-airing.mjs` (horarios y tráilers de AniList) | `data/airing.json` |

Concurrencia: catálogo `oneup-catalog-snapshot` (cancela la anterior), airing `oneup-airing-refresh` (no cancela). Un commit de datos en `main` dispara a su vez el despliegue de Pages (con su puerta).

## 4. Gateway anime1v en Render — REDESPLIEGUE = PASO DE DOUGLAS

- Código: `render/anime1v-gateway.js` (servicio Node sin dependencias; salud en `GET /health`). Detalle completo: `docs/RENDER_ANIME1V.md`.
- El workflow `render-anime1v-gateway.yml` SOLO hace smoke tests del gateway en PRs; **no despliega en Render**.
- **Estado conocido:** el servicio en Render sigue ejecutando código viejo porque Render despliega desde su propio panel/repo conectado, no desde estos workflows.
- **Cómo redesplegar (Douglas, en el panel de Render):** abrir el servicio del gateway (`oneup-anime-discovery`) → **Manual Deploy → Deploy latest commit** (con la rama que contenga el código bueno ya fusionada) → comprobar `GET /health` en la URL del servicio. Nadie más debe intentarlo: la cuenta de Render es del propietario.
- El gateway solo sirve METADATOS; no aporta streams de episodios (Regla 12).

## 5. Supabase (backend) — despliegue

- Workflow: `.github/workflows/supabase-deploy.yml`. **Solo dispatch manual** y solo corre en `main`.
- Requiere configuración del propietario: variable `SUPABASE_PROJECT_REF` y secretos `SUPABASE_ACCESS_TOKEN` y `SUPABASE_DB_PASSWORD` en GitHub. Sin ellos el workflow falla a propósito en su paso de verificación.
- Qué hace: verifica sintaxis de los backends JS → `supabase link` → `supabase db push` (si no hay carpeta de migraciones, avisa de aplicar `supabase/sql/*.sql` en el SQL Editor) → despliega las Edge Functions de moderación y `anime1v-discovery`.
- La CLI de Supabase quedó **fijada en 2.45.5** en la Fase 7 (antes `latest`, sin fijar; 2.45.5 es la versión verificada en local en dexter).
- La configuración pública (URL + clave publicable en `supabase-config.js`) NO la escribe ningún workflow: es un paso manual del propietario descrito, paso a paso, en **`docs/SUPABASE_SETUP.md`**. Hasta que Douglas cree el proyecto alojado, el backend en vivo sigue **IMPLEMENTADO PERO NO VERIFICADO** (verificado solo contra el stack local).

## 6. Cómo revertir

- **Código:** en el PR ya fusionado, botón **Revert** de GitHub (crea un PR de reversión) o `git revert <merge-commit>` en una rama → PR → fusionar en `main`. Al entrar en `main`, `deploy-pages.yml` vuelve a pasar la puerta y redespliega la versión anterior automáticamente. Nunca se hace force-push a `main`.
- **Datos (catálogo/airing):** revertir el commit del bot (`Refresh anime catalog…` / `Update live anime airing calendar…`) igual que código; el siguiente refresco programado regenerará los datos.
- **Supabase:** las SQL son aditivas por diseño; una reversión de esquema se hace con una SQL nueva correctiva ejecutada por el propietario (SQL Editor), no reescribiendo las ya aplicadas.
- **Pages:** el historial de despliegues vive en Actions → *Deploy to GitHub Pages*; no hay despliegue manual fuera de ese workflow.

## 7. Auditoría de workflows (Fase 7, estática — sin disparar ninguno)

Verificados los 41 workflows: todos parsean como YAML válido. Auditoría detallada de los cinco principales:

| Workflow | Disparos | Permisos | Concurrencia | Versiones | Resultado |
|---|---|---|---|---|---|
| `deploy-pages.yml` | push `main`, manual | `contents: read` + `pages: write` + `id-token: write` (mínimo para Pages) | `pages`, sin cancelar | checkout v4, setup-node v4, setup-python v5, configure-pages v5, upload-pages-artifact v3, deploy-pages v4 | **Corregido (orden + runner):** los navegadores se instalan ahora antes de `npm test` (ver §1) y los jobs quedaron fijados a `ubuntu-24.04` (Playwright 1.56.1 no soporta chromium en la Ubuntu 26.04 que hoy es `ubuntu-latest`; probado por la corrida CI 42424197404). Mismos pasos y disparos. Verificación estática: no se disparó |
| `refresh-catalog.yml` | cron diario, push a `main` (paths), manual | `contents: write` (su commit de datos) | `oneup-catalog-snapshot` | checkout v4, setup-node v4, setup-python v5 | OK, sin cambios |
| `refresh-airing.yml` | cron 6 h, push a `main` (paths), manual | `contents: write` (su commit de datos) | `oneup-airing-refresh` | checkout v4, setup-node v4 | OK, sin cambios |
| `supabase-deploy.yml` | solo manual, solo `main` | `contents: read` | `oneup-supabase-backend-deploy` | checkout v4, setup-node v4, setup-cli v1 | **Corregido:** la CLI iba con `version: latest` (sin fijar) → fijada a `2.45.5` |
| `anime1v-integration.yml` | PR a `main` (paths), manual | `contents: read` | **no tenía** | checkout v4, setup-node v4 | **Corregido:** añadido grupo de concurrencia por ref con cancelación (es una comprobación de solo lectura; no cambia qué verifica) |

Ningún workflow auditado quedó con acciones sin fijar por debajo de versión mayor, y ninguno perdió ni ganó disparos en esta fase. La verificación de estos dos arreglos es ESTÁTICA (parseo YAML + diff): por orden expresa de la fase, **no se disparó** `deploy-pages` ni los refresh (desplegarían/commitearían código no fusionado), y `supabase-deploy` requiere la configuración del propietario.

Hay además una deuda conocida fuera del alcance de esta fase: `depth-mode.yml` es el único workflow del repo sin bloque `permissions:` (hereda los permisos por defecto del token). Se registra aquí; corregirlo es seguro pero se deja para una fase con verificación propia.

## 8. EN ESPERA (ON HOLD)

| Tema | Bloqueo | De quién depende |
|---|---|---|
| CSP de la vista previa en higgsfield.app | La fuente de ese proyecto NO está en este repo ni en dexter: re-comprobado en la Fase 7 (listado de `/data/home` y búsqueda en el repo). Solo aparecen archivos ajenos (un estudio en `craft-anything` y el nodo `nodes_higgsfield.py` de ComfyUI), que NO son la fuente del preview de 1UP. Sin la fuente o el acceso a su hosting no se puede cambiar su CSP. | Douglas (aportar fuente/acceso) |
| Gateway anime1v en Render con código viejo | Render solo redespliega desde su panel (ver §4). | Douglas (Manual Deploy en Render) |
| Backend Supabase alojado | El proyecto alojado aún no existe; la verificación de las Fases 1–6 es contra el stack local. Pasos en `docs/SUPABASE_SETUP.md`. | Douglas (crear el proyecto) |
| Limpieza de ramas (~90) | Inventario y recomendación listos en `docs/BRANCH_INVENTORY.md`; borrar ramas es decisión del propietario. | Douglas (decidir) |
| PRs #71–#78 (cadena de fases) | Abiertos en borrador, apilados; fusionarlos es decisión del propietario. | Douglas (revisar/fusionar) |

