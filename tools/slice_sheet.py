#!/usr/bin/env python3
"""Slice a sprite sheet into aligned animation frames.

The sheet this was written for is an AI-generated character sheet: a flat
grey background, one animation per row, and frames that are *not* on a tidy
uniform grid. So frames are found by segmenting the foreground rather than by
assuming a fixed cell size, then re-aligned on the character's feet so the
sprite does not jitter during playback.

Outputs (in --outdir):
  frames/rowN_MM.png   trimmed, padded, feet-aligned frames
  frames.json          frame rects in sheet space + normalized canvas info
  rowN.gif             one animated GIF per row
  rowN.webp            same, animated WebP (smaller, keeps alpha cleanly)
"""

import argparse
import json
import os
from collections import Counter

import numpy as np
from PIL import Image


def load_sheet(path):
    return Image.open(path).convert("RGBA")


def background_color(rgb, probe=8):
    """Most common colour among the sheet's corner patches."""
    h, w, _ = rgb.shape
    patches = [
        rgb[:probe, :probe], rgb[:probe, w - probe:],
        rgb[h - probe:, :probe], rgb[h - probe:, w - probe:],
    ]
    pixels = np.concatenate([p.reshape(-1, 3) for p in patches])
    return np.array(Counter(map(tuple, pixels)).most_common(1)[0][0], dtype=np.int16)


def foreground_mask(rgb, bg, tol):
    """True where the pixel is meaningfully different from the sheet background."""
    return np.abs(rgb.astype(np.int16) - bg).max(axis=2) > tol


def outside(free):
    """Background pixels reachable from the sheet edge, 4-connected.

    A plain colour key is not enough: mid-grey shading on the face and hoodie
    sits within tolerance of the background, so keying by colour alone punches
    holes through the character. Only background that connects to the sheet
    edge is really background.

    Propagation runs a run at a time — every same-colour run in a scanline is
    reached at once — alternating rows and columns until nothing new is found.
    """
    h, w = free.shape
    reach = np.zeros_like(free)
    reach[0, :] = reach[-1, :] = reach[:, 0] = reach[:, -1] = True
    reach &= free

    def sweep(free_ax, reach_ax):
        # Runs of free pixels along each row share an id, so a single bincount
        # tells us which runs contain an already-reached pixel — the whole run
        # is then reached at once.
        ids = np.cumsum(~free_ax, axis=1)
        ids = ids + (np.arange(ids.shape[0])[:, None] * (int(ids.max()) + 1))
        hit = np.bincount(ids[free_ax], weights=reach_ax[free_ax],
                          minlength=int(ids.max()) + 1) > 0
        return free_ax & hit[ids]

    for _ in range(64):
        grown = sweep(free, reach)
        grown = sweep(free.T, grown.T).T
        if grown.sum() == reach.sum():
            break
        reach = grown
    return reach


def bands(occupied, min_size, min_gap):
    """Split a 1-D occupancy profile into runs of True, merging short gaps."""
    runs, start = [], None
    for i, v in enumerate(occupied):
        if v and start is None:
            start = i
        elif not v and start is not None:
            runs.append((start, i))
            start = None
    if start is not None:
        runs.append((start, len(occupied)))

    merged = []
    for run in runs:
        if merged and run[0] - merged[-1][1] < min_gap:
            merged[-1] = (merged[-1][0], run[1])
        else:
            merged.append(run)
    return [r for r in merged if r[1] - r[0] >= min_size]


def find_frames(mask, rows=None, cols=None, min_gap=4, min_size=16, noise=2):
    """Return [[(x0, y0, x1, y1), ...], ...] — one list of frame rects per row."""
    h, w = mask.shape

    if rows:
        edges = [round(i * h / rows) for i in range(rows + 1)]
        row_bands = list(zip(edges[:-1], edges[1:]))
    else:
        row_bands = bands(mask.sum(axis=1) > noise, min_size, min_gap)

    out = []
    for y0, y1 in row_bands:
        strip = mask[y0:y1]
        if cols:
            edges = [round(x0) for x0 in np.linspace(0, w, cols + 1)]
            col_bands = list(zip(edges[:-1], edges[1:]))
        else:
            col_bands = bands(strip.sum(axis=0) > noise, min_size, min_gap)

        rects = []
        for x0, x1 in col_bands:
            cell = strip[:, x0:x1]
            ys, xs = np.nonzero(cell)
            if not len(ys):
                continue
            # Tighten to the sprite's own ink, not the cell it happened to land in.
            rects.append((x0 + int(xs.min()), y0 + int(ys.min()),
                          x0 + int(xs.max()) + 1, y0 + int(ys.min()) + int(ys.max() - ys.min()) + 1))
        if rects:
            out.append(rects)
    return out


def feet_anchor(mask, rect):
    """(x, y) the frame is aligned on: horizontal centre of the lowest 12% of ink."""
    x0, y0, x1, y1 = rect
    sub = mask[y0:y1, x0:x1]
    hgt = sub.shape[0]
    foot = sub[int(hgt * 0.88):]
    xs = np.nonzero(foot.any(axis=0))[0]
    if not len(xs):
        xs = np.nonzero(sub.any(axis=0))[0]
    return float(xs.mean()), float(hgt)


