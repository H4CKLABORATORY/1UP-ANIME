<template>
  <nav
    class="letter-filter-rail"
    aria-label="Filtro de catálogo por letra"
    role="navigation"
    ref="railRef"
    @touchstart="onTouchStart"
    @touchmove.prevent="onTouchMove"
    @touchend="onTouchEnd"
  >
    <div class="letter-rail-header">
      <span class="letter-rail-label">A-Z</span>
    </div>

    <div class="letter-rail-list">
      <button
        v-for="letter in letters"
        :key="letter"
        type="button"
        class="letter-btn"
        :class="{
          active: isLetterActive(letter),
          'is-all': letter === 'TODOS'
        }"
        :data-letter="letter"
        :aria-pressed="isLetterActive(letter)"
        :aria-label="letter === 'TODOS' ? 'Ver catálogo completo sin filtro de letra' : 'Filtrar animes que comienzan con ' + letter"
        @click="onLetterClick(letter)"
      >
        <span class="letter-text">{{ letter === 'TODOS' ? 'ALL' : letter }}</span>
      </button>
    </div>

    <!-- Floating magnifier bubble on touch scrub (mobile Safari/Android UX) -->
    <transition name="bubble-fade">
      <div
        v-if="scrubActiveLetter"
        class="letter-scrub-bubble"
        aria-hidden="true"
      >
        {{ scrubActiveLetter === 'TODOS' ? 'ALL' : scrubActiveLetter }}
      </div>
    </transition>
  </nav>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  activeLetter: {
    type: String,
    default: 'ALL'
  }
});

const emit = defineEmits(['select-letter']);

const letters = [
  'TODOS', '#',
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'
];

const railRef = ref(null);
const scrubActiveLetter = ref(null);
let touchTimeout = null;

function isLetterActive(letter) {
  if (letter === 'TODOS') {
    return !props.activeLetter || props.activeLetter === 'ALL' || props.activeLetter === 'TODOS';
  }
  return props.activeLetter === letter;
}

function onLetterClick(letter) {
  if (isLetterActive(letter) && letter !== 'TODOS') {
    // Toggling the active letter turns off the letter filter and restores ALL
    emit('select-letter', 'ALL');
  } else {
    emit('select-letter', letter === 'TODOS' ? 'ALL' : letter);
  }
}

function getLetterFromTouch(touch) {
  if (!railRef.value) return null;
  const target = document.elementFromPoint(touch.clientX, touch.clientY);
  const btn = target?.closest?.('.letter-btn');
  return btn?.dataset?.letter || null;
}

function onTouchStart(e) {
  if (!e.touches.length) return;
  const letter = getLetterFromTouch(e.touches[0]);
  if (letter) {
    scrubActiveLetter.value = letter;
    onLetterClick(letter);
  }
}

function onTouchMove(e) {
  if (!e.touches.length) return;
  const letter = getLetterFromTouch(e.touches[0]);
  if (letter && letter !== scrubActiveLetter.value) {
    scrubActiveLetter.value = letter;
    onLetterClick(letter);
  }
}

function onTouchEnd() {
  clearTimeout(touchTimeout);
  touchTimeout = setTimeout(() => {
    scrubActiveLetter.value = null;
  }, 400);
}
</script>
