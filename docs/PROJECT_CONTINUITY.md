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


### 2026-10-16 — Logo animado y firma sonora originales publicados desde PR #24
- **El propietario eligió como identidad oficial** el video original `1UP_ANIME_INTRO_FIRMA_3SEG.mp4` (3,2 s, H.264 y AAC), no un diseño PNG alternativo.
- El ZIP `1UP_ANIME_LOGO_MP4_SONIDO_PARA_GITHUB.zip` se transferió directamente desde la sesión a GitHub Actions utilizando un enlace temporal, y el workflow verificó SHA-256 de ZIP y archivos originales antes de guardar tres binarios en `assets/`.
- Publicado vía [PR #24](https://github.com/H4CKLABORATORY/1UP-ANIME/pull/24), merge `e4a8ef9d85a0bf762c88ff23502e062d6b2cbfd6` sobre el `main` actualizado. [PR #22](https://github.com/H4CKLABORATORY/1UP-ANIME/pull/22) cerrado como reemplazado, sin fusionar conflictos.
- Activos: `assets/1up-anime-intro-firma-3seg.mp4` (1.626.365 bytes), `assets/1up-anime-logo-poster.jpg` (182.083 bytes), `assets/1up-anime-app-icon-512.png` (192.439 bytes).
- Integración en `index.html` y `preview-kokomi-mobile.html`: logo animado sin audio automático, botón ♫ para escuchar la firma tras pulsar, fotograma original en menú móvil, nuevo favicon e icono PWA. Con movimiento reducido se usa imagen estática. En modo offline no se fuerza descarga del MP4.
- CSS/JS: `themes/kokomi-mobile-preview/brand-signature.{css,js}`; validación `scripts/verify-video-logo.mjs`. `sw.js` incrementa su versión; cachea icono/fotograma, no el MP4 completo.
- Seis suites de GitHub Actions en verde en commit de release: logo MP4, Kokomi móvil/escritorio, navegación, interfaz, HLS y contrato de caché/catálogo.
- Todo conserva el motor de streaming y los límites de fuentes existentes; `data/licensed-media.json` sigue sin episodios.

### 2026-10-16 — Adaptador Anime1v (FxxMorgan), pendiente de configuración externa
- Repo upstream verificado: FxxMorgan/anime1v-api (Node.js; MIT del software, no de episodios). Usa X-API-Key, expone búsqueda/catálogo además de resolutores no habilitados en 1UP.
- Rama: feature/anime1v-safe-integration-20261016. Módulos: functions/anime1v-adapter.js, nueva función Firebase anime1vDiscovery en functions/index.js, anime1v-discovery.js/css, data/anime1v-config.json, pruebas y docs/ANIME1V_INTEGRATION.md.
- La integración de información está desactivada hasta configurar una URL HTTPS real de Cloud Function, servidor Anime1v y clave secreta. La API key nunca aparece en JS público.
- No se conectaron /episode, /resolve ni /download porque no se han acreditado fuentes autorizadas. data/licensed-media.json sigue con entries vacío; no afirmar que hay anime reproducible.
- Mantener diseño Kokomi, logo original animado y reproductor actual. Revisar CI y realizar prueba real una vez exista backend.


### 2026-10-16 — Intro cinematográfica independiente antes del sitio
- El propietario corrigió el comportamiento: el logo original MP4 con sonido debe aparecer **a pantalla completa antes de la página**, como entrada de una plataforma audiovisual, no reproduciéndose dentro del encabezado.
- Nueva rama `feature/netflix-style-opening-20261016`: `themes/kokomi-mobile-preview/opening.js/css`; `index.html` y `preview-kokomi-mobile.html` muestran presentación previa de `assets/1up-anime-intro-firma-3seg.mp4` de 3,2 s.
- El autoplay es silenciado debido a restricciones iOS; tocar «Reproducir con sonido» reinicia el video con audio original. Hay «Omitir intro», salida al finalizar, fallback de poster y tiempo máximo por fallos.
- Una vez por sesión de navegador, sin volver a mostrarla con cada recarga; query `?intro=1` reproduce la entrada para probarla de nuevo. `prefers-reduced-motion` muestra poster y entra rápidamente.
- Se retiró la carga del módulo `brand-signature.js/css` de las páginas: la película ya no se muestra dentro de la cabecera, que conserva la navegación y la marca estática.
- `sw.js` versión de cache actualizada con CSS/JS de intro; no precachea el MP4.
- Tests Playwright en `scripts/e2e-kokomi-preview.mjs`, `scripts/e2e-browser.mjs`; **confirmar los resultados CI antes de la publicación**, no inferir éxito.


### 2026-10-16 — Actualización final solicitada: intro de entrada sin controles
- El propietario pidió eliminar "Omitir intro" y el botón de sonido. Se publicó via [PR #28](https://github.com/H4CKLABORATORY/1UP-ANIME/pull/28), commit merge `f7ec6741840aead976993a3826ee92b1198c3c57`.
- Al entrar por primera vez en la sesión aparece el MP4 original a pantalla completa; desaparece automáticamente al terminar. `?intro=1` permite volver a verlo para pruebas.
- Se intenta audio autoplay inmediatamente, pero Safari/iOS y navegadores con la política de reproducción automática audible pueden rechazarlo. Si lo rechazan, se reproduce sin sonido y la página sigue sin bloquearse. No se puede prometer ni forzar sonido sin gesto del visitante.
- No hay controles de intro y se retiró el logo animado de dentro de la cabecera. La cabecera conserva navegación y marca estática.
- Pruebas: cinco workflows en verde para la rama de PR #28 y `ONEUP Browser Acceptance` / `One Up UI Quality` / GitHub Pages en verde tras merge a main.
- Workspace `Douglas's workspace` confirmado; servicio Render `oneup-anime-discovery` creado (servicio `srv-db9e4lom7kps73d1n7ig`), deploy `dep-db9e4m8m7kps73d1n8pg` en estado live. Por ahora devuelve metadatos Jikan como fallback; la API Anime1v de FxxMorgan no está instalada/configurada en el servidor y no hay streams habilitados. Código de gateway en PR #29 para revisión.


### 2026-10-17 — Intro móvil 9:16, logo estático y catálogo Render activo
- Solicitud del propietario: subir a la web pública el nuevo logo estático de **solo letras** (el logo cromado azul/rojo aprobado), animación vertical 9:16 en iPhone sin las franjas negras del MP4 16:9 y utilizar el workspace Render confirmado para la búsqueda.
- PR [#30](https://github.com/H4CKLABORATORY/1UP-ANIME/pull/30), rama `release/vertical-intro-render-catalog-20261017` basada en main; no afirmar desplegado hasta que se fusione y GitHub Pages confirme éxito.
- Assets transferidos de la conversación a GitHub con verificación SHA-256: `assets/oneup-header-letters.png` (PNG transparente 2172×724), `assets/oneup-poster-portrait.png` (PNG 941×1672), `assets/oneup-intro-portrait-9x16.mp4` (H.264 720×1280 + AAC, 3.2 s). El nuevo video es una **animación de zoom cinematográfico sobre el arte vertical** usando el audio de la intro original; el clip horizontal original se conserva sin cambios para desktop. No describirlo como la animación original reencuadrada plano por plano.
- `themes/kokomi-mobile-preview/opening.js` selecciona MP4 vertical real solo en teléfonos retrato; `opening.css` lo llena con `object-fit:cover`. No hay botón de saltar intro. Safari puede bloquear reproducción audible.
- `index.html`, vista previa y `theme.js` reemplazan crest y letras viejas por la marca cromada estática sin animación en header/drawer/footer. CSS aislado en `themes/kokomi-mobile-preview/official-textmark.css`.
- `data/anime1v-config.json` activa el servicio público Render `https://oneup-anime-discovery.onrender.com/anime1vDiscovery` para **metadatos de búsqueda Jikan fallback**. El backend FxxMorgan upstream no está configurado; `anime1v-discovery.js` muestra el origen real y nunca afirma que haya streaming. Se guardan en este PR la copia del gateway Node `render/anime1v-gateway.js` y smoke tests.
- El sitio sigue siendo GitHub Pages para frontend con Render free para búsqueda; el manifiesto de reproducción autorizada sigue vacío. **No declarar que los episodios de anime están disponibles para ver.**
- Validación: workflow de assets genera 9:16 con checksum y audio AAC; Playwright compara 320,375,390 y 1366 px, revisa identidad del header y respuesta mock de Render; workflow de publicación valida el endpoint /health real. Registrar resultados finales antes de fusionar.


### 2026-10-17 — Reparación cierre iOS de ficha de anime Overgeared
- La grabación y captura enviadas por el propietario muestran que el diálogo de Overgeared se cierra al tocar X pero se puede reabrir inesperadamente tras el toque, dando sensación de bloqueo.
- PR #31, rama `fix/iphone-detail-close-20261017`, modifica `index.html`, `studio.js`, `spotlight.css`, `sw.js` y `scripts/e2e-browser.mjs`.
- La X es ahora el primer hijo **estable** del `<dialog>`, ya no se mueve a `.oneup-detail-content` cuando cambia el anime. Área táctil sticky 48 × 48 px, `touch-action: manipulation`.
- `pointerdown` de respaldo solo cierra si otra capa capturó exactamente las coordenadas de X; al tocar el botón se cierra mediante `click` nativo. Bloqueo de clics fantasma de tarjeta por 450 ms; al salir se limpia `state.active`.
- Regresión Chromium Playwright de 390 px móvil y escritorio: Overgeared abierto/cerrado 3 veces, X visible e identificada por `elementFromPoint`, diálogo permanece cerrado, estado activo se limpia, Escape sigue funcionando.
- CI para SHA de implementación `ecf627f`: `ONEUP Browser Acceptance`, `One Up UI Quality`, `ONEUP Codex Cache and Catalog Regression` y `1UP HLS browser compatibility` **success**. Esto no equivale a validación en Safari físico; el video del usuario documenta el defecto anterior.
- Versión de cache PWA `v26-iphone-modal-dismiss-20261017` para recibir actualización. Comprobar GitHub Pages tras merge y que Safari refresque.


### 2026-10-17 — Intro V2 editable y estudio V3, pendiente de personajes auténticos
- Se inspeccionó el material local de autor: `1UP_ANIME_INTRO_CINEMATOGRAFICA_V2_EDITABLE.zip`, que contiene composiciones MP4 de **1080×1920 móvil** y **1920×1080 escritorio**, 3,2 s, H264/AAC original copiado bit a bit, editable Python/scene.json/AfterEffects JSX y capturas. `QA_RESULTS.json` confirma SHA256 AAC idéntico; los archivos **V2 no se copiaron a GitHub** ni sustituyen la intro publicada.
- Se investigaron términos de reutilización de imágenes oficiales. Toei prohíbe copiar y publicar personajes libremente en webs personales; no se usó arte oficial sin autorización ni personajes nuevos de IA. Fuentes: https://www.toei-animation.com/copyrights/ y https://www.toei-animation-usa.com/faq.html
- PR #32 **fusionado en main** (`feature/cinematic-motion-layers-v3-20261017`; merge `0c1aa1a10c792c1895e4830ecd6b596480523147`): se añadió `preview-cinematic-v3.html`, `themes/cinematic-v3/studio.css`, `studio.js`, y `characters.json` (vacío para recursos pendientes de autorización). Es una **vista de estudio no destructiva**: nuevos Canvas de chispas, rayos, pulsos, destellos y capas CSS independientes, logo original, audio original de `assets/1up-anime-intro-firma-3seg.mp4`.
- `scripts/e2e-cinematic-v3.mjs` comprueba móvil, desktop y modo de movimiento reducido, sin caracteres no autorizados, con capturas por CI. Archivo de derechos y criterios: `docs/CINEMATIC_V3_STUDIO.md`.
- **No declarar V3 MP4 renderizada**, ni Safari físico, ni personajes oficiales integrados, ni intro pública reemplazada. Próximos pasos: CI, revisión visual de capturas, publicar solo vista preview si aprueba, obtener permisos/cutouts reales y después componer y exportar V3 final con AAC original.

- CI aceptada para código V3: [ONEUP Cinematic V3 Preview](https://github.com/H4CKLABORATORY/1UP-ANIME/actions/runs/39049402608), [UI Quality](https://github.com/H4CKLABORATORY/1UP-ANIME/actions/runs/39049402578), [Browser Acceptance](https://github.com/H4CKLABORATORY/1UP-ANIME/actions/runs/39049402645): todas **success**. [GitHub Pages](https://github.com/H4CKLABORATORY/1UP-ANIME/actions/runs/39049559125): **success**. Vista pública de revisión `/preview-cinematic-v3.html`; **la intro del inicio sigue siendo la anterior**.

### 2026-10-17 — Anime1v real instalado en Render y continuidad horaria
- El propietario pidió una tarea periódica que retomara 1UP ANIME al pausarse. Se creó «Continuar 1UP Anime» con ejecución **cada hora**; esto no implica ejecución sin interrupción, acceso a agentes infinitos ni que pueda eliminarse solo con certeza al terminar.
- Render workspace autorizado `Douglas's workspace`: servicio nuevo `oneup-anime1v-metadata` (`srv-db9r8errjlhs73fsnbj0`), URL `https://oneup-anime1v-metadata.onrender.com`, plan free, Node, GitHub rama `feature/anime1v-metadata-runtime-20261017`.
- La instalación en Render recupera código original MIT de FxxMorgan/anime1v-api desde SHA fijo `6e54a75d894532b033c9e933772cdf3720842206`, únicamente módulo de **búsqueda y catálogo AnimeAV1**. Rutas de descarga/resolve/episodios/image-proxy no expuestas; servicio protegido con clave privada (no guardarla aquí).
- Gateway Render existente `oneup-anime-discovery` (`srv-db9e4lom7kps73d1n7ig`) configurado con `ANIME1V_BASE_URL` y `ANIME1V_API_KEY` por variables privadas. Código fallback Jikan si Anime1v no devuelve resultados o falla, con `data.source` veraz. Páginas estáticas conservadas.
- GitHub Actions: `1UP Anime1v restricted runtime` validó compilación e instalación, `1UP Anime1v live Render check` validó **Anime1v real** con búsqueda Naruto y 17 resultados (`source: anime1v`), además de pruebas de UI, navegador y gateway en verde. [Prueba](https://github.com/H4CKLABORATORY/1UP-ANIME/actions/runs/39055363500).
- PR #35 contiene la implementación inicial, pero diverge de `main` por tareas automáticas de datos; se preparó rama `release/anime1v-real-discovery-20261017` basada en el `main` más reciente, con los mismos archivos añadidos sin descartar cambios ajenos. Revisar CI de la release y fusionar esa rama tras validación.
- **Alcance real**: búsqueda/catalogación de anime conectada. Streaming de episodios todavía NO habilitado; la licencia MIT del software no concede derechos sobre obras de terceros, y `data/licensed-media.json` requiere fuentes propias/autorizadas. No declarar reproducciones disponibles sin pruebas reales.
- La intro Cinematic V3 por capas con AAC original ya se encuentra en `main` (merge `58dd4a4`), pero no hay personajes de anime externos sin autorización. Mantener esa base.


### 2026-10-17 — Handoff persistente entre chats y cron de actualización
- El propietario pidió que, al agotarse el espacio de conversación, se pasara todo a un chat nuevo mediante un «trigger». **No existe control disponible para medir ese espacio, abrir chats nuevos automáticamente o transferir un historial privado entre chats.**
- La alternativa real implementada en PR de continuidad: `docs/NEW_CHAT_HANDOFF.md` con estado verificable, enlaces, decisiones y prompt listo para otro chat; `scripts/update-new-chat-handoff.mjs` crea un resumen determinista desde la historia Git, el catálogo de medios, las capas de personajes y las propuestas abiertas de GitHub.
- `.github/workflows/update-new-chat-handoff.yml` actualiza el archivo tras cambios en `main`, cada seis horas o a petición manual. El bot solo crea commit cuando cambia el resumen, evitando bucles de commits vacíos; no guarda claves privadas ni copia chats.
- `AGENTS.md` ahora exige consultar esta ficha al comenzar una sesión nueva y distinguir la última evidencia del código frente a una ficha antigua.
- La tarea de ChatGPT **«Continuar 1UP Anime»** existente, id `6ad3b29c7d948191b7a447736883d800`, ya se actualizó para leer el handoff, revisar trabajo real **una vez por hora** y documentar el siguiente paso; no se creó otra tarea duplicada.
- Este sistema ofrece continuidad recuperable, no trabajo continuo ilimitado. El usuario deberá abrir «Nuevo chat» y pegar el texto del documento cuando desee cambiar de conversación.


### 2026-10-17 — Tema negro y verde + selector de temas en sitio público, PR #41
- Solicitud explícita: evolucionar la página con cada mejora verificada, preferir negro/verde y permitir elegir otros estilos. Referencias a Crunchyroll limitadas a patrones públicos de navegación/editorial; el `curl` aportado antes era extracción de **metadatos**, no su código privado.
- Revisado `AGENTS.md`, handoff, módulos CSS Kokomi/Octubre, cabecera pública, SW y PR #40 (otra propuesta solo preview). Esta nueva tarea no sobrescribe PR #40 ni sustituye fondos/arte.
- Rama `feature/oneup-green-theme-picker-20261017`, PR [#41](https://github.com/H4CKLABORATORY/1UP-ANIME/pull/41).
- Implementado: CSS original en `themes/oneup-palette/selector.css` con tema **Esmeralda** predeterminado, **Original** reversible y **Violeta**; JS `selector.js` con allowlist de IDs, preferencia local, 2 grupos accesibles sincronizados (cabecera PC y cajón móvil) y sin credenciales/API externas. `index.html` carga ambas capas; `sw.js` cambió versión v28 y precachea recursos manteniendo aislamiento de caché.
- QA añadido `scripts/e2e-oneup-palette.mjs`, integrado en `.github/workflows/browser-acceptance.yml`: prueba Playwright 320/390/1366, estado/ARIA, selección, persistencia, restauración, CSS aplicado, anchura y screenshots. Estado CI debe revalidarse para último SHA antes de afirmar PASS, Safari físico aún no probado.
- `docs/ONEUP_COLOR_THEMES.md` recoge uso, privacidad y criterios release. Próximo paso: confirmar tests, hacer merge seguro si procede y verificar GitHub Pages; la web no debe anunciarse actualizada hasta constatar el despliegue real.


### 2026-10-17 — ONEUP Motion: transiciones de ventanas, navegación y fichas
- Petición: llevar al nivel profesional el movimiento de ventanas, menús, fichas y navegación en la web pública, conservando temas negro/verde y el diseño propio.
- Referencias de ingeniería: principios de View Transitions de MDN (https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API), reducción de movimiento y uso de `opacity`/`transform`. No se ha utilizado código, animaciones comerciales o activos privados de Crunchyroll.
- Rama `feature/oneup-premium-window-motion-20261017`, basada en main actualizado tras PR #41.
- Implementación: `themes/oneup-motion/windows.css` añade ritmo coherente: fichas y diálogo de sesión (270 ms), menú lateral (235–270 ms), buscador y selector de colores (170 ms), velos y respuestas hover táctiles discretas. `windows.js` expone `OneUpMotion.enter` para rutas y páginas interiores, y `closeDialog` de 165 ms con liberación de modal al terminar, cancelación segura y `prefers-reduced-motion`/`km-quiet`. Se preservan `Escape`, foco y eventos nativos.
- Integración mínima en `index.html`, `studio.js` (ruta y cierre de ficha), `pages.js` (pantallas interiores) y `sw.js` (versión v29 precache). No se modificó el motor de catálogo, seguridad, reproductor ni fuentes multimedia.
- QA: `scripts/e2e-oneup-motion.mjs` integrado en `ONEUP Browser Acceptance`, prueba apertura/cierre, Escape, menú, búsqueda, hash interiores, viewport, y modo reducido a 390 y 1366 px. **Confirmar CI del SHA final antes de afirmar resultado o publicar.**
- Pendiente: evaluar capturas, revisar CI, asegurar ausencia de regresiones en iPhone y GitHub Pages. No atribuir prueba Safari físico hasta disponer de evidencia.


### 2026-10-17 — Publicación comprobada en GitHub de ONEUP Motion (PR #42)
- PR [#42](https://github.com/H4CKLABORATORY/1UP-ANIME/pull/42) fusionado a `main` mediante squash: commit `0296c3429ff1f936a26e3684b5db4cd85f2ef3c4`. Archivos de `themes/oneup-motion/windows.js/css`, referencia desde `index.html` y precaché PWA v29 confirmados por lectura independiente de `main`.
- Cinco suites del HEAD `89da7f6c8437e739ff8c625fd6d9a22cc1d8fad5` aprobaron: ONEUP Browser Acceptance (run 39082604468), ONEUP Kokomi Visual Acceptance (39082604507), One Up UI Quality (39082604284), 1UP HLS browser compatibility (39082604399) y ONEUP Codex Cache and Catalog Regression (39082604556).
- Browser Acceptance ejercitó cuatro variantes: 390px y 1366px con y sin `prefers-reduced-motion`; abrir/cerrar ficha, Escape, drawer/buscador móvil, navegación interna y overflow. También mantuvo pruebas anteriores del selector de temas Esmeralda/Original/Violeta.
- Primer CI fallido detectó un falso positivo del test por intentar reabrir una ficha durante la protección antitoques fantasma (450 ms). Se corrigió **solo el test** para respetar el intervalo (520 ms), se mantuvo la protección del iPhone y se obtuvo CI completo verde.
- **NO VALIDADO EN VIVO:** la herramienta de navegación al dominio Pages no permitió obtener respuesta, y el contenedor no tiene salida de red para comprobar HTTP 200 de `https://h4cklaboratory.github.io/1UP-ANIME/`. No afirmar que el deploy público fue comprobado ni que Safari físico fue probado. Próximo: verificar despliegue Pages y prueba real de Safari; después pulir transiciones compartidas entre tarjetas y fichas sin efectos pesados.


### 2026-10-18 — enlaces Crunchyroll en estrenos y fichas (rama para revisión)
- Nueva rama `feature/official-crunchyroll-links-20261018`. Se implementaron botones `Crunchyroll ↗` debajo de estrenos y un panel `ELIGE DÓNDE VERLO` en el detalle de series con enlaces oficiales validados. `Opciones en 1UP` desplaza al reproductor integrado existente; no habilita fuentes inexistentes.
- Destinos verificados en las fichas públicas de Crunchyroll: Black Clover (ficha de franquicia para nueva temporada), The Apothecary Diaries (franquicia), Overgeared y TOUGEN ANKI. Las páginas oficiales de franquicia no prueban disponibilidad de un capítulo o temporada en una región concreta.
- `official-watch.js` valida host `crunchyroll.com`, HTTPS y rutas `/series/{id}`; admite también enlaces de AniList cuando apuntan a fichas válidas. Sin búsquedas genéricas, scraping de video, descarga, DRM, hotlink de MP4/HLS o iframe.
- `airing-ui.js` conserva `streaming` de los snapshots y muestra enlaces externos solo cuando existe un match. `scripts/refresh-airing.mjs` agrega `externalLinks` filtrados a la próxima actualización automática. `sw.js` cambia la versión de caché para renovar módulos de la PWA.
- **No se han añadido capítulos reproducibles.** `data/licensed-media.json` permanece vacío; autorización para copiar diseño/código no implica permiso para retransmitir videos. Los links externos no equivalen a licencia de streaming.
- QA: nuevo `node --test tests/official-watch.test.mjs` y workflow de sintaxis, enlaces seguros y estructura de integración. Verificar CI real, UX en Chromium 390px/desktop y Safari físico antes de fusionar.

### 2026-10-18 — Auditoría transversal de calidad visual y acceso (PR #48)
- Rama `feature/sitewide-mobile-ux-quality-20261018`, [PR #48](https://github.com/H4CKLABORATORY/1UP-ANIME/pull/48): correcciones del acceso a raíz de captura Safari, SVG de emblema puro, cabeceras, altura intrínseca del modal, responsive móvil, formularios, título hero largo, navegación interior y botón 3D.
- `ui-quality.css` se carga al final en portada, studio, comunidad, motor, moderación y gremio, sin deshacer CSS histórico. Nueva caché PWA `v31`; selector de perfiles locales dentro del modal sustituye `prompt()`. Google queda claramente no disponible mientras Firebase no esté conectado.
- Verificación: workflow `ONEUP Sitewide Quality` con capturas Chromium 390 px; segunda inspección visual detectó que `inset:0` estiraba modal vacío, corregido con `height:fit-content`; pruebas de modal compacto, perfiles, 320/390/768/1440 y páginas internas en verde. `Depth mode Playwright` también recuperó PASS en viewport móvil y desktop al eliminar dependencia del drawer. El resto de CI debe reconfirmarse en el HEAD final antes de merge.
- Limitaciones / riesgos: no se han probado clics ni scroll en Safari físico; Firebase y la reproducción real continúan sin activar; es una fase de calidad y no certificado de sitio completamente terminado. Auditoría y pendientes en [SITE_QUALITY_AUDIT_20261018.md](SITE_QUALITY_AUDIT_20261018.md).

### 2026-10-19 — integración de Puppeteer en CI (PR en revisión)
- Se incorpora como `devDependency` `puppeteer@25.14.0` (no en scripts del frontend), sin tocar catálogo, reproductor ni SW.
- `scripts/puppeteer-site-audit.mjs` ejecuta Chrome Headless Shell contra sitio localhost: portada, comunidad, motor, moderación y gremio en ancho móvil y desktop; verifica aperturas/cierre de modal de acceso e invitado, overflow, errores JS, genera capturas y JSON. Todas las peticiones externas son bloqueadas.
- `.github/workflows/puppeteer-quality.yml` instala dependencias sin scripts de npm, descarga Chrome compatible expresamente, lanza tests y sube evidencias. No es un proceso permanente ni un servicio de GitHub Pages.
- Revisar CI del PR y solo fusionar si funciona; instalación real no confirmada hasta ver el workflow en verde. Manual: [PUPPETEER_QA.md](PUPPETEER_QA.md).


### 2026-10-19 — Scraping educativo (publicación)
- Módulo Python + BeautifulSoup de una sola página Wikipedia 2026, robots.txt, JSON factual de estrenos y actualización diaria GitHub Actions.
- Interfaz scraping-lab.html con filtros, atribución y respaldo AniList etiquetado como API.
- Funciones multimedia originales no tocadas; se mantienen las reglas de fuentes con licencia. Sin gastos ni credenciales.
- Validación PR #52: fixture Python, Puppeteer, navegador móvil/escritorio, calidad y módulos HLS/links exitosos.
- Primera extracción real, publicación Pages y Safari físico pendientes de comprobación posterior al cambio main.

### 2026-10-19 — revisión GitHub anime-scraper y búsqueda multilingüe (rama de revisión)
- Pedido: explorar https://github.com/topics/anime-scraper y adaptar ideas de descargadores con fin educativo a 1UP. Revisión de proyectos con distintas licencias en [ANIME_SCRAPER_GITHUB_RESEARCH_20261019.md](ANIME_SCRAPER_GITHUB_RESEARCH_20261019.md).
- Se añadió `anime-title-search.js`: matching seguro de nombres EN / romaji / japonés / sinónimos, normalización Unicode y límites de alias; carga antes de `studio.js` en `index.html` y `studio.html`.
- AniList/Jikan del navegador y el refresco de snapshot `scripts/refresh-catalog.mjs` conservan nombres alternativos. `sw.js` sube a caché `v32`; no incorpora dependencias ni fuentes de video nuevas. `tests/anime-title-search.test.mjs` y workflow dedicado.
- **No se instalaron descargadores de terceros ni código GPL/AGPL.** Conceptos como colas, integridad y subtítulos para videos propios/autorizados quedan relacionados al PR #51; evitar descarga/republicación de anime sin permisos.
- Estado: se requiere CI en cabeza de PR, merge validado, despliegue Pages y refresco real futuro del snapshot; no afirmar alias en JSON antiguo.


### 2026-10-19 — Anime API: franquicias y recomendaciones verificadas
- Directorio consultado https://github.com/topics/anime-api: descartadas dependencias archivadas y streaming externo, priorizando AniList GraphQL / Jikan REST.
- Rama feature/anime-api-franchise-discovery-20261019. Nuevo módulo optativo franchise-explorer.mjs/css en fichas, precuelas/secuelas, historias relacionadas y sugerencias basadas en relaciones reales AniList.
- Respaldo Jikan sólo de relaciones por ID MAL; rechaza ID difuso y filtros de manga/adulto marcados por AniList. Cancela consultas al cerrar, cachea y no toca el reproductor ni manifiesto de video.
- Verificación requerida: CI tests/franchise-explorer.test.mjs, navegador, despliegue Pages y Safari físico. No se declara el sitio finalizado.

### 2026-10-19 — QA real del módulo de franquicias
- Servidores HTTP de navegador reconocen MIME application/javascript para archivos .mjs, antes servían octet-stream e impedían cargar módulos ESM.
- Nueva prueba scripts/e2e-franchise.mjs abre ficha en Chromium 390/1366 con API AniList simulada, comprueba precuela/secuela/recomendación, filtro Manga/adulto, evita duplicados y navega a la ficha correcta.
- Ejecutada por ONEUP Browser Acceptance; Chrome emulado no equivale a Safari físico. Verificar CI, PR y despliegue.


### 2026-10-19 — Crunchyroll API repositorios y enlaces por capítulo
- Pedido: revisar `https://github.com/topics/crunchyroll-api` para ofrecer capítulos de anime.
- Implementación revisable: `feature/official-crunchyroll-episode-links-20261019`. `official-watch.js` añade `safeEpisodeUrl`, `getEpisode`, actualización por evento `oneup-episode-selected` y enlaces públicos verificados solo para Black Clover original `mal-34572` E1–E6, con episodio desconocido oculto. `official-watch.css` crea botón accesible; `sw.js` incrementa PWA; pruebas de regresión `tests/official-watch.test.mjs`.
- Documentación de investigación y riesgos `docs/CRUNCHYROLL_API_GITHUB_RESEARCH_20261019.md`. Las API comunitarias no acreditan una licencia de video. No se copia archivo, stream ni credencial y no se añade servicio privado al sitio.
- Estado inicial: código en rama; CI/merge/publicación/Safari por verificar. El acceso real puede requerir cuenta, suscripción, región y disponibilidad del proveedor. No afirmar video integrado ni gratis.
- Próxima tarea: revisar CI ONEUP Official Watch Links, controles visuales móvil, fusionar solo si pasan las pruebas y confirmar despliegue.

### 2026-10-19 — Cierre editorial gradual
- CSS/JS original para interfaz modernizada, navegación de acceso rápido y fecha/títulos únicos del catálogo. Sin copia de repositorios archivados.
- Rama de entrega feature/oneup-editorial-finale-20261019, pruebas Chromium 390/1366, HLS, temas y calidad; no sustituye configuración backend.
- Se integran los enlaces oficiales nuevos de otro commit en sw.js, preservando el resto de funciones y la licencia de reproducción.
- Leer docs/ONEUP_RELEASE_CLOSURE_20261019.md. Google OAuth, comunidad remota y episodios autorizados aún necesitan configuración; Safari físico pendiente.

### 2026-10-19 — portada cinematográfica dinámica de emisiones (rama de revisión)
- A partir de la grabación móvil aportada por el propietario, se construyó un carrusel original con estética verde/cristal y controles táctiles; referencia funcional, no clon de marca/código.
- Integración sobre catálogo existente: `premiere-ranking.js`, `premiere-hero.js`, `premiere-hero.css`, `index.html`, `studio.js`, `airing-ui.js`, caché PWA v36. Prioridad de emisiones hoy y temporada; ficha/favoritos y salida Crunchyroll verificada.
- Calendario de AniList ya existente, sin scrapers ni servidores nuevos; indica hora real de programación, no promete disponibilidad en reproductor. Si no hay información conserva la portada anterior.
- QA creada: tests Node y Playwright iPhone/desktop en `tests/premiere-hero.*`, workflow propio; documentado en [PREMIERES_HERO_20261019.md](PREMIERES_HERO_20261019.md). **Requiere** CI, inspección visual y deploy de Pages antes de declarar terminado. Safari físico sigue pendiente.

### 2026-10-19 — iOS nativo, subtítulos estilizados e intro sin control de sonido
- Entrega PR #60: app SwiftUI nativa en ios/ (búsqueda, catálogo, favoritos, intro AVPlayer, reproductor propio); CI macOS simulator sin firma. No es WebView.
- Web: removed oct-audio-control y prueba adaptada, conserva reproducción de intro automática a mejor esfuerzo; Safari puede bloquear el audio audible sin gesto.
- Subtitle Studio Bangers (OFL), Arial/Outfit/Arcade, ES/EN basado en WebVTT reales, estilos, escala, preferencias. Generador local opcional faster-whisper + Argos para videos con derechos; sin extracción ilícita.
- Cuatro frentes independientes bajo GitHub Actions y documento de responsabilidades. No afirmar múltiples agentes autónomos de código sin tales herramientas.
- Pendientes: PR CI completo, Pages, prueba Safari físico, Xcode firma/App Store, fuentes episodios realmente autorizadas y servicios de usuario. Sin declarar streaming ni subtítulos automáticos de obras sin archivo.


### 2026-10-20 — DEXTER Motion Engine: motion ligero y referencias GitHub
- Rama: feature/dexter-motion-engine-20261020. PR de revisión pendiente de CI.
- Investigación de Awesome Opus 5.5 Videos, GSAP, Three.js, Motion, Anime.js, Lottie, Auto Animate y Theatre.js: docs/DEXTER_MOTION_ENGINE.md.
- Implementación propia sin dependencias: revelado por visibilidad de tarjetas/accesos, foco de luz de cursor en arte del héroe, escucha de catálogo dinámico, preferencias de movimiento reducido, ahorro de datos y pestañas en segundo plano.
- PWA: sw.js + index.html enlazan módulo y hoja de estilo. Prueba automática: node --test tests/dexter-motion-engine.test.mjs.
- Pendiente real: CI GitHub, contraste visual Playwright en escritorio/móvil, prueba Safari físico, revisión/merge del PR y despliegue confirmado. No se modifica intro pública ni reproduce nuevos episodios.

**Cierre verificado de DEXTER Motion Engine (2026-10-20):** PR #63 fusionado en `main` mediante squash `0eb710889719cee5b9c3134393fda3db6a885526`. Trece workflows del PR en `success` (incluidos browser acceptance, sitewide, Puppeteer, profundidad, hero, HLS y pruebas propias). Workflow `Deploy to GitHub Pages` exitoso; GitHub Pages `pages build and deployment` en `success` para commit posterior de main `705e8068`. Verificación directa de interfaz en Safari físico y capturas manuales finales continúan pendientes; no atribuir reproducción/licencia de capítulos a esta mejora.


### 2026-10-20 — DEXTER Motion Studio (editor y exportación)
- Rama feature/dexter-cinematic-studio-and-mp4-20261020.
- Editor independiente responsivo con Canvas 2D, logo original, formatos 16:9 y 9:16, pétalos, iluminación, títulos, parámetros editables, timeline, import/export JSON y grabación del navegador sin audio.
- Motor determinista y CLI Playwright + FFmpeg para MP4 Full HD H.264/AAC reutilizando la firma original. Workflow GitHub Actions ejecuta QA, smoke FFmpeg y genera dos MP4 al llegar a main o mediante workflow_dispatch. Documentado en docs/DEXTER_MOTION_STUDIO.md.
- Se conserva intro publicada y reproductores. Solo un enlace en pie lleva al editor. Caché PWA v38.
- Estado inicial sin certificar: CI PR, browser screenshots, MP4 smoke y render HD final; Safari físico y decisión estética pendientes.


### 2026-10-20 — Cierre verificado: DEXTER Motion Studio y videos HD
- **PR #65 FUSIONADO** en main (squash b10213c790baa33e1dbf8fd1b17c0d95c3591426). Suite completa de 14 workflows del PR en SUCCESS, incluyendo Chromium responsive, Puppeteer, HLS, Depth, sitewide y smoke H.264 + AAC.
- Studio publicado por GitHub Pages; build de Pages SUCCESS, run 39370957727, revisión main 1641ad1a. Enlace: https://h4cklaboratory.github.io/1UP-ANIME/dexter-motion-studio.html
- Exportación HD realmente ejecutada y comprobada con ffprobe: **1920×1080** (16:9), **1080×1920** (9:16), 30 fps, 3,2 segundos, video H.264 y audio AAC del material de marca autorizado.
- Workflow de exportación SUCCESS: https://github.com/H4CKLABORATORY/1UP-ANIME/actions/runs/39370945223 ; artefacto 12241376805, nombre dexter-motion-studio-h264-aac-16x9-9x16, ~2,38 MB, vence 2026-11-03 (14 días). Capturas de verificación artifact 12241725293.
- El estudio permite copiar JSON compacto y enviarlo a workflow_dispatch para exportación personalizada desde iPhone sin PC. **No se ha probado** esa ejecución custom en la UI de GitHub con un JSON de usuario; validación de JSON y parser configurados.
- Próximos puntos no resueltos: aprobación visual del propietario y pruebas Safari iPhone físico; la intro pública actual no fue reemplazada.


### 2026-10-20 — Motion Studio V2, cámara y profundidad
- Rama feature/dexter-motion-studio-v2-camera-depth-20261020, tecnología original Canvas2D + camera rig matemático determinista.
- Tres trayectorias (orbit, dolly, glide), proyección de pétalos por profundidad, refracción ligera de anillos, barrido óptico, controles cameraPath/depth y compatibilidad retroactiva de escenas JSON V1.
- No se reemplaza la intro pública ni se agregan bibliotecas pesadas. PWA integra camera.mjs; prueba unitaria y E2E Chromium; exportador de MP4 sigue existente.
- QA/CI y publicación final deben verificarse antes de declarar completada esta fase. Safari real y aprobación estética pendientes. Ver docs/DEXTER_MOTION_STUDIO_V2.md.


**Cierre verificado 2026-10-20 (Motion Studio V2):** PR #66 fusionado en main, squash SHA `665ec5a312b3d3dd4c30648b14e155b8688c55a3`. Los 14 checks del PR dieron SUCCESS, incluyendo DEXTER Motion Studio, Browser Acceptance, Puppeteer, HLS, Depth, editorial y sitewide. Workflow `DEXTER Motion Studio · MP4 / QA` de main: https://github.com/H4CKLABORATORY/1UP-ANIME/actions/runs/39418935821, success. Artifacts 12263426712 (MP4 16:9 + 9:16; ~2.86 MB) y 12263621223 (capturas; ~0.95 MB). FFprobe en log verifica 1920×1080 y 1080×1920, ambos 30 fps 3.2 s, H.264 + AAC original. GitHub Pages: deploy success run 39418935619. Artefactos expiran 2026-11-03. Pendientes: Safari iPhone físico y revisión visual del propietario; intro pública original conservada.


### 2026-10-20 — 1UP Auth (feature/1up-auth; PR pendiente)
- Base observada main 18e56f0. Alta con usuario/contraseña, OTP nativo Supabase de seis dígitos, recuperación con bearer de alcance exclusivo y sesiones opacas de vida corta. Broker Edge Function, tablas cerradas/RLS, límites SQL atómicos, CAPTCHA nativo obligatorio al activar, Resend SMTP.
- Diálogo existente extendido con panel colapsado; conserva temas, intro, Google/Firebase, perfiles locales y claves de listas. No hay vinculación automática por correo, eliminación ni migración de datos. PR #67 de Firebase independiente, reconciliar auth-config.js al integrar.
- Verificado localmente: 12 pruebas broker simuladas, flujos UI simulados Edge headless 390/1366 px, 26 regresiones existentes y scripts/check-supabase-option.mjs; sintaxis JS y diff sin errores. No son pruebas de correo ni Safari físico. PostgreSQL real se comprobará en CI.
- Backend desactivado por defecto. La conexión Supabase devolvió cero proyectos; faltan proyecto Free, dominio con DNS verificado en Resend, SMTP, Turnstile, deploy de función, auditor de configuración y E2E real. No se creó infraestructura ni se fusionó/desplegó este cambio.
- Evidencia/activación/rollback/migración: docs/ONEUP_AUTH.md; checkpoint .hermes/checkpoints/1up-auth.json. Próximo paso: publicar PR y comprobar CI, después activación externa por titular con el ensayo de correo.
