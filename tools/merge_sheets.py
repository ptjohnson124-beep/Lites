#!/usr/bin/env python3
"""Combine sliced pose sets from several sheets onto one common canvas.

An animation split across two sheets arrives as two independent slices, each
padded to its own canvas — 327x590 for the soul charge against 447x411 for the
slash. The assembler needs one canvas for the whole clip, and simply padding to
the larger of the two is not enough: the poses have to line up on the same
ground and the same centre line, or she jumps sideways at the seam.

Bounding-box centring is exactly wrong here. The effects are what differ most
between poses — a fire disc reaches a long way right, a slash crescent a long
way left — so a box centre drags the character around by whatever her aura is
doing. The anchor is her body instead: the horizontal mean of the pixels that
are neither fire nor teal, and the lowest row of them, which is the ground.
"""
import argparse
import glob
import os
import shutil

import numpy as np
from PIL import Image


def body_anchor(im):
    """Her feet and centre line, ignoring fire and teal effects."""
    a = np.asarray(im)
    rgb, alpha = a[:, :, :3].astype(np.int16), a[:, :, 3]
    fire = (rgb[:, :, 0] > 170) & (rgb[:, :, 1] > 60) & (rgb[:, :, 2] < 120)
    teal = (rgb[:, :, 1] > rgb[:, :, 0] + 30) & (rgb[:, :, 2] > rgb[:, :, 0] + 20)
    body = (alpha > 32) & ~fire & ~teal
    if not body.any():                      # a pose that is nothing but effect
        body = alpha > 32
    ys, xs = np.nonzero(body)
    return int(xs.mean()), int(ys.max())


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("dirs", nargs="+", help="frame directories, in play order")
    ap.add_argument("-o", "--outdir", required=True)
    ap.add_argument("-n", "--name", required=True)
    ap.add_argument("--skip-first", action="append", default=[], metavar="DIR",
                    help="drop the first pose of this directory — for a second sheet "
                         "whose opening pose repeats the last pose of the one before")
    ap.add_argument("--margin", type=int, default=60,
                    help="clear space kept around the widest pose")
    args = ap.parse_args()

    poses = []
    for d in args.dirs:
        found = sorted(glob.glob(os.path.join(d, "*.png")))
        if not found:
            raise SystemExit(f"no PNGs in {d}")
        if d in args.skip_first:
            found = found[1:]
        poses += [Image.open(p).convert("RGBA") for p in found]

    anchors = [body_anchor(p) for p in poses]
    left = max(ax for ax, _ in anchors)
    right = max(p.width - ax for p, (ax, _) in zip(poses, anchors))
    up = max(ay for _, ay in anchors)
    down = max(p.height - ay for p, (_, ay) in zip(poses, anchors))
    w, h = left + right + 2 * args.margin, up + down + 2 * args.margin
    cx, cy = left + args.margin, up + args.margin

    frame_dir = os.path.join(args.outdir, "frames")
    shutil.rmtree(frame_dir, ignore_errors=True)
    os.makedirs(frame_dir, exist_ok=True)
    for i, (pose, (ax, ay)) in enumerate(zip(poses, anchors), 1):
        canvas = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        canvas.alpha_composite(pose, (cx - ax, cy - ay))
        canvas.save(os.path.join(frame_dir, f"{args.name}_{i:02d}.png"))
    print(f"{args.name}: {len(poses)} poses merged onto {w}x{h} -> {frame_dir}")


if __name__ == "__main__":
    main()
