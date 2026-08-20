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
import shutil
from collections import Counter

import numpy as np
from PIL import Image, ImageFilter


def panel_border_lines(rgb, darkness=90, coverage=0.8, grow=3):
    """Rows and columns occupied by a drawn panel grid.

    Some sheets box each pose in a black frame. The frame is ink, so the
    segmenter reads the whole grid as one connected drawing and finds no gaps to
    split on. Lines are widened to swallow their antialiased edges: one pixel
    left standing still walls the background flood out of the cell, and then
    nothing inside gets keyed at all.
    """
    dark = rgb.max(axis=2) < darkness

    def lines(profile, limit):
        wide = set()
        for i in np.flatnonzero(profile > coverage):
            wide.update(range(max(0, i - grow), min(limit, i + grow + 1)))
        return sorted(wide)

    return lines(dark.mean(axis=1), rgb.shape[0]), lines(dark.mean(axis=0), rgb.shape[1])


def strip_captions(rgb, bg, rows, darkness=90, coverage=0.8):
    """Blank a caption written under each pose on a panelled sheet.

    A labelled reference sheet puts a line of text below every cell. It is ink
    like anything else, so it segments as part of the pose and rides along into
    the animation. The text sits under the figure with a thin blank gap between
    them, and spans the cell far wider than her boots do, so within each row of
    cells the quietest scanline in the bottom third is that gap: everything
    below it is caption and gets painted out. On a sheet with no captions the
    quietest line is already below her feet and nothing is lost.
    """
    ink = np.abs(rgb.astype(np.int16) - bg).max(axis=2) > 14

    marks, bands = sorted(set(rows)), []
    for i in marks:
        if bands and i <= bands[-1][1] + 1:
            bands[-1][1] = i
        else:
            bands.append([i, i])

    edges, cells = [0] + [b[1] + 1 for b in bands], []
    for k, lo in enumerate(edges):
        hi = bands[k][0] if k < len(bands) else rgb.shape[0]
        if hi - lo > 40:
            cells.append((lo, hi))

    out, cut = rgb.copy(), 0
    for lo, hi in cells:
        profile = ink[lo:hi].sum(axis=1)
        start = int(len(profile) * 0.67)
        quietest = start + int(np.argmin(profile[start:]))
        if quietest < len(profile) - 2:
            out[lo + quietest:hi] = bg
            cut += 1
    return out, cut


def flatten_checker(rgb, tol=40):
    """Flatten a transparency checkerboard into one background colour.

    A sheet exported with transparency and then saved as JPEG arrives with the
    editor's checkerboard baked in as pixels: two grey tones in a regular grid.
    Everything downstream assumes one flat background, and against two tones it
    reads half the backdrop as ink.

    The two tones are taken from the colour histogram, and only background
    actually reachable from the sheet edge through them is repainted — so a dark
    boot that happens to sit near one of the tones is never touched. Repainting
    rather than masking keeps the sprite's antialiased fringe meaningful: it
    still shades off toward a background, just a single one now.
    """
    px = rgb.reshape(-1, 3).astype(np.uint32)
    packed = (px[:, 0] << 16) | (px[:, 1] << 8) | px[:, 2]
    vals, counts = np.unique(packed, return_counts=True)

    tones, order = [], np.argsort(counts)[::-1]
    for i in order[:400]:
        v = int(vals[i])
        colour = np.array([(v >> 16) & 255, (v >> 8) & 255, v & 255], dtype=np.int16)
        if colour.max() - colour.min() > 12:          # a tone, not artwork
            continue
        if all(np.abs(colour - t).max() > 24 for t in tones):
            tones.append(colour)
        if len(tones) == 2:
            break
    if len(tones) < 2:
        return rgb, None

    near = np.minimum(*[np.abs(rgb.astype(np.int16) - t).max(axis=2) for t in tones]) < tol
    field = outside(near)
    flat = np.round(np.mean(tones, axis=0)).astype(np.int16)

    out = rgb.copy()
    out[field] = flat
    return out, flat


def load_sheet(path):
    return Image.open(path).convert("RGBA")


