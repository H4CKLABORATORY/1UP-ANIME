import { PALETTES, normalizeScene, frameState, dimensions } from './scene.mjs';

const TWO_PI = Math.PI * 2;
const fract = n => n - Math.floor(n);
const rand = n => fract(Math.sin(n * 127.1 + 78.233) * 43758.5453);
const rgba = (hex, a) => {
  const n = Number.parseInt(hex.slice(1), 16);
  return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
};
export function createRenderer(canvas) {
  if (!canvas || typeof canvas.getContext !== 'function') throw Error('Canvas requerido');
  const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
  if (!ctx) throw Error('Canvas 2D no disponible');
  const logo = new Image();
  let ready = false;
  async function load() {
    logo.src = new URL('../assets/oneup-header-letters.png', import.meta.url).href;
    try { await logo.decode(); ready = logo.naturalWidth > 0; }
    catch { ready = false; }
    return ready;
  }
  function size(format = 'landscape', preview = true) {
    const target = dimensions(format, preview);
    canvas.width = target.width;
    canvas.height = target.height;
    return target;
  }
  function render(source, seconds) {
    const s = normalizeScene(source), state = frameState(s, seconds);
    const { width: w, height: h } = canvas;
    const short = Math.min(w, h), portrait = h > w;
    const palette = PALETTES[s.palette];
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.shadowBlur = 0;
    const base = ctx.createLinearGradient(0, 0, w, h);
    base.addColorStop(0, palette[0]); base.addColorStop(.55, '#050b18');
    base.addColorStop(1, palette[1]);
    ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
    ctx.save();
    const cx = w * .5, cy = h * (portrait ? .435 : .43);
    const aura = ctx.createRadialGradient(cx, cy, 0, cx, cy, short * 1.0);
    aura.addColorStop(0, rgba(palette[1], .6 * state.alpha));
    aura.addColorStop(.48, rgba(palette[2], .115 * s.glow));
    aura.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = aura; ctx.fillRect(0, 0, w, h);
    ctx.translate(cx, cy);
    ctx.scale(state.zoom, state.zoom);
    ctx.rotate(state.sway * .025);
    ctx.globalCompositeOperation = 'screen';
    for (let ring = 0; ring < 4; ring++) {
      const radius = short * (.255 + ring * .095);
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * (portrait ? .90 : 1.25), radius * .41,
        ring * .27 + state.t * (ring % 2 ? -.12 : .15), 0, TWO_PI);
      ctx.lineWidth = Math.max(1.5, short * (.0015 + ring * .0003));
      ctx.strokeStyle = rgba(palette[ring % 2 ? 3 : 2],
        state.alpha * (.26 + state.pulse * .20) * s.glow / (1 + ring * .22));
      ctx.shadowColor = palette[2]; ctx.shadowBlur = short * .023 * s.glow;
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    for (let i = 0; i < s.petals; i++) {
      const depth = .32 + rand(i + 1) * 1.15;
      const travel = state.t * (.04 + .047 * depth);
      const x = (fract(rand(i * 3 + 21) + travel * (i % 2 ? 1 : -.5)) - .5) * w * 1.16;
      const y = (fract(rand(i * 7 + 9) + travel * .75) - .5) * h * 1.22;
      const r = short * (.0018 + rand(i + 42) * .0045) * depth;
      ctx.save(); ctx.translate(x, y);
      ctx.rotate(state.t * .47 + rand(i * 13) * TWO_PI);
      ctx.fillStyle = rgba(i % 4 ? palette[2] : palette[3], Math.min(.8, state.alpha * (.18 + depth * .25)));
      ctx.shadowBlur = short * .008 * s.glow; ctx.shadowColor = palette[3];
      // Independent original petal geometry; not extracted anime artwork.
      ctx.beginPath(); ctx.moveTo(0, -r * 1.7);
      ctx.bezierCurveTo(r * 1.6, -r, r * 1.2, r * 1.4, 0, r * 1.9);
      ctx.bezierCurveTo(-r * 1.4, r * .5, -r * .9, -r, 0, -r * 1.7);
      ctx.fill(); ctx.restore();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.shadowColor = palette[2]; ctx.shadowBlur = short * .042 * s.glow * (.6 + state.pulse);
    ctx.globalAlpha = state.alpha;
    const maxLogoW = w * (portrait ? .82 : .57);
    const naturalRatio = ready ? logo.naturalHeight / logo.naturalWidth : .28;
    const lw = maxLogoW, lh = Math.min(short * .30, lw * naturalRatio);
    if (ready) {
      ctx.drawImage(logo, -lw / 2, -lh / 2 - short * .085, lw, lh);
    } else {
      ctx.fillStyle = '#effffb';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '900 ' + Math.round(short * .135) + 'px sans-serif';
      ctx.fillText('1UP ANIME', 0, -short * .085);
    }
    ctx.restore();
    ctx.globalAlpha = state.alpha;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = rgba(palette[2], .3); ctx.shadowBlur = short * .018 * s.glow;
    const titleY = h * (portrait ? .68 : .74);
    ctx.fillStyle = '#f6fffc';
    ctx.font = '900 ' + Math.round(short * (portrait ? .062 : .052)) + 'px system-ui, sans-serif';
    ctx.fillText(s.title, w * .5, titleY, w * .91);
    ctx.fillStyle = palette[2]; ctx.shadowBlur = 0;
    ctx.font = '900 ' + Math.round(short * (portrait ? .080 : .060)) + 'px system-ui, sans-serif';
    ctx.fillText(s.subtitle, w * .5, titleY + short * (portrait ? .092 : .072), w * .91);
    ctx.fillStyle = '#d9e4e9';
    ctx.font = '600 ' + Math.round(short * .023) + 'px system-ui, sans-serif';
    ctx.fillText(s.tagline, w * .5, titleY + short * (portrait ? .18 : .143), w * .9);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = rgba(palette[3], .42 * state.alpha);
    ctx.lineWidth = Math.max(1, short * .002);
    ctx.beginPath();
    ctx.moveTo(w * .25, h * .92); ctx.lineTo(w * .75, h * .92); ctx.stroke();
  }
  return { load, size, render, hasLogo: () => ready, getCanvas: () => canvas };
}
