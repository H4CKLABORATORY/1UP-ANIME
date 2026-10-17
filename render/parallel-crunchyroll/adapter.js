'use strict';
/**
 * 1UP ANIME: opt-in, server-only metadata probe of Crunchyroll's public
 * discovery page using Parallel Extract. No player/media endpoints.
 */
const SOURCE = 'https://www.crunchyroll.com/es/discover';
const EXTRACT = 'https://api.parallel.ai/v1/extract';
const MAX_BODY_BYTES = 256 * 1024;
const MAX_RESULTS = 20;
const OBJECTIVE = 'Identifica exclusivamente nombres de series de anime y enlaces públicos a fichas de series en Crunchyroll presentes en esta página. No extraigas videos, episodios, cuentas, ni datos de usuarios.';

function titleText(value) {
  return String(value ?? '').replace(/[\x00-\x1f\x7f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 140);
}
function safeSeriesUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || !['www.crunchyroll.com', 'crunchyroll.com'].includes(url.hostname)
        || url.username || url.password || url.port) return '';
    if (!/^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?series\/[a-z0-9][a-z0-9-]{3,120}(?:\/[^?#]*)?$/i.test(url.pathname)) return '';
    return url.origin + url.pathname;
  } catch { return ''; }
}
function normalizeExtract(payload) {
  const results = Array.isArray(payload?.results) ? payload.results : [];
  const rows = [], seen = new Set();
  for (const result of results) {
    if (result?.url !== SOURCE) continue;
    for (const excerpt of Array.isArray(result.excerpts) ? result.excerpts : []) {
      // Accept only explicit, public Markdown links to series; no guessed identifiers.
      const links = String(excerpt).matchAll(/\[([^\]\n]{3,160})\]\((https:\/\/[^\s)]+)\)/g);
      for (const match of links) {
        const title = titleText(match[1]);
        const url = safeSeriesUrl(match[2]);
        if (!title || !url || seen.has(url)) continue;
        seen.add(url);
        rows.push({title, url, provider: 'Crunchyroll'});
        if (rows.length >= MAX_RESULTS) return rows;
      }
    }
  }
  return rows;
}
async function limitedJson(response) {
  const len = Number(response.headers?.get?.('content-length') || 0);
  if (len > MAX_BODY_BYTES) throw new Error('Respuesta demasiado grande');
  const reader = response.body?.getReader?.();
  if (!reader) throw new Error('Respuesta sin cuerpo compatible');
  let size = 0;
  const chunks = [];
  while (true) {
    const {done, value} = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new Error('Respuesta demasiado grande');
    }
    chunks.push(Buffer.from(value));
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
async function extractCrunchyroll({
  apiKey = process.env.PARALLEL_API_KEY,
  approved = process.env.PARALLEL_CRUNCHYROLL_APPROVED === '1',
  billingApproved = process.env.PARALLEL_BILLING_APPROVED === '1',
  fetchImpl = globalThis.fetch,
} = {}) {
  if (!approved || !billingApproved) throw new Error('Fuente o costo no autorizados: integración desactivada');
  if (typeof apiKey !== 'string' || apiKey.length < 16) throw new Error('PARALLEL_API_KEY no configurada');
  if (typeof fetchImpl !== 'function') throw new Error('Cliente HTTP no disponible');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetchImpl(EXTRACT, {
      method: 'POST', redirect: 'error', signal: controller.signal,
      headers: {'Content-Type': 'application/json', 'x-api-key': apiKey},
      body: JSON.stringify({urls: [SOURCE], objective: OBJECTIVE, advanced_settings: {full_content: false}}),
    });
    if (!response.ok) throw new Error('Parallel Extract HTTP ' + response.status);
    const payload = await limitedJson(response);
    return {source: 'crunchyroll_public_metadata', mode: 'catalog_only', streaming: false,
      origin: SOURCE, retrievedAt: new Date().toISOString(),
      results: normalizeExtract(payload),
      warning: 'No demuestra disponibilidad regional ni derechos de reproducción.'};
  } finally { clearTimeout(timer); }
}
module.exports = {SOURCE, EXTRACT, safeSeriesUrl, normalizeExtract, extractCrunchyroll};
