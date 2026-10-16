# 1UP Anime — prioridad de reproducción gratuita

## Decisión del producto
El flujo principal es catálogo → ficha → episodio → idioma → fuente → reproducción dentro de 1UP, sin pago ni cuenta obligatoria. Los enlaces a plataformas sirven de información adicional; no sustituyen un episodio integrado. La gratuidad al espectador no determina el permiso de distribución ni elimina costes de infraestructura.

Se preservan Kokomi y el motor actual. No construir otra aplicación ni otro reproductor independiente. Hasta siete posiciones por episodio, habilitadas solo con fuentes válidas. No presentar idiomas inferidos del país del anime ni servidores inexistentes.

## Separación de responsabilidades
1. Catálogo AniList/Jikan: títulos, arte, fechas y metadatos; no acredita disponibilidad de episodios.
2. Manifiesto editorial `data/licensed-media.json`: episodios y fuentes propias/autorizadas verificadas por el editor; idioma, calidad y subtítulos pertenecen a cada fuente, con valores heredados del episodio.
3. Reproductor: MP4/WebM, HLS nativo en Safari o hls.js, y embeds compatibles tras pulsar. Limpiar recursos al cambiar episodio/fuente/ruta.
4. Alojamiento intercambiable: almacenamiento propio o servicio/CDN con permiso y CORS apropiado. El frontend recibe URLs HTTPS y no credenciales privadas.
5. Comunidad opcional: comentarios y perfiles no impiden ver contenido. El almacenamiento local no equivale a sincronización remota.

## Tres formas de incorporar contenido
- Incrustaciones permitidas por el titular y proveedor; conservar restricciones y controles del proveedor.
- Archivos propios/autorizados en un alojamiento de terceros con permiso de distribución.
- Archivos propios/autorizados en almacenamiento y CDN administrados. Una CDN propia no es requisito inicial.

Automatizar metadatos y validar manifiestos es independiente de extraer videos. No se implementan extracción de streams protegidos, descarga/republicación sin permiso, evasión de DRM o mecanismos para ocultar responsabilidades y pagos.

## Operación futura, sin activar gastos
La codificación a calidades adaptativas debe ejecutarse fuera de GitHub Pages, con una cola y trabajos idempotentes. Publicar HLS y WebVTT en almacenamiento compatible, mantener inventario de derechos, retirar fuentes revocadas y verificar errores/CORS/dispositivos antes de activarlas. No hay cola, codificador ni CDN contratados/configurados en este ciclo.

El origen debe protegerse con acceso mínimo y administración autenticada; no exponer secretos en el navegador. Un proxy inverso no elimina la necesidad de seguridad de aplicación. Medir consumo de distribución y fijar límites de presupuesto antes de provisionar servicios.

## Criterio de aceptación
Probar cambio de anime, episodio, idioma, servidor, errores y navegación en móvil/escritorio; los fixtures de prueba no se publican como episodios. Probar HLS y subtítulos reales en Safari físico cuando se disponga de contenido y dispositivo. Si faltan medios, mostrar estado vacío explícito.

Estado actual: no hay episodios reales configurados. Ninguna mejora de interfaz acredita catálogo reproducible completo. Próximas dependencias: medios verificables y configuración de alojamiento; producción, compras y merges siguen sujetos a aprobación.
