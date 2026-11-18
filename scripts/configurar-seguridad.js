'use strict';
// Vincula la API local con el webhook A14 sin imprimir ni publicar su secreto.
const fs=require('node:fs');
const path=require('node:path');
const dotenv=require('dotenv');
const crypto=require('node:crypto');
const {jwtSecret}=require('../config/security');
const root=path.resolve(__dirname,'..');
const n8nPath=path.join(root,'infra/n8n/.env');
try {
  const option=process.argv[2];
  if(!['--lab','--manual'].includes(option)) throw new Error('Usar --lab (Compose) o --manual (.env de npm start).');
  const target=path.join(root,option==='--lab'?'infra/hia/.env':'.env');
  if(!fs.existsSync(target)||!fs.existsSync(n8nPath)) throw new Error('Preparar primero los .env del laboratorio y n8n. Ver docs/SEGURIDAD_A14.md.');
  const n8n=dotenv.parse(fs.readFileSync(n8nPath));
  if((n8n.N8N_SECURITY_WEBHOOK_TOKEN||'').length<24) throw new Error('Ejecutar node scripts/n8n-lab.js preparar y reimportar los flujos.');
  const replacements={N8N_SECURITY_WEBHOOK_TOKEN:n8n.N8N_SECURITY_WEBHOOK_TOKEN,N8N_SECURITY_WEBHOOK_URL:option==='--lab'?'http://host.docker.internal:5680/webhook/convoca-security-incident':'http://127.0.0.1:5680/webhook/convoca-security-incident'};
  let text=fs.readFileSync(target,'utf8');
  const current=dotenv.parse(text);
  const key=option==='--lab'?'API_JWT_SECRET':'JWT_SECRET';
  try {jwtSecret(current[key]);} catch {replacements[key]=crypto.randomBytes(32).toString('hex');}
  for(const [key,value] of Object.entries(replacements)) {
    const re=new RegExp('^'+key+'=.*$','m');text=re.test(text)?text.replace(re,key+'='+value):text+'\n'+key+'='+value;
  }
  fs.writeFileSync(target,text.trimEnd()+'\n',{mode:0o600});
  console.log('API vinculada al flujo A14. Reiniciar/recrear la API; no se muestran claves.');
} catch(e) {console.error(e.message);process.exitCode=1;}
