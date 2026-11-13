# 1UP Anime

Aplicación web progresiva (PWA) mobile-first y plataforma editorial independiente de anime, optimizada para iPhone (Safari) y computadoras de escritorio. Explora datos públicos de anime mediante [AniList GraphQL](https://graphql.anilist.co) y [Jikan](https://jikan.moe/), consulta estrenos en tiempo real, busca series con alias multilingües, reproduce contenido licenciado y guarda tus favoritos y progreso localmente en el dispositivo.

**Sin publicidad comercial invasiva.** No aloja contenido pirata, respeta derechos de autor, no copia el diseño ni el código de marcas de terceros y no bloquea servicios externos.

---

## Inicio Rápido (Servidor Local)

Para ejecutar la aplicación localmente en tu computadora:

```bash
# 1. Iniciar el servidor local
npm start
# (o también: npm run dev)

# 2. Abrir en el navegador
# http://localhost:8765/
```

El servidor integrado resuelve automáticamente todos los módulos de `client/`, las 12 vistas secundarias en `client/pages/` y los recursos estáticos.

---

## Estructura de Contenedores y Arquitectura

El repositorio está estructurado en contenedores modulares limpios siguiendo el estándar de arquitectura de `jkanime_app` (consulta el documento maestro en [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)):

```
1UP-ANIME/
├── client/                     # Frontend Web y PWA
│   ├── assets/                 # Recursos gráficos originales (SVG, PNG, JPG, MP4 intro)
│   ├── data/                   # Copia local de catálogo y metadatos para el cliente
│   ├── motion-studio/          # Motor cinematográfico DEXTER (scene, camera, renderer)
│   ├── pages/                  # 12 vistas secundarias (comunidad, moderacion, motor, etc.)
│   ├── src/
│   │   ├── js/                 # 35 módulos JavaScript (studio, auth, player, depth, etc.)
│   │   └── styles/             # 26 hojas de estilo CSS modulares
│   ├── themes/                 # Variaciones temáticas (Kokomi, October, Cinematic V3, etc.)
│   ├── index.html              # Entrada principal de la aplicación PWA
│   ├── manifest.webmanifest    # Manifiesto PWA para instalación nativa
│   └── sw.js                   # Service Worker PWA con estrategia cache-first
├── server/                     # Backend, Servicios e Infraestructura
│   ├── config/                 # Configuraciones seguras (Firebase, Supabase, Dexter)
│   ├── functions/              # Cloud Functions y adaptadores de metadatos
│   ├── infra/                  # Plantillas Nginx para reverse-proxy
│   ├── integrations/           # Adaptadores aislados (jkanime-v2)
│   ├── render/                 # Pasarela y runtime de Anime1v alojados en Render
│   └── supabase/               # Esquemas y migraciones DDL con Row Level Security (RLS)
├── data/                       # Almacén de Metadatos Públicos y Salud
│   ├── catalog.json / airing.json / licensed-media.json / translations-es.json
│   ├── dexter/                 # Registros incrementales de DexterAnimeSync
│   └── guard/                  # Reportes persistentes de auto-recuperación
├── docs/                       # Documentación Técnica, Guías y Bitácoras
│   ├── ARCHITECTURE.md         # Documento maestro de arquitectura y componentes
│   ├── PROJECT_CONTINUITY.md   # Bitácora continua de desarrollo y estado
│   ├── OMEGA_MEMORY.md         # Memoria de ingeniería y decisiones persistentes
│   └── OMEGA_NEXT_ACTIONS.md   # Plan de acción y próximas tareas
├── scripts/                    # Herramientas de Mantenimiento y Automatización
│   ├── check-guard.mjs / check-ui.mjs / oneup-guard.mjs / dexter-anime-sync.mjs
│   ├── refresh-catalog.mjs / refresh-airing.mjs / render-motion-studio.mjs / serve-client.mjs
├── tests/                      # Suite de Pruebas de Calidad (QA)
│   ├── e2e/                    # Especificaciones Playwright y recorridos browser (.spec.js, .mjs)
│   ├── fixtures/               # Fixtures estáticos de prueba (HTML, JSON)
│   └── unit/                   # Pruebas unitarias aisladas (Node test runner y Python unittest)
├── index.html                  # Cargador raíz con redirección instantánea a client/
├── package.json                # Configuración de scripts unificados
├── playwright.config.js        # Configuración del ejecutor de pruebas de navegador
└── sw.js                       # Proxy de Service Worker en raíz
```

---

## Comandos de Calidad y Pruebas

Se proporcionan comandos unificados en `package.json` para validar la integridad del proyecto:

```bash
npm start             # Inicia el servidor local en http://localhost:8765/
npm test              # 40 pruebas unitarias con Node Test Runner (tests/unit/)
npm run test:python   # 16 pruebas unitarias con Python unittest (tests/unit/)
npm run test:ui       # 152 aserciones contractuales de interfaz (scripts/check-ui.mjs)
npm run test:guard    # 48 comprobaciones de salud del sistema (scripts/oneup-guard.mjs)
npm run test:all      # Ejecución secuencial completa de toda la suite de calidad
npm run test:depth    # Pruebas Playwright del motor de profundidad 2.5D
npm run sync:dexter   # Sincronización incremental de fuentes y metadatos
npm run handoff       # Regeneración de la ficha de traspaso técnico (docs/NEW_CHAT_HANDOFF.md)
```

---

## Despliegue en GitHub Pages y Modo PWA

### Publicación Web
El sitio se publica automáticamente mediante GitHub Actions a GitHub Pages:
- **URL pública**: https://h4cklaboratory.github.io/1UP-ANIME/

### Instalación como PWA en iPhone y Móviles
1. Abre https://h4cklaboratory.github.io/1UP-ANIME/ en Safari (iPhone).
2. Toca el botón **Compartir** (icono de cuadrado con flecha hacia arriba).
3. Selecciona **«Añadir a pantalla de inicio»**.
4. La app se abrirá en pantalla completa sin barra de navegación, con soporte sin conexión gracias al Service Worker en [`client/sw.js`](client/sw.js).

---

## Privacidad, Catálogo y Multimedia

- **Privacidad primero**: No se rastrea a los usuarios ni se almacenan cookies publicitarias. Favoritos y progreso se guardan en el `localStorage` del navegador. Consulta la [política de privacidad](client/pages/privacy.html).
- **Metadatos verificables**: Datos sincronizados desde fuentes públicas AniList/Jikan mediante scripts deterministas en [`scripts/refresh-catalog.mjs`](scripts/refresh-catalog.mjs) y [`scripts/refresh-airing.mjs`](scripts/refresh-airing.mjs).
- **Reproducción autorizada**: El motor en [`client/src/js/episode-player.js`](client/src/js/episode-player.js) admite hasta 7 fuentes por episodio (MP4, HLS, adaptativo). Solo reproduce contenido presente en [`data/licensed-media.json`](data/licensed-media.json) con derechos confirmados.
- **Subtítulos con estilo**: Subtitle Studio en [`client/src/js/subtitle-studio.js`](client/src/js/subtitle-studio.js) admite fuentes tipográficas Bangers (SIL OFL), Arcade y Moderna sobre subtítulos WebVTT oficiales.

---

## Documentación Técnica de Referencia

- [**Guía de Arquitectura Modular**](docs/ARCHITECTURE.md): Diagrama de componentes y responsabilidades.
- [**Bitácora de Continuidad**](docs/PROJECT_CONTINUITY.md): Registro histórico de versiones y decisiones.
- [**Memoria Técnica OMEGA**](docs/OMEGA_MEMORY.md): Memoria persistente de decisiones y estándares.
- [**Instrucciones para Agentes**](AGENTS.md): Reglas de desarrollo y verificación para asistentes IA.
- [**Setup de Firebase Comunidad**](docs/FIREBASE_COMUNIDAD_SETUP.md): Configuración opcional de backend social.
- [**Setup de Google Login**](docs/GOOGLE_LOGIN_SETUP.md): Autenticación opcional federada.
- [**App Nativa SwiftUI iOS**](ios/README.md): Proyecto Xcode nativo para iPhone.
