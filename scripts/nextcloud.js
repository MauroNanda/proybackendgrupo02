'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'infra/nextcloud');
const envFile=process.env.NC_ENV_FILE?path.resolve(process.env.NC_ENV_FILE):path.join(dir,'.env');
const command=process.argv[2];
const users={'archivo-convoca':'OWNER','mauro-nanda':'MAURO','gabriel-calisaya':'GABRIEL',
  'juan-carrizo':'JUAN','delia-cusipuma':'DELIA','dumbi34':'DUMBI','prueba-ajena':'OUTSIDER'};
function env(){return Object.fromEntries(fs.readFileSync(envFile,'utf8').split(/\r?\n/).filter(l=>/^[A-Z_]+=/.test(l)).map(l=>{const i=l.indexOf('=');return [l.slice(0,i),l.slice(i+1).trim()];}));}
function compose(args,{capture=false,input}={}){
  const r=spawnSync('docker',['compose','--env-file',envFile,'-f',path.join(dir,'compose.yaml'),...args],{
    cwd:root,encoding:'utf8',windowsHide:true,input,stdio:input||capture?'pipe':'inherit',maxBuffer:256*1024*1024});
  if(r.status!==0){let msg=(r.error?.message||r.stderr||'El comando Docker fallo; revisar el servicio sin imprimir datos privados.').slice(-1500);for(const v of Object.values(env()))if(v.length>16)msg=msg.split(v).join('[redactado]');throw new Error(msg);}
  return r.stdout;
}
function occ(args){return compose(['exec','-T','--user','www-data','app','php','occ',...args],{capture:true});}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function save(name,value){const out=path.join(dir,'resultados');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,name),JSON.stringify(value,null,2)+'\n');}
async function request(user,method,route,body,extra={}){
  const cfg=env(),password=user==='admin-convoca'?cfg.NC_ADMIN_PASSWORD:cfg['NC_'+users[user]+'_PASSWORD'];
  const headers={'Accept-Encoding':'identity',...extra};if(user)headers.Authorization='Basic '+Buffer.from(user+':'+password).toString('base64');
  for(let attempt=0;attempt<2;attempt++){
    try{
      const response=await globalThis.fetch('http://127.0.0.1:'+cfg.NC_PORT+route,{method,headers,body,redirect:'manual',signal:globalThis.AbortSignal.timeout(60000)});
      const bytes=Buffer.from(await response.arrayBuffer());return {status:response.status,bytes,text:bytes.toString(),headers:response.headers};
    }catch(error){
      if(attempt===0&&['GET','PROPFIND'].includes(method)){await sleep(500);continue;}
      throw new Error('Fallo de conexion '+method+' ('+(error.cause?.code||error.name)+'). Revisar Nextcloud y repetir el comando; no se reintentan escrituras a ciegas.');
    }
  }
}
function dav(user,method,file,body,headers){return request(user,method,'/remote.php/dav/files/'+encodeURIComponent(user)+'/'+file.split('/').map(encodeURIComponent).join('/'),body,headers);}
async function mk(user,p){const r=await dav(user,'MKCOL',p);if(![201,405].includes(r.status))throw new Error('MKCOL '+p+': '+r.status);}
async function share(folder,permissions){
  const base='/ocs/v2.php/apps/files_sharing/api/v1/shares?format=json';
  const r=await request('archivo-convoca','GET',base,null,{'OCS-APIRequest':'true'});const d=JSON.parse(r.text);
  if(d.ocs.data.some(s=>s.path==='/'+folder&&s.share_with==='convoca-g02'&&Number(s.permissions)===permissions))return;
  const body=new URLSearchParams({path:'/'+folder,shareType:'1',shareWith:'convoca-g02',permissions:String(permissions)});
  const x=await request('archivo-convoca','POST',base,body,{'OCS-APIRequest':'true'});const j=JSON.parse(x.text);
  if(j.ocs.meta.status!=='ok')throw new Error('No se pudo compartir '+folder);
}
async function main(){
  if(!['up','sync','validate','stop','backup','restore-test','public-url'].includes(command))throw new Error('Usar up, sync, validate, stop, backup, restore-test o public-url.');
  if(command==='restore-test'){await require('./nextcloud-respaldo').run(command,{root,dir,envFile,save,compose,occ,env});return;}
  if(command==='up'&&!fs.existsSync(envFile))fs.writeFileSync(envFile,fs.readFileSync(path.join(dir,'.env.example'),'utf8').replace(/generar-localmente/g,()=>crypto.randomBytes(24).toString('hex')),{mode:0o600,flag:'wx'});
  const cfg=env();if(!/^convoca-nextcloud-a12(?:-[a-z0-9]+)?$/.test(cfg.COMPOSE_PROJECT_NAME))throw new Error('Proyecto no autorizado.');
  for(const [key,value]of Object.entries(cfg))if(key.endsWith('_PASSWORD')&&!/^[a-f0-9]{32,}$/.test(value))throw new Error('Configurar clave local '+key);
  if(command==='stop'){compose(['stop']);return;}
  if(command==='public-url'){
    const url=new URL(process.argv[3]);if(url.protocol!=='https:'||!url.hostname.endsWith('.trycloudflare.com')||url.username||url.password||url.pathname!=='/')throw new Error('Indicar URL HTTPS temporal de Cloudflare, sin credenciales ni ruta.');
    const r=spawnSync('docker',['network','inspect',cfg.COMPOSE_PROJECT_NAME+'_default','--format','{{(index .IPAM.Config 0).Gateway}}'],{encoding:'utf8',windowsHide:true});
    if(r.status!==0)throw new Error('No se pudo identificar gateway del proxy');
    occ(['config:system:set','trusted_domains','2','--value='+url.hostname]);
    occ(['config:system:set','trusted_proxies','0','--value='+r.stdout.trim()]);
    save('acceso-compartido.json',{url:url.origin,temporary:true,requiresLogin:true});console.log('Acceso HTTPS configurado: '+url.origin);return;
  }
  if(command==='up'){
    compose(['up','-d','--wait']);let installed=false;
    for(let i=0;i<100;i++){await sleep(3000);try{const s=JSON.parse(occ(['status','--output=json']));if(s.installed&&!s.maintenance){installed=true;break;}}catch{/* instalador en curso */}}
    if(!installed)throw new Error('La instalación no terminó; conservar volúmenes y revisar logs.');
    const r=compose(['exec','-T','--user','www-data','app','php','/opt/a12/bootstrap.php'],{capture:true});save('bootstrap.json',JSON.parse(r));
    occ(['app:disable','firstrunwizard']);
    for(const folder of ['Convoca - Trabajo','Convoca - Entregas'])await mk('archivo-convoca',folder);
    for(const folder of ['Informe','Evidencias','Configuraciones','Manuales'])await mk('archivo-convoca','Convoca - Trabajo/'+folder);
    await share('Convoca - Trabajo',15);await share('Convoca - Entregas',1);
    console.log('Nextcloud: http://localhost:'+cfg.NC_PORT+' | claves en '+path.relative(root,envFile));
  }
  if(command==='sync')await require('./nextcloud-documentos').sync({root,dir,envFile,save,dav,mk,request});
  if(command==='validate')await require('./nextcloud-documentos').validate({root,dir,envFile,save,dav,mk,request,occ,sleep});
  if(command==='backup')await require('./nextcloud-respaldo').run(command,{root,dir,envFile,save,compose,occ,env});
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
