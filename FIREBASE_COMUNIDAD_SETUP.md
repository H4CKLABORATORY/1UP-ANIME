# Activar Firebase de 1UP Anime desde iPhone

El codigo de la red social y los comentarios esta disponible en este repositorio, pero GitHub Pages solo distribuye archivos estaticos. Para que las publicaciones y comentarios aparezcan a otros usuarios necesitas desplegar un backend y activar Google/Anonymous Auth.

## Sin computadora

1. En Safari o en el plugin Firebase, crea un proyecto Firebase controlado por tu cuenta.
2. Habilita Authentication: Google y Anonymous. Agrega h4cklaboratory.github.io a Authorized domains.
3. Habilita Cloud Firestore, Cloud Storage y App Check reCAPTCHA Enterprise. Algunas funciones requieren plan Blaze (con facturacion).
4. Abre GitHub (sitio escritorio en Safari si hace falta) > H4CKLABORATORY/1UP-ANIME > Settings > Secrets and variables > Actions.
5. Crea variables de repositorio FIREBASE_PROJECT_ID, ONEUP_FIREBASE_WEB_CONFIG (configuracion PUBLICA completa de Firebase Web SDK en JSON) y ONEUP_APP_CHECK_SITE_KEY (clave PUBLICA reCAPTCHA Enterprise).
6. Crea el secreto FIREBASE_SERVICE_ACCOUNT con la credencial JSON PRIVADA de una identidad de despliegue de Google Cloud, con permisos minimos. No publiques ni compartas este secreto en el chat.
7. GitHub > Actions > Activate 1UP Community Firebase > Run workflow. El proceso despliega las reglas, Cloud Functions y publica la configuracion publica de la web solo si el servidor termina correctamente.
8. Prueba con dos dispositivos: comentarios de invitados en capitulos, publicaciones y chat con Google, perfiles y reportes.

## Administracion

Panel: https://h4cklaboratory.github.io/1UP-ANIME/moderacion.html
Define manualmente en Firestore adminRoles/{UID} con {role: "owner"} y creatorFlags/{UID} con {owner: true, verified: true}. UID es el identificador real de tu cuenta autenticada con Google, NO el nombre que aparece en la pagina. Solo el propietario puede conceder verificaciones; los moderadores solo pueden revisar publicaciones y reportes autorizados.

Las amistades requieren invitacion y aceptacion. Los perfiles Google pueden publicar, chatear, reaccionar, compartir y solicitar verificacion. Los comentarios de capitulos pueden escribirse como invitado con seudonimo temporal (Firebase Anonymous por dentro). Las publicaciones multimedia quedan pendientes de revision.

## Costes y seguridad

Antes de abrir una red social publica, revisa facturacion, cuotas de Firestore/Cloud Functions/Storage, normas de contenido, moderacion, proteccion infantil y mecanismos de reporte. App Check y limites de publicacion ayudan, pero no eliminan todo el abuso.

No es apropiado extraer ni redistribuir automaticamente episodios protegidos de JKAnime, Netflix o canales IPTV sin autorizacion. El reproductor actual solo admite videos propios o distribuidos con permiso.

## Estado real

La interfaz puede publicarse en GitHub Pages sin Firebase; eso no significa que el chat o los comentarios publicos funcionen. El despliegue del backend solo se confirmara cuando termine con exito el flujo Activate 1UP Community Firebase.
