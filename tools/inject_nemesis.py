#!/usr/bin/env python3
"""Put the Nemesis Protocol into the combat tracker, without editing it.

Third bounded block in the same family as the sprite feed and the HUD skin,
and it follows the same two rules those established: the tracker file is never
edited in place, and everything this adds sits between two markers so removing
it restores the file byte for byte.

Order matters here in one direction only. This block WRAPS resolveGroup and
enemyRetaliation, and so does the sprite feed; whichever is injected second
wraps the other, and both still run. Injecting this one last means the sprite
panel plays its animation and the nemesis learns from the same exchange, in
that order. Either order works -- it is the double-binding of the two buttons
that has to be right, and both blocks re-bind by hand for exactly that reason.

Re-runnable. Any earlier copy is removed first.
"""

import argparse
import json
import os
import re
import sys

START = "/* ==== BEGIN NEMESIS PROTOCOL"
END = "/* ================= END NEMESIS PROTOCOL ========================= */"


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("tracker")
    ap.add_argument("-s", "--src", default="web/nemesis.js")
    ap.add_argument("-o", "--out")
    args = ap.parse_args()

    js = open(args.src, encoding="utf-8").read()
    if START not in js or END not in js:
        raise SystemExit(f"{args.src} is missing its markers; refusing to inject "
                         "something that cannot be removed again")

    html = open(args.tracker, encoding="utf-8").read()

    # Lift the four lists the block cannot reach at runtime.
    #
    # RETAL_TYPES, MITIGATION_CFG and RETAL_DMG_MULT are top-level `const`s, so
    # a function compiled in global scope can see them and the block reads them
    # live. AVOID, STRIKEBACK, AVOIDANCE_TYPES and STRIKEBACK_TYPES are declared
    # INSIDE a function and are not globals at all -- no scope trick reaches
    # them. Parsing them out of the source here is the only way to have them be
    # the tracker's own values rather than a hand-typed copy that goes stale the
    # first time a retaliation is reclassified.
    #
    # A missing list is fatal rather than defaulted to empty: with AVOID empty
    # every evasive defence silently classifies as "other", and the AI would go
    # on recommending confidently from a model that had quietly lost a third of
    # its meaning. That failure already happened once through window lookups
    # returning undefined, and it took a browser probe to find.
    tables = {}
    for name in ("AVOID", "STRIKEBACK", "AVOIDANCE_TYPES", "STRIKEBACK_TYPES"):
        m = re.search(r"\b" + name + r"\s*=\s*(\[[^\]]*\])", html)
        if not m:
            raise SystemExit(f"{name} not found in the tracker. The nemesis block "
                             "classifies every defence with it; without it the AI "
                             "would recommend from a model missing a third of its "
                             "meaning, and would not say so.")
        items = re.findall(r'"([^"]+)"', m.group(1))
        if not items:
            raise SystemExit(f"{name} parsed to an empty list — refusing to inject.")
        tables[name] = items
        print(f"  lifted {name}: {len(items)} entries")
    js = js.replace("__TABLES__", json.dumps(tables, indent=1))
    if "__TABLES__" in js:
        raise SystemExit("the block still holds an unresolved __TABLES__ token")

    # Drop any earlier copy. Checked the way the skin injector learned to check
    # it: not by comparing the bytes cut against the size of the new block --
    # that refuses the first build where the block legitimately gets smaller --
    # but by proving each removal span holds exactly one start marker, so an
    # unterminated block cannot swallow the tracker between two of them.
    pat = re.compile(r"\n*<script>\s*" + re.escape(START) + r".*?" + re.escape(END) + r"\s*</script>\n?", re.S)
    for m in pat.finditer(html):
        if m.group(0).count(START) != 1:
            raise SystemExit("refusing to write: a removal span holds more than one "
                             f"'{START}' marker")
    html, removed = pat.subn("", html)
    if removed:
        print(f"  removed {removed} earlier copy/copies")

    # Appended at the very end of <body>, after every other block. It needs the
    # tracker's globals to exist and it needs the sprite feed to have already
    # wrapped what it wraps, and a script at the end of the body has both.
    close = "</body>"
    if html.count(close) != 1:
        raise SystemExit(f"expected exactly one </body>, found {html.count(close)} — "
                         "the tracker's shape has changed and the splice point "
                         "is no longer safe")
    out = html.replace(close, "<script>\n" + js + "\n</script>\n" + close)

    dest = args.out or args.tracker
    os.makedirs(os.path.dirname(dest) or ".", exist_ok=True)
    with open(dest, "w", encoding="utf-8") as fh:
        fh.write(out)
    print(f"  nemesis {len(js) / 1e3:.1f} KB -> {dest} ({len(out) / 1e6:.2f} MB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
