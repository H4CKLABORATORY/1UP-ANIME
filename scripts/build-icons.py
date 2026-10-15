#!/usr/bin/env python3
"""Produce iPhone/PWA square PNG icons from the 1UP Anime original vector emblem."""
from io import BytesIO
from pathlib import Path
import cairosvg
from PIL import Image

vector = Path("assets/oneup-crest.svg").read_bytes()
out = Path("assets")
out.mkdir(parents=True, exist_ok=True)

for edge in (180, 192, 512):
    # Keep logo crisp and leave generous safe space inside native app icon.
    crest_edge = int(edge * 0.92)
    raster = cairosvg.svg2png(bytestring=vector, output_width=crest_edge, output_height=crest_edge)
    mark = Image.open(BytesIO(raster)).convert("RGBA")
    bg = Image.new("RGBA", (edge, edge), (6, 9, 22, 255))
    bg.alpha_composite(mark, ((edge-crest_edge)//2, (edge-crest_edge)//2))
    dest = out / f"icon-{edge}.png"
    bg.convert("RGB").save(dest, "PNG", optimize=True)
    print(f"Saved {dest} ({dest.stat().st_size} bytes)")
