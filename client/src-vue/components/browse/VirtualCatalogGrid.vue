<template>
  <div
    ref="containerRef"
    id="browse-grid"
    class="virtual-catalog-container"
    role="region"
    aria-label="Catálogo interactivo con desplazamiento virtual"
  >
    <!-- Empty state -->
    <div v-if="!items || !items.length" class="empty">
      No encontramos títulos con esos filtros.
    </div>

    <!-- Small dataset fallback (under 20 items: render directly without virtualization) -->
    <div
      v-else-if="items.length <= 20"
      class="poster-grid direct-grid"
    >
      <AnimeCard
        v-for="anime in items"
        :key="anime.id"
        :anime="anime"
      />
    </div>

    <!-- Full Virtual Scroll Grid with GPU translate3d -->
    <div
      v-else
      class="virtual-scroll-body"
      :style="{ height: totalHeight + 'px', position: 'relative', width: '100%' }"
    >
      <!-- Rendered Visible Rows -->
      <div
        class="virtual-rendered-rows"
        :style="{ transform: `translate3d(0, ${offsetY}px, 0)` }"
      >
        <div
          v-for="(row, rowIdx) in visibleRows"
          :key="startRow + rowIdx"
          class="virtual-row"
          :style="{
            gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
            gap: gapSize + 'px',
            minHeight: cardHeight + 'px'
          }"
        >
          <AnimeCard
            v-for="anime in row"
            :key="anime.id"
            :anime="anime"
          />
        </div>
      </div>
    </div>

    <!-- Floating Scroll-to-Top Button -->
    <transition name="fade">
      <button
        v-if="showScrollTop"
        type="button"
        class="virtual-scroll-top-btn"
        aria-label="Volver arriba en el catálogo"
        title="Volver arriba"
        @click="scrollToTop"
      >
        ↑
      </button>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import AnimeCard from '../rails/AnimeCard.vue';

const props = defineProps({
  items: {
    type: Array,
    default: () => []
  },
  overscan: {
    type: Number,
    default: 2
  }
});

const containerRef = ref(null);
const containerWidth = ref(1200);
const scrollTopOffset = ref(0);
const viewportHeight = ref(800);
const showScrollTop = ref(false);

let ticking = false;
let resizeObserver = null;

// Dynamic responsive column count matching container width
const columnCount = computed(() => {
  const w = containerWidth.value;
  if (w >= 1150) return 5;
  if (w >= 880) return 4;
  if (w >= 560) return 3;
  return 2;
});

const gapSize = computed(() => (columnCount.value >= 3 ? 16 : 12));

const cardWidth = computed(() => {
  const w = containerWidth.value;
  const cols = columnCount.value;
  const gap = gapSize.value;
  return Math.max(120, (w - (cols - 1) * gap) / cols);
});

const posterHeight = computed(() => Math.round(cardWidth.value * 1.5));
const infoHeight = computed(() => (columnCount.value >= 3 ? 84 : 74));
const cardHeight = computed(() => posterHeight.value + infoHeight.value);
const rowPitch = computed(() => cardHeight.value + gapSize.value);

// Chunk items into rows
const rows = computed(() => {
  const list = props.items || [];
  const cols = columnCount.value;
  const result = [];
  for (let i = 0; i < list.length; i += cols) {
    result.push(list.slice(i, i + cols));
  }
  return result;
});

const totalRows = computed(() => rows.value.length);
const totalHeight = computed(() => totalRows.value * rowPitch.value);

const startRow = computed(() => {
  const pitch = rowPitch.value;
  const rawStart = Math.floor(scrollTopOffset.value / pitch) - props.overscan;
  return Math.max(0, rawStart);
});

const endRow = computed(() => {
  const pitch = rowPitch.value;
  const rawEnd = Math.ceil((scrollTopOffset.value + viewportHeight.value) / pitch) + props.overscan;
  return Math.min(totalRows.value, rawEnd);
});

const offsetY = computed(() => startRow.value * rowPitch.value);

const visibleRows = computed(() => {
  return rows.value.slice(startRow.value, endRow.value);
});

function updateScrollMetrics() {
  if (!containerRef.value) return;
  const pageScroll = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
  const rect = containerRef.value.getBoundingClientRect();
  const gridDocTop = rect.top + pageScroll;
  const distance = Math.max(0, pageScroll - gridDocTop);
  scrollTopOffset.value = distance;
  viewportHeight.value = window.innerHeight || 800;
  showScrollTop.value = pageScroll > 600;
  ticking = false;
}

function onScroll() {
  if (!ticking) {
    ticking = true;
    requestAnimationFrame(updateScrollMetrics);
  }
}

function updateWidth() {
  if (containerRef.value) {
    containerWidth.value = containerRef.value.clientWidth || window.innerWidth;
  } else {
    containerWidth.value = window.innerWidth;
  }
  updateScrollMetrics();
}

function scrollToTop() {
  if (containerRef.value) {
    const rect = containerRef.value.getBoundingClientRect();
    const targetY = window.scrollY + rect.top - 80;
    window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// Watch item changes to reset scroll when filters or search change
watch(() => props.items, () => {
  updateScrollMetrics();
}, { deep: false });

onMounted(() => {
  updateWidth();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', updateWidth, { passive: true });

  if (typeof ResizeObserver !== 'undefined' && containerRef.value) {
    resizeObserver = new ResizeObserver(() => {
      updateWidth();
    });
    resizeObserver.observe(containerRef.value);
  }

  // Initial calculation
  setTimeout(updateScrollMetrics, 50);
});

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll);
  window.removeEventListener('resize', updateWidth);
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
});
</script>
