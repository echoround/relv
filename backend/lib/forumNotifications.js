const crypto = require('crypto');
const { abuseSalt, publicApiBaseUrl, siteUrl } = require('./config');
const { escapeHtml, isEmailConfigured, renderEmailShell, sendEmail } = require('./email');

function createUnsubscribeToken(subscriptionId) {
  const safeId = String(subscriptionId || '').trim();
  const signature = crypto
    .createHmac('sha256', abuseSalt)
    .update(`forum-unsubscribe:${safeId}`)
    .digest('hex');

  return `${safeId}.${signature}`;
}

function verifyUnsubscribeToken(token) {
  const [subscriptionId, signature] = String(token || '').split('.');
  if (!subscriptionId || !signature) return null;

  const expected = crypto
    .createHmac('sha256', abuseSalt)
    .update(`forum-unsubscribe:${subscriptionId}`)
    .digest('hex');

  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return null;

  return crypto.timingSafeEqual(left, right) ? subscriptionId : null;
}

async function sendForumReplyNotification({ recipient, threadSlug, threadTitle, replyAuthor, replyBody, isDirectReply }) {
  if (!isEmailConfigured()) {
    return {
      ok: false,
      skipped: true,
      reason: 'email_not_configured'
    };
  }

  const forumUrl = `${siteUrl}/foorum.html#${encodeURIComponent(threadSlug)}`;
  const unsubscribeToken = createUnsubscribeToken(recipient.id);
  const unsubscribeUrl = `${publicApiBaseUrl}/forum/notifications/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`;
  const preview = isDirectReply
    ? `Keegi vastas sinu kommentaarile teemas "${threadTitle}".`
    : `Keegi kommenteeris sinu teemat "${threadTitle}".`;
  const subject = isDirectReply
    ? `Uus vastus sinu kommentaarile – ${threadTitle}`
    : `Uus vastus sinu teemale – ${threadTitle}`;
  const intro = isDirectReply
    ? `${replyAuthor} vastas sinu kommentaarile Relva foorumis.`
    : `${replyAuthor} kommenteeris sinu teemat Relva foorumis.`;
  const safeReplyAuthor = escapeHtml(replyAuthor);
  const safeReplyBody = escapeHtml(replyBody).replace(/\n/g, '<br />');
  const html = renderEmailShell({
    preview,
    title: subject,
    intro,
    bodyHtml: `
      <p style="margin:0 0 12px;">Teema: <strong>${escapeHtml(threadTitle)}</strong></p>
      <div style="margin:0 0 16px;padding:16px 18px;border-radius:16px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);">
        <div style="margin:0 0 8px;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#9fd8ff;font-weight:700;">${safeReplyAuthor}</div>
        <div>${safeReplyBody}</div>
      </div>
      <p style="margin:0;">Soovi korral saad teavitused selle arutelu kohta igal ajal peatada.</p>
    `,
    actionLabel: 'Ava arutelu',
    actionUrl: forumUrl,
    footerHtml: `<a href="${escapeHtml(unsubscribeUrl)}" style="color:#9fd8ff;">Lõpeta selle arutelu teavitused</a>`
  });

  const text = [
    preview,
    '',
    `Teema: ${threadTitle}`,
    `Vastaja: ${replyAuthor}`,
    '',
    replyBody,
    '',
    `Ava arutelu: ${forumUrl}`,
    `Lõpeta teavitused: ${unsubscribeUrl}`
  ].join('\n');

  return sendEmail({
    to: recipient.email,
    subject,
    html,
    text,
    idempotencyKey: `forum-reply:${recipient.id}:${threadSlug}:${crypto.createHash('sha1').update(replyBody).digest('hex').slice(0, 16)}`
  });
}

module.exports = {
  createUnsubscribeToken,
  sendForumReplyNotification,
  verifyUnsubscribeToken
};
