<template>
  <section class="wrap season-banner">
    <div class="season-banner-bg"></div>
    <div class="season-copy">
      <span class="micro">ACTUALIZADO ESTA TEMPORADA</span>
      <h2>LOS PRÓXIMOS<br><em>GRANDES ESTRENOS.</em></h2>
      <p>Series en emisión, descubrimientos nuevos y próximas transmisiones en un solo lugar.</p>
      <button class="cta primary" type="button" @click="setRoute('temporada')">
        Descubrir temporada <svg><use href="#ico-arrow" /></svg>
      </button>
    </div>
    <div class="season-glyph">1<span>UP</span></div>
  </section>
</template>

<script setup>
import { useCatalog } from '../../composables/useCatalog.js';

const { setRoute } = useCatalog();
</script>
