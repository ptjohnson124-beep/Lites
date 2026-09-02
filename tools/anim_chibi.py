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
    # GIF and animated WebP go through Pillow: cv2.VideoCapture will open a GIF
    # and then hand back nonsense or nothing, because it is a video decoder and
    # a GIF is a stack of palette images.
    if os.path.splitext(path)[1].lower() in (".gif", ".webp", ".png"):
        from PIL import ImageSequence
        im = Image.open(path)
        dur = im.info.get("duration") or 100
        out = [np.array(f.convert("RGB")) for i, f in enumerate(ImageSequence.Iterator(im))
               if i % stride == 0]
        return out, 1000.0 / dur

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
    """Background is what the frame EDGE reaches, each seed judged against ITS
    OWN colour.

    An earlier version pre-masked everything that did not match the corner
    pixel, so the fill could never enter it. That is fatal the moment a
    background changes during the animation -- six frames of one clip flash a
    different shade behind the character, and on exactly those frames nothing
    was removed at all. Seeding per pixel with a fixed range has no opinion
    about what the background is supposed to look like, so it survives a
    background that moves, a split frame, and a painted checkerboard alike.
    """
    h, w, _ = rgb.shape
    bgr = np.ascontiguousarray(rgb[:, :, ::-1])
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
    return np.where(bg, 0, 255).astype(np.uint8)


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

    if os.path.splitext(args.video)[1].lower() in (".gif", ".webp", ".png"):
        src_fps = 1000.0 / (Image.open(args.video).info.get("duration") or 100)
    else:
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

    # ONE box for every frame, so the figure does not drift or breathe -- and
    # built from each frame's LARGEST CONNECTED PIECE rather than from every
    # pixel that survived. A plain union is hostage to a single stray speck in
    # a corner: one leaked pixel in one frame of twenty-one and the shared box
    # is the whole canvas, which silently shrinks the character inside it.
    # And taken as a TRIMMED UNION of the per-frame boxes.
    #
    # Neither extreme works alone. A plain union is hostage to the worst single
    # frame: a clip that flashes a full-frame transformation burst partway
    # through has seventeen frames agreeing the character is 1132x1301 and one
    # insisting on 1408x1408, and the union believes the one. But the median
    # fails the opposite case -- a character who really does move that much,
    # rearing a horse across half the frame, gets his head cropped off, because
    # there is no outlier to reject and the middle of his range is not his
    # range.
    #
    # So: throw away the largest tenth of the boxes by area, then union what is
    # left. The burst frame goes; the big honest poses stay.
    boxes = []
    for a in alphas:
        n, lab, st, _ = cv2.connectedComponentsWithStats((a > 40).astype(np.uint8), 8)
        if n < 2:
            continue
        i = 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))
        bx, by = st[i, cv2.CC_STAT_LEFT], st[i, cv2.CC_STAT_TOP]
        boxes.append((bx, by, bx + st[i, cv2.CC_STAT_WIDTH] - 1,
                      by + st[i, cv2.CC_STAT_HEIGHT] - 1))
    if not boxes:
        raise SystemExit("nothing left after keying")
    boxes.sort(key=lambda b: (b[2] - b[0]) * (b[3] - b[1]))
    keep = boxes[:max(1, int(round(len(boxes) * .9)))]
    bb = np.array(keep)
    x0, y0 = int(bb[:, 0].min()), int(bb[:, 1].min())
    x1, y1 = int(bb[:, 2].max()), int(bb[:, 3].max())
    print(f"  shared crop {x1 - x0 + 1}x{y1 - y0 + 1}, union of {len(keep)} of "
          f"{len(boxes)} frames (largest tenth dropped)")

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
