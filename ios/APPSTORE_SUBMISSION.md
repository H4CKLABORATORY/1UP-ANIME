# Preparación de App Store Connect: 1UP Anime para iOS

Nombre propuesto: 1UP Anime
Categoría candidata: Entretenimiento.
Idioma principal: español.
Versión base: 1.0.0.
Bundle ID de desarrollo: com.h4cklaboratory.oneupanime. Regístralo en tu cuenta antes del envío.

Descripción breve:
Descubre anime, explora géneros, guarda tus favoritos y consulta temporadas desde una experiencia iPhone nativa con diseño 1UP.

Descripción:
1UP Anime reúne un catálogo informativo de anime con búsqueda, novedades, favoritos locales, fichas de títulos y enlaces a plataformas oficiales. Incluye una intro original, navegación SwiftUI y un reproductor nativo para fuentes de video autorizadas cuando estén configuradas. Los ajustes de subtítulos incluyen Bangers y otros estilos visuales para pistas WebVTT proporcionadas por las fuentes. No aloja episodios comerciales sin autorización.

URL de privacidad: https://h4cklaboratory.github.io/1UP-ANIME/privacy.html
URL de soporte: https://github.com/H4CKLABORATORY/1UP-ANIME/issues

## Imprescindible antes de enviar
1. Apple Developer Program y App Store Connect asociados al titular, ID de app, firma, certificado y perfiles. No introducir certificados ni contraseñas en GitHub.
2. Ejecutar bash ios/scripts/prepare.sh en macOS con Xcode / XcodeGen y sustituir el icono 1024 provisional por uno revisado en calidad de estudio.
3. Probar la intro con audio, interrupciones telefónicas, accesibilidad y modo silencio en iPhone físico.
4. Crear Archive Release firmado y subir desde Xcode/Transporter o flujo autorizado.
5. Completar capturas reales para tamaños exigidos, declaración de privacidad basada en código instalado, calificación de edad, derechos de contenido, información de soporte y material de revisión.
6. Verificar funcionamiento offline limitado, conexiones AniList/Jikan y enlaces externos. Sin fuentes multimedia autorizadas, no anunciar reproducción de capítulos.
7. Revisar las directrices oficiales de Apple sobre funcionalidad mínima y propiedad intelectual: https://developer.apple.com/app-store/review/guidelines/

Estado actual: proyecto compilable de simulador, NO firmado, NO subido, NO aprobado, sin TestFlight.
