/* 1UP ANIME V3 — browser motion study, independent procedural FX.
 * Not an MP4 replacement: user-owned metallic logo + original AAC source only.
 * No artificial/copyrighted character faces. No external libraries.
 */
(()=>{
'use strict';
const DURATION=3.2;
const root=document.querySelector('#cinema');
const canvas=document.querySelector('#particles');
const media=document.querySelector('#original-signature');
const replay=document.querySelector('#replay');
const status=document.querySelector('#audio-status');
if(!root||!canvas||!media||!replay)return;
const ctx=canvas.getContext('2d',{alpha:true});
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let width=innerWidth,height=innerHeight,dpr=1,particles=[],start=0,raf=0,playing=false,once=0;
let audioFallback=false;
let seed=0x1A7AC4;
function rand(){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967295}
function resetParticles(){
 seed=0x1A7AC4;
 particles=Array.from({length:Math.min(170,Math.max(65,Math.floor(width*height/6800)))},(_,i)=>({
  x:rand(),y:rand(),r:.45+rand()*1.9,speed:.15+rand()*.9,
  drift:-.11+rand()*.22,life:.40+rand()*.58,phase:rand()*Math.PI*2,
  red:i%2===0
 }));
}
function resize(){
 width=Math.max(1,innerWidth);height=Math.max(1,innerHeight);
 dpr=Math.min(devicePixelRatio||1,1.7);
 canvas.width=Math.round(width*dpr);
 canvas.height=Math.round(height*dpr);
 ctx.setTransform(dpr,0,0,dpr,0,0);
 resetParticles();
}
function bolt(time,side,index){
 const hue=side===0?'35,119,255':'255,48,102';
 const px=side===0?width*.12:width*.88;
 const py=height*(.24+index*.26);
 const radius=Math.min(width,height)*(.25+index*.08);
 const power=Math.max(0,1-Math.abs(time-(.32+index*.34))/0.20);
 if(power<=0)return;
 ctx.save();ctx.globalCompositeOperation='lighter';
 for(const pass of [12,4,1.4]){
  ctx.beginPath();
  ctx.moveTo(px,py);
  for(let step=1;step<=15;step++){
   const u=step/15;
   const jitter=Math.sin(step*11.13+side*6+index*8+time*13)*radius*.14;
   const x=px+(side===0?1:-1)*radius*u+jitter;
   const y=py+Math.sin(u*Math.PI*2.1+time*7)*radius*.22;
   ctx.lineTo(x,y);
  }
  ctx.lineWidth=pass;
  ctx.strokeStyle='rgba('+hue+','+(power*(pass>5?.075:pass>2?.24:.91))+')';
  ctx.shadowBlur=pass*1.5;ctx.shadowColor='rgba('+hue+',1)';
  ctx.stroke();
 }
 ctx.restore();
}
function sparks(time){
 ctx.save();ctx.globalCompositeOperation='lighter';
 const envelope=Math.min(1,time/.3,Math.max(0,(DURATION-time)/.22));
 for(let i=0;i<particles.length;i++){
  const p=particles[i];
  const cyc=((p.y+time*p.speed*.24+Math.sin(p.phase+time)*.025)%1+1)%1;
  const px=(p.x+time*p.drift*.11)*width;
  const py=cyc*height;
  const side=p.red?1:0;
  const color=side?'255,79,92':'50,163,255';
  const beam=Math.max(0,1-Math.abs(px-width*.5)/(width*.62));
  const alpha=p.life*(.19+.80*beam)*envelope;
  if(!alpha)continue;
  ctx.fillStyle='rgba('+color+','+alpha+')';
  ctx.shadowColor='rgba('+color+',.8)';
  ctx.shadowBlur=Math.min(14,p.r*6);
  ctx.beginPath();ctx.arc(px,py,p.r,0,Math.PI*2);ctx.fill();
  if(i%4===0){
   ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px+p.drift*24,py+10+p.speed*9);
   ctx.lineWidth=.55;ctx.strokeStyle='rgba('+color+','+(alpha*.53)+')';ctx.stroke();
  }
 }
 ctx.restore();
}
function atmosphere(time){
 const power=Math.max(0,Math.sin(Math.PI*Math.min(DURATION,time)/DURATION));
 ctx.save();
 const x=width*.50,y=height*.5;
 const g=ctx.createRadialGradient(x,y,0,x,y,Math.max(width,height)*.68);
 g.addColorStop(0,'rgba(90,40,160,'+(power*.11)+')');
 g.addColorStop(.48,'rgba(10,22,86,'+(power*.055)+')');
 g.addColorStop(1,'rgba(0,0,0,0)');
 ctx.fillStyle=g;ctx.fillRect(0,0,width,height);
 ctx.restore();
}
function beatPulse(time){
 const beats=[.26,.50,.74,1.12,1.90,2.64];
 const energy=beats.reduce((a,b)=>a+Math.max(0,1-Math.abs(time-b)/.055),0);
 if(!energy)return;
 ctx.save();ctx.globalCompositeOperation='lighter';
 const x=width*.5,y=height*.48,r=Math.min(width,height)*(.28+energy*.02);
 ctx.beginPath();ctx.ellipse(x,y,r*1.36,r*.53,time*.15,0,Math.PI*2);
 ctx.strokeStyle='rgba(194,221,255,'+Math.min(.5,energy*.19)+')';
 ctx.shadowColor='#9fd0ff';ctx.shadowBlur=30;ctx.lineWidth=Math.max(1,energy*2);ctx.stroke();
 ctx.restore();
}
function drawFrame(time){
 ctx.clearRect(0,0,width,height);
 if(reduced)return;
 atmosphere(time);sparks(time);
 bolt(time,0,0);bolt(time,1,0);
 bolt(time,0,1);bolt(time,1,1);
 beatPulse(time);
}
function tick(now){
 if(!playing)return;
 const elapsed=Math.max(0,(now-start)/1000);
 const t=Number.isFinite(media.currentTime)&&media.currentTime>.01?
  Math.min(DURATION,media.currentTime):Math.min(DURATION,elapsed);
 drawFrame(t);
 if(elapsed>DURATION+.65){stop();return}
 raf=requestAnimationFrame(tick);
}
function stop(){
 playing=false;cancelAnimationFrame(raf);
 root.classList.remove('playing');
 root.classList.add('finished');
 drawFrame(DURATION);
 try{media.pause()}catch{}
 replay.disabled=false;
}
function startScene(){
 cancelAnimationFrame(raf);
 try{media.pause();media.currentTime=0;}catch{}
 playing=true;audioFallback=false;once++;
 root.classList.remove('playing','finished');
 // Force restart of CSS keyframes while keeping the same DOM and original logo.
 void root.offsetWidth;
 root.classList.add('playing');
 start=performance.now();
 raf=requestAnimationFrame(tick);
 replay.disabled=true;
 if(reduced){
  status.textContent='Movimiento reducido: se conserva el logotipo estático.';
  setTimeout(stop,900);return;
 }
 media.muted=false;
 media.playsInline=true;
 const attempt=media.play();
 if(attempt?.catch)attempt.catch(()=>{
   if(!playing)return;
   audioFallback=true;
   status.textContent='El navegador no permite audio automático; continúa sin sonido.';
   media.muted=true;
   media.play().catch(()=>{});
 });
}
function setupCharacters(entries){
 // Permission-required optional slots, not populated with extracted images.
 if(!Array.isArray(entries))return;
 for(const [index,item] of entries.entries()){
  const url=String(item?.image||'');
  const permission=String(item?.permission||'');
  if(!/^\.\/assets\/characters_authorized\/[\w.-]+\.png$/.test(url)||
    !permission.startsWith('owner-authorized:'))continue;
  const layer=document.createElement('img');
  layer.src=url;layer.alt='';layer.decoding='async';
  layer.className='authorized-character authorized-character-'+(index%2);
  layer.dataset.permission=permission;layer.setAttribute('aria-hidden','true');
  document.querySelector('.environment').append(layer);
 }
}
async function loadAllowedCharacters(){
 try{
  const r=await fetch('./themes/cinematic-v3/characters.json',{cache:'no-store'});
  if(r.ok)setupCharacters((await r.json()).layers);
 }catch{}
}
window.addEventListener('resize',resize,{passive:true});
media.addEventListener('ended',stop);
media.addEventListener('error',()=>{audioFallback=true;status.textContent='Audio no disponible; permanece la vista visual.'});
replay.addEventListener('click',startScene);
resize();
void loadAllowedCharacters();
startScene();
})();
