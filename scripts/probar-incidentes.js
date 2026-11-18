'use strict';
/* global fetch */
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {parse}=require('flatted');
const root=path.resolve(__dirname,'..');
const env=require('dotenv').parse(fs.readFileSync(path.join(root,'infra/n8n/.env')));
const output=path.join(root,'infra/seguridad/resultados');
const mode=process.argv[3]||'duplicado';
let cookie;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function api(route) {
  const r=await fetch('http://127.0.0.1:5680/rest/'+route,{headers:{Cookie:cookie}});assert.equal(r.status,200);return (await r.json()).data;
}
async function send(body) {
  const start=Date.now();
  const r=await fetch('http://127.0.0.1:5680/webhook/convoca-security-incident',{method:'POST',headers:{'Content-Type':'application/json','X-A14-Token':env.N8N_SECURITY_WEBHOOK_TOKEN},body:JSON.stringify(body)});assert.equal(r.status,200);
  for(let i=0;i<90;i++) {
    const list=await api('executions?limit=30');const e=list.results.find(e=>e.workflowId==='a14Flujo4'&&e.mode==='webhook'&&Date.parse(e.startedAt)>=start-500);
    if(e?.stoppedAt) {
      const detail=await api('executions/'+e.id);const run=parse(detail.data).resultData;
      const normal=run.runData['Normalizar y deduplicar incidente']?.[0]?.data?.main?.[0]?.[0]?.json;
      const issue=run.runData['Registrar ID y armar correo']?.[0]?.data?.main?.[0]?.[0]?.json;
      return {ejecucion:e.id,estado:e.status,nodos:Object.keys(run.runData),ticket:issue?.issueId||normal?.issueId,duplicado:normal?.duplicate,error:run.error?.message};
    }
    await wait(1000);
  }
  throw new Error('No finalizo la ejecucion de ensayo.');
}
async function main() {
  if(!['duplicado','invalido','fallo-mantis','fallo-smtp','recuperar-smtp'].includes(mode))throw new Error('Usar --caso duplicado|invalido|fallo-mantis|fallo-smtp|recuperar-smtp. Los servicios se detienen manualmente solo en un laboratorio de ensayo.');
  const login=await fetch('http://127.0.0.1:5680/rest/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({emailOrLdapLoginId:'admin@convoca.local',password:env.N8N_ADMIN_PASSWORD})});assert.equal(login.status,200);
  cookie=login.headers.getSetCookie().map(x=>x.split(';')[0]).join('; ');
  const last=mode==='duplicado'?201:mode==='fallo-mantis'?202:204;
  const body={servicio:'convoca-backend',entorno:'development',timestamp:new Date().toISOString(),tipo:'INJECTION_PROBE_DETECTED',severidad:'media',ip:'192.0.2.'+last,ruta:'/api/eventos/:id',metodo:'GET',detalle:'Ensayo sintetico identificado de A14; no corresponde a un ataque real.'};
  if(mode==='invalido') body.tipo='NO_ADMITIDO';
  const result={fecha:new Date().toISOString(),caso:mode,origen:'Webhook real con evento sintetico de laboratorio',primero:await send(body)};
  if(mode==='duplicado') {
    assert.equal(result.primero.estado,'success');assert.ok(result.primero.ticket);await wait(1000);result.repetido=await send({...body,timestamp:new Date().toISOString()});assert.equal(result.repetido.ticket,result.primero.ticket);assert.equal(result.repetido.duplicado,true);assert.ok(!result.repetido.nodos.includes('Crear ticket de seguridad en Mantis'));
  } else if(mode==='invalido') assert.equal(result.primero.estado,'error');
  else if(mode==='fallo-mantis') assert.ok(result.primero.nodos.some(x=>x.startsWith('Avisar fallo')));
  else if(mode==='recuperar-smtp') {
    assert.ok(result.primero.nodos.includes('Confirmar aviso de seguridad'));
    assert.ok(!result.primero.nodos.includes('Crear ticket de seguridad en Mantis'));
  } else assert.ok(result.primero.nodos.includes('Registrar aviso pendiente'));
  fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'flujo-'+mode+'.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
