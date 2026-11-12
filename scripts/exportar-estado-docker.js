'use strict';
// Solo consulta nombre, estado y reinicios; nunca inspecciona variables de entorno.
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const out = path.resolve(__dirname, '../infra/hia/resultados/docker-state');
fs.mkdirSync(out, { recursive: true });
function collect() {
  const lines = ['# TYPE convoca_docker_collection_timestamp_seconds gauge',
    '# TYPE convoca_container_running gauge', '# TYPE convoca_container_engine_restarts_total counter'];
  try {
    const rows = execFileSync('docker', ['ps', '-a', '--filter', 'name=convoca-', '--format', '{{.ID}}'], { encoding: 'utf8', windowsHide: true, timeout: 10000 }).trim().split(/\r?\n/).filter(Boolean);
    if (rows.length) {
      const data = execFileSync('docker', ['inspect', '--format', '{{.Name}}|{{.State.Running}}|{{.RestartCount}}', ...rows], { encoding: 'utf8', windowsHide: true, timeout: 10000 });
      for (const row of data.trim().split(/\r?\n/)) {
        const [name, running, restarts] = row.split('|');
        const label = `{name=${JSON.stringify(name.replace(/^\//, ''))}}`;
        lines.push(`convoca_container_running${label} ${running === 'true' ? 1 : 0}`);
        lines.push(`convoca_container_engine_restarts_total${label} ${Number(restarts)}`);
      }
    }
    lines.push(`convoca_docker_collection_timestamp_seconds ${Date.now() / 1000}`);
    fs.writeFileSync(path.join(out, 'state.prom.tmp'), lines.join('\n') + '\n');
    fs.renameSync(path.join(out, 'state.prom.tmp'), path.join(out, 'state.prom'));
  } catch { console.error('No se pudo consultar Docker; la fecha de la última muestra permite detectar el fallo.'); }
}
collect();
if (!process.argv.includes('--once')) setInterval(collect, 15000);
