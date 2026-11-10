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
- Último commit de aplicación encontrado: d9f8d0e6a4adb2a1ee68e4c84f48225be003f886
- Descubrimiento Anime1v configurado en frontend: sí, verificar la respuesta real en Render
- Código runtime de metadatos Anime1v en repositorio: sí
- Entradas de obras multimedia en data/licensed-media.json: 0
- Capas de personajes autorizados declaradas en Cinematic V3: 0
- Safari físico: no dar por verificado salvo prueba real con evidencia.

## Últimos commits relevantes
- d9f8d0e6a — Sync authorized anime episode metadata and source statuses
- 213bb8ec4 — ONEUP health snapshot (no application changes)
- 0dca1f967 — Update live anime airing calendar
- 2b1b091e0 — Sync authorized anime episode metadata and source statuses
- f9774a869 — ONEUP health snapshot (no application changes)

## PR abiertos (consultar cambios antes de desarrollar)
- [#82](https://github.com/H4CKLABORATORY/1UP-ANIME/pull/82) Fase 10: app Capacitor (APK verificado; iOS = decisión/Mac)
- [#81](https://github.com/H4CKLABORATORY/1UP-ANIME/pull/81) Fase 9: QA completo y preparación de lanzamiento
- [#80](https://github.com/H4CKLABORATORY/1UP-ANIME/pull/80) Fase 8: diseño premium (tokens oneup, QA visual, sin CSS muerto)
- [#79](https://github.com/H4CKLABORATORY/1UP-ANIME/pull/79) Fase 7: infraestructura (CI verde en Actions, runbook, inventario)
- [#78](https://github.com/H4CKLABORATORY/1UP-ANIME/pull/78) Fase 6: admin de episodios con licencia (Regla 12 en el esquema)
- [#77](https://github.com/H4CKLABORATORY/1UP-ANIME/pull/77) Fase 5: comunidad multimedia con moderación (cuarentena→publicación)
- [#76](https://github.com/H4CKLABORATORY/1UP-ANIME/pull/76) Fase 4: reproductor (failover real, subtítulos, reanudación)
- [#75](https://github.com/H4CKLABORATORY/1UP-ANIME/pull/75) Fase 3: catálogo (caché coherente, lock, outage AniList, offline)
- [#74](https://github.com/H4CKLABORATORY/1UP-ANIME/pull/74) Fase 2: páginas de detalle /anime/ id  (sin modal, deep-link, scroll exacto)
- [#73](https://github.com/H4CKLABORATORY/1UP-ANIME/pull/73) Fase 1: estabilidad (integración — AniList primero, sin Jikan, limpieza y gate)
- [#72](https://github.com/H4CKLABORATORY/1UP-ANIME/pull/72) Phase 1: AniList/Jikan rate safety + refresh-catalog robustness
- [#71](https://github.com/H4CKLABORATORY/1UP-ANIME/pull/71) Cuentas nativas 1UP en Supabase (correo + contraseña), sin Google ni Firebase

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
