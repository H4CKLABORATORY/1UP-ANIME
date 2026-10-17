"""Optional background snapshot for 1UP Anime, with no website admin panel.

Runs only when explicitly approved by repository owner, checks robots.txt
before fetching and saves a bounded metadata-only snapshot when it changes.
It never visits episode/media URLs and never bypasses access controls.
"""
from __future__ import annotations

import json
import os
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit
from urllib.request import Request, urlopen
from urllib.robotparser import RobotFileParser

from server import BASE_URL, clean, fetch_cards, safe_catalog_link

ROBOTS_URL = "https://jkanime.net/robots.txt"
USER_AGENT = "1UPAnimeMetadata/1.0"
OUTPUT = Path("data/scrapling-discovery.json")
MAX_ITEMS = 24


class SourceNotApproved(RuntimeError):
    pass


def require_owner_approval(env=os.environ) -> None:
    if env.get("SCRAPLING_SOURCE_APPROVED") != "1":
        raise SourceNotApproved("Source permission has not been approved")
    if env.get("SCRAPLING_AUTOMATION_ENABLED") != "1":
        raise SourceNotApproved("Background metadata update is disabled")
    # No password is committed: GitHub Actions injects the owner-configured secret.
    token = env.get("SCRAPLING_AUTOMATION_TOKEN", "")
    if len(token) < 32:
        raise SourceNotApproved("Private automation token is missing or too short")


def robots_permits(opener=urlopen) -> bool:
    """Fail closed if robots policy is not accessible or explicitly disallows fetch."""
    request = Request(ROBOTS_URL, headers={"User-Agent": USER_AGENT, "Accept": "text/plain"})
    try:
        with opener(request, timeout=8) as response:
            target = urlsplit(response.geturl())
            if response.status != 200 or target.scheme != "https" or target.hostname != "jkanime.net":
                return False
            content = response.read(65537)
            if len(content) > 65536:
                return False
            lines = content.decode("utf-8", "replace").splitlines()
    except Exception:
        return False
    parser = RobotFileParser()
    parser.parse(lines)
    return parser.can_fetch(USER_AGENT, BASE_URL)


def normalize_cards(cards) -> list[dict[str, str]]:
    results, seen = [], set()
    for card in cards:
        if not isinstance(card, dict):
            continue
        title = clean(card.get("title", ""), 150)
        url = safe_catalog_link(card.get("url", ""))
        if len(title) < 3 or not url or url in seen:
            continue
        seen.add(url)
        results.append({"title": title, "url": url, "provider": "JKAnime"})
        if len(results) == MAX_ITEMS:
            break
    return results


def save_snapshot(cards, path: Path = OUTPUT, now=None) -> bool:
    items = normalize_cards(cards)
    # Never wipe existing data with an unexpected empty source response.
    if not items:
        raise ValueError("Source returned no eligible catalog titles")
    try:
        existing = json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        existing = {}
    if existing.get("items") == items and existing.get("source") == "jkanime_public_metadata":
        return False
    payload = {
        "source": "jkanime_public_metadata",
        "mode": "catalog_only",
        "streaming": False,
        "sourceUrl": BASE_URL,
        "updated": now or datetime.now(timezone.utc).isoformat(),
        "items": items,
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    # Atomic write: partial output is never left in the catalog.
    tmp_name = None
    try:
        with tempfile.NamedTemporaryFile("w", encoding="utf-8", suffix=".json",
                                          dir=path.parent, delete=False) as temp:
            tmp_name = temp.name
            json.dump(payload, temp, ensure_ascii=False, indent=2)
            temp.write("\n")
        os.replace(tmp_name, path)
    finally:
        if tmp_name and os.path.exists(tmp_name):
            os.unlink(tmp_name)
    return True


def main():
    require_owner_approval()
    if not robots_permits():
        raise SourceNotApproved("Source robots policy cannot be verified or disallows crawling")
    cards = fetch_cards("")  # One bounded homepage request, no crawling of episodes.
    updated = save_snapshot(cards)
    print("Scrapling metadata snapshot updated" if updated else "No catalog changes; no commit")


if __name__ == "__main__":
    main()
