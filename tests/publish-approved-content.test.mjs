import test from 'node:test';
import assert from 'node:assert/strict';
import {compileIntake} from '../scripts/publish-approved-content.mjs';

const media=()=>({version:1,entries:{}});
const manga=()=>({version:1,series:[]});
const video={animeId:'mal-123',season:1,number:2,title:'Episodio autorizado',
  seriesTitle:'Serie de muestra',src:'https://media.example.com/ep02.mp4',
  mime:'video/mp4',rights:'owned',rightsEvidence:'Contrato de distribución interno 2026'};
const chapter={slug:'serie-original',title:'Serie original',chapter:1,chapterTitle:'Comienzo',
  pdfUrl:'https://media.example.com/c01.pdf',rights:'owned',
  rightsEvidence:'Obra editorial propia / acta de titularidad'};

test('agrupa episodio en su temporada y manga en capítulos',()=>{
  const result=compileIntake({episodes:[video],manga:[chapter]},media(),manga());
  assert.equal(result.media.entries['mal-123'].episodes[0].season,1);
  assert.equal(result.media.entries['mal-123'].episodes[0].number,2);
  assert.equal(result.media.entries['mal-123'].episodes[0].sources[0].rights,'owned');
  assert.equal(result.manga.series[0].chapters[0].number,1);
  assert.deepEqual(result.count,{episodes:1,chapters:1});
});
test('es idempotente y no duplica fuentes ni capítulos',()=>{
  const input={episodes:[video],manga:[chapter]};
  const first=compileIntake(input,media(),manga());
  const again=compileIntake(input,first.media,first.manga);
  assert.deepEqual(again.media,first.media);
  assert.deepEqual(again.manga,first.manga);
});
test('rechaza URLs, registros no autorizados e IDs maliciosos',()=>{
  for(const item of [
    {...video,rightsEvidence:'sí'}, {...video,src:'http://localhost/secret.mp4'},
    {...video,animeId:'../../etc'}, {...video,rights:'unknown'},
    {...video,src:'https://127.0.0.1/file.mp4'}
  ]) assert.throws(()=>compileIntake({episodes:[item],manga:[]},media(),manga()));
  assert.throws(()=>compileIntake({episodes:[],manga:[{...chapter,pdfUrl:'https://x.example/c01.exe'}]},media(),manga()));
});
test('mantiene intactos los manifiestos si algo falla',()=>{
  const a=media(),b=manga();
  assert.throws(()=>compileIntake({episodes:[video,{...video,number:0}],manga:[]},a,b));
  assert.deepEqual(a,media());
  assert.deepEqual(b,manga());
});
