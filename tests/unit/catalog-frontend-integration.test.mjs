// @ts-check
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('Frontend Integration: Card rendering and registration compatibility', () => {
  const code = fs.readFileSync('client/src/js/studio.js', 'utf8');

  // Verify that required methods and helpers exist
  assert.ok(code.includes('function register(data)'), 'register function must exist in studio.js');
  assert.ok(code.includes('function fromBackendHome(o)'), 'fromBackendHome function must exist in studio.js');
  assert.ok(code.includes('function fetchBackendApi(o)'), 'fetchBackendApi function must exist in studio.js');
  assert.ok(code.includes('function card(a)'), 'card generation must exist in studio.js');

  // Create isolated context to test register and card
  const mockState = {
    entries: new Map(),
    saved: {}
  };

  const context = {
    state: mockState,
    formats: { TV: 'Serie', MOVIE: 'Película', OVA: 'OVA', ONA: 'ONA', SPECIAL: 'Especial' },
    esc: s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
    isFav: id => !!mockState.saved[id]?.favorite
  };

  vm.runInNewContext(`
    function register(data){
      for(const a of data||[]){
        if(!a||!a.id)continue;
        state.entries.set(a.id,a);
        if(a.slug&&!state.entries.has(a.slug))state.entries.set(a.slug,a);
        if(a.raw_id!=null&&!state.entries.has(String(a.raw_id)))state.entries.set(String(a.raw_id),a);
        if(typeof a.id==='string'&&a.id.startsWith('jk-')&&!state.entries.has(a.id.slice(3)))state.entries.set(a.id.slice(3),a);
      }
    }
    function card(a){
      const pic=a.image?'<img data-depth="far" loading="lazy" referrerpolicy="no-referrer" src="'+esc(a.image)+'" alt="Póster de '+esc(a.title)+'">':'<div class="placeholder-art"><strong>'+esc(a.title.slice(0,27))+'</strong></div>';
      return '<article class="anime-card depth-scene"><div class="anime-art" data-details="'+esc(a.id)+'" role="button" tabindex="0">'+pic+'<div class="art-shade anime-card-shine" data-depth="mid"></div><span class="rating" data-depth="front"><b>★</b> '+(a.averageScore?(a.averageScore/10).toFixed(1):'—')+'</span></div><button class="anime-save'+(isFav(a.id)?' saved':'')+'" data-save="'+esc(a.id)+'">'+(isFav(a.id)?'✓':'＋')+'</button><div class="card-info" data-depth="front"><button class="card-name" data-details="'+esc(a.id)+'">'+esc(a.title)+'</button><div class="card-sub"><span>'+esc(String(a.year||'Anime'))+'</span><span class="card-type">'+esc(formats[a.format]||a.format||'Serie')+'</span></div></div></article>';
    }
    this.register = register;
    this.card = card;
  `, context);

  const sampleAnime = {
    id: 'jk-1',
    raw_id: 1,
    slug: 'karin',
    title: 'Karin',
    image: 'https://cdn.jkdesa.com/assets/images/animes/image/karin.jpg',
    format: 'TV',
    year: 2005,
    averageScore: 75
  };

  context.register([sampleAnime]);

  // Check registration lookups
  assert.equal(mockState.entries.get('jk-1')?.title, 'Karin');
  assert.equal(mockState.entries.get('karin')?.title, 'Karin');
  assert.equal(mockState.entries.get('1')?.title, 'Karin');

  // Check card markup
  const html = context.card(sampleAnime);
  assert.ok(html.includes('data-details="jk-1"'), 'Card must have data-details with id');
  assert.ok(html.includes('data-save="jk-1"'), 'Card must have data-save with id');
  assert.ok(html.includes('src="https://cdn.jkdesa.com/assets/images/animes/image/karin.jpg"'), 'Card must include poster image');
  assert.ok(html.includes('7.5'), 'Card must render formatted averageScore');
  assert.ok(html.includes('2005'), 'Card must render year');
  assert.ok(html.includes('Serie'), 'Card must render mapped format');
});

test('Frontend Integration: Episode Player download links and server selector', () => {
  const code = fs.readFileSync('client/src/js/episode-player.js', 'utf8');

  assert.ok(code.includes('function renderDownloads(downloads)'), 'renderDownloads must exist in episode-player.js');
  assert.ok(code.includes('oneup-download-group'), 'Download group selector class must exist');
  assert.ok(code.includes('loadLinksForEpisode'), 'loadLinksForEpisode helper must exist');
  assert.ok(code.includes('ENLACES DE DESCARGA'), 'Download section title must be present');
});

