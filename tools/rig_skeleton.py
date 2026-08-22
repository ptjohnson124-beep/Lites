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
    anchors = cfg["anchors"]
    # Only a piece that is drawn needs a place in the world; a swap shares the
    # bone of the slot it swaps into, so it needs an offset and nothing else.
    shows0 = cfg.get("attachment_of", {})
    geom = {}
    for name in cfg["draw_order"]:
        att = shows0.get(name, name)
        x, y, r, length = attach(parts[att], anchors[att])
        geom[name] = {"x": x, "y": y, "rotation": r, "length": length}

    # The bind pose is authored as angles, not coordinates. Typing a world
    # position for twenty-four joints cannot produce a stance — the numbers do
    # not say anything a person can picture, and any of them being slightly
    # wrong shows up as a limb detached from its own joint. Angles do say
    # something ("the front thigh goes down and forward at 138 degrees"), and
    # the joints then fall exactly where the bone lengths put them, so a chain
    # cannot come apart no matter how she is posed.
    pose = cfg.get("pose", {})
    pose_rel = cfg.get("pose_rel", {})
    joint = cfg.get("joint", {})
    parent = dict(cfg.get("parent", {}))
    for ctrl in cfg.get("control_bones", []):
        parent.setdefault(ctrl["name"], ctrl.get("parent", "root"))

    world = {"root": {"pos": (0.0, 0.0), "rot": 0.0}}
    pending = [n for n in list(joint) if n != "root"]
    while pending:
        ready = False
        for name in list(pending):
            spec = joint[name]
            if "world" in spec:
                src, base = None, {"pos": tuple(spec["world"]), "rot": 0.0}
            else:
                src = spec["from"]
                if src not in world:
                    continue
                pw = world[src]
                if spec.get("at") == "tip":
                    off = (geom[src]["length"] if src in geom else 0.0, 0.0)
                else:
                    off = tuple(spec.get("offset", (0.0, 0.0)))
                d = rot(off, pw["rot"])
                base = {"pos": (pw["pos"][0] + d[0], pw["pos"][1] + d[1]), "rot": 0.0}
            if name in pose:
                base["rot"] = float(pose[name])
            elif name in pose_rel:
                base["rot"] = world[src]["rot"] + float(pose_rel[name]) if src else 0.0
            world[name] = base
            if name in geom:
                geom[name]["bone_rotation"] = base["rot"]
            pending.remove(name)
            ready = True
        if not ready:
            raise SystemExit("joints reference a bone that is never placed: "
                             + ", ".join(pending))

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

    # A slot usually shows the attachment it is named for, but not always: the
    # far-side hand is the same drawing as the near one, shown on its own bone
    # and tinted a step darker, which is what the shading pairs on the parts
    # sheet do for the limbs. Spine tints per slot, so no second drawing is
    # needed for it.
    shows = cfg.get("attachment_of", {})
    tint = cfg.get("slot_color", {})
    slots, skin = [], {}
    for name in cfg["draw_order"]:
        att0 = shows.get(name, name)
        slot = {"name": name, "bone": name, "attachment": att0}
        if name in tint:
            slot["color"] = tint[name]
        slots.append(slot)
        entry = {}
        for att in [att0] + cfg["alternates"].get(name, []):
            x, y, r, _ = attach(parts[att], anchors[att])
            entry[att] = {"x": round(x, 2), "y": round(y, 2),
                          "rotation": round(r, 2),
                          "width": parts[att]["width"], "height": parts[att]["height"]}
        skin[name] = entry
    return bones, slots, skin, geom, world


def curve(stops):
    """Keyframes from (time, value) pairs, in the shape Spine's rotate wants."""
    return [{"time": round(t, 4), "angle": round(v, 2)} for t, v in stops]


