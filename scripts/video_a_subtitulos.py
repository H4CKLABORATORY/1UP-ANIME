#!/usr/bin/env python3
"""Create Spanish WebVTT subtitles from an OWNER-PROVIDED, AUTHORIZED local video.

Use:
    pip install faster-whisper argostranslate
    python scripts/video_a_subtitulos.py ./video_propio.mp4 --output ./media/video.es.vtt

This does not download videos, rip streams, bypass DRM or transfer publishing rights.
It generates subtitle files for videos that users already have permission to publish.
"""
from __future__ import annotations
import argparse
import sys
from pathlib import Path

def fmt(seconds: float) -> str:
    msecs = round(max(0.0, seconds) * 1000)
    hours, rem = divmod(msecs, 3600000)
    minutes, rem = divmod(rem, 60000)
    secs, ms = divmod(rem, 1000)
    return f"{hours:02}:{minutes:02}:{secs:02}.{ms:03}"

def translator_for(language: str):
    if language == "es":
        return lambda text: text
    import argostranslate.package as pkg
    import argostranslate.translate as tr
    routing = {"en": [("en", "es")], "ja": [("ja", "en"), ("en", "es")]}
    hops = routing.get(language)
    if not hops:
        raise SystemExit(
            f"Idioma detectado: {language!r}. Se admiten audio en español, inglés y japonés."
        )

    pkg.update_package_index()
    available = pkg.get_available_packages()
    def model(source, target):
        installed = tr.get_installed_languages()
        a = next((x for x in installed if x.code == source), None)
        b = next((x for x in installed if x.code == target), None)
        if a and b:
            try:
                return a.get_translation(b)
            except Exception:
                pass
        offered = next((x for x in available if x.from_code == source and x.to_code == target), None)
        if not offered:
            raise SystemExit(f"No existe un modelo Argos {source} -> {target}")
        print(f"Descargando modelo de traducción {source} -> {target}...")
        pkg.install_from_path(offered.download())
        installed = tr.get_installed_languages()
        a = next((x for x in installed if x.code == source), None)
        b = next((x for x in installed if x.code == target), None)
        if not a or not b:
            raise SystemExit(f"No se pudo instalar el modelo {source} -> {target}")
        return a.get_translation(b)

    chain = [model(src,dst) for src,dst in hops]
    def translate(text):
        for engine in chain:
            text = engine.translate(text)
        return text
    return translate

def main():
    ap = argparse.ArgumentParser(description="Genera subtítulos WebVTT en español para tus videos autorizados.")
    ap.add_argument("video",type=Path,help="Archivo de audio o video que tienes derecho a utilizar")
    ap.add_argument("--output",type=Path,default=None,help="Archivo VTT de salida")
    ap.add_argument("--model",default="small",choices=["tiny","base","small","medium","large-v3"])
    ap.add_argument("--language",default=None,choices=["es","en","ja"],help="Idioma de la voz, o autodetección")
    ap.add_argument("--device",default="cpu",choices=["cpu","cuda"])
    args=ap.parse_args()
    if not args.video.is_file():
        ap.error("El archivo proporcionado no existe.")
    output=args.output or args.video.with_suffix(".es.vtt")
    from faster_whisper import WhisperModel
    compute_type="float16" if args.device=="cuda" else "int8"
    print("Reconociendo voz... puede tardar según la duración y la computadora.",flush=True)
    model=WhisperModel(args.model,device=args.device,compute_type=compute_type)
    segments,info=model.transcribe(str(args.video),language=args.language,beam_size=5,vad_filter=True)
    language=args.language or info.language
    print(f"Idioma de audio: {language} · probabilidad: {info.language_probability:.2f}",flush=True)
    translator=translator_for(language)
    lines=["WEBVTT",""]
    count=0
    for s in segments:
        original=s.text.strip()
        if not original:
            continue
        try:
            spanish=translator(original).strip()
        except Exception as exc:
            print(f"Error de traducción en {fmt(s.start)}: {exc}",file=sys.stderr)
            continue
        if not spanish:
            continue
        lines.append(f"{fmt(s.start)} --> {fmt(s.end)}")
        lines.append(spanish.replace("-->","→").replace("\n"," "))
        lines.append("")
        count+=1
        if count%50==0:
            print(f"{count} segmentos traducidos...",flush=True)
    if not count:
        raise SystemExit("No se generaron subtítulos. Comprueba que el video tenga diálogo audible.")
    output.parent.mkdir(parents=True,exist_ok=True)
    output.write_text("\n".join(lines),encoding="utf-8")
    print(f"Subtítulos VTT generados: {output} ({count} fragmentos)")
    print("Aviso: traducción automática; revisa nombres propios, sincronización y modismos.")

if __name__=="__main__":
    main()
