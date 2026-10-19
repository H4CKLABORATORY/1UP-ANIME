# Revisión transversal de 1UP Anime — 2026-10-18

Estado: cambios en PR #48, rama `feature/sitewide-mobile-ux-quality-20261018`. **No equivale a certificar el 100% de funcionalidades ni a una prueba física de Safari.**

## Hallazgos y cambios comprobables

| Área | Hallazgo observado | Acción |
| --- | --- | --- |
| Identidad de acceso | SVG comprimía microtexto y filtros a escala móvil | SVG derivado del emblema original sin texto microscópico (`assets/oneup-crest-mark.svg`), rótulo tipográfico separado |
| Ventana de bienvenida | Titular y márgenes desproporcionados, cierre visualmente intrusivo | Reorganización semántica y `ui-quality.css`: altura intrínseca, foco visible, zona táctil 44 px, safe-area y scroll |
| Google | API de Firebase no configurada en el repositorio, CTA inducía a error | Botón deshabilitado y rotulado `Google · próximamente` cuando falta configuración; activación automática con datos públicos válidos |
| Perfil local | Navegador usaba `prompt()` para escoger perfil | Selector de perfiles HTML accesible, opciones creadas con texto seguro y límite visible |
| Profundidad | Control se movía al drawer móvil oculto y quedaba inaccesible | Control fijo accesible que no depende del drawer |
| Títulos largos | Títulos de anime largos invadían verticalmente el cartel de la portada | Clases por longitud, tipografía y altura móvil adaptables; sin truncar nombre real |
| Páginas interiores | Navegación estrecha, marca pequeña y riesgo de desbordamiento | Logo de marca recortado vectorial; header móvil flexible y desplazable; estilos comunes finales |
| PWA | Recursos nuevos podían quedar en caché antigua | Nueva versión de caché `v31`; recursos del emblema y estilo incluidos |

## Páginas cubiertas
- `index.html` catálogo principal, acceso, portada, fichas, servicios de contenido ya existentes.
- `studio.html` página alternativa, modal de acceso compartido.
- `comunidad.html` cabecera, navegación y feed.
- `motor.html` consola de contenido.
- `moderacion.html` consola de moderación.
- `gremio.html` página narrativa del proyecto.

## Pruebas
- `tests/site-quality.spec.js`: comprobación por Chromium en anchos 320, 390, 768 y 1440, emblema cargado, modal tocable, cierre, invitado, ausencia de desbordamiento y selección de perfil local. Incluye captura visual de acceso y comunidad para revisión.
- `tests/depth-mode.spec.js`: comportamiento de botón y capas a 390 y 1920.
- `scripts/e2e-browser.mjs`: rutas, modal de detalle, catálogo y reproductor existentes.
- Revisar en [GitHub Actions](https://github.com/H4CKLABORATORY/1UP-ANIME/actions) el SHA actual del PR #48 tras cada cambio; los tests que pasaron en un SHA anterior no validan uno posterior.

## Limitaciones y trabajo pendiente
1. **Safari físico:** validar modal con teclado, zoom del sistema, rotación, botón X, navegación en iPhone y PWA instalada. Chromium emulando tamaños iPhone no es Safari.
2. **Firebase:** aún faltan configuración real y pruebas de OAuth, cuentas y sincronización; no convertir el modo invitado local en falsa cuenta cloud.
3. **Vídeos:** `data/licensed-media.json` no tiene episodios autorizados. El reproductor conserva 7 posiciones pero no hay que prometer reproducción sin fuentes y derechos.
4. **Comunidad:** requiere backend real configurado para publicar, chat y moderación; diseño no implica que operaciones remotas funcionen.
5. **Rendimiento:** continuar la auditoría visual/consumo en dispositivos reales y considerar optimizar los bucles de profundidad cuando está apagada.
6. **Evolución:** revisar propuestas de diseño pendientes antes de mezclarlas, no copiar sin permisos ni deshacer mejoras probadas.

La regla permanente es documentar errores verificables, arreglarlos en cambios reversibles y fusionar únicamente tras CI, sin anunciar perfección de un sistema que depende de servicios externos.
