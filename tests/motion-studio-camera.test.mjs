import test from 'node:test';
import assert from 'node:assert/strict';
import { cameraRig, projectDepth, CAMERA_PATHS } from '../motion-studio/camera.mjs';
import { normalizeScene, DEFAULT_SCENE } from '../motion-studio/scene.mjs';

test('camera paths are deterministic and compatible with legacy JSON', () => {
  const old = normalizeScene({ version:1, title:'LEGACY', camera:.5 });
  assert.equal(old.cameraPath, DEFAULT_SCENE.cameraPath);
  assert.equal(old.depth, DEFAULT_SCENE.depth);
  for (const path of CAMERA_PATHS) {
    const scene = normalizeScene({ cameraPath:path, duration:3.2, depth:.7 });
    const a = cameraRig(scene, 1.3), b = cameraRig(scene, 1.3);
    assert.deepEqual(a, b);
    assert.equal(a.path, path);
    assert(Math.abs(a.roll) <= .05);
    assert(a.scale >= 1 && a.scale < 1.15);
  }
  assert.equal(normalizeScene({ cameraPath:'secret' }).cameraPath, DEFAULT_SCENE.cameraPath);
  assert.equal(normalizeScene({ depth: 20 }).depth, 1);
  assert.equal(normalizeScene({ depth:-100 }).depth, 0);
});

test('camera depth perspective is bounded, optical displacement is controllable', () => {
  const close = {x:.2,y:-.35,z:1}, far = {...close,z:0};
  const rig = cameraRig(normalizeScene({ cameraPath:'orbit', depth:1, camera:1 }), 1.1);
  const a = projectDepth(close, rig), b = projectDepth(far, rig);
  assert(a.scale > b.scale);
  assert(a.opacity > b.opacity);
  assert(Number.isFinite(a.x) && Number.isFinite(a.y));
  assert.deepEqual(projectDepth(close, rig), projectDepth(close, rig));
  const flat = projectDepth(close, {...rig, depth:0, x:0,y:0,yaw:0,pitch:0});
  assert.equal(flat.scale, 1);
  assert.equal(flat.x, close.x);
});

test('editor exposes camera controls and renders through one shared engine', async () => {
  const fs = await import('node:fs/promises');
  const html = await fs.readFile('dexter-motion-studio.html','utf8');
  const app = await fs.readFile('motion-studio/app.mjs','utf8');
  const renderer = await fs.readFile('motion-studio/renderer.mjs','utf8');
  const workflow = await fs.readFile('.github/workflows/dexter-motion-studio.yml','utf8');
  assert.match(html, /id="cameraPath"/);
  assert.match(html, /id="depth"/);
  assert.match(app, /'cameraPath'/);
  assert.match(app, /'depth'/);
  assert.match(renderer, /projectDepth/);
  assert.match(renderer, /cameraRig/);
  assert.match(workflow, /tests\/motion-studio-camera\.test\.mjs/);
});
