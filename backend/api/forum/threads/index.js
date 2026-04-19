const { maybeHandleOptions, sendJson, readJsonBody, getClientMeta, methodNotAllowed } = require('../../../lib/http');
const {
  listThreads,
  createThread,
  countRecentThreadsByIp,
  getAccountSnapshot,
  upsertForumNotificationSubscription
} = require('../../../lib/db');
const { getForumAuthFromRequest } = require('../../../lib/forumAuth');
const { validateThreadInput } = require('../../../lib/validation');

module.exports = async function handler(req, res) {
  if (maybeHandleOptions(req, res)) return;

  try {
    if (req.method === 'GET') {
      const threads = await listThreads();

      return sendJson(req, res, 200, {
        ok: true,
        threads
      });
    }

    if (req.method === 'POST') {
      const body = await readJsonBody(req);
      const { ipHash, userAgent } = getClientMeta(req);

      const recentThreads = await countRecentThreadsByIp(ipHash, 6);
      if (recentThreads >= 3) {
        return sendJson(req, res, 429, {
          ok: false,
          error: 'Proovi uue teema lisamist hiljem uuesti.'
        });
      }

      const payload = validateThreadInput(body);
      const authUser = getForumAuthFromRequest(req);
      const account = authUser
        ? await getAccountSnapshot({
            googleSub: authUser.sub,
            email: authUser.email
          })
        : null;
      const thread = await createThread({
        ...payload,
        displayName: payload.displayName,
        authorProfile: authUser
          ? {
              ...authUser,
              avatarId: account?.preferences?.avatarId || ''
            }
          : null,
        ipHash,
        userAgent
      });
      let notificationMessage = '';

      if (payload.notifyReplies && authUser) {
        await upsertForumNotificationSubscription({
          threadId: thread.id,
          googleSub: authUser.sub,
          email: authUser.email,
          displayName: thread.displayName,
          ipHash,
          userAgent
        });

        notificationMessage = 'Teavitused on selle teema jaoks sees.';
      }

      return sendJson(req, res, 201, {
        ok: true,
        thread,
        notificationMessage
      });
    }

    return methodNotAllowed(req, res, ['GET', 'POST', 'OPTIONS']);
  } catch (error) {
    console.error('Forum threads error:', error);

    return sendJson(req, res, 400, {
      ok: false,
      error: error.message || 'Teemat ei õnnestunud salvestada.'
    });
  }
};
