# 1UP Anime — prioridad de reproducción gratuita

## Decisión del producto
El flujo principal es catálogo → ficha → episodio → idioma → fuente → reproducción dentro de 1UP, sin pago ni cuenta obligatoria. Los enlaces a plataformas sirven de información adicional.

Se preservan Kokomi y el motor actual. No construir otra aplicación ni otro reproductor independiente. Hasta siete posiciones por episodio, habilitadas con fuentes válidas.

## Separación de responsabilidades
1. Catálogo AniList/Jikan: títulos, arte, fechas y metadatos.
2. Manifiesto editorial `data/licensed-media.json`: episodios y fuentes configuradas por el editor; idioma, calidad y subtítulos pertenecen a cada fuente.
3. Reproductor: MP4/WebM, HLS nativo en Safari o hls.js, y embeds compatibles. Limpiar recursos al cambiar episodio/fuente/ruta.
4. Alojamiento intercambiable: almacenamiento propio o CDN con CORS apropiado. El frontend recibe URLs HTTPS.
5. Comunidad opcional: comentarios y perfiles no impiden ver contenido.

## Métodos de incorporación de contenido
- Incrustaciones y reproductores compatibles.
- Archivos en servicios de alojamiento de medios o CDN.
- Flujos HLS y videos MP4 directos.

## Operación futura, sin activar gastos
La codificación a calidades adaptativas debe ejecutarse fuera de GitHub Pages, con una cola y trabajos idempotentes. Publicar HLS y WebVTT en almacenamiento compatible, mantener inventario de derechos, retirar fuentes revocadas y verificar errores/CORS/dispositivos antes de activarlas. No hay cola, codificador ni CDN contratados/configurados en este ciclo.

El origen debe protegerse con acceso mínimo y administración autenticada; no exponer secretos en el navegador. Un proxy inverso no elimina la necesidad de seguridad de aplicación. Medir consumo de distribución y fijar límites de presupuesto antes de provisionar servicios.

## Criterio de aceptación
Probar cambio de anime, episodio, idioma, servidor, errores y navegación en móvil/escritorio; los fixtures de prueba no se publican como episodios. Probar HLS y subtítulos reales en Safari físico cuando se disponga de contenido y dispositivo. Si faltan medios, mostrar estado vacío explícito.

Estado actual: no hay episodios reales configurados. Ninguna mejora de interfaz acredita catálogo reproducible completo. Próximas dependencias: medios verificables y configuración de alojamiento; producción, compras y merges siguen sujetos a aprobación.
