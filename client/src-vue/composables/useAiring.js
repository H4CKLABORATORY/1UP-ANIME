import { ref, computed } from 'vue';

const airingData = ref({
  airing: [],
  seasonal: { entries: [] },
  updated: null
});
const isAiringLoaded = ref(false);

export function useAiring() {
  async function loadAiring() {
    if (isAiringLoaded.value) return;
    try {
      const res = await fetch('./data/airing.json', { cache: 'no-cache' });
      if (!res.ok) throw new Error('Airing json unavailable');
      const data = await res.json();
      airingData.value = data;
      isAiringLoaded.value = true;
    } catch (e) {
      console.warn('1UP Anime: Airing data unavailable', e?.message);
    }
  }

  function formatTime(timestamp) {
    if (!timestamp) return '';
    const d = new Date(timestamp * 1000);
    return new Intl.DateTimeFormat('es-US', { hour: 'numeric', minute: '2-digit' }).format(d);
  }

  function formatDate(timestamp) {
    if (!timestamp) return '';
    const d = new Date(timestamp * 1000);
    return new Intl.DateTimeFormat('es-US', { month: 'short', day: 'numeric', weekday: 'short' }).format(d);
  }

  const upcomingAiringList = computed(() => {
    const now = Date.now() / 1000;
    const list = airingData.value.airing || [];
    return list
      .filter(x => x.airingAt && x.airingAt > now)
      .sort((a, b) => a.airingAt - b.airingAt)
      .slice(0, 16);
  });

  return {
    airingData,
    isAiringLoaded,
    loadAiring,
    formatTime,
    formatDate,
    upcomingAiringList
  };
}
