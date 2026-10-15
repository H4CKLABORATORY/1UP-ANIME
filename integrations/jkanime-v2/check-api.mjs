/* Verify installed JKAnime V2 package without accessing unauthorized streams.
   This is an inspection tool only and is not shipped to the public PWA. */
import assert from 'node:assert/strict';
const name='jkanime-v2';
const imported=await import(name);
const api=imported.default||imported;
const metadataMethods=['latestAnimeAdded','schedule','search','getExtraInfo'];
const result={package:name,mode:'metadata_only',available:metadataMethods.filter(key=>typeof api?.[key]==='function'),
 missing:metadataMethods.filter(key=>typeof api?.[key]!=='function'),
 streamingMethodDetected:typeof api?.getAnimeServers==='function',
 streamingMethodEnabled:false};
console.log(JSON.stringify(result,null,2));
assert.equal(result.missing.length,0,'Faltan métodos de metadatos en JKAnime V2');
console.log('JKAnime V2 instalado; APIs de metadatos detectadas. No se han descargado episodios.');
