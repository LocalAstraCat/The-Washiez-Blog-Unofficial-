-- The primary owner receives @owner mentions; administrators continue to receive @admins.

alter table public.site_settings
  add column if not exists owner_id uuid references public.profiles(id) on delete set null;

update public.site_settings
set owner_id = 'aea6733b-9e5d-4e7c-99b1-f7cfcb9d6ed9'
where id = 1
  and owner_id is null;

create or replace function public.is_site_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.site_settings
    where id = 1 and owner_id = auth.uid()
  );
$$;
