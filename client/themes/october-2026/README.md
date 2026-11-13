# 1UP ANIME · OCTOBER CINEMATIC — Vista previa funcional

**Estado:** prototipo visible y aislado. **La portada normal de `index.html` no cambia.**

## Abrir y evaluar

- Vista previa: https://h4cklaboratory.github.io/1UP-ANIME/preview-october.html
- Página pública actual: https://h4cklaboratory.github.io/1UP-ANIME/
- Pruebas reales: Actions → ONEUP Browser Acceptance
- Diseño original: `arcane-seal.svg` (símbolo decorativo hecho para esta web; no corresponde a Black Clover).

## Qué cambia

1. Navegación editorial con letras condensadas, indicador rojo discreto y fondos oscuros. Referencia: lower thirds japoneses sobre rojo que indicó el propietario.
2. Hero de aspecto cinematográfico, contraste tipográfico fuerte, gradientes sutiles y sello vectorial 2.5D.
3. Tarjetas y botones de estilo coherente y bordes limpios. Sin glow exagerado ni intro bloqueante.
4. Especial octubre: Black Clover como foco editorial. AniList sirve la portada y ficha si responde; si no, se conserva el enlace a su sitio oficial. **No afirma que 1UP tenga videos de esa serie ni una alianza con el estudio.**
5. Halloween muy moderado: un disco lunar, un sello geométrico, destellos limitados y un color ámbar de detalle.
6. Firma sonora original con Web Audio activada por botón explícito. Navegación inicia en silencio para respetar Safari y la decisión del visitante.
7. `prefers-reduced-motion`: desactiva animaciones complejas sin eliminar información o controles.

## Calidad y pruebas

- Verificar a 390 px de ancho con simulación de iPhone y a 1360 px escritorio.
- Comprobar que no existe scroll horizontal accidental, que el botón de sonido responde al toque y que no se reproduce audio al abrir la web.
- Comprobar búsqueda, cartel, anime seleccionado, ficha, calendario y cambio de pestañas.
- Las portadas remotas pertenecen a las fuentes de datos y no se almacenan como assets nuevos de 1UP.
- Revisar visualmente las capturas `e2e-october-iPhone.png` y `e2e-october-desktop.png` de la ejecución correspondiente en GitHub Actions.

## Antes de publicar como tema principal

Se necesita una revisión visual del propietario en su iPhone. La decisión es importante: intensidad de brillo, jerarquía de letras, espacio de navegación y qué se conserva fuera de octubre.

**La integración en `index.html` debe ser un cambio controlado posterior**, no parte de este primer prototipo. Una vez aprobado, activar por una configuración de temporada que finalice automáticamente después de octubre. No usar un gateway de audio.

## Material de estudio

- Dirección visual: `docs/ART_DIRECTION_CINEMATIC_2026.md`
- Skill reutilizable: `skills/oneup-motion-director/SKILL.md`
- Tema CSS: `themes/october-2026/theme.css`
- Movimiento / audio: `themes/october-2026/theme.js`
- Sello original: `themes/october-2026/arcane-seal.svg`
