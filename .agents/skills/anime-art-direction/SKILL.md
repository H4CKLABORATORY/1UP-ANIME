---
name: anime-art-direction
description: Dirección editorial y calidad visual para 1UP Anime, con prioridad de usabilidad sobre exceso de efectos.
---
# Dirección de arte 1UP Anime

## Objetivo
Una experiencia de anime con personalidad propia, legible, precisa y memorable. La imagen del título seleccionado protagoniza la pantalla; la marca acompaña y no compite.

## Flujo UX obligatorio
- Click/tap a la tarjeta -> portada/banner del anime arriba, sinopsis y año, géneros, puntuación, ficha, guardar, progreso y vínculos oficiales disponibles.
- El encabezado principal refleja la selección hasta que se elija otra.
- No simular botones de reproducción ni 'episodios nuevos' cuando no hay contenido/licencia real.
- Navegación móvil rápida, sin cuenta obligatoria y sin pantalla de 'Entrar con sonido'.
- El contenido de muestra debe distinguirse claramente del catálogo actualizado.

## Estilo
- Usar uno o dos acentos cromáticos coherentes por vista; no neón indistinto en todas partes.
- Tipografía de lectura para cuerpo y display para títulos; evitar tipografías decorativas en metadatos.
- Espacios consistentes y ritmos de secciones reconocibles; tarjetas de póster 3:4, títulos de 2 líneas máximo.
- Jerarquía: imagen protagonista -> título -> resumen -> metadatos -> acciones -> exploración.
- Reducir sombras, overlays, brillos y movimientos que no comunican estado o jerarquía.

## Motion y audio
- Microtransiciones 180-480ms para cambios de portada, hover y elementos activos.
- Intro de marca opcional, automática, visual y breve; no interrumpir navegación, especialmente en iPhone.
- Audio no automático si exige interacción; no bloquear la app para habilitarlo.
- prefers-reduced-motion debe conservar los flujos sin transiciones.
- Mantener imágenes con tamaños responsables, carga diferida salvo héroe y texto alternativo.

## Aceptación
- En 375px y 1280px la portada, título y acciones del detalle siguen siendo legibles.
- Cada tarjeta del catálogo abre un detalle con banner y póster de ese mismo anime.
- Se puede cerrar el diálogo con el botón y con Escape; el foco de teclado es visible.
- Los efectos secundarios no bloquean touches, scroll, memoria ni batería.

## Referencias para estudio, no para copiar
- https://github.com/Aniraku/Aniraku
- https://github.com/Killoxz/Bankai
- https://github.com/houndslight/crunchyroll-redesign
- https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion
