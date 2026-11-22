# DEXTER OMEGA SWARM — tablero de trabajo verificable

Preparado 2026-10-16. **No es una lista de agentes activos**; estado inicial derivado de código y documentación de GitHub. Codex debe actualizarlo tras inspección del estado real.

## Estados

| ID | Prioridad | Frente / dueño | Alcance concreto | Dependencias y criterio | Estado |
|---|---|---|---|---|---|
| SW-00 | P0 | OMEGA CORE | Auditar main, docs, PR #14, CI y diferencias de producto | Informe en docs/OMEGA_AUDIT_20261016.md; revisión efectuada en PR #17 | REVIEW |
| SW-01 | P0 | VISUAL / UX | Revisar y refinar PR #14 Kokomi sin copiar activos comerciales | Avance en PR #19 sobre #18; aprobada dirección visual, no despliegue | REVIEW |
| SW-02 | P0 | MEDIA / PLAYER | Unificar experiencia de episodio y selección real de servidor/idioma | PR #18, HLS y selector probados con fixtures, faltan medios reales | REVIEW |
| SW-03 | P1 | FRONTEND / ROUTER | Enlazar fichas, temporadas, episodios y navegación reversibles | PR #17 y #18, navegación/regresiones Chromium probadas | REVIEW |
| SW-06 | P1 | DEVOPS / PERFORMANCE | Optimizar red/caché/Pages y plan de despliegue reversible | No habilitar compras ni desplegar sin aprobación | BACKLOG |
| SW-07 | P0 | OMEGA CORE | Consolidar PRs y devolver resultado | Revisar cadena #17→#18→#19→#20; no publicar sin validación final | BLOCKED |
| SW-08 | P1 | QA / CATALOG | Aislar cachés PWA y corregir ranking popular | PR #20, pruebas Node/CI y siguiente refresco AniList | REVIEW |

## Contratos de coordinación
- Cada subagente recibe una tarea acotada con archivos de propiedad, inputs, outputs y pruebas.
- No ejecutar escrituras concurrentes sobre el mismo archivo. Preferir worktree/rama por frente y PR pequeño.
- Si el runtime no ofrece subagentes, usar estos mismos roles secuencialmente. No inventar registros.
- La mayor eficiencia es menos retrabajo y menos errores, NO mayor número de nombres de agentes.

