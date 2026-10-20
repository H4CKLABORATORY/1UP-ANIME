#!/usr/bin/env node
/* Deterministic DEXTER Motion Studio full-HD encoder.
 * PNG frames from same-origin Canvas -> FFmpeg image2pipe -> H.264/AAC MP4.
 * Never fetches third-party videos or modified copyrighted media.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { extname, resolve, dirname, sep } from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { DEFAULT_SCENE, dimensions, normalizeScene } from '../motion-studio/scene.mjs';

const ROOT = resolve(import.meta.dirname, '..');
function parseArgs(argv) {
  const opts = {};
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    if (!key.startsWith('--') || !/^[a-z-]+$/.test(key.slice(2)) || opts[key.slice(2)] !== undefined ||
        i + 1 === argv.length || argv[i + 1].startsWith('--')) throw Error('Opción inválida: ' + key);
    opts[key.slice(2)] = argv[++i];
  }
  const allowed = new Set(['format', 'scene', 'fps', 'duration', 'width', 'height', 'out', 'no-audio']);
  for (const key of Object.keys(opts)) if (!allowed.has(key)) throw Error('Opción desconocida: --' + key);
  const format = opts.format || 'landscape';
  if (!['landscape', 'portrait'].includes(format)) throw Error('--format landscape|portrait');
  const fps = Number(opts.fps || 30);
  if (!Number.isInteger(fps) || fps < 6 || fps > 60) throw Error('FPS fuera de rango (6-60)');
  const target = dimensions(format);
  const width = Number(opts.width || target.width), height = Number(opts.height || target.height);
  if (!Number.isInteger(width) || !Number.isInteger(height) || width % 2 || height % 2 ||
      width < 160 || height < 90 || width > 3840 || height > 3840) throw Error('Resolución no válida (pares, máximo 3840)');
  return { ...opts, format, fps, width, height, audio: opts['no-audio'] !== 'true',
    out: resolve(opts.out || 'artifacts/oneup-motion-' + format + '.mp4') };
}
async function serve() {
  const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8',
    '.mjs':'text/javascript; charset=utf-8', '.css':'text/css', '.png':'image/png', '.jpg':'image/jpeg' };
  const server = createServer(async (req, res) => {
    try {
      if (req.method !== 'GET') throw Error('GET only');
      const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
      const file = resolve(ROOT, '.' + decodeURIComponent(pathname === '/' ? '/dexter-motion-studio.html' : pathname));
      if (!file.startsWith(ROOT + sep)) throw Error('Unsafe path');
      const bytes = await readFile(file);
      res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream',
        'Cache-Control': 'no-store' }); res.end(bytes);
    } catch { res.writeHead(404); res.end('Not Found'); }
  });
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  return { server, url: 'http://127.0.0.1:' + server.address().port + '/dexter-motion-studio.html' };
}
async function main() {
  const options = parseArgs(process.argv.slice(2));
  const source = options.scene ? JSON.parse(await readFile(resolve(options.scene), 'utf8')) : DEFAULT_SCENE;
  const scene = normalizeScene(source);
  scene.duration = options.duration === undefined ? scene.duration : Number(options.duration);
  if (!Number.isFinite(scene.duration) || scene.duration < 1 || scene.duration > 8) throw Error('Duración no válida: 1-8 s');
  await mkdir(dirname(options.out), { recursive: true });
  const { server, url } = await serve();
  let browser, ffmpeg, stderr = '', streamError = null;
  try {
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 }, reducedMotion: 'no-preference' });
    const pageErrors = [];
    page.on('pageerror', e => pageErrors.push(e.message));
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!window.DexterMotionStudio, { timeout: 15000 });
    const ready = await page.evaluate(({ format, scene, width, height }) =>
      window.DexterMotionStudio.setExportMode(format, scene, { width, height }),
      { format: options.format, scene, width: options.width, height: options.height });
    if (!ready.logo) throw Error('El logo original no se pudo cargar: assets/oneup-header-letters.png');
    if (pageErrors.length) throw Error('Error navegador: ' + pageErrors.join(' | '));
    const params = ['-hide_banner', '-loglevel', 'error', '-y',
      '-f', 'image2pipe', '-framerate', String(options.fps), '-vcodec', 'png', '-i', 'pipe:0'];
    if (options.audio) params.push('-stream_loop', '-1', '-i', resolve(ROOT, 'assets/1up-anime-intro-firma-3seg.mp4'));
    params.push('-map', '0:v:0');
    if (options.audio) params.push('-map', '1:a:0');
    params.push('-t', String(scene.duration), '-c:v', 'libx264', '-preset', 'veryfast',
      '-crf', '19', '-pix_fmt', 'yuv420p', '-r', String(options.fps),
      '-movflags', '+faststart');
    if (options.audio) params.push('-c:a', 'aac', '-b:a', '192k');
    else params.push('-an');
    params.push(options.out);
    ffmpeg = spawn('ffmpeg', params, { stdio: ['pipe', 'ignore', 'pipe'] });
    ffmpeg.on('error', e => { streamError = e; });
    ffmpeg.stdin.on('error', e => { streamError = e; });
    ffmpeg.stderr.on('data', data => { stderr += data.toString().slice(0, 8192); });
    const frames = Math.ceil(scene.duration * options.fps);
    for (let frame = 0; frame < frames; frame++) {
      if (streamError) throw streamError;
      const encoded = await page.evaluate(t => {
        window.DexterMotionStudio.renderAt(t);
        return document.querySelector('#motion-canvas').toDataURL('image/png').split(',')[1];
      }, frame / options.fps);
      const png = Buffer.from(encoded, 'base64');
      if (!ffmpeg.stdin.write(png)) await once(ffmpeg.stdin, 'drain');
      if (frame % 15 === 0) console.log('Rendered frame ' + (frame + 1) + '/' + frames);
    }
    ffmpeg.stdin.end();
    const [exit] = await once(ffmpeg, 'close');
    if (exit !== 0) throw Error('FFmpeg falló (' + exit + '): ' + stderr);
    console.log('MP4 listo: ' + options.out + ' | ' + options.width + 'x' + options.height +
      ' | ' + options.fps + ' fps | ' + scene.duration + ' s | ' + (options.audio ? 'AAC original' : 'sin audio'));
  } finally {
    if (ffmpeg && ffmpeg.exitCode === null) ffmpeg.kill();
    await browser?.close();
    await new Promise(done => server.close(done));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
