#!/usr/bin/env python3
"""Apply the BLACKBOX fixes to a tracker file: deflate the CSS artwork, and
inject the fix blocks.

WHAT DEFLATION MEANS AND WHY IT IS THE LOAD FIX.

The tracker's one <style> block carries about 4.3 MB of artwork inline, as
base64 `url("data:...")` values. The CSS parser has to read every byte of that
before the page can style anything, and three of those values sit in CUSTOM
PROPERTIES on :root and body -- so they are inherited by all three thousand
elements and re-resolved on every full style recalculation.

Measured on the file this was written for:

    load to interactive                       22.1 s
    the same file with the CSS images gone    15.0 s
    a full style recalculation                 5.4 s
    the same recalculation, images as blobs    0.036 s

So the payloads move out of the stylesheet and into a JS table, and each
`url("data:...")` becomes `url("about:blank#bbimgN")` -- a 24-character marker.
bb_cssboot.js, injected into the <head> immediately after the stylesheet, turns
the table back into Blob URLs and writes them into the rules before the first
paint. The bytes are identical; only where they live changes.

The marker is deliberately a VALID, harmless URL. If the boot script is deleted
or fails, the artwork is missing and nothing else breaks.

Everything is reversible: --inflate puts the payloads back into the stylesheet
and removes the block, restoring the file byte for byte.
"""

import argparse
import json
import os
import re
import sys

BOOT_BEGIN = "/* ==== BEGIN BLACKBOX CSS IMAGE RESTORE"
BOOT_END = "/* ================= END BLACKBOX CSS IMAGE RESTORE ========================= */"
TABLE_BEGIN = "/* ==== BEGIN BLACKBOX CSS IMAGE TABLE"
TABLE_END = "/* ================= END BLACKBOX CSS IMAGE TABLE ========================= */"

URL_RE = re.compile(r'url\(\s*(["\']?)(data:[^"\')\s]+)\1\s*\)')


def style_span(html):
    """The FIRST <style> block -- the tracker's own. Later blocks belong to
    injected skins and are left alone."""
    i = html.index("<style>")
    j = html.index("</style>", i)
    return i + len("<style>"), j


def deflate(html, floor):
    a, b = style_span(html)
    css = html[a:b]
    table, order, n = {}, {}, 0

    def sub(m):
        nonlocal n
        uri = m.group(2)
        if len(uri) < floor:
            return m.group(0)
        key = order.get(uri)
        if key is None:
            n += 1
            key = "bbimg%d" % n
            order[uri] = key
            table[key] = uri
        # The original quoting is kept, unquoted included, so --inflate can put
        # the file back byte for byte rather than merely equivalently.
        q = m.group(1)
        return "url(%sabout:blank#%s%s)" % (q, key, q)

    css2 = URL_RE.sub(sub, css)
    if not table:
        return html, table, 0
    saved = len(css) - len(css2)

    boot = open(os.path.join(os.path.dirname(__file__), "..", "web",
                             "bb_cssboot.js"), encoding="utf-8").read()
    payload = (
        "<script>\n" + TABLE_BEGIN + " — injected block, delete to the END marker to revert ==== */\n"
        "/* The artwork that used to sit inside the stylesheet. Same bytes, parsed\n"
        "   as a JS object literal instead of as CSS url() tokens, which the engine\n"
        "   does several times faster and, more to the point, does ONCE -- a value\n"
        "   in here is never inherited by anything. */\n"
        "window.__BB_CSS_IMG = " + json.dumps(table, separators=(",", ":")) + ";\n"
        + TABLE_END + "\n" + boot + "</script>\n")

    out = html[:a] + css2 + html[b:]
    # The boot goes immediately after the stylesheet it repairs, inside <head>,
    # so the images are in place before the body is even parsed.
    close = out.index("</style>", a)
    close += len("</style>")
    out = out[:close] + "\n" + payload + out[close:]
    return out, table, saved


def inflate(html):
    """Undo it: payloads back into the stylesheet, both blocks removed."""
    m = re.search(re.escape(TABLE_BEGIN) + r".*?window\.__BB_CSS_IMG = (\{.*?\});\n",
                  html, re.S)
    if not m:
        return html, 0
    table = json.loads(m.group(1))
    a, b = style_span(html)
    css = html[a:b]
    for key, uri in table.items():
        for q in ('"', "'", ""):
            css = css.replace("url(%sabout:blank#%s%s)" % (q, key, q),
                              "url(%s%s%s)" % (q, uri, q))
    html = html[:a] + css + html[b:]
    # strip the injected <script> that carried the table and the boot
    i = html.index("<script>\n" + TABLE_BEGIN)
    if i and html[i - 1] == "\n":      # the newline deflate put in front of it
        i -= 1
    j = html.index(BOOT_END, i) + len(BOOT_END)
    j = html.index("</script>", j) + len("</script>") + 1
    return html[:i] + html[j:], len(table)


def inject_block(html, path):
    """Add (or replace) a bounded block just before </body>."""
    src = open(path, encoding="utf-8").read().rstrip("\n")
    first = src.split("\n", 1)[0].strip()
    last = src.rstrip().rsplit("\n", 1)[-1].strip()
    start = first[:first.index("—")].strip() if "—" in first else first
    if start in html:
        i = html.index(start)
        # back up over an opening <script> if one is adjacent
        k = html.rfind("<script>", 0, i)
        if k >= 0 and html[k + len("<script>"):i].strip() == "":
            i = k
        j = html.index(last, i) + len(last)
        m = html.find("</script>", j)
        if m >= 0 and html[j:m].strip() == "":
            j = m + len("</script>")
        html = html[:i] + html[j:]
        removed = True
    else:
        removed = False
    k = html.rindex("</body>")
    return html[:k] + "<script>\n" + src + "\n</script>\n" + html[k:], removed


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("file")
    ap.add_argument("-o", "--out")
    ap.add_argument("--floor", type=int, default=4096,
                    help="least data-URI length worth moving out of the CSS "
                         "(default 4096; below that the marker is not smaller "
                         "than the payload by enough to matter)")
    ap.add_argument("--blocks", nargs="*", default=[],
                    help="JS files to inject before </body>")
    ap.add_argument("--inflate", action="store_true",
                    help="put the CSS artwork back and remove the boot block")
    args = ap.parse_args()

    html = open(args.file, encoding="utf-8").read()
    before = len(html)

    if args.inflate:
        html, n = inflate(html)
        print("  inflated %d image(s) back into the stylesheet" % n)
    else:
        html, table, saved = deflate(html, args.floor)
        if table:
            print("  deflated %d image(s), %.2f MB moved out of the stylesheet"
                  % (len(table), saved / 1e6))
        else:
            print("  no CSS images to deflate (already done, or none over the floor)")

    for b in args.blocks:
        html, replaced = inject_block(html, b)
        print("  block  %-28s %s" % (os.path.basename(b),
                                     "replaced" if replaced else "added"))

    out = args.out or args.file
    open(out, "w", encoding="utf-8").write(html)
    print("  %.2f MB -> %s (was %.2f MB)" % (len(html) / 1e6, out, before / 1e6))
    return 0


if __name__ == "__main__":
    sys.exit(main())
