<template>
  <section class="wrap section schedule-preview">
    <div class="section-heading">
      <div>
        <div class="micro">NUNCA PIERDAS UN ESTRENO</div>
        <h2>Próximamente <em>al aire.</em></h2>
      </div>
      <button class="section-more" type="button" @click="setRoute('programacion')">
        Programación ↗
      </button>
    </div>
    <div id="schedule-preview-list" class="schedule-rail">
      <div v-if="!items || !items.length" class="loading">
        Consultando próximas emisiones...
      </div>
      <template v-else>
        <button
          v-for="item in upcomingList"
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
    </div>
    <p class="small-note">
      Las horas son estimaciones de AniList y se muestran en tu zona horaria. No representan reproducción de episodios.
    </p>
  </section>
</template>

<script setup>
import { computed } from 'vue';
import { useCatalog } from '../../composables/useCatalog.js';

const props = defineProps({
  items: {
    type: Array,
    default: () => []
  }
});

const { setRoute, openDetail } = useCatalog();

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

const upcomingList = computed(() => {
  const now = Date.now() / 1000;
  return (props.items || [])
    .filter(x => x.next?.at && x.next.at > now)
    .sort((a, b) => a.next.at - b.next.at)
    .slice(0, 16);
});
</script>
