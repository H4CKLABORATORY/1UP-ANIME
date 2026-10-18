const DepthEngine = (() => {
  const STORAGE_KEY = "oneup-depth-mode";
  let enabled = localStorage.getItem(STORAGE_KEY) !== "off";
  let targetX = 0, targetY = 0;

  const depthFactors = { far: 6, mid: 14, near: 24, front: 36 };

  function applyBodyState() {
    document.body.classList.toggle("depth-off", !enabled);
  }

  function handleMouseMove(e) {
    if (!enabled) return;
    const { innerWidth, innerHeight } = window;
    targetX = (e.clientX / innerWidth - 0.5) * 2;
    targetY = (e.clientY / innerHeight - 0.5) * 2;
  }

  function handleDeviceOrientation(e) {
    if (!enabled || e.beta === null) return;
    targetX = Math.max(-1, Math.min(1, e.gamma / 30));
    targetY = Math.max(-1, Math.min(1, (e.beta - 45) / 30));
  }

  function render() {
    document.querySelectorAll("[data-depth]").forEach(el => {
      if (el.closest(".anime-card")) return;
      const layer = el.dataset.depth;
      const factor = depthFactors[layer] || 10;
      const x = -targetX * factor;
      const y = -targetY * factor;
      el.style.transform = enabled
        ? `translate3d(${x}px, ${y}px, 0) scale(${layer === "front" ? 1.03 : 1})`
        : "none";
    });
    requestAnimationFrame(render);
  }

  function enableDepth() {
    enabled = true;
    localStorage.setItem(STORAGE_KEY, "on");
    applyBodyState();
    requestDeviceOrientationPermission();
  }

  function disableDepth() {
    enabled = false;
    localStorage.setItem(STORAGE_KEY, "off");
    applyBodyState();
  }

  function toggle() {
    enabled ? disableDepth() : enableDepth();
    document.dispatchEvent(new CustomEvent("depth-mode-changed", { detail: { enabled } }));
    return enabled;
  }

  function requestDeviceOrientationPermission() {
    if (typeof DeviceOrientationEvent !== "undefined" &&
        typeof DeviceOrientationEvent.requestPermission === "function") {
      DeviceOrientationEvent.requestPermission().then(state => {
        if (state === "granted") {
          window.addEventListener("deviceorientation", handleDeviceOrientation);
        }
      });
    } else {
      window.addEventListener("deviceorientation", handleDeviceOrientation);
    }
  }

  function init() {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) enabled = false;

    applyBodyState();
    window.addEventListener("mousemove", handleMouseMove);
    if (enabled) requestDeviceOrientationPermission();
    render();
  }

  return { init, toggle, isEnabled: () => enabled };
})();

document.addEventListener("DOMContentLoaded", DepthEngine.init);
