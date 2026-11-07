# 1UP Anime — Cuentas 1UP y comunidad (Supabase)

Cuentas propias de 1UP Anime: cada usuario crea su cuenta con **nombre de usuario + correo + contraseña** e inicia sesión con **correo + contraseña**. No hay inicio de sesión con Google ni con ningún proveedor externo.

- **Contraseñas:** las guarda Supabase Authentication (con hash). 1UP nunca las almacena ni las ve.
- **Nombres de usuario:** únicos. Se guardan en Postgres (`public.profiles`, columna `username` única) y un disparador (trigger) crea el perfil automáticamente al registrarse; la restricción única es la que decide si dos personas piden el mismo nombre a la vez.
- **Invitados:** pueden explorar todo el catálogo sin cuenta. Comentar y guardar favoritos requieren una cuenta 1UP.
- **Restablecer contraseña:** por correo, con el flujo de Supabase (el usuario recibe un enlace y escribe la nueva contraseña en la misma página).

> **Nota de migración (noviembre de 2026):** antes el backend era Firebase (Google). Douglas pidió eliminarlo por completo porque Firebase es plataforma de Google. Todo el código, las reglas, las funciones y la documentación de Firebase se borraron de este repositorio y se reescribieron sobre Supabase (código abierto, Postgres). No se migró ningún usuario ni contenido: el proyecto Firebase nunca llegó a activarse en producción, así que no había cuentas que trasladar. Si ves la palabra Firebase en algún documento histórico antiguo, es solo historia: el backend activo es Supabase.

## Estado

- Código: **implementado** (formularios de registro/inicio/restablecimiento/cambio de contraseña, cierre de sesión, persistencia de sesión, nombres únicos, bloqueo de comentar/favoritos sin cuenta, comunidad, chat global, perfiles, seguir, amistad, reportes, moderación).
- Pruebas locales contra un stack Supabase real en dexter: **verificadas** (`npm run test:auth:supabase`, ver `tests/auth-supabase.test.mjs`): registro, correo duplicado, nombre duplicado, inicio de sesión, contraseña incorrecta, restablecimiento, nombres inválidos/reservados, RLS (un usuario no puede escribir los datos de otro), límite de 45 segundos entre comentarios, publicación protegida, reacciones y distintivos protegidos.
- **En vivo: IMPLEMENTADO PERO NO VERIFICADO** hasta que el propietario complete los pasos de abajo y pruebe con una cuenta real.

## Pasos que debe hacer el propietario (Douglas)

### 1. Crear el proyecto Supabase

1. Abre https://supabase.com/dashboard e inicia sesión (o crea la cuenta).
2. **New project** → nombre: `1up-anime` → contraseña de base de datos (guárdala bien, es solo para el proyecto) → región cercana a tu público (por ejemplo `South America (São Paulo)` o `US East (N. Virginia)`).
3. Espera a que se cree el proyecto (tarda 1-2 minutos).

### 2. Habilitar SOLO el proveedor correo/contraseña

1. En el menú: **Authentication → Providers**.
2. Activa **Email** (debe quedar como único proveedor de registro).
3. **No habilites Google** ni ningún otro proveedor, y **no habilites Anonymous**: las cuentas 1UP son nativas y el anónimo está bloqueado en la base de datos.
4. En **Authentication → Providers → Email**: deja activado **Confirm email** si quieres que cada cuenta confirme su correo antes de entrar (recomendado), o desactívalo si prefieres registro inmediato. El código maneja los dos casos: si la confirmación está activa, tras registrarse se muestra "Revisa tu correo para confirmarla".

### 3. Ejecutar el SQL (tablas, perfiles, RLS, límites)

