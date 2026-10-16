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


## Misión actual — DEXTER OMEGA SWARM / Codex (2026-10-16)
- Leer [docs/CODEX_OMEGA_SWARM_MISSION.md](docs/CODEX_OMEGA_SWARM_MISSION.md) para objetivos, hechos comprobados, referencias, restricciones y primera tarea.
- Consultar y actualizar [docs/OMEGA_SWARM_BOARD.md](docs/OMEGA_SWARM_BOARD.md) como tablero verificable; no simular agentes activos ni marcar una función como terminada sin prueba.
- Trabajar en tareas aisladas y paralelas **solo si el entorno ofrece subagentes o worktrees reales**. Empezar con hasta seis especialidades útiles, no generar cientos de roles ficticios.
- Antes de crear otro rediseño, revisar [PR #14 Kokomi](https://github.com/H4CKLABORATORY/1UP-ANIME/pull/14) y evitar duplicarlo. La mayor fidelidad visual razonable a Kokomi debe conservar la identidad y recursos originales/licenciados.
- No reemplazar el reproductor por redirecciones, ni fingir fuentes/idiomas disponibles. El video integrado solo se ofrece con fuentes válidas, autorizadas y compatibles.
- Dejar cambios grandes en PRs reversibles. No fusionar automáticamente PR #14 ni desplegar a `main` sin validación y aprobación del propietario.
