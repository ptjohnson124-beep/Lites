#!/usr/bin/env python3
"""Emit a Spine skeleton from the packed pieces and a bind-pose layout.

Placing twenty-five attachments by hand in the editor is the boring half of
rigging, and it is the half that is pure arithmetic: every piece already knows
its own size, and the layout already says which joint each piece hangs from and
where that joint sits. So the skeleton is generated and the editor is left for
the part that actually needs judgement.

Coordinates are the one thing worth being careful about, because three
conventions meet here. The pieces are described in image space, x right and
**y down**, anchors given as fractions of a piece's own box. The layout is in
world space, x right and **y up**, origin on the ground between her boots.
Spine is world-space too, and a bone points along its own +X. Every flip
happens in `attach()` and nowhere else.

For a limb, two anchors are given — the joint it hangs from and the joint that
hangs off it — and both the bone's length and the attachment's rotation fall
out of them. That is what lets a forearm drawn diagonally across its cell sit
on a bone that points straight down: the drawing's own angle is measured, and
then cancelled.
"""

import argparse
import hashlib
import json
import math
import os

from PIL import Image


def rot(v, deg):
    c, s = math.cos(math.radians(deg)), math.sin(math.radians(deg))
    return (v[0] * c - v[1] * s, v[0] * s + v[1] * c)


def attach(part, anchors):
    """Where a piece sits on its bone, and how far it has to be turned.

    Returns (x, y, rotation, length) in Spine's terms. The construction: the
    proximal anchor must land on the bone's origin and the distal anchor on its
    tip, which is one rotation and one translation, both solvable exactly.
    """
    w, h = part["width"], part["height"]

    def local(frac):
        # image-space fraction -> offset from the piece's centre, y flipped up
        return ((frac[0] - 0.5) * w, (0.5 - frac[1]) * h)

    if "anchor" in anchors:
        p = local(anchors["anchor"])
        return -p[0], -p[1], 0.0, 0.0

    p, d = local(anchors["proximal"]), local(anchors["distal"])
    v = (d[0] - p[0], d[1] - p[1])
    length = math.hypot(*v)
    # A bone points along its own +X, so the drawing is turned until its
    # proximal->distal axis does too. That rotation is a property of the
    # drawing alone: it cancels the angle the piece happens to have been drawn
    # at, and says nothing about where the bone will point. Which way the limb
    # hangs in the bind pose is the bone's rotation, set separately.
    r = -math.degrees(math.atan2(v[1], v[0]))
    pr = rot(p, r)
    return -pr[0], -pr[1], r, length


