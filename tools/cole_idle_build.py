from PIL import Image
import numpy as np

im = Image.open("cole_idle_sheet.png").convert("RGB")
A = np.asarray(im).astype(np.float32)
H,W,_ = A.shape
xcuts=[0,371,720,1071,W]; ycuts=[0,363,724,H]

def key(rgb):
    mn = rgb.min(axis=2); mx = rgb.max(axis=2)
    a = np.maximum(np.clip((251.0-mn)/8.0,0,1), np.clip((mx-mn-4.0)/6.0,0,1))
    out = np.zeros(rgb.shape[:2]+(4,), np.float32)
    safe = np.maximum(a,1e-3)[...,None]
    out[...,:3] = np.clip((rgb-255.0*(1.0-a[...,None]))/safe, 0, 255)
    out[...,3] = a*255.0
    return out

CW,CH = 520,520              # generous common canvas
TX,TY = 260,430              # where every frame's boot-centre is pinned
canvas = np.zeros((12,CH,CW,4), np.float32)

for i in range(12):
    cy,cx = divmod(i,4)
    cell = A[ycuts[cy]:ycuts[cy+1], xcuts[cx]:xcuts[cx+1]]
    rgba = key(cell)
    r,g,b = cell[:,:,0],cell[:,:,1],cell[:,:,2]
    mn=cell.min(axis=2); mx=cell.max(axis=2); sat=mx-mn
    ink  = rgba[...,3] > 40
    aqua = (g>120)&(g>r+30)&(sat>60)
    body = ink & ~aqua
    rowcnt = body.sum(axis=1); nz = np.nonzero(rowcnt>3)[0]
    sole = nz.max()
    foot = body[max(0,sole-int(0.08*(sole-nz.min()))):sole+1]
    fy,fx = np.nonzero(foot)
    # integer shift: sub-pixel resampling would soften the hard cel linework
    dx = int(round(TX - fx.mean())); dy = int(round(TY - sole))
    h,w,_ = rgba.shape
    sx0,sy0 = max(0,-dx), max(0,-dy)
    dx0,dy0 = max(0,dx),  max(0,dy)
    ww = min(w-sx0, CW-dx0); hh = min(h-sy0, CH-dy0)
    canvas[i, dy0:dy0+hh, dx0:dx0+ww] = rgba[sy0:sy0+hh, sx0:sx0+ww]

np.save("reg.npy", canvas)
al = canvas[...,3] > 40
ys,xs = np.nonzero(al.any(axis=0))
print("union bbox x %d-%d  y %d-%d" % (xs.min(),xs.max(),ys.min(),ys.max()))
for i in range(12):
    y,x = np.nonzero(al[i])
    print("f%-2d  top=%3d  bottom=%3d  h=%3d  xc=%6.1f  px=%d" % (
        i+1, y.min(), y.max(), y.max()-y.min(), x.mean(), al[i].sum()))
