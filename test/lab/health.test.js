'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { healthCheck } = require('../../utils/health-check');
for (const ok of [true, false]) {
  test(`health con base ${ok ? 'disponible' : 'caída'}`, async () => {
    let code, body;
    const res = { status(c) { code = c; return this; }, json(b) { body = b; } };
    await healthCheck(async () => { if (!ok) throw new Error('credencial privada'); }, {})({}, res);
    assert.equal(code, ok ? 200 : 503);
    assert.equal(body.database, ok ? 'up' : 'down');
    assert.equal(body.commit, null);
    assert.ok(!JSON.stringify(body).includes('credencial'));
  });
}
