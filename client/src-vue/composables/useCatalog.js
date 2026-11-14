import { ref, reactive, computed } from 'vue';
import { useSpanishSynopses } from './useSpanishSynopses.js';

const API = 'https://graphql.anilist.co';
const JIKAN = 'https://api.jikan.moe/v4';

const formats = {
  TV: 'Serie',
  MOVIE: 'Película',
  OVA: 'OVA',
  ONA: 'ONA',
  SPECIAL: 'Especial',
  TV_SHORT: 'Corto'
};

const genres = [
  ['Action', 'Acción'],
  ['Adventure', 'Aventura'],
  ['Comedy', 'Comedia'],
  ['Drama', 'Drama'],
  ['Fantasy', 'Fantasía'],
  ['Romance', 'Romance'],
  ['Sci-Fi', 'Ciencia ficción'],
  ['Supernatural', 'Sobrenatural'],
  ['Mystery', 'Misterio'],
  ['Sports', 'Deportes'],
  ['Horror', 'Terror'],
  ['Slice of Life', 'Vida cotidiana']
];

function genreSpanish(label) {
  const pair = genres.find(g => g[0] === label);
  return pair ? pair[1] : ({
    Psychological: 'Psicológico',
    Thriller: 'Suspenso',
    Music: 'Música',
    Mecha: 'Robots',
    Supernatural: 'Sobrenatural',
    Ecchi: 'Ecchi',
    Horror: 'Terror',
    Sports: 'Deportes',
    Fantasy: 'Fantasía'
  }[label] || label);
}

function safeUrl(u) {
  try {
    const x = new URL(u);
    return x.protocol === 'https:' ? x.href : '';
  } catch {
    return '';
  }
}

const seedRecords = [
  [5114, 'Fullmetal Alchemist: Brotherhood', 'Action,Adventure,Drama,Fantasy', 91, 2009],
  [21, 'One Piece', 'Action,Adventure,Fantasy', 88, 1999],
  [16498, 'Attack on Titan', 'Action,Drama,Fantasy', 89, 2013],
  [38000, 'Demon Slayer: Kimetsu no Yaiba', 'Action,Fantasy', 84, 2019],
  [40748, 'Jujutsu Kaisen', 'Action,Fantasy,Supernatural', 85, 2020],
  [52991, 'Frieren: Beyond Journey’s End', 'Adventure,Drama,Fantasy', 92, 2023],
  [34572, 'Black Clover', 'Action,Adventure,Fantasy', 81, 2017],
  [20, 'Naruto', 'Action,Adventure', 80, 2002],
  [1535, 'Death Note', 'Mystery,Supernatural,Drama', 86, 2006],
  [52299, 'Solo Leveling', 'Action,Adventure,Fantasy', 82, 2024],
  [50265, 'SPY x FAMILY', 'Action,Comedy', 85, 2022],
  [9253, 'Steins;Gate', 'Drama,Sci-Fi,Mystery', 91, 2011],
  [30276, 'One Punch Man', 'Action,Comedy,Sci-Fi', 85, 2015],
  [31964, 'My Hero Academia', 'Action,Comedy', 78, 2016],
  [199, 'Spirited Away', 'Adventure,Fantasy', 86, 2001, 'MOVIE'],
  [32281, 'Your Name', 'Drama,Romance,Fantasy', 88, 2016, 'MOVIE'],
  [28851, 'A Silent Voice', 'Drama,Romance', 88, 2016, 'MOVIE'],
  [164, 'Princess Mononoke', 'Action,Adventure,Fantasy', 87, 1997, 'MOVIE'],
  [431, 'Howl’s Moving Castle', 'Adventure,Drama,Fantasy', 86, 2004, 'MOVIE'],
  [38826, 'Weathering With You', 'Drama,Fantasy,Romance', 82, 2019, 'MOVIE'],
  [50594, 'Suzume', 'Adventure,Fantasy', 78, 2022, 'MOVIE']
];

const samples = seedRecords.map(x => ({
  id: 'mal-' + x[0],
  mal_id: x[0],
  title: x[1],
  image: '',
  banner: '',
  description: 'Título de ejemplo del catálogo. Se actualizará al recuperar la conexión con las fuentes de datos.',
  averageScore: x[3],
  year: x[4],
  genres: x[2].split(','),
  format: x[5] || 'TV',
  episodes: 0,
  streaming: [],
  siteUrl: 'https://myanimelist.net/anime/' + x[0],
  next: null,
  source: 'sample'
}));

