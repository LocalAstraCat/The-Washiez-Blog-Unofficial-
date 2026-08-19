# GitHub Pages Release Notes

The repository includes a GitHub Actions workflow that builds the client at the `/The-Washiez-Blog-Unofficial-/` base path and deploys the static build to GitHub Pages when the repository’s Pages source is set to **GitHub Actions**.

## Repository configuration

Add the following **repository variables** in GitHub under **Settings → Secrets and variables → Actions → Variables**. They are browser-safe Supabase values, not service-role credentials.

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://klflwtkjvtyuzzxyjgkn.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | The project publishable key from Supabase Project Settings → API Keys |

## Important live-data requirement

GitHub Pages hosts only the static client. The Supabase schema must be applied from [`supabase/migrations/001_chronicle_schema.sql`](./supabase/migrations/001_chronicle_schema.sql) before the account, writer, article, comment, vote, and moderation workflows can be migrated to Supabase. The browser SQL Editor did not accept automated entry, so the migration is preserved for application through a normal Supabase CLI or SQL Editor session.

The current application remains functional on its server-capable deployment while the Supabase frontend conversion is completed. Do not place a secret or service-role key in GitHub Pages variables.
