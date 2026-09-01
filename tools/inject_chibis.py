#!/usr/bin/env python3
"""Put the character portraits into OPUS_LEDGER.html, without editing it.

Reads a folder, one image per person, named after them -- Dahlia.webp,
"Neven Ishmael.webp" -- and builds the map the chibi block hands out. Adding a
portrait is dropping a file in the folder and running this again; there is no
code change and no list to keep in sync, because this is the block that gets
re-injected sixty-odd times as the art gets drawn.

Same rules as every other injector here: the Ledger is never edited in place,
the block sits between two markers so deleting it restores the file byte for
byte, and re-running removes the earlier copy first.

Size is the thing to watch. These go in as data URIs, so each portrait costs
about a third more than its file, and the Ledger is already 6 MB. Run
tools/key_chibi.py with --webp 88 -s 256 and each one is ~19 KB of base64
rather than the ~295 KB a 512px PNG costs -- 1.3 MB for a full cast instead of
19 MB. This prints the running total and says so if it gets out of hand.
"""

import argparse
import base64
import json
import os
import re
import sys

START = "/* ==== BEGIN LEDGER CHIBIS"
END = "/* ================= END LEDGER CHIBIS ========================= */"
MIME = {".webp": "image/webp", ".png": "image/png",
        ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif"}
BUDGET = 3_000_000       # bytes of base64 before this starts complaining


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("ledger")
    ap.add_argument("-a", "--art", default="chibi",
                    help="folder of portraits, each named after the person (default: chibi/)")
    ap.add_argument("-s", "--src", default="web/ledger_chibis.js")
    ap.add_argument("-o", "--out")
    args = ap.parse_args()

    js = open(args.src, encoding="utf-8").read()
    if START not in js or END not in js:
        raise SystemExit(f"{args.src} is missing its markers; refusing to inject "
                         "something that cannot be removed again")

    if not os.path.isdir(args.art):
        raise SystemExit(f"{args.art} is not a folder. Put one image per person in it, "
                         "named after them.")

    portraits, total = {}, 0
    for fn in sorted(os.listdir(args.art)):
        stem, ext = os.path.splitext(fn)
        if ext.lower() not in MIME:
            continue
        if stem.endswith("_56"):        # the preview key_chibi.py writes alongside
            continue
        path = os.path.join(args.art, fn)
        b = base64.b64encode(open(path, "rb").read()).decode()
        portraits[stem] = f"data:{MIME[ext.lower()]};base64,{b}"
        total += len(b)
        print(f"  {stem:<28} {os.path.getsize(path) / 1e3:>7.1f} KB  "
              f"-> {len(b) / 1e3:>7.1f} KB of base64")

    if not portraits:
        raise SystemExit(f"no images found in {args.art}/ — nothing to inject.")
    print(f"  {len(portraits)} portrait(s), {total / 1e6:.2f} MB of base64")
    if total > BUDGET:
        print(f"  NOTE: past {BUDGET / 1e6:.1f} MB. Re-run key_chibi.py with "
              "--webp 88 -s 256; the slot is 56px and the detail view 76px, so "
              "256 is already more than either can show.")

    js = js.replace("__PORTRAITS__", json.dumps(portraits, ensure_ascii=False, sort_keys=True))
    for tok in re.findall(r"__[A-Z_0-9]+__", js):
        raise SystemExit(f"unresolved token {tok} left in the block")

    html = open(args.ledger, encoding="utf-8").read()
    pat = re.compile(r"\n*<script>\s*" + re.escape(START) + r".*?" +
                     re.escape(END) + r"\s*</script>\n?", re.S)
    for m in pat.finditer(html):
        if m.group(0).count(START) != 1:
            raise SystemExit("refusing to write: a removal span holds more than one start marker")
    html, removed = pat.subn("", html)
    if removed:
        print(f"  removed {removed} earlier copy/copies")

    close = "</body>"
    if html.count(close) != 1:
        raise SystemExit(f"expected exactly one </body>, found {html.count(close)}")
    out = html.replace(close, "<script>\n" + js + "\n</script>\n" + close)

    dest = args.out or args.ledger
    os.makedirs(os.path.dirname(dest) or ".", exist_ok=True)
    with open(dest, "w", encoding="utf-8") as fh:
        fh.write(out)
    print(f"  chibis -> {dest} ({len(out) / 1e6:.2f} MB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
