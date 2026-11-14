<template>
  <section v-if="episodes && episodes.length > 0" id="oneup-player-section" class="oneup-detail-section">
    <h3>EPISODIOS DISPONIBLES</h3>
    <p>Estas fuentes se agregan únicamente con permiso de distribución. Elige episodio y servidor.</p>
    <div id="oneup-licensed-episodes" class="oneup-episode-select">
      <button
        v-for="(ep, idx) in episodes"
        :key="idx"
        class="oneup-episode-button"
        :class="{ active: currentEpisodeIndex === idx }"
        type="button"
        :data-licensed-episode="idx"
        :aria-label="'Abrir episodio autorizado ' + (idx + 1)"
        @click="selectEpisode(idx)"
      >
        {{ idx + 1 }} · {{ ep.title || 'Episodio' }}
      </button>
    </div>

    <div id="oneup-player-content" class="oneup-player-content">
      <div v-if="currentSource" class="player-wrapper">
        <video
          v-if="currentSource.url && !isIframeSource"
          ref="videoElRef"
          controls
          playsinline
          class="oneup-video-element"
          :src="currentSource.url"
        ></video>
        <iframe
          v-else-if="currentSource.url && isIframeSource"
          :src="currentSource.url"
          class="oneup-iframe-element"
          allowfullscreen
          referrerpolicy="no-referrer"
        ></iframe>

        <div v-if="currentEpisode?.sources?.length > 1" class="oneup-server-selector">
          <span>Servidores:</span>
          <button
            v-for="(src, sIdx) in currentEpisode.sources"
            :key="sIdx"
            type="button"
            class="server-button"
            :class="{ active: currentSourceIndex === sIdx }"
            :data-licensed-server="sIdx"
            @click="selectServer(sIdx)"
          >
            Servidor {{ sIdx + 1 }} ({{ src.label || src.type || 'Opción' }})
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
  episodes: {
    type: Array,
    default: () => []
  }
});

const currentEpisodeIndex = ref(0);
const currentSourceIndex = ref(0);
const videoElRef = ref(null);

watch(() => props.episodes, () => {
  currentEpisodeIndex.value = 0;
  currentSourceIndex.value = 0;
}, { immediate: true });

const currentEpisode = computed(() => {
  return props.episodes[currentEpisodeIndex.value] || null;
});

const currentSource = computed(() => {
  const sources = currentEpisode.value?.sources || [];
  return sources[currentSourceIndex.value] || (currentEpisode.value?.url ? { url: currentEpisode.value.url } : null);
});

const isIframeSource = computed(() => {
  const s = currentSource.value;
  return s?.type === 'iframe' || s?.type === 'embed' || (s?.url && !s.url.endsWith('.mp4') && !s.url.endsWith('.m3u8'));
});

function selectEpisode(idx) {
  currentEpisodeIndex.value = idx;
  currentSourceIndex.value = 0;
}

function selectServer(sIdx) {
  currentSourceIndex.value = sIdx;
}
</script>
