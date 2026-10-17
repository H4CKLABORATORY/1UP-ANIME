/* Zero-dependency smoke checks for the Render API; starts local server. */
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
const port=18347;
const child=spawn(process.execPath,['render/anime1v-gateway.js'],{
 env:{...process.env,PORT:String(port),ANIME1V_BASE_URL:'',ANIME1V_API_KEY:''},
 stdio:'ignore'
});
try{
 let up=false;
 for(let i=0;i<50;i++){
  try{const r=await fetch('http://127.0.0.1:'+port+'/health');if(r.ok){up=true;break}}
  catch{}
  await delay(100);
 }
 assert.ok(up,'Metadata gateway did not start');
 const root='http://127.0.0.1:'+port;
 const health=await(await fetch(root+'/health')).json();
 assert.equal(health.ok,true);
 assert.equal(health.upstream,'jikan_fallback');
 assert.equal(health.streaming,false);
 for(const endpoint of ['/resolve','/api/v1/anime/episode','/download','/api/v1/anime/resolve']){
  const r=await fetch(root+endpoint);assert.equal(r.status,404,endpoint+' unexpectedly exposed');
 }
 const bad=await fetch(root+'/anime1vDiscovery?kind=search&q=A');assert.equal(bad.status,400);
 const blocked=await fetch(root+'/anime1vDiscovery?kind=search&q=Bleach',{headers:{Origin:'https://evil.example'}});
 assert.equal(blocked.status,403);
 const post=await fetch(root+'/anime1vDiscovery',{method:'POST'});assert.equal(post.status,405);
 const wrong=await fetch(root+'/anime1vDiscovery?kind=download');assert.equal(wrong.status,404);
 console.log('PASS: standalone Render service health, metadata-only, no streams, validation and origin checks');
}finally{child.kill('SIGTERM')}
