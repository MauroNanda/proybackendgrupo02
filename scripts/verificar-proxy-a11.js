'use strict';
// Regresión de infraestructura con backend HTTP mínimo; no simula una prueba del frontend completo.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const prefix='convoca-a11-proxy-test',net=prefix+'-net';
const dir=path.resolve(__dirname,'../infra/mantis/resultados/proxy');fs.mkdirSync(dir,{recursive:true});
const old='server { listen 80; location /api/ { proxy_pass http://api:3000; proxy_connect_timeout 1s; } }';
const modern='server { listen 80; resolver 127.0.0.11 valid=5s ipv6=off; set $api_upstream http://api:3000; location /api/ { proxy_pass $api_upstream; proxy_connect_timeout 1s; } }';
fs.writeFileSync(path.join(dir,'old.conf'),old);fs.writeFileSync(path.join(dir,'new.conf'),modern);
function docker(...args){const r=spawnSync('docker',args,{encoding:'utf8',windowsHide:true});if(r.status!==0)throw new Error('Docker: '+args[0]);return r.stdout.trim();}
const names=[];let created=false;
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function get(port){try{const r=await globalThis.fetch('http://127.0.0.1:'+port+'/api/health',{signal:globalThis.AbortSignal.timeout(5000)});await r.text();return r.status;}catch{return 0;}}
const result={fecha:new Date().toISOString(),tipo:'Regresion Docker DNS con backend HTTP minimo'};
async function main(){
  const existing=spawnSync('docker',['network','inspect',net],{stdio:'ignore'});assert.notEqual(existing.status,0,'La red de ensayo ya existe: no se modifica.');
  docker('network','create',net);created=true;
  const config=JSON.parse(docker('network','inspect',net))[0].IPAM.Config[0];
  const parts=config.Subnet.split('/')[0].split('.');const base=parts.slice(0,3).join('.');
  function backend(name,ip){docker('run','-d','--name',name,'--network',net,'--ip',ip,'--network-alias','api','node:22-bookworm-slim','node','-e',"require('http').createServer((q,s)=>{s.setHeader('content-type','application/json');s.end(JSON.stringify({status:'ok'}))}).listen(3000,'0.0.0.0')");names.push(name);}
  backend(prefix+'-api1',base+'.10');
  for(const [label,port] of [['old',18091],['new',18092]]){
    const name=prefix+'-'+label;
    docker('run','-d','--name',name,'--network',net,'-p','127.0.0.1:'+port+':80','--mount','type=bind,source='+path.join(dir,label+'.conf')+',target=/etc/nginx/conf.d/default.conf,readonly','nginx:1.30.0-alpine');names.push(name);
  }
  await pause(2000);result.antes={anterior:await get(18091),corregido:await get(18092)};assert.equal(result.antes.anterior,200);assert.equal(result.antes.corregido,200);
  docker('stop',prefix+'-api1');docker('network','disconnect',net,prefix+'-api1');
  backend(prefix+'-api2',base+'.11');
  await pause(7000);result.despues={anterior:await get(18091),corregido:await get(18092)};
  assert.ok([502,504].includes(result.despues.anterior));assert.equal(result.despues.corregido,200);result.ok=true;
}
main().catch(e=>{result.ok=false;result.error=e.message;process.exitCode=1;}).finally(()=>{
  for(const name of names.reverse())spawnSync('docker',['rm','-f',name],{stdio:'ignore',windowsHide:true});
  if(created)spawnSync('docker',['network','rm',net],{stdio:'ignore',windowsHide:true});
  fs.writeFileSync(path.join(dir,'../proxy.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
});
