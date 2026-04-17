const { maybeHandleOptions, methodNotAllowed, sendHtml } = require('../../../lib/http');
const { disableForumNotificationSubscription } = require('../../../lib/db');
const { verifyUnsubscribeToken } = require('../../../lib/forumNotifications');
const { siteUrl } = require('../../../lib/config');

function renderPage({ title, message }) {
  return `<!DOCTYPE html>
<html lang="et">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      body { margin: 0; font-family: Arial, sans-serif; background: #141922; color: #f4f5f7; }
      main { min-height: 100vh; display: grid; place-items: center; padding: 24px; }
      .card { max-width: 520px; background: #202633; border: 1px solid rgba(255,255,255,0.08); border-radius: 22px; padding: 28px 24px; box-shadow: 0 18px 48px rgba(0,0,0,0.34); }
      .eyebrow { color: #9fd8ff; font-size: 12px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; margin-bottom: 14px; }
      h1 { margin: 0 0 12px; font-size: 28px; line-height: 1.14; }
      p { margin: 0; line-height: 1.7; color: rgba(244,245,247,0.78); }
      a { display: inline-block; margin-top: 22px; padding: 13px 18px; border-radius: 999px; background: #dce7db; color: #1d2330; font-weight: 700; text-decoration: none; }
    </style>
  </head>
  <body>
    <main>
      <section class="card">
        <div class="eyebrow">Relvaload.ee</div>
        <h1>${title}</h1>
        <p>${message}</p>
        <a href="${siteUrl}/foorum.html">Tagasi foorumisse</a>
      </section>
    </main>
  </body>
</html>`;
}

module.exports = async function handler(req, res) {
  if (maybeHandleOptions(req, res)) return;

  if (req.method !== 'GET') {
    return methodNotAllowed(req, res, ['GET', 'OPTIONS']);
  }

  try {
    const subscriptionId = verifyUnsubscribeToken(req.query.token || '');
    if (!subscriptionId) {
      return sendHtml(req, res, 400, renderPage({
        title: 'Link ei kehti',
        message: 'Seda teavituste linki ei saanud kinnitada.'
      }));
    }

    await disableForumNotificationSubscription(subscriptionId);

    return sendHtml(req, res, 200, renderPage({
      title: 'Teavitused peatatud',
      message: 'Selle arutelu e-posti teavitused on nüüd välja lülitatud.'
    }));
  } catch (error) {
    return sendHtml(req, res, 500, renderPage({
      title: 'Midagi läks valesti',
      message: 'Teavituste peatamine ei õnnestunud. Proovi hiljem uuesti.'
    }));
  }
};
