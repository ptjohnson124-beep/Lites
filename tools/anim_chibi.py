#!/usr/bin/env python3
"""Turn a video of a chibi into the animated WebP the Ledger's slot can play.

The `chibi` field goes straight into an <img>, and browsers animate WebP there,
so a portrait can move. Everything the still pipeline does still has to happen
-- background removed, trimmed, squared, die-cut rim, 256px -- only now once per
frame, and with one constraint the stills never had:

  THE CROP IS SHARED. Trimming each frame to its own bounding box makes the
  character breathe and drift, because a raised hand on frame 40 changes what
  "the subject" is. The box is measured across every frame at once and applied
  to all of them, so the figure sits still and only the drawing moves.

Background removal is the same flood-in-from-the-edge as key_chibi.py and for
the same reason -- a white lab coat inside the outline survives where a colour
key would take it -- but run through cv2.floodFill, because a Python BFS over a
hundred and forty-five frames is not a thing anyone should wait for.

Frames are dropped to a target rate rather than kept all: at 56 pixels nobody
can see 24fps, and 145 frames of WebP is megabytes for one portrait.
"""

import argparse
import io
import os
import sys

import cv2
import numpy as np
from PIL import Image


def frames_of(path, stride):
    cap = cv2.VideoCapture(path)
    if not cap.isOpened():
        raise SystemExit(f"could not open {path}")
    fps = cap.get(cv2.CAP_PROP_FPS) or 24.0
    out, i = [], 0
    while True:
        ok, f = cap.read()
        if not ok:
            break
        if i % stride == 0:
            out.append(cv2.cvtColor(f, cv2.COLOR_BGR2RGB))
        i += 1
    cap.release()
    return out, fps


