const { JWT_EXPIRES_IN } = require('./jwt.util');

const isProd = process.env.NODE_ENV === 'production';
const COOKIE_NAME = 'convoca_token';

// Convierte el formato de expiración del JWT ('24h', '7d', '30m') a milisegundos
// para que la cookie muera junto con el token (evita cookie viva con JWT vencido).
function expiresInMs(str) {
  const match = /^(\d+)([smhd])$/.exec(str);
  if (!match) return 24 * 60 * 60 * 1000; // fallback: 24h
  const factor = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return Number(match[1]) * factor[match[2]];
}

// Flags únicos para setear y borrar (clearCookie exige los mismos flags).
// httpOnly → el JS del front NO puede leerla (XSS no roba el token).
// sameSite lax → localhost:4200 ↔ :3000 es same-site (el puerto no cuenta).
// secure → solo en prod (en dev es http). path /api → solo viaja a la API.
const opcionesBase = {
  httpOnly: true,
  sameSite: 'lax',
  secure: isProd,
  path: '/api',
};

function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, { ...opcionesBase, maxAge: expiresInMs(JWT_EXPIRES_IN) });
}

function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, opcionesBase);
}

// Lee una cookie puntual del header (evita sumar cookie-parser solo para esto).
function leerCookie(req, nombre) {
  const raw = req.headers.cookie;
  if (!raw) return null;
  const par = raw.split(';').map((c) => c.trim()).find((c) => c.startsWith(`${nombre}=`));
  return par ? decodeURIComponent(par.slice(nombre.length + 1)) : null;
}

module.exports = { COOKIE_NAME, setAuthCookie, clearAuthCookie, leerCookie };
