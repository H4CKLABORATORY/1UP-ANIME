---
name: oneup-cinematic-motion-director
description: Investigar, diseñar e implementar animación editorial premium para 1UP Anime con referencias After Effects, mobile first, rendimiento y validación visual.
---

# ONEUP — Cinematic Motion Director

## Objetivo
Crear una interfaz de anime original que pueda sostener temáticas de temporada sin comprometer el catálogo ni el rendimiento móvil. Referencias aportadas por el propietario: texto de impacto Anime Impact, tipografía editorial sobre rojo tipo lower thirds japoneses, y composición cinematográfica nocturna.

## Procedimiento obligatorio
1. **Investigar** documentación original de la herramienta o efecto, referencias visuales, fechas y licencias. Guardar evidencias en docs/; no atribuir artes ni sonidos de un anime a 1UP.
2. **Definir intención**: escribir el momento de entrada, jerarquía tipográfica, duración, gama cromática, audio y soporte móvil.
3. **Prototipar aislado**: cambios primero en `preview-october.html` y `themes/october-2026/`. No modificar `index.html` de producción hasta aprobación de la dirección visual.
4. **Construir con capas**: máscaras + opacidad + translate/scale, curvas de aceleración basadas en Graph Editor; animación con JS solo cuando añade valor verificable. Conservar control de usuario y accesibilidad.
5. **Comprobar derechos**: toda gráfica de ambientación debe ser original o autorizada. Portadas son metadatos externos; no copiar diseños oficiales de Black Clover, marcas de estudio o sonidos del anime.
6. **Sonido iPhone**: nunca suponer autoplay audible; audio original Web Audio solo tras interacción y decisión explícita del visitante. Iniciar silencio, ON/OFF accesible, volumen discreto.
7. **Reducir movimiento**: desactivar revelados, partículas y desplazamientos cuando `prefers-reduced-motion: reduce`. Nada de controles detrás de overlays.
8. **Pruebas**: `ONEUP Browser Acceptance` en ancho móvil de 390px y escritorio de 1360px. Verificar portada, nav, detalle, calendario, vista previa, toggle de sonido, sin overflow horizontal ni errores JS. Inspección visual humana de screenshots.
9. **Publicar**: si pruebas y revisión visual pasan, mover el diseño aprobado al tema de producción mediante cambio pequeño y reversible; versionar `sw.js`.

## Decisiones editoriales octubre de 2026
- Base permanente obsidiana/grafito/blanco. Halloween solo detalles; verde arcano y dorado antiguo como acentos. Evitar exceso de glow, ruido y humo.
- Black Clover como **foco editorial**, no afirmar relación oficial ni disponibilidad de episodios. Si AniList falla, ofrecer enlace al sitio oficial sin inventar datos.
- Navegación: fuente Barlow Condensed bien espaciada, botones con indicador de sección estilo lower thirds; brush solo para campañas con licencia original.
- Una temática puede tener energía visual, pero **la navegación siempre funciona sin animación, sin sonido y sin sesión**.
- No considerar una estética finalizada si solo existe CSS: debe tener vista previa accesible y pruebas de navegador.

## Archivos
- `docs/ART_DIRECTION_CINEMATIC_2026.md`: investigación original y decisiones.
- `themes/october-2026/theme.css`: dirección de arte aislada.
- `themes/october-2026/theme.js`: composición y audio original opt-in.
- `themes/october-2026/arcane-seal.svg`: sello SVG original.
- `preview-october.html`: prototipo en vivo, indexado como noindex.
- `scripts/e2e-browser.mjs`: comprobaciones funcionales.
