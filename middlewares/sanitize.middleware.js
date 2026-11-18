// Middleware de sanitización contra XSS y Prototype Pollution.
const HTML_TAG_REGEX = /<\/?[^>]+(>|$)/g;
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function sanitizeValue(value) {
  if (typeof value === 'string') {
    return value.replace(HTML_TAG_REGEX, '').trim();
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value && typeof value === 'object') {
    return sanitizeObject(value);
  }
  return value;
}

function sanitizeObject(obj) {
  const out = {};
  for (const key of Object.keys(obj)) {
    if (DANGEROUS_KEYS.has(key)) {
      continue;
    }
    out[key] = sanitizeValue(obj[key]);
  }
  return out;
}

function sanitize(req, _res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params);
  }
  next();
}

module.exports = sanitize;