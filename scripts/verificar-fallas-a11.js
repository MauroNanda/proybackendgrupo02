'use strict';
// Solo ensayo optativo en proyecto NUEVO convoca-lab-v2-a11audit, nunca sobre el laboratorio compartido.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const {Client}=require('pg');
const root=path.resolve(__dirname,'..');
const env=require('dotenv').parse(fs.readFileSync(path.join(root,'infra/hia/.env')));
assert.equal(env.COMPOSE_PROJECT_NAME,'convoca-lab-v2-a11audit','Usar exclusivamente un laboratorio aislado nuevo.');
assert.equal(process.env.A11_ALLOW_FAULTS,'1','Definir A11_ALLOW_FAULTS=1 para autorizar cortes del laboratorio de prueba.');
const prefix=env.COMPOSE_PROJECT_NAME, db=prefix+'-db-principal-1',api=prefix+'-api-1',replica=prefix+'-db-replica-1';
const url='http://127.0.0.1:'+env.API_PORT;
const result={fecha:new Date().toISOString(),proyecto:prefix,casos:{}};
const output=path.join(root,'infra/mantis/resultados');fs.mkdirSync(output,{recursive:true});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
function docker(...args){const r=spawnSync('docker',args,{encoding:'utf8',windowsHide:true});if(r.status!==0)throw new Error('Falló docker '+args[0]);return r.stdout.trim();}
const options={host:'127.0.0.1',port:Number(env.LAB_DB_PORT),user:env.POSTGRES_USER,password:env.POSTGRES_PASSWORD,database:'convoca_lab_piloto_v2',ssl:false};
async function request(route){const start=Date.now();try{const r=await globalThis.fetch(url+route,{signal:globalThis.AbortSignal.timeout(45000)});const body=await r.text();return {status:r.status,ms:Date.now()-start,...(route.endsWith('health')?{body:JSON.parse(body)}:{bytes:body.length})};}catch{return {status:0,ms:Date.now()-start};}}
async function healthy(){for(let n=0;n<40;n++){const r=await request('/api/health');if(r.status===200)return r;await pause(1000);}throw new Error('API no se recuperó.');}
async function main(){
  const client=new Client(options);await client.connect();
  try{
    const count=(await client.query('SELECT (SELECT count(*) FROM "Usuarios") u,(SELECT count(*) FROM "Eventos") e,(SELECT count(*) FROM "Inscripciones") i')).rows[0];
    assert.deepEqual(count,{u:'1000',e:'100',i:'10000'});
    result.inicio=await healthy();
    await client.query('BEGIN');
    let pending;
    try{
      await client.query('LOCK TABLE "Eventos" IN ACCESS EXCLUSIVE MODE');
      pending=request('/api/eventos');
      await pause(2000);
      const waiting=(await client.query("SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND pid<>pg_backend_pid() AND query ILIKE '%Eventos%'")).rows[0].count;
      assert.ok(Number(waiting)>0,'Debe existir una lectura realmente esperando el bloqueo.');
      await client.query('COMMIT');
      const blocked=await pending,after=await request('/api/eventos');
      assert.equal(blocked.status,200);assert.ok(blocked.ms>=1800);assert.equal(after.status,200);
      result.casos['A11-03']={waiting:Number(waiting),bloqueada:blocked,recuperada:after,ok:true};
    }finally{await client.query('ROLLBACK');if(pending)await pending;}
  }finally{await client.end();}
  try{docker('stop',db);const during=await request('/api/health');assert.equal(during.status,503);assert.equal(during.body.database,'down');result.casos['A11-04']={durante:during};}
  finally{docker('start',db);}
  result.casos['A11-04'].recuperada=await healthy();result.casos['A11-04'].ok=true;
  try{
    docker('stop',api);const during=await request('/api/health');assert.equal(during.status,0);
    const c=new Client(options);await c.connect();try{await c.query('SELECT 1');}finally{await c.end();}
    result.casos['A11-07']={durante:during,postgresDisponible:true};
  }finally{docker('start',api);}
  result.casos['A11-07'].recuperada=await healthy();result.casos['A11-07'].ok=true;
  docker('compose','--env-file','infra/hia/.env','-f','infra/hia/docker-compose.yml','--profile','replica','up','-d','--wait','db-principal','replication-init','db-replica');
  const primary=new Client(options);await primary.connect();
  try{
    assert.equal((await primary.query("SELECT to_regclass('public.a11_replica_probe') t")).rows[0].t,null,'No pisar una tabla existente.');
    docker('stop',replica);
    for(let n=0;n<20;n++){if(Number((await primary.query('SELECT count(*) FROM pg_stat_replication')).rows[0].count)===0)break;await pause(500);}
    const disconnected=Number((await primary.query('SELECT count(*) FROM pg_stat_replication')).rows[0].count);assert.equal(disconnected,0);
    await primary.query('CREATE TABLE public.a11_replica_probe(id integer PRIMARY KEY); INSERT INTO public.a11_replica_probe VALUES(11)');
    docker('start',replica);
    let row;
    for(let n=0;n<45;n++){
      await pause(1000);
      try{const r=docker('exec',replica,'psql','-XAt','-U',env.POSTGRES_USER,'-d',options.database,'-c',"SELECT pg_is_in_recovery(), (SELECT id FROM public.a11_replica_probe)");if(r==='t|11'){row=r;break;}}catch{/* standby arrancando */}
    }
    assert.equal(row,'t|11');
    const state=(await primary.query('SELECT state,sync_state FROM pg_stat_replication')).rows;
    assert.equal(state[0].state,'streaming');
    await primary.query('DROP TABLE public.a11_replica_probe');
    let cleaned=false;for(let n=0;n<20;n++){await pause(500);const r=docker('exec',replica,'psql','-XAt','-U',env.POSTGRES_USER,'-d',options.database,'-c',"SELECT to_regclass('public.a11_replica_probe') IS NULL");if(r==='t'){cleaned=true;break;}}
    assert.ok(cleaned);result.casos['A11-08']={standbysDuranteCorte:disconnected,lecturaDirectaStandby:row,estado:state,limpiezaPropagada:cleaned,ok:true};
  }finally{docker('start',replica);await primary.query('DROP TABLE IF EXISTS public.a11_replica_probe');await primary.end();}
  result.fin=await healthy();result.ok=true;
}
main().catch(e=>{result.ok=false;result.error=e.message;process.exitCode=1;}).finally(()=>{
  fs.writeFileSync(path.join(output,'operacion.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
});
