# DEXTER Motion Studio · editor y MP4 para 1UP Anime

Creado 2026-10-20. Editor independiente; no sustituye la intro vigente ni los reproductores.

## Fases implementadas
1. Escena Canvas por capas con pétalos, iluminación, anillos, efectos de cámara y logo propio.
2. Textos, tema cromático, duración 2–8 segundos, partículas, resplandor, pulso musical, cronología y JSON editable con importación y exportación.
3. Dos composiciones separadas Full HD: 1920×1080 (16:9) y 1080×1920 (9:16). Vista previa a mitad de resolución.
4. Descarga de video sin audio desde el navegador cuando MediaRecorder permite captureStream. El formato depende del navegador y no se promete en Safari.
5. MP4 real con H.264 y AAC del video de firma original, renderizado desde Canvas en Chromium y codificado con FFmpeg.
6. Pruebas unitarias, navegador en 390 y 1366 píxeles, render smoke e inspección FFprobe. GitHub Actions publica dos MP4 en artifacts en main.

## Uso
- Editor web: https://h4cklaboratory.github.io/1UP-ANIME/dexter-motion-studio.html
- GitHub: https://github.com/H4CKLABORATORY/1UP-ANIME
- Actions: https://github.com/H4CKLABORATORY/1UP-ANIME/actions/workflows/dexter-motion-studio.yml
- En Actions: elegir DEXTER Motion Studio, Run workflow, y descargar el artefacto llamado dexter-motion-studio-h264-aac-16x9-9x16, una vez exitoso. También se generan ambos videos en un push que afecte estos archivos en main.

Para usar la escena descargada en PC o CI (Node 22, Playwright/Chromium y FFmpeg instalados):
  npm install --no-save playwright@1.56.1
  npx playwright install chromium
  node scripts/render-motion-studio.mjs --scene ./mi-escena.json --format landscape --out ./output/intro-pc.mp4
  node scripts/render-motion-studio.mjs --scene ./mi-escena.json --format portrait --out ./output/intro-iphone.mp4

El runner de Actions toma el archivo de escena presente en GitHub. Guardar un JSON local en iPhone no lo sube automáticamente al repositorio.

## Procedencia
- Se conserva assets/oneup-header-letters.png y assets/1up-anime-intro-firma-3seg.mp4 sin reemplazarlos.
- Las flores procedurales no proceden de anime protegido. Ningún episodio, personaje, música externa, token ni cookie se extrae.
- Referencias: https://github.com/yihui-dev/awesome-opus5-5-videos, https://github.com/greensock/GSAP, https://github.com/mrdoob/three.js, https://github.com/theatre-js/theatre, https://github.com/motiondivision/motion.
- La implementación carga Canvas2D, ESM, Playwright y FFmpeg sin incluir bibliotecas comerciales en la portada pública.

## Límites
- La grabación del navegador es silenciosa; el exportador MP4 del runner añade el audio original, repitiéndolo si la escena supera los 3,2 segundos.
- Chromium responsive no equivale a Safari físico; la prueba de batería y FPS móviles es posterior.
- Este módulo NO sustituye la intro publicada hasta una revisión visual del propietario.
- Antes de afirmar la entrega final, verificar CI, merge, artifacts y despliegue real.

## Checkpoint
Rama inicial: feature/dexter-cinematic-studio-and-mp4-20261020.
Nuevos: dexter-motion-studio.html, motion-studio/scene.mjs, renderer.mjs, app.mjs, studio.css; scripts/render-motion-studio.mjs, scripts/e2e-motion-studio.mjs; tests/motion-studio.test.mjs; workflow dexter-motion-studio.yml.
Modificados: index.html, sw.js, package.json, archivos de continuidad.
Siguiente: corregir CI; inspeccionar browser evidence; fusionar solo con pruebas verdes; comprobar artifacts Full HD; prueba Safari.
