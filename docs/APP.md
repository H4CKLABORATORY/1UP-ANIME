# 1UP ANIME — App (Fase 10): Capacitor sobre la PWA

**Fecha:** 2026-11-07 · **Rama:** `feature/phase10-app` · **Base:** `feature/phase9-qa` (`8e95860`)

1UP ANIME también es app de **App Store + Google Play** mediante un envoltorio
**Capacitor 8** sobre el mismo sitio que ya sirve GitHub Pages. No hay una
segunda base de código: la app empaqueta el sitio (HTML/CSS/JS/datos/assets)
en un webview nativo y lo abre **sin configuración alguna**.

## Regla de oro (primer clic)

Tras instalar, la app **abre y funciona**: catálogo, reproductor y comunidad
funcionan de inmediato **como invitado**. El único primer paso posible es
**opcional**: crear una cuenta (una pantalla). Sin comandos, sin claves, sin
ajustes. Esto es así porque el bundle lleva `supabase-config.js` en su estado
público por defecto (`window.ONEUP_SUPABASE_CONFIG = null` = modo invitado,
verificado dentro del APK construido) y porque todo el contenido viaja dentro
del propio paquete.

## Arquitectura

| Pieza | Qué es |
|---|---|
| `capacitor.config.json` | Configuración: nombre **«1UP ANIME»**, `appId` `com.oneup.anime`, `webDir: mobile/www`, esquema Android `https` |
| `scripts/build-www.mjs` | Ensambla el sitio desplegable (el mismo conjunto de archivos que GitHub Pages sirve desde la raíz) en `mobile/www/` |
| `mobile/www/` | **Artefacto de build** — gitignored, regenerado por `npm run app:sync`; nunca se edita a mano |
| `android/` | Proyecto Android generado por Capacitor y **commiteado** (esqueleto; los builds y los assets copiados están gitignored por su propio `.gitignore`) |
| `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, `@capacitor/ios` | devDependencies oficiales del proyecto Capacitor (únicas dependencias nuevas; cero Firebase/Google-login/Jikan) |

Comandos:

```bash
npm run app:build-www   # solo ensambla mobile/www
npm run app:sync        # build-www + cap sync android (lo que usa el flujo diario)
npm run app:android     # build-www + sync + ./gradlew assembleDebug (APK debug)
npm run app:ios         # build-www + cap sync ios (cuando la plataforma iOS exista, ver abajo)
```

`scripts/build-www.mjs` excluye lo que no forma parte del sitio servido:
`node_modules`, `tests`, `artifacts`, `.git`/`.github`, `supabase/` (fuentes
del backend), `docs`, `scripts`, los proyectos nativos `android/`+`ios/`,
metadatos del repo (`*.md`, `package.json`…) y capturas QA. Falla en voz alta
si falta cualquier archivo de entrada del shell (`index.html`, `sw.js`,
`manifest.webmanifest`, `supabase-config.js`, `studio.js`, `data/catalog.json`,
icono). Resultado verificado: **120 archivos, 7.85 MiB**.

### appId — leer antes de publicar

`com.oneup.anime` es el identificador de la app en ambas tiendas. **Douglas
puede cambiarlo ANTES del primer envío** (editar `capacitor.config.json` y
volver a generar/sincronizar). **Después de publicar, cambiarlo significa una
ficha de tienda NUEVA** (se pierden instalaciones, reseñas y posicionamiento):
las tiendas lo tratan como otra app.

## Comportamiento dentro de la app (verificado estáticamente)

- **Service worker:** en la web no cambia nada. Dentro de la app Android el
  origen es `https://localhost`, así que la antigua condición
  `location.protocol === 'https:'` **habría registrado** el SW de la PWA en el
  webview, donde solo puede servir un shell anticuado (el paquete ya trae todo
  en local). `studio.js` ahora exige además `&& !window.Capacitor`. En iOS el
  esquema es `capacitor://` y ya quedaba excluido por el protocolo. El archivo
  `sw.js` sigue dentro del bundle, inerte en la app.
- **Deep links `/anime/<id>`:** son rutas **internas de la SPA** (History API:
  `pushState`/`popstate` sobre el mismo origen, con `try/catch`). La app
  siempre arranca en `index.html` y la navegación a fichas nunca sale del
  webview ni pide nada a un servidor, así que no se rompen. El `404.html` de
  GitHub Pages (fallback para enlaces compartidos en la web) no aplica dentro
  de la app: no hay servidor que lo sirva ni falta que hace.
- **Modo invitado:** con `supabase-config.js` en `null` el sitio entra en modo
  invitado completo (verificado en el código y dentro del APK). Cuando Douglas
  cree su proyecto Supabase y pegue la configuración pública (paso de la lista
  de lanzamiento web), basta re-sincronizar para que la app use el mismo
  backend — la app y la web comparten esa única fuente.

## Android

### Requisitos (todo gratuito)

- **JDK 21** (Capacitor 8 compila con *source release* 21; con JDK 17 el
  build falla con `invalid source release: 21` — comprobado). En dexter se
  usó Temurin 21 ya instalado: `JAVA_HOME=/usr/lib/jvm/temurin-21-jdk-amd64`.
- Android SDK (plataforma 36 + build-tools) — en dexter ya presente en
  `/usr/local/lib/android/sdk` (`ANDROID_HOME`).
- Node 22 + `npm ci`.

### Build debug — VERIFICADO en dexter

```bash
npm run app:sync
cd android && JAVA_HOME=<jdk21> ./gradlew assembleDebug
# → android/app/build/outputs/apk/debug/app-debug.apk
```

