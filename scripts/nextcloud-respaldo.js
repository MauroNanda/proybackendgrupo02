'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const {pipeline}=require('node:stream/promises');
exports.run=async(command,c)=>{
  const cfg=command==='backup'?c.env():null,folder=path.join(c.dir,'backups');fs.mkdirSync(folder,{recursive:true});
  const keyfile=path.join(folder,'clave-local.txt'),target=path.join(folder,'nextcloud.enc');
  if(command==='backup'){
    const publication=JSON.parse(fs.readFileSync(path.join(c.dir,'resultados/publicacion.json'),'utf8'));
    if(!fs.existsSync(keyfile))fs.writeFileSync(keyfile,crypto.randomBytes(32).toString('hex'),{mode:0o600,flag:'wx'});
    c.compose(['stop','cron']);c.occ(['maintenance:mode','--on']);
    try{
      const db=c.compose(['exec','-T','db','pg_dump','-U','nextcloud','--clean','--if-exists','--no-owner','--no-privileges','nextcloud'],{capture:true});
      const dbUser=c.occ(['config:system:get','dbuser']).trim(),dbPassword=c.occ(['config:system:get','dbpassword']).trim();
      const plain=path.join(folder,'temporal.tar.gz');
      c.compose(['exec','-T','--user','www-data','app','tar','-czf','/tmp/a12.tar.gz','config','data','custom_apps','themes'],{capture:true});
      c.compose(['cp','app:/tmp/a12.tar.gz',plain],{capture:true});
      const archiveIv=crypto.randomBytes(12),archiveCipher=crypto.createCipheriv('aes-256-gcm',Buffer.from(fs.readFileSync(keyfile,'utf8').trim(),'hex'),archiveIv);
      try{await pipeline(fs.createReadStream(plain),archiveCipher,fs.createWriteStream(path.join(folder,'archivos.enc')));}finally{fs.unlinkSync(plain);c.compose(['exec','-T','--user','www-data','app','rm','/tmp/a12.tar.gz'],{capture:true});}
      const payload=Buffer.from(JSON.stringify({format:2,createdAt:new Date().toISOString(),config:cfg,db,dbUser,dbPassword,publication,archiveIv:archiveIv.toString('hex'),archiveTag:archiveCipher.getAuthTag().toString('hex')}));
      const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',Buffer.from(fs.readFileSync(keyfile,'utf8').trim(),'hex'),iv);
      fs.writeFileSync(target,Buffer.concat([iv,cipher.update(payload),cipher.final(),cipher.getAuthTag()]));
      c.save('respaldo.json',{createdAt:new Date().toISOString(),encrypted:true,algorithm:'AES-256-GCM',size:fs.statSync(target).size});
      console.log('Respaldo cifrado: infra/nextcloud/backups/nextcloud.enc. Guardar la clave por separado.');
    }finally{c.occ(['maintenance:mode','--off']);c.compose(['start','cron']);}
    return;
  }
  const bytes=fs.readFileSync(target),dec=crypto.createDecipheriv('aes-256-gcm',Buffer.from(fs.readFileSync(keyfile,'utf8').trim(),'hex'),bytes.subarray(0,12));dec.setAuthTag(bytes.subarray(-16));
  const payload=JSON.parse(Buffer.concat([dec.update(bytes.subarray(12,-16)),dec.final()]));
  if(payload.format!==2)throw new Error('Formato de respaldo no soportado');
  const project='convoca-nextcloud-a12-restauracion',testEnv=path.join(folder,'restauracion.env');
  const existing=spawnSync('docker',['volume','ls','--filter','label=com.docker.compose.project='+project,'--format','{{.Name}}'],{encoding:'utf8',windowsHide:true});
  if(existing.status!==0||existing.stdout.trim())throw new Error('La restauracion requiere un proyecto vacio: '+project+'. Se conservan los datos existentes.');
  fs.writeFileSync(testEnv,Object.entries({...payload.config,COMPOSE_PROJECT_NAME:project,NC_PORT:'8083'}).map(([k,v])=>k+'='+v).join('\n')+'\n',{mode:0o600});
  const args=['compose','--env-file',testEnv,'-f',path.join(c.dir,'compose.yaml')];
  function run(a,input){const r=spawnSync('docker',[...args,...a],{encoding:'utf8',input,windowsHide:true,maxBuffer:256*1024*1024});if(r.status!==0)throw new Error('Restauracion: comando Docker fallo ('+a[0]+'). Revisar estado del proyecto '+project);return r.stdout;}
  run(['up','-d','--wait','db','redis']);run(['create','app']);
  const temporary=path.join(folder,'restaurar-temporal.tar.gz');
  const archiveDec=crypto.createDecipheriv('aes-256-gcm',Buffer.from(fs.readFileSync(keyfile,'utf8').trim(),'hex'),Buffer.from(payload.archiveIv,'hex'));archiveDec.setAuthTag(Buffer.from(payload.archiveTag,'hex'));
  try{
    await pipeline(fs.createReadStream(path.join(folder,'archivos.enc')),archiveDec,fs.createWriteStream(temporary));
    run(['run','--rm','--no-deps','-v',folder+':/restore:ro','--entrypoint','sh','app','-c','cp -a /usr/src/nextcloud/. /var/www/html/ && tar -xzf /restore/restaurar-temporal.tar.gz -C /var/www/html']);
  }finally{if(fs.existsSync(temporary))fs.unlinkSync(temporary);}
  if(!/^[a-zA-Z0-9_]+$/.test(payload.dbUser))throw new Error('Usuario interno de base inesperado');
  const role='"'+payload.dbUser+'"',literal="'"+payload.dbPassword.replace(/'/g,"''")+"'";
  run(['exec','-T','db','psql','-U','nextcloud','-v','ON_ERROR_STOP=1','-d','nextcloud'],
    'CREATE ROLE '+role+' LOGIN PASSWORD '+literal+'; GRANT ALL ON DATABASE nextcloud TO '+role+'; GRANT ALL ON SCHEMA public TO '+role+'; SET ROLE '+role+';\n'+payload.db);
  run(['up','-d','app']);run(['exec','-T','--user','www-data','app','php','occ','maintenance:mode','--off']);run(['up','-d','--wait','app']);
  const r=spawnSync(process.execPath,['scripts/nextcloud.js','validate'],{cwd:c.root,env:{...process.env,NC_ENV_FILE:testEnv},encoding:'utf8',windowsHide:true,maxBuffer:10*1024*1024});
  if(r.status!==0)throw new Error('Datos restaurados, pero fallo validacion: '+r.stdout+' '+r.stderr);
  const publication=payload.publication;
  if(!publication?.files?.length)throw new Error('El respaldo no contiene manifiesto de publicacion. Generar otro con la version actual del script.');
  const auth='Basic '+Buffer.from('archivo-convoca:'+payload.config.NC_OWNER_PASSWORD).toString('base64');let count=0;
  for(const x of publication.files){const url='http://localhost:8083/remote.php/dav/files/archivo-convoca/Convoca%20-%20Entregas/'+publication.version+'/'+x.path.split('/').map(encodeURIComponent).join('/');
    const response=await fetch(url,{headers:{Authorization:auth},signal:AbortSignal.timeout(60000)});const b=Buffer.from(await response.arrayBuffer());
    if(response.status!==200||crypto.createHash('sha256').update(b).digest('hex')!==x.sha256)throw new Error('No coincide restauracion '+x.path);count++;}
  c.save('restauracion.json',{executedAt:new Date().toISOString(),project,isolated:true,filesVerified:count,allChecksumsMatch:true,accessAndVersionsValidated:true});
  run(['stop']);console.log('Restauracion aislada correcta: '+count+' archivos coinciden. Proyecto de prueba detenido; original disponible.');
};
