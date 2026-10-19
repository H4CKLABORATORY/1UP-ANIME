# 1UP Anime para iPhone: SwiftUI nativo

Este proyecto contiene una aplicación iOS escrita en SwiftUI, no un simple WKWebView.

Funciones: catálogo de AniList en GitHub Pages, búsqueda, favoritos persistidos en UserDefaults, fichas, enlaces oficiales, intro original con AVPlayer y sonido de lanzamiento sin un botón de activación; AVPlayer para episodios con derechos reales, selector de subtítulos y estilos WebVTT Bangers / Arial / Moderna / Arcade.

## Crear y compilar en Mac

1. Instala Xcode y XcodeGen (brew install xcodegen).
2. Ejecuta desde la raíz: bash ios/scripts/prepare.sh.
3. Abre ios/OneUpAnime.xcodeproj en Xcode.
4. Selecciona tu Apple Developer Team y el Bundle ID registrado de tu cuenta.
5. Compila y prueba en iPhone. Para App Store prepara Archive, firmas, clasificación por edades, información de privacidad, capturas y entrega a App Store Connect.

El script prepara la tipografía Bangers (licencia SIL OFL), la intro MP4 de 1UP y un icono 1024 provisional generado desde el logo existente. Antes de App Store debe revisarse la calidad del icono.

## Límites

No hay IPA firmada, TestFlight ni publicación en App Store. Xcode y la cuenta de distribución son tareas independientes de GitHub Pages. Esta app ofrece valor nativo (SwiftUI, favoritos locales, AVPlayer) y no introduce código de terceros sin licencia.

Las fuentes configuradas incluyen el episodio 1 de LUPIN THE 3rd PART 4 desde el canal oficial TMS mediante YouTube, que se abre externamente en iOS; no se aloja ningún video de terceros. No se muestran capítulos falsos. WebVTT se puede seleccionar solo para medios con pistas reales. Para subtítulos HLS nativos el sistema AVPlayer conserva el comportamiento de iOS, que no permite asegurar que el efecto visual personalizado aparezca en pantalla completa.

Safari web no puede garantizar audio automático audible en la primera visita; en la app nativa el audio AVPlayer se intenta al abrir. Revisa las preferencias de audio y accesibilidad de cada dispositivo.
