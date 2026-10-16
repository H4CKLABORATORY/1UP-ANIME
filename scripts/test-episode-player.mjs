/* Offline player lifecycle regression: use the public API and a small DOM double. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

class Element {
 constructor(tag='div'){this.tag=tag;this.children=[];this.dataset={};this.isConnected=true;this.classList={toggle(){}};this.attributes={};this.pauseCalls=0;this.loadCalls=0;}
 appendChild(node){this.children.push(node);return node;}
 append(...nodes){this.children.push(...nodes);}
 replaceChildren(){this.children=[];}
 setAttribute(key,value){this.attributes[key]=value;}
 removeAttribute(key){delete this.attributes[key];if(key==='src')this.src='';}
 addEventListener(){}
 querySelector(){return null;}
 querySelectorAll(selector){return selector==='source'?this.children.filter(node=>node.tag==='source'):[];}
 pause(){this.pauseCalls++;}
 load(){this.loadCalls++;}
}
function setup(mime){
 const events=new Map(),nodes=new Map();
 const root=new Element();
 root.querySelector=selector=>nodes.get(selector)||null;
 root.querySelectorAll=()=>[];
 Object.defineProperty(root,'innerHTML',{set(){
  nodes.clear();
  for(const id of ['oneup-watch-episode','oneup-playback-display','oneup-player-message','oneup-now-watching'])nodes.set('#'+id,new Element());
 }});
 const document={querySelector:()=>root,createElement:tag=>new Element(tag),addEventListener:(name,fn)=>events.set(name,fn),dispatchEvent(){}};
 let pending=false,disposed=0;
 const window={OneUpHLS:{attach(){return ()=>disposed++;}}};
 const fetch=()=>pending?new Promise(()=>{}):Promise.resolve({ok:true,json:async()=>({entries:{'al-1':{episodes:[{number:1,rights:'owned',sources:[{src:'https://media.example.com/video',mime}]}]}}})});
 vm.runInNewContext(fs.readFileSync('episode-player.js','utf8'),{window,document,fetch,URL,location:{href:'https://anime.example.com/'},AbortController,setTimeout,clearTimeout,CustomEvent:class{}});
 return {window,nodes,events,setPending(){pending=true;},get disposed(){return disposed;}};
}

// A new anime must release old media immediately, before its manifest resolves.
for(const mime of ['video/mp4','video/webm','application/vnd.apple.mpegurl']){
 const c=setup(mime);
 await c.window.OneUpEpisodePlayer.show({id:'al-1',episodes:1});
 const video=c.nodes.get('#oneup-playback-display').children[0];
 c.setPending();
 // The unresolved mock intentionally ignores abort; do not await it.
 const next=c.window.OneUpEpisodePlayer.show({id:'al-2'});
 if(mime==='application/vnd.apple.mpegurl')assert.equal(c.disposed,1,'HLS must dispose before the next fetch completes');
 else{
  assert.equal(video.pauseCalls,1,'Direct media must stop playing');
  assert.equal(video.children[0].src,'','Direct source must be released');
  assert.equal(video.loadCalls,1,'Reset the browser media resource');
 }
 c.events.get('oneup-anime-closed')();
 if(mime==='application/vnd.apple.mpegurl')assert.equal(c.disposed,1,'Repeated close must not dispose twice');
 void next;
}

// Closing the anime also releases direct files without selecting another source.
{
 const c=setup('video/mp4');
 await c.window.OneUpEpisodePlayer.show({id:'al-1'});
 const video=c.nodes.get('#oneup-playback-display').children[0];
 c.events.get('oneup-anime-closed')();
 assert.equal(video.pauseCalls,1);
 assert.equal(video.loadCalls,1);
}
console.log('Episode player lifecycle passed: immediate HLS cleanup, MP4/WebM release and close.');
