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

## Modo OMEGA INGENIO + memoria versionada (instalado como skill local)

La skill [`.agents/skills/omega-ingenio-memoria/SKILL.md`](.agents/skills/omega-ingenio-memoria/SKILL.md) rige las tareas de este repositorio junto con estas instrucciones. **Al iniciar** lee [`docs/OMEGA_MEMORY.md`](docs/OMEGA_MEMORY.md) y [`docs/OMEGA_NEXT_ACTIONS.md`](docs/OMEGA_NEXT_ACTIONS.md) y consulta el [expediente actualizado](docs/OMEGA_PROJECT_DOSSIER_20261016.md). El [inventario completo de rutas](docs/OMEGA_REPO_INVENTORY_20261016.md) y [catálogo de 201 skills observadas](docs/OMEGA_SKILLS_CATALOGO_201.md) son referencias, no instalaciones de plugins externos. [Prompt de activación](docs/OMEGA_ACTIVACION_CODEX.md).

**Antes de terminar cambios materiales:** actualiza memoria versionada, próximos pasos y bitácora `docs/PROJECT_CONTINUITY.md` con SHA/PR y resultados reales. No generar commits vacíos. «Modo engaño» significa ingenio creativo y pensamiento lateral, jamás mentir sobre hechos/permisos ni burlar seguridad. Mantener presupuesto cero, recursos autorizados, originalidad, compatibilidad iPhone y respeto al proyecto actual. Priorizar verificación en lugar de supuestos.


## Traspaso automático entre chats — 2026-10-17
- **Al comenzar una conversación nueva**, leer primero [docs/NEW_CHAT_HANDOFF.md](docs/NEW_CHAT_HANDOFF.md), después PROJECT_CONTINUITY, OMEGA_NEXT_ACTIONS, decisiones, ramas y pruebas actuales.
- Este documento contiene un prompt de traspaso para un nuevo chat y un estado del repositorio. No contiene transcripciones privadas ni secretos.
- La acción [update-new-chat-handoff.yml](.github/workflows/update-new-chat-handoff.yml) genera un checkpoint ante cambios de `main`, cada seis horas y manualmente; script determinista: `node scripts/update-new-chat-handoff.mjs`.
- La automatización ChatGPT «Continuar 1UP Anime» ya existe con revisión horaria. **No crear tareas recurrentes duplicadas** ni afirmar actividad continua.
- La apertura de un nuevo chat y el traspaso del historial privado no pueden activarse al agotarse el contexto. El usuario abre «Nuevo chat» y pega el prompt del handoff; el nuevo agente reconstruye el estado desde GitHub, nunca desde suposiciones.
- Si el nuevo chat descubre discrepancias entre el handoff y `main`, la evidencia del código, CI y despliegues recientes tiene prioridad. Actualizar la ficha antes de cerrar cambios materiales.
