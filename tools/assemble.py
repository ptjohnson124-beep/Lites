#!/usr/bin/env python3
"""Assemble drawn poses into a frame-by-frame animation.

No frames are invented here. Warping one drawing into the next along an optical
flow field looks like melting wax on art like this — the poses are independent
illustrations whose hair, folds and outlines are redrawn each time, so there is
no correspondence for a flow field to follow. What is left is what traditional
animation does anyway: pick poses that belong together, order them, hold the
extremes longer than the passing frames, and keep the body from wandering.

  --poses      which drawings take part, and in what order
  --pingpong   play the sequence out and back, so a non-cyclic set still loops
  --holds      frames each pose is held for; the shape of the timing
  --bob/--sway gentle rigid drift, the one motion safe to add to a still drawing
  --stabilize  register poses on the body, ignoring the hair
"""

import argparse
import glob
import json
import os
import shutil

import numpy as np
from PIL import Image


def parse_range(spec, n):
    """'3-7,10' -> [2, 3, 4, 5, 6, 9] (input is 1-based, output is 0-based)."""
    out = []
    for part in spec.split(","):
        if "-" in part:
            a, b = part.split("-")
            out.extend(range(int(a) - 1, int(b)))
        else:
            out.append(int(part) - 1)
    if any(i < 0 or i >= n for i in out):
        raise SystemExit(f"--poses out of range; sheet has {n} poses")
    return out


