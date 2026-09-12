#!/usr/bin/env python3
"""Two portraits into one card, for the connections that are two people.

The Ledger files some connections as a pair -- "Betanexus and Dotframe", "Riv
and Rev", "Dau-Lu and Chi-Mika" -- one entry with one portrait slot. Two
figures drawn side by side in a 56-pixel card is two smudges, so this overlaps
them instead: one in front and one stepped back, the way a duo reads on a game
roster. At 56px you get the SHAPE of two people; at the 76px detail view and
above you can tell which two.

The back figure is scaled down and offset up, which is what carries the depth
-- side by side at equal size just reads as a crowd. Their white die-cut rims
do the separating, so run key_chibi.py with --rim on each one first.
"""

import argparse
import os
import sys

from PIL import Image


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("front", help="the portrait that reads first, drawn nearest")
    ap.add_argument("back", help="the portrait stepped behind it")
    ap.add_argument("-o", "--out", required=True)
    ap.add_argument("-s", "--size", type=int, default=256)
    ap.add_argument("--back-scale", type=float, default=.80,
                    help="how much smaller the back figure is (default .80)")
    ap.add_argument("--overlap", type=float, default=.26,
                    help="fraction of width the two share (default .26)")
    ap.add_argument("--webp", nargs="?", type=int, const=88, metavar="Q")
    args = ap.parse_args()

    S = args.size
    fr = Image.open(args.front).convert("RGBA")
    bk = Image.open(args.back).convert("RGBA")
    fr = fr.crop(fr.getbbox()); bk = bk.crop(bk.getbbox())

    # Both are sized off the CARD, not off each other, so a tall portrait and a
    # wide one still end up looking like two people the same distance away.
    def fit(im, h):
        w = max(1, round(im.width * h / im.height))
        return im.resize((w, round(h)), Image.LANCZOS)

    fh = S * .92
    fr = fit(fr, fh)
    bk = fit(bk, fh * args.back_scale)

    total = fr.width + bk.width
    share = round(total * args.overlap)
    span = total - share
    x0 = round((S - span) / 2)

    out = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    # back first, offset up so its feet sit behind the front figure's shoulder
    out.alpha_composite(bk, (max(0, x0 + fr.width - share),
                             max(0, round(S - bk.height - S * .10))))
    out.alpha_composite(fr, (max(0, x0), max(0, round(S - fr.height - S * .02))))

    box = out.getbbox()
    if box:
        sub = out.crop(box)
        side = round(max(sub.size) / .94)
        sq = Image.new("RGBA", (side, side), (0, 0, 0, 0))
        sq.alpha_composite(sub, ((side - sub.width) // 2, (side - sub.height) // 2))
        out = sq.resize((S, S), Image.LANCZOS)

    webp = args.webp is not None
    kw = {"quality": args.webp, "method": 6} if webp else {"optimize": True}
    out.save(args.out, "WEBP" if webp else "PNG", **kw)
    print(f"  paired {os.path.basename(args.front)} + {os.path.basename(args.back)}"
          f" -> {args.out} ({os.path.getsize(args.out) / 1e3:.1f} KB)")

    prev = out.resize((56, 56), Image.LANCZOS)
    panel = Image.new("RGBA", (56, 56), (26, 23, 34, 255))
    panel.alpha_composite(prev)
    pv = os.path.splitext(args.out)[0] + "_56.png"
    panel.resize((224, 224), Image.NEAREST).save(pv)
    print(f"  wrote  {pv}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
