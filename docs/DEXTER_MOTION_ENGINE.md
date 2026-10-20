# DEXTER Motion Engine · investigación y primera integración

**Fecha:** 2026-10-20. **Destino:** rama feature/dexter-motion-engine-20261020, revisión por PR. **Estado:** módulo inicial implementado; verificación de Safari físico y aprobación visual pendientes.

## Objetivo
Mejorar microinteracciones de 1UP Anime con calidad de estudio sin romper Kokomi, la intro AAC vigente, los controles de reproducción, las rutas, los estilos de profundidad ni el modo de movimiento reducido. Sin servicios de pago y sin cargar bibliotecas externas en la web pública.

## Referencias GitHub comprobadas

| Proyecto | Repositorio | Aporte estudiado | Decisión |
|---|---|---|---|
| Awesome Opus 5.5 Videos | https://github.com/yihui-dev/awesome-opus5-5-videos | Prompts de animación codificada (Canvas, SVG, Three.js) | Referencia creativa, no dependencia instalada |
| GSAP | https://github.com/greensock/GSAP | Curvas, secuencias y microtransiciones | Curvas nativas con Web Animations API; no añadir dependencia |
| Three.js | https://github.com/mrdoob/three.js | Iluminación/cámara 3D | Reservado para vista de estudio; excesivo para microinteracciones móviles |
| Motion | https://github.com/motiondivision/motion | Transiciones y orquestación | Efectos cortos implementados con API nativa |
| Anime.js | https://github.com/juliangarnier/anime | Interpolaciones y secuencias | Referencia, no instalado |
| Lottie Web | https://github.com/airbnb/lottie-web | Animaciones exportadas desde After Effects | Candidato para assets propios cuando estén aprobados |
| Auto Animate | https://github.com/formkit/auto-animate | Transición de elementos añadidos dinámicamente | Inspiración para observar tarjetas de forma incremental |
| Theatre.js | https://github.com/theatre-js/theatre | Edición de animaciones con línea temporal | Herramienta futura fuera del sitio público |

Se consultó descripción/licencia pública de los proyectos pertinentes. Las licencias y dependencias deberán revisarse antes de incorporar código de terceros o paquetes. Este módulo implementa lógica original; no copia código externo ni activa servicios premium.

## Cambios reales de esta fase

- **js/dexter-motion-engine.js**: revelado ligero de tarjetas y accesos rápidos, una vez y solo al hacerse visibles. Usa IntersectionObserver y MutationObserver; no bloquea contenido ni navegación cuando faltan las APIs.
- **styles/dexter-motion-engine.css**: foco de luz que sigue el cursor sobre la tarjeta artística principal, sin WebGL ni recursos descargados. No intercepta clics ni toques.
- **index.html + sw.js**: carga progresiva y respaldo PWA con versionado para actualizar el caché.
- **tests/dexter-motion-engine.test.mjs**: pruebas locales del motor sin dependencias nuevas; workflow CI específico.
- **API para depuración**: DexterMotionEngine.refresh(), setEnabled(boolean), isEnabled(), isMotionAllowed(). El motor no modifica estado de sesión, reproducción, elementos de marca ni catálogos.

## Límites y aceptación pendiente
El movimiento de tarjetas usa solo **opacity**, nunca transform: evita interferir con DepthEngine, CardDepthEngine y el motion ya existente. Foco luminoso solo en hover fino; se desactiva por prefers-reduced-motion, ahorro de datos, página oculta o modo silencioso de movimiento (km-quiet). El marcado permanece accesible si JS no carga. Aún falta QA visual real en Safari iPhone y comparativa capturada desktop/móvil; no confundir las pruebas DOM con Safari físico. No se instala un renderizador MP4 ni se reemplaza la intro existente.

## Próximos trabajos recomendados
1. Verificar CI del PR y QA visual Playwright en 390/1366; comprobar PWA y Safari físico antes de merge.
2. Introducir edición de escenas y exportación de secuencias en un estudio **separado**, no en carga de la portada, reutilizando assets aprobados.
3. Medir FPS, consumo y Web Vitals antes de habilitar animación avanzada o dependencia WebGL.
