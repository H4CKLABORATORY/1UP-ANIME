/* 1UP ANIME — en la ficha: animes similares, recomendados y ranking.
 * Todo sale de datos reales: el catálogo propio (géneros y puntaje) y
 * AniList (recomendaciones, relaciones y rankings oficiales). */
(function (global) {
  'use strict';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const id = new URLSearchParams(location.search).get('anime') || '';
  if (!id) return;
  function addChip(text) {
    const meta = document.querySelector('#meta');
    if (!meta || [...meta.querySelectorAll('span')].some(s => s.textContent === text)) return;
    const s = document.createElement('span');
    s.textContent = text;
    meta.appendChild(s);
  }
  function mount() {
    if (document.querySelector('#rel-similares')) return document.querySelector('#rel-similares');
    const player = document.querySelector('#oneup-player-section');
    const main = document.querySelector('main');
    if (!main) return null;
    const mk = (secId, title, jp) => {
      const sec = document.createElement('section');
      sec.className = 'section rel-section';
      sec.id = secId;
      sec.innerHTML = '<h2>' + title + '</h2><div class="rel-row"></div>';
      return sec;
    };
    const sim = mk('rel-similares', 'ANIMES SIMILARES', '似ている');
    const rec = mk('rel-recomendados', 'RECOMENDADOS', 'おすすめ');
    if (player && player.parentNode === main) { player.after(rec); player.after(sim); }
    else main.append(sim, rec);
    return sim;
  }
  function renderRow(secId, items) {
    const sec = document.querySelector('#' + secId);
    if (!sec) return;
    if (!items.length) { sec.remove(); return; }
    sec.querySelector('.rel-row').innerHTML = items.map(x =>
      '<a class="rel-card" href="watch.html?anime=' + encodeURIComponent(x.id) + '">' +
      (x.image ? '<img src="' + esc(x.image) + '" alt="" loading="lazy">' : '<span class="rel-noimg"></span>') +
      '<span class="rel-info"><strong>' + esc(x.title) + '</strong>' +
      (x.score ? '<small class="rel-score"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.6l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.5l-5.9 3.1 1.2-6.5L2.5 9.5l6.6-.9z"/></svg>' + x.score + '</small>' : '') +
      '</span></a>').join('');
  }
  const baseTitle = t => String(t || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\b(season|part|the|final)\b/g, ' ').replace(/\b\d+(st|nd|rd|th)?\b/g, ' ').replace(/\s+/g, ' ').trim();
  async function fromCatalog() {
    const r = await fetch('./data/catalog-full.json', { cache: 'force-cache' });
    const j = await r.json();
    const items = Array.isArray(j) ? j : (Object.values(j).find(v => Array.isArray(v) && v.length && typeof v[0] === 'object') || []);
    const me = items.find(x => String(x.id) === id);
    if (!me) return;
    if (me.averageScore > 0) {
      const rank = 1 + items.filter(x => (x.averageScore || 0) > me.averageScore).length;
      addChip('#' + rank + ' del catálogo');
    }
    const G = new Set(me.genres || []);
    const myBase = baseTitle(me.title);
    const overlap = x => (x.genres || []).filter(g => G.has(g)).length;
    const pool = items.filter(x => String(x.id) !== id && baseTitle(x.title) !== myBase && overlap(x) > 0);
    const card = x => ({ id: x.id, title: x.title, image: x.poster || x.image || '', score: x.averageScore ? (x.averageScore / 10).toFixed(1) : '' });
    const similares = pool.filter(x => overlap(x) >= Math.min(2, G.size || 1))
      .sort((a, b) => overlap(b) - overlap(a) || (b.averageScore || 0) - (a.averageScore || 0)).slice(0, 10).map(card);
    const used = new Set(similares.map(x => x.id));
    const recomendados = pool.filter(x => !used.has(String(x.id)) && (x.averageScore || 0) >= 78)
      .sort((a, b) => (b.averageScore || 0) - (a.averageScore || 0)).slice(0, 10).map(card);
    mount();
    renderRow('rel-similares', similares);
    renderRow('rel-recomendados', recomendados);
  }
  async function fromAnilist() {
    const num = id.replace(/^(al-|mal-)/, '');
    if (!/^\d+$/.test(num)) return;
    const byMal = id.startsWith('mal-');
    const CARD = 'id idMal title{english romaji} coverImage{extraLarge} averageScore type';
    const q = 'query($id:Int){Media(' + (byMal ? 'idMal' : 'id') + ':$id,type:ANIME){averageScore popularity rankings{rank type context allTime} relations{edges{relationType node{' + CARD + '}}} recommendations(perPage:14){nodes{mediaRecommendation{' + CARD + '}}}}}';
    const r = await fetch('https://graphql.anilist.co', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: q, variables: { id: Number(num) } }) });
    const j = await r.json();
    const m = j.data?.Media;
    if (!m) return;
    (m.rankings || []).filter(x => x.allTime).slice(0, 2).forEach(x => {
      addChip(x.type === 'RATED' ? '#' + x.rank + ' mejor valorado' : '#' + x.rank + ' más popular');
    });
    if (m.popularity) addChip('Popularidad ' + Number(m.popularity).toLocaleString('es'));
    const card = n => n && ({ id: n.idMal ? 'mal-' + n.idMal : 'al-' + n.id, title: n.title?.english || n.title?.romaji || '', image: n.coverImage?.extraLarge || '', score: n.averageScore ? (n.averageScore / 10).toFixed(1) : '' });
    const seen = new Set();
    const similares = (m.recommendations?.nodes || []).map(n => card(n.mediaRecommendation)).filter(x => x && x.title && !seen.has(x.id) && seen.add(x.id)).slice(0, 10);
    const recTypes = new Set(['SIDE_STORY', 'SPIN_OFF', 'ALTERNATIVE', 'OTHER']);
    const recomendados = (m.relations?.edges || []).filter(e => recTypes.has(e.relationType) && e.node?.type === 'ANIME').map(e => card(e.node)).filter(x => x && x.title && !seen.has(x.id) && seen.add(x.id)).slice(0, 10);
    mount();
    renderRow('rel-similares', similares);
    renderRow('rel-recomendados', recomendados);
  }
  (async () => { try { if (id.startsWith('jk-')) await fromCatalog(); else await fromAnilist(); } catch { /* sin datos: la ficha queda como estaba */ } })();
})(window);
