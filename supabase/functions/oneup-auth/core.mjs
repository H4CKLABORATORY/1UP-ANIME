// Native Supabase Auth owns password hashing, OTP generation and email delivery.
// This broker adds private username resolution, shared limits and scoped sessions.
export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const USERNAME = /^[a-z0-9_]{3,24}$/;
export function passwordOK(p) {
  return typeof p === 'string' && [...p].length >= 15 && new TextEncoder().encode(p).length <= 72
    && new Set(p).size >= 5 && !['password','contraseña','123456789','qwerty'].some(x => p.toLowerCase().includes(x));
}
const enc = new TextEncoder();
const hex = b => Array.from(new Uint8Array(b), n => n.toString(16).padStart(2,'0')).join('');
export const randomToken = () => hex(crypto.getRandomValues(new Uint8Array(32)));
export const digest = async s => hex(await crypto.subtle.digest('SHA-256',enc.encode(s)));
async function secretKey(secret) {
  return crypto.subtle.importKey('raw', await crypto.subtle.digest('SHA-256',enc.encode(secret)), 'AES-GCM',false,['encrypt','decrypt']);
}
export async function seal(value,secret) {
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const bytes=await crypto.subtle.encrypt({name:'AES-GCM',iv},await secretKey(secret),enc.encode(value));
  return hex(iv)+hex(bytes);
}
export async function unseal(value,secret) {
  const bytes=Uint8Array.from(value.match(/.{2}/g)||[],h=>parseInt(h,16));
  return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes.slice(0,12)},await secretKey(secret),bytes.slice(12)));
}
class Failure extends Error { constructor(status,message){super(message);this.status=status;} }
const GENERIC='Si los datos corresponden a una cuenta disponible, recibirás un código. Revisa también spam.';
const INVALID='No se pudo validar el acceso. Comprueba los datos o solicita un nuevo código.';
export function createHandler(env, fetcher=fetch, now=()=>Date.now()) {
  const origin=env.ONEUP_ORIGIN;
  const ready=env.ONEUP_AUTH_READY==='true' && /^https:\/\//.test(env.SUPABASE_URL||'') &&
    env.SUPABASE_ANON_KEY && env.SUPABASE_SERVICE_ROLE_KEY && env.ONEUP_SESSION_SECRET?.length>=32;
  async function api(path,body,{admin=false,token,method='POST'}={}) {
    const key=admin?env.SUPABASE_SERVICE_ROLE_KEY:env.SUPABASE_ANON_KEY;
    const r=await fetcher(env.SUPABASE_URL+path,{
      method,headers:{apikey:key,Authorization:'Bearer '+(token||key),'Content-Type':'application/json',Prefer:'return=representation'},
      ...(method==='GET'?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(12000)
    });
    const data=await r.json().catch(()=>null);
    if(!r.ok)throw new Failure(r.status===429?429:400,r.status===429?'Espera antes de volver a intentarlo.':INVALID);
    return data;
  }
  const rest=(table,body,options={})=>api('/rest/v1/'+table,body,{admin:true,...options});
  async function limit(bucket,subject,max,seconds) {
    // HMAC prevents dictionary recovery of email/username from rate-limit keys.
    const key=await crypto.subtle.importKey('raw',enc.encode(env.ONEUP_SESSION_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
    const hashed=hex(await crypto.subtle.sign('HMAC',key,enc.encode(bucket+':'+subject)));
    const allowed=await rest('rpc/oneup_auth_limit',{p_key:hashed,p_max:max,p_seconds:seconds});
    if(allowed!==true)throw new Failure(429,'Demasiados intentos. Espera antes de continuar.');
  }
  async function profile(userId) {
    const rows=await rest('oneup_auth_names?user_id=eq.'+encodeURIComponent(userId)+'&select=username',null,{method:'GET'});
    if(!rows?.[0])throw new Failure(401,INVALID);
    return {kind:'oneup',key:'oneup_'+userId,name:rows[0].username};
  }
  async function issue(data,scope) {
    if(!data?.user?.id||!data.user.email_confirmed_at||!data.access_token)throw new Failure(401,INVALID);
    const identity=await profile(data.user.id);
    const token=randomToken();
    const expires=new Date(now()+Math.min(Number(data.expires_in)||600,scope==='recovery'?300:3600)*1000).toISOString();
    await rest('oneup_auth_sessions',{token_hash:await digest(token),user_id:data.user.id,scope,
      provider_token:await seal(data.access_token,env.ONEUP_SESSION_SECRET),expires_at:expires});
    // Refresh tokens are deliberately discarded. Re-login after expiry or reload.
    return {token,expires_at:expires,...(scope==='access'?{identity}:{recovery:true})};
  }
  async function session(req,scope) {
    const token=req.headers.get('Authorization')?.replace(/^Bearer /,'');
    if(!/^[a-f0-9]{64}$/.test(token||''))throw new Failure(401,INVALID);
    const hash=await digest(token);
    const rows=await rest('oneup_auth_sessions?token_hash=eq.'+hash+'&select=*',null,{method:'GET'});
    const s=rows?.[0];
    if(!s||s.scope!==scope||Date.parse(s.expires_at)<=now())throw new Failure(401,INVALID);
    const provider=await unseal(s.provider_token,env.ONEUP_SESSION_SECRET);
    const user=await api('/auth/v1/user',null,{token:provider,method:'GET'});
    if(user?.id!==s.user_id||!user.email_confirmed_at)throw new Failure(401,INVALID);
    // getUser verifies the JWT, but a revoked JWT can otherwise remain valid until expiry.
    let sid;try{sid=JSON.parse(atob(provider.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).session_id;}catch{throw new Failure(401,INVALID);}
    if(!/^[a-f0-9-]{36}$/.test(sid||'')||await rest('rpc/oneup_auth_session_live',{p_session:sid,p_user:s.user_id})!==true)throw new Failure(401,INVALID);
    return {...s,provider,hash};
  }
  return async req=>{
    const headers={'Content-Type':'application/json','Cache-Control':'no-store','Pragma':'no-cache',
      'X-Content-Type-Options':'nosniff','Vary':'Origin'};
    const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
    if(req.headers.get('Origin')!==origin)return reply({message:'Origen no permitido.'},403);
    headers['Access-Control-Allow-Origin']=origin;
    headers['Access-Control-Allow-Headers']='content-type, authorization';
    headers['Access-Control-Allow-Methods']='POST, OPTIONS';
    if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
    if(req.method!=='POST')return reply({message:'Método no permitido.'},405);
    if(!ready)return reply({message:'1UP Auth está pendiente de configuración.'},503);
    try {
      if(!req.headers.get('Content-Type')?.startsWith('application/json'))throw new Failure(415,'Se requiere JSON.');
      // Read a bounded stream; Content-Length alone is attacker-controlled.
      const reader=req.body?.getReader(); let chunks=[],size=0;
      if(!reader)throw new Failure(400,'Solicitud inválida.');
      while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>4096){await reader.cancel();throw new Failure(413,'Solicitud demasiado grande.');}chunks.push(value);}
      const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
      let b;try{b=JSON.parse(new TextDecoder().decode(bytes));}catch{throw new Failure(400,'JSON inválido.');}
      if(!b||typeof b!=='object'||Array.isArray(b))throw new Failure(400,'Solicitud inválida.');
      const action=b.action;
      const email=typeof b.email==='string'?b.email.trim().toLowerCase():'';
      const username=typeof b.username==='string'?b.username.trim().toLowerCase():'';
      const captcha=typeof b.captcha==='string'&&b.captcha.length<=2048?b.captcha:'';
      if(!['signup','login','verify','resend','recover','recover-verify','password','session','logout'].includes(action))throw new Failure(400,'Acción inválida.');
      // Global persistent cap protects the free backend; no reliance on spoofable X-Forwarded-For.
      await limit('global','all',500,60);
      if(['signup','resend','recover','verify','recover-verify'].includes(action)&&(!EMAIL.test(email)||email.length>254))throw new Failure(400,'Correo inválido.');
      if(['signup','login'].includes(action)&&!USERNAME.test(username))throw new Failure(400,'Usa de 3 a 24 letras minúsculas, números o guion bajo.');
      if(['signup','password'].includes(action)&&!passwordOK(b.password))throw new Failure(400,'Usa una contraseña única de 15 caracteres o más, con un máximo de 72 bytes.');
      if(['signup','login','resend','recover'].includes(action)&&!captcha)throw new Failure(400,'Completa la comprobación de seguridad.');
      const authOptions={gotrue_meta_security:{captcha_token:captcha}};
      if(['signup','resend','recover'].includes(action)) {
        await limit('mail-minute',email,1,60);await limit('mail-hour',email,3,3600);
        await limit('mail-day','all',90,86400);await limit('mail-month','all',2700,2678400);
        if(action==='signup') {
          await limit('signup-name',username,3,3600);
          try {await api('/auth/v1/signup',{email,password:b.password,data:{oneup_username:username},...authOptions});}
          catch(e){if(e.status===429)throw e;/* hide existing accounts and name collisions */}
        }else {
          try{await api(action==='resend'?'/auth/v1/resend':'/auth/v1/recover',action==='resend'?{email,type:'signup',...authOptions}:{email,...authOptions});}
          catch(e){if(e.status===429)throw e;}
        }
        return reply({message:GENERIC});
      }
      if(action==='login') {
        if(typeof b.password!=='string'||b.password.length>256)throw new Failure(400,INVALID);
        await limit('login',username,10,900);
        const rows=await rest('oneup_auth_names?username=eq.'+encodeURIComponent(username)+'&select=user_id',null,{method:'GET'});
        let loginEmail='unavailable@invalid.example';
        if(rows?.[0]){
          const u=await api('/auth/v1/admin/users/'+rows[0].user_id,null,{admin:true,method:'GET'});
          loginEmail=u.email;
        }
        const data=await api('/auth/v1/token?grant_type=password',{email:loginEmail,password:b.password,...authOptions});
        return reply(await issue(data,'access'));
      }
      if(action==='verify'||action==='recover-verify') {
        if(!/^\d{6}$/.test(b.code||''))throw new Failure(400,'Introduce los seis dígitos del código.');
        // Shared across signup/recovery and resends: resend cannot reset brute-force budget.
        await limit('otp',email,5,600);
        const data=await api('/auth/v1/verify',{email,token:b.code,type:action==='verify'?'signup':'recovery'});
        return reply(await issue(data,action==='verify'?'access':'recovery'));
      }
      if(action==='password') {
        const s=await session(req,'recovery');
        // Consume once atomically BEFORE update. Failure requires another recovery OTP.
        const used=await rest('oneup_auth_sessions?token_hash=eq.'+s.hash+'&select=token_hash',null,{method:'DELETE'});
        // DELETE with return=representation is enforced by the API helper below.
        if(!used?.length)throw new Failure(401,INVALID);
        await api('/auth/v1/user',{password:b.password},{method:'PUT',token:s.provider});
        await rest('oneup_auth_sessions?user_id=eq.'+s.user_id,null,{method:'DELETE'});
        await api('/auth/v1/logout?scope=global',{}, {token:s.provider});
        return reply({message:'Contraseña actualizada. Inicia sesión de nuevo.'});
      }
      const s=await session(req,'access');
      if(action==='logout') {
        await rest('oneup_auth_sessions?user_id=eq.'+s.user_id,null,{method:'DELETE'});
        await api('/auth/v1/logout?scope=global',{}, {token:s.provider});
        return reply({message:'Sesiones cerradas.'});
      }
      return reply({identity:await profile(s.user_id),expires_at:s.expires_at});
    }catch(e){return reply({message:e instanceof Failure?e.message:'Servicio no disponible. Inténtalo más tarde.'},e instanceof Failure?e.status:503);}
  };
}
