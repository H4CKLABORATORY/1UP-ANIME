<template>
  <dialog
    id="anime-dialog"
    ref="dialogRef"
    class="anime-dialog"
    aria-labelledby="detail-anime-name"
  >
    <button
      id="anime-close"
      type="button"
      class="dialog-close"
      aria-label="Cerrar ficha del anime"
      @click="onClose"
    >
      ✕
    </button>

    <div id="anime-dialog-body">
      <template v-if="anime">
        <div class="oneup-detail-cover">
          <div
            id="oneup-detail-art"
            class="oneup-detail-cover-image"
            :style="backdropStyle"
            aria-hidden="true"
          ></div>

          <div class="oneup-detail-content">
            <div class="oneup-detail-poster">
              <img
                v-if="anime.image"
                :src="anime.image"
                :alt="'Póster de ' + anime.title"
                loading="eager"
                referrerpolicy="no-referrer"
              >
              <div v-else class="placeholder-art">
                <strong>{{ anime.title }}</strong>
              </div>
            </div>

            <div class="oneup-detail-info">
              <div class="oneup-detail-tag">1UP ANIME / DESTACADO</div>
              <h2 id="detail-anime-name" class="oneup-detail-title">
                {{ anime.title }}
              </h2>

              <div class="oneup-detail-meta">
                <span
                  v-for="(stat, idx) in statsList"
                  :key="idx"
                  :class="{ rated: stat.startsWith('★') }"
                >
                  {{ stat }}
                </span>
              </div>

              <div class="oneup-detail-tag oneup-synopsis-eyebrow">
                {{ isAutoTranslated ? 'SINOPSIS EN ESPAÑOL · TRADUCCIÓN AUTOMÁTICA' : 'SINOPSIS · INFORMACIÓN DEL ANIME' }}
              </div>

              <p class="oneup-detail-synopsis">
                {{ shortSynopsis }}
              </p>

              <div class="oneup-detail-commands">
                <button
                  type="button"
                  class="cta primary"
                  :data-save="anime.id"
                  @click="toggleFav(anime)"
                >
                  {{ isFavorite ? '✓ Guardado' : '＋ Añadir a mi lista' }}
                </button>
                <a
                  v-if="anime.siteUrl"
                  class="cta outline"
                  :href="anime.siteUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Ficha completa ↗
                </a>
              </div>
            </div>
          </div>
        </div>

        <div class="oneup-detail-lower">
          <!-- Authorized Player -->
          <EpisodePlayer :episodes="authorizedEpisodes" />

          <!-- Episode Comments -->
          <EpisodeComments :anime-id="anime.id" />

          <!-- Synopsis section -->
          <section class="oneup-detail-section oneup-synopsis-section">
            <h3>HISTORIA Y SINOPSIS</h3>
            <p class="oneup-synopsis-source">{{ synopsisSourceText }}</p>
            <p class="oneup-synopsis-text">
              {{ showOriginalText ? originalSynopsis : fullSpanishSynopsis }}
            </p>
            <button
              v-if="originalSynopsis"
              type="button"
              data-synopsis-original="1"
              class="oneup-synopsis-toggle"
              @click="showOriginalText = !showOriginalText"
            >
              {{ showOriginalText ? 'Ver traducción en español' : 'Ver texto original' }}
            </button>
          </section>

          <hr class="oneup-detail-separator">

          <!-- Genres -->
          <section class="oneup-detail-section">
            <h3>GÉNEROS</h3>
            <div class="oneup-genre-tags">
              <span
                v-for="g in genreChips"
                :key="g"
                class="oneup-genre-tag"
              >
                {{ g }}
              </span>
            </div>
          </section>

          <hr class="oneup-detail-separator">

          <!-- Watch Progress -->
          <section class="oneup-detail-section">
            <h3>TU PROGRESO</h3>
            <p>Lleva un registro personal de los episodios vistos.</p>
            <div class="episode-controls">
              <button
                type="button"
                data-episode="-1"
                aria-label="Restar episodio"
                @click="changeProgress(-1)"
              >
                −
              </button>
              <strong id="episode-value">{{ watchedCount }}</strong>
              <button
                type="button"
                data-episode="1"
                aria-label="Sumar episodio"
                @click="changeProgress(1)"
              >
                +
              </button>
              <span class="oneup-episode-text">
                de {{ anime.episodes || '?' }} episodios
              </span>
            </div>
          </section>

          <hr class="oneup-detail-separator">

          <!-- Where to watch -->
          <section class="oneup-detail-section">
            <h3>DÓNDE VERLO</h3>
            <div class="detail-links">
              <template v-if="streamingLinks.length > 0">
                <a
                  v-for="(link, lIdx) in streamingLinks"
                  :key="lIdx"
                  :href="link.url"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {{ link.name || 'Plataforma oficial' }} ↗
                </a>
              </template>
              <p v-else>No hay plataformas oficiales registradas para este título.</p>
            </div>
            <p>Los enlaces conducen a proveedores externos; la disponibilidad depende de cada plataforma y región.</p>
          </section>

          <hr class="oneup-detail-separator">

          <!-- Custom Link -->
          <section class="oneup-detail-section">
            <h3>MI ENLACE PERSONAL</h3>
            <div class="detail-actions">
              <input
                id="custom-url"
                v-model="customUrlInput"
                type="url"
                aria-label="Enlace personal del anime"
                placeholder="https://..."
              >
              <button
                id="save-url"
                type="button"
                class="cta outline"
                @click="onSaveCustomUrl"
              >
                Guardar
              </button>
            </div>
          </section>

          <!-- Recommendations -->
          <section v-if="recommendations.length > 0" class="oneup-detail-section">
            <h3>SI TE INTERESÓ ESTE ANIME</h3>
            <div class="oneup-related-grid">
              <button
                v-for="rel in recommendations"
                :key="rel.id"
                class="oneup-related-tile"
                type="button"
                :data-details="rel.id"
                :title="'Ver ' + rel.title"
                @click="selectRecommendation(rel)"
              >
                <img loading="lazy" :src="rel.image" :alt="'Póster de ' + rel.title">
                <strong>{{ rel.title }}</strong>
              </button>
            </div>
          </section>
        </div>
      </template>
    </div>
  </dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import EpisodePlayer from './EpisodePlayer.vue';
