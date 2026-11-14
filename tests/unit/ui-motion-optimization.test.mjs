import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../../');

test('Motion Optimization: windows.css includes smooth exit transitions and cleanup', () => {
  const cssPath = path.join(ROOT, 'client/themes/oneup-motion/windows.css');
  assert.ok(fs.existsSync(cssPath), 'windows.css must exist');
  const css = fs.readFileSync(cssPath, 'utf8');

  // Verify veil exit keyframe
  assert.ok(css.includes('@keyframes oneup-veil-out'), 'Must include @keyframes oneup-veil-out');
  // Verify drawer exit keyframe
  assert.ok(css.includes('@keyframes oneup-drawer-out'), 'Must include @keyframes oneup-drawer-out');
  // Verify pop exit keyframe
  assert.ok(css.includes('@keyframes oneup-pop-out'), 'Must include @keyframes oneup-pop-out');

  // Verify .is-closing class coordinates backdrop fade-out and disables clicks
  assert.ok(css.includes('.is-closing'), 'Must support .is-closing class for dialog exit');
  assert.ok(css.includes('.is-closing::backdrop'), 'Must coordinate backdrop exit animation');
  assert.ok(css.includes('pointer-events: none'), 'Must disable pointer events during exit');
});

test('Motion Optimization: windows.js manages .is-closing and GPU layer hints', () => {
  const jsPath = path.join(ROOT, 'client/themes/oneup-motion/windows.js');
  assert.ok(fs.existsSync(jsPath), 'windows.js must exist');
  const js = fs.readFileSync(jsPath, 'utf8');

  assert.ok(js.includes('is-closing'), 'windows.js must apply and clean up .is-closing');
  assert.ok(js.includes('willChange'), 'windows.js must promote layers via willChange during animations');
  assert.ok(js.includes('pointerEvents'), 'windows.js must prevent click-through during close animation');
});

test('Motion Optimization: DepthEngine does not run infinite RAF loops when idle or disabled', () => {
  const depthPath = path.join(ROOT, 'client/src/js/depth-engine.js');
  assert.ok(fs.existsSync(depthPath), 'depth-engine.js must exist');
  const code = fs.readFileSync(depthPath, 'utf8');

  // Must not unconditionally call requestAnimationFrame(render) inside render without checking bounds
  assert.ok(!code.includes('requestAnimationFrame(render);\\n  }'), 'Must not unconditionally loop render');
  assert.ok(code.includes('cancelAnimationFrame'), 'Must support cancelling animation frame');
  assert.ok(code.includes('visibilitychange'), 'Must listen to visibilitychange to pause on backgrounded tab');
  assert.ok(code.includes('diff > 0.005'), 'Must only request frame while lerp is active');
});

test('Motion Optimization: CardDepthEngine is event-driven and zero-overhead when idle', () => {
  const cardDepthPath = path.join(ROOT, 'client/src/js/card-depth-engine.js');
  assert.ok(fs.existsSync(cardDepthPath), 'card-depth-engine.js must exist');
  const code = fs.readFileSync(cardDepthPath, 'utf8');

  // Must not have global loop starting on bindCard
  assert.ok(!code.includes('requestAnimationFrame(loop);\\n  }\\n\\n  function refresh'), 'Must not start loop on bind');
  assert.ok(code.includes('isHovered'), 'Must track hover state');
  assert.ok(code.includes('startLoop'), 'Must lazily start loop on mouse interaction');
  assert.ok(code.includes('depth-mode-changed'), 'Must respond to depth-mode-changed event');
});

test('Motion Optimization: depth-system.css removes transition fighting and global will-change', () => {
  const cssPath = path.join(ROOT, 'client/src/styles/depth-system.css');
  assert.ok(fs.existsSync(cssPath), 'depth-system.css must exist');
  const css = fs.readFileSync(cssPath, 'utf8');

  assert.ok(!css.includes('transition: transform 0.12s'), 'Must not have transition: transform fighting JS RAF');
  assert.ok(!css.includes('will-change: transform;'), 'Must not force will-change globally on all data-depth elements');
});

test('Motion Optimization: studio.css .toast uses 3D transform with isolated transitions', () => {
  const studioCssPath = path.join(ROOT, 'client/src/styles/studio.css');
  assert.ok(fs.existsSync(studioCssPath), 'studio.css must exist');
  const css = fs.readFileSync(studioCssPath, 'utf8');

  assert.ok(css.includes('translate3d(-50%,15px,0)'), 'Toast must use translate3d for GPU layer composite');
  assert.ok(css.includes('translate3d(-50%,0,0)'), 'Toast.show must use translate3d');
  assert.ok(css.includes('will-change:transform, opacity') || css.includes('will-change:transform,opacity'), 'Toast must declare will-change');
});

test('Motion Optimization: spotlight.css removes backdrop-filter from dialog-close to prevent GPU stalls', () => {
  const spotPath = path.join(ROOT, 'client/src/styles/spotlight.css');
  assert.ok(fs.existsSync(spotPath), 'spotlight.css must exist');
  const css = fs.readFileSync(spotPath, 'utf8');

  // Verify dialog-close does not have backdrop-filter
  const closeIdx = css.indexOf('.anime-dialog .dialog-close');
  assert.ok(closeIdx !== -1);
  const closeSnippet = css.slice(closeIdx, closeIdx + 400);
  assert.ok(!closeSnippet.includes('backdrop-filter'), 'dialog-close inside anime-dialog must not use backdrop-filter');

  // Verify spotlightText uses 3D transform
  assert.ok(css.includes('translate3d(0,8px,0)'), 'spotlightText must use translate3d');
});

test('Motion Optimization: studio.js virtual scroll caches height and document top offset', () => {
  const studioJsPath = path.join(ROOT, 'client/src/js/studio.js');
  assert.ok(fs.existsSync(studioJsPath), 'studio.js must exist');
  const js = fs.readFileSync(studioJsPath, 'utf8');

  assert.ok(js.includes('catalogGridDocTop'), 'Must maintain catalogGridDocTop cache to avoid layout thrashing');
  assert.ok(js.includes('body.dataset.renderedHeight !== targetHeightStr'), 'Must avoid redundant style.height assignments');
});
