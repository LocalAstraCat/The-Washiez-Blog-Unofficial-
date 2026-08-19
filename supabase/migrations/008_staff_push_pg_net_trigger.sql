-- Queue an asynchronous, server-to-server Edge Function call only for pending
-- browser-push deliveries. The trusted function independently validates the
-- private header token before reading message or subscription data.
create or replace function public.send_queued_staff_push()
returns trigger
language plpgsql
security definer
set search_path = public, private, net, pg_temp
as $$
declare
  webhook_secret text;
begin
  if new.channel <> 'push' or new.status <> 'pending' then
    return new;
  end if;

  select value
  into webhook_secret
  from private.chronicle_runtime_secrets
  where name = 'staff_push_webhook';

  -- Never block a staff-chat message merely because delivery configuration is
  -- unavailable. The notification remains pending for administrator review.
  if webhook_secret is null then
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
      'x-chronicle-webhook-secret', webhook_secret
    ),
    timeout_milliseconds := 5000
  );

  return new;
end;
$$;

revoke all on function public.send_queued_staff_push() from public;
revoke all on function public.send_queued_staff_push() from anon;
revoke all on function public.send_queued_staff_push() from authenticated;

drop trigger if exists staff_notifications_send_push on public.staff_notifications;
create trigger staff_notifications_send_push
after insert on public.staff_notifications
for each row
execute function public.send_queued_staff_push();
