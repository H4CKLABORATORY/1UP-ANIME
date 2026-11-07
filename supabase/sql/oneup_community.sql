-- 1UP ANIME: community backend on Supabase (Postgres + RLS + triggers).
-- Replaces the removed previous backend (old database + server functions):
--   episodeThreads/comments  -> oneup_episode_comments (oneup_community_optional.sql)
--   communityPosts           -> oneup_community_posts
--   communityPosts/comments  -> oneup_community_comments
--   communityPosts/reactions -> oneup_community_reactions (+ RPC toggle)
--   globalMessages           -> oneup_global_messages
--   creatorProfiles          -> oneup_creator_profiles
--   userFollowing            -> oneup_user_follows (+ RPC toggle)
--   friendRequests/friendships -> oneup_friend_requests / oneup_friendships (+ RPC respond)
--   verificationRequests     -> oneup_verification_requests
--   moderationReports        -> oneup_moderation_reports
--   adminRoles / creatorFlags -> oneup_admin_roles (+ verified/owner on profiles)
--   rateLimits               -> oneup_rate_limits (+ guard triggers)
-- User writes go DIRECTLY to Postgres under RLS (no callable needed).
-- Moderation writes need service_role and live in Edge Functions under
-- supabase/functions/ (moderation-dashboard, moderate-post, review-report,
-- review-verification, moderate-episode-comment, moderate-global-message,
-- moderate-community-reply). Run after supabase/sql/oneup_auth.sql.
-- Anonymous Auth is NOT used: every guard rejects anonymous JWTs, and the
-- Anonymous provider must stay disabled in the Supabase dashboard.

create extension if not exists pgcrypto;

-- Tables needed by the helper functions below (defined again later with
-- IF NOT EXISTS; Postgres resolves function bodies at creation time).
create table if not exists public.oneup_rate_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  episode_at bigint, post_at bigint, reply_at bigint, react_at bigint,
  chat_at bigint, report_at bigint, profile_at bigint, verify_at bigint,
  friend_at bigint, window_start bigint not null default 0,
  hourly integer not null default 0
);

create table if not exists public.oneup_creator_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 3 and 25),
  icon text not null default '⚔️' check (icon in ('⚔️','🔥','🦇','🌙','🐉','🎃','💀','✨')),
  avatar_path text not null default '' check (avatar_path = '' or avatar_path ~ '^avatars/[0-9a-f-]{36}/[A-Za-z0-9_-]{8,90}\.(jpg|png|webp)$'),
  verified boolean not null default false,
  owner boolean not null default false,
  followers integer not null default 0 check (followers >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.oneup_admin_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','moderator')),
  granted_at timestamptz not null default now()
);


-- ---------- helpers ----------
create or replace function public.oneup_is_anonymous()
returns boolean language sql stable set search_path = '' as $$
  select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false);
$$;

create or replace function public.oneup_require_account()
returns uuid language plpgsql stable set search_path = '' as $$
declare
  v_uid uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;
  if public.oneup_is_anonymous() then
    raise exception 'A 1UP account is required' using errcode = '42501';
  end if;
  return v_uid;
end;
$$;

-- Per-user rate limit, same windows as the old callables (ms).
create or replace function public.oneup_check_rate(p_kind text, p_ms bigint)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_now bigint := (extract(epoch from pg_catalog.now()) * 1000)::bigint;
  v_row public.oneup_rate_limits%rowtype;
  v_last bigint;
