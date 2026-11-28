#!/usr/bin/env python3
"""Add a battle map to BLACKBOX_MERC_OS.

Companion to bb_fix.py and it uses that file's machinery: the image goes into
the same __BB_CSS_IMG payload table, keyed by its own SHA-1 the same way, and
is put back at load time by the same bb_cssboot.js.

WHAT "PERFECTLY CROPPED" MEANS FOR THIS FILE, since it is not obvious and it is
the whole reason this tool exists rather than a one-line sed:

  The battle map draws a 12x8 grid over whatever backdrop is chosen, and the
  stage takes its shape from the map's own declared aspect-ratio. So a map is
  square-celled -- and only then is gridDistance() measuring the same thing
  horizontally and vertically -- when the image is exactly 3:2. Anything else
  and a "tile" is a rectangle, diagonal moves lie, and the out-of-range
  falloff is wrong along one axis.

  So this refuses anything that is not 3:2 within half a percent, rather than
  quietly letting a squashed map in. Crop first; the tool is the last step.

The image is written into the CSS rule DIRECTLY rather than through a
--bm-img-N custom property the way the file's older maps are. A custom
property on :root is inherited by every element on the page and re-resolved on
every style recalculation, which is what made this file take five seconds per
action before it was fixed; bb_cssboot.js now has to dissolve those back out
again at load. A plain background-image has none of that, so a map added here
costs nothing to have.

Nothing here registers the map with the app: bb_ext_maps.js finds it at run
time by looking for .bm-bg-* rules the tracker does not know about. Add a
sixth map with this tool tomorrow and no JavaScript needs editing.

  python3 tools/bb_maps.py build.html --map highway_chase "Highway — Chase" web/maps/highway_chase.webp
"""
import argparse, base64, hashlib, json, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bb_fix import style_span, existing_table, rewrite_table   # one source of truth

CSS_BEGIN = "/* ==== BEGIN BLACKBOX MAP RULES — injected, delete to the END marker to revert ==== */"
CSS_END = "/* ================= END BLACKBOX MAP RULES ========================= */"

MIME = {".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg"}


def dims(path):
    """Width and height without a Pillow dependency for the common cases."""
    with open(path, "rb") as f:
        b = f.read(64)
    if b[:8] == b"\x89PNG\r\n\x1a\n":
        return int.from_bytes(b[16:20], "big"), int.from_bytes(b[20:24], "big")
    if b[:4] == b"RIFF" and b[8:12] == b"WEBP":
        if b[12:16] == b"VP8X":
            return (int.from_bytes(b[24:27], "little") + 1,
                    int.from_bytes(b[27:30], "little") + 1)
        if b[12:16] == b"VP8L":
            n = int.from_bytes(b[21:25], "little")
            return (n & 0x3FFF) + 1, ((n >> 14) & 0x3FFF) + 1
        if b[12:16] == b"VP8 ":
            return (int.from_bytes(b[26:28], "little") & 0x3FFF,
                    int.from_bytes(b[28:30], "little") & 0x3FFF)
    from PIL import Image                       # jpeg, and anything unusual
    with Image.open(path) as im:
        return im.size


