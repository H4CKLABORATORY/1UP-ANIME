#!/usr/bin/env python3
"""Generate timed WebVTT for media the owner is permitted to process.

Requires locally installed faster-whisper and, for cross-language translation,
Argos Translate with the relevant offline models already installed.
Does NOT scrape sources, download protected video, or bypass DRM.
"""
import argparse
import re
from pathlib import Path

LANGS = ("es", "en")


def format_time(seconds):
    ms = max(0, round(float(seconds) * 1000))
    hours, rem = divmod(ms, 3_600_000)
    minutes, rem = divmod(rem, 60_000)
    secs, millis = divmod(rem, 1000)
    return f"{hours:02}:{minutes:02}:{secs:02}.{millis:03}"


def clean_caption(value):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]*>", "", str(value or ""))).strip()


def to_vtt(segments, translate=None):
    output = ["WEBVTT", ""]
    index = 0
    for segment in segments:
        text = clean_caption(segment.get("text"))
        if translate:
            text = clean_caption(translate(text))
        if not text:
            continue
        start, end = float(segment["start"]), float(segment["end"])
        if not 0 <= start < end:
            continue
        index += 1
        output.extend([str(index), f"{format_time(start)} --> {format_time(end)}", text, ""])
    if not index:
        raise ValueError("No valid subtitle cues generated")
    return "\n".join(output)


def translation_chain(from_code, to_code):
    if from_code == to_code:
        return lambda text: text
    try:
        import argostranslate.translate
        languages = {language.code: language
                     for language in argostranslate.translate.get_installed_languages()}
    except ImportError as exc:
        raise RuntimeError("Install argostranslate and the offline translation language models") from exc
    # Explicit paths: direct, or Japanese -> English -> Spanish, Spanish -> English -> Japanese.
    routes = [[from_code, to_code]]
    if from_code != "en" and to_code != "en":
        routes.append([from_code, "en", to_code])
    for route in routes:
        translations = []
        for a, b in zip(route, route[1:]):
            if a not in languages or b not in languages:
                break
            try:
                translations.append(languages[a].get_translation(languages[b]))
            except Exception:
                break
        if len(translations) == len(route) - 1:
            def perform(text, chain=translations):
                for step in chain:
                    text = step.translate(text)
                return text
            return perform
    raise RuntimeError(f"Offline translation models unavailable: {from_code} -> {to_code}. Do not publish guessed subtitles.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("media", type=Path, help="Local video/audio file the owner can legally process")
    parser.add_argument("--language", choices=["auto", "ja", "en", "es"], default="auto")
    parser.add_argument("--model", default="small", help="Whisper model; downloaded by package on first run")
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--stem", help="Safe episode basename")
    parser.add_argument("--rights-confirmed", action="store_true", required=True)
    args = parser.parse_args()
    if not args.rights_confirmed:
        parser.error("Explicit --rights-confirmed is required before processing media.")
    if not args.media.is_file():
        parser.error("Video or audio file missing; no network download is performed")
    if args.media.stat().st_size > 10_000_000_000:
        parser.error("Media file too large")
    stem = args.stem or args.media.stem
    if not re.fullmatch(r"[a-zA-Z0-9_-]{1,100}", stem):
        parser.error("Unsafe output basename")
    try:
        from faster_whisper import WhisperModel
    except ImportError as exc:
        raise RuntimeError("Install faster-whisper with pip before processing local licensed media") from exc
    whisper = WhisperModel(args.model, device="cpu", compute_type="int8")
    segments, info = whisper.transcribe(str(args.media),
                                        language=None if args.language == "auto" else args.language,
                                        vad_filter=True)
    source = info.language.split("-")[0]
    rows = [{"start": s.start, "end": s.end, "text": s.text} for s in segments]
    if not rows:
        raise RuntimeError("No speech could be transcribed: no subtitles published")
    # All outputs are prepared before writes: never publish half-translated files.
    results = {}
    for target in LANGS:
        transform = translation_chain(source, target)
        results[target] = to_vtt(rows, transform)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    for target, content in results.items():
        output = args.output_dir / f"{stem}.{target}.vtt"
        output.write_text(content, encoding="utf-8")
        print(f"Created {output}, source language {source}; review timing/translation before publishing.")


if __name__ == "__main__":
    main()
