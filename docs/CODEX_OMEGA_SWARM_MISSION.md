# CODEX — DEXTER OMEGA SWARM / misión ejecutable 1UP Anime

**Fecha de preparación:** 2026-10-16
**Repositorio:** `H4CKLABORATORY/1UP-ANIME`
**Rama de producción:** `main` (NO modificar ni fusionar automáticamente).
**Rediseño existente:** [PR #14 — Kokomi, draft](https://github.com/H4CKLABORATORY/1UP-ANIME/pull/14), rama `design/kokomi-mobile-reference-2026-10-15`.
**Referencia de diseño solicitada:** https://demo.templatemonster.com/demo/520462.html

## 0. Objetivo y criterio de realidad

Continúa el proyecto existente hasta convertirlo en una plataforma de anime coherente, rápida, móvil primero y mantenible. Coordina especialidades, implementa código real y deja evidencia. Este documento **es una misión para Codex, no un agente en ejecución**. Al iniciar, comprueba la rama, el código actual, los commits y el estado de CI; nunca asumas que el contenido de esta nota sigue actualizado.

- No reescribir el sitio desde cero ni mezclar el prototipo Nebula con `main` a ciegas.
- No confundir metadatos de AniList/Jikan con derechos de reproducción.
- No convertir la web en tarjetas para visitar otros servicios; el reproductor de episodios mostrará únicamente fuentes integrables verificadas y autorizadas.
- No prometer «7 reproductores» si el manifiesto `data/licensed-media.json` está vacío: son hasta siete *slots*, no servidores activos.
- No dar por finalizados Google Login, Supabase, Firebase, Safari físico ni fuentes HLS reales sin verificación y configuración efectiva.
- No comprar servicios, divulgar secretos, eludir DRM o CORS, obtener material de sitios sin autorización, ni usar servicios de terceros para evadir restricciones.
- No fusionar PR #14 sin aprobación visual del propietario. No desplegar a producción por defecto.
- Kokomi es el referente visual prioritario: estudiar distribución, hero, carruseles, navegación, tarjetas, páginas y móvil. Recrear comportamientos mediante código y recursos originales; una réplica de activos comerciales exige licencia válida. No asumir coincidencia pixel-perfect si la demo no estuvo disponible.

## 1. Fuentes de verdad obligatorias

Leer en este orden antes de editar:
1. `AGENTS.md`.
2. `docs/PROJECT_CONTINUITY.md`.
3. `docs/OMEGA_SWARM_BOARD.md` (estado y dependencias).
4. `README.md`, `docs/INTEGRACION_STREAMING_1UP_2026.md`, `MEDIOS_AUTORIZADOS.md`.
5. `docs/ART_DIRECTION_CINEMATIC_2026.md`.
6. [PR #14](https://github.com/H4CKLABORATORY/1UP-ANIME/pull/14), su lista de archivos y `docs/KOKOMI_FIDELITY_MATRIX.md` en la rama del PR, antes de proponer otro rediseño.

Archivos identificados en `main`: `index.html`, `studio.js`, `app.js`, `studio.css`, `brand-v2.css`, `spotlight.css`, `motion.css`, `episode-player.js`, `hls-adapter.js`, `episode-comments.js`, `community.js`, `social-backend.js`, `supabase-episode-backend.js`, `external-providers.js`, `data/licensed-media.json`, `sw.js`, `.github/workflows/` y `scripts/`. Verificar que sigan existiendo.

**Estado al preparar este envío:** PR #14 abierto en borrador; README informa manifiesto multimedia vacío; Firebase/Supabase requieren configuración; pruebas automatizadas de PR #14 documentadas, pero Safari iPhone físico y reproducción real pendientes. Esto NO prueba que el despliegue actual sea el de PR #14.

## 2. Orquestación eficiente (6 especialidades + coordinador)

Prioriza un **coordinador** y hasta **seis especialistas**. Subagentes de verdad solo si Codex/harness los ofrece; de otro modo, adoptar roles y ejecutar secuencialmente. No declarar agentes paralelos simulados.

| Rol | Propiedad principal | Entrega verificable |
|---|---|---|
| OMEGA CORE (coordinador) | Dependencias, planes, integración, decisiones | tablero actualizado, resumen de diffs, integración sin conflictos |
| VISUAL / UX | Kokomi, marca, mobile, accesibilidad | preview coherente + capturas comparables de 390px y desktop |
| FRONTEND / ROUTER | navegación, fichas, estado, PWA | rutas reales y flujos sin botones ficticios |
| MEDIA / PLAYER | fuentes permitidas, idioma, episodio, HLS | selector condicional + errores reproducibles + contratos |
| DATA / COMMUNITY | AniList/Jikan, auth, perfiles, comentarios | persistencia real o estado explícito de configuración pendiente |
| QA / SECURITY | CI, navegación, regresión, secretos, CSP | checks ejecutados + observaciones y bloqueos |
| DEVOPS / PERFORMANCE | build, Pages, workflows, velocidad | CI revisado, métricas y mecanismo reversible de entrega |

Máximo inicial recomendado: cuatro frentes de escritura independientes; revisores pueden investigar simultáneamente. Dividir por propiedad de archivos: un mismo archivo no se edita concurrentemente desde dos worktrees. Cada tarea declara dueño, archivos, dependencias, criterios, pruebas y enlace al diff. Si un frente está bloqueado, otro continúa.

**Regla de mejora:** medir cambios aceptados, retrabajos, fallos de CI y tiempo hasta integración; añadir un rol nuevo solo para una necesidad detectada. Agentes «infinitos» no son una capacidad real ni un objetivo de calidad.

## 3. Orden de ejecución para Codex

### Paso A — Lectura y diagnóstico sin alterar producción
- `git status`, `git branch`, `git log -5 --oneline`; confirmar SHA base.
- Enumerar rutas/capacidades reales y los checks CI existentes. Leer solo módulos pertinentes.
- Inspeccionar PR #14 (draft) antes de duplicar componentes Kokomi; contrastarlo con `main`.
- Inspeccionar manifiesto de fuentes y configuración auth. Distinguir implementado, probado, conectado, desplegado y pendiente.
- Registrar hallazgos con referencia al código y a workflows.

### Paso B — Diseñar tareas y contratos paralelos
- Actualizar `docs/OMEGA_SWARM_BOARD.md` sin marcar trabajo inexistente como finalizado.
- Establecer contrato de episodio: `animeId`, `season`, `episode`, `language`, `subtitleTracks`, `sources[]`, `mode`, `rights`, `capabilities`.
- Mantener separación entre datos de catálogo y disponibilidad de video. El selector de idioma se basa en pistas reales, no en etiquetas inferidas de metadatos.
- Establecer componentes/callbacks del reproductor antes de que frontend y backend los implementen por separado.

### Paso C — Mejorar la experiencia de reproducción sin redirecciones falsas
- En la experiencia central del episodio, mostrar video dentro de 1UP únicamente para recursos `owned` o `authorized` cuya incrustación esté permitida.
- Distinguir catálogo externo informativo vs. fuente reproducible. Si no hay fuentes integrables, mostrar estado vacío honesto; no mostrar botones falsos.
- MP4/WebM, HLS nativo Safari y alternativa hls.js; limpiar reproductor anterior al cambiar de fuente/ruta. Prohibido bypass de protecciones, scraping de streams no autorizados y proxies ocultos.
- Idiomas: es-LA, es-ES, ja, subtítulos es y otras pistas **solo cuando haya medios disponibles**. No duplicar fichas.
- Comentarios asociados al episodio y temporada, no a una página externa.
- Verificar arranque tras gesto de usuario, control por teclado/táctil, errores, reduced motion y compatibilidad iPhone.

### Paso D — Kokomi con identidad propia
- Usar PR #14 como candidato principal, no rehacerlo. Revisar sus 22 vistas distinguiendo pantallas operativas vs. informativas.
- Comparar home, listado, detalle, reproducción y móvil con las referencias disponibles. Si demo inaccesible, dejar constancia.
- Conservar y consolidar el sistema de estilos actual; diseños reversibles, sin meter CSS global que rompa otros módulos.
- Logo: usar último recurso **realmente aprobado y disponible**; no inventar uno definitivo ni sustituir marca. Mantener el nombre 1UP Anime.
- Halloween/anti-magia: detalles sutiles opcionales y temporales; audio apagado por defecto, Safari solo tras gesto, accesibilidad y performance primero.

### Paso E — Datos, backends y privacidad
- Verificar AniList/Jikan y respaldos sin inventar estrenos. Respetar rate limits y atribuciones.
- Los perfiles `localStorage` no equivalen a cuentas sincronizadas.
- Firebase y Supabase permanecen opcionales hasta configurar proyecto/credenciales públicas/seguridad y verificar integración real.
- No introducir service keys o secretos al frontend ni mezclar dos backends sin decisión explícita.
- Publicar los requisitos del propietario y la ruta de verificación, sin inventar usuarios ni comentarios.

### Paso F — QA, revisión, entrega
- Ejecutar comprobaciones pertinentes de `scripts/` y ` .github/workflows/`; tomar líneas de comando del repo real, no inventarlas.
- E2E Chrome 390×844 y escritorio, navegación de retorno, errores JS, botones visibles, tabs, favoritos, episodios, estado sin backend y sin fuentes.
- Safari físico y stream real: clasificar como **no verificados** si no hay entorno o medios reales.
- Registrar pruebas, capturas y SHA; usar PR en borrador para revisión y NO fusionar sin aprobación del propietario.
- Proponer mejoras medibles después de cada ciclo, evitando regenerar documentación infinita.

## 4. Condiciones de entrega y comunicación

La definición de «terminado» requiere: código implementado, pruebas pertinentes, integración entre módulos, permisos realmente configurados cuando correspondan, revisión, despliegue si se aprobó y evidencia de uso. Informar por separado «listo en rama», «aprobado», «fusionado», «desplegado» y «operativo». No declarar el 100% si falta material autorizado o infraestructura.

Por cada avance sustancial registrar:
- Rama/commit/PR y archivos modificados.
- Resultado de pruebas con comandos, no opiniones.
- Qué quedó realmente conectado.
- Qué necesita permiso o entrada del propietario.
- Próxima tarea específica, corta y ejecutable.

**Solicitud de propietario:** priorizar terminar 1UP Anime rápido sin sacrificar el trabajo anterior. No reiniciar, no crear redirecciones como sustituto del reproductor, máxima fidelidad visual razonable a Kokomi, catálogo por idiomas disponible y experiencia móvil profesional.

## 5. Primera tarea lista para iniciar

1. Auditar `main` y [PR #14](https://github.com/H4CKLABORATORY/1UP-ANIME/pull/14) sobre su última versión.
2. Comparar flujo episodio en `main` vs. `preview-kokomi-mobile.html` del PR; documentar dónde aún aparecen tarjetas externas y cómo la UI principal se vincula a fuentes reales.
3. Preparar un PR pequeño y reversible que resuelva **un defecto real comprobado** (por ejemplo, estados vacíos/selección de fuentes o navegación entre ficha y episodio), junto con un test.
4. Antes de cualquier merge, adjuntar capturas y resultados de CI; solicitar aprobación visual del propietario.

**Inicio en Codex recomendado:** «Abre este repositorio, lee AGENTS.md y docs/CODEX_OMEGA_SWARM_MISSION.md en la rama de preparación, revisa PR #14 y ejecuta la Primera tarea. Coordina especialistas reales solo si están disponibles, sin modificar main ni fusionar hasta que revise el resultado».
