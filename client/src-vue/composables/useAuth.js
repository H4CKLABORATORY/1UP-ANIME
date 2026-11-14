import { ref } from 'vue';

const currentUser = ref({
  kind: 'guest',
  key: 'guest',
  name: 'Invitado'
});

const isAuthDialogOpen = ref(false);
const savedProfiles = ref([]);

function loadProfiles() {
  try {
    const list = JSON.parse(localStorage.getItem('1up_anime_profiles') || '[]');
    savedProfiles.value = Array.isArray(list) ? list : [];
  } catch {
    savedProfiles.value = [];
  }
}

export function useAuth() {
  loadProfiles();

  function openAuthDialog() {
    isAuthDialogOpen.value = true;
  }

  function closeAuthDialog() {
    isAuthDialogOpen.value = false;
  }

  function loginAsGuest() {
    currentUser.value = {
      kind: 'guest',
      key: 'guest',
      name: 'Invitado'
    };
    closeAuthDialog();
  }

  function selectProfile(profileKey) {
    const found = savedProfiles.value.find(p => p.key === profileKey);
    if (found) {
      currentUser.value = found;
      closeAuthDialog();
    }
  }

  function identityKey() {
    const p = currentUser.value;
    return p.kind === 'local'
      ? '1up_anime_profile_' + p.key.replace(/^local_/, '')
      : 'oneup_anime_saved_' + p.key;
  }

  return {
    currentUser,
    isAuthDialogOpen,
    savedProfiles,
    openAuthDialog,
    closeAuthDialog,
    loginAsGuest,
    selectProfile,
    identityKey
  };
}
