import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const src=fs.readFileSync(new URL('../subtitle-studio.js',import.meta.url),'utf8');
const store=new Map(),listeners=new Map();
const document={addEventListener(name,fn){listeners.set(name,fn)}};
const window={};
vm.runInNewContext(src,{window,document,localStorage:{getItem:key=>store.get(key)||null,setItem:(key,value)=>store.set(key,value)}},{timeout:2000});
test('Default Bangers and safe subtitle settings',()=>{
 const studio=window.OneUpSubtitleStudio;
 assert.equal(studio.read().font,'bangers');
 assert.equal(studio.read().lang,'auto');
 assert.ok(studio.fonts.includes('arial'));
 assert.ok(studio.themes.includes('arcade'));
});
test('Persisted preferences cannot inject styles or unsupported languages',()=>{
 store.set('oneup.subtitle.studio.v1',JSON.stringify({lang:'javascript:alert(1)',font:'bad',theme:'evil',size:99999}));
 const state=window.OneUpSubtitleStudio.read();
 assert.equal(state.lang,'auto');assert.equal(state.font,'bangers');
 assert.equal(state.theme,'anime');assert.equal(state.size,100);
});
test('External tracks and subtitles are never invented',()=>{
 const p=fs.readFileSync(new URL('../episode-player.js',import.meta.url),'utf8');
 assert.match(p,/subtitleUrl/);
 assert.match(p,/source\.tracks/);
 assert.match(p,/oneup-video-ready/);
 const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.ok(html.includes('subtitle-studio.js'));
});
