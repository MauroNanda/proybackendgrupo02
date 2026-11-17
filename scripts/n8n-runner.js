'use strict';
// Puente local para n8n (A13). Ejecuta SOLO operaciones permitidas del laboratorio (A4).
// n8n corre dentro de Docker y no puede lanzar comandos de la PC; este servicio escucha
// en 127.0.0.1, exige un token y acepta una lista cerrada de operaciones.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const dotenv = require('dotenv');

const root = path.resolve(__dirname, '..');
const envFile = path.join(root, 'infra', 'n8n', '.env');
const env = fs.existsSync(envFile) ? dotenv.parse(fs.readFileSync(envFile)) : {};
const labRoot = path.resolve(process.env.N8N_LAB_ROOT || env.N8N_LAB_ROOT || root);
const TOKEN = process.env.N8N_RUNNER_TOKEN || env.N8N_RUNNER_TOKEN || '';
const PORT = Number(process.env.N8N_RUNNER_PORT || env.N8N_RUNNER_PORT || 5681);
const HOST = process.env.N8N_RUNNER_HOST || '127.0.0.1';
const PERFILES = ['piloto'];
const OPERACIONES = ['backup', 'restore-test', 'informe'];
const informes = path.join(root, 'infra', 'n8n', 'informes');
const PROM_URL = process.env.N8N_PROMETHEUS_URL || env.N8N_PROMETHEUS_URL || 'http://host.docker.internal:9090';
const backups = path.join(labRoot, 'infra', 'hia', 'backups');
const registro = path.join(root, 'infra', 'n8n', 'runner.log');
let ocupado = false;

if (TOKEN.length < 24) {
  console.error('Falta N8N_RUNNER_TOKEN (24 caracteres o más) en infra/n8n/.env');
  process.exit(1);
}

