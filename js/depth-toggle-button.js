document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("depth-toggle");
  if (!btn) return;

  // The Kokomi drawer and palette section are mounted dynamically.
  const drawer = document.getElementById("km-drawer");
  const palette = drawer?.querySelector(".oneup-theme-drawer");
  if (palette) palette.before(btn);
  else if (drawer) drawer.append(btn);
  btn.hidden = !drawer;

  function sync(isOn) {
    btn.classList.toggle("active", isOn);
    btn.setAttribute("aria-pressed", String(isOn));
    btn.title = isOn ? "Desactivar modo profundidad" : "Activar modo profundidad";
  }

  sync(DepthEngine.isEnabled());
  btn.addEventListener("click", () => sync(DepthEngine.toggle()));
});
