# 1UP Anime · Contenedor de Datos (Metadatos Estáticos & Auditorías)

Este contenedor funciona como la fuente de verdad pública para el catálogo estático, la programación de transmisiones, los medios autorizados, las traducciones al español y el registro persistente de salud del sistema.

---

## 1. Estructura del Contenedor

```
data/
├── airing.json             # Horarios de emisión y lanzamientos sincronizados con AniList
├── anime1v-config.json     # Estado, endpoints y salud de la pasarela Anime1v
├── catalog.json            # Catálogo estático principal de series de anime
├── encyclopedia-anime.json # Registro de metadatos enciclopédicos educativos
├── external-providers.json # Directorio de proveedores externos oficiales y verificados
├── guild-license.json      # Metadatos del universo ficticio de gremios
├── licensed-media.json     # Catálogo de medios con derechos de reproducción confirmados
├── sinopsis-editoriales-es.json # Sinopsis curadas editorialmente
├── translations-es.json    # Diccionario de traducciones de sinopsis al español
├── dexter/                 # Registros del motor de sincronización incremental:
│   ├── history.json        # Historial de eventos y carreras de sincronización
│   ├── records.json        # Base de datos normalizada de animes, temporadas y fuentes
│   └── status.json         # Estado actual del motor DexterAnimeSync
└── guard/                  # Reportes de auto-recuperación del sistema:
    ├── history.json        # Historial rotativo de auditorías de salud (hasta 72 entradas)
    └── status.json         # Veredicto de salud vigente del motor ONEUP Guard
```

---

## 2. Descripción de Archivos de Datos

### 2.1 `catalog.json`
- **Origen**: Generado automáticamente por [`scripts/refresh-catalog.mjs`](../scripts/refresh-catalog.mjs) consumiendo la API GraphQL pública de AniList.
- **Grupos**: Contiene las secciones `trending`, `popular`, `season`, `recent` y `movies`.
- **Campos**: Cada registro incluye identificador unificado (`mal-XXXXX` o `al-XXXXX`), título en inglés, Romaji y caracteres japoneses, lista de alias normalizados para búsqueda rápida, banner, poster, puntaje promedio, formato, año y enlaces externos oficiales.

### 2.2 `airing.json`
- **Origen**: Actualizado cada 6 horas por [`scripts/refresh-airing.mjs`](../scripts/refresh-airing.mjs).
- **Contenido**: Ventana de transmisión de anime en emisión (desde 55 horas en el pasado hasta 9 días en el futuro), incluyendo marcas de tiempo UNIX, número de episodio y tráilers de YouTube verificados.

### 2.3 `licensed-media.json`
- **Propósito**: Catálogo estricto de obras que cuentan con derechos de distribución o auto-alojamiento.
- **Estado**: Las entradas vacías `{}` garantizan que la aplicación no ofrezca reproducción pirata. Solo cuando se configuran enlaces legítimos con derechos documentados, el reproductor habilita las fuentes de video correspondientes.

### 2.4 `guard/status.json` y `guard/history.json`
- **Origen**: Producido por el motor [`scripts/oneup-guard.mjs`](../scripts/oneup-guard.mjs).
- **Veredictos**:
  - `correcto`: El sistema supera todos los chequeos de sintaxis, integridad de catálogo, accesibilidad y PWA.
  - `atencion`: Se detectan advertencias no críticas.
  - `fallo`: Existen fallas críticas en los archivos o enlaces principales.
- **Historial**: Almacena las últimas 72 revisiones con marcas de tiempo ISO para auditoría transparente.

### 2.5 `dexter/`
- **Origen**: Gestionado por [`scripts/dexter-anime-sync.mjs`](../scripts/dexter-anime-sync.mjs).
- **Propósito**: Realiza cruces incrementales entre transmisiones, tráilers oficiales de YouTube y proveedores externos, asegurando que los registros conserven fechas de primer avistamiento (`firstSeenAt`) y actualización (`lastSeenAt`).