def transforms(bones, order, timelines, t):
    """Forward kinematics: every bone's world transform at time t.

    The same composition a runtime performs — a bone's world transform is its
    parent's, composed with its own setup transform plus whatever the timeline
    adds this frame. Having it here is what makes a thrown weapon possible:
    the hand's world position can be asked for at any instant, and the dagger
    written to match it.
    """
    out = {}
    for name in order:
        b = bones[name]
        lx, ly, lr = b.get("x", 0.0), b.get("y", 0.0), b.get("rotation", 0.0)
        keys = timelines.get(name, {})
        if "rotate" in keys:
            lr += sample(keys["rotate"], t, ["angle"])[0]
        if "translate" in keys:
            dx, dy = sample(keys["translate"], t, ["x", "y"])
            lx, ly = lx + dx, ly + dy
        if "parent" not in b:
            out[name] = {"pos": (0.0, 0.0), "rot": 0.0}
            continue
        pw = out[b["parent"]]
        off = rot((lx, ly), pw["rot"])
        out[name] = {"pos": (pw["pos"][0] + off[0], pw["pos"][1] + off[1]),
                     "rot": pw["rot"] + lr}
    return out


# The beat, in seconds. A trick is anticipation, release, flight, catch,
# absorb, settle — and because this is an idle it has to close exactly on
# itself, so the last value of every timeline equals the first.
LOOP, TOSS, CATCH = 2.5, 0.65, 1.35
APEX = 700.0            # how far above the hand the dagger gets
FLIPS = 1               # whole turns in the air; a half turn lands blade-first


