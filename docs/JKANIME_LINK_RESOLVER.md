# Resolvedor de enlaces de JkAnime · 1UP Anime

Documentación técnica consolidada a partir de la integración probada en `jkanime_app` (`server/src/scraper.js`, `http.js`, `playwrightService.js` y sus guías `ARCHITECTURE.md`, `JKANIME_API.md`, `INDEXER_GUIDE.md`, `TEST_INFRA.md`).

Módulo: `server/src/jkanime-link-resolver.js` · CLI: `scripts/jkanime-link-resolver.mjs` · Pruebas: `tests/unit/jkanime-link-resolver.test.mjs`.

---

## 1. Idea central: HTTP primero, navegador después

Los reproductores internos de JkAnime (Desu `/jkplayer/um`, Magi `/jkplayer/umv|mg`, Desuka `/jkplayer/jk`) exponen el manifiesto HLS o el MP4 dentro del HTML del iframe. Leer ese HTML con una petición normal resuelve el flujo en **≈1 s**; arrancar Chromium para cada reproducción tarda decenas de segundos.

Orden de resolución:

1. **Caché** (TTL 30 min): si la entrada está vigente se devuelve al instante. Si expiró pero la URL sigue respondiendo, se revalida y se reutiliza.
2. **HTTP**: se extrae el manifiesto del HTML y se comprueba con una sonda `Range: bytes=0-1`.
3. **Navegador** (opcional): solo si HTTP no entrega un flujo, se usa Playwright con captura de respuestas multimedia y del `<video>`. En `1UP Anime` se inyecta como `browserResolver`; la CLI lo activa con `--browser`.

Las sondas y el caché evitan relanzar el navegador. El navegador queda como camino de contingencia, no como primera opción.

---

## 2. Extracción del flujo desde HTML

`extractPlayerStreamFromHtml(html)` prueba, en orden, cinco estrategias:

| # | Estrategia | Patrón |
|---|---|---|
| 1 | Base64 | `atob('aHR0cHM6Ly8...')` |
| 2 | Etiquetas | `<video src>`, `<source src>` |
| 3 | Configuración del player | `url: '...'`, `src: '...'` |
| 4 | hls.js | `loadSource('...')` |
| 5 | Último recurso | cualquier `.m3u8`/`.mp4` absoluto |

Cada candidato pasa por `classifyStreamCandidate()`, que:

- acepta solo `http:` / `https:`;
- resuelve URLs relativas contra el dominio activo;
- **descarta IPs privadas y `localhost`** (protección SSRF): `10.*`, `127.*`, `169.254.*`, `192.168.*`, `172.16–31.*`, `.local`;
- devuelve `{ url, type }` con `type: 'hls'` o `'file'`; `/stream/jkmedia/` se trata como `file` aunque no lleve extensión (JkPlayers sirve MP4 progresivo sin extensión).

`probePlayerStream(url)` hace dos intentos (el CDN puede responder 403/429 de forma puntual) y considera válidos `200`, `206` y `416`.

### Caso Desuka

`GET /jkplayer/jk?u=stream/jkmedia/...` es un wrapper: el recurso real está en `https://jkplayers.com/stream/jkmedia/...`. `getJkAnimeDirectStreamUrl()` traduce ese parámetro `u` a la URL del CDN y la sonda como recurso de video (abrir `/stream/jkmedia/...` como documento devuelve una página no encontrada).

---

## 3. Respaldo de dominio ante Cloudflare

`jkanime.net` puede responder `403` con `cf-mitigated: challenge`. El comportamiento:

1. `createHttpClient()` detecta el cabecero `cf-mitigated: challenge` y marca el error con `cfChallenge: true`. Esa respuesta **no se guarda en caché** (envenenaría la caché).
2. `getTextWithMirror()` conmuta la base a `https://jkanime.org` (mismo catálogo, sin reto) y reintenta la misma ruta durante el resto de la sesión (`getBase()` expone la base activa; `resetBase()` la devuelve a `.net`).
3. Funcionan en el espejo: ficha, `/directorio`, `/ajax/episodes/...` y páginas de capítulo (≈1–3 s).
4. El cliente HTTP mantiene un **CookieJar por host** y un retardo entre peticiones; respeta `Set-Cookie` y reintentos con `Retry-After`.

