'use strict';
// CLI de Compose: no depende de una instalación PHP/MariaDB/Node modules del host.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'infra/mantis');
const envFile = process.env.MANTIS_ENV_FILE ? path.resolve(process.env.MANTIS_ENV_FILE) : path.join(dir, '.env');
const command = process.argv[2];
function docker(args, capture = false) {
  const r = spawnSync('docker', args, { cwd: root, encoding: 'utf8', windowsHide: true,
    stdio: capture ? 'pipe' : 'inherit' });
  if (r.error || r.status !== 0) {
    if (capture) {
      const output=path.join(dir,'resultados');fs.mkdirSync(output,{recursive:true});
      let detail=(r.stdout || '')+(r.stderr || '');
      if (fs.existsSync(envFile)) for (const value of Object.values(config())) if (value.length>15) detail=detail.split(value).join('[redactado]');
      fs.writeFileSync(path.join(output,'ultimo-error.log'),detail);
    }
    throw new Error('Falló Docker. Revisar la salida anterior o infra/mantis/resultados/ultimo-error.log; no se borraron volúmenes.');
  }
  return r.stdout;
}
function compose(args, capture = false) {
  return docker(['compose', '--env-file', envFile, '-f', path.join(dir, 'compose.yaml'), ...args], capture);
}
function config() {
  const text = fs.readFileSync(envFile, 'utf8');
  return Object.fromEntries(text.split(/\r?\n/).filter(l => /^[A-Z_]+=/.test(l)).map(l => {
    const i = l.indexOf('='); return [l.slice(0,i),l.slice(i+1).trim()];
  }));
}
function saveReport(name, text) {
  const output = path.join(dir, 'resultados');
  fs.mkdirSync(output, { recursive: true });
  const file = path.join(output, name);
  fs.writeFileSync(file, text);
  console.log('Resultado local: ' + path.relative(root,file));
}
try {
  if (!['up','validate','stop','export'].includes(command)) throw new Error('Usar up, validate, stop o export.');
  if (command === 'up') {
    const manifest=JSON.parse(fs.readFileSync(path.join(root,'docs/evidencias/actividad11/manifest.json'),'utf8'));
    for (const [file,expected] of Object.entries(manifest.sha256)) {
      if (crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex') !== expected) {
        throw new Error('Evidencia incompleta o modificada: ' + file + '. No se importan cierres.');
      }
    }
  }
  if (command === 'up' && !fs.existsSync(envFile)) {
    let text = fs.readFileSync(path.join(dir,'.env.example'),'utf8');
    text = text.replace(/generar-localmente/g, () => crypto.randomBytes(24).toString('hex'));
    fs.writeFileSync(envFile,text,{mode:0o600,flag:'wx'});
  }
  const values = config();
  if (!/^convoca-mantis-a11(?:-[a-z0-9]+)?$/.test(values.COMPOSE_PROJECT_NAME || '')) throw new Error('Nombre de proyecto Mantis inválido.');
  for (const [key,value] of Object.entries(values)) {
    if ((key.endsWith('_PASSWORD') || key.endsWith('_SALT')) && !/^[a-f0-9]{32,}$/.test(value)) {
      throw new Error('Configurar ' + key + ' con una clave hexadecimal propia de al menos 32 caracteres. No rotar claves de una base existente editando .env.');
    }
  }
  if (command === 'up') {
    compose(['up','-d','--build','--wait']);
    compose(['exec','-T','mantis','php','/opt/a11/instalar.php']);
    const result = compose(['exec','-T','mantis','php','/opt/a11/gestionar.php','seed'],true);
    saveReport('tickets.json',result);
    console.log('Mantis: http://localhost:' + (values.MANTIS_PORT || 8989));
    console.log('Usuarios: gabriel-calisaya, mauro-nanda, juan-carrizo, delia-cusipuma, dumbi34. Claves en infra/mantis/.env.');
  } else if (command === 'validate') {
    const result = compose(['exec','-T','mantis','php','/opt/a11/gestionar.php','validate'],true);
    saveReport('validacion.json',result);
    const data = JSON.parse(result);
    if (data.tickets.length !== 10 || !data.ok) throw new Error('Registro Mantis incompleto.');
    console.log('10 tickets con responsable, categoría, prioridad, notas e historial verificados.');
  } else if (command === 'stop') compose(['stop']);
  else {
    // Solo tablas de tickets/proyecto/historial: excluye usuarios y hashes de contraseñas.
    const result = compose(['exec','-T','mantis','php','/opt/a11/gestionar.php','export'],true);
    saveReport('registro-exportado.json',result);
  }
} catch (error) { console.error(error.message); process.exitCode = 1; }
