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

from collections import Counter, deque

from PIL import Image, ImageChops

KEYS = {"green": (0, 255, 0), "magenta": (255, 0, 255), "blue": (0, 0, 255)}


def _flood_cv(path, tol):
    """Flood in from every edge pixel, each seed judged against ITS OWN colour.

    The single-reference version could only clear one background. A split frame
    -- one character on pink, another on purple, down the middle -- kept
    whichever half was not sampled. Seeding per pixel with a fixed range fixes
    that for free, and handles a painted checkerboard the same way, since the
    light and dark squares each get seeded rather than one having to reach the
    other. It is also perhaps a hundred times faster than the pure-Python fill.
    """
    import cv2
    import numpy as np
    bgr = cv2.imread(path, cv2.IMREAD_COLOR)
    if bgr is None:
        raise SystemExit(f"could not read {path}")
    h, w = bgr.shape[:2]
    mask = np.zeros((h + 2, w + 2), np.uint8)
    t = int(round(tol))
    step = max(1, min(w, h) // 256)
    seeds = ([(x, 0) for x in range(0, w, step)] + [(x, h - 1) for x in range(0, w, step)] +
             [(0, y) for y in range(0, h, step)] + [(w - 1, y) for y in range(0, h, step)])
    work = bgr.copy()
    for (x, y) in seeds:
        if mask[y + 1, x + 1]:
            continue
        cv2.floodFill(work, mask, (x, y), (0, 0, 0), (t,) * 3, (t,) * 3,
                      4 | cv2.FLOODFILL_FIXED_RANGE | cv2.FLOODFILL_MASK_ONLY | (255 << 8))
    bg = mask[1:-1, 1:-1] == 255
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
    out = Image.fromarray(np.dstack([rgb, np.where(bg, 0, 255).astype(np.uint8)]), "RGBA")
    return out, int((~bg).sum())


def _flood(im, px, w, h, is_bg):
    """Background is what the frame EDGE can reach, not what matches a colour.

    That distinction is the whole point. A character with green hair on a green
    field keeps her hair, because her own outline encloses it and the fill
    cannot get inside; a global colour key would punch holes straight through
    it. Same reason a white lab coat survives a white checkerboard.
    """
    bg = [[False] * w for _ in range(h)]
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if is_bg(px[x, y]) and not bg[y][x]:
                bg[y][x] = True; q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if is_bg(px[x, y]) and not bg[y][x]:
                bg[y][x] = True; q.append((y, x))
    if not q:
        raise SystemExit("no background touching the frame edge matched — check the "
                         "colour, or raise the tolerance")
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not bg[ny][nx] and is_bg(px[nx, ny]):
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
    return out, kept


def _disc(r):
    """Offsets on a filled circle of radius r -- a round pen, so the cut edge
    is round too. Cheap enough: r is a handful of pixels."""
    return [(dx, dy) for dy in range(-r, r + 1) for dx in range(-r, r + 1)
            if dx * dx + dy * dy <= r * r]


def finish(out, args, w, h):
    if args.shrink > 0:
        import cv2
        import numpy as np
        k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE,
                                      (2 * args.shrink + 1,) * 2)
        arr = np.array(out)
        arr[..., 3] = cv2.erode(arr[..., 3], k)
        out = Image.fromarray(arr, "RGBA")
        print(f"  shrink {args.shrink}px off the matte")

    if args.keep > 0:
        import cv2
        import numpy as np
        a = np.array(out.getchannel("A"))
        n, lab, stats, _ = cv2.connectedComponentsWithStats((a > 96).astype(np.uint8), 8)
        order = sorted(range(1, n), key=lambda i: stats[i, cv2.CC_STAT_AREA], reverse=True)
        keep = set(order[:args.keep])
        dropped = len(order) - len(keep)
        if dropped:
            m = np.isin(lab, list(keep))
            arr = np.array(out)
            arr[..., 3] = np.where(m, arr[..., 3], 0)
            out = Image.fromarray(arr, "RGBA")
            print(f"  keep   {len(keep)} largest piece(s), dropped {dropped}")

    box = out.getbbox()
    if not box:
        raise SystemExit("nothing left after keying")
    sub = out.crop(box)

    # The die-cut band, drawn at full resolution before the downscale so its
    # edge stays smooth. Dilating the alpha by hand rather than with a filter:
    # MaxFilter is a square kernel and would put corners on a round silhouette,
    # which is exactly what a cut edge must not have.
    if args.rim > 0:
        r = max(1, int(round(args.rim / 100 * max(sub.size) / (1 - 2 * args.margin))))
        pad = r + 2
        big = Image.new("RGBA", (sub.width + pad * 2, sub.height + pad * 2), (0, 0, 0, 0))
        big.alpha_composite(sub, (pad, pad))
        al = big.getchannel("A").point(lambda v: 255 if v > 96 else 0)
        grown = al.copy()
        for dx, dy in _disc(r):
            grown.paste(ImageChops.lighter(grown, ImageChops.offset(al, dx, dy)), (0, 0))
        band = ImageChops.subtract(grown, al)
        hexs = args.rim_color.lstrip("#")
        col = tuple(int(hexs[i:i + 2], 16) for i in (0, 2, 4))
        rim = Image.new("RGBA", big.size, col + (0,))
        rim.putalpha(band)
        sub = Image.alpha_composite(rim, big)
        sub = sub.crop(sub.getbbox())
        print(f"  rim    {r}px die-cut border in {args.rim_color}")

    side = int(max(sub.size) / (1 - 2 * args.margin))
    sq = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    sq.alpha_composite(sub, ((side - sub.width) // 2, (side - sub.height) // 2))
    sq = sq.resize((args.size, args.size), Image.LANCZOS)
    print(f"  trim   {w}x{h} -> subject {sub.size[0]}x{sub.size[1]} -> {args.size}x{args.size}")

    webp = args.webp is not None
    ext = ".webp" if webp else ".png"
    dest = args.out or os.path.splitext(args.src)[0] + "_keyed" + ext
    if webp and not dest.endswith(".webp"):
        dest = os.path.splitext(dest)[0] + ".webp"
    save = ({"quality": args.webp, "method": 6} if webp else {"optimize": True})
    fmt = "WEBP" if webp else "PNG"
    sq.save(dest, fmt, **save)
    print(f"  wrote  {dest} ({os.path.getsize(dest) / 1e3:.1f} KB)")

    buf = io.BytesIO()
    sq.save(buf, fmt, **save)
    uri = ("data:image/webp;base64," if webp else "data:image/png;base64,") + \
        base64.b64encode(buf.getvalue()).decode()
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
    ap.add_argument("--webp", nargs="?", type=int, const=88, metavar="Q",
                    help="write WebP at this quality instead of PNG (default 88). "
                         "Sixty-six PNGs at 512 is 19 MB of base64 in a file that is "
                         "already 6 MB; the same set at 256/q88 is 1.3 MB, and the "
                         "biggest place it is ever shown is 76 pixels across")
    ap.add_argument("--inner", type=int, default=90,
                    help="distance at or under which a pixel is certainly background")
    ap.add_argument("--outer", type=int, default=190,
                    help="distance at or over which a pixel is certainly the subject")
    ap.add_argument("--margin", type=float, default=.06,
                    help="fraction of the square left as breathing room (default .06)")
    ap.add_argument("--uri", action="store_true", help="also write <out>.txt holding the data URI")
    ap.add_argument("--shrink", type=int, default=0, metavar="PX",
                    help="erode the kept area by this many pixels before anything else. "
                         "Two is usually enough to sever a one-pixel seam -- the orphan "
                         "column left between two background colours that is a shade too "
                         "far from either for its fill to claim it. At source resolution "
                         "it costs nothing visible once the image is scaled to 256")
    ap.add_argument("--keep", type=int, default=0, metavar="N",
                    help="after keying, keep only the N largest connected pieces. Use it "
                         "when the background leaves a stray: a frame split down the "
                         "middle into two colours keeps the seam, because neither fill "
                         "can cross it. --keep 2 for a pair, 1 for one figure")
    ap.add_argument("--rim", type=float, default=0, metavar="PCT",
                    help="draw a white die-cut sticker border of this width, as a "
                         "percentage of the output square (1.2 is a good default). "
                         "Done here rather than asked for in the prompt: image models "
                         "keep drawing that border in black, and drawn here it is exact, "
                         "even, and identical on all 66 portraits")
    ap.add_argument("--rim-color", default="#ffffff", metavar="HEX",
                    help="colour of the die-cut border (default white)")
    ap.add_argument("--flood", nargs="?", const="auto", metavar="HEX",
                    help="remove a FLAT background by flooding in from the frame edge, "
                         "matching a colour rather than requiring it to be pale. Give a "
                         "hex, or omit the value to take the commonest border colour. "
                         "This is the safe choice whenever the character shares a colour "
                         "with the background -- green hair on a green field survives, "
                         "because the outline encloses it and the fill cannot get in, "
                         "where a global colour key would punch holes straight through it")
    ap.add_argument("--flood-tol", type=float, default=42, metavar="D",
                    help="how far from the background colour still counts as background "
                         "(default 42; raise it for JPEG, whose flat fields are not flat)")
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

    if args.flood:
        im = Image.open(args.src).convert("RGB")
        w, h = im.size
        px = im.load()
        if args.flood == "auto":
            try:
                out, kept = _flood_cv(args.src, args.flood_tol)
                cov = kept / (w * h)
                print(f"  flood  per-seed fill from the frame edge, "
                      f"{cov:.1%} of the frame kept")
                if cov > .97:
                    print("  note   almost nothing was removed — raise --flood-tol, or "
                          "the character may be touching the frame edge.")
                return finish(out, args, w, h)
            except ImportError:
                pass
            edge = ([px[x, 0] for x in range(w)] + [px[x, h - 1] for x in range(w)] +
                    [px[0, y] for y in range(h)] + [px[w - 1, y] for y in range(h)])
            ref = Counter(edge).most_common(1)[0][0]
            print(f"  flood  background sampled from the border: "
                  f"#{ref[0]:02x}{ref[1]:02x}{ref[2]:02x}")
        else:
            hx = args.flood.lstrip("#")
            ref = tuple(int(hx[i:i + 2], 16) for i in (0, 2, 4))
        tol = args.flood_tol
        near = lambda c: ((c[0] - ref[0]) ** 2 + (c[1] - ref[1]) ** 2 +
                          (c[2] - ref[2]) ** 2) ** .5 <= tol
        out, kept = _flood(im, px, w, h, near)
        cov = kept / (w * h)
        print(f"  flood  removed the background, {cov:.1%} of the frame kept")
        if cov > .97:
            print("  note   almost nothing was removed — raise --flood-tol, or the "
                  "character may be touching the frame edge.")
        return finish(out, args, w, h)

    if args.checker:
        # Flood in from the border over pale near-neutral pixels. Matching the
        # checker BY COLOUR would also delete a white lab coat, a bandage or a
        # pale prop; matching by CONNECTION to the frame edge cannot, because
        # the character's own outline encloses everything inside them. That is
        # the whole reason this is a fill and not a threshold.
        im = Image.open(args.src).convert("RGB")
        w, h = im.size
        px = im.load()
        pale = lambda c: (max(c) - min(c) < 16) and (sum(c) / 3 > 196)
        out, kept = _flood(im, px, w, h, pale)
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