import EpisodeComments from './EpisodeComments.vue';
import { useCatalog } from '../../composables/useCatalog.js';
import { useSpanishSynopses } from '../../composables/useSpanishSynopses.js';
import { useFavorites } from '../../composables/useFavorites.js';
import { useAuthorizedMedia } from '../../composables/useAuthorizedMedia.js';

const props = defineProps({
  anime: {
    type: Object,
    default: null
  },
  isOpen: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close', 'select-anime']);

const dialogRef = ref(null);
const showOriginalText = ref(false);
const customUrlInput = ref('');

const { formats, genreSpanish, entries } = useCatalog();
const { chosenSynopsis, hasSpanish, hasEditorialSpanish, normalizeSynopsis } = useSpanishSynopses();
const { isFav, toggleFav, setWatched, saveCustomUrl, saved } = useFavorites();
const { getMediaForAnime } = useAuthorizedMedia();

watch(() => props.isOpen, (open) => {
  if (!dialogRef.value) return;
  if (open) {
    window.OneUpMotion?.prepareOpen?.(dialogRef.value);
    for (const a of dialogRef.value.getAnimations?.() || []) {
      if (a.id === 'oneup-motion-close') a.cancel();
    }
    if (!dialogRef.value.open) {
      dialogRef.value.showModal();
      dialogRef.value.scrollTop = 0;
    }
    showOriginalText.value = false;
    const item = saved.value[props.anime?.id];
    customUrlInput.value = item?.externalUrl || '';
  } else {
    if (dialogRef.value.open) {
      if (!window.OneUpMotion?.closeDialog?.(dialogRef.value)) {
        dialogRef.value.close();
      }
    }
  }
});

const isFavorite = computed(() => {
  return props.anime?.id ? isFav(props.anime.id) : false;
});

const watchedCount = computed(() => {
  return props.anime?.id ? (saved.value[props.anime.id]?.watched || 0) : 0;
});

const backdropStyle = computed(() => {
  const bg = props.anime?.banner || props.anime?.image;
  return bg ? { backgroundImage: `url("${bg}")` } : {};
});

const statsList = computed(() => {
  if (!props.anime) return [];
  const a = props.anime;
  return [
    formats[a.format] || a.format || 'Anime',
    a.year ? String(a.year) : '',
    a.episodes ? `${a.episodes} episodios` : '',
    a.averageScore ? `★ ${(a.averageScore / 10).toFixed(1)}` : ''
  ].filter(Boolean);
});

const isAutoTranslated = computed(() => {
  return hasSpanish(props.anime);
});

const fullSpanishSynopsis = computed(() => {
  return chosenSynopsis(props.anime);
});

const shortSynopsis = computed(() => {
  return fullSpanishSynopsis.value || 'La sinopsis de este anime todavía no está disponible en el catálogo.';
});

const originalSynopsis = computed(() => {
  return normalizeSynopsis(props.anime?.description);
});

const synopsisSourceText = computed(() => {
  if (!hasSpanish(props.anime)) {
    return 'Sinopsis en español pendiente de traducción';
  }
  return hasEditorialSpanish(props.anime)
    ? 'Sinopsis en español revisada editorialmente'
    : 'Traducción automática al español · puede contener imprecisiones';
});

const genreChips = computed(() => {
  const gList = props.anime?.genres || [];
  return gList.slice(0, 7).map(g => genreSpanish(g));
});

const streamingLinks = computed(() => {
  return (props.anime?.streaming || []).filter(x => x.url);
});

const authorizedEpisodes = computed(() => {
  return props.anime?.id ? getMediaForAnime(props.anime.id) : [];
});

const recommendations = computed(() => {
  if (!props.anime) return [];
  const a = props.anime;
  const pool = [...entries.values()];
  return pool
    .filter(x => x.id !== a.id && x.image && (x.genres || []).some(g => (a.genres || []).includes(g)))
    .slice(0, 4);
});

function changeProgress(delta) {
  if (props.anime) {
    setWatched(props.anime, delta);
  }
}

function onSaveCustomUrl() {
  if (props.anime) {
    saveCustomUrl(props.anime, customUrlInput.value);
  }
}

function selectRecommendation(relAnime) {
  emit('select-anime', relAnime);
}

function onClose() {
  emit('close');
}
</script>
