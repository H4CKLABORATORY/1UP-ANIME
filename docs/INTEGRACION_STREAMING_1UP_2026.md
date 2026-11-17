# 1UP ANIME — Integración modular de catálogo, reproducción y comunidad

> Rama de integración para revisión. No es un despliegue de producción y no incluye episodios ni licencias de anime.
> Se conserva íntegramente el estilo existente Kokomi/octubre y la portada de `main`.

## Arquitectura aplicada

```text
GitHub Pages / Safari iPhone / navegadores de escritorio
  index.html → studio.js → ficha del anime
       ├─ AniList/Jikan + snapshot de metadatos
       ├─ episode-player.js (7 posiciones por episodio)
       │    ├─ data/licensed-media.json (fuentes de video configurables)
       │    ├─ hls-adapter.js (HLS nativo o hls.js diferido)
       │    ├─ MP4 / WebM directos
       │    └─ iframe para reproductores externos
       ├─ episode-comments.js (sincroniza el episodio de la conversación)
       │    ├─ Supabase opcional: supabase-episode-backend.js
       │    └─ Firebase actual de respaldo
       └─ sw.js (caché de la aplicación)
GitHub Actions → chequeos de HLS, contrato de fuentes, UI y comentarios
DexterAnimeSync → valida hasta 7 fuentes declaradas
```

## Fuentes de reproducción

- Una ficha ofrece hasta **siete espacios** para servidores y fuentes.
- La configuración se realiza en `data/licensed-media.json`.
- Formatos soportados: MP4, WebM, HLS (.m3u8) en HTTPS, YouTube y reproductores integrados.
- Si la fuente falla, muestra estado y permite cambiar manualmente al siguiente servidor.

### Ejemplo de configuración de fuentes

```json
{
  "version": 1,
  "entries": {
    "mal-12345": {
      "episodes": [{
        "number": 1,
        "title": "Episodio de muestra",
        "sources": [
          {
            "name": "CDN principal",
            "rights": "owned",
            "src": "https://media.example.com/demo/ep01.m3u8",
            "mime": "application/vnd.apple.mpegurl",
            "language": "es",
            "quality": "720p"
          }
        ]
      }]
    }
  }
}
```

El dominio y título son ficticios. Para un video real hay que introducir una URL verdadera autorizada, verificar HTTPS y compatibilidad CORS; probar en Safari de iPhone y escritorio.

## Opciones de hospedaje y distribución

1. **Incrustaciones permitidas:** sin coste de distribución de video propio en 1UP; depende de que el proveedor permita insertar ese contenido.
2. **Alojamiento de terceros:** para archivos propios/licenciados. Comparar cuotas, ancho de banda, reproducción móvil, enlaces expiran, moderación de contenido, privacidad y contratos.
3. **Autoalojamiento futuro:** objeto almacenamiento + transcoding FFmpeg + HLS + CDN + tasa de transferencia. No añadir un servidor/CDN a GitHub Pages por error: es un sitio estático. El costo y el mantenimiento crecen con el tráfico.

Si en el futuro se despliega infraestructura de origen, usar HTTPS, mínimo privilegio, WAF, acceso administrativo por canales autenticados, restricciones de red al origen y copias de respaldo. Un proxy o CDN protege infraestructura, pero no oculta obligaciones legales ni sustituye los permisos de distribución. No integrar sistemas para ocultar pagos o identidad.

## Comunidad opcional

- Firebase existente permanece. Supabase solo se utiliza si el propietario crea un proyecto, configura `supabase-config.js` con clave **pública** e instala el esquema RLS bajo revisión.
- Ninguna clave `service_role`, secreto de Supabase o token de GitHub debe aparecer en archivos públicos.
- La preparación incluye políticas RLS, controles para escritura por autor, anti-spam y separación de comentarios/progreso, pero **no** implica un backend conectado hoy.
- Los comentarios se sincronizan con el episodio seleccionado por el espectador, no se inventan comentarios falsos.

## Pruebas y límites

- `node scripts/check-hls-browser.mjs`: puentes HLS, limpieza y errores simulados sin streaming.
- `node scripts/test-media-source-contract.mjs`: validación de fuentes y límites.
- `node scripts/check-supabase-option.mjs`: permisos y configuración desactivada.
- `node scripts/check-ui.mjs`: invariantes de la web actual.
- `node scripts/e2e-browser.mjs`: pruebas reales de Chromium para móvil simulado/escritorio (requiere Playwright).
- Las comprobaciones offline permiten verificar la lógica del reproductor y compatibilidad de navegadores.
- Esta rama integra código que ya se había desarrollado en PR #7, #8, #10 y #11; no fusionar esas ramas antiguas a ciegas sin revisar sus conflictos.

## Estado al crear esta rama

Código preparado para revisión, no publicado en `main`. El manifiesto `data/licensed-media.json` permanece sin episodios: **cero fuentes de video reales**. No se han instalado servidores externos ni configurado bases de datos.
