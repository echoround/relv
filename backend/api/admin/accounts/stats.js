const crypto = require('crypto');
const { adminStatsSecret } = require('../../../lib/config');
const { getGoogleAccountStats } = require('../../../lib/db');
const { maybeHandleOptions, methodNotAllowed, sendJson } = require('../../../lib/http');

function readBearerToken(req) {
  const authorization = String(req.headers.authorization || '');
  return authorization.toLowerCase().startsWith('bearer ')
    ? authorization.slice(7).trim()
    : '';
}

function secretsMatch(received, expected) {
  if (!received || !expected) return false;

  const receivedHash = crypto.createHash('sha256').update(received).digest();
  const expectedHash = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(receivedHash, expectedHash);
}

module.exports = async function handler(req, res) {
  if (maybeHandleOptions(req, res)) return;

  if (req.method !== 'GET') {
    return methodNotAllowed(req, res, ['GET', 'OPTIONS']);
  }

  if (!adminStatsSecret) {
    return sendJson(req, res, 503, {
      ok: false,
      error: 'Admin statistics are not configured.'
    });
  }

  if (!secretsMatch(readBearerToken(req), adminStatsSecret)) {
    return sendJson(req, res, 401, {
      ok: false,
      error: 'Unauthorized.'
    });
  }

  try {
    const stats = await getGoogleAccountStats();
    res.setHeader('Cache-Control', 'no-store');

    return sendJson(req, res, 200, {
      ok: true,
      generatedAt: new Date().toISOString(),
      ...stats
    });
  } catch (error) {
    console.error('Google account statistics error:', error);

    return sendJson(req, res, 500, {
      ok: false,
      error: 'Account statistics could not be loaded.'
    });
  }
};