Cambiar `User-Agent`, *client hints* o galletas no evita el bloqueo: Cloudflare actúa por huella TLS/IP. El espejo `.org` es la vía operativa.

---

## 4. Metodología de ingestión (parsers ya presentes en 1UP)

Los parsers de catálogo/ficha/capítulo viven en `server/src/jkanime-playwright-scraper.js` y se reutilizan:

1. **Catálogo**: Laravel inyecta `var animes = {"current_page":1,"data":[...],"last_page":102}` en `/directorio?p=N`. Se extrae con regex y se normalizan `id`, `slug`, título, póster, año, géneros y `studios` (objeto o string). Póster alternativo: `https://cdn.jkdesu.com/assets/images/animes/video/image/{slug}.jpg`.
2. **Portada**: enlaces `https://jkanime.net/{slug}/{numero}/` y slugs destacados, filtrando rutas reservadas (`directorio`, `horario`, `top`, `buscar`, `genero`, `assets`, …).
3. **Capítulos con CSRF**: `/ajax/episodes/{id}/{page}` responde `419` sin sesión. Se obtiene `<meta name="csrf-token">` de la ficha y se envían `Cookie`, `X-CSRF-TOKEN`, `X-Requested-With: XMLHttpRequest` y `_token` en el cuerpo. `http.js` mantiene las cookies de sesión en memoria.
4. **Enlaces del capítulo**: en `/{slug}/{numero}/` se mapean los `<a data-id="N">nombre</a>` a las líneas `video[N] = '<iframe src="...">'` y se decodifica en Base64 el array `var servers = [...]`. Se clasifica en `kind='player'` (Desu/Magi/Desuka y externos) o `kind='download'` (Mediafire, Mega, `c1.jkplayers.com/d/...`, con tamaño) y se deduplica por `kind:servidor:URL`.

`parseEpisodeLinks(html)` (alias de `parseEpisodeHtml`) devuelve `{ players, downloads }` ya normalizados.

---

## 5. Reparto de datos entre servidor y cliente

| Dato | Dónde | Motivo técnico |
|---|---|---|
| Ficha, capítulos, reproductores externos y descargas | SQLite `data/jkanime.db` (WAL) | URLs estables, independientes del cliente |
| Reproductores internos (Desu/Desuka/Magi) | `localStorage` del navegador | Sus URLs son firmadas y dependen de la IP; al renovar se guardan en el cliente |
| Último capítulo, pestaña y servidor elegidos | `localStorage` | Retomar la reproducción al recargar |
| Flujos HLS/MP4 resueltos | Caché del resolvedor (TTL 30 min) | Evita repetir la resolución |

Regla operativa: los reproductores externos y las descargas se leen siempre del servidor; los internos se sustituyen en el cliente por los que ese navegador guardó.

---

## 5b. Límite CORS/SOP: Node raspa, navegador reproduce

Actualización de la integración de origen: **el navegador no puede obtener las URLs del sitio por sí solo**.

- Ni `jkanime.net` ni `jkanime.org` envían `Access-Control-Allow-Origin`.
- El dominio principal añade `X-Frame-Options: SAMEORIGIN` y `Cross-Origin-Embedder-Policy: require-corp`.
- Un `fetch()` o la lectura de un iframe desde el SPA se bloquean por CORS/SOP.

Por eso la fase de raspado/resolución **debe ejecutarse en Node** (el módulo `server/src/jkanime-link-resolver.js` y su CLI).No tiene sentido intentar moverla al cliente: las cabeceras del sitio lo impiden, no es una limitación del código.

En cambio, el CDN de vídeo (`nika.playmudos.com`, `jkplayers.com`, …) **sí expone `Access-Control-Allow-Origin: *`**. La URL devuelta por el resolvedor es directamente reproducible en el navegador:

- `hls.js` con carga diferida para manifiestos `.m3u8`;
- `<video src>` nativo en Safari iPhone (HLS nativo).

