-- 1UP ANIME: licensed-media (episode) admin on Supabase — Phase 6.
-- Run AFTER supabase/sql/oneup_auth.sql and supabase/sql/oneup_community.sql
-- (it reads public.oneup_admin_roles for the owner/moderator gate).
--
-- What this adds: ONE table, public.oneup_licensed_media, holding the
-- playable episode entries the owner/moderator manages from
-- admin-episodios.html. Before Phase 6 the only playable content was the
-- static data/licensed-media.json manifest; the site now merges BOTH
-- sources (static manifest + active rows of this table) in the detail /
-- player resolve chain. The static manifest stays exactly as before and
-- the site behaves identically when Supabase is not configured.
--
-- RULE 12 (ABSOLUTE) is enforced HERE, in the schema, not in the UI:
--   * a row can only be active = true when rights_status is 'owned' or
--     'authorized' AND rights_note is non-empty — a table CHECK, so a
--     direct PostgREST write that tries to activate a 'pending' /
--     'rejected' entry, or one without a documented rights note, fails
--     with 23514 no matter which client sends it;
--   * mode/source consistency is also a CHECK: official_embed requires an
--     11-char YouTube video id; file mode requires an https URL ending in
--     .mp4 / .webm / .m3u8;
--   * RLS: anon + authenticated read ONLY active owned/authorized rows
--     (admins also read their inactive/pending rows so the admin page can
--     list them); writes are owner/moderator only (oneup_admin_roles).
-- No pirated or unlicensed source can become visible through this table:
-- pending/rejected rows are never readable by the public and can never
-- be active at all.

create extension if not exists pgcrypto;

-- ---------- admin helper (the roles table itself stays locked) ----------
-- oneup_admin_roles has NO policy and NO grants for anon/authenticated on
-- purpose (see oneup_community.sql): only the service_role key reads it.
-- Direct PostgREST CRUD from the browser therefore needs a narrow
-- SECURITY DEFINER probe that answers ONLY about the caller.
create or replace function public.oneup_my_admin_role()
returns text language sql stable security definer set search_path = '' as $$
  select ar.role
  from public.oneup_admin_roles ar
  where ar.user_id = (select auth.uid())
    and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false;
$$;
revoke all on function public.oneup_my_admin_role() from public;
-- Granted to anon too: the RLS policy below calls oneup_is_admin() for
-- every reader, and for anon auth.uid() is null so it simply answers
-- false — it can never reveal another user's role.
grant execute on function public.oneup_my_admin_role() to anon, authenticated;

create or replace function public.oneup_is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.oneup_my_admin_role() in ('owner', 'moderator');
$$;
revoke all on function public.oneup_is_admin() from public;
grant execute on function public.oneup_is_admin() to anon, authenticated;

-- ---------- table ----------
create table if not exists public.oneup_licensed_media (
  id uuid primary key default gen_random_uuid(),
  anime_id text not null
    check (anime_id ~ '^(mal|al)-[1-9][0-9]*$'),
  season integer not null default 1 check (season between 1 and 99),
  episode_number integer not null check (episode_number between 1 and 9999),
  episode_title text not null default ''
    check (char_length(episode_title) <= 160),
  provider text not null
    check (char_length(btrim(provider)) between 1 and 80),
  mode text not null check (mode in ('official_embed', 'file')),
  video_id text,
  source_url text,
  language text not null default 'es-419'
    check (char_length(btrim(language)) between 2 and 35),
  quality text not null default ''
    check (char_length(quality) <= 35),
  subtitles_url text,
  rights_status text not null default 'pending'
    check (rights_status in ('owned', 'authorized', 'pending', 'rejected')),
  rights_note text not null default '',
  active boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Mode/source consistency (holds against direct API writes too).
  constraint oneup_licensed_media_source_shape check (
    (mode = 'official_embed'
       and video_id is not null
       and video_id ~ '^[A-Za-z0-9_-]{11}$')
    or
    (mode = 'file'
       and source_url is not null
       and lower(source_url) ~ '^https://[^[:space:]]+\.(mp4|webm|m3u8)([?][^[:space:]]*)?$')
  ),
  constraint oneup_licensed_media_subtitles_shape check (
    subtitles_url is null or lower(subtitles_url) ~ '^https://[^[:space:]]+\.vtt([?][^[:space:]]*)?$'
      or subtitles_url ~ '^\./media/[A-Za-z0-9_./-]+\.vtt$'
  ),
  -- RULE 12: publishable only with documented, cleared rights.
  constraint oneup_licensed_media_rule12 check (
    active = false
    or (rights_status in ('owned', 'authorized')
        and char_length(btrim(rights_note)) > 0)
  )
);
create index if not exists oneup_licensed_media_public_idx
  on public.oneup_licensed_media (anime_id, episode_number)
  where active;
create index if not exists oneup_licensed_media_admin_idx
  on public.oneup_licensed_media (anime_id, episode_number, created_at desc);

-- ---------- guard trigger: server-owned fields ----------
-- created_by always comes from the JWT (a client cannot attribute an
-- entry to someone else) and updated_at is stamped here.
create or replace function public.oneup_guard_licensed_media()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := (select auth.uid());
    new.created_at := pg_catalog.now();
  end if;
  new.updated_at := pg_catalog.now();
  new.anime_id := btrim(new.anime_id);
  new.provider := btrim(new.provider);
  new.rights_note := btrim(new.rights_note);
  return new;
end;
$$;
revoke all on function public.oneup_guard_licensed_media() from public, anon, authenticated;
drop trigger if exists oneup_guard_licensed_media_write on public.oneup_licensed_media;
create trigger oneup_guard_licensed_media_write
before insert or update on public.oneup_licensed_media
for each row execute function public.oneup_guard_licensed_media();

-- ---------- RLS ----------
alter table public.oneup_licensed_media enable row level security;

-- Public read: ONLY active + rights-cleared rows. Admins additionally see
-- every row (their own management view: inactive, pending, rejected).
drop policy if exists "1up licensed media public read" on public.oneup_licensed_media;
create policy "1up licensed media public read" on public.oneup_licensed_media
for select to anon, authenticated
using (
  (active and rights_status in ('owned', 'authorized'))
  or (select public.oneup_is_admin())
);

drop policy if exists "1up licensed media admin insert" on public.oneup_licensed_media;
create policy "1up licensed media admin insert" on public.oneup_licensed_media
for insert to authenticated
with check ((select public.oneup_is_admin()));

drop policy if exists "1up licensed media admin update" on public.oneup_licensed_media;
create policy "1up licensed media admin update" on public.oneup_licensed_media
for update to authenticated
using ((select public.oneup_is_admin()))
with check ((select public.oneup_is_admin()));

drop policy if exists "1up licensed media admin delete" on public.oneup_licensed_media;
create policy "1up licensed media admin delete" on public.oneup_licensed_media
for delete to authenticated
using ((select public.oneup_is_admin()));

-- ---------- least-privilege grants ----------
revoke all on public.oneup_licensed_media from anon, authenticated;
grant select on public.oneup_licensed_media to anon, authenticated;
grant insert, update, delete on public.oneup_licensed_media to authenticated;
