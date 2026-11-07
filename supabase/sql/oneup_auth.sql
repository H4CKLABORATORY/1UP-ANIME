-- 1UP ANIME: native accounts on Supabase Auth (email + password ONLY).
-- Run in the Supabase SQL Editor (or `supabase db push` with migrations).
-- No Google provider, no anonymous sign-ins: Douglas enables ONLY Email
-- in Authentication > Providers. Passwords are hashed by Supabase Auth;
-- 1UP never stores them. Usernames live here, in public.profiles.
-- The trigger below creates the profile atomically at sign-up from the
-- `username` sent in the sign-up metadata; the UNIQUE constraint is the
-- atomic guard against two users racing for the same name.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists profiles_username_idx on public.profiles (username);

-- Reserved names (same list as auth.js validation). The trigger rejects them.
create or replace function public.oneup_reserved_username(p_username text)
returns boolean language sql immutable set search_path = '' as $$
  select lower(p_username) in (
    'admin','moderador','moderator','owner','propietario','soporte','support',
    '1up','oneup','verificado','verified','sistema','system','invitado','guest'
  );
$$;

-- Runs on every new auth.users row. Reads the username from sign-up metadata.
-- Raises (and fails the sign-up) when the name is missing, malformed,
-- reserved, already taken, or the sign-up is anonymous.
create or replace function public.oneup_handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_username text;
begin
  if coalesce((new.raw_user_meta_data ->> 'is_anonymous')::boolean, false)
     or coalesce((new.raw_app_meta_data ->> 'provider') = 'anonymous', false) then
    raise exception 'Anonymous sign-ups are disabled for 1UP Anime' using errcode = '42501';
  end if;
  v_username := lower(btrim(coalesce(new.raw_user_meta_data ->> 'username', '')));
  if v_username is null or v_username !~ '^[a-z0-9_]{3,20}$' then
    raise exception 'Username must be 3-20 chars: a-z, 0-9, underscore' using errcode = '23514';
  end if;
  if public.oneup_reserved_username(v_username) then
    raise exception 'Username is reserved' using errcode = '23514';
  end if;
  insert into public.profiles (id, username) values (new.id, v_username);
  return new;
exception
  when unique_violation then
    raise exception 'Username already taken' using errcode = '23505';
end;
$$;
revoke all on function public.oneup_handle_new_user() from public, anon, authenticated;
drop trigger if exists oneup_handle_new_user on auth.users;
create trigger oneup_handle_new_user
after insert on auth.users
for each row execute function public.oneup_handle_new_user();

-- Fallback claim for accounts whose profile is missing (e.g. created before
-- the trigger existed). Atomic: the UNIQUE constraint decides the race.
create or replace function public.claim_username(p_username text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_username text;
  v_uid uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'Anonymous users cannot claim usernames' using errcode = '42501';
  end if;
  v_username := lower(btrim(coalesce(p_username, '')));
  if v_username !~ '^[a-z0-9_]{3,20}$' then
    raise exception 'Username must be 3-20 chars: a-z, 0-9, underscore' using errcode = '23514';
  end if;
  if public.oneup_reserved_username(v_username) then
    raise exception 'Username is reserved' using errcode = '23514';
  end if;
  insert into public.profiles (id, username) values (v_uid, v_username)
  on conflict (id) do nothing;
  return v_username;
exception
  when unique_violation then
    raise exception 'Username already taken' using errcode = '23505';
end;
$$;
revoke all on function public.claim_username(text) from public, anon;
grant execute on function public.claim_username(text) to authenticated;

create or replace function public.oneup_profiles_update_time()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;
revoke all on function public.oneup_profiles_update_time() from public, anon, authenticated;
drop trigger if exists oneup_profiles_stamp on public.profiles;
create trigger oneup_profiles_stamp before update
on public.profiles for each row execute function public.oneup_profiles_update_time();

alter table public.profiles enable row level security;

-- Usernames are public (shown next to comments and posts).
drop policy if exists "1up profiles are public" on public.profiles;
create policy "1up profiles are public" on public.profiles
for select to anon, authenticated using (true);

-- Direct insert is the fallback path only (the trigger is the normal path).
drop policy if exists "1up insert own profile" on public.profiles;
create policy "1up insert own profile" on public.profiles
for insert to authenticated
with check (id = (select auth.uid()) and username ~ '^[a-z0-9_]{3,20}$');

-- Usernames never change; no update/delete policy on purpose.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to anon, authenticated;
grant insert on public.profiles to authenticated;
