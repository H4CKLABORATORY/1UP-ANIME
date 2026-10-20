import test from 'node:test';
import assert from 'node:assert/strict';
import {createHandler,passwordOK,seal,unseal,digest} from '../supabase/functions/oneup-auth/core.mjs';
const origin='https://h4cklaboratory.github.io';
const env={ONEUP_ORIGIN:origin,ONEUP_AUTH_READY:'true',SUPABASE_URL:'https://test.supabase.co',SUPABASE_ANON_KEY:'anon-test',SUPABASE_SERVICE_ROLE_KEY:'private-test',ONEUP_SESSION_SECRET:'a-test-only-secret-with-at-least-32-characters'};
const user={id:'12345678-1234-1234-1234-123456789012',email:'test@example.com',email_confirmed_at:'2026-10-20T00:00:00Z'};
const nativeToken='header.'+btoa(JSON.stringify({session_id:user.id}))+'.signature';
function fixture(){
 let time=Date.now(),otpUsed=false,verified=true,password='A unique nebula phrase!',sessionValid=true;
 const limits=new Map(),sessions=new Map(),calls=[];
 const response=(data,status=200)=>new Response(JSON.stringify(data),{status});
 const fetcher=async(url,opts)=>{
  const u=new URL(url),b=opts.body?JSON.parse(opts.body):null;calls.push({path:u.pathname,query:u.search,body:b,headers:opts.headers});
  if(u.pathname.endsWith('/rpc/oneup_auth_limit')){
   let l=limits.get(b.p_key);if(!l||l.until<=time)l={n:0,until:time+b.p_seconds*1000};l.n++;limits.set(b.p_key,l);return response(l.n<=b.p_max);
  }
  if(u.pathname.endsWith('/rpc/oneup_auth_session_live'))return response(sessionValid);
  if(u.pathname.endsWith('/oneup_auth_names'))return response(u.searchParams.get('username')==='eq.missing'?[]:[{user_id:user.id,username:'dexter'}]);
  if(u.pathname.endsWith('/oneup_auth_sessions')){
   if(opts.method==='POST'){sessions.set(b.token_hash,b);return response([b]);}
   const hash=u.searchParams.get('token_hash')?.slice(3),uid=u.searchParams.get('user_id')?.slice(3);
   const found=[...sessions.values()].filter(s=>hash?s.token_hash===hash:s.user_id===uid);
   if(opts.method==='DELETE')for(const s of found)sessions.delete(s.token_hash);
   return response(found);
  }
  if(u.pathname.includes('/admin/users/'))return response(user);
  if(u.pathname.endsWith('/token'))return b.email===user.email&&b.password===password?response({user:{...user,email_confirmed_at:verified?user.email_confirmed_at:null},access_token:nativeToken,refresh_token:'never-return-me',expires_in:600}):response({},400);
  if(u.pathname.endsWith('/verify')){
   if(b.token!=='123456'||otpUsed)return response({},400);otpUsed=true;
   return response({user,access_token:nativeToken,expires_in:600});
  }
  if(u.pathname.endsWith('/user')){
   if(!sessionValid)return response({},401);
   if(opts.method==='PUT')password=b.password;
   return response(user);
  }
  if(u.pathname.endsWith('/logout')){sessionValid=false;return response({});}
  return response({});
 };
 const handler=createHandler(env,fetcher,()=>time);
 const send=(action,values={},token,headers={})=>handler(new Request('https://test.supabase.co/functions/v1/oneup-auth',{
  method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{}),...headers},body:JSON.stringify({action,...values})}));
 return {send,calls,sessions,advance:ms=>{time+=ms;},unverify:()=>{verified=false;},revoke:()=>{sessionValid=false;}};
}
const login={username:'dexter',password:'A unique nebula phrase!',captcha:'test-captcha'};
test('password policy handles length, repetition, common strings and bcrypt byte limit',()=>{
 for(const p of ['short','aaaaaaaaaaaaaaaaaaa','password-and-some-more','é'.repeat(37)])assert.equal(passwordOK(p),false);
 assert.equal(passwordOK('Una frase espacial única!'),true);
});
test('provider tokens are authenticated-encrypted with random IVs',async()=>{
 const a=await seal('native-secret',env.ONEUP_SESSION_SECRET),b=await seal('native-secret',env.ONEUP_SESSION_SECRET);
 assert.notEqual(a,b);assert.equal(await unseal(a,env.ONEUP_SESSION_SECRET),'native-secret');
 await assert.rejects(unseal(a,'wrong-key'));
});
test('configuration, origin, method, malformed JSON, oversized body fail closed',async()=>{
 const h=createHandler({});assert.equal((await h(new Request('https://a',{method:'POST'}))).status,403);
 assert.equal((await createHandler({...env,ONEUP_AUTH_READY:'false'})(new Request('https://a',{method:'POST',headers:{Origin:origin}}))).status,503);
 const f=fixture();assert.equal((await f.send('login',login,null,{Origin:'https://evil.example'})).status,403);
 assert.equal(f.calls.length,0);
 const handler=createHandler(env,()=>{throw Error('must not call upstream');});
 for(const [body,status] of [['{',400],['x'.repeat(4097),413],['null',400]])assert.equal((await handler(new Request('https://a',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body}))).status,status);
 assert.equal((await handler(new Request('https://a',{headers:{Origin:origin}}))).status,405);
});
test('username lookup is server-only, session tokens opaque and hashed at rest',async()=>{
 const f=fixture(),r=await f.send('login',login),data=await r.json();assert.equal(r.status,200);
 assert.match(data.token,/^[a-f0-9]{64}$/);assert.equal(data.identity.key,'oneup_'+user.id);
 const body=JSON.stringify(data);assert.ok(!body.includes('native-secret'));assert.ok(!body.includes('never-return-me'));assert.ok(!body.includes(user.email));
 assert.ok(f.sessions.has(await digest(data.token)));assert.ok(!f.sessions.has(data.token));
 assert.equal((await f.send('session',{},data.token)).status,200);
 assert.equal(r.headers.get('Cache-Control'),'no-store');assert.equal(r.headers.get('Access-Control-Allow-Origin'),origin);
});
test('unverified user, wrong password, unknown username and missing CAPTCHA cannot log in',async()=>{
 const f=fixture();f.unverify();assert.equal((await f.send('login',login)).status,401);
 for(const values of [{...login,password:'wrong'},{...login,username:'missing'},{...login,captcha:''}])assert.equal((await fixture().send('login',values)).status,400);
});
test('persistent account login budget blocks the eleventh request',async()=>{
 const f=fixture();for(let i=0;i<10;i++)assert.equal((await f.send('login',{...login,password:'wrong'})).status,400);
 assert.equal((await f.send('login',login)).status,429);
 f.advance(900001);assert.equal((await f.send('login',login)).status,200);
});
test('OTP budget shared across purposes and resend, replay rejected',async()=>{
 const f=fixture();for(let i=0;i<5;i++)assert.equal((await f.send(i%2?'verify':'recover-verify',{email:user.email,code:'000000'})).status,400);
 assert.equal((await f.send('resend',{email:user.email,captcha:'test'})).status,200);
 assert.equal((await f.send('verify',{email:user.email,code:'123456'})).status,429);
 f.advance(600001);assert.equal((await f.send('verify',{email:user.email,code:'123456'})).status,200);
 assert.equal((await f.send('verify',{email:user.email,code:'123456'})).status,400);
});
test('recovery token cannot access app or logout; password reset consumes it and revokes all broker sessions',async()=>{
 const f=fixture(),access=await (await f.send('login',login)).json();
 const data=await (await f.send('recover-verify',{email:user.email,code:'123456'})).json();
 assert.equal(data.identity,undefined);assert.equal((await f.send('session',{},data.token)).status,401);
 assert.equal((await f.send('password',{password:'Another unique galaxy phrase!'},access.token)).status,401);
 assert.equal((await f.send('password',{password:'Another unique galaxy phrase!'},data.token)).status,200);
 assert.equal(f.sessions.size,0);
 assert.equal((await f.send('password',{password:'Another unique galaxy phrase!'},data.token)).status,401);
 assert.equal((await f.send('session',{},access.token)).status,401);
});
test('expiry enforced server-side; recovery expires in five minutes',async()=>{
 const f=fixture(),data=await (await f.send('recover-verify',{email:user.email,code:'123456'})).json();
 f.advance(300001);assert.equal((await f.send('password',{password:'Another unique galaxy phrase!'},data.token)).status,401);
 const g=fixture(),s=await (await g.send('login',login)).json();g.advance(600001);assert.equal((await g.send('session',{},s.token)).status,401);
});
test('logout revokes all app sessions and native provider is revalidated',async()=>{
 const f=fixture(),a=await (await f.send('login',login)).json(),b=await (await f.send('login',login)).json();
 assert.equal((await f.send('logout',{},a.token)).status,200);assert.equal((await f.send('session',{},b.token)).status,401);
 const g=fixture(),c=await (await g.send('login',login)).json();g.revoke();assert.equal((await g.send('session',{},c.token)).status,400);
});
test('resend cooldown, normalized email and generic response prevent direct enumeration',async()=>{
 const f=fixture(),a=await f.send('recover',{email:' TEST@EXAMPLE.COM ',captcha:'test'});
 assert.equal(a.status,200);assert.match((await a.json()).message,/Si los datos/);
 assert.equal((await f.send('recover',{email:user.email,captcha:'test'})).status,429);
 const mail=f.calls.find(c=>c.path.endsWith('/recover'));assert.equal(mail.body.email,user.email);
});
test('SQL injection username rejected before lookup; upstream failures do not leak secrets',async()=>{
 const f=fixture();assert.equal((await f.send('login',{...login,username:"'; select * --"})).status,400);
 assert.equal(f.calls.filter(c=>c.path.endsWith('/oneup_auth_names')).length,0);
 const h=createHandler(env,()=>{throw Error('private-test native-secret');});
 const r=await h(new Request('https://a',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:'{"action":"login"}'}));
 assert.equal(r.status,503);assert.ok(!(await r.text()).includes('private-test'));
});
