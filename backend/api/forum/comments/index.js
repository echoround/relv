const { maybeHandleOptions, sendJson, readJsonBody, getClientMeta, methodNotAllowed } = require('../../../lib/http');
const { addComment, countRecentCommentsByIp } = require('../../../lib/db');
const { validateCommentInput } = require('../../../lib/validation');

module.exports = async function handler(req, res) {
  if (maybeHandleOptions(req, res)) return;

  if (req.method !== 'POST') {
    return methodNotAllowed(req, res, ['POST', 'OPTIONS']);
  }

  try {
    const body = await readJsonBody(req);
    const { ipHash, userAgent } = getClientMeta(req);

    const recentComments = await countRecentCommentsByIp(ipHash, 1);
    if (recentComments >= 12) {
      return sendJson(req, res, 429, {
        ok: false,
        error: 'Liiga palju kommentaare lühikese aja jooksul. Proovi hiljem uuesti.'
      });
    }

    const payload = validateCommentInput(body);
    const thread = await addComment({
      ...payload,
      ipHash,
      userAgent
    });

    return sendJson(req, res, 201, {
      ok: true,
      thread
    });
  } catch (error) {
    console.error('Forum comment error:', error);

    return sendJson(req, res, 400, {
      ok: false,
      error: error.message || 'Kommentaari ei õnnestunud salvestada.'
    });
  }
};
