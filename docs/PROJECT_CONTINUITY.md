# 1UP ANIME — Estado y continuidad del proyecto

**Última revisión editorial:** 2026-10-15
**Fuente de verdad:** este repositorio GitHub, rama `main`. 
**Objetivo:** desarrollar por etapas una experiencia de anime original, móvil primero, que conserve el trabajo existente y permita agregar módulos sin rehacer el sitio.

## INSTRUCCIÓN CRÍTICA PARA FUTURAS SESIONES

1. Leer `AGENTS.md` y este archivo **antes de editar código**.
2. Leer solo los módulos involucrados en la nueva petición y sus dependencias, no recorrer todo el proyecto desde cero salvo que exista un cambio arquitectónico importante.
3. Comprobar cambios nuevos desde el último commit; trabajar sobre el estado actual, nunca sobrescribir archivos completos con una maqueta anterior.
4. Agregar a «Bitácora» lo realizado, resultado de pruebas y siguientes pasos, con fecha.
5. Para cambios de estética grandes, usar una rama/PR, comparar desktop/iPhone y no tocar producción sin verificar.
6. Separar estrictamente lo **implementado**, lo **no verificado** y lo **planeado**.

## Estado observado en GitHub

- Proyecto ya existente, con GitHub Pages y PWA: `index.html`, `manifest.webmanifest`, `sw.js`.
- Catálogo de anime (en código y README): AniList como principal, Jikan como respaldo, snapshots de datos; hay pantallas de búsqueda, tendencias, temporada, programación y películas.
- Diseño actual: `studio.css`, `spotlight.css`, `motion.css`, `brand-v2.css`, `themes/kokomi-studio/`, `themes/october-2026/`. **No borrar ni reemplazar indiscriminadamente**. Revisar cascada CSS y viewport.
- Perfil/inicio de sesión: `auth.js`, `auth-config.js`, `firebase-config.js`; Google pendiente de configuración del propietario según README.
- Comunidad/comentarios: `comunidad.html`, `community.js`, `social-backend.js`, `episode-comments.js`, reglas Firestore; verificar backend real antes de afirmar sincronización.
- Fuentes y reproductor: `external-providers.js`, `player.css`, `motor.html`, `integrations/`; proveedores externos son enlaces de catálogo, no garantía de video incrustable.
- Salud/autorecuperación: `docs/ONEUP_SELF_HEALING.md`, `.github/workflows/`, `scripts/` y estado en `data/guard/`. Los chequeos programados NO equivalen a disponibilidad continua.
- Dirección artística ya documentada en `docs/ART_DIRECTION_CINEMATIC_2026.md`; exige validación visual previa a rediseños importantes.

**Importante:** las características descritas arriba se identificaron revisando archivos/documentación. No equivalen a una prueba funcional de producción ni de Safari real.

## Trabajo de diseño iniciado en la conversación del 15/10/2026

Se creó un prototipo separado llamado **Nebula UI 0.2** con portada cinematográfica, hero de dos columnas, carteles SVG originales, quick links, 23 rutas de demostración, comentarios locales por episodio, selección de episodios, proveedores modulares de demostración, iconos PWA y seguimiento local.
Su código está en el artefacto **`1UP_ANIME_MASTER_V0.2.zip`** entregado en la conversación, **NO se ha fusionado con este repositorio**, pues la base real de GitHub ya dispone de más funciones y no debe ser degradada.
Prueba automatizada del prototipo: navegación de 23 rutas, favoritos y comentarios locales, menú móvil 390 px, cero errores JS en Chromium con recursos inyectados. No se ha probado el despliegue HTTPS ni Safari iOS.
**Acción correcta:** estudiar qué componentes visuales conviene portar en forma de CSS y plantilla reversible al repositorio real, manteniendo catálogo y comunidad actuales.

## Próximas fases (orden de implementación)

