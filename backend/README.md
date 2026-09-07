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
- `ADMIN_STATS_SECRET`
- `RESEND_API_KEY`
- `NOTIFICATION_FROM_EMAIL`
- `SITE_URL`
- `PUBLIC_API_BASE_URL`

Example `ALLOWED_ORIGINS`:

`https://relvaload.ee,http://localhost:3000,http://127.0.0.1:5500`

Google account totals are recorded in `google_accounts` whenever a Google credential is successfully verified. Historical authenticated activity is backfilled the first time the schema initializes.

Aggregate account statistics are available from `GET /api/admin/accounts/stats` with the admin secret:

```sh
curl -H "Authorization: Bearer $ADMIN_STATS_SECRET" https://relv-backend.vercel.app/api/admin/accounts/stats
```
