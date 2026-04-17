const { maybeHandleOptions, sendJson, readJsonBody, getClientMeta, methodNotAllowed } = require('../../../lib/http');
const {
  addComment,
  countRecentCommentsByIp,
  listForumNotificationRecipients,
  markForumNotificationDelivered,
  upsertForumNotificationSubscription
} = require('../../../lib/db');
const { getForumAuthFromRequest } = require('../../../lib/forumAuth');
const { sendForumReplyNotification } = require('../../../lib/forumNotifications');
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
    const authUser = getForumAuthFromRequest(req);
    const result = await addComment({
      ...payload,
      displayName: payload.displayName,
      authorProfile: authUser,
      ipHash,
      userAgent
    });
    let notificationMessage = '';

    if (payload.notifyReplies && authUser) {
      await upsertForumNotificationSubscription({
        threadId: result.context.threadId,
        commentId: result.context.commentId,
        googleSub: authUser.sub,
        email: authUser.email,
        displayName: result.context.replyAuthor,
        ipHash,
        userAgent
      });

      notificationMessage = 'Teavitused on selle kommentaari jaoks sees.';
    }

    const recipients = await listForumNotificationRecipients({
      threadId: result.context.threadId,
      parentCommentId: result.context.parentCommentId,
      excludeGoogleSub: authUser?.sub || ''
    });

    const notificationResults = await Promise.allSettled(
      recipients.map(async (recipient) => {
        const sendResult = await sendForumReplyNotification({
          recipient,
          threadSlug: result.context.threadSlug,
          threadTitle: result.context.threadTitle,
          replyAuthor: result.context.replyAuthor,
          replyBody: result.context.replyBody,
          isDirectReply: Boolean(recipient.isDirectReply)
        });

        if (sendResult.ok) {
          await markForumNotificationDelivered(recipient.id);
        }
      })
    );

    notificationResults.forEach((entry) => {
      if (entry.status === 'rejected') {
        console.error('Forum notification send error:', entry.reason);
      }
    });

    return sendJson(req, res, 201, {
      ok: true,
      thread: result.thread,
      notificationMessage
    });
  } catch (error) {
    console.error('Forum comment error:', error);

    return sendJson(req, res, 400, {
      ok: false,
      error: error.message || 'Kommentaari ei õnnestunud salvestada.'
    });
  }
};
