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


### 2026-10-15 — Propuesta móvil inspirada en Kokomi (rama)
- Rama: `design/kokomi-mobile-reference-2026-10-15`; **no fusionada a main**.
- Archivos añadidos: `preview-kokomi-mobile.html`, `themes/kokomi-mobile-preview/theme.css`, `themes/kokomi-mobile-preview/theme.js`, `themes/kokomi-mobile-preview/README.md`.
- Implementado: menú lateral accesible, búsqueda conectada al formulario existente, hero compacto, cuadrículas responsivas y números de ranking; conserva la app `studio.js` y su catálogo.
- Verificación: se contrastaron selectores y delegación de eventos con el código principal. Navegación visual en Safari real y despliegue no probados; aún no pasar a producción.
- Próxima tarea: publicar la rama en un entorno de pruebas separado, comparar capturas en 390px y escritorio con video de referencia, ajustar y comprobar flujos de usuario antes de aprobar un merge.

### 2026-10-16 — Extensión de 22 rutas Kokomi (en rama experimental)
- Nuevos archivos: `themes/kokomi-mobile-preview/pages.js`, `pages.css`, `scripts/e2e-kokomi-preview.mjs`, workflow y matriz `docs/KOKOMI_FIDELITY_MATRIX.md`.
- Añadido en `preview-kokomi-mobile.html`: páginas interiores de series y películas, reproducción por fuentes autorizadas, selección de temporada/episodio en medios declarados, artículos originales, contacto informativo, perfil, avisos, configuración y 404. Reutiliza `studio.js` para las rutas originales.
- Corregido cierre de drawer, navegación de regreso a inicio y filtrado de estrenos futuros para no anunciar como próximos otros títulos del catálogo.
- Prueba realizada: validación de sintaxis JavaScript en el momento de crear `pages.js`; las pruebas reales de Chromium quedaron **configuradas**, no se puede afirmar que hayan pasado hasta revisar GitHub Actions.
- Falta: comparar capturas, completar interior del reproductor/comentarios, confirmar rutas en Safari, revisar ejecución CI, validar fidelity desktop (demo 502).


### 2026-10-16 — Validación visual móvil y corrección del ranking
- Revisión con la grabación original del usuario y la captura de Chromium 390×844 generada desde la rama de prueba.
- Implementados: orden de homepage orientado al catálogo; dos columnas de ranking en móvil y cinco en escritorio; fallback visual propio al fallar imágenes remotas; carruseles internos sin scroll horizontal del documento.
- Evidencia: workflow `ONEUP Kokomi Visual Acceptance`, ejecución https://github.com/H4CKLABORATORY/1UP-ANIME/actions/runs/38850097111 = **success** sobre commit `63e05ac`. `One Up UI Quality` sobre el mismo commit = **success**. Browser Acceptance general estaba aún en ejecución al registrar esta entrada.
- Capturas de hero y ranking móvil/escritorio en los Artifacts del workflow; comparación manual contra `kokomi_review/f_04.jpg` del video, también guardada como `1UP_KOKOMI_COMPARACION_MOVIL.png` en el chat de desarrollo.
- Importante: el navegador automatizado bloquea imágenes externas para resultados deterministas, por eso muestra arte de respaldo.
- PENDIENTE: QA Safari iPhone real, contraste pixel por pixel con una demo original accesible, funcionalidad de noticias/notificaciones/contacto avanzados, sincronización en servidor y control de calidad de reproducción.
- PR #14 sigue en borrador; producción `main` intacta.
