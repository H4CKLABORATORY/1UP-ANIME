/* 1UP Anime — Phase 6: licensed-media entries managed by the owner /
 * moderator in Supabase (public.oneup_licensed_media), merged with the
 * static data/licensed-media.json manifest.
 *
 * First-click rule: when Supabase is not configured (the committed
 * supabase-config.js stays null) or the request fails / times out, every
 * function here resolves to an empty list and the site behaves EXACTLY as
 * before Phase 6 — static manifest + snapshot only, no new UI, no error.
 *
 * Rule 12 lives in the database (see supabase/sql/oneup_licensed_media.sql):
 * RLS only ever exposes active + owned/authorized rows to the public, and
 * a CHECK makes active=true impossible without cleared, documented
 * rights. This module additionally re-checks rights client-side before
 * handing a source to a player (defense in depth, never the only gate).
 */
(function (global) {
'use strict';
const SDK = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.3/+esm';
const TABLE = 'oneup_licensed_media';
const SELECT = 'id,anime_id,season,episode_number,episode_title,provider,mode,video_id,source_url,language,quality,subtitles_url,rights_status,rights_note,active,created_by,created_at,updated_at';
let pending = null;
const conf = () => global.ONEUP_SUPABASE_CONFIG;
function enabled() {
  const c = conf();
  try {
    const u = new URL(c?.url || '');
    return u.protocol === 'https:' && !u.username && !u.password &&
      typeof c?.publishableKey === 'string' && c.publishableKey.startsWith('sb_publishable_');
  } catch { return false; }
}
async function client() {
  if (!enabled()) throw Error('Los episodios gestionados aún no están disponibles.');
  if (!pending) {
    pending = import(SDK).then(({ createClient }) => createClient(
      conf().url, conf().publishableKey,
      { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
    )).catch((error) => { pending = null; throw error; });
  }
  return pending;
}
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}
/* One DB row -> one player source, in the manifest's own source shape so
 * both consumers (episode-player.js sourceOf, studio.js mediaSources)
 * validate it with their existing gates unchanged. */
function rowToSource(row) {
  const name = String(row.provider || 'Fuente autorizada').slice(0, 45);
  const language = String(row.language || 'es-419').slice(0, 35);
  const quality = String(row.quality || 'No especificada').slice(0, 35);
  const rights = String(row.rights_status || '').toLowerCase();
  if (row.mode === 'official_embed') {
    return {
      mode: 'official_embed', provider: 'youtube', videoId: String(row.video_id || ''),
      name, language, quality, rights,
    };
  }
  const rawUrl = String(row.source_url || '');
  const mime = rawUrl.split('?')[0].toLowerCase().endsWith('.webm') ? 'video/webm'
    : rawUrl.split('?')[0].toLowerCase().endsWith('.m3u8') ? 'application/vnd.apple.mpegurl'
    : 'video/mp4';
  const source = {
    name, src: rawUrl, url: rawUrl, mime,
    language, quality, rights,
  };
  const subs = String(row.subtitles_url || '').trim();
  if (subs) {
    source.subtitles_es = subs;
    source.tracks = [{ url: subs, lang: 'es', label: 'Español' }];
  }
  return source;
}
/* DB rows for one anime -> manifest-shaped episode list:
 * [{season, number, title, language, sources:[...]}] sorted by number. */
function rowsToEpisodes(rows) {
  const byKey = new Map();
  for (const row of rows || []) {
    if (!row || row.active !== true) continue;
    if (!['owned', 'authorized'].includes(String(row.rights_status || '').toLowerCase())) continue;
    const season = Number(row.season) || 1;
    const number = Number(row.episode_number);
    if (!Number.isInteger(number) || number < 1 || number > 9999) continue;
    const key = season + ':' + number;
    if (!byKey.has(key)) {
      byKey.set(key, {
        season, number,
        title: String(row.episode_title || 'Episodio ' + number).slice(0, 120),
        language: String(row.language || 'es-419'),
        sources: [],
        origin: 'db',
      });
    }
    byKey.get(key).sources.push(rowToSource(row));
  }
  return [...byKey.values()].sort((a, b) => a.season - b.season || a.number - b.number);
}
/* Merge static-manifest episodes with DB episodes: same season+number
 * merges its sources (static first, DB appended); new numbers are added.
 * Pure function — the inputs are never mutated. */
function mergeEpisodes(staticEpisodes, dbEpisodes) {
  const byKey = new Map();
  const keyOf = (ep) => (Number(ep.season) || 1) + ':' + Number(ep.number ?? ep.episode);
  for (const ep of staticEpisodes || []) {
    if (!ep || typeof ep !== 'object') continue;
    byKey.set(keyOf(ep), { ...ep, sources: [...(Array.isArray(ep.sources) ? ep.sources : [])] });
  }
  for (const ep of dbEpisodes || []) {
    if (!ep || typeof ep !== 'object') continue;
    const key = keyOf(ep);
    const existing = byKey.get(key);
    if (existing) {
      existing.sources = [...existing.sources, ...(Array.isArray(ep.sources) ? ep.sources : [])];
    } else {
      byKey.set(key, { ...ep, sources: [...(Array.isArray(ep.sources) ? ep.sources : [])] });
    }
  }
  return [...byKey.values()].sort(
    (a, b) => (Number(a.season) || 1) - (Number(b.season) || 1) ||
      Number(a.number ?? a.episode) - Number(b.number ?? b.episode));
}
/* Public read for the players. NEVER throws: unconfigured, offline,
 * timeout or RLS denial all resolve to [] (static behavior preserved). */
async function fetchDbEpisodes(animeId) {
  const id = String(animeId || '');
  if (!/^(mal|al)-[1-9][0-9]*$/.test(id) || !enabled()) return [];
  try {
    const supa = await client();
    const query = supa.from(TABLE).select(SELECT)
      .eq('anime_id', id).eq('active', true)
      .in('rights_status', ['owned', 'authorized'])
      .order('episode_number', { ascending: true }).limit(200);
    const result = await withTimeout(Promise.resolve(query), 5000);
    if (!result || result.error) return [];
    return rowsToEpisodes(result.data || []);
  } catch { return []; }
}
/* ---- Admin (owner/moderator only; the database enforces it) ---- */
async function myAdminRole() {
  if (!enabled()) return null;
  try {
    const supa = await client();
    const { data, error } = await supa.rpc('oneup_my_admin_role');
    if (error) return null;
    return typeof data === 'string' && ['owner', 'moderator'].includes(data) ? data : null;
  } catch { return null; }
}
async function listAllForAdmin() {
  const supa = await client();
  const { data, error } = await supa.from(TABLE).select(SELECT)
    .order('anime_id', { ascending: true })
    .order('episode_number', { ascending: true })
    .order('created_at', { ascending: true }).limit(500);
  if (error) throw error;
  return data || [];
}
async function createEntry(values) {
  const supa = await client();
  const { data, error } = await supa.from(TABLE).insert(values).select(SELECT).single();
  if (error) throw error;
  return data;
}
async function updateEntry(id, values) {
  const supa = await client();
  const { data, error } = await supa.from(TABLE).update(values).eq('id', id).select(SELECT).single();
  if (error) throw error;
  return data;
}
async function deleteEntry(id) {
  const supa = await client();
  const { error } = await supa.from(TABLE).delete().eq('id', id);
  if (error) throw error;
  return { ok: true };
}
function maskError(error) {
  const value = String(error?.code || error?.message || error || '').toLowerCase();
  if (value.includes('23514') || value.includes('check'))
    return 'La entrada no cumple las reglas: revisa la fuente y, para activarla, los derechos documentados (Regla 12).';
  if (value.includes('42501') || value.includes('permission') || value.includes('row-level'))
    return 'No tienes permisos para esta acción.';
  if (value.includes('23503')) return 'La cuenta indicada no existe.';
  return 'No se pudo completar la operación. Inténtalo de nuevo más tarde.';
}
global.OneUpLicensedMedia = {
  enabled, client, fetchDbEpisodes, rowsToEpisodes, mergeEpisodes,
  myAdminRole, listAllForAdmin, createEntry, updateEntry, deleteEntry, maskError,
};
})(window);