begin
  if v_uid is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(v_uid::text));
  select * into v_row from public.oneup_rate_limits where user_id = v_uid for update;
  if not found then
    insert into public.oneup_rate_limits (user_id, window_start, hourly)
    values (v_uid, v_now, 0) returning * into v_row;
  end if;
  v_last := case p_kind
    when 'episode' then v_row.episode_at when 'post' then v_row.post_at
    when 'reply' then v_row.reply_at when 'react' then v_row.react_at
    when 'chat' then v_row.chat_at when 'report' then v_row.report_at
    when 'profile' then v_row.profile_at when 'verify' then v_row.verify_at
    when 'friend' then v_row.friend_at else 0 end;
  if v_last is not null and v_now - v_last < p_ms then
    raise exception 'Please wait before posting again' using errcode = 'P0001';
  end if;
  if v_now - coalesce(v_row.window_start, 0) >= 3600000 then
    update public.oneup_rate_limits
    set window_start = v_now, hourly = 1,
      episode_at = case when p_kind = 'episode' then v_now else episode_at end,
      post_at = case when p_kind = 'post' then v_now else post_at end,
      reply_at = case when p_kind = 'reply' then v_now else reply_at end,
      react_at = case when p_kind = 'react' then v_now else react_at end,
      chat_at = case when p_kind = 'chat' then v_now else chat_at end,
      report_at = case when p_kind = 'report' then v_now else report_at end,
      profile_at = case when p_kind = 'profile' then v_now else profile_at end,
      verify_at = case when p_kind = 'verify' then v_now else verify_at end,
      friend_at = case when p_kind = 'friend' then v_now else friend_at end
    where user_id = v_uid;
  else
    if coalesce(v_row.hourly, 0) >= 55 then
      raise exception 'Hourly posting limit reached' using errcode = 'P0001';
    end if;
    update public.oneup_rate_limits
    set hourly = coalesce(hourly, 0) + 1,
      episode_at = case when p_kind = 'episode' then v_now else episode_at end,
      post_at = case when p_kind = 'post' then v_now else post_at end,
      reply_at = case when p_kind = 'reply' then v_now else reply_at end,
      react_at = case when p_kind = 'react' then v_now else react_at end,
      chat_at = case when p_kind = 'chat' then v_now else chat_at end,
      report_at = case when p_kind = 'report' then v_now else report_at end,
      profile_at = case when p_kind = 'profile' then v_now else profile_at end,
      verify_at = case when p_kind = 'verify' then v_now else verify_at end,
      friend_at = case when p_kind = 'friend' then v_now else friend_at end
    where user_id = v_uid;
  end if;
end;
$$;
revoke all on function public.oneup_check_rate(text, bigint) from public, anon, authenticated;
-- Guard triggers run as the caller (security invoker), so the rate check must
-- be executable by authenticated users. It only ever touches the caller's
-- own row (auth.uid()), so this grants no access to other users' data.
grant execute on function public.oneup_check_rate(text, bigint) to authenticated;

-- Fill the public author fields from the account profile (server-side, so
-- clients cannot spoof another name, icon, avatar or verified badge).
create or replace function public.oneup_author_fields(p_uid uuid)
returns table(display_name text, icon text, avatar_path text, verified boolean, owner boolean)
language sql stable security definer set search_path = '' as $$
  select
    coalesce(cp.display_name, pr.username, 'Fan del anime'),
    coalesce(cp.icon, '⚔️'),
    coalesce(cp.avatar_path, ''),
    coalesce(cp.verified, false),
    coalesce(cp.owner, false)
  from public.profiles pr
  left join public.oneup_creator_profiles cp on cp.user_id = pr.id
  left join public.oneup_admin_roles ar on ar.user_id = pr.id
  where pr.id = p_uid;
$$;
revoke all on function public.oneup_author_fields(uuid) from public, anon, authenticated;
-- Guard triggers (security invoker) call this helper, so authenticated users
-- need EXECUTE on it. It is SECURITY DEFINER but only reads public profile
-- fields for the uid it is given, so this grants no private data.
grant execute on function public.oneup_author_fields(uuid) to authenticated;

-- ---------- tables ----------
create table if not exists public.oneup_rate_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  episode_at bigint, post_at bigint, reply_at bigint, react_at bigint,
  chat_at bigint, report_at bigint, profile_at bigint, verify_at bigint,
  friend_at bigint, window_start bigint not null default 0,
  hourly integer not null default 0
);

create table if not exists public.oneup_creator_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 3 and 25),
  icon text not null default '⚔️' check (icon in ('⚔️','🔥','🦇','🌙','🐉','🎃','💀','✨')),
  avatar_path text not null default '' check (avatar_path = '' or avatar_path ~ '^avatars/[0-9a-f-]{36}/[A-Za-z0-9_-]{8,90}\.(jpg|png|webp)$'),
  verified boolean not null default false,
  owner boolean not null default false,
  followers integer not null default 0 check (followers >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.oneup_community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 28),
  icon text not null default '⚔️',
  avatar_path text not null default '',
  verified boolean not null default false,
  owner boolean not null default false,
  kind text not null check (kind in ('debate','pregunta','fanart','clip','manga','recomendacion')),
  text text not null check (char_length(btrim(text)) between 3 and 2500),
  media_path text not null default '' check (media_path = '' or media_path ~ '^postUploads/[0-9a-f-]{36}/[A-Za-z0-9_-]{8,90}/media\.(jpg|png|webp|mp4)$'),
  status text not null default 'visible' check (status in ('visible','pending','removed')),
  likes integer not null default 0 check (likes >= 0),
  reports integer not null default 0 check (reports >= 0),
  created_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz
);
create index if not exists oneup_community_posts_feed_idx
  on public.oneup_community_posts (status, created_at desc);
