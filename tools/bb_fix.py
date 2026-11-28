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
import hashlib
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


def existing_table(html):
    m = re.search(re.escape(TABLE_BEGIN) + r".*?window\.__BB_CSS_IMG = (\{.*?\});\n",
                  html, re.S)
    return (json.loads(m.group(1)) if m else {}), bool(m)


def deflate(html, floor):
    a, b = style_span(html)
    css = html[a:b]

    # A KEY IS THE IMAGE'S OWN FINGERPRINT, never a counter.
    #
    # This is a bug fix, and the bug destroyed artwork in a shipped file. The
    # first version numbered keys bbimg1, bbimg2, ... from zero on every run.
    # Run it a second time on a file that had already been deflated -- which is
    # what happens the moment somebody adds a new image and rebuilds -- and the
    # new images take the names bbimg1..bbimgN that the OLD markers were still
    # using, while the freshly written table contains only the new payloads. The
    # markers survive and quietly point at the wrong picture: in the file this
    # was found in, the UI icon sheet and the combat backdrop had both become
    # battle maps, and their real payloads were gone from the file entirely.
    #
    # Hashing the content cannot do that. The same image always gets the same
    # key, a different image always gets a different one, and re-running merges
    # instead of renumbering.
    table, had = existing_table(html)

    def sub(m):
        uri = m.group(2)
        if len(uri) < floor:
            return m.group(0)
        key = "bbimg" + hashlib.sha1(uri.encode()).hexdigest()[:12]
        table[key] = uri
        # The original quoting is kept, unquoted included, so --inflate can put
        # the file back byte for byte rather than merely equivalently.
        q = m.group(1)
        return "url(%sabout:blank#%s%s)" % (q, key, q)

    css2 = URL_RE.sub(sub, css)
    # Anything the CSS still points at must be carried forward, or a re-run
    # drops the payloads an earlier run stored.
    live = set(re.findall(r"about:blank#(bbimg[A-Za-z0-9_]+)", css2))
    for k in list(table):
        if k not in live:
            del table[k]
    missing = sorted(live - set(table))
    if missing:
        raise SystemExit("refusing to write: %d marker(s) in the CSS have no payload "
                         "(%s). Recover them with --donor before rebuilding."
                         % (len(missing), ", ".join(missing[:4])))
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
    out = strip_boot(out)
    # The boot goes immediately after the stylesheet it repairs, inside <head>,
    # so the images are in place before the body is even parsed.
    close = out.index("</style>", a)
    close += len("</style>")
    out = out[:close] + "\n" + payload + out[close:]
    return out, table, saved


def strip_boot(html):
    """Remove a table+boot block already in the file, so a rebuild replaces it."""
    i = html.find("<script>\n" + TABLE_BEGIN)
    if i < 0:
        return html
    if i and html[i - 1] == "\n":
        i -= 1
    j = html.index(BOOT_END, i) + len(BOOT_END)
    j = html.index("</script>", j) + len("</script>") + 1
    return html[:i] + html[j:]


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


def repair(html, donor_path, props):
    """Put a custom property's real image back, from an earlier build.

    Needed because the counter-keyed deflater could re-point a marker at
    somebody else's picture and drop the original payload. The donor is read
    for the SAME property name, so this cannot guess wrong: --uic is refilled
    from --uic or not at all.
    """
    donor = open(donor_path, encoding="utf-8").read()
    da, db = style_span(donor)
    dcss = donor[da:db]
    table, _ = existing_table(html)
    dtable, _ = existing_table(donor)
    a, b = style_span(html)
    css = html[a:b]
    fixed = []
    for name in props:
        want = None
        m = re.search(re.escape(name) + r'\s*:\s*url\((["\']?)(data:[^"\')\s]+)\1\)', dcss)
        if m:
            want = m.group(2)
        else:                                   # the donor is deflated too
            m = re.search(re.escape(name) + r'\s*:\s*url\((["\']?)about:blank#(bbimg[A-Za-z0-9_]+)\1\)', dcss)
            if m and m.group(2) in dtable:
                want = dtable[m.group(2)]
        if not want:
            print("  repair %-16s no payload in the donor — skipped" % name)
            continue
        key = "bbimg" + hashlib.sha1(want.encode()).hexdigest()[:12]
        table[key] = want
        cur = re.search(re.escape(name) + r'\s*:\s*url\((["\']?)[^)]*\1\)', css)
        if not cur:
            print("  repair %-16s not declared here — skipped" % name)
            continue
        css = css[:cur.start()] + '%s:url("about:blank#%s")' % (name, key) + css[cur.end():]
        fixed.append(name)
        print("  repair %-16s -> %s  (%.0f KB)" % (name, key, len(want) / 1024))
    if not fixed:
        return html
    html = html[:a] + css + html[b:]
    return rewrite_table(html, table)


def rewrite_table(html, table):
    m = re.search(re.escape(TABLE_BEGIN) + r".*?window\.__BB_CSS_IMG = (\{.*?\});\n",
                  html, re.S)
    if not m:
        raise SystemExit("no image table in this file to rewrite")
    lo = m.start(1)
    hi = m.end(1)
    return html[:lo] + json.dumps(table, separators=(",", ":")) + html[hi:]


def refresh_boot(html):
    """Swap in the current bb_cssboot.js, keeping the payload table as it is."""
    boot = open(os.path.join(os.path.dirname(__file__), "..", "web",
                             "bb_cssboot.js"), encoding="utf-8").read()
    i = html.find(BOOT_BEGIN)
    if i < 0:
        return html, False
    j = html.index(BOOT_END, i) + len(BOOT_END)
    return html[:i] + boot.rstrip("\n") + html[j:], True


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
    ap.add_argument("--donor", metavar="FILE",
                    help="an earlier build to recover a lost payload from: any "
                         "custom property whose image is missing or wrong is "
                         "refilled from the same property in this file")
    ap.add_argument("--refresh-boot", action="store_true",
                    help="replace the injected boot script with the current "
                         "web/bb_cssboot.js, leaving the payload table alone")
    ap.add_argument("--repair", default="", metavar="NAMES",
                    help="comma-separated custom properties to refill from "
                         "--donor, written without their leading dashes, "
                         "e.g. --repair uic,combat-bg-1 (argparse would read a "
                         "literal --uic as an option of its own)")
    args = ap.parse_args()

    html = open(args.file, encoding="utf-8").read()
    before = len(html)
    props = ["--" + x.strip().lstrip("-") for x in args.repair.split(",") if x.strip()]

    if args.inflate:
        html, n = inflate(html)
        print("  inflated %d image(s) back into the stylesheet" % n)
    elif props or args.refresh_boot:
        pass                      # repairing in place, not re-deflating
    else:
        html, table, saved = deflate(html, args.floor)
        if table:
            print("  deflated %d image(s), %.2f MB moved out of the stylesheet"
                  % (len(table), saved / 1e6))
        else:
            print("  no CSS images to deflate (already done, or none over the floor)")

    if args.donor and props:
        html = repair(html, args.donor, props)
    if args.refresh_boot:
        html, ok = refresh_boot(html)
        print("  boot   %s" % ("refreshed" if ok else "no boot block in this file"))

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
