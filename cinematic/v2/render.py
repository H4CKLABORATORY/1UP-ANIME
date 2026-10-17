#!/usr/bin/env python3
"""1UP Anime reproducible cinematic motion layers.
Not Adobe After Effects. No scraped anime characters. Original MP4 AAC stream
is copied without re-encoding. Uses 1UP's approved transparent metal wordmark.
"""
import json, math, os, random, subprocess, sys
from pathlib import Path
import cv2
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[2]
ASSETS=ROOT/'assets'
OUT=ROOT/'output'/'cinematic-v2'
OUT.mkdir(exist_ok=True,parents=True)
FPS,DUR=30,3.2
COLORS=((245,120,35),(45,48,220)) # BGR cold blue, warm red
LOGO=cv2.cvtColor(np.array(Image.open(ASSETS/'oneup-header-letters.png').convert('RGBA')),cv2.COLOR_RGBA2BGRA)
# Segregate the blue 1UP and red ANIME letters by their original edge
# colors. Their transparent forms overlap horizontally, so slicing at x=860
# cuts the blue P and leaves a red A fragment next to it. Two independent
# color-seed masks preserve both whole shapes and their white chrome centers.
assert LOGO.shape[:2]==(724,2172), 'Unexpected approved logo dimensions'
b=LOGO[:,:,0].astype(np.float32)
g=LOGO[:,:,1].astype(np.float32)
r=LOGO[:,:,2].astype(np.float32)
alpha=LOGO[:,:,3]
blue_seed=(b>r+50)&(b>g+18)&(alpha>120)
red_seed=(r>b+60)&(r>g+36)&(alpha>120)
blue_distance=cv2.distanceTransform((~blue_seed).astype(np.uint8),cv2.DIST_L2,5)
red_distance=cv2.distanceTransform((~red_seed).astype(np.uint8),cv2.DIST_L2,5)
blue_mask=(blue_distance<red_distance)&(np.arange(LOGO.shape[1])[None,:]<1150)
def separated_layer(mask):
 out=LOGO.copy()
 out[:,:,3]=np.where(mask,alpha,0).astype(np.uint8)
 yy,xx=np.nonzero(out[:,:,3]>8)
 return out[yy.min():yy.max()+1,xx.min():xx.max()+1].copy()
LEFT=separated_layer(blue_mask)
RIGHT=separated_layer(~blue_mask)
rng=random.Random(9110)
PARTICLES=[(rng.random(),rng.random(),rng.uniform(.35,1.8),rng.uniform(.04,.19),
            rng.randrange(1,4),rng.randint(0,1),rng.random()*6) for _ in range(215)]
def smooth(x):
 x=max(0.,min(1.,x));return x*x*(3.-2.*x)
def bloom(img,strength=1):
 blurred=cv2.GaussianBlur(img,(0,0),4.5)
 return np.clip(img.astype(np.float32)+blurred*.55*strength,0,255).astype(np.uint8)
def paste(rgb,rgba,x,y,opacity,reflection=0):
 h,w=rgb.shape[:2];a,b=rgba.shape[:2]
 x=int(x);y=int(y)
 l=max(x,0);t=max(y,0);r=min(x+b,w);d=min(y+a,h)
 if l>=r or t>=d:return
 roi=rgba[t-y:d-y,l-x:r-x].copy()
 op=roi[:,:,3:4].astype(np.float32)/255*max(0,min(1,opacity))
 original=roi[:,:,:3].astype(np.float32)
 if reflection>0:
  xx=np.arange(l-x,r-x,dtype=np.float32)[None,:,None]
  stripe=np.exp(-.5*((xx-(reflection*(b+300)-150))/35)**2)
  original=np.clip(original+stripe*np.array([64.,70.,90.]),0,255)
 dst=rgb[t:d,l:r].astype(np.float32)
 rgb[t:d,l:r]=np.clip(dst*(1-op)+original*op,0,255).astype(np.uint8)
