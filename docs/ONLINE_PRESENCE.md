# Contador de visitantes conectados — 1UP Anime

## Estado actual

Frontend implementado en `index.html` y `comunidad.html`, con aspecto de radar verde 1UP y la misma sala global de conexiones. **No está operativo hasta configurar un proyecto de Supabase Realtime**. No existe una base de datos ni proyecto conectado en este cambio.

## Activación (sin servidores propios)

1. Crear un proyecto de Supabase con un plan que tenga Realtime Presence. Comprobar límites y posibles costes antes de activarlo.
2. En Supabase, comprobar que **Realtime** está habilitado y que los **canales públicos** están permitidos en Realtime Settings; no requiere crear tablas ni ejecutar SQL.
3. Copiar el URL del proyecto y la clave **publishable** (`sb_publishable_...`) del panel.
4. Editar `presence-config.js` y establecer:
   ```js
   window.ONEUP_PRESENCE_CONFIG = {
     url: 'https://TU-PROYECTO.supabase.co',
     publishableKey: 'sb_publishable_TU_CLAVE_PUBLICA'
   };
   ```
5. Publicar el archivo en el sitio de GitHub Pages. Abrir `index.html` en dos dispositivos o pestañas y luego `comunidad.html`; verificar entrada, salida y conteo compartido. Confirmar Safari físico por separado.

## Qué cuenta

- Mide **conexiones visibles activas**, no personas únicas ni sesiones históricas.
- Una persona con dos pestañas visibles puede sumar dos conexiones.
- Al ocultar una pestaña se envía `untrack()`; al cerrar el navegador Realtime retira conexiones perdidas, con algún retraso.
- No guarda cookies, IP, nombres ni historial en una tabla. La sala comparte solo una clave aleatoria temporal y el campo `online:true`.
- El número cambia por eventos `sync` de Realtime. Si no hay configuración o falla el servicio, aparece **—**, nunca 0 falso ni una cifra de prueba.
- Un canal público no impide que un cliente malicioso infle sus propias presencias. No usar esta cifra como analítica financiera o prueba de usuarios únicos.
- La carga del SDK está fijada a una versión. Es una dependencia de CDN; valorar autoalojarla si se necesita disponibilidad sin CDN.

## Compatibilidad

- Integración aislada del inicio de sesión y de los comentarios: usa `ONEUP_PRESENCE_CONFIG`, no `ONEUP_SUPABASE_CONFIG`.
- iPhone Safari (moderno), Android y escritorio; sin autenticación requerida.
- El HTML y estilos funcionan incluso si el CDN está bloqueado o falta configurar Realtime.
- La sala `oneup_anime_global_presence` se comparte entre catálogo y comunidad dentro del mismo proyecto.
