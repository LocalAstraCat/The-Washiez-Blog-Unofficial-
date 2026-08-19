-- One globally pinned published post, administered only through a security-definer RPC.

create table if not exists public.site_settings (
  id smallint primary key default 1 check (id = 1),
  pinned_post_id uuid references public.posts(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.site_settings (id)
values (1)
on conflict (id) do nothing;

alter table public.site_settings enable row level security;

drop policy if exists "site settings readable" on public.site_settings;
create policy "site settings readable" on public.site_settings for select using (true);

drop trigger if exists site_settings_set_updated_at on public.site_settings;
create trigger site_settings_set_updated_at before update on public.site_settings
for each row execute function public.set_updated_at();

create or replace function public.set_pinned_post(target_post_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only an administrator can pin a post';
  end if;

  if target_post_id is not null and not exists (
    select 1 from public.posts where id = target_post_id and status = 'published'
  ) then
    raise exception 'Only a published post can be pinned';
  end if;

  update public.site_settings set pinned_post_id = target_post_id where id = 1;
end;
$$;

revoke all on function public.set_pinned_post(uuid) from public;
grant execute on function public.set_pinned_post(uuid) to authenticated;

create or replace function public.clear_pinned_post_when_unpublished()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status <> 'published' then
    update public.site_settings set pinned_post_id = null where id = 1 and pinned_post_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists posts_clear_pin_on_unpublish on public.posts;
create trigger posts_clear_pin_on_unpublish
after update of status on public.posts
for each row execute function public.clear_pinned_post_when_unpublished();
