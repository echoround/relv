const { maybeHandleOptions, sendJson } = require('../../lib/http');
const { ensureDb } = require('../../lib/db');

module.exports = async function handler(req, res) {
  if (maybeHandleOptions(req, res)) return;

  try {
    await ensureDb();

    return sendJson(req, res, 200, {
      ok: true,
      service: 'relv-backend'
    });
  } catch (error) {
    console.error('Health check failed:', error);

    return sendJson(req, res, 500, {
      ok: false,
      error: 'Backend ei saanud andmebaasiga ühendust.'
    });
  }
};
