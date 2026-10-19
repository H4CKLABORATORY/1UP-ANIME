/* 1UP Anime — contador de conexiones activas sin cookies ni identificadores guardados.
 * Realtime Presence: cada pestaña visible publica una presencia efímera con clave aleatoria.
 * Sin un proyecto Realtime real, nunca se muestra una cifra simulada.
 */
(function(){
  'use strict';
  const widgets=Array.from(document.querySelectorAll('[data-oneup-presence]'));
  if(!widgets.length)return;
  const unavailable=(reason)=>{
    widgets.forEach(widget=>{
      widget.dataset.state='unavailable';
      widget.title=reason;
      widget.setAttribute('aria-label',reason);
      const value=widget.querySelector('[data-oneup-presence-count]');
      if(value)value.textContent='—';
    });
  };
  const setCount=(amount)=>{
    if(!Number.isSafeInteger(amount)||amount<0)return;
    const text=new Intl.NumberFormat('es').format(amount);
    widgets.forEach(widget=>{
      widget.dataset.state='connected';
      widget.title='Conexiones activas ahora en 1UP Anime y La Plaza. Cada pestaña puede contar por separado.';
      widget.setAttribute('aria-label',text+' conexiones en línea');
      const value=widget.querySelector('[data-oneup-presence-count]');
      if(value)value.textContent=text;
    });
  };
  unavailable('Conexiones en línea: esperando servicio de presencia');
  const config=window.ONEUP_PRESENCE_CONFIG;
  let endpoint;
  try{
    endpoint=new URL(config?.url||'');
    if(endpoint.protocol!=='https:'||endpoint.username||endpoint.password||
      typeof config?.publishableKey!=='string'||
      !config.publishableKey.startsWith('sb_publishable_')){
      throw new Error('Configuración no disponible');
    }
  }catch{
    unavailable('Contador pendiente de conectar con Supabase Realtime');
    return;
  }
  const library='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.3/+esm';
  let channel=null;
  let client=null;
  let subscribed=false;
  let tracked=false;
  let closed=false;
  const onPresence=()=>{
    if(!channel||!subscribed)return;
    const presences=channel.presenceState();
    const count=Object.values(presences).filter(rows=>Array.isArray(rows)&&rows.length>0).length;
    setCount(count);
  };
  async function syncVisibility(){
    if(closed||!subscribed||!channel)return;
    if(document.visibilityState==='visible'&&!tracked){
      tracked=true;
      try{
        const status=await channel.track({online:true});
        if(status!=='ok')throw new Error('No se pudo publicar presencia');
        onPresence();
      }catch{
        tracked=false;
        unavailable('No se pudo actualizar el contador en este momento');
      }
    }else if(document.visibilityState!=='visible'&&tracked){
      tracked=false;
      try{await channel.untrack()}catch{ /* Se limpiará al cerrar el WebSocket. */ }
    }
  }
  document.addEventListener('visibilitychange',()=>{void syncVisibility()});
  window.addEventListener('pagehide',()=>{
    if(tracked&&channel){tracked=false;void channel.untrack().catch(()=>{})}
  });
  window.addEventListener('pageshow',()=>{void syncVisibility()});
  import(library).then(({createClient})=>{
    if(closed)return;
    client=createClient(endpoint.href,config.publishableKey,{
      auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
      realtime:{params:{eventsPerSecond:2}}
    });
    const session=crypto.randomUUID();
    channel=client.channel('oneup_anime_global_presence',{
      config:{presence:{key:session},private:false}
    });
    channel.on('presence',{event:'sync'},onPresence)
      .subscribe(status=>{
        if(status==='SUBSCRIBED'){
          subscribed=true;
          tracked=false;
          void syncVisibility();
          onPresence();
        }else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED'){
          subscribed=false;
          tracked=false;
          unavailable('Conexión al contador interrumpida');
        }
      });
  }).catch(()=>{
    unavailable('El contador de visitantes no está disponible');
  });
})();
