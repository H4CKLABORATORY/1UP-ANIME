<template>
  <section
    v-if="continueWatchingList && continueWatchingList.length > 0"
    id="continue-section"
    class="wrap section"
  >
    <div class="section-heading">
      <div>
        <div class="micro">VUELVE A TU HISTORIA</div>
        <h2>Continuar <em>viendo.</em></h2>
      </div>
      <button class="section-more" type="button" @click="setRoute('milista')">
        Mi progreso ↗
      </button>
    </div>
    <div id="continue-rail" class="card-rail">
      <AnimeCard
        v-for="item in continueWatchingList"
        :key="item.id"
        :anime="item"
      />
    </div>
  </section>
</template>

<script setup>
import AnimeCard from './AnimeCard.vue';
import { useCatalog } from '../../composables/useCatalog.js';
import { useFavorites } from '../../composables/useFavorites.js';

const { setRoute } = useCatalog();
const { continueWatchingList } = useFavorites();
</script>
