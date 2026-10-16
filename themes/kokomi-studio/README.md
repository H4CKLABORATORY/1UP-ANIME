# 1UP Anime / Studio streaming design (Kokomi-inspired)

**Inspiración de estructura:** [Kokomi, TemplateMonster ID 520462](https://www.templatemonster.com/website-templates/kokomi-online-anime-and-anime-series-responsive-entertainment-website-template-520462.html). Es un producto comercial; **NO contiene sus archivos originales** ni su código CSS, JavaScript, imágenes, videos o tipografías de pago.

Esta implementación es una dirección artística propia para el proyecto **1UP Anime** creada sobre el HTML/CSS/JS que ya funcionaba en GitHub Pages.

## Qué se ha desarrollado

- Cabecera original tipo estudio, navegación adaptada y diseño limpio para escritorio.
- Hero con arte real del anime destacado proveniente del catálogo de AniList/Jikan, sin nuevos assets de terceros incorporados al repositorio.
- Rail de portadas con scroll-snap y tarjetas originales reutilizando datos y favoritos del proyecto.
- Accesos por categorías: En emisión, Calendario, Películas y Comunidad. Los destinos usan la navegación real de 1UP.
- Franja con **próximos episodios anunciados**, obtenida de `data/airing.json`, con hora y episodio; **no promete enlaces de reproducción**.
- Compatibilidad con la dirección editorial Halloween 2026. Si se combina con `themes/october-2026/`, Halloween modifica exclusivamente el ambiente temporal sin alterar cuentas o reproducción.
- Soporte táctil para iPhone, motion reducido y accesibilidad básica.

## Vista previa

https://h4cklaboratory.github.io/1UP-ANIME/preview-kokomi.html

La prueba automatizada está en `scripts/e2e-browser.mjs`: prueba catálogo, accesos, episodios, diálogo, sonido opcional y tamaño de pantalla móvil.

## Licencias y relación con TemplateMonster

La ficha comercial de Kokomi anuncia licencias propias (personal y comercial). Si el titular compra la plantilla y quiere utilizar **exactamente** sus archivos, deberá aportar el ZIP licenciado; habrá que comprobar los términos de su uso y adaptar las dependencias. Haber visto la demo no autoriza redistribuir los archivos ni usar las imágenes del producto. Ninguna de las dependencias originales de Kokomi (jQuery, Bootstrap, etc.) es necesaria para este diseño propio.

## Integración segura

El diseño de estudio reside en `themes/kokomi-studio/theme.css` y `theme.js`.
La página original `index.html` sigue funcionando si se elimina esta capa.
Para activarlo en producción, añadir la clase `oneup-kokomi` al `body` e incluir CSS y JS **después de los estilos de base** y antes del evento Halloween, si corresponde. Revisar primero los resultados del flujo `ONEUP Browser Acceptance` de 390px y 1360px, y los pantallazos de esa ejecución.

No copiar assets de terceros, no declarar tráilers ni episodios disponibles sin fuentes reales, no sustituir autenticación ni bases de datos.
