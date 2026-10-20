import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFAULT_SCENE, PALETTES, FORMATS, dimensions, easing,
  frameState, normalizeScene } from '../motion-studio/scene.mjs';

test('two exact 16:9 and 9:16 Full HD formats with half-size previews', () => {
  assert.deepEqual(dimensions('landscape'), { width: 1920, height: 1080, label: 'Horizontal 16:9' });
  assert.deepEqual(dimensions('portrait'), { width: 1080, height: 1920, label: 'Vertical 9:16' });
  assert.deepEqual(dimensions('portrait', true), { width: 540, height: 960 });
  assert.equal(Object.keys(FORMATS).length, 2);
});
test('no arbitrary external assets, injection, invalid palette or NaN values', () => {
  const bad = normalizeScene({ title: '<script>alert(1)</script>',
    palette: '__proto__', duration: -20, petals: 120, glow: 'not a number', camera: 99,
    tagline: '\u0000Hola\u000aMundo' });
  assert.equal(bad.version, 1);
  assert.equal(bad.palette, DEFAULT_SCENE.palette);
  assert.equal(bad.duration, 2);
  assert.equal(bad.petals, 90);
  assert.equal(bad.glow, DEFAULT_SCENE.glow);
  assert.equal(bad.camera, 1);
  assert.equal(bad.tagline, 'HolaMundo');
  assert.equal(Object.keys(PALETTES).length, 3);
  assert.equal(normalizeScene(null).title, DEFAULT_SCENE.title);
});
test('frame calculation remains deterministic and confined to scene length', () => {
  const scene = normalizeScene(DEFAULT_SCENE);
  assert.deepEqual(frameState(scene, 1.25), frameState(scene, 1.25));
  assert.equal(frameState(scene, -100).t, 0);
  assert.equal(frameState(scene, 10000).t, scene.duration);
  assert.equal(easing(-1), 0);
  assert.equal(easing(2), 1);
  assert.equal(frameState(scene, 0).alpha, 0);
  assert.equal(frameState(scene, scene.duration).alpha, 0);
});
test('editor uses original logo and audio workflow; home remains independent', () => {
  const html = readFileSync('dexter-motion-studio.html', 'utf8');
  const app = readFileSync('motion-studio/app.mjs', 'utf8');
  const renderer = readFileSync('motion-studio/renderer.mjs', 'utf8');
  const workflow = readFileSync('.github/workflows/dexter-motion-studio.yml', 'utf8');
  const home = readFileSync('index.html', 'utf8');
  const sw = readFileSync('sw.js', 'utf8');
  assert.match(home, /dexter-motion-studio\.html/);
  assert.match(html, /motion-studio\/app\.mjs/);
  assert.match(app, /window\.DexterMotionStudio/);
  assert.match(html, /copy-json/);
  assert.match(workflow, /scene_json/);
  assert.match(renderer, /assets\/oneup-header-letters\.png/);
  assert.match(workflow, /render-motion-studio\.mjs/);
  assert.match(sw, /dexter-motion-studio\.html/);
  assert(!html.includes('src="https://'));
});
