'use strict';
/* global fetch, AbortSignal */
const { isIP } = require('node:net');
const dangerousKeys = new Set(['__proto__','constructor','prototype']);
const patterns = [/<\s*script\b/i,/javascript\s*:/i,/\b(union\s+select|drop\s+table|insert\s+into|delete\s+from)\b/i,/'\s*or\s+'?1'?\s*=\s*'?1/i,/\.\.\//];
const descriptions = {
  PROTOTYPE_POLLUTION_ATTEMPT:'Entrada con claves reservadas rechazada.',
  PAYLOAD_COMPLEXITY_EXCEEDED:'Entrada demasiado profunda o compleja rechazada.',
  INJECTION_PROBE_DETECTED:'Patron compatible con sondeo de inyeccion; requiere revision humana.',
  AUTH_BRUTE_FORCE_BURST:'Cinco rechazos de autenticacion/autorizacion en dos minutos.',
  RATE_LIMIT_EXCEEDED:'Umbral de peticiones superado; respuesta HTTP 429.',
};
const failures = new Map();
const recent = new Map();
// Acotar los mapas evita crecimiento ilimitado al recibir muchos origenes distintos.
const MAX_KEYS = 1024;
let inFlight = 0;
let budgetStart = 0;
let sentInWindow = 0;
function boundedSet(map,key,value) {
  if(!map.has(key) && map.size >= MAX_KEYS) map.delete(map.keys().next().value);
  map.set(key,value);
}
function routeForLog(req) {
  const raw = String(req.path || req.url || '').split('?')[0];
  const known = /^(\/api\/(?:auth|eventos|inscripciones|usuarios|categorias|notificaciones|health))(?:\/([^/]+))?/i.exec(raw);
  if(!known) return '/[ruta-no-reconocida]';
  const action=known[2];
  return known[1] + (action ? (['login','registro','perfil','logout','2fa','google'].includes(action) ? '/'+action : '/:id') : '');
}
function scan(value,depth=0,budget={nodes:0}) {
  if(++budget.nodes>2000 || depth>12) return {excessive:true};
  if(typeof value==='string') return {suspicious:patterns.some(p=>p.test(value))};
  if(!value || typeof value!=='object') return {};
  const result={};
  for(const key of Object.keys(value)) {
    if(dangerousKeys.has(key)) result.dangerous=true;
    const nested=scan(value[key],depth+1,budget);
    for(const flag of ['dangerous','suspicious','excessive']) if(nested[flag]) result[flag]=true;
    if(result.excessive) break;
  }
  return result;
}
async function notificarIncidente(alerta) {
  const tipo=Object.hasOwn(descriptions,alerta.tipo) ? alerta.tipo : 'INJECTION_PROBE_DETECTED';
  const ip=isIP(alerta.ip||'') ? alerta.ip : 'desconocida';
  const ruta=routeForLog({path:alerta.ruta});
  const key=tipo+':'+ip+':'+ruta;
  const now=Date.now();
  if(now-(recent.get(key)||0)<60000) return {estado:'suprimido'};
  boundedSet(recent,key,now);
  if(now-budgetStart>=60000) {budgetStart=now;sentInWindow=0;}
  if(inFlight>=4 || sentInWindow>=20) return {estado:'limite-de-avisos'};
  sentInWindow++;
  const payload={servicio:'convoca-backend',entorno:process.env.NODE_ENV==='production'?'production':'development',timestamp:new Date(now).toISOString(),tipo,severidad:['alta','critica','media','baja'].includes(alerta.severidad)?alerta.severidad:'media',ip,ruta,metodo:['GET','POST','PUT','PATCH','DELETE','HEAD','OPTIONS'].includes(alerta.metodo)?alerta.metodo:'HTTP',statusCode:Number.isInteger(alerta.statusCode)?alerta.statusCode:400,detalle:descriptions[tipo]};
  console.warn('[SECURITY_ALERT]',JSON.stringify(payload));
  const url=process.env.N8N_SECURITY_WEBHOOK_URL;
  const token=process.env.N8N_SECURITY_WEBHOOK_TOKEN;
  if(!url || !token) return {estado:'solo-log-local'};
  inFlight++;
  try {
    const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','X-A14-Token':token},body:JSON.stringify(payload),signal:AbortSignal.timeout(3000),redirect:'error'});
    // HTTP 403/500 no lanza una excepcion en fetch: tambien cuenta como envio fallido.
    if(!response.ok) {console.error('[SECURITY_DELIVERY]',JSON.stringify({tipo,estado:'pendiente',http:response.status}));return {estado:'pendiente'};}
    return {estado:'aceptado-por-webhook'};
  } catch {
    console.error('[SECURITY_DELIVERY]',JSON.stringify({tipo,estado:'pendiente',motivo:'conexion-o-timeout'}));
    return {estado:'pendiente'};
  } finally {inFlight--;}
}
function registrarFallo(req,res) {
  const ip=req.ip || req.socket?.remoteAddress || '';
  const now=Date.now();
  const previous=failures.get(ip);
  const record=previous && now-previous.start<120000 ? previous : {start:now,count:0};
  record.count++; boundedSet(failures,ip,record);
  if(record.count===5) void notificarIncidente({tipo:'AUTH_BRUTE_FORCE_BURST',severidad:'alta',ip,ruta:routeForLog(req),metodo:req.method,statusCode:res.statusCode});
}
function securityDetector(req,res,next) {
  const result=scan([req.body,req.query]);
  const info={ip:req.ip || req.socket?.remoteAddress || '',ruta:routeForLog(req),metodo:req.method};
  if(result.dangerous || result.excessive) {
    void notificarIncidente({...info,tipo:result.dangerous?'PROTOTYPE_POLLUTION_ATTEMPT':'PAYLOAD_COMPLEXITY_EXCEEDED',severidad:'alta',statusCode:400});
    return res.status(400).json({error:{message:'Carga util rechazada por politica de seguridad.'}});
  }
  // Un patron es una senal para investigar; por si solo no demuestra una inyeccion.
  if(result.suspicious) void notificarIncidente({...info,tipo:'INJECTION_PROBE_DETECTED',severidad:'media',statusCode:400});
  res.on('finish',()=>{if([401,403].includes(res.statusCode)) registrarFallo(req,res);});
  next();
}
module.exports={securityDetector,notificarIncidente,routeForLog,scan};
