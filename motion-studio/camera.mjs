/* DEXTER Motion Studio 2.5D camera rig.
 * Pure / deterministic: same scene + timestamp => same projection on web and FFmpeg.
 * Perspective is bounded, with no device sensors, libraries or WebGL dependency.
 */
import { easing, normalizeScene } from './scene.mjs';

export const CAMERA_PATHS = Object.freeze(['orbit', 'dolly', 'glide']);
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export function cameraRig(scene, seconds) {
  const s = normalizeScene(scene);
  const t = clamp(Number.isFinite(Number(seconds)) ? Number(seconds) : 0, 0, s.duration);
  const p = t / s.duration;
  const strength = s.camera;
  const depth = s.depth;
  const wave = Math.sin(Math.PI * p);
  // Gentle trajectories return to neutral by the end, keeping the wordmark readable.
  const path = s.cameraPath;
  const rig = { path, depth, strength, x: 0, y: 0, yaw: 0, pitch: 0, roll: 0, scale: 1 };
  if (path === 'orbit') {
    rig.yaw = strength * .18 * Math.sin(2 * Math.PI * p);
    rig.pitch = strength * .085 * Math.sin(Math.PI * p);
    rig.x = strength * .026 * Math.sin(2 * Math.PI * p);
    rig.roll = strength * .012 * Math.sin(2 * Math.PI * p);
  } else if (path === 'dolly') {
    rig.scale = 1 + strength * (.038 + .10 * easing(p));
    rig.y = strength * -.023 * wave;
    rig.pitch = strength * -.040 * wave;
  } else { // glide: left-to-right camera track with subtle focus drift
    rig.x = strength * .042 * Math.sin(2 * Math.PI * p);
    rig.y = strength * .018 * Math.sin(Math.PI * 2 * p);
    rig.yaw = strength * .065 * Math.sin(2 * Math.PI * p);
    rig.roll = strength * .005 * wave;
  }
  return rig;
}

/* Input coordinates normalized to (-1, 1), depth z: 0=far, 1=near.
 * Outputs are safe normalized 2D positions plus perspective scale and opacity.
 */
export function projectDepth(point, rig) {
  const z = clamp(Number(point?.z) || 0, 0, 1);
  const px = clamp(Number(point?.x) || 0, -3, 3);
  const py = clamp(Number(point?.y) || 0, -3, 3);
  const d = clamp(Number(rig?.depth) || 0, 0, 1);
  const x = clamp(Number(rig?.x) || 0, -.1, .1);
  const y = clamp(Number(rig?.y) || 0, -.1, .1);
  const yaw = clamp(Number(rig?.yaw) || 0, -.25, .25);
  const pitch = clamp(Number(rig?.pitch) || 0, -.15, .15);
  const scale = clamp(1 + (z - .5) * .55 * d, .72, 1.30);
  const parallax = .25 + z * 1.3;
  return {
    x: (px - x * parallax - yaw * z * d) * scale,
    y: (py - y * parallax + pitch * z * d) * scale,
    scale, opacity: clamp(.28 + z * .72, 0, 1)
  };
}