### Fase A — Interfaz y diseño visual (PR independiente)
- Comparar visualmente producción con prototipo Nebula y la dirección artística de octubre.
- Elegir y aprobar composición para escritorio e iPhone, sin copiar marcas de streaming.
- Consolidar capas de CSS existentes y minimizar conflicto de temas.
- Optimizar hero, navegación táctil, posters y formularios; respetar movimiento reducido.
- Pruebas de rutas principales y validación Safari con dispositivo.

### Fase B — Catálogo y fichas
- Confirmar AniList/Jikan/fallback y frescura/atribución de datos.
- Unificar mapeo de temporada/episodio entre fuentes.
- Filtros, géneros, películas, buscador y caché robusta sin crear datos falsos.

### Fase C — Reproducción y módulos
- Definir contrato de proveedores con capacidades, error handling y verificación de URL.
- Distinguir link a proveedor de streaming, embed autorizado y video propio MP4/HLS.
- Agregar subtítulos y disponibilidad real por dispositivo.
- BitTorrent, si se estudia, solo como módulo opcional de contenido con distribución autorizada; iPhone necesita motor externo para torrents, no se garantiza streaming P2P nativo.

### Fase D — Datos de usuario y comunidad
- Configuración controlada de Firebase, reglas seguras y pruebas con cuenta de test.
- Sincronización de progreso y favoritos cuando esté implementada, controles de privacidad y moderación.
- No tratar `localStorage` como cuenta en la nube.

### Fase E — Lanzamiento
- Auditoría performance/CWV, accesibilidad, errores y permisos.
- Revisar GitHub Actions, rollback, snapshots y despliegue de Pages.
- Validar reproducción y autenticación en Safari de iPhone y escritorio.

