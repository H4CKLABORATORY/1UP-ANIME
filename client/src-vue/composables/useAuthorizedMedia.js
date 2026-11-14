import { ref } from 'vue';

const mediaManifest = ref({ entries: {} });
const isLoaded = ref(false);

export function useAuthorizedMedia() {
  async function loadMediaManifest() {
    if (isLoaded.value) return;
    try {
      const res = await fetch('./data/licensed-media.json', { cache: 'no-cache' });
      if (!res.ok) throw new Error('Licensed media not found');
      const data = await res.json();
      mediaManifest.value = data || { entries: {} };
      isLoaded.value = true;
    } catch {
      mediaManifest.value = { entries: {} };
    }
  }

  function getMediaForAnime(animeId) {
    if (!animeId) return [];
    const entries = mediaManifest.value.entries || {};
    return entries[animeId]?.episodes || [];
  }

  return {
    mediaManifest,
    isLoaded,
    loadMediaManifest,
    getMediaForAnime
  };
}