1. En el menú: **SQL Editor → New query**.
2. Copia y ejecuta, en este orden, los archivos del repositorio (o usa `supabase db push` con la CLI):
   - `supabase/sql/oneup_auth.sql` — tabla `profiles`, disparador de registro, nombres únicos.
   - `supabase/sql/oneup_community_optional.sql` — comentarios por episodio, reportes, progreso/favoritos.
   - `supabase/sql/oneup_community.sql` — publicaciones, respuestas, chat global, perfiles públicos, seguir, amistad, verificación, reportes, moderación, límites.
   - `supabase/sql/oneup_storage.sql` — carpetas de fotos de perfil y archivos de publicaciones.
3. Cada archivo debe terminar sin errores. Si uno falla, no sigas con el siguiente: revisa el mensaje y vuelve a intentarlo.

### 4. Desplegar las Edge Functions (moderación + buscador)

Las funciones de moderación y el buscador de anime viven en `supabase/functions/`. Necesitan la CLI de Supabase (o desplegar desde el panel):

```bash
npm install -g supabase
supabase login
supabase link --project-ref TU_PROJECT_REF   # se ve en Settings → General → Reference ID
supabase functions deploy moderation-dashboard moderate-post review-report review-verification moderate-episode-comment moderate-global-message moderate-community-reply anime1v-discovery
```

También puedes usar el workflow de GitHub **Activate 1UP Community Supabase** (`.github/workflows/supabase-deploy.yml`): necesita las variables `SUPABASE_PROJECT_REF` y los secretos `SUPABASE_ACCESS_TOKEN` y `SUPABASE_DB_PASSWORD` en el repositorio.

El buscador de anime (`anime1v-discovery`) necesita además dos secretos en el proyecto Supabase (**Edge Functions → Secrets** o `supabase secrets set`):

```bash
supabase secrets set ANIME1V_BASE_URL=https://TU_SERVIDOR_ANIME1V ANIME1V_API_KEY=TU_CLAVE_PRIVADA
```

Sin esos secretos, el buscador responde "Anime1v aún no está configurada" y el resto del sitio sigue funcionando.

### 5. Copiar la configuración pública en `supabase-config.js`

1. En Supabase: **Project Settings (⚙) → API**.
2. Copia la **Project URL** (`https://xxxx.supabase.co`) y la clave **publishable** (empieza por `sb_publishable_`).
3. En el repositorio, abre `supabase-config.js` y reemplaza `null` por ese objeto:

```js
window.ONEUP_SUPABASE_CONFIG = {
  url: 'https://xxxx.supabase.co',
  publishableKey: 'sb_publishable_TU_CLAVE_PUBLICA'
};
```

> **Nunca** pegues aquí la clave `service_role`, una `sb_secret_`, la contraseña de la base de datos ni ningún token personal. La configuración web es pública por diseño; lo que protege la app son las políticas RLS de Postgres y las Edge Functions.

### 6. Autorizar el dominio y las redirecciones

1. En Supabase: **Authentication → URL Configuration**.
2. **Site URL:** `https://h4cklaboratory.github.io/1UP-ANIME/`
3. **Redirect URLs:** añade `https://h4cklaboratory.github.io/1UP-ANIME/**` (el restablecimiento de contraseña vuelve a la página principal).
4. Para pruebas locales añade también `http://localhost:8000/**`.

### 7. Darte el rol de propietario (moderación)

La moderación solo la hacen cuentas con rol en la base de datos. Ejecuta esto en el **SQL Editor** con TU id de usuario (lo ves en **Authentication → Users** tras crear tu cuenta, columna `User UID`):

```sql
insert into public.oneup_admin_roles (user_id, role)
values ('TU-UUID-DE-USUARIO', 'owner');
insert into public.oneup_creator_profiles (user_id, display_name, verified, owner)
values ('TU-UUID-DE-USUARIO', 'tu_usuario', true, true)
on conflict (user_id) do update set verified = true, owner = true;
```

Sin este paso, el panel de moderación (`moderacion.html`) dirá "Acceso denegado".

### 8. Publicar y probar

