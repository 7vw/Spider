-- Social layer: friend codes, requests, blocks, last_seen, and a public card.
-- Does not ALTER existing tables. Does not add schema private to exposed schemas.
-- Do not apply this to production (xaqcqeenythjxadyflmr) until it is approved.
-- Wrappers are SECURITY DEFINER, search_path is empty, and EXECUTE is
-- granted only to service_role. The spider function calls them with db.rpc.
-- No email column is read or returned.

begin;

create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon, authenticated, service_role;

create table if not exists private.friend_codes (
  user_id uuid primary key references auth.users (id) on delete cascade,
  code text not null unique check (code ~ '^[A-HJ-NP-Z2-9]{6}$')
);

create table if not exists private.friend_edges (
  lo uuid not null references auth.users (id) on delete cascade,
  hi uuid not null references auth.users (id) on delete cascade,
  status text not null check (status in ('pending', 'accepted')),
  requested_by uuid not null,
  created_at timestamptz not null default pg_catalog.now(),
  primary key (lo, hi),
  check (lo < hi),
  check (requested_by = lo or requested_by = hi)
);

create table if not exists private.blocks (
  blocker uuid not null references auth.users (id) on delete cascade,
  blocked uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default pg_catalog.now(),
  primary key (blocker, blocked),
  check (blocker <> blocked)
);

create table if not exists private.last_seen (
  user_id uuid primary key references auth.users (id) on delete cascade,
  seen_at timestamptz not null default pg_catalog.now()
);

create table if not exists private.profile_card (
  user_id uuid primary key references auth.users (id) on delete cascade,
  avatar text not null default 'spark' check (avatar ~ '^[a-z]{2,16}$'),
  fav_game text not null default '' check (fav_game ~ '^[a-z0-9]{0,16}$')
);

alter table private.friend_codes enable row level security;
alter table private.friend_edges enable row level security;
alter table private.blocks enable row level security;
alter table private.last_seen enable row level security;
alter table private.profile_card enable row level security;

revoke all on table private.friend_codes from public, anon, authenticated, service_role;
revoke all on table private.friend_edges from public, anon, authenticated, service_role;
revoke all on table private.blocks from public, anon, authenticated, service_role;
revoke all on table private.last_seen from public, anon, authenticated, service_role;
revoke all on table private.profile_card from public, anon, authenticated, service_role;

create or replace function private.social_pair(p_a uuid, p_b uuid)
returns table (lo uuid, hi uuid)
language sql
immutable
security definer
set search_path = ''
as $$
  select least(p_a, p_b), greatest(p_a, p_b);
$$;

create or replace function private.social_blocked(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from private.blocks
    where (blocker = p_a and blocked = p_b) or (blocker = p_b and blocked = p_a)
  );
$$;

create or replace function private.social_new_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
  i int;
  n int;
begin
  for n in 1..8 loop
    v_code := '';
    for i in 1..6 loop
      v_code := v_code || substr(alphabet, 1 + floor(pg_catalog.random() * 32)::int, 1);
    end loop;
    if not exists (select 1 from private.friend_codes where code = v_code) then
      return v_code;
    end if;
  end loop;
  return null;
end;
$$;

create or replace function private.social_card(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id,
    'nick', coalesce(nullif(p.nickname, ''), 'لاعب'),
    'level', greatest(1, coalesce((p.data->>'level')::int, 1)),
    'avatar', coalesce(c.avatar, 'spark'),
    'fav', coalesce(c.fav_game, ''),
    'seen', s.seen_at
  )
  from public.profiles p
  left join private.profile_card c on c.user_id = p.id
  left join private.last_seen s on s.user_id = p.id
  where p.id = p_user;
$$;

