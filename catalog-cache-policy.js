/* 1UP Anime — THE catalog cache policy (Phase 3). Single source of truth.
 *
 * Every catalog cache in the browser clients (studio.js, catalog-plus.js)
 * reads its TTLs, key prefixes and version from this one object:
 * window.OneUpCachePolicy. Policy (see docs/CATALOG_CACHE_POLICY.md):
 *
 * - Snapshot-first + stale-while-revalidate: catalog views render the
 *   local snapshot (data/catalog.json, shipped with the site and cached
 *   by the service worker) or the last cached list IMMEDIATELY, then a
 *   background AniList refresh updates the UI only if the data changed.
 * - The static snapshot file itself never expires client-side: it is the
 *   offline fallback. Its freshness is its own `updated` timestamp.
 * - One TTL per data type (below), no other TTL may be invented inline.
 * - Cache keys are versioned with `version`, which MUST equal the
 *   service-worker cache suffix in sw.js (CACHE = prefix + version).
 *   Bumping both together orphans every old key at once.
 * - Fully automatic: no user-facing cache controls or choices (Rule 2).
 */
(function () {
  'use strict';
  var POLICY = {
    version: 'v44-phase3-catalog-20261107',
    /* Catalog lists kept in localStorage by studio.js. */
    catalogListTtlMs: 8 * 60 * 60 * 1000,
    /* A stale catalog list may still be rendered (SWR) up to this age
     * while a background refresh runs; beyond it, it is ignored. */
    catalogListStaleMaxMs: 24 * 60 * 60 * 1000,
    /* Per-query AniList snapshots kept in sessionStorage by
     * catalog-plus.js ask(): fallback for 429 / 403 / 5xx outages. */
    askSnapshotTtlMs: 2 * 60 * 60 * 1000,
    /* Per-route results kept in sessionStorage by catalog-plus.js. */
    routeCacheTtlMs: 2 * 60 * 60 * 1000,
    keyPrefix: 'oneup_',
    catalogKeyPrefix: 'oneup_catalog_v44_',
    askSnapshotKeyPrefix: 'oneup_anilist_snapshot_v44_',
    routeKeyPrefix: 'oneup_cache_v44_'
  };
  POLICY.isFresh = function (at, ttlMs) {
    return typeof at === 'number' && isFinite(at) && (Date.now() - at) < ttlMs;
  };
  /* Cheap change detector for SWR: the ordered ids plus the item count.
   * If the fingerprint is unchanged, the UI is NOT repainted. */
  POLICY.fingerprint = function (items) {
    if (!Array.isArray(items)) return '';
    var out = items.length + ':';
    for (var i = 0; i < items.length; i++) out += (items[i] && items[i].id ? items[i].id : '?') + ',';
    return out;
  };
  if (typeof window !== 'undefined') window.OneUpCachePolicy = POLICY;
  if (typeof globalThis !== 'undefined') globalThis.OneUpCachePolicy = POLICY;
})();
