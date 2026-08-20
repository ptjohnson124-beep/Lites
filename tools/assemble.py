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
  --shake      decaying jolt on impact poses, for hits the drawings do not show
  --travel     where each pose should stand; the shift to get there is measured
  --breathe    slight feet-planted stretch, the one deformation a still drawing takes
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

from slice_sheet import despeckle


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


def resize_premultiplied(frame, size):
    """Resize without dragging transparent pixels into the edges.

    Resampling straight RGBA blends the colour of fully transparent pixels into
    everything next to them, which fringes the whole silhouette. Scaling in
    premultiplied form and dividing the alpha back out afterwards keeps edges
    as sharp as the drawing.
    """
    a = np.array(frame).astype(np.float32)
    a[:, :, :3] *= a[:, :, 3:4] / 255.0
    out = np.array(Image.fromarray(a.astype(np.uint8)).resize(size, Image.LANCZOS)).astype(np.float32)
    # Lanczos undershoots around a hard silhouette and leaves a dusting of
    # alpha-3-to-8 pixels in what was clean transparency. On screen that is
    # grain, and in a GIF's one-bit alpha some of it turns fully opaque, so it
    # goes before anything else sees it.
    out[:, :, 3][out[:, :, 3] < 12] = 0
    alpha = out[:, :, 3]
    scale = np.divide(255.0, alpha, out=np.zeros_like(alpha), where=alpha > 0.5)
    out[:, :, :3] = np.clip(out[:, :, :3] * scale[:, :, None], 0, 255)
    return Image.fromarray(out.astype(np.uint8))


def breathe(frames, percent, cycles, levels=6):
    """Rise and fall on the breath: a slight vertical stretch, planted at the feet.

    Chest expansion is the one part of breathing a single drawing can fake, and
    a whole-body stretch of a percent or so reads as it without distorting
    anything recognisably. Scales are quantised to a few levels and the results
    cached, so a pose held across many frames resamples to pixel-identical
    images instead of shimmering as the scale creeps.
    """
    if not percent:
        return frames

    w, h = frames[0].size
    cache = {}
    scaled = []
    for i, frame in enumerate(frames):
        phase = (np.sin(2 * np.pi * cycles * i / len(frames)) + 1) / 2
        level = int(round(phase * (levels - 1)))
        key = (id(frame), level)
        if key not in cache:
            factor = 1 + (percent / 100.0) * (level / (levels - 1))
            target = int(round(h * factor))
            # At rest the breath asks for the frame it already has. Resampling
            # it anyway would soften it for nothing, so those frames are passed
            # through untouched and stay pixel-exact.
            cache[key] = frame if target == h else resize_premultiplied(frame, (w, target))
        scaled.append(cache[key])

    top = max(f.height for f in scaled)
    out = []
    for frame in scaled:
        canvas = Image.new("RGBA", (w, top), (0, 0, 0, 0))
        canvas.paste(frame, (0, top - frame.height))   # feet stay planted
        out.append(canvas)
    return out


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


def parse_pose_map(spec):
    """'4:5,6:3' -> {3: 5, 5: 3}, keyed by 0-based pose index."""
    out = {}
    for part in (spec or "").split(","):
        if part.strip():
            pose, value = part.split(":")
            out[int(pose) - 1] = int(value)
    return out


