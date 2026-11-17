'use strict';
/* global fetch */
// Ejecuta webhooks reales; no altera el dataset. Restaurar requiere --restaurar.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { parse } = require('flatted');
const dotenv = require('dotenv');
const root = path.resolve(__dirname,'..');
const dir = path.join(root,'infra/n8n');
const env = dotenv.parse(fs.readFileSync(path.join(dir,'.env')));
const base = 'http://127.0.0.1:5680';
const delay = ms=>new Promise(r=>setTimeout(r,ms));
let cookie;
async function api(url) {
  const r = await fetch(base+'/rest/'+url,{headers:{Cookie:cookie}});
  if (!r.ok) throw new Error('n8n HTTP '+r.status);
  return (await r.json()).data;
}
async function trigger(route,workflow,body={}) {
  const start = Date.now();
  const r = await fetch(base+'/webhook/'+route,{method:'POST',headers:{'Content-Type':'application/json','X-A13-Token':env.N8N_WEBHOOK_TOKEN},body:JSON.stringify(body)});
  assert.equal(r.status,200,'Webhook disponible: '+route);
  for (let i=0;i<300;i++) {
    const d=await api('executions?limit=30');
    const e=d.results.find(x=>x.workflowId===workflow && x.mode==='webhook' && Date.parse(x.startedAt)>=start-1000);
    if (e && !['running','new'].includes(e.status)) {
      const detail=await api('executions/'+e.id);
      const data=typeof detail.data==='string' ? parse(detail.data) : detail.data;
      const nodes=data.resultData.runData;
      const result={ruta:route,id:e.id,estado:e.status,nodos:Object.keys(nodes)};
      result.error=data.resultData.error?.message;
      result.resultados=Object.fromEntries(Object.entries(nodes).filter(([name])=>/Ejecutar|Restaurar|Generar|Guardado|Subir/.test(name)).map(([name,items])=>{
        const v=items[0].data?.main?.[0]?.[0]?.json||{};
        return [name,{ok:v.ok,codigo:v.codigo,statusCode:v.statusCode,archivo:v.archivo,copia:v.copia,restauracion:v.restauracion,error:typeof v.error==='string'?v.error:undefined}];
      }));
      return result;
    }
    await delay(1000);
  }
  throw new Error('Ejecucion no termino en 300 segundos: '+route);
}
async function login() {
  let login;
  for(let i=0;i<30;i++) {
    try {
      login=await fetch(base+'/rest/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({emailOrLdapLoginId:'admin@convoca.local',password:env.N8N_ADMIN_PASSWORD})});
      if(![404,502,503].includes(login.status)) break;
    } catch { /* reinicio en curso */ }
    await delay(1000);
  }
  if(!login) throw new Error('n8n no respondio al inicio de sesion.');
  assert.equal(login.status,200,'Acceso administrativo');
  cookie=login.headers.getSetCookie().map(x=>x.split(';')[0]).join('; ');
}
async function main() {
  await login();
  const checks=[];
  for (const route of ['a13-backup','a13-restaurar','a13-informe','a13-flujo1-prometheus']) {
    const r=await fetch(base+'/webhook/'+route,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
    assert.equal(r.status,403,'Debe rechazar entradas sin credencial');
    checks.push({ruta:route,sinCredencial:r.status});
  }
  const cases=[['a13-backup','a13Flujo2'],['a13-backup-error','a13Flujo2'],['a13-restaurar','a13Flujo2'],['a13-informe','a13Flujo3'],['a13-informe-incompleto','a13Flujo3'],['a13-informe-almacenamiento-error','a13Flujo3']];
  if (process.argv.includes('--restaurar')) cases.splice(3,0,['a13-restaurar','a13Flujo2',{aprobado:true}]);
  for(const [route,wf,body] of cases) {
    const r=await trigger(route,wf,body);
    checks.push(r); console.log(route, r.estado,JSON.stringify(r.resultados));
    assert.equal(r.estado,'success','El error debe quedar manejado: '+route);
    if(route==='a13-backup') assert.equal(r.resultados['Ejecutar backup'].ok,true);
    if(route==='a13-backup-error') assert.equal(r.resultados['Ejecutar backup'].ok,false);
    if(route==='a13-restaurar') assert.equal(r.resultados['Restaurar en base temporal'].ok,body?.aprobado===true);
    if(route==='a13-informe') assert.ok(r.nodos.includes('Aviso informe OK'),'Informe guardado y avisado');
    if(route==='a13-informe-incompleto') assert.ok(r.nodos.includes('Aviso informe ERROR'));
    if(route==='a13-informe-almacenamiento-error') assert.ok(r.nodos.includes('Aviso almacenamiento ERROR'));
  }
  const invalid=await trigger('a13-flujo1-prometheus','a13Flujo1',{alerts:[{status:'inventado',labels:{alertname:'PruebaValidacionA13'}}]});
  checks.push(invalid); assert.equal(invalid.estado,'error','Estado invalido rechazado');
  const mail=await (await fetch('http://127.0.0.1:8028/api/v1/messages')).json();
  const output={fecha:new Date().toISOString(),origen:'Webhooks reales de n8n en Docker',canal:'Mailpit local; no acredita envio externo',correos:mail.total,checks};
  fs.mkdirSync(path.join(dir,'resultados'),{recursive:true});
  fs.writeFileSync(path.join(dir,'resultados/validacion.json'),JSON.stringify(output,null,2)+'\n');
  console.log('Validacion completada. Evidencia: infra/n8n/resultados/validacion.json');
}
if(require.main===module) main().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={trigger,api,login};
