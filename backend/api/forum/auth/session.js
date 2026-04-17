const { maybeHandleOptions, methodNotAllowed, sendJson } = require('../../../lib/http');
const { getForumAuthFromRequest } = require('../../../lib/forumAuth');

module.exports = async function handler(req, res) {
  if (maybeHandleOptions(req, res)) return;

  if (req.method !== 'GET') {
    return methodNotAllowed(req, res, ['GET', 'OPTIONS']);
  }

  const user = getForumAuthFromRequest(req);
  if (!user) {
    return sendJson(req, res, 401, {
      ok: false,
      error: 'Sessioon puudub või on aegunud.'
    });
  }

  return sendJson(req, res, 200, {
    ok: true,
    user
  });
};