def alpha_of(rgb, pale_only, tol):
    """Background is what the frame EDGE reaches, never what merely matches a
    colour -- the rule the whole pipeline runs on."""
    h, w, _ = rgb.shape
    if pale_only:
        seed_ok = ((rgb.max(2).astype(int) - rgb.min(2).astype(int) < 16) &
                   (rgb.mean(2) > 196))
    else:
        ref = rgb[0, 0].astype(int)
        seed_ok = np.sqrt(((rgb.astype(int) - ref) ** 2).sum(2)) <= tol
    # floodFill needs a mask 2px larger, and only fills where mask is 0
    mask = np.zeros((h + 2, w + 2), np.uint8)
    mask[1:-1, 1:-1] = (~seed_ok).astype(np.uint8)
    work = rgb.copy()
    filled = np.zeros((h, w), bool)
    for (y, x) in ([(0, c) for c in range(0, w, 8)] + [(h - 1, c) for c in range(0, w, 8)] +
                   [(r, 0) for r in range(0, h, 8)] + [(r, w - 1) for r in range(0, h, 8)]):
        if mask[y + 1, x + 1]:
            continue
        cv2.floodFill(work, mask, (x, y), (0, 0, 0), (tol,) * 3, (tol,) * 3,
                      4 | cv2.FLOODFILL_FIXED_RANGE | (255 << 8))
    filled = mask[1:-1, 1:-1] == 255
    a = np.where(filled, 0, 255).astype(np.uint8)
    return a


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("video")
    ap.add_argument("-o", "--out", required=True)
    ap.add_argument("-s", "--size", type=int, default=256)
    ap.add_argument("--fps", type=float, default=12, help="target frame rate (default 12)")
    ap.add_argument("-q", "--quality", type=int, default=70)
    ap.add_argument("--tol", type=float, default=42)
    ap.add_argument("--colour-bg", action="store_true",
                    help="the background is a flat colour rather than a pale "
                         "transparency checkerboard")
    ap.add_argument("--rim", type=float, default=1.4, metavar="PCT")
    ap.add_argument("--margin", type=float, default=.05)
    ap.add_argument("--pingpong", action="store_true",
                    help="play forward then backward, so the loop has no seam. Worth it "
                         "when the clip is a one-way performance rather than a cycle -- "
                         "this one opens its hands and ends with them clasped, and a "
                         "straight loop snaps back. Costs roughly double the frames.")
    args = ap.parse_args()

    cap = cv2.VideoCapture(args.video)
    src_fps = cap.get(cv2.CAP_PROP_FPS) or 24.0
    cap.release()
    stride = max(1, int(round(src_fps / args.fps)))
    fr, _ = frames_of(args.video, stride)
    if not fr:
        raise SystemExit("no frames decoded")
    print(f"  decoded {len(fr)} frames (every {stride} of {src_fps:.0f}fps -> "
          f"{src_fps / stride:.1f}fps)")

    alphas = [alpha_of(f, not args.colour_bg, args.tol) for f in fr]
    kept = np.mean([(a > 128).mean() for a in alphas])
    print(f"  background removed, {kept:.1%} of the frame kept on average")
    if kept > .95:
        print("  note   almost nothing was removed — check --tol, or pass --colour-bg")

    # ONE box for every frame, so the figure does not drift or breathe
    union = np.zeros_like(alphas[0], bool)
    for a in alphas:
        union |= a > 40
    ys, xs = np.where(union)
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    print(f"  shared crop {x1 - x0 + 1}x{y1 - y0 + 1} across all frames")

    S = args.size
    r = max(1, int(round(args.rim / 100 * S))) if args.rim > 0 else 0
    kern = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1)) if r else None

    out = []
    for f, a in zip(fr, alphas):
        sub = f[y0:y1 + 1, x0:x1 + 1]
        sa = a[y0:y1 + 1, x0:x1 + 1]
        side = int(max(sub.shape[:2]) / (1 - 2 * args.margin))
        can = np.zeros((side, side, 4), np.uint8)
        oy, ox = (side - sub.shape[0]) // 2, (side - sub.shape[1]) // 2
        can[oy:oy + sub.shape[0], ox:ox + sub.shape[1], :3] = sub
        can[oy:oy + sub.shape[0], ox:ox + sub.shape[1], 3] = sa
        im = Image.fromarray(can, "RGBA").resize((S, S), Image.LANCZOS)
        if r:
            al = np.array(im.getchannel("A"))
            hard = (al > 96).astype(np.uint8) * 255
            grown = cv2.dilate(hard, kern)
            band = np.clip(grown.astype(int) - hard.astype(int), 0, 255).astype(np.uint8)
            rim = Image.fromarray(np.dstack([np.full_like(band, 255)] * 3 + [band]), "RGBA")
            im = Image.alpha_composite(rim, im)
        out.append(im)

    if args.pingpong and len(out) > 2:
        out = out + out[-2:0:-1]
        print(f"  ping-pong -> {len(out)} frames, seamless loop")

    dur = int(round(1000 * stride / src_fps))
    # method 4, not 6. Six plus minimize_size takes minutes and bought about 6%
    # -- the size that matters here is the PIXEL size, not the encoder effort:
    # the slot is 56px and the detail view 76px, so 128 is already well past
    # anything either can show.
    out[0].save(args.out, "WEBP", save_all=True, append_images=out[1:],
                duration=dur, loop=0, quality=args.quality, method=4)
    n = os.path.getsize(args.out)
    print(f"  wrote  {args.out}  {len(out)} frames @ {dur}ms  "
          f"{n / 1e3:.0f} KB  ({n * 4 / 3 / 1e3:.0f} KB as a data URI)")

    prev = Image.new("RGBA", (56, 56), (26, 23, 34, 255))
    prev.alpha_composite(out[0].resize((56, 56), Image.LANCZOS))
    pv = os.path.splitext(args.out)[0] + "_56.png"
    prev.resize((224, 224), Image.NEAREST).save(pv)
    print(f"  wrote  {pv}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