1. Haz commit de `supabase-config.js` y espera a que GitHub Pages publique.
2. Abre https://h4cklaboratory.github.io/1UP-ANIME/ y prueba:
   - **Crear cuenta:** nombre de usuario (3–20 caracteres, letras a-z, números y `_`), correo y contraseña (mínimo 8 caracteres, con letra y número). Debe aparecer tu nombre arriba a la derecha.
   - **Nombre duplicado:** intenta registrar el mismo nombre con otro correo: debe rechazarlo con "Ese nombre de usuario ya está en uso".
   - **Correo duplicado:** mismo correo con otro nombre: debe rechazarlo.
   - **Cerrar sesión y volver a entrar** con correo + contraseña.
   - **Recargar la página:** la sesión debe seguir iniciada (persistencia local).
   - **¿Olvidaste tu contraseña?** → escribe el correo → debe llegar un correo de restablecimiento → el enlace abre la página y pide la nueva contraseña.
   - **Sin cuenta:** intenta guardar un favorito o comentar un episodio → debe pedirte iniciar sesión.
   - **Comunidad:** en `comunidad.html`, publicar y chatear requieren la cuenta; leer es público.
   - **Moderación:** en `moderacion.html`, con tu cuenta de propietario, deben verse las publicaciones multimedia pendientes y los reportes.
3. En el panel de Supabase puedes ver los usuarios en **Authentication → Users** y los nombres en **Table Editor → `profiles`**.

## Costes

Supabase tiene plan **gratuito** (Free) que cubre el volumen de 1UP Anime (Auth, base de datos, Storage y Edge Functions con límites generosos). Si el uso crece, Supabase avisa antes de cobrar. Revisa los límites del plan Free en https://supabase.com/pricing antes de abrir la comunidad al público.

## Qué NO hacer

- No habilitar el proveedor Google ni Anonymous: 1UP no tiene botón ni código de Google, y la base de datos rechaza sesiones anónimas.
- No guardar contraseñas en Postgres, en el código ni en ningún documento.
- No compartir ni publicar la clave `service_role` (`sb_secret_...`): es secreta y solo vive en las Edge Functions.
- No quitar la restricción única de `profiles.username`: rompería la unicidad de nombres.
- No dar acceso directo a `public.oneup_admin_roles` desde el cliente: solo se escribe desde el SQL Editor (o con la clave de servicio).

## Qué cambió respecto al backend anterior

| Antes (eliminado) | Ahora (Supabase) |
|---|---|
| Auth con correo/contraseña | Supabase Auth, solo Email |
| Nombres en `usernames/{nombre}` + `users/{uid}` | Tabla `public.profiles` + trigger `oneup_handle_new_user` |
| Reglas Firestore | Políticas RLS en Postgres |
| Storage + reglas Storage | Buckets `avatars` y `post-uploads` + políticas Storage |
| App Check reCAPTCHA | Eliminado: no hay equivalente necesario; RLS + límites en base de datos |
| `submitEpisodeComment` (callable) | Insert directo en `oneup_episode_comments` + trigger (45 s, nombre desde perfil) |
| `createCommunityPost` (callable) | Insert directo en `oneup_community_posts` + trigger (45 s; con archivo queda `pending`) |
| `replyCommunityPost` (callable) | Insert directo en `oneup_community_comments` + trigger (14 s) |
| `sendGlobalMessage` (callable) | Insert directo en `oneup_global_messages` + trigger (15 s) |
| `toggleCommunityReaction` (callable) | RPC `toggle_community_reaction(uuid)` |
| `reportContent` (callable) | Insert directo en `oneup_moderation_reports` + trigger (30 s) |
| `setMyCommunityProfile` (callable) | Upsert directo en `oneup_creator_profiles` + trigger (60 s; distintivos protegidos) |
| `toggleFollow` (callable) | RPC `toggle_follow(uuid)` |
| `requestVerification` (callable) | Insert directo en `oneup_verification_requests` + trigger (1/día) |
| `requestFriendship` / `listMyFriendRequests` / `respondFriendship` (callables) | Insert directo en `oneup_friend_requests` + selects RLS + RPC `respond_friendship(uuid, boolean)` |
| `moderateCommunityPost` / `moderateEpisodeComment` / `moderateGlobalMessage` / `moderateCommunityReply` / `reviewReport` / `reviewVerification` / `moderationDashboard` (callables) | Edge Functions `moderate-post`, `moderate-episode-comment`, `moderate-global-message`, `moderate-community-reply`, `review-report`, `review-verification`, `moderation-dashboard` |
| `anime1vDiscovery` (onRequest) | Edge Function `anime1v-discovery` |

