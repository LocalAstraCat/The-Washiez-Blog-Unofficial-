-- Supabase’s Edge Function gateway requires its publishable key even when the
-- function has custom authorization logic. Keep the key in the private runtime
-- configuration so it can be rotated without changing the trigger source.
create or replace function public.send_queued_staff_push()
returns trigger
language plpgsql
security definer
set search_path = public, private, net, pg_temp
as $$
declare
  webhook_secret text;
  publishable_key text;
begin
  if new.channel <> 'push' or new.status <> 'pending' then
    return new;
  end if;

  select value
  into webhook_secret
  from private.chronicle_runtime_secrets
  where name = 'staff_push_webhook';

  select value
  into publishable_key
  from private.chronicle_runtime_secrets
  where name = 'staff_push_publishable_key';

  -- Do not block chat delivery if server-side notification configuration is
  -- incomplete. The queue record remains available for troubleshooting.
  if webhook_secret is null or publishable_key is null then
    return new;
  end if;

  perform net.http_post(
    url := 'https://klflwtkjvtyuzzxyjgkn.supabase.co/functions/v1/send-staff-push',
    body := jsonb_build_object(
      'type', 'INSERT',
      'schema', 'public',
      'table', 'staff_notifications',
      'record', to_jsonb(new)
    ),
    params := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || publishable_key,
      'apikey', publishable_key,
      'x-chronicle-webhook-secret', webhook_secret
    ),
    timeout_milliseconds := 5000
  );

  return new;
end;
$$;
