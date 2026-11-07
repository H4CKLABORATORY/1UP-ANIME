// 1UP Anime — public read-only anime discovery backed by FxxMorgan's Anime1v API.
// Edge Function port of the removed previous server function anime1vDiscovery.
// Uses search and catalog only. Does not invoke upstream episode, resolve,
// image-proxy or download routes. No browser-exposed API keys.
// Env: ANIME1V_BASE_URL (https://...), ANIME1V_API_KEY (secret).
const ALLOWED_ORIGIN = 'https://h4cklaboratory.github.io';
const SEARCH_PROVIDERS = new Set(['animeav1', 'animeflv', 'tioanime', 'jkanime', 'monoschinos']);
const CATALOG_PROVIDERS = new Set(['animeav1', 'animeflv']);
const MAX_RESULTS = 30;
const MAX_BYTES = 768 * 1024;
const FALLBACK_TTL = 180_000;
const RATE = new Map<string, { start: number; count: number }>();

function err(status: number, message: string) {
  const e = new Error(message) as Error & { status: number };
  e.status = status;
  return e;
}
function clean(s: unknown, max = 110): string {
  return String(s ?? '').replace(/[\x00-\x1f\x7f]/g, ' ').trim().slice(0, max);
}
function imageUrl(value: unknown): string {
  try {
    const u = new URL(String(value));
    if (
      u.protocol !== 'https:' || u.username || u.password ||
      /(^|\.)(localhost|local|internal|invalid|test)$/.test(u.hostname) ||
      /^[\d.]+$/.test(u.hostname)
    ) return '';
    return u.href.slice(0, 500);
  } catch {
    return '';
  }
}
function normalized(raw: Record<string, any>, provider: string, kind: string) { // eslint-disable-line @typescript-eslint/no-explicit-any
  const records = raw?.data?.results ?? raw?.results ?? raw?.data?.animes ?? [];
  const items = Array.isArray(records) ? records : [];
  return {
    source: 'anime1v',
    mode: 'catalog_only',
    kind,
    provider,
    results: items.slice(0, MAX_RESULTS).map((item: Record<string, any>) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
      title: clean(item.title || item.name || item.nombre, 150),
      image: imageUrl(item.image || item.poster || item.cover || item.thumbnail),
      provider: clean(item.provider || provider, 35),
    })).filter((item: { title: string }) => item.title),
    hasMore: raw?.data?.hasMore === true || raw?.hasMore === true,
  };
}
function args(type: string, params: URLSearchParams) {
  if (type === 'search') {
    const q = clean(params.get('q'), 90);
    if (q.length < 2) throw err(400, 'La búsqueda debe tener al menos dos caracteres.');
    const provider = clean(params.get('provider') || 'animeav1', 25).toLowerCase();
    if (!SEARCH_PROVIDERS.has(provider)) throw err(400, 'Proveedor de búsqueda no admitido.');
    return { endpoint: 'search', query: { q, domain: provider }, provider };
  }
  if (type === 'catalog') {
    const provider = clean(params.get('provider') || 'animeav1', 25).toLowerCase();
    if (!CATALOG_PROVIDERS.has(provider)) throw err(400, 'Catálogo de proveedor no disponible.');
    const n = Number(params.get('page') || 1);
    if (!Number.isInteger(n) || n < 1 || n > 30) throw err(400, 'Página de catálogo inválida.');
    return { endpoint: 'catalog', query: { provider, page: String(n) }, provider };
  }
  throw err(400, 'Operación no reconocida.');
}
function upstreamUrl(base: string): URL {
  if (!base) throw err(503, 'Backend Anime1v sin configurar.');
  let u: URL;
  try {
    u = new URL(base);
  } catch {
    throw err(503, 'Dirección del servicio Anime1v incorrecta.');
  }
  const local = ['localhost', '127.0.0.1'].includes(u.hostname);
  if (
    !['https:', 'http:'].includes(u.protocol) || (u.protocol === 'http:' && !local) ||
    u.username || u.password || u.search || u.hash || u.pathname !== '/'
  ) throw err(503, 'El origen de Anime1v no es válido.');
  return u;
}

const cache = new Map<string, { value: unknown; expires: number }>();

