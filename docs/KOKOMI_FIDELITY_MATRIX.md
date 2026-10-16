# 1UP ANIME — Matriz de fidelidad Kokomi

**Actualizado:** 2026-10-16. **Estado:** rama experimental, no publicada.

## Fuentes verificadas
- Video de pantalla aportado por el propietario: 27 s, sobre todo versión móvil. En la grabación se aprecian menú lateral, cuadrícula de dos pósteres, búsqueda desplegable, rankings y secciones editoriales.
- Ficha oficial: https://www.templatemonster.com/website-templates/kokomi-online-anime-and-anime-series-responsive-entertainment-website-template-520462.html
- El sitio original enlazado en la demo, kokomi.soulknightweb.com, respondió HTTP 502 cuando se consultó. No se pudo verificar visualmente todo el escritorio ni todas las interacciones de interiores. Nunca afirmar una copia pixel-perfect.

## Páginas y estado

| Página Kokomi | Implementación en 1UP | Limitaciones actuales |
|---|---|---|
| 1 Inicio | #inicio, sitio existente + CSS Kokomi preview | Falta comparar con referencia escritorio |
| 2 Top animes | #populares, catálogo existente | Ajustar orden visual |
| 3 Actualizados | #recientes, catálogo existente | No equivale a fecha de episodio visto |
| 4 En emisión | #temporada, catálogo existente | API puede retrasarse |
| 5 Próximos estrenos | #km/upcoming | Datos del snapshot, no actualización push |
| 6 Películas | #peliculas, catálogo existente | Detalles específicos en ruta nueva |
| 7 Géneros | #catalogo, buscador/filtros | Adaptación visual pendiente |
| 8 Detalles de serie | #km/series/ID | Metadatos reales del catálogo |
| 9 Reproducción de episodio | #km/series-play/ID | Solo entradas en licensed-media.json |
| 10 Detalles de película | #km/movie-single/ID | Metadatos reales |
| 11 Reproducción película | #km/movie-play/ID | Solo medios configurados autorizados |
| 12 Tráilers | #km/trailers | Puede estar vacío si faltan datos válidos |
| 13 Calendario | #programacion, sitio existente | Horarios informativos |
| 14 Blog | #km/blog | Artículos editoriales propios, no noticias inventadas |
| 15 Artículo | #km/blog-single/bienvenida | Tres textos originales básicos |
| 16 Contacto | #km/contact | Enlace a comunidad, sin prometer email |
| 17 Próximamente | #km/coming-soon | Datos de anuncios, no página de mantenimiento |
| 18 404 | #km/404 | Página de error navegable |
| 19 Perfil | #km/profile | Usa identidad de OneUpAuth y favoritos existentes |
| 20 Notificaciones | #km/notifications | Estado vacío real: sin push/backend |
| 21 Mi lista | #milista, sitio existente | Almacenamiento de la sesión/perfil actual |
| 22 Configuración | #km/settings | Tres preferencias locales para el tema |

**No todas las 22 páginas alcanzan todavía paridad de funciones con Kokomi**. La correspondencia actual es de rutas y componentes de diseño. En particular, falta completar selección avanzada de temporadas, comentarios integrados visualmente dentro del nuevo reproductor (actualmente se abren en ficha de 1UP), avisos, contacto y accesibilidad/UX final.

## Componentes construidos
- \`preview-kokomi-mobile.html\`: fachada real conectada al proyecto existente.
- \`themes/kokomi-mobile-preview/theme.css\`: hero, menús, rankings y tarjetas, móvil primero.
- \`themes/kokomi-mobile-preview/theme.js\`: menú, búsqueda y navegación.
- \`themes/kokomi-mobile-preview/pages.css\`: interiores responsivos.
- \`themes/kokomi-mobile-preview/pages.js\`: router de interiores, metadatos, reproductor con selector de episodio y temporada desde medios declarados, estado del perfil y preferencias locales.
- \`scripts/e2e-kokomi-preview.mjs\`: pruebas Chromium de dos anchos.
- \`.github/workflows/kokomi-preview-check.yml\`: CI que guarda capturas.

## Lista de comparación visual pendiente
- [ ] Capturas actuales de Kokomi escritorio original; sitio de origen HTTP 502, no inventar screenshot.
- [x] Grabación móvil del propietario revisada.
- [ ] Capturas renderizadas desde la rama en Chromium 390 px y 1366 px (workflow/artefactos).
- [ ] Comparar header, margenes, tipografía, cards, menú, vistas interiores y reproductor.
- [ ] Corregir diferencias por iteraciones hasta aprobación visual.
- [ ] Evaluar con Safari real y lector de pantalla.
- [ ] Confirmar cero errores de integración/CI.
- [ ] Auditar licencias de medios, sonidos y marcas antes de producción.

**No fusionar rama a main sin revisar pruebas y fotos.** No se incorporó ningún archivo del producto comercial de TemplateMonster.

## Regla de continuidad
Leer \`AGENTS.md\`, \`docs/PROJECT_CONTINUITY.md\` y este documento; continuar sobre rama \`design/kokomi-mobile-reference-2026-10-15\` y PR #14, sin sobrescribir la app real.


## Resultado verificado de la prueba del 16/10/2026
- Captura móvil de referencia de usuario: `f_04.jpg` (ranking en dos columnas).
- Capturas de la rama: `e2e-kokomi-mobile-hero.png`, `e2e-kokomi-mobile-ranking.png`, y equivalentes desktop, como artefactos de CI.
- Pruebas de navegación, modo móvil/escritorio, configuraciones, errores JS, desbordamiento horizontal y número de columnas pasaron en https://github.com/H4CKLABORATORY/1UP-ANIME/actions/runs/38850097111 .
- Diferencias presentes: piezas gráficas originales no iguales a los recursos comerciales, gran parte de la navegación interior solo se verificó contra requisitos funcionales y no por capturas de referencia; Safari no probado. El catálogo conserva su fuente de datos externa.
- **La similitud no está certificada como exacta**, pero el patrón de ranking móvil de dos columnas ya coincide estructuralmente con la grabación.


## Etapa: experiencia de reproducción y conversación (16/10/2026)
- Implementado un reproductor visual coherente con el tema oscuro Kokomi, con selector de servidores, temporadas y episodios **solo para medios del manifiesto autorizado**.
- El panel de comentarios aparece debajo del video, con selector de conversación por episodio; usa las mismas funciones Firebase que el diálogo existente. Si Firebase no está configurado, se muestra una explicación explícita. Esto no acredita una prueba de escritura en una base real.
- Se añadió activación voluntaria antes de cargar iframes externos y limpieza del video al abandonar la página.
- Rediseñados los estados vacíos sin video: contenido centrado en desktop y sin botones cortados en móvil.
- Pruebas por Playwright: fixture aislado de dos temporadas, cambio de servidor, bloqueo de carga anticipada de iframe, renderizado de hilos y restauración de navegación. Capturas de ficha y reproductor incluidas en Artifacts.
- **Restan**: fidelidad visual contrastada para interiores Kokomi de origen, videos activos verificados en iPhone y Android, backend Firebase real, todos los componentes de cuenta y notificaciones.