def build(cfg, parts):
    place, anchors = cfg["place"], cfg["anchors"]
    # Only a piece that is drawn needs a place in the world; a swap shares the
    # bone of the slot it swaps into, so it needs an offset and nothing else.
    geom = {}
    for name in cfg["draw_order"]:
        if name not in place:
            raise SystemExit(f"{name}: no place given in the layout")
        x, y, r, length = attach(parts[name], anchors[name])
        geom[name] = {"x": x, "y": y, "rotation": r, "length": length,
                      "world": place[name]}

    # The layout is written in world space because that is the only frame a
    # person can reason about — "her knee is 504 pixels up" is checkable, "her
    # knee is 295 pixels along a bone rotated -90 degrees" is not. Spine wants
    # parent-relative, so the conversion happens here, once, and the hierarchy
    # is real: rotating the torso carries the head, the hair and both arms,
    # which is the entire reason to have a skeleton rather than a pile of
    # sprites with the same numbers on them.
    direction = cfg.get("direction", {})
    parent = dict(cfg.get("parent", {}))
    world = {"root": {"pos": (0.0, 0.0), "rot": 0.0}}
    for ctrl in cfg.get("control_bones", []):
        world[ctrl["name"]] = {"pos": tuple(ctrl["place"]),
                               "rot": float(ctrl.get("direction", 0))}
        parent.setdefault(ctrl["name"], ctrl.get("parent", "root"))
    for name in cfg["draw_order"]:
        geom[name]["bone_rotation"] = float(direction.get(name, 0))
        world[name] = {"pos": tuple(geom[name]["world"]),
                       "rot": geom[name]["bone_rotation"]}

    def emit(name):
        pname = parent.get(name, "root")
        if pname not in world:
            raise SystemExit(f"{name}: parent {pname!r} is not a bone")
        pw = world[pname]
        d = (world[name]["pos"][0] - pw["pos"][0], world[name]["pos"][1] - pw["pos"][1])
        lx, ly = rot(d, -pw["rot"])
        b = {"name": name, "parent": pname, "x": round(lx, 2), "y": round(ly, 2)}
        local_rot = (world[name]["rot"] - pw["rot"] + 180) % 360 - 180
        if round(local_rot, 2):
            b["rotation"] = round(local_rot, 2)
        return b

    bones = [{"name": "root"}]
    for ctrl in cfg.get("control_bones", []):
        bones.append(emit(ctrl["name"]))
    for name in cfg["draw_order"]:
        b = emit(name)
        if geom[name]["length"]:
            b["length"] = round(geom[name]["length"], 2)
        bones.append(b)
    # Parents must be declared before their children or a runtime cannot
    # resolve the chain in one pass.
    seen, ordered, rest = {"root"}, [bones[0]], bones[1:]
    while rest:
        ready = [b for b in rest if b["parent"] in seen]
        if not ready:
            raise SystemExit("bone parents form a cycle or name a missing bone: "
                             + ", ".join(b["name"] for b in rest))
        ordered += ready
        seen.update(b["name"] for b in ready)
        rest = [b for b in rest if b["name"] not in seen]
    bones = ordered

    slots, skin = [], {}
    for name in cfg["draw_order"]:
        slots.append({"name": name, "bone": name, "attachment": name})
        entry = {}
        for att in [name] + cfg["alternates"].get(name, []):
            x, y, r, _ = attach(parts[att], anchors[att])
            entry[att] = {"x": round(x, 2), "y": round(y, 2),
                          "rotation": round(r, 2),
                          "width": parts[att]["width"], "height": parts[att]["height"]}
        skin[name] = entry
    return bones, slots, skin, geom


def breathe(cfg, geom):
    """A two-second idle, built out of numbers rather than keyed by hand.

    This is the one kind of animation code is better at than a person: a settle
    that never quite repeats, made of the same cycle at different offsets per
    bone so the hair lags the shoulders and the shoulders lag the chest. It is
    also the cheapest possible proof that the skeleton imports and moves.
    """
    lag = {"torso": 0.0, "head": 0.15, "hood": 0.1,
           "hair-crown": 0.2, "hair-fringe": 0.25, "hair-tail": 0.35,
           "hair-strand-l": 0.4, "hair-strand-r": 0.45,
           "arm-upper": 0.2, "arm-fore": 0.35, "hand-fist": 0.45,
           "arm-upper-far": 0.25, "arm-fore-far": 0.4}
    amp = {"torso": 0.6, "head": 0.9, "hood": 1.2,
           "hair-crown": 1.0, "hair-fringe": 1.4, "hair-tail": 2.6,
           "hair-strand-l": 3.2, "hair-strand-r": 3.0,
           "arm-upper": 1.1, "arm-fore": 1.6, "hand-fist": 1.9,
           "arm-upper-far": 1.0, "arm-fore-far": 1.5}
    period, steps = 2.0, 8
    out = {}
    for name in cfg["draw_order"]:
        if name not in lag:
            continue
        keys = []
        for i in range(steps + 1):
            t = period * i / steps
            phase = 2 * math.pi * (i / steps - lag[name])
            keys.append({"time": round(t, 3),
                         "angle": round(amp[name] * math.sin(phase), 2)})
        out[name] = {"rotate": keys}
    lift = [{"time": 0.0, "x": 0, "y": 0},
            {"time": 1.0, "x": 0, "y": -3},
            {"time": 2.0, "x": 0, "y": 0}]
    out.setdefault("torso", {})["translate"] = lift
    return {"bones": out}


