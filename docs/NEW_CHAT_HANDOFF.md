# 1UP ANIME — handoff para un nuevo chat

> Estado derivado de archivos y commits del repositorio. No copia conversaciones privadas, no abre chats y no detecta límites de contexto.

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
- 1UP ANIME, interfaz en español, presupuesto objetivo cero. Preservar Kokomi y compatibilidad iPhone.
- Logo de letras estático en header: assets/oneup-header-letters.png; intro antes de la web con audio AAC de 3,2 s.
- Formatos 9:16 móvil y 16:9 escritorio; el audio de inicio puede requerir interacción previa del visitante en Safari.
- La versión Cinematic V3 es una vista de estudio multicapa.

## Estado detectado ahora
- Último commit de aplicación encontrado: 3375f8fe3cccec8ba93ed48bb9b26eb9d4a1d14d
- Descubrimiento Anime1v configurado en frontend: sí, verificar la respuesta real en Render
- Código runtime de metadatos Anime1v en repositorio: sí
- Entradas de medios configuradas en data/licensed-media.json: 0
- Safari físico: verificar mediante pruebas reales.

## Últimos commits relevantes
- 3375f8fe3 — update
- 0d90dc319 — docs(continuidad): registrar commit del refresco autorizado
- 1c5e1e420 — fix(player): actualizar revalida fuentes autorizadas
- c6378068e — Merge branch 'main' of https://github.com/H4CKLABORATORY/1UP-ANIME
- 6f9735841 — fix(player): restaurar visualizacion de reproductores al hacer click en el catalogo

## PR abiertos (consultar cambios antes de desarrollar)
- Consultar https://github.com/H4CKLABORATORY/1UP-ANIME/pulls para obtener lista actual (no significa que no haya PRs).

## Próxima tarea por prioridad
1. Leer AGENTS.md, esta ficha, PROJECT_CONTINUITY.md y OMEGA_NEXT_ACTIONS.md; confirmar HEAD y CI.
2. Perfeccionar Cinematic V3 por capas y conservar audio original.
3. Comprobar el estado de Anime1v en Render y los flujos existentes.
4. Realizar una tarea concreta y verificable, registrar PR, tests y siguiente acción. No duplicar trabajo ya fusionado.

## Prompt para pegar en otro chat
Continúa el proyecto 1UP ANIME desde https://github.com/H4CKLABORATORY/1UP-ANIME. Antes de editar lee AGENTS.md, docs/NEW_CHAT_HANDOFF.md, docs/PROJECT_CONTINUITY.md y docs/OMEGA_NEXT_ACTIONS.md directamente en GitHub. No empieces de cero. Comprueba el último commit, propuestas y pruebas; conserva Kokomi, el logo de letras y audio original. Trabaja una tarea real pendiente, verifica el cambio y actualiza la bitácora.

## Activación y límites
- GitHub Actions actualiza esta ficha al cambiar main, cada seis horas o manualmente.
- La tarea ChatGPT Continuar 1UP Anime ya está programada cada hora; no se crea otra tarea igual.
- Ninguna de esas funciones abre una conversación nueva ni detecta espacio agotado: el usuario puede abrir Nuevo chat y pegar el prompt anterior.
