#!/usr/bin/env python3
"""Put the sprite feed into the combat tracker, for one character or a cast.

The tracker is one self-contained HTML file that gets opened off disk, so the
atlases cannot be fetched: file:// blocks it. They are inlined as data URIs
instead, which is how that file already carries its battle-map backdrops. That
costs bytes, and for a table tool it buys the thing that matters most -- a
single file you can copy to a USB stick and open on whatever laptop is there.

Every <name>_atlas.json in the atlas directory becomes one member of the cast,
and its basename is the match key: dahlia_atlas.json plays for any unit whose
name contains "dahlia", case-insensitively. Adding a character is therefore
packing an atlas next to the others and re-running this.

The injected block is bounded by two markers and this script removes any
previous copy before writing a new one. That is the point of doing it here
rather than by hand: every animation added to any atlas means re-inlining
megabytes of base64, and re-running this is the whole job.

  python3 tools/inject_sprite_panel.py TRACKER.html -a out/web
"""

import argparse
import base64
import glob
import json
import os
import re

START = "/* ==== BEGIN SPRITE FEED"
END = "/* ================= END SPRITE FEED ========================= */"
# Kept so a tracker injected by the single-character version is still cleaned
# up rather than left behind alongside the new block.
OLD_START = "/* ==== BEGIN DAHLIA SPRITE FEED"
OLD_END = "/* ================= END DAHLIA SPRITE FEED ========================= */"

MIME = {".webp": "image/webp", ".png": "image/png"}


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("tracker", help="the combat tracker HTML")
    ap.add_argument("-a", "--atlas-dir", default="out/web",
                    help="directory of <name>_atlas.json and their images")
    ap.add_argument("-n", "--name", action="append", default=[],
                    help="restrict to these characters; default is every atlas found")
    ap.add_argument("-t", "--template", default="web/sprite_panel.js.tmpl")
    ap.add_argument("-o", "--out", help="where to write; defaults to editing in place")
    args = ap.parse_args()

    manifests = sorted(glob.glob(os.path.join(args.atlas_dir, "*_atlas.json")))
    if args.name:
        want = {n.lower() for n in args.name}
        manifests = [m for m in manifests
                     if os.path.basename(m)[:-len("_atlas.json")].lower() in want]
    if not manifests:
        raise SystemExit(f"no *_atlas.json in {args.atlas_dir}")

    cast, total = [], 0
    for man_path in manifests:
        key = os.path.basename(man_path)[:-len("_atlas.json")]
        manifest = json.load(open(man_path, encoding="utf-8"))
        img_path = os.path.join(args.atlas_dir, manifest["image"])
        if not os.path.exists(img_path):
            raise SystemExit(f"{man_path} names {manifest['image']}, which is not there")
        mime = MIME.get(os.path.splitext(img_path)[1].lower())
        if not mime:
            raise SystemExit(f"{img_path}: only .webp and .png can be inlined")
        b64 = base64.b64encode(open(img_path, "rb").read()).decode()
        total += os.path.getsize(img_path)
        cast.append({"key": key, "label": key.replace("_", " ").title(),
                     "atlas": manifest, "src": f"data:{mime};base64,{b64}"})
        print(f"  {key}: {len(manifest['clips'])} clips "
              f"({', '.join(manifest['clips'])}), "
              f"{os.path.getsize(img_path) / 1e6:.2f} MB")

    block = (open(args.template, encoding="utf-8").read()
             .replace("__CAST__", json.dumps(cast, separators=(",", ":"))))

    html = open(args.tracker, encoding="utf-8").read()

    # Drop any previous injection, this version's or the single-character one,
    # so re-running replaces rather than stacks. The leading \n* matters: the
    # blank line in front of the block is part of what an injection added, so
    # consuming it here means deleting the block restores the tracker byte for
    # byte. Both markers are deliberately unusual strings -- the obvious banner
    # comment is not, since the tracker opens 75 of its own sections with the
    # same /* ===== , and a pattern anchored on that ate four megabytes of it.
    removed = cut = 0
    for a, b in ((START, END), (OLD_START, OLD_END)):
        pat = re.compile(r"\n*" + re.escape(a) + r".*?" + re.escape(b) + r"\n?", re.S)
        before = len(html)
        html, n = pat.subn("", html)
        removed += n
        cut += before - len(html)
    if removed:
        # A removal should take about what one injection put in. Much larger
        # means the pattern reached past the block and is eating the tracker,
        # which is a thing to stop on rather than write out.
        if cut > removed * (len(block) + 4096):
            raise SystemExit(f"refusing to write: removing the old block cut {cut} bytes, "
                             f"far more than the {len(block)} it should.")
        print(f"removed {removed} earlier injection(s), {cut} bytes")

    close = "\n</script>\n</body>"
    if html.count(close) != 1:
        raise SystemExit(f"expected exactly one '</script></body>', found {html.count(close)} — "
                         "the tracker's shape has changed and the splice point is no longer safe")
    out = html.replace(close, "\n" + block + close)

    dest = args.out or args.tracker
    with open(dest, "w", encoding="utf-8") as fh:
        fh.write(out)
    print(f"{len(cast)} character(s), {total / 1e6:.2f} MB of atlas "
          f"-> {len(block) / 1e6:.2f} MB inlined")
    print(f"  {dest}  {os.path.getsize(dest) / 1e6:.2f} MB")


if __name__ == "__main__":
    main()
