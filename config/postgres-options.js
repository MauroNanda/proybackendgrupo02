'use strict';
const { URL } = require('node:url');

// Política compartida por API y CLI; TLS siempre verifica certificados.
function postgresOptions(env = process.env) {
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL es obligatoria.');
  let url;
  try { url = new URL(env.DATABASE_URL); } catch { throw new Error('DATABASE_URL no es válida.'); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('Se requiere PostgreSQL.');
  const local = ['localhost', '127.0.0.1', '[::1]', 'db-principal', 'db-replica'].includes(url.hostname);
  if (env.DB_SSL !== undefined && !['true', 'false'].includes(env.DB_SSL)) throw new Error('DB_SSL debe ser true o false.');
  const enabled = env.DB_SSL === undefined ? !local : env.DB_SSL === 'true';
  if (!local && !enabled) throw new Error('No se permite DB_SSL=false para un destino remoto.');
  const mode = url.searchParams.get('sslmode');
  if (mode && (enabled ? !['require', 'verify-ca', 'verify-full'].includes(mode) : mode !== 'disable')) throw new Error('sslmode contradice DB_SSL.');
  // pg reemplaza el objeto ssl cuando encuentra opciones SSL en la URL.
  for (const key of ['sslcert', 'sslkey', 'sslrootcert', 'ssl']) {
    if (url.searchParams.has(key)) throw new Error(`La opción ${key} requiere configuración explícita de certificados.`);
  }
  url.searchParams.delete('sslmode');
  return { url: url.toString(), dialectOptions: { ssl: enabled ? { rejectUnauthorized: true } : false } };
}
module.exports = { postgresOptions };
