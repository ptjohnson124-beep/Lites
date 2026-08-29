#!/usr/bin/env python3
"""Put the extension block into OPUS_LEDGER.html, without editing it.

Same shape as the three injectors for the combat tracker, and for the same
reasons: the Ledger is a hand-authored file someone is running a campaign on,
so it is never edited in place, and everything this adds sits between two
markers that can be deleted to restore it byte for byte.

The block goes in at the very end of <body>, after the Ledger's own script, so
every function and table it reassigns already exists by the time it runs.
"""

import argparse
import base64
import os
import re
import sys

START = "/* ==== BEGIN LEDGER EXTENSION"
END = "/* ================= END LEDGER EXTENSION ========================= */"

FONTS = [
    ("Space Mono", 400, "web/fonts/SpaceMono-400.woff2"),
    ("Space Mono", 700, "web/fonts/SpaceMono-700.woff2"),
    ("Orbitron", 800, "web/fonts/Orbitron-800.woff2"),
    ("Audiowide", 400, "web/fonts/Audiowide-400.woff2"),
    ("Syncopate", 700, "web/fonts/Syncopate-700.woff2"),
    ("Chakra Petch", 600, "web/fonts/ChakraPetch-600.woff2"),
]


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("ledger")
    ap.add_argument("-s", "--src", default="web/ledger_ext.js")
    ap.add_argument("-i", "--icons", default="web/ui_icons.webp")
    ap.add_argument("-o", "--out")
    args = ap.parse_args()

    js = open(args.src, encoding="utf-8").read()
    if START not in js or END not in js:
        raise SystemExit(f"{args.src} is missing its markers; refusing to inject "
                         "something that cannot be removed again")

    # The same six faces the combat tracker carries, so the two files read as
    # one project rather than as two that happen to share a palette. Inlined,
    # because the Ledger is opened off a disk exactly like the tracker is and
    # file:// will not fetch a sibling.
    faces = []
    total = 0
    for family, weight, path in FONTS:
        if not os.path.exists(path):
            raise SystemExit(f"{path} not found — run the font step first.")
        b = base64.b64encode(open(path, "rb").read()).decode()
        faces.append("@font-face{font-family:'%s';font-style:normal;font-weight:%d;"
                     "font-display:block;src:url(\"data:font/woff2;base64,%s\") format('woff2')}"
                     % (family, weight, b))
        total += os.path.getsize(path)
    js = js.replace("__FONTS__", "\n ".join(faces))
    print(f"  fonts  {total / 1e3:.1f} KB, {len(FONTS)} faces")

    # The icon sheet, which has a hard ceiling: it goes into a CSS custom
    # property, and Chromium drops a custom property longer than 2^21
    # characters -- silently, so every icon would paint as a solid block. The
    # combat tracker shipped one build that way. Checked here rather than
    # discovered later.
    if "__ICONS__" in js:
        if not os.path.exists(args.icons):
            raise SystemExit(f"{args.icons} not found, and the block asks for it.")
        b = base64.b64encode(open(args.icons, "rb").read()).decode()
        if len(b) > 2 ** 21:
            raise SystemExit(f"{args.icons} is {len(b)} base64 characters, past the "
                             f"{2 ** 21} a CSS custom property can hold.")
        m = "image/webp" if args.icons.endswith(".webp") else "image/png"
        js = js.replace("__ICONS__", f"data:{m};base64,{b}")
        print(f"  icons  {os.path.getsize(args.icons) / 1e3:.0f} KB "
              f"({len(b) / 2 ** 21:.0%} of the custom-property ceiling)")

    # The Ledger's own art, keyed out of the reference sheets at build time.
    # Small enough to inline as ordinary data URIs rather than one sprite, and
    # they are used at wildly different sizes -- a 26px node badge and a 190px
    # banner emblem off the same file would need two mask-sizes and a sheet.
    for token, path in (("__SIGILS__", "web/led_sigils.webp"),
                        ("__EYESOLID__", "web/led_eye_solid.webp"),
                        ("__EYELINE__", "web/led_eye_line.webp"),
                        ("__EYEROW__", "web/led_eye_row.webp"),
                        ("__RULES__", "web/led_rules.webp"),
                        ("__ICOHEX__", "web/led_ico_hex.webp"),
                        ("__ICOOCT__", "web/led_ico_oct.webp"),
                        ("__ICOROGUE__", "web/led_ico_rogue.webp"),
                        ("__DECALS__", "web/led_decals.webp"),
                        ("__NEON__", "web/led_neon.webp"),
                        ("__TAGS__", "web/led_tags.webp"),
                        ("__STICKERS__", "web/led_stickers.webp"),
                        ("__SLAPS__", "web/led_slaps.webp")):
        if token not in js:
            continue
        if not os.path.exists(path):
            raise SystemExit(f"{path} not found, and the block asks for it via {token}.")
        b = base64.b64encode(open(path, "rb").read()).decode()
        js = js.replace(token, f"data:image/webp;base64,{b}")
        print(f"  art    {os.path.basename(path)} {os.path.getsize(path) / 1e3:.1f} KB")

    for tok in re.findall(r"__[A-Z_]+__", js):
        raise SystemExit(f"unresolved token {tok} left in the block")

    html = open(args.ledger, encoding="utf-8").read()

    pat = re.compile(r"\n*<style>\s*</style>\s*", re.S)  # no-op, kept for symmetry
    pat = re.compile(r"\n*<script>\s*" + re.escape(START) + r".*?" + re.escape(END) + r"\s*</script>\n?", re.S)
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
    print(f"  ledger ext -> {dest} ({len(out) / 1e6:.2f} MB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
