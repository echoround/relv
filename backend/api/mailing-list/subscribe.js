const { maybeHandleOptions, sendJson, readJsonBody, getClientMeta, methodNotAllowed } = require('../../lib/http');
const { upsertSubscriber, countRecentSubscriptionsByIp } = require('../../lib/db');
const { validateSubscriptionInput } = require('../../lib/validation');

module.exports = async function handler(req, res) {
  if (maybeHandleOptions(req, res)) return;

  if (req.method !== 'POST') {
    return methodNotAllowed(req, res, ['POST', 'OPTIONS']);
  }

  try {
    const body = await readJsonBody(req);
    const { ipHash, userAgent } = getClientMeta(req);

    const recentSubscriptions = await countRecentSubscriptionsByIp(ipHash, 24);
    if (recentSubscriptions >= 5) {
      return sendJson(req, res, 429, {
        ok: false,
        error: 'Proovi uuesti hiljem.'
      });
    }

    const payload = validateSubscriptionInput(body);
    const subscriber = await upsertSubscriber({
      ...payload,
      ipHash,
      userAgent
    });

    return sendJson(req, res, 201, {
      ok: true,
      subscriber,
      message: 'Aitäh! Oled nüüd meililistis.'
    });
  } catch (error) {
    console.error('Mailing list subscribe error:', error);

    return sendJson(req, res, 400, {
      ok: false,
      error: error.message || 'Liitumine ebaõnnestus.'
    });
  }
};
