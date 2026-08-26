#!/usr/bin/env python3
"""Pull usable UI icons out of a flat preview sheet.

The reference sheets are JPEG previews of icon packs -- bright line art on a
near-black ground, with no alpha and no manifest. Two things make them usable
anyway.

The first is that a bright shape on a dark ground carries its own alpha: the
luminance IS the coverage. That is the same trick the Gemini renders needed,
and it round-trips well here because the background measures 92% of the sheet
at a standard deviation of 13, so there is a wide, safe gap to key in.

The second is that colour should be thrown away rather than kept. The packs are
red and white; this tracker is cyan, gold and crimson. Keeping the source
colour would import a fourth palette. So only the ALPHA is written out, and the
CSS paints it with the colour of whatever it sits on -- a mask, not an image.
An icon on a danger button comes out crimson and the same icon on a panel
header comes out cyan, from one sprite.

Icons are found rather than assumed: the sheets are not on a uniform grid --
one has 12 columns of vendor icons over 5 of commission diamonds -- so a grid
slice would cut them in half. Connected components on the keyed mask finds them
where they actually are.
"""

import argparse
import json
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage


def key_alpha(path, floor, ceil):
    """Luminance to coverage, with a soft ramp rather than a threshold.

    A hard cut at one luminance leaves every diagonal edge stepped, and these
    sheets are almost entirely diagonals. The ramp between floor and ceil is
    what keeps a 45-degree chevron looking drawn instead of pixelated.
    """
    a = np.asarray(Image.open(path).convert("RGB")).astype(np.float32)
    lum = 0.3 * a[:, :, 0] + 0.6 * a[:, :, 1] + 0.1 * a[:, :, 2]
    return np.clip((lum - floor) / max(1.0, ceil - floor), 0.0, 1.0)


def find_icons(alpha, thresh, min_w, min_h, gap):
    """Whole icons, not the strokes they are made of.

    Line art is not connected: a bracket is four separate corner marks and a
    chevron is three separate arrows. Labelling the mask directly returns those
    pieces, so the mask is DILATED by `gap` first, which bridges the strokes
    inside one icon without bridging the space between two.
    """
    solid = ndimage.binary_closing(alpha > thresh, np.ones((5, 5)))
    lab, _ = ndimage.label(ndimage.binary_dilation(solid, np.ones((gap, gap))))
    out = []
    for sl in ndimage.find_objects(lab):
        y, x = sl
        w, h = x.stop - x.start, y.stop - y.start
        if w >= min_w and h >= min_h:
            out.append((x.start, y.start, w, h))
    out.sort(key=lambda b: (b[1] // 40, b[0]))     # reading order, row-banded
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("sheets", nargs="+")
    ap.add_argument("-o", "--out", default="web/ui_icons.png")
    ap.add_argument("--cell", type=int, default=64, help="square cell each icon is fitted into")
    ap.add_argument("--cols", type=int, default=16)
    ap.add_argument("--floor", type=float, default=46.0)
    ap.add_argument("--ceil", type=float, default=118.0)
    ap.add_argument("--min-w", type=int, default=26)
    ap.add_argument("--min-h", type=int, default=20)
    ap.add_argument("--gap", type=int, default=9)
    ap.add_argument("--contact", help="also write a numbered contact sheet here")
    args = ap.parse_args()

    icons = []
    for path in args.sheets:
        alpha = key_alpha(path, args.floor, args.ceil)
        boxes = find_icons(alpha, 0.25, args.min_w, args.min_h, args.gap)
        print(f"  {os.path.basename(path)}  {alpha.shape[1]}x{alpha.shape[0]}  "
              f"{len(boxes)} icons")
        for (x, y, w, h) in boxes:
            crop = alpha[y:y + h, x:x + w]
            # Fit into the cell on the LONGER side, so a wide button and a
            # square check come out at a consistent visual weight rather than
            # a consistent width.
            s = (args.cell - 6) / max(w, h)
            im = Image.fromarray((crop * 255).astype(np.uint8), "L").resize(
                (max(1, int(w * s)), max(1, int(h * s))), Image.LANCZOS)
            icons.append(im)

    cols = args.cols
    rows = (len(icons) + cols - 1) // cols
    sheet = Image.new("RGBA", (cols * args.cell, rows * args.cell), (0, 0, 0, 0))
    for i, im in enumerate(icons):
        cx, cy = (i % cols) * args.cell, (i // cols) * args.cell
        ox, oy = cx + (args.cell - im.width) // 2, cy + (args.cell - im.height) // 2
        # White with the keyed alpha: the sprite is a stencil, and every pixel
        # of colour in it would be a pixel the CSS could not recolour.
        sheet.paste(Image.merge("RGBA", (im.point(lambda v: 255),) * 3 + (im,)), (ox, oy))

    os.makedirs(os.path.dirname(args.out) or ".", exist_ok=True)
    sheet.save(args.out, optimize=True)
    man = {"image": os.path.basename(args.out), "cell": args.cell,
           "cols": cols, "rows": rows, "count": len(icons)}
    with open(os.path.splitext(args.out)[0] + ".json", "w", encoding="utf-8") as fh:
        json.dump(man, fh, indent=1)
    print(f"  -> {len(icons)} icons, {cols}x{rows} of {args.cell}px, "
          f"{os.path.getsize(args.out) / 1e3:.0f} KB")

    if args.contact:
        from PIL import ImageDraw
        pad = 18
        c = Image.new("RGB", (cols * args.cell, rows * (args.cell + pad)), (14, 18, 26))
        d = ImageDraw.Draw(c)
        for i, im in enumerate(icons):
            cx, cy = (i % cols) * args.cell, (i // cols) * (args.cell + pad)
            c.paste((80, 210, 230), (cx + (args.cell - im.width) // 2,
                                     cy + (args.cell - im.height) // 2), im)
            d.text((cx + 3, cy + args.cell + 3), str(i), fill=(150, 170, 190))
        c.save(args.contact)
        print(f"  -> contact sheet {args.contact}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
