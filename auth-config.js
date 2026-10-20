/* Configure Firebase for real Google login:
 * 1. Create project at https://console.firebase.google.com/
 * 2. Enable Authentication > Google sign-in provider.
 * 3. Authorize domain h4cklaboratory.github.io.
 * 4. Fill the project's WEB app config below.
 * To synchronize favorites across devices, Firestore with secure rules is also needed.
 */
window.ONEUP_FIREBASE_CONFIG = null;

// Public values only. Activate after docs/ONEUP_AUTH.md staging checklist passes.
// { endpoint: 'https://PROJECT.supabase.co/functions/v1/oneup-auth', turnstileSiteKey: 'PUBLIC_SITE_KEY' }
window.ONEUP_AUTH_CONFIG = null;
