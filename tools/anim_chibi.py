#!/usr/bin/env python3
"""Turn a video of a chibi into the animated WebP the Ledger's slot can play.

The `chibi` field goes straight into an <img>, and browsers animate WebP there,
so a portrait can move. Everything the still pipeline does still has to happen
-- background removed, trimmed, squared, die-cut rim, 256px -- only now once per
frame, and with one constraint the stills never had:

  THE CROP IS SHARED. Trimming each frame to its own bounding box makes the
  character breathe and drift, because a raised hand on frame 40 changes what
  "the subject" is. The box is measured across every frame at once and applied
  to all of them, so the figure sits still and only the drawing moves.

Background removal is the same flood-in-from-the-edge as key_chibi.py and for
the same reason -- a white lab coat inside the outline survives where a colour
key would take it -- but run through cv2.floodFill, because a Python BFS over a
hundred and forty-five frames is not a thing anyone should wait for.

Frames are dropped to a target rate rather than kept all: at 56 pixels nobody
can see 24fps, and 145 frames of WebP is megabytes for one portrait.
"""

import argparse
import io
import os
import sys

import cv2
import numpy as np
from PIL import Image


def frames_of(path, stride):
    # GIF and animated WebP go through Pillow: cv2.VideoCapture will open a GIF
    # and then hand back nonsense or nothing, because it is a video decoder and
    # a GIF is a stack of palette images.
    if os.path.splitext(path)[1].lower() in (".gif", ".webp", ".png"):
        from PIL import ImageSequence
        im = Image.open(path)
        dur = im.info.get("duration") or 100
        out = [np.array(f.convert("RGB")) for i, f in enumerate(ImageSequence.Iterator(im))
               if i % stride == 0]
        return out, 1000.0 / dur

    cap = cv2.VideoCapture(path)
    if not cap.isOpened():
        raise SystemExit(f"could not open {path}")
    fps = cap.get(cv2.CAP_PROP_FPS) or 24.0
    out, i = [], 0
    while True:
        ok, f = cap.read()
        if not ok:
            break
        if i % stride == 0:
            out.append(cv2.cvtColor(f, cv2.COLOR_BGR2RGB))
        i += 1
    cap.release()
    return out, fps


def border_colours(rgb, tol, min_share):
    """WHICH COLOURS ON THE FRAME EDGE ARE ACTUALLY THE BACKGROUND.

    This is the whole fix for the clips that came out gutted. Flooding from
    every edge pixel assumes the edge IS the background, and on a chibi clip it
    is not: the figure is framed to fill the canvas, so its shoulders and props
    run off the bottom and sides. Roughly a tenth of the border of these clips
    is the character, not the room behind him.

    Nine per cent of bad seeds is harmless while the character is brightly lit
    and locally varied -- the fill takes a few pixels of a sleeve and stops. It
    is ruinous the moment the character goes DARK: one clip fades its subject
    to near-black over its second half, a seed sitting on his black coat at the
    bottom edge then matches every dark pixel in the body it is connected to,
    and the flood eats him from the inside out. The white sticker outline
    survives because it is bright, which is exactly what the broken frames look
    like -- an empty outline with the character gone.

    So the border is CLUSTERED first, and only colours holding a real share of
    it are allowed to seed. The subject crossing the edge is a minority colour
    and is refused. A genuinely two-toned background -- one clip is split pink
    on the left, purple on the right -- is two majority clusters and both are
    kept, which is what the per-seed flood was introduced to handle in the
    first place and is not given up here.
    """
    h, w, _ = rgb.shape
    border = np.concatenate([rgb[0, :], rgb[-1, :], rgb[:, 0], rgb[:, -1]]).astype(int)
    cols, rem, t = [], border, int(round(tol))
    while len(rem) and len(cols) < 4:
        q = rem // 16
        keys, counts = np.unique(q, axis=0, return_counts=True)
        peak = keys[int(np.argmax(counts))] * 16 + 8
        near = np.abs(rem - peak).max(1) <= t
        if near.sum() / len(border) >= min_share:
            cols.append(rem[near].mean(0))
        rem = rem[~near]
    if not cols:                      # no colour holds a share: trust the corners
        cols = [rgb[0, 0].astype(int)]
    return np.array(cols), 1.0 - sum(
        (np.abs(border - c).max(1) <= t).sum() for c in cols) / len(border)


