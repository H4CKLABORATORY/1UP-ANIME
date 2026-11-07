/* Regression checks in Chromium with an isolated, in-memory backend.
 * No Supabase connection or public comment writes. */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage();
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.setContent('<section id="oneup-comments-section"></section>');
 await page.evaluate(()=>{
  window.testCalls=[];window.confirm=()=>{window.testCalls.push('confirm');return true};
  window.__oneupAccount=true;
  window.OneUpAuth={isAccount:()=>window.__oneupAccount===true,get:()=>({name:'AnimeFan'}),openDialog:()=>{window.testCalls.push('openDialog')}};
  window.OneUpSocialBackend={
   enabled:()=>true,maskError:error=>error.message,
   subscribeEpisode:async(a,e,callback)=>{callback([]);return ()=>{}},
   report:async()=>{window.testCalls.push('report');await new Promise(resolve=>window.resolveReport=resolve)},
   sendEpisodeComment:async(...args)=>{window.sent=args;await new Promise((resolve,reject)=>{window.resolveSend=resolve;window.rejectSend=reject})}
  };
 });
 await page.addScriptTag({path:'episode-comments.js'});
 const show=async id=>page.evaluate(id=>window.OneUpEpisodeComments.show({id,episodes:12}),id);
 await show('mal-1');await show('mal-2');await show('mal-3');
 await page.evaluate(()=>{
  const button=document.createElement('button');button.dataset.reportComment='test-id';
  document.querySelector('#oneup-episode-comments').append(button);button.click();
 });
 assert.deepEqual(await page.evaluate(()=>window.testCalls),['confirm','report'],'Repeated opens must register one report handler');
 await show('mal-4');
 await page.evaluate(()=>window.resolveReport());
 assert.equal(await page.locator('#oneup-comment-state').textContent(),'Los comentarios de este episodio son públicos y pueden leerse sin registrarse. Para comentar, inicia sesión con tu cuenta 1UP.','Old report must not update the new detail');
 // Guests cannot send: the account gate blocks the send and opens the dialog.
 await show('mal-10');
 await page.evaluate(()=>{window.__oneupAccount=false;window.sent=undefined});
 await show('mal-10');
 await page.locator('#oneup-guest-text').fill('Comentario de invitado');
 await page.locator('#oneup-send-comment').click();
 assert.equal(await page.locator('#oneup-comment-state').textContent(),'Para comentar necesitas una cuenta 1UP.','Guest send must be blocked by the account gate');
 assert.deepEqual(await page.evaluate(()=>window.testCalls),['confirm','report','openDialog'],'Guest send must open the login dialog');
 assert.equal(await page.evaluate(()=>window.sent),undefined,'Guest send must not reach the backend');
 await page.evaluate(()=>{window.__oneupAccount=true});
 for(const outcome of ['success','failure','closed']){
  await show('mal-10');
  assert.equal(await page.locator('#oneup-guest-name').inputValue(),'AnimeFan','Account name must prefill the name field');
  assert.equal(await page.evaluate(()=>document.querySelector('#oneup-guest-name').readOnly),true,'Account name field must be read-only');
  await page.locator('#oneup-guest-text').fill('Comentario anterior');
  await page.locator('#oneup-send-comment').click();
  assert.deepEqual(await page.evaluate(()=>window.sent),['mal-10',1,'AnimeFan','Comentario anterior']);
  if(outcome==='closed')await page.evaluate(()=>window.OneUpEpisodeComments.close());
  else await show('mal-11');
  await page.locator('#oneup-guest-text').fill('Borrador nuevo');
  const before=await page.locator('#oneup-comment-state').textContent();
  await page.evaluate(outcome=>outcome==='failure'?window.rejectSend(new Error('Fallo anterior')):window.resolveSend(),outcome);
  assert.equal(await page.locator('#oneup-guest-text').inputValue(),'Borrador nuevo','Stale completion must preserve the current draft');
  assert.equal(await page.locator('#oneup-comment-state').textContent(),before,'Stale completion must preserve current status');
 }
 // A current request must still complete normally.
 await show('mal-12');
 assert.equal(await page.locator('#oneup-guest-name').inputValue(),'AnimeFan');
 await page.locator('#oneup-guest-text').fill('Comentario actual');
 await page.locator('#oneup-send-comment').click();
 await page.evaluate(()=>window.resolveSend());
 assert.equal(await page.locator('#oneup-guest-text').inputValue(),'');
 assert.equal(await page.locator('#oneup-comment-state').textContent(),'Comentario publicado.');
 assert.deepEqual(errors,[]);
 console.log('PASS episode comments: one report handler; stale report/send success/error/close isolation; current submission');
}finally{await browser.close()}
