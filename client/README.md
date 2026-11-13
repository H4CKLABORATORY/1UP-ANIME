# 1UP Anime · Contenedor Cliente (Frontend Web & PWA)

Este contenedor alberga toda la interfaz gráfica de usuario, estilos, módulos JavaScript, recursos multimedia de marca, variaciones temáticas y la lógica de la aplicación web progresiva (PWA) de **1UP Anime**.

---

## 1. Estructura del Contenedor

```
client/
├── assets/                 # Recursos gráficos originales (logos vectoriales SVG, posters, intro MP4)
├── data/                   # Copia local de catálogo de anime, emisiones y medios autorizados
├── motion-studio/          # Motor cinematográfico DEXTER (scene, camera, renderer)
├── pages/                  # 12 vistas secundarias de la plataforma
├── src/
│   ├── js/                 # 35 módulos JavaScript organizados y modulares
│   └── styles/             # 26 hojas de estilo CSS estructuradas
├── themes/                 # Variaciones temáticas completas (Kokomi, October, Cinematic V3, etc.)
├── index.html              # Punto de entrada principal de la aplicación PWA
├── manifest.webmanifest    # Configuración de instalación PWA (iconos, tema, orientación)
├── robots.txt              # Directivas para motores de búsqueda
└── sw.js                   # Service Worker PWA con estrategia cache-first y soporte offline
```

---

## 2. Módulos JavaScript (`src/js/`)

Todos los archivos JS son independientes, sin librerías externas pesadas:

- **Núcleo y Catálogo**:
  - `studio.js`: Orquestador principal de estado, renderizado de cuadrícula, filtrado por categorías, búsqueda y persistencia de favoritos.
  - `catalog-plus.js`: Extensiones de presentación y renderizado adicional de series.
  - `anime-title-search.js`: Motor de búsqueda tolerante a acentos, signos, caracteres japoneses (Romaji/Kanji) y alias de AniList/Jikan.
  - `franchise-explorer.mjs`: Explorador de sagas y relaciones de series (precuelas, secuelas, adaptaciones).
- **Reproducción y Multimedia**:
  - `episode-player.js`: Reproductor multimedia multi-fuente (hasta 7 posiciones), compatible con cambio dinámico y reintentos.
  - `hls-adapter.js`: Adaptador para reproducción HLS adaptativo en navegadores con y sin soporte nativo.
  - `subtitle-studio.js`: Motor de subtítulos estilizados con fuentes Bangers (SIL OFL), Arcade y Moderna sobre WebVTT.
  - `official-watch.js`: Manejo de enlaces canónicos a plataformas de streaming autorizadas (Crunchyroll, etc.).
  - `external-providers.js`: Proveedores externos verificados.
  - `anime1v-discovery.js`: Integración cliente con pasarela de metadatos Anime1v.
- **Cinematografía y Efectos Visuales**:
  - `depth-engine.js`: Motor global de perspectiva y profundidad 2.5D.
  - `card-depth-engine.js`: Efecto de inclinación y sombras dinámicas en tarjetas de anime.
  - `depth-toggle-button.js`: Componente visual de control para alternar el modo depth.
  - `dexter-motion-engine.js`: Micro-interacciones cinematográficas fluidas basadas en observadores de visibilidad.
  - `motion.js` & `sonic.js`: Controladores de transiciones y efectos de sonido contextuales.
  - `premiere-hero.js` & `premiere-ranking.js`: Carrusel hero dinámico de emisiones de la temporada actual.
  - `oneup-finale.js`: Capa de pulido editorial de la interfaz.
- **Autenticación y Comunidad**:
  - `auth.js` & `auth-google.js`: Flujo de perfil de usuario (invitado local o federado con Google).
  - `auth-config.js` & `firebase-config.js`: Configuraciones públicas para servicios de autenticación.
  - `community.js`: Muro social, publicaciones e interacción entre usuarios.
  - `episode-comments.js`: Sistema de comentarios contextuales vinculados a cada episodio.
  - `social-backend.js`: Adaptador para sincronización de comunidad con backend.
  - `supabase-config.js` & `supabase-episode-backend.js`: Adaptador opcional para Supabase con RLS.
- **Vistas Especializadas**:
  - `moderacion.js`: Lógica de consola de supervisión de contenido.
  - `motor.js`: Monitoreo y diagnósticos de rendimiento del motor.
  - `scraping-lab.js`: Interfaz del laboratorio educativo de metadatos.
  - `experience.js`: Controladores de experiencias inmersivas.

---

## 3. Hojas de Estilo CSS (`src/styles/`)

Las 26 hojas de estilo modulares dividen claramente las responsabilidades visuales:
- `studio.css`: Diseño base, rejilla responsiva (grid), tipografía y variables de color.
- `motion.css` & `dexter-motion-engine.css`: Animaciones por keyframes optimizadas con aceleración GPU.
- `spotlight.css`: Efecto de luz ambiental en puntero para computadoras de escritorio.
- `player.css` & `subtitle-studio.css`: Interfaz oscura del reproductor y formato tipográfico de subtítulos.
- `anime-card-depth.css`, `depth-system.css`, `depth-toggle.css`: Sistema universal de profundidad 2.5D.
- `brand-v2.css`: Identidad de marca editorial 1UP con acentos verde esmeralda y cristal.
- `premiere-hero.css`: Estilos visuales del carrusel de estrenos.
- `airing-ui.css`: Línea de tiempo visual para programación de emisiones.
- `community.css` & `episode-comments.css`: Tarjetas de comentarios y muros sociales.
- `ui-quality.css`: Reglas de accesibilidad (a11y), contrastes y soporte para modo de bajo consumo de datos (`Save-Data`).

---

## 4. Vistas Secundarias (`pages/`)

| Archivo | Propósito |
| :--- | :--- |
| `comunidad.html` | Portal de interacción y debates de la comunidad de fans. |
| `dexter-motion-studio.html` | Estudio interactivo de animación Canvas 2D y exportación de video. |
| `gremio.html` | Página de gremios de usuarios y tripulaciones temáticas. |
| `moderacion.html` | Consola para moderadores y gestión de reportes de comentarios. |
| `motor.html` | Panel técnico de diagnóstico y métricas del motor web. |
| `preview-cinematic-v3.html` | Vista previa de la experiencia cinematográfica V3 con capas de personajes. |
| `preview-kokomi-mobile.html` | Experiencia editorial optimizada específicamente para pantallas móviles. |
| `preview-kokomi.html` | Variante de diseño Kokomi para escritorio. |
| `preview-october.html` | Experiencia temática estacional de octubre con sello arcano. |
| `privacy.html` | Política de privacidad y términos de servicio. |
| `scraping-lab.html` | Laboratorio de prueba de metadatos educativos. |
| `studio.html` | Espacio de trabajo creativo alternativo. |

---

## 5. Ejecución Local

Desde la raíz del repositorio, ejecuta:

```bash
npm start
```

El servidor integrado servirá este contenedor `client/` como la raíz web en:
👉 **http://localhost:8765/**
