---
name: oneup-espanol
description: Enforce Spanish-first anime metadata and subtitles in the 1UP Anime web and iPhone PWA.
---

# Idioma español obligatorio — 1UP Anime

## Producto
- La interfaz visible debe estar en español por defecto: menús, acciones, errores, fichas, géneros, estados, progreso y páginas de ayuda.
- Mantener nombres oficiales de anime y de servicios como nombres propios. No traducir nombres de franquicias.
- La sinopsis inglesa se presenta solamente cuando la persona toca explícitamente **Ver texto original**.
- Si falta traducción, mostrar un aviso honesto de traducción pendiente en español; nunca etiquetar un párrafo inglés como sinopsis en español.

## Datos
1. `data/catalog.json` registra cada anime y, cuando existe, `description_es`.
2. `data/translations-es.json` asocia ID del anime con su traducción `es`.
3. `data/sinopsis-editoriales-es.json` contiene adaptaciones revisadas para corregir traducciones literales de mala calidad.
4. En la app, buscar por ID estable (`mal-...` o `al-...`) y no exigir una coincidencia literal entre resúmenes externos.
5. Mostrar la traducción en el encabezado destacado y en el panel de detalles, incluso si el archivo de idioma llega después de abrir la ficha.
6. El PWA/Safari usa caché de red prioritario para código, CSS y traducciones; actualizar versión de Service Worker al cambiar fuentes.

## Pipeline
- `.github/workflows/refresh-catalog.yml` ejecuta `scripts/refresh-catalog.mjs` y `scripts/translate-catalog.py`.
- La traducción automática por Argos no garantiza calidad de redacción; ejemplos importantes deben revisarse en `data/sinopsis-editoriales-es.json`.
- Priorizar casos concretos de errores reportados antes de añadir efectos decorativos.

## Video y subtítulos
- `data/licensed-media.json` debe contener solamente contenido con permiso de distribución.
- `scripts/video_a_subtitulos.py` genera subtítulos .vtt desde archivos de audio/video autorizados.
- No copiar automáticamente servidores de Netflix, JKAnime, IPTV u otras plataformas ni eludir DRM.

## Prueba mínima
- Abrir anime `mal-59741`, comprobar que la sinopsis no empieza por "Born into".
- Verificar que los géneros se muestran en español.
- Comprobar que el botón Ver texto original cambia únicamente la sinopsis al idioma fuente y permite volver a español.
- Probar vista de iPhone, PWA tras actualización y modo sin conexión.
