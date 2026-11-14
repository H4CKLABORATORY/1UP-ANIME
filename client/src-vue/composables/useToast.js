import { ref } from 'vue';

const message = ref('');
const isVisible = ref(false);
let timer = null;

export function useToast() {
  function showToast(text, duration = 2500) {
    message.value = text;
    isVisible.value = true;
    clearTimeout(timer);
    timer = setTimeout(() => {
      isVisible.value = false;
    }, duration);
  }

  return {
    message,
    isVisible,
    showToast
  };
}
