# relv-backend

Standalone Vercel backend for:

- forum threads and comments
- mailing-list signups

Expected environment variables:

- `DATABASE_URL`
- `ALLOWED_ORIGINS`
- `ABUSE_SALT`

Example `ALLOWED_ORIGINS`:

`https://relvaload.ee,http://localhost:3000,http://127.0.0.1:5500`
