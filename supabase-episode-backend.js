/* 1UP ANIME — optional Supabase episode comments and personal progress.
 * Not loaded by index.html until a Supabase project has been configured and reviewed.
 * Uses a PUBLIC publishable key only; do NOT put server keys in a web bundle.
 */
(function(global){
'use strict';
const SDK='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.3/+esm';
const ID=/^(mal|al)-[1-9][0-9]*$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
let pending=null;
const conf=()=>global.ONEUP_SUPABASE_CONFIG;
function enabled(){
 const c=conf();
 try{
  const u=new URL(c?.url||'');
  return u.protocol==='https:'&&!u.username&&!u.password&&
   typeof c?.publishableKey==='string'&&c.publishableKey.startsWith('sb_publishable_');
 }catch{return false}
}
function episodeId(a,e){
 const name=String(a||'');
 const number=Number(e);
 if(!ID.test(name)||!Number.isInteger(number)||number<1||number>9999)
  throw Error('Identificador de episodio incorrecto.');
 return {name,number};
}
function maskError(error){
 const value=String(error?.code||error?.message||error||'').toLowerCase();
 if(value.includes('p0001')||value.includes('wait before commenting'))return 'Publicas demasiado rápido. Inténtalo de nuevo en unos segundos.';
 if(value.includes('23505')||value.includes('duplicate'))return 'Ya enviaste este reporte.';
 if(value.includes('42501')||value.includes('permission')||value.includes('row-level'))return 'No tienes permiso para realizar esa acción.';
 if(value.includes('anonymous')||value.includes('signups'))return 'Necesitas iniciar sesión o habilitar el acceso para invitados.';
 return 'No se pudo completar la operación. Inténtalo de nuevo más tarde.';
}
async function client(){
 if(!enabled())throw Error('Supabase no está configurado para 1UP ANIME.');
 if(!pending){
  pending=import(SDK).then(({createClient})=>createClient(
   conf().url,conf().publishableKey,{
    auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
   }
  )).catch(error=>{pending=null;throw error});
 }
 return pending;
}
async function account({guest=false}={}){
 const supa=await client();
 let {data,error}=await supa.auth.getUser();
 if(error&&error.name!=='AuthSessionMissingError')throw error;
 if(!data?.user&&guest){
  const login=await supa.auth.signInAnonymously();
  if(login.error)throw login.error;
  data=login.data;
 }
 if(!data?.user)throw Error('Inicia sesión antes de continuar.');
 return {user:data.user,supa};
}
function mapComment(row){
 return {
  id:row.id,displayName:row.display_name,text:row.body,
  guest:true,owner:false,verified:false,
  createdAt:{toDate:()=>new Date(row.created_at)}
 };
}
async function subscribeEpisode(animeId,episode,callback,onError){
 const {name,number}=episodeId(animeId,episode);
 const supa=await client();
 let active=true;
 const refresh=async()=>{
  const {data,error}=await supa.from('oneup_episode_comments')
   .select('id,display_name,body,created_at')
   .eq('anime_id',name).eq('episode_number',number)
   .eq('status','visible').order('created_at',{ascending:false}).limit(40);
  if(!active)return;
  if(error){onError?.(maskError(error));return}
  callback?.((data||[]).map(mapComment));
 };
 await refresh();
 if(!active)return ()=>{};
 // Requires supabase_realtime publication for oneup_episode_comments.
 const topic='oneup-comments-'+name+'-ep-'+number+'-'+Math.random().toString(36).slice(2);
 const channel=supa.channel(topic)
  .on('postgres_changes',{
    event:'*',schema:'public',table:'oneup_episode_comments',
    filter:'anime_id=eq.'+name
  },payload=>{
    if(!active)return;
    const row=payload.new||payload.old||{};
    if(row.episode_number===number || payload.eventType==='DELETE')void refresh();
  }).subscribe();
 return ()=>{
  active=false;
  void supa.removeChannel(channel);
 };
}
async function sendEpisodeComment(animeId,episode,pseudonym,text){
 const {name,number}=episodeId(animeId,episode);
 const displayName=String(pseudonym??'').trim();
 const body=String(text??'').trim();
 if(displayName.length<3||displayName.length>25)throw Error('El apodo debe tener de 3 a 25 caracteres.');
 if(body.length<2||body.length>900)throw Error('El comentario debe tener de 2 a 900 caracteres.');
 const {user,supa}=await account({guest:true});
 const {error}=await supa.from('oneup_episode_comments').insert({
  anime_id:name,episode_number:number,author_id:user.id,display_name:displayName,
  body,status:'visible'
 });
 if(error)throw error;
}
async function report(type,id,reason){
 if(type!=='episodeComment')throw Error('Este adaptador solo admite reportar comentarios por episodio.');
 const value=String(id||'');
 const match=value.match(/^((?:mal|al)-[1-9]\d*)_ep_(\d{1,4})\/([a-f0-9-]{36})$/i);
 if(!match||!UUID.test(match[3]))throw Error('Identificador del comentario incorrecto.');
 const {user,supa}=await account({guest:true});
 const note=String(reason??'').trim();
 if(note.length<10||note.length>300)throw Error('Escribe un motivo entre 10 y 300 caracteres.');
 const {error}=await supa.from('oneup_comment_reports').insert({
  comment_id:match[3],reporter_id:user.id,reason:note
 });
 if(error)throw error;
}
async function loadProgress(animeId){
 const {name}=episodeId(animeId,1);
 const {user,supa}=await account();
 const {data,error}=await supa.from('oneup_anime_progress')
   .select('favorite,watched_episodes,updated_at')
   .eq('anime_id',name).eq('user_id',user.id).maybeSingle();
 if(error)throw error;
 return data;
}
async function saveProgress(animeId,{favorite=false,watched=0}={}){
 const {name}=episodeId(animeId,1);
 const {user,supa}=await account({guest:true});
 const episode=Number(watched);
 if(!Number.isInteger(episode)||episode<0||episode>9999)throw Error('Progreso incorrecto.');
 const {error}=await supa.from('oneup_anime_progress').upsert({
  user_id:user.id,anime_id:name,favorite:!!favorite,watched_episodes:episode
 },{onConflict:'user_id,anime_id'});
 if(error)throw error;
}
async function loginWithGoogle(){
 const supa=await client();
 return supa.auth.signInWithOAuth({provider:'google',options:{
  redirectTo:global.location?.origin+global.location?.pathname
 }});
}
global.OneUpSupabaseEpisodeBackend={
 enabled,client,subscribeEpisode,sendEpisodeComment,report,
 loadProgress,saveProgress,loginWithGoogle,maskError,episodeId
};
})(window);
