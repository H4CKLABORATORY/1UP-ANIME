# 1UP Anime - Google y catálogo

## Acceso
- Continuar como invitado funciona sin registro.
- Los antiguos perfiles locales son opcionales.
- El botón de Google requiere un proyecto Firebase configurado por el propietario. Antes de configurarlo, muestra una explicación en lugar de simular un inicio de sesión.
- Los favoritos y el progreso permanecen en este dispositivo, incluso si el usuario accede con Google. Para sincronización real entre dispositivos se necesita una base de datos y reglas de seguridad.

## Pasos para activar Google
1. Abre https://console.firebase.google.com y crea un proyecto para 1UP Anime.
2. En Project settings > Your apps, registra una aplicación Web.
3. En Authentication > Sign-in method, habilita Google y configura el correo de soporte.
4. En Authentication > Settings > Authorized domains, añade h4cklaboratory.github.io.
5. En auth-config.js, cambia el valor null por el objeto público de configuración Firebase de tu aplicación Web. Debe incluir apiKey, authDomain, projectId, appId y messagingSenderId.
6. Guarda los cambios en main y publica GitHub Pages. Abre la web en Safari y prueba Continuar con Google.

No publiques claves de cuentas de servicio ni credenciales administrativas en un repositorio público.

## Catálogo
- Fuente primaria: https://graphql.anilist.co - datos públicos AniList GraphQL.
- Respaldo: https://api.jikan.moe/v4 - datos públicos de Jikan/MyAnimeList.
- Si ambas fuentes fallan, hay una galería curada de ejemplos que se identifica explícitamente como no actualizada. No es un calendario real de emisiones.
- El navegador necesita conexión para datos y pósteres actuales.
- La web muestra enlaces externos de streaming informados por las fuentes de datos, pero no aloja episodios ni utiliza reproductores no autorizados de otras páginas.

## Publicación
GitHub Pages debe utilizar main, raíz del repositorio.
Página prevista: https://h4cklaboratory.github.io/1UP-ANIME/