def preview(cfg, parts, geom, atlas_dir, out_path):
    """Render the bind pose the numbers describe, not the one that was meant.

    A skeleton that is wrong by a rotation looks perfectly plausible as JSON.
    Drawing it with the same maths the runtime will use is the only check that
    means anything before the editor opens.
    """
    imgs = {}
    for entry in cfg["pieces"]:
        p = entry["file"]
        if not os.path.isabs(p) and not os.path.exists(p):
            p = os.path.join(atlas_dir, p)
        im = Image.open(p).convert("RGBA")
        bb = im.getbbox()
        imgs[entry["name"]] = im.crop(bb)

    W, H, GY = 1400, 2000, 1900
    canvas = Image.new("RGBA", (W, H), (255, 255, 255, 255))
    for name in cfg["draw_order"]:
        g, im = geom[name], imgs[name]
        # The bone's own rotation and the attachment's compose, exactly as a
        # runtime composes them: the image ends up turned by their sum, and its
        # offset is measured in the bone's frame, so it turns with the bone.
        theta = g["bone_rotation"]
        turned = im.rotate(theta + g["rotation"], expand=True, resample=Image.BICUBIC)
        ox, oy = rot((g["x"], g["y"]), theta)
        bx, by = g["world"]
        cx = W / 2 + bx + ox
        cy = GY - by - oy
        canvas.alpha_composite(turned, (int(cx - turned.width / 2),
                                        int(cy - turned.height / 2)))
    canvas.convert("RGB").save(out_path)
    return out_path


def sample(keys, t, fields):
    """Linear value of a timeline at time t. Spine's default curve is linear."""
    if t <= keys[0]["time"]:
        return [keys[0].get(f, 0.0) for f in fields]
    for a, b in zip(keys, keys[1:]):
        if t <= b["time"]:
            span = b["time"] - a["time"]
            k = 0.0 if span <= 0 else (t - a["time"]) / span
            return [a.get(f, 0.0) + (b.get(f, 0.0) - a.get(f, 0.0)) * k for f in fields]
    return [keys[-1].get(f, 0.0) for f in fields]


