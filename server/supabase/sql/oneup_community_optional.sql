-- 1UP ANIME: optional Supabase community backend, not active until reviewed and deployed.
-- Execute on a NEW Supabase project after the owner approves it.
-- RLS is mandatory: public schema is exposed through the Supabase Data API.
-- Do not remove or replace existing Firebase data using this script.

create extension if not exists pgcrypto;

create table if not exists public.oneup_episode_comments (
  id uuid primary key default gen_random_uuid(),
  anime_id text not null check (anime_id ~ '^(mal|al)-[1-9][0-9]*$'),
  episode_number integer not null check (episode_number between 1 and 9999),
  author_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 3 and 25),
  body text not null check (char_length(btrim(body)) between 2 and 900),
  status text not null default 'visible' check (status in ('visible','hidden')),
  created_at timestamptz not null default now()
);
create index if not exists oneup_episode_comments_thread_idx
  on public.oneup_episode_comments (anime_id, episode_number, created_at desc);
create index if not exists oneup_episode_comments_author_idx
  on public.oneup_episode_comments (author_id, created_at desc);

create table if not exists public.oneup_comment_reports (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.oneup_episode_comments(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (char_length(btrim(reason)) between 10 and 300),
  created_at timestamptz not null default now(),
  unique (comment_id, reporter_id)
);
create index if not exists oneup_comment_reports_created_idx
  on public.oneup_comment_reports (created_at desc);

create table if not exists public.oneup_anime_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  anime_id text not null check (anime_id ~ '^(mal|al)-[1-9][0-9]*$'),
  favorite boolean not null default false,
  watched_episodes integer not null default 0 check (watched_episodes between 0 and 9999),
  updated_at timestamptz not null default now(),
  primary key (user_id, anime_id)
);

-- Make comments' timestamps server-authoritative; serialize per-author inserts.
-- Anonymous Auth users also have the authenticated role; use auth.uid() for ownership.
create or replace function public.oneup_guard_episode_comment()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is null or new.author_id <> auth.uid() then
    raise exception 'Invalid commenter' using errcode = '42501';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(new.author_id::text));
  if exists (
    select 1 from public.oneup_episode_comments
    where author_id = new.author_id
      and created_at > pg_catalog.now() - interval '45 seconds'
  ) then
    raise exception 'Please wait before commenting again' using errcode = 'P0001';
  end if;
  new.created_at := pg_catalog.now();
  new.status := 'visible';
  return new;
end;
$$;
revoke all on function public.oneup_guard_episode_comment() from public, anon, authenticated;
drop trigger if exists oneup_guard_episode_comment_insert on public.oneup_episode_comments;
create trigger oneup_guard_episode_comment_insert
before insert on public.oneup_episode_comments
for each row execute function public.oneup_guard_episode_comment();

-- Timestamps from visitors must not determine report chronology.
create or replace function public.oneup_guard_comment_report()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin
  if auth.uid() is null or new.reporter_id <> auth.uid() then
    raise exception 'Invalid reporter' using errcode = '42501';
  end if;
  new.created_at := pg_catalog.now();
  return new;
end;
$$;
revoke all on function public.oneup_guard_comment_report() from public, anon, authenticated;
drop trigger if exists oneup_guard_report_insert on public.oneup_comment_reports;
create trigger oneup_guard_report_insert
before insert on public.oneup_comment_reports
for each row execute function public.oneup_guard_comment_report();

create or replace function public.oneup_progress_update_time()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;
revoke all on function public.oneup_progress_update_time() from public, anon, authenticated;
drop trigger if exists oneup_progress_stamp on public.oneup_anime_progress;
create trigger oneup_progress_stamp before insert or update
on public.oneup_anime_progress for each row execute function public.oneup_progress_update_time();

alter table public.oneup_episode_comments enable row level security;
alter table public.oneup_comment_reports enable row level security;
alter table public.oneup_anime_progress enable row level security;

-- Public reads only visible comments. Authors may also review their own comments.
drop policy if exists "1up visible comments" on public.oneup_episode_comments;
create policy "1up visible comments" on public.oneup_episode_comments
for select to anon, authenticated
using (status = 'visible' or author_id = (select auth.uid()));

drop policy if exists "1up author comments" on public.oneup_episode_comments;
create policy "1up author comments" on public.oneup_episode_comments
for insert to authenticated
with check (author_id = (select auth.uid()) and status = 'visible');

drop policy if exists "1up report own" on public.oneup_comment_reports;
create policy "1up report own" on public.oneup_comment_reports
for insert to authenticated
with check (reporter_id = (select auth.uid()));

drop policy if exists "1up read own reports" on public.oneup_comment_reports;
create policy "1up read own reports" on public.oneup_comment_reports
for select to authenticated
using (reporter_id = (select auth.uid()));

drop policy if exists "1up read own progress" on public.oneup_anime_progress;
create policy "1up read own progress" on public.oneup_anime_progress
for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "1up insert own progress" on public.oneup_anime_progress;
create policy "1up insert own progress" on public.oneup_anime_progress
for insert to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "1up update own progress" on public.oneup_anime_progress;
create policy "1up update own progress" on public.oneup_anime_progress
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "1up delete own progress" on public.oneup_anime_progress;
create policy "1up delete own progress" on public.oneup_anime_progress
for delete to authenticated
using (user_id = (select auth.uid()));

-- Least-privilege API grants: nobody can change comment status from browser.
revoke all on public.oneup_episode_comments from anon, authenticated;
revoke all on public.oneup_comment_reports from anon, authenticated;
revoke all on public.oneup_anime_progress from anon, authenticated;
grant select on public.oneup_episode_comments to anon, authenticated;
grant insert on public.oneup_episode_comments to authenticated;
grant select, insert on public.oneup_comment_reports to authenticated;
grant select, insert, update, delete on public.oneup_anime_progress to authenticated;

-- Enable row-filtered Realtime subscriptions when Supabase's publication exists.
do $$
begin
  if exists(select 1 from pg_catalog.pg_publication where pubname = 'supabase_realtime')
    and not exists(
      select 1 from pg_catalog.pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'oneup_episode_comments'
    ) then
    alter publication supabase_realtime add table public.oneup_episode_comments;
  end if;
end $$;

-- Moderation is done by a privileged dashboard/admin server, not by user JWT metadata.
-- Never place service_role or secret keys in the GitHub Pages frontend.
