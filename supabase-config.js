/* Public Supabase config for 1UP Anime native accounts + community.
 * 1. Create a project at https://supabase.com/dashboard
 * 2. Enable Authentication > Providers > Email ONLY (no Google, no Anonymous).
 * 3. Run the SQL files in supabase/sql/ (auth, community, storage).
 * 4. In Project Settings > API, copy the Project URL and the PUBLISHABLE key
 *    (starts with sb_publishable_) and paste them below (replace null).
 *    These values are PUBLIC, not secrets — but NEVER paste a service_role,
 *    sb_secret_ or database password here.
 * 5. In Authentication > URL Configuration, add the Site URL
 *    https://h4cklaboratory.github.io/1UP-ANIME/ and the same URL under
 *    Redirect URLs (password recovery returns to the site).
 * See docs/SUPABASE_SETUP.md for the exact steps.
 */
window.ONEUP_SUPABASE_CONFIG = null;