def background_color(rgb, probe=8, skip_rows=(), skip_cols=()):
    """Most common colour among the sheet's corner patches.

    On a panelled sheet the corners are the drawn grid rather than the
    background, so those rows and columns are dropped first and the commonest
    colour over everything that remains is used instead.
    """
    if len(skip_rows) or len(skip_cols):
        keep_r = np.setdiff1d(np.arange(rgb.shape[0]), np.asarray(skip_rows, dtype=int))
        keep_c = np.setdiff1d(np.arange(rgb.shape[1]), np.asarray(skip_cols, dtype=int))
        px = rgb[np.ix_(keep_r, keep_c)].reshape(-1, 3).astype(np.uint32)
        packed = (px[:, 0] << 16) | (px[:, 1] << 8) | px[:, 2]
        vals, counts = np.unique(packed, return_counts=True)
        top = int(vals[counts.argmax()])
        return np.array([top >> 16, (top >> 8) & 255, top & 255], dtype=np.int16)

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


def denoise_art(sheet, strength, passes=1, spatial=2, sigma_s=1.6):
    """Take compression grain off flat areas while keeping every drawn line.

    These sheets arrive as JPEGs, so every flat surface carries mottling that no
    amount of careful keying removes — it is in the paint. A median filter
    clears it but cannot tell a speck from a small drawn feature, and on a
    sprite this size it quietly erases the things that carry the performance:
    the mouth first, then the eyes and the hood strings.

    A bilateral filter can tell them apart. Each pixel is averaged only with
    neighbours of similar brightness, so mottling a few levels deep is smoothed
    while anything that differs by more than `strength` — a mouth line against
    skin, an outline against a hoodie — is left alone.

    Strength is deliberately low. Pushed hard the filter does clear more grain,
    but softness is far more noticeable on a sprite than speckle: one pass at 8
    takes 30 % of the mottling for 2 % of the line work, where three passes at
    12 take 63 % but cost 10 %. The art stays sharp and keeps a little grain.
    """
    if strength < 1:
        return sheet

    img = np.array(sheet.convert("RGB")).astype(np.float32)
    for _ in range(max(1, passes)):
        guide = img.mean(axis=2)
        acc = np.zeros_like(img)
        wsum = np.zeros(img.shape[:2], np.float32)
        for dy in range(-spatial, spatial + 1):
            for dx in range(-spatial, spatial + 1):
                near = np.roll(np.roll(img, dy, 0), dx, 1)
                near_guide = np.roll(np.roll(guide, dy, 0), dx, 1)
                w = (np.exp(-(dx * dx + dy * dy) / (2 * sigma_s ** 2)) *
                     np.exp(-((near_guide - guide) ** 2) / (2 * float(strength) ** 2)))
                acc += near * w[:, :, None]
                wsum += w
        img = acc / wsum[:, :, None]

    return Image.fromarray(np.dstack([np.clip(img, 0, 255).astype(np.uint8),
                                      np.array(sheet)[:, :, 3]]))


def label_components(mask):
    """Connected-component labels for a boolean mask, 4-connected.

    Same run-at-a-time propagation as the background flood: every run in a
    scanline takes the highest label it contains, alternating rows and columns
    until the labels stop changing.
    """
    h, w = mask.shape
    lab = np.where(mask, np.arange(mask.size).reshape(h, w), -1)

    def sweep(lab, mask):
        flat_m, flat_l = mask.ravel(), lab.ravel()
        if not flat_m.any():
            return lab
        prev = np.concatenate(([False], flat_m[:-1]))
        row_start = (np.arange(flat_m.size) % mask.shape[1]) == 0
        starts = np.flatnonzero(flat_m & (~prev | row_start))
        seg_max = np.maximum.reduceat(flat_l, starts)
        seg_of = np.searchsorted(starts, np.arange(flat_m.size), "right") - 1
        return np.where(flat_m, seg_max[np.maximum(seg_of, 0)], -1).reshape(mask.shape)

    for _ in range(64):
        grown = sweep(lab, mask)
        grown = sweep(np.ascontiguousarray(grown.T), np.ascontiguousarray(mask.T)).T
        if np.array_equal(grown, lab):
            break
        lab = grown
    return lab


