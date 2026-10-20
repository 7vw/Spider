-- Local stand-in for the live Supabase shape. Not for production.
-- Roles match the API roles. Default grants match Supabase: anon and
-- authenticated receive all privileges on public tables and functions.
-- Policies match the live read policies this test exercises.

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
end $$;

create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key
);

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id),
  role text not null default 'player' check (role in ('player', 'owner')),
  nickname text not null default '',
  data jsonb not null default '{}'::jsonb,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.public_profiles (
  id uuid primary key,
  nickname text,
  level integer,
  pub jsonb,
  is_owner boolean,
  updated_at timestamptz
);

create table if not exists public.rooms (
  code text primary key,
  member_ids uuid[] not null default '{}'
);

create table if not exists public.weekly_wins (
  week integer,
  user_id uuid,
  wins integer,
  games integer,
  primary key (week, user_id)
);

create table if not exists public.app_settings (
  key text primary key,
  value jsonb,
  updated_at timestamptz
);

create table if not exists public.secret_codes (code text primary key);
create table if not exists public.code_redemptions (code text, user_id uuid);
create table if not exists public.solo_matches (id uuid primary key);
create table if not exists public.match_results (mid text, user_id uuid);
create table if not exists public.audit_log (id bigserial primary key);
create table if not exists public.accounts (username text primary key);
create table if not exists public.feedback (id bigserial primary key);
create table if not exists public.friends (a uuid, b uuid);
create table if not exists public.game_secrets (k text primary key);
create table if not exists public.line_scores (day integer, user_id uuid);
create table if not exists public.nest_scores (day integer, user_id uuid);

grant all on all tables in schema public to anon, authenticated, service_role;

alter table public.profiles enable row level security;
alter table public.app_settings enable row level security;
alter table public.rooms enable row level security;

drop policy if exists "own profile readable" on public.profiles;
create policy "own profile readable" on public.profiles
  for select to authenticated
  using (id = auth.uid());

drop policy if exists "about readable" on public.app_settings;
create policy "about readable" on public.app_settings
  for select to anon, authenticated
  using (key in ('about', 'announce'));

drop policy if exists "members read their room" on public.rooms;
create policy "members read their room" on public.rooms
  for select to authenticated
  using (auth.uid() = any (member_ids));
