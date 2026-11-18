/* global fetch, AbortSignal */
// Middleware de detección temprana de anomalías e incidentes de seguridad.
// Emite logs estructurados y notifica al webhook de respuesta automática (n8n).

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const SUSPICIOUS_PATTERNS = [
  /<\s*script\b/i,
  /javascript\s*:/i,
  /\b(union\s+select|drop\s+table|insert\s+into|delete\s+from)\b/i,
  /('\s*or\s+'?1'?\s*=\s*'?1)/i,
  /\.\.\//,
];

// Ventana en memoria para detectar ráfagas de fallos de autenticación por IP.
const authFailuresByIp = new Map();
const AUTH_WINDOW_MS = 2 * 60 * 1000;
const AUTH_THRESHOLD = 5;

function obtenerIpCliente(req) {
  return req.ip || req.socket?.remoteAddress || 'desconocida';
}

function contieneClavePeligrosa(value, depth = 0) {
  if (!value || typeof value !== 'object' || depth > 6) {
    return false;
  }
  if (Array.isArray(value)) {
    return value.some((item) => contieneClavePeligrosa(item, depth + 1));
  }
  for (const key of Object.keys(value)) {
    if (DANGEROUS_KEYS.has(key) || contieneClavePeligrosa(value[key], depth + 1)) {
      return true;
    }
  }
  return false;
}

function contienePatronSospechoso(value, depth = 0) {
  if (depth > 6 || value === null || value === undefined) {
    return false;
  }
  if (typeof value === 'string') {
    return SUSPICIOUS_PATTERNS.some((regex) => regex.test(value));
  }
  if (Array.isArray(value)) {
    return value.some((item) => contienePatronSospechoso(item, depth + 1));
  }
  if (typeof value === 'object') {
    return Object.values(value).some((val) => contienePatronSospechoso(val, depth + 1));
  }
  return false;
}

async function notificarIncidente(alerta) {
  const payload = {
    servicio: 'convoca-backend',
    entorno: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    ...alerta,
  };

  console.warn('[SECURITY_ALERT]', JSON.stringify(payload));

  const webhookUrl = process.env.N8N_SECURITY_WEBHOOK_URL;
  if (!webhookUrl) {
    return;
  }

  const headers = { 'Content-Type': 'application/json' };
  if (process.env.N8N_SECURITY_WEBHOOK_TOKEN) {
    headers['X-A13-Token'] = process.env.N8N_SECURITY_WEBHOOK_TOKEN;
  }

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(3000),
    });
  } catch (err) {
    console.error('[SECURITY_ALERT] Error enviando evento a n8n:', err.message);
  }
}

function registrarFalloAuth(ip, ruta, statusCode) {
  const ahora = Date.now();
  const historial = (authFailuresByIp.get(ip) || []).filter(
    (ts) => ahora - ts < AUTH_WINDOW_MS
  );
  historial.push(ahora);
  authFailuresByIp.set(ip, historial);

  if (historial.length === AUTH_THRESHOLD) {
    void notificarIncidente({
      tipo: 'AUTH_BRUTE_FORCE_BURST',
      severidad: 'alta',
      ip,
      ruta,
      statusCode,
      detalle: `Se detectaron ${historial.length} respuestas ${statusCode} en menos de 2 minutos desde la misma IP.`,
    });
  }
}

function securityDetector(req, res, next) {
  const ip = obtenerIpCliente(req);
  const ruta = req.originalUrl || req.url;

  if (
    contieneClavePeligrosa(req.body) ||
    contieneClavePeligrosa(req.query) ||
    contieneClavePeligrosa(req.params)
  ) {
    void notificarIncidente({
      tipo: 'PROTOTYPE_POLLUTION_ATTEMPT',
      severidad: 'alta',
      ip,
      metodo: req.method,
      ruta,
      detalle: 'Payload rechazado por contener claves reservadas (__proto__, constructor o prototype).',
    });
    return res.status(400).json({
      error: { message: 'Carga útil rechazada por política de seguridad.' },
    });
  }

  if (
    contienePatronSospechoso(req.body) ||
    contienePatronSospechoso(req.query) ||
    contienePatronSospechoso(req.params)
  ) {
    void notificarIncidente({
      tipo: 'INJECTION_PROBE_DETECTED',
      severidad: 'media',
      ip,
      metodo: req.method,
      ruta,
      detalle: 'Se detectaron patrones sospechosos de XSS, SQLi o Path Traversal en la petición.',
    });
  }

  res.on('finish', () => {
    if (res.statusCode === 401 || res.statusCode === 403) {
      registrarFalloAuth(ip, ruta, res.statusCode);
    }
  });

  return next();
}

module.exports = {
  securityDetector,
  notificarIncidente,
};