const { maybeHandleOptions, methodNotAllowed, sendJson } = require('../../../lib/http');
const { googleClientId } = require('../../../lib/forumAuth');
const { notificationFromEmail, resendApiKey } = require('../../../lib/config');

module.exports = async function handler(req, res) {
  if (maybeHandleOptions(req, res)) return;

  if (req.method !== 'GET') {
    return methodNotAllowed(req, res, ['GET', 'OPTIONS']);
  }

  return sendJson(req, res, 200, {
    ok: true,
    googleClientId,
    googleAuthEnabled: Boolean(googleClientId),
    notificationsEnabled: Boolean(googleClientId && resendApiKey && notificationFromEmail)
  });
};