`isBrowserPlayableStream(stream)` codifica esta distinción: devuelve `true` solo si la URL es HTTPS, apunta a un host que no sea `jkanime.net|org` y tiene forma de medio (`.m3u8`, `.mp4` o `/stream/jkmedia/`). `resolveJkAnimePlayerStream()` incluye el campo `browserPlayable` en su resultado para que la capa de UI sepa que puede entregar la URL al reproductor del cliente sin pasarla por un proxy de vídeo.

---

## 5c. Comportamiento del reproductor en el cliente

El flujo del reproductor de `jkanime_app` se replicó en `client/src/js/player-links.js` (global `window.OneUpPlayerLinks`) y se conectó a `episode-player.js`:

1. **Clasificación**: `isInternalPlayer()` / `splitLinks()` separan Desu/Desuka/Magi (y cualquier `/jkplayer/` en `jkanime.net|org`) de los reproductores externos y descargas.
2. **Guardado por cliente**: `saveStoredEpisodeLinks()` guarda en `localStorage` (`oneup_jkanime_client_v1`) **solo** las URLs internas, que son las ligadas a la IP. Las entradas antiguas que guardaban todos los enlaces se filtran al leer.
3. **Fusión**: `mergePlayerLinks(serverLinks, stored)` sustituye los internos genéricos del servidor por los que este navegador obtuvo, conserva los externos y propaga la advertencia `warning`. Si hubo reto Cloudflare, no se sobrescriben las URLs propias.
4. **Servidor recordado**: al elegir servidor se guarda `selectedPlayer` y se retoma al recargar el capítulo.
5. **Stream alternativo**: en los reproductores protegidos hay un botón «▶ Reproducir stream alternativo» que llama a `POST /player-stream`, obtiene el HLS/MP4 del CDN y lo reproduce con `hls.js` (carga diferida) o `<video>` nativo en Safari, sin iframe.
6. **Protección ampliada**: se detectan URLs tanto de `jkanime.net` como del espejo `jkanime.org`.

El endpoint del servidor en `server/src/catalog-service.js` expone:

```
POST /api/animes/:id/episodes/:num/player-stream
{ "url": "<player_url>", "refresh": false, "server": "Desu" }
```

y devuelve `{ url, type, browserPlayable, cached, resolvedAt? }` con `Cache-Control: no-store`. El endpoint `/links` también envía la cabecera `X-JkAnime-Warning` (URL-encoded) además del campo `warning` en el cuerpo.

---

## 6. API del módulo

```js
const r = require('./server/src/jkanime-link-resolver.js');

r.classifyStreamCandidate(url, base)              // -> { url, type } | null
r.extractPlayerStreamFromHtml(html, base)         // -> { url, type } | null
r.probePlayerStream(url, timeoutMs, fetchImpl)    // -> boolean
r.isBrowserPlayableStream(stream)                 // -> boolean (CDN con ACAO *)
r.getJkAnimeDirectStreamUrl(playerUrl)            // -> string | null
r.getBase() / r.resetBase() / r.switchToMirror(r) // control del espejo
r.createHttpClient({ delayMs, timeoutMs, retries, userAgent, fetchImpl })
r.getTextWithMirror(getText, url, options)        // texto con respaldo .org
r.resolvePlayerStreamOverHttp(playerUrl, opts)    // -> { url, type }
r.createStreamCache({ ttlMs, maxEntries, now })   // caché stale-while-alive
r.resolveJkAnimePlayerStream(playerUrl, {
  referer, forceRefresh, cache, http, fetchImpl, browserResolver, probe
})                                                // -> { url, type, browserPlayable, cached, resolvedAt? }
r.parseEpisodeLinks(html)                         // -> { players, downloads }
```

`browserPlayable: true` indica que la URL puede entregarse directamente al `<video>`/`hls.js` del navegador; `false` significa que apunta al sitio de JkAnime y debe resolverse antes en Node.

`resolveJkAnimePlayerStream` valida que la URL sea un reproductor interno compatible; si HTTP entrega un flujo **inalcanzable** (`PLAYER_STREAM_UNREACHABLE`) lanza el error en vez de recurrir al navegador, porque el enlace está caído o restringido por red y conviene elegir otro servidor o renovar el capítulo.