def backdrop(w,h,t):
 ys,xs=np.mgrid[:h,:w].astype(np.float32)
 xn=xs/w;yn=ys/h
 base=np.empty((h,w,3),np.float32)
 base[:,:,0]=14-6*yn
 base[:,:,1]=7+4*xn
 base[:,:,2]=11+4*yn
 for i,(cx,cy,rx,ry,col) in enumerate([
  (.12,.38,.30,.42,(190,38,18)),
  (.84,.65,.30,.46,(22,18,153)),
  (.56,.18,.47,.22,(41,8,37)),
  (.38,.87,.28,.28,(27,31,43))]):
  dx=(xn-cx-.025*math.sin(t*(.85+i*.32)))/rx
  dy=(yn-cy-.02*math.cos(t*(1.1+i*.23)))/ry
  glow=np.exp(-2*(dx*dx+dy*dy))*(.7+.13*math.sin(t*3+i))
  for c in range(3):base[:,:,c]+=col[c]*glow
 return np.clip(base,0,255).astype(np.uint8)
def fx(w,h,t,portrait):
 ink=np.zeros((h,w,3),np.uint8);cx=w//2;cy=int(h*.50)
 for i in range(9):
  radius=int(w*(.17+.052*i));blue=i%2==0
  angle=(40*i+int(t*(33 if blue else -41)))%360
  color=COLORS[0] if blue else COLORS[1]
  cv2.ellipse(ink,(cx,cy),(radius,int(radius*(.68 if portrait else .38))),-7,
              angle,(angle+40+i*5)%360,color,1+(i%3==0),cv2.LINE_AA)
 for side in (0,1):
  nodes=[]
  for j in range(19):
   q=j/18;sign=-1 if side==0 else 1
   x=int(w*(.49+sign*(.05+.45*q)))
   y=int(h*(.5+.135*math.sin(t*3.6+q*3.7+side*1.3)
             +.012*math.sin(q*39+t*17)))
   nodes.append([x,y])
  cv2.polylines(ink,[np.array(nodes,np.int32)],False,COLORS[side],2,cv2.LINE_AA)
 for i,(x,y,z,v,size,side,phase) in enumerate(PARTICLES):
  px=int(w*((x+(t*v*z*(.45 if side==0 else -.4)))%1))
  py=int(h*((y-t*v*z)%1))
  pulse=.45+.55*math.sin(t*5+phase)**2
  color=tuple(int(q*pulse) for q in COLORS[side])
  cv2.circle(ink,(px,py),max(1,int(size*z)),color,-1,cv2.LINE_AA)
  if i%5==0:
   cv2.line(ink,(px,py),(px-2,py+int(5*z)),color,1,cv2.LINE_AA)
 return bloom(ink,.7)
def authorized_layers():
 """Only load transparent cutouts with explicit verifiable reuse permission."""
 folder=ROOT/'cinematic'/'v2'/'characters_authorized'
 rights=folder/'rights.json'
 if not rights.exists():return []
 data=json.loads(rights.read_text(encoding='utf8'))
 results=[]
 for item in data.get('layers',[]):
  if (item.get('permission')!='granted' or item.get('slot') not in ('left','right')
      or not all(item.get(k) for k in ('license','source_url','credit'))):continue
  filename=item.get('file','')
  if '/' in filename or '\\' in filename or filename.startswith('.'):continue
  target=folder/filename
  if not target.is_file():continue
  arr=cv2.cvtColor(np.array(Image.open(target).convert('RGBA')),cv2.COLOR_RGBA2BGRA)
  if np.all(arr[:,:,3]==255):raise ValueError('Character PNG lacks transparency: '+filename)
  results.append((item['slot'],arr))
 return results
CHARACTERS=authorized_layers()

