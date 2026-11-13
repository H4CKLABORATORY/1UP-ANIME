# 1UP Anime · Contenedor de Pruebas (Test Infrastructure & QA)

Este contenedor alberga toda la suite de pruebas unitarias, de integración, contractuales y de extremo a extremo (E2E) con navegador real para **1UP Anime**.

---

## 1. Estructura del Contenedor

```
tests/
├── e2e/                    # Pruebas de extremo a extremo con navegador (Playwright / Chromium)
│   ├── depth-mode.spec.js  # Pruebas Playwright del sistema de profundidad 2.5D
│   ├── e2e-browser.mjs     # Recorridos completos por las rutas públicas principales
│   ├── e2e-cinematic-v3.mjs # Validación de capas cinematográficas V3
│   ├── e2e-franchise.mjs   # Navegación y apertura de sagas de anime
│   ├── e2e-kokomi-preview.mjs # Verificación de temas, audio AAC y viewport móvil
│   ├── e2e-motion-studio.mjs # Pruebas del estudio de animación en navegador
│   ├── e2e-oneup-finale.mjs # Aserciones de diseño editorial, modal y desborde
│   ├── e2e-oneup-motion.mjs # Verificación de micro-interacciones y prefers-reduced-motion
│   ├── e2e-oneup-palette.mjs # Pruebas del selector dinámico de paleta esmeralda/original
│   ├── e2e-player-languages.mjs # Selección de pistas de idioma y subtítulos en reproductor
│   ├── premiere-hero.spec.js # Pruebas Playwright del carrusel de estrenos
│   ├── site-quality.spec.js # Auditoría de accesibilidad, botones táctiles y modales
│   └── test-episode-comments.mjs # Pruebas del sistema de comentarios por episodio
├── fixtures/               # Datos estáticos y páginas HTML de muestra para pruebas
│   └── encyclopedia-anime.html # Fixture para el extractor de metadatos educativos
└── unit/                   # Pruebas unitarias de aislamiento
    ├── *.test.mjs          # Pruebas del Node Test Runner (búsqueda, motion, subtítulos, etc.)
    ├── test-*.mjs          # Verificaciones de contratos, reproductores y resiliencia
    └── test_*.py           # Pruebas unitarias en Python (subtítulos, scrapers, checkpoints)
```

---

## 2. Comandos de Ejecución de Pruebas

Desde la raíz del proyecto:

### 2.1 Pruebas Unitarias Rápidas en JavaScript (`npm test`)
Ejecuta las **40 pruebas unitarias** de JavaScript con el ejecutor nativo de Node.js (`node --test`):
```bash
npm test
# (o también: npm run test:unit)
```
*Tiempo estimado: ~150 ms.*

### 2.2 Pruebas Unitarias en Python (`npm run test:python`)
Ejecuta las **16 pruebas unitarias** escritas en Python usando `unittest`:
```bash
npm run test:python
```
*Tiempo estimado: ~60 ms.*

### 2.3 Auditoría Contractual de Interfaz (`npm run test:ui`)
Valida 152 aserciones sobre la estructura del DOM, selectores HTML, accesibilidad, PWA y consistencia de datos:
```bash
npm run test:ui
```

### 2.4 Chequeo de Salud del Guardián (`npm run test:guard`)
Audita sin red los 48 puntos críticos de salud y auto-recuperación:
```bash
npm run test:guard
```

### 2.5 Suite Completa de Verificación (`npm run test:all`)
Ejecuta en secuencia estricta todas las pruebas unitarias (Node + Python), la auditoría de interfaz y el motor guardián:
```bash
npm run test:all
```

### 2.6 Pruebas E2E de Profundidad con Playwright (`npm run test:depth`)
Lanza Chromium headless para validar la respuesta táctil y perspectiva de las tarjetas:
```bash
npm run test:depth
```

---

## 3. Pruebas Unitarias Específicas (`tests/unit/`)

Para ejecutar de forma individual cualquiera de los contratos de integración:

```bash
# Integración de Anime1v
node tests/unit/test-anime1v-integration.mjs

# Restricción de runtime (sin streaming pirata)
node tests/unit/test-anime1v-restricted.mjs

# Caché del catálogo y soporte sin conexión
node tests/unit/test-cache-catalog.mjs

# Ciclo de vida del reproductor de episodios
node tests/unit/test-episode-player.mjs

# Contrato de fuentes multimedia autorizadas
node tests/unit/test-media-source-contract.mjs

# Condiciones de carrera en navegación rápida
node tests/unit/test-navigation-race.mjs

# Pasarela de renderizado de metadatos
node tests/unit/test-render-anime1v.mjs
```

---

## 4. Pruebas de Extremo a Extremo (`tests/e2e/`)

Las pruebas E2E evalúan la experiencia de usuario real en viewports móviles (como el iPhone con 390x844 px) y de escritorio (1366x768 px y 1920x1080 px).

Para ejecutarlas de forma individual:
```bash
node tests/e2e/e2e-browser.mjs
node tests/e2e/e2e-franchise.mjs
node tests/e2e/e2e-kokomi-preview.mjs
node tests/e2e/e2e-oneup-motion.mjs
node tests/e2e/e2e-oneup-palette.mjs
node tests/e2e/e2e-player-languages.mjs
node tests/e2e/test-episode-comments.mjs
```

---

## 5. Principios de Calidad

1. **Determinismo**: Ninguna prueba depende de la latencia de internet ni de la disponibilidad de APIs de terceros para pasar; los respaldos locales garantizan el resultado.
2. **Cero Falsos Positivos**: Nunca se simula un stream de video como funcional si no existe la fuente legítima correspondiente.
3. **Móvil Primero**: Toda interacción debe pasar la validación en pantalla estrecha (320 px y 390 px) sin desbordamientos horizontales (`scrollWidth === clientWidth`).
