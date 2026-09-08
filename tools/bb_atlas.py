#!/usr/bin/env python3
"""Pack a character's animation clips into one sprite atlas + manifest.

WHY THIS EXISTS. Sprites must not live inside BLACKBOX_MERC_OS.html. Base64
costs a third again in bytes, and every one of those bytes is parsed as part of
the document on every open -- an external image is decoded lazily by the image
pipeline and cached. The tracker is already 5.6 MB with only 1.19 MB of art in
it; embedding a character's worth of frames is how a file stops being editable.

WHY AN ATLAS RATHER THAN THE ANIMATED WebP FILES. An animated WebP in an <img>
cannot be driven: it starts when it loads, loops until the element is gone, and
tells script nothing. The feed needs clips that run once, interrupt, and report
completion, so frames are drawn one at a time out of a packed sheet instead.
This is the same contract web/dahlia-sprite.js already plays, and the manifest
written here is that same schema, so the existing player runs it unmodified.

WHAT IT COSTS. An atlas is a single still image: it gets no inter-frame
compression, so it is larger than the sum of the animated files it replaces.
That is the price of being able to control playback, and it is paid once per
character in a file the browser caches.

TIMING. Clips carry irregular per-frame durations -- an impact frame held at
55 ms next to a settle at 240 ms. The manifest expresses that the way the
player reads it: a fixed fps, with each frame repeated for as many slots as its
duration covers. Nothing is resampled and no frame is dropped; a frame shorter
than one slot still gets one.

REGISTRATION. Every frame of a clip is shifted by the SAME offset, computed
from that clip's own content across all its frames, and seated bottom-centre in
the cell. Per-frame centring would be wrong: it would cancel the very motion
the clip is made of, sliding him back under his own lunge.

    python3 tools/bb_atlas.py --name vergil --map vergil_clips.json --out web/

The map file is {"clips": {"<role>": {"src": "<path>", "scale": 1.0}, ...}}.
Roles the tracker's feed knows: idle hit attack block dodge counter taunt
slipping fractured spec cyberpsychosis down death dead soul rev grab throw
ragdoll recover staggered ritualized crowned. Anything else packs fine and sits
unused until something calls for it.
"""
import argparse, hashlib, json, math, os, sys
from PIL import Image
import numpy as np

MAXDIM = 16383          # WebP's hard limit on either axis


def read_clip(path):
    """Frames as RGBA arrays plus the per-frame durations, in order."""
    im = Image.open(path)
    frames, durs = [], []
    for i in range(getattr(im, "n_frames", 1)):
        im.seek(i)
        im.load()                       # duration is only filled in after decode
        durs.append(int(im.info.get("duration", 100)))
        frames.append(np.asarray(im.convert("RGBA")))
    return frames, durs


def bbox_of(frames, thresh=12):
    """Union of every frame's content -- the clip's footprint."""
    x0 = y0 = 10 ** 9
    x1 = y1 = -1
    for f in frames:
        ys, xs = np.where(f[..., 3] > thresh)
        if len(xs) == 0:
            continue
        x0 = min(x0, int(xs.min())); x1 = max(x1, int(xs.max()))
        y0 = min(y0, int(ys.min())); y1 = max(y1, int(ys.max()))
    if x1 < 0:
        raise SystemExit("a clip is entirely transparent")
    return x0, y0, x1, y1


