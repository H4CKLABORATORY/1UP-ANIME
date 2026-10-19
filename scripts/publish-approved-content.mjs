/**
 * 1UP ANIME: publicar referencias de medios CON DERECHOS, no descargarlos.
 * La cola se edita en GitHub (control editorial) y Actions publica los manifiestos.
 * Una URL accesible y una declaración de derechos no prueban titularidad.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { publicHttps, validAnimeId } from './media-source-contract.mjs';

const VIDEO_TYPES = new Set(['video/mp4', 'video/webm', 'application/vnd.apple.mpegurl']);
const ID = /^[a-z0-9](?:[a-z0-9-]{1,62}[a-z0-9])?$/;
const required = (s,max=200) => typeof s === 'string' && s.trim().length >= 3 && s.length <= max;
const positive = value => Number.isInteger(value) && value >= 1 && value <= 9999;
const safeUrl = value => {
  const url = publicHttps(value);
  if (!url) return null;
  const parsed = new URL(url);
  if (parsed.pathname.includes('%2e') || parsed.pathname.includes('%2f') || parsed.pathname.includes('%5c')) return null;
  return url;
};
const read = async (base,file) => JSON.parse(await fs.readFile(path.join(base,file),'utf8'));
const write = async (base,file,data) => fs.writeFile(path.join(base,file),JSON.stringify(data,null,2)+'\n','utf8');
const quality = value => required(value,30) ? value.trim().slice(0,30) : 'HD';
const proof = e => required(e.rightsEvidence,500) && ['owned','authorized'].includes(e.rights) && !/^(yes|si|sí|ok|true|test|demo)$/i.test(e.rightsEvidence.trim());

/**
 * Publica únicamente referencias a archivos que el editor ya puede distribuir.
 * NO explora catálogos, NO ignora DRM, NO copia material de terceros.
 */
export function compileIntake(intake,media,manga) {
  if (!intake || !Array.isArray(intake.episodes) || !Array.isArray(intake.manga)) throw Error('Cola inválida.');
  if (!media || !media.entries || !manga || !Array.isArray(manga.series)) throw Error('Manifiestos inválidos.');
  const nextMedia = structuredClone(media);
  const nextManga = structuredClone(manga);
  let episodes=0,chapters=0;
  for (const e of intake.episodes) {
    if (!e || !validAnimeId(e.animeId) || !positive(e.season) || !positive(e.number) ||
        !proof(e) || !required(e.title,120) || !safeUrl(e.src) ||
        !VIDEO_TYPES.has(e.mime) || (e.language !== undefined && !required(e.language,40))) {
      throw Error('Episodio inválido: ID, temporada, fuente, MIME o evidencia editorial incompleta.');
    }
    const src=safeUrl(e.src);
    const series=nextMedia.entries[e.animeId] || {episodes:[]};
    if (!Array.isArray(series.episodes)) throw Error('Lista de episodios corrupta.');
    if (required(e.seriesTitle,160)) series.title=e.seriesTitle.trim();
    const source={name:'1UP · Fuente autorizada',src,mime:e.mime,rights:e.rights,
      language:e.language || 'No especificado',quality:quality(e.quality)};
    let record=series.episodes.find(item=>item.season===e.season && (item.number??item.episode)===e.number);
    if (!record) {
      record={season:e.season,number:e.number,title:e.title.trim(),sources:[]};
      series.episodes.push(record);
    }
    record.title=e.title.trim();
    if (!Array.isArray(record.sources)) record.sources=[];
    // Evitar duplicados: respetar las demás fuentes ya autorizadas.
    if (!record.sources.some(s=>s.src===src)) {
      if (record.sources.length>=7) throw Error('Máximo siete servidores por episodio.');
      record.sources.push(source);
    }
    series.episodes.sort((a,b)=>(a.season??1)-(b.season??1)||(a.number??a.episode)-(b.number??b.episode));
    nextMedia.entries[e.animeId]=series;
    episodes++;
  }
  for (const e of intake.manga) {
    if (!e || !ID.test(e.slug||'') || !proof(e) || !required(e.title,160) ||
      !positive(e.chapter) || !required(e.chapterTitle,120) || !safeUrl(e.pdfUrl) ||
      !/\.pdf$/i.test(new URL(e.pdfUrl).pathname)) {
      throw Error('Manga inválido: slug, capítulo, PDF HTTPS o evidencia editorial incompleta.');
    }
    let series=nextManga.series.find(s=>s.slug===e.slug);
    if (!series) {
      series={slug:e.slug,title:e.title.trim(),description:'',chapters:[]};
      nextManga.series.push(series);
    }
    series.title=e.title.trim();
    if (required(e.description,900)) series.description=e.description.trim();
    if (safeUrl(e.coverUrl)) series.coverUrl=safeUrl(e.coverUrl);
    const chapter={number:e.chapter,title:e.chapterTitle.trim(),pdfUrl:safeUrl(e.pdfUrl)};
    const index=series.chapters.findIndex(c=>c.number===e.chapter);
    if (index>=0) series.chapters[index]=chapter;
    else series.chapters.push(chapter);
    series.chapters.sort((a,b)=>a.number-b.number);
    chapters++;
  }
  nextManga.series.sort((a,b)=>a.title.localeCompare(b.title,'es'));
  return {media:nextMedia,manga:nextManga,count:{episodes,chapters}};
}

export async function publishIntake(base=process.cwd(),{dryRun=false}={}) {
  const [intake,media,manga]=await Promise.all([
    read(base,'data/media-intake.json'),read(base,'data/licensed-media.json'),
    read(base,'data/manga-library.json')]);
  const published=compileIntake(intake,media,manga);
  if (!dryRun) {
    await write(base,'data/licensed-media.json',published.media);
    await write(base,'data/manga-library.json',published.manga);
  }
  return published.count;
}
if (process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  publishIntake(process.cwd(),{dryRun:process.argv.includes('--dry-run')})
    .then(count=>console.log('1UP media intake:',JSON.stringify(count)))
    .catch(error=>{console.error(error.message);process.exitCode=1;});
}
