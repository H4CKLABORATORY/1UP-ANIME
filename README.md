# 1UP Anime

Aplicación web progresiva independiente de anime, optimizada para celulares y escritorio. Explora datos públicos de anime mediante [Jikan](https://jikan.moe/), consulta estrenos, busca series y guarda tus favoritos y progreso en el dispositivo.

**Sin publicidad propia.** No aloja ni retransmite episodios, no copia la web de JKAnime y no bloquea anuncios ni el acceso de servicios externos. Los enlaces de streaming, si existen, abren las plataformas originales.

## Publicación

En GitHub, abre **Settings > Pages**, elige **Deploy from a branch**, selecciona **main** y **/(root)** y guarda los cambios. Dirección prevista: https://h4cklaboratory.github.io/1UP-ANIME/

## PWA

En iPhone: Safari > Compartir > Añadir a pantalla de inicio. En Android: Chrome > Instalar app, si está disponible.

## Privacidad y servicios

No hay registro de usuarios ni anuncios ni analíticas propias. Se usan datos públicos de Jikan y las miniaturas/sinopsis de sus fuentes. Favoritos y progreso se almacenan en el navegador. Proyecto independiente, no afiliado a JKAnime, Jikan o MyAnimeList.


## Intro, perfiles y Halloween

- Intro cinematográfica original, sin botón de sonido u omitir; intenta sonar al iniciar, con alternativa silenciosa cuando Safari impide audio automático.
- Selección de hasta seis perfiles, cada uno con avatar, favoritos y episodios por separado, almacenados en `localStorage` del navegador.
- No son cuentas con contraseña ni sincronizadas entre dispositivos. Si se borran los datos de Safari, se pierden perfiles y progreso.
- Estética temporal Halloween/anti-magia; contenido y fichas desde Jikan.
- Para iPhone, abrir la web en Safari y elegir **Compartir > Añadir a pantalla de inicio**. Es una PWA, no un archivo IPA ni una aplicación de App Store.


## Actualización: catálogo robusto y acceso opcional

- Continuar como invitado: sin correo, cuenta ni perfil. Los favoritos quedan guardados en este navegador.
- Perfiles locales: opcionales, hasta seis, sin sincronización entre dispositivos.
- Cuentas 1UP: registro nativo con nombre de usuario, correo y contraseña (Supabase Authentication, solo proveedor correo/contraseña). Sin inicio de sesión con terceros. Inactiva hasta configurar Supabase; ver docs/SUPABASE_SETUP.md.
- Catálogo: AniList como fuente principal, Jikan como respaldo, ejemplos locales si ambas fuentes fallan. Los ejemplos NO representan estrenos actuales.
- Categorías: géneros, películas, OVA, ONA, especiales, programación y seguimiento de episodios.
- No se aloja contenido de streaming no autorizado; se enlazan plataformas externas sólo si figuran en las fuentes públicas.

### Configuración de cuentas 1UP

1. Crear proyecto en https://supabase.com/dashboard.
2. Habilitar **únicamente** el proveedor Email en Authentication > Providers. No habilitar Google ni Anonymous.
3. Ejecutar el SQL de `supabase/sql/` (perfiles, comunidad, RLS, Storage).
4. Agregar h4cklaboratory.github.io en Authentication > URL Configuration (Site URL + Redirect URLs).
5. Colocar la URL del proyecto y la clave publicable en `supabase-config.js`, reemplazando null.
6. Probar registro, inicio de sesión, restablecimiento de contraseña y persistencia en Safari y modo PWA.

Pasos exactos en `docs/SUPABASE_SETUP.md`. Las contraseñas las guarda Supabase Authentication (hash); 1UP nunca las almacena. Nunca publicar credenciales privadas en GitHub.


## Reproducción opcional de episodios autorizados

El motor multimedia de 1UP ANIME incluye un selector con **hasta siete posiciones por episodio**. Admite MP4/WebM por HTTPS, HLS nativo en Safari y hls.js en navegadores compatibles, e incrustaciones expresamente permitidas que solo se activan tras pulsar. El selector de episodio sincroniza su número con los comentarios.

**No hay episodios alojados ni fuentes reales configuradas**: `data/licensed-media.json` tiene `entries: {}`. Los botones sin fuente permanecen deshabilitados. Añadir una dirección o indicar `rights: "authorized"` no sustituye una licencia comprobable.

Los módulos principales son `episode-player.js`, `hls-adapter.js`, `scripts/media-source-contract.mjs` y `scripts/dexter-anime-sync.mjs`. Consulta `docs/INTEGRACION_STREAMING_1UP_2026.md`.

El backend Supabase para cuentas, comentarios, progreso y comunidad está preparado pero **desactivado** en `supabase-config.js` hasta que el propietario cree el proyecto. No se han contratado servidores, dominios ni servicios externos.

## App iPhone nativa y Subtitle Studio (19 oct 2026)

- Proyecto SwiftUI auténtico en ios/ y workflow de compilación de simulador (sin firmar). La intro usa el propio archivo de firma 1UP y AVPlayer para intentar sonido automáticamente en el lanzamiento nativo.
- En la web desaparece el botón de sonido de octubre. La intro intenta audio; Safari puede rechazar sonido sin un gesto, y la introducción continúa sin interrumpir al visitante.
- Para fuentes multimedia permitidas, Subtitle Studio permite elegir las pistas WebVTT español/inglés presentes, Bangers por defecto (SIL OFL), Arial, Moderna y Arcade, 4 efectos y tamaño.
- El script scripts/generate-authorized-subtitles.py permite transcribir un archivo local autorizado y crear archivos es/en si faster-whisper y modelos Argos están disponibles. No inventa subtítulos ni descarga video.
- Ver ios/README.md, docs/AUTO_SUBTITLE_PIPELINE_20261019.md y docs/IOS_MULTIAGENT_WORKSTREAMS_20261019.md. La app no está firmada ni publicada en App Store; data/licensed-media.json sigue con entries vacío.

**Privacidad y soporte de iOS:** [política de privacidad](privacy.html) y [guía App Store](ios/APPSTORE_SUBMISSION.md).
