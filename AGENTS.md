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
