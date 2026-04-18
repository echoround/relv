const { maybeHandleOptions, methodNotAllowed, readJsonBody, sendJson, getClientMeta } = require('../../../lib/http');
const { getForumAuthFromRequest } = require('../../../lib/forumAuth');
const {
  getAccountSnapshot,
  removeSubscriberByEmail,
  upsertSubscriber
} = require('../../../lib/db');

module.exports = async function handler(req, res) {
  if (maybeHandleOptions(req, res)) return;

  if (req.method !== 'POST') {
    return methodNotAllowed(req, res, ['POST', 'OPTIONS']);
  }

  const user = getForumAuthFromRequest(req);
  if (!user) {
    return sendJson(req, res, 401, {
      ok: false,
      error: 'Sessioon puudub või on aegunud.'
    });
  }

  try {
    const body = await readJsonBody(req);
    const { ipHash, userAgent } = getClientMeta(req);
    const newsletterSubscribed = Boolean(body.newsletterSubscribed);

    if (newsletterSubscribed) {
      await upsertSubscriber({
        email: user.email,
        sourcePage: 'site-auth-google',
        ipHash,
        userAgent
      });
    } else {
      await removeSubscriberByEmail(user.email);
    }

    const account = await getAccountSnapshot({
      googleSub: user.sub,
      email: user.email
    });

    return sendJson(req, res, 200, {
      ok: true,
      ...account
    });
  } catch (error) {
    console.error('Forum auth preferences error:', error);

    return sendJson(req, res, 400, {
      ok: false,
      error: error.message || 'Eelistusi ei õnnestunud salvestada.'
    });
  }
};
