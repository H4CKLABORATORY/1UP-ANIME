/* 1UP Subtitle Studio — stylized timed text for self-hosted authorized videos.
   Works with WebVTT/textTracks when provided; NEVER fabricates translations.
   Native fullscreen may use device captions rather than CSS overlay. */
(()=>{'use strict';
const STORE='oneup.subtitle.studio.v1';
const FONTS={bangers:"'Bangers',Impact,sans-serif",arial:"Arial,Helvetica,sans-serif",outfit:"'Outfit',system-ui,sans-serif",arcade:"Impact,'Arial Black',sans-serif"};
const THEMES=['anime','neon','gold','arcade'];
const defaults={lang:'auto',font:'bangers',theme:'anime',size:100};
function validate(raw){
 const v=raw&&typeof raw==='object'?raw:{};
 return {lang:['auto','off','es','en'].includes(v.lang)?v.lang:'auto',
  font:Object.hasOwn(FONTS,v.font)?v.font:'bangers',
  theme:THEMES.includes(v.theme)?v.theme:'anime',
  size:Number.isInteger(v.size)&&v.size>=75&&v.size<=155?v.size:100};
}
function store(value){try{localStorage.setItem(STORE,JSON.stringify(value))}catch{}}
function read(){try{return validate(JSON.parse(localStorage.getItem(STORE)||'null'))}catch{return {...defaults}}}
function el(tag,cls,content){const node=document.createElement(tag);if(cls)node.className=cls;if(content!==undefined)node.textContent=content;return node}
let prefs=read(),dispose=()=>{},activeVideo=null;
function norm(lang){return String(lang||'').trim().toLowerCase().split('-')[0]}
function choice(tracks){
 const available=[...tracks].filter(t=>t.kind==='subtitles'||t.kind==='captions');
 if(prefs.lang==='off')return null;
 if(prefs.lang==='auto')return available.find(t=>norm(t.language)==='es')||available.find(t=>norm(t.language)==='en')||available[0]||null;
 return available.find(t=>norm(t.language)===prefs.lang)||null;
}
function connect(video){
 if(activeVideo===video)return;dispose();activeVideo=video;
 const stage=video.closest('#oneup-playback-display');
 if(!stage)return;
 const host=el('section','oneup-subtitle-studio');
 host.setAttribute('aria-label','Opciones de subtítulos de anime');
 const toolbar=el('div','oneup-subtitle-toolbar');
 const caption=el('span','oneup-subtitle-heading','SUBTÍTULOS · ESTILO ANIME');
 toolbar.append(caption);
 const controls=el('div','oneup-subtitle-controls');
 function select(labelName,options,key){
  const label=el('label','oneup-subtitle-label',labelName);
  const input=el('select','');
  input.setAttribute('aria-label',labelName);input.dataset.subtitle=key;
  for(const [value,name] of options){const option=el('option','',name);option.value=value;input.append(option)}
  input.value=String(prefs[key]);
  input.addEventListener('change',()=>{prefs=validate({...prefs,[key]:input.value});store(prefs);apply()});
  label.append(input);controls.append(label);return input;
 }
 const langs=select('Idioma',[['auto','Automático (disponible)'],['es','Español'],['en','English'],['off','Desactivados']],'lang');
 const fonts=select('Letra',[['bangers','Bangers · Anime'],['arial','Arial · Clásica'],['outfit','Outfit · Moderna'],['arcade','Arcade · Impact']],'font');
 select('Efecto',[['anime','Anime · Contorno'],['neon','Neón · Esmeralda'],['gold','Dorado · Cinemático'],['arcade','Arcade · Energía']],'theme');
 const size=el('label','oneup-subtitle-label','Tamaño');
 const sizeInput=el('input','');sizeInput.type='range';sizeInput.min='75';sizeInput.max='155';
 sizeInput.step='5';sizeInput.value=String(prefs.size);sizeInput.setAttribute('aria-label','Tamaño del subtítulo');
 sizeInput.addEventListener('input',()=>{prefs=validate({...prefs,size:Number(sizeInput.value)});store(prefs);apply()});
 size.append(sizeInput);controls.append(size);
 const notice=el('p','oneup-subtitle-notice','Los idiomas aparecerán si el episodio tiene subtítulos WebVTT o HLS.');
 host.append(toolbar,controls,notice);
 const overlay=el('div','oneup-subtitle-overlay');
 overlay.setAttribute('aria-live','off');overlay.setAttribute('aria-hidden','true');
 stage.append(overlay);
 // Controls outside player video stage, to avoid affecting its native controls.
 stage.after(host);
 const list=video.textTracks;
 const refresh=()=>{
  const available=[...list].filter(t=>t.kind==='subtitles'||t.kind==='captions');
  for(const opt of langs.options){
   if(opt.value==='es'||opt.value==='en'){
    const present=available.some(t=>norm(t.language)===opt.value);
    opt.disabled=!present;
   }
  }
  if(prefs.lang!=='auto'&&prefs.lang!=='off'&&!available.some(t=>norm(t.language)===prefs.lang)) {
   // Keep the user's selected preference for the next anime, but never invent tracks.
   notice.textContent='No hay subtítulos '+(prefs.lang==='es'?'en español':'en inglés')+' para esta fuente.';
  }else if(!available.length)notice.textContent='Esta fuente no incluye subtítulos configurados. Puedes ver el video sin subtítulos.';
  else notice.textContent='Idiomas de esta fuente: '+available.map(t=>t.label||t.language||'Sin nombre').join(' · ')+'.';
  const selected=choice(list);
  for(const t of list){t.mode=(t===selected)?'hidden':'disabled'}
  const cues=selected?.activeCues;
  // textContent prevents cues with HTML from injecting markup.
  overlay.textContent=cues?[...cues].map(c=>String(c.text||'')).join('\n'):'';
  overlay.hidden=!overlay.textContent;
 };
 function apply(){
  host.dataset.subtitleTheme=prefs.theme;
  overlay.dataset.subtitleTheme=prefs.theme;
  overlay.style.fontFamily=FONTS[prefs.font];
  overlay.style.setProperty('--oneup-caption-scale',String(prefs.size/100));
  fonts.value=prefs.font;sizeInput.value=String(prefs.size);
  refresh();
 }
 const bound=new Set();
 const bindTracks=()=>{
  for(const track of list){
   if(bound.has(track))continue;
   bound.add(track);track.addEventListener('cuechange',refresh);
  }
  refresh();
 };
 list.addEventListener?.('addtrack',bindTracks);
 list.addEventListener?.('removetrack',bindTracks);
 video.addEventListener('loadedmetadata',bindTracks);
 const children=video.querySelectorAll('track');
 children.forEach(node=>node.addEventListener('load',bindTracks));
 apply();bindTracks();
 dispose=()=>{
  list.removeEventListener?.('addtrack',bindTracks);
  list.removeEventListener?.('removetrack',bindTracks);
  video.removeEventListener('loadedmetadata',bindTracks);
  for(const track of bound)track.removeEventListener('cuechange',refresh);
  children.forEach(node=>node.removeEventListener('load',bindTracks));
  host.remove();overlay.remove();activeVideo=null;
 };
}
document.addEventListener('oneup-video-ready',event=>{
 if(event.detail?.video instanceof HTMLVideoElement)connect(event.detail.video);
});
document.addEventListener('oneup-video-removed',()=>{dispose()});
document.addEventListener('oneup-anime-closed',()=>{dispose()});
window.OneUpSubtitleStudio={validate,read,fonts:Object.keys(FONTS),themes:THEMES.slice()};
})();
