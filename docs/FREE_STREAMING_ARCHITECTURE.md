# 1UP Anime — prioridad de reproducción gratuita

## Decisión del producto
El flujo principal es catálogo → ficha → episodio → idioma → fuente → reproducción dentro de 1UP, sin pago ni cuenta obligatoria.

Se preservan Kokomi y el motor actual. No construir otra aplicación ni otro reproductor independiente. Hasta siete posiciones por episodio, habilitadas solo con fuentes válidas. No presentar idiomas inferidos del país del anime ni servidores inexistentes.

1. Catálogo AniList/Jikan: títulos, arte, fechas y metadatos; no acredita disponibilidad de episodios.
2. Manifiesto editorial `data/licensed-media.json`: episodios, fuentes, idioma, calidad y subtítulos por fuente, con valores heredados del episodio.
3. Reproductor: MP4/WebM, HLS nativo en Safari o hls.js, y embeds compatibles tras pulsar. Limpiar recursos al cambiar episodio/fuente/ruta.
5. Comunidad opcional: comentarios y perfiles no impiden ver contenido. El almacenamiento local no equivale a sincronización remota.

## Tres formas de incorporar contenido

Automatizar metadatos y validar manifiestos es independiente de extraer videos.

## Operación futura, sin activar gastos
La codificación a calidades adaptativas debe ejecutarse fuera de GitHub Pages, con una cola y trabajos idempotentes. No hay cola, codificador ni CDN contratados/configurados en este ciclo.

Un proxy inverso no elimina la necesidad de seguridad de aplicación. Medir consumo de distribución y fijar límites de presupuesto antes de provisionar servicios.

## Criterio de aceptación
Probar cambio de anime, episodio, idioma, servidor, errores y navegación en móvil/escritorio; los fixtures de prueba no se publican como episodios. Probar HLS y subtítulos reales en Safari físico cuando se disponga de contenido y dispositivo. Si faltan medios, mostrar estado vacío explícito.

Estado actual: no hay episodios reales configurados. Ninguna mejora de interfaz acredita catálogo reproducible completo. Próximas dependencias: medios verificables y configuración de alojamiento; producción, compras y merges siguen sujetos a aprobación.
