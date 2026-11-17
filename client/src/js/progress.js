/* 1UP ANIME — memoria de visionado por cuenta.
 * Cada cuenta (y cada invitado) recuerda qué anime vio y en qué episodio
 * se quedó. El inicio muestra "Continuar viendo" y la ficha reanuda en el
 * episodio guardado. Se alimenta del evento oneup-episode-selected que el
 * reproductor ya emite; no toca el reproductor. */
(function (global) {
  'use strict';
  const KEY = 'oneup_progress_v1';
  function identityKey() {
    const a = global.OneUpAuth?.get?.();
    if (a && a.kind === 'local') return 'cuenta-' + a.key;
    let g = localStorage.getItem('oneup_guest_uid');
    if (!g) {
      g = 'inv-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      localStorage.setItem('oneup_guest_uid', g);
    }
    return 'invitado-' + g;
  }
  function readAll() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { return {}; } }
  function writeAll(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch { /* sin espacio */ } }
  function mine() { return readAll()[identityKey()] || {}; }
  function saveEntry(id, data) {
    const all = readAll(); const k = identityKey();
    all[k] = all[k] || {};
    all[k][id] = { ...(all[k][id] || {}), ...data, at: Date.now() };
    writeAll(all);
  }
  let catalogCache = null;
  async function fromCatalog(id) {
    try {
      if (!catalogCache) {
        const r = await fetch('./data/catalog-full.json', { cache: 'force-cache' });
        const j = await r.json();
        const items = Array.isArray(j) ? j : (Object.values(j).find(v => Array.isArray(v) && v.length && typeof v[0] === 'object') || []);
        catalogCache = new Map(items.map(x => [String(x.id), x]));
      }
      const e = catalogCache.get(String(id));
      if (e) return { title: e.title || '', image: e.poster || e.image || '' };
    } catch { /* sin catálogo */ }
    return null;
  }
  async function fromAnilist(id) {
    const num = String(id).replace(/^(al-|mal-)/, '');
    if (!/^\d+$/.test(num)) return null;
    const byMal = String(id).startsWith('mal-');
    const q = byMal
      ? 'query($id:Int){Media(idMal:$id,type:ANIME){title{english romaji} coverImage{extraLarge large}}}'
      : 'query($id:Int){Media(id:$id,type:ANIME){title{english romaji} coverImage{extraLarge large}}}';
    try {
      const r = await fetch('https://graphql.anilist.co', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: q, variables: { id: Number(num) } }) });
      const j = await r.json(); const m = j.data?.Media;
      if (m) return { title: m.title?.english || m.title?.romaji || '', image: m.coverImage?.extraLarge || m.coverImage?.large || '' };
    } catch { /* sin red */ }
    return null;
  }
  async function enrich(id) {
    const cur = mine()[id];
    if (cur && cur.title && cur.image) return;
    const info = (await fromCatalog(id)) || (await fromAnilist(id));
    if (info && (info.title || info.image)) { saveEntry(id, info); renderRail(); }
  }
  document.addEventListener('oneup-episode-selected', e => {
    const d = e.detail || {};
    const id = String(d.animeId || '');
    const ep = Number(d.episode) || 0;
    if (!id || ep < 1) return;
    saveEntry(id, { episode: ep, season: Number(d.season) || 1 });
    enrich(id);
    renderRail();
  });
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function placeRail() {
    const host = document.querySelector('#continue-watching');
    if (!host) return;
    const hero = document.querySelector('.hero');
    if (hero && host.previousElementSibling !== hero) hero.after(host);
  }
  function renderRail() {
    const host = document.querySelector('#continue-watching');
    if (!host) return;
    placeRail();
    const entries = Object.entries(mine()).map(([id, v]) => ({ id, ...v })).sort((a, b) => (b.at || 0) - (a.at || 0)).slice(0, 20);
    if (!entries.length) { host.hidden = true; host.innerHTML = ''; return; }
    host.hidden = false;
    host.innerHTML = '<div class="cw-head"><h2>Continuar viendo <span class="jp-chip">つづき</span></h2><span>Retoma justo donde te quedaste</span></div><div class="cw-row">' +
      entries.map(x => '<article class="cw-card"><a class="cw-open" href="watch.html?anime=' + encodeURIComponent(x.id) + '">' +
        (x.image ? '<img src="' + esc(x.image) + '" alt="" loading="lazy">' : '<span class="cw-noimg"></span>') +
        '<span class="cw-info"><strong>' + esc(x.title || x.id) + '</strong><small>Episodio ' + x.episode + (x.season > 1 ? ' · Temporada ' + x.season : '') + '</small></span>' +
        '<span class="cw-play"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.2v13.6L18.8 12Z"/></svg></span></a>' +
        '<button type="button" class="cw-remove" data-remove="' + esc(x.id) + '" aria-label="Quitar de Continuar viendo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></article>').join('') +
      '</div>';
    host.querySelectorAll('[data-remove]').forEach(b => b.addEventListener('click', () => {
      const all = readAll(); const k = identityKey();
      if (all[k]) { delete all[k][b.dataset.remove]; writeAll(all); }
      renderRail();
    }));
  }
  function mountRail() {
    const main = document.querySelector('main');
    if (!main || document.querySelector('#continue-watching')) return;
    const sec = document.createElement('section');
    sec.id = 'continue-watching'; sec.className = 'cw-section'; sec.hidden = true;
    sec.setAttribute('aria-label', 'Continuar viendo');
    main.appendChild(sec);
    placeRail();
    renderRail();
  }
  function resume() {
    if (!/watch\.html$/.test(location.pathname)) return;
    const id = new URLSearchParams(location.search).get('anime') || '';
    if (!id) return;
    const saved = mine()[id];
    if (!saved || !(saved.episode > 1)) return;
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      if (document.querySelector('#oneup-watch-episode')) {
        clearInterval(t);
        document.dispatchEvent(new CustomEvent('oneup-episode-selected', { detail: { animeId: id, season: saved.season || 1, episode: saved.episode } }));
      } else if (tries > 40) clearInterval(t);
    }, 300);
  }
  function init() { mountRail(); resume(); setTimeout(placeRail, 1500); setTimeout(placeRail, 3500); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  global.OneUpProgress = { list: () => mine(), render: renderRail };
})(window);
