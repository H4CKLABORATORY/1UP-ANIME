/* 1UP ANIME — original color-theme picker. No third-party UI/CSS imported.
 * Runs entirely in the browser; the only saved data is a theme identifier.
 * Apply stored palette before the page paints, then mount accessible controls.
 */
(() => {
  'use strict';
  const KEY = 'oneup.palette.v1';
  const OPTIONS = Object.freeze([
    { id: 'esmeralda', label: 'Negro y verde', caption: 'Esmeralda', swatch: '#65e5a0', chrome: '#08140f' },
    { id: 'original', label: 'Diseño original', caption: 'Original', swatch: '#fd3158', chrome: '#090a11' },
    { id: 'violeta', label: 'Negro y violeta', caption: 'Violeta', swatch: '#b89dff', chrome: '#100d1c' }
  ]);
  const allowed = id => OPTIONS.some(option => option.id === id);
  const root = document.documentElement;
  let saved = '';
  try { saved = window.localStorage.getItem(KEY) || ''; } catch { /* private browsing */ }
  root.dataset.oneupTheme = allowed(saved) ? saved : 'esmeralda';

  function active() {
    return allowed(root.dataset.oneupTheme) ? root.dataset.oneupTheme : 'esmeralda';
  }
  function setTheme(id, persist = true) {
    if (!allowed(id)) return false;
    root.dataset.oneupTheme = id;
    if (persist) {
      try { window.localStorage.setItem(KEY, id); } catch { /* storage denied */ }
    }
    document.querySelectorAll('[data-oneup-theme-option]').forEach(button => {
      const picked = button.dataset.oneupThemeOption === id;
      button.setAttribute('aria-pressed', String(picked));
      button.classList.toggle('is-selected', picked);
    });
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', OPTIONS.find(option => option.id === id).chrome);
    return true;
  }

  function makeOptions(title, className) {
    const group = document.createElement('section');
    group.className = className;
    group.setAttribute('aria-label', title);
    const heading = document.createElement('h3');
    heading.textContent = title;
    heading.className = 'oneup-theme-heading';
    group.append(heading);
    for (const option of OPTIONS) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'oneup-theme-option';
      button.dataset.oneupThemeOption = option.id;
      button.setAttribute('aria-label', option.label);
      button.setAttribute('aria-pressed', String(active() === option.id));
      const color = document.createElement('span');
      color.className = 'oneup-theme-swatch';
      color.style.setProperty('--swatch', option.swatch);
      color.setAttribute('aria-hidden', 'true');
      const label = document.createElement('span');
      label.textContent = option.caption;
      label.className = 'oneup-theme-label';
      const check = document.createElement('span');
      check.className = 'oneup-theme-check';
      check.textContent = '✓';
      check.setAttribute('aria-hidden', 'true');
      button.append(color, label, check);
      if (active() === option.id) button.classList.add('is-selected');
      button.addEventListener('click', () => {
        setTheme(option.id);
        if (className === 'oneup-theme-panel') closePanel();
      });
      group.append(button);
    }
    return group;
  }

  let trigger = null, panel = null;
  function closePanel(focus = false) {
    if (!panel || panel.hidden) return;
    panel.hidden = true;
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
    if (focus) trigger?.focus();
  }
  function mount() {
    const header = document.querySelector('.header-right');
    if (!header || document.getElementById('oneup-theme-trigger')) return;
    const wrap = document.createElement('div');
    wrap.className = 'oneup-theme-control';
    trigger = document.createElement('button');
    trigger.id = 'oneup-theme-trigger';
    trigger.className = 'icon-button oneup-theme-trigger';
    trigger.type = 'button';
    trigger.setAttribute('aria-label', 'Cambiar tema de colores');
    trigger.setAttribute('title', 'Cambiar tema de colores');
    trigger.setAttribute('aria-controls', 'oneup-theme-panel');
    trigger.setAttribute('aria-expanded', 'false');
    // A locally authored SVG; no external assets or icon dependencies.
    trigger.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 3.5a8.5 8.5 0 1 0 0 17h1.4a2.15 2.15 0 0 0 1.6-3.6 1.6 1.6 0 0 1 1.25-2.66h1.6a3.65 3.65 0 0 0 3.65-3.65C21.5 6.9 17.24 3.5 12 3.5Z"/><circle cx="7.5" cy="10" r="1"/><circle cx="11" cy="7.5" r="1"/><circle cx="16" cy="8.5" r="1"/><circle cx="7.9" cy="14.2" r="1"/></svg>';
    panel = makeOptions('Seleccionar tema', 'oneup-theme-panel');
    panel.id = 'oneup-theme-panel';
    panel.hidden = true;
    wrap.append(trigger, panel);
    header.insertBefore(wrap, header.querySelector('#auth-open'));
    trigger.addEventListener('click', () => {
      const next = !panel.hidden;
      panel.hidden = next;
      trigger.setAttribute('aria-expanded', String(!next));
      if (!next) panel.querySelector('[aria-pressed="true"]')?.focus();
    });
    document.addEventListener('pointerdown', event => {
      if (!wrap.contains(event.target)) closePanel();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !panel.hidden) { event.stopPropagation(); closePanel(true); }
    });
    const drawer = document.getElementById('km-drawer');
    if (drawer) {
      const drawerChoices = makeOptions('Colores de 1UP Anime', 'oneup-theme-drawer');
      const footer = drawer.querySelector('.km-drawer-foot');
      if (footer) footer.before(drawerChoices);
      else drawer.append(drawerChoices);
    }
    setTheme(active(), false);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
  // Only an allowlisted palette identifier; no remote calls or user content.
  window.OneUpPalette = Object.freeze({ get: active, set: setTheme });
})();
