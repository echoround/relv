const { maybeHandleOptions, methodNotAllowed, readJsonBody, sendJson } = require('../../../lib/http');
const { createForumSession, verifyGoogleCredential } = require('../../../lib/forumAuth');
const { getAccountSnapshot } = require('../../../lib/db');

module.exports = async function handler(req, res) {
  if (maybeHandleOptions(req, res)) return;

  if (req.method !== 'POST') {
    return methodNotAllowed(req, res, ['POST', 'OPTIONS']);
  }

  try {
    const body = await readJsonBody(req);
    const user = await verifyGoogleCredential(body.credential);
    const session = createForumSession(user);
    const account = await getAccountSnapshot({
      googleSub: session.user.sub,
      email: session.user.email
    });

    return sendJson(req, res, 200, {
      ok: true,
      token: session.token,
      user: session.user,
      ...account
    });
  } catch (error) {
    return sendJson(req, res, 400, {
      ok: false,
      error: error.message || 'Google sisselogimine ebaõnnestus.'
    });
  }
};
