#!/usr/bin/env python3
"""Generate a stand-in sprite sheet for testing slice_sheet.py.

Mimics the awkward parts of a hand/AI-made sheet: flat grey background,
rows with different frame counts, and frames that are not evenly spaced.
"""
import math
import sys

from PIL import Image, ImageDraw

BG = (128, 128, 128)
W = H = 1024
ROWS = [5, 6, 6, 6]


def figure(d, cx, base, t, scale):
    s = scale
    swing = math.sin(t * math.tau)
    d.ellipse([cx - 9 * s, base - 62 * s, cx + 9 * s, base - 44 * s], fill=(200, 40, 40))
    d.line([cx, base - 44 * s, cx, base - 20 * s], fill=(240, 240, 240), width=int(6 * s))
    d.line([cx, base - 40 * s, cx + 16 * s * swing, base - 26 * s], fill=(240, 240, 240), width=int(4 * s))
    d.line([cx, base - 40 * s, cx - 16 * s * swing, base - 26 * s], fill=(240, 240, 240), width=int(4 * s))
    d.line([cx, base - 20 * s, cx + 12 * s * swing, base], fill=(40, 40, 48), width=int(5 * s))
    d.line([cx, base - 20 * s, cx - 12 * s * swing, base], fill=(40, 40, 48), width=int(5 * s))


def main(path="assets/test_sheet.png"):
    img = Image.new("RGBA", (W, H), BG + (255,))
    d = ImageDraw.Draw(img)
    for ri, count in enumerate(ROWS):
        base = int((ri + 1) * H / len(ROWS)) - 26
        for fi in range(count):
            cx = int((fi + 0.5) * W / count) + (6 if fi % 2 else -6)
            figure(d, cx, base, fi / count, 1.9)
    img.save(path)
    print(f"wrote {path} ({W}x{H}, rows={ROWS})")


if __name__ == "__main__":
    main(*sys.argv[1:])
