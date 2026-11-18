'use strict';
const { URL }=require('node:url');
// CORS regula lectura en el navegador; este control rechaza escrituras cross-site.
module.exports=function originGuard(req,res,next) {
  if(['GET','HEAD','OPTIONS'].includes(req.method)) return next();
  const origin=req.get('origin');
  const hasCookie=/(?:^|;\s*)convoca_token=/.test(req.headers.cookie || '');
  const source=origin || (hasCookie?req.get('referer'):undefined);
  if(!source && !hasCookie) return next(); // Clientes API sin cookies: Bearer u otro mecanismo.
  try {
    const expected=new URL(process.env.CORS_ORIGIN || 'http://localhost:4200').origin;
    if(new URL(source).origin===expected) return next();
  } catch { /* origen ausente, nulo o invalido */ }
  return res.status(403).json({error:{message:'Origen no permitido para esta operacion.'}});
};
