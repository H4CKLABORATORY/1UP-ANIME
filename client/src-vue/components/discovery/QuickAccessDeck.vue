<template>
  <section id="oneup-finale-deck" class="oneup-finale-deck" aria-label="Accesos rápidos para descubrir anime">
    <div class="oneup-finale-intro">
      <span class="oneup-finale-overline">ENCUENTRA TU PRÓXIMA HISTORIA</span>
      <h2>Tu universo, a un toque.</h2>
      <p class="oneup-finale-source" data-finale-status role="status" aria-live="polite">
        {{ statusMessage }}
      </p>
    </div>
    <div class="oneup-finale-actions">
      <button
        type="button"
        class="oneup-finale-action"
        data-route="catalogo"
        @click="setRoute('catalogo')"
      >
        <span class="glyph" aria-hidden="true">▦</span>
        <strong>Todo el catálogo</strong>
      </button>
      <button
        type="button"
        class="oneup-finale-action"
        data-route="temporada"
        @click="setRoute('temporada')"
      >
        <span class="glyph" aria-hidden="true">✦</span>
        <strong>En emisión</strong>
      </button>
      <button
        type="button"
        class="oneup-finale-action"
        data-route="programacion"
        @click="setRoute('programacion')"
      >
        <span class="glyph" aria-hidden="true">◷</span>
        <strong>Calendario</strong>
      </button>
      <button
        type="button"
        class="oneup-finale-action"
        data-route="milista"
        @click="setRoute('milista')"
      >
        <span class="glyph" aria-hidden="true">♡</span>
        <strong>Mi lista</strong>
      </button>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue';
import { useCatalog } from '../../composables/useCatalog.js';

const { setRoute, homeRails } = useCatalog();

const statusMessage = computed(() => {
  const count = (homeRails.trending?.length || 0) + (homeRails.season?.length || 0);
  return count > 0
    ? `Catálogo actualizado: ${count} títulos destacados en rotación activa.`
    : 'Consultando la última selección del catálogo…';
});
</script>
