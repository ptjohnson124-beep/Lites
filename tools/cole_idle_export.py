from PIL import Image
import numpy as np

C=np.load("reg.npy")
ORDER=[1,12,10,4,11,7,5,8,6,2,3]            # 1-based, f9 dropped as an outlier
BLINK=7
# Fire reads best near-uniform; the blink is cut short so it snaps instead of
# reading as a sleepy half-close.
DUR={1:95,12:90,10:85,4:100,11:90,7:70,5:85,8:95,6:90,2:85,3:100}

idx=[o-1 for o in ORDER]
sub=C[idx]
al=sub[...,3]>8
ys,xs=np.nonzero(al.any(axis=0))
PAD=6
x0,x1=max(0,xs.min()-PAD), min(C.shape[2], xs.max()+1+PAD)
y0,y1=max(0,ys.min()-PAD), min(C.shape[1], ys.max()+1+PAD)
print("crop -> x %d..%d  y %d..%d  (%dx%d)"%(x0,x1,y0,y1,x1-x0,y1-y0))

frames=[Image.fromarray(np.clip(sub[i,y0:y1,x0:x1],0,255).astype(np.uint8),"RGBA")
        for i in range(len(idx))]
durs=[DUR[o] for o in ORDER]
print("durations:",durs,"total %dms"%sum(durs))

frames[0].save("cole_idle.webp", save_all=True, append_images=frames[1:],
               duration=durs, loop=0, lossless=False, quality=92,
               method=6, allow_mixed=True)

# GIF: MEDIANCUT allocates palette slots by population and eats small bright
# areas -- it previously erased Vergil's violet irises entirely. MAXCOVERAGE
# protects the flame core and the leg light-line.
gifs=[]
for f in frames:
    bg=Image.new("RGBA",f.size,(0,0,0,0)); bg.alpha_composite(f)
    rgb=bg.convert("RGB")
    p=rgb.quantize(colors=255, method=Image.Quantize.MAXCOVERAGE)
    mask=(np.asarray(bg)[...,3]<128)
    arr=np.asarray(p).copy(); arr[mask]=255
    q=Image.fromarray(arr,"P"); q.putpalette(p.getpalette())
    gifs.append(q)
gifs[0].save("cole_idle.gif", save_all=True, append_images=gifs[1:],
             duration=durs, loop=0, transparency=255, disposal=2, optimize=False)
print("written")
