# 1UP Anime — manga + publicación declarativa de episodios

## Estado de esta entrega
Esta rama agrega un lector de manga independiente en `manga.html`, un importador de medios autorizados y una acción editorial. **No contiene episodios descargados ni manga ajeno**: los manifiestos empiezan vacíos. No implica habilitar una CDN, facturación ni permisos de reproducción.

El reproductor original de 1UP (`episode-player.js`) sigue intacto; su manifiesto es `data/licensed-media.json`. Al procesar la cola, los videos aparecen en la **serie**, **temporada** y **episodio** correspondientes. También hay un lector de PDF para manga en iPhone/escritorio, con salida `Abrir PDF` si el navegador no incrusta documentos.

## Diferencia importante: Manga-Scraper no baja anime
El repositorio upstream https://github.com/soumik12345/Manga-Scraper es un paquete Python CLI **pre-alfa v0.12** para convertir mangas a PDF, no un extractor de MP4/HLS. Requiere `mangadl-bash` como dependencia externa. La rama incorpora `requirements-manga.txt` y `scripts/setup-manga-scraper.sh` para instalación local opcional en un entorno virtual, **no** ejecuta scraping en GitHub Pages ni copia código sin verificar licencia. El upstream no expone un archivo `LICENSE` de raíz al consultar el repositorio; no se presupone permiso para redistribuir su código.

En PC/Linux/macOS con Python y Bash, ejecutar:
```bash
bash scripts/setup-manga-scraper.sh
source .venv-manga/bin/activate
# El instalador upstream "installmanga" requiere revisión antes de usarlo.
scrapemanga
```
Solo descarga y publica obras con derechos demostrables o licencias que permitan expresamente redistribución pública. Disponer de un PDF o URL no equivale a tener permiso de streaming.

## Publicar fuentes de video autorizadas automáticamente
1. Un editor autorizado añade cada nueva fuente a `data/media-intake.json`. Debe indicar identificador AniList/MAL, temporada, episodio, URL HTTPS directa, MIME, derechos y **referencia documental real** (no publicarla si contiene información privada). Los campos `rights` y `rightsEvidence` son controles editoriales, **no** validación automática de licencias.
2. El workflow `ONEUP · publicación editorial autorizada` valida la cola en `main` cuando se modifica y ejecuta `node scripts/publish-approved-content.mjs`. No extrae contenidos de Netflix, Crunchyroll u otras plataformas, no elimina DRM ni reproduce enlaces privados.
3. La acción escribe `data/licensed-media.json`, conserva otras fuentes válidas y evita duplicar videos. El frontend lee este archivo dinámicamente; los títulos sin fuentes seguirán deshabilitados.
4. En una PR solo se valida; no se publican manifiestos. Revisión humana requerida antes de pasar la cola a `main`.

### Ejemplo JSON: completar solo con un URL y permiso real
```json
{
  "version": 1,
  "episodes": [
    {
      "animeId": "mal-12345",
      "seriesTitle": "Mi animación original",
      "season": 1,
      "number": 1,
      "title": "Comienzo",
      "src": "https://media.example.com/original/ep01.mp4",
      "mime": "video/mp4",
      "language": "es-419",
      "quality": "1080p",
      "rights": "owned",
      "rightsEvidence": "Registro interno de derechos de distribución, expediente propio"
    }
  ],
  "manga": [
    {
      "slug": "mi-manga-original",
      "title": "Mi manga original",
      "chapter": 1,
      "chapterTitle": "El comienzo",
      "pdfUrl": "https://media.example.com/original/cap01.pdf",
      "rights": "owned",
      "rightsEvidence": "Derechos de edición y publicación verificados internamente"
    }
  ]
}
```
**IMPORTANTE:** son ejemplos; los dominios `example.com` no ofrecen reproducción. `data/media-intake.json` permanece **vacío** deliberadamente. Nunca se registra `rightsEvidence` en el manifiesto público; la cola editorial sí es pública si se introduce en el repositorio, así que usar únicamente una referencia no confidencial.

### Uso local / pruebas
```bash
node --test tests/publish-approved-content.test.mjs
node scripts/publish-approved-content.mjs --dry-run
node scripts/publish-approved-content.mjs
```
`--dry-run` valida sin escribir. La publicación genera solo referencias. No puede demostrar desde CI que el CDN siga accesible, que el contrato sea auténtico ni que Safari pueda reproducir cada archivo. HLS requiere el manifiesto y segmentos disponibles y CORS correcto.

## Archivos de video o manga propios: opcional Cloudflare R2
GitHub Pages sirve los archivos de la web; no está diseñado para una videoteca masiva. Una opción externa es Cloudflare R2 con URL pública HTTPS/CDN. Su plan incluye aprox. **10 GB-mes de almacenamiento estándar**, **1 millón de operaciones clase A** y **10 millones clase B** gratuitos al mes; superar cuotas causa cargos y se necesita activar R2 en una cuenta. Consulta https://developers.cloudflare.com/r2/pricing/ . No existe una cuota gratis ilimitada para todos los episodios.

Con un bucket R2 que tú hayas configurado, credenciales **solo en tu terminal/secretos**, AWS CLI y URL pública:
```bash
export R2_ENDPOINT_URL='https://<account-id>.r2.cloudflarestorage.com'
export R2_BUCKET='1up-licensed'
export R2_PUBLIC_BASE_URL='https://media.tu-dominio-autorizado.com'
export AWS_ACCESS_KEY_ID='...'
export AWS_SECRET_ACCESS_KEY='...'
bash scripts/upload-owned-file.sh ./mi-episodio.mp4 anime/mal-12345/t1/e1.mp4
```
La herramienta sube el archivo local y devuelve la URL para `media-intake.json`. Para manga, `manga/mi-manga/c1.pdf`. No pegar secretos en GitHub, issues, JSON, HTML ni chats públicos. Configurar CORS y permisos de acceso a objetos; verificar reproducción y uso real con pruebas del navegador. Para HLS deben subirse además los segmentos; el uploader simple admite MP4, WebM y PDF.

**Limitación importante:** las escrituras realizadas por `GITHUB_TOKEN` desde GitHub Actions pueden no disparar otros workflows automáticos, incluido un despliegue Pages que dependa de esos eventos. El responsable debe revisar el pipeline de Pages y, si corresponde, despachar explícitamente el build/deploy con permisos adecuados. Esta PR por sí sola no garantiza una nueva publicación inmediata en producción.

## Mantenimiento
- El scraper Python es local y opcional, separado de la web estática. Un futuro importador de PDFs puede emplear la misma cola y R2.
- No habilitar un temporizador para copiar video ajeno ni tratar datos AniList/Jikan como fuentes de video.
- No añadir archivos multimedia pesados al repositorio.
- Antes de fusionar: CI de Node, tests existentes, comparación de `index.html`, `sw.js`, pruebas móviles con PDF verdadero autorizado.
