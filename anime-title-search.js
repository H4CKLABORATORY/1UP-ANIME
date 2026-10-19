/* 1UP Anime — safe multilingual title matching, inspired by anime tracker UX.
 * Original implementation; no third-party scrapers or video downloaders.
 * Metadata comes from existing authorized/public AniList and Jikan adapters.
 */
(function (root) {
 'use strict';
 const MAX_ALIASES=16,MAX_LENGTH=150;
 function clean(value) {
  return typeof value==='string'?value.trim().slice(0,MAX_LENGTH):'';
 }
 function normalize(value) {
  return clean(value).normalize('NFKC').normalize('NFD')
   .replace(/\p{M}/gu,'').toLocaleLowerCase('es')
   .replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
 }
 function collectAliases(title,synonyms=[]) {
  const titles=title&&typeof title==='object'
   ?[title.english,title.romaji,title.native]:[title];
  const extras=Array.isArray(synonyms)?synonyms:[];
  const unique=new Map();
  for(const candidate of [...titles,...extras]){
   const value=clean(candidate),key=normalize(value);
   if(value&&key&&!unique.has(key))unique.set(key,value);
   if(unique.size>=MAX_ALIASES)break;
  }
  return [...unique.values()];
 }
 function names(item) {
  if(!item||typeof item!=='object')return [];
  return collectAliases({
   english:item.title,
   romaji:item.title_romaji,
   native:item.title_native
  },item.aliases);
 }
 function matches(item,query){
  const term=normalize(query);
  if(!term)return true;
  const tokens=term.split(' ').filter(Boolean);
  return names(item).some(name=>{
   const nameKey=normalize(name);
   return nameKey.includes(term)||tokens.every(token=>nameKey.includes(token));
  });
 }
 root.OneUpAnimeSearch=Object.freeze({normalize,collectAliases,names,matches});
})(typeof window!=='undefined'?window:globalThis);
