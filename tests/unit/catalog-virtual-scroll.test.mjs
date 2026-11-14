import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../../');

test('Catalog Data: Full catalog contains indexed titles and required fields', () => {
  const fullJsonPath = path.join(ROOT, 'data/catalog-full.json');
  assert.ok(fs.existsSync(fullJsonPath), 'data/catalog-full.json must exist');
  const data = JSON.parse(fs.readFileSync(fullJsonPath, 'utf8'));
  assert.ok(Array.isArray(data.items), 'catalog-full items must be an array');
  assert.ok(data.items.length >= 4000, `Expected at least 4000 animes, got ${data.items.length}`);

  const sample = data.items[0];
  assert.ok(sample.id, 'Item must have id');
  assert.ok(sample.title, 'Item must have title');
  assert.ok(sample.slug, 'Item must have slug');
  assert.ok(Array.isArray(sample.genres), 'Item must have genres array');
  assert.ok(sample.format, 'Item must have format');
  assert.ok(sample.status, 'Item must have status');
});

test('Letter Filter Logic: Correctly filters A-Z, symbols (#), and handles quotes/accents', async () => {
  const { useCatalog } = await import('../../client/src-vue/composables/useCatalog.js');
  const catalog = useCatalog();

  const mockItems = [
    { id: '1', title: '"Kimi wo Aisuru Ki wa Nai"', genres: ['Romance'], format: 'TV', status: 'RELEASING', year: 2024 },
    { id: '2', title: 'Attack on Titan', genres: ['Action', 'Fantasy'], format: 'TV', status: 'FINISHED', year: 2013 },
    { id: '3', title: 'Bleach', genres: ['Action'], format: 'TV', status: 'FINISHED', year: 2004 },
    { id: '4', title: '100 Sleeping Princes', genres: ['Fantasy'], format: 'TV', status: 'FINISHED', year: 2018 },
    { id: '5', title: 'Ámame otra vez', genres: ['Drama'], format: 'MOVIE', status: 'FINISHED', year: 2020 },
    { id: '6', title: '!Hero', genres: ['Action'], format: 'OVA', status: 'FINISHED', year: 2015 }
  ];

  catalog.fullCatalog.value = mockItems;

  // 1. Filter by 'K' (should match "Kimi..." despite starting quote)
  catalog.setSelectedLetter('K');
  assert.equal(catalog.filteredFullCatalog.value.length, 1);
  assert.equal(catalog.filteredFullCatalog.value[0].id, '1');

  // 2. Filter by 'A' (should match 'Attack on Titan' and accent 'Ámame')
  catalog.setSelectedLetter('A');
  const aTitles = catalog.filteredFullCatalog.value.map(x => x.title);
  assert.ok(aTitles.includes('Attack on Titan'));
  assert.ok(aTitles.includes('Ámame otra vez'));

  // 3. Filter by '#' (numbers and symbols like 100 Sleeping Princes and !Hero)
  catalog.setSelectedLetter('#');
  const hashTitles = catalog.filteredFullCatalog.value.map(x => x.title);
  assert.ok(hashTitles.includes('100 Sleeping Princes'));
  assert.ok(hashTitles.includes('!Hero'));

  // 4. Reset to 'ALL'
  catalog.setSelectedLetter('ALL');
  assert.equal(catalog.filteredFullCatalog.value.length, mockItems.length);
});

test('Search & Drill-Down: Encapsulating tags on Enter ("Buscar de lo ya buscado")', async () => {
  const { useCatalog } = await import('../../client/src-vue/composables/useCatalog.js');
  const catalog = useCatalog();

  const testAnimes = [
    { id: '1', title: 'Re:Zero - Starting Life in Another World', genres: ['Isekai', 'Fantasy'], year: 2016, studios: 'White Fox', synopsis: 'Subaru is summoned to a fantasy world.' },
    { id: '2', title: 'Mushoku Tensei: Isekai Ittara Honki Dasu', genres: ['Isekai', 'Adventure'], year: 2021, studios: 'Studio Bind', synopsis: 'A 34-year-old NEET reincarnates.' },
    { id: '3', title: 'Solo Leveling', genres: ['Action', 'Fantasy'], year: 2024, studios: 'A-1 Pictures', synopsis: 'Sung Jinwoo reawakens.' },
    { id: '4', title: 'KonoSuba: God\'s Blessing on this Wonderful World!', genres: ['Isekai', 'Comedy'], year: 2016, studios: 'Studio Deen', synopsis: 'Kazuma dies and meets Aqua.' },
    { id: '5', title: 'Isekai Shikkaku', genres: ['Isekai', 'Comedy'], year: 2024, studios: 'AtelierPontdarc', synopsis: 'A melancholy author goes to another world in 2024.' }
  ];

  catalog.fullCatalog.value = testAnimes;
  catalog.clearCatalogSearch();
  catalog.setSelectedLetter('ALL');

  // Initial state: all 5 animes
  assert.equal(catalog.filteredFullCatalog.value.length, 5);

  // User types "Isekai" and hits Enter (encapsulate tag 1)
  catalog.addSearchTag('Isekai');
  assert.deepEqual(catalog.searchTags.value, ['Isekai']);
  // Matches items 1, 2, 4, 5 (4 items)
  assert.equal(catalog.filteredFullCatalog.value.length, 4);

  // "Buscar de lo ya buscado": User now types "2024" and hits Enter (encapsulate tag 2)
  catalog.addSearchTag('2024');
  assert.deepEqual(catalog.searchTags.value, ['Isekai', '2024']);
  // Must match both "Isekai" AND "2024" -> item 5 only!
  assert.equal(catalog.filteredFullCatalog.value.length, 1);
  assert.equal(catalog.filteredFullCatalog.value[0].id, '5');

  // User removes the "2024" tag
  catalog.removeSearchTag('2024');
  assert.deepEqual(catalog.searchTags.value, ['Isekai']);
  assert.equal(catalog.filteredFullCatalog.value.length, 4);

  // User clears all search tags with the clear button
  catalog.clearCatalogSearch();
  assert.equal(catalog.searchTags.value.length, 0);
  assert.equal(catalog.filteredFullCatalog.value.length, 5);
});

