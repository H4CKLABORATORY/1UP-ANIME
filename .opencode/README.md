# Equipo OMEGA para OpenCode — 1UP ANIME

Este directorio define un coordinador y cuatro especialistas para el runtime de agentes de OpenCode. Las definiciones son instrucciones persistentes; **no significan que los agentes estén ejecutándose ahora**. El agente principal debe invocarlos desde una sesión OpenCode compatible.

## Agentes
- `omega-lead`: coordinador principal, divide el trabajo, revisa e integra.
- `frontend-ux`: frontend, UI, PWA y compatibilidad móvil.
- `backend-catalog`: APIs, catálogo, SQLite e importación.
- `qa-security`: auditoría independiente y pruebas.
- `integration-docs`: continuidad, handoff y documentación.

## Activación sugerida
1. Abre OpenCode en la raíz del repositorio.
2. Actualiza el repositorio y confirma que trabajas sobre la rama correcta.
3. Selecciona `omega-lead` como agente principal.
4. Pide: `Lee .opencode/README.md y AGENTS.md, inspecciona el estado real y ejecuta el siguiente ciclo OMEGA`.
5. Para trabajos independientes, omega-lead puede delegar a los especialistas. Si el runtime no aísla worktrees, no permitas escritores concurrentes sobre archivos compartidos.

## Comando de trabajo
- `/omega-cycle`: ejecuta el siguiente ciclo OMEGA desde el agente `omega-lead`, con auditoría, delegación, pruebas y PR draft.

## Reglas de coordinación
- La fuente de verdad es GitHub: ramas, commits, PR, issues, Actions y archivos actuales.
- Los chats de ChatGPT no comparten automáticamente su memoria privada ni sus sistemas de archivos.
- Cada escritor tiene rutas propias; QA es solo lectura salvo autorización puntual.
- Integración en rama y PR. No auto-merge ni despliegue sin aprobación.
- Un ciclo solo se considera terminado con pruebas reproducibles y evidencia ligada a un SHA.
- El objetivo es terminar el producto, no mantener agentes ocupados ni crear actividad artificial.
