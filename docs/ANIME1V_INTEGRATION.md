# Anime1v API de FxxMorgan — 1UP ANIME

Estado: implementado para metadatos; backend externo todavía NO desplegado ni configurado.
Repositorio de origen: https://github.com/FxxMorgan/anime1v-api (MIT para el código; conservar créditos FxxMorgan).

## Módulos
- functions/anime1v-adapter.js: cliente de búsqueda y catálogo, con clave privada solo en servidor, límite de respuesta y caché.
- functions/index.js: Cloud Function opcional anime1vDiscovery; CORS limitado, validación de parámetros y cuota básica por instancia.
- anime1v-discovery.js, .css: panel de descubrimiento responsive en el catálogo, visible únicamente tras configurar el servicio.
- scripts/test-anime1v-integration.mjs: pruebas con respuestas simuladas; sin extracción de videos.

## Para activar el servicio en el futuro
1. Ejecutar una instancia de Anime1v de FxxMorgan en un servidor Node con dirección HTTPS. GitHub Pages no ejecuta Node ni Puppeteer.
2. Proteger la instancia de FxxMorgan con API_KEYS; si este valor no está definido, su middleware podría aceptar cualquier clave no vacía.
3. Registrar la clave privada en Firebase con: firebase functions:secrets:set ANIME1V_API_KEY
5. Desplegar con: firebase deploy --only functions:anime1vDiscovery
6. Copiar la URL HTTPS REAL de la Cloud Function a data/anime1v-config.json y establecer enabled=true.
7. Probar el formulario en el catálogo en iPhone y escritorio, y conservar la búsqueda AniList/Jikan como respaldo.

## Contrato público
Operaciones de solo lectura:
- kind=search: búsqueda de nombres en proveedores admitidos.
- kind=catalog: catálogo por página para proveedores disponibles.

## Seguridad y limitaciones
Claves en el servidor; sin URLs arbitrarias del visitante; se rechazan redirecciones; máximo 30 resultados y cuerpo de JSON limitado.
Esta implementación no despliega la instancia API ni el proyecto Firebase.

## Continuidad
Conservar diseño Kokomi de Codex y logo MP4. Ver AGENTS.md y docs/PROJECT_CONTINUITY.md; registrar el estado real antes de fusionar o desplegar.

## Actualización 17/10/2026 — Backend Anime1v real
- Se ha instalado una versión restringida del módulo de búsqueda/catalogación del repositorio FxxMorgan en Render. El gateway del sitio usa la URL y una clave privada desde su entorno, no desde el frontend.
- La prueba pública de Naruto devolvió `source: anime1v` y 17 resultados: [acción verificada](https://github.com/H4CKLABORATORY/1UP-ANIME/actions/runs/39055363500).
