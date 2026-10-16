# Auditoría estática de referencias visuales y scripts — 2026-10-16

Comparación literal de referencias `./...` en `index.html`, `preview-kokomi-mobile.html`, y `manifest.webmanifest` frente al árbol `main`. **Un recurso faltante en main puede existir en otra rama, o generarse externamente**. El inventario no demuestra que el recurso sea solicitado en tiempo de ejecución ni el impacto visual. Revisar antes de fusionar.

| Desde | Referencia sin archivo idéntico en main |
|---|---|

Conserva marca vigente `assets/oneup-crest.svg`. No sustituir logo por error. PR #22 mantiene activos de firma de marca sin fusionar. Inspeccionar ramas en vez de borrar referencias a ciegas.
