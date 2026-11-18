'use strict';
const { isIP } = require('node:net');
const { URL } = require('node:url');
// Una clave larga y propia evita que cualquiera firme sesiones con el valor de ejemplo.
function jwtSecret(value = process.env.JWT_SECRET) {
  const defaults = new Set(['cambiame-por-un-secreto-largo-y-aleatorio','convoca-dev-secret-inseguro-no-usar-en-prod','generar-una-clave-aleatoria-local']);
  if (!value || value.length < 32 || defaults.has(value)) throw new Error('Configurar JWT_SECRET propio, aleatorio y de al menos 32 caracteres.');
  return value;
}
function trustedProxy(value = process.env.TRUST_PROXY) {
  if (!value || value === 'false') return false;
  const addresses=value.split(',').map(x=>x.trim());
  if(addresses.some(x=>{
    const [ip,mask,...extra]=x.split('/');const version=isIP(ip);
    return !version || extra.length || (mask !== undefined && (!/^\d+$/.test(mask) || Number(mask)<1 || Number(mask)>(version===4?32:128)));
  })) throw new Error('TRUST_PROXY: indicar IP/CIDR de proxies concretos; no true ni numero de saltos.');
  return addresses;
}
function positiveInt(value, fallback, max) {
  if (value === undefined || value === '') return fallback;
  if (!/^\d+$/.test(value) || Number(value)<1 || Number(value)>max) throw new Error('Limite de seguridad fuera de rango.');
  return Number(value);
}
// Se descartan cabeceras de IP si el emisor no es un proxy de confianza.
function forwardedHeaders(req,_res,next) {
  const trust=req.app.get('trust proxy fn');
  if(!trust || !trust(req.socket.remoteAddress,0)) {
    delete req.headers['x-forwarded-for'];
    delete req.headers.forwarded;
  }
  next();
}
function validateSecurityEnv() {
  jwtSecret(); trustedProxy();
  if(process.env.N8N_SECURITY_WEBHOOK_URL) {
    const url=new URL(process.env.N8N_SECURITY_WEBHOOK_URL);
    if(!['http:','https:'].includes(url.protocol) || url.username || url.password) throw new Error('URL del webhook de seguridad invalida.');
    if((process.env.N8N_SECURITY_WEBHOOK_TOKEN||'').length<24) throw new Error('Configurar N8N_SECURITY_WEBHOOK_TOKEN de al menos 24 caracteres.');
  }
}
module.exports={jwtSecret,trustedProxy,positiveInt,validateSecurityEnv,forwardedHeaders};