def fill_holes(alpha, radius, max_area=0.02):
    """Close holes punched through a pose by the background flood.

    A drawing with heavy motion blur shades large parts of itself toward the
    background colour, and the soft edge gives the flood a path inward, so it
    walks into the body and hollows it out. Tightening the tolerance does not
    fix it — those pixels really are background-coloured. Instead the mask is
    sealed shut (dilated, then eroded back) so the thin channels the flood came
    through are closed, any transparency that is then cut off from the outside
    is a hole, and those are filled. The original silhouette is kept: only the
    holes are added back, so the outline stays exactly as crisp as it was.
    """
    if radius < 1:
        return alpha

    def shift_or(m):
        return (m | np.roll(m, 1, 0) | np.roll(m, -1, 0) |
                np.roll(m, 1, 1) | np.roll(m, -1, 1))

    sealed = alpha.copy()
    for _ in range(radius):
        sealed = shift_or(sealed)
    for _ in range(radius):
        sealed = ~shift_or(~sealed)

    enclosed = ~sealed & ~outside(~sealed)

    # Only small holes. A ring-shaped effect encloses a big disc of sheet
    # background, and filling that paints the grey backdrop into the middle of
    # the sprite — which is what put a grey card inside the skill's energy
    # ring. Blur-pose holes are blotches; an enclosed backdrop is enormous.
    cap = alpha.size * max_area
    lab = label_components(enclosed)
    ids, counts = np.unique(lab[enclosed], return_counts=True)
    big = ids[counts > cap]
    if len(big):
        enclosed &= ~np.isin(lab, big)
    return alpha | enclosed


def unmatte(rgb, bg, alpha, tol, reach, depth, solidity=0.45):
    """Recover the aura's real colour and give it real transparency.

    Her glow is painted *over* the sheet's grey at partial opacity, so grey is
    baked into every pixel of it: on this sheet the aura averages a muddy tan,
    and keying it out faithfully keeps the mud. Lifted onto a transparent
    background it then reads grey-tan rather than gold.

    Each glow pixel is a mix, P = a*C + (1-a)*grey. Its distance from the grey
    gives the coverage a, and the colour C follows. The result is a glow that is
    genuinely semi-transparent, coloured as it was painted, and fading out
    smoothly instead of ending on a keyed edge.

    Only glow is treated, and the limits matter. Her hair sits 54 levels off the
    background and her skin 74, so a reach that passes either turns the
    character herself translucent — at 90 the whole figure washes out. Reach
    stays below the hair, and the band is additionally capped a fixed distance
    in from the keyed edge, so nothing deep inside her is ever a candidate.
    """
    d = np.abs(rgb.astype(np.int16) - bg).max(axis=2)

    # Glow emits, so it is always brighter than the background it was painted
    # over; her hair is darker than it. That separates the two far better than
    # distance alone, and lets the band run through a whole flame — which is
    # where most of the baked-in grey actually is — while her hair still stops
    # it dead. The white hoodie is brighter still, and too far off to admit.
    lum = rgb.astype(np.float32).mean(axis=2)
    brighter = lum > float(bg.mean()) + 4
    span = np.where(brighter, reach * 2.5, reach)
    soft = d < span

    near_edge = ~alpha
    for _ in range(depth):
        near_edge |= (np.roll(near_edge, 1, 0) | np.roll(near_edge, -1, 0) |
                      np.roll(near_edge, 1, 1) | np.roll(near_edge, -1, 1))
    # Only warm haze needs this. The problem being solved is glow painted over
    # grey reading as tan, and that is a property of her warm gold and red
    # auras; the dagger's cool teal glow has no mud in it and comes out right
    # as drawn. Left in the band it was being made half-transparent, and GIF's
    # one-bit alpha then chewed the blade's soft edge into a stair-stepped
    # crunch. Cool ink stays solid.
    warm = rgb[:, :, 0].astype(np.int16) > rgb[:, :, 2].astype(np.int16) + 10
    band = outside(soft) & alpha & near_edge & warm

    a = np.clip((d.astype(np.float32) - tol) / np.maximum(span - tol, 1), 0, 1)

    # The colour is solved from the true coverage, but the true coverage is not
    # what gets stored: most of a soft glow sits under half-opacity, and GIF's
    # one-bit alpha throws every such pixel away — the aura vanished from the
    # GIFs entirely while surviving in the WebP. A gamma curve lifts the stored
    # alpha so the glow shows in its solved colour on every format, while the
    # very fringe still fades out.
    stored = np.clip(a, 0, 1) ** solidity
    a_solve = np.where(band, a, 1.0) * alpha
    a = np.where(band, stored, 1.0) * alpha

    lifted = rgb.astype(np.float32)
    safe = np.maximum(a_solve, 1e-3)[:, :, None]
    lifted = (lifted - (1 - a_solve)[:, :, None] * bg.astype(np.float32)) / safe
    out = np.where((band & (a_solve > 0))[:, :, None], np.clip(lifted, 0, 255), rgb)
    return out.astype(np.uint8), (a * 255).astype(np.uint8)