def render_frame(kind,frame):
 portrait=kind=='mobile';w,h=(720,1280) if portrait else (1280,720)
 t=frame/FPS
 img=backdrop(w,h,t)
 energy=fx(w,h,t,portrait)
 img=np.clip(img.astype(np.float32)+energy.astype(np.float32)*.85,0,255).astype(np.uint8)
 # Authorized real character cutouts, composed on a separate depth plane.
 # No AI characters are synthesized when rights-cleared materials are absent.
 for slot,art in CHARACTERS:
  side=-1 if slot=='left' else 1
  dstw=int(w*(.32 if portrait else .20))
  resized=cv2.resize(art,(dstw,int(dstw*art.shape[0]/art.shape[1])),interpolation=cv2.INTER_AREA)
  px=w*(.20 if slot=='left' else .80)-dstw/2+math.sin(t*1.7+side)*w*.009
  py=h*(.27 if portrait else .52)-resized.shape[0]/2+math.cos(t*1.8+side)*h*.008
  paste(img,resized,px,py,smooth((t-.2)/.7)*(.76 if portrait else .66))
 # Independent chrome layers, camera settle, flashes tied to original audio beats.
 reveal=smooth((t-.34)/.53)
 zoom=1+.10*(1-smooth((t-.46)/.74))
 punch=max(0,1-abs(t-1.12)/.16)
 tremor=math.sin(t*56)*2*punch
 if portrait:
  for logo,width,yy,lag in [(LEFT,.76,.38,.0),(RIGHT,.90,.535,.08)]:
   scaled=int(w*width*zoom*(1+.025*punch))
   rgba=cv2.resize(logo,(scaled,int(logo.shape[0]*scaled/logo.shape[1])),interpolation=cv2.INTER_AREA)
   xpos=(w-scaled)/2+tremor*(1 if lag==0 else -1)
   ypos=h*yy-rgba.shape[0]/2+(1-smooth((t-.36-lag)/.68))*h*(.045 if lag else -.055)
   paste(img,rgba,xpos,ypos,reveal,smooth((t-1.12)/.86))
 else:
  scaled=int(w*.78*zoom*(1+.028*punch))
  rgba=cv2.resize(LOGO,(scaled,int(LOGO.shape[0]*scaled/LOGO.shape[1])),interpolation=cv2.INTER_AREA)
  paste(img,rgba,(w-scaled)/2+tremor,(h-rgba.shape[0])/2,reveal,smooth((t-1.12)/.8))
 # Calibrated horizontal impact (audio transient near 1.12s)
 if punch:
  flash=np.zeros_like(img)
  y=int(h*.51);v=int(punch*205)
  cv2.line(flash,(int(w*.11),y),(int(w*.89),y),(v,v,v),2,cv2.LINE_AA)
  img=cv2.add(img,cv2.GaussianBlur(flash,(0,0),3.5))
 if t>1.26:
  for xx in (int(w*.2),int(w*.8)):
   yy=int(h*.81)
   cv2.line(img,(xx-45,yy),(xx+45,yy),(127,130,163),1,cv2.LINE_AA)
 ys,xs=np.ogrid[:h,:w]
 vignette=np.clip(1-.53*(((xs-w*.5)/(w*.76))**2+((ys-h*.5)/(h*.70))**2),.34,1.)
 factor=vignette*smooth((t-.015)/.25)*(1-smooth((t-3.02)/.18))
 img=np.clip(img.astype(np.float32)*factor[:,:,None],0,255).astype(np.uint8)
 return img
def render(kind):
 dims=(720,1280) if kind=='mobile' else (1280,720)
 dest=(1080,1920) if kind=='mobile' else (1920,1080)
 raw=OUT/f'_silent_{kind}.mp4'
 final=OUT/f'1UP_ANIME_EDITORIAL_V2_{kind}_{dest[0]}x{dest[1]}.mp4'
 p=subprocess.Popen(['ffmpeg','-nostdin','-hide_banner','-loglevel','error','-y',
  '-f','rawvideo','-pixel_format','bgr24','-video_size',f'{dims[0]}x{dims[1]}',
  '-framerate',str(FPS),'-i','pipe:0',
  '-vf',f'scale={dest[0]}:{dest[1]}:flags=lanczos',
  '-c:v','libx264','-crf','21','-preset','veryfast','-pix_fmt','yuv420p',
  '-movflags','+faststart','-an',str(raw)],stdin=subprocess.PIPE)
 for frame in range(int(FPS*DUR)):
  p.stdin.write(render_frame(kind,frame).tobytes())
 p.stdin.close()
 if p.wait():raise RuntimeError('video encoder failed')
 audio=ASSETS/'1up-anime-intro-firma-3seg.mp4'
 subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(raw),'-i',str(audio),
  '-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','copy','-t',str(DUR),
  '-movflags','+faststart',str(final)],check=True)
 raw.unlink()
 print('RENDERED',final,final.stat().st_size,flush=True)
if __name__=='__main__':
 for kind in (sys.argv[1:] or ['mobile','desktop']):
  assert kind in ('mobile','desktop')
  render(kind)