Resultado real de esta fase: **BUILD SUCCESSFUL**; APK de **11,093,020 bytes**;
`aapt dump badging`: paquete `com.oneup.anime`, etiqueta **«1UP ANIME»**,
versionName `1.0`, minSdk 24, targetSdk/compileSdk 36. Dentro del APK,
`assets/public/` contiene el sitio completo (`index.html`, `studio.js` con la
guardia del SW, `supabase-config.js` con `= null`, `data/catalog.json`, …).
**No hay emulador en dexter: la ejecución en un dispositivo real es
NO VERIFICADO** (instalar el APK en un Android y abrirlo es la prueba que
falta; el APK debug se puede instalar directamente, sin tienda).

### Iconos y splash

Iconos adaptativos y de legado generados con la herramienta oficial
`@capacitor/assets` desde el icono del proyecto
(`assets/1up-anime-app-icon-512.png`, escalado a 1024 para la generación):

```bash
npx @capacitor/assets generate --android --assetPath <carpeta-con-icon.png-1024>
```

El splash es fondo sólido de marca `#090a11` con el logo centrado
(`android/app/src/main/res/drawable/splash.xml` + `drawable-nodpi/splash_logo.png`),
no una imagen a pantalla completa. Antes del envío a tiendas conviene un
máster de icono de 1024×1024 nativo (el actual es un escalado del de 512).

### Release para Google Play — pasos de Douglas

1. Crear la cuenta de **Google Play Console: 25 USD, pago único**
   (https://play.google.com/console).
2. Crear SU keystore de subida (**nunca** sale de su máquina; **jamás** se
   commitea — el repo ya ignora `*.keystore`/`*.jks`/`*.apk`/`*.aab`):

   ```bash
   keytool -genkeypair -v -keystore oneup-upload.jks -alias oneup \
     -keyalg RSA -keysize 2048 -validity 9125
   ```

3. Apuntar Gradle a ese keystore con propiedades **fuera del repo**
   (`~/.gradle/gradle.properties`: `ONEUP_UPLOAD_STORE_FILE`, `…_STORE_PASSWORD`,
   `…_KEY_ALIAS`, `…_KEY_PASSWORD`) y una `signingConfig` de release que las
   lea; activar **Play App Signing** en la consola (Google custodia la clave
   final; la de subida es reemplazable si se pierde).
4. Generar el paquete de tienda: `cd android && ./gradlew bundleRelease`
   → `app-release.aab`, y subirlo a Play Console (producción o primero una
   pista de prueba cerrada).
5. Ficha: capturas, descripción, política de privacidad
   (`https://h4cklaboratory.github.io/1UP-ANIME/privacy.html`), clasificación
   de contenido y declaración de seguridad de datos.

El build release firmado es **IMPLEMENTADO PERO NO VERIFICADO**: sin el
keystore de Douglas no se puede producir ni probar aquí, por diseño.

## iOS

- **Generación del proyecto: funciona en Linux** — verificado en una copia
  desechable: con la carpeta `ios/` libre, `npx cap add ios` genera
  `ios/App/App.xcodeproj` (Capacitor 8 usa SPM: `ios/App/CapApp-SPM`).
- **En ESTE repo la generación está BLOQUEADA por colisión de carpeta:** ya
  existe un proyecto **SwiftUI nativo** previo en `ios/` (ver
  `ios/README.md`), y Capacitor responde
  `[error] ios platform already exists`. Ese proyecto no se ha tocado.
  **Decisión de Douglas:** cuál de las dos vías iOS va a la tienda.
  - Si elige Capacitor: mover el proyecto nativo a otro nombre
    (p. ej. `ios-native/`) y ejecutar `npx cap add ios && npm run app:ios`.
  - O generar el proyecto Capacitor en su Mac en un clon limpio.
- **Compilar el `.ipa` exige un Mac + Xcode + cuenta Apple Developer
  (99 USD/año)** — es paso de Douglas, no realizable en dexter:
  1. En el Mac: `npm ci && npm run app:ios` (con la plataforma ya generada).
  2. `npx cap open ios` → Xcode: seleccionar su Team, Archive → App Store Connect.
  3. En App Store Connect: ficha, capturas, clasificación por edades,
     información de privacidad (la app no recoge datos en modo invitado;
     cuentas/comunidad usan Supabase cuando Douglas lo active).

## Revisión de tiendas y Regla 12

La app muestra **exactamente el mismo contenido que la web: solo medios
licenciados/autorizados (Regla 12)** — nada de streams piratas. Esa es también
la postura segura ante la revisión de Apple (directriz 5.2, propiedad
intelectual) y de Google Play (política de PI): el catálogo es informativo
(AniList) y el reproductor solo admite fuentes con derechos configurados.
Además el modo invitado completo (sin obligación de cuenta para usar la app)
simplifica la revisión en ambas tiendas.

## Estado honesto de la fase

| Superficie | Estado |
|---|---|
| Capacitor + `build-www` + `app:sync` | **TERMINADO Y VERIFICADO** en dexter |
| Proyecto Android + APK debug (tamaño, paquete, assets dentro) | **TERMINADO Y VERIFICADO** en dexter |
| Iconos Android + splash de marca | **TERMINADO Y VERIFICADO** (generados y dentro del APK) |
| Comportamiento en app (SW, deep links SPA, invitado) | **VERIFICADO estáticamente** (código + contenido del APK) |
| Ejecución en dispositivo/emulador | **NO VERIFICADO** — no hay emulador en dexter |
| Generación iOS (proyecto Xcode) | **VERIFICADA en copia desechable**; en el repo, **BLOQUEADA** por el proyecto SwiftUI previo en `ios/` (decisión de Douglas) |
| Build release firmado (AAB) e `.ipa` | **NO VERIFICADO / pasos de Douglas** (keystore, Mac, cuentas de tienda) |
| Envío a tiendas | **Paso de Douglas**: Play Console 25 USD único; Apple Developer 99 USD/año |
