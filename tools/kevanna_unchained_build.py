from PIL import Image
import numpy as np
A=np.asarray(Image.open("kev_unch_sheet.png").convert("RGB")).astype(np.float32)
H,W,_=A.shape
xcuts=[0,357,778,1144,W]; ycuts=[0,341,684,H]
def key(rgb):
    mn=rgb.min(axis=2); mx=rgb.max(axis=2)
    a=np.maximum(np.clip((251.0-mn)/8.0,0,1), np.clip((mx-mn-4.0)/6.0,0,1))
    o=np.zeros(rgb.shape[:2]+(4,),np.float32); s=np.maximum(a,1e-3)[...,None]
    o[...,:3]=np.clip((rgb-255.0*(1.0-a[...,None]))/s,0,255); o[...,3]=a*255.0
    return o
CW,CH=620,620; TX,TY=310,520
canvas=np.zeros((12,CH,CW,4),np.float32); info=[]
for i in range(12):
    cy,cx=divmod(i,4)
    cell=A[ycuts[cy]:ycuts[cy+1], xcuts[cx]:xcuts[cx+1]]
    rgba=key(cell); ink=rgba[...,3]>40
    rgb=cell; mn=rgb.min(axis=2); mx=rgb.max(axis=2)
    # BOOTS ONLY: near-black, low-saturation ink. The glitch throws bright red
    # debris and cyan ghosts all over the frame; anchoring on all ink would
    # chase the corruption instead of her.
    boot=(mx<80)&((mx-mn)<40)&ink
    rows=np.nonzero(boot.sum(axis=1)>4)[0]
    sole=rows.max()
    band=boot[sole-26:sole+1]
    by,bx=np.nonzero(band)
    dx=int(round(TX-bx.mean())); dy=int(round(TY-sole))
    h,w,_=rgba.shape
    sx0,sy0=max(0,-dx),max(0,-dy); dx0,dy0=max(0,dx),max(0,dy)
    ww=min(w-sx0,CW-dx0); hh=min(h-sy0,CH-dy0)
    canvas[i,dy0:dy0+hh,dx0:dx0+ww]=rgba[sy0:sy0+hh,sx0:sx0+ww]
    info.append((bx.mean(),sole,bx.std(),len(by)))
np.save("unch_reg.npy",canvas)
print(" f | boot-x | sole | boot-x spread | boot px")
for i,(fx,s,sd,n) in enumerate(info):
    print("%2d | %6.1f | %4d | %13.1f | %6d"%(i+1,fx,s,sd,n))
