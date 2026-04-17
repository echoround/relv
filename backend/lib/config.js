const DEFAULT_ALLOWED_ORIGINS = [
  'https://relvaload.ee',
  'http://localhost:3000',
  'http://127.0.0.1:5500',
  'http://localhost:5500'
];

function parseAllowedOrigins() {
  const raw = process.env.ALLOWED_ORIGINS;
  if (!raw) return DEFAULT_ALLOWED_ORIGINS;

  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

module.exports = {
  allowedOrigins: parseAllowedOrigins(),
  databaseUrl: process.env.DATABASE_URL || '',
  abuseSalt: process.env.ABUSE_SALT || 'relv-default-salt',
  forumAuthSecret: process.env.FORUM_AUTH_SECRET || process.env.ABUSE_SALT || 'relv-default-salt',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  resendApiKey: process.env.RESEND_API_KEY || '',
  notificationFromEmail: process.env.NOTIFICATION_FROM_EMAIL || '',
  siteUrl: process.env.SITE_URL || 'https://relvaload.ee',
  publicApiBaseUrl: process.env.PUBLIC_API_BASE_URL || 'https://relv-backend.vercel.app/api'
};
