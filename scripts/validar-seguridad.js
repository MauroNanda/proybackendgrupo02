'use strict';
/* global fetch */
// Pruebas locales acotadas. Solo crea y elimina su propio evento BORRADOR.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const dotenv=require('dotenv');
const {parse}=require('flatted');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const env=dotenv.parse(fs.readFileSync(path.join(root,'infra/hia/.env')));
const nc=dotenv.parse(fs.readFileSync(path.join(root,'infra/n8n/.env')));
const base='http://127.0.0.1:'+(env.API_PORT||3000);
const output=path.join(root,'infra/seguridad/resultados');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let cookie;
async function n8n(route) {
  const r=await fetch('http://127.0.0.1:5680/rest/'+route,{headers:{Cookie:cookie}});
  assert.equal(r.status,200,'Acceso n8n');return (await r.json()).data;
}
async function request(route,{method='GET',token,body,headers={}}={}) {
  const r=await fetch(base+route,{method,headers:{...(body!==undefined?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{}),...headers},...(body!==undefined?{body:JSON.stringify(body)}:{})});
  const text=await r.text();let data;try{data=JSON.parse(text);}catch{data={};}
  return {status:r.status,data,headers:r.headers};
}
async function login(username) {
  const r=await request('/api/auth/login',{method:'POST',body:{username,password:'DemoConvoca2026!'}});
  assert.equal(r.status,200,'Login demostracion '+username);return r.data;
}
async function main() {
  if(!/^convoca-lab-v2(?:-[a-z0-9]+)?$/.test(env.COMPOSE_PROJECT_NAME))throw new Error('Solo laboratorio local Convoca.');
  const start=Date.now();const checks=[];
  const r=await fetch('http://127.0.0.1:5680/rest/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({emailOrLdapLoginId:'admin@convoca.local',password:nc.N8N_ADMIN_PASSWORD})});assert.equal(r.status,200);
  cookie=r.headers.getSetCookie().map(x=>x.split(';')[0]).join('; ');
  const w=await n8n('workflows/a14Flujo4');assert.ok(w.active,'Publicar flujo A14 primero');
  const unauthWebhook=await fetch('http://127.0.0.1:5680/webhook/convoca-security-incident',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});assert.equal(unauthWebhook.status,403);checks.push({caso:'webhook sin credencial',http:403});
  const org=await login('lab_1'),asistente=await login('lab_2');
  checks.push({caso:'login bcrypt6 con hashes anteriores',roles:[org.usuario.rol,asistente.usuario.rol],ok:true});
  const noAuth=await request('/api/usuarios');assert.equal(noAuth.status,401);checks.push({caso:'sin sesion',http:401});
  const elevation=await request('/api/usuarios/'+asistente.usuario.id,{method:'PUT',token:asistente.token,body:{rol:'ORGANIZADOR'}});assert.equal(elevation.status,403);
  const profile=await request('/api/auth/perfil',{token:asistente.token});assert.equal(profile.data.rol,'ASISTENTE');checks.push({caso:'elevacion de privilegios rechazada',http:403,rolConservado:true});
  const users=await request('/api/usuarios',{token:org.token});assert.equal(users.status,200);
  for(const user of users.data)for(const key of ['password','codigo_2fa','codigo_2fa_expira','google_id'])assert.equal(Object.hasOwn(user,key),false);
  checks.push({caso:'listado autorizado sin campos sensibles',http:200,usuarios:users.data.length});
  const forbidden=await request('/api/eventos',{method:'POST',token:asistente.token,body:{titulo:'No debe crearse'}});assert.equal(forbidden.status,403);checks.push({caso:'alta con rol incorrecto',http:403});
  const fakeId=crypto.randomUUID();let eventId;
  try {
    const created=await request('/api/eventos',{method:'POST',token:org.token,body:{id:fakeId,titulo:'Ensayo A14 '+crypto.randomUUID()+' literal%_',descripcion:'BORRADOR sintetico para prueba local',fecha:new Date(Date.now()+86400000).toISOString(),ubicacion:'Laboratorio',cupo_maximo:2,estado:'BORRADOR',createdAt:'1999-01-01T00:00:00Z',recordatorio_enviado_en:'1999-01-01T00:00:00Z'}});
    assert.equal(created.status,201,'Crear solo la fixture propia');eventId=created.data.id;assert.notEqual(eventId,fakeId);assert.ok(!created.data.createdAt.startsWith('1999'));assert.equal(created.data.recordatorio_enviado_en,null);
    checks.push({caso:'mass assignment de evento impedido',http:201,idImpuestoIgnorado:true,fechaInternaConservada:true});
    const literal=await request('/api/eventos?todos=true&search='+encodeURIComponent('%_'));assert.equal(literal.status,200);assert.equal(literal.data.length,1);assert.equal(literal.data[0].id,eventId);checks.push({caso:'comodines LIKE tratados literalmente',coincidencias:1});
    const sql=await request('/api/eventos?todos=true&search='+encodeURIComponent("' OR '1'='1"));assert.equal(sql.status,200);assert.equal(sql.data.length,0);checks.push({caso:'sondeo SQLi sin ampliacion de resultados',http:200,coincidencias:0});
    const proto=await request('/api/auth/login',{method:'POST',body:JSON.parse('{"constructor":{"prototype":{"polluted":true}}}')});assert.equal(proto.status,400);checks.push({caso:'prototype pollution',http:400});
    let deep={};for(let i=0;i<20;i++)deep={a:deep};const depth=await request('/api/auth/login',{method:'POST',body:deep});assert.equal(depth.status,400);checks.push({caso:'profundidad excesiva',http:400});
    const origin=await request('/api/eventos/'+eventId,{method:'PUT',token:org.token,body:{titulo:'No debe cambiar'},headers:{Origin:'https://ajeno.invalid',Cookie:'convoca_token=ficticio'}});assert.equal(origin.status,403);checks.push({caso:'escritura cross-site con cookie',http:403});
  } finally {
    if(eventId){const removed=await request('/api/eventos/'+eventId,{method:'DELETE',token:org.token});assert.equal(removed.status,200,'Retirar solo la fixture creada por esta prueba');}
  }
  const policy=/^(\d+);w=(\d+)/.exec(profile.headers.get('ratelimit-policy')||'');
  const limit=policy?Number(policy[1]):Number(env.API_RATE_MAX);
  const windowMs=policy?Number(policy[2])*1000:Number(env.API_RATE_WINDOW_MS);
  if(windowMs<=20000 && limit<=100) {
    let limited=false;let attempts=0;
    for(let i=0;i<110;i++){
      const r=await request('/api/auth/perfil',{headers:{'X-Forwarded-For':'192.0.2.'+((i%200)+1)}});attempts++;if(r.status===429){limited=true;break;}
    }
    assert.ok(limited,'X-Forwarded-For no debe evadir el limite');const health=await request('/api/health');assert.equal(health.status,200);checks.push({caso:'rafaga acotada con IP falsificada',http:429,peticiones:attempts,health:200});
    await wait(windowMs+500);const recovered=await request('/api/auth/perfil',{token:asistente.token});assert.equal(recovered.status,200);checks.push({caso:'recuperacion al expirar ventana de limite',http:200});
  } else checks.push({caso:'limite HTTP integrado',estado:'omitido para no agotar un cupo normal; usar limites de ensayo. Cubierto por regresion unitaria.'});
  let results=[];
  for(let i=0;i<60;i++){
    const list=await n8n('executions?limit=60');results=[];
    for(const e of list.results.filter(e=>e.workflowId==='a14Flujo4'&&Date.parse(e.startedAt)>=start-1000&&e.stoppedAt)) {
      const detail=await n8n('executions/'+e.id);const run=parse(detail.data).resultData;
      const node=run.runData['Registrar ID y armar correo']?.[0]?.data?.main?.[0]?.[0]?.json;
      results.push({ejecucion:e.id,estado:e.status,tipo:node?.tipo,ticket:node?.issueId,nodos:Object.keys(run.runData),error:run.error?.message});
    }
    if(results.some(e=>e.ticket&&e.nodos.includes('Notificar incidente por Mailpit')))break;
    await wait(1000);
  }
  assert.ok(results.some(e=>e.ticket&&e.nodos.includes('Notificar incidente por Mailpit')),'Completar circuito API -> n8n -> Mantis -> correo');
  assert.ok(!results.some(e=>e.estado==='error'),'Los eventos emitidos por la API deben ser validos');
  const mail=await(await fetch('http://127.0.0.1:8028/api/v1/messages')).json();
  const ids=results.filter(x=>x.ticket).map(x=>x.ticket);assert.ok(mail.messages.some(m=>ids.some(id=>m.Subject.includes('#'+id))));
  const inspection=spawnSync('docker',['inspect',env.COMPOSE_PROJECT_NAME+'-api-1'],{encoding:'utf8',windowsHide:true});assert.equal(inspection.status,0);
  const container=JSON.parse(inspection.stdout)[0];assert.equal(container.Config.User,'node');assert.ok(container.HostConfig.CapDrop.includes('ALL'));assert.ok(container.HostConfig.SecurityOpt.includes('no-new-privileges:true'));
  const secretTest=spawnSync('docker',['exec',env.COMPOSE_PROJECT_NAME+'-api-1','node','-e',"const f=require('fs');if(f.existsSync('/app/infra/n8n/.env')||f.existsSync('/app/infra/n8n/privado/session.txt'))process.exit(1);console.log('sin-secretos-locales-en-imagen')"],{encoding:'utf8'});assert.equal(secretTest.status,0);
  const result={fecha:new Date().toISOString(),origen:'HTTP real contra API Docker y PostgreSQL piloto aislado',base,checks,incidentes:results,canal:'Mailpit local, no correo externo',contenedor:{usuario:container.Config.User,capDrop:container.HostConfig.CapDrop,securityOpt:container.HostConfig.SecurityOpt,pids:container.HostConfig.PidsLimit,memoria:container.HostConfig.Memory,secretosLocalesFueraDeImagen:true}};
  fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'validacion-integrada.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result,null,2));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
