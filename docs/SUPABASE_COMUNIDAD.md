# 1UP ANIME — Supabase como backend de la comunidad

Supabase es **el backend** de 1UP Anime: cuentas, comunidad, comentarios por episodio, favoritos y moderación. La configuración completa (proyecto, SQL, funciones y pruebas) está en `docs/SUPABASE_SETUP.md`; este documento describe el modelo de datos y seguridad.

## Estado real

- No se ha creado ningún proyecto en la nube todavía. `supabase-config.js` contiene `null`: **este código permanece desactivado** y no altera la web pública hasta que Douglas cree el proyecto y pegue su URL + clave publicable.
- El stack local (`supabase start`) con todo el SQL aplicado está verificado en dexter: registro, RLS y límites probados con `npm run test:auth:supabase`.
- No se ha migrado historial ni usuarios desde ningún backend anterior: el proyecto anterior nunca llegó a activarse en producción, así que no había cuentas que trasladar.

## Archivos

- `supabase/sql/oneup_auth.sql`: perfiles (`public.profiles`), disparador de registro, nombres únicos.
- `supabase/sql/oneup_community_optional.sql`: comentarios por episodio, reportes de episodios, progreso/favoritos.
- `supabase/sql/oneup_community.sql`: publicaciones, respuestas, chat global, perfiles públicos, seguir, amistad, verificación, reportes, moderación, límites.
- `supabase/sql/oneup_storage.sql`: buckets `avatars` y `post-uploads` + políticas.
- `supabase/functions/`: moderación (`moderation-dashboard`, `moderate-post`, `review-report`, `review-verification`, `moderate-episode-comment`, `moderate-global-message`, `moderate-community-reply`) y buscador (`anime1v-discovery`).
- `supabase-episode-backend.js`: adaptador del navegador para comentarios por episodio y progreso.
- `social-backend.js`: adaptador del navegador para la comunidad (`window.OneUpSocialBackend`).
- `scripts/check-supabase-option.mjs`: comprobaciones locales de estructura y seguridad.
- `scripts/run-supabase-local.sh`: stack local + SQL + pruebas.

## Para activar

1. Crear el proyecto Supabase y habilitar SOLO Email en Authentication → Providers (sin Google, sin Anonymous).
2. Ejecutar los 4 archivos SQL en el SQL Editor, en el orden de `docs/SUPABASE_SETUP.md`.
3. Desplegar las Edge Functions (`supabase functions deploy ...` o el workflow de GitHub).
4. Pegar la URL + clave publicable en `supabase-config.js`.
5. Añadir `h4cklaboratory.github.io` a Authentication → URL Configuration (Site URL + Redirect URLs).
6. Crear el rol de propietario en `oneup_admin_roles` (ver `docs/SUPABASE_SETUP.md` paso 7).
7. Activar la protección anti-bots (Authentication → Settings → Bot protection, Cloudflare Turnstile) y revisar cuotas ANTES de abrir la comunidad al público.

Ejemplo de configuración (valores ficticios):

    window.ONEUP_SUPABASE_CONFIG = {
      url: 'https://example.supabase.co',
      publishableKey: 'sb_publishable_REEMPLAZA_CON_TU_CLAVE_PUBLICA'
    };

## Modelo de acceso y seguridad

- Comentarios visibles al público. Para comentar hace falta una cuenta 1UP (correo + contraseña); no hay sesiones anónimas y los disparadores las rechazan.
- El nombre que se muestra junto a cada comentario/publicación lo pone el servidor (disparador) desde `public.profiles` / `oneup_creator_profiles`: el cliente no puede hacerse pasar por otro usuario ni ponerse distintivos.
- Solo los usuarios autenticados con cuenta pueden insertar sus propios comentarios, publicaciones, respuestas, mensajes y reportes; RLS bloquea que cambien el autor.
- Límites por usuario en la base de datos: episodio 45 s, publicación 45 s, respuesta 14 s, chat 15 s, reporte 30 s, perfil 60 s, verificación 1/día, amistad 45 s; máximo 55 publicaciones por hora.
- Las publicaciones con archivo multimedia quedan `pending` hasta que un moderador las aprueba en `moderacion.html`.
- Reportes únicos por comentario y usuario (episodios); los reportes no son públicos. La moderación se hace con Edge Functions y la clave de servicio, nunca desde el navegador.
- Favoritos y progreso se guardan por `auth.uid()` con RLS; no son públicos.
- Los distintivos (verificado/propietario) y el contador de seguidores no los puede cambiar el usuario: un disparador los restaura en cada escritura.
- Una limitación por identidad no evita bots que generan muchas cuentas: habilitar CAPTCHA, moderación y límites de abuso antes de producción.
- No existe todavía moderación automatizada ni notificaciones.

## Realtime

Se usa `postgres_changes` y se actualiza la lista al cambiar la tabla. Es sencillo para tráfico inicial; la guía Supabase recomienda Broadcast para operaciones a gran escala. Las tablas de comunidad y episodios están en la publicación `supabase_realtime` (lo hace el SQL).

## Pruebas

- `node scripts/check-supabase-option.mjs` — estructura y seguridad sin red ni secretos.
- `node --test tests/auth-email.test.mjs` — cuentas con Supabase simulado.
- `npm run test:auth:supabase` — cuentas, RLS y límites contra el stack local real.
- El workflow `supabase-optional-check.yml` solo prueba código y políticas esperadas.

## Investigación

El buscador de anime (`anime1v-discovery`) usa solo búsqueda y catálogo de Anime1v (metadatos). No toca episodios, ni resuelve vídeos, ni descarga contenido. Necesita los secretos `ANIME1V_BASE_URL` y `ANIME1V_API_KEY` en las Edge Functions; sin ellos responde que aún no está configurado.
