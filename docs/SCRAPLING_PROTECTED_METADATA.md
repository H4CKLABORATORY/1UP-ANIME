# 1UP Anime — Scrapling metadata service (optional and disabled by default)

**State:** optional code review proposal; it is not deployed, enabled, or connected to the public frontend. Scrapling is a Python library for HTML fetching/parsing, not a video provider.

## Security / access

- Never commit a password, the exposed Parallel AI API key, or any Render/GitHub secret.
- Set `SCRAPLING_API_TOKEN` in private server environment variables (minimum 32 random characters). This authenticates trusted server-to-server callers via `X-API-Key`, checked with constant-time comparison.
- Bind behind HTTPS, as supplied by a trusted host such as Render. **Never expose this secret in GitHub Pages or client-side JavaScript.** The existing Node metadata gateway can act as the public cache/rate-limited proxy in a later reviewed integration, if useful.
- Explicitly set `SCRAPLING_SOURCE_APPROVED=1` **only after reviewing target website terms, robots.txt and source permission**. Disabled by default; 503 without approval.
- Source URL fixed to `https://jkanime.net/`; no arbitrary URLs/SSRF, video resolving, downloading, browser automation or anti-bot bypass.
- Read-only endpoint: `GET /api/v1/catalog?q=...`. It extracts only text titles and same-host canonical catalog URLs. `GET /health` reports state without credentials. Query lengths and rate limits bound resource use; requests cached 10 minutes.
- The code's token is an **access key**, not a guarantee of rights or a substitute for TLS, rate-limiting or provider permission.

## Review / installation (requires approval and a separate Python runtime)

1. Review the source site's terms/robots and the data permitted; consult source owners if necessary. Leave `SCRAPLING_SOURCE_APPROVED` unset until cleared.
2. Use a Python 3.11+ service, `pip install -r render/scrapling-metadata/requirements.txt`. Audit and pin the installed Scrapling release/dependencies before production.
3. Start: `python render/scrapling-metadata/server.py`; set `PORT` and `SCRAPLING_API_TOKEN` privately. If using Render, **confirm the workspace and no-cost capacity before creating another service**.
4. A trusted backend can request `GET /api/v1/catalog?q=...` with `X-API-Key`. Never call this endpoint directly from a public browser or include the key in URL/query parameters.
5. Run offline tests: `python -m unittest discover -s render/scrapling-metadata -p 'test_*.py' -v`.
6. Before any frontend rollout: add a safe backend adapter with explicit truthful source labels, confirm robots/terms, protect caching, run CI and browser/Safari QA. Keep existing Anime1v/Jikan pipeline as the default.

## Limitations

Live HTML selectors have **not been validated** on JKAnime, and the source may refuse access. The service must not attempt to bypass access controls. It returns **metadata only**, not episodes or video rights. Its upstream library BSD-3-Clause license covers code, not third-party content. No claims of zero hosting cost or completed deployment are made.

## Modo invisible para visitantes: recopilador programado (propuesto, no desplegado)

La petición del propietario es que Scrapling **no aparezca en el menú, ni como botón ni en el frontend**. Para ello se añadió `render/scrapling-metadata/snapshot.py` y el workflow `.github/workflows/scrapling-background-catalog.yml`. No hay interfaz administrativa pública ni rutas de vídeo.

- **Ejecución:** una vez al día (09:43 UTC) desde GitHub Actions, **solo después de fusionar la PR** y de que el propietario configure las dos variables de aprobación y el secreto. No depende de ChatGPT ni puede ocultarse a quien tenga acceso al repositorio.
- **Parámetros privados:** desde GitHub → Settings → Secrets and variables → Actions, configurar `SCRAPLING_AUTOMATION_TOKEN` como *secret* aleatorio de 32+ caracteres; en *variables*, `SCRAPLING_SOURCE_APPROVED=1` únicamente si se ha confirmado permiso de extracción, y `SCRAPLING_AUTOMATION_ENABLED=1` cuando realmente se desea activar. Sin cualquiera de ellos, la ejecución no consulta la fuente.
- **Control de permisos:** tras las aprobaciones, revisa `https://jkanime.net/robots.txt` en cada ejecución. Si no puede descargar el archivo o la política prohíbe la ruta, aborta sin consultar la página. No utiliza navegador oculto, evasión de CAPTCHA/DRM ni proxies rotatorios.
- **Resultado:** máximo 24 títulos y enlaces públicos de la portada, sin descripciones copiadas, episodios ni URLs de vídeo; el snapshot se guarda en `data/scrapling-discovery.json` **solo si cambió**. Reutiliza `scripts/oneup-safe-push.sh` para no sobrescribir cambios ajenos. No reemplaza `data/catalog.json`, ya actualizado mediante AniList/Jikan.
- **Visibilidad real:** el nuevo JSON no aparece en la navegación del sitio; sin embargo, tanto el código como el JSON son descubribles en un repositorio público y, si GitHub Pages los publica, también son accesibles por URL. Para que el código *tampoco sea público*, debe moverse a un repositorio privado/servidor privado; no basta una contraseña colocada en el frontend.
- **No se ha activado** ni validado el acceso en directo a JKAnime. La verificación solo cubre contrato y seguridad sin red. Hay que confirmar también las condiciones de uso y la política robots; actualmente no se pudo verificar esa política de forma independiente.
- **Pruebas offline:** `python -m unittest discover -s render/scrapling-metadata -p 'test_*.py' -v`, incluyendo rechazo sin clave, denegación por robots, normalización sin medios, escritura atómica y ausencia de commits cuando no cambian los datos.

**No confundir:** títulos y enlaces de catálogo no habilitan reproductores ni permisos de distribución. Este módulo ofrece datos opcionales para un posterior cruce con el catálogo AniList; todavía no está conectado a tarjetas de frontend.
