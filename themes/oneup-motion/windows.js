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

  function enter(element, kind = 'route') {
    if (!element || element.hidden || !element.isConnected || document.hidden ||
        reduced() || typeof element.animate !== 'function') return false;
    current.get(element)?.cancel();
    const duration = kind === 'interior' ? 270 : 215;
    const animation = element.animate([
      { opacity: .83, transform: 'translate3d(0, 11px, 0)' },
      { opacity: 1, transform: 'translate3d(0, 0, 0)' }
    ], { duration, easing: EASE });
    animation.id = 'oneup-motion-enter';
    current.set(element, animation);
    animation.finished.catch(() => {}).then(() => {
      if (current.get(element) === animation) current.delete(element);
    });
    return true;
  }

  function closeDialog(dialog) {
    if (!dialog?.open) return false;
    if (closing.has(dialog)) return true;
    if (reduced() || document.hidden || typeof dialog.animate !== 'function') {
      dialog.close();
      return true;
    }
    const animation = dialog.animate([
      { opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)' },
      { opacity: 0, transform: 'translate3d(0, 10px, 0) scale(.986)' }
    ], { duration: 165, easing: EASE, fill: 'forwards' });
    animation.id = 'oneup-motion-close';
    closing.set(dialog, animation);
    const finish = () => {
      if (closing.get(dialog) !== animation) return;
      closing.delete(dialog);
      if (dialog.open) dialog.close();
    };
    animation.finished.then(finish, finish);
    // If a PWA is backgrounded mid-close, release the native modal immediately.
    const onVisibility = () => {
      if (document.hidden) finish();
      document.removeEventListener('visibilitychange', onVisibility);
    };
    document.addEventListener('visibilitychange', onVisibility);
    dialog.addEventListener('close', () => {
      document.removeEventListener('visibilitychange', onVisibility);
      if (closing.get(dialog) === animation) {
        closing.delete(dialog);
        animation.cancel();
      }
    }, { once: true });
    return true;
  }

  window.OneUpMotion = Object.freeze({ enter, closeDialog, prefersReducedMotion: reduced });
})();
