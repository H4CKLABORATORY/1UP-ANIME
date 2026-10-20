import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext, Script } from 'node:vm';

const js = readFileSync('js/dexter-motion-engine.js', 'utf8');
const css = readFileSync('styles/dexter-motion-engine.css', 'utf8');
const html = readFileSync('index.html', 'utf8');
const sw = readFileSync('sw.js', 'utf8');

function boot({ reduced = false, fine = true, hidden = false, saveData = false } = {}) {
  const entries = [];
  const listeners = {};
  const animations = [];
  const io = [];
  let watched = [];
  const classes = new Set();
  const vars = new Map();
  const hero = {
    style: { setProperty: (key, value) => vars.set(key, value) },
    classList: { add: x => classes.add(x), remove: x => classes.delete(x) },
    querySelector: () => null,
    setAttribute() {},
    appendChild(el) { this.child = el; },
    addEventListener(name, fn) { listeners['hero:' + name] = fn; },
    getBoundingClientRect: () => ({ left: 10, top: 20, width: 200, height: 300 })
  };
  const makeCard = () => ({
    isConnected: true, hidden: false,
    animate(frames, settings) {
      const animation = { frames, settings, cancelled: false,
        cancel() { this.cancelled = true; }, finished: Promise.resolve() };
      animations.push(animation);
      return animation;
    }
  });
  const cards = [makeCard(), makeCard()];
  const hosts = new Map([
    ['#oneup-finale-deck', {}], ['#trending-rail', {}], ['#browse-grid', {}]
  ]);
  const media = new Map();
  function matchMedia(query) {
    if (!media.has(query)) media.set(query, {
      matches: query.includes('reduced-motion') ? reduced : fine,
      addEventListener(name, cb) { this.listener = cb; }
    });
    return media.get(query);
  }
  class MockIntersectionObserver {
    constructor(cb) { this.cb = cb; io.push(this); }
    observe(el) { if (!watched.includes(el)) watched.push(el); }
    unobserve(el) { watched = watched.filter(x => x !== el); }
    fire(el) { this.cb([{ target: el, isIntersecting: true }]); }
  }
  class MockMutationObserver {
    constructor(cb) { this.cb = cb; }
    observe() {}
  }
  const document = {
    readyState: 'complete', hidden,
    body: { classList: { contains: () => false } },
    createElement: () => ({ className: '', setAttribute() {} }),
    querySelector: selector => selector === '#home-screen .hero-art-card'
      ? hero : hosts.get(selector) || null,
    querySelectorAll: () => cards,
    addEventListener(name, cb) { listeners[name] = cb; }
  };
  const window = { matchMedia, IntersectionObserver: MockIntersectionObserver,
    MutationObserver: MockMutationObserver,
    requestAnimationFrame(cb) { cb(); return 1; },
    cancelAnimationFrame() {} };
  const navigator = { connection: { saveData } };
  runInNewContext(js, { document, window, navigator,
    IntersectionObserver: MockIntersectionObserver,
    MutationObserver: MockMutationObserver });
  return { window, document, cards, animations, hero, listeners, io, vars, classes,
    watched: () => watched, media, addCard: () => { const c = makeCard(); cards.push(c); return c; } };
}

test('source compiles and is loaded by the public shell and offline cache', () => {
  assert.doesNotThrow(() => new Script(js));
  assert.match(html, /src="\.\/js\/dexter-motion-engine\.js"/);
  assert.match(html, /href="\.\/styles\/dexter-motion-engine\.css"/);
  assert.match(sw, /\.\/js\/dexter-motion-engine\.js/);
  assert.match(sw, /\.\/styles\/dexter-motion-engine\.css/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.doesNotMatch(js, /https?:\/\//);
});

test('visible elements animate once without changing card transforms', () => {
  const ui = boot();
  assert.equal(ui.io.length, 1);
  assert.equal(ui.watched().length, 2);
  ui.io[0].fire(ui.cards[0]);
  ui.io[0].fire(ui.cards[0]);
  assert.equal(ui.animations.length, 1);
  assert.deepEqual(Array.from(ui.animations[0].frames, f => Object.keys(f)), [['opacity'], ['opacity']]);
});

test('reduced motion, Save-Data and disabled mode prevent effects', () => {
  for (const options of [{ reduced: true }, { saveData: true }]) {
    const ui = boot(options);
    ui.io[0].fire(ui.cards[0]);
    assert.equal(ui.animations.length, 0);
    assert.equal(ui.window.DexterMotionEngine.isMotionAllowed(), false);
  }
  const ui = boot();
  assert.equal(ui.window.DexterMotionEngine.setEnabled(false), false);
  ui.io[0].fire(ui.cards[0]);
  assert.equal(ui.animations.length, 0);
});

test('pointer spotlight is desktop-only and never intercepts input', () => {
  const desktop = boot();
  assert.equal(desktop.hero.child.className, 'dme-light');
  desktop.listeners['hero:pointermove']({ clientX: 110, clientY: 170 });
  assert.equal(desktop.vars.get('--dme-light-x'), '50.0%');
  assert(desktop.classes.has('dme-lit'));
  desktop.window.DexterMotionEngine.setEnabled(false);
  assert(!desktop.classes.has('dme-lit'));
  const mobile = boot({ fine: false });
  mobile.listeners['hero:pointermove']({ clientX: 110, clientY: 170 });
  assert(!mobile.classes.has('dme-lit'));
});

test('dynamically rendered cards are picked up without a second boot', () => {
  const ui = boot();
  const dynamicCard = ui.addCard();
  assert.equal(ui.window.DexterMotionEngine.refresh(), 1);
  assert(ui.watched().includes(dynamicCard));
});
