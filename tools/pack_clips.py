#!/usr/bin/env python3
"""Put finished clips onto one shared canvas, and pack them into one atlas.

Each clip comes out of the assembler on a canvas of its own, sized to whatever
that particular animation needed. Inside a clip that is right and the frames
line up to within a pixel or two. Between clips it is wrong: the idle, the hit
and the attack ended up 436x431, 459x378 and 485x385, with her feet 8, 12 and
16 pixels off the bottom and her centre line at 51%, 46% and 64% of the width.
Play one after another and she jumps the moment the clip changes.

So the clips are registered to each other here. Note the unit: a *clip* is
moved, not a frame. Frames inside a clip are already registered, and some of
what looks like drift is deliberate -- the lunge in the attack, the knockback
in the hit -- so every frame of a clip takes the same offset and the motion
inside it survives intact.

The other thing this fixes is that a played frame is not a drawing. A pose held
nine frames is written out nine times, so about 70% of every strip is the same
image repeated. Here identical frames are stored once and the timing becomes a
list of indices, which is what a playback loop wants anyway.
"""

import argparse
import glob
import hashlib
import json
import os

import numpy as np
from PIL import Image


def ground(im):
    """Where a frame stands: the centre of her boots, and the floor under them.

    The horizontal measurement is the assembler's own: the desaturated pixels of
    the lower body, so streaming hair -- the most mobile thing on her -- does not
    vote on where her feet are. The vertical one is the lowest of those same
    pixels, which is the sole of the lower boot.
    """
    a = np.array(im)
    rgb = a[:, :, :3].astype(np.int16)
    mx, mn = rgb.max(axis=2), rgb.min(axis=2)
    sat = np.where(mx > 0, (mx - mn) * 255 // np.maximum(mx, 1), 0)
    core = (a[:, :, 3] > 0) & (sat < 70)
    core[:int(core.shape[0] * 0.55)] = False
    ys, xs = np.nonzero(core)
    if not len(xs):
        return im.width / 2.0, im.height - 1
    return float(xs.mean()), int(ys.max())


def body_area(im):
    """How much of a frame is HER, with effects masked out.

    Used as the measure of how large she is DRAWN, and area is the right
    measure rather than height. Height is a property of the pose: she is 325px
    tall through the dodge because she spends it crouched and 603px through the
    slipping idle because she spends it upright, and normalising on that would
    make her grow every time she stood up. Area barely moves when a limb folds
    -- measured across these clips, the spread of sqrt(area) WITHIN a clip is
    under 6% where height varies by 17% -- so it tracks the drawing scale and
    not the choreography.

    Fire and the blade's teal are excluded for the same reason the anchor
    excludes them: an effect can be larger than she is and would set the number
    instead of her.
    """
    a = np.asarray(im)
    rgb, alpha = a[:, :, :3].astype(np.int16), a[:, :, 3]
    fire = (rgb[:, :, 0] > 170) & (rgb[:, :, 1] > 60) & (rgb[:, :, 2] < 120)
    teal = (rgb[:, :, 1] > rgb[:, :, 0] + 30) & (rgb[:, :, 2] > rgb[:, :, 0] + 20)
    body = (alpha > 32) & ~fire & ~teal
    return int(body.sum()) or int((alpha > 32).sum())


def clip_scale(images):
    """One number for how large she is drawn in this clip.

    The median of the FIRST THREE frames, not of all of them, and the reason is
    that some clips stop containing the character. The death animation ends as
    a pile of ash: taken over the whole clip its median reads 235 where her
    standing drawings measure 257 to 294, so it would be scaled up by 12% to
    make the ASH the right size. The cyberpsychosis idle fails the other way --
    its coloured copies add area from the third drawing on, and a high
    percentile reads 392 against a real 321.

    Almost every clip here opens on her reference guard, before anything has
    happened to her, which makes the opening frames the most comparable thing
    across clips: measured that way the cross-clip spread is 1.60x against
    1.67x on the full median, so it is also the tighter measure. Three frames
    rather than one, so a single odd drawing cannot set a whole clip.
    """
    head = images[:3] if len(images) >= 3 else images
    return float(np.median([np.sqrt(body_area(im)) for im in head]))


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("clips", nargs="+",
                    help="clip directories, each holding <name>_frames/ and <name>.json")
    ap.add_argument("-o", "--outdir", default="out/atlas")
    ap.add_argument("-n", "--name", default="dahlia")
    ap.add_argument("--margin", type=int, default=8,
                    help="clear pixels kept on every side of the shared canvas")
    ap.add_argument("--cols", type=int, default=0,
                    help="cells per row; 0 picks a roughly square sheet")
    ap.add_argument("--role", action="append", default=[], metavar="DIR=ROLE",
                    help="name a clip by what it IS rather than whose it is, e.g. "
                         "'out/dahlia_twirl=idle'. With more than one character in a "
                         "tracker the player has to ask for 'the hit', not for "
                         "'dahlia_hit', so the roles are what the manifest carries")
    ap.add_argument("--scale-like", action="append", default=[], metavar="DIR=OTHER",
                    help="this clip CONTINUES FROM the end of another one, so size its "
                         "first frame to match that one's last instead of measuring it "
                         "as a character. For the ash loop, which carries on from where "
                         "the death animation stops: 'out/dahlia_ashes=out/dahlia_death'")
    ap.add_argument("--match-scale", action="store_true",
                    help="resize each clip so she is drawn the same size in all of "
                         "them. Registering position is not enough on its own: the "
                         "sheets behind different clips came back at very different "
                         "scales, and she jumped 67%% larger the moment the panel "
                         "switched to a newer clip. The target is the MEDIAN clip")
    ap.add_argument("--scale", type=float, default=1.0,
                    help="resize every cell; 0.5 halves the atlas for the web, where "
                         "she is displayed small anyway")
    ap.add_argument("--format", choices=("png", "webp"), default="png",
                    help="webp is a still image here, not an animation -- same pixels "
                         "at a third of the bytes, and a browser reads it either way")
    ap.add_argument("--preview", action="store_true",
                    help="also write a webp playing every clip back to back, which "
                         "is what shows whether she holds still across the joins")
    ap.add_argument("--preview-scale", type=float, default=0.5)
    args = ap.parse_args()

    roles = {}
    for spec in args.role:
        d, _, r = spec.rpartition("=")
        if not d or not r:
            raise SystemExit(f"--role wants DIR=ROLE, got {spec!r}")
        roles[d.rstrip("/")] = r

    clips = []
    for d in args.clips:
        name = os.path.basename(d.rstrip("/"))
        meta_path = os.path.join(d, f"{name}.json")
        frames = sorted(glob.glob(os.path.join(d, f"{name}_frames", "*.png")))
        if not frames:
            raise SystemExit(f"{d}: no played frames in {name}_frames/")
        meta = json.load(open(meta_path, encoding="utf-8")) if os.path.exists(meta_path) else {}
        images = [Image.open(p).convert("RGBA") for p in frames]
        clips.append({"name": roles.get(d.rstrip("/"), name), "images": images,
                      "dir": d.rstrip("/"), "fps": meta.get("fps", 24)})

    if args.match_scale:
        # Measured before anything is moved, and applied before the anchor is
        # taken, so the feet still land together afterwards.
        for c in clips:
            c["measure"] = clip_scale(c["images"])

        # THE MEDIAN CLIP, not the smallest. Taking the minimum let a single
        # clip that happened to be drawn small decide the size of the whole
        # cast, and it moved every time a new clip came in under the old floor.
        # The median is decided by the middle of the set instead, so one odd
        # sheet cannot drag everything down with it.
        #
        # The reason the minimum was chosen originally was to guarantee nothing
        # is ever enlarged, and that guarantee survives anyway because --scale
        # runs afterwards: a clip's NET factor is (target / measure) * scale,
        # and at 0.75 nothing here reaches 1.0. It is checked rather than
        # assumed -- the warning below fires if a clip really would be blown up.
        target = float(np.median([c["measure"] for c in clips]))

        # A clip that does not contain the character cannot be measured as one.
        # The ash loop is the whole of her that is left after the Kindle-Shell,
        # and asking how big "she" is in it returns the size of a pile -- which
        # the median then tried to enlarge by 61% to make it person-sized.
        #
        # So a clip can instead be sized to CONTINUE from another: its first
        # drawing is matched to that clip's last, after that clip's own factor
        # is settled. The ash in the loop then lands exactly on the ash the
        # death animation stopped at, which is the only relationship that
        # actually matters between the two.
        by_dir = {c["dir"]: c for c in clips}
        follow = {}
        for spec in args.scale_like:
            d, _, o = spec.rpartition("=")
            d, o = d.rstrip("/"), o.rstrip("/")
            if d not in by_dir or o not in by_dir:
                raise SystemExit(f"--scale-like names a directory that is not "
                                 f"being packed: {spec!r}")
            follow[d] = o
        for d, o in follow.items():
            this, other = by_dir[d], by_dir[o]
            if other["dir"] in follow:
                raise SystemExit("--scale-like cannot chain: "
                                 f"{o} is itself following another clip")
            k_other = target / other["measure"]
            head = np.sqrt(body_area(this["images"][0]))
            tail = np.sqrt(body_area(other["images"][-1]))
            # measure = target / factor, so store the measure that yields it
            this["measure"] = target / (k_other * tail / head) if head else this["measure"]
            print(f"  {this['name']:<12s} sized to continue from {other['name']}")
        blown = [c["name"] for c in clips
                 if (target / c["measure"]) * args.scale > 1.0]
        if blown:
            print(f"  note: {', '.join(blown)} would be enlarged past its own "
                  f"resolution at --scale {args.scale}")
        for c in clips:
            k = target / c["measure"]
            if abs(k - 1.0) < 0.005:
                print(f"  {c['name']:<12s} already at scale")
                continue
            c["images"] = [im.resize((max(1, round(im.width * k)),
                                      max(1, round(im.height * k))), Image.LANCZOS)
                           for im in c["images"]]
            print(f"  {c['name']:<12s} scaled {100 * k:.1f}%")

    for c in clips:
        # The clip's own origin is taken from its first frame, because that is
        # the drawing it cuts in on and the one that has to agree with every
        # other clip's first drawing.
        c["gx"], c["gy"] = ground(c["images"][0])

    unknown = set(roles) - {d.rstrip("/") for d in args.clips}
    if unknown:
        raise SystemExit(f"--role names directories that are not being packed: "
                         f"{', '.join(sorted(unknown))}")

    # One canvas that fits every clip once each is hung on the shared anchor.
    ax = max(c["gx"] for c in clips)
    ay = max(c["gy"] for c in clips)
    w = int(round(ax + max(c["images"][0].width - c["gx"] for c in clips))) + 2 * args.margin
    h = int(round(ay + max(c["images"][0].height - c["gy"] for c in clips))) + 2 * args.margin
    ax, ay = ax + args.margin, ay + args.margin

    # Identical frames are stored once. Hashing the pixels rather than comparing
    # poses is what catches the near-duplicates too: a pose held under a decaying
    # shake produces frames that differ, and they are kept, while a pose held
    # still produces one image and it is kept once.
    cells, index, timeline = [], {}, {}
    for c in clips:
        ox, oy = int(round(ax - c["gx"])), int(round(ay - c["gy"]))
        seq = []
        for im in c["images"]:
            canvas = Image.new("RGBA", (w, h), (0, 0, 0, 0))
            canvas.alpha_composite(im, (ox, oy))
            key = hashlib.sha1(canvas.tobytes()).digest()
            if key not in index:
                index[key] = len(cells)
                cells.append(canvas)
            seq.append(index[key])
        timeline[c["name"]] = {"fps": c["fps"], "frames": seq,
                               "seconds": round(len(seq) / c["fps"], 3)}

    if args.scale != 1.0:
        w, h = max(1, round(w * args.scale)), max(1, round(h * args.scale))
        ax, ay = ax * args.scale, ay * args.scale
        cells = [c.resize((w, h), Image.LANCZOS) for c in cells]

    cols = args.cols or max(1, int(np.ceil(np.sqrt(len(cells)))))
    rows = (len(cells) + cols - 1) // cols
    sheet = Image.new("RGBA", (cols * w, rows * h), (0, 0, 0, 0))
    for i, cell in enumerate(cells):
        sheet.paste(cell, ((i % cols) * w, (i // cols) * h))

    os.makedirs(args.outdir, exist_ok=True)
    png = f"{args.name}_atlas.{args.format}"
    if args.format == "webp":
        sheet.save(os.path.join(args.outdir, png), quality=90, method=6)
    else:
        sheet.save(os.path.join(args.outdir, png), optimize=True)
    with open(os.path.join(args.outdir, f"{args.name}_atlas.json"), "w", encoding="utf-8") as fh:
        json.dump({"image": png, "cell": [w, h], "cols": cols, "rows": rows,
                   "cells": len(cells),
                   # Everything a playback loop needs to put her in the right
                   # place: her feet land here in every cell of every clip.
                   "anchor": [round(ax, 1), round(ay, 1)],
                   "clips": timeline}, fh, indent=1)

    if args.preview:
        # Played end to end, a clip change is the only place she can jump, and
        # a still figure at the joins is the whole claim this tool makes.
        seq = [cells[i] for t in timeline.values() for i in t["frames"]]
        k = args.preview_scale
        if k != 1.0:
            seq = [f.resize((max(1, round(w * k)), max(1, round(h * k))),
                            Image.LANCZOS) for f in seq]
        fps = clips[0]["fps"]
        out = os.path.join(args.outdir, f"{args.name}_all.webp")
        seq[0].save(out, save_all=True, append_images=seq[1:],
                    duration=round(1000 / fps), loop=0, quality=92)
        print(f"  {out}  ({len(seq)} frames, every clip in a row)")

    played = sum(len(t["frames"]) for t in timeline.values())
    print(f"{len(clips)} clips, {played} played frames -> {len(cells)} cells "
          f"({(1 - len(cells) / played) * 100:.0f}% were repeats)")
    print(f"  shared canvas {w}x{h}, her feet at {ax:.0f},{ay:.0f} in every one")
    print(f"  {os.path.join(args.outdir, png)}  ({cols}x{rows} cells, "
          f"{os.path.getsize(os.path.join(args.outdir, png)) / 1e6:.1f} MB)")
    for n, t in timeline.items():
        print(f"  {n:16s} {len(t['frames']):3d} frames @ {t['fps']}fps  {t['seconds']}s")


if __name__ == "__main__":
    main()