def cut_frames(sheet, mask, alpha, rects, transparent, pad):
    """Crop each rect onto a shared canvas, registered on the feet anchor."""
    anchors = [feet_anchor(mask, r) for r in rects]
    widths = [r[2] - r[0] for r in rects]
    heights = [r[3] - r[1] for r in rects]

    left = max(a[0] for a in anchors)
    right = max(w - a[0] for w, a in zip(widths, anchors))
    cw = int(np.ceil(left + right)) + pad * 2
    ch = max(heights) + pad * 2

    frames, offsets = [], []
    for rect, (ax, ay) in zip(rects, anchors):
        crop = sheet.crop(rect)
        if transparent:
            crop = crop.copy()
            sub = alpha[rect[1]:rect[3], rect[0]:rect[2]]
            crop.putalpha(Image.fromarray((sub * 255).astype(np.uint8), "L"))
        dx, dy = int(round(left - ax)) + pad, int(ch - pad - ay)
        canvas = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
        canvas.paste(crop, (dx, dy), crop)
        frames.append(canvas)
        offsets.append((dx, dy))
    return frames, offsets


def save_animation(frames, path, fps, bg=None):
    dur = max(20, int(round(1000 / fps)))
    if path.endswith(".gif"):
        flat = []
        for f in frames:
            plate = Image.new("RGBA", f.size, tuple(bg) + (255,) if bg is not None else (0, 0, 0, 0))
            flat.append(Image.alpha_composite(plate, f).convert("P", palette=Image.ADAPTIVE))
        flat[0].save(path, save_all=True, append_images=flat[1:], duration=dur, loop=0, disposal=2)
    else:
        frames[0].save(path, save_all=True, append_images=frames[1:], duration=dur, loop=0)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("sheet")
    ap.add_argument("-o", "--outdir", default="out")
    ap.add_argument("--rows", type=int, help="force N equal rows instead of detecting them")
    ap.add_argument("--cols", type=int, help="force N equal columns per row instead of detecting them")
    ap.add_argument("--fps", type=float, default=10.0)
    ap.add_argument("--names", help="comma-separated name per row, e.g. idle,attack,walk")
    ap.add_argument("--tol", type=int, default=24, help="background colour tolerance (0-255)")
    ap.add_argument("--pad", type=int, default=4)
    ap.add_argument("--min-gap", type=int, default=4, help="smallest background gap that splits frames")
    ap.add_argument("--min-size", type=int, default=16, help="smallest accepted frame width/height")
    ap.add_argument("--opaque", action="store_true", help="keep the sheet background instead of cutting it out")
    args = ap.parse_args()

    sheet = load_sheet(args.sheet)
    rgb = np.array(sheet)[:, :, :3]
    bg = background_color(rgb)
    mask = foreground_mask(rgb, bg, args.tol)

    alpha = ~outside(~mask)

    rows = find_frames(mask, args.rows, args.cols, args.min_gap, args.min_size)
    if not rows:
        raise SystemExit("no frames found — try a larger --tol or pass --rows/--cols")

    os.makedirs(os.path.join(args.outdir, "frames"), exist_ok=True)

    keyed = sheet.copy()
    keyed.putalpha(Image.fromarray((alpha * 255).astype(np.uint8), "L"))
    keyed.save(os.path.join(args.outdir, "sheet_keyed.png"))
    manifest = {"sheet": os.path.basename(args.sheet), "size": list(sheet.size),
                "background": [int(c) for c in bg], "fps": args.fps,
                "keyed_sheet": "sheet_keyed.png", "rows": []}

    names = args.names.split(",") if args.names else []
    names += [f"row{i}" for i in range(len(names) + 1, len(rows) + 1)]

    for ri, (name, rects) in enumerate(zip(names, rows), 1):
        frames, offsets = cut_frames(sheet, mask, alpha, rects, not args.opaque, args.pad)
        for fi, frame in enumerate(frames, 1):
            frame.save(os.path.join(args.outdir, "frames", f"{name}_{fi:02d}.png"))
        save_animation(frames, os.path.join(args.outdir, f"{name}.gif"), args.fps, bg)
        save_animation(frames, os.path.join(args.outdir, f"{name}.webp"), args.fps)
        manifest["rows"].append({
            "name": name,
            "canvas": list(frames[0].size),
            # dx/dy place the rect inside `canvas` so every frame lands on the same feet anchor.
            "frames": [{"x": r[0], "y": r[1], "w": r[2] - r[0], "h": r[3] - r[1], "dx": d[0], "dy": d[1]}
                       for r, d in zip(rects, offsets)],
        })
        print(f"{name}: {len(rects)} frames -> {args.outdir}/{name}.gif")

    with open(os.path.join(args.outdir, "frames.json"), "w") as fh:
        json.dump(manifest, fh, indent=2)
    print(f"manifest -> {args.outdir}/frames.json")


if __name__ == "__main__":
    main()
