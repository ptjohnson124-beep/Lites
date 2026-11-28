from PIL import Image
import numpy as np
src=Image.open("mrs_sheet.webp")
print("source mode",src.mode)
A=np.asarray(src.convert("RGB")).astype(np.float32)
H,W,_=A.shape
xc=[0,504,996,1470,W]; yc=[0,375,749,H]
def key(rgb):
    mn=rgb.min(axis=2); mx=rgb.max(axis=2)
    a=np.maximum(np.clip((251.0-mn)/8.0,0,1), np.clip((mx-mn-4.0)/6.0,0,1))
    o=np.zeros(rgb.shape[:2]+(4,),np.float32); s=np.maximum(a,1e-3)[...,None]
    o[...,:3]=np.clip((rgb-255.0*(1.0-a[...,None]))/s,0,255); o[...,3]=a*255.0
    return o
CW,CH=640,620; TX,TY=320,520
canvas=np.zeros((12,CH,CW,4),np.float32)
for i in range(12):
    cy,cx=divmod(i,4)
    cell=A[yc[cy]:yc[cy+1], xc[cx]:xc[cx+1]]
    rgba=key(cell); ink=rgba[...,3]>40
    mn=cell.min(axis=2); mx=cell.max(axis=2)
    # boots only: the wing sheds glitch debris that would drag a whole-ink anchor
    boot=(mx<80)&((mx-mn)<45)&ink
    rr=np.nonzero(boot.sum(axis=1)>3)[0]
    sole=rr.max()
    band=boot[max(0,sole-30):sole+1]
    by,bx=np.nonzero(band)
    dx=int(round(TX-bx.mean())); dy=int(round(TY-sole))
    h,w,_=rgba.shape
    sx0,sy0=max(0,-dx),max(0,-dy); dx0,dy0=max(0,dx),max(0,dy)
    ww=min(w-sx0,CW-dx0); hh=min(h-sy0,CH-dy0)
    canvas[i,dy0:dy0+hh,dx0:dx0+ww]=rgba[sy0:sy0+hh,sx0:sx0+ww]
np.save("mrs_reg.npy",canvas)
al=canvas[...,3]/255.; rgb=canvas[...,:3]
A2=al>40/255
for i in range(12):
    y,x=np.nonzero(A2[i])
    print("  f%-2d top=%3d bot=%3d h=%3d xc=%6.1f"%(i+1,y.min(),y.max(),y.max()-y.min(),x.mean()))
def d(i,j):
    m=np.maximum(al[i],al[j])
    dc=np.abs(rgb[i]-rgb[j]).mean(axis=2)*np.minimum(al[i],al[j]); da=np.abs(al[i]-al[j])*255
    return float(((dc+da)*m).sum()/m.sum())
s=[d(i,(i+1)%12) for i in range(12)]
print("\nsteps:",[round(x,1) for x in s])
print("mean %.1f  max %.1f  SEAM %.1f (median interior %.1f)"%(np.mean(s),max(s),s[-1],np.median(s[:11])))