## Evidencias iniciales
- [PR #14](https://github.com/H4CKLABORATORY/1UP-ANIME/pull/14): rediseño Kokomi en borrador, sin merge a main; workflow/capturas registrados en la descripción.
- [docs/INTEGRACION_STREAMING_1UP_2026.md](INTEGRACION_STREAMING_1UP_2026.md): arquitectura y límites de fuentes.
- [docs/ART_DIRECTION_CINEMATIC_2026.md](ART_DIRECTION_CINEMATIC_2026.md): dirección artística y restricciones de audio/móvil.

## Registro de avances
Cada ejecución agrega bajo esta línea: fecha, ID, estado anterior→nuevo, agente o modo real, rama/SHA, pruebas realizadas, problemas y siguiente acción. No marcar DONE con una promesa.


### 2026-10-16 — ciclo real OMEGA CORE
- SW-00 READY→REVIEW: auditoría completada sobre main `85ef098`, PR14 `09e8fa2`, PR15 `eb3e227`; informe `docs/OMEGA_AUDIT_20261016.md`.
- Seis especialistas reales con propiedad separada: visual (lectura), frontend (`studio.js`), media (`episode-player.js`), data (`episode-comments.js`), QA (verificación), infra (`firebase-deploy.yml`). CORE integra documentación y CI.
- SW-02/03/04/05: correcciones acotadas en REVIEW; no se declara terminada cada especialidad. SW-06: restricción de despliegue en REVIEW. SW-01 continúa BACKLOG: conservar PR14, integrar motor actual y comparar capturas de Kokomi ahora accesible.
- Rama: `fix/omega-episode-lifecycle-20261016`. Tests lifecycle, carrera navegación, comentarios Chromium, UI 149 assertions, HLS, contrato, resiliencia y Supabase opcional PASS. E2E 36/36 móvil 390×844 y desktop 1360×860 PASS, sin errores JS. Fixtures aislados, sin escritura remota.
- Próxima acción: integrar visual PR14 con contrato main y normalización de fuentes, con capturas comparables. Revisión única por módulo antes de integrar; no se midió rendimiento ni se certificó fidelidad visual.

### 2026-10-16 — ciclo reproducción gratuita
- SW-01/02/03 RUNNING→REVIEW: prioridad del propietario trasladada a arquitectura y preview integrada; frontend posee preview/tema/router/tests, media posee motor/regresión, QA posee fixture E2E idiomas, CORE integra documentación y CI.
- Rama dependiente de PR17: `feature/free-streaming-foundation-20261016`. No merge ni despliegue. Alcance: reutilizar motor HLS desde Kokomi, siete posiciones, idiomas/subtítulos de fuentes reales y selección de temporadas sin colisiones de número.
- Documentación de arquitectura en `docs/FREE_STREAMING_ARCHITECTURE.md`; matriz Kokomi preservada desde PR14 con actualización histórica.
- Evidencia local: idiomas4 + preview18 + general36 PASS; UI149 y suites Node PASS. Motor HLS con fixture: se verifica attach/cleanup, no una transmisión real. CI remoto se adjunta al PR y no se presume aprobado por estas pruebas locales.

### 2026-10-16 — marca y decisiones recuperadas
- `docs/PROJECT_DECISIONS.md` distingue marca vigente, legado, aprobación no acreditada y adjuntos/chats inaccesibles. No se generó una marca sustitutiva ni se atribuyó aprobación al crest por existir en main.
- Logo exacto de otro chat y ZIP Nebula siguen BLOCKED por archivo/identificación ausentes. Diseño general conserva decisiones anteriores ya registradas; sin prometer lectura de conversaciones no accesibles.

### 2026-10-16 — continuación con preferencia por Codex
- **Preferencia de diseño verificada en conversación:** el propietario prefiere la propuesta más reciente de Codex; PR #19 y sus bases #18/#17 pasan a ser la línea visual a preservar. No revivir diseño anterior como default.
- **SW-08 en revisión, no desplegado:** rama `fix/codex-pwa-popularity-20261016`, PR #20 apilado sobre PR #19. Corrección de cachés origin-wide, selección popular distinta de trending y futura generación de `groups.popular` del snapshot.
- El cambio es código real y no depende de fuentes de anime, Firebase o acceso a Safari; su suite nueva es `scripts/test-cache-catalog.mjs`, CI `ONEUP Codex Cache and Catalog Regression`.
- **Cadena pendiente:** #17 → #18 → #19 → #20. Para integrar en `main` hace falta revisión coherente del conjunto (incluidos conflictos y capturas); no fusionar PRs fuera de orden.
- **Bloqueos externos persistentes:** manifiesto de video sin episodios, autenticación/servicios de comunidad no configurados, pruebas Safari iPhone físico y reproducción real ausentes.

### 2026-11-22 — equipo OMEGA persistente para OpenCode
- Se añadió la configuración de agentes en `.opencode/agents/`: `omega-lead` (primary), `frontend-ux`, `backend-catalog`, `qa-security` e `integration-docs` (subagents).
- Guía de activación: `.opencode/README.md`. Los agentes son definiciones persistentes, no procesos activos. Para activarlos se debe abrir OpenCode en la raíz del repositorio y seleccionar/invocar `omega-lead`; el coordinador delega tareas a los especialistas.
- Reglas: máximo cuatro especialistas por ciclo, rutas de escritura exclusivas, sin worktrees aislados se serializan las escrituras; integración mediante rama/PR; no auto-merge ni despliegue.
- Rama: `chore/omega-agent-team-20261122`; PR draft #87: https://github.com/H4CKLABORATORY/1UP-ANIME/pull/87.
- Verificación de esta sesión: archivos creados y leídos desde GitHub. No se ejecutó OpenCode en el servidor del propietario; carga de agentes y delegación real quedan BLOCKED hasta validar allí.
- Automatización ChatGPT existente actualizada (no duplicada): ahora usa GitHub como fuente de verdad y reconoce la configuración OpenCode; mantiene frecuencia horaria.
- Próxima acción: actualizar la rama en el servidor OpenCode, seleccionar `omega-lead`, ejecutar una auditoría de solo lectura y confirmar que los cuatro subagents aparecen y pueden ser invocados. Después asignar un pendiente P0 real evitando PRs ya abiertos.
