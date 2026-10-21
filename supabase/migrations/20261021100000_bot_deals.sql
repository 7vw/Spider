-- Server-issued deals for bot rewards. The client cannot pick the shuffle.
-- Does not ALTER existing tables. Does not add schema private to exposed schemas.
-- Do not apply this to production (xaqcqeenythjxadyflmr) until it is approved.
-- The wrappers are SECURITY DEFINER, search_path is empty, and EXECUTE is
-- granted only to service_role. The spider function calls them with db.rpc.
-- A deal is single-use, expires, and bot_deal_take refuses a finish that is
-- faster than p_min_ms. Coins still go through public.coin_grant.

begin;

create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon, authenticated, service_role;

create table if not exists private.bot_deals (
  nonce text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  game text not null,
  seed integer not null,
  spec jsonb not null,
  created_at timestamptz not null default pg_catalog.now(),
  expires_at timestamptz not null,
  used_at timestamptz
);

alter table private.bot_deals enable row level security;
revoke all on table private.bot_deals from public, anon, authenticated, service_role;

create or replace function public.bot_deal_open(
  p_user uuid, p_nonce text, p_game text, p_seed integer, p_spec jsonb, p_ttl integer
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user is null or p_nonce is null or p_game is null or p_spec is null
     or p_nonce !~ '^[A-Za-z0-9]{16,40}$'
     or p_game !~ '^[a-z]{3,16}$'
     or p_seed is null or p_seed < 1
     or p_ttl is null or p_ttl < 60 or p_ttl > 7200
     or pg_catalog.jsonb_typeof(p_spec) <> 'object' then
    return pg_catalog.jsonb_build_object('code', 'bad_request');
  end if;
  insert into private.bot_deals (nonce, user_id, game, seed, spec, expires_at)
  values (p_nonce, p_user, p_game, p_seed, p_spec, pg_catalog.now() + make_interval(secs => p_ttl));
  return pg_catalog.jsonb_build_object('code', 'ok');
exception
  when unique_violation then
    return pg_catalog.jsonb_build_object('code', 'bad_request');
end;
$$;

create or replace function public.bot_deal_take(
  p_user uuid, p_nonce text, p_game text, p_min_ms integer
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_seed integer;
  v_spec jsonb;
  v_used timestamptz;
  v_exp timestamptz;
  v_created timestamptz;
begin
  if p_user is null or p_nonce is null or p_game is null
     or p_nonce !~ '^[A-Za-z0-9]{16,40}$'
     or p_game !~ '^[a-z]{3,16}$'
     or p_min_ms is null or p_min_ms < 0 or p_min_ms > 120000 then
    return pg_catalog.jsonb_build_object('code', 'bad_request');
  end if;

  update private.bot_deals
     set used_at = pg_catalog.now()
   where nonce = p_nonce
     and user_id = p_user
     and game = p_game
     and used_at is null
     and expires_at > pg_catalog.now()
     and created_at <= pg_catalog.now() - make_interval(secs => (p_min_ms::numeric / 1000))
  returning seed, spec into v_seed, v_spec;

  if found then
    return pg_catalog.jsonb_build_object('code', 'ok', 'seed', v_seed, 'spec', v_spec);
  end if;

  select used_at, expires_at, created_at
    into v_used, v_exp, v_created
  from private.bot_deals
  where nonce = p_nonce and user_id = p_user and game = p_game;

  if not found then
    return pg_catalog.jsonb_build_object('code', 'missing');
  end if;
  if v_used is not null then
    return pg_catalog.jsonb_build_object('code', 'used');
  end if;
  if v_exp <= pg_catalog.now() then
    return pg_catalog.jsonb_build_object('code', 'expired');
  end if;
  return pg_catalog.jsonb_build_object('code', 'early');
end;
$$;

revoke all on function public.bot_deal_open(uuid, text, text, integer, jsonb, integer) from public, anon, authenticated;
revoke all on function public.bot_deal_take(uuid, text, text, integer) from public, anon, authenticated;
grant execute on function public.bot_deal_open(uuid, text, text, integer, jsonb, integer) to service_role;
grant execute on function public.bot_deal_take(uuid, text, text, integer) to service_role;

commit;
