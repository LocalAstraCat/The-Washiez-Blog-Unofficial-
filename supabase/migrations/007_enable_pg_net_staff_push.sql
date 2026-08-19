-- The managed Database Webhooks UI is unavailable in this project because its
-- supabase_functions schema is absent. pg_net provides the same asynchronous
-- outbound request capability from a database trigger.
create extension if not exists pg_net;

create schema if not exists private;
revoke all on schema private from public;

create table if not exists private.chronicle_runtime_secrets (
  name text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

revoke all on private.chronicle_runtime_secrets from public;
revoke all on private.chronicle_runtime_secrets from anon;
revoke all on private.chronicle_runtime_secrets from authenticated;

comment on table private.chronicle_runtime_secrets is 'Server-only values used by trusted Chronicle database triggers. Never expose this table through the Data API.';
