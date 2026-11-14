<template>
  <header class="header">
    <div class="header-inner wrap">
      <a href="#inicio" class="brand" data-route="inicio" aria-label="1UP Anime, inicio" @click.prevent="navigate('inicio')">
        <img :src="'./assets/oneup-header-letters.png'" class="oneup-textmark" alt="1UP ANIME" width="164" height="55">
      </a>
      <nav class="desktop-links" aria-label="Navegación">
        <button
          v-for="item in navItems"
          :key="item.route"
          :data-route="item.route"
          :class="{ active: currentRoute === item.route }"
          type="button"
          @click="navigate(item.route)"
        >
          {{ item.label }}
        </button>
        <a class="oneup-link-community" href="./pages/comunidad.html">✦ Comunidad</a>
      </nav>
      <div class="header-right">
        <button
          id="header-search"
          class="icon-button"
          type="button"
          title="Buscar"
          aria-label="Buscar anime"
          @click="$emit('toggle-search')"
        >
          <svg><use href="#ico-search" /></svg>
        </button>
        <button
          id="auth-open"
          class="account-button"
          type="button"
          aria-label="Cuenta de usuario"
          @click="openAuthDialog"
        >
          <span class="account-dot">●</span>
          <span id="auth-label">{{ currentUser.name }}</span>
        </button>
      </div>
    </div>
  </header>
</template>

<script setup>
import { useAuth } from '../../composables/useAuth.js';
import { useCatalog } from '../../composables/useCatalog.js';

const emit = defineEmits(['toggle-search']);
const { currentUser, openAuthDialog } = useAuth();
const { currentRoute, setRoute } = useCatalog();

const navItems = [
  { route: 'inicio', label: 'Inicio' },
  { route: 'temporada', label: 'En emisión' },
  { route: 'programacion', label: 'Programación' },
  { route: 'catalogo', label: 'Catálogo' },
  { route: 'peliculas', label: 'Películas' },
  { route: 'milista', label: 'Mi lista' }
];

function navigate(route) {
  setRoute(route);
}
</script>
