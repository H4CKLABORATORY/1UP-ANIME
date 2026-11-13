# 1UP Anime · Contenedor Servidor (Backend, Servicios & Configuraciones)

Este contenedor agrupa la infraestructura de backend, funciones serverless, pasarelas de metadatos, esquemas de bases de datos y configuraciones de seguridad para **1UP Anime**.

---

## 1. Estructura del Contenedor

```
server/
├── config/                 # Configuraciones seguras de servicios en la nube
│   ├── dexter-providers.json # Definición de proveedores del motor de sincronización
│   ├── firebase.json       # Configuración para el despliegue del CLI de Firebase
│   ├── firestore.indexes.json # Definición de índices compuestos para Firestore
│   ├── firestore.rules     # Reglas de seguridad para la base de datos Firestore
│   └── storage.rules       # Reglas de control de acceso para Cloud Storage
├── functions/              # Funciones serverless para Firebase Cloud Functions
│   ├── anime1v-adapter.js  # Adaptador restringido de solo metadatos
│   ├── index.js            # Punto de entrada de funciones serverless
│   └── package.json        # Dependencias y scripts de las funciones
├── infra/                  # Plantillas de configuración de infraestructura
│   └── nginx/              # Plantillas Nginx para reverse-proxy con caché segura
├── integrations/           # Paquetes de integración de metadatos externos aislados
│   └── jkanime-v2/         # Adaptador independiente para consultas de metadatos
├── render/                 # Servicios alojados en la plataforma Render
│   ├── anime1v-gateway.js  # Pasarela pública de consulta de metadatos
│   └── anime1v-source/     # Runtime aislado y auditado de Anime1v
└── supabase/               # Esquemas y migraciones SQL para Supabase
    └── sql/
        └── oneup_community_optional.sql # DDL de tablas con Row Level Security (RLS)
```

---

## 2. Descripción de Componentes

### 2.1 Configuraciones (`config/`)
- `firebase.json`: Define el despliegue de Firebase Functions apuntando a `../functions`, así como las reglas de Firestore y Storage.
- `firestore.rules`: Implementa control de acceso estricto basado en roles y tokens de usuario autenticado; prohíbe escrituras no autorizadas o masivas.
- `dexter-providers.json`: Configura los intervalos de ejecución y el estado de cada adaptador de sincronización (AniList, biblioteca autorizada, enlaces externos).

### 2.2 Funciones Serverless (`functions/`)
- `index.js`: Expone endpoints serverless para comentarios, moderación y validación de sesiones.
- `anime1v-adapter.js`: Actúa como middleware de consulta de metadatos sin exponer tokens privados ni realizar scraping de video.

### 2.3 Pasarela de Metadatos en Render (`render/`)
- `anime1v-gateway.js`: Servidor Express ligero que responde a consultas de catálogo y búsqueda, filtrando cualquier contenido no autorizado y reportando honestamente el uso de respaldos (como Jikan).
- `anime1v-source/`: Runtime empaquetado y fijado para ejecutar servicios de metadatos con arranque determinista.

### 2.4 Supabase SQL (`supabase/`)
- `oneup_community_optional.sql`: Script SQL con las tablas `oneup_episode_comments`, `oneup_comment_reports` y `oneup_anime_progress`.
- Incluye políticas **RLS (Row Level Security)** obligatorias:
  - Solo el autor puede editar o eliminar sus propios comentarios (`author_id = auth.uid()`).
  - Cooldown anti-spam de 45 segundos por usuario.
  - Lectura pública explícita pero restringida a datos no sensibles.

### 2.5 Integración Aislada (`integrations/`)
- `jkanime-v2/`: Módulo de consulta de metadatos ejecutado en un entorno aislado (`npm --prefix server/integrations/jkanime-v2`). No realiza descargas ni streaming de video.

---

## 3. Principios de Seguridad y Ética

1. **Cero Secretos en el Repositorio**: Ningún token, API key privada o archivo de credenciales de servicio se almacena en el control de versiones. Todas las configuraciones sensibles se leen de variables de entorno de GitHub Actions o del entorno de ejecución.
2. **Metadata-Only**: Las pasarelas y adaptadores solo procesan títulos, sinopsis, imágenes públicas y números de episodios; jamás extraen, descifran ni retransmiten flujos de video protegidos.
3. **Inmutabilidad y Auditoría**: Todos los cambios de datos en el cliente requieren validación estricta de esquemas antes de ser persistidos.
