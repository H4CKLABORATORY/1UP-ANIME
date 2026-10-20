-- PostgreSQL CI harness only: a minimal auth schema, never production.
create role anon;
create role authenticated;
create role service_role bypassrls;
create schema auth;
create table auth.users(id uuid primary key,raw_user_meta_data jsonb);
create table auth.sessions(id uuid primary key,user_id uuid,created_at timestamptz,not_after timestamptz);
\ir ../supabase/sql/oneup-auth.sql
insert into auth.users values('12345678-1234-1234-1234-123456789012','{"oneup_username":"Dexter"}');
insert into auth.users values('22345678-1234-1234-1234-123456789012','{}');
do $$ begin
 if (select username from public.oneup_auth_names) <> 'dexter' then raise exception 'name not normalized'; end if;
 begin
  insert into auth.users values('32345678-1234-1234-1234-123456789012','{"oneup_username":"DEXTER"}');
  raise exception 'duplicate accepted';
 exception when unique_violation then null; end;
 if has_table_privilege('anon','public.oneup_auth_names','select') then raise exception 'email/name leak';end if;
 if has_table_privilege('authenticated','public.oneup_auth_sessions','select') then raise exception 'session leak';end if;
 if has_function_privilege('anon','public.oneup_auth_limit(text,integer,integer)','execute') then raise exception 'public rpc';end if;
 if has_function_privilege('authenticated','public.oneup_auth_session_live(uuid,uuid)','execute') then raise exception 'public session lookup';end if;
end $$;
set role service_role;
do $$ declare k text:=repeat('a',64); begin
 if not public.oneup_auth_limit(k,2,600) then raise exception 'first denied';end if;
 if not public.oneup_auth_limit(k,2,600) then raise exception 'second denied';end if;
 if public.oneup_auth_limit(k,2,600) then raise exception 'limit bypassed';end if;
 update public.oneup_auth_limits set expires_at=now()-interval '1 second' where key=k;
 if not public.oneup_auth_limit(k,2,600) then raise exception 'expired bucket not reset';end if;
end $$;
reset role;
-- All app tables have RLS; privilege revokes alone are not sufficient.
do $$ begin
 if (select count(*) from pg_class where relname in ('oneup_auth_names','oneup_auth_sessions','oneup_auth_limits') and relrowsecurity)<>3 then raise exception 'RLS missing';end if;
end $$;
