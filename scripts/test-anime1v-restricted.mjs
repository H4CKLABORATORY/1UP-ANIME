import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {createServer}=require('../render/anime1v-source/server.js');
let called=0;
const testKey='1UP-meta-only-key-00000000000000000';
const service=createServer({
 search:async q=>{called++;return {data:{results:[
  {title:'Anime Seguro',image:'https://cdn.example.com/1.png',streamUrl:'https://unauthorized.example/video.m3u8',url:'https://unauthorized.example/episode'},
  {title:'Peligro',image:'javascript:alert(1)',server:'evil'}
 ]}};},
 catalog:async page=>{called++;return {data:{results:[{title:'Episodio de catálogo',cover:'https://cdn.example.com/a.png'}],hasMore:false}}}
},testKey);
await new Promise(resolve=>service.listen(0,'127.0.0.1',resolve));
const root='http://127.0.0.1:'+service.address().port;
const auth={'X-API-Key':testKey};
try{
 const status=await(await fetch(root+'/health')).json();
 assert.equal(status.streaming,false);
 assert.equal(status.service,'anime1v-metadata-only');
 for(const path of ['/api/v1/anime/episode','/api/v1/anime/resolve','/api/v1/anime/download','/api/v1/anime/image-proxy','/downloads','/api/anime1v/search']){
  const r=await fetch(root+path,{headers:auth});
  assert.equal(r.status,404,'Disallowed endpoint unexpectedly published: '+path);
 }
 const unauthorized=await fetch(root+'/api/v1/anime/search?q=Naruto');
 assert.equal(unauthorized.status,401);
 const fakeKey=await fetch(root+'/api/v1/anime/search?q=Naruto',{headers:{'X-API-Key':'wrong'}});
 assert.equal(fakeKey.status,401);
 const badDomain=await fetch(root+'/api/v1/anime/search?q=Naruto&domain=animeflv',{headers:auth});
 assert.equal(badDomain.status,400);
 const invalidPage=await fetch(root+'/api/v1/anime/catalog?page=100',{headers:auth});
 assert.equal(invalidPage.status,400);
 const search=await fetch(root+'/api/v1/anime/search?q=Naruto&domain=animeav1',{headers:auth});
 assert.equal(search.status,200);
 const data=await search.json();
 assert.equal(data.data.results.length,2);
 assert.equal(data.data.results[0].title,'Anime Seguro');
 assert.equal(data.data.results[1].image,'');
 assert.ok(!JSON.stringify(data).includes('m3u8'));
 assert.ok(!JSON.stringify(data).includes('unauthorized.example'));
 assert.equal(search.headers.get('x-anime1v-author'),'FxxMorgan');
 await fetch(root+'/api/v1/anime/search?q=Naruto&domain=animeav1',{headers:auth});
 assert.equal(called,1,'Identical search should be cached');
 const catalog=await fetch(root+'/api/v1/anime/catalog?page=1',{headers:auth});
 assert.equal(catalog.status,200);
 assert.equal((await catalog.json()).data.results[0].title,'Episodio de catálogo');
 assert.equal(called,2);
 assert.throws(()=>createServer({search:async()=>{},catalog:async()=>{}},''),/API_KEYS/);
 console.log('PASS Anime1v restricted upstream runtime: authentication, no streams, input validation, cache, safe metadata');
}finally{await new Promise(resolve=>service.close(resolve))}
