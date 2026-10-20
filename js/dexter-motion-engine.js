/* DEXTER Motion Engine / 1UP Anime.
 * Progressive, optional micro-motion. No external JS libraries or remote assets.
 * Does not control playback, content routes, the opening, or anime-card depth.
 */
(() => {
  'use strict';
  const TARGETS = '#oneup-finale-deck .oneup-finale-action, #trending-rail .anime-card, #browse-grid .anime-card';
  const CONTAINERS = ['#oneup-finale-deck', '#trending-rail', '#browse-grid'];
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)') || { matches: false };
  const finePointer = window.matchMedia?.('(hover: hover) and (pointer: fine)') || { matches: false };
  let started = false;
  let enabled = true;
  let observer = null;
  let mutations = null;
  let stage = null;
  let pointerFrame = 0;
  let scanQueued = false;
  const observed = new WeakSet();
  const played = new WeakSet();
  const active = new Set();

  function motionAllowed() {
    return enabled && !document.hidden && !reduce.matches &&
      !document.body?.classList.contains('km-quiet') && !navigator.connection?.saveData;
  }
  function pointerAllowed() {
    return motionAllowed() && finePointer.matches;
  }
  function stopAnimations() {
    for (const animation of active) animation.cancel();
    active.clear();
  }
  function clearLight() {
    if (pointerFrame) window.cancelAnimationFrame(pointerFrame);
    pointerFrame = 0;
    stage?.classList.remove('dme-lit');
  }
  function pointerMove(event) {
    if (!pointerAllowed() || !stage) { clearLight(); return; }
    const rect = stage.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = Math.max(0, Math.min(100, (event.clientX - rect.left) * 100 / rect.width));
    const y = Math.max(0, Math.min(100, (event.clientY - rect.top) * 100 / rect.height));
    if (pointerFrame) window.cancelAnimationFrame(pointerFrame);
    pointerFrame = window.requestAnimationFrame(() => {
      pointerFrame = 0;
      if (!pointerAllowed()) return;
      stage.style.setProperty('--dme-light-x', x.toFixed(1) + '%');
      stage.style.setProperty('--dme-light-y', y.toFixed(1) + '%');
      stage.classList.add('dme-lit');
    });
  }
  function installLight() {
    stage = document.querySelector('#home-screen .hero-art-card');
    if (!stage || stage.querySelector('.dme-light')) return;
    const layer = document.createElement('span');
    layer.className = 'dme-light';
    layer.setAttribute('aria-hidden', 'true');
    stage.appendChild(layer);
    stage.addEventListener('pointerenter', pointerMove, { passive: true });
    stage.addEventListener('pointermove', pointerMove, { passive: true });
    stage.addEventListener('pointerleave', clearLight, { passive: true });
    stage.addEventListener('pointercancel', clearLight, { passive: true });
  }
  function animateOnce(element) {
    if (played.has(element) || !motionAllowed() || !element.isConnected ||
        element.hidden || typeof element.animate !== 'function') return;
    played.add(element);
    // Only opacity: avoids collisions with card-depth and existing hover transforms.
    const animation = element.animate(
      [{ opacity: .68 }, { opacity: 1 }],
      { duration: 290, easing: 'cubic-bezier(.22, 1, .36, 1)' }
    );
    active.add(animation);
    animation.finished.then(
      () => active.delete(animation), () => active.delete(animation)
    );
  }
  function refresh() {
    if (!observer) return 0;
    let count = 0;
    for (const node of document.querySelectorAll(TARGETS)) {
      if (observed.has(node)) continue;
      observed.add(node);
      observer.observe(node);
      count++;
    }
    return count;
  }
  function queueScan() {
    if (scanQueued) return;
    scanQueued = true;
    window.requestAnimationFrame(() => {
      scanQueued = false;
      refresh();
    });
  }
  function syncPreferences() {
    if (!motionAllowed()) {
      stopAnimations();
      clearLight();
      return;
    }
    refresh();
    // A screen already onscreen when motion is re-enabled should still be observed.
    if (observer) {
      for (const node of document.querySelectorAll(TARGETS)) {
        if (played.has(node)) continue;
        observer.unobserve(node);
        observer.observe(node);
      }
    }
    if (!pointerAllowed()) clearLight();
  }
  function setEnabled(value) {
    enabled = Boolean(value);
    syncPreferences();
    return enabled;
  }
  function init() {
    if (started) return;
    started = true;
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting || !motionAllowed()) continue;
          observer.unobserve(entry.target);
          animateOnce(entry.target);
        }
      }, { threshold: .06, rootMargin: '0px 0px 36px 0px' });
    }
    if (observer && 'MutationObserver' in window) {
      mutations = new MutationObserver(queueScan);
      for (const selector of CONTAINERS) {
        const container = document.querySelector(selector);
        if (container) mutations.observe(container, { childList: true, subtree: true });
      }
    }
    installLight();
    refresh();
    document.addEventListener('visibilitychange', syncPreferences);
    reduce.addEventListener?.('change', syncPreferences);
    finePointer.addEventListener?.('change', syncPreferences);
  }

  window.DexterMotionEngine = Object.freeze({
    init, refresh, setEnabled, isEnabled: () => enabled,
    isMotionAllowed: motionAllowed, version: '1.0.0'
  });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
