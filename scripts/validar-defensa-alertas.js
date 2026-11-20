'use strict';
/* global fetch, AbortSignal */

const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');
const dotenv = require('dotenv');
const { parse } = require('flatted');

const alertName = 'ConvocaApiNoDisponible';
const workflowId = 'a13Flujo1';
const prometheus = 'http://127.0.0.1:9090';
const n8n = 'http://127.0.0.1:5680';
const mailpit = 'http://127.0.0.1:8028';
const root = path.resolve(__dirname, '..');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function docker(...args) {
  return execFileSync('docker', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 20000 }).trim();
}

async function request(url, options = {}) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(5000) });
  assert.ok(response.ok, `HTTP ${response.status} en ${new URL(url).pathname}`);
  return response;
}

async function waitFor(description, check, timeout = 150000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const result = await check();
    if (result) return result;
    await sleep(3000);
  }
  throw new Error(`No se observó ${description} en ${timeout / 1000} s.`);
}

async function activeAlerts() {
  const { data } = await (await request(`${prometheus}/api/v1/alerts`)).json();
  return data.alerts.filter((item) => item.labels.alertname === alertName);
}

async function healthyProbe() {
  const query = 'probe_success{job="api-health"} == 1';
  const { data } = await (await request(`${prometheus}/api/v1/query?query=${encodeURIComponent(query)}`)).json();
  return data.result.length === 1;
}

async function connectN8n() {
  const env = dotenv.parse(fs.readFileSync(path.join(root, 'infra/n8n/.env')));
  const login = await request(`${n8n}/rest/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailOrLdapLoginId: 'admin@convoca.local', password: env.N8N_ADMIN_PASSWORD }),
  });
  const headers = { Cookie: login.headers.getSetCookie().map((value) => value.split(';')[0]).join('; ') };
  return async (route) => (await (await request(`${n8n}/rest/${route}`, { headers })).json()).data;
}

async function completedExecutions(api, start) {
  const { results } = await api('executions?limit=30');
  return results.filter((entry) => entry.workflowId === workflowId && Date.parse(entry.startedAt) >= start && entry.status === 'success');
}

async function flowResult(api, start, stage, expectedIssue) {
  const nodes = stage === 'alta'
    ? ['Guardar fingerprint e ID de Mantis', 'Avisar alerta o duplicado por correo local']
    : ['Recuperar contexto de la alerta', 'Avisar recuperación por correo local'];
  for (const execution of await completedExecutions(api, start)) {
    const detail = await api(`executions/${execution.id}`);
    const data = typeof detail.data === 'string' ? parse(detail.data) : detail.data;
    const run = data.resultData.runData;
    const rows = (run[nodes[0]] ?? []).flatMap((step) => step.data?.main?.[0] ?? []);
    const row = rows.find(({ json }) => json.alertname === alertName && (!expectedIssue || String(json.issueId) === String(expectedIssue)));
    const receipt = (run[nodes[1]] ?? []).some((step) => (step.data?.main?.[0] ?? []).length > 0);
    if (row && receipt) return { ejecucion: execution.id, ticket: row.json.issueId, recomendacion: row.json.recomendacion };
  }
  return null;
}

async function mailReceived(start, issueId, stage) {
  const { messages } = await (await request(`${mailpit}/api/v1/messages?limit=80`)).json();
  const prefix = stage === 'alta' ? 'A13 - Avisar alerta o duplicado' : 'A13 - Avisar recuperación';
  for (const item of messages.filter((entry) => entry.Subject === prefix && Date.parse(entry.Created) >= start - 1000)) {
    const detail = await (await request(`${mailpit}/api/v1/message/${encodeURIComponent(item.ID)}`)).json();
    if (detail.Text.includes(alertName) && detail.Text.includes(`#${issueId}`)) {
      return { recibido: true, conRecomendacion: detail.Text.includes('Accion sugerida:') };
    }
  }
  return null;
}

async function main() {
  const container = process.argv[2];
  assert.match(container ?? '', /^convoca-lab-v2-(?:a14|a15|defensa)-api-1$/, 'Indicar el contenedor API de un piloto aislado.');
  assert.equal(docker('inspect', '--format', '{{.State.Health.Status}}', container), 'healthy');
  const dns = JSON.parse(docker('network', 'inspect', 'convoca-publicacion'))[0];
  const members = Object.keys(dns.Containers ?? {});
  const endpoints = JSON.parse(docker('inspect', ...members));
  const apiMembers = endpoints.filter((entry) => entry.NetworkSettings.Networks['convoca-publicacion']?.Aliases?.includes('api'));
  assert.deepEqual(apiMembers.map((entry) => entry.Name), [`/${container}`], 'El destino api debe resolver exclusivamente al piloto indicado.');

  const api = await connectN8n();
  assert.equal((await api(`workflows/${workflowId}`)).active, true, 'Flujo A13-1 publicado');
  assert.ok(await healthyProbe(), 'Prometheus debe ver la API del piloto saludable.');
  await waitFor('línea de base sin alerta de API', async () => (await activeAlerts()).length === 0);

  const cycles = [];
  for (let ciclo = 1; ciclo <= 2; ciclo++) {
    const start = Date.now();
    let created;
    try {
      docker('stop', container);
      await waitFor('alerta real FIRING', async () => (await activeAlerts()).some((item) => item.state === 'firing'));
      created = await waitFor('ticket y ejecución de alta', () => flowResult(api, start, 'alta'));
      created.correo = await waitFor('aviso local de alta', () => mailReceived(start, created.ticket, 'alta'));
      assert.ok(created.recomendacion && created.correo.conRecomendacion, 'El alta debe indicar una acción sugerida.');
    } finally {
      docker('start', container);
    }

    await waitFor('sonda recuperada y alerta de API retirada', async () => await healthyProbe() && (await activeAlerts()).length === 0);
    const resolved = await waitFor('ejecución que resuelve el mismo ticket', () => flowResult(api, start, 'recuperacion', created.ticket));
    resolved.correo = await waitFor('aviso local de recuperación', () => mailReceived(start, created.ticket, 'recuperacion'));
    cycles.push({ ciclo, duracionSegundos: Math.round((Date.now() - start) / 1000), alta: created, recuperacion: resolved });
    console.log(`Ciclo ${ciclo}: alerta real, ticket #${created.ticket} y ambos avisos confirmados.`);
  }

  assert.notEqual(cycles[0].alta.ticket, cycles[1].alta.ticket, 'La segunda caída debe crear una incidencia nueva.');
  const output = path.join(root, 'infra/n8n/resultados/defensa-alertas.json');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify({ fecha: new Date().toISOString(), contenedor: container, origen: 'Prometheus real, A13-1 programado y Mailpit local', ciclos: cycles }, null, 2) + '\n');
  console.log('Evidencia: infra/n8n/resultados/defensa-alertas.json');
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