---

## 7. Uso por CLI

```powershell
node scripts/jkanime-link-resolver.mjs stream "https://jkanime.net/jkplayer/um?e=..." --refresh
node scripts/jkanime-link-resolver.mjs stream "https://jkanime.org/jkplayer/mg?e=..." --browser --referer "https://jkanime.org/slug/1/"
node scripts/jkanime-link-resolver.mjs links solo-leveling 1
node scripts/jkanime-link-resolver.mjs probe "https://cdn.example.com/v/master.m3u8"
```

| Comando | Función |
|---|---|
| `stream <playerUrl>` | Resuelve el HLS/MP4 real (HTTP → navegador opcional) |
| `links <slug> <num>` | Lista reproductores y descargas del capítulo |
| `probe <streamUrl>` | Comprueba disponibilidad con `Range: bytes=0-1` |

---

## 8. Variables de entorno

| Variable | Por defecto | Uso |
|---|---|---|
| `JKANIME_HTTP_DELAY_MS` | `600` | Retardo entre peticiones HTTP |
| `JKANIME_HTTP_TIMEOUT_MS` | `12000` | Timeout de petición |
| `JKANIME_HTTP_RETRIES` | `3` | Reintentos ante errores transitorios |
| `JKANIME_USER_AGENT` | Chrome 124 (Windows) | User-Agent del cliente HTTP |
| `JKANIME_DEBUG=1` | — | Registra el cambio al dominio espejo |

Los cambios en `server/src/**` requieren reiniciar el proceso Node.

---

## 9. Solución de problemas

| Síntoma | Causa probable | Acción |
|---|---|---|
| `PLAYER_STREAM_NOT_FOUND` | El HTML del reproductor no expone manifiesto | Probar `--browser` o renovar el capítulo |
| `PLAYER_STREAM_UNREACHABLE` | Manifiesto caducado o atado a otra IP | Renovar el capítulo o elegir otro servidor |
| `cfChallenge` / reto Cloudflare | `jkanime.net` respondió reto | El módulo ya cambia a `jkanime.org`; si el navegador está en modo visible se puede completar el reto manualmente |
| Iframe del reproductor en blanco | `cdn.jkanime.net/assets/dplayer.js` bloqueado por origen cruzado | Usar el flujo resuelto con `hls.js` |
| Flujo MP4 sin extensión | JkPlayers sirve `/stream/jkmedia/...` | `classifyStreamCandidate` ya lo clasifica como `file` |
| Reproductor no carga tras cambiar de red | URLs internas firmadas para otra IP | Renovar el capítulo en el nuevo cliente |
| Cambiaste `server/src/**` pero la API sigue con el código antiguo | El proceso Node en `4180` no se reinicia automáticamente (`dev:all` solo arranca Vite si el puerto ya responde) | Detener el proceso de `:4180` y volver a arrancar Express antes de `dev:all` |

> Nota operativa del proyecto de origen: `dev:all` avisa cuando detecta un servidor previo en `:4180` y **no** lo reinicia; existe un script `restart:server` que detiene el proceso. En 1UP Anime el resolver se ejecuta como módulo/CLI, así que basta con relanzar el proceso Node que lo use después de editar `server/src/jkanime-link-resolver.js`.

---

## 10. Verificación

```powershell
npm test                                             # todas las unitarias
node --test tests/unit/jkanime-link-resolver.test.mjs # 10 pruebas del resolver
node scripts/jkanime-link-resolver.mjs help
```

Las pruebas son unitarias: usan HTML y respuestas HTTP simuladas, no contactan con JkAnime ni necesitan Chromium. Por eso no se ven afectadas por Cloudflare.

---

## 11. Procedencia

Este documento resume la implementación operativa de `jkanime_app` (resolución HTTP-first, espejo automático, CookieJar/CSRF, caché con revalidación y separación de enlaces por cliente), incluida la actualización sobre CORS/SOP y el reinicio del servidor. El código de `1UP Anime` fue adaptado a su arquitectura: reutiliza los parsers existentes, inyecta `fetch`/caché/navegador para que sea probatable y no añade dependencias nuevas.
