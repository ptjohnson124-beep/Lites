#!/usr/bin/env python3
"""Recover a real alpha channel from the same drawing on white and on black.

Some generators cannot output transparency at all -- they render a solid
backdrop however you ask. Keying that backdrop out guesses at the edges and
throws away every soft pixel: her aura, the blur on a fast drawing, the
antialiasing on every strand of hair.

Two renders recover it exactly instead, with no guessing anywhere:

    over black   Cb = C*a
    over white   Cw = C*a + (1-a)
    subtract     Cw - Cb = 1-a        ->  a = 1 - (Cw - Cb)
    and then     C = Cb / a

That is an identity, not an estimate. A pixel 30% covered by the end of a
hair comes back at exactly 30%, and the colour underneath comes back with the
backdrop divided out rather than blended in.

The whole thing depends on the two images being the SAME DRAWING, so the
alignment is measured and reported rather than assumed. If the generator
redrew her instead of repainting the backdrop, the numbers here say so before
anything is built.
"""

import argparse
import sys

import numpy as np
from PIL import Image


def load(path):
    im = Image.open(path).convert("RGB")
    return np.asarray(im).astype(np.float32) / 255.0


def drift(a, b):
    """How far apart the two renders are, in the places that are opaque in both.

    Measured on the DARK half of each image, because a subject that did not
    move leaves the same dark ink in the same places whatever is behind it.
    """
    la = a.mean(axis=2)
    lb = b.mean(axis=2)
    ink = (la < 0.45) & (lb < 0.45)
    if ink.sum() < 500:
        return None, 0
    return float(np.abs(la[ink] - lb[ink]).mean()), int(ink.sum())


def matte(white, black, floor=0.004):
    # 1 - a, averaged over the channels: the backdrop contributes equally to
    # all three, so averaging cancels most of the encoder's noise.
    lift = np.clip(white - black, 0.0, 1.0).mean(axis=2)
    a = np.clip(1.0 - lift, 0.0, 1.0)

    # Divide the backdrop back out. Below the floor there is no colour left to
    # recover -- the pixel is transparent and its RGB is meaningless.
    safe = np.maximum(a, floor)[:, :, None]
    rgb = np.clip(black / safe, 0.0, 1.0)
    rgb[a < floor] = 0.0
    return rgb, a


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--from-black", action="store_true",
                    help="ONE render on pure black instead of a pair. Only sound when "
                         "nothing on the subject is itself near-black -- check that "
                         "first, because anything darker than the ramp is punched out. "
                         "Recovers the colour by dividing the backdrop out, so edge "
                         "pixels come back at full strength instead of darkened")
    ap.add_argument("--lo", type=float, default=6.0,
                    help="--from-black: luminance that counts as fully transparent")
    ap.add_argument("--hi", type=float, default=26.0,
                    help="--from-black: luminance that counts as fully opaque")
    ap.add_argument("white", help="the sheet rendered on pure white")
    ap.add_argument("black", nargs="?", help="the same sheet rendered on pure black")
    ap.add_argument("-o", "--out", required=True)
    ap.add_argument("--max-drift", type=float, default=0.02,
                    help="refuse the pair if the ink moved more than this")
    args = ap.parse_args()

    if args.from_black:
        b = load(args.white)          # the single render, which is the black one
        lum = (0.2126 * b[:, :, 0] + 0.7152 * b[:, :, 1] + 0.0722 * b[:, :, 2]) * 255.0
        t = np.clip((lum - args.lo) / max(1e-6, args.hi - args.lo), 0.0, 1.0)
        a = t * t * (3 - 2 * t)       # smoothstep, so the edge ramps rather than steps
        dark = 100.0 * (a[a > 0.5].size and (lum[a > 0.5] < args.hi).mean() or 0)
        print(f"  keyed        {int((a > 0.5).sum()):,} solid px, "
              f"{int(((a > 0.02) & (a < 0.98)).sum()):,} soft-edge px")
        if dark > 2:
            print(f"  warn   {dark:.1f}% of what was kept sits inside the ramp -- parts "
                  f"of the subject are as dark as the backdrop and will be eaten")
        rgb = np.clip(b / np.maximum(a, 0.004)[:, :, None], 0.0, 1.0)
        rgb[a < 0.004] = 0.0
        out = np.dstack([(rgb * 255).round().astype(np.uint8),
                         (a * 255).round().astype(np.uint8)])
        Image.fromarray(out, "RGBA").save(args.out)
        print(f"  -> {args.out}")
        return 0

    if not args.black:
        raise SystemExit("give both renders, or pass --from-black with just the one")
    w, b = load(args.white), load(args.black)
    if w.shape != b.shape:
        raise SystemExit(f"the two renders are different sizes: "
                         f"{w.shape[1]}x{w.shape[0]} and {b.shape[1]}x{b.shape[0]}")

    d, n = drift(w, b)
    if d is None:
        raise SystemExit("cannot compare the two renders -- almost nothing is dark "
                         "in both. Check that one really is on white and one on black.")
    print(f"  alignment    {d:.4f} mean ink difference over {n:,} px")
    if d > args.max_drift:
        print(f"  FATAL  the two renders are not the same drawing (drift {d:.4f} > "
              f"{args.max_drift}). It redrew her instead of repainting the backdrop, "
              f"so the matte would be nonsense. Regenerate the black one by EDITING "
              f"the white one, changing nothing but the background.")
        return 2

    rgb, a = matte(w, b)
    soft = int(((a > 0.02) & (a < 0.98)).sum())
    print(f"  recovered    {int((a > 0.5).sum()):,} solid px, {soft:,} soft-edge px, "
          f"{len(np.unique((a * 255).astype(np.uint8)))} alpha levels")
    if soft < 0.02 * (a > 0.5).sum():
        print("  warn   almost no soft edges came back -- the renders may have been "
              "saved as JPEG, which destroys exactly the pixels this needs")

    out = np.dstack([(rgb * 255).round().astype(np.uint8),
                     (a * 255).round().astype(np.uint8)])
    Image.fromarray(out, "RGBA").save(args.out)
    print(f"  -> {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
