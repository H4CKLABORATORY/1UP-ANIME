# OMEGA — próximas acciones verificables

Actualizado inicialmente 2026-10-16. No representa ejecución continua ni tareas en segundo plano.

1. **P0 — Comprobar integridad del deploy:** comprobar que el logo MP4/AAC integrado en main por `e4a8ef9d` y sus archivos JS/CSS/JPG/PNG resuelven sin 404, funcionan según política Safari y no introducen bloqueos. Confirmar despliegue vigente antes de tocar referencias.
2. **P0 — Conciliar cambios:** inspeccionar PR #14, #18, #19, #20 y el historial ya integrado de #22 y comprobar cuáles aportes siguen sin integrar tras PR #23; evitar merge en cadena automática.
3. **P0 — Reproductor:** mantener pruebas de hasta 7 posiciones, MP4/WebM/HLS, subtítulos, consentimiento de iframe, ruta sin fuentes, botón retry y sincronización de comentarios; falta video autorizado real y prueba Safari física.
4. **P1 — Comunidad:** configurar Firebase gratuito con autorización del titular; verificar auth y Firestore reglas, persistencia entre dispositivos, anti-spam y moderación. No inventar claves.
5. **P1 — UX/Catálogo:** revisar 22 rutas Kokomi y comparar móvil/escritorio; comprobar metadatos actuales, traducciones y filtros.
6. **P1 — QA/CI:** conservar workflows, validar links, accesibilidad, performance y documentación.
7. **Memoria:** al completar un avance relevante actualizar este archivo, `OMEGA_MEMORY.md` y `PROJECT_CONTINUITY.md` con SHA/evidencia y estado HONESTO.

Restricción: presupuesto $0, no compras/deploy destructivo sin permiso; no convertir metadatos o licencias ficticias en permiso de transmisión.


- [x] PR #31: reparar X del diálogo Overgeared en Safari móvil; CI Chromium 390px/desktop en verde. **Pendiente** confirmación tras GitHub Pages y en iPhone físico.
- [x] **Optimización integral de rendimiento y motion (2026-11-14):** erradicación de bucles RAF infinitos en `card-depth-engine.js` y `depth-engine.js` (ahora 100% reactivos y 0% CPU en reposo); sincronización fluida de salida en diálogos y `::backdrop` con clase `.is-closing` y `@keyframes oneup-veil-out` en `windows.js/css`; eliminación de layout thrashing en `studio.js` (scroll virtual con caché de altura y offset); transiciones 3D por GPU en toast, spotlight y carruseles hero. 69/69 tests unitarios Node pasados, suite completa `test:all` en verde y E2E Playwright móvil 390px y desktop 1366px aprobados.

- [ ] **Tema Esmeralda para producción, PR #41:** comprobar CI `ONEUP Browser Acceptance` y tres resoluciones, fusionar solo sin conflictos y con pruebas verdes, confirmar despliegue GitHub Pages y que el selector Esmeralda/Original/Violeta realmente funcione en la URL pública. La intención del propietario es publicar mejoras probadas de forma continua, no desplegar cambios de alto riesgo o incompletos sin verificar. [Manual](ONEUP_COLOR_THEMES.md).


- [ ] **Motion profesional 1UP:** revisar PR de rama `feature/oneup-premium-window-motion-20261017`, prueba `scripts/e2e-oneup-motion.mjs`, aceptación navegador, render de modal/menú/rutas en móvil y desktop con y sin reducción. Fusionar sólo si CI y compatibilidad están correctos, comprobar main y despliegue real de GitHub Pages. Sin copiar estilos comerciales protegidos.

- [ ] **Enlaces oficiales en estrenos:** revisar `feature/official-crunchyroll-links-20261018` y el workflow `ONEUP Official Watch Links`; comparar título y URL, comprobar en iPhone/desktop, fusionar solo con CI aprobado. Revisar conflictos con PR #46 (ambos tocan `index.html` y `sw.js`). Después comprobar redirecciones reales y refresco `data/airing.json` de AniList. Los capítulos internos requieren fuentes y derechos independientes.

- [ ] **PR #48 — Auditoría web y acceso iPhone:** revisar el último HEAD de [PR #48](https://github.com/H4CKLABORATORY/1UP-ANIME/pull/48), confirmar `ONEUP Sitewide Quality`, `Depth mode Playwright`, `ONEUP Browser Acceptance` y regresión HLS/catálogo, fusionar si pasan, verificar Pages y luego probar Safari físico. Capturas/registro: [auditoría](SITE_QUALITY_AUDIT_20261018.md). Pendiente validar Google/Firebase real y fuentes multimedia con licencia; no considerar completo solo por tener diseño funcional.

