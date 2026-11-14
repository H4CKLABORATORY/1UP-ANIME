<template>
  <section class="wrap section">
    <div class="section-heading">
      <div>
        <div class="micro">{{ micro }}</div>
        <h2 v-html="titleHtml"></h2>
      </div>
      <button
        v-if="moreRoute"
        class="section-more"
        type="button"
        @click="setRoute(moreRoute)"
      >
        {{ moreLabel }} ↗
      </button>
    </div>
    <div :id="railId" class="card-rail">
      <div v-if="loading && (!items || !items.length)" class="loading">
        {{ loadingText || 'Cargando contenido...' }}
      </div>
      <template v-else>
        <AnimeCard
          v-for="item in items"
          :key="item.id"
          :anime="item"
        />
      </template>
    </div>
  </section>
</template>

<script setup>
import AnimeCard from './AnimeCard.vue';
import { useCatalog } from '../../composables/useCatalog.js';

defineProps({
  railId: {
    type: String,
    required: true
  },
  micro: {
    type: String,
    required: true
  },
  titleHtml: {
    type: String,
    required: true
  },
  moreRoute: {
    type: String,
    default: ''
  },
  moreLabel: {
    type: String,
    default: 'Ver más'
  },
  items: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  loadingText: {
    type: String,
    default: ''
  }
});

const { setRoute } = useCatalog();
</script>
