'use strict';
// Validación real; la interrupción requiere --falla-controlada y restaura servicios en finally.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'infra/hia/resultados', new Date().toISOString().replace(/[:.]/g, '-') + '-monitoreo');
fs.mkdirSync(output, { recursive: true });
const record = { inicio: new Date().toISOString(), fases: {} };
const api = process.env.MONITOR_API_CONTAINER || 'convoca-publicacion-api-api-1';
let db;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
function docker(args) { return execFileSync('docker', args, { cwd: root, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim(); }
async function get(url, options = {}) {
  const res = await globalThis.fetch(url, { ...options, signal: globalThis.AbortSignal.timeout(20000) });
  return { status: res.status, body: await res.json() };
}
async function query(expr) {
  const r = await get('http://127.0.0.1:9090/api/v1/query?query=' + encodeURIComponent(expr));
  if (r.body.status !== 'success') throw new Error('Error PromQL: ' + expr);
  return r.body.data.result;
}
async function waitFor(label, check, timeout = 180000) {
  const start = Date.now();
  let last;
  while (Date.now() - start < timeout) {
    try { last = await check(); if (last) return last; } catch (err) { last = err.message; }
    await pause(3000);
  }
  throw new Error('Tiempo agotado: ' + label + ' (' + JSON.stringify(last) + ')');
}
async function snapshot() {
  return {
    health: await get('http://127.0.0.1:8080/api/health'),
    targets: (await get('http://127.0.0.1:9090/api/v1/targets')).body.data.activeTargets.map(t => ({ job: t.labels.job, health: t.health, error: t.lastError })),
    alerts: (await get('http://127.0.0.1:9090/api/v1/alerts')).body.data.alerts,
    api: await query('probe_success{job="api-health"}'),
    postgres: await query('pg_up'),
    docker: await query('convoca_container_running'),
  };
}
async function main() {
  const env = Object.fromEntries(fs.readFileSync(path.join(root, 'infra/hia/.env'), 'utf8').split(/\r?\n/).filter(l => /^[A-Z_]+=/.test(l)).map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }));
  const base = ['compose', '--env-file', 'infra/hia/.env', '-f', 'infra/hia/docker-compose.yml', '--profile', 'monitoreo'];
  db = docker([...base, 'ps', '-q', 'db-principal']);
  if (!db || !api.startsWith('convoca-')) throw new Error('Destino local de prueba inválido');
  await waitFor('servicios disponibles', async () => {
    const s = await snapshot();
    return s.health.status === 200 && s.health.body.database === 'up' && s.targets.length === 5 && s.targets.every(t => t.health === 'up') && s.api[0]?.value[1] === '1' && s.postgres[0]?.value[1] === '1';
  });
  record.fases.normal = await snapshot();
  const auth = 'Basic ' + Buffer.from('admin:' + env.GRAFANA_ADMIN_PASSWORD).toString('base64');
  const dash = await get('http://127.0.0.1:3001/api/dashboards/uid/convoca-a10', { headers: { Authorization: auth } });
  if (dash.status !== 200) throw new Error('Dashboard no disponible');
  record.dashboard = { uid: dash.body.dashboard.uid, paneles: [] };
  for (const panel of dash.body.dashboard.panels) {
    const results = await query(panel.targets[0].expr);
    record.dashboard.paneles.push({ titulo: panel.title, series: results.length });
    if (!results.length && !panel.title.includes('solo si hay réplica')) throw new Error('Panel sin datos: ' + panel.title);
  }
  const errors = await query('pg_exporter_last_scrape_error');
  if (errors.some(s => s.value[1] !== '0')) throw new Error('Exportador PostgreSQL reporta error');
  const age = await query('time() - convoca_docker_collection_timestamp_seconds');
  if (!age.length || Number(age[0].value[1]) > 45) throw new Error('Recolector de estado Docker sin muestra reciente');
  record.rol = docker(['exec', db, 'psql', '-X', '-U', env.POSTGRES_USER, '-d', 'postgres', '-Atc', "SELECT rolsuper::text || ',' || rolcreatedb::text FROM pg_roles WHERE rolname='convoca_monitor'"]);
  if (record.rol !== 'false,false') throw new Error('Rol de monitoreo con privilegios inesperados');
  console.log('NORMAL: API, base, cinco targets y dashboard comprobados.');
  if (process.argv.includes('--falla-controlada')) {
    try {
      console.log('FALLA BD: deteniendo únicamente el principal de laboratorio.');
      docker(['stop', db]);
      await waitFor('health 503 con base caída', async () => (await get('http://127.0.0.1:8080/api/health')).status === 503);
      await waitFor('alertas firing', async () => {
        const a = (await get('http://127.0.0.1:9090/api/v1/alerts')).body.data.alerts;
        return ['ConvocaApiNoDisponible', 'ConvocaPostgresNoDisponible'].every(n => a.some(v => v.labels.alertname === n && v.state === 'firing'));
      });
      record.fases.base_caida = await snapshot();
      if (!record.fases.base_caida.docker.some(v => v.metric.name.includes('db-principal') && v.value[1] === '0')) throw new Error('Estado Docker no detectó caída de base');
      console.log('FALLA BD: health 503 y ambas alertas FIRING comprobados.');
    } finally { docker(['start', db]); }
    await waitFor('recuperación BD y alertas', async () => {
      const s = await snapshot();
      return s.health.status === 200 && s.api[0]?.value[1] === '1' && s.postgres[0]?.value[1] === '1' && !s.alerts.some(a => ['ConvocaApiNoDisponible', 'ConvocaPostgresNoDisponible'].includes(a.labels.alertname));
    });
    record.fases.base_recuperada = await snapshot();
    console.log('RECUPERACIÓN BD: datos disponibles y alertas resueltas.');
    try {
      docker(['stop', api]);
      await waitFor('alerta API', async () => (await get('http://127.0.0.1:9090/api/v1/alerts')).body.data.alerts.some(a => a.labels.alertname === 'ConvocaApiNoDisponible' && a.state === 'firing'));
      record.fases.api_caida = { alerts: (await get('http://127.0.0.1:9090/api/v1/alerts')).body.data.alerts, postgres: await query('pg_up'), docker: await query('convoca_container_running') };
      if (!record.fases.api_caida.docker.some(v => v.metric.name === api && v.value[1] === '0')) throw new Error('Estado Docker no detectó caída de API');
      console.log('FALLA API: alerta FIRING; PostgreSQL sigue disponible.');
    } finally { docker(['start', api]); }
    await waitFor('recuperación API y proxy', async () => {
      const s = await snapshot();
      return s.health.status === 200 && s.api[0]?.value[1] === '1' && !s.alerts.some(a => a.labels.alertname === 'ConvocaApiNoDisponible');
    });
    record.fases.final = await snapshot();
    console.log('RECUPERACIÓN API: Nginx recuperado sin reiniciar frontend.');
  }
  record.ok = true;
}
main().catch(err => { record.ok = false; record.error = err.message; console.error(err.message); process.exitCode = 1; }).finally(() => {
  record.fin = new Date().toISOString();
  fs.writeFileSync(path.join(output, 'validacion.json'), JSON.stringify(record, null, 2));
  console.log('Resultado:', path.relative(root, output));
});