test('Search Input: Clear button and Live Query combination with encapsulated tags', async () => {
  const { useCatalog } = await import('../../client/src-vue/composables/useCatalog.js');
  const catalog = useCatalog();

  const testAnimes = [
    { id: '1', title: 'Naruto', genres: ['Ninja', 'Action'], year: 2002 },
    { id: '2', title: 'Naruto: Shippuuden', genres: ['Ninja', 'Action'], year: 2007 },
    { id: '3', title: 'Boruto: Naruto Next Generations', genres: ['Ninja', 'Action'], year: 2017 },
    { id: '4', title: 'Bleach', genres: ['Action'], year: 2004 }
  ];

  catalog.fullCatalog.value = testAnimes;
  catalog.clearCatalogSearch();
  catalog.setSelectedLetter('ALL');

  // 1. Encapsulate "Naruto"
  catalog.addSearchTag('Naruto');
  assert.equal(catalog.filteredFullCatalog.value.length, 3);

  // 2. Live typing "Shippuuden" in the search input (before pressing Enter)
  catalog.catalogSearchQuery.value = 'Shippuuden';
  assert.equal(catalog.filteredFullCatalog.value.length, 1);
  assert.equal(catalog.filteredFullCatalog.value[0].id, '2');

  // 3. Clearing the search input
  catalog.catalogSearchQuery.value = '';
  assert.equal(catalog.filteredFullCatalog.value.length, 3);

  // 4. Clearing everything
  catalog.clearCatalogSearch();
  assert.equal(catalog.filteredFullCatalog.value.length, 4);
});

test('Virtual Scroll: Math calculations for row chunking, overscan and spacer heights', () => {
  const totalItems = 4885;
  const cols = 5;
  const rowHeight = 350;
  const overscan = 2;
  const viewportHeight = 800;

  const totalRows = Math.ceil(totalItems / cols);
  assert.equal(totalRows, 977);

  const totalHeight = totalRows * rowHeight;
  assert.equal(totalHeight, 341950);

  // Case 1: At top (scrollTop = 0)
  const scrollTop1 = 0;
  const startRow1 = Math.max(0, Math.floor(scrollTop1 / rowHeight) - overscan);
  const endRow1 = Math.min(totalRows, Math.ceil((scrollTop1 + viewportHeight) / rowHeight) + overscan);
  assert.equal(startRow1, 0);
  assert.equal(endRow1, 3 + 2); // 5 rows visible
  const offsetY1 = startRow1 * rowHeight;
  assert.equal(offsetY1, 0);

  // Rendered DOM cards: 5 rows * 5 cols = 25 cards in DOM (out of 4,885 total!)
  const renderedCards1 = (endRow1 - startRow1) * cols;
  assert.equal(renderedCards1, 25);

  // Case 2: Deep scroll (scrollTop = 35000 px, ~100 rows down)
  const scrollTop2 = 35000;
  const startRow2 = Math.max(0, Math.floor(scrollTop2 / rowHeight) - overscan);
  const endRow2 = Math.min(totalRows, Math.ceil((scrollTop2 + viewportHeight) / rowHeight) + overscan);
  assert.equal(startRow2, 100 - 2); // 98
  assert.equal(endRow2, 100 + 3 + 2); // 105
  const offsetY2 = startRow2 * rowHeight;
  assert.equal(offsetY2, 98 * 350);

  // Rendered DOM cards in deep scroll: 7 rows * 5 cols = 35 cards in DOM!
  const renderedCards2 = (endRow2 - startRow2) * cols;
  assert.equal(renderedCards2, 35);
  // Total height check: constant body height invariant
  assert.equal(totalHeight, 341950);
});
