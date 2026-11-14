'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const errorHandler = require('../../middlewares/error-handler.middleware');

test('los errores de autenticación no exponen el stack al cliente en desarrollo', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalConsoleError = console.error;
  let responseBody;
  const response = {
    statusCode: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { responseBody = body; return this; },
  };
  const error = new Error('Token de autenticación requerido');
  error.status = 401;
  process.env.NODE_ENV = 'development';
  console.error = () => {};
  try {
    errorHandler(error, {}, response, () => {});
  } finally {
    console.error = originalConsoleError;
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  }
  assert.equal(response.statusCode, 401);
  assert.equal(responseBody.error.message, 'Token de autenticación requerido');
  assert.equal(Object.hasOwn(responseBody.error, 'stack'), false);
});