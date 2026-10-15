/* Alert only on repeated ONEUP health failures, without flooding the issue tracker.
   Runs from GitHub Actions with GH_TOKEN and GH_REPO. Does not modify the site. */
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const d=JSON.parse(fs.readFileSync('data/guard/status.json','utf8'));
const alerts=d.persistentAlerts||[];
if(!alerts.length){
 console.log('ONEUP guard: no repeated failures. Nothing to report.');
 process.exit(0);
}
const gh=(...args)=>execFileSync('gh',args,{encoding:'utf8',timeout:20000,stdio:['ignore','pipe','pipe']});
try{
 const issues=JSON.parse(gh('issue','list','--state','open','--limit','100','--json','number,title'));
 const title='[ONEUP] Incidencia persistente del sistema';
 const existing=issues.find(x=>x.title===title);
 if(existing){
  console.log('Existing ongoing incident #'+existing.number+'; not creating duplicates.');
  process.exit(0);
 }
 const summary=d.checks.filter(x=>alerts.includes(x.id))
  .map(x=>'- '+x.id+' ('+x.level+'): '+x.message).join('\n');
 const body=[
  'ONEUP SELF HEALING ENGINE detectó los siguientes problemas en comprobaciones consecutivas:',
  '',summary,'','Comprobar Actions, el historial y el respaldo del último flujo.',
  'No se ha aplicado ningún cambio de código ni rollback automático.',
  '',
  'Última comprobación: '+d.updatedAt,'Estado: '+d.verdict,
  'Manual de recuperación: docs/ONEUP_SELF_HEALING.md'
 ].join('\n');
 gh('issue','create','--title',title,'--body',body);
 console.log('Created issue for repeated incident.');
}catch(error){
 // Unavailable issues / permissions are not reason to remove original health evidence.
 console.warn('Unable to publish issue (status remains in data/guard): '+String(error.message||error).slice(0,250));
}
