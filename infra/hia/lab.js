'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn, spawnSync } = require('node:child_process');
const { URL } = require('node:url');
const dotenv = require('dotenv');
const manifest = require('./dataset.json');
const root = path.resolve(__dirname, '../..');

function profile(name) {
  if (!Object.hasOwn(manifest.perfiles, name)) throw new Error('Perfil permitido: piloto o completo.');
  return { ...manifest.perfiles[name], name };
}
function settings(p, hash) {
  const values = { perfil: p.name, version: manifest.version, usuarios: p.usuarios, eventos: p.eventos,
    inscripciones: p.inscripciones, database: p.database, referencia: manifest.referencia, lote: manifest.lote };
  if (hash) values.demo_hash = hash;
  return Object.entries(values).map(([k, v]) => `SET lab.${k} = '${String(v).replaceAll("'", "''")}';`).join('\n') + '\n';
}
function localUrl(env, database) {
  if (!/^[a-z_][a-z0-9_]*$/.test(env.POSTGRES_USER || '')) throw new Error('POSTGRES_USER: usar letras minúsculas, números y _.');
  const url = new URL('postgresql://127.0.0.1');
  url.port = env.LAB_DB_PORT || '5435';
  if (!/^\d+$/.test(url.port) || Number(url.port)<1) throw new Error('Puerto inválido.');
  url.username = env.POSTGRES_USER;
  url.password = env.POSTGRES_PASSWORD;
  url.pathname = `/${database}`;
  return url.toString();
}