def render_animation(skel, imgs, anim, path, fps=24, seconds=2.0, scale=1.0):
    """Play the generated animation with the same forward kinematics a runtime uses.

    Every bone's world transform is its parent's, composed with its own local
    one plus whatever the timeline adds this frame. Drawing it this way is the
    only check that the hierarchy is right: a bad parent shows up instantly as
    a hand that stays put while the arm swings away from it.
    """
    order = [b["name"] for b in skel["bones"]]
    bones = {b["name"]: b for b in skel["bones"]}
    tl = skel["animations"][anim]["bones"]
    W, H, GY = 1400, 2000, 1900
    frames = []
    for i in range(int(round(seconds * fps))):
        t = i / fps
        wt = {}
        for name in order:
            b = bones[name]
            lx, ly = b.get("x", 0.0), b.get("y", 0.0)
            lr = b.get("rotation", 0.0)
            keys = tl.get(name, {})
            if "rotate" in keys:
                lr += sample(keys["rotate"], t, ["angle"])[0]
            if "translate" in keys:
                dx, dy = sample(keys["translate"], t, ["x", "y"])
                lx, ly = lx + dx, ly + dy
            if "parent" not in b:
                wt[name] = {"pos": (0.0, 0.0), "rot": 0.0}
                continue
            pw = wt[b["parent"]]
            off = rot((lx, ly), pw["rot"])
            wt[name] = {"pos": (pw["pos"][0] + off[0], pw["pos"][1] + off[1]),
                        "rot": pw["rot"] + lr}
        canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        for slot in skel["slots"]:
            att = skel["skins"][0]["attachments"][slot["name"]][slot["attachment"]]
            w = wt[slot["bone"]]
            turned = imgs[slot["attachment"]].rotate(w["rot"] + att["rotation"],
                                                     expand=True, resample=Image.BICUBIC)
            ox, oy = rot((att["x"], att["y"]), w["rot"])
            cx = W / 2 + w["pos"][0] + ox
            cy = GY - w["pos"][1] - oy
            canvas.alpha_composite(turned, (int(cx - turned.width / 2),
                                            int(cy - turned.height / 2)))
        frames.append(canvas)

    box = None
    for f in frames:
        bb = f.getbbox()
        box = bb if box is None else (min(box[0], bb[0]), min(box[1], bb[1]),
                                      max(box[2], bb[2]), max(box[3], bb[3]))
    frames = [f.crop(box) for f in frames]
    if scale != 1.0:
        # The rig is built at the size the art was drawn; the preview is for
        # looking at. Shrinking it here also halves the edge movement between
        # frames, which is the same reason the finished clips are shown small.
        w, h = frames[0].size
        size = (max(1, round(w * scale)), max(1, round(h * scale)))
        frames = [f.resize(size, Image.LANCZOS) for f in frames]
    frames[0].save(path, save_all=True, append_images=frames[1:],
                   duration=int(round(1000 / fps)), loop=0, lossless=True, method=6)
    return path, len(frames), frames[0].size


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("config")
    ap.add_argument("-o", "--outdir", default="out/rig")
    ap.add_argument("-n", "--name", default="dahlia")
    ap.add_argument("--preview", action="store_true",
                    help="also render the bind pose the numbers describe")
    ap.add_argument("--preview-anim", action="store_true",
                    help="also play the generated animation through the hierarchy")
    ap.add_argument("--preview-scale", type=float, default=0.4,
                    help="scale of the animated preview; the rig itself is unaffected")
    args = ap.parse_args()

    cfg = json.load(open(args.config, encoding="utf-8"))
    parts = json.load(open(os.path.join(args.outdir, f"{args.name}.parts.json"),
                           encoding="utf-8"))
    bones, slots, skin, geom = build(cfg, parts)

    xs = [b["x"] for b in bones[1:]]
    ys = [b["y"] for b in bones[1:]]
    skel = {
        "skeleton": {
            "hash": hashlib.sha1(json.dumps(cfg, sort_keys=True).encode()).hexdigest()[:11],
            "spine": "3.8.75",
            "x": round(min(xs) - 200, 2), "y": 0,
            "width": round(max(xs) - min(xs) + 400, 2),
            "height": round(max(ys) + 400, 2),
            "images": "./images/", "audio": "",
        },
        "bones": bones,
        "slots": slots,
        "skins": [{"name": "default", "attachments": skin}],
        "animations": {"idle": breathe(cfg, geom)},
    }
    os.makedirs(args.outdir, exist_ok=True)
    path = os.path.join(args.outdir, f"{args.name}.json")
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(skel, fh, indent=1)

    print(f"{len(bones) - 1} bones, {len(slots)} slots, "
          f"{sum(len(v) for v in skin.values())} attachments -> {path}")
    if args.preview:
        root = os.path.dirname(os.path.abspath(args.config))
        out = preview(cfg, parts, geom, root,
                      os.path.join(args.outdir, f"{args.name}_bindpose.png"))
        print(f"  bind pose rendered -> {out}")
    if args.preview_anim:
        root = os.path.dirname(os.path.abspath(args.config))
        imgs = {}
        for entry in cfg["pieces"]:
            f = entry["file"]
            if not os.path.isabs(f) and not os.path.exists(f):
                f = os.path.join(root, f)
            im = Image.open(f).convert("RGBA")
            imgs[entry["name"]] = im.crop(im.getbbox())
        out, n, size = render_animation(
            skel, imgs, "idle", os.path.join(args.outdir, f"{args.name}_idle.webp"),
            scale=args.preview_scale)
        print(f"  idle played through the hierarchy: {n} frames at {size[0]}x{size[1]} -> {out}")


if __name__ == "__main__":
    main()
