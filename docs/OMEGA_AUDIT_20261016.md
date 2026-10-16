# OMEGA CORE — auditoría y primer ciclo, 2026-10-16

## Bases comprobadas
- main: `85ef0988777d2bada5d5bc346abd618b5fe61989`.
- PR #15: `eb3e2276b8c2e966291fae9d136de9da407e2526`; misión y tablero leídos y preservados en esta rama.
- Issue #16 leído. PR #14: `09e8fa275d22ffb4dd53db248ee0366dd1601e70`, abierto en borrador.
- `git diff main...review/pr14 --stat`: 12 archivos aditivos, 1416 líneas. La comparación de extremos incluye desfase con main y no debe interpretarse como propuesta de borrar el reproductor actual.
- Seis subagentes reales: visual, frontend, media, data, qa e infra. OMEGA CORE integra; propiedad de archivos separada. No se modificó main ni se ejecutó despliegue.

## Capacidades y diferencias reales
- main conserva catálogo AniList/Jikan/snapshot, favoritos/perfiles/progreso locales, PWA, reproductor de episodios con siete posiciones, HLS y comentarios opcionales.
- `data/licensed-media.json` sigue vacío; ningún servidor ni idioma real puede anunciarse disponible. Firebase y Supabase no configurados. No hay prueba de autenticación, persistencia remota o reproducción real.
- PR #14 conserva diseño Kokomi, 22 rutas y conversación visual. Su preview no carga `episode-player.js`/`hls-adapter.js`: duplica reproducción nativa en `themes/kokomi-mobile-preview/pages.js`. Antes de integrar debe adoptar el contrato actual, limitar ocho posiciones a siete y ofrecer idiomas según pistas reales.
- La demo original `https://kokomi.soulknightweb.com/` respondió HTTP 200 durante la auditoría. Esto actualiza la observación previa de 502; no acredita comparación visual ni fidelidad exacta.
- Portadas, branding y temas existentes se preservan. No se incorporaron recursos comerciales.

## Defectos corregidos en este ciclo
- `episode-player.js`: el reproductor anterior se libera antes de esperar otro manifiesto; MP4/WebM también se pausan y liberan al cerrar/cambiar, además de HLS.
- `studio.js`: navegar invalida solicitudes pendientes, evitando que catálogo tardío sobrescriba Mi lista, inicio o programación.
- `episode-comments.js`: un solo manejador de reportes y aislamiento de respuestas asíncronas entre fichas.
- `.github/workflows/firebase-deploy.yml`: ejecución manual desde otra rama ya no puede desplegar ni publicar ajustes sobre main. No se ejecutó ese workflow.
- Regresiones nuevas integradas en UI Quality. Fixtures locales no añaden medios ni usuarios al producto.

## Pendientes priorizados
1. Integrar el diseño PR #14 con el motor de main en otra rama; comparar origen y capturas 390 px/escritorio antes de aprobación visual.
2. Alinear normalización runtime/contrato: URLs públicas HTTPS, MIME, idioma/calidad heredados y subtítulos por fuente. No confundir declaración `authorized` con evidencia de licencia.
3. Corregir ranking populares del snapshot (`fromSnapshot` usa trending), mostrar fecha de actualización y validar enteros de episodio en comentarios.
4. Limitar limpieza de caché del SW al espacio propio; comprobar PWA con HTTPS y offline real, que la suite HTTP no cubre.
5. Configuración del propietario y pruebas reales de backend y medios; Safari iPhone físico sigue no verificado.

## Coordinación siguiente
Un escritor por módulo y revisión QA posterior redujeron conflictos. Mantener máximo cuatro frentes de escritura. La próxima iteración visual debe partir de los cambios aditivos del PR #14, no reemplazar main por su rama desactualizada.

## Evidencia local
- `node scripts/test-episode-player.mjs`, `node scripts/test-navigation-race.mjs`, `node scripts/test-episode-comments.mjs`: PASS.
- `node scripts/check-ui.mjs` (149 assertions), `node scripts/check-resilience.mjs`, `node scripts/check-hls-browser.mjs`, `node scripts/test-media-source-contract.mjs`, `node scripts/check-supabase-option.mjs`: PASS.
- `node scripts/e2e-browser.mjs`: 36/36 PASS, Chromium 390×844 y 1360×860, cero excepciones JavaScript; capturas e2e en artefactos CI. Sin dependencia de API externa para pasar.
- YAML Firebase validado y `git diff --check` PASS. CI remoto se informa por separado en el PR.
- Revisión de seguridad pendiente antes de activar comunidad: Storage permite lecturas públicas de postUploads aunque una publicación esté pendiente de moderación; revisar reglas/flujo y cobertura con emulador. No se activó backend.
