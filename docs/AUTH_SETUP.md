# 1UP Anime — Cuentas 1UP (registro nativo)

Cuentas propias de 1UP Anime: cada usuario crea su cuenta con **nombre de usuario + correo + contraseña** e inicia sesión con **correo + contraseña**. No hay inicio de sesión con Google ni con ningún proveedor externo.

- **Contraseñas:** las guarda Firebase Authentication (con hash). 1UP nunca las almacena ni las ve.
- **Nombres de usuario:** únicos. Se reservan en Firestore (`usernames/{nombre}` + `users/{uid}`) y las reglas lo exigen.
- **Invitados:** pueden explorar todo el catálogo sin cuenta. Comentar y guardar favoritos requieren una cuenta 1UP.
- **Restablecer contraseña:** por correo, con el flujo de Firebase (el usuario recibe un enlace).

## Estado

- Código: **implementado** (formularios de registro/inicio/restablecimiento, cierre de sesión, persistencia de sesión, nombres únicos, bloqueo de comentar/favoritos sin cuenta).
- Pruebas con emulador de Firebase: **verificadas en dexter** (ver `tests/auth-emulator.test.mjs`).
- **En vivo: IMPLEMENTADO PERO NO VERIFICADO** hasta que el propietario complete los pasos de abajo y pruebe con una cuenta real.

## Pasos que debe hacer el propietario (Douglas)

### 1. Crear el proyecto Firebase

1. Abre https://console.firebase.google.com/ e inicia sesión con tu cuenta de Google (solo para administrar Firebase; los usuarios de 1UP no usan Google).
2. **Add project** (Agregar proyecto) → nombre: `1up-anime` → sigue el asistente (puedes desactivar Google Analytics; no hace falta).
3. Espera a que se cree el proyecto.

### 2. Habilitar SOLO el proveedor correo/contraseña

1. En el menú: **Build → Authentication → Sign-in method**.
2. Haz clic en **Email/Password** → **Enable** (Habilitar) → **Save**.
3. **No habilites Google** ni ningún otro proveedor: las cuentas 1UP son nativas.

### 3. Crear la base de datos Firestore (para los nombres de usuario)

1. En el menú: **Build → Firestore Database → Create database**.
2. Elige **Start in production mode** (las reglas del repositorio controlan el acceso).
3. Ubicación: la más cercana a tu público (por ejemplo `us-east1` o `southamerica-east1`).
4. Pulsa **Enable**.

### 4. Desplegar las reglas de Firestore

Sin este paso el registro falla al reservar el nombre de usuario. Hay dos formas:

**Opción A — workflow de GitHub (recomendada, ya existe):**

1. En GitHub: `H4CKLABORATORY/1UP-ANIME` → **Settings → Secrets and variables → Actions**.
2. Crea las variables de repositorio (si no existen): `FIREBASE_PROJECT_ID` (el ID del proyecto), `ONEUP_FIREBASE_WEB_CONFIG` (la configuración web pública en JSON, ver paso 5) y `ONEUP_APP_CHECK_SITE_KEY` (clave pública de reCAPTCHA Enterprise, ver `FIREBASE_COMUNIDAD_SETUP.md`).
3. Crea el secreto `FIREBASE_SERVICE_ACCOUNT` con el JSON privado de una cuenta de servicio (nunca lo publiques ni lo compartas en el chat).
4. **Actions → Activate 1UP Community Firebase → Run workflow**. El workflow despliega las reglas de Firestore/Storage y las funciones, y publica la configuración pública en `auth-config.js`.

