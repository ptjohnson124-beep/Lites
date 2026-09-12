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


def standing_height(images):
    """Median height of her body across a sheet, ignoring effects.

    Effects are excluded for the same reason the anchor excludes them: a
    shockwave or a blade trail is taller than she is and would set the number
    instead of her. The median rather than the mean because one pose with her
    arm overhead should not drag a whole sheet.
    """
    heights = []
    for im in images:
        a = np.asarray(im)
        rgb, alpha = a[:, :, :3].astype(np.int16), a[:, :, 3]
        fire = (rgb[:, :, 0] > 170) & (rgb[:, :, 1] > 60) & (rgb[:, :, 2] < 120)
        teal = (rgb[:, :, 1] > rgb[:, :, 0] + 30) & (rgb[:, :, 2] > rgb[:, :, 0] + 20)
        body = (alpha > 32) & ~fire & ~teal
        if not body.any():
            continue
        ys, _ = np.nonzero(body)
        heights.append(int(ys.max() - ys.min() + 1))
    return float(np.median(heights)) if heights else 0.0


def pose_height(im):
    """One pose's body height, effects excluded — for comparing two drawings."""
    a = np.asarray(im)
    rgb, alpha = a[:, :, :3].astype(np.int16), a[:, :, 3]
    fire = (rgb[:, :, 0] > 170) & (rgb[:, :, 1] > 60) & (rgb[:, :, 2] < 120)
    teal = (rgb[:, :, 1] > rgb[:, :, 0] + 30) & (rgb[:, :, 2] > rgb[:, :, 0] + 20)
    body = (alpha > 32) & ~fire & ~teal
    if not body.any():
        body = alpha > 32
    ys, _ = np.nonzero(body)
    return int(ys.max() - ys.min() + 1)


def rescale_to(images, k):
    """Resize a whole sheet about her feet, so the ground line does not move."""
    out = []
    for im in images:
        a = np.asarray(im)
        ys, _ = np.nonzero(a[:, :, 3] > 32)
        foot = int(ys.max())
        small = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))),
                          Image.LANCZOS)
        b = np.asarray(small)
        ys2, _ = np.nonzero(b[:, :, 3] > 32)
        canvas = Image.new("RGBA", im.size, (0, 0, 0, 0))
        canvas.paste(small, ((im.width - small.width) // 2, foot - int(ys2.max())))
        out.append(canvas)
    return out


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
    ap.add_argument("--sheet-scale", action="append", default=[], metavar="DIR=PCT",
                    help="resize one sheet by hand, e.g. 'out/x/frames=91'. For the case "
                         "--match-scale cannot express: when the copied poses did not come "
                         "back and the sheets disagree about her size, so which pair to "
                         "believe is a judgement rather than a measurement")
    ap.add_argument("--match-scale", action="store_true",
                    help="resize later sheets so she is the same height on all of "
                         "them; for when the duplicated attachment pose came back "
                         "at the wrong size and the sheets no longer agree")
    args = ap.parse_args()

    sheets, dropped = [], {}
    for d in args.dirs:
        found = sorted(glob.glob(os.path.join(d, "*.png")))
        if not found:
            raise SystemExit(f"no PNGs in {d}")
        if d in args.skip_first:
            # Keep the discarded duplicate: it is the one drawing the two
            # sheets have in common, which makes it the only exact measurement
            # of how far their scales have drifted.
            dropped[d] = Image.open(found[0]).convert("RGBA")
            found = found[1:]
        sheets.append((d, [Image.open(p).convert("RGBA") for p in found]))

    # The one drawing repeated between two sheets is the only thing carrying
    # scale from one to the next, and it is the instruction the generator
    # ignores most often: twice in a row a second sheet came back with a pose
    # that was similar rather than copied, and 6 to 9 per cent larger with it.
    # Her standing height is measurable on both, so the correction is too, and
    # doing it here beats working the percentage out by hand every time.
    if args.match_scale:
        # Two ways to measure the drift, and which is right depends on whether
        # she stays the same height through the animation.
        #
        # The overlap pose is the better one wherever it exists: the last
        # drawing of one sheet and the first of the next are meant to be the
        # same drawing, so their heights are directly comparable and the ratio
        # is exact. It also survives an animation where she genuinely changes
        # height — a stagger that ends in a crouch runs 374px to 223px inside
        # one sheet, and a median taken across that measures the crouch, not
        # the drift.
        #
        # Falling back to the median is for sheets joined without an overlap,
        # where there is nothing else to compare -- and that fallback is taken
        # against the first sheet rather than the one immediately before.
        #
        # A median only compares two sheets that show her in comparable poses,
        # so it is an approximation, and chaining it multiplies every pose
        # difference along the way into every sheet after it. The attack is the
        # case: its strike sheet medians 328px because she spends all eight
        # drawings lunging, and a flourish sized against that comes out 5%
        # short of the guard it has to loop back into. Measured against the
        # first sheet -- the one that set the scale, and the one holding her
        # neutral stance because it is where the animation starts -- it lands
        # within half a percent of the same figure taken pose against pose.
        #
        # An exact ratio loses nothing by being composed, so the overlap path
        # still chains; only the approximation refuses to.
        drops = set(args.skip_first)
        base = sheets[0][1]
        factor, prev = [1.0], base
        for i in range(1, len(sheets)):
            d, imgs = sheets[i]
            if d in drops and dropped[d] is not None:
                a, b = pose_height(prev[-1]), pose_height(dropped[d])
                k = (a / b) if b else 1.0
                factor.append(factor[-1] * k)
                how = f"overlap pose {a}px against {b}px"
            else:
                a, b = standing_height(base), standing_height(imgs)
                k = (a / b) if b else 1.0
                factor.append(k)
                how = f"median height {a:.0f}px against {b:.0f}px, on the first sheet"
            # Every sheet's frames live in a directory called "frames", so the
            # basename alone names none of them.
            tail = os.path.basename(os.path.dirname(d.rstrip('/'))) or d
            print(f"  {tail}: {how} -> scaled {factor[-1] * 100:.1f}%")
            prev = imgs
        for i, ((d, imgs), k) in enumerate(zip(sheets, factor)):
            if abs(k - 1.0) > 0.005:
                sheets[i] = (d, rescale_to(imgs, k))

    # Applied after --match-scale so the two can be combined: measure what can be
    # measured, then correct by hand the sheets that had nothing to measure against.
    manual = {}
    for spec in args.sheet_scale:
        d, _, pct = spec.rpartition("=")
        if not d or not pct:
            raise SystemExit(f"--sheet-scale wants DIR=PCT, got {spec!r}")
        manual[d] = float(pct) / 100.0
    for i, (d, imgs) in enumerate(sheets):
        k = manual.get(d)
        if k and abs(k - 1.0) > 0.005:
            tail = os.path.basename(os.path.dirname(d.rstrip('/'))) or d
            print(f"  {tail}: set by hand -> {k * 100:.1f}%")
            sheets[i] = (d, rescale_to(imgs, k))
    unknown = set(manual) - {d for d, _ in sheets}
    if unknown:
        raise SystemExit(f"--sheet-scale names directories that are not being merged: "
                         f"{', '.join(sorted(unknown))}")

    poses = [im for _, imgs in sheets for im in imgs]

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
