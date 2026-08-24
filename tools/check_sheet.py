#!/usr/bin/env python3
"""Score a raw sheet before building anything from it.

Every fault this project has hit was found by measuring, usually after a clip
was already built. This runs the same measurements on the sheet itself, so a
bad sheet is caught in ten seconds rather than after a slice, a merge, a build
and a look.

It is also how to choose a generator. Point it at the same prompt's output from
two of them and the numbers say which one to keep -- the joins and the evenness
are what make the difference between a clip that loops and one that lurches,
and neither is visible by eye on a contact sheet.
"""

import argparse
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def cells(sheet, rows, cols):
    """Cut the sheet on a grid and trim each cell to its own content."""
    w, h = sheet.size
    out = []
    for r in range(rows):
        for c in range(cols):
            box = (c * w // cols, r * h // rows, (c + 1) * w // cols, (r + 1) * h // rows)
            cell = sheet.crop(box)
            a = np.asarray(cell)[:, :, 3]
            if (a > 8).sum() < 200:
                out.append(None)
                continue
            ys, xs = np.nonzero(a > 8)
            out.append(cell.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)))
    return out


def solid_box(al, keep=0.99):
    """The box holding `keep` of the alpha WEIGHT, not the box holding every pixel.

    Normalising a drawing on its raw bounding box is what made three separate
    measurements on this project wrong. A smoke plume, a stray cinder or a
    single dot of spray sets the box, the drawing inside it is then squashed by
    a different amount than its neighbour, and two identical poses score as
    completely different. Weighting by alpha and discarding the faint 1% at
    each edge ignores exactly the things that were setting it.
    """
    rows, colw = al.sum(axis=1), al.sum(axis=0)

    def span(v):
        c = np.cumsum(v.astype(np.float64))
        if c[-1] <= 0:
            return 0, len(v)
        lo = int(np.searchsorted(c, c[-1] * (1 - keep) / 2))
        hi = int(np.searchsorted(c, c[-1] * (1 - (1 - keep) / 2)))
        return lo, max(lo + 1, hi + 1)

    y0, y1 = span(rows)
    x0, x1 = span(colw)
    return x0, y0, x1, y1


def shape(im, size=(160, 200), thr=8):
    al = np.asarray(im)[:, :, 3]
    a = al > thr
    if not a.any():
        return np.zeros(size[::-1], bool)
    x0, y0, x1, y1 = solid_box(al)
    a = a[y0:y1, x0:x1]
    if not a.any():
        return np.zeros(size[::-1], bool)
    return np.asarray(Image.fromarray((a * 255).astype(np.uint8)).resize(size, Image.BILINEAR)) > 127


def shape_diff(a, b):
    return 100.0 * (a ^ b).sum() / max(1, (a | b).sum())


def colour_diff(p, q, size=(260, 320), level=24):
    """What FRACTION of the drawing changed, not by how much on average.

    A mean over the whole frame is the wrong tool for a localised change: the
    ash loop's embers swing from 941 lit pixels to 86, which anyone can see,
    and it moves a whole-frame mean by 1.3 -- indistinguishable from a
    duplicate. The percentage of pixels that actually moved says 'something
    happened here' whether it happened everywhere or in one corner.
    """
    A = np.asarray(p.resize(size, Image.BILINEAR)).astype(np.int16)
    B = np.asarray(q.resize(size, Image.BILINEAR)).astype(np.int16)
    moved = (np.abs(A - B).max(axis=2) > level)
    return 100.0 * moved.mean()


def body(im):
    """Her, with fire and blade-teal masked out -- the same rule the packer uses."""
    a = np.asarray(im)
    rgb, al = a[:, :, :3].astype(np.int16), a[:, :, 3]
    fire = (rgb[:, :, 0] > 170) & (rgb[:, :, 1] > 60) & (rgb[:, :, 2] < 120)
    teal = (rgb[:, :, 1] > rgb[:, :, 0] + 30) & (rgb[:, :, 2] > rgb[:, :, 0] + 20)
    m = (al > 32) & ~fire & ~teal
    return m if m.any() else (al > 32)