**Lo que se pierde (honesto):**
- **App Check (reCAPTCHA Enterprise):** no existe en Supabase. Se sustituye con RLS + límites por usuario en la base de datos + CAPTCHA de Supabase (opcional, en Authentication → Settings → Bot protection, con Cloudflare Turnstile) antes de abrir la comunidad al público.
- **Validación del archivo en el servidor al publicar:** antes una función comprobaba que el archivo existiera y midiera su tipo/tamaño antes de crear la publicación. Ahora lo comprueban la política de Storage (ruta del propietario + extensión + tamaño máximo del bucket), la validación del navegador y que las publicaciones con archivo quedan `pending` hasta que un moderador las aprueba.
- **Sesiones anónimas para reportar:** antes se podía reportar con sesión anónima. Ahora reportar requiere cuenta 1UP (el proveedor Anonymous debe estar desactivado y los triggers lo rechazan).
- **Límite por hora global (55/hora):** se mantiene en la tabla `oneup_rate_limits`, con los mismos intervalos por acción que antes.

## Desarrollo local (sin proyecto en la nube)

```bash
# 1. Instalar la CLI y arrancar el stack local (Docker necesario)
supabase start
# 2. Aplicar el SQL a la base local
export PGPASSWORD=postgres
psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f supabase/sql/oneup_auth.sql
psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f supabase/sql/oneup_community_optional.sql
psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f supabase/sql/oneup_community.sql
psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f supabase/sql/oneup_storage.sql
# 3. Probar (o todo junto con scripts/run-supabase-local.sh)
npm run test:auth:supabase
# 4. Apagar el stack
supabase stop
```

Las claves que muestra `supabase start` son **solo para desarrollo local** y no sirven para el proyecto en la nube. Para apuntar la web al stack local durante pruebas, pon la URL `http://127.0.0.1:54321` y la clave publicable local en `supabase-config.js` y **no hagas commit** de esos valores.

## Archivos relacionados

- `auth.js` — registro, inicio, restablecimiento, cambio de contraseña, cierre de sesión, persistencia y bloqueo de acciones sin cuenta.
- `supabase-config.js` — configuración pública (aquí pega Douglas su URL + clave publicable).
- `supabase/sql/oneup_auth.sql` — perfiles y unicidad de nombres.
- `supabase/sql/oneup_community_optional.sql` — comentarios por episodio, reportes, progreso/favoritos.
- `supabase/sql/oneup_community.sql` — comunidad, chat, perfiles, amistad, moderación, límites.
- `supabase/sql/oneup_storage.sql` — buckets y políticas de archivos.
- `supabase/functions/` — moderación y buscador (Edge Functions Deno).
- `social-backend.js` — adaptador de comunidad para el navegador (Supabase JS).
- `supabase-episode-backend.js` — adaptador de comentarios por episodio y progreso.
- `tests/auth-email.test.mjs` — pruebas unitarias con Supabase simulado.
- `tests/auth-supabase.test.mjs` — pruebas contra el stack Supabase local.
- `tests/auth.spec.js` — pruebas de interfaz (Playwright).
- `scripts/run-supabase-local.sh` — arranca el stack local, aplica el SQL y corre las pruebas.
