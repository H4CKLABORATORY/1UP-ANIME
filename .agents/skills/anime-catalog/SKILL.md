---
name: anime-catalog
description: Recuperación estable de catálogo público de anime, organización por categorías y enlaces correctos.
---
# Catálogo y programación 1UP Anime

## Reglas de datos
- Fuente principal: AniList GraphQL, datos de anime con bannerImage, coverImage, géneros y nextAiringEpisode.
- Respaldo: Jikan REST v4. Ninguna de estas APIs es un servicio de streaming.
- data/catalog.json es una copia horaria/diaria propia de metadatos; mostrar información que procede de un snapshot como tal.
- Si el título carece de banner, usar su portada como fondo con tratamiento visual, nunca la mascota de 1UP como supuesto arte oficial.
- Usar mal_id o AniList ID de forma coherente; no mezclar series o películas solo por nombres similares.

## UX
- Categorías: tendencias, en emisión, próximas emisiones, recientes, películas, géneros y Mi lista.
- No inventar 'episodios recién añadidos' si solo conocemos fechas de emisión aproximadas.
- La vista de detalle debe presentar datos del anime elegido, no del héroe anterior.
- La página debe funcionar como invitado con almacenamiento local; no prometer sincronización por Google sin base de datos real.
- Si un servicio de datos falla, informar el estado y usar copia válida guardada; las muestras son muestras y se rotulan.

## Implementación
- Normalizar AniList/Jikan al mismo modelo: id, title, image, banner, description, score, year, genres, format, episodes, streaming.
- Sanitizar texto, validar URL https y evitar HTML externo no confiable.
- Cachear temporalmente; respetar límites de APIs y no abrir peticiones paralelas excesivas.
- Cuando se genera el snapshot, exigir resultados no vacíos y publicar de forma atómica.
- No consumir ni embeber fuentes de reproducción no autorizadas, ni copiar reproductores de sitios externos.

## Criterios de comprobación
- La portada seleccionada coincide con el título y ficha visibles.
- Cambiar filtros no permite que una respuesta obsoleta reemplace resultados nuevos.
- La vista 'Mi lista' funciona si el usuario nunca inició sesión.
- Programación y valoración llevan su contexto temporal y fuente de datos.

## Referencias
- https://docs.anilist.co/guide/graphql/queries/media
- https://jikan.moe
- https://github.com/Aniraku/Aniraku
- https://github.com/Killoxz/Bankai