create or replace function private.social_ensure(p_user uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
begin
  if p_user is null then
    return null;
  end if;
  insert into private.last_seen (user_id, seen_at) values (p_user, pg_catalog.now())
  on conflict (user_id) do update set seen_at = pg_catalog.now();
  select code into v_code from private.friend_codes where user_id = p_user;
  if found then
    return v_code;
  end if;
  v_code := private.social_new_code();
  if v_code is null then
    return null;
  end if;
  insert into private.friend_codes (user_id, code) values (p_user, v_code)
  on conflict (user_id) do nothing;
  select code into v_code from private.friend_codes where user_id = p_user;
  return v_code;
end;
$$;

create or replace function private.social_list(p_user uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
  v_friends jsonb;
  v_in jsonb;
  v_out jsonb;
  v_blocked jsonb;
begin
  if p_user is null then
    return jsonb_build_object('code', 'bad_request');
  end if;
  v_code := private.social_ensure(p_user);
  select coalesce(jsonb_agg(private.social_card(other) order by other), '[]'::jsonb) into v_friends
  from (
    select case when lo = p_user then hi else lo end as other
    from private.friend_edges
    where status = 'accepted' and (lo = p_user or hi = p_user)
  ) q;
  select coalesce(jsonb_agg(private.social_card(other)), '[]'::jsonb) into v_in
  from (
    select case when lo = p_user then hi else lo end as other
    from private.friend_edges
    where status = 'pending' and (lo = p_user or hi = p_user) and requested_by <> p_user
  ) q;
  select coalesce(jsonb_agg(private.social_card(other)), '[]'::jsonb) into v_out
  from (
    select case when lo = p_user then hi else lo end as other
    from private.friend_edges
    where status = 'pending' and (lo = p_user or hi = p_user) and requested_by = p_user
  ) q;
  select coalesce(jsonb_agg(jsonb_build_object('id', b.blocked, 'nick', coalesce(nullif(p.nickname, ''), 'لاعب'))), '[]'::jsonb)
    into v_blocked
  from private.blocks b
  left join public.profiles p on p.id = b.blocked
  where b.blocker = p_user;
  return jsonb_build_object(
    'code', 'ok',
    'friendCode', v_code,
    'friends', coalesce(v_friends, '[]'::jsonb),
    'incoming', coalesce(v_in, '[]'::jsonb),
    'outgoing', coalesce(v_out, '[]'::jsonb),
    'blocked', coalesce(v_blocked, '[]'::jsonb),
    'count', coalesce(jsonb_array_length(v_friends), 0)
  );
end;
$$;

create or replace function private.social_search(p_user uuid, p_q text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_q text;
  v_rows jsonb;
begin
  if p_user is null then
    return jsonb_build_object('code', 'bad_request', 'rows', '[]'::jsonb);
  end if;
  perform private.social_ensure(p_user);
  v_q := upper(pg_catalog.left(pg_catalog.btrim(coalesce(p_q, '')), 16));
  if length(pg_catalog.btrim(v_q)) < 2 then
    return jsonb_build_object('code', 'bad_request', 'rows', '[]'::jsonb);
  end if;
  if v_q ~ '^[A-HJ-NP-Z2-9]{6}$' then
    select coalesce(jsonb_agg(private.social_card(c.user_id)), '[]'::jsonb) into v_rows
    from private.friend_codes c
    where c.code = v_q and c.user_id <> p_user
      and not private.social_blocked(p_user, c.user_id);
    return jsonb_build_object('code', 'ok', 'rows', coalesce(v_rows, '[]'::jsonb));
  end if;
  select coalesce(jsonb_agg(private.social_card(p.id)), '[]'::jsonb) into v_rows
  from (
    select id from public.profiles
    where id <> p_user
      and nickname ilike '%' || replace(replace(v_q, '%', ''), '_', '') || '%'
      and not private.social_blocked(p_user, id)
    order by nickname
    limit 8
  ) p;
  return jsonb_build_object('code', 'ok', 'rows', coalesce(v_rows, '[]'::jsonb));
end;
$$;

create or replace function private.social_request(p_user uuid, p_other uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lo uuid;
  v_hi uuid;
  v_status text;
  v_by uuid;
  v_n int;
begin
  if p_user is null or p_other is null or p_user = p_other then
    return jsonb_build_object('code', 'bad_request');
  end if;
  if not exists (select 1 from public.profiles where id = p_other) then
    return jsonb_build_object('code', 'missing');
  end if;
  if private.social_blocked(p_user, p_other) then
    return jsonb_build_object('code', 'blocked');
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('social:' || least(p_user, p_other)::text, 0));
  select lo, hi into v_lo, v_hi from private.social_pair(p_user, p_other);
  select status, requested_by into v_status, v_by from private.friend_edges where lo = v_lo and hi = v_hi;
  if found and v_status = 'accepted' then
    return jsonb_build_object('code', 'ok', 'accepted', true, 'already', true);
  end if;
  if found and v_by = p_user then
    return jsonb_build_object('code', 'ok', 'accepted', false, 'already', true);
  end if;
  if found then
    update private.friend_edges set status = 'accepted' where lo = v_lo and hi = v_hi;
    return jsonb_build_object('code', 'ok', 'accepted', true);
  end if;
  select count(*) into v_n from private.friend_edges where status = 'accepted' and (lo = p_user or hi = p_user);
  if v_n >= 200 then
    return jsonb_build_object('code', 'full');
  end if;
  insert into private.friend_edges (lo, hi, status, requested_by) values (v_lo, v_hi, 'pending', p_user);
  return jsonb_build_object('code', 'ok', 'accepted', false);
end;
$$;

create or replace function private.social_respond(p_user uuid, p_other uuid, p_accept boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lo uuid;
  v_hi uuid;
  v_status text;
  v_by uuid;
begin
  if p_user is null or p_other is null then
    return jsonb_build_object('code', 'bad_request');
  end if;
  select lo, hi into v_lo, v_hi from private.social_pair(p_user, p_other);
  select status, requested_by into v_status, v_by from private.friend_edges where lo = v_lo and hi = v_hi;
  if not found or v_status <> 'pending' or v_by = p_user then
    return jsonb_build_object('code', 'missing');
  end if;
  if p_accept then
    update private.friend_edges set status = 'accepted' where lo = v_lo and hi = v_hi;
  else
    delete from private.friend_edges where lo = v_lo and hi = v_hi;
  end if;
  return jsonb_build_object('code', 'ok', 'accepted', coalesce(p_accept, false));
end;
$$;

create or replace function private.social_remove(p_user uuid, p_other uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lo uuid;
  v_hi uuid;
begin
  if p_user is null or p_other is null then
    return jsonb_build_object('code', 'bad_request');
  end if;
  select lo, hi into v_lo, v_hi from private.social_pair(p_user, p_other);
  delete from private.friend_edges where lo = v_lo and hi = v_hi;
  return jsonb_build_object('code', 'ok');
end;
$$;

create or replace function private.social_block(p_user uuid, p_other uuid, p_on boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lo uuid;
  v_hi uuid;
begin
  if p_user is null or p_other is null or p_user = p_other then
    return jsonb_build_object('code', 'bad_request');
  end if;
  if p_on then
    insert into private.blocks (blocker, blocked) values (p_user, p_other)
    on conflict do nothing;
    select lo, hi into v_lo, v_hi from private.social_pair(p_user, p_other);
    delete from private.friend_edges where lo = v_lo and hi = v_hi;
  else
    delete from private.blocks where blocker = p_user and blocked = p_other;
  end if;
  return jsonb_build_object('code', 'ok', 'blocked', coalesce(p_on, false));
end;
$$;

create or replace function private.social_card_set(p_user uuid, p_avatar text, p_fav text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_avatar text;
  v_fav text;
begin
  if p_user is null then
    return jsonb_build_object('code', 'bad_request');
  end if;
  v_avatar := case when p_avatar in ('spark','moon','star','heart','crown','bolt','flame','globe','target','medal','cloud','eye')
    then p_avatar else null end;
  v_fav := case when p_fav is null then null
    when p_fav = '' or p_fav in ('webbound','webgrid','xo','wordweb','webline','dama','bluff','flyhunt','webwar','webnest','nightweb','ballclash','domino','kalima')
    then p_fav else null end;
  insert into private.profile_card (user_id, avatar, fav_game)
  values (p_user, coalesce(v_avatar, 'spark'), coalesce(v_fav, ''))
  on conflict (user_id) do update set
    avatar = coalesce(v_avatar, private.profile_card.avatar),
    fav_game = coalesce(v_fav, private.profile_card.fav_game);
  return jsonb_build_object('code', 'ok', 'avatar', (select avatar from private.profile_card where user_id = p_user),
    'fav', (select fav_game from private.profile_card where user_id = p_user));
end;
$$;

create or replace function private.social_chat_ok(p_id text)
returns jsonb
language sql
immutable
security definer
set search_path = ''
as $$
  select case when p_id in ('hi','come','nice','wait','gg','again','fast','luck','e0','e1','e2','e3','e4','e5','e6','e7')
    then jsonb_build_object('code', 'ok', 'id', p_id)
    else jsonb_build_object('code', 'bad_request') end;
$$;

revoke all on function private.social_pair(uuid, uuid) from public, anon, authenticated, service_role;
revoke all on function private.social_blocked(uuid, uuid) from public, anon, authenticated, service_role;
revoke all on function private.social_new_code() from public, anon, authenticated, service_role;
revoke all on function private.social_card(uuid) from public, anon, authenticated, service_role;
revoke all on function private.social_ensure(uuid) from public, anon, authenticated, service_role;
revoke all on function private.social_list(uuid) from public, anon, authenticated, service_role;
revoke all on function private.social_search(uuid, text) from public, anon, authenticated, service_role;
revoke all on function private.social_request(uuid, uuid) from public, anon, authenticated, service_role;
revoke all on function private.social_respond(uuid, uuid, boolean) from public, anon, authenticated, service_role;
revoke all on function private.social_remove(uuid, uuid) from public, anon, authenticated, service_role;
revoke all on function private.social_block(uuid, uuid, boolean) from public, anon, authenticated, service_role;
revoke all on function private.social_card_set(uuid, text, text) from public, anon, authenticated, service_role;
revoke all on function private.social_chat_ok(text) from public, anon, authenticated, service_role;

create or replace function public.social_list(p_user uuid) returns jsonb language sql security definer set search_path = '' as $$ select private.social_list(p_user); $$;
create or replace function public.social_search(p_user uuid, p_q text) returns jsonb language sql security definer set search_path = '' as $$ select private.social_search(p_user, p_q); $$;
create or replace function public.social_request(p_user uuid, p_other uuid) returns jsonb language sql security definer set search_path = '' as $$ select private.social_request(p_user, p_other); $$;
create or replace function public.social_respond(p_user uuid, p_other uuid, p_accept boolean) returns jsonb language sql security definer set search_path = '' as $$ select private.social_respond(p_user, p_other, p_accept); $$;
create or replace function public.social_remove(p_user uuid, p_other uuid) returns jsonb language sql security definer set search_path = '' as $$ select private.social_remove(p_user, p_other); $$;
create or replace function public.social_block(p_user uuid, p_other uuid, p_on boolean) returns jsonb language sql security definer set search_path = '' as $$ select private.social_block(p_user, p_other, p_on); $$;
create or replace function public.social_card_set(p_user uuid, p_avatar text, p_fav text) returns jsonb language sql security definer set search_path = '' as $$ select private.social_card_set(p_user, p_avatar, p_fav); $$;
create or replace function public.social_chat_ok(p_id text) returns jsonb language sql security definer set search_path = '' as $$ select private.social_chat_ok(p_id); $$;
create or replace function public.social_touch(p_user uuid) returns jsonb language sql security definer set search_path = '' as $$ select jsonb_build_object('code','ok','friendCode', private.social_ensure(p_user)); $$;

revoke all on function public.social_list(uuid) from public, anon, authenticated;
revoke all on function public.social_search(uuid, text) from public, anon, authenticated;
revoke all on function public.social_request(uuid, uuid) from public, anon, authenticated;
revoke all on function public.social_respond(uuid, uuid, boolean) from public, anon, authenticated;
revoke all on function public.social_remove(uuid, uuid) from public, anon, authenticated;
revoke all on function public.social_block(uuid, uuid, boolean) from public, anon, authenticated;
revoke all on function public.social_card_set(uuid, text, text) from public, anon, authenticated;
revoke all on function public.social_chat_ok(text) from public, anon, authenticated;
revoke all on function public.social_touch(uuid) from public, anon, authenticated;

grant execute on function public.social_list(uuid) to service_role;
grant execute on function public.social_search(uuid, text) to service_role;
grant execute on function public.social_request(uuid, uuid) to service_role;
grant execute on function public.social_respond(uuid, uuid, boolean) to service_role;
grant execute on function public.social_remove(uuid, uuid) to service_role;
grant execute on function public.social_block(uuid, uuid, boolean) to service_role;
grant execute on function public.social_card_set(uuid, text, text) to service_role;
grant execute on function public.social_chat_ok(text) to service_role;
grant execute on function public.social_touch(uuid) to service_role;

commit;
