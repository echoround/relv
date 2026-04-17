# relv-backend

Standalone Vercel backend for:

- forum threads and comments
- mailing-list signups

Expected environment variables:

- `DATABASE_URL`
- `ALLOWED_ORIGINS`
- `ABUSE_SALT`
- `FORUM_AUTH_SECRET`
- `GOOGLE_CLIENT_ID`
- `RESEND_API_KEY`
- `NOTIFICATION_FROM_EMAIL`
- `SITE_URL`
- `PUBLIC_API_BASE_URL`

Example `ALLOWED_ORIGINS`:

`https://relvaload.ee,http://localhost:3000,http://127.0.0.1:5500`
