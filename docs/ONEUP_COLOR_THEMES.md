# 1UP Anime — Temas de color

**Estado:** PR [#41](https://github.com/H4CKLABORATORY/1UP-ANIME/pull/41) para la página pública. Revisar CI, merge y despliegue real antes de decir que está publicado.

## Paletas disponibles
- **Esmeralda (por defecto):** fondo casi negro, verde elegante y contenido protagonista; acentos contenidos, no luz neón en todas las superficies.
- **Original:** estilo 1UP/Kokomi actual sin sobrescrituras de paleta, seleccionable en cualquier momento.
- **Violeta:** fondo nocturno y acentos malva, misma estructura funcional.

## Uso
- Escritorio: botón **Cambiar tema de colores** junto a búsqueda y cuenta.
- iPhone/móvil: menú ☰ → **Colores de 1UP Anime** → Esmeralda, Original o Violeta.
- La elección se recuerda en el **navegador del propio dispositivo** mediante `localStorage`. No se envía a terceros ni necesita iniciar sesión. Si el almacenamiento está bloqueado se usa Esmeralda.
- El modo Original mantiene las clases/estilos actuales, sin revertir funciones o borrar datos de usuario.

## Implementación original
- `themes/oneup-palette/selector.js` aplica una lista blanca de tres IDs y crea los controles accesibles; no lee APIs de anime, no guarda secretos ni descarga hojas de estilo externas.
- `themes/oneup-palette/selector.css` modifica solo colores, fondos, bordes y señales de foco de la interfaz principal. La estructura, rutas, catálogo, comentarios, contenido y reproductor no cambian.
- `index.html` activa Esmeralda como valor de arranque, carga el selector y deja intacto el resto de módulos.
- `sw.js` incluye ambos archivos en la precaché y cambia la versión para actualizar instalaciones existentes sin borrar cachés de otros proyectos GitHub Pages.

## Verificación y publicación
- CI: `node scripts/e2e-oneup-palette.mjs` en `.github/workflows/browser-acceptance.yml`.
- Prueba Chromium real en 320 / 390 / 1366 px: apertura del selector, persistencia tras recargar, cambio a Original sin heredar CSS de color, sincronización de `aria-pressed`, 44 px de CTA, ausencia de desbordamiento horizontal, modo de movimiento reducido y capturas.
- No confundir emulación móvil Chromium con Safari en un iPhone físico; Safari real queda por confirmar.
- Antes de merge: inspeccionar resultados de CI del HEAD actual y comprobar que no hay conflictos con trabajo reciente. Después: verificar GitHub Pages, que los dos recursos devuelvan HTTP 200 y que realmente pueda cambiarse de tema.

## Referencias de patrones, no de código copiado
- [Crunchyroll rediseño de navegación y descubrimiento](https://www.crunchyroll.com/news/latest/2021/3/2/crunchyroll-launches-new-website-for-us-members)
- [MDN color-scheme](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/color-scheme)
- [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/)

**Licencias:** no se incorpora código ni material gráfico privado de Crunchyroll o TemplateMonster. La funcionalidad y estilos fueron creados específicamente para 1UP Anime.
