'use strict';
/* global fetch */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const vm = require('node:vm');
const token = crypto.randomBytes(24).toString('hex');
let child;
const base = 'http://127.0.0.1:15681';
before(async()=>{
  child = spawn(process.execPath,['scripts/n8n-runner.js'],{env:{...process.env,N8N_RUNNER_PORT:'15681',N8N_RUNNER_TOKEN:token},stdio:'ignore',windowsHide:true});
  for(let i=0;i<50;i++) {
    try { if((await fetch(base+'/salud')).ok) return; } catch { /* inicio */ }
    await new Promise(r=>setTimeout(r,100));
  }
  throw new Error('Runner no inicio');
});
after(()=>child?.kill());
async function post(route,body,authenticated=true) {
  return fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json',...(authenticated?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});
}
test('no permite ejecutar operaciones sin token',async()=>assert.equal((await post('/backup',{},false)).status,401));
test('rechaza perfiles que podrian operar sobre la carga completa',async()=>assert.equal((await post('/backup',{perfil:'completo'})).status,400));
test('no restaura sin aprobacion humana explicita',async()=>{
  for(const aprobado of [undefined,false,'true',1]) assert.equal((await post('/restore-test',{aprobado})).status,403);
});
test('rechaza operaciones fuera de la lista permitida',async()=>assert.equal((await post('/restaurar-produccion',{aprobado:true})).status,404));
test('rechaza entradas no estructuradas y rutas relativas',async()=>{
  assert.equal((await post('/backup',[])).status,400);
  assert.equal((await post('/informe',{carpeta:'../../etc'})).status,400);
});
test('normaliza todas las entradas aunque una alerta y una recuperacion lleguen juntas',()=>{
  const flow=JSON.parse(fs.readFileSync('infra/n8n/flujos/A13_Flujo1_Prometheus_Mantis.json','utf8'));
  const source=flow.nodes.find(n=>n.name==='Normalizar alertas').parameters.jsCode;
  const input=['firing','resolved'].map((status,i)=>({json:{body:{alerts:[{status,fingerprint:'regresion-'+i,labels:{alertname:'Prueba'+i}}]}}}));
  const out=vm.runInNewContext('(function(){'+source+'})()',{$input:{all:()=>input}});
  assert.equal(out.length,2);
  assert.equal(out[0].json.status,'firing');
  assert.equal(out[1].json.status,'resolved');
});