Deno.serve(async (req: Request) => {
  const headers: Record<string, string> = {
    'Cache-Control': 'no-store',
    Vary: 'Origin',
    'X-Content-Type-Options': 'nosniff',
    'Content-Type': 'application/json',
  };
  const origin = req.headers.get('origin') ?? '';
  if (origin === ALLOWED_ORIGIN) headers['Access-Control-Allow-Origin'] = origin;
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        ...headers,
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }
  try {
    if (req.method !== 'GET') throw err(405, 'Método no permitido.');
    if (origin && origin !== ALLOWED_ORIGIN) throw err(403, 'Origen no permitido.');
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const now = Date.now();
    const old = RATE.get(ip);
    const value = old && now - old.start < 60_000 ? old : { start: now, count: 0 };
    value.count++;
    RATE.set(ip, value);
    if (RATE.size > 5000) RATE.clear();
    if (value.count > 20) throw err(429, 'Demasiadas consultas. Inténtalo más tarde.');
    const url = new URL(req.url);
    const type = url.searchParams.get('kind') === 'search'
      ? 'search'
      : url.searchParams.get('kind') === 'catalog'
      ? 'catalog'
      : null;
    if (!type) throw err(400, 'Operación no reconocida.');
    const base = upstreamUrl(Deno.env.get('ANIME1V_BASE_URL') || '');
    const apiKey = Deno.env.get('ANIME1V_API_KEY') || '';
    if (!apiKey || apiKey.length < 12) throw err(503, 'Clave privada Anime1v sin configurar.');
    const { endpoint, query, provider } = args(type, url.searchParams);
    const upstream = new URL('/api/v1/anime/' + endpoint, base);
    for (const [key, val] of Object.entries(query)) upstream.searchParams.set(key, val);
    const cacheKey = upstream.href;
    const saved = cache.get(cacheKey);
    if (saved && saved.expires > now) {
      return new Response(JSON.stringify(saved.value), { status: 200, headers });
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 9_000);
    let text: string;
    try {
      const resp = await fetch(upstream.href, {
        headers: { 'X-API-Key': apiKey, Accept: 'application/json' },
        signal: controller.signal,
        redirect: 'error',
      });
      if (!resp.ok) throw err(502, 'Anime1v no respondió correctamente.');
      const len = Number(resp.headers.get('content-length') || 0);
      if (len > MAX_BYTES) throw err(502, 'La respuesta de Anime1v es demasiado grande.');
      const reader = resp.body?.getReader();
      if (reader) {
        const chunks: Uint8Array[] = [];
        let bytes = 0;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          bytes += value.byteLength;
          if (bytes > MAX_BYTES) {
            await reader.cancel();
            throw err(502, 'La respuesta supera el límite.');
          }
          chunks.push(value);
        }
        const merged = new Uint8Array(bytes);
        let offset = 0;
        for (const chunk of chunks) {
          merged.set(chunk, offset);
          offset += chunk.byteLength;
        }
        text = new TextDecoder('utf-8').decode(merged);
      } else {
        text = await resp.text();
        if (new TextEncoder().encode(text).byteLength > MAX_BYTES) {
          throw err(502, 'La respuesta supera el límite.');
        }
      }
    } catch (error) {
      if ((error as Error & { status?: number }).status) throw error;
      throw err(502, 'Anime1v no está disponible en este momento.');
    } finally {
      clearTimeout(timer);
    }
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw err(502, 'Respuesta no válida de Anime1v.');
    }
    if ((parsed as { success?: boolean }).success === false) {
      throw err(502, 'El servicio Anime1v rechazó la consulta.');
    }
    const value2 = normalized(parsed as Record<string, any>, provider, type); // eslint-disable-line @typescript-eslint/no-explicit-any
    if (cache.size > 100) cache.clear();
    cache.set(cacheKey, { value: value2, expires: now + FALLBACK_TTL });
    return new Response(JSON.stringify(value2), { status: 200, headers });
  } catch (error) {
    const e = error as Error & { status?: number };
    const status = Number.isInteger(e.status) ? e.status as number : 502;
    const message = status === 503
      ? 'Anime1v aún no está configurada.'
      : status === 400 || status === 403 || status === 405 || status === 429
      ? e.message
      : 'Anime1v no está disponible ahora.';
    return new Response(JSON.stringify({ error: message }), { status, headers });
  }
});
