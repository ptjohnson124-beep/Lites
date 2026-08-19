#!/usr/bin/env python3
"""Turn a short pose sequence into a fluid looping animation.

Twelve drawn poses played back as twelve frames read as twelve poses, however
low you set the frame duration. Fluidity comes from generating the frames that
were never drawn: dense optical flow between each pair of poses gives a motion
field, and in-betweens are made by warping both poses along it and blending
where they meet. Limbs and hair travel to their next position instead of one
pose dissolving into the next.

The sequence is treated as a loop — the last pose flows back into the first —
so an idle can run forever without a seam.
"""

import argparse
import glob
import json
import os

import cv2
import numpy as np
from PIL import Image


def load(paths):
    frames = [np.array(Image.open(p).convert("RGBA")) for p in paths]
    sizes = {f.shape[:2] for f in frames}
    if len(sizes) != 1:
        raise SystemExit(f"frames differ in size: {sizes}")
    return frames


def flow_between(a, b, winsize):
    """Dense motion field from a to b, measured on the silhouette and its shading."""
    def prep(f):
        # Composite over black so the outline itself is a strong feature for the
        # flow to track, then work in luma.
        rgb = f[:, :, :3].astype(np.float32) * (f[:, :, 3:4].astype(np.float32) / 255.0)
        return cv2.cvtColor(rgb.astype(np.uint8), cv2.COLOR_RGB2GRAY)

    return cv2.calcOpticalFlowFarneback(
        prep(a), prep(b), None,
        pyr_scale=0.5, levels=5, winsize=winsize, iterations=5,
        poly_n=7, poly_sigma=1.5, flags=cv2.OPTFLOW_FARNEBACK_GAUSSIAN)


def warp(frame, flow, t):
    """Sample `frame` along `flow` scaled by t, in premultiplied alpha."""
    h, w = frame.shape[:2]
    gy, gx = np.mgrid[0:h, 0:w].astype(np.float32)
    mapx, mapy = gx + flow[:, :, 0] * t, gy + flow[:, :, 1] * t

    pm = frame.astype(np.float32)
    pm[:, :, :3] *= pm[:, :, 3:4] / 255.0  # premultiply so edges don't drag in
    return cv2.remap(pm, mapx, mapy, cv2.INTER_LINEAR,   # colour from transparent pixels
                     borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0))


def unpremultiply(pm):
    out = np.zeros_like(pm, dtype=np.uint8)
    a = np.clip(pm[:, :, 3], 0, 255)
    scale = np.divide(255.0, a, out=np.zeros_like(a), where=a > 0.5)
    out[:, :, :3] = np.clip(pm[:, :, :3] * scale[:, :, None], 0, 255).astype(np.uint8)
    out[:, :, 3] = a.astype(np.uint8)
    return out


def pace(pairs, steps, uniform):
    """How many in-betweens each pose pair gets.

    Spacing them evenly makes the animation lurch: consecutive poses are not
    equally far apart, so a pair that moves eight times as far covers that
    ground in the same time and snaps. Handing out in-betweens in proportion
    to how far each pair actually travels keeps apparent speed constant, which
    is most of what reads as fluid.
    """
    if uniform:
        return [steps] * len(pairs)

    dist = [float(np.abs(a.astype(np.int16) - b.astype(np.int16)).mean()) for a, b in pairs]
    budget = len(pairs) * (steps + 1)
    share = [max(1.0, budget * d / sum(dist)) for d in dist]
    return [max(0, int(round(v)) - 1) for v in share]


def interpolate(frames, steps, winsize, loop=True, uniform=False):
    """Return the poses with generated in-betweens spliced between them."""
    pairs = list(zip(frames, frames[1:] + frames[:1])) if loop else list(zip(frames, frames[1:]))
    plan = pace(pairs, steps, uniform)
    out = []
    for (a, b), steps in zip(pairs, plan):
        out.append(a)
        if steps:
            fwd = flow_between(a, b, winsize)
            bwd = flow_between(b, a, winsize)
            for i in range(1, steps + 1):
                t = i / (steps + 1)
                # Each pose is pulled toward the other and the two are mixed by
                # how far along we are, so neither dominates a mid-point frame.
                mid = warp(a, bwd, t) * (1 - t) + warp(b, fwd, 1 - t) * t
                out.append(unpremultiply(mid))
    if not loop:
        out.append(frames[-1])
    return out


