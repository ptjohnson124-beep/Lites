#!/usr/bin/env python3
"""Pack sliced rig pieces into one texture atlas.

A pose sheet is sliced into frames that all share a canvas, because an
animation wants its drawings registered to each other. A rig piece wants the
opposite: its own tight crop and its own offset, because the skeleton decides
where it goes. So this trims every piece back to its ink and packs the trims
into a single power-of-two texture.

Two files come out beside the texture. The `.atlas` is what a Spine runtime
reads, in the libGDX format Spine has emitted since 3.8 — widely accepted, and
unambiguous about rotation and trimming in a way the terser 4.x form is not.
The `.parts.json` is for the skeleton generator: it carries each piece's size
and the angle its long axis lies at, which is what decides how far an
attachment has to be rotated to line up with the bone that moves it.
"""

import argparse
import json
import os

import numpy as np
from PIL import Image


def trim(path):
    """The piece's own ink, cropped out of whatever canvas it arrived on."""
    im = Image.open(path).convert("RGBA")
    a = np.asarray(im)
    ys, xs = np.nonzero(a[:, :, 3] > 8)
    if not len(xs):
        raise SystemExit(f"{path}: nothing but transparency in this piece")
    return im.crop((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))


def long_axis(im):
    """Angle of the piece's longest dimension, and its length across that axis.

    A limb drawn straight down the cell and the same limb drawn at forty
    degrees are the same attachment on the same bone; only the angle the
    drawing happens to sit at differs. Measuring it here means the skeleton can
    cancel it out instead of the rig being built around however each piece was
    posed on its sheet.
    """
    a = np.asarray(im)
    ys, xs = np.nonzero(a[:, :, 3] > 8)
    pts = np.stack([xs, ys]).astype(float)
    pts -= pts.mean(axis=1, keepdims=True)
    _, vec = np.linalg.eigh(np.cov(pts))
    axis = vec[:, -1]                      # eigenvector of the largest spread
    proj = vec.T @ pts
    # Screen y runs down and the atlas is described in screen space, so the
    # angle is reported the same way; the skeleton flips it once, in one place.
    return float(np.degrees(np.arctan2(axis[1], axis[0]))), float(proj[-1].max() - proj[-1].min())


def shelf_pack(sizes, side, pad):
    """Place rectangles on shelves, tallest first. Returns None if they overrun.

    Twenty-odd pieces do not need a skyline packer: sorting by height and
    starting a new shelf when the row fills wastes a few percent of the
    texture and is a dozen lines. What it must not do is silently overlap, so
    it reports failure and the caller grows the texture instead.
    """
    order = sorted(range(len(sizes)), key=lambda i: -sizes[i][1])
    spot = {}
    x = y = shelf = 0
    for i in order:
        w, h = sizes[i][0] + pad * 2, sizes[i][1] + pad * 2
        if w > side or h > side:
            return None
        if x + w > side:
            x, y, shelf = 0, y + shelf, 0
        if y + h > side:
            return None
        spot[i] = (x + pad, y + pad)
        x += w
        shelf = max(shelf, h)
    return spot


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("config", help="JSON with a 'pieces' list of {name, file}")
    ap.add_argument("-o", "--outdir", default="out/rig")
    ap.add_argument("-n", "--name", default="dahlia")
    ap.add_argument("--pad", type=int, default=2,
                    help="transparent gutter around each piece, against bleeding")
    ap.add_argument("--max-side", type=int, default=4096)
    args = ap.parse_args()

    cfg = json.load(open(args.config, encoding="utf-8"))
    root = os.path.dirname(os.path.abspath(args.config))
    pieces = []
    for entry in cfg["pieces"]:
        path = entry["file"]
        if not os.path.isabs(path):
            path = os.path.join(root, path) if not os.path.exists(path) else path
        pieces.append((entry["name"], trim(path)))

    sizes = [im.size for _, im in pieces]
    side = 256
    while side <= args.max_side:
        spot = shelf_pack(sizes, side, args.pad)
        if spot is not None:
            break
        side *= 2
    else:
        raise SystemExit("pieces do not fit in a 4096 texture; split the atlas")

    os.makedirs(args.outdir, exist_ok=True)
    sheet = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    for i, (_, im) in enumerate(pieces):
        sheet.paste(im, spot[i])
    png = f"{args.name}.png"
    sheet.save(os.path.join(args.outdir, png))

    lines = [png, "size: %d,%d" % (side, side), "format: RGBA8888",
             "filter: Linear,Linear", "repeat: none"]
    parts = {}
    for i, (name, im) in enumerate(pieces):
        x, y = spot[i]
        w, h = im.size
        lines += [name, "  rotate: false", f"  xy: {x}, {y}", f"  size: {w}, {h}",
                  f"  orig: {w}, {h}", "  offset: 0, 0", "  index: -1"]
        angle, length = long_axis(im)
        parts[name] = {"width": w, "height": h, "axis": round(angle, 2),
                       "length": round(length, 1)}
    with open(os.path.join(args.outdir, f"{args.name}.atlas"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines) + "\n")
    with open(os.path.join(args.outdir, f"{args.name}.parts.json"), "w", encoding="utf-8") as fh:
        json.dump(parts, fh, indent=1)

    # Spine's own JSON import resolves attachments against a folder of loose
    # images, not against the atlas — it packs its own on export. So the trims
    # are written out individually as well; it is the same pixels twice and it
    # is the difference between the import working and the editor showing
    # twenty-five missing-image boxes.
    imgdir = os.path.join(args.outdir, "images")
    os.makedirs(imgdir, exist_ok=True)
    for name, im in pieces:
        im.save(os.path.join(imgdir, f"{name}.png"))

    used = sum(w * h for w, h in sizes)
    print(f"{len(pieces)} pieces -> {side}x{side} atlas, "
          f"{used / (side * side) * 100:.0f}% of the texture in use")
    print(f"  {os.path.join(args.outdir, png)}")
    print(f"  {os.path.join(args.outdir, args.name + '.atlas')}")
    print(f"  {imgdir}/ ({len(pieces)} loose images, for Spine's JSON import)")


if __name__ == "__main__":
    main()
