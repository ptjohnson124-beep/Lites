from PIL import Image
import numpy as np

A = np.asarray(Image.open("kev_idle_sheet.png").convert("RGB")).astype(np.float32)
H,W,_ = A.shape
xcuts=[0,373,749,1140,W]; ycuts=[2,340,682,H]

def key(rgb):
    mn=rgb.min(axis=2); mx=rgb.max(axis=2)
    a=np.maximum(np.clip((251.0-mn)/8.0,0,1), np.clip((mx-mn-4.0)/6.0,0,1))
    out=np.zeros(rgb.shape[:2]+(4,),np.float32)
    safe=np.maximum(a,1e-3)[...,None]
    out[...,:3]=np.clip((rgb-255.0*(1.0-a[...,None]))/safe,0,255)
    out[...,3]=a*255.0
    return out

CW,CH=560,560; TX,TY=280,470
canvas=np.zeros((12,CH,CW,4),np.float32)
info=[]
for i in range(12):
    cy,cx=divmod(i,4)
    cell=A[ycuts[cy]:ycuts[cy+1], xcuts[cx]:xcuts[cx+1]]
    rgba=key(cell)
    ink=rgba[...,3]>40
    # Boots are the anchor: her hair is the only big thing that moves and it
    # would drag a centroid. Boots = near-black ink in the bottom of the figure.
    rows=np.nonzero(ink.sum(axis=1)>3)[0]
    top,sole=rows.min(),rows.max()
    band=ink[max(0,sole-int(0.07*(sole-top))):sole+1]
    by,bx=np.nonzero(band)
    dx=int(round(TX-bx.mean())); dy=int(round(TY-sole))
    h,w,_=rgba.shape
    sx0,sy0=max(0,-dx),max(0,-dy); dx0,dy0=max(0,dx),max(0,dy)
    ww=min(w-sx0,CW-dx0); hh=min(h-sy0,CH-dy0)
    canvas[i,dy0:dy0+hh,dx0:dx0+ww]=rgba[sy0:sy0+hh,sx0:sx0+ww]
    info.append((bx.mean(),sole,sole-top))
np.save("kev_reg.npy",canvas)
print(" f | feet-x | sole | fig-h")
for i,(fx,s,fh) in enumerate(info):
    print("%2d | %6.1f | %4d | %5d"%(i+1,fx,s,fh))
al=canvas[...,3]>40
print("\nafter registration:")
for i in range(12):
    y,x=np.nonzero(al[i])
    print("  f%-2d top=%3d bottom=%3d h=%3d xc=%6.1f"%(i+1,y.min(),y.max(),y.max()-y.min(),x.mean()))
