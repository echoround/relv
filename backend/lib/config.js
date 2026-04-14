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
  abuseSalt: process.env.ABUSE_SALT || 'relv-default-salt'
};
