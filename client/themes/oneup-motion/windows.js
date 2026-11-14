/*
 * 1UP Anime interaction motion: nonblocking screen entry and optional
 * close animation for native <dialog>. Only opacity and transform.
 * Core navigation works identically without this module.
 */
(() => {
  'use strict';
  const EASE = 'cubic-bezier(.22, 1, .36, 1)';
  const current = new WeakMap();
  const closing = new Map();
  const reduced = () => (
    Boolean(document.body?.classList.contains('km-quiet')) ||
    Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) ||
    Boolean(navigator.connection?.saveData)
  );

  function cancelMotion(element) {
    if (!element) return;
    closing.delete(element);
    current.delete(element);
    try {
      element.classList.remove('is-closing');
      element.style.pointerEvents = '';
      element.style.animation = '';
      element.style.willChange = '';
    } catch {}
    if (typeof element.getAnimations === 'function') {
      try {
        for (const anim of element.getAnimations()) {
          if (anim.id === 'oneup-motion-close' || anim.id === 'oneup-motion-enter') {
            anim.cancel();
          }
        }
      } catch {}
    }
  }

  function enter(element, kind = 'route') {
    if (!element || element.hidden || !element.isConnected || document.hidden ||
        reduced() || typeof element.animate !== 'function') return false;
    current.get(element)?.cancel();
    const duration = kind === 'interior' ? 270 : 215;
    element.style.willChange = 'transform, opacity';
    const animation = element.animate([
      { opacity: .83, transform: 'translate3d(0, 11px, 0)' },
      { opacity: 1, transform: 'translate3d(0, 0, 0)' }
    ], { duration, easing: EASE });
    animation.id = 'oneup-motion-enter';
    current.set(element, animation);
    const finish = () => {
      if (current.get(element) === animation) {
        current.delete(element);
        element.style.willChange = '';
      }
    };
    animation.finished.catch(() => {}).then(finish);
    return true;
  }

  function prepareOpen(dialog) {
    cancelMotion(dialog);
    if (dialog) {
      dialog.classList.remove('is-closing');
      dialog.style.pointerEvents = '';
      dialog.style.animation = '';
    }
  }

  function closeDialog(dialog) {
    if (!dialog?.open) return false;
    if (closing.has(dialog)) return true;
    cancelMotion(dialog);
    if (reduced() || document.hidden || typeof dialog.animate !== 'function') {
      if (dialog) {
        dialog.classList.remove('is-closing');
        dialog.style.pointerEvents = '';
        dialog.style.animation = '';
        dialog.style.willChange = '';
      }
      if (dialog.open) dialog.close();
      return true;
    }

    dialog.classList.add('is-closing');
    dialog.style.pointerEvents = 'none';
    dialog.style.animation = 'none';
    dialog.style.willChange = 'transform, opacity';

    const animation = dialog.animate([
      { opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)' },
      { opacity: 0, transform: 'translate3d(0, 10px, 0) scale(.986)' }
    ], { duration: 165, easing: EASE, fill: 'forwards' });
    animation.id = 'oneup-motion-close';
    closing.set(dialog, animation);

    const finish = () => {
      document.removeEventListener('visibilitychange', onVisibility);
      closing.delete(dialog);
      dialog.classList.remove('is-closing');
      dialog.style.pointerEvents = '';
      dialog.style.animation = '';
      dialog.style.willChange = '';
      try {
        if (dialog.open) dialog.close();
      } catch {}
      try {
        animation.cancel();
      } catch {}
    };

    const onVisibility = () => {
      if (document.hidden) finish();
    };
    document.addEventListener('visibilitychange', onVisibility);

    animation.finished.then(finish, finish);

    dialog.addEventListener('close', () => {
      document.removeEventListener('visibilitychange', onVisibility);
      closing.delete(dialog);
      dialog.classList.remove('is-closing');
      dialog.style.pointerEvents = '';
      dialog.style.animation = '';
      dialog.style.willChange = '';
      try {
        animation.cancel();
      } catch {}
    }, { once: true });

    return true;
  }

  document.addEventListener('close', (e) => {
    if (e.target && e.target.tagName === 'DIALOG') {
      cancelMotion(e.target);
    }
  }, true);

  window.OneUpMotion = Object.freeze({
    enter,
    closeDialog,
    prepareOpen,
    cancelMotion,
    prefersReducedMotion: reduced
  });
})();