def save(frames, path, fps, quality=90):
    imgs = [Image.fromarray(f) for f in frames]
    dur = 1000.0 / fps
    if path.endswith(".gif"):
        # GIF frame delays are stored in hundredths of a second; anything finer
        # gets rounded off by players, so the WebP is the accurate one.
        flat = [im.convert("RGBA") for im in imgs]
        flat[0].save(path, save_all=True, append_images=flat[1:],
                     duration=max(20, int(round(dur / 10) * 10)), loop=0,
                     disposal=2, transparency=0)
    else:
        # Lossless WebP of a long sequence runs to megabytes; at this quality
        # the difference is invisible and the file is a fraction of the size.
        imgs[0].save(path, save_all=True, append_images=imgs[1:],
                     duration=int(round(dur)), loop=0, quality=quality, method=4)


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("frames", help="directory or glob of the numbered source frames")
    ap.add_argument("-o", "--outdir", default="out")
    ap.add_argument("-n", "--name", default="smooth")
    ap.add_argument("--steps", type=int, default=3,
                    help="in-betweens per pose pair, on average")
    ap.add_argument("--uniform", action="store_true",
                    help="give every pair the same number of in-betweens instead of pacing by distance")
    ap.add_argument("--fps", type=float, default=25.0,
                    help="playback rate; multiples of 10ms stay exact in GIF")
    ap.add_argument("--quality", type=int, default=90, help="WebP quality")
    ap.add_argument("--winsize", type=int, default=33,
                    help="flow window; raise it when limbs jump far between poses")
    ap.add_argument("--no-loop", action="store_true", help="do not flow the last pose into the first")
    args = ap.parse_args()

    paths = sorted(glob.glob(os.path.join(args.frames, "*.png")) if os.path.isdir(args.frames)
                   else glob.glob(args.frames))
    if len(paths) < 2:
        raise SystemExit(f"need at least 2 frames, found {len(paths)}")

    frames = load(paths)
    out = interpolate(frames, args.steps, args.winsize,
                      loop=not args.no_loop, uniform=args.uniform)

    os.makedirs(os.path.join(args.outdir, f"{args.name}_frames"), exist_ok=True)
    for i, f in enumerate(out, 1):
        Image.fromarray(f).save(os.path.join(args.outdir, f"{args.name}_frames", f"{i:03d}.png"))
    save(out, os.path.join(args.outdir, f"{args.name}.webp"), args.fps, args.quality)
    save(out, os.path.join(args.outdir, f"{args.name}.gif"), args.fps)

    # One strip beats 70-odd separate files for anything that has to load this
    # at runtime — an engine, or the preview player.
    fh_, fw_ = out[0].shape[:2]
    cols = min(8, len(out))
    rows_ = (len(out) + cols - 1) // cols
    strip = Image.new("RGBA", (cols * fw_, rows_ * fh_), (0, 0, 0, 0))
    for i, f in enumerate(out):
        strip.paste(Image.fromarray(f), ((i % cols) * fw_, (i // cols) * fh_))
    strip.save(os.path.join(args.outdir, f"{args.name}_strip.png"))

    with open(os.path.join(args.outdir, f"{args.name}.json"), "w") as fh:
        json.dump({"name": args.name, "source_poses": len(frames), "steps": args.steps,
                   "paced": not args.uniform,
                   "frames": len(out), "fps": args.fps,
                   "loop_seconds": round(len(out) / args.fps, 3),
                   "size": [int(fw_), int(fh_)],
                   "strip": f"{args.name}_strip.png", "cols": cols, "strip_rows": rows_},
                  fh, indent=2)

    print(f"{len(frames)} poses + {args.steps} in-betweens each -> {len(out)} frames "
          f"@ {args.fps:g} fps ({len(out) / args.fps:.2f}s loop)")


if __name__ == "__main__":
    main()
