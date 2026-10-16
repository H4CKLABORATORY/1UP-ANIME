# 1UP Anime — Dirección artística cinematográfica 2026

**Estado:** investigación y propuesta. **No modificar la estética de producción hasta obtener validación visual del propietario.**

## Protocolo creativo para este proyecto

INVESTIGAR fuentes actuales → ANALIZAR técnicas reales → COMPARAR alternativas → DISEÑAR propuesta → VALIDAR que representa la idea del propietario → IMPLEMENTAR en una rama → PROBAR móvil/escritorio → PUBLICAR si pasa los controles.

Prioridad: trabajo pulido, coherente y bien verificado por encima de respuestas rápidas o diseños genéricos. No saltar fases ni llamar funcional a una maqueta.

## Hallazgos de investigación (15 octubre 2026)

- Graph Editor de Adobe After Effects: https://www.adobe.com/learn/after-effects/web/adjusting-keyframes-dynamic-movement
- Animación tipográfica y Range Selector: https://helpx.adobe.com/after-effects/desktop/animating-text/text-animation/animating-text.html
- Track Mattes para revelados: https://helpx.adobe.com/after-effects/desktop/work-with-transparency-and-compositing/work-with-track-mattes-and-traveling-mattes/track-mattes-and-traveling-mattes.html
- Cámara 2.5D, profundidad y parallax: https://helpx.adobe.com/after-effects/desktop/work-with-layers/camera-layer/cameras-lights-points-interest.html
- Ejemplo real en YouTube de kinetic typography 2025: https://www.youtube.com/watch?v=4vLwhXY0ZRw
- Black Clover Season 2 estrenó octubre 2026: https://www.bclover.jp/news/detail.php?id=1136115
- Alineación de la temporada de Crunchyroll: https://www.crunchyroll.com/news/seasonal-lineup/2026/9/15/fall-anime-2026-crunchyroll
- DotLottie Web (MIT) para animaciones vectoriales puntuales: https://github.com/LottieFiles/dotlottie-web
- Anime.js V4 (MIT) para secuencias de movimiento: https://github.com/juliangarnier/anime
- Safari y sonido de inicio: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices
- Rendimiento de animaciones CSS: https://web.dev/articles/animations-guide
- Respeto al movimiento reducido: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/prefers-reduced-motion

## Lectura de las tres referencias aportadas

1. ANIME IMPACT nocturno azul: un solo foco central, capas profundas, humo, electricidad y luz lateral. Emplearlo en el hero, nunca en cada control.
2. ANIME IMPACT FRAMES: composición en paneles manga, pinceladas negras, tipografía de impacto y diagonales. Emplearlo puntualmente en eventos y títulos promocionales.
3. LOWER THIRDS sobre rojo: editorial japonesa, bloques tipográficos compactos y jerarquía de tamaños. Es la referencia dominante para la navegación y botones: NO emplear letra brush en todos los controles.

## Propuesta de identidad: 1UP / GRIMORIO CINEMÁTICO

Marca permanente independiente: negro obsidiana #090C13, grafito #151A25, textos #F2F5F9. Conserva el logo 1UP original y la identidad de la plataforma.

Evento octubre inspirado en magia: verde arcano #62D5AE, dorado viejo #EAC790 y tinta negra. Motivos propios de libros mágicos, sigilos geométricos originales y luz de hechicería. NO copiar escudos, logos, personajes, música o simbología exacta de Black Clover ni insinuar afiliación oficial con su estudio.

Halloween: destellos ámbar escasos, una luna tenue y una ligera neblina solo en la sección destacada. NO inundar toda la web con murciélagos, calaveras, humo o naranja. Temporada activable con configuración y fecha de retirada.

## Diseño de movimiento tipo After Effects implementable en web

- Hero: tres planos 2.5D (imagen, ambiente, tipografía); easing del Graph Editor aproximado por cubic-bezier/Web Animations. Animación inicial entre 700 y 1100 ms, nunca bloquea navegación.
- Encabezados: texto por líneas revelado con máscara / clip-path, desplazamiento y opacidad. 400–650 ms.
- Menú y botones: lower third editorial con línea activa y barrido de 120–180 ms. Controles accesibles y táctiles.
- Posters: escalado contenido y cambio de fondo al seleccionar una serie, sin exageraciones. 300–450 ms.
- Magia: efectos SVG precompuestos y pocas chispas ocasionales. NO blur dinámico de pantalla completa.
- Microanimaciones de comunidad: discretas y coherentes, sin hacer scroll-jacking.

Implementación: preferir CSS/WAAPI; considerar Anime.js v4 solo cuando agregue valor medible; dotLottie solo para emblemas y efectos vectoriales concretos. After Effects renderiza activos, pero el navegador no ejecuta sus proyectos .aep.

## Sonido original y Safari iPhone

- Arranque visual automático sin pantalla de "Entrar con sonido".
- Firma de audio original "grimoire Halloween" de 0.6–1.0 s: viento leve + campana tenue + shimmer de magia, libre de música de anime comercial.
- iPhone Safari puede bloquear sonido audible antes de un gesto. El audio se activa después de un toque real y si el visitante habilitó sonido, nunca fingiendo autoplay.
- Control pequeño ON/OFF y preferencia persistente, silencio por defecto. Sin loops ni sonido al pasar por cada tarjeta.
- La web funciona plenamente sin audio.

## Análisis del repositorio de 1UP Anime

GitHub Pages + CSS/JS plano. Ya existen studio.css, brand-v2.css, spotlight.css y motion.css con capas de estilos acumulados, más motion.js con partículas. Agregar FX sin consolidar causaría conflictos de apilamiento. También existe sonic.js, pero no está actualmente cargado desde index.html: hay que estudiar si conviene sustituirlo o adaptarlo antes de publicarlo.

Conservar catálogo, búsquedas, fichas, calendario, comentarios, cuentas, comunidad y monitoreo. No mezclar este rediseño con la configuración pendiente de Firebase.

## Criterios de aceptación y fases

1. Presentar dos composiciones para validar: home escritorio y home iPhone, más storyboard de hero y propuesta de sonido.
2. Confirmar que el propietario reconoce la dirección Black Clover-inspired / Halloween sutil, sin que toda la página se convierta en temática Halloween.
3. Crear paquete de diseño modular separado y reversible; no reemplazar indiscriminadamente los estilos actuales.
4. Implementar navegación, tipografía, hero y posters; después tema de octubre, detalles y sonidos.
5. Probar con Chromium móvil/escritorio y, cuando haya dispositivo, Safari iPhone; cero errores JS de flujo principal y controles táctiles funcionales.
6. Respetar prefers-reduced-motion, carga moderada y legibilidad antes de aprobar despliegue.

**Estatus presente:** investigación y propuesta escrita. No significa que exista un nuevo diseño publicado.
