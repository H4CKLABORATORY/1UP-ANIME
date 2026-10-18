document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("depth-toggle");
  if (!btn) return;

  btn.classList.toggle("active", DepthEngine.isEnabled());

  btn.addEventListener("click", () => {
    const isOn = DepthEngine.toggle();
    btn.classList.toggle("active", isOn);
    btn.title = isOn ? "Desactivar modo profundidad" : "Activar modo profundidad";
  });
});
