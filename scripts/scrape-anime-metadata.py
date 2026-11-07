#!/usr/bin/env python3
"""Educational metadata collector using the public AniList GraphQL API. No video scraping.

Jikan was removed on 2026-11-07: the public Jikan API died on 2026-10-01
and only times out since, so this collector is AniList-only, like the
rest of 1UP Anime. Metadata only; no episode or stream data.
"""
import json
import os
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

API = "https://graphql.anilist.co"
OUT = Path(__file__).resolve().parents[1] / "data" / "scraped-anime.json"
LIMIT = max(1, min(int(os.getenv("ANIME_LIMIT", "25")), 100))
HEADERS = {"User-Agent": "1UP-Anime-Educational-Metadata/1.0", "Accept": "application/json", "Content-Type": "application/json"}

QUERY = """
query ($perPage: Int) {
  Page(page: 1, perPage: $perPage) {
    media(type: ANIME, status: RELEASING, sort: TRENDING_DESC, isAdult: false) {
      idMal
      title { romaji english native }
      siteUrl
      description(asHtml: false)
      coverImage { extraLarge }
      status
      episodes
      startDate { year month day }
      genres
    }
  }
}
"""


def fetch():
    body = json.dumps({"query": QUERY, "variables": {"perPage": LIMIT}}).encode("utf-8")
    request = urllib.request.Request(API, data=body, headers=HEADERS, method="POST")
    for attempt in range(4):
        try:
            with urllib.request.urlopen(request, timeout=20) as response:
                payload = json.load(response)
            if payload.get("errors"):
                raise RuntimeError("AniList GraphQL error")
            return payload
        except urllib.error.HTTPError as exc:
            if exc.code not in (429, 500, 502, 503, 504) or attempt == 3:
                raise
            retry_after = exc.headers.get("Retry-After") if exc.headers else None
            delay = min(int(retry_after), 65) if (retry_after or "").isdigit() else min(2 ** attempt * 2, 20)
            time.sleep(delay)
        except (TimeoutError, urllib.error.URLError):
            if attempt == 3:
                raise
            time.sleep(2 ** attempt)


def normalize(item):
    start = item.get("startDate") or {}
    if start.get("year") and start.get("month") and start.get("day"):
        aired_from = "%04d-%02d-%02d" % (start["year"], start["month"], start["day"])
    elif start.get("year"):
        aired_from = str(start["year"])
    else:
        aired_from = None
    title = item.get("title") or {}
    return {
        "mal_id": item.get("idMal"),
        "title": title.get("english") or title.get("romaji"),
        "url": item.get("siteUrl"),
        "synopsis": item.get("description"),
        "image": (item.get("coverImage") or {}).get("extraLarge"),
        "status": item.get("status"),
        "episodes": item.get("episodes"),
        "aired_from": aired_from,
        # AniList publishes no broadcast day/time block; keep the keys as
        # nulls instead of inventing data the source does not provide.
        "broadcast": {"day": None, "time": None, "timezone": None},
        "genres": item.get("genres") or [],
    }


def main():
    payload = fetch()
    media = ((payload.get("data") or {}).get("Page") or {}).get("media") or []
    records = [normalize(item) for item in media if item.get("idMal")]
    if not records:
        raise RuntimeError("Empty API response: refusing to replace catalog")
    output = {"source": "AniList API (public anime metadata)", "generated_at": datetime.now(timezone.utc).isoformat(), "note": "Metadata only; no video streams or episode availability guaranteed.", "items": records}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    temp = OUT.with_suffix(".tmp")
    temp.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temp.replace(OUT)
    print(f"Saved {len(records)} anime metadata records to {OUT}")


if __name__ == "__main__":
    main()