create index if not exists oneup_community_posts_author_idx
  on public.oneup_community_posts (author_id, created_at desc);

create table if not exists public.oneup_community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.oneup_community_posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 28),
  icon text not null default '⚔️',
  avatar_path text not null default '',
  verified boolean not null default false,
  owner boolean not null default false,
  text text not null check (char_length(btrim(text)) between 2 and 1200),
  status text not null default 'visible' check (status in ('visible','removed')),
  created_at timestamptz not null default now()
);
create index if not exists oneup_community_comments_post_idx
  on public.oneup_community_comments (post_id, created_at asc);

create table if not exists public.oneup_community_reactions (
  post_id uuid not null references public.oneup_community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.oneup_global_messages (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 28),
  icon text not null default '⚔️',
  avatar_path text not null default '',
  verified boolean not null default false,
  owner boolean not null default false,
  text text not null check (char_length(btrim(text)) between 2 and 350),
  status text not null default 'visible' check (status in ('visible','removed')),
  created_at timestamptz not null default now()
);
create index if not exists oneup_global_messages_feed_idx
  on public.oneup_global_messages (status, created_at desc);

create table if not exists public.oneup_user_follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  target_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, target_id),
  check (follower_id <> target_id)
);

create table if not exists public.oneup_friend_requests (
  from_id uuid not null references auth.users(id) on delete cascade,
  to_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 28),
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  primary key (from_id, to_id),
  check (from_id <> to_id)
);

create table if not exists public.oneup_friendships (
  user_id uuid not null references auth.users(id) on delete cascade,
  friend_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null default 'Amigo de 1UP',
  since timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);

create table if not exists public.oneup_verification_requests (
  user_id uuid primary key references auth.users(id) on delete cascade,
  reason text not null check (char_length(btrim(reason)) between 30 and 600),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  requested_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz
);

create table if not exists public.oneup_moderation_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('episodeComment','communityPost','communityComment','globalMessage')),
  target text not null check (char_length(btrim(target)) between 10 and 240),
  reason text not null check (char_length(btrim(reason)) between 4 and 160),
  status text not null default 'pending' check (status in ('pending','resolved','dismissed')),
  created_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz
);
create index if not exists oneup_moderation_reports_pending_idx
  on public.oneup_moderation_reports (status, created_at desc);

create table if not exists public.oneup_admin_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','moderator')),
  granted_at timestamptz not null default now()
);

-- ---------- guard triggers (ownership + server fields + rate limits) ----------
create or replace function public.oneup_guard_community_post()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  v_uid uuid;
  v_author record;
begin
  v_uid := public.oneup_require_account();
  if new.author_id <> v_uid then
    raise exception 'Invalid author' using errcode = '42501';
  end if;
  perform public.oneup_check_rate('post', 45000);
  select * into v_author from public.oneup_author_fields(v_uid);
  new.display_name := v_author.display_name;
  new.icon := v_author.icon;
  new.avatar_path := v_author.avatar_path;
  new.verified := v_author.verified;
  new.owner := v_author.owner;
  new.status := case when new.media_path <> '' then 'pending' else 'visible' end;
  new.likes := 0;
  new.reports := 0;
  new.created_at := pg_catalog.now();
  new.reviewed_by := null;
  new.reviewed_at := null;
  return new;
end;
$$;
revoke all on function public.oneup_guard_community_post() from public, anon, authenticated;
drop trigger if exists oneup_guard_community_post_insert on public.oneup_community_posts;
create trigger oneup_guard_community_post_insert
before insert on public.oneup_community_posts
for each row execute function public.oneup_guard_community_post();

create or replace function public.oneup_guard_community_comment()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  v_uid uuid;
  v_author record;
  v_post public.oneup_community_posts%rowtype;
