#!/usr/bin/env python3
"""Insert (or replace) a bounded block of JS at the end of the tracker's script.

Every extension in this file is fenced between a BEGIN and an END marker so it
can be lifted back out by hand. This puts one in, and re-running it replaces
the block rather than stacking a second copy -- which matters, because these
blocks wrap functions, and a wrapper applied twice fires twice.

    python3 tools/bb_inject.py --html T.html --block web/bb_ext_cues.js --out T.html
"""
import argparse, os, re, shutil, sys


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--html", required=True)
    ap.add_argument("--block", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

    src = open(args.html, encoding="utf-8", errors="replace").read()
    blk = open(args.block, encoding="utf-8").read().strip()

    m = re.match(r"/\* ==== BEGIN ([A-Z0-9 +'&-]+) —", blk)
    if not m:
        sys.exit("the block must open with a '/* ==== BEGIN <NAME> —' marker")
    name = m.group(1).strip()
    end = f"/* ================= END {name} ========================= */"
    if end not in blk:
        sys.exit(f"the block must close with its matching END marker for {name!r}")

    # replace an existing copy of this same block, wherever it sits
    start_pat = re.compile(r"/\* ==== BEGIN " + re.escape(name) + r" —.*?"
                           + re.escape(end), re.S)
    existing = start_pat.search(src)
    if existing:
        src = src[:existing.start()] + blk + src[existing.end():]
        how = "replaced in place"
    else:
        i = src.rfind("</script>")
        if i < 0:
            sys.exit("no </script> to insert before")
        src = src[:i] + "\n" + blk + "\n" + src[i:]
        how = "appended before the last </script>"

    if os.path.abspath(args.out) == os.path.abspath(args.html):
        shutil.copy2(args.html, args.html + ".bak")
    open(args.out, "w", encoding="utf-8").write(src)

    chk = open(args.out, encoding="utf-8", errors="replace").read()
    assert chk.count("BEGIN " + name) == 1, "block is present more than once"
    assert chk.count(end) == 1, "end marker is present more than once"
    assert chk.rstrip().endswith("</html>"), "document no longer closes"
    print(f"{name}: {how}")
    print(f"  markers: 1 begin, 1 end   document closes: yes")
    print(f"  {os.path.getsize(args.html)/1048576:.2f} MB -> {os.path.getsize(args.out)/1048576:.2f} MB")


if __name__ == "__main__":
    main()