function normalizeAni(m) {
  const score = Number(m.averageScore) || 0;
  return {
    id: m.idMal ? 'mal-' + m.idMal : 'al-' + m.id,
    mal_id: m.idMal || null,
    title: m.title?.english || m.title?.romaji || 'Anime',
    title_romaji: m.title?.romaji || '',
    title_native: m.title?.native || '',
    aliases: window.OneUpAnimeSearch?.collectAliases?.(m.title, m.synonyms) || [],
    image: safeUrl(m.coverImage?.extraLarge || m.coverImage?.large),
    banner: safeUrl(m.bannerImage),
    description: String(m.description || '').replace(/<[^>]+>/g, '').replace(/\n/g, ' '),
    averageScore: score,
    year: m.seasonYear || m.startDate?.year || '',
    genres: m.genres || [],
    format: m.format || 'TV',
    episodes: m.episodes || 0,
    status: m.status || '',
    siteUrl: safeUrl(m.siteUrl),
    streaming: (m.externalLinks || []).filter(x => x.type === 'STREAMING' && safeUrl(x.url)).map(x => ({
      name: x.site,
      url: x.url
    })),
    next: m.nextAiringEpisode ? {
      at: m.nextAiringEpisode.airingAt,
      episode: m.nextAiringEpisode.episode
    } : null,
    source: 'anilist'
  };
}

function normalizeJikan(m) {
  return {
    id: 'mal-' + m.mal_id,
    mal_id: m.mal_id,
    title: m.title_english || m.title || 'Anime',
    title_romaji: m.title || '',
    title_native: m.title_japanese || '',
    aliases: window.OneUpAnimeSearch?.collectAliases?.({
      english: m.title_english,
      romaji: m.title,
      native: m.title_japanese
    }, [...(m.title_synonyms || []), ...(m.titles || []).map(x => x.title)]) || [],
    image: safeUrl(m.images?.webp?.large_image_url || m.images?.jpg?.large_image_url),
    banner: '',
    description: m.synopsis || '',
    averageScore: m.score ? Math.round(m.score * 10) : 0,
    year: m.year || m.aired?.prop?.from?.year || '',
    genres: (m.genres || []).map(x => x.name),
    format: m.type === 'Movie' ? 'MOVIE' : m.type === 'OVA' ? 'OVA' : m.type === 'ONA' ? 'ONA' : 'TV',
    episodes: m.episodes || 0,
    status: m.airing ? 'RELEASING' : 'FINISHED',
    siteUrl: safeUrl(m.url),
    streaming: (m.streaming || []).filter(x => safeUrl(x.url)).map(x => ({
      name: x.name,
      url: x.url
    })),
    next: null,
    source: 'jikan'
  };
}

const gql = `
query OneUp($page:Int,$perPage:Int,$sort:[MediaSort],$status:MediaStatus,$search:String,$genre:String,$format:MediaFormat){
Page(page:$page,perPage:$perPage){pageInfo{hasNextPage currentPage}
media(type:ANIME,isAdult:false,sort:$sort,status:$status,search:$search,genre:$genre,format:$format){
id idMal title{english romaji native} synonyms description(asHtml:false) coverImage{extraLarge large} bannerImage
averageScore episodes format status seasonYear startDate{year} genres siteUrl
nextAiringEpisode{episode airingAt} externalLinks{site url type}
}}}`;

let lastCall = 0;
let aniQueue = Promise.resolve();

async function ani(options) {
  const work = aniQueue.catch(() => {}).then(() => fetchAniSerial(options));
  aniQueue = work.catch(() => {});
  return work;
}

async function fetchAniSerial(options) {
  const gap = Math.max(0, 1500 - (Date.now() - lastCall));
  if (gap) await new Promise(r => setTimeout(r, gap));
  lastCall = Date.now();
  const c = new AbortController();
  const timer = setTimeout(() => c.abort(), 7000);
  try {
    const variables = {
      page: options.page || 1,
      perPage: options.perPage || 18,
      sort: [options.sort || 'POPULARITY_DESC']
    };
    for (const k of ['status', 'search', 'genre', 'format']) {
      if (options[k]) variables[k] = options[k];
    }
    const r = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query: gql, variables }),
      signal: c.signal
    });
    if (!r.ok) throw new Error('AniList ' + r.status);
    const j = await r.json();
    if (j.errors?.length) throw new Error(j.errors[0].message);
    return {
      items: (j.data?.Page?.media || []).map(normalizeAni),
      next: Boolean(j.data?.Page?.pageInfo?.hasNextPage),
      source: 'anilist'
    };
  } finally {
    clearTimeout(timer);
  }
}