begin
  v_uid := public.oneup_require_account();
  if new.author_id <> v_uid then
    raise exception 'Invalid author' using errcode = '42501';
  end if;
  select * into v_post from public.oneup_community_posts where id = new.post_id;
  if not found or v_post.status <> 'visible' then
    raise exception 'Post not available' using errcode = 'P0002';
  end if;
  perform public.oneup_check_rate('reply', 14000);
  select * into v_author from public.oneup_author_fields(v_uid);
  new.display_name := v_author.display_name;
  new.icon := v_author.icon;
  new.avatar_path := v_author.avatar_path;
  new.verified := v_author.verified;
  new.owner := v_author.owner;
  new.status := 'visible';
  new.created_at := pg_catalog.now();
  return new;
end;
$$;
revoke all on function public.oneup_guard_community_comment() from public, anon, authenticated;
drop trigger if exists oneup_guard_community_comment_insert on public.oneup_community_comments;
create trigger oneup_guard_community_comment_insert
before insert on public.oneup_community_comments
for each row execute function public.oneup_guard_community_comment();

create or replace function public.oneup_guard_global_message()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  v_uid uuid;
  v_author record;
begin
  v_uid := public.oneup_require_account();
  if new.author_id <> v_uid then
    raise exception 'Invalid author' using errcode = '42501';
  end if;
  perform public.oneup_check_rate('chat', 15000);
  select * into v_author from public.oneup_author_fields(v_uid);
  new.display_name := v_author.display_name;
  new.icon := v_author.icon;
  new.avatar_path := v_author.avatar_path;
  new.verified := v_author.verified;
  new.owner := v_author.owner;
  new.status := 'visible';
  new.created_at := pg_catalog.now();
  return new;
end;
$$;
revoke all on function public.oneup_guard_global_message() from public, anon, authenticated;
drop trigger if exists oneup_guard_global_message_insert on public.oneup_global_messages;
create trigger oneup_guard_global_message_insert
before insert on public.oneup_global_messages
for each row execute function public.oneup_guard_global_message();

-- Users may edit their own creator profile, but never their badges or count.
create or replace function public.oneup_guard_creator_profile()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  v_uid uuid;
begin
  -- Service role (moderation Edge Functions) bypasses the user checks: the
  -- function already verified an owner/moderator JWT before calling.
  if auth.role() = 'service_role' then
    new.updated_at := pg_catalog.now();
    return new;
  end if;
  v_uid := public.oneup_require_account();
  if new.user_id <> v_uid then
    raise exception 'Invalid profile' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' then
    new.verified := old.verified;
    new.owner := old.owner;
    new.followers := old.followers;
  end if;
  if tg_op = 'INSERT' then
    new.verified := false;
    new.owner := false;
    new.followers := 0;
    perform public.oneup_check_rate('profile', 60000);
  end if;
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;
revoke all on function public.oneup_guard_creator_profile() from public, anon, authenticated;
drop trigger if exists oneup_guard_creator_profile_write on public.oneup_creator_profiles;
create trigger oneup_guard_creator_profile_write
before insert or update on public.oneup_creator_profiles
for each row execute function public.oneup_guard_creator_profile();

create or replace function public.oneup_guard_moderation_report()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  v_uid uuid;
begin
  v_uid := public.oneup_require_account();
  if new.reporter_id <> v_uid then
    raise exception 'Invalid reporter' using errcode = '42501';
  end if;
  perform public.oneup_check_rate('report', 30000);
  new.status := 'pending';
  new.created_at := pg_catalog.now();
  new.reviewed_by := null;
  new.reviewed_at := null;
  return new;
end;
$$;
revoke all on function public.oneup_guard_moderation_report() from public, anon, authenticated;
drop trigger if exists oneup_guard_moderation_report_insert on public.oneup_moderation_reports;
create trigger oneup_guard_moderation_report_insert
before insert on public.oneup_moderation_reports
for each row execute function public.oneup_guard_moderation_report();

create or replace function public.oneup_guard_verification_request()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  v_uid uuid;
begin
  v_uid := public.oneup_require_account();
  if new.user_id <> v_uid then
    raise exception 'Invalid requester' using errcode = '42501';
  end if;
  perform public.oneup_check_rate('verify', 86400000);
  new.status := 'pending';
  new.requested_at := pg_catalog.now();
  new.reviewed_by := null;
  new.reviewed_at := null;
  return new;
end;
$$;
revoke all on function public.oneup_guard_verification_request() from public, anon, authenticated;
drop trigger if exists oneup_guard_verification_request_insert on public.oneup_verification_requests;
create trigger oneup_guard_verification_request_insert
before insert on public.oneup_verification_requests
for each row execute function public.oneup_guard_verification_request();

