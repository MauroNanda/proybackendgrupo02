'use strict';
// Prueba real y optativa. Solo sobre el PILOTO VACÍO recién migrado.
const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {Client}=require('pg');
const {profile,settings,localUrl}=require('../../infra/hia/lab');
const manifest=require('../../infra/hia/dataset.json');
const root=path.resolve(__dirname,'../..');
const envFile=path.join(root,'infra/hia/.env');
const env=require('dotenv').parse(fs.readFileSync(envFile));
const p=profile('piloto');
const input=settings(p,manifest.demoHash)+fs.readFileSync(path.join(root,'seeders/seed-masivo.sql'),'utf8');
const args=['compose','--env-file',envFile,'-f',path.join(root,'infra/hia/docker-compose.yml'),'exec','-T','db-principal','psql','-X','-v','ON_ERROR_STOP=1','-U',env.POSTGRES_USER,'-d',p.database,'-f','-'];
function seed(sql) {
  return new Promise((resolve,reject)=>{
    const child=spawn('docker',args,{cwd:root,windowsHide:true,stdio:['pipe','pipe','pipe']});
    let out='';child.stdout.on('data',d=>out+=d);child.stderr.on('data',d=>out+=d);
    child.on('error',reject);child.on('close',code=>resolve({code,out}));
    child.stdin.on('error',()=>{});child.stdin.end(sql);
  });
}
async function main() {
  const client=new Client({connectionString:localUrl(env,p.database),ssl:false});
  await client.connect();const result={inicio:new Date().toISOString(),perfil:'piloto',pruebas:[]};
  function check(condition,name) { if(!condition)throw new Error('Falló: '+name);result.pruebas.push(name);console.log('OK:',name); }
  const testId='00000000-0000-0000-0000-000000000004';
  let ownRow=false,ownTrigger=false;
  try {
    const count=await client.query('SELECT count(*)::integer n FROM "Usuarios"');
    if(count.rows[0].n!==0) throw new Error('La integración requiere un piloto VACÍO; no borra datos existentes.');
    await client.query('INSERT INTO "Usuarios"(id,nombre,email,"createdAt","updatedAt") VALUES($1,\'Guardia de prueba\',\'guardia@convoca.test\',now(),now())',[testId]);
    ownRow=true;
    const foreign=await seed(input);
    check(foreign.code!==0 && foreign.out.includes('datos ajenos'),'rechaza datos ajenos sin mezclarlos');
    await client.query('DELETE FROM "Usuarios" WHERE id=$1',[testId]);
    ownRow=false;
    await client.query('BEGIN; CREATE FUNCTION public.lab_test_pause() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM pg_sleep(0.4); RETURN NULL; END $$; CREATE TRIGGER lab_test_pause BEFORE INSERT ON "Inscripciones" FOR EACH STATEMENT EXECUTE FUNCTION public.lab_test_pause(); COMMIT;');
    ownTrigger=true;
    const pending=seed(input.replace("SET lab.lote = '10000'","SET lab.lote = '1000'"));
    let progress=0;
    for(let i=0;i<100;i++) {
      await new Promise(resolve=>setTimeout(resolve,100));
      const exists=await client.query("SELECT to_regclass('laboratorio.control_carga') x");
      if(exists.rows[0].x) progress=Number((await client.query('SELECT ultimo FROM laboratorio.control_carga')).rows[0]?.ultimo || 0);
      if(progress>=1000)break;
    }
    check(progress>=1000 && progress<p.inscripciones,'al menos un lote confirmado antes de interrumpir');
    const concurrent=await seed(input);
    check(concurrent.code!==0 && concurrent.out.includes('Otra carga'),'rechaza otra carga simultánea');
    await client.query("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=current_database() AND application_name='convoca_lab_seed' AND pid<>pg_backend_pid()");
    const stopped=await pending;check(stopped.code!==0,'interrupción real de la sesión de carga');
    const saved=await client.query('SELECT ultimo,(SELECT count(*) FROM "Inscripciones") n FROM laboratorio.control_carga');
    check(Number(saved.rows[0].ultimo)===Number(saved.rows[0].n) && Number(saved.rows[0].n)>0,'filas y avance se confirman atómicamente');
    await client.query('DROP TRIGGER lab_test_pause ON "Inscripciones"; DROP FUNCTION public.lab_test_pause();');
    ownTrigger=false;
    const resumed=await seed(input);check(resumed.code===0,'reanuda y completa los lotes faltantes');
    const wrong=await seed(input.replace(`SET lab.version = '${manifest.version}'`,"SET lab.version = 'otra-version'"));
    check(wrong.code!==0 && wrong.out.includes('incompatibles'),'rechaza una versión incompatible');
    const repeat=await seed(input);check(repeat.code===0,'repetir una carga completa no duplica datos');
    result.fin=new Date().toISOString();result.resultado='OK';
    fs.mkdirSync(path.join(root,'infra/hia/resultados'),{recursive:true});
    fs.writeFileSync(path.join(root,'infra/hia/resultados/integracion-piloto.json'),JSON.stringify(result,null,2));
  } finally {
    await client.query('ROLLBACK');
    if(ownTrigger) await client.query('DROP TRIGGER lab_test_pause ON "Inscripciones"; DROP FUNCTION public.lab_test_pause();');
    if(ownRow) await client.query('DELETE FROM "Usuarios" WHERE id=$1',[testId]);
    await client.end();
  }
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
