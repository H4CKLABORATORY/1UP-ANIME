# 1UP Anime · Contenedor de Scripts (Herramientas & Automatización)

Este contenedor reúne todas las utilidades de línea de comandos, tareas programadas de GitHub Actions, scripts de auditoría y motores de sincronización de **1UP Anime**.

---

## 1. Índice de Scripts

| Script | Lenguaje | Propósito | Comando de Ejecución |
| :--- | :--- | :--- | :--- |
| `serve-client.mjs` | Node.js | Servidor HTTP estático ultraligero que sirve `client/` como raíz con resolución automática de rutas. | `node scripts/serve-client.mjs 8765` |
| `oneup-guard.mjs` | Node.js | Motor principal de salud y auto-recuperación; audita 48 puntos críticos del sistema. | `node scripts/oneup-guard.mjs --offline` |
| `check-guard.mjs` | Node.js | Valida el esquema JSON y la integridad de los reportes en `data/guard/`. | `node scripts/check-guard.mjs` |
| `check-ui.mjs` | Node.js | Ejecuta 152 aserciones contractuales sobre selectores HTML, modales, PWA y estilos. | `node scripts/check-ui.mjs` |
| `check-resilience.mjs` | Node.js | Verifica que la interfaz responda con gracia ante desconexión o lentitud de red. | `node scripts/check-resilience.mjs` |
| `check-supabase-option.mjs` | Node.js | Audita la configuración desactivada por defecto y las políticas RLS de Supabase. | `node scripts/check-supabase-option.mjs` |
| `dexter-anime-sync.mjs` | Node.js | Motor incremental de sincronización de metadatos entre AniList, trailers y proveedores. | `node scripts/dexter-anime-sync.mjs --dry-run` |
| `refresh-catalog.mjs` | Node.js | Descarga metadatos públicos de AniList GraphQL y genera `data/catalog.json`. | `node scripts/refresh-catalog.mjs` |
| `refresh-airing.mjs` | Node.js | Sincroniza la ventana de transmisiones semanales y actualiza `data/airing.json`. | `node scripts/refresh-airing.mjs` |
| `render-motion-studio.mjs` | Node.js | Renderizador determinista de escenas Canvas a video MP4 Full HD (H.264/AAC con FFmpeg). | `node scripts/render-motion-studio.mjs --help` |
| `update-new-chat-handoff.mjs` | Node.js | Regenera la ficha técnica determinista para continuidad entre sesiones (`docs/NEW_CHAT_HANDOFF.md`). | `node scripts/update-new-chat-handoff.mjs` |
| `verify-video-logo.mjs` | Node.js | Inspecciona átomos binarios (`ftyp`, `moov`, `mdat`, `avc1`, `mp4a`) de la firma de video de marca. | `node scripts/verify-video-logo.mjs` |
| `build-icons.py` | Python | Renderiza iconos PNG cuadrados para iPhone y PWA (180, 192, 512 px) desde el SVG de marca. | `python scripts/build-icons.py` |
| `scrape-encyclopedia-anime.py`| Python | Extractor educativo de metadatos estáticos desde páginas HTML de referencia. | `python scripts/scrape-encyclopedia-anime.py` |
| `generate-authorized-subtitles.py`| Python | Generador local de pistas WebVTT en español e inglés para medios licenciados. | `python scripts/generate-authorized-subtitles.py` |
| `oneup-safe-push.sh` | Bash | Script de publicación segura para flujos de GitHub Actions con rebase automático. | `bash scripts/oneup-safe-push.sh` |

---

## 2. Guía de Uso de Herramientas Clave

### 2.1 Servidor Local de Desarrollo (`serve-client.mjs`)
Permite previsualizar la aplicación exactamente como la verá el usuario en producción o en su iPhone:
```bash
node scripts/serve-client.mjs [puerto]
# Ejemplo: node scripts/serve-client.mjs 8765
```
Resuelve automáticamente URLs limpias hacia `client/pages/` (por ejemplo, `/comunidad.html` se sirve desde `client/pages/comunidad.html`).

### 2.2 Motor de Salud Guardián (`oneup-guard.mjs`)
Verifica sin conexión 48 puntos de salud del repositorio (archivos requeridos, sintaxis, service worker, manifiesto PWA, esquemas de catálogo y rutas):
```bash
node scripts/oneup-guard.mjs --offline --strict
```

### 2.3 Sincronización Incremental Dexter (`dexter-anime-sync.mjs`)
Ejecuta la conciliación de datos entre fuentes oficiales:
```bash
# Modo prueba sin escribir en disco:
node scripts/dexter-anime-sync.mjs --dry-run

# Modo persistente forzado:
node scripts/dexter-anime-sync.mjs --force
```

### 2.4 Renderizado de Video DEXTER Motion Studio (`render-motion-studio.mjs`)
Genera videos de alta resolución en formatos 16:9 (horizontal) o 9:16 (vertical para reels/historias de móvil):
```bash
# Renderizar intro horizontal Full HD (1920x1080):
node scripts/render-motion-studio.mjs --format landscape --fps 30 --out artifacts/intro-16x9.mp4

# Renderizar intro vertical Full HD (1080x1920):
node scripts/render-motion-studio.mjs --format portrait --fps 30 --out artifacts/intro-9x16.mp4
```
Requiere Playwright y FFmpeg instalados en el sistema.
