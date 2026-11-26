# 1UP ANIME — handoff para un nuevo chat


## Enlaces de trabajo
- Sitio: https://h4cklaboratory.github.io/1UP-ANIME/
- GitHub: https://github.com/H4CKLABORATORY/1UP-ANIME
- Instrucciones: [AGENTS.md](../AGENTS.md)
- Historial de decisiones y desarrollo: [PROJECT_CONTINUITY.md](PROJECT_CONTINUITY.md)
- Próximas tareas: [OMEGA_NEXT_ACTIONS.md](OMEGA_NEXT_ACTIONS.md)
- Estudio de motion: [CINEMATIC_V3_STUDIO.md](CINEMATIC_V3_STUDIO.md)
- Render y Anime1v: [ANIME1V_METADATA_RUNTIME.md](ANIME1V_METADATA_RUNTIME.md)
- Pull requests: https://github.com/H4CKLABORATORY/1UP-ANIME/pulls
- Pruebas: https://github.com/H4CKLABORATORY/1UP-ANIME/actions

## Identidad y alcance permanente
- 1UP ANIME, interfaz en español, presupuesto objetivo cero. Preservar Kokomi de Codex y compatibilidad iPhone.
- Logo de letras estático en header: assets/oneup-header-letters.png; intro antes de la web con audio original AAC de 3,2 s.
- Formatos 9:16 móvil y 16:9 escritorio; el audio de inicio puede ser bloqueado por Safari sin gesto del visitante.

## Estado detectado ahora
- Último commit de aplicación encontrado: 5b6b04852c636dd9a6c0587efc27c2eb1caf7144
- Descubrimiento Anime1v configurado en frontend: sí, verificar la respuesta real en Render
- Código runtime de metadatos Anime1v en repositorio: sí
- Entradas de obras multimedia en data/licensed-media.json: 0
- Capas de personajes declaradas en Cinematic V3: 0

## Últimos commits relevantes
- 5b6b04852 — Sync authorized anime episode metadata and source statuses
- eef35600e — Update educational anime metadata from Wikipedia
- 7dd312114 — Sync authorized anime episode metadata and source statuses
- ef32bd0ab — ONEUP health snapshot (no application changes)
- 5cc187026 — Sync authorized anime episode metadata and source statuses

## PR abiertos (consultar cambios antes de desarrollar)
- [#88](https://github.com/H4CKLABORATORY/1UP-ANIME/pull/88) fix: publish mirrored catalog and airing snapshots safely
- [#87](https://github.com/H4CKLABORATORY/1UP-ANIME/pull/87) chore: add OMEGA multi-agent team for OpenCode
- [#86](https://github.com/H4CKLABORATORY/1UP-ANIME/pull/86) Fix/player refresh authorized media 20261116
- [#85](https://github.com/H4CKLABORATORY/1UP-ANIME/pull/85) Página de serie (watch.html): sinopsis en español resumida, tráiler, Dónde verlo y servidore
- [#82](https://github.com/H4CKLABORATORY/1UP-ANIME/pull/82) Fase 10: app Capacitor (APK verificado; iOS = decisión/Mac)
- [#81](https://github.com/H4CKLABORATORY/1UP-ANIME/pull/81) Fase 9: QA completo y preparación de lanzamiento
- [#80](https://github.com/H4CKLABORATORY/1UP-ANIME/pull/80) Fase 8: diseño premium (tokens oneup, QA visual, sin CSS muerto)
- [#79](https://github.com/H4CKLABORATORY/1UP-ANIME/pull/79) Fase 7: infraestructura (CI verde en Actions, runbook, inventario)
- [#78](https://github.com/H4CKLABORATORY/1UP-ANIME/pull/78) Fase 6: admin de episodios con licencia (Regla 12 en el esquema)
- [#77](https://github.com/H4CKLABORATORY/1UP-ANIME/pull/77) Fase 5: comunidad multimedia con moderación (cuarentena→publicación)
- [#76](https://github.com/H4CKLABORATORY/1UP-ANIME/pull/76) Fase 4: reproductor (failover real, subtítulos, reanudación)
- [#75](https://github.com/H4CKLABORATORY/1UP-ANIME/pull/75) Fase 3: catálogo (caché coherente, lock, outage AniList, offline)

## Próxima tarea por prioridad
1. Leer AGENTS.md, esta ficha, PROJECT_CONTINUITY.md y OMEGA_NEXT_ACTIONS.md; confirmar HEAD y CI.

## Prompt para pegar en otro chat

## Activación y límites
- GitHub Actions actualiza esta ficha al cambiar main, cada seis horas o manualmente.
- La tarea ChatGPT Continuar 1UP Anime ya está programada cada hora; no se crea otra tarea igual.
- Ninguna de esas funciones abre una conversación nueva ni detecta espacio agotado: el usuario puede abrir Nuevo chat y pegar el prompt anterior.
