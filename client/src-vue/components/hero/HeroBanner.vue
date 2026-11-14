<template>
  <section class="hero" :class="{ 'has-long-title': isLongTitle }" aria-label="Anime destacado">
    <div
      id="hero-poster"
      class="hero-poster"
      :style="posterStyle"
    ></div>
    <div class="hero-darken"></div>
    <div class="hero-lines"></div>
    <div class="hero-floating hero-floating-a">✦</div>
    <div class="hero-floating hero-floating-b">✧</div>

    <div class="wrap hero-grid">
      <div class="hero-copy">
        <div class="eyebrow">
          <span class="signal"></span> 1UP ANIME / HISTORIAS DESTACADAS <span class="eyebrow-rule"></span> EXPLORA
        </div>
        <div class="limited-tag">✦ HALLOWEEN EDITION · OCTUBRE</div>

        <h1
          id="hero-title"
          :data-title-size="titleSize"
          v-html="formattedTitle"
        ></h1>

        <p id="hero-description" class="hero-description">
          {{ synopsisText }}
        </p>

        <div id="hero-badges" class="hero-badges">
          <span>{{ badgeFormat }}</span>
          <span>{{ badgeYear }}</span>
          <span>★ {{ badgeScore }}</span>
        </div>

        <div class="hero-actions">
          <button
            id="hero-detail"
            class="cta primary"
            type="button"
            @click="onOpenDetail"
          >
            <svg><use href="#ico-arrow" /></svg> Ver detalles
          </button>
          <button
            id="hero-save"
            class="cta outline"
            type="button"
            @click="onToggleSave"
          >
            <svg>
              <use :href="isSaved ? '#ico-check' : '#ico-plus'" />
            </svg>
            {{ isSaved ? 'Guardado' : 'Mi lista' }}
          </button>
          <a
            v-if="crunchyrollUrl"
            id="hero-crunchyroll"
            class="premiere-provider"
            :href="crunchyrollUrl"
            target="_blank"
            rel="noopener noreferrer"
          >
            Crunchyroll ↗
          </a>
        </div>

        <div id="hero-picks" class="hero-picks" aria-label="Elegir anime destacado">
          <span class="hero-picks-label">DESCUBRE OTROS ANIMES</span>
          <button
            v-for="pick in heroPicks"
            :key="pick.id"
            class="hero-pick"
            :class="{ active: pick.id === featured?.id }"
            type="button"
            :data-feature="pick.id"
            :aria-pressed="String(pick.id === featured?.id)"
            :title="pick.title"
            @click="selectHero(pick)"
          >
            {{ pick.title }}
          </button>
        </div>
      </div>

      <HeroArtCard :anime="featured" />
    </div>

    <div class="hero-bottom wrap">
      <span>01 / 1UP UNIVERSE</span>
      <span>DESLIZA PARA DESCUBRIR ↓</span>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue';
import HeroArtCard from './HeroArtCard.vue';
import { useCatalog } from '../../composables/useCatalog.js';
import { useSpanishSynopses } from '../../composables/useSpanishSynopses.js';
import { useFavorites } from '../../composables/useFavorites.js';

const { featured, homeRails, formats, setHero, openDetail } = useCatalog();
const { chosenSynopsis } = useSpanishSynopses();
const { isFav, toggleFav } = useFavorites();

const isSaved = computed(() => {
  return featured.value?.id ? isFav(featured.value.id) : false;
});

const isLongTitle = computed(() => {
  const len = featured.value?.title?.length || 0;
  return len > 38;
});

const titleSize = computed(() => {
  const len = featured.value?.title?.length || 0;
  return len > 67 ? 'extra-long' : len > 38 ? 'long' : 'normal';
});

const formattedTitle = computed(() => {
  if (!featured.value?.title) {
    return 'TU SIGUIENTE<br><span>VIDA ES ANIME.</span>';
  }
  const parts = featured.value.title.trim().split(/\s+/);
  const first = parts.length > 2 ? parts.slice(0, 2).join(' ') : parts.slice(0, 1).join(' ');
  const rest = parts.length > 2 ? parts.slice(2).join(' ') : parts.slice(1).join(' ');
  return first.toUpperCase() + (rest ? `<br><span>${rest.toUpperCase()}</span>` : '');
});

const synopsisText = computed(() => {
  if (!featured.value) {
    return 'Una nueva forma de explorar, descubrir y organizar tu anime favorito. Tu universo. Tu nivel.';
  }
  if (featured.value.source === 'sample') {
    return 'El catálogo se está recuperando. Consulta la ficha para ver los datos disponibles.';
  }
  return chosenSynopsis(featured.value).slice(0, 245);
});

const badgeFormat = computed(() => {
  if (!featured.value) return 'ESTRENOS';
  return formats[featured.value.format] || featured.value.format || 'Anime';
});

const badgeYear = computed(() => {
  return featured.value?.year ? String(featured.value.year) : 'CATÁLOGO';
});

const badgeScore = computed(() => {
  return featured.value?.averageScore ? (featured.value.averageScore / 10).toFixed(1) : '—';
});

const posterStyle = computed(() => {
  const art = featured.value?.banner || featured.value?.image;
  return art ? { backgroundImage: `url("${art}")` } : {};
});

const crunchyrollUrl = computed(() => {
  const links = featured.value?.streaming || [];
  const found = links.find(l => l.name?.toLowerCase().includes('crunchyroll') || l.url?.includes('crunchyroll.com'));
  return found?.url || null;
});

const heroPicks = computed(() => {
  const list = [
    featured.value,
    ...(homeRails.trending || []),
    ...(homeRails.season || [])
  ].filter(Boolean);
  const map = new Map();
  for (const item of list) {
    if (item.id && !map.has(item.id)) map.set(item.id, item);
  }
  return [...map.values()].slice(0, 4);
});

function selectHero(anime) {
  setHero(anime, true);
}

function onOpenDetail() {
  if (featured.value) {
    openDetail(featured.value);
  }
}

function onToggleSave() {
  if (featured.value) {
    toggleFav(featured.value);
  }
}
</script>