## Bitácora
- **2026-10-15 — integración aceptada:** PR [#12](https://github.com/H4CKLABORATORY/1UP-ANIME/pull/12) fusionada en `main` (squash `4c55da0c0e9803cc6bfbeb151e19b3fb2765db21`). Pasaron las **cinco** verificaciones automáticas: HLS, contrato multimedia, interfaz, Supabase opcional y navegación Chromium. No se ejecutó Safari físico ni prueba de streaming real. Manifiesto de videos continúa vacío; la actualización de GitHub Pages no quedó comprobada desde esta sesión.
- **2026-10-15 — integración de módulos de reproducción:** rama `feature/oneup-stream-platform-integration-20261015` a partir de `main`. Se conectó un reproductor por episodio con hasta siete posiciones declaradas, HLS nativo/MSE, conversación sincronizada, contrato del motor de fuentes y backend opcional de Supabase (desactivado). Se conservaron los CSS de diseño y compatibilidad Safari. Se añadieron comprobaciones de navegador, HLS, fuentes y backend. **Sin videos reales, sin migración de usuarios, sin modificación de `main`**. Revisar la PR y resultados de GitHub Actions. Guía: `docs/INTEGRACION_STREAMING_1UP_2026.md`.
- **2026-10-15:** Identificado repositorio real `H4CKLABORATORY/1UP-ANIME`; se decidió no sobreescribirlo con un prototipo estático más simple. Creada guía de continuidad para empezar siguientes turnos por el último estado; prototipo visual independiente probado. **Sin cambios desplegados en estética de producción.**

## Formato de actualización recomendado
Al concluir cada trabajo agregar:
```
### AAAA-MM-DD — título
- Archivos modificados:
- Qué quedó implementado:
- Pruebas ejecutadas y resultados:
- Pendiente / limitaciones:
- Próxima tarea concreta:
```

### 2026-10-16 — OMEGA SWARM primer ciclo real
- Base main `85ef098`; leídos misión PR15 e issue16; preservado PR14 Kokomi (12 archivos aditivos, sin integrar ni rehacer).
- Corregidos lifecycle HLS/MP4/WebM al cambiar anime, respuestas tardías de navegación y duplicación/aislamiento de comentarios. Workflow Firebase restringido a main; sin ejecutarlo.
- Regresiones nuevas conectadas a UI Quality y Browser Acceptance. PASS: UI 149 assertions, resiliencia, HLS, contrato multimedia, Supabase opcional, lifecycle, navegación, comentarios Chromium; E2E 36/36 móvil 390×844 y desktop 1360×860, cero errores JS. Capturas disponibles como artefactos del workflow de navegador cuando finalice CI.
- Seis subagentes reales con archivos diferenciados. Detalle de hallazgos, prioridades y SHAs: `docs/OMEGA_AUDIT_20261016.md`; seguimiento `docs/OMEGA_SWARM_BOARD.md`.
- No hay medios licenciados configurados, autenticación/comunidad remota comprobada, Safari físico, aprobación visual, merge ni despliegue. Próxima tarea: unir preview Kokomi al motor de main sin degradar HLS, siete posiciones e idiomas.

### 2026-10-16 — reproducción gratuita como prioridad
- Decisión del propietario: priorizar ver episodios gratis dentro de 1UP. Arquitectura detallada en `docs/FREE_STREAMING_ARCHITECTURE.md`: catálogo separado de disponibilidad, proveedores/archivos/CDN intercambiables, sin cuenta obligatoria, sin contratar infraestructura.
- Rama `feature/free-streaming-foundation-20261016` depende del arreglo de PR17; no se fusionó PR17.
- Se recuperan únicamente los archivos aditivos de preview PR14, conservando main. Preview Kokomi reutiliza motor HLS actual; selección de temporada, episodio, idioma y siete posiciones reales. Subtítulos y calidad por fuente con herencia del episodio. No se importan datos antiguos ni se reemplaza index.
- Pruebas del motor, contrato, HLS, navegador de idiomas y navegación general; evidencia final de CI en PR de este ciclo. Ningún fixture se incorpora al manifiesto público.
- Siguen pendientes medios reales, backend, Safari físico, comparación visual completa y aprobación de producción. La arquitectura no convierte metadatos en videos ni declara terminado el catálogo reproducible.
- Resultado local de este ciclo: PASS UI149, resiliencia, contrato, HLS, Supabase opcional, navegación4, idiomas navegador4, preview Kokomi18 (390/1366) y recorridos generales36 (390/1360). Captura móvil del reproductor revisada: controles dentro del ancho y estado sin medios explícito; no equivale a fidelidad visual certificada.

### 2026-10-16 — recuperación de marca y decisiones anteriores
- Petición: incorporar el logo elegido y el trabajo de conversaciones anteriores sin confundir versiones. No existe acceso directo a otros chats; se revisaron repositorio, ramas, historial GitHub y archivos accesibles. Tres agentes reales investigaron procedencia, diseño y continuidad; QA validó implementación.
- Nuevo registro `docs/PROJECT_DECISIONS.md`: identifica fuentes verificables, marca vigente, recursos históricos y material faltante. AGENTS enlaza el registro para próximas sesiones.
- `assets/oneup-crest.svg` es la marca vigente (8ded1d8/be252a9), ya derivada en iconos PWA. No se encontró evidencia suficiente de que sea el adjunto favorito de otro chat. No se diseñó ni sustituyó el logo ni se regeneraron iconos.
- Corrección en preview Kokomi: emblema visible en cabecera móvil y menú lateral; espaciado responsive y enlace de inicio accesible. Se preservan diseño, temas, audio optativo, reproductor y rutas existentes.
- Rama `design/brand-continuity-20261016`, dependiente de PR18; sin merge ni producción. Prueba de logo en 320/375/390/1366 y suite Kokomi en CI; resultado final adjunto al PR.
- Pendiente: recibir original/descripción o ubicación del logo elegido para identificarlo con certeza. ZIP Nebula de otra conversación tampoco está disponible; no recrearlo ni reemplazar main por memoria.
- Verificación local final: 22/22 pruebas Kokomi PASS (incluye 4 casos de branding 320/375/390/1366, HTTP200/naturalWidth SVG, sin solapamiento, drawer→inicio), UI149 y resiliencia PASS; sintaxis y diff check correctos. Ocho capturas de marca generadas para artefactos CI.


### 2026-10-16 — Continuación del diseño Codex: aislamiento PWA y ranking
- Preferencia expresada por el propietario: la propuesta más reciente de Codex es la base visual preferida. Conservar PR #19 sobre #18 y #17; no volver a un rediseño anterior.
- Rama apilada `fix/codex-pwa-popularity-20261016` / PR #20, basada en `design/brand-continuity-20261016`. `main` no modificado.
- `sw.js`: el worker ahora elimina exclusivamente cachés que empiezan por `oneup-stream-integrated-`, no las de otras aplicaciones del mismo origen. La lectura offline también utiliza esa caché, evitando cruzar respuestas almacenadas por otra PWA.
- `studio.js`: `POPULARITY_DESC` utiliza el grupo `popular`; cuando el snapshot antiguo aún no lo incluye, se consultan las APIs en vez de etiquetar `trending` como popularidad. Los filtros priorizan el grupo del orden solicitado.
- `scripts/refresh-catalog.mjs`: generará el grupo `popular` en la próxima actualización; no se modificó artificialmente `data/catalog.json` ni se afirmó una actualización nueva del catálogo.
- Pruebas añadidas: `scripts/test-cache-catalog.mjs` y workflow `ONEUP Codex Cache and Catalog Regression`, además de tests existentes del sitio, navegador y motor de episodios. Revisar el último SHA y workflow antes de declarar aceptación.
- Pendiente: cadena de PRs #17→#18→#19→#20 sin fusionar; aprobación del despliegue, medios autorizados reales, Firebase/Supabase, Safari físico y verificación final de los interiores Kokomi.


### 2026-10-16 — Motor de fuentes multilingüe y seguridad aplicada (PUBLICADO EN MAIN)
- Commit merge `87de20605e2d51c34689824d3691a1cee0762f27`, PR [#23](https://github.com/H4CKLABORATORY/1UP-ANIME/pull/23), basado en diseño Kokomi de Codex.
- Motor en `episode-player.js`: hasta 7 slots, MP4/WebM/HLS y pistas múltiples WebVTT; después de fallo aparece un botón opcional para probar otro servidor *declarado y válido*. No se realizan conexiones automáticas a otros proveedores.
- Verificación más estricta para URLs HTTPS públicas; rechaza hosts internos, IP literal, credenciales, fragmentos y puertos ajenos a 443; MIME declarado se comprueba.
- Contrato `scripts/media-source-contract.mjs` normaliza pistas; regresiones en `scripts/test-episode-player.mjs` y `scripts/test-media-source-contract.mjs`.
- Infraestructura opcional `infra/nginx/oneup-media-origin.conf.example` (NO desplegada), ejemplo de catálogo `examples/licensed-media.example.json`, instrucciones `docs/STREAMING_IMPLEMENTATION.md`.
- CI del head `a5beeb7`: `ONEUP Kokomi Visual Acceptance`, `ONEUP Browser Acceptance`, `One Up UI Quality`, `1UP HLS browser compatibility` y `1UP media source contract` = **success**.
- Estado real: el manifiesto público `data/licensed-media.json` continúa vacío, por lo tanto no existe reproducción de episodios reales. GitHub Pages sigue siendo hosting estático.
- Logo sonoro MP4: PR #22 de código aún abierto como borrador, activos MP4/JPG/PNG pendientes de subida a `assets/` por limitación de transferencia binaria desde el conector. No afirmar que está publicado.
- Próxima tarea: comprobar resultado de despliegue GitHub Pages, agregar primer episodio con permiso si existe, probar reproducción real en Safari/Android y cerrar subida del logo original.
