-- Private owner feedback for an unpublished article. The post author and admins may read it;
-- only the administrator can create or update it through the controlled RPC.

create table if not exists public.owner_post_feedback (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null unique references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 8000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists owner_post_feedback_author_idx on public.owner_post_feedback (author_id, updated_at desc);

alter table public.owner_post_feedback enable row level security;

drop policy if exists "authors and admins read owner feedback" on public.owner_post_feedback;
create policy "authors and admins read owner feedback" on public.owner_post_feedback
for select using (author_id = auth.uid() or public.is_admin());

drop trigger if exists owner_post_feedback_set_updated_at on public.owner_post_feedback;
create trigger owner_post_feedback_set_updated_at before update on public.owner_post_feedback
for each row execute function public.set_updated_at();

create or replace function public.save_owner_post_feedback(target_post_id uuid, feedback_body text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_author_id uuid;
  target_status text;
begin
  if not public.is_admin() then
    raise exception 'Only an administrator can leave private post feedback';
  end if;

  if char_length(trim(coalesce(feedback_body, ''))) < 1 or char_length(feedback_body) > 8000 then
    raise exception 'Feedback must contain between 1 and 8000 characters';
  end if;

  select author_id, status into target_author_id, target_status
  from public.posts
  where id = target_post_id;

  if not found then
    raise exception 'Post not found';
  end if;

  if target_status <> 'unpublished' then
    raise exception 'Feedback can only be left for an unpublished post';
  end if;

  insert into public.owner_post_feedback (post_id, author_id, owner_id, body)
  values (target_post_id, target_author_id, auth.uid(), trim(feedback_body))
  on conflict (post_id) do update set owner_id = excluded.owner_id, body = excluded.body;
end;
$$;

revoke all on function public.save_owner_post_feedback(uuid, text) from public;
grant execute on function public.save_owner_post_feedback(uuid, text) to authenticated;
