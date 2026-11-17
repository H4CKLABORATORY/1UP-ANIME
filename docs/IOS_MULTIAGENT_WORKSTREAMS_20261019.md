# 1UP Anime — cuatro frentes de trabajo independientes (2026-10-19)

GitHub Actions ejecuta pruebas de los frentes en paralelo; **los jobs de CI no son cuatro agentes autónomos escribiendo código**.

| Rol / zona | Archivos reservados | Entrega verificable |
|---|---|---|
| Agente A — Intro/sonido | themes/cinematic-v3/*, themes/october-2026/theme.js | Intro original se reproduce automáticamente cuando la plataforma lo permite, botón SONIDO eliminado. En Safari audio audible no garantizado sin gesto; SwiftUI AVAudioSession permite el sonido de apertura al iniciar. |
| Agente B — Web captions | subtitle-studio.js/css, episode-player.js | Estilos Bangers/Arial/Moderna/Arcade, idioma español/inglés solo si existen tracks, no se inventan traducciones; prueba Node. |
| Integración y QA | .github/workflows/four-track-qa.yml, tests/*, AGENTS.md | Revisar CI independiente, Browser Acceptance, screenshots, colisiones de cambios, Pages y notas de lanzamiento. |

## Qué no puede quedar listo sin entradas
Se pueden visitar enlaces de proveedores oficiales con las condiciones del proveedor.

Su ejecución no depende del visitante ni se ejecuta automáticamente en una página GitHub Pages. Los estilos web se aplican a pistas WebVTT/nativas si el navegador las expone; no se controlan subtítulos de iframes externos.

## Flujo de entrega
1. Crear código en ramas por frente o rutas reservadas.
2. Probar cada módulo en jobs separados de GitHub Actions y el módulo SwiftUI en macOS.