def despeckle(alpha, min_size):
    """Drop specks: islands of opaque pixels too small to be drawn detail."""
    if min_size < 2:
        return alpha
    lab = label_components(alpha)
    ids, counts = np.unique(lab[alpha], return_counts=True)
    doomed = set(ids[counts < min_size].tolist())
    if not doomed:
        return alpha
    return alpha & ~np.isin(lab, list(doomed))


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


def frames_from_components(mask, min_px, gap=10):
    """Segment poses by connected ink rather than by gaps in its projection.

    Gap splitting fails as soon as two poses overlap when flattened onto an
    axis — one pose's hair reaching across into the next one's column is enough,
    and a whole row collapses into a single frame. The drawings themselves stay
    separate, so labelling the ink and taking one frame per island is exact
    where projection is only a guess.

    Detached scraps of drawing — the flame wisps — are folded into the nearest
    pose rather than becoming frames of their own.
    """
    lab = label_components(mask)
    flat = lab.ravel()
    sel = np.flatnonzero(flat >= 0)
    labels = flat[sel]
    ys, xs = np.divmod(sel, mask.shape[1])

    order = np.argsort(labels, kind="stable")
    labels, ys, xs = labels[order], ys[order], xs[order]
    starts = np.flatnonzero(np.concatenate(([True], labels[1:] != labels[:-1])))
    sizes = np.diff(np.concatenate((starts, [len(labels)])))
    box = np.stack([np.minimum.reduceat(xs, starts), np.minimum.reduceat(ys, starts),
                    np.maximum.reduceat(xs, starts) + 1, np.maximum.reduceat(ys, starts) + 1], 1)

    poses = [b.tolist() for b, n in zip(box, sizes) if n >= min_px]
    if not poses:
        raise SystemExit("--components found no islands; lower --component-min")

    # A pose drawn with motion blur can come apart into stacked pieces — on the
    # counter sheet the dash frame's legs separate from her body and arrive as a
    # thirteenth pose. Pieces of one figure sit almost on top of each other
    # horizontally, where genuinely neighbouring poses do not overlap at all.
    # Horizontal overlap alone is not enough to act on, though: poses stacked in
    # the same column of a grid overlap just as heavily. What separates the two
    # cases is the size of the result — two pieces of one figure union to about
    # one pose, two whole poses to twice that.
    heights = sorted(p[3] - p[1] for p in poses)
    widths = sorted(p[2] - p[0] for p in poses)
    tall, wide = heights[len(heights) // 2] * 1.35, widths[len(widths) // 2] * 1.35

    merged = True
    while merged and len(poses) > 1:
        merged = False
        for i in range(len(poses)):
            for k in range(i + 1, len(poses)):
                a, b = poses[i], poses[k]
                span = max(0, min(a[2], b[2]) - max(a[0], b[0]))
                if span < 0.5 * min(a[2] - a[0], b[2] - b[0]):
                    continue
                union = [min(a[0], b[0]), min(a[1], b[1]), max(a[2], b[2]), max(a[3], b[3])]
                if union[3] - union[1] > tall or union[2] - union[0] > wide:
                    continue
                poses[i] = union
                poses.pop(k)
                merged = True
                break
            if merged:
                break

    for b, n in zip(box, sizes):
        if n >= min_px:
            continue
        cx, cy = (b[0] + b[2]) / 2, (b[1] + b[3]) / 2
        near = min(poses, key=lambda p: (max(p[0] - cx, 0, cx - p[2]) ** 2 +
                                         max(p[1] - cy, 0, cy - p[3]) ** 2))
        near[0] = min(near[0], int(b[0])); near[1] = min(near[1], int(b[1]))
        near[2] = max(near[2], int(b[2])); near[3] = max(near[3], int(b[3]))

    # Two poses whose hair happens to touch come back as one island twice the
    # width of its neighbours. A wide effect — a burst overflowing its cell —
    # looks the same by width alone, so the test is the ink profile across the
    # island: two figures bridged by a wisp show a deep valley between them,
    # where a continuous effect never thins out. Split on the valley only.
    typical = float(np.median([n for n in sizes if n >= min_px]))
    split = []
    for x0, y0, x1, y1 in [tuple(p) for p in poses]:
        prof = mask[y0:y1, x0:x1].sum(axis=0).astype(float)
        margin = 30
        nonzero = prof[prof > 0]
        if len(prof) < 2 * margin + 10 or not len(nonzero):
            split.append([x0, y0, x1, y1])
            continue
        interior = prof[margin:-margin]
        cut = int(np.argmin(interior)) + margin

        # A valley alone is not enough: a raised arm or a sweep of hair thins
        # the profile inside a single figure too. Both sides also have to carry
        # a figure's worth of ink, judged against the typical island on the
        # sheet, or a pose gets chopped into a pose and a fragment.
        halves = []
        for a, b in ((x0, x0 + cut), (x0 + cut, x1)):
            ys_, xs_ = np.nonzero(mask[y0:y1, a:b])
            halves.append((len(xs_), a, b, ys_, xs_))
        if (prof[cut] < np.median(nonzero) * 0.35
                and all(n > typical * 0.5 for n, *_ in halves)):
            for n, a, b, ys_, xs_ in halves:
                split.append([a + int(xs_.min()), y0 + int(ys_.min()),
                              a + int(xs_.max()) + 1, y0 + int(ys_.max()) + 1])
        else:
            split.append([x0, y0, x1, y1])
    poses = split

    # Reading order: group into rows by vertical position, then left to right.
    heights = sorted(p[3] - p[1] for p in poses)
    tol = heights[len(heights) // 2] / 2
    rows, cur = [], []
    for p in sorted(poses, key=lambda p: (p[1] + p[3]) / 2):
        if cur and (p[1] + p[3]) / 2 - (cur[-1][1] + cur[-1][3]) / 2 > tol:
            rows.append(cur); cur = []
        cur.append(p)
    rows.append(cur)
    ordered = [[tuple(p) for p in sorted(r, key=lambda p: p[0])] for r in rows]

    # Which pose each pixel belongs to. A rect is only a bounding box, so when
    # one pose's effects overflow into a neighbour's cell the crop picks up part
    # of that neighbour — and any panel border inside the box comes too.
    #
    # Ownership follows the ink, not the boxes. Claiming every unowned pixel
    # inside a rect just hands overlapping ink to whichever rect is listed
    # first, which left a neighbour visible in about half the cases. Each
    # island instead goes to the pose whose rect contains its centre, so a
    # figure travels with its own effects and nothing else comes along.
    # Ownership comes from the clustering, not from re-deriving it afterwards.
    # Testing which rect contains an island's centre looks equivalent and is
    # not: where a wide pose's box overlaps its neighbour's, the neighbour's
    # figure lands inside the wrong rect and one frame comes out empty while
    # another holds two characters.
    # Each island goes to the *smallest* rect that contains its centre. Simply
    # taking the first containing rect is not equivalent: where a wide pose's
    # box overlaps a neighbour's, the neighbour's figure falls inside both, and
    # the wide one swallowed it — leaving one frame empty and another holding
    # two characters. The smaller box is always the one the figure belongs to.
    flat_rects = [r for row in ordered for r in row]
    owner = np.zeros(mask.shape, np.int32)
    for lbl, (bx, by, bx1, by1) in zip(np.unique(labels), box):
        cx, cy = (bx + bx1) / 2, (by + by1) / 2
        best, best_area = 0, None
        for n, (x0, y0, x1, y1) in enumerate(flat_rects, 1):
            if x0 <= cx < x1 and y0 <= cy < y1:
                area = (x1 - x0) * (y1 - y0)
                if best_area is None or area < best_area:
                    best, best_area = n, area
        if best:
            owner[lab == lbl] = best
    return ordered, owner


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


def cut_frames(sheet, mask, alpha, rects, transparent, pad, soft=None, owner=None, first=1):
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
            if soft is not None:
                sub = soft[rect[1]:rect[3], rect[0]:rect[2]].copy()
            else:
                sub = (alpha[rect[1]:rect[3], rect[0]:rect[2]] * 255).astype(np.uint8)
            if owner is not None:
                mine = owner[rect[1]:rect[3], rect[0]:rect[2]]
                sub = np.where(mine == first + rects.index(rect), sub, 0)
            crop.putalpha(Image.fromarray(sub, "L"))
        dx, dy = int(round(left - ax)) + pad, int(ch - pad - ay)
        canvas = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
        canvas.paste(crop, (dx, dy), crop)
        frames.append(canvas)
        offsets.append((dx, dy))
    return frames, offsets


def refine_alignment(frames, offsets, limit=12):
    """Fine-register every frame to the first by FFT cross-correlation of alpha.

    The feet anchor gets frames roughly in register, but it moves whenever a
    boot does, which reads as a one- or two-pixel twitch of the whole body
    during playback. Matching whole silhouettes instead holds the character
    still. Everything is registered against frame 0 rather than against its
    predecessor, so small errors cannot accumulate into a drift over the loop.
    """
    ref = np.fft.rfft2(np.array(frames[0])[:, :, 3].astype(np.float32))
    shifts = [(0, 0)]
    for frame in frames[1:]:
        cur = np.array(frame)[:, :, 3].astype(np.float32)
        corr = np.fft.irfft2(ref * np.conj(np.fft.rfft2(cur)), cur.shape)
        # Only trust small corrections; a far-off peak means a pose change, not a shift.
        window = np.full(corr.shape, -np.inf)
        for sy in range(-limit, limit + 1):
            for sx in range(-limit, limit + 1):
                window[sy, sx] = corr[sy, sx]
        dy, dx = np.unravel_index(np.argmax(window), corr.shape)
        dy = dy - corr.shape[0] if dy > limit else dy
        dx = dx - corr.shape[1] if dx > limit else dx
        shifts.append((int(dx), int(dy)))

    mx = max(abs(d[0]) for d in shifts)
    my = max(abs(d[1]) for d in shifts)
    w, h = frames[0].size
    out, moved = [], []
    for frame, (ox, oy), (dx, dy) in zip(frames, offsets, shifts):
        canvas = Image.new("RGBA", (w + 2 * mx, h + 2 * my), (0, 0, 0, 0))
        canvas.paste(frame, (mx + dx, my + dy))
        out.append(canvas)
        # Keep the manifest describing the frames we actually wrote.
        moved.append((ox + mx + dx, oy + my + dy))
    return out, moved


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
    ap.add_argument("--single", metavar="NAME",
                    help="treat every frame on the sheet as one animation, in reading order")
    ap.add_argument("--align", choices=("feet", "silhouette"), default="feet",
                    help="feet: anchor on the lowest ink. silhouette: also fine-register whole frames")
    ap.add_argument("--tol", type=int, default=24, help="background colour tolerance (0-255)")
    ap.add_argument("--glow-tol", type=int, default=0,
                    help="strip soft haze around the character up to this distance from the background")
    ap.add_argument("--checker", action="store_true",
                    help="the sheet's background is a transparency checkerboard baked into the image")
    ap.add_argument("--strip-captions", action="store_true",
                    help="blank the text written under each pose on a labelled reference sheet")
    ap.add_argument("--components", action="store_true",
                    help="split poses by connected ink instead of by gaps; use when poses overlap")
    ap.add_argument("--cluster-gap", type=int, default=10,
                    help="islands within this many pixels belong to the same drawing")
    ap.add_argument("--component-min", type=int, default=2000,
                    help="smallest island counted as a pose rather than a stray scrap")
    ap.add_argument("--panels", action="store_true",
                    help="the sheet boxes each pose in a drawn frame; paint the grid out first")
    ap.add_argument("--glow-depth", type=int, default=3,
                    help="how many pixels in from the silhouette --glow-tol may reach")
    ap.add_argument("--unmatte", type=int, default=0, metavar="REACH",
                    help="recover the aura's colour and softness from the grey it was painted over (try 45)")
    ap.add_argument("--unmatte-depth", type=int, default=24,
                    help="how far in from the keyed edge --unmatte may reach")
    ap.add_argument("--denoise-passes", type=int, default=1,
                    help="repeat the denoise; more clears more grain and costs more sharpness")
    ap.add_argument("--fill-holes", type=int, default=0, metavar="RADIUS",
                    help="seal and fill holes the flood punched through blurred poses (try 3)")
    ap.add_argument("--max-hole", type=float, default=0.0006,
                    help="largest sealed background region kept as interior, as a fraction of the sheet")
    ap.add_argument("--denoise", type=int, default=0, metavar="STRENGTH",
                    help="clear JPEG grain: differences under this many levels are noise (try 12)")
    ap.add_argument("--despeckle", type=int, default=24,
                    help="drop opaque islands smaller than this many pixels")
    ap.add_argument("--pad", type=int, default=4)
    ap.add_argument("--min-gap", type=int, default=4, help="smallest background gap that splits frames")
    ap.add_argument("--min-size", type=int, default=16, help="smallest accepted frame width/height")
    ap.add_argument("--opaque", action="store_true", help="keep the sheet background instead of cutting it out")
    args = ap.parse_args()

    sheet = load_sheet(args.sheet)
    rgb = np.array(sheet)[:, :, :3]
    forced_bg = None
    if args.checker:
        rgb, forced_bg = flatten_checker(rgb)
        print("flattened checkerboard background" if forced_bg is not None
              else "no checkerboard found; leaving the background as it is")

    if args.panels:
        rows_, cols_ = panel_border_lines(rgb)
        bg = background_color(rgb, skip_rows=rows_, skip_cols=cols_)
        rgb = rgb.copy()
        rgb[rows_, :] = bg          # paint the grid out so the gaps come back
        rgb[:, cols_] = bg
        print(f"panelled sheet: erased {len(rows_)} row and {len(cols_)} column border lines")
        if args.strip_captions:
            rgb, n = strip_captions(rgb, bg, rows_)
            print(f"stripped captions under {n} row(s) of cells")
    else:
        bg = background_color(rgb)
    if forced_bg is not None:
        bg = forced_bg
    mask = foreground_mask(rgb, bg, args.tol)

    alpha = ~outside(~mask)

    # Background sealed inside a ring is still background. Keying treats
    # anything not reachable from the sheet edge as interior, which is what
    # keeps mid-grey shading on her face — but a ring-shaped effect encloses a
    # whole disc of backdrop, and that came out as a grey card in the middle of
    # the sprite. Large enclosed regions that are still background-coloured go;
    # small ones are real shading and stay.
    off_bg = np.abs(rgb.astype(np.int16) - bg).max(axis=2)
    sealed_bg = alpha & (off_bg < args.tol)
    if sealed_bg.any():
        lab = label_components(sealed_bg)
        ids, counts = np.unique(lab[sealed_bg], return_counts=True)
        big = ids[counts > alpha.size * args.max_hole]
        if len(big):
            alpha &= ~np.isin(lab, big)

    if args.glow_tol:
        # The sheet paints a soft warm aura around the character. It is real
        # ink, so the keying tolerance leaves it in place, where it reads as a
        # blurred halo tracing the whole silhouette. A second flood inward at a
        # much looser tolerance eats haze that shades off into the background
        # while genuine line work, hair and the blade trail stop it.
        haze = outside(np.abs(rgb.astype(np.int16) - bg).max(axis=2) < args.glow_tol)

        # Depth matters as much as tolerance. Unbounded, this flood does not
        # stop at the halo: it pours through the gold swing trail and hollows
        # it out, and keeps going into the hand holding the dagger. Limiting it
        # to a band of a few pixels around the existing silhouette trims the
        # halo and leaves anything with real body to it alone.
        band = ~alpha
        for _ in range(args.glow_depth):
            band |= (np.roll(band, 1, 0) | np.roll(band, -1, 0) |
                     np.roll(band, 1, 1) | np.roll(band, -1, 1))
        alpha &= ~(haze & band)

    alpha = despeckle(fill_holes(alpha, args.fill_holes, args.max_hole), args.despeckle)

    if args.denoise:
        # Masks are decided on the original pixels; only the pixels shipped
        # get cleaned, so keying is unaffected by the filter.
        sheet = denoise_art(sheet, args.denoise, args.denoise_passes)

    owner = None
    if args.components:
        rows, owner = frames_from_components(mask, args.component_min, args.cluster_gap)
    else:
        rows = find_frames(mask, args.rows, args.cols, args.min_gap, args.min_size)
    if not rows:
        raise SystemExit("no frames found — try a larger --tol or pass --rows/--cols")

    # Rebuild the directory rather than write into it. A sheet with fewer poses
    # than last time would otherwise leave the tail of the previous one behind,
    # and a remade sheet would silently assemble against a mix of both.
    frame_dir = os.path.join(args.outdir, "frames")
    shutil.rmtree(frame_dir, ignore_errors=True)
    os.makedirs(frame_dir, exist_ok=True)

    soft_alpha = None
    if args.unmatte:
        rgb_lifted, soft_alpha = unmatte(rgb, bg, alpha, args.tol, args.unmatte,
                                         args.unmatte_depth)
        sheet = Image.fromarray(np.dstack([rgb_lifted, np.array(sheet)[:, :, 3]]))

    keyed = sheet.copy()
    keyed.putalpha(Image.fromarray(soft_alpha if soft_alpha is not None
                                   else (alpha * 255).astype(np.uint8), "L"))
    keyed.save(os.path.join(args.outdir, "sheet_keyed.png"))
    manifest = {"sheet": os.path.basename(args.sheet), "size": list(sheet.size),
                "background": [int(c) for c in bg], "fps": args.fps,
                "keyed_sheet": "sheet_keyed.png", "rows": []}

    if args.single:
        rows = [[rect for row in rows for rect in row]]

    first_index = 1
    names = args.names.split(",") if args.names else []
    names = [args.single] if args.single else names
    names += [f"row{i}" for i in range(len(names) + 1, len(rows) + 1)]

    for ri, (name, rects) in enumerate(zip(names, rows), 1):
        frames, offsets = cut_frames(sheet, mask, alpha, rects, not args.opaque, args.pad,
                                     soft_alpha, owner, first_index)
        first_index += len(rects)
        if args.align == "silhouette":
            frames, offsets = refine_alignment(frames, offsets)
        for fi, frame in enumerate(frames, 1):
            frame.save(os.path.join(frame_dir, f"{name}_{fi:02d}.png"))
        save_animation(frames, os.path.join(args.outdir, f"{name}.gif"), args.fps, bg)
        save_animation(frames, os.path.join(args.outdir, f"{name}.webp"), args.fps)
        manifest["rows"].append({
            "name": name,
            "canvas": list(frames[0].size),
            "align": args.align,
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