def rule_for(name, key, w, h):
    return (".bm-stage.bm-bg-%s{background-image:url(about:blank#%s);"
            "background-size:cover;background-position:center;"
            "background-repeat:no-repeat;aspect-ratio:%d/%d}" % (name, key, w, h))


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("file")
    ap.add_argument("-o", "--out")
    ap.add_argument("--map", nargs=3, action="append", default=[],
                    metavar=("NAME", "LABEL", "IMAGE"),
                    help="key, the label shown in the picker, and the image file")
    ap.add_argument("--interior", action="append", default=[], metavar="NAME:x0,y0,x1,y1",
                    help="grid cells (inclusive, 0-based, 12x8) that are INSIDE on this map. "
                         "Units spawn only there and cannot be moved or thrown out of it.")
    ap.add_argument("--tolerance", type=float, default=0.005,
                    help="how far from 3:2 a map may be before it is refused (default 0.5%%)")
    a = ap.parse_args()
    if not a.map:
        ap.error("nothing to do — pass at least one --map")

    html = open(a.file, encoding="utf-8").read()
    table, has_table = existing_table(html)
    if not has_table:
        raise SystemExit("no __BB_CSS_IMG table in this file — run bb_fix.py on it first")

    rules, labels = [], {}
    for name, label, img in a.map:
        if not re.fullmatch(r"[a-z0-9_]+", name):
            raise SystemExit("map key %r must be lowercase letters, digits and underscores" % name)
        w, h = dims(img)
        ratio = w / h
        if abs(ratio - 1.5) > a.tolerance:
            raise SystemExit(
                "%s is %dx%d (%.4f). The 12x8 grid needs 3:2 or its cells are not square.\n"
                "Crop it to 3:2 first — %d x %d, or %d x %d."
                % (img, w, h, ratio, w, round(w / 1.5), round(h * 1.5), h))
        uri = "data:%s;base64,%s" % (
            MIME.get(os.path.splitext(img)[1].lower(), "image/png"),
            base64.b64encode(open(img, "rb").read()).decode("ascii"))
        # The prefix is "bbimg" because that is what bb_cssboot.js looks for:
        # its marker pattern is /url\(\s*(['"]?)about:blank#(bbimg[A-Za-z0-9_]+)\1\s*\)/.
        # A prettier "bbmap" prefix was tried and the loader silently ignored
        # every one of them -- the markers stayed in the stylesheet as literal
        # about:blank URLs, which resolve to nothing, so all four maps rendered
        # as an empty stage with no error anywhere. Same table, same prefix.
        key = "bbimg" + hashlib.sha1(uri.encode()).hexdigest()[:12]
        table[key] = uri
        rules.append(rule_for(name, key, w, h))
        labels[name] = label
        print("  map %-16s %4dx%-4d  %6d KB  %s" % (name, w, h, len(uri) // 1024, key))

    # The rules live in one bounded run inside the tracker's own <style>, so a
    # re-run replaces the whole run rather than accumulating copies. A map
    # whose name is already in the block keeps its place; a new one is appended.
    lo, hi = style_span(html)
    css = html[lo:hi]
    old = ""
    if CSS_BEGIN in css:
        i = css.index(CSS_BEGIN)
        j = css.index(CSS_END, i) + len(CSS_END)
        old, css = css[i:j], css[:i] + css[j:]
    kept = [r for r in re.findall(r"\.bm-stage\.bm-bg-[a-z0-9_]+\{[^}]*\}", old)
            if re.search(r"bm-bg-([a-z0-9_]+)\{", r).group(1) not in labels]
    block = "\n".join([CSS_BEGIN] + kept + rules + [CSS_END])
    html = html[:lo] + css.rstrip() + "\n" + block + "\n" + html[hi:]

    # A label the picker can show. bb_ext_maps.js reads this, and falls back to
    # the key prettified if it is missing, so the two are never out of step.
    lbl = json.dumps(labels, separators=(",", ":"))
    if "window.__BB_MAP_LABELS" in html:
        html = re.sub(r"window\.__BB_MAP_LABELS\s*=\s*Object\.assign\(window\.__BB_MAP_LABELS\|\|\{\},(\{.*?\})\);",
                      lambda m: m.group(0).replace(m.group(1), json.dumps(
                          {**json.loads(m.group(1)), **labels}, separators=(",", ":"))),
                      html, count=1, flags=re.S)
    else:
        k = html.rindex("</body>")
        html = (html[:k] + "<script>window.__BB_MAP_LABELS=Object.assign("
                "window.__BB_MAP_LABELS||{}," + lbl + ");</script>\n" + html[k:])

    # Interior bounds, in the same place and shape as the labels. Kept as data
    # rather than baked into the CSS because it is a RULE, not a look: the block
    # that enforces it reads this, and a map with no entry here is unconstrained
    # exactly as every map was before.
    if a.interior:
        box = {}
        for spec in a.interior:
            key, _, nums = spec.partition(":")
            try:
                x0, y0, x1, y1 = [int(v) for v in nums.split(",")]
            except ValueError:
                raise SystemExit("--interior wants NAME:x0,y0,x1,y1 — got %r" % spec)
            if not (0 <= x0 <= x1 <= 11 and 0 <= y0 <= y1 <= 7):
                raise SystemExit("--interior %s is outside the 12x8 grid" % spec)
            box[key] = [x0, y0, x1, y1]
        prev = re.search(r"window\.__BB_MAP_INTERIOR=Object\.assign\("
                         r"window\.__BB_MAP_INTERIOR\|\|\{\},(\{.*?\})\);", html, re.S)
        merged = json.dumps({**(json.loads(prev.group(1)) if prev else {}), **box},
                            separators=(",", ":"))
        line = ("window.__BB_MAP_INTERIOR=Object.assign(window.__BB_MAP_INTERIOR||{},"
                + merged + ");")
        if prev:
            html = html[:prev.start()] + line + html[prev.end():]
        else:
            k2 = html.rindex("</body>")
            html = html[:k2] + "<script>" + line + "</script>\n" + html[k2:]
        for k, v in box.items():
            print("  inside %-16s cols %d-%d rows %d-%d  (%d cells)"
                  % (k, v[0], v[2], v[1], v[3], (v[2]-v[0]+1)*(v[3]-v[1]+1)))

    html = rewrite_table(html, table)
    out = a.out or a.file
    open(out, "w", encoding="utf-8").write(html)
    print("  %.2f MB -> %s" % (len(html.encode()) / 1048576, out))


if __name__ == "__main__":
    main()
