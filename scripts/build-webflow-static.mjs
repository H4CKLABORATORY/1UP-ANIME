/* Prepare a safe, no-framework Webflow Cloud static app.
   No auth, API token, publishing, or site modifications.
   Output is local build folder; commit only the source. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.join(root,'.webflow-build');
const rootExt=new Set(['.html','.css','.js','.webmanifest']);
const dirs=['assets','data','themes'];
const allowInDir=new Set(['.html','.css','.js','.json','.svg','.png','.jpg','.jpeg','.webp','.gif','.ico','.webmanifest','.vtt','.woff','.woff2','.ttf','.otf','.mp3','.ogg','.wav']);
const allowedRootNames=new Set(['robots.txt']);
const SKIP=new Set(['node_modules','.git','.DS_Store']);
let files=0, bytes=0;
async function copyFile(from,to){
 const st=await fs.stat(from);
 if(!st.isFile())return;
 if(st.size>20*1024*1024)throw Error('Asset over 20MB: '+path.relative(root,from));
 await fs.mkdir(path.dirname(to),{recursive:true});
 await fs.copyFile(from,to);
 files++;bytes+=st.size;
}
async function copyDir(src,dst){
 for(const entry of await fs.readdir(src,{withFileTypes:true})){
  if(SKIP.has(entry.name)||entry.name.startsWith('.'))continue;
  const from=path.join(src,entry.name),to=path.join(dst,entry.name);
  if(entry.isDirectory())await copyDir(from,to);
  else if(entry.isFile()&&allowInDir.has(path.extname(entry.name).toLowerCase()))await copyFile(from,to);
 }
}
if(out===root||!out.startsWith(root+path.sep))throw Error('Unsafe output path');
await fs.rm(out,{recursive:true,force:true});
await fs.mkdir(out,{recursive:true});
for(const entry of await fs.readdir(root,{withFileTypes:true})){
 if(!entry.isFile())continue;
 const name=entry.name;
 if(rootExt.has(path.extname(name).toLowerCase())||allowedRootNames.has(name)){
  await copyFile(path.join(root,name),path.join(out,name));
 }
}
for(const name of dirs){
 const from=path.join(root,name);
 try{if((await fs.stat(from)).isDirectory())await copyDir(from,path.join(out,name))}
 catch(e){if(e.code!=='ENOENT')throw e}
}
await fs.writeFile(path.join(out,'webflow.json'),JSON.stringify({cloud:{framework:'static'}},null,2)+'\n');
const html=await fs.readFile(path.join(out,'index.html'),'utf8');
const missing=[];
for(const tag of html.matchAll(/<(?:script|link|img)\b[^>]*(?:src|href)=["'](\.\/[^"']+)["']/g)){
 const target=tag[1].split(/[?#]/)[0];
 if(!target||target.endsWith('/'))continue;
 try{await fs.access(path.join(out,target))}
 catch{missing.push(target)}
}
if(missing.length)throw Error('Missing referenced static assets: '+[...new Set(missing)].join(', '));
const report={tool:'1UP Webflow Cloud static export',output:'.webflow-build',
  files,bytes,framework:'static',mcpConnected:false,published:false};
console.log(JSON.stringify(report,null,2));
