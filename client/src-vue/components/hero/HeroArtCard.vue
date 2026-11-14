<template>
  <div class="hero-art-card">
    <div class="hero-art-emblem">
      <img
        id="hero-feature-cover"
        :src="coverSrc"
        :alt="'Póster de ' + (anime?.title || 'Anime')"
        @error="handleImageError"
      >
    </div>
    <div class="hero-art-caption">
      <span>ANIME SELECCIONADO</span>
      <b id="hero-feature-title">{{ anime?.title || 'TU SIGUIENTE HISTORIA' }}</b>
      <small id="hero-feature-caption">{{ caption }}</small>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { useCatalog } from '../../composables/useCatalog.js';

const props = defineProps({
  anime: {
    type: Object,
    default: null
  }
});

const { formats } = useCatalog();
const fallbackSrc = './assets/oneup-crest.svg';
const coverSrc = ref(props.anime?.image || fallbackSrc);

watch(() => props.anime, (newAnime) => {
  coverSrc.value = newAnime?.image || fallbackSrc;
}, { immediate: true });

function handleImageError() {
  coverSrc.value = fallbackSrc;
}

const caption = computed(() => {
  if (!props.anime) return 'EXPLORA UNA HISTORIA';
  const format = formats[props.anime.format] || props.anime.format || 'Anime';
  const year = props.anime.year ? String(props.anime.year) : '';
  return [format, year].filter(Boolean).join(' · ').toUpperCase();
});
</script>
