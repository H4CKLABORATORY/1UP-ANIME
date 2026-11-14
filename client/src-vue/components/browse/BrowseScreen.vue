<template>
  <section id="browse-screen" class="wrap browse-screen">
    <div class="browse-intro">
      <div id="browse-eyebrow" class="micro">{{ meta.eyebrow }}</div>
      <h1 id="browse-title" v-html="meta.title"></h1>
      <p id="browse-summary">{{ meta.summary }}</p>
    </div>

    <!-- Filter Bar & Search Above Animes -->
    <BrowseControls v-if="currentRoute === 'catalogo'" />

    <!-- Status message -->
    <div id="browse-status" class="browse-status">
      {{ statusMessage }}
    </div>

    <!-- Catalog Layout with Virtual Grid + Letter Filter Rail on the Right -->
    <div
      v-if="currentRoute === 'catalogo'"
      class="catalog-view-layout"
    >
      <div class="catalog-grid-area">
        <div v-if="fullCatalogLoading && (!displayItems || !displayItems.length)" class="loading">
          Cargando catálogo completo de animes...
        </div>
        <VirtualCatalogGrid
          v-else
          :items="displayItems"
        />
      </div>

      <!-- Letter Filter Rail on the Right -->
      <aside class="catalog-letter-rail-aside">
        <LetterFilterRail
          :active-letter="selectedLetter"
          @select-letter="onSelectLetter"
        />
      </aside>
    </div>

    <!-- Other routes (Programacion, Mi Lista, etc.) -->
    <div v-else id="browse-grid" :class="gridClass">
      <div v-if="browseLoading && (!displayItems || !displayItems.length)" class="loading">
        Consultando anime...
      </div>
      <div v-else-if="!displayItems || !displayItems.length" class="empty">
        {{ emptyMessage }}
      </div>
      <template v-else-if="currentRoute === 'programacion'">
        <button
          v-for="item in displayItems"
          :key="item.id"
          class="schedule-item"
          type="button"
          :data-details="item.id"
          @click="openDetail(item)"
        >
          <span class="schedule-time">{{ formatTime(item.next?.at) }}</span>
          <span class="schedule-text">
            <b>{{ item.title }}</b>
            <small>{{ formatDate(item.next?.at) }} · Episodio {{ item.next?.episode || '?' }}</small>
          </span>
        </button>
      </template>
      <template v-else>
        <AnimeCard
          v-for="anime in displayItems"
          :key="anime.id"
          :anime="anime"
        />
      </template>
    </div>

    <!-- Pagination for non-virtual routes -->
    <div v-if="currentRoute !== 'catalogo'" class="pagination">
      <button
        v-if="browseHasNext && currentRoute !== 'milista' && currentRoute !== 'programacion'"
        id="browse-next"
        class="cta outline"
        type="button"
        @click="loadMore"
      >
        Cargar más ↓
      </button>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, watch } from 'vue';
import BrowseControls from './BrowseControls.vue';
import LetterFilterRail from './LetterFilterRail.vue';
import VirtualCatalogGrid from './VirtualCatalogGrid.vue';
import AnimeCard from '../rails/AnimeCard.vue';
import { useCatalog } from '../../composables/useCatalog.js';
import { useFavorites } from '../../composables/useFavorites.js';

const {
  currentRoute,
  browseResults,
  browseLoading,
  browseHasNext,
  browsePage,
  browseQuery,
  browseFilters,
  genres,
  homeRails,
  browse,
  openDetail,
  fullCatalog,
  fullCatalogLoading,
  loadFullCatalog,
  selectedLetter,
  setSelectedLetter,
  searchTags,
  catalogSearchQuery,
  filteredFullCatalog
} = useCatalog();

const { favoritesList } = useFavorites();

function formatTime(timestamp) {
  if (!timestamp) return '--:--';
  const d = new Date(timestamp * 1000);
  return new Intl.DateTimeFormat('es-US', { hour: 'numeric', minute: '2-digit' }).format(d);
}

function formatDate(timestamp) {
  if (!timestamp) return '';
  const d = new Date(timestamp * 1000);
  return new Intl.DateTimeFormat('es-US', { month: 'short', day: 'numeric', weekday: 'short' }).format(d);
}

function onSelectLetter(letter) {
  setSelectedLetter(letter);
  window.scrollTo({ top: 320, behavior: 'smooth' });
}

onMounted(() => {
  if (currentRoute.value === 'catalogo') {
    loadFullCatalog();
  }
});

watch(currentRoute, (newRoute) => {
  if (newRoute === 'catalogo') {
    loadFullCatalog();
  }
});

