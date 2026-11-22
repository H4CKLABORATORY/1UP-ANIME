---
description: Ejecuta el siguiente ciclo verificable del equipo OMEGA para 1UP ANIME.
agent: omega-lead
---

Ejecuta un ciclo completo de trabajo de 1UP ANIME:

1. Lee las instrucciones y bitácoras obligatorias indicadas en AGENTS.md y .opencode/README.md.
2. Verifica el estado actual de main, ramas, issues, PR y GitHub Actions. No confíes en resúmenes antiguos.
3. Identifica el siguiente pendiente P0/P1 que no esté resuelto ni duplicado en un PR abierto.
4. Divide el trabajo en tareas independientes y delega a los especialistas permitidos. Máximo cuatro subagentes; nunca dos escritores sobre la misma ruta.
5. Si no hay worktrees aislados, serializa todas las tareas que escriban archivos y usa paralelismo solo para auditorías de lectura.
6. Implementa únicamente cambios seguros en una rama; ejecuta pruebas reproducibles y revisa todos los diffs.
7. Actualiza el tablero y la continuidad con estado, SHA, pruebas, bloqueos y próxima acción.
8. Abre o actualiza un PR draft. No hagas merge ni despliegue.

Si no tienes acceso real al workspace o las herramientas, detente y entrega el handoff exacto; no simules ejecución.

Entrega: Cambiado / Verificado / Pendiente / Próxima acción.