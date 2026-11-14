<template>
  <article class="anime-card depth-scene" :data-id="anime.id">
    <div
      class="anime-art"
      role="button"
      tabindex="0"
      :data-details="anime.id"
      :aria-label="'Ver detalles de ' + animeTitle"
      @click="onOpenDetail"
      @keydown.enter="onOpenDetail"
      @keydown.space.prevent="onOpenDetail"
    >
      <img
        v-if="anime.image || anime.poster"
        data-depth="far"
        loading="lazy"
        referrerpolicy="no-referrer"
        :src="anime.image || anime.poster"
        :alt="'Póster de ' + animeTitle"
      >
      <div v-else class="placeholder-art">
        <strong>{{ animeTitle.slice(0, 27) }}</strong>
      </div>
      <div class="art-shade anime-card-shine" data-depth="mid"></div>
      <span class="rating" data-depth="front">
        <b>★</b> {{ scoreFormatted }}
      </span>
      <span v-if="isAiring" class="card-badge-airing">EMISIÓN</span>
    </div>

    <button
      class="anime-save"
      :class="{ saved: isSaved }"
      :data-save="anime.id"
      type="button"
      :aria-label="isSaved ? 'Quitar de mi lista' : 'Guardar en mi lista'"
      @click.stop="onToggleSave"
    >
      {{ isSaved ? '✓' : '＋' }}
    </button>

    <div class="card-info" data-depth="front">
      <button
        class="card-name"
        type="button"
        :data-details="anime.id"
        :title="animeTitle"
        @click="onOpenDetail"
      >
        {{ animeTitle }}
      </button>
      <div class="card-sub">
        <span class="card-year">{{ animeYear }}</span>
        <span v-if="episodesLabel" class="card-episodes">{{ episodesLabel }}</span>
        <span class="card-type">{{ formatLabel }}</span>
      </div>
    </div>
  </article>
</template>

<script setup>
import { computed } from 'vue';
import { useCatalog } from '../../composables/useCatalog.js';
import { useFavorites } from '../../composables/useFavorites.js';

const props = defineProps({
  anime: {
    type: Object,
    required: true
  }
});

const { formats, openDetail } = useCatalog();
const { isFav, toggleFav } = useFavorites();

const isSaved = computed(() => isFav(props.anime.id));

const animeTitle = computed(() => {
  return (props.anime?.title || props.anime?.title_romaji || 'Anime').trim();
});

const animeYear = computed(() => {
  return props.anime?.year || (props.anime?.season ? props.anime.season.split(' ').pop() : 'Anime');
});

const isAiring = computed(() => {
  return props.anime?.status === 'RELEASING' || (props.anime?.status_label && props.anime.status_label.toLowerCase().includes('emisión'));
});

const episodesLabel = computed(() => {
  if (props.anime?.episodes) return `${props.anime.episodes} eps`;
  if (props.anime?.status_label) return props.anime.status_label;
  if (isAiring.value) return 'En emisión';
  return '';
});

const scoreFormatted = computed(() => {
  return props.anime.averageScore ? (props.anime.averageScore / 10).toFixed(1) : (props.anime.score ? Number(props.anime.score).toFixed(1) : '—');
});

const formatLabel = computed(() => {
  return formats[props.anime.format] || props.anime.type || props.anime.format || 'Serie';
});

function onOpenDetail() {
  openDetail(props.anime);
}

function onToggleSave() {
  toggleFav(props.anime);
}
</script>
