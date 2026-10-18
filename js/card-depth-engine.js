const CardDepthEngine = (() => {
  const intensity = { far: 10, mid: 20, front: 32 };
  const boundCards = new WeakSet();

  function bindCard(card) {
    if (boundCards.has(card)) return;
    boundCards.add(card);

    let targetRX = 0, targetRY = 0;
    let currentRX = 0, currentRY = 0;

    function loop() {
      if (!DepthEngine.isEnabled()) {
        card.style.transform = "none";
        card.querySelectorAll("[data-depth]").forEach(layer => {
          layer.style.transform = "";
        });
        requestAnimationFrame(loop);
        return;
      }

      currentRX += (targetRX - currentRX) * 0.15;
      currentRY += (targetRY - currentRY) * 0.15;

      card.style.transform =
        `perspective(700px) rotateX(${currentRX}deg) rotateY(${currentRY}deg)`;

      card.querySelectorAll("[data-depth]").forEach(layer => {
        const depth = layer.dataset.depth;
        const factor = intensity[depth] || 14;
        const moveX = (currentRY / 8) * factor;
        const moveY = (-currentRX / 8) * factor;
        const baseScale = layer.classList.contains("anime-card-img") ? 1.1 : 1;
        layer.style.transform =
          `translate3d(${moveX}px, ${moveY}px, 0) scale(${baseScale})`;
      });

      requestAnimationFrame(loop);
    }

    card.addEventListener("mousemove", (e) => {
      if (!DepthEngine.isEnabled()) return;
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      targetRX = ((y - cy) / cy) * -8;
      targetRY = ((x - cx) / cx) * 8;
    });

    card.addEventListener("mouseleave", () => {
      targetRX = 0;
      targetRY = 0;
    });

    requestAnimationFrame(loop);
  }

  function refresh() {
    document.querySelectorAll(".anime-card").forEach(bindCard);
  }

  document.addEventListener("DOMContentLoaded", refresh);

  return { refresh, bindCard };
})();
