const { Resend } = require('resend');
const {
  notificationFromEmail,
  publicApiBaseUrl,
  resendApiKey,
  siteUrl
} = require('./config');

const resend = resendApiKey ? new Resend(resendApiKey) : null;

function isEmailConfigured() {
  return Boolean(resend && notificationFromEmail);
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderEmailShell({ preview, title, intro, bodyHtml, actionLabel, actionUrl, footerHtml }) {
  const safePreview = escapeHtml(preview);
  const safeTitle = escapeHtml(title);
  const safeIntro = escapeHtml(intro);
  const safeActionLabel = actionLabel ? escapeHtml(actionLabel) : '';
  const safeActionUrl = actionUrl ? escapeHtml(actionUrl) : '';

  return `
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${safePreview}</div>
    <div style="margin:0;padding:32px 16px;background:#141922;color:#f4f5f7;font-family:Arial,sans-serif;">
      <div style="max-width:560px;margin:0 auto;background:#202633;border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:28px 24px;box-shadow:0 18px 48px rgba(0,0,0,0.34);">
        <div style="font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#9fd8ff;font-weight:700;margin-bottom:14px;">Relvaload.ee</div>
        <h1 style="margin:0 0 12px;font-size:28px;line-height:1.12;color:#ffffff;">${safeTitle}</h1>
        <p style="margin:0 0 18px;font-size:16px;line-height:1.6;color:rgba(244,245,247,0.82);">${safeIntro}</p>
        <div style="font-size:16px;line-height:1.7;color:#f4f5f7;">${bodyHtml}</div>
        ${
          safeActionUrl
            ? `<div style="margin-top:24px;"><a href="${safeActionUrl}" style="display:inline-block;padding:13px 18px;border-radius:999px;background:#dce7db;color:#1d2330;text-decoration:none;font-weight:700;">${safeActionLabel}</a></div>`
            : ''
        }
        <div style="margin-top:28px;padding-top:18px;border-top:1px solid rgba(255,255,255,0.08);font-size:13px;line-height:1.7;color:rgba(244,245,247,0.58);">
          ${footerHtml || ''}
        </div>
      </div>
    </div>
  `;
}

async function sendEmail({ to, subject, html, text, idempotencyKey }) {
  if (!isEmailConfigured()) {
    return {
      ok: false,
      skipped: true,
      reason: 'email_not_configured'
    };
  }

  const options = idempotencyKey
    ? {
        headers: {
          'Idempotency-Key': idempotencyKey
        }
      }
    : undefined;

  const { data, error } = await resend.emails.send(
    {
      from: notificationFromEmail,
      to,
      subject,
      html,
      text
    },
    options
  );

  if (error) {
    throw new Error(error.message || 'Email send failed.');
  }

  return {
    ok: true,
    skipped: false,
    data
  };
}

module.exports = {
  escapeHtml,
  isEmailConfigured,
  publicApiBaseUrl,
  renderEmailShell,
  sendEmail,
  siteUrl
};
