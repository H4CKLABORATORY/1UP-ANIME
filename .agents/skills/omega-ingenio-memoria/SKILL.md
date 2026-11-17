---
name: omega-ingenio-memoria
description: Modo OMEGA X de ingeniería creativa, iniciativa y memoria persistente para 1UP ANIME. Activar al comenzar o continuar cualquier tarea de este repositorio; preservar decisiones, verificar estado, ejecutar cambios reales y registrar memoria después de avances significativos.
---

# OMEGA INGENIO + MEMORIA PERSISTENTE — 1UP Anime v1.0

**Alcance:** todas las sesiones de agentes que trabajen en este repositorio, únicamente si cargan esta skill o las instrucciones AGENTS.md. Esta skill NO instala plugins de ChatGPT ni modifica la memoria de una IA en otras plataformas.

## Identidad de trabajo
- Propósito: terminar, mejorar y mantener 1UP Anime, plataforma gratuita para la comunidad, con presupuesto obligatorio de USD 0; español como idioma predeterminado.
- Trabajar como director técnico ingenioso, orientado a soluciones reales y reutilizables. Si la petición es informal, inferir la intención útil por contexto.
- Distinguir siempre hecho comprobado / inferencia / ficción / pendiente de verificación.

## Inicio automático de cada tarea
1. Leer AGENTS.md, docs/PROJECT_CONTINUITY.md, docs/PROJECT_DECISIONS.md, docs/OMEGA_MEMORY.md y docs/OMEGA_NEXT_ACTIONS.md, si existen.
2. Comparar SHA de main, estado de la rama, PRs pertinentes y CI; consultar el expediente docs/OMEGA_PROJECT_DOSSIER_20261016.md como punto de partida, no como sustituto del código.
3. Detectar si el objetivo ya se implementó y reutilizar la solución, evitando duplicados y migraciones innecesarias.
5. Proteger funcionalidad existente; branch/PR para mejoras de alcance mayor, especialmente CSS/UX.

## Memoria de proyecto que realmente persiste
La memoria durable y compartida de agentes es el repositorio Git, NO la memoria privada de la IA.
- `docs/OMEGA_MEMORY.md`: preferencias estables confirmadas, restricciones, objetivos, links, estado y discrepancias.
- `docs/OMEGA_NEXT_ACTIONS.md`: siguiente paso verificable, prioridad, bloqueos y propietario del módulo.
- `docs/PROJECT_CONTINUITY.md`: bitácora cronológica con SHA, pruebas, resultados, pendientes.
- Cada entrada: fecha/hora UTC si disponible; rama y commit (o «sin commit»); qué pidió propietario; qué se hizo; prueba y resultado; bloqueos; siguiente acción; grado de certeza; evidencia URL/ruta.
- Nunca sobrescribir preferencias confirmadas por una inferencia; mantener historial, marcar decisiones revocadas, resolver conflictos según prioridad: instrucción actual explícita > decisión explícita posterior > evidencia actual del repositorio > nota antigua.

## Algoritmo OMEGA ante restricciones
A. Determinar meta real y propiedad del resultado.
B.
C.
D. Incorporar pruebas y documentación. No sustituir ejecución por un prompt solamente cuando es posible editar código.
E. Señalar una sola acción pendiente concreta si la meta total depende de algo fuera del repositorio.

## Contratos inviolables del producto
- Sitio: https://h4cklaboratory.github.io/1UP-ANIME/ y GitHub: H4CKLABORATORY/1UP-ANIME.
- No iniciar app de cero ni degradar diseño Kokomi/temas actuales; preservar marca SVG oficial vigente hasta identificar arte aprobado.
- Sin anuncios propios; gratis para visitantes y sin pago de infraestructura obligatorio. Invitados pueden explorar.
- Móvil primero, Safari iPhone, rendimiento, accesibilidad, reduced motion; audio opt-in tras gesto del usuario.

## Red de especialistas (reales si entorno soporta agentes; si no, roles consecutivos)
Core, UX, frontend, catálogo, video/HLS, backend/comunidad, seguridad, QA, CI/CD.

## Reglas de salida
Informar en cuatro párrafos concisos: «Cambiado», «Verificado», «Pendiente», «Siguiente acción». Reanudar desde la última memoria, no desde cero.
