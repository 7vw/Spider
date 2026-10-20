-- Ball Clash coin shop.
-- The live schema is not in this repository. This migration only creates new
-- objects. It does not ALTER, UPDATE, or DELETE existing tables.
-- bc_shop_buy changes a coins value only when it is called, and only the coins
-- field of one allowlisted profile shape:
--   public.profiles.coins
--   public.spider_profile.coins
--   public.profiles.data -> coins
--   public.spider_profile.data -> coins
-- The row key is id, or user_id if id is absent.
-- If none of those shapes exist, the function returns profile_table_missing
-- and writes nothing. Confirm the live table before applying.
-- Do not apply this file to the production project (xaqcqeenythjxadyflmr)
-- until Mohammed approves. Applying it does not by itself sell anything:
-- the edge function must be deployed before clients call bc_shop_buy.

create table if not exists public.bc_catalog (
  kind text not null check (kind in ('ball','look','arena')),
  item text not null check (item ~ '^[a-z0-9_]{2,40}$'),
  price integer not null check (price > 0),
  primary key (kind, item)
);

create table if not exists public.bc_owned (
  user_id uuid not null,
  kind text not null check (kind in ('ball','look','arena')),
  item text not null,
  bought_at timestamptz not null default now(),
  primary key (user_id, kind, item)
);

create table if not exists public.bc_receipt (
  user_id uuid not null,
  request_id text not null check (request_id ~ '^[A-Za-z0-9_-]{8,64}$'),
  kind text not null,
  item text not null,
  price integer not null check (price > 0),
  coins_after integer not null,
  created_at timestamptz not null default now(),
  primary key (user_id, request_id)
);

alter table public.bc_catalog enable row level security;
alter table public.bc_owned enable row level security;
alter table public.bc_receipt enable row level security;

revoke all on table public.bc_catalog from public, anon, authenticated;
revoke all on table public.bc_owned from public, anon, authenticated;
revoke all on table public.bc_receipt from public, anon, authenticated;

-- Prices are defined here, not by the client. Re-applying sets these prices
-- again and does not delete any other catalog row.
insert into public.bc_catalog (kind, item, price) values
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
  ('ball','eclipse',1500),
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

create or replace function public.bc_shop_owned_json(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object('kind', kind, 'id', item) order by kind, item), '[]'::jsonb)
  from public.bc_owned
  where user_id = p_user;
$$;

