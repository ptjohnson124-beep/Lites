#!/usr/bin/env python3
"""Put the sprite feed into the combat tracker, and keep it re-runnable.

The tracker is one self-contained HTML file that gets opened off disk, so the
atlas cannot be fetched: file:// blocks it. It is inlined as a data URI
instead, which is how that file already carries its battle-map backdrops.

The injected block is bounded by two markers and this script removes any
previous copy before writing a new one. That is the point of doing it here
rather than by hand: every animation added to the atlas means re-inlining 1.4MB
of base64, and re-running this is the whole job.

  python3 tools/inject_sprite_panel.py TRACKER.html -a out/web -o TRACKER.html
"""

import argparse
import base64
import json
import os
import re

# Both markers have to be strings that appear nowhere else in a tracker. The
# obvious banner comment is not one of them: this file opens 75 of its own
# sections with /* ===== , so a pattern anchored on that matched the first of
# them and a removal took four megabytes of somebody else's code with it.
START = "/* ==== BEGIN DAHLIA SPRITE FEED"
END = "/* ================= END DAHLIA SPRITE FEED ========================= */"


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("tracker", help="the combat tracker HTML")
    ap.add_argument("-a", "--atlas-dir", default="out/web",
                    help="directory holding <name>_atlas.webp and <name>_atlas.json")
    ap.add_argument("-n", "--name", default="dahlia")
    ap.add_argument("-t", "--template", default="web/sprite_panel.js.tmpl")
    ap.add_argument("-o", "--out", help="where to write; defaults to editing in place")
    args = ap.parse_args()

    img_path = os.path.join(args.atlas_dir, f"{args.name}_atlas.webp")
    man_path = os.path.join(args.atlas_dir, f"{args.name}_atlas.json")
    for p in (img_path, man_path, args.template, args.tracker):
        if not os.path.exists(p):
            raise SystemExit(f"missing: {p}")

    manifest = json.load(open(man_path, encoding="utf-8"))
    b64 = base64.b64encode(open(img_path, "rb").read()).decode()
    block = (open(args.template, encoding="utf-8").read()
             .replace("__ATLAS_MANIFEST__", json.dumps(manifest, separators=(",", ":")))
             .replace("__ATLAS_B64__", '"' + b64 + '"'))

    html = open(args.tracker, encoding="utf-8").read()

    # Drop a previous injection so re-running replaces rather than stacks.
    # The leading \n* matters: the blank line in front of the block is part of
    # what an injection added, so consuming it here means deleting the block
    # restores the tracker byte for byte rather than leaving whitespace behind.
    pattern = re.compile(r"\n*" + re.escape(START) + r".*?" + re.escape(END) + r"\n?", re.S)
    before = len(html)
    html, removed = pattern.subn("", html)
    if removed:
        # A removal should take about what one injection put in. Anything much
        # larger means the pattern reached past the block and is eating the
        # tracker, which is a thing to stop on rather than write out.
        cut = before - len(html)
        if cut > removed * (len(block) + 4096):
            raise SystemExit(f"refusing to write: removing the old block cut {cut} bytes, "
                             f"far more than the {len(block)} it should. The markers are "
                             "matching something they should not.")
        print(f"removed {removed} earlier injection(s), {cut} bytes")

    close = "\n</script>\n</body>"
    if html.count(close) != 1:
        raise SystemExit(f"expected exactly one '</script></body>', found {html.count(close)} — "
                         "the tracker's shape has changed and the splice point is no longer safe")
    out = html.replace(close, "\n" + block + close)

    dest = args.out or args.tracker
    with open(dest, "w", encoding="utf-8") as fh:
        fh.write(out)
    clips = ", ".join(manifest["clips"])
    print(f"{len(manifest['clips'])} clips inlined ({clips})")
    print(f"  atlas {os.path.getsize(img_path) / 1e6:.2f} MB -> {len(b64) / 1e6:.2f} MB of base64")
    print(f"  {dest}  {os.path.getsize(dest) / 1e6:.2f} MB")


if __name__ == "__main__":
    main()
