# 1UP Anime — Investigación de la categoría GitHub `crunchyroll-api`
Fecha: 2026-10-19. Fuente: https://github.com/topics/crunchyroll-api

## Clasificación técnica y utilidad

| Repositorio | Qué enseña | Decisión 1UP |
| --- | --- | --- |
| https://github.com/crunchy-labs/crunchyroll-rs | Esquemas conceptuales de serie, temporada, capítulo, audio y subtítulos | Usar como referencia de estructuras, no importar acceso a streams ni sesiones |
| https://github.com/HarshitKumar9030/crunchyroll-api | Watchlist, historial, episodios, listas; usa cookies de autenticación en servidor | Inspiración UX y diseño de datos; NO copiar cookies ni integrarlo en el navegador PWA |
| https://github.com/Crunchyroll-Plus/crunchyroll-docs | API no oficial documentada desde una APK | No considerar API pública ni autorización de integración |
| https://github.com/chaosaiart/Crunchyroll-Filter | Filtros idioma/audio/subtítulos, duración y región | Diseñar filtros propios con información permitida y procedencia visible |
| https://github.com/crunchy-labs/crunchy-cli | CLI descarga/archiva episodios | No usar para poblar 1UP ni distribuir copias |
| https://github.com/CuteTenshii/crunchyroll-downloader | Descargas MKV y referencias a Widevine DRM | No integrar extracción de video ni DRM |
| https://github.com/Bemly/crunchyroll-downloader | MP4 y DRM Widevine | No integrar descargas ni elusión |

Que un repositorio sea abierto NO concede derechos de transmisión sobre los contenidos de Crunchyroll ni autorización para acceder a APIs privadas o redistribuir películas/capítulos. Las reglas vigentes de la plataforma restringen copia, descarga, reproducción, retransmisión e integración de contenidos sin permiso:
https://www.crunchyroll.com/es/tos/?mode=mobile

## Implementación mínima: episodio exacto en Crunchyroll (página externa)

La portada 1UP ya proporciona enlaces a series externas verificados y el reproductor interno separado `episode-player.js` para medios propios/autorizados. Se añadió a `official-watch.js` una lista editorial de **seis páginas públicas concretas de episodios de Black Clover original (`mal-34572`), temporada 1**. No se extraen los bytes ni se pone Crunchyroll en un iframe.

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
1. Verificar manualmente que cada enlace continúe apuntando al capítulo correcto y retirar los caídos.
2. Añadir enlaces de capítulos de otras series gradualmente *solo* mediante revisión editorial de destino, evitando índices masivos no autorizados.
3. Priorizar APIs abiertas para metadatos: AniList y Jikan, sin acceder a endpoints privados de Crunchyroll.
4. Para reproducción interna real, buscar emisiones ofrecidas para incrustación por el titular (p. ej. YouTube oficial con inserción habilitada) o archivos propios con derechos de distribución; documentar audio/subtítulos reales.
5. Mantener el plan de scrobbling, favoritos y progreso en 1UP sin importar sesiones privadas de Crunchyroll.

## Estado honesto
Esto mejora la navegación a episodios externos. **No agrega episodios descargados, fuentes Crunchyroll dentro del reproductor 1UP, ni convierte 1UP en plataforma autorizada para retransmitir Crunchyroll.** El video interno sigue dependiendo de contenido propio o licenciado.
