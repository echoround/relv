const { maybeHandleOptions, sendJson, methodNotAllowed } = require('../../../lib/http');
const { getThreadBySlug } = require('../../../lib/db');

module.exports = async function handler(req, res) {
  if (maybeHandleOptions(req, res)) return;

  if (req.method !== 'GET') {
    return methodNotAllowed(req, res, ['GET', 'OPTIONS']);
  }

  try {
    const { slug } = req.query;
    const thread = await getThreadBySlug(Array.isArray(slug) ? slug[0] : slug);

    if (!thread) {
      return sendJson(req, res, 404, {
        ok: false,
        error: 'Teemat ei leitud.'
      });
    }

    return sendJson(req, res, 200, {
      ok: true,
      thread
    });
  } catch (error) {
    console.error('Forum thread lookup error:', error);

    return sendJson(req, res, 500, {
      ok: false,
      error: 'Teema laadimine ebaõnnestus.'
    });
  }
};
