import { DEFAULT_SCENE, normalizeScene, dimensions } from './scene.mjs';
import { createRenderer } from './renderer.mjs';
const $ = id => document.getElementById(id);
const canvas = $('motion-canvas');
const studio = createRenderer(canvas);
const controls = ['title', 'subtitle', 'tagline', 'duration', 'palette', 'petals', 'glow', 'camera', 'rhythm'];
let scene = normalizeScene(DEFAULT_SCENE);
let format = 'landscape';
let playing = false;
let tickId = 0;
let startTime = 0;
let currentTime = 0;
let recording = false;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
function status(message) { $('studio-status').textContent = message; }
function draw(t = currentTime) {
  currentTime = Math.max(0, Math.min(scene.duration, Number(t) || 0));
  studio.render(scene, currentTime);
  $('timeline').value = String(currentTime);
  $('timecode').textContent = currentTime.toFixed(2) + ' / ' + scene.duration.toFixed(2) + ' s';
}
function stop() {
  playing = false;
  if (tickId) cancelAnimationFrame(tickId);
  tickId = 0;
}
function tick(now) {
  if (!playing) return;
  const t = Math.min(scene.duration, (now - startTime) / 1000);
  draw(t);
  if (t >= scene.duration) { stop(); return; }
  tickId = requestAnimationFrame(tick);
}
function play() {
  if (recording || reduced.matches) {
    if (reduced.matches) status('Movimiento reducido activo: utiliza la línea de tiempo para inspeccionar fotogramas.');
    return;
  }
  if (playing) return;
  if (currentTime >= scene.duration - .02) currentTime = 0;
  startTime = performance.now() - currentTime * 1000;
  playing = true;
  tickId = requestAnimationFrame(tick);
  status('Previsualización de escena en curso.');
}
function syncInputs() {
  for (const key of controls) $(key).value = String(scene[key]);
  $('format').value = format;
  for (const key of ['duration', 'petals', 'glow', 'camera', 'rhythm']) {
    const value = scene[key];
    $(key + '-value').textContent = key === 'duration' ? value.toFixed(1) + ' s' :
      key === 'petals' ? String(value) : Math.round(value * 100) + '%';
  }
  $('timeline').max = String(scene.duration);
}
function applyEditor() {
  stop();
  const next = {};
  for (const key of controls) next[key] = $(key).value;
  scene = normalizeScene(next);
  format = $('format').value === 'portrait' ? 'portrait' : 'landscape';
  studio.size(format, true);
  syncInputs();
  draw(Math.min(currentTime, scene.duration));
  status('Escena actualizada. Guardar JSON conserva sus ajustes.');
}
function download(name, blob) {
  const href = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = href; a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(href), 12000);
}
function exportScene() {
  const data = JSON.stringify({ ...scene, format }, null, 2) + '\n';
  download('1UP-Motion-Scene.json', new Blob([data], { type: 'application/json' }));
  status('Escena JSON descargada. Puedes reutilizarla para el renderizador MP4.');
}
async function importScene(file) {
  if (!file || file.size > 65536) throw Error('Solo se admiten archivos JSON de hasta 64 KB.');
  const object = JSON.parse(await file.text());
  if (!object || typeof object !== 'object' || Array.isArray(object) ||
      Number(object.version) !== 1) throw Error('Archivo incompatible: se requiere escena versión 1.');
  stop();
  scene = normalizeScene(object);
  format = object.format === 'portrait' ? 'portrait' : 'landscape';
  studio.size(format, true); syncInputs(); draw(0);
  status('Escena importada correctamente.');
}
async function recordVideo() {
  if (recording) return;
  if (!canvas.captureStream || typeof MediaRecorder === 'undefined') {
    status('Este navegador no permite grabar Canvas. Usa el exportador MP4 en GitHub Actions.'); return;
  }
  const codec = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4']
    .find(mime => MediaRecorder.isTypeSupported(mime));
  if (!codec) { status('No existe un formato de grabación compatible. Usa GitHub Actions.'); return; }
  stop(); recording = true; $('record').disabled = true;
  const stream = canvas.captureStream(30), chunks = [];
  let recorder;
  try {
    recorder = new MediaRecorder(stream, { mimeType: codec, videoBitsPerSecond: 5500000 });
    const done = new Promise((resolve, reject) => {
      recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      recorder.onerror = () => reject(Error('Falló MediaRecorder'));
      recorder.onstop = resolve;
    });
    recorder.start(100);
    const started = performance.now();
    await new Promise(resolve => {
      const frame = now => {
        draw(Math.min(scene.duration, (now - started) / 1000));
        if (now - started >= scene.duration * 1000) resolve();
        else requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
    if (recorder.state !== 'inactive') recorder.stop();
    await done;
    if (!chunks.length) throw Error('La grabación está vacía.');
    const mime = recorder.mimeType || codec;
    download('1UP-Motion-' + format + (mime.includes('mp4') ? '.mp4' : '.webm'),
      new Blob(chunks, { type: mime }));
    status('Video descargado SIN audio. El MP4 Full HD con audio original se exporta desde GitHub.');
  } catch (error) {
    if (recorder?.state === 'recording') recorder.stop();
    status('No se pudo grabar: ' + error.message);
  } finally {
    stream.getTracks().forEach(track => track.stop());
    recording = false;
    $('record').disabled = false;
    draw(0);
  }
}
for (const key of controls) $(key).addEventListener('input', applyEditor);
$('format').addEventListener('change', applyEditor);
$('play').addEventListener('click', play);
$('pause').addEventListener('click', () => { stop(); status('Previsualización pausada.'); });
$('reset').addEventListener('click', () => { stop(); draw(0); status('Escena reiniciada.'); });
$('timeline').addEventListener('input', e => { stop(); draw(Number(e.target.value)); });
$('save').addEventListener('click', exportScene);
$('record').addEventListener('click', recordVideo);
$('import-scene').addEventListener('change', async e => {
  try { await importScene(e.target.files?.[0]); } catch (error) { status(error.message); }
  e.target.value = '';
});
await studio.load();
studio.size(format, true); syncInputs(); draw(0);
status(studio.hasLogo() ? 'Listo. Logo de 1UP Anime cargado; puedes editar, previsualizar y exportar.' :
  'No se pudo cargar la imagen del logo. Revisa la conexión; se muestra un texto alternativo.');
// Stable frame-render API for headless MP4 exporter. No automatic network calls.
window.DexterMotionStudio = Object.freeze({
  getScene: () => ({ ...scene, format }),
  renderAt(seconds) { stop(); draw(seconds); return currentTime; },
  setExportMode(nextFormat, importedScene = scene, size = null) {
    stop(); scene = normalizeScene(importedScene);
    format = nextFormat === 'portrait' ? 'portrait' : 'landscape';
    const target = size || dimensions(format);
    if (!Number.isInteger(target.width) || !Number.isInteger(target.height) ||
        target.width < 160 || target.height < 90 || target.width > 3840 || target.height > 3840)
      throw Error('Tamaño de renderizado inválido');
    canvas.width = target.width; canvas.height = target.height;
    syncInputs(); draw(0);
    return { width: canvas.width, height: canvas.height, logo: studio.hasLogo() };
  },
  hasLogo: () => studio.hasLogo()
});