def slots(durations, fps):
    """Duration in ms -> whole frames at fps, never fewer than one."""
    step = 1000.0 / fps
    out, carry = [], 0.0
    for d in durations:
        want = d / step + carry
        n = max(1, int(round(want)))
        carry = want - n                # keep the clip's total length honest
        out.append(n)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--name", required=True, help="character key, e.g. vergil")
    ap.add_argument("--map", required=True, help="JSON map of role -> source clip")
    ap.add_argument("--out", default="web", help="directory to write into")
    ap.add_argument("--fps", type=int, default=30)
    ap.add_argument("--quality", type=int, default=90)
    ap.add_argument("--pad", type=int, default=4, help="transparent margin per cell")
    ap.add_argument("--cell-h", type=int, default=192,
                    help="target cell height; every clip is scaled to fit it. "
                         "0 keeps the source size. A unit token is 5.4-8.2%% of "
                         "a stage that caps at 780px tall on a 12x8 grid, so it "
                         "draws at roughly 63-96px: 192 is already 2x headroom "
                         "for a retina screen, and the art is otherwise five to "
                         "seven times larger than it will ever be shown.")
    ap.add_argument("--lossless", action="store_true")
    args = ap.parse_args()

    spec = json.load(open(args.map))["clips"]
    root = os.path.dirname(os.path.abspath(args.map))

    # ---- read every clip, work out where its content sits -------------------
    clips = {}
    for role, entry in spec.items():
        src = entry["src"] if os.path.isabs(entry["src"]) else os.path.join(root, entry["src"])
        if not os.path.exists(src):
            raise SystemExit(f"{role}: no such file {src}")
        frames, durs = read_clip(src)
        scale = float(entry.get("scale", 1.0))
        if scale != 1.0:
            frames = [np.asarray(Image.fromarray(f).resize(
                (max(1, round(f.shape[1] * scale)), max(1, round(f.shape[0] * scale))),
                Image.LANCZOS)) for f in frames]
        clips[role] = dict(frames=frames, durs=durs, bbox=bbox_of(frames),
                           src=os.path.basename(src))

    # ---- one cell big enough for the widest and tallest footprint -----------
    cw = max(c["bbox"][2] - c["bbox"][0] + 1 for c in clips.values()) + 2 * args.pad
    ch = max(c["bbox"][3] - c["bbox"][1] + 1 for c in clips.values()) + 2 * args.pad

    # An atlas is decoded to raw RGBA and held there. At source size these clips
    # want an 11088x11328 sheet -- 479 MB resident, on a page that already holds
    # another character's. Scaling to the size it is actually drawn at is not a
    # compromise, it is the correct size; everything above it is memory spent on
    # detail no one sees.
    if args.cell_h and ch != args.cell_h:
        s = args.cell_h / float(ch)
        for c in clips.values():
            c["frames"] = [np.asarray(Image.fromarray(f).resize(
                (max(1, round(f.shape[1] * s)), max(1, round(f.shape[0] * s))),
                Image.LANCZOS)) for f in c["frames"]]
            c["bbox"] = bbox_of(c["frames"])
        cw = max(c["bbox"][2] - c["bbox"][0] + 1 for c in clips.values()) + 2 * args.pad
        ch = max(c["bbox"][3] - c["bbox"][1] + 1 for c in clips.values()) + 2 * args.pad
        print(f"scaled every clip by {s:.3f} to a {cw}x{ch} cell")

    # ---- lay every frame into a cell, de-duplicating identical ones ---------
    cells, index = [], {}
    for role, c in clips.items():
        x0, y0, x1, y1 = c["bbox"]
        dx = (cw - (x1 - x0 + 1)) // 2 - x0            # centred on the footprint
        dy = (ch - args.pad) - (y1 + 1)                # seated on the cell floor
        ids = []
        for f in c["frames"]:
            cell = np.zeros((ch, cw, 4), np.uint8)
            sy0, sy1 = max(0, -dy), min(f.shape[0], ch - dy)
            sx0, sx1 = max(0, -dx), min(f.shape[1], cw - dx)
            if sy1 > sy0 and sx1 > sx0:
                cell[sy0 + dy:sy1 + dy, sx0 + dx:sx1 + dx] = f[sy0:sy1, sx0:sx1]
            key = hashlib.sha1(cell.tobytes()).hexdigest()
            if key not in index:
                index[key] = len(cells)
                cells.append(cell)
            ids.append(index[key])
        c["ids"] = ids

    n = len(cells)
    cols = max(1, min(math.ceil(math.sqrt(n)), MAXDIM // cw))
    rows = math.ceil(n / cols)
    if rows * ch > MAXDIM:
        raise SystemExit(f"atlas would be {cols*cw}x{rows*ch}, over WebP's {MAXDIM}px limit")

    sheet = np.zeros((rows * ch, cols * cw, 4), np.uint8)
    for i, cell in enumerate(cells):
        r, c_ = divmod(i, cols)
        sheet[r * ch:(r + 1) * ch, c_ * cw:(c_ + 1) * cw] = cell

    os.makedirs(args.out, exist_ok=True)
    img_name = f"{args.name}_atlas.webp"
    img_path = os.path.join(args.out, img_name)
    kw = dict(lossless=True, method=6) if args.lossless else \
         dict(lossless=False, quality=args.quality, alpha_quality=100, method=6)
    Image.fromarray(sheet).save(img_path, **kw)

    # ---- the manifest, in the schema dahlia-sprite.js already reads ---------
    out_clips, report = {}, []
    for role, c in clips.items():
        reps = slots(c["durs"], args.fps)
        seq = [i for i, k in zip(c["ids"], reps) for _ in range(k)]
        out_clips[role] = dict(fps=float(args.fps), frames=seq,
                               seconds=round(len(seq) / args.fps, 3))
        report.append((role, len(c["frames"]), len(set(c["ids"])),
                       sum(c["durs"]) / 1000.0, len(seq) / args.fps, c["src"]))

    idle = out_clips.get("idle") or next(iter(out_clips.values()))
    tall = max(c["bbox"][3] - c["bbox"][1] + 1 for c in clips.values())
    manifest = dict(image=img_name, cell=[cw, ch], cols=cols, rows=rows, cells=n,
                    unit=round(tall * 0.62, 1),               # rough torso-height ref
                    anchor=[round(cw / 2, 1), round(ch - args.pad, 1)],
                    clips=out_clips)
    json_path = os.path.join(args.out, f"{args.name}_atlas.json")
    json.dump(manifest, open(json_path, "w"), separators=(",", ":"))

    # A file:// page cannot fetch() a local JSON -- Chrome blocks it, and the
    # tracker is opened by double-clicking off a disk. So the same manifest is
    # also written as a script that just assigns it, for inlining or <script src>.
    js_path = os.path.join(args.out, f"{args.name}_atlas.js")
    with open(js_path, "w") as fh:
        fh.write("/* generated by tools/bb_atlas.py -- do not edit by hand */\n"
                 "window.__BB_ATLAS = window.__BB_ATLAS || {};\n"
                 f"window.__BB_ATLAS[{json.dumps(args.name)}] = ")
        json.dump(manifest, fh, separators=(",", ":"))
        fh.write(";\n")

    # ---- verify: every clip must come back out of the atlas unchanged -------
    bad = 0
    for role, c in clips.items():
        for f_i, cid in enumerate(c["ids"]):
            r, c_ = divmod(cid, cols)
            got = sheet[r * ch:(r + 1) * ch, c_ * cw:(c_ + 1) * cw]
            if not np.array_equal(got, cells[cid]):
                print(f"  !! {role} frame {f_i} does not match its cell"); bad += 1
    src_total = sum(os.path.getsize(os.path.join(root, spec[r]["src"]))
                    if not os.path.isabs(spec[r]["src"]) else os.path.getsize(spec[r]["src"])
                    for r in spec)
    print(f"{'clip':16s} {'frames':>6s} {'uniq':>5s} {'source':>8s} {'packed':>8s}  from")
    for role, nf, nu, s0, s1, src in sorted(report):
        flag = "" if abs(s0 - s1) < 0.06 else f"  <- {s1-s0:+.2f}s"
        print(f"{role:16s} {nf:6d} {nu:5d} {s0:7.2f}s {s1:7.2f}s  {src}{flag}")
    print(f"\ncell {cw}x{ch}   grid {cols}x{rows}   {n} unique cells "
          f"({sum(len(c['frames']) for c in clips.values())} frames in, "
          f"{sum(len(c['frames']) for c in clips.values()) - n} deduped)")
    px = cols * cw * rows * ch
    print(f"sheet {cols*cw}x{rows*ch} = {px/1e6:.1f} Mpx, {px*4/1048576:.0f} MB decoded")
    print(f"atlas {os.path.getsize(img_path)/1048576:.2f} MB   "
          f"manifest {os.path.getsize(json_path)/1024:.1f} KB   "
          f"(sources were {src_total/1048576:.2f} MB)")
    print(f"placement check: {'all cells match' if bad == 0 else str(bad)+' MISMATCHES'}")
    print(f"wrote {img_path}\n      {json_path}\n      {js_path}")


if __name__ == "__main__":
    main()
