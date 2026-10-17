# 1UP ANIME — Parallel AI Extract + Crunchyroll public discovery

**Status: optional proposal, NOT merged, NOT deployed, NOT connected to the public frontend.**

The user supplied a Parallel Extract example for the public Crunchyroll discovery page. The service can return excerpts/links for public metadata; this **does not provide anime videos, playback authorization, subscriber access, or episode licenses**. Its extraction is not an official Crunchyroll integration.

## What this implementation does

- Code: `render/parallel-crunchyroll/adapter.js` (Node.js; no external packages), one-shot runner: `render/parallel-crunchyroll/run-once.js`.
- Fixed source: `https://www.crunchyroll.com/es/discover`. Ad/tracking parameters are removed; no user-supplied target URLs or arbitrary requests.
- Fixed API endpoint: `POST https://api.parallel.ai/v1/extract`. Payload includes an objective and `advanced_settings.full_content=false`.
- Returned data: only series titles and links explicitly present in Markdown excerpts whose host is `crunchyroll.com` and path is a `/series/` page. If there are no qualifying links, returns an **empty list**, never invented entries.
- Bounded fetch: 12-second timeout, 256 KiB response maximum and up to 20 unique series. No automatic retries.
- Output includes `mode: catalog_only`, `streaming: false`, provider and last extraction time. No player URLs, HLS/MP4 or decryption methods.
- No public HTTP route or client-side token; it is a server-only helper and does not modify the existing Anime1v/Jikan gateway.

## Security, approval and zero-dollar budget

The user previously pasted a Parallel API key in chat. **Rotate the exposed key before any deployment. Do not paste it again or commit it.**

Parallel's Extract API may incur charges (the vendor advertises a per-URL price). Because 1UP Anime has a **zero-dollar budget**, this helper **refuses to make a network request by default**. Both flags must be explicitly enabled after the owner reviews and approves provider terms **and potential costs**:

- `PARALLEL_API_KEY`: new private server-side key; never in GitHub Pages, public JSON, browser JS or logs.
- `PARALLEL_CRUNCHYROLL_APPROVED=1`: only after source-access compliance review.
- `PARALLEL_BILLING_APPROVED=1`: only after explicit owner approval of possible API charges; do not set merely to test a mock.

Manual server-side usage after approvals, with the environment configured:

```bash
node render/parallel-crunchyroll/run-once.js
```

Do **not** add this script to cron or CI contacting Parallel. The CI test calls a mocked HTTP implementation and costs nothing.

## Tests and next step

1. Offline: `node --check render/parallel-crunchyroll/adapter.js && node scripts/test-parallel-crunchyroll.mjs`.
2. Review vendor pricing, Crunchyroll public website rules, actual extraction output and geographic availability. Never bypass logins, paywalls, DRM, rate limits or access restrictions.
3. Only if the owner explicitly accepts nonzero API usage, rotate/set secrets in the **owner-confirmed** Render workspace. Do not provision services without checking capacity.
4. Before merging, validate CI and keep Anime1v/Jikan as default. A server-side proxy and safe attribution are prerequisites for any future UI integration. Visitors must use legitimate provider pages for authorized playback.

Official references: https://parallel.ai/products/extract ; https://docs.parallel.ai/extract/extract-quickstart ; https://www.crunchyroll.com/es/discover
