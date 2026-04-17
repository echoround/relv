const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const { forumAuthSecret, googleClientId } = require('./config');

const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30;
const googleClient = googleClientId ? new OAuth2Client(googleClientId) : null;

function toBase64Url(value) {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function fromBase64Url(value) {
  return Buffer.from(String(value || ''), 'base64url').toString('utf8');
}

function signSessionPayload(encodedPayload) {
  return crypto.createHmac('sha256', forumAuthSecret).update(encodedPayload).digest('base64url');
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left || ''));
  const rightBuffer = Buffer.from(String(right || ''));

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function sanitizeProfileString(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength);
}

function normalizeUser(payload) {
  if (!payload?.sub || !payload?.email) {
    return null;
  }

  return {
    sub: sanitizeProfileString(payload.sub, 255),
    email: sanitizeProfileString(String(payload.email).toLowerCase(), 254),
    name: sanitizeProfileString(payload.name || payload.given_name || 'Google user', 120),
    picture: sanitizeProfileString(payload.picture || '', 500)
  };
}

async function verifyGoogleCredential(credential) {
  if (!googleClient || !googleClientId) {
    throw new Error('Google sisselogimine ei ole seadistatud.');
  }

  const ticket = await googleClient.verifyIdToken({
    idToken: String(credential || ''),
    audience: googleClientId
  });

  const payload = ticket.getPayload();
  const user = normalizeUser(payload);

  if (!user) {
    throw new Error('Google konto andmeid ei olnud voimalik kinnitada.');
  }

  return user;
}

function createForumSession(user) {
  const now = Date.now();
  const payload = {
    sub: user.sub,
    email: user.email,
    name: user.name,
    picture: user.picture,
    iat: now,
    exp: now + SESSION_MAX_AGE_MS
  };

  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = signSessionPayload(encodedPayload);

  return {
    token: `${encodedPayload}.${signature}`,
    user: payload
  };
}

function verifyForumSessionToken(token) {
  const [encodedPayload, signature] = String(token || '').split('.');
  if (!encodedPayload || !signature) return null;

  const expectedSignature = signSessionPayload(encodedPayload);
  if (!safeEqual(signature, expectedSignature)) return null;

  try {
    const payload = JSON.parse(fromBase64Url(encodedPayload));
    const user = normalizeUser(payload);

    if (!user) return null;
    if (!payload.exp || Number(payload.exp) < Date.now()) return null;

    return {
      ...user,
      iat: Number(payload.iat) || 0,
      exp: Number(payload.exp) || 0
    };
  } catch (error) {
    return null;
  }
}

function getForumAuthFromRequest(req) {
  const header = String(req.headers.authorization || '');
  if (!header.toLowerCase().startsWith('bearer ')) {
    return null;
  }

  return verifyForumSessionToken(header.slice(7).trim());
}

module.exports = {
  createForumSession,
  getForumAuthFromRequest,
  googleClientId,
  verifyForumSessionToken,
  verifyGoogleCredential
};
