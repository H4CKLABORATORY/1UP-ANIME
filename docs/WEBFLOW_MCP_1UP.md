# 1UP ANIME × Webflow MCP / Webflow Cloud

## Estado

- El plugin oficial Webflow está instalado y conectado en ChatGPT. Un sitio concreto de Webflow NO ha sido identificado en esta sesión.
- La web principal sigue en GitHub Pages; este cambio no edita ni publica ningún sitio de Webflow.
- Webflow MCP actúa sobre proyectos Webflow autorizados, no convierte por sí solo el repositorio GitHub en un sitio Webflow editable.
- Webflow Cloud sí permite desplegar aplicaciones estáticas HTML/CSS/JS existentes, separadas del diseñador visual.

## Arquitectura elegida

1. GitHub: código fuente único de 1UP ANIME, con ramas independientes por área.
2. Webflow MCP: trabajo opcional de diseño, variables, CMS, componentes y GSAP dentro de un sitio Webflow que el propietario autorice.
3. Webflow Cloud: entorno opcional de previsualización/importación de la web estática.
4. GitHub Pages: publicación original; no mover el dominio ni activar despliegue continuo de Webflow sin autorización.
5. DexterAnimeSync: solo metadatos y medios cuya distribución esté autorizada; Webflow no añade derechos sobre anime.

## Exportación estática segura

El repo contiene scripts, functions, integraciones y configuraciones que NO deben formar parte del despliegue web.
Como contiene package.json anidados, Webflow Cloud puede fallar al inferir el modo estático.

Ejecutar desde el directorio raíz:

    node scripts/build-webflow-static.mjs

Produce `.webflow-build/` con páginas HTML, JS y CSS, los directorios `assets/`, `themes/`, `data/`, y un `webflow.json` que declara `cloud.framework=static`.
El script valida referencias locales básicas y archivos de tamaño no superior a 20 MB.
NO copia `functions/`, `integrations/`, `scripts/`, `config/`, archivos secretos ni claves privadas.
El resultado solo se prepara localmente; no conecta API, crea sitios ni publica en Webflow.

## Cuando el sitio de Webflow esté disponible

1. En ChatGPT usa @Webflow para listar sitios visibles y elige expresamente el de 1UP ANIME.
2. Examina las páginas/estilos antes de escribir nada. No cambies un sitio no relacionado.
3. Para el diseñador visual, el MCP Bridge y una sesión abierta del Designer pueden ser necesarios.
4. Mantén el diseño Black Clover original como referencia, sin copiar marca, imágenes o música sin autorización.
5. Si se desea desplegar la app a Webflow Cloud, crea/importa primero un proyecto desde dashboard con acceso GitHub o usa CLI autorizado, y selecciona entorno de prueba.
6. Para desplegar la salida estática preparada, usa un entorno que apunte al directorio `.webflow-build`, o Webflow CLI con `--directory .webflow-build` según su versión. Verifica primero las rutas relativas bajo el mount path.
7. Antes de producción: probar iPhone/Safari, estilos, service worker, rutas, CORS y Firebase. Mantén el despliegue principal intacto hasta confirmación expresa.

## Alcance de Webflow para este proyecto

- Diseñar hero, efectos de grimorio, secciones populares y componentes adaptables.
- Crear y gestionar CMS editorial para reseñas, noticias, artículos y destacados si existe sitio Webflow habilitado.
- Analizar SEO, textos alternativos, títulos y páginas del proyecto Webflow.
- No transferir automáticamente autenticación ni comentarios de Firebase al CMS.
- No publicar archivos de streaming ajenos sin permiso; el selector de fuentes del motor funciona independientemente.

## Fuentes oficiales verificadas

- https://developers.webflow.com/mcp/installing/chatgpt
- https://developers.webflow.com/mcp/reference/overview
- https://developers.webflow.com/mcp/tools/designer-tools
- https://developers.webflow.com/webflow-cloud/bring-your-own-app
- https://developers.webflow.com/webflow-cloud/static-apps
- https://developers.webflow.com/cli/command-reference

## Restricciones

El Webflow MCP no crea sitios Webflow desde cero: el proyecto debe existir. Cada autorización corresponde a un workspace.
El diseñador visual puede exigir sesión activa del Designer. Data APIs pueden funcionar sin sesión.
La exportación estática es para desplegar una app de código; NO la convierte en elementos editables del Designer.
Las páginas estáticas no reciben automáticamente backend Webflow Cloud ni variables de entorno de ejecución.

## Estado de verificación

El workflow `webflow-static-verify.yml` construye y revisa un paquete seguro sin credenciales.
No se promete despliegue ni prueba visual real hasta poder acceder a un proyecto específico.
