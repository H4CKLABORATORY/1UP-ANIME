# DEXTER Motion Studio V2 — Cinematic Camera & 2.5D Depth

Fecha: 2026-10-20. Rama de desarrollo: feature/dexter-motion-studio-v2-camera-depth-20261020.

## Objetivo y alcance
Añadir perspectiva multicapa, transiciones de cámara y barridos de iluminación al estudio que ya funciona sin obligar a instalar Three.js/WebGL en teléfonos. Se mantienen el logo PNG original, el archivo de firma AAC y el exportador H.264/AAC Full HD. **La intro pública no se reemplaza.**

## Implementación
- Nuevo motor matemático \`motion-studio/camera.mjs\`: \`cameraRig(scene,time)\` y \`projectDepth(point,rig)\`; proyección pseudo-3D acotada y determinista.
- Tres rutas: **orbit** (órbita), **dolly** (push-in) y **glide** (travelling). Ninguna requiere sensores físicos ni acceso a recursos externos.
- Parámetro \`depth\` (0–1) y selector \`cameraPath\` en editor. Ambos sobreviven exportar/importar JSON de escena y funcionan en los renders de GitHub.
- Pétalos cambian tamaño/posición/opacidad según profundidad; anillos muestran distorsión óptica ligera; luz de escena sigue el barrido del rig.
- Compatibilidad con escenas V1: datos anteriores sin las dos propiedades reciben valores predeterminados; se conserva \`version:1\`.
- PWA incluye el módulo en caché, con versión de caché renovada.
- Tests unitarios del rig y tests Playwright de edición de parámetros en 390 px y 1366 px; workflow existente sigue validando prueba FFmpeg H.264/AAC y exportación de los 2 formatos.
- Sin bibliotecas visuales nuevas, sin navegación bloqueada, sin nuevo audio ni contenido externo.

## Calidad y límites
La composición es **2.5D/parallax** dibujada en Canvas 2D, no geometría poligonal 3D ni un reemplazo de After Effects. Diseño elegido para compatibilidad con Safari móvil y presupuesto de cero dólares. El render sigue siendo determinista entre vista previa y exportación. Los ajustes complejos pueden aumentar tiempo de codificación en GitHub, pero no alteran los requisitos de reproducción de episodios del sitio.

Mantener referencia: https://github.com/yihui-dev/awesome-opus5-5-videos, https://github.com/mrdoob/three.js, https://github.com/motiondivision/motion.

## Aceptación
1. Validar \`node --test tests/motion-studio.test.mjs tests/motion-studio-camera.test.mjs\`.
2. Verificar \`DEXTER Motion Studio · MP4 / QA\` y \`ONEUP Browser Acceptance\` (incluye viewport móvil).
3. Inspeccionar salida de artefactos reales de 16:9 y 9:16 tras merge. No afirmar MP4 nuevo hasta que termine el workflow.
4. Revisar Safari físico y aprobación visual del propietario. No reemplazar la intro visible sin revisar.

## Checkpoint
PR, SHA, CI y despliegue se registrarán aquí y en docs/PROJECT_CONTINUITY.md tras verificarse. El comportamiento anterior permanece en el historial de Git y los cambios nuevos se pueden revertir independientemente.


## Resultado de publicación y exportación
- PR [#66](https://github.com/H4CKLABORATORY/1UP-ANIME/pull/66) fusionado en main (squash `665ec5a3`).
- Todos los 14 workflows del PR: success.
- Workflow final [DEXTER Motion Studio MP4 / QA](https://github.com/H4CKLABORATORY/1UP-ANIME/actions/runs/39418935821) **success**, [artefacto MP4 16:9 + 9:16](https://github.com/H4CKLABORATORY/1UP-ANIME/actions/runs/39418935821/artifacts/12263426712). Expira 2026-11-03.
- Registro FFprobe: 1920×1080 / 1080×1920, H.264 + AAC, 30 fps, 3,2 segundos. Peso ZIP 2.856.957 bytes.
- [GitHub Pages](https://github.com/H4CKLABORATORY/1UP-ANIME/actions/runs/39418935619): deployment successful. Editor en https://h4cklaboratory.github.io/1UP-ANIME/dexter-motion-studio.html.
- Prueba Safari física y validación visual del propietario pendientes. No se reemplaza intro de producción.
