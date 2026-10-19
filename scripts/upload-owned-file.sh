#!/usr/bin/env bash
# Publica archivos PROPIOS/autorizados a Cloudflare R2.
# GitHub Pages no aloja bibliotecas de video; jamás poner credenciales en JS.
set -euo pipefail
if [[ $# -ne 2 ]]; then
  echo "Uso: scripts/upload-owned-file.sh ./episodio.mp4 anime/mal-123/t1/e1.mp4" >&2
  exit 2
fi
FILE="$1"; KEY="$2"
: "${R2_ENDPOINT_URL:?Configura R2_ENDPOINT_URL}"
: "${R2_BUCKET:?Configura R2_BUCKET}"
: "${R2_PUBLIC_BASE_URL:?Configura R2_PUBLIC_BASE_URL}"
: "${AWS_ACCESS_KEY_ID:?Configura AWS_ACCESS_KEY_ID}"
: "${AWS_SECRET_ACCESS_KEY:?Configura AWS_SECRET_ACCESS_KEY}"
[[ -f "$FILE" ]] || { echo "Archivo inexistente" >&2; exit 2; }
[[ "$KEY" =~ ^(anime|manga)/[A-Za-z0-9/_-]+\.(mp4|webm|pdf)$ ]] || {
  echo "Ruta remota inválida (usa anime/...mp4 o manga/...pdf)" >&2; exit 2;
}
[[ "$R2_ENDPOINT_URL" == https://* ]] || { echo "Endpoint R2 debe ser HTTPS" >&2; exit 2; }
[[ "$R2_PUBLIC_BASE_URL" == https://* ]] || { echo "URL pública debe ser HTTPS" >&2; exit 2; }
command -v aws >/dev/null || { echo "Necesitas AWS CLI instalado" >&2; exit 2; }
export AWS_DEFAULT_REGION=auto AWS_EC2_METADATA_DISABLED=true
TYPE='application/pdf'
case "$FILE" in
  *.mp4) TYPE='video/mp4';;
  *.webm) TYPE='video/webm';;
  *.pdf) TYPE='application/pdf';;
  *) echo "Tipo de archivo no admitido" >&2; exit 2;;
esac
aws --endpoint-url "$R2_ENDPOINT_URL" s3 cp "$FILE" "s3://$R2_BUCKET/$KEY" --content-type "$TYPE" --no-progress
echo "Publicado: ${R2_PUBLIC_BASE_URL%/}/$KEY"
echo "Agrega esta URL a data/media-intake.json junto con la referencia real de tus derechos."
