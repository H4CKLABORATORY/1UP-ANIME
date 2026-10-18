const BASE_URL = 'https://h4cklaboratory.github.io/1UP-ANIME/';

async function checkFile(path) {
  const url = new URL(path, BASE_URL).href;
  try {
    const res = await fetch(url);
    const text = res.ok ? await res.text() : '';
    return { path, status: res.status, ok: res.ok, bytes: text.length };
  } catch (err) {
    return { path, status: 'ERROR', ok: false, bytes: 0, error: String(err) };
  }
}

const files = [
  'js/depth-engine.js',
  'js/depth-toggle-button.js',
  'js/card-depth-engine.js',
  'styles/depth-system.css',
  'styles/depth-toggle.css',
  'styles/anime-card-depth.css',
  'index.html'
];

const results = await Promise.all(files.map(checkFile));
console.table(results);

const indexRes = await fetch(BASE_URL);
const indexHtml = await indexRes.text();

console.log('Botón depth-toggle referenciado en index.html:', indexHtml.includes('depth-toggle'));
console.log('depth-engine.js referenciado en index.html:', indexHtml.includes('depth-engine.js'));

const allOk = results.every(r => r.ok);
process.exit(allOk ? 0 : 1);