create or replace function public.oneup_guard_friend_request()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  v_uid uuid;
  v_author record;
begin
  v_uid := public.oneup_require_account();
  if new.from_id <> v_uid then
    raise exception 'Invalid sender' using errcode = '42501';
  end if;
  if not exists (select 1 from public.oneup_creator_profiles where user_id = new.to_id) then
    raise exception 'Target has no public profile' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.oneup_friendships
             where user_id = v_uid and friend_id = new.to_id) then
    raise exception 'Already friends' using errcode = '23505';
  end if;
  perform public.oneup_check_rate('friend', 45000);
  select * into v_author from public.oneup_author_fields(v_uid);
  new.display_name := v_author.display_name;
  new.status := 'pending';
  new.created_at := pg_catalog.now();
  new.responded_at := null;
  return new;
end;
$$;
revoke all on function public.oneup_guard_friend_request() from public, anon, authenticated;
drop trigger if exists oneup_guard_friend_request_insert on public.oneup_friend_requests;
create trigger oneup_guard_friend_request_insert
before insert on public.oneup_friend_requests
for each row execute function public.oneup_guard_friend_request();

-- ---------- RPCs (toggles that must stay atomic) ----------
create or replace function public.toggle_community_reaction(p_post_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid;
  v_exists boolean;
begin
  v_uid := public.oneup_require_account();
  if not exists (select 1 from public.oneup_community_posts
                 where id = p_post_id and status = 'visible') then
    raise exception 'Post not available' using errcode = 'P0002';
  end if;
  -- No rate limit on likes: the old callable toggled freely too.
  select exists(select 1 from public.oneup_community_reactions
                where post_id = p_post_id and user_id = v_uid) into v_exists;
  if v_exists then
    delete from public.oneup_community_reactions
    where post_id = p_post_id and user_id = v_uid;
    update public.oneup_community_posts
    set likes = greatest(likes - 1, 0) where id = p_post_id;
    return false;
  else
    insert into public.oneup_community_reactions (post_id, user_id)
    values (p_post_id, v_uid);
    update public.oneup_community_posts
    set likes = likes + 1 where id = p_post_id;
    return true;
  end if;
end;
$$;
revoke all on function public.toggle_community_reaction(uuid) from public, anon;
grant execute on function public.toggle_community_reaction(uuid) to authenticated;

create or replace function public.toggle_follow(p_target uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid;
  v_exists boolean;
begin
  v_uid := public.oneup_require_account();
  if p_target = v_uid then
    raise exception 'Cannot follow yourself' using errcode = '23514';
  end if;
  if not exists (select 1 from public.oneup_creator_profiles where user_id = p_target) then
    raise exception 'Target has no public profile' using errcode = 'P0002';
  end if;
  select exists(select 1 from public.oneup_user_follows
                where follower_id = v_uid and target_id = p_target) into v_exists;
  if v_exists then
    delete from public.oneup_user_follows
    where follower_id = v_uid and target_id = p_target;
    update public.oneup_creator_profiles
    set followers = greatest(followers - 1, 0) where user_id = p_target;
    return false;
  else
    insert into public.oneup_user_follows (follower_id, target_id)
    values (v_uid, p_target);
    update public.oneup_creator_profiles
    set followers = followers + 1 where user_id = p_target;
    return true;
  end if;
end;
$$;
revoke all on function public.toggle_follow(uuid) from public, anon;
grant execute on function public.toggle_follow(uuid) to authenticated;

create or replace function public.respond_friendship(p_from uuid, p_accept boolean)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid;
  v_req public.oneup_friend_requests%rowtype;
  v_name text;
begin
  v_uid := public.oneup_require_account();
  if p_from = v_uid then
    raise exception 'Invalid invitation' using errcode = '23514';
  end if;
  select * into v_req from public.oneup_friend_requests
  where from_id = p_from and to_id = v_uid;
  if not found or v_req.status <> 'pending' then
    raise exception 'Invitation no longer available' using errcode = 'P0002';
  end if;
  update public.oneup_friend_requests
  set status = case when p_accept then 'accepted' else 'declined' end,
      responded_at = pg_catalog.now()
  where from_id = p_from and to_id = v_uid;
  if p_accept then
    select display_name into v_name from public.oneup_author_fields(v_uid);
    insert into public.oneup_friendships (user_id, friend_id, display_name)
    values (v_uid, p_from, coalesce(v_req.display_name, 'Amigo de 1UP')),
           (p_from, v_uid, coalesce(v_name, 'Amigo de 1UP'))
    on conflict (user_id, friend_id) do nothing;
  end if;
  return coalesce(p_accept, false);
end;
$$;
revoke all on function public.respond_friendship(uuid, boolean) from public, anon;
grant execute on function public.respond_friendship(uuid, boolean) to authenticated;

-- ---------- RLS ----------
alter table public.oneup_rate_limits enable row level security;
alter table public.oneup_creator_profiles enable row level security;
alter table public.oneup_community_posts enable row level security;
alter table public.oneup_community_comments enable row level security;
alter table public.oneup_community_reactions enable row level security;
alter table public.oneup_global_messages enable row level security;
alter table public.oneup_user_follows enable row level security;
alter table public.oneup_friend_requests enable row level security;
alter table public.oneup_friendships enable row level security;
alter table public.oneup_verification_requests enable row level security;
alter table public.oneup_moderation_reports enable row level security;
alter table public.oneup_admin_roles enable row level security;

-- Creator profiles are public; only the owner writes them.
drop policy if exists "1up creator profiles are public" on public.oneup_creator_profiles;
create policy "1up creator profiles are public" on public.oneup_creator_profiles
for select to anon, authenticated using (true);
drop policy if exists "1up insert own creator profile" on public.oneup_creator_profiles;
create policy "1up insert own creator profile" on public.oneup_creator_profiles
for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "1up update own creator profile" on public.oneup_creator_profiles;
create policy "1up update own creator profile" on public.oneup_creator_profiles
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- Community posts: public reads only visible ones (authors see their own).
drop policy if exists "1up visible posts" on public.oneup_community_posts;
create policy "1up visible posts" on public.oneup_community_posts
for select to anon, authenticated
using (status = 'visible' or author_id = (select auth.uid()));
drop policy if exists "1up insert own post" on public.oneup_community_posts;
create policy "1up insert own post" on public.oneup_community_posts
for insert to authenticated with check (author_id = (select auth.uid()));

-- Replies: same pattern as posts.
drop policy if exists "1up visible replies" on public.oneup_community_comments;
create policy "1up visible replies" on public.oneup_community_comments
for select to anon, authenticated
using (status = 'visible' or author_id = (select auth.uid()));
drop policy if exists "1up insert own reply" on public.oneup_community_comments;
create policy "1up insert own reply" on public.oneup_community_comments
for insert to authenticated with check (author_id = (select auth.uid()));

-- Reactions: only via the toggle RPC; users can read their own.
drop policy if exists "1up read own reactions" on public.oneup_community_reactions;
create policy "1up read own reactions" on public.oneup_community_reactions
for select to authenticated using (user_id = (select auth.uid()));

-- Global chat: public reads only visible messages.
drop policy if exists "1up visible chat" on public.oneup_global_messages;
create policy "1up visible chat" on public.oneup_global_messages
for select to anon, authenticated
using (status = 'visible' or author_id = (select auth.uid()));
drop policy if exists "1up insert own chat message" on public.oneup_global_messages;
create policy "1up insert own chat message" on public.oneup_global_messages
for insert to authenticated with check (author_id = (select auth.uid()));

-- Follows: each user sees only their own follow list.
drop policy if exists "1up read own follows" on public.oneup_user_follows;
create policy "1up read own follows" on public.oneup_user_follows
for select to authenticated using (follower_id = (select auth.uid()));

-- Friend requests: sender and recipient can read them.
drop policy if exists "1up read own friend requests" on public.oneup_friend_requests;
create policy "1up read own friend requests" on public.oneup_friend_requests
for select to authenticated
using (from_id = (select auth.uid()) or to_id = (select auth.uid()));
drop policy if exists "1up insert own friend request" on public.oneup_friend_requests;
create policy "1up insert own friend request" on public.oneup_friend_requests
for insert to authenticated with check (from_id = (select auth.uid()));

-- Friendships: each user sees only their own contacts.
drop policy if exists "1up read own friendships" on public.oneup_friendships;
create policy "1up read own friendships" on public.oneup_friendships
for select to authenticated using (user_id = (select auth.uid()));

-- Verification requests: each user sees only their own.
drop policy if exists "1up read own verification" on public.oneup_verification_requests;
create policy "1up read own verification" on public.oneup_verification_requests
for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "1up insert own verification" on public.oneup_verification_requests;
create policy "1up insert own verification" on public.oneup_verification_requests
for insert to authenticated with check (user_id = (select auth.uid()));

-- Reports: each user sees only their own reports.
drop policy if exists "1up read own reports" on public.oneup_moderation_reports;
create policy "1up read own reports" on public.oneup_moderation_reports
for select to authenticated using (reporter_id = (select auth.uid()));
drop policy if exists "1up insert own report" on public.oneup_moderation_reports;
create policy "1up insert own report" on public.oneup_moderation_reports
for insert to authenticated with check (reporter_id = (select auth.uid()));

-- admin_roles and rate_limits: NO policy for anon/authenticated on purpose.
-- Only the service_role key (Edge Functions) reads them. Do not add one.

-- ---------- least-privilege grants ----------
revoke all on public.oneup_rate_limits from anon, authenticated;
revoke all on public.oneup_creator_profiles from anon, authenticated;
revoke all on public.oneup_community_posts from anon, authenticated;
revoke all on public.oneup_community_comments from anon, authenticated;
revoke all on public.oneup_community_reactions from anon, authenticated;
revoke all on public.oneup_global_messages from anon, authenticated;
revoke all on public.oneup_user_follows from anon, authenticated;
revoke all on public.oneup_friend_requests from anon, authenticated;
revoke all on public.oneup_friendships from anon, authenticated;
revoke all on public.oneup_verification_requests from anon, authenticated;
revoke all on public.oneup_moderation_reports from anon, authenticated;
revoke all on public.oneup_admin_roles from anon, authenticated;
grant select on public.oneup_creator_profiles to anon, authenticated;
grant select, insert, update on public.oneup_creator_profiles to authenticated;
grant select on public.oneup_community_posts to anon, authenticated;
grant insert on public.oneup_community_posts to authenticated;
grant select on public.oneup_community_comments to anon, authenticated;
grant insert on public.oneup_community_comments to authenticated;
grant select on public.oneup_community_reactions to authenticated;
grant select on public.oneup_global_messages to anon, authenticated;
grant insert on public.oneup_global_messages to authenticated;
grant select on public.oneup_user_follows to authenticated;
grant select on public.oneup_friend_requests to authenticated;
grant insert on public.oneup_friend_requests to authenticated;
grant select on public.oneup_friendships to authenticated;
grant select on public.oneup_verification_requests to authenticated;
grant insert on public.oneup_verification_requests to authenticated;
grant select on public.oneup_moderation_reports to authenticated;
grant insert on public.oneup_moderation_reports to authenticated;

-- ---------- Realtime (public feeds) ----------
do $$
begin
  if exists(select 1 from pg_catalog.pg_publication where pubname = 'supabase_realtime') then
    if not exists(select 1 from pg_catalog.pg_publication_tables
                  where pubname = 'supabase_realtime' and schemaname = 'public'
                  and tablename = 'oneup_community_posts') then
      alter publication supabase_realtime add table public.oneup_community_posts;
    end if;
    if not exists(select 1 from pg_catalog.pg_publication_tables
                  where pubname = 'supabase_realtime' and schemaname = 'public'
                  and tablename = 'oneup_global_messages') then
      alter publication supabase_realtime add table public.oneup_global_messages;
    end if;
    if not exists(select 1 from pg_catalog.pg_publication_tables
                  where pubname = 'supabase_realtime' and schemaname = 'public'
                  and tablename = 'oneup_community_comments') then
      alter publication supabase_realtime add table public.oneup_community_comments;
    end if;
  end if;
end $$;

-- Moderation is done by the owner/moderator through Edge Functions with the
-- service_role key, never from the browser. Never place service_role or
-- secret keys in the GitHub Pages frontend.
-- Owner bootstrap (run once in the SQL Editor with YOUR user id):
--   insert into public.oneup_admin_roles (user_id, role)
--   values ('TU-UUID-DE-USUARIO', 'owner');
--   insert into public.oneup_creator_profiles (user_id, display_name, verified, owner)
--   values ('TU-UUID-DE-USUARIO', 'tu_usuario', true, true)
--   on conflict (user_id) do update set verified = true, owner = true;

-- Audit columns for moderation Edge Functions (moderate-global-message,
-- moderate-community-reply). Posts and reports already have them.
alter table public.oneup_global_messages
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists reviewed_at timestamptz;
alter table public.oneup_community_comments
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists reviewed_at timestamptz;
