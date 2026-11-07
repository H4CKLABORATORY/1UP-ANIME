# Política de caché del catálogo (Fase 3)

Una sola política, definida en un solo sitio: `catalog-cache-policy.js`
publica `window.OneUpCachePolicy` y se carga antes que `studio.js` en
todas las páginas. `studio.js` y `catalog-plus.js` leen de ahí sus TTL y
prefijos de clave; no existe ningún otro TTL de catálogo en el código.

## La política

- **Snapshot primero + stale-while-revalidate (SWR):** las vistas de
  catálogo pintan de inmediato el snapshot local (`data/catalog.json`,
  servido con el sitio y cacheado por el service worker) o la última
  lista cacheada, aunque esté caducada. En segundo plano se pide a
  AniList y la interfaz solo se repinta si los datos cambiaron
  (huella = ids ordenados + número de ítems, `fingerprint`).
- **El snapshot estático no caduca en el cliente:** es el respaldo
  offline. Su frescura es su propio campo `updated`. Si AniList falla,
  se sigue sirviendo el snapshot; nunca una pantalla de error.
- **TTL únicos por tipo de dato** (en `catalog-cache-policy.js`):
  - Listas de catálogo (localStorage, `studio.js`): 8 h frescas;
    reutilizables como stale para SWR hasta 24 h.
  - Snapshots por consulta de AniList (sessionStorage, `ask()` de
    `catalog-plus.js`): 2 h.
  - Resultados por ruta (sessionStorage, `catalog-plus.js`): 2 h.
- **Claves versionadas:** todos los prefijos llevan la versión de la
  política (`v44`), y esa versión es exactamente el sufijo de la caché
  del service worker en `sw.js`
  (`oneup-stream-integrated-v44-phase3-catalog-20261107`). Subir ambas
  a la vez invalida todas las claves viejas de golpe.
- **Todo automático:** sin controles ni elecciones de caché para el
  visitante (Regla 2). Sin configuración (Regla 1).

## Robustez asociada (scripts de refresco)

- `scripts/refresh-common.mjs` concentra lo compartido por
  `refresh-catalog.mjs` y `refresh-airing.mjs`:
  - **Candado de concurrencia** (brecha 6 de la auditoría §8.4): un
    lockfile compartido con expiración de stale a los 30 min. Una
    segunda ejecución simultánea (manual o de workflow) sale con
    código 0 y el mensaje `[refresh-lock] … skipping this run`, sin
    hacer ninguna petición a AniList.
  - **Caídas de AniList** (brecha 7): HTTP 403 y 5xx son reintentables
    con backoff (respetando `Retry-After`); agotados los reintentos,
    cada script cae a su snapshot/archivo anterior, como ya hacía.
  - **Disciplina de tasa:** ambos scripts leen
    `X-RateLimit-Remaining` / `X-RateLimit-Reset` tras cada respuesta
    y esperan a la ventana de reset cuando quedan ≤2 peticiones,
    además de su pausa mínima entre llamadas (2,2 s / 2,3 s).
- Los clientes de navegador aplican lo mismo: `studio.js` (cola
  serializada ≥2,1 s, 429/403/5xx con reintentos) y `catalog-plus.js`
  (`ask()` con la misma disciplina y respaldo por snapshot).