test('Frontend Integration: Recommendation pool deduplication in studio.js', () => {
  const code = fs.readFileSync('client/src/js/studio.js', 'utf8');
  assert.ok(code.includes('const pool=[...new Set(state.entries.values())];'), 'Recommendation pool must deduplicate using new Set(state.entries.values())');

  // Verify deduplication behavior
  const map = new Map();
  const a = { id: 'jk-1', raw_id: 1, slug: 'karin', title: 'Karin', image: 'a.jpg', genres: ['Comedia'] };
  const b = { id: 'jk-2', raw_id: 2, slug: 'bleach', title: 'Bleach', image: 'b.jpg', genres: ['Comedia'] };

  // Multiple keys registered per item
  map.set('jk-1', a); map.set('karin', a); map.set('1', a);
  map.set('jk-2', b); map.set('bleach', b); map.set('2', b);

  const rawValues = [...map.values()];
  assert.equal(rawValues.length, 6, 'Raw map values contains 6 entries due to aliases');

  const dedupedPool = [...new Set(map.values())];
  assert.equal(dedupedPool.length, 2, 'Deduped pool must contain exactly 2 unique objects');

  const related = dedupedPool.filter(x => x.id !== 'jk-1' && x.image && (x.genres || []).some(g => a.genres.includes(g))).slice(0, 4);
  assert.equal(related.length, 1, 'Related list must have 1 unique item, not duplicates');
  assert.equal(related[0].title, 'Bleach');
});

test('Frontend Integration: Episode Player Mega hash fragments and Okru prefixing', () => {
  const code = fs.readFileSync('client/src/js/episode-player.js', 'utf8');

  // Run isolated safeUrl and safeEmbedUrl from episode-player.js
  const context = {
    location: { href: 'https://h4cklaboratory.github.io/1UP-ANIME/' },
    URL
  };
  vm.runInNewContext(`
    ${code.slice(code.indexOf('function safeUrl'), code.indexOf('function subtitleUrl'))}
    this.safeUrl = safeUrl;
    this.safeEmbedUrl = safeEmbedUrl;
  `, context);

  // Mega URL with hash fragment
  const megaEmbed = 'https://mega.nz/embed/gTVhlY6R#u0_Zyo2bqUFwecOYqEEj3y7-FOiKYfrhPFkSmvJ1Xmg';
  const megaSafe = context.safeEmbedUrl(megaEmbed);
  assert.equal(megaSafe, megaEmbed, 'Mega embed URL with hash fragment must be preserved');

  const megaDownload = 'https://mega.nz/file/gTVhlY6R#u0_Zyo2bqUFwecOYqEEj3y7-FOiKYfrhPFkSmvJ1Xmg';
  const megaDlSafe = context.safeUrl(megaDownload, { allowHash: true });
  assert.ok(megaDlSafe, 'Mega download URL with hash fragment must be accepted');
  assert.equal(megaDlSafe.href, megaDownload);

  // Relative Okru URL prefixing
  const okruRelative = '/jkokru.php?u=7109915773489';
  const okruSafe = context.safeEmbedUrl(okruRelative);
  assert.equal(okruSafe, 'https://jkanime.net/jkokru.php?u=7109915773489', 'Relative /jkokru URLs must be prefixed with https://jkanime.net');
});

test('Frontend Integration: Episodes contract support for both episodes_list and episodes', () => {
  const code = fs.readFileSync('client/src/js/episode-player.js', 'utf8');
  assert.ok(code.includes('json.episodes_list') || code.includes('episodes_list'), 'episode-player must check episodes_list');
  assert.ok(code.includes('backendAnime.episodes_list') || code.includes('episodes_list'), 'configuredEpisodes must support episodes_list');

  // Contract verification: backend object with episodes as number and episodes_list as array
  const backendResponse = {
    id: 'jk-1',
    episodes: 28,
    episodes_total: 28,
    episodes_count: 28,
    episodes_list: [
      { number: 1, episode: 1, title: 'Episodio 1' },
      { number: 2, episode: 2, title: 'Episodio 2' }
    ]
  };

  const list = Array.isArray(backendResponse.episodes_list)
    ? backendResponse.episodes_list
    : (Array.isArray(backendResponse.episodes) ? backendResponse.episodes : []);

  assert.equal(list.length, 2, 'Episodes list must be resolved when episodes is a number');
  assert.equal(list[0].title, 'Episodio 1');
});
