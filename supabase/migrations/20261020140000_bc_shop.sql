-- Ball Clash coin shop.
-- Verified against the live project on 2026-10-20 (read-only):
--   public.profiles.id uuid primary key references auth.users
--   coins live in profiles.data -> 'coins' (jsonb number, every row an int)
--   profiles.version is the optimistic lock used by withProfile()
--   profiles.updated_at exists
--   there is no spider_profile table
-- This file only creates new objects. It does not ALTER, UPDATE, or DELETE
-- existing tables, and it does not read or write a profile row.
-- Do not apply it to production (xaqcqeenythjxadyflmr) until Mohammed approves.
-- Applying it does not sell anything: spider v9 is what calls these functions.
--
-- The functions live in schema private so PostgREST does not serve them from
-- public. Before deploying v9, add `private` to the project's exposed schemas
-- so the service-role client can call .schema('private').rpc(...).
-- anon and authenticated have no USAGE on private and no EXECUTE on these
-- functions, so exposing the schema does not let the browser call them.

begin;

create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon, authenticated;
grant usage on schema private to service_role;

create table if not exists private.bc_catalog (
  kind text not null check (kind in ('ball','look','arena')),
  item text not null check (item ~ '^[a-z0-9_]{2,40}$'),
  price integer not null check (price > 0),
  primary key (kind, item)
);

create table if not exists private.bc_owned (
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('ball','look','arena')),
  item text not null,
  bought_at timestamptz not null default pg_catalog.now(),
  primary key (user_id, kind, item)
);

create table if not exists private.bc_receipt (
  user_id uuid not null references auth.users (id) on delete cascade,
  request_id text not null check (request_id ~ '^[A-Za-z0-9_-]{8,64}$'),
  kind text not null,
  item text not null,
  price integer not null check (price > 0),
  coins_after integer not null,
  created_at timestamptz not null default pg_catalog.now(),
  primary key (user_id, request_id)
);

alter table private.bc_catalog enable row level security;
alter table private.bc_owned enable row level security;
alter table private.bc_receipt enable row level security;

revoke all on table private.bc_catalog from public, anon, authenticated;
revoke all on table private.bc_owned from public, anon, authenticated;
revoke all on table private.bc_receipt from public, anon, authenticated;
grant select, insert, update, delete on table private.bc_catalog to service_role;
grant select, insert, update, delete on table private.bc_owned to service_role;
grant select, insert, update, delete on table private.bc_receipt to service_role;

-- Prices are defined here, not by the client. Re-applying sets these prices
-- again and does not delete any other catalog row.
insert into private.bc_catalog (kind, item, price) values
  ('ball','sling',200),
  ('ball','spark',200),
  ('ball','cog',200),
  ('ball','glaive',420),
  ('ball','blizzard',420),
  ('ball','basilisk',420),
  ('ball','trident',780),
  ('ball','comet',780),
  ('ball','arcblade',780),
  ('ball','meteor',1500),
  ('ball','umbra',1500),
  ('ball','starlance',1500),
  ('look','sh_royal',450),
  ('look','ls_neon',450),
  ('look','ts_neon',450),
  ('look','pl_neon',450),
  ('look','gh_abyss',450),
  ('look','lv_ember',450),
  ('look','sw_royal',800),
  ('look','hm_royal',800),
  ('look','vd_abyss',800),
  ('look','bh_abyss',800),
  ('look','dr_ember',800),
  ('look','ph_solar',800),
  ('arena','ember',350),
  ('arena','frost',350),
  ('arena','abyss',600)
on conflict (kind, item) do update set price = excluded.price;

create or replace function private.bc_shop_owned_json(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('kind', kind, 'id', item) order by kind, item), '[]'::jsonb)
  from private.bc_owned
  where user_id = p_user;
$$;

