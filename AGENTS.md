# 1UP Anime: instrucciones para asistentes de desarrollo

Estas reglas se aplican a cualquier agente (Codex, Work u otro) que edite este repositorio.

## Prioridades
1. **Experiencia antes de efectos.** La selección de un anime debe mostrar su propio arte, metadatos y acciones verdaderas.
2. **Contenido verificable.** No inventar estrenos, episodios, plataformas o reproducciones. Usar datos de AniList/Jikan, con copia local y etiqueta de último actualizado.
3. **Marca editorial propia.** No copiar logotipos, ilustraciones, sonidos, código ni diseños exactos de Netflix, Crunchyroll, JKAnime, Solo Leveling u otras marcas.
4. **Móvil primero.** Funcionar en Safari de iPhone sin inicio de sesión, audio obligatorio ni bloqueo de navegación.
5. **Rendimiento.** Evitar librerías pesadas y animaciones constantes. Mantener una ruta funcional sin animaciones y respetar prefers-reduced-motion.

## Skills del proyecto
- [.agents/skills/anime-art-direction/SKILL.md](.agents/skills/anime-art-direction/SKILL.md): revisión de diseño editorial y motion.
- [.agents/skills/anime-catalog/SKILL.md](.agents/skills/anime-catalog/SKILL.md): APIs, fallback y consistencia de datos.

## Arquitectura
- index.html: interfaz pública y diálogo de detalles.
- studio.js: contenido, estado, selección de anime y favoritos.
- studio.css, spotlight.css, motion.css: diseño base, contenido protagonista, efectos opcionales.
- data/catalog.json: copia pública del catálogo generada por GitHub Actions.
- scripts/refresh-catalog.mjs: refresco seguro de información pública.
- auth.js y auth-config.js: invitado y configuración opcional de Firebase Google.

## Antes de publicar
- Confirmar que cada selector HTML usado por JavaScript existe.
- Confirmar que las llamadas de JS a favoritos y a detalle reciben un anime registrado.
- Validar sintaxis JS, accesibilidad de botones, contraste y modo móvil.
- Verificar que GitHub Pages termine en success; no afirmar pruebas de iPhone no realizadas.


## Continuidad entre sesiones (leer después de este archivo)
- **[docs/PROJECT_CONTINUITY.md](docs/PROJECT_CONTINUITY.md)** es la bitácora y hoja de ruta activa. Leerla antes de modificar código; tras cada cambio actualizar su bitácora, pruebas y próxima tarea. No reconstruir desde cero, no sobrescribir la rama principal con una demo separada.
- **[docs/PROJECT_DECISIONS.md](docs/PROJECT_DECISIONS.md)** registra procedencia de marca y decisiones recuperadas. No afirmar acceso a otros chats ni identificar un logo como aprobado sin evidencia. La marca vigente se preserva mientras falta el original mencionado por el propietario.

## OMEGA X — skill y memoria persistente de 1UP
- Para cualquier tarea relativa a este proyecto, **antes de editar**, cargar [`.agents/skills/omega-continuidad-memoria/SKILL.md`](.agents/skills/omega-continuidad-memoria/SKILL.md), [`docs/OMEGA_MEMORY_CURRENT.md`](docs/OMEGA_MEMORY_CURRENT.md) y [`docs/OMEGA_HANDOFF_20261016.md`](docs/OMEGA_HANDOFF_20261016.md).
- Consultar [`docs/OMEGA_CODEX_START_PROMPT.md`](docs/OMEGA_CODEX_START_PROMPT.md) para el arranque de Codex y [`docs/OMEGA_ALL_201_SKILLS_CATALOG.md`](docs/OMEGA_ALL_201_SKILLS_CATALOG.md) solo como **catálogo**, no como plugins instalados.
- Después de cada cambio de proyecto, actualizar memoria de proyecto con decisiones, SHA, pruebas y siguiente acción; jamás afirmar que se escribió si no hay cambios guardados. No guardar secretos en la memoria.
- La evidencia Git más reciente prevalece sobre este snapshot. Presupuesto cero dólares; proteger logo MP4 original y diseño Kokomi; no intentar jailbreak ni engañar a otras IAs.