async function jikan(options) {
  let path = '/top/anime?limit=20';
  if (options.search) path = '/anime?sfw=true&limit=20&q=' + encodeURIComponent(options.search);
  else if (options.status === 'RELEASING') path = '/seasons/now?sfw=true&limit=20';
  else if (options.format === 'MOVIE') path = '/top/anime?type=movie&limit=20';
  else if (options.genre) {
    const ids = { Action: 1, Adventure: 2, Comedy: 4, Drama: 8, Fantasy: 10, Romance: 22, 'Sci-Fi': 24, Supernatural: 37, Mystery: 7, Sports: 30, Horror: 14, 'Slice of Life': 36 };
    path = '/anime?sfw=true&limit=20&order_by=popularity&sort=asc&genres=' + (ids[options.genre] || 1);
  } else if (options.sort === 'START_DATE_DESC') path = '/anime?sfw=true&limit=20&order_by=start_date&sort=desc';

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6600);
  try {
    const r = await fetch(JIKAN + path + '&page=' + (options.page || 1), { signal: ctrl.signal });
    if (!r.ok) throw new Error('Jikan ' + r.status);
    const j = await r.json();
    return {
      items: (j.data || []).map(normalizeJikan),
      next: Boolean(j.pagination?.has_next_page),
      source: 'jikan'
    };
  } finally {
    clearTimeout(timer);
  }
}

let snapshotPromise = null;
async function getSnapshot() {
  if (!snapshotPromise) {
    snapshotPromise = (async () => {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 4500);
      try {
        const response = await fetch('./data/catalog.json', { cache: 'no-cache', signal: ctrl.signal });
        if (!response.ok) throw new Error('No snapshot');
        const obj = await response.json();
        if (!obj.groups || !obj.updated) return null;
        return obj;
      } catch {
        return null;
      } finally {
        clearTimeout(timer);
      }
    })();
  }
  return snapshotPromise;
}

async function fromSnapshot(o, registerFn) {
  const data = await getSnapshot();
  if (!data) return null;
  let group = 'trending';
  if (o.status === 'RELEASING') group = 'season';
  else if (o.format === 'MOVIE') group = 'movies';
  else if (o.sort === 'START_DATE_DESC') group = 'recent';
  else if (o.sort === 'POPULARITY_DESC') group = 'popular';

  if (group === 'popular' && !Array.isArray(data.groups.popular)) return null;
  let items = Array.isArray(data.groups[group]) ? data.groups[group] : [];
  if (o.search || o.genre || o.format || o.status) {
    const combined = [...items, ...Object.values(data.groups).filter(Array.isArray).flat()];
    const unique = new Map();
    for (const x of combined) if (x.id && !unique.has(x.id)) unique.set(x.id, x);
    items = [...unique.values()].filter(x =>
      (!o.search || (window.OneUpAnimeSearch?.matches?.(x, o.search) ?? x.title.toLowerCase().includes(o.search.toLowerCase()))) &&
      (!o.genre || (x.genres || []).includes(o.genre)) &&
      (!o.format || x.format === o.format) &&
      (!o.status || x.status === o.status)
    );
  }
  if (!items.length) return null;
  const res = { items: items.slice(0, o.perPage || 24), next: false, source: 'snapshot', updated: data.updated };
  registerFn(res.items);
  return res;
}

// Global Singleton State for Catalog
const entries = reactive(new Map());
const homeRails = reactive({
  trending: [],
  season: [],
  recent: [],
  movies: []
});
const featured = ref(null);
const selectedId = ref(null);
const activeDetailAnime = ref(null);
const isDetailOpen = ref(false);
const currentRoute = ref('inicio');

const browseResults = ref([]);
const browsePage = ref(1);
const browseHasNext = ref(false);
const browseLoading = ref(false);
const browseQuery = ref('');
const browseFilters = reactive({
  genre: '',
  format: '',
  status: '',
  sort: 'POPULARITY_DESC'
});

