/* 1UP Anime original sonic signature.
 * Composed with the Web Audio API; no copied streaming-service samples.
 * Plays only following a direct user action (required for iOS Safari). */
(function(){
'use strict';
let context=null;
function makeSound(){
  const Audio=window.AudioContext||window.webkitAudioContext;
  if(!Audio)return false;
  try{
    if(!context)context=new Audio();
    const ctx=context;
    if(ctx.state==='suspended')ctx.resume().catch(()=>{});
    const now=ctx.currentTime+.016;
    const compressor=ctx.createDynamicsCompressor();
    compressor.threshold.value=-19;
    compressor.knee.value=20;
    compressor.ratio.value=3;
    compressor.attack.value=.005;
    compressor.release.value=.14;
    const main=ctx.createGain();
    main.gain.value=.40;
    main.connect(compressor);
    compressor.connect(ctx.destination);
    // Very quiet reflected shimmer, not a repeating echo.
    const delay=ctx.createDelay(.45);delay.delayTime.value=.19;
    const feedback=ctx.createGain();feedback.gain.value=.12;
    const wet=ctx.createGain();wet.gain.value=.22;
    main.connect(delay);delay.connect(wet);wet.connect(compressor);
    delay.connect(feedback);feedback.connect(delay);
    function tone(f,at,len,{volume=.2,kind='sine',rise=.009,cut=.12,pan=0,filter=0,slide=0}={}){
      const osc=ctx.createOscillator();
      osc.type=kind;
      osc.frequency.setValueAtTime(f,at);
      if(slide)osc.frequency.exponentialRampToValueAtTime(Math.max(30,slide),at+len);
      let output=osc;
      if(filter){
        const low=ctx.createBiquadFilter();
        low.type='lowpass';low.frequency.value=filter;low.Q.value=.8;
        osc.connect(low);output=low;
      }
      const shape=ctx.createGain();
      shape.gain.setValueAtTime(0,at);
      shape.gain.linearRampToValueAtTime(Math.max(.0001,volume),at+rise);
      shape.gain.exponentialRampToValueAtTime(Math.max(.0001,volume*.45),at+Math.max(rise+.025,len-cut));
      shape.gain.exponentialRampToValueAtTime(.0001,at+len);
      output.connect(shape);
      if(ctx.createStereoPanner){
        const p=ctx.createStereoPanner();p.pan.value=pan;shape.connect(p);p.connect(main);
      }else shape.connect(main);
      osc.start(at);osc.stop(at+len+.01);
    }
    function air(at,length,volume,hi,lo,pan=0){
      const size=Math.ceil(ctx.sampleRate*length);
      const b=ctx.createBuffer(1,size,ctx.sampleRate);
      const d=b.getChannelData(0);
      // Soft filtered transient: breath/whip, not a harsh static burst.
      for(let i=0;i<size;i++)d[i]=(Math.random()*2-1);
      const source=ctx.createBufferSource();source.buffer=b;
      const band=ctx.createBiquadFilter();band.type='bandpass';band.frequency.value=hi;band.Q.value=.55;
      const lower=ctx.createBiquadFilter();lower.type='lowpass';lower.frequency.value=lo;
      const gain=ctx.createGain();gain.gain.setValueAtTime(.0001,at);
      gain.gain.linearRampToValueAtTime(volume,at+length*.37);
      gain.gain.exponentialRampToValueAtTime(.0001,at+length);
      source.connect(band);band.connect(lower);lower.connect(gain);
      if(ctx.createStereoPanner){const p=ctx.createStereoPanner();p.pan.value=pan;gain.connect(p);p.connect(main)}
      else gain.connect(main);
      source.start(at);source.stop(at+length+.01);
    }
    // Unique 1UP mark: rising glass steps, orange energy sweep, warm landing chord.
    air(now,.32,.10,1600,4200,-.4);
    tone(293.665,now+.08,.33,{kind:'sine',volume:.13,slide:369.994,cut:.17,pan:-.35});
    tone(369.994,now+.24,.36,{kind:'triangle',volume:.19,pan:-.24,cut:.24});
    tone(554.365,now+.52,.40,{kind:'sine',volume:.20,pan:.32,cut:.24});
    tone(739.989,now+.65,.34,{kind:'sine',volume:.10,pan:.36,cut:.21});
    air(now+.62,.28,.13,2500,5500,.40);
    tone(184.997,now+.80,.65,{kind:'sine',volume:.29,pan:0,cut:.28});
    tone(369.994,now+.80,.70,{kind:'triangle',volume:.15,pan:-.10,cut:.28});
    tone(554.365,now+.80,.79,{kind:'sine',volume:.22,pan:.16,cut:.32});
    tone(739.989,now+.81,.58,{kind:'sine',volume:.075,pan:-.18,cut:.3});
    tone(1108.731,now+.86,.74,{kind:'sine',volume:.070,pan:.39,cut:.40});
    // Airy pinprick sparkle after the logo settles.
    tone(1479.978,now+1.12,.54,{kind:'sine',volume:.035,pan:-.30,cut:.3});
    return true;
  }catch(e){return false}
}
window.OneUpSonic={play:makeSound};
})();