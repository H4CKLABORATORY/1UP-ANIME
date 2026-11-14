<template>
  <section id="oneup-comments-section" class="oneup-comment-panel" aria-label="Comentarios por episodio">
    <div class="oneup-detail-section">
      <h3>CONVERSACIÓN DEL EPISODIO</h3>
      <p>Comenta tus impresiones y teorías con la comunidad de 1UP Anime.</p>

      <div class="comments-list">
        <div v-if="comments.length === 0" class="comments-empty">
          Sé el primero en compartir tu teoría de este anime.
        </div>
        <div v-for="(c, idx) in comments" :key="idx" class="comment-item">
          <strong class="comment-author">{{ c.author || 'Invitado' }}</strong>
          <span class="comment-date">{{ c.date || 'Hoy' }}</span>
          <p class="comment-text">{{ c.text }}</p>
        </div>
      </div>

      <form class="comment-form" @submit.prevent="submitComment">
        <input
          v-model="newComment"
          type="text"
          maxlength="280"
          placeholder="Escribe un comentario respetuoso sobre el episodio..."
          aria-label="Comentario"
        >
        <button type="submit" class="cta outline">Publicar</button>
      </form>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue';
import { useAuth } from '../../composables/useAuth.js';
import { useToast } from '../../composables/useToast.js';

const props = defineProps({
  animeId: {
    type: String,
    required: true
  }
});

const { currentUser } = useAuth();
const { showToast } = useToast();

const newComment = ref('');
const comments = ref([
  {
    author: '1UP Mod',
    date: 'Destacado',
    text: '¡Bienvenidos a la conversación! Por favor mantén el respeto y evita spoilers sin avisar.'
  }
]);

function submitComment() {
  const text = newComment.value.trim();
  if (!text) return;

  comments.value.push({
    author: currentUser.value?.name || 'Invitado',
    date: 'Ahora',
    text
  });
  newComment.value = '';
  showToast('Comentario publicado');
}
</script>
