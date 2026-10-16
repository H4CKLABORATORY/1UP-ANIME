# 1UP Anime — decisiones recuperadas y procedencia

Actualizado 2026-10-16. Este registro consolida la sesión actual, archivos del repositorio e historial GitHub consultado. No representa acceso a otros chats de ChatGPT. La existencia de un recurso o commit no acredita por sí sola aprobación visual del propietario.

## Marca

| Recurso | Evidencia | Tratamiento |
|---|---|---|
| `assets/oneup-crest.svg` | Creado en [8ded1d8](https://github.com/H4CKLABORATORY/1UP-ANIME/commit/8ded1d88744bedb501002f20606b27554e1f8f62); aplicado en [be252a9](https://github.com/H4CKLABORATORY/1UP-ANIME/commit/be252a9120ddaa3f9963b1bc1e67a6664dded210) | Marca actual preservada: runa/portal cobalto, violeta y plata. No se confirma que sea el logo favorito mencionado de otro chat. |
| `assets/icon-180.png`, `icon-192.png`, `icon-512.png` | Generados en `73d497c`; `scripts/build-icons.py` usa el crest como fuente | Iconos PWA/iPhone derivados de la marca actual; no regenerar desde una variante supuesta. |
| `assets/oneup-mascot.svg`, `assets/icon.svg` | Recursos de etapas anteriores; mascota sustituida en `be252a9` | Legado conservado, sin reactivarlo como marca principal. |
| `themes/october-2026/arcane-seal.svg` | Ambientación original del tema de octubre | Sigilo decorativo; no sustituye el logo. |

La cabecera móvil Kokomi ocultaba `.brand-symbol` a 780 px o menos. Este ciclo hace visible el emblema existente y lo incorpora al menú lateral, sin generar otra marca ni alterar el archivo original.

## Diseño y experiencia

| Decisión | Fuente | Estado y continuidad |
|---|---|---|
| Kokomi como referencia principal con identidad original | Petición del propietario, PR14, `docs/KOKOMI_FIDELITY_MATRIX.md` | Preview existente recuperada; mantener componentes y reproductor compartido del PR18. Sin copiar activos comerciales. |
| Negro obsidiana, grafito y texto claro como base permanente | `docs/ART_DIRECTION_CINEMATIC_2026.md`, sección «Propuesta de identidad» | Preservar; no convertir campaña temporal en identidad definitiva. |
| Hero cinematográfico; paneles manga y navegación editorial como referencias | Mismo documento, «Lectura de las tres referencias» | Referencias registradas, no prueba de que se hayan recuperado los adjuntos originales. |
| Magia y Halloween discretos, temporales y reversibles | Mismo documento; `themes/october-2026/` | Reutilizar tema y sigilo existentes; no copiar personajes, logos ni música de anime. |
| Motion moderado, navegación sin bloqueo, reduced motion | `.agents/skills/anime-art-direction/SKILL.md` y dirección artística | Mantener rutas utilizables sin animación; no añadir efectos constantes para sustituir diseño. |
| Sonido apagado por defecto, voluntario y tras gesto | Dirección artística; tema de octubre | Conservar control existente; no insertar audio obligatorio ni activar módulos antiguos solo porque existen. |
| iPhone y escritorio, acceso invitado | AGENTS, continuidad y petición actual | Chromium responsive comprobable; Safari físico continúa pendiente. |
| Anime → temporada/episodio → idioma → fuente → reproducción integrada gratuita | Petición actual, PR18, `docs/FREE_STREAMING_ARCHITECTURE.md` | Preparado en rama; manifiesto real vacío. No confundir catálogo de metadatos con videos disponibles. |

## Material no recuperado

- **Logo exacto elegido en otro chat:** no está identificado. No hay comentarios/reviews en PR13/14/15 ni comentarios de commits/issues que lo confirmen en los endpoints consultados. Se solicitó descripción o ubicación en esta sesión; una imagen del original permitirá sustituirlo con certeza si es diferente.
- **Chats completos anteriores:** no hay una herramienta disponible que permita leerlos. Solo se incorporan decisiones con evidencia accesible.
- **`1UP_ANIME_MASTER_V0.2.zip` / Nebula UI 0.2:** mencionado en `docs/PROJECT_CONTINUITY.md`; no está en el repositorio ni en los directorios de adjuntos accesibles. No reconstruirlo de memoria ni reemplazar la aplicación por una maqueta.

## Regla para próximas sesiones

Leer este registro y `docs/PROJECT_CONTINUITY.md`. Si llega el logo original, añadir su ruta, procedencia y aprobación expresa antes de cambiar cabecera, menú, pie, acceso e iconos. Actualizar derivados desde una única fuente y verificar tamaños móviles. Una aprobación del logo no equivale a aprobación de despliegue.


## 2026-10-16 — Preferencia explícita por el diseño de Codex

El propietario confirmó en la conversación del proyecto: «Claro, el diseño que propuso Codex es mejor».

**Decisión registrada:** continuar sobre el diseño más reciente de Codex, `design/brand-continuity-20261016` (PR #19), que integra los cambios dependientes de PR #18 y #17, en vez de regresar al prototipo Nebula o versiones anteriores del tema. Conservar estilo Kokomi, identidad 1UP, catálogo y módulo de reproducción, con código/recursos originales.

**Alcance de esta decisión:** preferencia sobre dirección visual y línea de desarrollo. No identifica un nuevo logo exacto ni concede por sí sola autorización para desplegar cambios incompletos o para afirmar que Safari/Firebase/reproducción real ya funcionan.

**Continuación:** PR #20 `fix/codex-pwa-popularity-20261016`, basado en PR #19: elimina limpieza de cachés ajenas al sitio y corrige la fuente de datos del ranking Top Anime. Revisar CI y mantener la cadena de PRs hasta su integración autorizada.