def ground_x(frame):
    """Where a pose stands: horizontal centre of its legs and boots.

    Measured on the desaturated pixels of the lower body, so streaming hair —
    the most mobile thing on the character — does not vote on where her feet
    are.
    """
    a = np.array(frame)
    rgb = a[:, :, :3].astype(np.int16)
    mx, mn = rgb.max(axis=2), rgb.min(axis=2)
    sat = np.where(mx > 0, (mx - mn) * 255 // np.maximum(mx, 1), 0)
    core = (a[:, :, 3] > 0) & (sat < 70)
    core[:int(core.shape[0] * 0.55)] = False
    xs = np.nonzero(core.any(axis=0))[0]
    return float(xs.mean()) if len(xs) else frame.width / 2


def travel_offsets(poses, order, spec):
    """Turn requested ground positions into the shift each pose needs.

    Asking for a raw shift per pose does not survive contact with the drawings:
    each one sits at its own spot once registered, so equal shifts produce an
    uneven path and a dash reads as a stumble. Here the request is where she
    should be standing, relative to the pose the sequence opens on, and the
    shift that gets her there is measured rather than guessed.
    """
    targets = parse_pose_map(spec)
    if not targets:
        return {}
    base = ground_x(poses[order[0]])
    return {i: int(round(t - (ground_x(poses[i]) - base))) for i, t in targets.items()}


def displace(frames, played, shake_spec, offset_spec):
    """Move whole frames around: a jolt on impact, and travel through an attack.

    Two rigid motions the drawings cannot supply on their own. The jolt is what
    registers a hit — nothing shows Dahlia recoiling, so it decays over the run
    to strike and settle rather than vibrate. The offset is the ground she
    covers: registration deliberately holds her still so a loop does not drift,
    which is right for an idle and wrong for a lunge, so the travel is put back
    by hand, a pose at a time.
    """
    shake = parse_pose_map(shake_spec)
    offset = offset_spec if isinstance(offset_spec, dict) else parse_pose_map(offset_spec)
    if not shake and not offset:
        return frames

    pad = max([abs(v) for v in list(shake.values()) + list(offset.values())] or [0]) + 1
    decay = [1.0, -0.85, 0.6, -0.4, 0.25, -0.15, 0.08]

    out, run_pose, step = [], None, 0
    for frame, pose in zip(frames, played):
        step = step + 1 if pose == run_pose else 0
        run_pose = pose
        amp = shake.get(pose, 0)
        k = (decay[step] if step < len(decay) else 0.0) if amp else 0.0
        dx = int(round(amp * k)) + offset.get(pose, 0)
        dy = int(round(amp * k * -0.5))
        canvas = Image.new("RGBA", (frame.width + 2 * pad, frame.height + 2 * pad), (0, 0, 0, 0))
        canvas.paste(frame, (pad + dx, pad + dy))
        out.append(canvas)
    return out


def trim(frames, margin=2):
    """Crop every frame to one common box, so nothing shifts on playback.

    The box is the union across the whole loop, plus a small margin: cropped
    flush, the widest frame's outermost pixels sit on the canvas edge, and any
    renderer that scales or offsets the sprite shaves them off.
    """
    boxes = [Image.fromarray(np.array(f)[:, :, 3]).getbbox() for f in frames]
    x0 = min(b[0] for b in boxes) - margin
    y0 = min(b[1] for b in boxes) - margin
    x1 = max(b[2] for b in boxes) + margin
    y1 = max(b[3] for b in boxes) + margin
    return [f.crop((x0, y0, x1, y1)) for f in frames]


def gif_frames(frames):
    """Quantise to one shared palette, keeping alpha as a reserved index.

    Three things ruin a GIF of art like this. Dithering stipples every flat
    surface; a palette rebuilt per frame makes those surfaces crawl between
    frames even where the drawing has not changed; and RGBA handed straight to
    the encoder loses transparency altogether and lands the character on a
    black card. One palette for the whole loop, no dithering, and index 255
    held back for transparent pixels avoids all three.
    """
    w, h = frames[0].size
    montage = Image.new("RGB", (w, h * len(frames)), (0, 0, 0))
    for i, f in enumerate(frames):
        montage.paste(f.convert("RGB"), (0, i * h))
    shared = montage.quantize(colors=255, method=Image.Quantize.MEDIANCUT,
                              dither=Image.Dither.NONE)

    out = []
    for f in frames:
        p = f.convert("RGB").quantize(palette=shared, dither=Image.Dither.NONE)
        p.paste(255, f.getchannel("A").point(lambda a: 255 if a < 128 else 0))
        p.info["transparency"] = 255
        out.append(p)
    return out


def scrub(frames, min_size=24):
    """Final speck pass, after every transform has had its say.

    The poses are despeckled when they are sliced, but resampling for the
    breath makes new specks of its own: ringing that survives the alpha clamp
    lands as islands of a few pixels beside the silhouette. Clearing them here,
    on the frames actually written out, is the only place that can promise the
    shipped loop has none.
    """
    out = []
    for frame in frames:
        a = np.array(frame)
        keep = despeckle(a[:, :, 3] > 0, min_size)
        a[:, :, 3] = np.where(keep, a[:, :, 3], 0)
        out.append(Image.fromarray(a))
    return out


def save(frames, path, fps, quality=92):
    dur = 1000.0 / fps
    if path.endswith(".gif"):
        # GIF delays are stored in hundredths of a second, so anything finer is
        # rounded off by players; the WebP keeps the exact rate.
        g = gif_frames(frames)
        g[0].save(path, save_all=True, append_images=g[1:],
                  duration=max(20, int(round(dur / 10) * 10)), loop=0,
                  disposal=2, transparency=255)
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
    ap.add_argument("--breathe", type=float, default=0.0,
                    help="breathing stretch as a percent of height, e.g. 1.5")
    ap.add_argument("--breathe-cycles", type=float, default=3.0, help="breaths per loop")
    ap.add_argument("--breathe-levels", type=int, default=6,
                    help="distinct breathing scales; more means finer steps at higher frame rates")
    ap.add_argument("--bob", type=int, default=2, help="vertical idle float in pixels (0 disables)")
    ap.add_argument("--sway", type=int, default=0, help="horizontal idle drift in pixels")
    ap.add_argument("--shake", help="jolt on impact poses, e.g. '4:4,6:2' (1-based pose:pixels)")
    ap.add_argument("--offset", help="raw shift on given poses, e.g. '7:16,9:24'; negative goes back")
    ap.add_argument("--travel", help="where each pose should stand, e.g. '7:-20,9:-30'; measured, not guessed")
    ap.add_argument("--bob-cycles", type=float, default=1.0, help="float cycles per loop")
    ap.add_argument("--stabilize", choices=("core", "silhouette", "none"), default="core",
                    help="core: match on hoodie and trousers, ignoring hair")
    ap.add_argument("--despeckle", type=int, default=24,
                    help="drop islands smaller than this from the finished frames")
    ap.add_argument("--quality", type=int, default=92)
    args = ap.parse_args()

    paths = sorted(glob.glob(os.path.join(args.frames, "*.png")))
    if not paths:
        raise SystemExit(f"no PNGs in {args.frames}")
    poses = [Image.open(p).convert("RGBA") for p in paths]

    order = parse_range(args.poses, len(poses)) if args.poses else list(range(len(poses)))
    poses = stabilize(poses, args.stabilize)
    played = timeline(order, args.holds, args.pingpong)
    played_frames = breathe([poses[i] for i in played], args.breathe,
                            args.breathe_cycles, args.breathe_levels)
    moved = float_motion(played_frames, args.bob, args.sway, args.bob_cycles)
    shifts = parse_pose_map(args.offset)
    for pose, dx in travel_offsets(poses, order, args.travel).items():
        shifts[pose] = shifts.get(pose, 0) + dx
    frames = trim(scrub(displace(moved, played, args.shake, shifts), args.despeckle))

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
                   "breathe": args.breathe, "breathe_cycles": args.breathe_cycles,
                   "shake": args.shake, "offset": args.offset, "travel": args.travel,
                   "stabilize": args.stabilize,
                   "size": [fw, fh], "strip": f"{args.name}_strip.png",
                   "cols": cols, "strip_rows": rows}, fh_, indent=2)

    print(f"poses {[i + 1 for i in order]} -> {len(frames)} frames @ {args.fps:g} fps "
          f"({len(frames) / args.fps:.2f}s loop)")


if __name__ == "__main__":
    main()
