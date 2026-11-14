import { ref } from 'vue';

const is3DEnabled = ref(false);

export function useDexterMotion() {
  function toggle3D() {
    is3DEnabled.value = !is3DEnabled.value;
    document.body.classList.toggle('oneup-depth-active', is3DEnabled.value);
    const btn = document.getElementById('depth-toggle');
    if (btn) {
      btn.setAttribute('aria-pressed', String(is3DEnabled.value));
    }
  }

  function initMotion() {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    // Listen for pointer spotlight on desktop
    window.addEventListener('pointermove', (e) => {
      if (window.innerWidth <= 768) return;
      document.documentElement.style.setProperty('--spotlight-x', `${e.clientX}px`);
      document.documentElement.style.setProperty('--spotlight-y', `${e.clientY}px`);
    }, { passive: true });
  }

  return {
    is3DEnabled,
    toggle3D,
    initMotion
  };
}
