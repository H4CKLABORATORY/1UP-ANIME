<template>
  <div
    v-if="isOpen"
    id="oneup-opening"
    role="dialog"
    aria-modal="true"
    aria-label="Introducción cinematográfica de 1UP ANIME"
    @click="dismiss"
  >
    <section id="cinema" data-mode="opening" aria-label="Animación de entrada 1UP ANIME">
      <div class="environment">
        <div class="ambient ambient-blue"></div>
        <div class="ambient ambient-red"></div>
        <div class="nebula nebula-a"></div>
        <div class="nebula nebula-b"></div>
        <div class="energy-column energy-blue"></div>
        <div class="energy-column energy-red"></div>
        <div class="ring ring-a"></div>
        <div class="ring ring-b"></div>
        <div class="scene-fog scene-fog-blue"></div>
        <div class="scene-fog scene-fog-red"></div>
        <canvas id="particles" aria-hidden="true"></canvas>
        <div id="brand-3d" class="logo-group">
          <img class="logo-halo" :src="'./assets/oneup-header-letters.png'" alt="" aria-hidden="true">
          <img class="logo-main" :src="'./assets/oneup-header-letters.png'" alt="1UP ANIME">
          <div class="light-sweep" aria-hidden="true"></div>
        </div>
        <div class="optical-flash" aria-hidden="true"></div>
        <div class="letterbox-noise" aria-hidden="true"></div>
      </div>
      <video
        id="original-signature"
        ref="videoRef"
        preload="auto"
        playsinline
        :src="'./assets/1up-anime-intro-firma-3seg.mp4'"
        tabindex="-1"
        aria-hidden="true"
        @ended="dismiss"
      ></video>
      <p id="audio-status" class="sr-only" role="status" aria-live="polite">
        {{ audioStatus }}
      </p>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const isOpen = ref(false);
const audioStatus = ref('');
const videoRef = ref(null);

function dismiss() {
  isOpen.value = false;
  try {
    sessionStorage.setItem('oneup_opening_seen', '1');
  } catch {}
}

onMounted(() => {
  const seen = (() => {
    try {
      return sessionStorage.getItem('oneup_opening_seen') === '1';
    } catch {
      return false;
    }
  })();

  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (seen || prefersReduced) {
    isOpen.value = false;
    return;
  }

  // Show intro
  isOpen.value = true;
  // Automatically close after 3.8s if not dismissed
  setTimeout(() => {
    if (isOpen.value) dismiss();
  }, 3800);
});
</script>
