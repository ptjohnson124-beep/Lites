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
JS_START = "/* ==== BEGIN HUD DIALS"
JS_END = "/* ================= END HUD DIALS ========================= */"


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("tracker")
    ap.add_argument("-s", "--skin", default="web/hud_skin.css")
    ap.add_argument("-i", "--icons", default="web/ui_icons.webp")
    ap.add_argument("-f", "--frame", default="web/hud_frame.png")
    ap.add_argument("-j", "--dials", default="web/hud_dials.js")
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
        # The one asset with a hard size ceiling, because it is the one asset
        # that goes into a CSS custom property. Chromium drops a custom
        # property longer than 2^21 characters -- exactly 2,097,152 -- and does
        # it silently: var(--uic) computes to the empty string, mask-image
        # falls back to none, and every icon in the skin paints as a solid
        # block on its own background colour. That shipped once, undetected,
        # because a solid 16px square in the right place still looks like a
        # deliberate bullet until you look closely.
        if len(b) > 2 ** 21:
            raise SystemExit(
                f"{args.icons} is {len(b)} base64 characters, past the "
                f"{2 ** 21} a CSS custom property can hold. Every icon would "
                "render as a solid block. Inline it as lossless WebP "
                "(tools/extract_ui_icons.py writes one next to the PNG) or "
                "shrink the sheet.")
        m = "image/webp" if args.icons.endswith(".webp") else "image/png"
        skin = skin.replace("__ICONS__", f"data:{m};base64,{b}")
        print(f"  icons {os.path.getsize(args.icons) / 1e3:.0f} KB "
              f"({json.load(open(os.path.splitext(args.icons)[0] + '.json'))['count']} icons)")

    total = 0

    # The typefaces, which are the only assets here that are not pictures.
    #
    # The tracker names THREE fonts it has never shipped -- Space Mono, Chakra
    # Petch and Cinzel -- and names them with no @font-face at all, so on any
    # machine without them installed the whole file falls back to
    # ui-monospace, system-ui and Georgia. That is nearly every machine, which
    # means the tracker has never once rendered the way its author specified.
    # Embedding those three needs no rule changes: the var(--mono) that is
    # already on 97 selectors starts resolving.
    #
    # All seven are SIL Open Font License faces from Google Fonts, latin subset
    # only, woff2. The latin subset matters: the full family with Cyrillic and
    # Vietnamese is several times the size for glyphs this tracker never sets.
    for token, path in (("__F_MONO__", "web/fonts/SpaceMono-400.woff2"),
                        ("__F_MONOB__", "web/fonts/SpaceMono-700.woff2"),
                        ("__F_HUD__", "web/fonts/ChakraPetch-600.woff2"),
                        ("__F_SACRED__", "web/fonts/Cinzel-700.woff2"),
                        ("__F_DISP__", "web/fonts/Orbitron-800.woff2"),
                        ("__F_HEAVY__", "web/fonts/Audiowide-400.woff2"),
                        ("__F_WIDE__", "web/fonts/Syncopate-700.woff2")):
        if token not in skin:
            continue
        if not os.path.exists(path):
            raise SystemExit(f"{path} not found, and the skin asks for it via {token}.")
        b = base64.b64encode(open(path, "rb").read()).decode()
        skin = skin.replace(token, f"data:font/woff2;base64,{b}")
        total += os.path.getsize(path)
    if total:
        print(f"  fonts  {total / 1e3:.1f} KB")
    total = 0

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
                        ("__DECAL__", "web/hud_decal.png"),
                        ("__HDR__", "web/hud_hdr.png"),
                        ("__HDRD__", "web/hud_hdr_d.png"),
                        ("__BODY__", "web/hud_body.png"),
                        ("__FTR__", "web/hud_ftr.png"),
                        ("__TIERX__", "web/hud_tier_x.png"),
                        ("__TIEREX__", "web/hud_tier_ex.png"),
                        ("__TIERUEX__", "web/hud_tier_uex.png"),
                        ("__EMB__", "web/ui_emblems.png"),
                        ("__RULE0__", "web/hud_rule0.png"),
                        ("__RULE1__", "web/hud_rule1.png"),
                        ("__RULE2__", "web/hud_rule2.png"),
                        ("__RULE3__", "web/hud_rule3.png"),
                        ("__RULE4__", "web/hud_rule4.png"),
                        ("__RULE5__", "web/hud_rule5.png"),
                        ("__RULE6__", "web/hud_rule6.png"),
                        ("__RULE7__", "web/hud_rule7.png"),
                        ("__RULE8__", "web/hud_rule8.png"),
                        ("__RING__", "web/hud_ring2.png"),
                        ("__CNRTL__", "web/hud_cnrtl.png"),
                        ("__CNRBL__", "web/hud_cnrbl.png"),
                        ("__DIAL0__", "web/hud_dial0.png"),
                        ("__DIAL1__", "web/hud_dial1.png"),
                        ("__DIAL2__", "web/hud_dial2.png"),
                        ("__DIAL3__", "web/hud_dial3.png"),
                        ("__DIAL4__", "web/hud_dial4.png"),
                        ("__DIAL5__", "web/hud_dial5.png"),
                        ("__DIAL6__", "web/hud_dial6.png"),
                        ("__DIAL7__", "web/hud_dial7.png"),
                        ("__DIAL8__", "web/hud_dial8.png"),
                        ("__WAVE__", "web/hud_wave.webp"),
                        ("__IMPACT__", "web/hud_impact.webp"),
                        ("__GLITCH__", "web/hud_glitch.webp"),
                        ("__PLATE0__", "web/hud_plate0.webp"),
                        ("__PLATE1__", "web/hud_plate1.webp"),
                        ("__PLATE2__", "web/hud_plate2.webp"),
                        ("__PLATE3__", "web/hud_plate3.webp"),
                        ("__PLATE4__", "web/hud_plate4.webp"),
                        ("__PLATE5__", "web/hud_plate5.webp"),
                        ("__PLATE6__", "web/hud_plate6.webp"),
                        ("__HAZARD__", "web/hud_hazard.png"),
                        ("__ALERT__", "web/hud_alert.png")):
        if token not in skin:
            continue
        if not os.path.exists(path):
            raise SystemExit(f"{path} not found, and the skin asks for it via {token}.")
        b = base64.b64encode(open(path, "rb").read()).decode()
        # The wave is an animated WebP; everything else is a PNG. A wrong
        # mime on a data URI is not a warning, it is an image that does
        # not decode.
        m = "image/webp" if path.endswith(".webp") else "image/png"
        skin = skin.replace(token, f"data:{m};base64,{b}")
        total += os.path.getsize(path)
    if total:
        print(f"  frames {total / 1e3:.1f} KB")

    html = open(args.tracker, encoding="utf-8").read()

    # Drop any earlier skin. The failure this guards against is a lazy .*?
    # reaching PAST its own block -- a file with a START whose END is missing
    # matches on to the next block's END and takes everything between with it,
    # and this file is five megabytes of someone's campaign.
    #
    # Checked exactly rather than by size. The first version compared the bytes
    # cut against the size of the NEW skin, which says nothing: it refused the
    # first time the skin legitimately got SMALLER (the sprite moved from PNG
    # to WebP and shrank by 1.2MB), and it would have passed a runaway cut on
    # any build where the new skin happened to be large. What actually
    # distinguishes a correct removal is that each span is one block, so that
    # is what is tested -- no span may contain a second START.
    pat = re.compile(r"\n*" + re.escape(START) + r".*?" + re.escape(END) + r"\n?", re.S)
    before = len(html)
    for m in pat.finditer(html):
        if m.group(0).count(START) != 1:
            raise SystemExit("refusing to write: a removal span holds more than one "
                             f"'{START}' marker, so an unterminated block would take "
                             "the tracker between them with it")
    html, removed = pat.subn("", html)
    if removed:
        cut = before - len(html)
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

    # The dial script rides along after the style block rather than in its own
    # injection pass, because it is useless without the CSS that draws the ring
    # and the CSS is inert without it. Two halves of one feature should not be
    # able to get out of step by someone running one command and not the other.
    tail = ""
    if os.path.exists(args.dials):
        js = open(args.dials, encoding="utf-8").read()
        pat_js = re.compile(r"\n*<script>\s*" + re.escape(JS_START) + r".*?"
                            + re.escape(JS_END) + r"\s*</script>\n?", re.S)
        html = pat_js.sub("", html)
        tail = "\n<script>\n" + js + "\n</script>"
        print(f"  dials {os.path.getsize(args.dials) / 1e3:.1f} KB")

    out = html.replace(close, "\n" + skin + "\n" + close + tail)

    dest = args.out or args.tracker
    with open(dest, "w", encoding="utf-8") as fh:
        fh.write(out)
    print(f"  skin  {os.path.getsize(args.skin) / 1e3:.1f} KB -> {dest} "
          f"({os.path.getsize(dest) / 1e6:.2f} MB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
