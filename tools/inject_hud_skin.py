#!/usr/bin/env python3
"""Put a HUD skin over the combat tracker, without editing the tracker.

The tracker carries 1.3MB of its own CSS in one style block. Editing that in
place is neither reversible nor reviewable, and it is the file a campaign is
being run on. So the skin is appended AFTER it instead: same specificity rules,
later in the cascade, and bounded by two markers so removing it restores the
tracker byte for byte.

Re-runnable. Any earlier copy is removed first, so changing the skin means
re-running this and nothing else.
"""

import argparse
import base64
import json
import os
import re
import sys

START = "/* ==== BEGIN HUD SKIN"
END = "/* ================= END HUD SKIN ========================= */"


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("tracker")
    ap.add_argument("-s", "--skin", default="web/hud_skin.css")
    ap.add_argument("-i", "--icons", default="web/ui_icons.png")
    ap.add_argument("-f", "--frame", default="web/hud_frame.png")
    ap.add_argument("-o", "--out")
    args = ap.parse_args()

    skin = open(args.skin, encoding="utf-8").read()
    if START not in skin or END not in skin:
        raise SystemExit(f"{args.skin} is missing its markers; refusing to inject "
                         "something that cannot be removed again")

    # The icon sheet, inlined for the reason every other asset here is: the
    # tracker is opened off disk and file:// will not fetch a sibling image, so
    # a url() pointing at a neighbour renders nothing at all and does it
    # silently -- a mask that fails to load is an element with no mask, which
    # paints as a solid block rather than as nothing.
    if "__ICONS__" in skin:
        if not os.path.exists(args.icons):
            raise SystemExit(f"{args.icons} not found, and the skin asks for it. "
                             "Run tools/extract_ui_icons.py, or the icon rules "
                             "would paint solid blocks where icons should be.")
        b = base64.b64encode(open(args.icons, "rb").read()).decode()
        skin = skin.replace("__ICONS__", f"data:image/png;base64,{b}")
        print(f"  icons {os.path.getsize(args.icons) / 1e3:.0f} KB "
              f"({json.load(open(os.path.splitext(args.icons)[0] + '.json'))['count']} icons)")

    # Every frame the skin asks for, by placeholder. A missing one is fatal
    # rather than skipped: an unresolved url() in a border-image simply draws
    # nothing, and a panel silently losing its frame is the kind of failure
    # that ships.
    total = 0
    for token, path in (("__FRAME__", args.frame),
                        ("__CARD__", "web/hud_card.png"),
                        ("__SOFT__", "web/hud_soft.png"),
                        ("__TAB__", "web/hud_tab.png"),
                        ("__RULE__", "web/hud_rule.png"),
                        ("__SQ__", "web/hud_sq.png"),
                        ("__DECAL__", "web/hud_decal.png")):
        if token not in skin:
            continue
        if not os.path.exists(path):
            raise SystemExit(f"{path} not found, and the skin asks for it via {token}.")
        b = base64.b64encode(open(path, "rb").read()).decode()
        skin = skin.replace(token, f"data:image/png;base64,{b}")
        total += os.path.getsize(path)
    if total:
        print(f"  frames {total / 1e3:.1f} KB")

    html = open(args.tracker, encoding="utf-8").read()

    # Drop any earlier skin. The bound is checked afterwards: a pattern that
    # reaches past its own block eats the tracker silently, and this file is
    # five megabytes of someone's campaign.
    pat = re.compile(r"\n*" + re.escape(START) + r".*?" + re.escape(END) + r"\n?", re.S)
    before = len(html)
    html, removed = pat.subn("", html)
    if removed:
        cut = before - len(html)
        if cut > removed * (len(skin) + 4096):
            raise SystemExit(f"refusing to write: removing the old skin cut {cut} bytes, "
                             f"far more than the {len(skin)} it should")
        print(f"  removed {removed} earlier skin(s), {cut} bytes")

    # Appended to the END of the tracker's own style block, which is what makes
    # a plain selector here beat the same plain selector there. Anything less
    # would need !important on every rule, and !important on 271 buttons is not
    # a skin, it is a fight.
    close = "</style>"
    if html.count(close) != 1:
        raise SystemExit(f"expected exactly one </style>, found {html.count(close)} — "
                         "the tracker's shape has changed and the splice point "
                         "is no longer safe")
    out = html.replace(close, "\n" + skin + "\n" + close)

    dest = args.out or args.tracker
    with open(dest, "w", encoding="utf-8") as fh:
        fh.write(out)
    print(f"  skin  {os.path.getsize(args.skin) / 1e3:.1f} KB -> {dest} "
          f"({os.path.getsize(dest) / 1e6:.2f} MB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
