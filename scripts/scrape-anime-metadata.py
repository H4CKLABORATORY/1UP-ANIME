#!/usr/bin/env python3
"""Educational metadata collector using the public Jikan API. No video scraping."""
import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

BASE = "https://api.jikan.moe/v4"
OUT = Path(__file__).resolve().parents[1] / "data" / "scraped-anime.json"
LIMIT = max(1, min(int(os.getenv("ANIME_LIMIT", "25")), 100))
HEADERS = {"User-Agent": "1UP-Anime-Educational-Metadata/1.0", "Accept": "application/json"}

def fetch(path):
    request = urllib.request.Request(BASE + path, headers=HEADERS)
    for attempt in range(4):
        try:
            with urllib.request.urlopen(request, timeout=20) as response:
                return json.load(response)
        except urllib.error.HTTPError as exc:
            if exc.code not in (429, 500, 502, 503, 504) or attempt == 3:
                raise
            time.sleep(min(2 ** attempt * 2, 20))
        except (TimeoutError, urllib.error.URLError):
            if attempt == 3:
                raise
            time.sleep(2 ** attempt)

def normalize(item):
    broadcast = item.get("broadcast") or {}
    return {
        "mal_id": item["mal_id"],
        "title": item.get("title"),
        "url": item.get("url"),
        "synopsis": item.get("synopsis"),
        "image": ((item.get("images") or {}).get("webp") or {}).get("large_image_url"),
        "status": item.get("status"),
        "episodes": item.get("episodes"),
        "aired_from": (item.get("aired") or {}).get("from"),
        "broadcast": {"day": broadcast.get("day"), "time": broadcast.get("time"), "timezone": broadcast.get("timezone")},
        "genres": [g.get("name") for g in item.get("genres", [])],
    }

def main():
    payload = fetch("/seasons/now?" + urllib.parse.urlencode({"limit": LIMIT, "sfw": "true"}))
    records = [normalize(item) for item in payload.get("data", []) if item.get("mal_id")]
    if not records:
        raise RuntimeError("Empty API response: refusing to replace catalog")
    output = {"source": "Jikan API (public MyAnimeList metadata)", "generated_at": datetime.now(timezone.utc).isoformat(), "note": "Metadata only; no video streams or episode availability guaranteed.", "items": records}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    temp = OUT.with_suffix(".tmp")
    temp.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temp.replace(OUT)
    print(f"Saved {len(records)} anime metadata records to {OUT}")

if __name__ == "__main__":
    main()
