# 1UP ANIME — Supabase como backend alternativo (opt-in)

Este código permite preparar los comentarios por episodio y el historial/favoritos en Supabase SIN desactivar Firebase ni sustituir de manera silenciosa la base de datos actual.

## Estado real

- El plugin Supabase de ChatGPT está conectado, pero la cuenta consultada NO tiene proyectos Supabase.
- No se creó ningún proyecto, tabla, cuenta ni dominio. No hay base de datos de producción conectada.
- `supabase-config.js` contiene `null`: **este código permanece desactivado** y no altera la web pública.
- Firebase sigue siendo la ruta de comentarios si no se configura Supabase; el resto de la comunidad continúa en Firebase.
- No se ha migrado historial ni usuarios desde Firebase. Las identidades entre Firebase y Supabase NO son equivalentes automáticamente.

## Archivos añadidos

- `supabase/sql/oneup_community_optional.sql`: definición de tablas, claves, índices, permisos RLS, reportes y limitación de frecuencia por autor.
- `supabase-episode-backend.js`: adaptador frontend con SDK Supabase JS 2.117.3 fijado, activado bajo demanda.
- `supabase-config.js`: archivo de configuración pública inicialmente desactivado.
- `scripts/check-supabase-option.mjs`: comprobaciones locales de estructura y seguridad.

## Para activar cuando se decida

1. Crear un proyecto Supabase desde la cuenta y **revisar antes los costos** del plan. No hace falta proyecto mientras preparamos el código.
2. Abrir el SQL Editor del proyecto y revisar/ejecutar `supabase/sql/oneup_community_optional.sql`. En un proyecto ya usado, tomar un backup y revisar compatibilidades.
3. Activar Authentication > Providers > Anonymous, y opcionalmente Google. Los invitados usan Auth anónimo y reciben un identificador real de usuario.
4. Activar CAPTCHA o Cloudflare Turnstile, revisar cuotas y mitigación de bots ANTES de permitir comentarios públicos.
5. Comprobar en Supabase que Data API exponga las tres tablas, que RLS esté activo y que las políticas coincidan con las necesidades del sitio.
6. En `supabase-config.js`, cambiar `null` por el objeto público que contiene `url` y `publishableKey` (prefijo `sb_publishable_`). No pegar service_role, sb_secret_, contraseñas ni tokens personales.
7. Si ese archivo público ya se ha publicado en GitHub Pages, comprobar la recarga del Service Worker y que los formularios funcionen desde iPhone y Chrome.
8. Revisar Realtime; la suscripción está definida para comentarios y el SQL incorpora la tabla a la publicación `supabase_realtime` cuando existe.
9. Para el progreso, llamar al método `window.OneUpSupabaseEpisodeBackend.saveProgress(...)` y `loadProgress(...)` desde un futuro conector de perfiles. NO se ha conectado todavía con `studio.js` para evitar duplicar o perder datos locales.

Ejemplo de configuración (valores ficticios):

    window.ONEUP_SUPABASE_CONFIG = {
      url: 'https://example.supabase.co',
      publishableKey: 'sb_publishable_REEMPLAZA_CON_TU_CLAVE_PUBLICA'
    };

## Modelo de acceso y seguridad

- Comentarios visibles al público. Para comentar, el backend inicia sesión anónima si no existe usuario; no se confía en nombres de pantalla para autorizar.
- Solo los usuarios autenticados (incluidas cuentas anónimas) pueden insertar comentarios propios; RLS bloquea que cambien el autor.
- Los mensajes enviados se publican inicialmente como `visible`; el disparador impone un mínimo de 45 segundos entre comentarios del mismo usuario.
- Reportes únicos por comentario y usuario; los reportes no son públicos. Administradores revisan y ocultan contenido directamente en el dashboard o mediante un futuro panel protegido.
- Los visitantes **no pueden editar/ocultar ni borrar comentarios** desde el cliente: permisos restringidos.
- Favoritos y progreso se guardan por `auth.uid()` con RLS; no son públicos.
- Los usuarios anónimos cuentan como `authenticated` en PostgreSQL; no deben recibir privilegios de administradores.
- Una limitación por identidad no evita bots que generan muchas cuentas: habilitar CAPTCHA, moderación y límites de abuso antes de producción.
- No existe todavía moderación automatizada, notificaciones, migración desde Firebase ni sincronización de los perfiles existentes.

## Realtime

Se usa `postgres_changes` filtrado por identificador de anime y se actualiza la lista del episodio seleccionado. Es sencillo para tráfico inicial; la guía Supabase recomienda Broadcast para operaciones a gran escala.

## Pruebas

`node scripts/check-supabase-option.mjs` y `node --check supabase-episode-backend.js`.
El workflow `supabase-optional-check.yml` solo prueba código y políticas esperadas. **No prueba SQL contra una base real**: eso requiere crear y autorizar un proyecto.

## Investigación

- Supabase Anonymous Sign-Ins: https://supabase.com/docs/guides/auth/auth-anonymous
- Supabase Realtime: https://supabase.com/docs/guides/realtime/subscribing-to-database-changes
- Supabase Data API: https://supabase.com/docs/guides/api/securing-your-api
- Supabase JavaScript SDK: https://supabase.com/docs/reference/javascript/installing
- https://github.com/supabase/supabase-js/releases/tag/v2.117.3

## Relación con proyectos en paralelo

Este PR es independiente de los PR #7 (siete reproductores/comentarios), #8 (fuentes), #9 (Webflow) y #10 (HLS). Si el PR #7 cambia el archivo `episode-comments.js`, comparar ambas versiones antes de fusionar para no perder mejoras.
