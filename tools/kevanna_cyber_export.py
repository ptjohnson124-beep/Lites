from PIL import Image
import numpy as np
C=np.load("cyb_reg.npy")
# Violent and irregular. The peak (f6) is HELD to sell the force; the hard
# glitch frames (4, 7, 8, 10) SNAP past in 40-50ms so they read as cuts in the
# signal rather than as poses.
DUR=[90,75,60,45,55,130,40,45,85,50,80,95]
al=C[...,3]>8
ys,xs=np.nonzero(al.any(axis=0)); PAD=8
x0,x1=max(0,xs.min()-PAD),min(C.shape[2],xs.max()+1+PAD)
y0,y1=max(0,ys.min()-PAD),min(C.shape[1],ys.max()+1+PAD)
print("crop %dx%d"%(x1-x0,y1-y0))
for i in range(12):
    m=al[i,y0:y1,x0:x1]
    e=m[0].sum()+m[-1].sum()+m[:,0].sum()+m[:,-1].sum()
    if e: print("  WARNING f%d: %d px on crop edge"%(i+1,e))
fr=[Image.fromarray(np.clip(C[i,y0:y1,x0:x1],0,255).astype(np.uint8),"RGBA") for i in range(12)]
print("durations",DUR,"total %dms"%sum(DUR))
fr[0].save("kevanna_cyberpsychosis.webp",save_all=True,append_images=fr[1:],
           duration=DUR,loop=0,lossless=False,quality=92,method=6,allow_mixed=True)
g=[]
for f in fr:
    bg=Image.new("RGBA",f.size,(0,0,0,0)); bg.alpha_composite(f)
    p=bg.convert("RGB").quantize(colors=255,method=Image.Quantize.MAXCOVERAGE)
    mask=(np.asarray(bg)[...,3]<128); arr=np.asarray(p).copy(); arr[mask]=255
    q=Image.fromarray(arr,"P"); q.putpalette(p.getpalette()); g.append(q)
g[0].save("kevanna_cyberpsychosis.gif",save_all=True,append_images=g[1:],
          duration=DUR,loop=0,transparency=255,disposal=2,optimize=False)
print("written")
