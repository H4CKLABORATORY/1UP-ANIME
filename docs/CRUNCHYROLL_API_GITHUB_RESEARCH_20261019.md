# 1UP Anime — Investigación de la categoría GitHub `crunchyroll-api`
Fecha: 2026-10-19. Fuente: https://github.com/topics/crunchyroll-api

## Clasificación técnica y utilidad

| Repositorio | Qué enseña | Decisión 1UP |
| --- | --- | --- |
| https://github.com/crunchy-labs/crunchyroll-rs | Esquemas conceptuales de serie, temporada, capítulo, audio y subtítulos | Usar como referencia de estructuras, no importar acceso a streams ni sesiones |

https://www.crunchyroll.com/es/tos/?mode=mobile

## Implementación mínima: episodio exacto en Crunchyroll (página externa)

Se añadió a `official-watch.js` una lista editorial de **seis páginas públicas concretas de episodios de Black Clover original (`mal-34572`), temporada 1**. No se extraen los bytes ni se pone Crunchyroll en un iframe.

| Episodio | Título | Enlace externo |
| --- | --- | --- |
| 1 | Asta and Yuno | https://www.crunchyroll.com/watch/G69P9MD9Y/asta-and-yuno |
| 2 | The Boys' Promise | https://www.crunchyroll.com/watch/G6DQG759R/the-boys-promise |
| 3 | To the Royal Capital of the Clover Kingdom! | https://www.crunchyroll.com/watch/GX9UQW5X0/to-the-royal-capital-of-the-clover-kingdom |
| 4 | The Magic Knights Entrance Exam | https://www.crunchyroll.com/watch/G31UX0X2D/the-magic-knights-entrance-exam |
| 5 | The Path to the Wizard King | https://www.crunchyroll.com/watch/G6XJJ2PMR/the-path-to-the-wizard-king |
| 6 | The Black Bulls | https://www.crunchyroll.com/watch/G4VUQXMMG/the-black-bulls |

La disponibilidad de acceso, idioma, territorios y suscripción depende de Crunchyroll. Se evita indicar «ver gratis», «servidor 1UP» o «reproduciendo» para los enlaces.

### Comportamiento y validaciones
- `getEpisode(animeId,season,number)` solo devuelve URL si coinciden exactamente anime/temporada/número; no aplica los seis capítulos a un anime diferente o una segunda temporada.
- Al cambiar el episodio en el reproductor 1UP, se actualiza en la ficha el enlace «Abrir episodio N en Crunchyroll»; se oculta si no existe una URL editorial verificada.
- `node --test tests/official-watch.test.mjs` prueba validación, IDs, cambio de episodio y conserva pruebas previas.
- El workflow `ONEUP Official Watch Links` corre en PR y push. Validar CI verde, publicación Pages y Safari físico antes de afirmar finalización.

### Fases posteriores sugeridas
1. Verificar manualmente que cada enlace continúe apuntando al capítulo correcto y retirar los caídos.
3. Priorizar APIs abiertas para metadatos: AniList y Jikan, sin acceder a endpoints privados de Crunchyroll.
5. Mantener el plan de scrobbling, favoritos y progreso en 1UP sin importar sesiones privadas de Crunchyroll.

## Estado honesto
