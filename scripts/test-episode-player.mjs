/* Offline player lifecycle regression: use the public API and a small DOM double. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

class Element {
 constructor(tag='div'){this.tag=tag;this.children=[];this.dataset={};this.isConnected=true;this.classList={toggle(){}};this.attributes={};this.pauseCalls=0;this.loadCalls=0;}
 appendChild(node){this.children.push(node);return node;}
 append(...nodes){this.children.push(...nodes);}
 after(){}
 replaceChildren(){this.children=[];}
 setAttribute(key,value){this.attributes[key]=value;}
 removeAttribute(key){delete this.attributes[key];if(key==='src')this.src='';}
 addEventListener(event,fn){(this.listeners??={})[event]=fn;}
 querySelector(){return null;}
 querySelectorAll(selector){return selector==='source'?this.children.filter(node=>node.tag==='source'):[];}
 pause(){this.pauseCalls++;}
 load(){this.loadCalls++;}
}
function setup(mime,episode={},records){
 const events=new Map(),nodes=new Map();
 const root=new Element();
 root.querySelector=selector=>nodes.get(selector)||null;
 root.querySelectorAll=()=>[];
 Object.defineProperty(root,'innerHTML',{set(){
  nodes.clear();
  for(const id of ['oneup-watch-episode','oneup-watch-language','oneup-playback-display','oneup-player-message','oneup-now-watching'])nodes.set('#'+id,new Element());
 }});
 const document={querySelector:()=>root,createElement:tag=>new Element(tag),addEventListener:(name,fn)=>events.set(name,fn),dispatchEvent(){}};
 let pending=false,disposed=0;
 const window={OneUpHLS:{attach(){return ()=>disposed++;}}};
 const fetch=()=>pending?new Promise(()=>{}):Promise.resolve({ok:true,json:async()=>({entries:{'al-1':{episodes:records||[{number:1,rights:'owned',sources:[{src:'https://media.example.com/video',mime}],...episode}]}}})});
 vm.runInNewContext(fs.readFileSync('episode-player.js','utf8'),{window,document,fetch,URL,location:{href:'https://anime.example.com/'},AbortController,setTimeout,clearTimeout,CustomEvent:class{}});
 return {window,root,nodes,events,setPending(){pending=true;},get disposed(){return disposed;}};
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
// Missing source metadata inherits episode values, including local WebVTT captions.
{
 const c=setup('video/mp4',{language:'Español latino',quality:'1080p',subtitles_es:'./media/subtitles/episode-1.vtt'});
 await c.window.OneUpEpisodePlayer.show({id:'al-1'});
 const video=c.nodes.get('#oneup-playback-display').children[0];
 assert.equal(video.children.find(node=>node.tag==='track').src,'./media/subtitles/episode-1.vtt');
 assert.match(c.nodes.get('#oneup-player-message').textContent,/Español latino · 1080p/);
}
// A source can override episode metadata and captions independently.
{
 const c=setup('video/mp4',{language:'Japonés',quality:'720p',subtitles_es:'./media/default.vtt',sources:[{src:'https://media.example.com/video.mp4',language:'Castellano',quality:'1080p',subtitles_es:'https://media.example.com/captions.vtt'}]});
 await c.window.OneUpEpisodePlayer.show({id:'al-1'});
 const video=c.nodes.get('#oneup-playback-display').children[0];
 assert.equal(video.children.find(node=>node.tag==='track').src,'https://media.example.com/captions.vtt');
 assert.match(c.nodes.get('#oneup-player-message').textContent,/Castellano · 1080p/);
}
// Reject insecure and escaping caption paths, rather than silently loading them.
for(const subtitles_es of ['./media/../secret.vtt','./media/%2e%2e/secret.vtt','../media/test.vtt','http://media.example.com/test.vtt','javascript:alert(1)','//media.example.com/test.vtt','./media/test.mp4']){
 const c=setup('video/mp4',{subtitles_es});
 await c.window.OneUpEpisodePlayer.show({id:'al-1'});
 const video=c.nodes.get('#oneup-playback-display').children[0];
 assert.equal(video.children.some(node=>node.tag==='track'),false,subtitles_es);
}

// Only declared language groups appear; filtering preserves the seven source slots.
{
 const sources=[
  {language:'es-419'}, {language:'es-ES'},
  {language:'ja',subtitles_es:'./media/sub.vtt'}, {language:'ja'}, {language:'en'}
 ].map((source,index)=>({src:'https://media.example.com/video-'+index+'.mp4',name:'Fuente '+index,...source}));
 const c=setup('video/mp4',{sources});
 await c.window.OneUpEpisodePlayer.show({id:'al-1'});
 const select=c.nodes.get('#oneup-watch-language');
 for(const group of ['latino','castellano','sub','original','other'])assert(select.innerHTML.includes('value="'+group+'"'));
 for(const [group,index] of [['latino',0],['castellano',1],['sub',2],['original',3],['other',4]]){
  select.listeners.change({target:{value:group}});
  const video=c.nodes.get('#oneup-playback-display').children[0];
  assert.equal(video.children[0].src,sources[index].src);
 }
 c.window.OneUpEpisodePlayer.close();
}
{
 const c=setup('video/mp4',{language:'es'});
 await c.window.OneUpEpisodePlayer.show({id:'al-1'});
 const select=c.nodes.get('#oneup-watch-language');
 assert(!select.innerHTML.includes('value="latino"'),'Unspecified Spanish region must not become Latino');
 assert(select.innerHTML.includes('value="other"'));
}

// External subtitle files do not add captions inside a provider's iframe.
{
 const c=setup('video/mp4',{sources:[{mode:'official_embed',provider:'youtube',videoId:'abcdefghijk',language:'ja',subtitles_es:'./media/sub.vtt'}]});
 await c.window.OneUpEpisodePlayer.show({id:'al-1'});
 const select=c.nodes.get('#oneup-watch-language');
 assert(select.innerHTML.includes('value="original"'));
 assert(!select.innerHTML.includes('value="sub"'),'Iframe cannot use a local WebVTT file');
}

// Identical episode numbers in different seasons must not overwrite each other.
{
 const records=[undefined,2].map((season,index)=>({number:1,season,rights:'owned',src:'https://media.example.com/season-'+(index+1)+'.mp4'}));
 const c=setup('video/mp4',{},records);
 await c.window.OneUpEpisodePlayer.show({id:'al-1'},{root:c.root});
 assert.equal(c.nodes.get('#oneup-playback-display').children[0].children[0].src,records[0].src);
 await c.window.OneUpEpisodePlayer.show({id:'al-1'},{root:c.root,season:2});
 assert.equal(c.nodes.get('#oneup-playback-display').children[0].children[0].src,records[1].src);
}
console.log('Episode player passed: lifecycle, language filtering, inherited metadata, safe captions and seasons.');