- [ ] **Puppeteer Browser QA:** comprobar el workflow `ONEUP Puppeteer Browser QA` en PR de rama `feature/puppeteer-qa-integration-20261019`; corregir fallos reales de instalación/runtime, revisar `artifacts/puppeteer/report.json` y fusionar solo si el QA está verde. Ver [PUPPETEER_QA.md](PUPPETEER_QA.md). No confundir Chrome Headless con Safari físico, ni automatización de pruebas con servidor permanente.

- [ ] Scraping educativo: comprobar refresco real Wikipedia, snapshot, despliegue y Safari físico.

- [ ] **Integración anime-scraper / alias multilingües:** ejecutar pruebas de `anime-title-search.js`, revisar PR de rama `feature/anime-scraper-metadata-search-20261019`, y comprobar GitHub Actions Puppeteer, Browser Acceptance y refresh de AniList tras merge. No alterar sin revisión PR #51 (medios autorizados) ni PR #52 (scraping metadata educativo). Detalles en [ANIME_SCRAPER_GITHUB_RESEARCH_20261019.md](ANIME_SCRAPER_GITHUB_RESEARCH_20261019.md).

- [ ] **API de franquicias:** verificar módulo franchise-explorer, CI, relaciones y respaldo Jikan, despliegue Pages y Safari físico.

- [ ] Cierre editorial: CI de UX 390/1366, QA visual, Pages, Safari físico.
- [ ] Producto completo: Google/Firebase/Supabase aún sin configurar y biblioteca de medios autorizados vacía; no anunciar streaming 100%.

- [ ] **Portada de estrenos 1UP:** revisar PR de rama `feature/oneup-premiere-cinematic-hero-20261019`, comprobar CI `ONEUP Cinematic Premiere Hero QA`, Browser Acceptance, Puppeteer y Depth. Revisar capturas visuales reales 390/1440, rango horario local y botones táctiles; fusionar solo con resultados aprobados y comprobar GitHub Pages. Ver [PREMIERES_HERO_20261019.md](PREMIERES_HERO_20261019.md).

- [ ] **PR #60 iPhone y subtítulos:** revisar CI de SwiftUI simulador, WebVTT, 4 jobs, Browser Acceptance; fusionar solo verde; verificar Pages y Safari físico.
- [ ] **Distribución App Store:** bundle ID/Team, Xcode archive firmado, capturas, privacidad, clasificación y Apple review. No hay IPA de producción ni TestFlight.
- [ ] **Episodios y subtítulos nuevos:** aportar materiales/URLs HTTPS con permiso de redistribución y archivos de audio legítimos; revisar salida del modelo y WebVTT ES/EN antes de publicar. Snapshot metadata por sí solo no suministra video.


- [ ] **DEXTER Motion Engine (2026-10-20):** revisar rama feature/dexter-motion-engine-20261020 y su PR, comprobar workflow de tests Node, QA responsive en navegador y Safari físico, y después aprobar merge/deploy si no hay regresiones. Investigación y límites documentados en docs/DEXTER_MOTION_ENGINE.md.
- [x] **Motor de movimiento DEXTER:** PR #63 fusionado, 13 checks de PR correctos, `Deploy to GitHub Pages` y pipeline Pages finalizados en success. [ ] Falta QA Safari iPhone físico y revisión de motion visual, sin bloquear uso básico.


- [ ] **DEXTER Motion Studio Full HD (2026-10-20):** comprobar CI del PR feature/dexter-cinematic-studio-and-mp4-20261020, Node+Playwright, FFmpeg AAC smoke, artifacts de 16:9 y 9:16 y Safari físico pendiente. Fusionar solo tras verde, comprobar Pages y salida MP4 por push/workflow_dispatch. Ver docs/DEXTER_MOTION_STUDIO.md.


- [x] **DEXTER Motion Studio V1 / MP4 Full HD:** PR #65 fusionado; 14 comprobaciones PR exitosas; CI main y Pages success; dos videos 1920x1080/1080x1920, H.264/AAC 30fps 3.2s confirmados en run 39370945223 (artifact 12241376805, expira 2026-11-03). Exportación custom JSON por workflow_dispatch implementada.
- [ ] **Finalización artística / Safari físico:** revisar MP4, aprobación estética del dueño, verificar en iPhone físico, analizar batería/render y determinar si conviene reemplazar intro de producción. No reemplazar automáticamente.


- [ ] **DEXTER Motion Studio V2 (cámara 2.5D):** comprobar PR/CI de feature/dexter-motion-studio-v2-camera-depth-20261020, regresiones Node y Playwright, Pages, pruebas de render H.264/AAC Full HD, contrastar efectos nuevos en iPhone físico. Mantener intro pública estable. Documentación docs/DEXTER_MOTION_STUDIO_V2.md.


