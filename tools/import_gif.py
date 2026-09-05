#!/usr/bin/env python3
"""Bring an already-timed animation in as poses, so it can be rebuilt like a sheet.

Everything else here starts from a sheet of drawings and gets its timing from
--holds. An animated GIF arrives with the timing already baked into per-frame
durations, and those durations are not uniform. Rather than teach the assembler
a second timing model, each source frame becomes a pose and its duration becomes
a hold count at the target rate — so the animation keeps exactly the timing it
was authored with, and still gets the same cleanup, strip, manifest and export
as everything else.

Prints the --holds string to pass straight to assemble.py.
"""

import argparse
import os
import shutil

from PIL import Image, ImageSequence


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("gif")
    ap.add_argument("-o", "--outdir", required=True)
    ap.add_argument("-n", "--name", required=True)
    ap.add_argument("--fps", type=float, default=20.0, help="rate the holds are expressed at")
    ap.add_argument("--mirror", action="store_true", help="flip horizontally, to face the other way")
    args = ap.parse_args()

    src = Image.open(args.gif)
    frames, durations = [], []
    for frame in ImageSequence.Iterator(src):
        rgba = frame.convert("RGBA")
        frames.append(rgba.transpose(Image.FLIP_LEFT_RIGHT) if args.mirror else rgba.copy())
        durations.append(src.info.get("duration") or int(1000 / args.fps))

    frame_dir = os.path.join(args.outdir, "frames")
    shutil.rmtree(frame_dir, ignore_errors=True)
    os.makedirs(frame_dir, exist_ok=True)
    for i, f in enumerate(frames, 1):
        f.save(os.path.join(frame_dir, f"{args.name}_{i:03d}.png"))

    step = 1000.0 / args.fps
    holds = [max(1, int(round(d / step))) for d in durations]
    total = sum(holds)
    print(f"{len(frames)} frames -> {args.outdir}/frames  "
          f"({total} at {args.fps:g} fps, {total / args.fps:.2f}s)")
    print("--poses " + ",".join(str(i) for i in range(1, len(frames) + 1)))
    print("--holds " + ",".join(str(h) for h in holds))


if __name__ == "__main__":
    main()
