/* Source of truth for editor, browser preview and reproducible FFmpeg renders. */
export const FORMATS = Object.freeze({
  landscape: Object.freeze({ width: 1920, height: 1080, label: 'Horizontal 16:9' }),
  portrait: Object.freeze({ width: 1080, height: 1920, label: 'Vertical 9:16' })
});
export const PALETTES = Object.freeze({
  esmeralda: ['#050e15', '#0f6149', '#7af2bc', '#64baff'],
  galaxia: ['#050717', '#29216c', '#ba98ff', '#56bbff'],
  aurora: ['#110a19', '#733050', '#ffd7a2', '#ff74ad']
});
export const DEFAULT_SCENE = Object.freeze({
  version: 1, title: 'TU SIGUIENTE VIDA', subtitle: 'ES ANIME.',
  tagline: 'UN UNIVERSO. INFINITAS HISTORIAS.',
  duration: 3.2, palette: 'esmeralda', petals: 52, glow: .72,
  camera: .64, rhythm: .7
});
const number = (value, fallback, min, max) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
};
const cleanText = (value, fallback, limit) =>
  (typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, limit) : '') || fallback;
export function normalizeScene(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) input = {};
  return {
    version: 1,
    title: cleanText(input.title, DEFAULT_SCENE.title, 46),
    subtitle: cleanText(input.subtitle, DEFAULT_SCENE.subtitle, 36),
    tagline: cleanText(input.tagline, DEFAULT_SCENE.tagline, 70),
    duration: number(input.duration, DEFAULT_SCENE.duration, 2, 8),
    palette: Object.hasOwn(PALETTES, input.palette) ? input.palette : DEFAULT_SCENE.palette,
    petals: Math.round(number(input.petals, DEFAULT_SCENE.petals, 0, 90)),
    glow: number(input.glow, DEFAULT_SCENE.glow, 0, 1),
    camera: number(input.camera, DEFAULT_SCENE.camera, 0, 1),
    rhythm: number(input.rhythm, DEFAULT_SCENE.rhythm, 0, 1)
  };
}
export function dimensions(format, preview = false) {
  const picked = FORMATS[format] || FORMATS.landscape;
  return preview ? { width: picked.width / 2, height: picked.height / 2 } : { ...picked };
}
export function easing(x) {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
}
export function frameState(scene, seconds) {
  const s = normalizeScene(scene), t = number(seconds, 0, 0, s.duration);
  const enter = easing(t / .72), exit = easing((s.duration - t) / .48);
  const progress = t / s.duration;
  const hits = [.26, .50, .74, 1.12, 1.90, 2.64];
  const pulse = Math.min(1, hits.reduce((sum, beat) => sum +
    Math.max(0, 1 - Math.abs(t - beat * s.duration / 3.2) / .12), 0) * s.rhythm);
  return { t, progress, alpha: Math.min(enter, exit), pulse,
    zoom: 1 + s.camera * (.075 - .065 * easing(progress)),
    sway: s.camera * Math.sin(t * 1.55) };
}
