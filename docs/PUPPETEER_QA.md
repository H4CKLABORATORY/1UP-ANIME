# Puppeteer en 1UP Anime

## Objetivo

Puppeteer se añadió como **dependencia de desarrollo** (`puppeteer@25.14.0`) para automatizar la inspección de la web estática. No se inyecta en `index.html`, no corre en GitHub Pages, no solicita datos de usuarios y no agrega servidores públicos.

- Paquete oficial: https://github.com/puppeteer/puppeteer (Apache-2.0).
- Script: `scripts/puppeteer-site-audit.mjs`.
- Ejecución automática: `.github/workflows/puppeteer-quality.yml`.
- Resultados: artefacto `oneup-puppeteer-visual-audit` en GitHub Actions (7 días).

## Ejecución manual

```bash
npm install --ignore-scripts
npx puppeteer browsers install chrome-headless-shell
npm run test:puppeteer
```

Se ejecuta contra un servidor HTTP temporal en `127.0.0.1` y bloquea peticiones externas. Esto evita tocar Firebase, APIs o sitios ajenos. Genera capturas y `report.json` en `artifacts/puppeteer/`.

## Qué comprueba
- Catálogo, Comunidad, Motor, Moderación y Gremio a 390 y 1365 píxeles.
- Carga HTTP, título de la página, CSS de calidad y desbordamientos horizontales.
- Flujo de abrir/cerrar acceso y entrada como invitado.
- Excepciones JavaScript no controladas en el navegador.
- Capturas de portada, comunidad y modal de acceso.

## Límites

No es un robot ejecutándose continuamente en GitHub Pages. Se activa por eventos de GitHub Actions o manualmente. El navegador es Chrome Headless Shell, no Safari real. Para probar Firebase, sesiones remotas, publicaciones, streams o autorizaciones de derechos se necesitan entornos configurados y pruebas adicionales; el script no los inventa ni los modifica.

La instalación del navegador puede usar descargas importantes en CI y debe respetar los límites gratuitos de GitHub Actions. Se utiliza `--ignore-scripts` en npm y la descarga explícita del navegador para minimizar ejecución de postinstalaciones de terceros.
