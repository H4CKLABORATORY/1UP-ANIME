#!/usr/bin/env python3
"""Translate cached public AniList synopsis text EN -> ES using Argos Translate.

Generated Spanish metadata is stored separately in data/translations-es.json.
No client-side API key, translation endpoint or external runtime is needed.
Translation is best-effort: translations may be imperfect, and older data isn't
presented for a synopsis that changed in the source.
"""
from __future__ import annotations

import json
import re
import sys
import time
from pathlib import Path

CATALOG = Path("data/catalog.json")
OUTPUT = Path("data/translations-es.json")
AIRING = Path("data/airing.json")


def sanitize(text: str) -> str:
    return re.sub(r"\s+", " ", str(text or "")).strip()


def get_model():
    import argostranslate.package
    import argostranslate.translate

    installed = argostranslate.translate.get_installed_languages()
    src = next((lang for lang in installed if lang.code == "en"), None)
    dst = next((lang for lang in installed if lang.code == "es"), None)
    if src is not None and dst is not None:
        try:
            return src.get_translation(dst)
        except Exception:
            pass

    print("Installing open-source Argos Translate English-Spanish model.", flush=True)
    argostranslate.package.update_package_index()
    available = argostranslate.package.get_available_packages()
    package = next(
        (pkg for pkg in available if pkg.from_code == "en" and pkg.to_code == "es"),
        None,
    )
    if package is None:
        raise RuntimeError("Argos package index does not offer en -> es model")
    argostranslate.package.install_from_path(package.download())
    installed = argostranslate.translate.get_installed_languages()
    src = next((lang for lang in installed if lang.code == "en"), None)
    dst = next((lang for lang in installed if lang.code == "es"), None)
    if not src or not dst:
        raise RuntimeError("Argos translation model did not install")
    return src.get_translation(dst)


def main() -> None:
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    rows = {}
    for group in catalog.get("groups", {}).values():
        for anime in group:
            key = str(anime.get("id") or "")
            source = sanitize(anime.get("description") or "")
            if key and len(source) >= 24:
                rows[key] = source
    # Add seasonal premieres and recently airing shows not included among the
    # four homepage catalog shelves. Translate descriptions offline once daily.
    airing = None
    if AIRING.exists():
        try:
            airing = json.loads(AIRING.read_text(encoding="utf-8"))
            upcoming = list(airing.get("seasonal", {}).get("entries", []))
            upcoming += list(airing.get("airing", []))
            for anime in upcoming:
                key = str(anime.get("id") or "")
                source = sanitize(anime.get("description") or "")[:600]
                if key and len(source) >= 24 and key not in rows:
                    rows[key] = source
        except Exception as error:
            print(f"Could not extend translation rows with schedule: {error}", file=sys.stderr)
    if not rows:
        raise RuntimeError("No synopsis text in catalog")
    old = {}
    if OUTPUT.exists():
        try:
            old = json.loads(OUTPUT.read_text(encoding="utf-8")).get("translations", {})
        except Exception as error:
            print(f"Ignoring invalid prior translation cache: {error}", file=sys.stderr)
    done = {}
    pending = []
    for key, source in rows.items():
        previous = old.get(key)
        if (
            isinstance(previous, dict)
            and previous.get("original") == source
            and len(sanitize(previous.get("es") or "")) >= 12
        ):
            done[key] = previous
        else:
            pending.append((key, source))

    print(f"Synopsis records: {len(rows)}; cached: {len(done)}; translating: {len(pending)}", flush=True)
    if pending:
        translator = get_model()
        started = time.monotonic()
        for index, (key, source) in enumerate(pending, 1):
            try:
                translated = sanitize(translator.translate(source))
                if len(translated) < 12:
                    raise ValueError("Empty/invalid translation")
                done[key] = {"original": source, "es": translated}
            except Exception as error:
                print(f"Could not translate {key}: {error}", file=sys.stderr)
            if index % 10 == 0:
                print(f"Translated {index}/{len(pending)} in {time.monotonic()-started:.1f}s", flush=True)
    # Human-reviewed Spanish can replace rough automatic phrasing for selected
    # entries, while retaining the exact source synopsis for cache matching.
    manual_path = Path("data/sinopsis-editoriales-es.json")
    if manual_path.exists():
        manual = json.loads(manual_path.read_text(encoding="utf-8"))
        for key, item in manual.items():
            if key in rows and isinstance(item, dict):
                es = sanitize(item.get("es") or "")
                if len(es) >= 24:
                    done[key] = {"original": rows[key], "es": es, "editorial": True}
                    print(f"Applied reviewed Spanish synopsis: {key}")

    if not done:
        raise RuntimeError("No translations could be produced")

    # Publish Spanish text alongside the anime metadata. This avoids a race
    # between two requests and gives the client an explicit description_es.
    for group in catalog.get("groups", {}).values():
        for anime in group:
            key = str(anime.get("id") or "")
            source = sanitize(anime.get("description") or "")
            row = done.get(key)
            if row and row.get("original") == source:
                anime["description_es"] = row["es"]
            else:
                anime.pop("description_es", None)
    catalog_tmp = CATALOG.with_suffix(".tmp")
    catalog_tmp.write_text(
        json.dumps(catalog, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    catalog_tmp.replace(CATALOG)
    # Translation records for seasonal anime are stored by stable ID in
    # data/translations-es.json. The separate six-hour airing workflow applies
    # them on its next refresh, so we never modify its output here.

    body = {
        "language": "es",
        "source": "Argos Translate en-es, automated translation of AniList public metadata",
        "catalog_updated": catalog.get("updated"),
        "translated": len(done),
        "translations": done,
    }
    OUTPUT.parent.mkdir(exist_ok=True)
    tmp = OUTPUT.with_suffix(".tmp")
    tmp.write_text(json.dumps(body, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    tmp.replace(OUTPUT)
    print(f"Saved {len(done)} translated anime synopses to {OUTPUT}", flush=True)


if __name__ == "__main__":
    main()
