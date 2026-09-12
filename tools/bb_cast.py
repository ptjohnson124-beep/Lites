#!/usr/bin/env python3
"""Put a packed character into the tracker's SPRITE FEED cast.

The feed already does all the work: it draws frames cell by cell out of an
atlas, holds the resting states, and hands one-shots back to the idle. All a
character needs to join it is one entry in CAST -- a key, a label, the manifest
tools/bb_atlas.py wrote, and the atlas image as a data: URI.

WHY THE IMAGE GOES IN AS A data: URI RATHER THAN A FILE BESIDE THE HTML. The
tracker is opened by double-clicking it off a disk. An <img> WILL load a
sibling file from a file:// page, so an external atlas would work -- but only
while the folder travels with the file, and this tracker gets sent around on
its own. Dahlia is already embedded the same way. Keeping the rule consistent
matters more than the megabytes here; when the file approaches its ceiling the
answer is to move the WHOLE cast out at once, not to have half of it external.

Re-runnable: an existing entry with the same key is replaced, not duplicated.

    python3 tools/bb_cast.py --html TRACKER.html --name vergil --label Vergil \
        --atlas web/vergil_atlas.json --out TRACKER.html
"""
import argparse, base64, json, os, shutil, sys

MARK = "const CAST = "


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--html", required=True)
    ap.add_argument("--name", required=True)
    ap.add_argument("--label", required=True)
    ap.add_argument("--atlas", required=True, help="the _atlas.json written by bb_atlas.py")
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

    src = open(args.html, encoding="utf-8", errors="replace").read()
    if MARK not in src:
        sys.exit("no CAST declaration found — is this the tracker with the sprite feed block?")
    i = src.index(MARK)
    j = src.index("\n", i)
    line = src[i:j]
    cast = json.loads(line[len(MARK):].rstrip().rstrip(";"))

    manifest = json.load(open(args.atlas))
    img_path = os.path.join(os.path.dirname(os.path.abspath(args.atlas)), manifest["image"])
    blob = open(img_path, "rb").read()
    entry = {"key": args.name, "label": args.label,
             "atlas": {k: v for k, v in manifest.items() if k != "image"},
             "src": "data:image/webp;base64," + base64.b64encode(blob).decode()}

    before = [c["key"] for c in cast]
    replaced = any(c["key"] == args.name for c in cast)
    cast = [c for c in cast if c["key"] != args.name] + [entry]

    out = src[:i] + MARK + json.dumps(cast, separators=(",", ":")) + ";" + src[j:]
    if os.path.abspath(args.out) == os.path.abspath(args.html):
        shutil.copy2(args.html, args.html + ".bak")
    open(args.out, "w", encoding="utf-8").write(out)

    # read it straight back and check the feed will actually accept it
    chk = open(args.out, encoding="utf-8", errors="replace").read()
    k = chk.index(MARK); l = chk.index("\n", k)
    back = json.loads(chk[k + len(MARK):l].rstrip().rstrip(";"))
    me = [c for c in back if c["key"] == args.name]
    assert len(me) == 1, "entry did not round-trip"
    a = me[0]["atlas"]
    need = a["cols"] * a["cell"][0], a["rows"] * a["cell"][1]
    top = max(max(c["frames"]) for c in a["clips"].values())
    assert top < a["cells"], f"a clip indexes cell {top} but the atlas has {a['cells']}"
    assert base64.b64decode(me[0]["src"].split(",", 1)[1]) == blob, "image did not round-trip"

    print(f"cast was {before} -> {[c['key'] for c in back]}"
          f"   ({'replaced' if replaced else 'added'} {args.name})")
    print(f"{args.name}: {len(a['clips'])} clips, {a['cells']} cells, "
          f"cell {a['cell'][0]}x{a['cell'][1]}, sheet {need[0]}x{need[1]}, "
          f"unit {a['unit']}, anchor {a['anchor']}")
    print(f"atlas {len(blob)/1048576:.2f} MB -> {len(me[0]['src'])/1048576:.2f} MB as base64")
    print(f"html  {os.path.getsize(args.html)/1048576:.2f} MB -> "
          f"{os.path.getsize(args.out)/1048576:.2f} MB")


if __name__ == "__main__":
    main()
