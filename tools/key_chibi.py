#!/usr/bin/env python3
"""Turn a generated chibi into the transparent PNG the Ledger's slot needs.

Gemini cannot output an alpha channel -- not Nano Banana, not Nano Banana Pro,
not any of that family. Ask it for a transparent background and it paints one:
solid white, solid black, or a drawn-on checkerboard. So the prompt asks for a
flat chroma field instead and this removes it, which is the half that makes the
prompt actually produce a file you can use.

Three things beyond a plain colour swap, because a naive key looks keyed:

  * the edge is a RAMP, not a threshold -- one distance where the pixel is
    certainly background and a wider one where it is certainly not, and a
    smooth fall between, so the outline keeps its antialiasing instead of
    turning into a staircase at 56 pixels.
  * SPILL is suppressed. A green field bounces green onto every edge pixel;
    left alone that reads as a lime halo against the Ledger's dark panel,
    which is exactly where it shows worst.
  * the result is TRIMMED to what is actually drawn and re-padded square,
    because the slot is object-fit:cover and will happily zoom into the empty
    margin Gemini leaves around a subject.

Prints the data URI to paste into the connection's `chibi:` field, since that
field goes straight into <img src> and file:// will not fetch a sibling.

Grok Imagine can already hand back real alpha through its Background Removal
tool, so --alpha skips the keying and runs only the rest -- which is still most
of the value, because the trim, the square pad and the 56-pixel look are what
the slot actually needs and no image tool does them for you.
"""

import argparse
import base64
import io
import os
import sys

from PIL import Image

KEYS = {"green": (0, 255, 0), "magenta": (255, 0, 255), "blue": (0, 0, 255)}


