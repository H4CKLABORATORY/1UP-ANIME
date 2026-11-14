<template>
  <div id="browse-controls" class="catalog-filter-controls">
    <!-- Top Search Bar with Input and Clear 'X' Button -->
    <div class="catalog-search-bar">
      <div class="search-input-box" :class="{ 'has-focus': isInputFocused, 'has-content': hasActiveQuery }">
        <span class="search-icon" aria-hidden="true">🔍</span>

        <input
          id="catalog-search-input"
          ref="searchInputRef"
          type="text"
          class="catalog-search-input"
          v-model="catalogSearchQuery"
          placeholder="Buscar en catálogo... (Enter para encapsular y filtrar más)"
          aria-label="Buscar en catálogo con filtro encapsulado"
          autocomplete="off"
          @focus="isInputFocused = true"
          @blur="isInputFocused = false"
          @keydown.enter.prevent="onEnter"
          @keydown.backspace="onBackspace"
        />

        <!-- Clear 'X' Button -->
        <button
          v-if="hasActiveQuery"
          id="catalog-search-clear"
          type="button"
          class="catalog-search-clear-btn"
          aria-label="Limpiar búsqueda y filtros"
          title="Limpiar búsqueda"
          @click="onClearSearch"
        >
          ✕
        </button>
      </div>

      <!-- Quick Action / Encapsulate Hint -->
      <button
        v-if="catalogSearchQuery.trim()"
        type="button"
        class="encapsulate-btn"
        @click="onEnter"
        title="Encapsular este término para buscar de lo ya buscado"
      >
        <span>＋ Encapsular</span>
      </button>
    </div>

    <!-- Encapsulated Tags ("Buscar de lo ya buscado" / Multi-level Drill-down) -->
    <div v-if="searchTags.length" class="encapsulated-tags-section">
      <div class="encapsulated-header">
        <span class="encapsulated-badge">
          <span class="badge-icon">⚡</span>
          <b>Buscando de lo ya buscado</b>
          <span class="badge-count">({{ searchTags.length }} {{ searchTags.length === 1 ? 'filtro' : 'filtros' }})</span>
        </span>
        <button
          type="button"
          class="clear-tags-link"
          @click="clearAllSearchTags"
        >
          Limpiar filtros
        </button>
      </div>

      <div class="filter-chips-list">
        <span
          v-for="(tag, index) in searchTags"
          :key="tag + '-' + index"
          class="filter-chip"
        >
          <span class="chip-label">{{ tag }}</span>
          <button
            type="button"
            class="chip-remove"
            :aria-label="'Quitar filtro ' + tag"
            title="Quitar este filtro"
            @click="removeSearchTag(index)"
          >
            ✕
          </button>
        </span>
      </div>
    </div>

    <!-- Quick Suggestions to Encapsulate with 1-Click -->
    <div v-if="!searchTags.length && !catalogSearchQuery" class="quick-tags-shelf">
      <span class="quick-tags-title">Sugerencias rápidas:</span>
      <div class="quick-tags-scroll">
        <button
          v-for="sug in suggestions"
          :key="sug"
          type="button"
          class="quick-tag-pill"
          @click="addSearchTag(sug)"
        >
          ＋ {{ sug }}
        </button>
      </div>
    </div>

    <!-- Dropdown Filters Bar -->
    <div class="browse-controls-row">
      <select
        id="filter-genre"
        v-model="browseFilters.genre"
        aria-label="Género"
        @change="onFilterChange"
      >
        <option value="">Todos los géneros</option>
        <option v-for="g in genres" :key="g[0]" :value="g[0]">{{ g[1] }}</option>
      </select>

      <select
        id="filter-format"
        v-model="browseFilters.format"
        aria-label="Tipo"
        @change="onFilterChange"
      >
        <option value="">Todos los tipos</option>
        <option value="TV">Series</option>
        <option value="MOVIE">Películas</option>
        <option value="OVA">OVA</option>
        <option value="ONA">ONA</option>
        <option value="SPECIAL">Especiales</option>
      </select>

      <select
        id="filter-status"
        v-model="browseFilters.status"
        aria-label="Estado"
        @change="onFilterChange"
      >
        <option value="">Todos los estados</option>
        <option value="RELEASING">En emisión</option>
        <option value="FINISHED">Finalizados</option>
      </select>

      <select
        id="filter-sort"
        v-model="browseFilters.sort"
        aria-label="Orden"
        @change="onFilterChange"
      >
        <option value="POPULARITY_DESC">Más populares</option>
        <option value="TRENDING_DESC">Tendencias</option>
        <option value="SCORE_DESC">Mejor puntuados</option>
        <option value="START_DATE_DESC">Más recientes</option>
        <option value="TITLE_ASC">Nombre (A-Z)</option>
        <option value="TITLE_DESC">Nombre (Z-A)</option>
      </select>

      <button
        id="filter-reset"
        type="button"
        @click="resetFilters"
      >
        Limpiar
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useCatalog } from '../../composables/useCatalog.js';

const {
  genres,
  browseFilters,
  browse,
  currentRoute,
  catalogSearchQuery,
  searchTags,
  addSearchTag,
  removeSearchTag,
  clearAllSearchTags,
  clearCatalogSearch,
  setSelectedLetter
} = useCatalog();

const searchInputRef = ref(null);
const isInputFocused = ref(false);

const suggestions = [
  'Acción', 'Romance', 'Comedia', 'Fantasía', 'Isekai', 'Película', '2024', 'En emisión'
];

const hasActiveQuery = computed(() => {
  return Boolean(catalogSearchQuery.value || searchTags.value.length > 0);
});

function onEnter() {
  const query = catalogSearchQuery.value.trim();
  if (query) {
    addSearchTag(query);
  }
}

function onBackspace() {
  // If the input is empty and the user presses backspace, remove the last encapsulated tag
  if (!catalogSearchQuery.value && searchTags.value.length > 0) {
    removeSearchTag(searchTags.value.length - 1);
  }
}

function onClearSearch() {
  if (catalogSearchQuery.value) {
    catalogSearchQuery.value = '';
  } else if (searchTags.value.length > 0) {
    clearAllSearchTags();
  }
  if (searchInputRef.value) {
    searchInputRef.value.focus();
  }
}

function onFilterChange() {
  if (currentRoute.value !== 'catalogo') {
    browse(currentRoute.value, 1, false);
  }
}

function resetFilters() {
  browseFilters.genre = '';
  browseFilters.format = '';
  browseFilters.status = '';
  browseFilters.sort = 'POPULARITY_DESC';
  clearCatalogSearch();
  setSelectedLetter('ALL');
  if (currentRoute.value !== 'catalogo') {
    browse(currentRoute.value, 1, false);
  }
}
</script>