// Full Catalog, Virtual Scroll, Letter Filter & Multi-Tag Drill-down State
const fullCatalog = ref([]);
const fullCatalogLoaded = ref(false);
const fullCatalogLoading = ref(false);
const selectedLetter = ref('ALL');
const catalogSearchQuery = ref('');
const searchTags = ref([]);

let seq = 0;

function matchAnimeWithQuery(item, query) {
  if (!query) return true;
  const q = String(query).toLowerCase().trim();
  if (!q) return true;

  if ((item.title || '').toLowerCase().includes(q)) return true;
  if ((item.short_title || '').toLowerCase().includes(q)) return true;
  if ((item.title_romaji || '').toLowerCase().includes(q)) return true;
  if ((item.slug || '').toLowerCase().includes(q)) return true;
  if ((item.aliases || []).some(a => String(a).toLowerCase().includes(q))) return true;
  if ((item.genres || []).some(g => String(g).toLowerCase().includes(q))) return true;
  if (String(item.year || '').includes(q)) return true;
  if ((item.studios || '').toLowerCase().includes(q)) return true;
  if ((item.description || item.synopsis || '').toLowerCase().includes(q)) return true;
  if ((item.status_label || '').toLowerCase().includes(q)) return true;
  if ((item.type || '').toLowerCase().includes(q)) return true;
  return false;
}

