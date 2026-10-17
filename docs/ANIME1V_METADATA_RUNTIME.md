# Anime1v metadata runtime for 1UP ANIME

This service installs **upstream code by FxxMorgan** from https://github.com/FxxMorgan/anime1v-api at the pinned commit `6e54a75d894532b033c9e933772cdf3720842206` (MIT license). It loads only the `animeav1.service` search and catalog functions; it never loads or exposes the upstream Express router.

Build: `bash render/anime1v-source/build.sh`

Start: `node render/anime1v-source/server.js`

Render free service configuration: Node 22, branch `feature/anime1v-metadata-runtime-20261017`, region Virginia, with environment variable `API_KEYS` set to a strong 32+ character secret. The code refuses to start if no secret exists.

Public paths:
- `GET /health`: operational check with `streaming:false`.
- `GET /api/v1/anime/search?q=...&domain=animeav1`: metadata search, requires `X-API-Key`.
- `GET /api/v1/anime/catalog?page=1&provider=animeav1`: metadata catalog, requires `X-API-Key`.

**Everything else returns 404**, including `/api/v1/anime/resolve`, `/episode`, `/download` and `/image-proxy`. Responses include only title/image/provider metadata. No episode URLs, HLS, MP4, or download links are returned. Source credits: FxxMorgan.

Once deployed, set `ANIME1V_BASE_URL` and `ANIME1V_API_KEY` on the existing `oneup-anime-discovery` Render service. Do not put the secret in the GitHub repo or browser config. Keep Jikan as labelled fallback for unsupported providers or upstream outages. Validate search returns real `source: anime1v` results before describing it as live.

**Copyright:** MIT applies to the software, not to anime episodes. Only use the separate 1UP player with owned or licensed video sources.
