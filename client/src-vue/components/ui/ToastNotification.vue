<template>
  <div
    id="toast"
    class="toast"
    :class="{ show: isVisible }"
    role="status"
    aria-live="polite"
  >
    {{ message }}
  </div>
</template>

<script setup>
import { useToast } from '../../composables/useToast.js';

const { message, isVisible } = useToast();
</script>
