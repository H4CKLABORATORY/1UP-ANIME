<template>
  <div id="browse-controls" class="catalog-filter-controls">
    <!-- Top Search Bar with Inline Encapsulated Chips -->
    <div class="catalog-search-bar">
      <div
        class="search-input-box"
        :class="{ 'has-focus': isInputFocused, 'has-content': hasActiveQuery }"
        @click="focusInput"
      >
        <span class="search-icon" aria-hidden="true">🔍</span>

        <!-- Encapsulated Chips Inside the Filter Box -->
        <div v-if="searchTags.length" class="search-chips-wrap">
          <span
            v-for="(tag, index) in searchTags"
            :key="tag + '-' + index"
            class="filter-chip compact-chip"
          >
            <span class="chip-label">{{ tag }}</span>
            <button
              type="button"
              class="chip-remove"
              :aria-label="'Quitar filtro ' + tag"
              title="Quitar este filtro"
              @click.stop="removeSearchTag(index)"
            >
              ✕
            </button>
          </span>
        </div>

        <input
          id="catalog-search-input"
          ref="searchInputRef"
          type="text"
          class="catalog-search-input"
          v-model="localInputQuery"
          :placeholder="computedPlaceholder"
          aria-label="Buscar en catálogo con filtro encapsulado"
          autocomplete="off"
          @focus="isInputFocused = true"
          @blur="isInputFocused = false"
          @input="onSearchInput"
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
          @click.stop="onClearSearch"
        >
          ✕
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
import { ref, computed, watch } from 'vue';
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
const localInputQuery = ref(catalogSearchQuery.value || '');
let debounceTimer = null;

watch(catalogSearchQuery, (newVal) => {
  if (newVal !== localInputQuery.value) {
    localInputQuery.value = newVal || '';
  }
});

const computedPlaceholder = computed(() => {
  return searchTags.value.length > 0
    ? 'Filtrar dentro de la selección... (Enter para encapsular)'
    : 'Buscar en catálogo... (Enter para encapsular)';
});

const hasActiveQuery = computed(() => {
  return Boolean(localInputQuery.value || catalogSearchQuery.value || searchTags.value.length > 0);
});

function onSearchInput() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    catalogSearchQuery.value = localInputQuery.value.trim();
  }, 300);
}

function onEnter() {
  clearTimeout(debounceTimer);
  const query = localInputQuery.value.trim();
  if (query) {
    addSearchTag(query);
    localInputQuery.value = '';
    catalogSearchQuery.value = '';
    searchInputRef.value?.focus();
  }
}

function onBackspace() {
  if (!localInputQuery.value && searchTags.value.length > 0) {
    removeSearchTag(searchTags.value.length - 1);
    searchInputRef.value?.focus();
  }
}

function onClearSearch() {
  clearTimeout(debounceTimer);
  localInputQuery.value = '';
  clearCatalogSearch();
  searchInputRef.value?.focus();
}

function focusInput(e) {
  if (!e.target.matches('input, button, select')) {
    searchInputRef.value?.focus();
  }
}

function onFilterChange() {
  if (currentRoute.value !== 'catalogo') {
    browse(currentRoute.value, 1, false);
  }
}

function resetFilters() {
  clearTimeout(debounceTimer);
  localInputQuery.value = '';
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
