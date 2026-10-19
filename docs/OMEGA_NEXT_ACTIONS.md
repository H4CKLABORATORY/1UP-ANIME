# OMEGA — próximas acciones verificables

Actualizado inicialmente 2026-10-16. No representa ejecución continua ni tareas en segundo plano.

1. **P0 — Comprobar integridad del deploy:** comprobar que el logo MP4/AAC integrado en main por `e4a8ef9d` y sus archivos JS/CSS/JPG/PNG resuelven sin 404, funcionan según política Safari y no introducen bloqueos. Confirmar despliegue vigente antes de tocar referencias.
2. **P0 — Conciliar cambios:** inspeccionar PR #14, #18, #19, #20 y el historial ya integrado de #22 y comprobar cuáles aportes siguen sin integrar tras PR #23; evitar merge en cadena automática.
3. **P0 — Reproductor:** mantener pruebas de hasta 7 posiciones, MP4/WebM/HLS, subtítulos, consentimiento de iframe, ruta sin fuentes, botón retry y sincronización de comentarios; falta video autorizado real y prueba Safari física.
4. **P1 — Comunidad:** configurar Firebase gratuito con autorización del titular; verificar auth y Firestore reglas, persistencia entre dispositivos, anti-spam y moderación. No inventar claves.
5. **P1 — UX/Catálogo:** revisar 22 rutas Kokomi y comparar móvil/escritorio; comprobar metadatos actuales, traducciones y filtros.
6. **P1 — QA/CI:** conservar workflows, validar links, accesibilidad, performance y documentación.
7. **Memoria:** al completar un avance relevante actualizar este archivo, `OMEGA_MEMORY.md` y `PROJECT_CONTINUITY.md` con SHA/evidencia y estado HONESTO.

Restricción: presupuesto $0, no compras/deploy destructivo sin permiso; no convertir metadatos o licencias ficticias en permiso de transmisión.


- [x] PR #31: reparar X del diálogo Overgeared en Safari móvil; CI Chromium 390px/desktop en verde. **Pendiente** confirmación tras GitHub Pages y en iPhone físico.

- [ ] **Tema Esmeralda para producción, PR #41:** comprobar CI `ONEUP Browser Acceptance` y tres resoluciones, fusionar solo sin conflictos y con pruebas verdes, confirmar despliegue GitHub Pages y que el selector Esmeralda/Original/Violeta realmente funcione en la URL pública. La intención del propietario es publicar mejoras probadas de forma continua, no desplegar cambios de alto riesgo o incompletos sin verificar. [Manual](ONEUP_COLOR_THEMES.md).


- [ ] **Motion profesional 1UP:** revisar PR de rama `feature/oneup-premium-window-motion-20261017`, prueba `scripts/e2e-oneup-motion.mjs`, aceptación navegador, render de modal/menú/rutas en móvil y desktop con y sin reducción. Fusionar sólo si CI y compatibilidad están correctos, comprobar main y despliegue real de GitHub Pages. Sin copiar estilos comerciales protegidos.

- [ ] **Enlaces oficiales en estrenos:** revisar `feature/official-crunchyroll-links-20261018` y el workflow `ONEUP Official Watch Links`; comparar título y URL, comprobar en iPhone/desktop, fusionar solo con CI aprobado. Revisar conflictos con PR #46 (ambos tocan `index.html` y `sw.js`). Después comprobar redirecciones reales y refresco `data/airing.json` de AniList. Los capítulos internos requieren fuentes y derechos independientes.
