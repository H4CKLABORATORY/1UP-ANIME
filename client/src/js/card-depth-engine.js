const CardDepthEngine = (() => {
  const intensity = { far: 10, mid: 20, front: 32 };
  const boundCards = new WeakSet();
  const activeCards = new Set();

  function bindCard(card) {
    if (!card || boundCards.has(card)) return;
    boundCards.add(card);

    let targetRX = 0, targetRY = 0;
    let currentRX = 0, currentRY = 0;
    let rafId = 0;
    let isHovered = false;
    let cachedLayers = null;

    function getLayers() {
      if (!cachedLayers) {
        cachedLayers = Array.from(card.querySelectorAll("[data-depth]")).map(layer => ({
          el: layer,
          depth: layer.dataset.depth,
          factor: intensity[layer.dataset.depth] || 14,
          baseScale: layer.classList.contains("anime-card-img") ? 1.1 : 1
        }));
      }
      return cachedLayers;
    }

    function resetStyles() {
      card.style.transform = "";
      const layers = getLayers();
      for (let i = 0; i < layers.length; i++) {
        layers[i].el.style.transform = "";
      }
    }

    function tick() {
      rafId = 0;
      if (!DepthEngine.isEnabled()) {
        resetStyles();
        activeCards.delete(stopLoop);
        return;
      }

      currentRX += (targetRX - currentRX) * 0.15;
      currentRY += (targetRY - currentRY) * 0.15;

      const diffX = Math.abs(targetRX - currentRX);
      const diffY = Math.abs(targetRY - currentRY);

      if (!isHovered && diffX < 0.03 && diffY < 0.03 && Math.abs(currentRX) < 0.03 && Math.abs(currentRY) < 0.03) {
        // Card has smoothly settled back to rest position
        resetStyles();
        currentRX = 0;
        currentRY = 0;
        activeCards.delete(stopLoop);
        return;
      }

      card.style.transform =
        `perspective(700px) rotateX(${currentRX.toFixed(2)}deg) rotateY(${currentRY.toFixed(2)}deg)`;

      const layers = getLayers();
      for (let i = 0; i < layers.length; i++) {
        const item = layers[i];
        const moveX = (currentRY / 8) * item.factor;
        const moveY = (-currentRX / 8) * item.factor;
        item.el.style.transform =
          `translate3d(${moveX.toFixed(1)}px, ${moveY.toFixed(1)}px, 0) scale(${item.baseScale})`;
      }

      rafId = requestAnimationFrame(tick);
    }

    function startLoop() {
      if (!rafId && DepthEngine.isEnabled()) {
        activeCards.add(stopLoop);
        rafId = requestAnimationFrame(tick);
      }
    }

    function stopLoop() {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
      resetStyles();
    }

    card.addEventListener("mousemove", (e) => {
      if (!DepthEngine.isEnabled()) return;
      isHovered = true;
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      targetRX = ((y - cy) / cy) * -8;
      targetRY = ((x - cx) / cx) * 8;
      startLoop();
    }, { passive: true });

    card.addEventListener("mouseleave", () => {
      isHovered = false;
      targetRX = 0;
      targetRY = 0;
      if (currentRX !== 0 || currentRY !== 0) {
        startLoop();
      }
    }, { passive: true });
  }

  function refresh() {
    document.querySelectorAll(".anime-card").forEach(bindCard);
  }

  document.addEventListener("DOMContentLoaded", refresh);
  document.addEventListener("depth-mode-changed", (e) => {
    if (!e.detail?.enabled) {
      activeCards.forEach(stop => stop());
      activeCards.clear();
      document.querySelectorAll(".anime-card").forEach(card => {
        card.style.transform = "";
        card.querySelectorAll("[data-depth]").forEach(l => l.style.transform = "");
      });
    }
  });

  return { refresh, bindCard };
})();
