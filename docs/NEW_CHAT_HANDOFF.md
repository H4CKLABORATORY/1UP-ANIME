# 1UP ANIME — handoff para un nuevo chat

> Documento de continuidad del proyecto, no copia de mensajes privados. Se actualizará automáticamente mediante `scripts/update-new-chat-handoff.mjs` después de fusionarse esta propuesta.

## Enlaces
- Web: https://h4cklaboratory.github.io/1UP-ANIME/
- Repositorio: https://github.com/H4CKLABORATORY/1UP-ANIME
- Instrucciones y prioridades: [AGENTS.md](../AGENTS.md)
- Progreso real: [PROJECT_CONTINUITY.md](PROJECT_CONTINUITY.md)
- Próximas acciones: [OMEGA_NEXT_ACTIONS.md](OMEGA_NEXT_ACTIONS.md)
- Estudio Cinematic V3: [CINEMATIC_V3_STUDIO.md](CINEMATIC_V3_STUDIO.md)
- Anime1v en Render: [ANIME1V_METADATA_RUNTIME.md](ANIME1V_METADATA_RUNTIME.md)
- Revisar [PRs](https://github.com/H4CKLABORATORY/1UP-ANIME/pulls) y [Actions](https://github.com/H4CKLABORATORY/1UP-ANIME/actions) antes de afirmar estado.

## Decisiones del propietario
- El diseño Kokomi de Codex es la base preferida.
- El logo de la cabecera debe mostrar solo las letras cromadas «1UP ANIME», sin animación.
- La intro va a pantalla completa **antes** de entrar, 9:16 en móvil y 16:9 escritorio, con el **sonido original** del MP4 de 3,2 segundos. Sin botón para omitir. Safari puede bloquear el audio automático.
- Cinematic V3 está en `preview-cinematic-v3.html`, como estudio animado por capas y con la firma AAC original; **no** es un MP4 final publicado ni contiene personajes de anime ajenos sin derechos.
- Presupuesto objetivo cero, experiencia móvil, español y catálogo sin publicidad engañosa.
- Anime1v de FxxMorgan ya está conectado como **búsqueda de metadatos** en Render; no equivale a episodios en streaming. `data/licensed-media.json` sigue vacío y requiere fuentes autorizadas.
- No emplear imágenes generadas con IA haciendo pasar personajes por fotogramas oficiales.

## Estado al crear este archivo
- HEAD inspeccionado: `5e9f65b8dffa464f4639192ced67d5955b18adc7` — release de búsqueda Anime1v real como metadatos.
- Intro Cinematic V3: vista pública de estudio independiente; exportación final con recursos autorizados pendiente.
- Runtime Anime1v: consultas reales probadas; continuar validando estado de Render y evitar afirmar videos disponibles.
- Automatización «Continuar 1UP Anime»: **una vez por hora**, ya existe.
- Siguiente tarea: mejorar composición multicapa sin inventar personajes y probar visualmente antes de reemplazar la intro publicada; inspeccionar si hay un trabajo más urgente ya documentado en OMEGA_NEXT_ACTIONS.

## Prompt listo para pegar en un nuevo chat

> Continúa el proyecto **1UP ANIME** en https://github.com/H4CKLABORATORY/1UP-ANIME. **Antes de editar lee directamente** AGENTS.md, docs/NEW_CHAT_HANDOFF.md, docs/PROJECT_CONTINUITY.md y docs/OMEGA_NEXT_ACTIONS.md. Revisa commits, PR abiertos, GitHub Actions y despliegues existentes. No empieces desde cero ni pierdas las preferencias: Kokomi/Codex, letras cromadas en cabecera, intro original 9:16/16:9 antes de la página con firma sonora, edición cinematográfica multicapa, iPhone y presupuesto cero. Anime1v está conectado para **metadatos**, pero no autoriza episodios de terceros. Ejecuta un cambio pequeño y verificable, documenta SHA/PR/pruebas y deja el siguiente paso preparado. Si no puedes actuar, informa qué acceso, archivo o autorización falta sin inventar resultados.

## Disparadores disponibles
- GitHub Actions puede regenerar este documento tras cambios de `main`, cada seis horas y manualmente.
- ChatGPT ya tiene una tarea programada cada hora para consultar el estado y continuar trabajo verificable.
- **No es posible detectar cuántos tokens quedan ni crear un nuevo chat automáticamente.** Cuando sea necesario, abrir un nuevo chat y pegar el prompt de arriba; el agente leerá los archivos actualizados.
