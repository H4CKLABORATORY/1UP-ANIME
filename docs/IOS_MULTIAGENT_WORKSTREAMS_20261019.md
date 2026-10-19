# 1UP Anime — cuatro frentes de trabajo independientes (2026-10-19)

Se estructuró el proyecto por responsabilidades para que varios colaboradores/agentes conectados puedan trabajar sin pisarse. GitHub Actions ejecuta pruebas de los frentes en paralelo; **los jobs de CI no son cuatro agentes autónomos escribiendo código**. No afirmar que se han contratado o iniciado agentes de software adicionales.

| Rol / zona | Archivos reservados | Entrega verificable |
|---|---|---|
| Agente A — Intro/sonido | themes/cinematic-v3/*, themes/october-2026/theme.js | Intro original se reproduce automáticamente cuando la plataforma lo permite, botón SONIDO eliminado. En Safari audio audible no garantizado sin gesto; SwiftUI AVAudioSession permite el sonido de apertura al iniciar. |
| Agente B — Web captions | subtitle-studio.js/css, episode-player.js | Estilos Bangers/Arial/Moderna/Arcade, idioma español/inglés solo si existen tracks, no se inventan traducciones; prueba Node. |
| Agente C — iPhone nativo | ios/**, .github/workflows/ios-swiftui.yml | Proyecto SwiftUI XcodeGen, catálogo, favoritos, intro, AVPlayer, WebVTT, compilación iOS en runner Mac, firma/App Store por titular. |
| Agente D — Datos y contenidos | scripts/generate-authorized-subtitles.py, data/licensed-media.json, docs/AUTO_SUBTITLE_PIPELINE_20261019.md | Transcripción y traducción offline de fuentes autorizadas, comprobación del manifest y derechos. No scrapers de video ni falsos permisos. |
| Integración y QA | .github/workflows/four-track-qa.yml, tests/*, AGENTS.md | Revisar CI independiente, Browser Acceptance, screenshots, colisiones de cambios, Pages y notas de lanzamiento. |

## Qué no puede quedar listo sin entradas
Actualmente data/licensed-media.json tiene entries vacío. La extracción de metadatos (Wikipedia/AniList/Jikan) no permite inferir URL de media ni permisos; por ello el reproductor permanece sin episodios propios. Se pueden visitar enlaces de proveedores oficiales con las condiciones del proveedor.

El generador de subtítulos requiere un archivo legal, faster-whisper y modelos de traducción offline instalados. Su ejecución no depende del visitante ni se ejecuta automáticamente en una página GitHub Pages. Los estilos web se aplican a pistas WebVTT/nativas si el navegador las expone; no se controlan subtítulos de iframes externos.

## Flujo de entrega
1. Crear código en ramas por frente o rutas reservadas.
2. Probar cada módulo en jobs separados de GitHub Actions y el módulo SwiftUI en macOS.
3. Solo integrar con CI verde, comprobar Pages. Safari físico y compilación firmada necesitan intervención del titular.
4. **No afirmar App Store publicado ni 100 % de episodios.**
