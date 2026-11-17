# 1UP Anime: laboratorio educativo de scraping

Basado en la idea del tutorial de Tejas Haritsa V K (2020) sobre organizar datos con Python y BeautifulSoup. No se copia código del artículo.

- La ruta scraping-lab.html muestra resultados de scraping factual desde Wikipedia: https://en.wikipedia.org/wiki/2026_in_anime
- El script scripts/scrape-encyclopedia-anime.py consulta robots.txt, extrae una sola página HTTPS con urllib y BeautifulSoup y produce data/encyclopedia-anime.json.
- Una GitHub Action valida pruebas sin red y programa un refresco diario a las 09:31 UTC, con opción manual.
- Captura título, formato, año, fecha textual, estudio, episodios y URL de fuente.
- Si Wikipedia devuelve un error o cambia su HTML, conserva la última copia exitosa. La web usa el catálogo AniList como fallback.
- Los listados permiten enriquecer el catálogo enciclopédico de anime.

Pruebas:
    python -m pip install 'beautifulsoup4>=4.12,<5'
    python -m unittest discover -s tests -p 'test_educational_scraper.py' -v
    python scripts/scrape-encyclopedia-anime.py --input tests/fixtures/encyclopedia-anime.html --output /tmp/test-anime.json
    python scripts/scrape-encyclopedia-anime.py

No afirmar pruebas reales de HTTP, GitHub Pages o Safari hasta confirmar CI y despliegue.
