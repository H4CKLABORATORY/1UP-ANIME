import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';

const folder=path.resolve('assets');
const mp4=path.join(folder,'1up-anime-intro-firma-3seg.mp4');
const poster=path.join(folder,'1up-anime-logo-poster.jpg');
assert.ok(fs.existsSync(mp4),'Upload the original 1UP MP4 before enabling the new brand');
assert.ok(fs.existsSync(poster),'Upload the original video frame JPEG too');
const data=fs.readFileSync(mp4);
assert.ok(data.length>=100_000&&data.length<=10_000_000,'MP4 seems missing or corrupted');
for(const atom of ['ftyp','moov','mdat','avc1','mp4a']){
 assert.ok(data.includes(Buffer.from(atom)), 'Missing expected MP4/AAC atom: '+atom);
}
const jpg=fs.readFileSync(poster);
assert.ok(jpg.length>30_000&&jpg[0]===0xff&&jpg[1]===0xd8&&jpg.at(-2)===0xff&&jpg.at(-1)===0xd9,'Poster is not a valid JPEG');
const index=fs.readFileSync('index.html','utf8');
assert.ok(index.includes('brand-signature.js')&&index.includes('brand-signature.css'),'Brand module missing from homepage');
console.log('PASS: original brand MP4 (with AAC sound), poster and homepage installation present');