def alpha_of(rgb, pale_only, tol, min_share=.10, close=.6, min_piece=.0004):
    """Background is what the frame EDGE reaches, each seed judged against ITS
    OWN colour -- but only edge pixels that look like background may seed.

    An earlier version pre-masked everything that did not match the corner
    pixel, so the fill could never enter it. That is fatal the moment a
    background changes during the animation -- six frames of one clip flash a
    different shade behind the character, and on exactly those frames nothing
    was removed at all. Seeding per pixel with a fixed range has no opinion
    about what the background is supposed to look like, so it survives a
    background that moves, a split frame, and a painted checkerboard alike.

    What it did have no opinion about, and needed one, is whether a given edge
    pixel is background at all. See border_colours.
    """
    h, w, _ = rgb.shape
    bgr = np.ascontiguousarray(rgb[:, :, ::-1])
    mask = np.zeros((h + 2, w + 2), np.uint8)
    t = int(round(tol))
    cols, _ = border_colours(rgb, tol, min_share)
    step = max(1, min(w, h) // 256)
    seeds = ([(x, 0) for x in range(0, w, step)] + [(x, h - 1) for x in range(0, w, step)] +
             [(0, y) for y in range(0, h, step)] + [(w - 1, y) for y in range(0, h, step)])
    work = bgr.copy()
    for (x, y) in seeds:
        if mask[y + 1, x + 1]:
            continue
        px = rgb[y, x].astype(int)
        if np.abs(cols - px).max(1).min() > t:      # the subject, not the room
            continue
        cv2.floodFill(work, mask, (x, y), (0, 0, 0), (t,) * 3, (t,) * 3,
                      4 | cv2.FLOODFILL_FIXED_RANGE | cv2.FLOODFILL_MASK_ONLY | (255 << 8))
    bg = mask[1:-1, 1:-1] == 255
    return clean(np.where(bg, 0, 255).astype(np.uint8), close, min_piece)


def clean(alpha, close, min_piece):
    """MAKE THE SILHOUETTE A DIE CUT RATHER THAN A STENCIL OF LACE.

    The raw flood is honest and ugly. It goes wherever the background colour
    goes, which on real art means into every gap between hair strands, along
    every seam of a white uniform against a white backdrop, through the middle
    of a grey horse standing on grey. At full resolution those are thin fingers
    of nothing; at 112 pixels they are SPECKLE, and speckle over a dark card
    reads as dirt on the portrait rather than as detail in it. Put the stills
    beside the animations and the difference is not the drawing, it is that the
    stills have one closed shape and the animations have a shape full of holes.

    The stills got this for free: key_chibi.py keeps the largest few connected
    pieces, so the lace fell off. Doing it per frame needs one thing more --
    a piece that is real on one frame and absent on the next makes the portrait
    flicker -- so this closes the channels first and only then drops what is
    still too small to be anything.

      close      seals gaps narrower than the kernel, so a strand of hair stops
                 cutting the head into two pieces
      min_piece  removes leftover crumbs, and fills leftover pinholes, in both
                 directions: a speck of subject in the empty air and a speck of
                 air inside the subject are the same mistake

    Nothing here is a colour decision, so it cannot eat something the key got
    right -- it only removes pieces too small to be a drawing at this size.
    """
    h, w = alpha.shape
    k = max(1, int(round(close / 100 * min(h, w))))
    if k:
        kern = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * k + 1, 2 * k + 1))
        alpha = cv2.morphologyEx(alpha, cv2.MORPH_CLOSE, kern)
    floor = max(9, int(round(min_piece * h * w)))
    for want in (255, 0):                       # crumbs, then pinholes
        n, lab, st, _ = cv2.connectedComponentsWithStats(
            (alpha == want).astype(np.uint8), 8)
        for i in range(1, n):
            if st[i, cv2.CC_STAT_AREA] < floor:
                alpha[lab == i] = 255 - want
    return alpha


