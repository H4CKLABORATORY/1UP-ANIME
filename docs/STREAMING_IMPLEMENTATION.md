# 1UP ANIME — sistema real de reproducción e infraestructura

**Estado:** 2026-10-16. El sitio desplegado actualmente es **GitHub Pages (solo HTML/CSS/JS)**. La infraestructura de alojamiento y las fuentes multimedia todavía requieren configuración externa. La existencia de un selector de servidor no implica que existan episodios servidos.

## Arquitectura aplicada a la web

```
GitHub Pages: catálogo + Kokomi + comentarios + menú + PWA
  → data/licensed-media.json
     → 7 posiciones de fuente HTTPS por episodio
       → MP4/WebM directos
       → HLS .m3u8 (nativo Safari, motor HLS compatible en otros)
       → incrustación permitida de plataformas oficiales
     → idiomas + pistas .vtt
     → botón para probar el siguiente servidor **solo tras error y pulsación**
  → backend opcional para cuentas y moderación
```

### Qué ya es funcional
- Código propio del reproductor, unificado con fichas y páginas Kokomi.
- Selector por temporada, episodio, idioma y hasta 7 servidores declarados.
- Reproducción MP4/WebM/HLS y subtítulos WebVTT.
- Liberación de videos y reproductores al cambiar de página.
- Validación reforzada: HTTPS, rechazo de hosts privados/credenciales/puertos extraños y de MIME incompatibles.
- Botón manual de respaldo tras error; no cambia de proveedor sin consentimiento del usuario.
- Manifest editable en `data/licensed-media.json`, contrato de fuentes en `scripts/media-source-contract.mjs`.
- Dato de catálogo desde AniList/Jikan, independiente de la disponibilidad de episodios.

### Qué **no** está desplegado
- GitHub Pages no almacena servidores de transcodificación, torrents, seedboxes o un CDN propio.
- El manifiesto activo `data/licensed-media.json` tiene `"entries": {}`. No hay episodios reproducibles ni se debe afirmar lo contrario.
- El archivo `infra/nginx/oneup-media-origin.conf.example` **es configuración opcional**, no un servidor en ejecución.
- Se necesita un dominio/origen real y capacidad de distribuir videos si se desea alojamiento externo.
- Los complementos comunitarios, torrents o páginas de streaming ajenas no otorgan por sí mismos derechos de reproducción.
- No se incluyen scraping de fuentes protegidas, evasión de restricciones, carga de obras sin permiso ni ocultación de pagos.

## Cómo agregar una serie reproducible

1. Tener autorización de distribución y los archivos multimedia propios o autorizados.
2. Alojar MP4 o segmentos HLS en una URL HTTPS accesible al navegador; configurar CORS exacto hacia `https://h4cklaboratory.github.io` si se requiere.
3. Ver `examples/licensed-media.example.json` y adaptar el identificador `mal-ID`, temporada, episodio, idioma, fuentes y WebVTT.
4. Añadir al JSON real `data/licensed-media.json` los episodios correctos, sin eliminar los demás.
5. Ejecutar `node scripts/test-media-source-contract.mjs`, `node scripts/test-episode-player.mjs`, `node scripts/check-hls-browser.mjs`.
6. Comprobar desde un navegador real que el servidor permite HTTP Range (MP4) y entrega `.m3u8`/`.ts`/`.m4s` con MIME y CORS correctos.
7. En iPhone Safari, comprobar audio, subtítulos y reproducción HLS. Los navegadores no pueden descifrar contenido DRM sin licencias de reproducción.
8. Verificar el costo de transferencia mensual antes de ampliar el catálogo.

## Instalación opcional del origen

Archivo de ejemplo: `infra/nginx/oneup-media-origin.conf.example`. Por defecto, exige un include de IPs permitidas del proxy y `deny all`, de modo que no es seguro copiarlo sin configurarlo y no arrancará sin certificados e include correctos. Este patrón es seguridad defensiva, no anonimización frente a requerimientos legales.

- Asegurar que la lista de IP del proxy se actualice desde datos oficiales y revisar sus cambios.
- Usar TLS y preferentemente el mecanismo de conexión autenticada entre CDN y origen que ofrezca el proveedor.
- No exponer SSH público; usar VPN/identidad. Nunca almacenar contraseñas ni claves privadas en este repositorio.
- Mantener la portada (GitHub Pages) y el servicio de medios separados para reducir superficie de ataque.
- Aplicar cuotas, controles de acceso a contenido no público y políticas de retención si hay subida de usuarios.

## Estado pendiente del logo

PR #22 mantiene preparada la firma MP4 de 3,2 s con sonido y poster, pero el video original todavía no está subido a GitHub. No fusionar esa rama hasta comprobar los tres binarios y pasar `scripts/verify-video-logo.mjs`. El logo anterior seguirá visible hasta entonces.

## Continuidad

Leer `AGENTS.md`, `docs/PROJECT_CONTINUITY.md` y este archivo; revisar el último commit antes de nuevas modificaciones. Registrar pruebas realizadas y no presentar simulaciones como acceso real a episodios.