function responder(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}
function anotar(entrada) {
  fs.appendFileSync(registro, JSON.stringify({ fecha: new Date().toISOString(), ...entrada }) + '\n');
}
function autorizado(req) {
  const m = /^Bearer (.+)$/.exec(req.headers.authorization || '');
  if (!m) return false;
  const hash = (v) => crypto.createHash('sha256').update(v).digest();
  return crypto.timingSafeEqual(hash(m[1]), hash(TOKEN));
}
function leerJson(req) {
  return new Promise((resolve, reject) => {
    let texto = '';
    req.on('data', (d) => {
      texto += d;
      if (texto.length > 2000) { reject(new Error('Cuerpo demasiado grande')); req.destroy(); }
    });
    req.on('end', () => {
      if (!texto) return resolve({});
      try { resolve(JSON.parse(texto)); } catch { reject(new Error('JSON inválido')); }
    });
    req.on('error', reject);
  });
}
function ejecutar(operacion, perfil) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ['infra/hia/lab.js', operacion, '--perfil', perfil], { cwd: labRoot, windowsHide: true });
    let out = '';
    let err = '';
    const limite = setTimeout(() => child.kill(), 10 * 60 * 1000);
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { err += d; });
    child.on('error', (e) => { clearTimeout(limite); resolve({ code: -1, out, err: e.message }); });
    child.on('close', (code) => { clearTimeout(limite); resolve({ code, out, err }); });
  });
}
function ejecutarInforme(simular) {
  // Python corre en un contenedor descartable: sin red de la base, scripts de solo lectura.
  fs.mkdirSync(informes, { recursive: true });
  const args = ['run', '--rm',
    '--read-only', '--cap-drop=ALL', '--security-opt=no-new-privileges', '--pids-limit=64', '--memory=128m', '--cpus=0.5',
    '--mount', 'type=bind,source=' + path.join(root, 'scripts') + ',target=/app,readonly',
    '--mount', 'type=bind,source=' + informes + ',target=/out',
    'python:3.12-alpine', 'python', '/app/informe_metricas.py', '--prom', PROM_URL, '--out', '/out'];
  if (simular) args.push('--simular', simular);
  return new Promise((resolve) => {
    const child = spawn('docker', args, { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    let agotado = false;
    const limite = setTimeout(() => { agotado = true; child.kill(); }, 240000);
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { err += d; });
    child.on('error', (e) => { clearTimeout(limite); resolve({ code: -1, out: JSON.stringify({ ok: false, error: 'No se pudo ejecutar Docker: ' + e.message }), err: e.message }); });
    child.on('close', (code) => {
      clearTimeout(limite);
      if (agotado) out = JSON.stringify({ ok: false, error: 'Tiempo agotado (240 s) ejecutando Python en Docker' });
      resolve({ code, out, err });
    });
  });
}
function verificarCopia(salida) {
  const m = /Copia: (infra\/hia\/backups\/[A-Za-z0-9_.-]+\.dump)/.exec(salida);
  if (!m) return { verificada: false, motivo: 'No se encontró la copia en la salida' };
  const dump = path.join(labRoot, m[1]);
  const base = dump.slice(0, -5);
  const archivo = path.basename(dump);
  if (!fs.existsSync(dump) || !fs.existsSync(base + '.sha256') || !fs.existsSync(base + '.json')) {
    return { verificada: false, archivo, motivo: 'Faltan archivos de la copia' };
  }
  const sha256 = crypto.createHash('sha256').update(fs.readFileSync(dump)).digest('hex');
  const esperado = fs.readFileSync(base + '.sha256', 'utf8').trim();
  const manifiesto = JSON.parse(fs.readFileSync(base + '.json', 'utf8'));
  return {
    verificada: sha256 === esperado && manifiesto.completado === true,
    archivo, sha256, bytes: fs.statSync(dump).size, perfil: manifiesto.perfil,
    usuarios: manifiesto.usuarios, eventos: manifiesto.eventos, inscripciones: manifiesto.inscripciones,
  };
}
function ultimaRestauracion() {
  if (!fs.existsSync(backups)) return null;
  const archivos = fs.readdirSync(backups).filter((n) => n.endsWith('.verified.json'))
    .map((n) => ({ n, t: fs.statSync(path.join(backups, n)).mtimeMs })).sort((a, b) => b.t - a.t);
  if (!archivos.length) return null;
  const datos = JSON.parse(fs.readFileSync(path.join(backups, archivos[0].n), 'utf8'));
  return { copia: archivos[0].n.replace('.verified.json', '.dump'), sha256: datos.sha256, fecha: datos.fecha, resultado: datos.resultado };
}

const server = http.createServer(async (req, res) => {
  try {
    const ruta = (req.url || '').split('?')[0];
    if (req.method === 'GET' && ruta === '/salud') return responder(res, 200, { ok: true });
    if (!autorizado(req)) { anotar({ evento: 'rechazo', motivo: 'token', ruta }); return responder(res, 401, { ok: false, error: 'No autorizado' }); }
    const operacion = ruta.slice(1);
    if (req.method !== 'POST' || !OPERACIONES.includes(operacion)) return responder(res, 404, { ok: false, error: 'Operación no permitida' });
    const cuerpo = await leerJson(req);
    if (!cuerpo || typeof cuerpo !== 'object' || Array.isArray(cuerpo)) return responder(res, 400, { ok: false, error: 'Se requiere un objeto JSON' });
    if (operacion === 'informe') {
      const simular = cuerpo.simular || '';
      const carpeta = String(cuerpo.carpeta || '');
      if (!['', 'incompleto'].includes(simular) || !/^[A-Za-z0-9 _-]{1,40}(\/[A-Za-z0-9 _-]{1,40}){0,3}$/.test(carpeta)) {
        anotar({ evento: 'rechazo', motivo: 'parametros', operacion });
        return responder(res, 400, { ok: false, error: 'Parametros no validos' });
      }
      if (ocupado) return responder(res, 409, { ok: false, error: 'Hay otra operacion en curso' });
      ocupado = true;
      try {
        const inicio = Date.now();
        const r = await ejecutarInforme(simular);
        let datos;
        try { datos = JSON.parse(r.out.trim().split(/\r?\n/).filter((l) => l.startsWith('{')).pop()); } catch { datos = { ok: false, error: 'Salida de Python no valida: ' + (r.err || r.out).slice(-300) }; }
        const resultado = { ...datos, operacion, carpeta, codigo: r.code, segundos: (Date.now() - inicio) / 1000 };
        anotar({ evento: 'ejecucion', operacion, simular, ok: !!resultado.ok, codigo: r.code, error: resultado.error });
        return responder(res, resultado.ok ? 200 : 422, resultado);
      } finally { ocupado = false; }
    }
    const perfil = cuerpo.perfil ?? 'piloto';
    if (!PERFILES.includes(perfil)) { anotar({ evento: 'rechazo', motivo: 'perfil', operacion }); return responder(res, 400, { ok: false, error: 'Perfil no permitido (solo piloto)' }); }
    if (operacion === 'restore-test' && cuerpo.aprobado !== true) {
      anotar({ evento: 'rechazo', motivo: 'sin aprobación', operacion });
      return responder(res, 403, { ok: false, error: 'Se requiere aprobación humana (aprobado: true)' });
    }
    if (ocupado) return responder(res, 409, { ok: false, error: 'Hay otra operación en curso' });
    ocupado = true;
    try {
      const inicio = Date.now();
      const r = await ejecutar(operacion, perfil);
      const cola = (r.out + r.err).slice(-1500);
      let resultado;
      if (operacion === 'backup') {
        const copia = verificarCopia(r.out);
        resultado = { ok: r.code === 0 && copia.verificada, operacion, perfil, codigo: r.code, copia, salida: cola };
      } else {
        const restauracion = ultimaRestauracion();
        const reciente = restauracion && Date.parse(restauracion.fecha) >= inicio;
        resultado = { ok: r.code === 0 && reciente && /Restauración OK/.test(r.out), operacion, perfil, codigo: r.code, restauracion, salida: cola };
      }
      resultado.segundos = (Date.now() - inicio) / 1000;
      anotar({ evento: 'ejecucion', operacion, perfil, ok: resultado.ok, codigo: r.code, segundos: resultado.segundos });
      return responder(res, resultado.ok ? 200 : 500, resultado);
    } finally { ocupado = false; }
  } catch (error) {
    anotar({ evento: 'error', mensaje: error.message });
    return responder(res, 400, { ok: false, error: error.message });
  }
});

server.listen(PORT, HOST, () => console.log(`Puente n8n escuchando en http://${HOST}:${PORT} (operaciones: ${OPERACIONES.join(', ')})`));
