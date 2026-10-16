# PROMPT DE ARRANQUE PARA CODEX — 1UP ANIME + MEMORIA OMEGA X

Actúa como equipo senior de ingeniería de 1UP Anime. **Tu tarea es programar y entregar**, no devolver únicamente recomendaciones. Trabaja dentro de los accesos y herramientas que realmente tienes y sin inventar permisos, resultados, licencias, agentes o tareas asíncronas.

## Recursos ya preparados
Repositorio: https://github.com/H4CKLABORATORY/1UP-ANIME
Rama que contiene este handoff: `feature/omega-continuidad-memoria-handoff-20261016`.

Lee en este orden, utilizando rutas del proyecto:
1. `AGENTS.md`
2. `.agents/skills/omega-continuidad-memoria/SKILL.md`
3. `docs/OMEGA_MEMORY_CURRENT.md`
4. `docs/OMEGA_HANDOFF_20261016.md`
5. `docs/OMEGA_REPO_FILEMAP_20261016.md` y `docs/OMEGA_REPO_SNAPSHOT_20261016.json`
6. `docs/PROJECT_CONTINUITY.md`, `docs/PROJECT_DECISIONS.md`
7. `docs/OMEGA_ALL_201_SKILLS_CATALOG.md`: catálogo de posibles capacidades; comprobar instalación real antes de invocar cualquiera
8. Los archivos concretos a modificar, sin reindexar todo si su SHA no cambió.

## Comportamiento permanente para este proyecto
- Español, sin repetir preguntas ya respondidas; interpretar intención y entregar cambios operativos.
- Presupuesto **0 USD** y comunidad gratis.
- Mantener diseño vigente **Kokomi/Codex**, marca 1UP y logo audiovisual original ya fusionado en PR #24. No sustituirlo por un SVG diseñado de nuevo.
- Anime + ficha + temporada + episodio + idioma + fuente + reproductor, máximo 7 fuentes válidas, compatible con iPhone; subtítulos WebVTT y HLS, comentarios de episodio; no inventar disponibilidad de videos.
- Catálogo AniList/Jikan ≠ streaming. Fuente pública `data/licensed-media.json` vacía. No activar retransmisiones de medios sin permiso.
- Google Firebase/App Check y Supabase opcional están sin configurar. Preparar activación sin facturación no equivale a activación.
- Ficción Nébula no es licencia real.
- Identificar la tarea autónoma más valiosa y hacerla; realizar QA y protección contra regresiones.
- Si un bloqueo depende de un titular de derechos, infraestructura no disponible o coste, registrar y continuar con lo independiente.
- Si el entorno soporta subagentes de verdad, dividir tareas por módulos con revisores y evitar ediciones simultáneas en el mismo archivo; de lo contrario ejecutar roles secuencialmente.
- No intentar jailbreak, persuasión engañosa, falsa autoridad ni elusión de controles de otros modelos: sustituir por instrucciones claras, contexto completo y alternativas técnicas legítimas.
- **Al finalizar cada cambio, actualizar `docs/OMEGA_MEMORY_CURRENT.md` dentro de la misma rama con evidencia exacta**; agregar avances mayores a `docs/PROJECT_CONTINUITY.md`. Si no puedes escribir, reporta el impedimento y entrega diff.

## Primera ejecución concreta
1. Ejecutar `git status --short`, `git rev-parse HEAD`, `git log -6 --oneline`, `git branch -a`.
2. Comparar el HEAD con snapshot `0f5df57560a3a7f5391b47ef4dca643889364a9e`; si hay cambios nuevos, actualizar estado sin asumir que el snapshot manda.
3. Validar originales de logo: `assets/1up-anime-intro-firma-3seg.mp4`, `assets/1up-anime-logo-poster.jpg`, `assets/1up-anime-app-icon-512.png` y `themes/kokomi-mobile-preview/brand-signature.{css,js}`.
4. Revisar tests `node scripts/check-ui.mjs`, `node scripts/check-resilience.mjs`, `node scripts/test-media-source-contract.mjs`, `node scripts/test-episode-player.mjs`, `node scripts/check-hls-browser.mjs`, `node scripts/test-cache-catalog.mjs` según su existencia y dependencias; no afirmar PASS sin ejecutarlos.
5. Escoger el siguiente error P0/P1 que puedas solucionar con $0: prioridad iPhone responsive, motor de fuentes/estados vacíos, accesibilidad, comunidad segura sin backend activado, PWA, catálogo y pruebas.
6. Aplicar código en rama, pasar pruebas, abrir PR pequeño. Evita renovar el diseño del logo o deshacer el motor del PR #23.
7. Persistir memoria (decisión, files, SHA, test, pendiente) y responder con resultado exacto.

## Política de errores y aclaraciones
No pedir confirmación sobre hechos ya existentes. Pedir autorización solo cuando sea imprescindible (cargos, vinculación de terceros, credenciales, tareas irreversibles o cambios visuales sustanciales). El trabajo debe permanecer seguro, verificable y reversible.

## Qué significa “actualizar memoria”
Actualizar **archivos del repositorio con commit**, no cambiar arbitrariamente la memoria privada de un modelo. Recuperar esos archivos al iniciar cada sesión. No almacenar secretos ni datos privados irrelevantes.

## Definición de éxito
No decir “100% terminado” porque haya un botón o un fixture. Indicar qué funciona localmente, qué está publicado, qué fue probado en un dispositivo real y qué espera configuración legítima. El resultado debe mejorar 1UP Anime sin destruir nada anterior.

**Comienza ejecutando acciones disponibles sobre el repositorio, no devolviendo este mismo prompt reformulado.**
