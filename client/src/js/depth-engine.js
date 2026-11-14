const DepthEngine = (() => {
  const STORAGE_KEY = "oneup-depth-mode";
  let enabled = false;
  try {
    enabled = localStorage.getItem(STORAGE_KEY) === "on";
  } catch {}
  let targetX = 0, targetY = 0;
  let currentX = 0, currentY = 0;
  let rafId = null;
  let cachedLayers = null;
  let orientationAttached = false;

  const depthFactors = { far: 6, mid: 14, near: 24, front: 36 };

  function applyBodyState() {
    document.body.classList.toggle("depth-off", !enabled);
  }

  function getLayers() {
    if (!cachedLayers) {
      cachedLayers = Array.from(document.querySelectorAll("[data-depth]"))
        .filter(el => !el.closest(".anime-card"))
        .map(el => ({
          el,
          layer: el.dataset.depth,
          factor: depthFactors[el.dataset.depth] || 10
        }));
    }
    return cachedLayers;
  }

  function invalidateCache() {
    cachedLayers = null;
  }

  function clearTransforms() {
    const layers = getLayers();
    for (let i = 0; i < layers.length; i++) {
      layers[i].el.style.transform = "";
    }
    targetX = 0;
    targetY = 0;
    currentX = 0;
    currentY = 0;
  }

  function handleMouseMove(e) {
    if (!enabled || document.hidden) return;
    const { innerWidth, innerHeight } = window;
    targetX = (e.clientX / innerWidth - 0.5) * 2;
    targetY = (e.clientY / innerHeight - 0.5) * 2;
    scheduleRender();
  }

  function handleDeviceOrientation(e) {
    if (!enabled || e.beta === null || document.hidden) return;
    targetX = Math.max(-1, Math.min(1, e.gamma / 30));
    targetY = Math.max(-1, Math.min(1, (e.beta - 45) / 30));
    scheduleRender();
  }

  function scheduleRender() {
    if (!enabled || rafId !== null || document.hidden) return;
    rafId = requestAnimationFrame(render);
  }

  function render() {
    rafId = null;
    if (!enabled || document.hidden) {
      clearTransforms();
      return;
    }

    currentX += (targetX - currentX) * 0.15;
    currentY += (targetY - currentY) * 0.15;

    const layers = getLayers();
    for (let i = 0; i < layers.length; i++) {
      const item = layers[i];
      const x = -currentX * item.factor;
      const y = -currentY * item.factor;
      item.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${item.layer === "front" ? 1.03 : 1})`;
    }

    const diff = Math.abs(targetX - currentX) + Math.abs(targetY - currentY);
    if (diff > 0.005) {
      rafId = requestAnimationFrame(render);
    }
  }

  function enableDepth() {
    enabled = true;
    try { localStorage.setItem(STORAGE_KEY, "on"); } catch {}
    applyBodyState();
    invalidateCache();
    requestDeviceOrientationPermission();
    scheduleRender();
  }

  function disableDepth() {
    enabled = false;
    try { localStorage.setItem(STORAGE_KEY, "off"); } catch {}
    applyBodyState();
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    clearTransforms();
  }

  function toggle() {
    enabled ? disableDepth() : enableDepth();
    document.dispatchEvent(new CustomEvent("depth-mode-changed", { detail: { enabled } }));
    return enabled;
  }

  function requestDeviceOrientationPermission() {
    if (orientationAttached) return;
    if (typeof DeviceOrientationEvent !== "undefined" &&
        typeof DeviceOrientationEvent.requestPermission === "function") {
      DeviceOrientationEvent.requestPermission().then(state => {
        if (state === "granted") {
          orientationAttached = true;
          window.addEventListener("deviceorientation", handleDeviceOrientation, { passive: true });
        }
      }).catch(() => {});
    } else if (typeof window !== "undefined" && "ondeviceorientation" in window) {
      orientationAttached = true;
      window.addEventListener("deviceorientation", handleDeviceOrientation, { passive: true });
    }
  }

  function init() {
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) enabled = false;

    applyBodyState();
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      } else if (!document.hidden && enabled) {
        scheduleRender();
      }
    }, { passive: true });

    if (enabled) {
      requestDeviceOrientationPermission();
      scheduleRender();
    }
  }

  return { init, toggle, isEnabled: () => enabled, invalidateCache };
})();

document.addEventListener("DOMContentLoaded", DepthEngine.init);
