#!/usr/bin/env python3
"""Rescale an animated WebP's frame durations and re-emit WebP + GIF.

Scaling uniformly rather than re-timing by hand keeps the rhythm that was
designed into each clip -- held peaks, snapped glitch cuts -- and changes only
how long the eye gets with each frame.
"""
import sys
from PIL import Image
import numpy as np

def frames_of(path):
    im = Image.open(path); out = []
    n = 0
    while True:
        try: im.seek(n)
        except EOFError: break
        im.load()                       # WebP duration is None without this
        out.append((im.convert("RGBA").copy(), im.info.get("duration") or 100))
        n += 1
    return out

def write(stem, frs, durs):
    frs[0].save(stem+".webp", save_all=True, append_images=frs[1:], duration=durs,
                loop=0, lossless=False, quality=92, method=6, allow_mixed=True)
    gifs = []
    for f in frs:
        bg = Image.new("RGBA", f.size, (0,0,0,0)); bg.alpha_composite(f)
        p = bg.convert("RGB").quantize(colors=255, method=Image.Quantize.MAXCOVERAGE)
        arr = np.asarray(p).copy(); arr[np.asarray(bg)[...,3] < 128] = 255
        q = Image.fromarray(arr, "P"); q.putpalette(p.getpalette()); gifs.append(q)
    gifs[0].save(stem+".gif", save_all=True, append_images=gifs[1:], duration=durs,
                 loop=0, transparency=255, disposal=2, optimize=False)

src, stem, mult = sys.argv[1], sys.argv[2], float(sys.argv[3])
fr = frames_of(src)
frs  = [f for f,_ in fr]
old  = [d for _,d in fr]
# GIF stores centiseconds, so land on multiples of 10 and the two formats agree
new  = [max(20, int(round(d*mult/10.0))*10) for d in old]
write(stem, frs, new)
print("%-28s %2d frames  %4dms -> %4dms  (%.0f -> %.0f ms/frame, %.1f -> %.1f fps)" % (
    stem, len(frs), sum(old), sum(new),
    sum(old)/len(old), sum(new)/len(new), 1000*len(old)/sum(old), 1000*len(new)/sum(new)))
