<template>
  <dialog
    id="auth-dialog"
    ref="authDialogRef"
    class="auth-dialog"
    aria-labelledby="auth-title"
    aria-describedby="auth-description"
  >
    <button
      id="auth-close"
      class="dialog-close"
      type="button"
      aria-label="Cerrar ventana de acceso"
      @click="closeAuthDialog"
    >
      ✕
    </button>
    <div class="auth-panel">
      <div class="auth-brand">
        <img class="auth-crest" :src="'./assets/oneup-crest-mark.svg'" width="128" height="135" alt="">
        <span class="auth-wordmark">1UP <strong>ANIME</strong></span>
      </div>
      <div class="micro auth-kicker">TU UNIVERSO, A TU MANERA</div>
      <h2 id="auth-title" class="auth-title">BIENVENIDO A <em>1UP.</em></h2>
      <p id="auth-description" class="auth-copy">
        Descubre anime a tu ritmo. Entra como invitado o continúa con tu perfil guardado.
      </p>

      <div class="auth-actions">
        <button id="google-login" class="google-login" type="button" @click="handleGoogleLogin">
          <span class="google-g" aria-hidden="true">G</span>
          <span id="auth-google-label">Continuar con Google</span>
        </button>
        <button id="guest-login" class="guest-login" type="button" @click="loginAsGuest">
          Continuar como invitado
        </button>
      </div>

      <details v-if="savedProfiles.length > 0" id="auth-profiles" class="auth-profiles">
        <summary>Usar perfil guardado en este dispositivo</summary>
        <div class="auth-profile-controls">
          <select id="auth-profile-select" v-model="selectedProfileKey" aria-label="Perfil guardado">
            <option v-for="p in savedProfiles" :key="p.key" :value="p.key">
              {{ p.name }}
            </option>
          </select>
          <button id="auth-profile-enter" type="button" @click="confirmProfile">
            Entrar
          </button>
        </div>
      </details>

      <p id="auth-message" class="auth-message" role="status" aria-live="polite">
        {{ authMessage }}
      </p>
      <small id="auth-service-note" class="auth-help">
        Puedes explorar como invitado sin crear una cuenta.
      </small>
    </div>
  </dialog>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useAuth } from '../../composables/useAuth.js';
import { useToast } from '../../composables/useToast.js';

const {
  isAuthDialogOpen,
  savedProfiles,
  closeAuthDialog,
  loginAsGuest,
  selectProfile
} = useAuth();
const { showToast } = useToast();

const authDialogRef = ref(null);
const selectedProfileKey = ref(savedProfiles.value[0]?.key || '');
const authMessage = ref('');

watch(isAuthDialogOpen, (open) => {
  if (!authDialogRef.value) return;
  if (open) {
    window.OneUpMotion?.prepareOpen?.(authDialogRef.value);
    for (const a of authDialogRef.value.getAnimations?.() || []) {
      if (a.id === 'oneup-motion-close') a.cancel();
    }
    if (!authDialogRef.value.open) authDialogRef.value.showModal();
  } else {
    if (authDialogRef.value.open) {
      if (!window.OneUpMotion?.closeDialog?.(authDialogRef.value)) {
        authDialogRef.value.close();
      }
    }
  }
});

function handleGoogleLogin() {
  authMessage.value = 'Google Auth no está configurado en este entorno. Puedes continuar como invitado.';
  showToast('Modo invitado activo');
}

function confirmProfile() {
  if (selectedProfileKey.value) {
    selectProfile(selectedProfileKey.value);
  }
}
</script>
