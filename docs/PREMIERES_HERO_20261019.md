# 1UP Anime — Carrusel cinematográfico de estrenos (19/10/2026)

## Encargo visual
El propietario compartió una grabación móvil de una aplicación de anime con carteles hero grandes, botones y rotación de portadas. La inspiración es su **jerarquía y facilidad de uso**, no un clon. El diseño 1UP debe superarla en claridad visual, controles accesibles, información de emisión contrastable e identidad original verde esmeralda/negro.

## Implementación
- `premiere-ranking.js` — función pura, zona horaria local del visitante; prioriza emisiones programadas para **hoy**, series estrenadas en los últimos 14 días, próximas emisiones dentro de 10 días y series de temporada activas. Solo usa registros con identificador e imagen y evita duplicados. Selecciona hasta siete.
- `premiere-hero.js` — escucha `oneup-airing-ready` del calendario existente; si el evento no llega, lee **el mismo** `data/airing.json` almacenado. No abre nuevos scrapers ni consulta servidores ilegales. Usa `OneUpCatalog.feature`, que muestra la ficha correcta sin registrar selecciones automáticas como favoritos.
- `premiere-hero.css` — botones originales de estilo esmeralda/cristal, adaptación 320–1440px, flechas, barras de avance, contraste y toque/swipe, transiciones discretas, accesibilidad y reducción de movimiento. Carga tras `ui-quality.css`.
- `index.html` — tres acciones del anime, incluyendo Crunchyroll **solo si existe URL oficial validada**, y controles de carrusel. Se conservan `#hero-detail` y `#hero-save` con sus eventos.
- `airing-ui.js` — emite evento público interno al procesar exitosamente el catálogo de emisiones, sin duplicar fuentes.
- `studio.js` — expone selección de destacado a nivel del API actual, sin interferir con favoritos, ficha o búsqueda; evita que tendencias sobrescriban una portada de estrenos ya activada.
- `sw.js` — versión v36 con JS/CSS necesarios en el shell PWA.

## Detalles funcionales importantes
- Una **hora de emisión de AniList** no demuestra disponibilidad del episodio en streaming. La interfaz dice “Emisión” y ofrece información, no un falso botón “Reproducir episodio”.
- Muestra el horario y última actualización del snapshot para evitar falsas afirmaciones.
- Si el calendario está temporalmente indisponible, conserva el destacado existente en vez de mostrar estrenos inventados.
- Cambia a otra portada cada 7,2 s cuando está visible, el usuario no interactúa y no está activada la reducción de movimiento.
- Soporta teclas, flechas y deslizamiento horizontal; pausa mientras el usuario interactúa o se encuentra en otra pestaña.
- Hasta 7 títulos reales y sin duplicados; respeta ID MAL/AniList. Fuentes multimedia legales siguen siendo independientes.

## QA y entrega
- Unit: `node --test tests/premiere-hero.test.mjs` (zona horaria local, prioridad, deduplicación, estado real).
- Playwright: `npx playwright test tests/premiere-hero.spec.js` con reloj local y fixture de calendario, móvil 390 y escritorio 1440.
- Suites regresión existentes: Puppeteer, navegador, profundidad, UI, catálogo, rutas y reproductor.
- Capturas Chromium en `oneup-cinematic-premiere-review` de GitHub Actions.
- **Por verificar en dispositivo físico:** Safari iPhone, movimiento con dedo, cookies/sesión, degradado sobre imágenes reales y videos autorizados. No reclamar certificación física.

## Criterio para producción
Publicar solo si CI de rama/PR pasa, enlace externo abre la serie oficial correcta y el deploy de GitHub Pages termina `success`. Los títulos cambian cuando GitHub Actions refresca `data/airing.json`, actualmente aproximadamente cada seis horas; no prometen actualización segundo a segundo.
