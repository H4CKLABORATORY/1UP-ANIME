<template>
  <nav class="mobile-navigation" aria-label="Navegación inferior móvil">
    <button
      v-for="item in mobileItems"
      :key="item.route"
      :data-route="item.route"
      :class="{ active: currentRoute === item.route }"
      type="button"
      @click="setRoute(item.route)"
    >
      <b aria-hidden="true">{{ item.icon }}</b>
      {{ item.label }}
    </button>
    <a href="./pages/comunidad.html">
      <b aria-hidden="true">✦</b>
      Plaza
    </a>
  </nav>
</template>

<script setup>
import { useCatalog } from '../../composables/useCatalog.js';

const { currentRoute, setRoute } = useCatalog();

const mobileItems = [
  { route: 'inicio', label: 'Inicio', icon: '⌂' },
  { route: 'temporada', label: 'Temporada', icon: '◉' },
  { route: 'catalogo', label: 'Catálogo', icon: '▦' },
  { route: 'programacion', label: 'Emisión', icon: '◷' },
  { route: 'milista', label: 'Mi lista', icon: '♡' }
];
</script>
