#!/usr/bin/env python3
"""Put ANY later bounded block into OPUS_LEDGER.html, without editing it.

tools/inject_ledger.py knows one block by name -- its markers are constants at
the top of that file. The Ledger now carries forty of them, so a second, third
and fortieth block each needing their own near-identical injector is the wrong
shape. This one derives the marker pair from the block's own first and last
lines, which every block in the family already carries, and is otherwise the
same tool: re-runnable, removes earlier copies of THAT block only, refuses to
write if a removal span could swallow a neighbour, and splices in at the end of
<body> so the Ledger's own globals exist by the time it runs.

Art tokens resolve from the same table the first injector uses, for blocks that
want their own images. A block with no tokens -- like the tree re-seating, which
reuses the custom properties block 1 already installed -- needs no files at all.
"""

import argparse
import base64
import os
import re
import sys

ART = {
    "__SIGILS__": "web/led_sigils.webp",
    "__EYESOLID__": "web/led_eye_solid.webp",
    "__EYELINE__": "web/led_eye_line.webp",
    "__EYEROW__": "web/led_eye_row.webp",
    "__RULES__": "web/led_rules.webp",
    "__ICOHEX__": "web/led_ico_hex.webp",
    "__ICOOCT__": "web/led_ico_oct.webp",
    "__ICOROGUE__": "web/led_ico_rogue.webp",
    "__DECALS__": "web/led_decals.webp",
    "__NEON__": "web/led_neon.webp",
    "__TAGS__": "web/led_tags.webp",
    "__STICKERS__": "web/led_stickers.webp",
    "__SLAPS__": "web/led_slaps.webp",
    "__RANK__": "web/led_rank.webp",
    "__EMBLEMS__": "web/led_emblems.webp",
    "__RINGS__": "web/led_rings.webp",
    "__PLATES__": "web/led_plates.webp",
    "__GLITCH__": "web/hud_glitch.webp",
    "__ICONS__": "web/ui_icons.webp",
}


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("ledger")
    ap.add_argument("-s", "--src", required=True)
    ap.add_argument("-o", "--out")
    args = ap.parse_args()

    js = open(args.src, encoding="utf-8").read().strip()
    lines = js.splitlines()
    start, end = lines[0].strip(), lines[-1].strip()
    if not start.startswith("/* ==== BEGIN LEDGER EXTENSION"):
        raise SystemExit(f"{args.src} does not open with a BEGIN LEDGER EXTENSION "
                         "marker; refusing to inject something that cannot be "
                         "removed again")
    if "END LEDGER EXTENSION" not in end:
        raise SystemExit(f"{args.src} does not close with an END LEDGER EXTENSION "
                         "marker; refusing to inject something that cannot be "
                         "removed again")
    print(f"  block  {start[:78]}")

    # Anything the block asks for by token. Same 2^21 guard as the first
    # injector: Chromium silently drops a custom property past that length, and
    # every masked element then paints as a solid block.
    for token, path in ART.items():
        if token not in js:
            continue
        if not os.path.exists(path):
            raise SystemExit(f"{path} not found, and the block asks for it via {token}.")
        b = base64.b64encode(open(path, "rb").read()).decode()
        if len(b) > 2 ** 21:
            raise SystemExit(f"{path} is {len(b)} base64 characters, past the "
                             f"{2 ** 21} a CSS custom property can hold.")
        js = js.replace(token, f"data:image/webp;base64,{b}")
        print(f"  art    {os.path.basename(path)} {os.path.getsize(path) / 1e3:.1f} KB")

    for tok in re.findall(r"__[A-Z_0-9]+__", js):
        raise SystemExit(f"unresolved token {tok} left in the block")

    html = open(args.ledger, encoding="utf-8").read()

    # Drop earlier copies of THIS block. The span is anchored on the block's own
    # first line, so a file holding forty blocks loses exactly the one being
    # replaced -- and a span that somehow covers two starts is refused rather
    # than cutting a neighbour out with it.
    pat = re.compile(r"\n*<script>\s*" + re.escape(start) + r".*?" +
                     re.escape(end) + r"\s*</script>\n?", re.S)
    for m in pat.finditer(html):
        if m.group(0).count(start) != 1:
            raise SystemExit("refusing to write: a removal span holds more than one "
                             "start marker")
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
    print(f"  {len(js) / 1e3:.1f} KB -> {dest} ({len(out) / 1e6:.2f} MB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