export function useCatalog() {
  function register(data) {
    for (const a of data || []) {
      if (a.id) entries.set(a.id, a);
    }
  }

  async function fetchCatalog(o) {
    if (!o.search && !o.genre && (!o.page || o.page === 1)) {
      const snap = await fromSnapshot(o, register);
      if (snap) return snap;
    }
    for (const loader of [ani, jikan]) {
      try {
        const r = await loader(o);
        if (r.items.length) {
          register(r.items);
          return r;
        }
      } catch (e) {
        console.warn('1UP provider temporarily unavailable', e?.message);
      }
    }
    const snap = await fromSnapshot(o, register);
    if (snap) return snap;

    const fallbackItems = samples.filter(x =>
      (!o.search || (window.OneUpAnimeSearch?.matches?.(x, o.search) ?? x.title.toLowerCase().includes(o.search.toLowerCase()))) &&
      (!o.genre || x.genres.includes(o.genre)) &&
      (!o.format || x.format === o.format)
    );
    register(fallbackItems);
    return { items: fallbackItems, next: false, source: 'sample' };
  }

  function setHero(anime, chosen = false, persist = chosen) {
    if (!anime) return;
    if (!chosen && selectedId.value && selectedId.value !== anime.id) return;
    if (chosen && persist) {
      selectedId.value = anime.id;
      try {
        sessionStorage.setItem('oneup_last_selected_anime', anime.id);
      } catch {}
    }
    featured.value = anime;
  }

  async function loadHome() {
    register(samples);
    loadFullCatalog().catch(() => {});
    homeRails.trending = samples.slice(0, 10);
    homeRails.season = samples.slice(0, 10);
    homeRails.recent = samples.slice(0, 10);
    homeRails.movies = samples.filter(x => x.format === 'MOVIE').slice(0, 8);
    setHero(samples[6]);

    const requests = [
      ['trending', { sort: 'TRENDING_DESC', perPage: 18 }],
      ['season', { sort: 'TRENDING_DESC', status: 'RELEASING', perPage: 18 }],
      ['recent', { sort: 'START_DATE_DESC', perPage: 18 }],
      ['movies', { sort: 'POPULARITY_DESC', format: 'MOVIE', perPage: 18 }]
    ];

    await Promise.all(requests.map(async ([k, o]) => {
      const d = await fetchCatalog(o);
      homeRails[k] = d.items;
      if (k === 'trending') {
        const remembered = (() => {
          try {
            return sessionStorage.getItem('oneup_last_selected_anime');
          } catch {
            return null;
          }
        })();
        const restored = remembered ? entries.get(remembered) : null;
        if (restored) setHero(restored, true);
        else if (d.source !== 'sample' && d.items[0]) setHero(d.items.find(x => x.banner) || d.items[0]);
        else if (featured.value) setHero(featured.value);
      }
    }));
  }

  function setRoute(route) {
    const validRoutes = ['inicio', 'temporada', 'programacion', 'catalogo', 'peliculas', 'milista', 'populares', 'recientes', 'genero', 'buscar'];
    if (!validRoutes.includes(route)) route = 'inicio';
    currentRoute.value = route;
    window.scrollTo({ top: 0, behavior: 'instant' });
    try {
      history.replaceState(null, '', '#' + route);
    } catch {}

    if (route === 'catalogo') {
      loadFullCatalog();
    }
    if (route !== 'inicio') {
      browse(route, 1, false);
    }
  }

  async function loadFullCatalog() {
    if (fullCatalogLoaded.value && fullCatalog.value.length > 0) {
      return fullCatalog.value;
    }
    if (fullCatalogLoading.value) return fullCatalog.value;
    fullCatalogLoading.value = true;

    const bases = [
      (typeof window !== 'undefined' && window.ONEUP_API_BASE),
      '/api',
      'http://127.0.0.1:4050/api',
      'http://localhost:4050/api'
    ].filter(Boolean);

    for (const base of bases) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 3500);
      try {
        const url = base.replace(/\/$/, '') + '/animes?limit=5000';
        const res = await fetch(url, { cache: 'no-cache', signal: ctrl.signal });
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json?.items) && json.items.length > 0) {
            register(json.items);
            fullCatalog.value = json.items;
            fullCatalogLoaded.value = true;
            fullCatalogLoading.value = false;
            return json.items;
          }
        }
      } catch {} finally {
        clearTimeout(timer);
      }
    }

    const fileCandidates = ['./data/catalog-full.json', '/data/catalog-full.json', './client/data/catalog-full.json', './data/catalog.json'];
    for (const file of fileCandidates) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 4000);
      try {
        const res = await fetch(file, { signal: ctrl.signal });
        if (res.ok) {
          const json = await res.json();
          const items = Array.isArray(json?.items)
            ? json.items
            : (json.groups ? Object.values(json.groups).filter(Array.isArray).flat() : []);
          if (items.length > 0) {
            const unique = new Map();
            for (const item of items) {
              if (item && item.id && !unique.has(item.id)) unique.set(item.id, item);
            }
            const uniqueItems = [...unique.values()];
            register(uniqueItems);
            fullCatalog.value = uniqueItems;
            fullCatalogLoaded.value = true;
            fullCatalogLoading.value = false;
            return uniqueItems;
          }
        }
      } catch {} finally {
        clearTimeout(timer);
      }
    }

    fullCatalogLoading.value = false;
    return fullCatalog.value;
  }

  function setSelectedLetter(letter) {
    selectedLetter.value = letter;
  }

  function addSearchTag(tag) {
    const t = String(tag || '').trim();
    if (!t) return;
    if (!searchTags.value.includes(t)) {
      searchTags.value.push(t);
    }
    catalogSearchQuery.value = '';
  }

  function removeSearchTag(tagOrIdx) {
    if (typeof tagOrIdx === 'number') {
      searchTags.value.splice(tagOrIdx, 1);
    } else {
      searchTags.value = searchTags.value.filter(t => t !== tagOrIdx);
    }
  }

  function clearAllSearchTags() {
    searchTags.value = [];
  }

  function clearCatalogSearch() {
    catalogSearchQuery.value = '';
    searchTags.value = [];
  }

  const filteredFullCatalog = computed(() => {
    let list = fullCatalog.value || [];
    if (!list.length) return [];

    // 1. Letter filter
    const letter = selectedLetter.value;
    if (letter && letter !== 'ALL' && letter !== 'TODOS') {
      if (letter === '#') {
        list = list.filter(item => {
          const title = (item.title || '').trim().replace(/^["'«“‘]+/g, '');
          const first = title.charAt(0);
          return !/^[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(first);
        });
      } else {
        const target = letter.toUpperCase();
        list = list.filter(item => {
          const title = (item.title || '').trim().replace(/^["'«“‘]+/g, '');
          const normalized = title.charAt(0).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
          return normalized === target;
        });
      }
    }

    // 2. Genre filter
    if (browseFilters.genre) {
      const g = browseFilters.genre.toLowerCase();
      list = list.filter(item => (item.genres || []).some(genre => genre.toLowerCase().includes(g)));
    }

    // 3. Format / Type filter
    if (browseFilters.format) {
      const f = browseFilters.format;
      list = list.filter(item => item.format === f || item.type === f);
    }

    // 4. Status filter
    if (browseFilters.status) {
      const s = browseFilters.status;
      list = list.filter(item => item.status === s);
    }

    // 5. Encapsulated tags ("Buscar de lo ya buscado" - multi-level drill-down)
    if (searchTags.value.length > 0) {
      list = list.filter(item => {
        return searchTags.value.every(tag => matchAnimeWithQuery(item, tag));
      });
    }

    // 6. Live query in input
    const q = catalogSearchQuery.value.trim();
    if (q) {
      list = list.filter(item => matchAnimeWithQuery(item, q));
    }

    // 7. Sort
    const sort = browseFilters.sort;
    const sorted = [...list];
    if (sort === 'POPULARITY_DESC') {
      sorted.sort((a, b) => (b.vote_count || b.averageScore || 0) - (a.vote_count || a.averageScore || 0));
    } else if (sort === 'TRENDING_DESC') {
      sorted.sort((a, b) => (b.id > a.id ? 1 : -1));
    } else if (sort === 'START_DATE_DESC') {
      sorted.sort((a, b) => (Number(b.year) || 0) - (Number(a.year) || 0));
    } else if (sort === 'SCORE_DESC') {
      sorted.sort((a, b) => (b.averageScore || 0) - (a.averageScore || 0));
    } else if (sort === 'TITLE_ASC') {
      sorted.sort((a, b) => a.title.localeCompare(b.title, 'es', { sensitivity: 'base' }));
    } else if (sort === 'TITLE_DESC') {
      sorted.sort((a, b) => b.title.localeCompare(a.title, 'es', { sensitivity: 'base' }));
    }

    return sorted;
  });

  async function browse(route, page = 1, append = false) {
    if (browseLoading.value && append) return;
    if (!append) {
      browseResults.value = [];
      browsePage.value = 1;
    }
    browseLoading.value = true;
    browseHasNext.value = false;

    const params = { page, perPage: 20 };
    if (route === 'temporada') {
      params.status = 'RELEASING';
      params.sort = 'TRENDING_DESC';
    } else if (route === 'peliculas') {
      params.format = 'MOVIE';
      params.sort = 'POPULARITY_DESC';
    } else if (route === 'populares') {
      params.sort = 'POPULARITY_DESC';
    } else if (route === 'recientes') {
      params.sort = 'START_DATE_DESC';
    } else if (route === 'genero') {
      params.genre = browseFilters.genre;
      params.sort = 'POPULARITY_DESC';
    } else if (route === 'buscar') {
      params.search = browseQuery.value;
      params.sort = 'POPULARITY_DESC';
    } else {
      Object.assign(params, browseFilters);
    }

    const token = ++seq;
    const res = await fetchCatalog(params);
    if (token !== seq) return;

    if (append) {
      browseResults.value = [...browseResults.value, ...res.items];
    } else {
      browseResults.value = res.items;
    }
    browsePage.value = page;
    browseHasNext.value = res.next;
    browseLoading.value = false;
  }

  function openDetail(idOrAnime) {
    const a = typeof idOrAnime === 'string' ? entries.get(idOrAnime) : idOrAnime;
    if (!a) return;
    activeDetailAnime.value = a;
    isDetailOpen.value = true;
    setHero(a, true);
    document.dispatchEvent(new CustomEvent('oneup-anime-opened', { detail: a }));
  }

  function closeDetail() {
    isDetailOpen.value = false;
  }

  return {
    entries,
    homeRails,
    featured,
    selectedId,
    activeDetailAnime,
    isDetailOpen,
    currentRoute,
    browseResults,
    browsePage,
    browseHasNext,
    browseLoading,
    browseQuery,
    browseFilters,
    formats,
    genres,
    genreSpanish,
    safeUrl,
    register,
    fetchCatalog,
    setHero,
    loadHome,
    setRoute,
    browse,
    openDetail,
    closeDetail,
    fullCatalog,
    fullCatalogLoaded,
    fullCatalogLoading,
    loadFullCatalog,
    selectedLetter,
    setSelectedLetter,
    catalogSearchQuery,
    searchTags,
    addSearchTag,
    removeSearchTag,
    clearAllSearchTags,
    clearCatalogSearch,
    filteredFullCatalog,
    matchAnimeWithQuery
  };
}
