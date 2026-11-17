/* 1UP ANIME — Recomendados para ti en el inicio.
 * Se arma con los géneros de lo que la cuenta viene viendo (Continuar
 * viendo); sin historial, muestra los mejor valorados del catálogo. */
(function (global) {
  'use strict';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  async function build() {
    let items = [];
    try {
      const r = await fetch('./data/catalog-full.json', { cache: 'force-cache' });
      const j = await r.json();
      items = Array.isArray(j) ? j : (Object.values(j).find(v => Array.isArray(v) && v.length && typeof v[0] === 'object') || []);
    } catch { return; }
    if (!items.length) return;
    const byId = new Map(items.map(x => [String(x.id), x]));
    const progress = global.OneUpProgress?.list?.() || {};
    const seenIds = new Set(Object.keys(progress));
    const affinity = new Map();
    seenIds.forEach(pid => {
      const e = byId.get(pid);
      (e?.genres || []).forEach(g => affinity.set(g, (affinity.get(g) || 0) + 1));
    });
    const personal = affinity.size > 0;
    const scored = items.filter(x => !seenIds.has(String(x.id)) && (x.averageScore || 0) > 0).map(x => {
      const aff = (x.genres || []).reduce((n, g) => n + (affinity.get(g) || 0), 0);
      return { x, key: personal ? aff * 30 + (x.averageScore || 0) : (x.averageScore || 0) };
    }).filter(o => !personal || o.key >= 30).sort((a, b) => b.key - a.key).slice(0, 12);
    if (!scored.length) return;
    const sec = document.createElement('section');
    sec.className = 'rel-section rec-section';
    sec.setAttribute('aria-label', 'Recomendados para ti');
    sec.innerHTML = '<h2>RECOMENDADOS PARA TI <span class="rel-sub">' +
      (personal ? 'Por los géneros que vienes viendo' : 'Los mejor valorados del catálogo') + '</span></h2><div class="rel-row">' +
      scored.map(({ x }) => '<a class="rel-card" href="watch.html?anime=' + encodeURIComponent(x.id) + '">' +
        (x.poster || x.image ? '<img src="' + esc(x.poster || x.image) + '" alt="" loading="lazy">' : '<span class="rel-noimg"></span>') +
        '<span class="rel-info"><strong>' + esc(x.title) + '</strong>' +
        (x.averageScore ? '<small class="rel-score"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.6l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.5l-5.9 3.1 1.2-6.5L2.5 9.5l6.6-.9z"/></svg>' + (x.averageScore / 10).toFixed(1) + '</small>' : '') +
        '</span></a>').join('') + '</div>';
    const place = () => {
      const cw = document.querySelector('#continue-watching');
      const hero = document.querySelector('.hero');
      if (cw && cw.parentNode) { if (sec.previousElementSibling !== cw) cw.after(sec); }
      else if (hero && sec.previousElementSibling !== hero) hero.after(sec);
      else if (!sec.parentNode) document.querySelector('main')?.appendChild(sec);
    };
    place();
    setTimeout(place, 1500);
    setTimeout(place, 3500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})(window);
