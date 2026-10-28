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
- 1UP ANIME, interfaz en español, presupuesto objetivo cero. Preservar Kokomi de Codex y compatibilidad iPhone.
- Logo de letras estático en header: assets/oneup-header-letters.png; intro antes de la web con audio original AAC de 3,2 s.
- Formatos 9:16 móvil y 16:9 escritorio; el audio de inicio puede ser bloqueado por Safari sin gesto del visitante.
- La versión Cinematic V3 es una vista de estudio multicapa; no afirmar que ya sea un nuevo MP4 final publicado.
- Para personajes, usar solo imágenes originales con permiso o material aportado y autorizado; no generar caras fingiendo ser fotogramas reales.
- No confundir el catálogo de Anime1v con episodios reproducibles ni su licencia MIT con derechos de distribución de anime.

## Estado detectado ahora
- Último commit de aplicación encontrado: 282b5b94e6211fa06b054686e6c906af56ce60f4
- Descubrimiento Anime1v configurado en frontend: sí, verificar la respuesta real en Render
- Código runtime de metadatos Anime1v en repositorio: sí
- Entradas de obras multimedia en data/licensed-media.json: 0
- Capas de personajes autorizados declaradas en Cinematic V3: 0
- Safari físico: no dar por verificado salvo prueba real con evidencia.

## Últimos commits relevantes
- 282b5b94e — Sync authorized anime episode metadata and source statuses
- e03a85656 — ONEUP health snapshot (no application changes)
- 5ecce9c54 — Update live anime airing calendar
- 8440e18b3 — Sync authorized anime episode metadata and source statuses
- 034440692 — ONEUP health snapshot (no application changes)

## PR abiertos (consultar cambios antes de desarrollar)
- [#70](https://github.com/H4CKLABORATORY/1UP-ANIME/pull/70) LU local: memoria de continuidad para Qwen entre chats
- [#69](https://github.com/H4CKLABORATORY/1UP-ANIME/pull/69) fix: recuperar catálogo ante caché local malformada
- [#68](https://github.com/H4CKLABORATORY/1UP-ANIME/pull/68) 1UP Auth: registro y recuperación por correo; retirar acceso Google
- [#67](https://github.com/H4CKLABORATORY/1UP-ANIME/pull/67) Configure Firebase web app for Google sign-in
- [#61](https://github.com/H4CKLABORATORY/1UP-ANIME/pull/61) 1UP: primer episodio completo desde canal oficial TMS y QA real
- [#54](https://github.com/H4CKLABORATORY/1UP-ANIME/pull/54) 1UP Anime: primer episodio oficial TMS y técnicas educativas de r/node
- [#51](https://github.com/H4CKLABORATORY/1UP-ANIME/pull/51) 1UP Anime: lector manga y publicación automática de medios autorizados
- [#50](https://github.com/H4CKLABORATORY/1UP-ANIME/pull/50) Documentar MAL Updater como referencia para seguimiento de 1UP Anime
- [#46](https://github.com/H4CKLABORATORY/1UP-ANIME/pull/46) 1UP Anime: contador de conexiones en línea para portada y comunidad
- [#45](https://github.com/H4CKLABORATORY/1UP-ANIME/pull/45) WIP: guarded comment image/GIF preview and anime detail UX audit
- [#44](https://github.com/H4CKLABORATORY/1UP-ANIME/pull/44) Audit: release readiness baseline and Depth Mode regression coverage
- [#40](https://github.com/H4CKLABORATORY/1UP-ANIME/pull/40) Diseño 1UP Editorial Pro: pulido cinematográfico original (solo preview)

## Próxima tarea por prioridad
1. Leer AGENTS.md, esta ficha, PROJECT_CONTINUITY.md y OMEGA_NEXT_ACTIONS.md; confirmar HEAD y CI.
2. Perfeccionar Cinematic V3 por capas y conservar audio original; no sustituir la intro publicada sin QA y autorización de personajes.
3. Comprobar el estado real de Anime1v en Render y los flujos existentes; no atribuir reproducción de episodios a un catálogo.
4. Realizar una tarea concreta y verificable, registrar PR, tests y siguiente acción. No duplicar trabajo ya fusionado.

## Prompt para pegar en otro chat
Continúa el proyecto 1UP ANIME desde https://github.com/H4CKLABORATORY/1UP-ANIME. Antes de editar lee AGENTS.md, docs/NEW_CHAT_HANDOFF.md, docs/PROJECT_CONTINUITY.md y docs/OMEGA_NEXT_ACTIONS.md directamente en GitHub. No empieces de cero. Comprueba el último commit, propuestas y pruebas; conserva Kokomi, el logo de letras y audio original. Trabaja una tarea real pendiente, verifica el cambio y actualiza la bitácora. No afirmes que Cine V3 sea un MP4 final ni que Anime1v habilite streaming sin fuentes autorizadas. Si falta acceso, especifica el bloqueo y deja el siguiente paso.

## Activación y límites
- GitHub Actions actualiza esta ficha al cambiar main, cada seis horas o manualmente.
- La tarea ChatGPT Continuar 1UP Anime ya está programada cada hora; no se crea otra tarea igual.
- Ninguna de esas funciones abre una conversación nueva ni detecta espacio agotado: el usuario puede abrir Nuevo chat y pegar el prompt anterior.
