-- Browser-push delivery records and a deferred email foundation for staff role mentions.

alter table public.site_settings
  add column if not exists push_vapid_public_key text;

create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  browser_push_mentions_enabled boolean not null default false,
  email_mentions_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique check (char_length(endpoint) between 20 and 4096),
  p256dh_key text not null check (char_length(p256dh_key) between 16 and 512),
  auth_key text not null check (char_length(auth_key) between 8 and 512),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id, updated_at desc);

create table if not exists public.staff_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  chat_message_id uuid not null references public.chat_messages(id) on delete cascade,
  channel text not null check (channel in ('push', 'email')),
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'skipped', 'deferred')),
  attempts smallint not null default 0 check (attempts >= 0 and attempts <= 10),
  last_error text,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (recipient_id, chat_message_id, channel)
);

create index if not exists staff_notifications_delivery_idx
  on public.staff_notifications (channel, status, created_at asc);
create index if not exists staff_notifications_recipient_idx
  on public.staff_notifications (recipient_id, created_at desc);

alter table public.notification_preferences enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.staff_notifications enable row level security;

drop policy if exists "members read own notification preferences" on public.notification_preferences;
create policy "members read own notification preferences"
on public.notification_preferences for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "members create own notification preferences" on public.notification_preferences;
create policy "members create own notification preferences"
on public.notification_preferences for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "members update own notification preferences" on public.notification_preferences;
create policy "members update own notification preferences"
on public.notification_preferences for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "members read own push subscriptions" on public.push_subscriptions;
create policy "members read own push subscriptions"
on public.push_subscriptions for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "members create own push subscriptions" on public.push_subscriptions;
create policy "members create own push subscriptions"
on public.push_subscriptions for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "members update own push subscriptions" on public.push_subscriptions;
create policy "members update own push subscriptions"
on public.push_subscriptions for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "members delete own push subscriptions" on public.push_subscriptions;
create policy "members delete own push subscriptions"
on public.push_subscriptions for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "members read own staff notifications" on public.staff_notifications;
create policy "members read own staff notifications"
on public.staff_notifications for select
to authenticated
using (recipient_id = auth.uid() or public.is_admin());

drop trigger if exists notification_preferences_set_updated_at on public.notification_preferences;
create trigger notification_preferences_set_updated_at before update on public.notification_preferences
for each row execute function public.set_updated_at();

drop trigger if exists push_subscriptions_set_updated_at on public.push_subscriptions;
create trigger push_subscriptions_set_updated_at before update on public.push_subscriptions
for each row execute function public.set_updated_at();

drop trigger if exists staff_notifications_set_updated_at on public.staff_notifications;
create trigger staff_notifications_set_updated_at before update on public.staff_notifications
for each row execute function public.set_updated_at();

create or replace function public.enqueue_role_mention_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (
    new.body ~* '(^|[[:space:]])@admins([[:space:][:punct:]]|$)'
    or new.body ~* '(^|[[:space:]])@authors([[:space:][:punct:]]|$)'
    or new.body ~* '(^|[[:space:]])@owner([[:space:][:punct:]]|$)'
  ) then
    return new;
  end if;

  with recipients as (
    select distinct profile.id
    from public.profiles as profile
    where profile.id <> new.author_id
      and (
        (new.body ~* '(^|[[:space:]])@admins([[:space:][:punct:]]|$)' and profile.role = 'admin')
        or (new.body ~* '(^|[[:space:]])@authors([[:space:][:punct:]]|$)' and profile.role in ('writer', 'admin'))
        or (new.body ~* '(^|[[:space:]])@owner([[:space:][:punct:]]|$)' and profile.id = (select owner_id from public.site_settings where id = 1))
      )
  )
  insert into public.staff_notifications (recipient_id, chat_message_id, channel, status)
  select recipient.id, new.id, 'push', 'pending'
  from recipients as recipient
  join public.notification_preferences as preference on preference.user_id = recipient.id
  where preference.browser_push_mentions_enabled = true
  on conflict (recipient_id, chat_message_id, channel) do nothing;

  -- Email records are intentionally deferred. A delivery function will be enabled only after
  -- a verified sender, provider credentials, and member email-verification flow are configured.
  with recipients as (
    select distinct profile.id
    from public.profiles as profile
    where profile.id <> new.author_id
      and (
        (new.body ~* '(^|[[:space:]])@admins([[:space:][:punct:]]|$)' and profile.role = 'admin')
        or (new.body ~* '(^|[[:space:]])@authors([[:space:][:punct:]]|$)' and profile.role in ('writer', 'admin'))
        or (new.body ~* '(^|[[:space:]])@owner([[:space:][:punct:]]|$)' and profile.id = (select owner_id from public.site_settings where id = 1))
      )
  )
  insert into public.staff_notifications (recipient_id, chat_message_id, channel, status)
  select recipient.id, new.id, 'email', 'deferred'
  from recipients as recipient
  join public.notification_preferences as preference on preference.user_id = recipient.id
  where preference.email_mentions_enabled = true
  on conflict (recipient_id, chat_message_id, channel) do nothing;

  return new;
end;
$$;

drop trigger if exists chat_messages_enqueue_role_mention_notifications on public.chat_messages;
create trigger chat_messages_enqueue_role_mention_notifications
after insert on public.chat_messages
for each row execute function public.enqueue_role_mention_notifications();