const meta = computed(() => {
  const genreName = genres.find(x => x[0] === browseFilters.genre)?.[1] || browseFilters.genre || 'Género';
  const map = {
    temporada: {
      title: 'EN <em>EMISIÓN.</em>',
      summary: 'Las series que están en emisión.',
      eyebrow: 'TEMPORADA / EN EMISIÓN'
    },
    peliculas: {
      title: 'PELÍCULAS <em>ANIME.</em>',
      summary: 'El cine anime que no te quieres perder.',
      eyebrow: 'CINE / PELÍCULAS'
    },
    populares: {
      title: 'TOP <em>ANIME.</em>',
      summary: 'Ranking por popularidad.',
      eyebrow: 'RANKING / POPULARES'
    },
    recientes: {
      title: 'ANIME <em>RECIENTE.</em>',
      summary: 'Series y nuevas incorporaciones.',
      eyebrow: 'CATÁLOGO / RECIENTES'
    },
    catalogo: {
      title: 'CATÁLOGO <em>COMPLETO.</em>',
      summary: 'Explora todo el universo anime con scroll virtual, búsqueda encapsulada e índice A-Z.',
      eyebrow: 'EXPLORA / TODOS LOS ANIMES'
    },
    genero: {
      title: `ANIME DE <em>${genreName}</em>`,
      summary: 'Historias por género.',
      eyebrow: 'GÉNEROS / FILTRO'
    },
    buscar: {
      title: 'RESULTADOS DE <em>BÚSQUEDA.</em>',
      summary: `Búsqueda para «${browseQuery.value}».`,
      eyebrow: 'BÚSQUEDA / ANIME'
    },
    milista: {
      title: 'MI <em>LISTA.</em>',
      summary: 'Tus favoritos y el progreso guardado en este dispositivo.',
      eyebrow: 'MI ESPACIO / FAVORITOS'
    },
    programacion: {
      title: 'PRÓXIMAS <em>EMISIONES.</em>',
      summary: 'Calendario de próximas emisiones según AniList y tu hora local.',
      eyebrow: 'HOY / PROGRAMACIÓN'
    }
  };
  return map[currentRoute.value] || map.catalogo;
});

const gridClass = computed(() => {
  return currentRoute.value === 'programacion' ? 'schedule-rail' : 'poster-grid';
});

const displayItems = computed(() => {
  if (currentRoute.value === 'milista') {
    return favoritesList.value;
  }
  if (currentRoute.value === 'programacion') {
    const list = homeRails.season || [];
    const now = Date.now() / 1000;
    return list.filter(x => x.next?.at && x.next.at > now).sort((a, b) => a.next.at - b.next.at);
  }
  if (currentRoute.value === 'catalogo') {
    return filteredFullCatalog.value;
  }
  return browseResults.value;
});

const statusMessage = computed(() => {
  if (currentRoute.value === 'milista') {
    return `${favoritesList.value.length} títulos guardados`;
  }
  if (currentRoute.value === 'programacion') {
    return displayItems.value.length ? 'Programación de anime en emisión' : 'Sin datos disponibles en este momento';
  }
  if (currentRoute.value === 'catalogo') {
    if (fullCatalogLoading.value && !fullCatalog.value.length) {
      return 'Cargando catálogo completo de animes...';
    }
    const total = fullCatalog.value.length;
    const current = displayItems.value.length;
    const letter = selectedLetter.value && selectedLetter.value !== 'ALL' && selectedLetter.value !== 'TODOS'
      ? ` · Letra: ${selectedLetter.value}`
      : '';
    const tags = searchTags.value.length ? ` · ${searchTags.value.length} filtros encapsulados` : '';
    const live = catalogSearchQuery.value.trim() ? ` · Buscando «${catalogSearchQuery.value.trim()}»` : '';

    if (current === total) {
      return `${total.toLocaleString()} animes en catálogo completo (Scroll virtual 60fps)${letter}${tags}${live}`;
    }
    return `${current.toLocaleString()} de ${total.toLocaleString()} animes encontrados${letter}${tags}${live}`;
  }
  if (browseLoading.value) return 'Buscando en el catálogo...';
  return displayItems.value.length ? `${displayItems.value.length} títulos encontrados` : '';
});

const emptyMessage = computed(() => {
  if (currentRoute.value === 'milista') {
    return 'Aún no tienes anime guardado en tu lista.';
  }
  return 'No encontramos títulos con esos filtros. Prueba encapsular otros términos o cambiar la letra.';
});

function loadMore() {
  browse(currentRoute.value, browsePage.value + 1, true);
}
</script>
