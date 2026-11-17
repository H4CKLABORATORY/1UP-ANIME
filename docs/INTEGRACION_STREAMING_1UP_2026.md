# 1UP ANIME — Integración modular de catálogo, reproducción y comunidad

> Se conserva íntegramente el estilo existente Kokomi/octubre y la portada de `main`.

## Arquitectura aplicada

```text
GitHub Pages / Safari iPhone / navegadores de escritorio
    index.html → studio.js → ficha del anime
              ├─ AniList/Jikan + snapshot de metadatos (NO videos)
              ├─ episode-player.js (7 posiciones por episodio)
              │    ├─ hls-adapter.js (HLS nativo o hls.js diferido)
              │    └─ iframe admitido cuando el dueño permita la incrustación
              ├─ episode-comments.js (sincroniza el episodio de la conversación)
              │    ├─ Supabase opcional: supabase-episode-backend.js
              │    └─ Firebase actual de respaldo
              └─ sw.js (solo caché de la aplicación; nunca cachear segmentos ajenos)
GitHub Actions → chequeos de HLS, contrato de fuentes, UI, comentarios y seguridad
DexterAnimeSync → valida hasta 7 fuentes declaradas; ninguna URL se considera
```

## Fuentes de reproducción

- Una ficha ofrece hasta **siete espacios**, no siete proveedores activos ni siete copias automáticas.
- Admitidos: MP4, WebM, HLS (.m3u8) en HTTPS, YouTube oficial identificado por videoId y proveedores permitidos explícitamente en el reproductor.
- No autoiniciar videos. Si la fuente falla, mostrar estado y permitir cambiar manualmente. Si no está configurada, botón deshabilitado.
- Scraping de **metadatos públicos** debe respetar acceso permitido, condiciones y límites. El catálogo de anime no es un almacén de episodios.


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

El dominio y título son ficticios.

## Opciones de hospedaje y distribución

1. **Incrustaciones permitidas:** sin coste de distribución de video propio en 1UP; depende de que el proveedor permita insertar ese contenido.

Si en el futuro se despliega infraestructura de origen, usar HTTPS, mínimo privilegio, WAF, acceso administrativo por canales autenticados, restricciones de red al origen y copias de respaldo.

## Comunidad opcional

- Firebase existente permanece. Supabase solo se utiliza si el propietario crea un proyecto, configura `supabase-config.js` con clave **pública** e instala el esquema RLS bajo revisión.
- La preparación incluye políticas RLS, controles para escritura por autor, anti-spam y separación de comentarios/progreso, pero **no** implica un backend conectado hoy.
- Los comentarios se sincronizan con el episodio seleccionado por el espectador, no se inventan comentarios falsos.

## Pruebas y límites

- `node scripts/check-hls-browser.mjs`: puentes HLS, limpieza y errores simulados sin streaming.
- `node scripts/test-media-source-contract.mjs`: validación de fuentes y límites.
- `node scripts/check-ui.mjs`: invariantes de la web actual.
- `node scripts/e2e-browser.mjs`: pruebas reales de Chromium para móvil simulado/escritorio (requiere Playwright).
- Esta rama integra código que ya se había desarrollado en PR #7, #8, #10 y #11; no fusionar esas ramas antiguas a ciegas sin revisar sus conflictos.

## Estado al crear esta rama

Código preparado para revisión, no publicado en `main`. No se han instalado servidores externos ni configurado bases de datos.
