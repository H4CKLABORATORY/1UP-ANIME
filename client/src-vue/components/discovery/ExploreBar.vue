<template>
  <section class="wrap explore-section">
    <div class="explore-top">
      <div>
        <div class="micro">¿QUÉ VEMOS HOY?</div>
        <h2>Tu próxima <em>obsesión.</em></h2>
      </div>
      <form id="search-form" class="searchbar" @submit.prevent="handleSearch">
        <svg><use href="#ico-search" /></svg>
        <input
          id="search-input"
          ref="searchInputRef"
          v-model="localQuery"
          type="search"
          autocomplete="off"
          maxlength="95"
          placeholder="Busca anime en español, romaji o japonés... (Enter para encapsular)"
          aria-label="Buscar anime"
          @input="onSearchInputDebounce"
        >
        <button type="submit">Buscar ↗</button>
      </form>
    </div>
    <div id="genre-pills" class="genre-pills">
      <button
        v-for="g in genres"
        :key="g[0]"
        type="button"
        class="genre-pill"
        @click="selectGenre(g[0])"
      >
        {{ g[1] }}
      </button>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue';
import { useCatalog } from '../../composables/useCatalog.js';

const { genres, setRoute, browseFilters, catalogSearchQuery, addSearchTag } = useCatalog();
const localQuery = ref('');
const searchInputRef = ref(null);
let homeDebounce = null;

function onSearchInputDebounce() {
  clearTimeout(homeDebounce);
  const q = localQuery.value.trim();
  if (q.length >= 2) {
    homeDebounce = setTimeout(() => {
      catalogSearchQuery.value = q;
      setRoute('catalogo');
    }, 380);
  }
}

function handleSearch() {
  clearTimeout(homeDebounce);
  const q = localQuery.value.trim();
  if (!q) return;
  addSearchTag(q);
  localQuery.value = '';
  setRoute('catalogo');
}

function selectGenre(genreKey) {
  browseFilters.genre = genreKey;
  setRoute('catalogo');
}

defineExpose({
  focusSearch() {
    searchInputRef.value?.focus();
  }
});
</script>