def toss_animation(bones, order, fps=24):
    """A standing idle with a dagger toss, generated rather than keyed.

    Two halves. The body and arm are ordinary rotation curves. The dagger is
    *baked*: while she is holding it, its timeline is written from wherever the
    hand actually is that frame, and while it is in the air it follows a
    parabola between the release and the catch. Baking is the only way to hold
    a prop that is not parented to the hand holding it, and not parenting it is
    the only way to let go.
    """
    lag = {"torso": 0.0, "head": 0.18, "hood": 0.12,
           "hair-crown": 0.22, "hair-fringe": 0.28, "hair-tail": 0.38,
           "hair-strand-l": 0.42, "hair-strand-r": 0.46,
           "arm-upper-far": 0.25, "arm-fore-far": 0.4}
    amp = {"torso": 0.5, "head": 0.8, "hood": 1.0,
           "hair-crown": 0.9, "hair-fringe": 1.2, "hair-tail": 2.4,
           "hair-strand-l": 2.8, "hair-strand-r": 2.6,
           "arm-upper-far": 0.9, "arm-fore-far": 1.3}
    tl = {}
    steps = 10
    for name in lag:
        if name not in bones:
            continue
        tl[name] = {"rotate": curve(
            [(LOOP * i / steps,
              amp[name] * math.sin(2 * math.pi * (i / steps - lag[name])))
             for i in range(steps + 1)])}

    # The throwing arm. Down into the anticipation, up through the release,
    # back to guard, up again to meet the dagger, and down as it is absorbed.
    tl.setdefault("hand-fist", {})["rotate"] = curve([
        (0.0, 0.0), (0.42, -18.0), (TOSS, 44.0), (0.85, 10.0), (1.15, 0.0),
        (CATCH, 30.0), (1.58, -14.0), (1.95, 3.0), (LOOP, 0.0)])
    tl.setdefault("arm-fore", {})["rotate"] = curve([
        (0.0, 0.0), (0.42, -9.0), (TOSS, 24.0), (0.90, 5.0), (1.15, 0.0),
        (CATCH, 16.0), (1.58, -8.0), (1.98, 1.0), (LOOP, 0.0)])
    tl.setdefault("arm-upper", {})["rotate"] = curve([
        (0.0, 0.0), (0.42, -4.0), (TOSS, 11.0), (1.00, 0.0),
        (CATCH, 8.0), (1.58, -4.0), (2.05, 0.0), (LOOP, 0.0)])
    # Her weight settles as the dagger leaves and again as it lands.
    tl.setdefault("hip", {})["translate"] = [
        {"time": 0.0, "x": 0, "y": 0}, {"time": TOSS, "x": 0, "y": 4},
        {"time": 1.0, "x": 0, "y": 0}, {"time": 1.58, "x": 0, "y": -6},
        {"time": 2.0, "x": 0, "y": 0}, {"time": LOOP, "x": 0, "y": 0}]
    # She watches it go up and come down.
    tl["head"]["rotate"] = curve([
        (0.0, 0.0), (TOSS, -6.0), (1.0, -13.0), (CATCH, -3.0),
        (1.7, 2.0), (LOOP, 0.0)])

    # Where the dagger sits in the hand, measured once from the setup pose so
    # the grip is wherever the art actually put it.
    rest = transforms(bones, order, {}, 0.0)
    hand, dag = rest["hand-fist"], rest["dagger"]
    grip = rot((dag["pos"][0] - hand["pos"][0], dag["pos"][1] - hand["pos"][1]),
               -hand["rot"])
    grip_rot = dag["rot"] - hand["rot"]

    def held(t):
        w = transforms(bones, order, tl, t)["hand-fist"]
        off = rot(grip, w["rot"])
        return (w["pos"][0] + off[0], w["pos"][1] + off[1]), w["rot"] + grip_rot

    launch, land = held(TOSS), held(CATCH)
    span = CATCH - TOSS

    def flight(t):
        u = (t - TOSS) / span
        x = launch[0][0] + (land[0][0] - launch[0][0]) * u
        # A parabola through both hands with its apex APEX above the line
        # between them: the arc a thrown thing actually takes.
        y = launch[0][1] + (land[0][1] - launch[0][1]) * u + 4 * APEX * u * (1 - u)
        # A whole number of turns so it arrives grip-first, the way it left.
        turn = launch[1] + ((land[1] - launch[1]) + 360.0 * FLIPS) * u
        return (x, y), turn

    # Sample every frame in the air, every third while held: the arc needs the
    # resolution and the hand-tracking does not.
    times = []
    n = int(round(LOOP * fps))
    for i in range(n + 1):
        t = min(i / fps, LOOP)
        if TOSS <= t <= CATCH or i % 3 == 0 or i == n:
            times.append(round(t, 4))
    times = sorted(set(times))

    dbone = bones["dagger"]
    trans, rots, prev = [], [], None
    for t in times:
        pos, ang = flight(t) if TOSS < t < CATCH else held(t)
        hip = transforms(bones, order, tl, t)["hip"]
        local = rot((pos[0] - hip["pos"][0], pos[1] - hip["pos"][1]), -hip["rot"])
        # Timelines carry the offset from the setup pose, not the pose itself.
        trans.append({"time": t, "x": round(local[0] - dbone.get("x", 0.0), 2),
                      "y": round(local[1] - dbone.get("y", 0.0), 2)})
        a = ang - hip["rot"] - dbone.get("rotation", 0.0)
        # Keep the curve continuous: a runtime lerps the number it is given, so
        # unwrapping is what makes the spin turn one way instead of snapping.
        if prev is not None:
            a -= 360.0 * round((a - prev) / 360.0)
        prev = a
        rots.append({"time": t, "angle": round(a, 2)})
    tl["dagger"] = {"translate": trans, "rotate": rots}

    # Her hand opens the moment it lets go and closes on the catch.
    slots = {"hand-fist": {"attachment": [
        {"time": 0.0, "name": "hand-fist"},
        {"time": round(TOSS + 1.0 / fps, 4), "name": "hand-open"},
        {"time": round(CATCH, 4), "name": "hand-fist"}]}}
    return {"bones": tl, "slots": slots}