def finish(out, args, w, h):
    box = out.getbbox()
    if not box:
        raise SystemExit("nothing left after keying")
    sub = out.crop(box)
    side = int(max(sub.size) / (1 - 2 * args.margin))
    sq = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    sq.alpha_composite(sub, ((side - sub.width) // 2, (side - sub.height) // 2))
    sq = sq.resize((args.size, args.size), Image.LANCZOS)
    print(f"  trim   {w}x{h} -> subject {sub.size[0]}x{sub.size[1]} -> {args.size}x{args.size}")

    dest = args.out or os.path.splitext(args.src)[0] + "_keyed.png"
    sq.save(dest, optimize=True)
    print(f"  wrote  {dest} ({os.path.getsize(dest) / 1e3:.1f} KB)")

    buf = io.BytesIO()
    sq.save(buf, "PNG", optimize=True)
    uri = "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()
    print(f"  uri    {len(uri) / 1e3:.1f} KB of text for the chibi: field")
    if args.uri:
        open(dest + ".txt", "w").write(uri)
        print(f"  wrote  {dest}.txt")
    else:
        print(f"         {uri[:78]}…  (pass --uri to write the whole thing to a file)")

    # A 56px look, because that is the only size that decides whether it worked.
    prev = sq.resize((56, 56), Image.LANCZOS)
    panel = Image.new("RGBA", (56, 56), (26, 23, 34, 255))
    panel.alpha_composite(prev)
    pv = os.path.splitext(dest)[0] + "_56.png"
    panel.resize((224, 224), Image.NEAREST).save(pv)
    print(f"  wrote  {pv} — this is the size it is judged at")
    return 0




def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("src", help="the PNG/JPEG Gemini gave you")
    ap.add_argument("-o", "--out", help="output PNG (default: <src>_keyed.png)")
    ap.add_argument("-k", "--key", default="green",
                    help="green, magenta, blue, or #rrggbb (default: green)")
    ap.add_argument("-s", "--size", type=int, default=512, help="output square (default 512)")
    ap.add_argument("--inner", type=int, default=90,
                    help="distance at or under which a pixel is certainly background")
    ap.add_argument("--outer", type=int, default=190,
                    help="distance at or over which a pixel is certainly the subject")
    ap.add_argument("--margin", type=float, default=.06,
                    help="fraction of the square left as breathing room (default .06)")
    ap.add_argument("--uri", action="store_true", help="also write <out>.txt holding the data URI")
    ap.add_argument("--checker", action="store_true",
                    help="the background is a PAINTED transparency checkerboard, or any "
                         "flat pale background, with no real alpha — remove it by flooding "
                         "in from the frame edge rather than by colour, so a white coat or "
                         "a pale prop inside the outline survives")
    ap.add_argument("--alpha", action="store_true",
                    help="the source already has a real alpha channel (Grok's Background "
                         "Removal, or anything else that writes one) — skip the key and "
                         "only trim, pad, resize and encode")
    args = ap.parse_args()

    if args.checker:
        # Flood in from the border over pale near-neutral pixels. Matching the
        # checker BY COLOUR would also delete a white lab coat, a bandage or a
        # pale prop; matching by CONNECTION to the frame edge cannot, because
        # the character's own outline encloses everything inside them. That is
        # the whole reason this is a fill and not a threshold.
        from collections import deque
        im = Image.open(args.src).convert("RGB")
        w, h = im.size
        px = im.load()
        pale = lambda c: (max(c) - min(c) < 16) and (sum(c) / 3 > 196)
        bg = [[False] * w for _ in range(h)]
        q = deque()
        for x in range(w):
            for y in (0, h - 1):
                if pale(px[x, y]) and not bg[y][x]:
                    bg[y][x] = True; q.append((y, x))
        for y in range(h):
            for x in (0, w - 1):
                if pale(px[x, y]) and not bg[y][x]:
                    bg[y][x] = True; q.append((y, x))
        if not q:
            raise SystemExit("no pale background touching the frame edge — --checker is "
                             "for a painted checkerboard or a flat pale field, and this "
                             "is neither. Key it by colour instead.")
        while q:
            y, x = q.popleft()
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = y + dy, x + dx
                if 0 <= ny < h and 0 <= nx < w and not bg[ny][nx] and pale(px[nx, ny]):
                    bg[ny][nx] = True; q.append((ny, nx))
        out = Image.new("RGBA", (w, h))
        op = out.load()
        kept = 0
        for y in range(h):
            row = bg[y]
            for x in range(w):
                if row[x]:
                    op[x, y] = (0, 0, 0, 0)
                else:
                    r, g, b = px[x, y]
                    op[x, y] = (r, g, b, 255)
                    kept += 1
        cov = kept / (w * h)
        print(f"  flood  removed the background, {cov:.1%} of the frame kept")
        if cov > .97:
            print("  note   almost nothing was removed — the background may not be pale, "
                  "or the character touches the frame edge and the fill could not get in.")
        return finish(out, args, w, h)

    if args.alpha:
        im = Image.open(args.src)
        if im.mode != "RGBA":
            raise SystemExit(f"--alpha was passed but {args.src} is mode {im.mode} with no "
                             "alpha channel. Either the export dropped the transparency "
                             "(JPEG cannot carry it at all), or it needs keying — drop "
                             "--alpha and pass the field colour instead.")
        out = im
        a = out.getchannel("A")
        cov = sum(a.histogram()[8:]) / (out.width * out.height)
        print(f"  alpha  {cov:.1%} of the frame is opaque")
        if cov > .985:
            raise SystemExit("the alpha channel is effectively solid — the background is "
                             "still painted on rather than removed. Run Background Removal "
                             "first, or key it: drop --alpha.")
        return finish(out, args, out.width, out.height)

    if args.key.startswith("#"):
        h = args.key.lstrip("#")
        key = tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))
    elif args.key in KEYS:
        key = KEYS[args.key]
    else:
        raise SystemExit(f"unknown key colour {args.key!r} — use green, magenta, blue or #rrggbb")
    if args.inner >= args.outer:
        raise SystemExit("--inner must be below --outer; they are the two ends of the edge ramp")

    im = Image.open(args.src).convert("RGB")
    w, h = im.size
    px = im.load()
    out = Image.new("RGBA", (w, h))
    op = out.load()
    kr, kg, kb = key
    span = args.outer - args.inner
    # which channel the field is strongest in, so spill is pulled off that one
    dom = max(range(3), key=lambda i: key[i])
    kept = 0
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            d = ((r - kr) ** 2 + (g - kg) ** 2 + (b - kb) ** 2) ** .5
            if d <= args.inner:
                op[x, y] = (0, 0, 0, 0)
                continue
            a = 255 if d >= args.outer else int(255 * (d - args.inner) / span)
            c = [r, g, b]
            if a < 255 or d < args.outer * 1.35:
                others = [c[i] for i in range(3) if i != dom]
                cap = sum(others) / 2
                if c[dom] > cap:
                    c[dom] = int(cap)
            op[x, y] = (c[0], c[1], c[2], a)
            kept += 1
    if not kept:
        raise SystemExit("everything keyed out — the field colour does not match --key, "
                         "or --inner is far too wide")
    cov = kept / (w * h)
    print(f"  kept   {cov:.1%} of the frame")
    if cov > .96:
        print("  note   almost nothing was removed. If the background is still there, "
              "Gemini probably ignored the chroma field — check the source image.")

    return finish(out, args, w, h)


if __name__ == "__main__":
    sys.exit(main())
