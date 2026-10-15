# ONEUP SELF HEALING ENGINE — mantenimiento y recuperación

Este proyecto usa GitHub Pages y GitHub Actions. El motor realiza comprobaciones programadas cada 4 horas; no existe un servidor permanente ni se supervisa cada segundo.

## Lo que funciona

- Revisión del HTML, JavaScript, JSON y estado de sincronización.
- Verificación HTTPS del sitio y de los catálogos, con tres intentos como máximo.
- Informes en data/guard/status.json y registro de 72 revisiones en data/guard/history.json.
- Alertas por incidencias repetidas mediante una única Issue de GitHub, si Issues está habilitado.
- Copias de seguridad en los artefactos de GitHub Actions por 21 días.
- Propuestas de reversión con pruebas antes de solicitar revisión. Nunca se fusionan automáticamente.
- PWA de Safari con caché separada por página y respaldo de datos cuando falle la red.

## Archivos del sistema

| Responsabilidad | Archivo |
| --- | --- |
| Diagnóstico | scripts/oneup-guard.mjs |
| Validador | scripts/check-guard.mjs |
| Notificador | scripts/guard-alert.mjs |
| Programación | .github/workflows/oneup-guard.yml |
| Estado y registros | data/guard/status.json, data/guard/history.json |
| Panel móvil | motor.html, motor.css, motor.js |
| Sincronización | scripts/dexter-anime-sync.mjs |
| Propuesta de reversión | .github/workflows/oneup-revert-proposal.yml |

## Cómo usar el panel desde iPhone

Abre https://h4cklaboratory.github.io/1UP-ANIME/motor.html . Muestra proveedores, registros, conteos y problemas reales obtenidos de datos públicos. Si quieres modificar un proveedor o forzar sincronización, utiliza el enlace a GitHub Actions y entra con una cuenta que tenga acceso. El panel de estado es público; nunca pongas contraseñas en los JSON.

## Cómo descargar un respaldo

En Safari abre GitHub → 1UP-ANIME → Actions → ONEUP Self Healing. En una ejecución busca Artifacts y descarga oneup-before-guard-N o oneup-health-N. Se retienen 21 días; para conservarlos más tiempo guarda una copia fuera de GitHub. El historial Git es un respaldo adicional.

## Cómo preparar una reversión segura

1. Identifica un commit defectuoso en el historial de GitHub y confirma un despliegue anterior correcto.
2. Abre https://github.com/H4CKLABORATORY/1UP-ANIME/actions/workflows/oneup-revert-proposal.yml
3. Elige Run workflow e introduce el SHA completo (40 dígitos hexadecimales) del commit defectuoso.
4. El flujo crea una rama de reversión y pasa las pruebas de interfaz y salud local.
5. Solo si las verificaciones pasan intenta crear una Pull Request. Nadie hace merge automáticamente.
6. Revisa la diferencia de archivos antes de aprobar. Ante conflictos, datos nuevos o más de un commit defectuoso, corrige manualmente. Una reversión Git no revierte Firebase.

## Detección de fallos y mantenimiento

Los niveles son ok, info, warning y critical. Si un mismo fallo se repite en controles consecutivos, se abre una incidencia para su análisis, siempre que los permisos de GitHub lo permitan. Si la API pública falla, el guardia no borra catálogos ni fuentes; conserva el último snapshot válido disponible.

Las actualizaciones de dependencias deben llegar mediante PR y ejecutar pruebas. JKAnime V2 se encuentra aislado y utiliza una versión compatible de Cheerio, pero su existencia no autoriza retransmitir sus videos. Los scripts de detección no copian servidores ajenos.

El reproductor propio solo acepta videos autorizados y cambia de alternativa si falla la carga. No permite concluir que una URL sea reproducible hasta que el elemento de video responda. La red social todavía requiere conectar Firebase y sus reglas desde la cuenta del propietario.

## Limitaciones

No se realiza modificación destructiva de producción, reversión automática ni despliegue de Firebase sin autorización. La supervisión sigue el cron de GitHub Actions, cuya ejecución puede retrasarse. Las pruebas de código y HTTP no reemplazan una prueba visual real en Safari de iPhone.
