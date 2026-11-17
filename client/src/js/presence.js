/* 1UP ANIME — contador de personas en línea, de verdad.
 * Cada visita deja un pulso en Supabase (social_presence) y el contador
 * muestra cuántos pulsos hubo en los últimos 50 segundos. Sin números
 * inventados: si hay 1 persona, dice 1. */
(function (global) {
  'use strict';
  const cfg = global.ONEUP_SOCIAL_SUPABASE;
  if (!cfg?.url || !cfg?.key) return;
  const H = { apikey: cfg.key, Authorization: 'Bearer ' + cfg.key, 'Content-Type': 'application/json' };
  let sid = sessionStorage.getItem('oneup_presence_sid');
  if (!sid) {
    sid = 's-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    sessionStorage.setItem('oneup_presence_sid', sid);
  }
  function mountPill() {
    if (document.querySelector('.online-pill')) return;
    const pill = document.createElement('span');
    pill.className = 'online-pill';
    pill.innerHTML = '<span class="online-dot"></span><b id="online-count">…</b><span class="online-label"> en línea</span>';
    const right = document.querySelector('.header-right');
    if (right) { right.insertBefore(pill, right.firstChild); return; }
    const back = document.querySelector('header .back');
    if (back) { back.parentNode.insertBefore(pill, back); return; }
    const row = document.querySelector('.c-header .header-row');
    if (row) {
      const login = row.querySelector('#c-login');
      if (login) row.insertBefore(pill, login); else row.appendChild(pill);
    }
  }
  async function beat() {
    try {
      await fetch(cfg.url + '/rest/v1/social_presence', {
        method: 'POST',
        headers: { ...H, Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify({ session_id: sid, last_seen: new Date().toISOString() })
      });
    } catch { /* sin red: el contador simplemente no sube */ }
  }
  async function count() {
    try {
      const since = new Date(Date.now() - 50000).toISOString();
      const r = await fetch(cfg.url + '/rest/v1/social_presence?select=session_id&last_seen=gte.' + encodeURIComponent(since), {
        method: 'HEAD',
        headers: { ...H, Prefer: 'count=exact' }
      });
      const range = r.headers.get('content-range') || '';
      const total = Number(range.split('/')[1]);
      const el = document.querySelector('#online-count');
      if (el && Number.isFinite(total)) el.textContent = total.toLocaleString('es');
    } catch { /* se queda el último número */ }
  }
  async function cleanup() {
    try {
      const old = new Date(Date.now() - 86400000).toISOString();
      await fetch(cfg.url + '/rest/v1/social_presence?last_seen=lt.' + encodeURIComponent(old), { method: 'DELETE', headers: H });
    } catch { /* limpieza oportunista */ }
  }
  function init() {
    mountPill();
    beat().then(count);
    cleanup();
    setInterval(beat, 25000);
    setInterval(count, 20000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) beat().then(count); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window);
