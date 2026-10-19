# MAL Updater → oportunidades para 1UP Anime

**Investigación:** 2026-10-19  
**Fuente principal:** https://malupdater.com/  
**Estado:** estudio comparativo y arquitectura propuesta; **ninguna función nueva está instalada por este documento**.  
**Producto propio:** https://github.com/H4CKLABORATORY/1UP-ANIME

## 1. Qué es MAL Updater y qué no es

MAL Updater (software propietario de escritorio) actualiza el estado de visualización en MyAnimeList al reconocer anime/episodios reproducidos. **No es un catálogo de videos ni un proveedor de streaming**. La edición 4.1 beta para Windows 10/11 de 64 bits y Linux, fechada el 14 de octubre de 2026, anuncia compatibilidad con las API de MyAnimeList y AniList, listas personalizadas y exportables, búsqueda de series, calendarios de emisiones, páginas detalladas de anime/manga, reconocimiento avanzado de títulos y varios reproductores (https://malupdater.com/downloads). El registro de cambios del 12 al 14 de octubre de 2026 detalla filtros por estado/tipo/progreso/año/género, perfiles de filtros, reglas manuales para episodios de temporadas, relaciones de secuelas y preferencias de contenido adulto (https://malupdater.com/changelog).

**Licencia y límites:** sus condiciones publicadas el 8 de septiembre de 2026 prohíben copiar/modificar/redistribuir el software y realizar ingeniería inversa sin autorización explícita; el uso permitido es personal y no comercial (https://malupdater.com/terms). Inspirarse en ideas generales de experiencia de usuario y desarrollar un código independiente propio; **no integrar el ejecutable ni copiar su implementación o activos**.

## 2. Comparación con la rama main inspeccionada

| Capacidad | Ya observado en 1UP Anime | Brecha / oportunidad |
|---|---|---|
| Catálogo anime | `studio.js`: AniList principal, Jikan secundario y fallback local | Unificar identificadores `id`, `mal_id`, `ani_id`, temporada y traducciones |
| Fichas | `studio.js`, `catalog-plus.js` | Pestañas de relaciones y secuelas, fichas más completas |
| Progreso | `studio.js`: contador manual de episodios y `localStorage` | Marcar automáticamente después de reproducción verificada |
| Continuar viendo | Estante por entradas con `watched > 0` en `studio.js` | Registrar `currentTime` por episodio, reanudar en segundo exacto |
| Reproductor | `episode-player.js`, `hls-adapter.js`; hasta 7 fuentes y subtítulos autorizados | Eventos `timeupdate`/`ended`, limpieza de listeners y consolidación entre fuentes |
| Calendario | `airing-ui.js`, snapshot `data/airing.json` y fallback AniList | Guardar recordatorios elegidos; filtrar emisiones según listas del usuario |
| Datos entre dispositivos | `supabase-episode-backend.js` opcional desactivado, auth Firebase configurable | Backend operable con RLS, migración local con consentimiento y control de conflictos |
| MyAnimeList / AniList personales | Metadatos públicos, sin conexión autenticada observada | OAuth2/PKCE opcional; importación/exportación, sincronización de listas |
| Episodios reproducibles | `data/licensed-media.json` sin fuentes reales al inspeccionarlo | La función de seguimiento debe activarse solo sobre medios reales/autorizados |

Estos hallazgos son **inspección de código/documentación**, no una certificación de producción ni una prueba en Safari físico.

## 3. Diseño recomendado: seguimiento automático nativo 1UP

### Comportamiento

1. El visitante abre una fuente reproducible configurada legítimamente en `episode-player.js`.
2. El reproductor registra eventos estándar de `HTMLVideoElement` (`loadedmetadata`, `timeupdate`, `pause`, `seeking`, `ended`), cuando la fuente lo permite. Un iframe de terceros no garantiza dichos eventos; no fingir seguimiento.
3. Persistir, por `profileId`, `animeId`, `season` y `episode`, un checkpoint reducido: `seconds`, `duration`, `updatedAt`, `completed` y `origin`. Nunca guardar URL de streaming ni tokens en ese objeto.
4. Guardar localmente con frecuencia limitada (por ejemplo cada 15–30 segundos efectivos de avance) y al salir/pausar; no escribir en la base de datos por cada `timeupdate`.
5. Definir umbral de visto configurable (p. ej. `ended` o >=90% del tiempo reproducido, con cautelas para créditos y saltos; no contar solo abrir un episodio). Marcar una sola vez y ofrecer **Deshacer**.
6. `Continuar viendo` enlaza a temporada/episodio y reanuda posición cuando hay una fuente compatible. Proporcionar fallback al inicio si el reproductor no admite `seek`.
7. Evitar progreso falso al visualizar tráiler, cambiar rápidamente de fuente o reproducir archivos no autorizados. Preservar progreso al cambiar de servidor del mismo episodio.
8. Modo invitado funciona localmente (Safari/iPhone/PWA); sincronización entre dispositivos solo tras consentimiento/autenticación y backend realmente configurado.
9. Separar dos entidades: `watch_position` (minuto exacto interno) y `anime_list_status` (estado, total de episodios vistos, favorito, puntuación). No enviar el minuto exacto a MAL, que recibe conteo/estado.
10. Reducir el ruido: aplicar `visibilitychange`, `pagehide`, estados de red y reintentos acotados; evitar registrar reproducción accidental o cargas incompletas.

### Modelo local propuesto (ilustrativo; no implementado)

```json
{
  "schemaVersion": 1,
  "profileId": "local-profile",
  "animeId": "mal-1535",
  "malId": 1535,
  "aniId": null,
  "season": 1,
  "episode": 3,
  "seconds": 875,
  "duration": 1410,
  "completed": false,
  "updatedAt": "2026-10-19T12:00:00Z"
}
```

## 4. Listas personales y sincronización opcional

**MyAnimeList:** usar API oficial v2 y OAuth2 con PKCE y autorización explícita. Registrar **nuestra** aplicación en MyAnimeList, no reutilizar credenciales extraídas de otras apps. Lectura de lista `GET /users/@me/animelist`, actualización `PATCH /anime/{anime_id}/my_list_status` con `status`, `score`, `num_watched_episodes` (la respuesta de lectura utiliza `num_episodes_watched`). Seguir paginación, throttling y errores 401/429. Referencia: https://myanimelist.net/apiconfig/references/api/v2 ; implementación ilustrativa no oficial: https://github.com/jyotil-raval/mal-updater/blob/main/docs/MAL_API.md

**AniList:** conservar GraphQL público existente y añadir conexión de listas personales con OAuth autorizado conforme sus términos; preferir mapping por IDs estables y no comparar títulos solamente. Identificar cambios/conflictos de cada origen y pedir permiso antes de sobrescribir listas.

**Privacidad:** página estática alojada en GitHub Pages no debe contener secretos ni refresh tokens en JavaScript versionado. Para conexiones persistentes entre dispositivos se requiere un backend seguro configurado (por ejemplo, solución existente de Supabase/Firebase revisada con reglas de acceso, u otro servicio compatible con presupuesto cero). Mantener el progreso local si no se configura nada.

**Sincronización conservadora:** cambios `local → MAL/AniList` solo cuando el usuario lo habilite; mostrar diferencias antes de importar y nunca publicar, borrar o sobreescribir cientos de entradas sin vista previa. Una actualización remota necesita autenticación real y pruebas de permisos.

## 5. Filtros y relación entre temporadas

- Pantalla **Mi anime**: Viendo, Pendientes, Completados, En pausa, Abandonados, Favoritos, Ver de nuevo.
- Filtros por año, temporada, género, formato, puntuación, progreso, clasificación por edades y estado de emisión; preservar filtros en la URL y guardar perfiles locales.
- Mostrar secuelas, precuelas, spin-offs y especiales usando relaciones verificadas de fuentes de metadatos, sin inferir que una temporada de 24 episodios siempre se divide en dos.
- Motor de correlación: `malId` (primario si existe) + `aniId`; tabla explícita de correspondencia para episodios/temporadas; permitir corrección manual y guardar reglas con trazabilidad.
- Home móvil: **Continuar viendo** arriba, **En emisión que sigo**, **Próximo estreno**, **Mis listas**. Todo debe funcionar sin cuenta.
- Notificaciones de estrenos: solo opt-in con consentimiento y soporte real de entrega; sin prometer push si no está configurado.

## 6. Aclaración sobre reproducción y permisos

La metadata de AniList/Jikan/MAL **no incluye derecho a distribuir episodios**. El manifiesto `data/licensed-media.json` está vacío, por lo que no se debe mostrar actividad de reproducción ficticia. MAL Updater no convierte enlaces de terceros en archivos autorizados. Para streaming propio requiere medios originales/de dominio público/con licencia o incrustaciones expresamente permitidas. Mantener clara la distinción entre fecha de emisión y disponibilidad en 1UP.

## 7. Orden técnico sugerido (sin ejecutar todavía)

1. **Fase 1:** contrato tipado de `PlaybackProgress` + pruebas puras de umbral/seek/temporada (sin tocar proveedor de vídeo).
2. **Fase 2:** adaptador HTML5 en `episode-player.js`; no activar `ended` en iframe no observable; pruebas de listeners, cambio de fuentes, Safari simulado.
3. **Fase 3:** vistas Continuar viendo con minuto exacto, visto/no visto/deshacer, progreso manual como respaldo.
4. **Fase 4:** autenticación opcional y persistencia remota de checkpoints, seguridad RLS, migración consentida de favoritos/localStorage.
5. **Fase 5:** integrar MAL/AniList vía OAuth2, resolución IDs y sincronización con consentimiento; controlar rate limits/expiración.
6. **Fase 6:** filtros avanzados, secuelas y avisos de series seguidas; QA iPhone físico y desktop.

### Criterios de aceptación

- El usuario puede seguir usando 1UP como invitado sin perder favoritos existentes.
- Un video autorizado al 40% guarda posición pero no incrementa episodios vistos.
- Completar el episodio incrementa su estado **una sola vez** y muestra Deshacer.
- Cambiar servidor o recargar no borra posición del episodio.
- En episodios `iframe` sin métricas se permite marcar manualmente, sin fingir detección.
- Sin login MAL/AniList no se realiza ninguna solicitud de escritura a sus cuentas.
- Los secretos/tokens nunca se comitean al repositorio público.
- El sitio sigue funcionando con red intermitente y sin backend.
- Sin entradas en el manifiesto no se anuncian videos disponibles.
- Las pruebas automatizadas actuales siguen pasando; no afirmar Safari real sin ejecutar allí.

## 8. Referencias verificadas

- MAL Updater inicio: https://malupdater.com/
- Versiones y funciones: https://malupdater.com/downloads
- Registro de cambios (octubre 2026): https://malupdater.com/changelog
- Condiciones de uso / propiedad intelectual: https://malupdater.com/terms
- MyAnimeList API oficial: https://myanimelist.net/apiconfig/references/api/v2
- Autorización MyAnimeList: https://myanimelist.net/apiconfig/references/authorization
- Repositorio 1UP Anime: https://github.com/H4CKLABORATORY/1UP-ANIME

**Nota de continuidad:** registrar esta investigación como inspiración de producto, no como dependencia de software tercero ni como acceso a episodios o APIs autenticadas ya configuradas.