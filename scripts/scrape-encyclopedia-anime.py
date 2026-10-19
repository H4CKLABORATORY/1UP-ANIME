#!/usr/bin/env python3
"""Extractor educativo de metadatos factuales de anime; sin videos ni imágenes."""
import argparse
import json
import os
import re
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen
from urllib.robotparser import RobotFileParser
from bs4 import BeautifulSoup

SOURCE = "https://en.wikipedia.org/wiki/2026_in_anime"
ROBOTS = "https://en.wikipedia.org/robots.txt"
UA = "OneUpAnimeEduBot/1.0 (https://github.com/H4CKLABORATORY/1UP-ANIME)"
SECTIONS = {"films": "Película", "television series": "TV",
            "original video animations": "OVA", "original net animations": "ONA"}
MAX_BYTES = 4_000_000


def clean(value, limit=180):
    return re.sub(r"\s+", " ", str(value or "")).strip()[:limit]


def parse_html(html):
    soup = BeautifulSoup(html, "html.parser")
    result, seen = [], set()
    for table in soup.select("table.wikitable"):
        heading = table.find_previous(["h2", "h3", "h4"])
        if not heading:
            continue
        label = clean(heading.get_text(" ", strip=True)).lower()
        kind = next((value for key, value in SECTIONS.items() if label.startswith(key)), None)
        if not kind:
            continue
        rows = table.find_all("tr")
        if not rows:
            continue
        headers = [clean(c.get_text(" ", strip=True)).lower()
                   for c in rows[0].find_all(["th", "td"], recursive=False)]
        title_idx = next((i for i, name in enumerate(headers) if name == "title"), None)
        if title_idx is None:
            continue
        date_idx = next((i for i, name in enumerate(headers)
                         if "date" in name or "first run" in name), None)
        studio_idx = next((i for i, name in enumerate(headers) if "studio" in name), None)
        episodes_idx = next((i for i, name in enumerate(headers) if "episodes" in name), None)
        for row in rows[1:]:
            cells = row.find_all(["td", "th"], recursive=False)
            if title_idx >= len(cells):
                continue
            cell = cells[title_idx]
            title = clean(cell.get_text(" ", strip=True), 220)
            if len(title) < 2 or title.lower() == "title":
                continue
            key = (kind, title.casefold())
            if key in seen:
                continue
            seen.add(key)
            link = cell.find("a", href=True)
            href = urljoin(SOURCE, link["href"]) if link else SOURCE
            url = urlparse(href)
            if url.scheme != "https" or url.hostname != "en.wikipedia.org" or not url.path.startswith("/wiki/"):
                href = SOURCE
            def value(idx, limit=100):
                return clean(cells[idx].get_text(" ", strip=True), limit) if idx is not None and idx < len(cells) else ""
            episode_str = value(episodes_idx, 20)
            count = int(episode_str) if episode_str.isdecimal() and 0 < int(episode_str) < 2000 else None
            result.append({"title": title, "format": kind, "year": 2026,
                           "release": value(date_idx), "studio": value(studio_idx, 110),
                           "episodes": count, "sourceUrl": href})
            if len(result) >= 900:
                return result
    return result


def fetch_html():
    with urlopen(Request(ROBOTS, headers={"User-Agent": UA}), timeout=15) as response:
        if response.status != 200:
            raise RuntimeError("No se pudo verificar robots.txt")
        robots = response.read(600_000).decode("utf-8", errors="replace")
    rules = RobotFileParser()
    rules.parse(robots.splitlines())
    if not rules.can_fetch(UA, SOURCE):
        raise PermissionError("robots.txt no permite esta ruta")
    with urlopen(Request(SOURCE, headers={"User-Agent": UA, "Accept": "text/html"}), timeout=25) as response:
        if response.status != 200 or "html" not in response.headers.get("Content-Type", "").lower():
            raise RuntimeError("Respuesta HTML no válida")
        raw = response.read(MAX_BYTES + 1)
        if len(raw) > MAX_BYTES:
            raise RuntimeError("Página demasiado grande")
        return raw.decode("utf-8", errors="replace")


def snapshot(items):
    return {
        "updated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "status": "ok",
        "source": {"name": "Wikipedia: 2026 in anime", "url": SOURCE,
                   "attribution": "Contribuidores de Wikipedia, CC BY-SA; verificar condiciones de reutilización."},
        "count": len(items), "items": items,
    }


def atomic_write(path, content):
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=str(path.parent), delete=False) as handle:
        name = handle.name
        json.dump(content, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    os.replace(name, path)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, help="HTML local para pruebas sin conexión")
    parser.add_argument("--output", type=Path, default=Path("data/encyclopedia-anime.json"))
    args = parser.parse_args()
    html = args.input.read_text(encoding="utf-8") if args.input else fetch_html()
    items = parse_html(html)
    if len(items) < (2 if args.input else 10):
        raise RuntimeError("Extracción vacía o incompleta: snapshot conservado")
    atomic_write(args.output, snapshot(items))
    print("Extraídas", len(items), "fichas de", SOURCE)


if __name__ == "__main__":
    main()