def core_mask(frame):
    """The parts of the character that hold still: hoodie, trousers, boots.

    Hair is the largest and most freely redrawn thing on the sheet, so it
    dominates any whole-silhouette match and drags the body around with it.
    It is also the only strongly saturated red, which makes it easy to drop.
    """
    a = np.array(frame)
    rgb = a[:, :, :3].astype(np.int16)
    mx, mn = rgb.max(axis=2), rgb.min(axis=2)
    sat = np.where(mx > 0, (mx - mn) * 255 // np.maximum(mx, 1), 0)
    return ((a[:, :, 3] > 0) & (sat < 70)).astype(np.float32)


def stabilize(frames, mode, limit=10):
    """Shift each frame so its body sits where the first frame's body sits."""
    if mode == "none":
        return frames

    feature = core_mask if mode == "core" else (
        lambda f: (np.array(f)[:, :, 3] > 0).astype(np.float32))
    ref = np.fft.rfft2(feature(frames[0]))

    shifts = []
    for frame in frames:
        corr = np.fft.irfft2(ref * np.conj(np.fft.rfft2(feature(frame))), frames[0].size[::-1])
        window = np.full(corr.shape, -np.inf)
        window[-limit:, -limit:] = corr[-limit:, -limit:]
        window[-limit:, :limit] = corr[-limit:, :limit]
        window[:limit, -limit:] = corr[:limit, -limit:]
        window[:limit, :limit] = corr[:limit, :limit]
        dy, dx = np.unravel_index(np.argmax(window), corr.shape)
        shifts.append((int(dx - corr.shape[1] if dx > limit else dx),
                       int(dy - corr.shape[0] if dy > limit else dy)))

    mx = max(abs(d[0]) for d in shifts) or 1
    my = max(abs(d[1]) for d in shifts) or 1
    w, h = frames[0].size
    out = []
    for frame, (dx, dy) in zip(frames, shifts):
        canvas = Image.new("RGBA", (w + 2 * mx, h + 2 * my), (0, 0, 0, 0))
        canvas.paste(frame, (mx + dx, my + dy))
        out.append(canvas)
    return out


def timeline(order, holds, pingpong):
    """Expand poses into the frame list actually played, holds included."""
    seq = list(order)
    if pingpong and len(seq) > 2:
        seq += seq[-2:0:-1]          # out and back, without repeating either end

    if holds:
        counts = [int(v) for v in holds.split(",")]
        if len(counts) != len(seq):
            raise SystemExit(f"--holds needs {len(seq)} values for this sequence, got {len(counts)}")
    else:
        # Extremes are where a movement changes direction; holding them is what
        # keeps a short loop from reading as a metronome.
        counts = [1] * len(seq)
        counts[0] = 3
        if len(seq) > 1:
            counts[len(order) - 1] = 2

    return [i for i, c in zip(seq, counts) for _ in range(c)]


def float_motion(frames, rise, sway, cycles):
    """Drift the whole sprite on a slow ellipse — rigid, so nothing distorts.

    This is what keeps a long hold from reading as a frozen still. A quarter-turn
    of phase between the vertical and horizontal drift traces an ellipse rather
    than a straight bounce, which reads as weight shifting instead of a hop.
    """
    if not rise and not sway:
        return frames
    w, h = frames[0].size
    out = []
    for i, frame in enumerate(frames):
        phase = 2 * np.pi * cycles * i / len(frames)
        dy = int(round(rise * np.sin(phase)))
        dx = int(round(sway * np.sin(phase + np.pi / 2)))
        canvas = Image.new("RGBA", (w + 2 * max(sway, 1), h + 2 * max(rise, 1)), (0, 0, 0, 0))
        canvas.paste(frame, (max(sway, 1) + dx, max(rise, 1) + dy))
        out.append(canvas)
    return out


def trim(frames):
    """Crop every frame to one common box, so nothing shifts on playback."""
    boxes = [Image.fromarray(np.array(f)[:, :, 3]).getbbox() for f in frames]
    x0 = min(b[0] for b in boxes); y0 = min(b[1] for b in boxes)
    x1 = max(b[2] for b in boxes); y1 = max(b[3] for b in boxes)
    return [f.crop((x0, y0, x1, y1)) for f in frames]


def save(frames, path, fps, quality=92):
    dur = 1000.0 / fps
    if path.endswith(".gif"):
        # GIF delays are stored in hundredths of a second, so anything finer is
        # rounded off by players; the WebP keeps the exact rate.
        frames[0].save(path, save_all=True, append_images=frames[1:],
                       duration=max(20, int(round(dur / 10) * 10)), loop=0,
                       disposal=2, transparency=0)
    else:
        frames[0].save(path, save_all=True, append_images=frames[1:],
                       duration=int(round(dur)), loop=0, quality=quality, method=4)


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("frames", help="directory of the numbered pose PNGs")
    ap.add_argument("-o", "--outdir", default="out")
    ap.add_argument("-n", "--name", default="anim")
    ap.add_argument("--poses", help="1-based selection and order, e.g. '3-7' or '5,4,3,4'")
    ap.add_argument("--pingpong", action="store_true", help="play out and back for a seamless loop")
    ap.add_argument("--holds", help="frames per pose, comma separated, one per played pose")
    ap.add_argument("--fps", type=float, default=12.0,
                    help="playback rate; multiples of 10ms stay exact in GIF")
    ap.add_argument("--bob", type=int, default=2, help="vertical idle float in pixels (0 disables)")
    ap.add_argument("--sway", type=int, default=0, help="horizontal idle drift in pixels")
    ap.add_argument("--bob-cycles", type=float, default=1.0, help="float cycles per loop")
    ap.add_argument("--stabilize", choices=("core", "silhouette", "none"), default="core",
                    help="core: match on hoodie and trousers, ignoring hair")
    ap.add_argument("--quality", type=int, default=92)
    args = ap.parse_args()

    paths = sorted(glob.glob(os.path.join(args.frames, "*.png")))
    if not paths:
        raise SystemExit(f"no PNGs in {args.frames}")
    poses = [Image.open(p).convert("RGBA") for p in paths]

    order = parse_range(args.poses, len(poses)) if args.poses else list(range(len(poses)))
    poses = stabilize(poses, args.stabilize)
    played = timeline(order, args.holds, args.pingpong)
    frames = trim(float_motion([poses[i] for i in played],
                               args.bob, args.sway, args.bob_cycles))

    # Rebuild the directory rather than write into it: a shorter run would
    # otherwise leave the tail of a longer one behind, and the strip and any
    # engine import would silently pick those stale frames up.
    frame_dir = os.path.join(args.outdir, f"{args.name}_frames")
    shutil.rmtree(frame_dir, ignore_errors=True)
    os.makedirs(frame_dir, exist_ok=True)
    for i, f in enumerate(frames, 1):
        f.save(os.path.join(frame_dir, f"{i:03d}.png"))
    save(frames, os.path.join(args.outdir, f"{args.name}.webp"), args.fps, args.quality)
    save(frames, os.path.join(args.outdir, f"{args.name}.gif"), args.fps)

    fw, fh = frames[0].size
    cols = min(8, len(frames))
    rows = (len(frames) + cols - 1) // cols
    strip = Image.new("RGBA", (cols * fw, rows * fh), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        strip.paste(f, ((i % cols) * fw, (i // cols) * fh))
    strip.save(os.path.join(args.outdir, f"{args.name}_strip.png"))

    with open(os.path.join(args.outdir, f"{args.name}.json"), "w") as fh_:
        json.dump({"name": args.name, "poses": [i + 1 for i in order],
                   "played": [i + 1 for i in played], "frames": len(frames),
                   "fps": args.fps, "loop_seconds": round(len(frames) / args.fps, 3),
                   "pingpong": args.pingpong, "bob": args.bob, "sway": args.sway,
                   "stabilize": args.stabilize,
                   "size": [fw, fh], "strip": f"{args.name}_strip.png",
                   "cols": cols, "strip_rows": rows}, fh_, indent=2)

    print(f"poses {[i + 1 for i in order]} -> {len(frames)} frames @ {args.fps:g} fps "
          f"({len(frames) / args.fps:.2f}s loop)")


if __name__ == "__main__":
    main()
