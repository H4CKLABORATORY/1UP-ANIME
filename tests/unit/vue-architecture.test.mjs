import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../../');

test('Vue 3 architecture: All components exist and are non-empty', () => {
  const componentPaths = [
    'client/src-vue/App.vue',
    'client/src-vue/main.js',
    'client/src-vue/components/layout/OneUpHeader.vue',
    'client/src-vue/components/layout/MobileNav.vue',
    'client/src-vue/components/layout/OneUpFooter.vue',
    'client/src-vue/components/cinema/OneUpCinema.vue',
    'client/src-vue/components/hero/HeroBanner.vue',
    'client/src-vue/components/hero/HeroArtCard.vue',
    'client/src-vue/components/discovery/QuickAccessDeck.vue',
    'client/src-vue/components/discovery/MarqueeBanner.vue',
    'client/src-vue/components/discovery/ExploreBar.vue',
    'client/src-vue/components/discovery/SeasonBanner.vue',
    'client/src-vue/components/rails/AnimeCard.vue',
    'client/src-vue/components/rails/AnimeRail.vue',
    'client/src-vue/components/rails/ContinueRail.vue',
    'client/src-vue/components/rails/ScheduleRail.vue',
    'client/src-vue/components/browse/BrowseScreen.vue',
    'client/src-vue/components/browse/BrowseControls.vue',
    'client/src-vue/components/browse/VirtualCatalogGrid.vue',
    'client/src-vue/components/browse/LetterFilterRail.vue',
    'client/src-vue/components/community/CommunityBanner.vue',
    'client/src-vue/components/modals/AnimeDetailModal.vue',
    'client/src-vue/components/modals/EpisodePlayer.vue',
    'client/src-vue/components/modals/EpisodeComments.vue',
    'client/src-vue/components/modals/AuthModal.vue',
    'client/src-vue/components/ui/DepthToggle.vue',
    'client/src-vue/components/ui/ToastNotification.vue',
    'client/src-vue/components/ui/SvgSprites.vue'
  ];

  for (const rel of componentPaths) {
    const full = path.join(ROOT, rel);
    assert.ok(fs.existsSync(full), `Component file missing: ${rel}`);
    const content = fs.readFileSync(full, 'utf8');
    assert.ok(content.length > 50, `Component file too small: ${rel}`);
  }
});

test('Vue 3 composables exist and export expected functions', async () => {
  const composablePaths = [
    'client/src-vue/composables/useCatalog.js',
    'client/src-vue/composables/useSpanishSynopses.js',
    'client/src-vue/composables/useFavorites.js',
    'client/src-vue/composables/useAuth.js',
    'client/src-vue/composables/useAiring.js',
    'client/src-vue/composables/useAuthorizedMedia.js',
    'client/src-vue/composables/useDexterMotion.js',
    'client/src-vue/composables/useToast.js'
  ];

  for (const rel of composablePaths) {
    const full = path.join(ROOT, rel);
    assert.ok(fs.existsSync(full), `Composable file missing: ${rel}`);
    const mod = await import('file:///' + full.replace(/\\/g, '/'));
    const fnName = path.basename(rel, '.js');
    assert.equal(typeof mod[fnName], 'function', `${rel} must export function ${fnName}`);
  }
});

test('Vite config and production build exist', () => {
  const viteConfig = path.join(ROOT, 'vite.config.mjs');
  assert.ok(fs.existsSync(viteConfig), 'vite.config.mjs missing');
  const distHtml = path.join(ROOT, 'dist/index.html');
  assert.ok(fs.existsSync(distHtml), 'dist/index.html missing; run npm run build');
  const content = fs.readFileSync(distHtml, 'utf8');
  assert.ok(content.includes('id="app"'), 'dist/index.html must have #app container');
});
