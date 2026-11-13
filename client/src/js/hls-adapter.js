/* 1UP ANIME: HLS playback for permission-cleared media, without autoplay.
 * Native playback for Safari; lazy hls.js for MSE browsers.
 * The adapter NEVER finds, proxies, extracts, or downloads video URLs.
 */
(function(global){
'use strict';
const HLS_URL='https://cdn.jsdelivr.net/npm/hls.js@1.7.3/dist/hls.min.js';
let libraryPromise=null;
const MEDIA_TYPE='application/vnd.apple.mpegurl';
const say=(fn,message)=>{if(typeof fn==='function')fn(message)};
function validHttps(value){
 try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null}
 catch{return null}
}
function nativePreferred(video){
 const native=Boolean(video.canPlayType?.(MEDIA_TYPE));
 if(!native)return false;
 const apple=String(global.navigator?.vendor||'').includes('Apple');
 return apple||('ManagedMediaSource' in global)||(!('MediaSource' in global));
}
function library(){
 if(global.Hls)return Promise.resolve(global.Hls);
 if(libraryPromise)return libraryPromise;
 libraryPromise=new Promise((resolve,reject)=>{
  const script=document.createElement('script');
  script.src=HLS_URL;
  script.async=true;
  script.crossOrigin='anonymous';
  script.onload=()=>{
   if(global.Hls)resolve(global.Hls);
   else reject(Error('La biblioteca HLS no inició correctamente.'));
  };
  script.onerror=()=>reject(Error('No se pudo cargar el reproductor HLS.'));
  document.head.appendChild(script);
 }).catch(error=>{libraryPromise=null;throw error});
 return libraryPromise;
}
function attach(video,rawUrl,{onStatus,onError}={}){
 let hls=null,closed=false,recoveryUsed=false;
 const url=validHttps(rawUrl);
 const dispose=()=>{
  if(closed)return;
  closed=true;
  if(hls){try{hls.destroy()}catch{}hls=null}
  video.removeAttribute?.('src');
  try{video.load?.()}catch{}
 };
 const fail=message=>{
  if(closed)return;
  say(onError,message);
  dispose();
 };
 if(!url){
  fail('La dirección del video no es HTTPS válida.');
  return dispose;
 }
 if(nativePreferred(video)){
  video.src=url;
  say(onStatus,'HLS nativo disponible en este navegador.');
  return dispose;
 }
 say(onStatus,'Preparando compatibilidad HLS…');
 library().then(Hls=>{
  if(closed)return;
  if(typeof Hls?.isSupported==='function'&&Hls.isSupported()){
   try{
    hls=new Hls({enableWorker:true});
    hls.on(Hls.Events.ERROR,(_,data)=>{
     if(closed||!data?.fatal)return;
     if(data.type===Hls.ErrorTypes.MEDIA_ERROR&&!recoveryUsed){
      recoveryUsed=true;
      try{hls.recoverMediaError();return}catch{}
     }
     fail('No se pudo reproducir HLS desde este servidor.');
    });
    hls.on(Hls.Events.MANIFEST_PARSED,()=>{
     if(!closed)say(onStatus,'Lista HLS recibida. Pulsa reproducir para comenzar.');
    });
    hls.loadSource(url);
    hls.attachMedia(video);
   }catch{fail('No se pudo iniciar la reproducción HLS.')}
  }else if(video.canPlayType?.(MEDIA_TYPE)){
   video.src=url;
   say(onStatus,'HLS nativo disponible como alternativa.');
  }else fail('Este navegador no admite reproducción HLS.');
 }).catch(()=>{
  if(closed)return;
  if(video.canPlayType?.(MEDIA_TYPE)){
   video.src=url;
   say(onStatus,'Reproducción nativa disponible como alternativa.');
  }else fail('No se pudo cargar el reproductor HLS.');
 });
 return dispose;
}
global.OneUpHLS={attach,version:'1.7.3',libraryUrl:HLS_URL};
})(window);
