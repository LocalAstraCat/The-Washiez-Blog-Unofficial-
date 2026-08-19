-- Washiez Chronicle: Supabase schema and Row Level Security.
-- This migration creates new tables only; it does not delete existing project data.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null unique check (display_name ~ '^[A-Za-z0-9_-]{3,24}$'),
  role text not null default 'user' check (role in ('user', 'writer', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null check (char_length(title) between 4 and 220),
  body text not null check (char_length(body) between 20 and 50000),
  cover_image_url text,
  category text not null check (char_length(category) between 2 and 64),
  tags text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'published', 'unpublished')),
  author_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create index if not exists posts_publication_idx on public.posts (status, published_at desc);
create index if not exists posts_author_idx on public.posts (author_id, updated_at desc);
create index if not exists posts_tags_idx on public.posts using gin (tags);

create table if not exists public.writer_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  motivation text not null check (char_length(motivation) between 50 and 1500),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 2 and 2000),
  status text not null default 'visible' check (status in ('visible', 'hidden')),
  created_at timestamptz not null default now()
);

create index if not exists comments_post_idx on public.comments (post_id, created_at desc);

create table if not exists public.post_votes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists posts_set_updated_at on public.posts;
create trigger posts_set_updated_at before update on public.posts
for each row execute function public.set_updated_at();

drop trigger if exists post_votes_set_updated_at on public.post_votes;
create trigger post_votes_set_updated_at before update on public.post_votes
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_writer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('writer', 'admin'));
$$;

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.writer_applications enable row level security;
alter table public.comments enable row level security;
alter table public.post_votes enable row level security;

drop policy if exists "profiles readable" on public.profiles;
create policy "profiles readable" on public.profiles for select using (true);
drop policy if exists "admins manage profiles" on public.profiles;
create policy "admins manage profiles" on public.profiles for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "published posts readable" on public.posts;
create policy "published posts readable" on public.posts for select using (status = 'published');
drop policy if exists "authors read own posts" on public.posts;
create policy "authors read own posts" on public.posts for select using (author_id = auth.uid() or public.is_admin());
drop policy if exists "writers create own posts" on public.posts;
create policy "writers create own posts" on public.posts for insert with check (public.is_writer() and author_id = auth.uid());
drop policy if exists "authors update own posts" on public.posts;
create policy "authors update own posts" on public.posts for update using (author_id = auth.uid() or public.is_admin()) with check ((author_id = auth.uid() and public.is_writer()) or public.is_admin());
drop policy if exists "authors delete drafts" on public.posts;
create policy "authors delete drafts" on public.posts for delete using ((author_id = auth.uid() and status <> 'published') or public.is_admin());

drop policy if exists "applications readable by owner" on public.writer_applications;
create policy "applications readable by owner" on public.writer_applications for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "users submit applications" on public.writer_applications;
create policy "users submit applications" on public.writer_applications for insert with check (user_id = auth.uid() and status = 'pending');
drop policy if exists "users revise rejected applications" on public.writer_applications;
create policy "users revise rejected applications" on public.writer_applications for update using ((user_id = auth.uid() and status = 'rejected') or public.is_admin()) with check ((user_id = auth.uid() and status = 'pending') or public.is_admin());

drop policy if exists "visible comments readable" on public.comments;
create policy "visible comments readable" on public.comments for select using (status = 'visible' or author_id = auth.uid() or public.is_admin());
drop policy if exists "readers create comments" on public.comments;
create policy "readers create comments" on public.comments for insert with check (author_id = auth.uid() and exists (select 1 from public.posts where id = post_id and status = 'published'));
drop policy if exists "admins moderate comments" on public.comments;
create policy "admins moderate comments" on public.comments for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "votes readable" on public.post_votes;
create policy "votes readable" on public.post_votes for select using (true);
drop policy if exists "users cast own votes" on public.post_votes;
create policy "users cast own votes" on public.post_votes for insert with check (user_id = auth.uid() and exists (select 1 from public.posts where id = post_id and status = 'published'));
drop policy if exists "users amend own votes" on public.post_votes;
create policy "users amend own votes" on public.post_votes for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- After the first sign-in, promote the site owner with:
-- update public.profiles set role = 'admin' where id = '<owner auth uid>';
