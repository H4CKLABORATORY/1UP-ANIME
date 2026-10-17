/* Non-secret real-world smoke test of connected Render metadata services.
 * Uses only the gateway's public URL; it never handles the private API key.
 * A Jikan fallback is reported honestly instead of being labelled Anime1v.
 */
const root='https://oneup-anime-discovery.onrender.com';
const source='https://oneup-anime1v-metadata.onrender.com';
async function get(url){
 let last;
 for(let attempt=0;attempt<3;attempt++){
  try{
   const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),55000);
   try{
    const response=await fetch(url,{signal:ctrl.signal,headers:{Accept:'application/json'},redirect:'error'});
    const txt=await response.text();
    return {status:response.status,data:JSON.parse(txt)};
   }finally{clearTimeout(timer)}
  }catch(e){last=e;await new Promise(resolve=>setTimeout(resolve,5000))}
 }
 throw last;
}
const upstreamHealth=await get(source+'/health');
if(upstreamHealth.status!==200||upstreamHealth.data.streaming!==false)
 throw Error('The protected Anime1v runtime did not report metadata-only health');
const forbidden=await get(source+'/api/v1/anime/resolve?url=https://example.com');
if(forbidden.status!==404)throw Error('Anime1v exposed an unauthorized video resolver route');
const health=await get(root+'/health');
if(health.status!==200||health.data.streaming!==false)
 throw Error('The main discovery gateway is not healthy');
const result=await get(root+'/anime1vDiscovery?kind=search&provider=animeav1&q=Naruto');
if(result.status!==200||!Array.isArray(result.data.results))
 throw Error('Real public catalog search failed with HTTP '+result.status);
const output={
 upstreamBuild:upstreamHealth.data.version,
 mode:upstreamHealth.data.service,
 configured:health.data.upstream,
 selectedSource:result.data.source,
 numberOfResults:result.data.results.length,
 sampleTitles:result.data.results.slice(0,3).map(x=>x.title)
};
if(!['anime1v','jikan'].includes(output.selectedSource))
 throw Error('Unknown metadata source: '+output.selectedSource);
console.log(JSON.stringify(output,null,2));
if(output.selectedSource!=='anime1v')
 console.warn('WARNING: Anime1v returned no usable results or is unavailable; public Jikan fallback is active.');