def report(path, rows, cols, loops):
    sheet = Image.open(path).convert("RGBA")
    a = np.asarray(sheet)
    name = os.path.basename(path)
    print(f"\n{name}   {sheet.width}x{sheet.height}")
    print("-" * (len(name) + 24))
    fatal, warn = [], []

    # --- the one that stops everything -----------------------------------
    al = a[:, :, 3]
    if al.min() == 255:
        fatal.append("NO ALPHA -- the sheet is fully opaque. --keyed cannot be used "
                     "and the background has to be keyed out by colour instead, "
                     "which loses her soft edges.")
    else:
        soft = int(((al > 8) & (al < 248)).sum())
        print(f"  alpha        real, {len(np.unique(al))} levels, {soft:,} soft-edge px")

    if sheet.width < 2000:
        warn.append(f"low resolution ({sheet.width}px wide) -- every sheet that "
                    f"worked here was 3200-4000px")

    # --- does it cut into the right number of drawings? -------------------
    cs = cells(sheet, rows, cols)
    n = sum(c is not None for c in cs)
    print(f"  drawings     {n} of {rows * cols} cells have content")
    if n != rows * cols:
        fatal.append(f"{rows * cols - n} empty cell(s) -- the grid is not full")
    if any(c is None for c in cs):
        return fatal, warn
    # Spilling is content CUT OFF at a cell edge, not content of varying height.
    # She is 447px tall standing and 196px lying down in the same clip, and that
    # is the animation rather than a fault.
    spill = []
    W, H = sheet.size
    for i in range(rows * cols):
        r, c = divmod(i, cols)
        box = (c * W // cols, r * H // rows, (c + 1) * W // cols, (r + 1) * H // rows)
        m = np.asarray(sheet.crop(box))[:, :, 3] > 24
        edges = [m[0].mean(), m[-1].mean(), m[:, 0].mean(), m[:, -1].mean()]
        if max(edges) > 0.04:
            spill.append(i + 1)
    if spill:
        warn.append(f"drawing(s) {', '.join(map(str, spill))} touch the edge of their "
                    f"grid cell -- something is cut off, or two poses share a cell")

    # --- how evenly is the movement sampled? ------------------------------
    sh = [shape(c) for c in cs]
    steps = [shape_diff(sh[i], sh[i + 1]) for i in range(len(sh) - 1)]
    rgbs = [colour_diff(cs[i], cs[i + 1]) for i in range(len(cs) - 1)]
    ev = max(steps) / max(0.01, min(steps))
    print(f"  shape steps  " + " ".join(f"{x:3.0f}" for x in steps) +
          f"   evenness {ev:.1f}x")
    print(f"  colour steps " + " ".join(f"{x:4.1f}" for x in rgbs) +
          "   (% of the drawing that moved)")
    if max(steps) < 12 and max(rgbs) > 2:
        print("               (shape barely moves -- judge this sheet on colour)")
    elif ev > 3.0:
        warn.append(f"step evenness {ev:.1f}x -- the rule is no step more than twice "
                    f"the smallest. Biggest {max(steps):.0f}, smallest {min(steps):.0f}")

    # --- drawings that are not doing any work -----------------------------
    dead = [i + 1 for i, (s, r) in enumerate(zip(steps, rgbs)) if s < 10 and r < 1.5]
    if dead:
        warn.append(f"drawing(s) {', '.join(str(d + 1) for d in dead)} are near-copies "
                    f"of the one before -- wasted, unless a hold is intended there")

    # --- the loop ---------------------------------------------------------
    if loops:
        wrap_s = shape_diff(sh[-1], sh[0])
        wrap_c = colour_diff(cs[-1], cs[0])
        verdict = ("exact -- drop the last drawing and let it wrap"
                   if wrap_s < 4 and wrap_c < 1 else
                   "a real copy" if wrap_s < 35 else
                   "NOT A COPY -- it drew a return-to-start instead of repeating "
                   "the start, and the seam will show")
        print(f"  loop wrap    shape {wrap_s:.1f}, colour {wrap_c:.1f}  -- {verdict}")
        if wrap_s >= 35:
            warn.append("the loop does not close")

    # --- is she the same size on every drawing? ---------------------------
    # Drawings that are almost entirely EFFECT are excluded. The soul attack's
    # last drawing is her shape in cinders with no character in it, and asking
    # how big she is drawn there measures a cloud.
    pairs = []
    for c in cs:
        b_, al_ = body(c).sum(), (np.asarray(c)[:, :, 3] > 32).sum()
        if al_ and b_ / al_ > 0.45:
            pairs.append(float(np.sqrt(b_)))
    if len(pairs) < 3:
        pairs = [float(np.sqrt(body(c).sum())) for c in cs]
    areas = pairs
    drift = max(areas) / min(areas)
    if len(pairs) < len(cs):
        print(f"               ({len(cs) - len(pairs)} drawing(s) excluded as mostly effect)")
    print(f"  scale drift  {drift:.2f}x across the sheet")
    if drift > 1.25:
        warn.append(f"scale drift {drift:.2f}x -- she is drawn noticeably bigger on "
                    f"some drawings than others")

    # --- the two faults that only show on a black panel -------------------
    ins = al > 200
    lum = 0.2126 * a[:, :, 0] + 0.7152 * a[:, :, 1] + 0.0722 * a[:, :, 2]
    black = 100.0 * (ins & (lum < 20)).sum() / max(1, ins.sum())
    print(f"  near-black   {black:.1f}% of her is below luminance 20")
    if black > 18:
        warn.append(f"{black:.0f}% of her is near-black -- that much vanishes into a "
                    f"black panel. Ask for the darks LIGHTER, not just bluer")

    return fatal, warn


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("sheets", nargs="+")
    ap.add_argument("--rows", type=int, default=2)
    ap.add_argument("--cols", type=int, default=4)
    ap.add_argument("--loops", action="store_true",
                    help="this sheet is a loop, so check that the last drawing "
                         "matches the first")
    args = ap.parse_args()

    worst = 0
    for p in args.sheets:
        fatal, warn = report(p, args.rows, args.cols, args.loops)
        for f in fatal:
            print(f"  FATAL  {f}")
        for w in warn:
            print(f"  warn   {w}")
        if fatal:
            print("  -> do not build from this sheet")
            worst = max(worst, 2)
        elif warn:
            print("  -> usable, with the faults above")
            worst = max(worst, 1)
        else:
            print("  -> clean")
    return worst


if __name__ == "__main__":
    sys.exit(0 if main() < 2 else 1)
