const assert = require('node:assert/strict');
const cp = require('node:child_process');
const crypto = require('node:crypto');

const project = 'convoca-lab-v2-a15';
const database = 'convoca_lab_piloto_v2';
const primary = project + '-db-principal-1';
const standby = project + '-db-replica-1';
const table = 'defensa_replica_' + crypto.randomBytes(8).toString('hex');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const result = { date: new Date().toISOString(), project, database };

function docker(args) {
  return cp.execFileSync('docker', args, { encoding: 'utf8', timeout: 25000 }).trim();
}

function sql(container, query) {
  return docker(['exec', container, 'psql', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-U', 'convoca_lab', '-d', database, '-c', query]);
}

async function until(label, read, expected) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const value = read();
      if (value === expected) return value;
    } catch {
      // A node can reject connections while it is starting.
    }
    await wait(1000);
  }
  throw Error(label + ' did not reach ' + expected);
}

async function main() {
  const recovery = 'SELECT pg_is_in_recovery()';
  const streaming = "SELECT state || ':' || sync_state FROM pg_stat_replication WHERE application_name = 'convoca-replica'";
  assert.equal(sql(primary, recovery), 'f');
  await until('Standby role', () => sql(standby, recovery), 't');
  result.initial = await until('Initial replication', () => sql(primary, streaming), 'streaming:async');

  let created = false;
  let stoppingStandby = false;
  try {
    sql(primary, 'CREATE TABLE ' + table + '(id integer PRIMARY KEY)');
    created = true;
    sql(primary, 'INSERT INTO ' + table + ' VALUES (1)');
    const rows = "SELECT string_agg(id::text, ',' ORDER BY id) FROM " + table;
    result.firstRowOnStandby = await until('Initial row propagation', () => sql(standby, rows), '1');

    stoppingStandby = true;
    docker(['stop', standby]);
    assert.equal(sql(primary, streaming), '');
    sql(primary, 'INSERT INTO ' + table + ' VALUES (2)');
    result.writeWhileStandbyDown = sql(primary, rows);
    assert.equal(result.writeWhileStandbyDown, '1,2');

    docker(['start', standby]);
    result.recovered = await until('Resumed replication', () => sql(primary, streaming), 'streaming:async');
    result.rowsAfterCatchUp = await until('Catch-up', () => sql(standby, rows), '1,2');
    stoppingStandby = false;
  } finally {
    if (stoppingStandby) docker(['start', standby]);
    if (created) sql(primary, 'DROP TABLE ' + table);
  }

  result.cleanup = await until('Probe cleanup on replica', () => sql(standby, "SELECT COALESCE(to_regclass('public." + table + "')::text, 'removed')"), 'removed');
  console.log(JSON.stringify(result, null, 2));
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
