<template>
  <div class="oneup-kokomi-shell">
    <SvgSprites />
    <div class="app-sheen" aria-hidden="true"></div>

    <!-- Opening Cinema Intro -->
    <OneUpCinema />

    <!-- Top Header -->
    <OneUpHeader @toggle-search="onToggleSearch" />

    <main>
      <!-- Home Screen -->
      <div v-show="currentRoute === 'inicio'" id="home-screen">
        <HeroBanner />
        <QuickAccessDeck />
        <MarqueeBanner />
        <ExploreBar ref="exploreBarRef" />
        <ContinueRail />

        <!-- Rail 1: Trending -->
        <AnimeRail
          rail-id="trending-rail"
          micro="SELECCIÓN 01 / DESCUBRE"
          title-html="En tendencia <em>ahora.</em>"
          more-route="populares"
          more-label="Ver ranking"
          :items="homeRails.trending"
          loading-text="Preparando tendencias..."
        />

        <!-- Season Banner -->
        <SeasonBanner />

        <!-- Rail 2: Season -->
        <AnimeRail
          rail-id="season-rail"
          micro="SELECCIÓN 02 / EN EMISIÓN"
          title-html="Esta <em>temporada.</em>"
          more-route="temporada"
          more-label="Ver todos"
          :items="homeRails.season"
          loading-text="Buscando estrenos..."
        />

        <!-- Schedule preview -->
        <ScheduleRail :items="homeRails.season" />

        <!-- Rail 3: Recent -->
        <AnimeRail
          rail-id="recent-rail"
          micro="SELECCIÓN 03 / DESCUBRE MÁS"
          title-html="Agregados <em>recientemente.</em>"
          more-route="recientes"
          more-label="Explorar recientes"
          :items="homeRails.recent"
          loading-text="Descubriendo series..."
        />

        <!-- Rail 4: Movies -->
        <AnimeRail
          rail-id="movies-rail"
          micro="SELECCIÓN 04 / CINE"
          title-html="Películas <em>imperdibles.</em>"
          more-route="peliculas"
          more-label="Ver películas"
          :items="homeRails.movies"
          loading-text="Cargando cine anime..."
        />

        <!-- Community Banner -->
        <CommunityBanner />
      </div>

      <!-- Browse / Catalog / Favorites / Search / Schedule View -->
      <BrowseScreen v-show="currentRoute !== 'inicio'" />
    </main>

    <!-- Footer -->
    <OneUpFooter />

    <!-- 3D Depth Toggle Float -->
    <DepthToggle />

    <!-- Bottom Mobile Nav -->
    <MobileNav />

    <!-- Detail Dialog -->
    <AnimeDetailModal
      :anime="activeDetailAnime"
      :is-open="isDetailOpen"
      @close="closeDetail"
      @select-anime="openDetail"
    />

    <!-- Auth Dialog -->
    <AuthModal />

    <!-- Toast Notification -->
    <ToastNotification />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import SvgSprites from './components/ui/SvgSprites.vue';
import OneUpCinema from './components/cinema/OneUpCinema.vue';
import OneUpHeader from './components/layout/OneUpHeader.vue';
import MobileNav from './components/layout/MobileNav.vue';
import OneUpFooter from './components/layout/OneUpFooter.vue';
import HeroBanner from './components/hero/HeroBanner.vue';
import QuickAccessDeck from './components/discovery/QuickAccessDeck.vue';
import MarqueeBanner from './components/discovery/MarqueeBanner.vue';
import ExploreBar from './components/discovery/ExploreBar.vue';
import SeasonBanner from './components/discovery/SeasonBanner.vue';
import AnimeRail from './components/rails/AnimeRail.vue';
import ContinueRail from './components/rails/ContinueRail.vue';
import ScheduleRail from './components/rails/ScheduleRail.vue';
import CommunityBanner from './components/community/CommunityBanner.vue';
import BrowseScreen from './components/browse/BrowseScreen.vue';
import AnimeDetailModal from './components/modals/AnimeDetailModal.vue';
import AuthModal from './components/modals/AuthModal.vue';
import DepthToggle from './components/ui/DepthToggle.vue';
import ToastNotification from './components/ui/ToastNotification.vue';

import { useCatalog } from './composables/useCatalog.js';
import { useSpanishSynopses } from './composables/useSpanishSynopses.js';
import { useAiring } from './composables/useAiring.js';
import { useAuthorizedMedia } from './composables/useAuthorizedMedia.js';
import { useDexterMotion } from './composables/useDexterMotion.js';

const {
  currentRoute,
  homeRails,
  activeDetailAnime,
  isDetailOpen,
  loadHome,
  setRoute,
  openDetail,
  closeDetail
} = useCatalog();

const { loadTranslations } = useSpanishSynopses();
const { loadAiring } = useAiring();
const { loadMediaManifest } = useAuthorizedMedia();
const { initMotion } = useDexterMotion();

const exploreBarRef = ref(null);

function onToggleSearch() {
  if (currentRoute.value !== 'inicio') {
    setRoute('inicio');
  }
  exploreBarRef.value?.focusSearch();
}

onMounted(async () => {
  // Sync initial route from hash
  const hash = window.location.hash.replace(/^#/, '');
  if (hash) {
    setRoute(hash);
  }

  window.addEventListener('hashchange', () => {
    const route = window.location.hash.replace(/^#/, '') || 'inicio';
    if (route !== currentRoute.value) {
      setRoute(route);
    }
  });

  // Load translations, home data, airing, media
  await Promise.all([
    loadTranslations(),
    loadHome(),
    loadAiring(),
    loadMediaManifest()
  ]);

  initMotion();
});
</script>
