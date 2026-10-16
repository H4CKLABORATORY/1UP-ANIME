/* Node-only regression tests for the browser HLS bridge. No network/video content. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const code=fs.readFileSync('hls-adapter.js','utf8');
const player=fs.readFileSync('episode-player.js','utf8');
const index=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
assert(index.indexOf('./hls-adapter.js')>=0,'HLS bridge script not loaded');
assert(index.indexOf('./hls-adapter.js')<index.indexOf('./episode-player.js'),'HLS adapter must load first');
assert(sw.includes("'./hls-adapter.js'"),'PWA shell is missing the HLS adapter');
assert(player.includes('closeVideo();'),'Previous video buffers must be cleaned up');
assert(player.includes("slot.mime==='application/vnd.apple.mpegurl'"),'HLS sources not using bridge');
assert(player.includes("['owned','authorized']"),'Frontend must reject media without declared rights');

function setup({vendor='',canHls='',ctor=null,managed=false,mse=true}={}){
 const scripts=[];
 const window={navigator:{vendor}};
 if(managed)window.ManagedMediaSource=function(){};
 if(mse)window.MediaSource=function(){};
 if(ctor)window.Hls=ctor;
 const document={
  createElement:()=>({}),
  head:{appendChild:script=>scripts.push(script)}
 };
 vm.runInNewContext(code,{window,document,URL,console});
 const video={
  src:'',loadCalls:0,
  canPlayType:()=>canHls,
  removeAttribute(key){if(key==='src')this.src=''},
  load(){this.loadCalls++}
 };
 return {window,document,scripts,video,api:window.OneUpHLS};
}
class FakeHls {
 static instances=[];
 static Events={ERROR:'error',MANIFEST_PARSED:'manifest'};
 static ErrorTypes={MEDIA_ERROR:'media',NETWORK_ERROR:'network'};
 static isSupported(){return true}
 constructor(){this.handlers=new Map();this.destroyed=false;this.recoveries=0;FakeHls.instances.push(this)}
 on(event,callback){this.handlers.set(event,callback)}
 loadSource(url){this.url=url}
 attachMedia(video){this.video=video}
 recoverMediaError(){this.recoveries++}
 destroy(){this.destroyed=true}
 emit(event,data){this.handlers.get(event)?.(event,data)}
}
const tick=async()=>{await Promise.resolve();await Promise.resolve();await Promise.resolve()};
FakeHls.instances.length=0;

// Safari handles HLS natively without extra JS requests.
{
 const c=setup({vendor:'Apple Computer, Inc.',canHls:'probably',mse:true});
 const messages=[];
 const cleanup=c.api.attach(c.video,'https://cdn.example.com/one.m3u8',
  {onStatus:text=>messages.push(text)});
 assert.equal(c.video.src,'https://cdn.example.com/one.m3u8');
 assert.equal(c.scripts.length,0);
 assert(messages.some(s=>s.includes('nativo')));
 cleanup();
 assert.equal(c.video.src,'');
}

// Chrome/Firefox style: HLS.js mediates stream, no autoplay.
{
 const c=setup({ctor:FakeHls});
 const messages=[];
 const cleanup=c.api.attach(c.video,'https://cdn.example.com/two.m3u8',
  {onStatus:text=>messages.push(text)});
 await tick();
 const instance=FakeHls.instances.at(-1);
 assert.equal(instance.url,'https://cdn.example.com/two.m3u8');
 assert.equal(instance.video,c.video);
 assert(!Object.hasOwn(c.video,'autoplay'),'Adapter never starts playing');
 instance.emit(FakeHls.Events.MANIFEST_PARSED,{});
 assert(messages.some(s=>s.includes('recibida')));
 cleanup();
 assert.equal(instance.destroyed,true);
}

// One recovery for decoding errors, then report failure without looping.
{
 const c=setup({ctor:FakeHls});
 const errors=[];
 c.api.attach(c.video,'https://cdn.example.com/fail.m3u8',
  {onError:msg=>errors.push(msg)});
 await tick();
 const h=FakeHls.instances.at(-1);
 h.emit(FakeHls.Events.ERROR,{fatal:true,type:FakeHls.ErrorTypes.MEDIA_ERROR});
 assert.equal(h.recoveries,1);
 assert.equal(errors.length,0);
 h.emit(FakeHls.Events.ERROR,{fatal:true,type:FakeHls.ErrorTypes.MEDIA_ERROR});
 assert.equal(errors.length,1);
 assert.equal(h.destroyed,true);
}

// A user switching sources while CDN loads should not attach the stale media.
{
 const c=setup();
 const before=FakeHls.instances.length;
 const cleanup=c.api.attach(c.video,'https://cdn.example.com/slow.m3u8');
 assert.equal(c.scripts.length,1);
 cleanup();
 c.window.Hls=FakeHls;
 c.scripts[0].onload();
 await tick();
 assert.equal(FakeHls.instances.length,before);
}

// If MSE is unsupported but browser can handle it, use built-in HLS fallback.
{
 class Unsupported extends FakeHls{static isSupported(){return false}}
 const c=setup({ctor:Unsupported,canHls:'maybe',vendor:'',mse:true});
 c.api.attach(c.video,'https://cdn.example.com/fallback.m3u8');
 await tick();
 assert.equal(c.video.src,'https://cdn.example.com/fallback.m3u8');
}

// Never allow non-HTTPS media playback, and do not inject the library for invalid input.
{
 const c=setup({ctor:FakeHls});
 const errors=[];
 c.api.attach(c.video,'http://untrusted.example.com/video.m3u8',
  {onError:msg=>errors.push(msg)});
 assert.equal(errors.length,1);
 assert.equal(c.scripts.length,0);
}
console.log('1UP HLS bridge checks passed: native, HLS.js, cleanup, errors and async race.');
