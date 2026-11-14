import { ref, computed } from 'vue';
import { useAuth } from './useAuth.js';
import { useToast } from './useToast.js';

const saved = ref({});

export function useFavorites() {
  const { identityKey } = useAuth();
  const { showToast } = useToast();

  function reloadSaved() {
    try {
      const v = JSON.parse(localStorage.getItem(identityKey()) || '{}');
      saved.value = v && typeof v === 'object' && !Array.isArray(v) ? v : {};
    } catch {
      saved.value = {};
    }
  }

  function persist() {
    try {
      localStorage.setItem(identityKey(), JSON.stringify(saved.value));
    } catch {
      showToast('No se pudieron guardar los datos');
    }
  }

  function ensureItem(anime) {
    if (!anime?.id) return null;
    const id = anime.id;
    if (!saved.value[id]) {
      saved.value[id] = {
        id,
        title: anime.title || 'Anime',
        image: anime.image || '',
        averageScore: anime.averageScore || 0,
        year: anime.year || '',
        format: anime.format || 'TV',
        genres: anime.genres || [],
        favorite: false,
        watched: 0,
        externalUrl: ''
      };
    }
    return saved.value[id];
  }

  function isFav(id) {
    return Boolean(saved.value[id]?.favorite);
  }

  function toggleFav(anime) {
    if (!anime?.id) return;
    const item = ensureItem(anime);
    if (!item) return;

    item.favorite = !item.favorite;
    if (!item.favorite && !item.watched && !item.externalUrl) {
      delete saved.value[anime.id];
    }
    persist();
    showToast(item.favorite ? 'Añadido a Mi lista' : 'Quitado de Mi lista');
  }

  function setWatched(anime, delta) {
    if (!anime?.id) return;
    const item = ensureItem(anime);
    if (!item) return;

    const max = Number(anime.episodes) || 9999;
    const current = Number(item.watched || 0);
    item.watched = Math.max(0, Math.min(max, current + delta));
    persist();
    showToast('Episodio guardado (' + item.watched + ')');
  }

  function saveCustomUrl(anime, url) {
    if (!anime?.id) return;
    const item = ensureItem(anime);
    if (!item) return;

    item.externalUrl = String(url || '').trim();
    persist();
    showToast('Enlace personal guardado');
  }

  const continueWatchingList = computed(() => {
    return Object.values(saved.value).filter(x => Number(x.watched) > 0);
  });

  const favoritesList = computed(() => {
    return Object.values(saved.value).filter(x => x.favorite || Number(x.watched) > 0 || x.externalUrl).reverse();
  });

  // Load initially
  reloadSaved();

  return {
    saved,
    reloadSaved,
    persist,
    isFav,
    toggleFav,
    setWatched,
    saveCustomUrl,
    continueWatchingList,
    favoritesList
  };
}
