'use strict';
/* global fetch */
// Configuracion reproducible; secretos solo en .env y en credenciales cifradas de n8n.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const dotenv = require('dotenv');
const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'infra/n8n');
const envPath = path.join(dir, '.env');
function docker(args, capture = false) {
  const r = spawnSync('docker', args, { cwd: root, encoding: 'utf8', windowsHide: true, stdio: capture ? 'pipe' : 'inherit' });
  if (r.status !== 0) throw new Error('Fallo Docker: ' + (r.stderr || 'ver salida anterior'));
  return (r.stdout || '').trim();
}
function compose(args, capture = false) {
  return docker(['compose','--env-file',envPath,'-f',path.join(dir,'compose.yaml'),...args], capture);
}
function read(file) { return fs.existsSync(file) ? dotenv.parse(fs.readFileSync(file)) : {}; }
async function main() {
  const command = process.argv[2];
  if (!['preparar','up','stop','importar'].includes(command)) throw new Error('Usar preparar, up, importar o stop.');
  const env = read(envPath);
  if (command === 'preparar') {
    for (const key of ['N8N_ENCRYPTION_KEY','N8N_RUNNER_TOKEN','N8N_WEBHOOK_TOKEN','N8N_ADMIN_PASSWORD']) {
      if (!env[key] || env[key] === 'generar-localmente') env[key] = (key === 'N8N_ADMIN_PASSWORD' ? 'A13!' : '') + crypto.randomBytes(24).toString('hex');
    }
    const nc = read(path.join(root,'infra/nextcloud/.env'));
    env.NEXTCLOUD_USER ||= 'usuario4';
    env.NEXTCLOUD_PASSWORD ||= nc.NC_USER4_PASSWORD;
    env.N8N_RUNNER_PORT ||= '5681';
    env.N8N_PROMETHEUS_URL ||= 'http://host.docker.internal:9090';
    if (!env.MANTIS_API_TOKEN || env.MANTIS_API_TOKEN === 'completar-localmente') {
      const me = read(path.join(root,'infra/mantis/.env'));
      if (!me.COMPOSE_PROJECT_NAME) throw new Error('Preparar infra/mantis/.env y levantar A11 primero.');
      const container = me.COMPOSE_PROJECT_NAME + '-mantis-1';
      docker(['cp',path.join(root,'infra/mantis/a13-token.php'),container+':/tmp/a13-token.php']);
      env.MANTIS_API_TOKEN = docker(['exec',container,'php','/tmp/a13-token.php'], true);
      if (!/^[A-Za-z0-9_-]{20,}$/.test(env.MANTIS_API_TOKEN)) throw new Error('Mantis no genero un token valido.');
    }
    if (!env.NEXTCLOUD_PASSWORD || env.NEXTCLOUD_PASSWORD === 'completar-localmente') throw new Error('Completar NEXTCLOUD_PASSWORD en infra/n8n/.env (cuenta usuario4 de A12).');
    fs.writeFileSync(envPath,Object.entries(env).map(([k,v])=>k+'='+v).join('\n')+'\n',{mode:0o600});
    console.log('Preparacion local completa. Credenciales guardadas sin mostrarlas.');
    return;
  }
  if (!env.N8N_ENCRYPTION_KEY || env.N8N_ENCRYPTION_KEY.length < 24) throw new Error('Ejecutar primero preparar.');
  if (command === 'stop') { compose(['stop']); return; }
  if (command === 'up') compose(['up','-d']);
  const c = compose(['ps','-q','n8n'],true);
  if (!c) throw new Error('Iniciar n8n primero.');
  let ready = false;
  for (let i=0;i<60;i++) {
    try {
      const response=await fetch('http://127.0.0.1:5680/rest/settings');
      if (response.ok && (await response.json()).data?.userManagement) { ready=true; break; }
    } catch { /* esperando rutas administrativas */ }
    await new Promise(r=>setTimeout(r,1000));
  }
  if (!ready) throw new Error('n8n no inicio en 60 segundos.');
  const me = read(path.join(root,'infra/mantis/.env'));
  const container = (me.COMPOSE_PROJECT_NAME || 'convoca-mantis-a11') + '-mantis-1';
  const nets = JSON.parse(docker(['inspect',container,'--format','{{json .NetworkSettings.Networks}}'],true));
  if (!nets['convoca-a13-interna']) docker(['network','connect','--ip','192.168.241.11','--alias','mantis','convoca-a13-interna',container]);
  const hash = crypto.createHash('sha256');
  for (const name of fs.readdirSync(path.join(dir,'flujos')).sort()) hash.update(fs.readFileSync(path.join(dir,'flujos',name)));
  const fingerprint = hash.digest('hex');
  const marker = path.join(dir,'resultados/importacion.json');
  if (command === 'up' && fs.existsSync(marker) && JSON.parse(fs.readFileSync(marker)).sha256 === fingerprint) {
    console.log('n8n ya configurado: se conserva el estado de incidencias y las credenciales.');
    return;
  }
  // La API de alta inicial queda inutilizable una vez creado el propietario.
  const settings = await (await fetch('http://127.0.0.1:5680/rest/settings')).json();
  if (settings.data?.userManagement?.showSetupOnFirstLoad) {
    const setup = await fetch('http://127.0.0.1:5680/rest/owner/setup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'admin@convoca.local',firstName:'Convoca',lastName:'G02',password:env.N8N_ADMIN_PASSWORD})});
    if (!setup.ok) throw new Error('No se pudo preparar el propietario n8n: HTTP '+setup.status);
  }
  const credentials = [
    {id:'a13Webhook',name:'A13 entrada protegida',type:'httpHeaderAuth',data:{name:'X-A13-Token',value:env.N8N_WEBHOOK_TOKEN}},
    {id:'a13Puente',name:'A13 puente local',type:'httpHeaderAuth',data:{name:'Authorization',value:'Bearer '+env.N8N_RUNNER_TOKEN}},
    {id:'a13Mantis',name:'A13 Mantis proyecto',type:'httpHeaderAuth',data:{name:'Authorization',value:env.MANTIS_API_TOKEN}},
    {id:'a13Nextcloud',name:'A13 Nextcloud usuario4',type:'httpBasicAuth',data:{user:env.NEXTCLOUD_USER,password:env.NEXTCLOUD_PASSWORD}},
    {id:'a13Correo',name:'A13 correo local',type:'smtp',data:{host:'correo',port:1025,secure:false,disableStartTls:true}},
  ];
  const privateDir = path.join(dir,'privado'); fs.mkdirSync(privateDir,{recursive:true});
  const file = path.join(privateDir,'credenciales.json');
  try {
    fs.writeFileSync(file,JSON.stringify(credentials),{mode:0o600});
    compose(['exec','-T','n8n','n8n','import:credentials','--input=/privado/credenciales.json']);
  } finally { if (fs.existsSync(file)) fs.unlinkSync(file); }
  const login = await fetch('http://127.0.0.1:5680/rest/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({emailOrLdapLoginId:'admin@convoca.local',password:env.N8N_ADMIN_PASSWORD})});
  if (!login.ok) throw new Error('No se pudo iniciar sesion; no se sobrescriben flujos existentes.');
  const cookie = login.headers.getSetCookie().map(x=>x.split(';')[0]).join('; ');
  const runtimeExports=path.join(privateDir,'flujos'); fs.mkdirSync(runtimeExports,{recursive:true});
  try {
    for (const name of fs.readdirSync(path.join(dir,'flujos'))) {
      const flow=JSON.parse(fs.readFileSync(path.join(dir,'flujos',name)));
      const existing=await fetch('http://127.0.0.1:5680/rest/workflows/'+flow.id,{headers:{Cookie:cookie}});
      if(existing.ok) flow.staticData=(await existing.json()).data.staticData;
      else if(existing.status!==404) throw new Error('No se pudo leer el estado del flujo '+flow.id);
      fs.writeFileSync(path.join(runtimeExports,name),JSON.stringify(flow),{mode:0o600});
    }
    compose(['exec','-T','n8n','n8n','import:workflow','--separate','--input=/privado/flujos']);
  } finally {
    for(const name of fs.readdirSync(runtimeExports)) fs.unlinkSync(path.join(runtimeExports,name));
  }
  for (const id of ['a13Flujo1','a13Flujo2','a13Flujo3']) compose(['exec','-T','n8n','n8n','publish:workflow','--id='+id]);
  compose(['restart','n8n']);
  fs.mkdirSync(path.dirname(marker),{recursive:true});
  fs.writeFileSync(marker,JSON.stringify({sha256:fingerprint,fecha:new Date().toISOString()}));
  console.log('n8n: http://localhost:5680 | correo local: http://localhost:8028');
  console.log('Administrador: admin@convoca.local; clave N8N_ADMIN_PASSWORD en infra/n8n/.env.');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
