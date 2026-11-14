import { ref } from 'vue';

const translations = ref({});
const isReady = ref(false);

function normalizeSynopsis(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

export function useSpanishSynopses() {
  async function loadTranslations() {
    if (isReady.value) return;
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 7500);
      let response;
      try {
        response = await fetch('./data/translations-es.json', {
          cache: 'no-store',
          signal: ctrl.signal
        });
      } finally {
        clearTimeout(timer);
      }
      if (!response.ok) throw new Error('Archivo de traducciones no disponible');
      const json = await response.json();
      if (json.language !== 'es' || typeof json.translations !== 'object' || !json.translations) {
        throw new Error('Archivo de idioma inválido');
      }
      translations.value = json.translations;
      isReady.value = true;
    } catch (e) {
      console.info('1UP Anime: sinopsis en español pendiente.', e?.message);
    }
  }

  function spanishSynopsis(anime) {
    if (!anime) return '';
    const row = translations.value[String(anime.id)] ||
      (anime.mal_id ? translations.value['mal-' + anime.mal_id] : null);
    return normalizeSynopsis(anime.description_es || row?.es);
  }

  function hasSpanish(anime) {
    return Boolean(spanishSynopsis(anime)) || anime?.source === 'sample';
  }

  function hasEditorialSpanish(anime) {
    return Boolean(translations.value[String(anime?.id)]?.editorial);
  }

  function chosenSynopsis(anime) {
    if (!anime) return 'Sinopsis no disponible.';
    if (anime.source === 'sample') return normalizeSynopsis(anime.description);
    return spanishSynopsis(anime) || 'Sinopsis en español pendiente de traducción para este anime.';
  }

  return {
    translations,
    isReady,
    loadTranslations,
    normalizeSynopsis,
    spanishSynopsis,
    hasSpanish,
    hasEditorialSpanish,
    chosenSynopsis
  };
}