def preview(cfg, parts, geom, world, atlas_dir, out_path):
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

    W, H, GY = 1900, 2000, 1880
    canvas = Image.new("RGBA", (W, H), (255, 255, 255, 255))
    shows = cfg.get("attachment_of", {})
    for name in cfg["draw_order"]:
        g, im = geom[name], imgs[shows.get(name, name)]
        # The bone's own rotation and the attachment's compose, exactly as a
        # runtime composes them: the image ends up turned by their sum, and its
        # offset is measured in the bone's frame, so it turns with the bone.
        theta = world[name]["rot"]
        turned = im.rotate(theta + g["rotation"], expand=True, resample=Image.BICUBIC)
        ox, oy = rot((g["x"], g["y"]), theta)
        bx, by = world[name]["pos"]
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


def render_animation(skel, imgs, anim, path, fps=24, seconds=LOOP, scale=1.0):
    """Play the generated animation with the same forward kinematics a runtime uses.

    Every bone's world transform is its parent's, composed with its own local
    one plus whatever the timeline adds this frame. Drawing it this way is the
    only check that the hierarchy is right: a bad parent shows up instantly as
    a hand that stays put while the arm swings away from it.
    """
    order = [b["name"] for b in skel["bones"]]
    bones = {b["name"]: b for b in skel["bones"]}
    tl = skel["animations"][anim]["bones"]
    swaps = skel["animations"][anim].get("slots", {})

    def shown(slot, t):
        keys = swaps.get(slot["name"], {}).get("attachment")
        if not keys:
            return slot["attachment"]
        name = slot["attachment"]
        for k in keys:
            if k["time"] <= t:
                name = k["name"]
        return name
    W, H, GY = 1400, 2000, 1900
    frames = []
    for i in range(int(round(seconds * fps))):
        t = i / fps
        wt = transforms(bones, order, tl, t)
        canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        for slot in skel["slots"]:
            name = shown(slot, t)
            att = skel["skins"][0]["attachments"][slot["name"]][name]
            w = wt[slot["bone"]]
            turned = imgs[name].rotate(w["rot"] + att["rotation"],
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
    ap.add_argument("--parts-name",
                    help="basename of the .parts.json to read; defaults to --name. "
                         "Set it when writing a second skeleton beside the first.")
    ap.add_argument("--spine", default="4.2.00",
                    help="version string written into the skeleton; the format "
                         "this emits is the same either way, only the claim differs")
    ap.add_argument("--preview-scale", type=float, default=0.4,
                    help="scale of the animated preview; the rig itself is unaffected")
    args = ap.parse_args()

    cfg = json.load(open(args.config, encoding="utf-8"))
    parts = json.load(open(os.path.join(args.outdir,
                                        f"{args.parts_name or args.name}.parts.json"),
                           encoding="utf-8"))
    bones, slots, skin, geom, world = build(cfg, parts)
    by_name = {b["name"]: b for b in bones}
    order = [b["name"] for b in bones]
    anim = toss_animation(by_name, order)

    xs = [b["x"] for b in bones[1:]]
    ys = [b["y"] for b in bones[1:]]
    skel = {
        "skeleton": {
            "hash": hashlib.sha1(json.dumps(cfg, sort_keys=True).encode()).hexdigest()[:11],
            "spine": args.spine,
            "x": round(min(xs) - 200, 2), "y": 0,
            "width": round(max(xs) - min(xs) + 400, 2),
            "height": round(max(ys) + 400, 2),
            "images": "./images/", "audio": "",
        },
        "bones": bones,
        "slots": slots,
        "skins": [{"name": "default", "attachments": skin}],
        "animations": {"idle": anim},
    }
    os.makedirs(args.outdir, exist_ok=True)
    path = os.path.join(args.outdir, f"{args.name}.json")
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(skel, fh, indent=1)

    print(f"{len(bones) - 1} bones, {len(slots)} slots, "
          f"{sum(len(v) for v in skin.values())} attachments -> {path}")
    if args.preview:
        root = os.path.dirname(os.path.abspath(args.config))
        out = preview(cfg, parts, geom, world, root,
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
