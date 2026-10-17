/**
 * 1UP ANIME — handoff generated from repository facts.
 * Usage: node scripts/update-new-chat-handoff.mjs [--check]
 * Cannot read conversations, detect token limits or create ChatGPT chats.
 */
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const REPO='H4CKLABORATORY/1UP-ANIME';
const OUT='docs/NEW_CHAT_HANDOFF.md';
const read=p=>existsSync(p)?readFileSync(p,'utf8'):'';
const limit=(str,max=120)=>String(str||'').replace(/[\r\n\t<>|]/g,' ').slice(0,max).trim();
const git=args=>{try{return execFileSync('git',args,{encoding:'utf8',timeout:7000}).trim()}catch{return''}};
const parse=p=>{try{return JSON.parse(read(p))}catch{return{}}};
const config=parse('data/anime1v-config.json');
const media=parse('data/licensed-media.json');
const characters=parse('themes/cinematic-v3/characters.json');
const totalMedia=Object.keys(media.entries||{}).length;
const totalCharacters=Array.isArray(characters.layers)?characters.layers.length:0;
const activeGateway=config.enabled===true&&String(config.endpoint||'').startsWith('https://');
const runtime=existsSync('render/anime1v-source/server.js');
const logs=git(['log','-n','60','--format=%H%x09%s']).split('\n')
 .filter(Boolean).map(line=>{const p=line.split('\t');return{sha:p[0],subject:p.slice(1).join(' ')};})
 .filter(c=>!/^docs: (?:automatic|refresh) new-chat handoff/i.test(c.subject)).slice(0,5);
let prs=[];
if(process.env.GITHUB_TOKEN&&process.env.GITHUB_REPOSITORY===REPO){
 try{
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),7000);
  try{
   const response=await fetch('https://api.github.com/repos/'+REPO+'/pulls?state=open&per_page=30',{
    headers:{Authorization:'Bearer '+process.env.GITHUB_TOKEN,Accept:'application/vnd.github+json'},
    signal:controller.signal
   });
   if(response.ok)prs=(await response.json()).map(p=>({n:p.number,t:limit(p.title,92)}));
  }finally{clearTimeout(timer)}
 }catch{ /* GitHub may be unavailable; static links remain valid. */ }
}
const rows=[
 '# 1UP ANIME — handoff para un nuevo chat',
 '',
 '> Estado derivado de archivos y commits del repositorio. No copia conversaciones privadas, no abre chats y no detecta límites de contexto.',
 '',
 '## Enlaces de trabajo',
 '- Sitio: https://h4cklaboratory.github.io/1UP-ANIME/',
 '- GitHub: https://github.com/'+REPO,
 '- Instrucciones: [AGENTS.md](../AGENTS.md)',
 '- Historial de decisiones y desarrollo: [PROJECT_CONTINUITY.md](PROJECT_CONTINUITY.md)',
 '- Próximas tareas: [OMEGA_NEXT_ACTIONS.md](OMEGA_NEXT_ACTIONS.md)',
 '- Estudio de motion: [CINEMATIC_V3_STUDIO.md](CINEMATIC_V3_STUDIO.md)',
 '- Render y Anime1v: [ANIME1V_METADATA_RUNTIME.md](ANIME1V_METADATA_RUNTIME.md)',
 '- Pull requests: https://github.com/'+REPO+'/pulls',
 '- Pruebas: https://github.com/'+REPO+'/actions',
 '',
 '## Identidad y alcance permanente',
 '- 1UP ANIME, interfaz en español, presupuesto objetivo cero. Preservar Kokomi de Codex y compatibilidad iPhone.',
 '- Logo de letras estático en header: assets/oneup-header-letters.png; intro antes de la web con audio original AAC de 3,2 s.',
 '- Formatos 9:16 móvil y 16:9 escritorio; el audio de inicio puede ser bloqueado por Safari sin gesto del visitante.',
 '- La versión Cinematic V3 es una vista de estudio multicapa; no afirmar que ya sea un nuevo MP4 final publicado.',
 '- Para personajes, usar solo imágenes originales con permiso o material aportado y autorizado; no generar caras fingiendo ser fotogramas reales.',
 '- No confundir el catálogo de Anime1v con episodios reproducibles ni su licencia MIT con derechos de distribución de anime.',
 '',
 '## Estado detectado ahora',
 '- Último commit de aplicación encontrado: '+(logs[0]?.sha||'revisar historial de GitHub'),
 '- Descubrimiento Anime1v configurado en frontend: '+(activeGateway?'sí, verificar la respuesta real en Render':'no'),
 '- Código runtime de metadatos Anime1v en repositorio: '+(runtime?'sí':'no'),
 '- Entradas de obras multimedia en data/licensed-media.json: '+totalMedia,
 '- Capas de personajes autorizados declaradas en Cinematic V3: '+totalCharacters,
 '- Safari físico: no dar por verificado salvo prueba real con evidencia.',
 '',
 '## Últimos commits relevantes',
 ...logs.map(c=>'- '+c.sha.slice(0,9)+' — '+limit(c.subject,120)),
 '',
 '## PR abiertos (consultar cambios antes de desarrollar)',
 ...(prs.length?prs.slice(0,12).map(p=>'- [#'+p.n+'](https://github.com/'+REPO+'/pull/'+p.n+') '+p.t):['- Consultar https://github.com/'+REPO+'/pulls para obtener lista actual (no significa que no haya PRs).']),
 '',
 '## Próxima tarea por prioridad',
 '1. Leer AGENTS.md, esta ficha, PROJECT_CONTINUITY.md y OMEGA_NEXT_ACTIONS.md; confirmar HEAD y CI.',
 '2. Perfeccionar Cinematic V3 por capas y conservar audio original; no sustituir la intro publicada sin QA y autorización de personajes.',
 '3. Comprobar el estado real de Anime1v en Render y los flujos existentes; no atribuir reproducción de episodios a un catálogo.',
 '4. Realizar una tarea concreta y verificable, registrar PR, tests y siguiente acción. No duplicar trabajo ya fusionado.',
 '',
 '## Prompt para pegar en otro chat',
 'Continúa el proyecto 1UP ANIME desde https://github.com/'+REPO+'. Antes de editar lee AGENTS.md, docs/NEW_CHAT_HANDOFF.md, docs/PROJECT_CONTINUITY.md y docs/OMEGA_NEXT_ACTIONS.md directamente en GitHub. No empieces de cero. Comprueba el último commit, propuestas y pruebas; conserva Kokomi, el logo de letras y audio original. Trabaja una tarea real pendiente, verifica el cambio y actualiza la bitácora. No afirmes que Cine V3 sea un MP4 final ni que Anime1v habilite streaming sin fuentes autorizadas. Si falta acceso, especifica el bloqueo y deja el siguiente paso.',
 '',
 '## Activación y límites',
 '- GitHub Actions actualiza esta ficha al cambiar main, cada seis horas o manualmente.',
 '- La tarea ChatGPT Continuar 1UP Anime ya está programada cada hora; no se crea otra tarea igual.',
 '- Ninguna de esas funciones abre una conversación nueva ni detecta espacio agotado: el usuario puede abrir Nuevo chat y pegar el prompt anterior.',
 ''
];
const output=rows.join('\n');
if(!output.includes('## Prompt para pegar en otro chat'))throw Error('Incomplete handoff');
if(process.argv.includes('--check'))console.log('PASS: handoff generated, '+output.length+' characters, '+logs.length+' commits');
else if(read(OUT)===output)console.log('UNCHANGED '+OUT);
else{writeFileSync(OUT,output,'utf8');console.log('UPDATED '+OUT);}
