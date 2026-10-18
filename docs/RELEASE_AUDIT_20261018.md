# Auditoría inicial de lanzamiento — 2026-10-18

**Alcance:** inspección remota de GitHub en `main` (0198e207bf48dea21a9138c85a7d029e34ec4a0f). Sin checkout local ni navegador; **no se ejecutó una batería de CI ni E2E**. El árbol remoto es una instantánea, no prueba que un checkout local esté limpio. El repositorio incluye  archivos de código, configuración y medios; la consulta de árbol recursivo informó `truncated: false`.

## Hallazgos con evidencia

| Área | Evidencia concreta | Estado |
| --- | --- | --- |
| Catálogo | `scripts/refresh-catalog.mjs`, `data/catalog.json`, `data/airing.json` presentes; AniList/Jikan mencionados en README y código | IMPLEMENTADA PERO NO VERIFICADA |
| Fuentes autorizadas | `data/licensed-media.json` contiene `"entries": {}`; `scripts/media-source-contract.mjs` valida URL, MIME y declaración de derechos, pero una cadena `rights` **no demuestra** licencia | BLOQUEADA POR CONTENIDO AUTORIZADO |
| Reproductor | `episode-player.js`, `hls-adapter.js` y pruebas dedicadas presentes | IMPLEMENTADA PERO NO VERIFICADA |
| Subtítulos | `scripts/video_a_subtitulos.py` usa faster-whisper y Argos localmente; no se comprobó transcripción real, límites de archivo, revisión editorial ni prueba E2E | INCOMPLETA |
| Login Google | `auth-config.js` y `firebase-config.js` establecen `window.ONEUP_FIREBASE_CONFIG = null` | BLOQUEADA POR CONFIGURACIÓN |
| Comunidad | `social-config.js` y `supabase-config.js` en null; `firestore.rules` deniega escrituras directas y permite ciertas lecturas moderadas | BLOQUEADA POR SERVICIO/PRUEBAS |
| Depth Mode | `tests/depth-mode.spec.js` asumía botón visible sin abrir menú y fijaba OFF en localStorage, sin comprobar el nuevo valor inicial ni persistencia | PRUEBA DEFECTUOSA — corregida en esta rama, ejecución pendiente |
| Despliegue | `.github/workflows/deploy-pages.yml` dispara en push a main; este PR no despliega por sí mismo | CONFIGURADO, SIN PRUEBA DE ESTE CAMBIO |
| Documentación | `README.md` aún describe Pages como «Deploy from a branch», pese al workflow de Pages por Actions | DESACTUALIZADA — corregida en esta rama |

## Riesgos y bloqueos

- **P0:** comprobar permisos reales de reproducción antes de habilitar fuentes; metadatos de AniList/Jikan no autorizan vídeo.
- **P0:** ejecutar pruebas con navegador real, especialmente Safari iPhone; los tests de Depth Mode requieren el menú dinámico.
- **P0:** verificar reglas efectivamente desplegadas, App Check, autenticación, moderación y permisos del backend antes de activar comunidad.
- **P1:** completar validación de entradas, errores de red, vacíos, cancelación y cuota para transcripción local; no afirmar que existe un backend de transcripción desplegado.
- **P1:** validar caché, timeout, rate limits y esquema del catálogo con pruebas reproducibles.
- **P1:** revisar las PR abiertas antes de fusionar; la consulta GitHub devolvió 22 PR abiertas, entre ellas #38 (scraping de metadatos), #39 (catálogo externo), #40 (diseño), #18–20 (cadena de bases distintas), #10 (reproductor HLS). No se fusionó ni cerró ninguna. Riesgo de divergencia entre ramas y de autorizaciones de terceros.
- No se observó contenido de secretos privados en los archivos de configuración inspeccionados; **no se ha auditado cada byte del repositorio ni los secretos del proveedor**.

## Validaciones pendientes

Ejecutar en checkout limpio con Node y dependencias instaladas:
```sh
npm install
npx playwright install chromium
npm run test:depth
node scripts/test-media-source-contract.mjs
node scripts/test-episode-player.mjs
node scripts/check-resilience.mjs
```

No declarar «PASS» hasta registrar salida, código de retorno y entorno. Además comprobar producción, estados offline, contenido vacío y móvil físico. Sin permisos de servicio y archivos de medios licenciados no es posible acreditar E2E de login, comunidad, vídeo y subtítulos.

## Próximas fases

1. Validar esta regresión de Depth Mode y corregir problemas detectados sin tocar otras funciones.
2. Ampliar auditoría de rutas de backend, reproductor, subtítulos y pruebas con ejecución local/CI.
3. Integrar validación de configuración y pruebas de errores con evidencia.
4. Completar contrato de fuentes y pruebas de metadatos, conservando AniList/Jikan.
5. Diseñar flujo seguro y revisable de subtítulos locales/autorizados.
6. Validar accesibilidad y release en escritorio, Android y Safari iPhone.
7. Actualizar continuidad y README por fase, abrir revisiones independientes cuando corresponda.

**Criterio:** esta auditoría es un diagnóstico parcial basado en archivos; no certifica lanzamiento.
