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
