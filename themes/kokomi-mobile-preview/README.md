# 1UP ANIME — Vista Kokomi móvil (propuesta no publicada)

**Estado 2026-10-15:** implementación visual experimental en una rama. `main` no cambia.

## Abrir
- Ruta propuesta: `/preview-kokomi-mobile.html`.
- Para probar con catálogo real hay que servir todos los archivos de esta rama en un hosting HTTPS/servidor de desarrollo; GitHub Pages en `main` no muestra automáticamente archivos de ramas.
- La página reutiliza `studio.js`, su catálogo AniList/Jikan, Firebase opcional, perfiles, favoritos, comentarios y comunidad; **no** incluye los archivos comerciales de TemplateMonster.

## Diseño que reproduce con componentes originales
Basado en el video aportado por el propietario el 15/10/2026: fondo negro grafito, hero condensado, botones compactos, menú lateral, categorías con cuatro tarjetas, ranking rojo y tarjetas 2-columnas en teléfono, sección de películas, recientes y calendario. El diseño conserva el nombre y logotipo 1UP ANIME.

## Archivos de esta propuesta
- `preview-kokomi-mobile.html`: copia de la vista previa existente con carga de nuevo tema, sin cambiar `index.html`.
- `themes/kokomi-mobile-preview/theme.css`: cambios de estilo aislados bajo la clase `kokomi-mobile-reference`.
- `themes/kokomi-mobile-preview/theme.js`: menú lateral con Escape y foco, búsqueda que utiliza el formulario real, tarjetas de género y numeración de ranking.
- `docs/PROJECT_CONTINUITY.md`: bitácora de etapas.

## Verificaciones y riesgos
- Validación estructural: están presentes el `#search-form`, `#header-search`, `#trending-rail`, `#home-screen` y navegación `data-route` en el código base consultado.
- **Sin prueba visual completada en Safari real** y sin ejecución del sitio alojado desde esta rama. No presentar el prototipo como página publicada.
- Validar la cascada CSS de los temas existentes, anchuras de 320/390/768/1440 px, desplazamiento del menú, foco del buscador, menú con lector de pantalla, contraste, carga de posters y `prefers-reduced-motion`.
- Confirmar inicio de sesión, favoritos, comentarios y reproducción en la vista previa antes de considerar merge.
- Si las pruebas fallan, revertir los archivos de esta rama: no reemplaza `main`.

## Siguiente paso
Preparar y evaluar capturas visuales reales de iPhone/escritorio y corregir las diferencias respecto al video de referencia. Después migrar los componentes que apruebe el propietario al tema de producción.
