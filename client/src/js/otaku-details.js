/* 1UP ANIME — sangre otaku: pétalos de sakura en los héroes y acentos en
 * japonés junto a los títulos que se generan por código. Solo apariencia. */
(function (global) {
  'use strict';
  /* Lo que cae del cielo cambia con la estación, como en Japón:
   * primavera sakura, verano hojas verdes, otoño momiji, invierno nieve. */
  const MONTH = new Date().getMonth();
  const SEASON = MONTH >= 2 && MONTH <= 4 ? 'sakura' : MONTH >= 5 && MONTH <= 7 ? 'natsu' : MONTH >= 8 && MONTH <= 10 ? 'momiji' : 'yuki';
  const FILLS = { sakura: ['%23ffb7d5', '%23ff8fb8'], natsu: ['%238fce5a', '%235d774a'], momiji: ['%23e2703a', '%23c94f2e'], yuki: ['%23ffffff', '%23dfe9f5'] };
  const F = FILLS[SEASON];
  const SHAPE = SEASON === 'yuki' ? "%3Ccircle cx='10' cy='10' r='6'/%3E" : "%3Cpath d='M10 1C15.5 6.5 16.5 12.5 10 19C3.5 12.5 4.5 6.5 10 1Z'/%3E";
  const petalUri = fill => "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Cg fill='" + fill + "'%3E" + SHAPE + "%3C/g%3E%3C/svg%3E";
  const PETAL = petalUri(F[0]);
  const PETAL2 = petalUri(F[1]);
  const FLOWER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Cg fill='" + F[0] + "'%3E%3Cellipse cx='20' cy='11' rx='5' ry='9'/%3E%3Cellipse cx='29' cy='17' rx='5' ry='9' transform='rotate(72 29 17)'/%3E%3Cellipse cx='26' cy='28' rx='5' ry='9' transform='rotate(144 26 28)'/%3E%3Cellipse cx='14' cy='28' rx='5' ry='9' transform='rotate(216 14 28)'/%3E%3Cellipse cx='11' cy='17' rx='5' ry='9' transform='rotate(288 11 17)'/%3E%3C/g%3E%3Ccircle cx='20' cy='20' r='3.4' fill='" + F[1] + "'/%3E%3C/svg%3E";
  const reduced = global.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  function decorateHero(el) {
    if (!el || el.dataset.sakura) return;
    el.dataset.sakura = '1';
    el.classList.add('sakura-field');
    if (reduced) return;
    const clusterA = document.createElement('span');
    clusterA.className = 'sakura-cluster';
    clusterA.style.cssText = 'top:-34px;right:-26px;width:150px;height:150px;opacity:.16;background-image:url("' + FLOWER + '")';
    el.appendChild(clusterA);
    const clusterB = document.createElement('span');
    clusterB.className = 'sakura-cluster';
    clusterB.style.cssText = 'bottom:-40px;left:-24px;width:110px;height:110px;opacity:.12;background-image:url("' + FLOWER + '");animation-delay:-3s';
    el.appendChild(clusterB);
    const n = global.innerWidth < 640 ? 5 : 8;
    for (let i = 0; i < n; i++) {
      const p = document.createElement('span');
      p.className = 'sakura-petal';
      const size = 9 + Math.random() * 9;
      p.style.cssText = 'left:' + (Math.random() * 97).toFixed(1) + '%;width:' + size.toFixed(0) + 'px;height:' + size.toFixed(0) + 'px;opacity:' + (0.45 + Math.random() * 0.4).toFixed(2) + ';background-image:url("' + (i % 2 ? PETAL2 : PETAL) + '");animation-duration:' + (9 + Math.random() * 8).toFixed(1) + 's;animation-delay:-' + (Math.random() * 14).toFixed(1) + 's';
      el.appendChild(p);
    }
  }
  function init() {
    const seen = new Set();
    document.querySelectorAll('.hero, #hero, .c-hero').forEach(el => { if (!seen.has(el)) { seen.add(el); decorateHero(el); } });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window);

/* Cabecera limpia: avatar en vez de la pastilla "Invitado" y el tema
 * de colores dentro del menú de las tres rayitas, no en la cara de la página. */
(function () {
  'use strict';
  const USER_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="8" r="3.6"/><path d="M5 19.4c.8-3.2 3.4-5 7-5s6.2 1.8 7 5"/></svg>';
  function refreshAvatar(btn) {
    const a = window.OneUpAuth?.get?.();
    const logged = !!(a && a.kind === 'local');
    btn.classList.toggle('is-logged', logged);
    btn.setAttribute('aria-label', logged ? 'Mi cuenta: ' + (a.name || '') : 'Entrar a mi cuenta');
    const face = btn.querySelector('.avatar-face');
    if (face) {
      const state = logged ? 'in' : 'out';
      if (face.dataset.state !== state) {
        face.dataset.state = state;
        face.innerHTML = logged ? '<span class="avatar-initial">' + (a.name || 'U').trim().charAt(0).toUpperCase() + '</span>' : USER_SVG;
      }
    }
  }
  function polishHeader() {
    const btn = document.querySelector('#auth-open');
    if (btn) {
      btn.classList.add('avatar-button');
      if (!btn.querySelector('.avatar-face')) {
        const face = document.createElement('span');
        face.className = 'avatar-face';
        face.innerHTML = USER_SVG;
        btn.appendChild(face);
      }
      refreshAvatar(btn);
    }
    const cLogin = document.querySelector('#c-login');
    if (cLogin && !cLogin.querySelector('.avatar-face')) {
      cLogin.classList.add('avatar-button');
      const face = document.createElement('span');
      face.className = 'avatar-face';
      face.innerHTML = USER_SVG;
      cLogin.textContent = '';
      cLogin.appendChild(face);
      cLogin.setAttribute('aria-label', 'Entrar a mi cuenta');
    }
  }
  function moveThemeIntoDrawer() {
    const control = document.querySelector('.oneup-theme-control');
    const drawer = document.querySelector('#km-drawer');
    if (!control || !drawer || control.closest('#km-drawer')) return !!control;
    const row = document.createElement('div');
    row.className = 'drawer-theme-row';
    row.innerHTML = '<span class="drawer-theme-label">Tema de colores</span>';
    row.appendChild(control);
    const foot = drawer.querySelector('.km-drawer-foot');
    if (foot) drawer.insertBefore(row, foot); else drawer.appendChild(row);
    return true;
  }
  function init() {
    polishHeader();
    let tries = 0;
    const t = setInterval(() => { if (moveThemeIntoDrawer() || ++tries > 12) clearInterval(t); }, 400);
    setInterval(polishHeader, 3000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

/* Fondo ambiental de la ficha: el arte de la temporada elegida tiñe toda
 * la página (borroso y oscuro). Al cambiar de temporada cambia el arte,
 * porque cada temporada trae el suyo. */
(function () {
  'use strict';
  if (!/watch\.html$/.test(location.pathname)) return;
  function apply() {
    const hero = document.querySelector('#hero');
    if (!hero) return false;
    const raw = getComputedStyle(hero).getPropertyValue('--banner') || '';
    const m = raw.match(/url\(["']?(.+?)["']?\)/);
    const img = hero.querySelector('img');
    const url = m ? m[1] : (img ? img.src : '');
    if (!url) return false;
    let bg = document.querySelector('.ambient-bg');
    if (!bg) {
      bg = document.createElement('div');
      bg.className = 'ambient-bg';
      bg.setAttribute('aria-hidden', 'true');
      document.body.prepend(bg);
    }
    if (bg.dataset.url !== url) {
      bg.dataset.url = url;
      bg.style.backgroundImage = 'url("' + url + '")';
    }
    return true;
  }
  function init() {
    let tries = 0;
    const t = setInterval(() => { if (apply() || ++tries > 20) clearInterval(t); }, 400);
    const hero = document.querySelector('#hero');
    if (hero) new MutationObserver(apply).observe(hero, { attributes: true, attributeFilter: ['style'] });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

/* Fondo cinematográfico: el color dominante del arte de cada anime tiñe
 * su ambiente (resplandores y viñeta), como en las fichas de cine.
 * Y los pétalos se pausan fuera de pantalla para que la página vuele. */
(function () {
  'use strict';
  const rootEl = document.documentElement;
  const cache = new Map();
  function apply(rgb) { rootEl.style.setProperty('--cine-rgb', rgb); }
  function extract(url) {
    if (!url) return;
    if (cache.has(url)) { const v = cache.get(url); if (v) apply(v); return; }
    cache.set(url, '');
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const c = document.createElement('canvas'); c.width = 40; c.height = 40;
        const x = c.getContext('2d', { willReadFrequently: true });
        x.drawImage(img, 0, 0, 40, 40);
        const d = x.getImageData(0, 0, 40, 40).data;
        let r = 0, g = 0, b = 0, n = 0;
        for (let i = 0; i < d.length; i += 32) {
          const R = d[i], G = d[i + 1], B = d[i + 2];
          const mx = Math.max(R, G, B), mn = Math.min(R, G, B);
          if (mx < 30 || mx > 242 || mx - mn < 26) continue;
          r += R; g += G; b += B; n++;
        }
        if (n > 8) { const rgb = Math.round(r / n) + ',' + Math.round(g / n) + ',' + Math.round(b / n); cache.set(url, rgb); apply(rgb); }
      } catch (e) { /* sin CORS: se queda el violeta de la casa */ }
    };
    img.src = url;
  }
  function watchImg(sel) {
    const el = document.querySelector(sel);
    if (!el) return;
    const run = () => extract(el.currentSrc || el.src);
    run();
    new MutationObserver(run).observe(el, { attributes: true, attributeFilter: ['src'] });
  }
  function init() {
    watchImg('#poster');
    watchImg('#hero-feature-cover');
    const hp = document.querySelector('#hero-poster');
    if (hp) {
      const run = () => { const bg = getComputedStyle(hp).backgroundImage; const m = bg && bg.match(/url\("?([^")]+)"?\)/); if (m) extract(m[1]); };
      run();
      new MutationObserver(run).observe(hp, { attributes: true, attributeFilter: ['style', 'class'] });
    }
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('sakura-paused', !e.isIntersecting)), { threshold: 0.02 });
      document.querySelectorAll('.hero, #hero, .c-hero').forEach(el => io.observe(el));
    }
    document.addEventListener('visibilitychange', () => rootEl.classList.toggle('tab-hidden', document.hidden));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
