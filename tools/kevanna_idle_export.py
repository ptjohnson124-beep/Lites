from PIL import Image
import numpy as np
C=np.load("kev_reg.npy")
# Sheet order is kept: the wire pulse is a designed progression, unlike Cole's
# independently-drawn frames. Timing holds the dim rest beat and the peak, and
# accelerates through the charge between them.
DUR=[115,80,70,65,65,60,100,70,75,85,80,105]
al=C[...,3]>8
ys,xs=np.nonzero(al.any(axis=0)); PAD=6
x0,x1=max(0,xs.min()-PAD),min(C.shape[2],xs.max()+1+PAD)
y0,y1=max(0,ys.min()-PAD),min(C.shape[1],ys.max()+1+PAD)
print("crop %dx%d"%(x1-x0,y1-y0))
# guard against neighbour bleed: any ink touching the crop edge?
for i in range(12):
    m=al[i,y0:y1,x0:x1]
    edge=m[0].sum()+m[-1].sum()+m[:,0].sum()+m[:,-1].sum()
    if edge: print("  WARNING f%d has %d px on the crop edge"%(i+1,edge))
frames=[Image.fromarray(np.clip(C[i,y0:y1,x0:x1],0,255).astype(np.uint8),"RGBA") for i in range(12)]
print("durations",DUR,"total %dms"%sum(DUR))
frames[0].save("kevanna_idle.webp",save_all=True,append_images=frames[1:],
               duration=DUR,loop=0,lossless=False,quality=92,method=6,allow_mixed=True)
gifs=[]
for f in frames:
    bg=Image.new("RGBA",f.size,(0,0,0,0)); bg.alpha_composite(f)
    rgbim=bg.convert("RGB")
    p=rgbim.quantize(colors=255,method=Image.Quantize.MAXCOVERAGE)
    mask=(np.asarray(bg)[...,3]<128)
    arr=np.asarray(p).copy(); arr[mask]=255
    q=Image.fromarray(arr,"P"); q.putpalette(p.getpalette()); gifs.append(q)
gifs[0].save("kevanna_idle.gif",save_all=True,append_images=gifs[1:],
             duration=DUR,loop=0,transparency=255,disposal=2,optimize=False)
print("written")