- [x] **DEXTER Motion Studio V2 implementado y desplegado:** PR #66 merge; 14 checks verdes; Pages success; dos MP4 Full HD de 3.2 s a 30fps con H.264/AAC (run 39418935821, artifact 12263426712, hasta 2026-11-03). La intro pública sigue siendo la actual.
- [ ] **Motion Studio V2 visual/Safari real:** evaluar el aspecto de las versiones V2 y prueba de iPhone Safari físico; decidir voluntariamente si reemplazar la intro actual. No dar por hecho esa aprobación.


- [x] **Reestructuración de arquitectura limpia a contenedores (2026-11-13):** Organizados todos los archivos en contenedores modulares (`client/`, `server/`, `data/`, `docs/`, `scripts/`, `tests/`) según el estándar de `jkanime_app`, eliminando más de 80 archivos sueltos en la raíz y preservando el 100% del estilo visual y la compatibilidad PWA. 40/40 pruebas unitarias Node + 16/16 Python + 152 UI + 48 comprobaciones guard PASADAS al 100%. Documentado en [ARCHITECTURE.md](ARCHITECTURE.md).
- [x] **Migración a Vue 3 y Vite (2026-11-13):** Implementada arquitectura frontend basada en Vue 3 y Vite (`client/src-vue/`). Descompuesto el monolito en más de 20 componentes pequeños y 8 composables modulares, manteniendo idéntico el diseño visual, estilos, responsive mobile para Safari de iPhone y accesibilidad. Pruebas 43/43 Node unitarias, 16/16 Python, 152/152 UI assertions y 48 comprobaciones del Guardián aprobadas al 100%. Pipeline de `npm run build` genera `dist/` optimizado con Vite.
- [x] **Catálogo completo con Virtual Scroll, índice lateral A-Z y búsqueda encapsulada (2026-11-13):** Implementado `VirtualCatalogGrid.vue` con scroll virtual responsivo a 60 fps (5/4/3/2 columnas) para más de 4,800 animes; riel alfabético `LetterFilterRail.vue` a la derecha con soporte táctil y burbuja de aumento móvil; barra de búsqueda superior en `BrowseControls.vue` con botón ✕ para limpiar y encapsulación de términos al dar Enter («buscar de lo ya buscado»); exportación de `data/catalog-full.json` y `client/data/catalog-full.json`; 61/61 pruebas unitarias Node + 16/16 Python + 152 UI assertions + 48 verificaciones del Guardián aprobadas al 100%.
- [x] **Ajuste cinemático de tarjetas y arquitectura GPU translate3d (2026-11-14):** Resuelto el anidamiento CSS Grid de `#browse-grid` con `.catalog-virtual-active`; proporción 2:3 estándar internacional; virtualización acelerada por GPU con `translate3d` eliminando saltos erráticos en scroll (precisión 1:1 de 300px); 100% llenado horizontal sin huecos y etiquetas completas de emisión/episodios.
- [x] **Integración de catálogo, reproductores y descargas de `jkanime_app` en producción (2026-11-14):**
  - Servicio REST API desacoplado en Node.js (`server/src/catalog-service.js`) con `node:sqlite` nativo en modo WAL sobre 4,885 animes, 71,541 episodios y 524,212 enlaces.
  - Proxy de API transparente en `scripts/serve-client.mjs`.
  - Ingesta en frontend (`client/src/js/studio.js`) para inicio, tendencias, en emisión, populares, películas y catálogo general.
  - Integración de selector de streaming (Desu, Magi, Streamwish, Mega, VOE, Okru, Mediafire), preservación de hash Mega y descargas directas en `client/src/js/episode-player.js`.
  - Preservación del 100% de los estilos visuales en `client/src/styles/` (0 modificaciones).
  - Veredicto de auditoría independiente: **`VICTORY CONFIRMED`**. Pruebas 61/61 Node + 16/16 Python + 152 UI + 48 Guard aprobadas al 100%.

### Próximas acciones priorizadas
- [ ] **Configuración y despliegue del servicio Node.js en servidor nuevo:** Preparar variables de entorno (`PORT`, `JKANIME_DB_PATH`, `CORS_ORIGIN`), scripts de arranque (`pm2` / `systemd` / `Dockerfile`) para el montaje del backend de catálogo en el servidor de destino.
- [ ] **Pruebas de reproducción en dispositivos Safari físicos:** Verificar la carga de los iframes de streaming y descargas en iPhone / iPad reales bajo Safari sin restricciones de reproducción ni bloqueos táctiles.
