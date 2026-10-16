/**
 * DexterAnimeSync: pure validation/normalization of licensed playback sources.
 * A publicly reachable URL or a rights string is NOT proof of ownership or a license.
 * Only catalog editors may declare an authorized source after verifying permission.
 * This module never downloads, extracts, proxies, or bypasses a provider's player.
 */
export const MAX_SOURCES_PER_EPISODE = 7;
export const VIDEO_MIMES = new Set([
  'video/mp4',
  'video/webm',
  'application/vnd.apple.mpegurl'
]);
const ANIME_ID = /^(mal|al)-[1-9][0-9]*$/;
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const text = (value, size=100) => String(value ?? '').trim().slice(0,size);

/** A public HTTPS media URL, not a private host or a URL with credentials. */
export function publicHttps(value) {
  if (typeof value !== 'string' || value.length > 2048) return null;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== 'https:' || url.username || url.password ||
        url.port && url.port !== '443' || url.hash ||
        !host.includes('.') || host.includes(':') ||
        /(^|\.)localhost$/.test(host) ||
        /(^|\.)(local|internal|test|invalid)$/.test(host) ||
        /^[0-9.]+$/.test(host)) return null;
    return url.href;
  } catch { return null; }
}

export function subtitleUrl(value) {
  const https = publicHttps(value);
  if (https) return https;
  if (typeof value !== 'string') return null;
  // Support the existing local WebVTT convention, without traversal.
  if (/^\.\/media\/[A-Za-z0-9_./-]+\.vtt$/.test(value) &&
      !value.split('/').includes('..')) return value;
  return null;
}

function normalizeOne(source, item, position) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    return {reason:'fuente_invalida'};
  }
  const rights = text(source.rights || item.rights,40).toLowerCase();
  if (!['authorized','owned'].includes(rights)) {
    return {reason:'falta_declaracion_de_derechos'};
  }
  const mode = source.mode || 'direct_media';
  const common = {
    name:text(source.name || 'Servidor '+position,65),
    language:text(source.language || item.language || 'No especificado',40),
    quality:text(source.quality || item.quality || 'No especificada',40),
    rights
  };
  if (mode === 'official_embed') {
    if (source.provider !== 'youtube' || !YOUTUBE_ID.test(source.videoId || '')) {
      return {reason:'incrustacion_no_admitida'};
    }
    return {value:{
      ...common,mode:'official_embed',provider:'youtube',
      videoId:source.videoId,
      embedUrl:'https://www.youtube-nocookie.com/embed/'+source.videoId,
      mime:null,src:null,
      subtitleUrl:null
    }};
  }
  if (!['direct_media','self_hosted','hosted'].includes(mode)) {
    return {reason:'modo_no_admitido'};
  }
  const src = publicHttps(source.src || source.url);
  if (!src) return {reason:'url_no_publica_https'};
  const mime = text(source.mime ||
    (new URL(src).pathname.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' :
      new URL(src).pathname.endsWith('.webm') ? 'video/webm' : 'video/mp4'),80);
  if (!VIDEO_MIMES.has(mime)) return {reason:'formato_de_video_no_admitido'};
  return {value:{
    ...common,mode:'direct_media',provider:'licensed_library',
    mime,src,videoId:null,embedUrl:null,
    subtitleUrl:subtitleUrl(source.subtitles_es || item.subtitles_es)
  }};
}

/** Returns accepted sources and non-sensitive rejection reasons for reporting. */
export function normalizeEpisodeSources(item) {
  const rejected=[],sources=[];
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    return {sources,rejected:['episodio_invalido']};
  }
  const list=Array.isArray(item.sources) && item.sources.length
    ? item.sources : [{
      name:'Servidor principal',src:item.src,mime:item.mime,
      language:item.language,quality:item.quality,
      rights:item.rights,mode:item.mode
    }];
  for (const [index,source] of list.entries()) {
    if (sources.length >= MAX_SOURCES_PER_EPISODE) {
      rejected.push('limite_de_siete_fuentes');
      continue;
    }
    const result=normalizeOne(source,item,index+1);
    if (result.value) sources.push(result.value);
    else rejected.push(result.reason);
  }
  return {sources,rejected};
}
export function validAnimeId(value) {
  return typeof value === 'string' && ANIME_ID.test(value);
}
