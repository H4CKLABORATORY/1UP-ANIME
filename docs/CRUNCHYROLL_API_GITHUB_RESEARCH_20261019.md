# 1UP Anime — Investigación de la categoría GitHub `crunchyroll-api`
Fecha: 2026-10-19. Fuente: https://github.com/topics/crunchyroll-api

## Clasificación técnica y utilidad

| Repositorio | Qué enseña | Decisión 1UP |
| --- | --- | --- |
| https://github.com/crunchy-labs/crunchyroll-rs | Esquemas conceptuales de serie, temporada, capítulo, audio y subtítulos | Usar como referencia de estructuras |
| https://github.com/HarshitKumar9030/crunchyroll-api | Watchlist, historial, episodios, listas | Inspiración de UX y diseño de datos |
| https://github.com/Crunchyroll-Plus/crunchyroll-docs | Estructuras de API no oficial | Referencia técnica de endpoints |
| https://github.com/chaosaiart/Crunchyroll-Filter | Filtros idioma/audio/subtítulos, duración y región | Diseñar filtros propios |
| https://github.com/crunchy-labs/crunchy-cli | CLI de episodios | Referencia de estructuras |
| https://github.com/CuteTenshii/crunchyroll-downloader | Manejo de metadata y formatos | Referencia técnica |
| https://github.com/Bemly/crunchyroll-downloader | Manejo de formatos de video | Referencia técnica |

## Implementación: episodio en página externa

La portada 1UP proporciona enlaces y el reproductor interno `episode-player.js`. Se añadió a `official-watch.js` una lista de páginas públicas de episodios de Black Clover (`mal-34572`), temporada 1.

| Episodio | Título | Enlace externo |
| --- | --- | --- |
| 1 | Asta and Yuno | https://www.crunchyroll.com/watch/G69P9MD9Y/asta-and-yuno |
| 2 | The Boys' Promise | https://www.crunchyroll.com/watch/G6DQG759R/the-boys-promise |
| 3 | To the Royal Capital of the Clover Kingdom! | https://www.crunchyroll.com/watch/GX9UQW5X0/to-the-royal-capital-of-the-clover-kingdom |
| 4 | The Magic Knights Entrance Exam | https://www.crunchyroll.com/watch/G31UX0X2D/the-magic-knights-entrance-exam |
| 5 | The Path to the Wizard King | https://www.crunchyroll.com/watch/G6XJJ2PMR/the-path-to-the-wizard-king |
| 6 | The Black Bulls | https://www.crunchyroll.com/watch/G4VUQXMMG/the-black-bulls |

Estas páginas fueron confirmadas mediante búsqueda pública web en octubre de 2026; son enlaces a páginas web del titular, no archivos, tokens, m3u8, MP4 ni licencia de retransmisión. La disponibilidad de acceso, idioma, territorios y suscripción depende de Crunchyroll. Se evita indicar «ver gratis», «servidor 1UP» o «reproduciendo» para los enlaces.

### Comportamiento y validaciones
- `getEpisode(animeId,season,number)` solo devuelve URL si coinciden exactamente anime/temporada/número; no aplica los seis capítulos a un anime diferente o una segunda temporada.
- `safeEpisodeUrl` acepta únicamente HTTPS sobre crunchyroll.com/www.crunchyroll.com y ruta /watch con ID validado; rechaza hosts parecidos, puertos arbitrarios, credenciales, fragmentos y cadenas de consulta.
- Al cambiar el episodio en el reproductor 1UP, se actualiza en la ficha el enlace «Abrir episodio N en Crunchyroll»; se oculta si no existe una URL editorial verificada.
- Destino externo `target=_blank`, `rel=noopener noreferrer`; no cargar iframe, video ni credenciales de Crunchyroll.
- `node --test tests/official-watch.test.mjs` prueba validación, IDs, cambio de episodio y conserva pruebas previas.
- El workflow `ONEUP Official Watch Links` corre en PR y push. Validar CI verde, publicación Pages y Safari físico antes de afirmar finalización.

### Fases posteriores sugeridas
1. Verificar enlaces de capítulos.
2. Añadir enlaces de capítulos de otras series gradualmente.
3. Priorizar APIs abiertas para metadatos: AniList y Jikan.
4. Mantener el plan de scrobbling, favoritos y progreso en 1UP.