-- p_write null: read coins. Otherwise set only the coins field to p_write.
-- p_lock false: read without FOR UPDATE (used by sync).
create or replace function public.bc_shop_profile_coins(p_user uuid, p_write integer, p_lock boolean default true)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coins integer;
  v_hit boolean := false;
  v_mode text := null;
  v_rel text := null;
  v_key text := null;
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'coins'
      and data_type in ('integer','bigint','numeric','smallint')
  ) then
    v_rel := 'profiles'; v_mode := 'col';
  elsif exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'spider_profile' and column_name = 'coins'
      and data_type in ('integer','bigint','numeric','smallint')
  ) then
    v_rel := 'spider_profile'; v_mode := 'col';
  elsif exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'data'
      and udt_name = 'jsonb'
  ) then
    v_rel := 'profiles'; v_mode := 'json';
  elsif exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'spider_profile' and column_name = 'data'
      and udt_name = 'jsonb'
  ) then
    v_rel := 'spider_profile'; v_mode := 'json';
  else
    return jsonb_build_object('code','profile_table_missing');
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = v_rel and column_name = 'id'
  ) then
    v_key := 'id';
  elsif exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = v_rel and column_name = 'user_id'
  ) then
    v_key := 'user_id';
  else
    return jsonb_build_object('code','profile_table_missing');
  end if;

  if v_rel = 'profiles' and v_mode = 'col' and v_key = 'id' then
    if p_write is null and p_lock then
      select coins::integer into v_coins from public.profiles where id = p_user for update;
    elsif p_write is null then
      select coins::integer into v_coins from public.profiles where id = p_user;
    else
      update public.profiles set coins = p_write where id = p_user returning coins::integer into v_coins;
    end if;
    v_hit := found;
  elsif v_rel = 'profiles' and v_mode = 'col' and v_key = 'user_id' then
    if p_write is null and p_lock then
      select coins::integer into v_coins from public.profiles where user_id = p_user for update;
    elsif p_write is null then
      select coins::integer into v_coins from public.profiles where user_id = p_user;
    else
      update public.profiles set coins = p_write where user_id = p_user returning coins::integer into v_coins;
    end if;
    v_hit := found;
  elsif v_rel = 'spider_profile' and v_mode = 'col' and v_key = 'id' then
    if p_write is null and p_lock then
      select coins::integer into v_coins from public.spider_profile where id = p_user for update;
    elsif p_write is null then
      select coins::integer into v_coins from public.spider_profile where id = p_user;
    else
      update public.spider_profile set coins = p_write where id = p_user returning coins::integer into v_coins;
    end if;
    v_hit := found;
  elsif v_rel = 'spider_profile' and v_mode = 'col' and v_key = 'user_id' then
    if p_write is null and p_lock then
      select coins::integer into v_coins from public.spider_profile where user_id = p_user for update;
    elsif p_write is null then
      select coins::integer into v_coins from public.spider_profile where user_id = p_user;
    else
      update public.spider_profile set coins = p_write where user_id = p_user returning coins::integer into v_coins;
    end if;
    v_hit := found;
  elsif v_rel = 'profiles' and v_mode = 'json' and v_key = 'id' then
    if p_write is null and p_lock then
      select coalesce(nullif(data->>'coins','')::numeric, 0)::integer into v_coins from public.profiles where id = p_user for update;
    elsif p_write is null then
      select coalesce(nullif(data->>'coins','')::numeric, 0)::integer into v_coins from public.profiles where id = p_user;
    else
      update public.profiles set data = jsonb_set(coalesce(data, '{}'::jsonb), '{coins}', to_jsonb(p_write), true) where id = p_user returning (data->>'coins')::integer into v_coins;
    end if;
    v_hit := found;
  elsif v_rel = 'profiles' and v_mode = 'json' and v_key = 'user_id' then
    if p_write is null and p_lock then
      select coalesce(nullif(data->>'coins','')::numeric, 0)::integer into v_coins from public.profiles where user_id = p_user for update;
    elsif p_write is null then
      select coalesce(nullif(data->>'coins','')::numeric, 0)::integer into v_coins from public.profiles where user_id = p_user;
    else
      update public.profiles set data = jsonb_set(coalesce(data, '{}'::jsonb), '{coins}', to_jsonb(p_write), true) where user_id = p_user returning (data->>'coins')::integer into v_coins;
    end if;
    v_hit := found;
  elsif v_rel = 'spider_profile' and v_mode = 'json' and v_key = 'id' then
    if p_write is null and p_lock then
      select coalesce(nullif(data->>'coins','')::numeric, 0)::integer into v_coins from public.spider_profile where id = p_user for update;
    elsif p_write is null then
      select coalesce(nullif(data->>'coins','')::numeric, 0)::integer into v_coins from public.spider_profile where id = p_user;
    else
      update public.spider_profile set data = jsonb_set(coalesce(data, '{}'::jsonb), '{coins}', to_jsonb(p_write), true) where id = p_user returning (data->>'coins')::integer into v_coins;
    end if;
    v_hit := found;
  elsif v_rel = 'spider_profile' and v_mode = 'json' and v_key = 'user_id' then
    if p_write is null and p_lock then
      select coalesce(nullif(data->>'coins','')::numeric, 0)::integer into v_coins from public.spider_profile where user_id = p_user for update;
    elsif p_write is null then
      select coalesce(nullif(data->>'coins','')::numeric, 0)::integer into v_coins from public.spider_profile where user_id = p_user;
    else
      update public.spider_profile set data = jsonb_set(coalesce(data, '{}'::jsonb), '{coins}', to_jsonb(p_write), true) where user_id = p_user returning (data->>'coins')::integer into v_coins;
    end if;
    v_hit := found;
  else
    return jsonb_build_object('code','profile_table_missing');
  end if;

  if not v_hit then
    return jsonb_build_object('code','profile_missing');
  end if;
  return jsonb_build_object('code','ok','coins', coalesce(v_coins, 0));
exception
  when invalid_text_representation or numeric_value_out_of_range then
    -- A bad coins value is not spendable. A failed write must not look like success.
    if p_write is not null then
      return jsonb_build_object('code','profile_missing');
    end if;
    return jsonb_build_object('code','ok','coins', 0);
end;
$$;

