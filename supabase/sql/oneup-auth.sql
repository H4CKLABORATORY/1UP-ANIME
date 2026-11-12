-- Additive setup. Apply to a NEW dedicated Auth project; never replace existing schemas.
begin;
create schema if not exists oneup_private;
revoke all on schema oneup_private from public, anon, authenticated;
create table public.oneup_auth_names (
  user_id uuid primary key references auth.users(id),
  username text not null unique check (username ~ '^[a-z0-9_]{3,24}$')
);
create table public.oneup_auth_sessions (
  token_hash text primary key check (token_hash ~ '^[a-f0-9]{64}$'),
  user_id uuid not null references auth.users(id),
  provider_token text not null,
  scope text not null check (scope in ('access','recovery')),
  expires_at timestamptz not null
);
create index on public.oneup_auth_sessions(user_id);
create index on public.oneup_auth_sessions(expires_at);
create table public.oneup_auth_limits (
  key text primary key,
  attempts integer not null,
  expires_at timestamptz not null
);
create index on public.oneup_auth_limits(expires_at);
alter table public.oneup_auth_names enable row level security;
alter table public.oneup_auth_sessions enable row level security;
alter table public.oneup_auth_limits enable row level security;
revoke all on public.oneup_auth_names, public.oneup_auth_sessions, public.oneup_auth_limits from public,anon,authenticated;
grant select,insert,update,delete on public.oneup_auth_names,public.oneup_auth_sessions,public.oneup_auth_limits to service_role;
-- Only the trigger may reserve a username. Metadata does not grant authorization.
create function oneup_private.reserve_name() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.raw_user_meta_data ? 'oneup_username' then
    insert into public.oneup_auth_names(user_id,username)
      values(new.id,lower(trim(new.raw_user_meta_data->>'oneup_username')));
  end if;
  return new;
end $$;
revoke all on function oneup_private.reserve_name() from public,anon,authenticated;
create trigger oneup_reserve_name after insert on auth.users for each row execute function oneup_private.reserve_name();
-- Invoker: service_role only. Atomic upsert prevents concurrent limit bypass.
create function public.oneup_auth_limit(p_key text,p_max integer,p_seconds integer) returns boolean
language plpgsql security invoker set search_path='' as $$
declare n integer;
begin
  if p_max<1 or p_seconds<1 or length(p_key)<>64 then raise exception 'invalid limit'; end if;
  insert into public.oneup_auth_limits as l(key,attempts,expires_at)
    values(p_key,1,clock_timestamp()+make_interval(secs=>p_seconds))
  on conflict(key) do update set
    attempts=case when l.expires_at<=clock_timestamp() then 1 else least(l.attempts+1,p_max+1) end,
    expires_at=case when l.expires_at<=clock_timestamp() then clock_timestamp()+make_interval(secs=>p_seconds) else l.expires_at end
  returning attempts into n;
  return n<=p_max;
end $$;
revoke all on function public.oneup_auth_limit(text,integer,integer) from public,anon,authenticated;
grant execute on function public.oneup_auth_limit(text,integer,integer) to service_role;
-- Service-only checked after Auth validates signature. Do not trust a decoded JWT alone.
create function oneup_private.session_live(p_session uuid,p_user uuid) returns boolean
language sql security definer set search_path='' as $$
  select exists(select 1 from auth.sessions where id=p_session and user_id=p_user
    and created_at>now()-interval '1 hour' and (not_after is null or not_after>now()));
$$;
revoke all on function oneup_private.session_live(uuid,uuid) from public,anon,authenticated;
grant usage on schema oneup_private to service_role;
grant execute on function oneup_private.session_live(uuid,uuid) to service_role;
create function public.oneup_auth_session_live(p_session uuid,p_user uuid) returns boolean
language sql security invoker set search_path='' as $$
  select oneup_private.session_live(p_session,p_user);
$$;
revoke all on function public.oneup_auth_session_live(uuid,uuid) from public,anon,authenticated;
grant execute on function public.oneup_auth_session_live(uuid,uuid) to service_role;
commit;
