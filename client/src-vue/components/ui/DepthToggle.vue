<template>
  <button
    id="depth-toggle"
    class="depth-toggle-btn"
    type="button"
    aria-label="Modo 3D"
    :aria-pressed="String(is3DEnabled)"
    title="Activar modo profundidad"
    @click="toggle3D"
  >
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="3" y="3" width="12" height="12" rx="2" />
      <rect x="9" y="9" width="12" height="12" rx="2" />
    </svg>
    <span>3D</span>
  </button>
</template>

<script setup>
import { useDexterMotion } from '../../composables/useDexterMotion.js';

const { is3DEnabled, toggle3D } = useDexterMotion();
</script>
