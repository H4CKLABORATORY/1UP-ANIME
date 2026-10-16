# 1UP Anime — referencia de diseño Kokomi (15 octubre 2026)

## Objetivo del usuario
El propietario desea acercarse lo más posible a la experiencia de la demo **Kokomi** de TemplateMonster (#520462), sobre todo el diseño móvil y sus interacciones; aportó una grabación de pantalla vertical de 27 segundos.

**Licencia:** Kokomi es una plantilla comercial; NO se obtuvo ni distribuyó su ZIP, su código ni sus imágenes. La implementación de esta rama contiene CSS y JavaScript originales basados en patrones visuales observados, usando los datos y funciones ya propios de 1UP ANIME. Para usar los archivos originales, adquirir una licencia y proporcionar el paquete autorizado.

## Observaciones verificadas en la grabación
- Encabezado oscuro con logo, buscador, cuenta y hamburguesa.
- Menú vertical superpuesto con accesos Inicio, ranking, géneros, películas, actualizados, en emisión, programación, favoritos.
- Hero destacado y botones de acción rápidos.
- Sección de géneros horizontal, tarjetas de portada con **2 columnas en iPhone**.
- Top 4 con insignias rojas numeradas y póster grande.
- Películas/recientes, búsqueda expandible y footer editorial.
- Navegación compacta y color casi negro, con bordes tenues y acento turquesa/azul.
- Barra verde visible arriba en el video pertenece al entorno de la demo de TemplateMonster y no debe copiarse como parte de la web.

## Archivos modificados en esta rama
- `themes/kokomi-studio/mobile-reference.css`: capa CSS *scoped* exclusivamente a `data-kokomi-reference=yes`. No afecta `index.html`.
- `themes/kokomi-studio/mobile-reference.js`: drawer accesible, botón hamburguesa, overlay y Escape.
- `preview-kokomi.html`: conecta ambos recursos y opta al tema mediante atributo.
- Este documento y continuidad.

## Prototipo independiente adicional
Existe paquete ZIP de conversación `1UP_ANIME_DISENO_KOKOMI_REFERENCIA.zip` con HTML/CSS/JS propio para prototipado. Fue comprobado en Chromium de manera aislada/inyección de recursos: interfaz móvil 390px, escritorio 1440px, 12 tarjetas ficticias fallback, búsqueda y drawer, sin errores JS en ese test. No está fusionado al sitio real. Contiene copia del logo 1UP generado en el chat, no medios de la plantilla comercial.

## Estado actual
- **Sí implementado en rama:** distribución compacta móvil, top dos columnas, insignias rank, menú drawer, skin para preview y reversibilidad.
- **Ya existía en la web principal:** catálogo AniList/Jikan, comentarios, lista, comunidad, calendario, fichas y backend opcional.
- **No verificado:** render visual de `preview-kokomi.html` en GitHub Pages de la rama, Safari iPhone físico, igualdad visual pixel-perfect, todas las 22 rutas y sus funcionalidades.
- **No incluido:** medios propietarios, imágenes Genshin, código de Bootstrap del producto comercial, reproductores sin permiso o scraping de streaming.

## Siguientes pasos de desarrollo incremental
1. Revisar el PR en GitHub, verificar cascada CSS y lint/sintaxis de JS, contrastar capturas móvil/escritorio desde despliegue temporal.
2. Ajustar tamaños/espacios con el vídeo al lado en un iPhone y comprobar buscador, favoritos, panel lateral, escapar/cerrar y scroll.
3. Integrar los cambios aprobados al tema público sin eliminar otras funciones; fusionar PR solo tras pruebas.
4. Completar progresivamente las vistas restantes en el sitio principal, sin afirmar cobertura funcional de 22 páginas hasta probarlas.
5. Mantener bitácora en `docs/PROJECT_CONTINUITY.md`.

## Verificación técnica
- JS del prototipo independiente: `node --check app.js` sin errores.
- Browser Chromium del prototipo independiente en recurso inyectado: 390x844 y 1440x900, menú móvil abre/cierra y la búsqueda de «dragón» devuelve una tarjeta; no hubo excepciones JS.
- El navegador automatizado de este entorno **bloqueó la navegación a archivos y a localhost**, de modo que la rama real aún necesita prueba end-to-end.