def level_frames(fr, alphas, cap):
    """HOLD THE LIGHTING STEADY ACROSS THE CLIP.

    Some of these clips are lit performances: the subject is fully lit at the
    start and fades into shadow by the end, ending at half the brightness it
    began at and staying there. That is fine at full size on a white page and
    wrong in a 56-pixel slot on a near-black card -- the portrait spends the
    back half of every loop sinking into the card and then snaps back to lit,
    which reads as a fault rather than as mood.

    Each frame is scaled toward the brightness of the clip's BRIGHT frames --
    the 75th percentile, not the maximum, so one flash-lit frame cannot set the
    target for everything else. Only brightening, never darkening, so a frame
    that is genuinely brighter than the rest keeps its moment. And the gain is
    soft-clipped rather than clamped: above three quarters the curve rolls off
    into white instead of flattening there, which is what stops a lifted dark
    frame from turning a face into a paper cutout.

    Measured on the subject alone. Including the transparent surround would
    make the target depend on how much of the frame the character happens to
    fill, which changes shot to shot for reasons that have nothing to do with
    the light.
    """
    lum = []
    for f, a in zip(fr, alphas):
        m = a > 128
        v = f[m].astype(float) if m.any() else np.array([[0., 0., 0.]])
        lum.append(float((v * [.2126, .7152, .0722]).sum(1).mean()) if m.any() else 0.)
    lum = np.array(lum)
    target = float(np.percentile(lum[lum > 0], 75)) if (lum > 0).any() else 0.
    if target <= 0:
        return fr, 1.0
    out, worst = [], 1.0
    for f, v in zip(fr, lum):
        g = 1.0 if v <= 0 else min(cap, max(1.0, target / v))
        worst = max(worst, g)
        if g <= 1.001:
            out.append(f)
            continue
        x = f.astype(np.float32) * g
        knee = 190.0                      # roll off into white above this
        hi = x > knee
        x[hi] = knee + (255.0 - knee) * (1.0 - np.exp(-(x[hi] - knee) / (255.0 - knee)))
        out.append(np.clip(x, 0, 255).astype(np.uint8))
    return out, worst


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("video")
    ap.add_argument("-o", "--out", required=True)
    ap.add_argument("-s", "--size", type=int, default=256)
    ap.add_argument("--fps", type=float, default=12, help="target frame rate (default 12)")
    ap.add_argument("-q", "--quality", type=int, default=70)
    ap.add_argument("--tol", type=float, default=42)
    ap.add_argument("--edge-share", type=float, default=.10, metavar="FRAC",
                    help="least share of the frame border a colour must hold to "
                         "count as background and be allowed to seed the fill "
                         "(default .10). Raise it when the subject fills so much "
                         "of the edge that its own colour looks like a background; "
                         "lower it for a background made of several bands.")
    ap.add_argument("--colour-bg", action="store_true",
                    help="the background is a flat colour rather than a pale "
                         "transparency checkerboard")
    ap.add_argument("--rim", type=float, default=1.4, metavar="PCT")
    ap.add_argument("--margin", type=float, default=.05)
    ap.add_argument("--level", action="store_true",
                    help="hold the lighting steady across the clip, for a clip "
                         "that fades its subject into shadow and stays there. "
                         "At 56 pixels on a dark card that fade reads as the "
                         "portrait failing rather than as mood.")
    ap.add_argument("--level-cap", type=float, default=2.2, metavar="X",
                    help="most a frame may be brightened by --level (default 2.2)")
    ap.add_argument("--trim", type=float, default=.10, metavar="FRAC",
                    help="share of the largest per-frame boxes to throw away "
                         "before unioning the rest into the shared crop "
                         "(default .10). Raise it when a clip spends several "
                         "frames on an effect that fills the canvas, which "
                         "would otherwise shrink the character for the whole "
                         "animation.")
    ap.add_argument("--close", type=float, default=.6, metavar="PCT",
                    help="seal gaps in the silhouette narrower than this share "
                         "of the frame (default .6). Zero leaves the raw key.")
    ap.add_argument("--min-piece", type=float, default=.0004, metavar="FRAC",
                    help="drop pieces of subject, and fill holes in it, smaller "
                         "than this share of the frame (default .0004)")
    ap.add_argument("--drop-thin", action="store_true",
                    help="drop frames where almost nothing survived the key, "
                         "for a clip that cuts to an empty screen partway "
                         "through. Look at the frames first: the same test "
                         "fires on a real effect frame.")
    ap.add_argument("--pingpong", action="store_true",
                    help="play forward then backward, so the loop has no seam. Worth it "
                         "when the clip is a one-way performance rather than a cycle -- "
                         "this one opens its hands and ends with them clasped, and a "
                         "straight loop snaps back. Costs roughly double the frames.")
    args = ap.parse_args()

    if os.path.splitext(args.video)[1].lower() in (".gif", ".webp", ".png"):
        src_fps = 1000.0 / (Image.open(args.video).info.get("duration") or 100)
    else:
        cap = cv2.VideoCapture(args.video)
        src_fps = cap.get(cv2.CAP_PROP_FPS) or 24.0
        cap.release()
    stride = max(1, int(round(src_fps / args.fps)))
    fr, _ = frames_of(args.video, stride)
    if not fr:
        raise SystemExit("no frames decoded")
    print(f"  decoded {len(fr)} frames (every {stride} of {src_fps:.0f}fps -> "
          f"{src_fps / stride:.1f}fps)")

    cols, crossing = border_colours(fr[0], args.tol, args.edge_share)
    print(f"  border   {len(cols)} background colour(s) "
          f"{[tuple(int(v) for v in c) for c in cols]}, "
          f"{crossing:.0%} of the edge is the subject crossing it")

    alphas = [alpha_of(f, not args.colour_bg, args.tol, args.edge_share,
                       args.close, args.min_piece) for f in fr]
    per = np.array([(a > 128).mean() for a in alphas])
    kept = per.mean()
    print(f"  background removed, {kept:.1%} of the frame kept on average")
    if kept > .95:
        print("  note   almost nothing was removed — check --tol, or pass --colour-bg")
    # A frame that keeps a small fraction of what its neighbours keep has had
    # the subject eaten, which is the failure this pipeline shipped once and
    # nobody saw until the portraits were already in the file. Say so.
    med = float(np.median(per))
    thin = [i for i, v in enumerate(per) if med > 0 and v < .55 * med]
    if thin and not args.drop_thin:
        print(f"  WARNING  {len(thin)} frame(s) kept under half of the median "
              f"{med:.1%}: {thin[:12]}{' …' if len(thin) > 12 else ''}")
        print("           either the key is eating the subject there (raise "
              "--edge-share or lower --tol)")
        print("           or the clip itself goes empty there — look at the "
              "frames, and pass --drop-thin if it does")
    if thin and args.drop_thin:
        # A clip that cuts to black for a stretch leaves the CARD BLANK for
        # that stretch, which at 56 pixels reads as a broken image rather than
        # as a glitch effect. Dropping those frames shortens the loop and cuts
        # straight from the last frame with a subject to the next one.
        #
        # Never automatic. The same measurement fires on a genuine effect --
        # one clip's transformation burst is two frames of white sparks with
        # the character legitimately not in them -- and dropping those would
        # remove the best thing in the animation. Which it is has to be looked
        # at, so this is asked for per clip.
        keep = [i for i in range(len(fr)) if i not in set(thin)]
        print(f"  dropped  {len(thin)} empty frame(s) {thin[:12]}"
              f"{' …' if len(thin) > 12 else ''} — {len(keep)} frames left")
        fr = [fr[i] for i in keep]
        alphas = [alphas[i] for i in keep]

    # ONE box for every frame, so the figure does not drift or breathe -- and
    # built from each frame's LARGEST CONNECTED PIECE rather than from every
    # pixel that survived. A plain union is hostage to a single stray speck in
    # a corner: one leaked pixel in one frame of twenty-one and the shared box
    # is the whole canvas, which silently shrinks the character inside it.
    # And taken as a TRIMMED UNION of the per-frame boxes.
    #
    # Neither extreme works alone. A plain union is hostage to the worst single
    # frame: a clip that flashes a full-frame transformation burst partway
    # through has seventeen frames agreeing the character is 1132x1301 and one
    # insisting on 1408x1408, and the union believes the one. But the median
    # fails the opposite case -- a character who really does move that much,
    # rearing a horse across half the frame, gets his head cropped off, because
    # there is no outlier to reject and the middle of his range is not his
    # range.
    #
    # So: throw away the largest tenth of the boxes by area, then union what is
    # left. The burst frame goes; the big honest poses stay.
    boxes = []
    for a in alphas:
        n, lab, st, _ = cv2.connectedComponentsWithStats((a > 40).astype(np.uint8), 8)
        if n < 2:
            continue
        i = 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))
        bx, by = st[i, cv2.CC_STAT_LEFT], st[i, cv2.CC_STAT_TOP]
        boxes.append((bx, by, bx + st[i, cv2.CC_STAT_WIDTH] - 1,
                      by + st[i, cv2.CC_STAT_HEIGHT] - 1))
    if not boxes:
        raise SystemExit("nothing left after keying")
    boxes.sort(key=lambda b: (b[2] - b[0]) * (b[3] - b[1]))
    keep = boxes[:max(1, int(round(len(boxes) * (1 - args.trim))))]
    bb = np.array(keep)
    x0, y0 = int(bb[:, 0].min()), int(bb[:, 1].min())
    x1, y1 = int(bb[:, 2].max()), int(bb[:, 3].max())
    print(f"  shared crop {x1 - x0 + 1}x{y1 - y0 + 1}, union of {len(keep)} of "
          f"{len(boxes)} frames (largest {args.trim:.0%} dropped)")

    if args.level:
        fr, worst = level_frames(fr, alphas, args.level_cap)
        print(f"  levelled the lighting across the clip, "
              f"largest lift {worst:.2f}x")

    S = args.size
    r = max(1, int(round(args.rim / 100 * S))) if args.rim > 0 else 0
    kern = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1)) if r else None

    out = []
    for f, a in zip(fr, alphas):
        sub = f[y0:y1 + 1, x0:x1 + 1]
        sa = a[y0:y1 + 1, x0:x1 + 1]
        side = int(max(sub.shape[:2]) / (1 - 2 * args.margin))
        can = np.zeros((side, side, 4), np.uint8)
        oy, ox = (side - sub.shape[0]) // 2, (side - sub.shape[1]) // 2
        can[oy:oy + sub.shape[0], ox:ox + sub.shape[1], :3] = sub
        can[oy:oy + sub.shape[0], ox:ox + sub.shape[1], 3] = sa
        im = Image.fromarray(can, "RGBA").resize((S, S), Image.LANCZOS)
        if r:
            al = np.array(im.getchannel("A"))
            hard = (al > 96).astype(np.uint8) * 255
            grown = cv2.dilate(hard, kern)
            band = np.clip(grown.astype(int) - hard.astype(int), 0, 255).astype(np.uint8)
            rim = Image.fromarray(np.dstack([np.full_like(band, 255)] * 3 + [band]), "RGBA")
            im = Image.alpha_composite(rim, im)
        out.append(im)

    if args.pingpong and len(out) > 2:
        out = out + out[-2:0:-1]
        print(f"  ping-pong -> {len(out)} frames, seamless loop")

    dur = int(round(1000 * stride / src_fps))
    # method 4, not 6. Six plus minimize_size takes minutes and bought about 6%
    # -- the size that matters here is the PIXEL size, not the encoder effort:
    # the slot is 56px and the detail view 76px, so 128 is already well past
    # anything either can show.
    out[0].save(args.out, "WEBP", save_all=True, append_images=out[1:],
                duration=dur, loop=0, quality=args.quality, method=4)
    n = os.path.getsize(args.out)
    print(f"  wrote  {args.out}  {len(out)} frames @ {dur}ms  "
          f"{n / 1e3:.0f} KB  ({n * 4 / 3 / 1e3:.0f} KB as a data URI)")

    prev = Image.new("RGBA", (56, 56), (26, 23, 34, 255))
    prev.alpha_composite(out[0].resize((56, 56), Image.LANCZOS))
    pv = os.path.splitext(args.out)[0] + "_56.png"
    prev.resize((224, 224), Image.NEAREST).save(pv)
    print(f"  wrote  {pv}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