async function main() {
  const command = process.argv[2];
  const args = process.argv.slice(3);
  if (args.length && (args.length!==2 || args[0]!=='--perfil')) throw new Error('Usar --perfil piloto|completo.');
  const p = profile(args[1] || 'piloto');
  const supported = ['check','up','migrate','seed','validate','analyze','backup','restore-test'];
  if (!supported.includes(command)) throw new Error(`Operación permitida: ${supported.join(', ')}.`);
  const envFile = path.join(__dirname, '.env');
  if (!fs.existsSync(envFile)) throw new Error('Copiar infra/hia/.env.example a infra/hia/.env y completar claves locales.');
  const env = dotenv.parse(fs.readFileSync(envFile));
  for (const key of ['POSTGRES_USER','POSTGRES_PASSWORD','PGADMIN_EMAIL','PGADMIN_PASSWORD']) {
    if (!env[key] || env[key].startsWith('cambiar-')) throw new Error(`Configurar ${key} en infra/hia/.env.`);
  }
  if (!/^convoca-lab-v2(?:-[a-z0-9]+)?$/.test(env.COMPOSE_PROJECT_NAME || '')) throw new Error('COMPOSE_PROJECT_NAME debe ser convoca-lab-v2 (o sufijo de pruebas).');
  const url = localUrl(env,p.database);
  const secrets = [env.POSTGRES_PASSWORD,env.PGADMIN_PASSWORD,url];
  const clean = (value) => secrets.reduce((s,secret)=>s.replaceAll(secret,'[redactado]'),String(value)).replace(/postgres(?:ql)?:\/\/\S+/g,'[URL redactada]');
  const id = new Date().toISOString().replace(/[:.]/g,'-')+'-'+command+'-'+p.name;
  const output = path.join(__dirname,'resultados',id);
  fs.mkdirSync(output,{recursive:true});
  fs.mkdirSync(path.join(__dirname,'backups'),{recursive:true});
  const log = path.join(output,'ejecucion.log');
  const record = { command, perfil:p.name, database:p.database, dataset:manifest.version,
    inicio:new Date().toISOString(), node:process.version,
    commit:spawnSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).stdout?.trim(),
    cambiosLocales:spawnSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).stdout?.trim() || '' };
  record.codigoSha256=Object.fromEntries(['seeders/seed-masivo.sql','infra/hia/dataset.json','infra/hia/lab.js',
    'infra/hia/validar-dataset.sql','infra/hia/docker-compose.yml','infra/hia/backup.sh'].map(file=>
    [file,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')]));
  const composeArgs = ['compose','--env-file',envFile,'-f',path.join(__dirname,'docker-compose.yml')];
  async function run(bin, argv, options={}) {
    return new Promise((resolve,reject)=>{
      const child = spawn(bin,argv,{cwd:root,env:{...process.env,...options.env},stdio:['pipe','pipe','pipe'],windowsHide:true});
      let text='',err='';
      child.stdout.on('data',d=>{text+=d; if(options.live)process.stdout.write(clean(d));});
      child.stderr.on('data',d=>{err+=d; if(options.live)process.stderr.write(clean(d));});
      child.on('error',reject);
      child.on('close',code=>{
        fs.appendFileSync(log,clean(text+err));
        if(code!==0) reject(new Error(`${path.basename(bin)} terminó con código ${code}: ${clean(err||text).slice(-1800)}`));
        else resolve(text.trim());
      });
      child.stdin.on('error',()=>{});
      child.stdin.end(options.input || '');
    });
  }
  const compose = (argv,options={})=>run('docker',[...composeArgs,...argv],{
    ...options,env:{...env,COMPOSE_PROFILES:'',...options.env}
  });
  const sql = (database,input)=>compose(['exec','-T','db-principal','psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U',env.POSTGRES_USER,'-d',database,'-f','-'],{input});
  const validate = async database => {
    const out = await sql(database,settings(p)+fs.readFileSync(path.join(__dirname,'validar-dataset.sql'),'utf8'));
    const report = JSON.parse(out.split('\n').find(line=>line.startsWith('{')));
    fs.writeFileSync(path.join(output,`validacion-${database}.json`),JSON.stringify(report,null,2));
    return report;
  };
  try {
    console.log(`${command}: ${p.name} → ${p.database} (solo Docker local)`);
    record.docker = await run('docker',['version','--format','{{.Server.Version}}']);
    if(command==='up') {
      await compose(['up','-d','--wait','--wait-timeout','120','db-principal','pgadmin'],{live:true});
    } else if(command==='check') {
      record.contenedores=await compose(['ps','-a']);
      console.log(record.contenedores || 'Laboratorio todavía no iniciado.');
      record.hostLibreBytes=fs.statfsSync(root).bavail*fs.statfsSync(root).bsize;
      console.log(`Host libre: ${(record.hostLibreBytes/1024**3).toFixed(1)} GiB`);
      const running=await compose(['ps','-q','--status','running','db-principal']);
      if(running) {
        record.espacioDocker=await compose(['exec','-T','db-principal','df','-Pk','/var/lib/postgresql/data']);
        record.bases=await sql('postgres',"SELECT datname,pg_size_pretty(pg_database_size(oid)) FROM pg_database WHERE NOT datistemplate;");
        record.cargas=await sql('postgres',"SELECT datname,application_name,state FROM pg_stat_activity WHERE application_name='convoca_lab_seed';");
        console.log(record.espacioDocker+'\n'+record.bases+'\n'+record.cargas);
      }
    } else {
      // No utiliza DATABASE_URL del .env habitual: destino calculado y limitado a Docker local.
      await sql('postgres','SELECT 1;');
      if(command==='migrate') {
        const exists=await sql('postgres',`SELECT 1 FROM pg_database WHERE datname='${p.database}';`);
        if(!exists) await sql('postgres',`CREATE DATABASE "${p.database}";`);
        await run(process.execPath,[path.join(root,'node_modules/sequelize-cli/lib/sequelize'),'db:migrate'],{
          env:{DATABASE_URL:url,DB_SSL:'false',NODE_ENV:'development'},live:true});
      }
      if(command==='seed') {
        const space=fs.statfsSync(root);
        if(p.name==='completo' && space.bavail*space.bsize<15*1024**3) throw new Error('Se requieren 15 GiB libres en host para carga y restauración completa.');
        const df=await compose(['exec','-T','db-principal','df','-Pk','/var/lib/postgresql/data']);
        const freeKB=Number(df.trim().split('\n').at(-1).trim().split(/\s+/)[3]);
        if(!Number.isFinite(freeKB) || (p.name==='completo' && freeKB<15*1024**2)) throw new Error('Revisar espacio del almacenamiento Docker (mínimo 15 GiB para completo).');
        const hash=manifest.demoHash;
        // Las credenciales de demo son públicas y EXCLUSIVAS de este laboratorio.
        const out=await compose(['exec','-T','db-principal','psql','-X','-v','ON_ERROR_STOP=1','-U',env.POSTGRES_USER,'-d',p.database,'-f','-'],{
          input:settings(p,hash)+fs.readFileSync(path.join(root,'seeders/seed-masivo.sql'),'utf8'),live:true});
        record.salida=out.slice(-1200);
        record.validacion=await validate(p.database);
      }
      if(command==='validate') { record.validacion=await validate(p.database); console.log(JSON.stringify(record.validacion.conteos)); }
      if(command==='analyze') {
        await sql(p.database,'ANALYZE; SET log_min_duration_statement=0; SELECT count(*) FROM "Inscripciones"; SELECT pg_sleep(1.1);');
        await sql('postgres','SELECT pg_rotate_logfile();');
        const files=await compose(['exec','-T','db-principal','sh','-c','ls /var/log/postgresql/postgresql-*.log']);
        const report='/resultados/'+id+'/pgbadger.html';
        await compose(['--profile','analisis','run','--rm','--build','pgbadger','-f','stderr','-o',report,...files.split('\n').map(f=>f.replace('/var/log/postgresql/','/logs/'))],{live:true});
        console.log(`Reporte: infra/hia/resultados/${id}/pgbadger.html`);
      }
      if(command==='backup') {
        await validate(p.database);
        const name=await compose(['exec','-T','db-principal','sh','/usr/local/bin/backup-lab',p.database]);
        record.backup=name.split('\n').at(-1); console.log(`Copia: infra/hia/backups/${record.backup}.dump`);
      }
      if(command==='restore-test') {
        const dir=path.join(__dirname,'backups');
        const names=fs.readdirSync(dir).filter(n=>n.startsWith(p.database+'-') && n.endsWith('.dump')).sort().reverse();
        if(!names.length) throw new Error('Primero ejecutar lab:backup para este perfil.');
        const file=names[0]; const stem=file.slice(0,-5);
        const backup=JSON.parse(fs.readFileSync(path.join(dir,stem+'.json'),'utf8'));
        if(backup.version!==manifest.version || backup.perfil!==p.name || !backup.completado ||
          Number(backup.usuarios)!==p.usuarios || Number(backup.eventos)!==p.eventos || Number(backup.inscripciones)!==p.inscripciones) throw new Error('Manifiesto de backup incompatible.');
        const digest=await new Promise((resolve,reject)=>{
          const hash=crypto.createHash('sha256'); const stream=fs.createReadStream(path.join(dir,file));
          stream.on('data',d=>hash.update(d)); stream.on('error',reject); stream.on('end',()=>resolve(hash.digest('hex')));
        });
        if(digest!==fs.readFileSync(path.join(dir,stem+'.sha256'),'utf8').trim()) throw new Error('Checksum del backup incorrecto.');
        const before=await validate(p.database);
        const sourceBytes=Number(await sql('postgres',`SELECT pg_database_size('${p.database}');`));
        const free=fs.statfsSync(root);
        if(free.bavail*free.bsize < sourceBytes*1.5+1024**3) throw new Error('Espacio del host insuficiente para restaurar.');
        const disk=await compose(['exec','-T','db-principal','df','-Pk','/var/lib/postgresql/data']);
        const freeBytes=Number(disk.trim().split('\n').at(-1).trim().split(/\s+/)[3])*1024;
        if(freeBytes<sourceBytes*1.5+1024**3) throw new Error('Espacio Docker insuficiente para restaurar.');
        const temp=p.database+'_restore_'+Date.now();
        record.backup=file; record.destinoRestauracion=temp;
        await sql('postgres',`CREATE DATABASE "${temp}";`);
        try {
          await compose(['exec','-T','db-principal','pg_restore','--exit-on-error','--no-owner','--no-acl','-U',env.POSTGRES_USER,'-d',temp,'/backups/'+file],{live:true});
          const after=await validate(temp);
          for(const key of ['conteos','restricciones','muestra']) {
            if(JSON.stringify(before[key])!==JSON.stringify(after[key])) throw new Error(`Restauración diferente: ${key}.`);
          }
          record.restauracion='OK'; console.log('Restauración OK: conteos, restricciones, muestras e integridad coinciden.');
          fs.writeFileSync(path.join(dir,stem+'.verified.json'),JSON.stringify({sha256:digest,fecha:new Date().toISOString(),resultado:'OK',evidencia:id},null,2));
        } finally {
          // Solo la base temporal recién creada por esta ejecución; nunca el origen.
          await sql('postgres',`DROP DATABASE "${temp}";`);
        }
      }
    }
    record.resultado='OK';
  } catch(error) { record.resultado='ERROR'; record.error=clean(error.message); throw new Error(record.error); }
  finally {
    record.fin=new Date().toISOString(); record.segundos=(Date.parse(record.fin)-Date.parse(record.inicio))/1000;
    fs.writeFileSync(path.join(output,'resultado.json'),JSON.stringify(record,null,2));
    console.log(`Evidencia local: infra/hia/resultados/${id}/resultado.json`);
  }
}
if(require.main===module) main().catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports={profile,settings,localUrl};