create or replace function public.bc_shop_buy(p_user uuid, p_kind text, p_item text, p_request text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_price integer;
  v_prof jsonb;
  v_coins integer;
  v_after integer;
  v_kind text;
  v_item text;
begin
  if p_user is null or p_kind is null or p_item is null or p_request is null
     or p_request !~ '^[A-Za-z0-9_-]{8,64}$'
     or p_kind not in ('ball','look','arena') then
    return jsonb_build_object('code','bad_request','charged',0);
  end if;

  perform pg_advisory_xact_lock(hashtextextended('bc_shop:' || p_user::text, 0));

  select kind, item, price into v_kind, v_item, v_price
  from public.bc_receipt
  where user_id = p_user and request_id = p_request;
  if found then
    if v_kind is distinct from p_kind or v_item is distinct from p_item then
      return jsonb_build_object('code','bad_request','charged',0);
    end if;
    v_prof := public.bc_shop_profile_coins(p_user, null, false);
    return jsonb_build_object(
      'code','ok','charged',0,'idempotent',true,'price',v_price,
      'coins', case when v_prof->>'code' = 'ok' then (v_prof->>'coins')::integer else null end,
      'kind', p_kind, 'id', p_item,
      'owned', public.bc_shop_owned_json(p_user)
    );
  end if;

  select price into v_price from public.bc_catalog where kind = p_kind and item = p_item;
  if not found then
    return jsonb_build_object('code','unknown','charged',0);
  end if;

  if exists (select 1 from public.bc_owned where user_id = p_user and kind = p_kind and item = p_item) then
    v_prof := public.bc_shop_profile_coins(p_user, null, false);
    return jsonb_build_object(
      'code','owned','charged',0,'price',v_price,
      'coins', case when v_prof->>'code' = 'ok' then (v_prof->>'coins')::integer else null end,
      'kind', p_kind, 'id', p_item,
      'owned', public.bc_shop_owned_json(p_user)
    );
  end if;

  v_prof := public.bc_shop_profile_coins(p_user, null, true);
  if v_prof->>'code' <> 'ok' then
    return jsonb_build_object('code', v_prof->>'code', 'charged', 0);
  end if;
  v_coins := (v_prof->>'coins')::integer;
  if v_coins < v_price then
    return jsonb_build_object('code','insufficient','charged',0,'price',v_price,'coins',v_coins,'need',v_price - v_coins,'kind',p_kind,'id',p_item);
  end if;

  v_after := v_coins - v_price;
  begin
    v_prof := public.bc_shop_profile_coins(p_user, v_after, true);
    if v_prof->>'code' <> 'ok' then
      raise exception 'bc_shop_profile_%', v_prof->>'code' using errcode = 'P0001';
    end if;
    insert into public.bc_owned (user_id, kind, item) values (p_user, p_kind, p_item);
    insert into public.bc_receipt (user_id, request_id, kind, item, price, coins_after)
      values (p_user, p_request, p_kind, p_item, v_price, v_after);
  exception
    when unique_violation then
      if exists (
        select 1 from public.bc_receipt
        where user_id = p_user and request_id = p_request and kind = p_kind and item = p_item
      ) then
        v_prof := public.bc_shop_profile_coins(p_user, null, false);
        return jsonb_build_object(
          'code','ok','charged',0,'idempotent',true,'price',v_price,
          'coins', case when v_prof->>'code' = 'ok' then (v_prof->>'coins')::integer else null end,
          'kind', p_kind, 'id', p_item,
          'owned', public.bc_shop_owned_json(p_user)
        );
      end if;
      if exists (select 1 from public.bc_owned where user_id = p_user and kind = p_kind and item = p_item) then
        v_prof := public.bc_shop_profile_coins(p_user, null, false);
        return jsonb_build_object(
          'code','owned','charged',0,'price',v_price,
          'coins', case when v_prof->>'code' = 'ok' then (v_prof->>'coins')::integer else null end,
          'kind', p_kind, 'id', p_item,
          'owned', public.bc_shop_owned_json(p_user)
        );
      end if;
      return jsonb_build_object('code','bad_request','charged',0);
  end;

  return jsonb_build_object(
    'code','ok','charged',v_price,'price',v_price,'coins',v_after,
    'kind', p_kind, 'id', p_item,
    'owned', public.bc_shop_owned_json(p_user)
  );
end;
$$;

create or replace function public.bc_shop_sync(p_user uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prof jsonb;
begin
  if p_user is null then
    return jsonb_build_object('code','bad_request','charged',0,'owned','[]'::jsonb);
  end if;
  v_prof := public.bc_shop_profile_coins(p_user, null, false);
  return jsonb_build_object(
    'code', case when v_prof->>'code' = 'ok' then 'ok' else v_prof->>'code' end,
    'coins', case when v_prof->>'code' = 'ok' then (v_prof->>'coins')::integer else null end,
    'owned', public.bc_shop_owned_json(p_user)
  );
end;
$$;

revoke all on function public.bc_shop_owned_json(uuid) from public, anon, authenticated;
revoke all on function public.bc_shop_profile_coins(uuid, integer, boolean) from public, anon, authenticated;
revoke all on function public.bc_shop_buy(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.bc_shop_sync(uuid) from public, anon, authenticated;
grant execute on function public.bc_shop_buy(uuid, text, text, text) to service_role;
grant execute on function public.bc_shop_sync(uuid) to service_role;
