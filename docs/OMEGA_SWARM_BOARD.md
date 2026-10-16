# DEXTER OMEGA SWARM — tablero de trabajo verificable

Preparado 2026-10-16. **No es una lista de agentes activos**; estado inicial derivado de código y documentación de GitHub. Codex debe actualizarlo tras inspección del estado real.

## Estados
`BACKLOG` sin iniciar · `READY` listo · `RUNNING` en ejecución real · `BLOCKED` depende de recurso/permisos · `REVIEW` implementado, pendiente de revisión · `DONE` aceptado tras pruebas.

| ID | Prioridad | Frente / dueño | Alcance concreto | Dependencias y criterio | Estado |
|---|---|---|---|---|---|
| SW-00 | P0 | OMEGA CORE | Auditar main, docs, PR #14, CI y diferencias de producto | Requiere leer repositorio; entregable informe con SHAs, fuentes y riesgos | READY |
| SW-01 | P0 | VISUAL / UX | Revisar y refinar PR #14 Kokomi sin copiar activos comerciales | Base SW-00; capturas móvil/escritorio y regresión responsive; sin merge automático | BACKLOG |
| SW-02 | P0 | MEDIA / PLAYER | Unificar experiencia de episodio y selección real de servidor/idioma | Base SW-00; contrato manifiesto; estado sin fuentes y tests | BACKLOG |
| SW-03 | P1 | FRONTEND / ROUTER | Enlazar fichas, temporadas, episodios y navegación reversibles | Coordinar con SW-01/02; sin regresiones en main | BACKLOG |
| SW-04 | P1 | DATA / COMMUNITY | Revisar catálogo y comentarios por episodio | Backend remoto desactivado; no prometer sincronización | BACKLOG |
| SW-05 | P0 | QA / SECURITY | Revisar vulnerabilidades, permisos, secretos, tests E2E y CI | Pruebas documentadas por SHA; Safari físico marcado no verificado | BACKLOG |
| SW-06 | P1 | DEVOPS / PERFORMANCE | Optimizar red/caché/Pages y plan de despliegue reversible | No habilitar compras ni desplegar sin aprobación | BACKLOG |
| SW-07 | P0 | OMEGA CORE | Consolidar PRs y devolver resultado | Requiere revisión de propietario antes de fusionar PR #14 | BLOCKED |

## Contratos de coordinación
- Cada subagente recibe una tarea acotada con archivos de propiedad, inputs, outputs y pruebas.
- No ejecutar escrituras concurrentes sobre el mismo archivo. Preferir worktree/rama por frente y PR pequeño.
- Si el runtime no ofrece subagentes, usar estos mismos roles secuencialmente. No inventar registros.
- La mayor eficiencia es menos retrabajo y menos errores, NO mayor número de nombres de agentes.

## Evidencias iniciales
- [PR #14](https://github.com/H4CKLABORATORY/1UP-ANIME/pull/14): rediseño Kokomi en borrador, sin merge a main; workflow/capturas registrados en la descripción.
- [README.md](../README.md): `data/licensed-media.json` vacío y backend Supabase opcional desactivado.
- [docs/PROJECT_CONTINUITY.md](PROJECT_CONTINUITY.md): PR #12 integró base de reproductor y CI; Safari real y videos autorizados siguen pendientes.
- [docs/INTEGRACION_STREAMING_1UP_2026.md](INTEGRACION_STREAMING_1UP_2026.md): arquitectura y límites de fuentes.
- [docs/ART_DIRECTION_CINEMATIC_2026.md](ART_DIRECTION_CINEMATIC_2026.md): dirección artística y restricciones de audio/móvil.

## Registro de avances
Cada ejecución agrega bajo esta línea: fecha, ID, estado anterior→nuevo, agente o modo real, rama/SHA, pruebas realizadas, problemas y siguiente acción. No marcar DONE con una promesa.

