-- Private Chronicle staff rooms. This migration stores text only; attachments are intentionally unsupported.

create table if not exists public.chat_rooms (
  id text primary key check (id in ('admins', 'writers')),
  title text not null,
  description text not null,
  created_at timestamptz not null default now()
);

insert into public.chat_rooms (id, title, description)
values
  ('admins', 'Admin room', 'Private coordination for Chronicle administrators.'),
  ('writers', 'Writer room', 'Private coordination for approved writers and administrators.')
on conflict (id) do update
set title = excluded.title,
    description = excluded.description;

create or replace function public.can_access_chat_room(target_room_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when target_room_id = 'admins' then public.is_admin()
    when target_room_id = 'writers' then public.is_writer()
    else false
  end;
$$;

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id text not null references public.chat_rooms(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 4000),
  is_pinned boolean not null default false,
  pinned_at timestamptz,
  pinned_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint chat_messages_pin_metadata_check check (
    (is_pinned and pinned_at is not null and pinned_by is not null)
    or
    (not is_pinned and pinned_at is null and pinned_by is null)
  )
);

create index if not exists chat_messages_room_created_idx
  on public.chat_messages (room_id, created_at desc);
create index if not exists chat_messages_room_pinned_idx
  on public.chat_messages (room_id, is_pinned desc, pinned_at desc nulls last);
create index if not exists chat_messages_retention_idx
  on public.chat_messages (created_at)
  where is_pinned = false;

alter table public.chat_rooms enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists "staff members read permitted chat rooms" on public.chat_rooms;
create policy "staff members read permitted chat rooms"
on public.chat_rooms for select
to authenticated
using (public.can_access_chat_room(id));

drop policy if exists "staff members read permitted chat messages" on public.chat_messages;
create policy "staff members read permitted chat messages"
on public.chat_messages for select
to authenticated
using (public.can_access_chat_room(room_id));

drop policy if exists "staff members send messages to permitted rooms" on public.chat_messages;
create policy "staff members send messages to permitted rooms"
on public.chat_messages for insert
to authenticated
with check (
  author_id = auth.uid()
  and public.can_access_chat_room(room_id)
  and is_pinned = false
  and pinned_at is null
  and pinned_by is null
);

create or replace function public.set_chat_message_pinned(target_message_id uuid, should_pin boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only an administrator can pin or unpin a chat message';
  end if;

  update public.chat_messages
  set is_pinned = should_pin,
      pinned_at = case when should_pin then now() else null end,
      pinned_by = case when should_pin then auth.uid() else null end
  where id = target_message_id;

  if not found then
    raise exception 'Chat message not found';
  end if;
end;
$$;

revoke all on function public.set_chat_message_pinned(uuid, boolean) from public;
grant execute on function public.set_chat_message_pinned(uuid, boolean) to authenticated;

create or replace function public.delete_expired_unpinned_chat_messages()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  with deleted_messages as (
    delete from public.chat_messages
    where is_pinned = false
      and created_at < now() - interval '3 months'
    returning id
  )
  select count(*) into deleted_count from deleted_messages;

  return deleted_count;
end;
$$;

revoke all on function public.delete_expired_unpinned_chat_messages() from public;

-- Use a database-native schedule so retention runs even while the static GitHub Pages site is idle.
create extension if not exists pg_cron;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'chronicle-chat-retention') then
    perform cron.unschedule('chronicle-chat-retention');
  end if;
end;
$$;

select cron.schedule(
  'chronicle-chat-retention',
  '15 3 * * *',
  $$select public.delete_expired_unpinned_chat_messages();$$
);

alter table public.chat_messages replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'chat_messages'
  ) then
    alter publication supabase_realtime add table public.chat_messages;
  end if;
end;
$$;
