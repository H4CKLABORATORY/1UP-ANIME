# Render — 1UP ANIME discovery gateway

This small Node.js web service runs at /anime1vDiscovery on Render.
- If ANIME1V_BASE_URL and ANIME1V_API_KEY are configured, server-side calls use FxxMorgan Anime1v search/catalog only.
- Otherwise it supplies *actual public metadata from Jikan*, labelled source=jikan and streaming=false.
- It does not expose episode/resolve/download or copyrighted media streams.
- The service has no NPM dependencies; start with node render/anime1v-gateway.js.
- Health is GET /health; fields include upstream (anime1v or jikan_fallback).
- Request origin restricted to https://h4cklaboratory.github.io; rate-limit per instance.

### Render connection
Workspace: Douglas's workspace (owner-confirmed).
Repository: https://github.com/H4CKLABORATORY/1UP-ANIME ; branch main ; Runtime Node ; plan free ; region virginia.
Build: echo '1UP Anime metadata service ready' ; Start: node render/anime1v-gateway.js.
No private API key should be placed in code, a public JSON file, or the browser.
After Render deploy succeeds, copy the actual service URL + /anime1vDiscovery into data/anime1v-config.json and enable the panel.
Restart or deploy the service after any environment changes.

### What remains
Running the service does NOT deploy FxxMorgan's upstream program. To enable real Anime1v metadata (instead of Jikan fallback), deploy a separately authorized Anime1v source and configure ANIME1V_BASE_URL and ANIME1V_API_KEY as Render env vars. Check license and upstream terms. The software MIT license does not grant streaming rights to episodes hosted by third parties.
Firebase functions are optional in this route; the standalone Render service replaces the discovery gateway for public metadata.
Never claim actual episodes playable just because the discovery service is online.