-- Hardcoded live shape: public.profiles.id, coins in data->'coins'.
-- A write always bumps version and updated_at so withProfile()'s
-- "where version = old" save cannot put the pre-purchase balance back.
create or replace function private.bc_shop_sync(p_user uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_coins integer;
begin
  if p_user is null then
    return jsonb_build_object('code','bad_request','charged',0,'owned','[]'::jsonb);
  end if;
  select coalesce((data->>'coins')::numeric, 0)::integer into v_coins
  from public.profiles
  where id = p_user;
  if not found then
    return jsonb_build_object('code','profile_missing','charged',0);
  end if;
  return jsonb_build_object('code','ok','coins',v_coins,'owned', private.bc_shop_owned_json(p_user));
exception
  when invalid_text_representation or numeric_value_out_of_range then
    return jsonb_build_object('code','profile_missing','charged',0);
end;
$$;

create or replace function private.bc_shop_buy(p_user uuid, p_kind text, p_item text, p_request text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_price integer;
  v_coins integer;
  v_after integer;
  v_purchases integer;
  v_infinite boolean;
  v_role text;
  v_kind text;
  v_item text;
  v_charged integer;
begin
  if p_user is null or p_kind is null or p_item is null or p_request is null
     or p_request !~ '^[A-Za-z0-9_-]{8,64}$'
     or p_kind not in ('ball','look','arena') then
    return jsonb_build_object('code','bad_request','charged',0);
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('bc_shop:' || p_user::text, 0));

  select kind, item, price into v_kind, v_item, v_price
  from private.bc_receipt
  where user_id = p_user and request_id = p_request;
  if found then
    if v_kind is distinct from p_kind or v_item is distinct from p_item then
      return jsonb_build_object('code','bad_request','charged',0);
    end if;
    select coalesce((data->>'coins')::numeric, 0)::integer into v_coins
    from public.profiles where id = p_user;
    return jsonb_build_object(
      'code','ok','charged',0,'idempotent',true,'price',v_price,
      'coins', v_coins, 'kind', p_kind, 'id', p_item,
      'owned', private.bc_shop_owned_json(p_user)
    );
  end if;

  select price into v_price from private.bc_catalog where kind = p_kind and item = p_item;
  if not found then
    return jsonb_build_object('code','unknown','charged',0);
  end if;

  if exists (select 1 from private.bc_owned where user_id = p_user and kind = p_kind and item = p_item) then
    select coalesce((data->>'coins')::numeric, 0)::integer into v_coins
    from public.profiles where id = p_user;
    return jsonb_build_object(
      'code','owned','charged',0,'price',v_price,
      'coins', v_coins, 'kind', p_kind, 'id', p_item,
      'owned', private.bc_shop_owned_json(p_user)
    );
  end if;

  select p.role,
         coalesce((p.data->>'coins')::numeric, 0)::integer,
         coalesce((p.data #>> '{stats,purchases}')::numeric, 0)::integer,
         coalesce((p.data #> '{owner,infinite}') = 'true'::jsonb, false)
    into v_role, v_coins, v_purchases, v_infinite
  from public.profiles as p
  where p.id = p_user
  for update;

  if not found then
    return jsonb_build_object('code','profile_missing','charged',0);
  end if;

  -- The owner's unlimited-coins switch. A player row cannot set role, so a
  -- copied infinite flag in data does not make the purchase free.
  if v_role is distinct from 'owner' then
    v_infinite := false;
  end if;

  if not v_infinite and v_coins < v_price then
    return jsonb_build_object(
      'code','insufficient','charged',0,'price',v_price,'coins',v_coins,
      'need', v_price - v_coins, 'kind', p_kind, 'id', p_item
    );
  end if;

  v_charged := case when v_infinite then 0 else v_price end;
  v_after := v_coins - v_charged;
  v_purchases := v_purchases + 1;

  begin
    update public.profiles
    set data = pg_catalog.jsonb_set(
          pg_catalog.jsonb_set(
            pg_catalog.jsonb_set(coalesce(data, '{}'::jsonb), '{coins}', pg_catalog.to_jsonb(v_after), true),
            '{stats,purchases}', pg_catalog.to_jsonb(v_purchases), true
          ),
          '{__ver}', pg_catalog.to_jsonb(version + 1), true
        ),
        version = version + 1,
        updated_at = pg_catalog.now()
    where id = p_user;

    insert into private.bc_owned (user_id, kind, item) values (p_user, p_kind, p_item);
    insert into private.bc_receipt (user_id, request_id, kind, item, price, coins_after)
      values (p_user, p_request, p_kind, p_item, v_price, v_after);
  exception
    when unique_violation then
      if exists (
        select 1 from private.bc_receipt
        where user_id = p_user and request_id = p_request and kind = p_kind and item = p_item
      ) then
        select coalesce((data->>'coins')::numeric, 0)::integer into v_coins
        from public.profiles where id = p_user;
        return jsonb_build_object(
          'code','ok','charged',0,'idempotent',true,'price',v_price,
          'coins', v_coins, 'kind', p_kind, 'id', p_item,
          'owned', private.bc_shop_owned_json(p_user)
        );
      end if;
      if exists (select 1 from private.bc_owned where user_id = p_user and kind = p_kind and item = p_item) then
        select coalesce((data->>'coins')::numeric, 0)::integer into v_coins
        from public.profiles where id = p_user;
        return jsonb_build_object(
          'code','owned','charged',0,'price',v_price,
          'coins', v_coins, 'kind', p_kind, 'id', p_item,
          'owned', private.bc_shop_owned_json(p_user)
        );
      end if;
      return jsonb_build_object('code','bad_request','charged',0);
  end;

  return jsonb_build_object(
    'code','ok','charged',v_charged,'price',v_price,'coins',v_after,
    'purchases', v_purchases, 'infinite', v_infinite,
    'kind', p_kind, 'id', p_item,
    'owned', private.bc_shop_owned_json(p_user)
  );
exception
  when invalid_text_representation or numeric_value_out_of_range then
    return jsonb_build_object('code','profile_missing','charged',0);
end;
$$;

revoke all on function private.bc_shop_owned_json(uuid) from public, anon, authenticated;
revoke all on function private.bc_shop_sync(uuid) from public, anon, authenticated;
revoke all on function private.bc_shop_buy(uuid, text, text, text) from public, anon, authenticated;
grant execute on function private.bc_shop_buy(uuid, text, text, text) to service_role;
grant execute on function private.bc_shop_sync(uuid) to service_role;

alter default privileges in schema private revoke all on functions from public, anon, authenticated;
alter default privileges in schema private revoke all on tables from public, anon, authenticated;

commit;
