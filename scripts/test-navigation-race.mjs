/* Exercise the real navigation functions with controllable catalogue latency. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../studio.js',import.meta.url),'utf8');
function extract(name){
 const start=source.indexOf('function '+name+'(');
 assert.ok(start>=0,'Missing production function '+name);
 return source.slice(start,source.indexOf('\n}',start)+2);
}
function fixture(){
 const nodes=new Map();
 const $=selector=>{
  if(!nodes.has(selector))nodes.set(selector,{hidden:false,className:'',innerHTML:'',textContent:''});
  return nodes.get(selector);
 };
 const requests=[];
 const state={view:'inicio',seq:0,loading:false,saved:{},home:{season:[]},entries:new Map(),filters:{},results:[]};
 const context=vm.createContext({state,$,$$:()=>[],window:{scrollTo(){}},history:{replaceState(){}},
  heading:(title)=>{$('#browse-title').innerHTML=title},register(){},
  paint:(selector,items)=>{$(selector).innerHTML=items.map(x=>x.title).join(',')},
  fetchCatalog:()=>new Promise(resolve=>requests.push(resolve)),genres:[],esc:x=>x,filters(){},scheduleHTML:()=> 'SCHEDULE'});
 vm.runInContext(['go','showSaved','showSchedule'].map(extract).join('\n')+'\nasync '+extract('browse'),context);
 return {state,$,requests,context,go:route=>vm.runInContext('go('+JSON.stringify(route)+')',context)};
}
const response=title=>({items:[{title}],source:'snapshot',next:true});
for(const destination of ['milista','programacion','inicio']){
 const f=fixture();
 f.go('catalogo');
 assert.equal(f.state.loading,true);
 f.go(destination);
 const before=JSON.stringify([...['#browse-grid','#browse-status','#browse-next'].map(key=>f.$(key))]);
 assert.equal(f.state.loading,false,'Leaving a catalogue request must release its loading state');
 f.requests[0](response('STALE CATALOGUE'));
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(f.state.view,destination);
 assert.equal(JSON.stringify([...['#browse-grid','#browse-status','#browse-next'].map(key=>f.$(key))]),before,'A delayed catalogue response must not modify '+destination);
 console.log('PASS delayed catalogue cannot overwrite '+destination);
}
{
 const f=fixture();
 f.go('catalogo');
 f.go('peliculas');
 f.requests[1](response('CURRENT MOVIE'));
 await new Promise(resolve=>setImmediate(resolve));
 f.requests[0](response('STALE SERIES'));
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(f.$('#browse-grid').innerHTML,'CURRENT MOVIE');
 assert.equal(f.state.loading,false);
 assert.equal(f.state.next,true);
 console.log('PASS current catalogue response wins out-of-order navigation');
}
