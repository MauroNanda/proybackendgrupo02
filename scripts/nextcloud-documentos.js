'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const owner='archivo-convoca',team=['mauro-nanda','gabriel-calisaya','juan-carrizo','delia-cusipuma','dumbi34'];
const work='Convoca - Trabajo',release='Convoca - Entregas';
function check(ok,message){if(!ok)throw new Error(message);}
async function put(c,user,file,bytes,headers={}){const r=await c.dav(user,'PUT',file,bytes,headers);check([201,204].includes(r.status),'PUT '+file+': '+r.status);return r;}
const directories=new Set();
async function tree(c,base){let p='';for(const part of base.split('/')){p+=(p?'/':'')+part;if(!directories.has(p)){await c.mk(owner,p);directories.add(p);}}}
exports.sync=async c=>{
  const sources=[['docs/ARQUITECTURA.md','Manuales/Arquitectura.md'],['docs/base-datos.md','Manuales/Base-datos.md'],
    ['docs/GUIA_DEMOSTRACION.md','Manuales/Demostracion.md'],['docs/mantis-a11.md','Manuales/Incidencias.md'],
    ['docs/nextcloud-a12.md','Manuales/Nextcloud.md'],['infra/nextcloud/compose.yaml','Configuraciones/nextcloud-compose.yaml'],
    ['infra/nextcloud/.env.example','Configuraciones/nextcloud.env.example']];
  for(const rel of ['docs/evidencias/actividad11','docs/evidencias/monitoreo']){
    function walk(p){for(const entry of fs.readdirSync(path.join(c.root,p),{withFileTypes:true})){const r=p+'/'+entry.name;if(entry.isDirectory())walk(r);else sources.push([r,'Evidencias/'+r.slice('docs/evidencias/'.length)]);}}
    walk(rel);
  }
  const external=path.join(c.dir,'resultados/fuentes/manifest.json');
  if(fs.existsSync(external))for(const x of JSON.parse(fs.readFileSync(external,'utf8'))){
    check(/^[A-Za-z0-9_-]+\.pdf$/.test(x.file)&&x.documentId&&x.revisionId&&x.exportedAt,'Procedencia PDF incompleta o nombre no permitido');
    sources.push([path.join(c.dir,'resultados/fuentes',x.file),'Informe/'+x.file,x]);
  }
  const entries=sources.map(([src,dest,provenance])=>{
    check(fs.existsSync(path.resolve(c.root,src)),'Falta documento previsto: '+dest);
    const bytes=fs.readFileSync(path.resolve(c.root,src));
    if(provenance)check(bytes.subarray(0,4).toString()==='%PDF','La exportacion no es PDF: '+dest);
    return {src,dest,bytes,sha256:hash(bytes),provenance};});
  const git=require('node:child_process');
  const gitCommit=git.execFileSync('git',['rev-parse','HEAD'],{cwd:c.root,encoding:'utf8'}).trim();
  const uncommittedChanges=!!git.execFileSync('git',['status','--porcelain'],{cwd:c.root,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();
  const version='v-'+hash(Buffer.from(gitCommit+':'+uncommittedChanges+'\n'+entries.map(x=>x.dest+':'+x.sha256).join('\n'))).slice(0,12);
  const conflicts=[],published=[];await tree(c,release+'/'+version);
  const previousFile=path.join(c.dir,'resultados/publicacion.json');
  const previous=fs.existsSync(previousFile)?JSON.parse(fs.readFileSync(previousFile,'utf8')):{files:[]};
  for(const x of entries){
    for(const base of [work,release+'/'+version]){
      const target=base+'/'+x.dest;await tree(c,path.posix.dirname(target));const old=await c.dav(owner,'GET',target);
      if(old.status===200){if(hash(old.bytes)!==x.sha256){
        const prior=previous.files.find(p=>p.path===x.dest);
        if(base===work&&prior&&prior.sha256===hash(old.bytes))await put(c,owner,target,x.bytes,{'If-Match':old.headers.get('etag')});
        else {conflicts.push(target);continue;}
      }}
      else {check(old.status===404,'Lectura inesperada '+target+': '+old.status);await put(c,owner,target,x.bytes,{'If-None-Match':'*'});}
      published.push(target);
    }
  }
  check(conflicts.length===0,'Hay ediciones remotas; se conservan sin sobrescribir: '+conflicts.join(', '));
  const manifest={version,exportedAt:new Date().toISOString(),gitCommit,uncommittedChanges,
    files:entries.map(({dest,sha256,bytes,provenance})=>({path:dest,sha256,size:bytes.length,...(provenance?{source:provenance}:{})}))};
  const manifestPath=release+'/'+version+'/manifiesto.json';const exists=await c.dav(owner,'GET',manifestPath);
  if(exists.status===404)await put(c,owner,manifestPath,Buffer.from(JSON.stringify(manifest,null,2)+'\n'),{'If-None-Match':'*'});
  else check(exists.status===200,'No se puede leer manifiesto');
  c.save('publicacion.json',{...manifest,published});console.log('Publicados '+entries.length+' documentos. Entrega: '+version);
};
exports.validate=async c=>{
  const results=[],id=Date.now(),file=work+'/Prueba-versiones-'+id+'.txt',v1=Buffer.from('A12 version inicial\n'),v2=Buffer.from('A12 segunda version\n');
  function record(name,ok,detail){results.push({name,ok,detail});check(ok,name+': '+detail);}
  for(const user of team){const r=await c.dav(user,'PROPFIND',work,null,{Depth:'0'});record('Ingreso '+user,r.status===207,r.status);}
  await put(c,team[0],file,v1);let read=await c.dav(team[1],'GET',file);record('Edicion colaborativa entre cuentas',hash(read.bytes)===hash(v1),read.status);
  for(const user of team){const r=await c.dav(user,'PUT',release+'/no-permitido-'+id+'.txt',v1);record('Entrega solo lectura '+user,r.status===403,r.status);}
  const readonly=release+'/control-permisos.txt';await put(c,owner,readonly,v1);
  const deletion=await c.dav(team[0],'DELETE',readonly);record('Eliminar entrega denegado',deletion.status===403,deletion.status);
  const reshare=await c.request(team[0],'POST','/ocs/v2.php/apps/files_sharing/api/v1/shares?format=json',new globalThis.URLSearchParams({path:'/'+work,shareType:'3'}),{'OCS-APIRequest':'true'});
  record('Enlace publico denegado',JSON.parse(reshare.text).ocs.meta.status==='failure',reshare.status);
  for(const user of [null,'prueba-ajena']){const r=user?await c.dav(user,'GET',file):await c.request(null,'GET','/remote.php/dav/files/'+team[0]+'/'+encodeURIComponent(work)+'/Prueba-versiones-'+id+'.txt');record('Acceso denegado '+(user||'anonimo'),[401,403,404].includes(r.status),r.status);}
  const cross=await c.request('prueba-ajena','GET','/remote.php/dav/files/'+team[0]+'/'+encodeURIComponent(work)+'/Prueba-versiones-'+id+'.txt');record('Ruta conocida de otro usuario',cross.status===401||cross.status===403||cross.status===404,cross.status);
  const p=await c.dav(team[0],'PROPFIND',file,'<?xml version="1.0"?><d:propfind xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns"><d:prop><oc:fileid/></d:prop></d:propfind>',{'Content-Type':'application/xml',Depth:'0'});
  const fid=p.text.match(/<(?:\w+:)?fileid>(\d+)<\//)?.[1];check(fid,'No se obtuvo fileid');await c.sleep(3000);await put(c,team[0],file,v2);
  const base='/remote.php/dav/versions/'+team[0]+'/versions/'+fid;
  const list=await c.request(team[0],'PROPFIND',base,null,{Depth:'1'});const hrefs=[...list.text.matchAll(/<(?:\w+:)?href>([^<]+)<\//g)].map(m=>m[1].replace(/&amp;/g,'&'));
  let prior;for(const href of hrefs){if(/\/\d+\/?$/.test(href)&&href.replace(/\/$/,'')!==base){const r=await c.request(team[0],'GET',href);if(r.status===200&&hash(r.bytes)===hash(v1)){prior=href;break;}}}
  check(prior,'No se encuentra version previa: '+list.text.slice(0,600));
  const port=Object.fromEntries(fs.readFileSync(c.envFile,'utf8').split(/\r?\n/).filter(l=>l.includes('=')).map(l=>l.split('='))).NC_PORT;
  const restore=await c.request(team[0],'MOVE',prior,null,{Destination:'http://127.0.0.1:'+port+'/remote.php/dav/versions/'+team[0]+'/restore/'+fid,Overwrite:'T'});
  record('Restaurar version anterior',[201,204].includes(restore.status),restore.status);
  read=await c.dav(team[1],'GET',file);record('Contenido restaurado coincide con V1',hash(read.bytes)===hash(v1),hash(read.bytes));
  const shares=JSON.parse((await c.request(owner,'GET','/ocs/v2.php/apps/files_sharing/api/v1/shares?format=json',null,{'OCS-APIRequest':'true'})).text).ocs.data;
  record('Sin enlaces publicos',!shares.some(s=>Number(s.share_type)===3),'Comparte exclusivamente con convoca-g02');
  record('Permisos de ambas raices',shares.some(s=>s.path==='/'+work&&Number(s.permissions)===15)&&shares.some(s=>s.path==='/'+release&&Number(s.permissions)===1),'Trabajo 15 / Entregas 1');
  c.save('validacion.json',{executedAt:new Date().toISOString(),project:'A12',results,versionTest:{file,fileId:fid,sha256:hash(v1)}});console.log(results.length+' comprobaciones correctas.');
};
