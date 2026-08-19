# Supabase Setup Handoff

The reviewed Chronicle schema is saved at [`supabase/migrations/001_chronicle_schema.sql`](./supabase/migrations/001_chronicle_schema.sql). It creates only the new profiles, posts, writer applications, comments, and votes tables, plus Row Level Security policies. It also creates profile records from the native Chronicle username stored at sign-up. It does not drop or alter existing Supabase project data.

## Current status

The project URL and browser-safe Supabase publishable key were validated successfully. Native email/password authentication is enabled; mandatory email confirmation, secure dual-address email change, and the superseded GitHub provider are disabled. This lets readers create a username/password account without an email, while a supplied real email receives its own optional verification link. The browser SQL Editor displayed the complete migration, but its internal editor state failed to register automated text entry and returned `query: Too small: expected string to have >=1 characters` before it sent any SQL. No database schema change was confirmed.

## Reliable ways to apply the migration later

The migration can be applied through the Supabase CLI after linking the repository to the project, through a local PostgreSQL connection using the database password, or by pasting it into a normally functioning Supabase SQL Editor session. Once it is applied, the first native Chronicle account needs its `profiles.role` changed to `admin` so that it can approve writers and moderate the Chronicle.

> Do not use a service-role key in the GitHub Pages frontend. The checked-in migration is designed for the public publishable key with Row Level Security enabled.
