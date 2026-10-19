#!/usr/bin/env bash
# Instalación local opcional de Manga-Scraper (herramienta externa, sólo manga).
# NO se ejecuta dentro de GitHub Pages ni descarga automáticamente contenido.
set -euo pipefail
cd "$(dirname "$0")/.."
python3 -m venv .venv-manga
. .venv-manga/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements-manga.txt
printf '\nManga-Scraper instalado en el entorno local: .venv-manga/\n'
printf 'El proyecto upstream requiere el instalador externo "installmanga" para mangadl-bash.\n'
printf 'Revísalo antes de ejecutarlo y úsalo sólo en fuentes donde se permita descargar/distribuir.\n'
printf 'Comandos: source .venv-manga/bin/activate && scrapemanga\n'