**Opción B — desde tu computadora con Firebase CLI:**

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules --project TU_PROJECT_ID
```

Verifica en la consola: **Firestore Database → Rules** debe mostrar las reglas de `usernames` y `users` del repositorio.

### 5. Registrar la aplicación web y copiar la configuración

1. En Firebase: **Project settings (⚙) → Your apps → Add app → Web** (icono `</>`).
2. Nombre de la app: `1UP Anime Web`. No hace falta marcar Firebase Hosting.
3. Copia el objeto `firebaseConfig` que muestra (es **público**, no es un secreto):

```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "tu-proyecto.firebaseapp.com",
  projectId: "tu-proyecto",
  storageBucket: "tu-proyecto.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef..."
};
```

4. En el repositorio, abre `auth-config.js` y reemplaza `null` por ese objeto:

```js
window.ONEUP_FIREBASE_CONFIG = {
  apiKey: "AIza...",
  authDomain: "tu-proyecto.firebaseapp.com",
  projectId: "tu-proyecto",
  storageBucket: "tu-proyecto.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef..."
};
```

Los valores también están documentados en `.env.example` (solo como referencia; el sitio es estático y lee `auth-config.js`).

> **Nunca** pegues aquí un JSON de cuenta de servicio ni ninguna clave privada. La configuración web es pública por diseño; lo que protege la app son las reglas de Firestore/Storage y las funciones del servidor.

### 6. Autorizar el dominio

1. En Firebase: **Authentication → Settings → Authorized domains → Add domain**.
2. Añade `h4cklaboratory.github.io` (el dominio de GitHub Pages).
3. `localhost` y `*.firebaseapp.com` ya vienen autorizados (útiles para pruebas locales).

### 7. Publicar y probar

1. Haz commit de `auth-config.js` y espera a que GitHub Pages publique.
2. Abre https://h4cklaboratory.github.io/1UP-ANIME/ y prueba:
   - **Crear cuenta:** nombre de usuario (3–20 caracteres, letras a-z, números y `_`), correo y contraseña (mínimo 8 caracteres, con letra y número). Debe aparecer tu nombre arriba a la derecha.
   - **Nombre duplicado:** intenta registrar el mismo nombre con otro correo: debe rechazarlo con "Ese nombre de usuario ya está en uso".
   - **Correo duplicado:** mismo correo con otro nombre: debe rechazarlo.
   - **Cerrar sesión y volver a entrar** con correo + contraseña.
   - **Recargar la página:** la sesión debe seguir iniciada (persistencia local).
   - **¿Olvidaste tu contraseña?** → escribe el correo → debe llegar un correo de restablecimiento.
   - **Sin cuenta:** intenta guardar un favorito o comentar un episodio → debe pedirte iniciar sesión.
   - **Comunidad:** en `comunidad.html`, publicar y chatear requieren la cuenta; leer es público.
3. En la consola de Firebase puedes ver los usuarios en **Authentication → Users** y los nombres en **Firestore Database → `usernames` / `users`**.

## Costes

Firebase Authentication (correo/contraseña) y Firestore entran en el plan **Spark (gratis)** para el volumen de 1UP Anime. Si el uso crece, Firebase avisa antes de cobrar; no hay tarjeta obligatoria para el plan gratuito.

## Qué NO hacer

- No habilitar el proveedor Google: 1UP no tiene botón ni código de Google.
- No guardar contraseñas en Firestore, en el código ni en ningún documento.
- No compartir ni publicar el JSON de la cuenta de servicio (`FIREBASE_SERVICE_ACCOUNT`): es secreto y solo vive en GitHub Secrets.
- No cambiar las reglas de `usernames` para permitir sobrescritura: rompería la unicidad de nombres.

## Archivos relacionados

- `auth.js` — registro, inicio, restablecimiento, cierre de sesión, persistencia y bloqueo de acciones sin cuenta.
- `auth-config.js` — configuración pública (aquí pega Douglas su config).
- `firestore.rules` — unicidad de `usernames`, perfiles `users/{uid}`.
- `storage.rules` — subidas solo con cuenta 1UP (proveedor `password`).
- `functions/index.js` — el servidor solo acepta cuentas 1UP (`sign_in_provider == 'password'`).
- `tests/auth-email.test.mjs` — pruebas unitarias con Firebase simulado.
- `tests/auth-emulator.test.mjs` — pruebas contra el emulador de Firebase.
- `tests/auth.spec.js` — pruebas de interfaz (Playwright).
