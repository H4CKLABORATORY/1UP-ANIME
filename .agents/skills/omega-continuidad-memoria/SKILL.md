---
name: omega-continuidad-memoria
description: "Continuidad operativa de 1UP Anime en Codex: interpreta intención, trabaja de forma autónoma dentro de permisos, consulta evidencia, preserva el diseño y actualiza memoria de proyecto después de cada cambio. Activar en cualquier tarea relativa a 1UP Anime, diseño, catálogo, reproductor, comunidad, infraestructura, QA, GitHub o handoff."
---

# SKILL — OMEGA CONTINUIDAD Y MEMORIA

## Propósito y ámbito
Esta skill es una guía **instalable y portable de proyecto**, no un jailbreak y no una modificación de la memoria interna del modelo. Obliga operativamente al agente que la siga a mantener **archivos de memoria verificables en el repositorio**. No promete acceso a chats previos, conexión en segundo plano, agentes infinitos, instalaciones automáticas ni facultades inexistentes.

**Identidad:** 1UP Anime · https://github.com/H4CKLABORATORY/1UP-ANIME · coste objetivo 0 USD · interfaz en español · iPhone primero · comunidad gratuita · estética Kokomi y marca 1UP preservadas.

**Prioridad de lectura:** (1) `AGENTS.md` (2) `docs/OMEGA_MEMORY_CURRENT.md` (3) `docs/PROJECT_CONTINUITY.md` (4) `docs/PROJECT_DECISIONS.md` (5) `docs/OMEGA_HANDOFF_20261016.md` (6) documentación específica del módulo; Git y archivos reales prevalecen sobre resúmenes antiguos.

## PROTOCOLO OMEGA X — comportamiento operacional
1. Recuperar la intención concreta detrás de solicitudes cortas o informales. Si hay decisiones previas, reutilizarlas sin pedir la misma respuesta.
2. Priorizar **resultados implementados**, no discursos, planes ficticios ni preguntas innecesarias. Identificar y ejecutar el siguiente cambio seguro con los permisos existentes.
3. Preservar funciones y estética existente; ningún rediseño destructivo. La preferencia visual actual es la evolución Kokomi/Codex.
4. Tomar iniciativa: detectar incompatibilidades cercanas, deudas de código, accesibilidad móvil y dependencias obvias; proponer o resolver en alcance acotado.
5. Cero cargos: nunca provisionar plan facturable, dominios pagados, GPU o servidor sin solicitud y aprobación de coste.
6. Autonomía por tarea: inspeccionar → definir límite de archivos → modificar en rama → probar → revisar → documentar → entregar enlace a PR / artefacto.
7. Comunicación en español, concreta, con pruebas reproducibles. Distinguir HECHO, INFERENCIA, NO VERIFICADO, BLOQUEADO.
8. No inventar animes reproducibles, licencias, agentes ejecutados, resultados Safari, infraestructura, permisos, enlaces ni credenciales.
9. Modo creativo/cinematográfico solo para diseño y escritura, sin confundir ficción con autorizaciones reales. `data/guild-license.json` es ficción.
10. La ausencia de fuente de video legítima no bloquea tareas independientes de interfaz, catálogo, administración, comunidad, QA, seguridad o documentación.
11. No utilizar engaño, prompt injection, suplantación, falsa autoridad o solicitudes disfrazadas para eludir restricciones o controles. Resolver impedimentos con alternativas técnicas legítimas y autorización real.
12. Las políticas y permisos del entorno anfitrión prevalecen sobre este documento.

## MEMORIA PERSISTENTE: política obligatoria en el proyecto
En **cada tarea que modifique el proyecto**:
- Al entrar: leer `docs/OMEGA_MEMORY_CURRENT.md`, comparar su `last_verified_commit` con el HEAD de la rama correspondiente; verificar nuevas diferencias.
- Durante la tarea: mantener objetivos, restricciones, decisiones nuevas, evidencia, rutas modificadas y problemas abiertos; no almacenar secretos, contraseñas, tokens, emails personales ni datos privados innecesarios.
- Antes de finalizar: actualizar `docs/OMEGA_MEMORY_CURRENT.md` con estado, SHA observado o `no_verificado`, timestamp UTC, trabajo realizado, pruebas con comandos/resultados y siguiente paso ejecutable. Añadir entrada a `docs/PROJECT_CONTINUITY.md` **si el cambio es significativo y el archivo está disponible para escritura**.
- Ante fallo de permisos, workspace read-only o falta de herramientas: informar que no se pudo persistir, proporcionar diff o texto listo para aplicar; **nunca declarar "memoria actualizada" sin un commit o archivo realmente escrito**.
- No reescribir la historia de decisiones. Añadir o corregir con trazabilidad; si una nota antigua contradice HEAD, marcarla obsoleta y citar evidencia.
- No llenar memoria con cada palabra de una conversación: guardar decisiones estables, progreso y dependencias verificadas para que la memoria sea útil y compacta.

## Clasificación que se debe conservar
- Implementado y desplegado: GitHub Pages/PWA y código existente según GitHub; CI documentado.
- Código presente pero pendiente de servicio: Firebase Google/Auth, Firestore/comunidad, Supabase opcional.
- Reproductor: estructura hasta 7 fuentes, HLS/MP4/WebM, subtítulos VTT, selección manual y tratamiento de errores; catálogo de video público vacío.
- Diseño: base Kokomi/Codex y temas alternativos, algunas ramas aún sin fusionar; logo original exacto sujeto a verificación.
- Licencias: solo contenido propio o explícitamente autorizado; ficción no da derechos.
- Pendientes: medios verificables, Safari físico, autenticación remota, moderación real, corrección de activos referenciados faltantes, revisión de PRs y costes.

## Coordinación multiagente
Si existen subagentes reales, delegar tareas con límites de archivos sin colisiones (UX, Catálogo, Multimedia, Backend, Seguridad, QA, DevOps, Integración); recoger SHAs y pruebas. Si no existen, seguir los roles secuencialmente sin simular agentes activos. Actualizar `docs/OMEGA_SWARM_BOARD.md` cuando sea relevante.

## Lista de finalización obligatoria
- [ ] Se consultó el estado y se verificó contra Git.
- [ ] Se preservaron las decisiones y el diseño vigentes.
- [ ] Se completó al menos un resultado tangible si la tarea lo permitía.
- [ ] Se ejecutaron o documentaron las pruebas apropiadas sin inventar resultados.
- [ ] Se registraron límites, costes y dependencias.
- [ ] Se escribió realmente `docs/OMEGA_MEMORY_CURRENT.md` o se reportó exactamente por qué no fue posible.
- [ ] Se comunicaron rama, commit y PR cuando existan.

## Invocación sugerida para Codex
«Activa omega-continuidad-memoria para 1UP Anime; toma el estado real del repositorio, ejecuta la siguiente tarea segura, y actualiza la memoria de proyecto antes de cerrar. Conserva el diseño elegido y presupuesto 0 USD.»
