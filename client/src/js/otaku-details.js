/* 1UP ANIME — sangre otaku: pétalos de sakura en los héroes y acentos en
 * japonés junto a los títulos que se generan por código. Solo apariencia. */
(function (global) {
  'use strict';
  const PETAL = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Cpath d='M10 1C15.5 6.5 16.5 12.5 10 19C3.5 12.5 4.5 6.5 10 1Z' fill='%23ffb7d5'/%3E%3C/svg%3E";
  const FLOWER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Cg fill='%23ffb7d5'%3E%3Cellipse cx='20' cy='11' rx='5' ry='9'/%3E%3Cellipse cx='29' cy='17' rx='5' ry='9' transform='rotate(72 29 17)'/%3E%3Cellipse cx='26' cy='28' rx='5' ry='9' transform='rotate(144 26 28)'/%3E%3Cellipse cx='14' cy='28' rx='5' ry='9' transform='rotate(216 14 28)'/%3E%3Cellipse cx='11' cy='17' rx='5' ry='9' transform='rotate(288 11 17)'/%3E%3C/g%3E%3Ccircle cx='20' cy='20' r='3.4' fill='%23ff8fb8'/%3E%3C/svg%3E";
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
    const n = global.innerWidth < 640 ? 9 : 14;
    for (let i = 0; i < n; i++) {
      const p = document.createElement('span');
      p.className = 'sakura-petal';
      const size = 9 + Math.random() * 9;
      p.style.cssText = 'left:' + (Math.random() * 97).toFixed(1) + '%;width:' + size.toFixed(0) + 'px;height:' + size.toFixed(0) + 'px;opacity:' + (0.45 + Math.random() * 0.4).toFixed(2) + ';background-image:url("' + PETAL + '");animation-duration:' + (9 + Math.random() * 8).toFixed(1) + 's;animation-delay:-' + (Math.random() * 14).toFixed(1) + 's';
      el.appendChild(p);
    }
  }
  const JP = { 'En tendencia ahora': 'トレンド', 'El próximo estreno': '近日公開', 'VER EPISODIOS': 'エピソード' };
  function addJpChips() {
    document.querySelectorAll('h2, h3').forEach(h => {
      if (h.querySelector('.jp-chip')) return;
      const jp = JP[h.textContent.trim()];
      if (!jp) return;
      const chip = document.createElement('span');
      chip.className = 'jp-chip';
      chip.textContent = jp;
      h.appendChild(chip);
    });
  }
  function init() {
    const seen = new Set();
    document.querySelectorAll('.hero, #hero, .c-hero').forEach(el => { if (!seen.has(el)) { seen.add(el); decorateHero(el); } });
    addJpChips();
    setTimeout(addJpChips, 1200);
    setTimeout(addJpChips, 3000);
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
