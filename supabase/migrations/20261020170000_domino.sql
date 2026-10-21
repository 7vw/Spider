-- Domino rewards. Idempotent coin grant with a per-day cap.
-- Does not ALTER existing tables. Does not add schema private to exposed schemas.
-- Do not apply this to production (xaqcqeenythjxadyflmr) until it is approved.
-- The wrapper is SECURITY DEFINER, search_path is empty, and EXECUTE is
-- granted only to service_role. The spider function calls it with db.rpc.
-- Coins live in public.profiles.data->'coins'. A paid grant bumps version and data.__ver.

begin;

create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon, authenticated, service_role;

create table if not exists private.coin_receipt (
  user_id uuid not null references auth.users (id) on delete cascade,
  request_id text not null,
  kind text not null,
  amount integer not null,
  day text not null,
  created_at timestamptz not null default pg_catalog.now(),
  primary key (user_id, request_id)
);

alter table private.coin_receipt enable row level security;
revoke all on table private.coin_receipt from public, anon, authenticated, service_role;

create or replace function private.coin_grant(
  p_user uuid, p_request text, p_kind text, p_amount integer, p_day text, p_cap integer
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_coins integer;
  v_after integer;
  v_version integer;
  v_used integer;
  v_prev integer;
  v_prev_kind text;
begin
  if p_user is null or p_request is null or p_kind is null or p_day is null
     or p_request !~ '^[A-Za-z0-9:_-]{8,80}$'
     or p_kind !~ '^[a-z]{3,16}$'
     or p_day !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
     or p_amount not in (10, 20)
     or p_cap is null or p_cap < 1 or p_cap > 30 then
    return jsonb_build_object('code', 'bad_request', 'granted', 0);
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('coin:' || p_user::text, 0));

  select amount, kind into v_prev, v_prev_kind
  from private.coin_receipt
  where user_id = p_user and request_id = p_request;
  if found then
    if v_prev_kind is distinct from p_kind or (v_prev <> 0 and v_prev is distinct from p_amount) then
      return jsonb_build_object('code', 'bad_request', 'granted', 0);
    end if;
    select coalesce((data->>'coins')::numeric, 0)::integer, version
      into v_coins, v_version
    from public.profiles where id = p_user;
    return jsonb_build_object(
      'code', 'ok', 'granted', 0, 'idempotent', true,
      'capped', v_prev = 0, 'coins', v_coins, 'version', v_version
    );
  end if;

  select count(*) into v_used
  from private.coin_receipt
  where user_id = p_user and kind = p_kind and day = p_day and amount > 0;

  select coalesce((data->>'coins')::numeric, 0)::integer, version
    into v_coins, v_version
  from public.profiles
  where id = p_user
  for update;

  if not found then
    return jsonb_build_object('code', 'profile_missing', 'granted', 0);
  end if;

  if v_used >= p_cap then
    insert into private.coin_receipt (user_id, request_id, kind, amount, day)
    values (p_user, p_request, p_kind, 0, p_day);
    return jsonb_build_object(
      'code', 'ok', 'granted', 0, 'capped', true,
      'coins', v_coins, 'version', v_version
    );
  end if;

  v_after := v_coins + p_amount;
  update public.profiles
  set data = pg_catalog.jsonb_set(
        pg_catalog.jsonb_set(coalesce(data, '{}'::jsonb), '{coins}', pg_catalog.to_jsonb(v_after), true),
        '{__ver}', pg_catalog.to_jsonb(version + 1), true
      ),
      version = version + 1,
      updated_at = pg_catalog.now()
  where id = p_user;

  insert into private.coin_receipt (user_id, request_id, kind, amount, day)
  values (p_user, p_request, p_kind, p_amount, p_day);

  return jsonb_build_object(
    'code', 'ok', 'granted', p_amount, 'capped', false, 'idempotent', false,
    'coins', v_after, 'version', v_version + 1
  );
exception
  when unique_violation then
    select coalesce((data->>'coins')::numeric, 0)::integer, version
      into v_coins, v_version
    from public.profiles where id = p_user;
    return jsonb_build_object(
      'code', 'ok', 'granted', 0, 'idempotent', true,
      'coins', v_coins, 'version', v_version
    );
end;
$$;

revoke all on function private.coin_grant(uuid, text, text, integer, text, integer) from public, anon, authenticated, service_role;

create or replace function public.coin_grant(
  p_user uuid, p_request text, p_kind text, p_amount integer, p_day text, p_cap integer
) returns jsonb
language sql
security definer
set search_path = ''
as $$
  select private.coin_grant(p_user, p_request, p_kind, p_amount, p_day, p_cap);
$$;

revoke all on function public.coin_grant(uuid, text, text, integer, text, integer) from public, anon, authenticated;
grant execute on function public.coin_grant(uuid, text, text, integer, text, integer) to service_role;

commit;
