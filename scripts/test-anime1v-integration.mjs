import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {buildClient,normalized,args,upstreamUrl}=require('../functions/anime1v-adapter.js');
for(const type of ['episode','resolve','download','image-proxy','info']){
 assert.throws(()=>args(type,{}),error=>error.status===404,'Unapproved upstream capability exposed: '+type);
}
for(const input of ['','ftp://api.example.com/','http://api.example.com/',
 'https://username:secret@api.example.com/','https://api.example.com/path',
 'https://api.example.com/?q=x'])assert.throws(()=>upstreamUrl(input));

assert.throws(()=>args('search',{q:'Black Clover',provider:'anime1v'}),e=>e.status===400);
assert.throws(()=>args('search',{q:'A'}),e=>e.status===400);
assert.throws(()=>args('catalog',{provider:'tioanime'}),e=>e.status===400);
assert.equal(args('catalog',{provider:'animeflv',page:2}).query.page,'2');
const meta=normalized({data:{results:[{title:'Mi Anime',image:'https://cdn.example.com/art.jpg',provider:'AnimeAV1',src:'https://hidden.example/video.mp4',url:'https://hidden.example/ep'}]}},'animeav1','search');
assert.equal(meta.results.length,1);
assert.equal(meta.results[0].title,'Mi Anime');
assert.ok(!JSON.stringify(meta).includes('video.mp4'),'Streaming links must not leak into metadata');
let calls=0,headers;
const payload=JSON.stringify({success:true,data:{results:[{title:'Anime de prueba',image:'https://cdn.example.com/1.jpg'}]}});
const fetcher=async(url,options)=>{
 calls++;headers=options.headers;
 assert.match(url,/\/api\/v1\/anime\/search\?q=One\+Piece&domain=animeav1$/);
 assert.equal(options.redirect,'error');
 return new Response(payload,{headers:{'Content-Type':'application/json'},status:200});
};
let clock=10;
const client=buildClient({baseUrl:'https://anime1v.example.com/',apiKey:'server-secret-only-key',
 fetcher,now:()=>clock});
const first=await client.query('search',{q:'One Piece'});
const second=await client.query('search',{q:'One Piece'});
assert.equal(calls,1,'Catalog cache failed');
assert.deepEqual(first,second);
assert.equal(headers['X-API-Key'],'server-secret-only-key');
assert.ok(!JSON.stringify(first).includes('server-secret-only-key'),'Secret leaked into browser response');
assert.equal(first.results[0].title,'Anime de prueba');
clock=190_001;
await client.query('search',{q:'One Piece'});
assert.equal(calls,2,'Cached result never expires');
const unauthorized=buildClient({baseUrl:'https://anime1v.example.com/',apiKey:'server-secret-only-key',
 fetcher:async()=>new Response('Unauthorized',{status:401})});
await assert.rejects(unauthorized.query('catalog',{provider:'animeav1'}),error=>error.status===502);
const oversize=buildClient({baseUrl:'https://anime1v.example.com/',apiKey:'server-secret-only-key',
 fetcher:async()=>new Response('x'.repeat(800_000),{status:200})});
await assert.rejects(oversize.query('catalog',{}),error=>error.status===502);
assert.throws(()=>buildClient({baseUrl:'https://anime1v.example.com/',apiKey:''}),e=>e.status===503);
console.log('PASS Anime1v adapter: metadata-only, server key, origin validation, upstream auth, cache, response size and errors');

