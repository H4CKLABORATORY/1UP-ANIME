# OMEGA MEMORY — memoria portable de 1UP Anime

Actualización inicial: 2026-10-16. Archivo compartido para Codex/otras IA que trabajen **en este repositorio**. Se revisa al iniciar una tarea y se modifica en cambios materiales; no representa la memoria interna de ChatGPT ni el historial completo de chats.

## Propósito y restricciones
- Plataforma de anime original orientada a comunidad: gratuitamente accesible, presupuesto inicial **USD 0**; no activar facturación.
- El usuario busca una web real, grande, rápida, estética y completa; valora ejecución proactiva, investigación profunda, soluciones ingeniosas y documentación exhaustiva.
- Quiere una IA que preserve contexto continuamente, reutilice lo aprendido y mejore sus procedimientos. Crear registros versionados; jamás fingir memoria persistente si no hay escritura real.
- Idioma predeterminado español, instrucciones directas y exhaustivas. Preferir ejecutar antes de simplemente asesorar, siempre dentro de accesos reales.
- Preferencia de diseño registrada: **línea visual de Codex + Kokomi**, no volver a una maqueta Nebula más simple. Identidad independiente 1UP; Halloween/magia como acentos sutiles de temporada.
- PWA compatible con iPhone/Safari, Android y PC; no sonido obligatorio y respetar reducción de movimiento.
- En episodio mostrar comentarios de ese episodio; permitir elegir hasta siete fuentes de video cuando estén registradas y sean válidas; seleccionar idioma, subtítulos, temporada y episodio; recuperación tras error y cambio manual.
- Catálogo de metadatos global, películas/OVA/ONA/especiales, búsqueda y temporadas; no confundir con medios disponibles.
- La «licencia universal» de Nébula es un artefacto de ficción, no da derechos de animes reales.

## Estado técnico verificado al 2026-10-16 (revalidar)
- Repositorio público H4CKLABORATORY/1UP-ANIME, rama `main`, commit observado actualizado `0f5df57560a3a7f5391b47ef4dca643889364a9e`.
- El workflow de GitHub Pages del commit anterior dio `success` (38908714690). No evidencia de video real.
- Árbol remoto inspeccionado: 194 entradas (incluye directorios) y 17 workflows bajo `.github/workflows/`.
- PR #23 fusionó mejoras: 7 posiciones, HLS/MP4/WebM, WebVTT idiomas, filtro de URL HTTPS públicas, botón manual para siguiente fuente. Tests UI/navegación/HLS/contrato con éxito.
- PRs #14, #18, #19, #20 son cadena de cambios de UI en revisión/draft (estado de consulta anterior); el logo animado fue fusionado en `main` posteriormente desde su línea de desarrollo. Verificar PRs actuales y evitar merges duplicados.
- `data/licensed-media.json` tiene `entries: {}`, sin episodios reales.
- `firebase-config.js`, `auth-config.js`, `social-config.js` y `supabase-config.js` tienen configuraciones null. Backend remoto no confirmado.
- `data/guild-license.json` tiene `universe_type: fictional_alternate_reality`. No aplicar a títulos reales.
- **ACTUALIZACIÓN post-snapshot:** commit `e4a8ef9d` integró intro original H.264/AAC ~3.2 s, poster JPG e icono PNG además de brand-signature.js/css. En árbol `main` actualizado ya aparecen. No asegurar que su reproducción en iPhone real haya sido verificada. PR #22 se había visto draft antes del merge: consultar estado actual.

## Árbol y arquitectura — fuente definitiva
- Frontend: `index.html`, `studio.html`, `studio.js`, `studio.css`, `spotlight.css`, `brand-v2.css`, `motion.css/js`.
- Kokomi: `themes/kokomi-studio/*`, `themes/kokomi-mobile-preview/*`, `preview-kokomi-mobile.html`; octubre: `themes/october-2026/*`.
- Multimedia: `episode-player.js`, `hls-adapter.js`, `episode-comments.js`, `player.css`, `data/licensed-media.json`, `scripts/media-source-contract.mjs`.
- Social: `comunidad.html`, `community.js`, `social-backend.js`, `moderacion.*`, `auth.*`, `functions/index.js`, `firestore.rules`, SQL Supabase opcional.
- Contenido: `data/catalog.json`, `data/airing.json`, `data/translations-es.json`, `scripts/refresh-catalog.mjs`, `scripts/refresh-airing.mjs`.
- DevOps: `.github/workflows/*`, `scripts/oneup-guard.mjs`, `data/guard/*`, `scripts/dexter-anime-sync.mjs`.
- Lea expediente completo `docs/OMEGA_PROJECT_DOSSIER_20261016.md` (si existe) y `docs/PROJECT_CONTINUITY.md`; no basar cambios de detalle solo en este resumen.

## Protocolo actualización
Al terminar avances reales, añadir al final:
```
### [fecha UTC] — [tarea]
- Pedido:
- Estado previo:
- Cambio y rutas:
- Branch/commit/PR:
- Pruebas realmente ejecutadas:
- Decisión/criterio:
- Limitaciones y siguientes pasos:
```
Excluir secretos, datos personales irrelevantes, suposiciones no etiquetadas, promesas de segundo plano y contenido sin autorización.

### 2026-10-17 — 1UP Editorial Pro, avance de diseño aislado
- Pedido: estética profesional coherente; investigar patrones UX y mejorar la página sin rediseños infantiles/indiscriminados.
- Evidencia: se revisaron AGENTS, handoff, dirección artística y los temas Kokomi/Octubre. Se encontraron varias capas CSS vigentes; una nueva variante solo se acopla a `preview-kokomi-mobile.html`, sin cambiar `index.html`, datos o reproductor.
- Cambios: `themes/kokomi-mobile-preview/editorial-pro.css`, clase de activación en preview y `scripts/e2e-editorial-pro.mjs`; CI de Kokomi extendido. Paleta editorial propia, poster framing, espaciado, CTA, mobile input 16px, foco visible y reduced-motion.
- Pruebas locales: validación estructural preliminar del código; las verificaciones Chromium/CI del branch se deben consultar antes de afirmar PASS. Safari real y aprobación visual aún pendientes.
- Próximo paso: revisar capturas de 320/390/1366 y CI, corregir hallazgos y presentar antes/después; no fusionar sin QA y aprobación.
