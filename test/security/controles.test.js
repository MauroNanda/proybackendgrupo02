'use strict';
/* global fetch */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const express=require('express');
const jwt=require('jsonwebtoken');
const crypto=require('node:crypto');
process.env.DATABASE_URL ||= 'postgres://validation:example@127.0.0.1/convoca_ci';
process.env.DB_SSL='false';
process.env.JWT_SECRET=crypto.randomBytes(32).toString('hex');
process.env.API_RATE_MAX='4';process.env.API_RATE_WINDOW_MS='1000';
const security=require('../../config/security');
const detector=require('../../middlewares/security-detector.middleware');
async function serve(t,app) {
  const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
  t.after(()=>new Promise(r=>{server.close(r);server.closeAllConnections();}));
  return 'http://127.0.0.1:'+server.address().port;
}
test('JWT rechaza secretos de plantilla y algoritmos distintos de HS256',()=>{
  for(const value of ['corto','cambiame-por-un-secreto-largo-y-aleatorio','convoca-dev-secret-inseguro-no-usar-en-prod']) assert.throws(()=>security.jwtSecret(value));
  const util=require('../../utils/jwt.util');
  const good=util.firmarToken({id:'prueba',rol:'ASISTENTE'});assert.equal(util.verificarToken(good).id,'prueba');
  assert.throws(()=>util.verificarToken(jwt.sign({id:'prueba'},process.env.JWT_SECRET,{algorithm:'HS384'})));
  assert.throws(()=>util.verificarToken(jwt.sign({id:'prueba'},process.env.JWT_SECRET,{expiresIn:-1})));
  assert.throws(()=>util.verificarToken(good.slice(0,-8)+'alterado'));
});
test('proxies solo se habilitan por IP o CIDR explicitos',()=>{
  assert.equal(security.trustedProxy('false'),false);
  assert.deepEqual(security.trustedProxy('192.0.2.4,2001:db8::1/128'),['192.0.2.4','2001:db8::1/128']);
  for(const v of ['true','1','0.0.0.0/0','::/0','192.0.2.1/99'])assert.throws(()=>security.trustedProxy(v));
});
test('analisis acotado detecta claves reservadas y profundidad excesiva',()=>{
  assert.ok(detector.scan(JSON.parse('{"a":{"__proto__":{"polluted":true}}}')).dangerous);
  let deep={};for(let i=0;i<30;i++)deep={a:deep};assert.ok(detector.scan(deep).excessive);
  assert.ok(detector.scan({texto:'union select',otro:'inofensivo'}).suspicious);
  assert.equal({}.polluted,undefined);
});
test('rutas de registro excluyen query, identificadores y endpoints desconocidos',()=>{
  assert.equal(detector.routeForLog({url:'/api/eventos/privado?token=SENTINELA'}),'/api/eventos/:id');
  assert.equal(detector.routeForLog({url:'/reset/SENTINELA'}),'/[ruta-no-reconocida]');
});
test('notificacion limita duplicados y no registra valores sensibles',async()=>{
  const logs=[];const previous=console.warn;console.warn=(...x)=>logs.push(x.join(' '));
  try {
    const event={tipo:'INJECTION_PROBE_DETECTED',ip:'192.0.2.91',ruta:'/api/eventos?token=SENTINELA',detalle:'password=SENTINELA',metodo:'GET'};
    await detector.notificarIncidente(event);const again=await detector.notificarIncidente(event);
    assert.equal(again.estado,'suprimido');assert.equal(logs.length,1);assert.ok(!logs[0].includes('SENTINELA'));
  } finally {console.warn=previous;}
});
test('fallo HTTP del webhook se informa como pendiente sin exponer credenciales',async t=>{
  const app=express();app.post('/rechazo',(_q,r)=>r.sendStatus(403));const url=await serve(t,app);
  const oldUrl=process.env.N8N_SECURITY_WEBHOOK_URL,oldToken=process.env.N8N_SECURITY_WEBHOOK_TOKEN;
  process.env.N8N_SECURITY_WEBHOOK_URL=url+'/rechazo';process.env.N8N_SECURITY_WEBHOOK_TOKEN='token-ficticio-solo-para-regresion';
  try {const r=await detector.notificarIncidente({tipo:'RATE_LIMIT_EXCEEDED',ip:'192.0.2.92',ruta:'/api/eventos'});assert.equal(r.estado,'pendiente');}
  finally {if(oldUrl===undefined)delete process.env.N8N_SECURITY_WEBHOOK_URL;else process.env.N8N_SECURITY_WEBHOOK_URL=oldUrl;if(oldToken===undefined)delete process.env.N8N_SECURITY_WEBHOOK_TOKEN;else process.env.N8N_SECURITY_WEBHOOK_TOKEN=oldToken;}
});
test('rate limit no se evade variando X-Forwarded-For y no bloquea health',async t=>{
  const app=express();app.set('trust proxy',security.trustedProxy('false'));
  app.use(security.forwardedHeaders);
  app.use('/api',require('../../middlewares/rate-limit.middleware').apiLimiter);app.get('/api/dato',(_q,r)=>r.json({ok:true}));app.get('/api/health',(_q,r)=>r.json({ok:true}));
  const url=await serve(t,app);
  for(let i=0;i<4;i++)assert.equal((await fetch(url+'/api/dato',{headers:{'X-Forwarded-For':'192.0.2.'+(i+1)}})).status,200);
  assert.equal((await fetch(url+'/api/dato',{headers:{'X-Forwarded-For':'192.0.2.200'}})).status,429);
  assert.equal((await fetch(url+'/api/health')).status,200);
});
test('Origin protege escrituras con cookies frente a otro sitio',async t=>{
  const app=express();app.use(require('../../middlewares/origin.middleware'));app.post('/cambio',(_q,r)=>r.sendStatus(204));
  const url=await serve(t,app);
  assert.equal((await fetch(url+'/cambio',{method:'POST',headers:{Origin:'https://ajeno.invalid',Cookie:'convoca_token=ficticio'}})).status,403);
  assert.equal((await fetch(url+'/cambio',{method:'POST',headers:{Cookie:'convoca_token=ficticio'}})).status,403);
  assert.equal((await fetch(url+'/cambio',{method:'POST',headers:{Origin:process.env.CORS_ORIGIN||'http://localhost:4200',Cookie:'convoca_token=ficticio'}})).status,204);
});
test('rol asistente no llega al CRUD de usuarios ni al alta de eventos',async t=>{
  const app=express();app.use(express.json());app.use('/api/usuarios',require('../../routes/usuario.routes'));app.use('/api/eventos',require('../../routes/evento.routes'));app.use(require('../../middlewares/error-handler.middleware'));
  const url=await serve(t,app);const token=require('../../utils/jwt.util').firmarToken({id:crypto.randomUUID(),rol:'ASISTENTE'});
  for(const [route,method] of [['/api/usuarios','GET'],['/api/usuarios/'+crypto.randomUUID(),'PUT'],['/api/eventos','POST']]) {
    const r=await fetch(url+route,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(method!=='GET'?{body:'{"rol":"ORGANIZADOR"}'}:{})});assert.equal(r.status,403);
  }
});
test('crear evento ignora id y campos ajenos al contrato',async()=>{
  const {Evento}=require('../../models');const oldCreate=Evento.create,oldFind=Evento.findByPk;let captured;
  Evento.create=async data=>{captured=data;return{id:'seguro',...data};};Evento.findByPk=async()=>({id:'seguro',...captured,estado:'BORRADOR'});
  try {await require('../../services/evento.service').crear({titulo:'Control',estado:'BORRADOR',id:'inyectado',createdAt:'1999-01-01',descripcion:'x'});assert.equal(captured.id,undefined);assert.equal(captured.createdAt,undefined);}
  finally {Evento.create=oldCreate;Evento.findByPk=oldFind;}
});
