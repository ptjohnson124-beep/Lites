#!/usr/bin/env python3
"""Bring a finished spritesheet into the pipeline as poses.

Everything else here starts from a DRAWING sheet -- eight poses of a movement
that still has to be ordered, registered and timed. A sheet out of an animation
tool is already none of those things: the frames are in order, on a uniform
grid, and registered to each other. So this skips the slicer and the merger
entirely and hands the frames to the assembler, which is where the timing gets
decided anyway.

What it still has to do:

  · Cut the cells, from the tool's own manifest where there is one and from a
    grid where there is not.
  · Drop frames that are the same frame. A generated clip usually ends on a
    held pose written out four or five times, and every one of those is a
    wasted pose in --holds terms -- the assembler expresses a hold as a number,
    not as repeated drawings.
  · Flip, when the tool drew the character facing the other way. This set faces
    LEFT and nothing else in it is mirrored.
  · Trim, because the first frames of a generated clip are often the subject
    standing still before anything happens.

It reports what it found rather than silently doing it, because a spritesheet
that arrives with half its frames identical is telling you something about the
generation that is worth knowing before you build from it.
"""

import argparse
import json
import os
import shutil
import sys

import numpy as np
from PIL import Image


def cut(sheet, manifest, rows, cols):
    if manifest:
        m = json.load(open(manifest, encoding="utf-8"))
        fr = m.get("frames", {})
        order = sorted(fr, key=lambda k: int(k)) if fr else []
        cells = [sheet.crop((fr[k]["x"], fr[k]["y"],
                             fr[k]["x"] + fr[k]["w"], fr[k]["y"] + fr[k]["h"]))
                 for k in order]
        meta = m.get("meta", {})
        secs = meta.get("duration_s")
        fps = (len(cells) / secs) if secs else None
        return cells, fps
    w, h = sheet.size
    cells = [sheet.crop((c * w // cols, r * h // rows,
                         (c + 1) * w // cols, (r + 1) * h // rows))
             for r in range(rows) for c in range(cols)]
    return cells, None


def same(a, b, tol=1.0):
    """Two frames that a person would not tell apart.

    Exact equality is too strict: a generator writing a held pose repeatedly
    still moves a handful of pixels. The test is the share of the frame that
    changed at all, which is what the eye is answering too.
    """
    A = np.asarray(a.resize((200, 200), Image.BILINEAR)).astype(np.int16)
    B = np.asarray(b.resize((200, 200), Image.BILINEAR)).astype(np.int16)
    return 100.0 * (np.abs(A - B).max(axis=2) > 24).mean() < tol


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("sheet")
    ap.add_argument("-o", "--outdir", required=True)
    ap.add_argument("-n", "--name", required=True)
    ap.add_argument("-m", "--manifest", help="the tool's own JSON, if it wrote one")
    ap.add_argument("--rows", type=int, default=0)
    ap.add_argument("--cols", type=int, default=0)
    ap.add_argument("--flip", action="store_true",
                    help="mirror horizontally -- this set faces LEFT")
    ap.add_argument("--drop", default="",
                    help="frame numbers to leave out, e.g. '0,1' for a standing "
                         "start the clip does not need")
    ap.add_argument("--keep-repeats", action="store_true",
                    help="keep frames that repeat the one before, instead of "
                         "letting --holds express the dwell")
    args = ap.parse_args()

    sheet = Image.open(args.sheet).convert("RGBA")
    cells, fps = cut(sheet, args.manifest, args.rows or 1, args.cols or len(
        json.load(open(args.manifest))["frames"]) if args.manifest else 1)
    if not args.manifest:
        cells, fps = cut(sheet, None, args.rows, args.cols)
    print(f"  {len(cells)} frames of {cells[0].width}x{cells[0].height}"
          + (f", source rate {fps:.2f} fps" if fps else ""))

    if sheet.mode == "P" or "transparency" in sheet.info:
        pass
    al = np.asarray(sheet)[:, :, 3]
    if al.max() == 255 and al.min() == 0:
        print(f"  alpha        real, {len(np.unique(al))} levels")
    else:
        print("  warn   this sheet has no usable alpha channel")

    drop = {int(x) for x in args.drop.split(",") if x.strip()}
    kept, why = [], []
    for i, c in enumerate(cells):
        if i in drop:
            why.append(f"{i} dropped by hand")
            continue
        if not args.keep_repeats and kept and same(kept[-1], c):
            why.append(f"{i} repeats the frame before")
            continue
        kept.append(c)
    for w in why:
        print(f"  skipped      frame {w}")

    if args.flip:
        kept = [c.transpose(Image.FLIP_LEFT_RIGHT) for c in kept]
        print(f"  flipped      all {len(kept)} frames, to face left")

    d = os.path.join(args.outdir, "frames")
    shutil.rmtree(d, ignore_errors=True)
    os.makedirs(d, exist_ok=True)
    for i, c in enumerate(kept, 1):
        c.save(os.path.join(d, f"{args.name}_{i:02d}.png"))
    print(f"  -> {len(kept)} poses in {d}")
    if fps:
        print(f"  note   the source ran at {fps:.1f} fps; the assembler will retime "
              f"these at 24 with --holds, which is finer than the tool offered")
    return 0


if __name__ == "__main__":
    sys.exit(main())
