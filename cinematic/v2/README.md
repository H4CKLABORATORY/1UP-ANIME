# 1UP ANIME — Ident cinematográfico editable V2

Esta es una **versión de revisión**, no una sustitución pública. Diseño de movimiento realizado en Python/OpenCV con assets originales y efecto de capas independientes. No afirmar que se haya ejecutado Adobe After Effects.

## Salidas automatizadas

Ejecutar `python cinematic/v2/render.py mobile desktop` con Python, NumPy, OpenCV, Pillow y FFmpeg. Las salidas se escriben en `output/cinematic-v2/`:

- `1UP_ANIME_EDITORIAL_V2_mobile_1080x1920.mp4` — 9:16, 30 fps, 3.2 s.
- `1UP_ANIME_EDITORIAL_V2_desktop_1920x1080.mp4` — 16:9, 30 fps, 3.2 s.

Los dos videos preservan por **copia de códec AAC**, sin mezclar ni sustituir, el sonido de `assets/1up-anime-intro-firma-3seg.mp4`. El workflow extrae AAC de los tres y compara los bytes con `cmp`.

## Capas

- Plasma cromático azul/rojo independiente por campos difusos.
- Círculos eléctricos y rayos de energía que evolucionan con el tiempo.
- Campo de partículas con movimiento dependiente de profundidad.
- Máscaras de color que separan 1UP azul de ANIME rojo: las letras se cruzan en x, así que **un corte vertical las rompía** y se sustituyó por máscara cromática con asignación del color más próximo.
- Movimiento independiente de logotipo, reflejo especular, pulso a 1.12 s y fundido final.
- Ranuras de personajes `left`/`right` opcionales: solo PNG real recortado con permiso documentado. Nada de imágenes sintéticas.

## Revisión y límites

Último SHA validado de motor: `eb910c87754df91c7ecf92b0082e404d9dbb1a27`.

- [GitHub Actions — render+validación AAC](https://github.com/H4CKLABORATORY/1UP-ANIME/actions/runs/39052638883): success.
- [Calidad de la interfaz](https://github.com/H4CKLABORATORY/1UP-ANIME/actions/runs/39052638912): success.
- [Aceptación del navegador](https://github.com/H4CKLABORATORY/1UP-ANIME/actions/runs/39052638961): success.
- Se revisaron manualmente fotogramas de impacto de ambas composiciones, detectando y corrigiendo el problema de la letra A sobrante y el P cortado. Los previews corregidos muestran ambas palabras completas.
- No hay personajes oficiales incluidos: las referencias oficiales no conceden autorización de reutilización para la intro.
- No se probó esta nueva pieza en Safari físico. Las pruebas de navegador son del sitio actual, que no se modificó.
- El PR #33 está en borrador; no sustituir la intro desplegada sin autorización de personajes y aprobación de la composición.
