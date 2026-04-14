const crypto = require('crypto');
const { allowedOrigins, abuseSalt } = require('./config');

function pickAllowedOrigin(origin) {
  if (!origin) return '';

  if (allowedOrigins.includes(origin)) {
    return origin;
  }

  if (/^https?:\/\/localhost(:\d+)?$/i.test(origin)) {
    return origin;
  }

  if (/^https?:\/\/127\.0\.0\.1(:\d+)?$/i.test(origin)) {
    return origin;
  }

  return '';
}

function applyCors(req, res) {
  const allowedOrigin = pickAllowedOrigin(req.headers.origin || '');

  if (allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');

  return allowedOrigin;
}

function maybeHandleOptions(req, res) {
  applyCors(req, res);

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }

  return false;
}

function sendJson(req, res, statusCode, payload) {
  applyCors(req, res);
  res.status(statusCode).json(payload);
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};

  return JSON.parse(raw);
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }

  return req.socket?.remoteAddress || '';
}

function hashValue(value) {
  return crypto.createHmac('sha256', abuseSalt).update(value || 'unknown').digest('hex');
}

function getClientMeta(req) {
  const ip = getClientIp(req);

  return {
    ip,
    ipHash: hashValue(ip),
    userAgent: String(req.headers['user-agent'] || '').slice(0, 400)
  };
}

function methodNotAllowed(req, res, methods) {
  res.setHeader('Allow', methods.join(', '));
  return sendJson(req, res, 405, {
    ok: false,
    error: 'Meetod ei ole lubatud.'
  });
}

module.exports = {
  applyCors,
  maybeHandleOptions,
  sendJson,
  readJsonBody,
  getClientMeta,
  methodNotAllowed
};
