# 1UP ANIME · Estudio cinematográfico V3

Edición V2 ya entregada al propietario como ZIP con versiones H.264/AAC, composición de capas y proyecto editable.


- Logotipo: `assets/oneup-header-letters.png`, diseño aprobado por el propietario.
- Audio original: `assets/1up-anime-intro-firma-3seg.mp4` (AAC original). La vista V3 utiliza este mismo archivo; no cambia melodía, voz ni firma sonora.
- No se añaden rostros artificiales, fan art generado ni imágenes copiadas de animes de terceros.

## Elementos originales en capas

La composición de navegador integra capas animadas independientes: campos de luz azul y rojo, niebla en profundidad, dos nebulosas que rotan en direcciones opuestas, dos anillos elípticos, columnas luminosas, resplandor del logotipo, barrido de luz metálica y fogonazo óptico. `studio.js` dibuja chispas azules/rojas, trazos eléctricos y pulsos geométricos en Canvas, con semilla determinista. La reproducción usa la firma original de 3,2 s y sitúa pulsos visuales alrededor de 0,26; 0,50; 0,74; 1,12; 1,90 y 2,64 s.

La vista funciona en vertical y apaisado sin escalado arbitrario de personajes, y respeta `prefers-reduced-motion`. El botón «Reproducir» está **solo en la herramienta de revisión**, no cambia la experiencia de la intro pública.

## Archivos editables existentes fuera de GitHub

El paquete `1UP_ANIME_INTRO_CINEMATOGRAFICA_V2_EDITABLE.zip` contiene además:
- `1UP_CINEMATIC_V2/output/1UP_ANIME_INTRO_V2_mobile_1080x1920.mp4`
- `1UP_CINEMATIC_V2/output/1UP_ANIME_INTRO_V2_desktop_1920x1080.mp4`
- `1UP_CINEMATIC_V2/src/render.py`, `scene.json`, `src/AfterEffects_1UP_V2.jsx` y materiales editables.
- `1UP_CINEMATIC_V2/QA_RESULTS.json`: compara SHA-256 de la pista AAC original con cada exportación.

**Estos MP4 V2 NO están todavía en este repositorio.** La V3 del navegador es una vista de composición para revisar dirección artística; no es una exportación MP4 de la V3.

## Aceptación y límites

- La intro vigente no se reemplaza automáticamente por esta vista de estudio para preservar el proyecto publicado.
