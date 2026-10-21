-- كلمة اليوم. One row per user per Asia/Riyadh day, plus a streak.
-- Does not ALTER existing tables. Does not add schema private to exposed schemas.
-- Do not apply this to production (xaqcqeenythjxadyflmr) until it is approved.
-- Wrappers are SECURITY DEFINER, search_path is empty, and EXECUTE is
-- granted only to service_role. The spider function calls them with db.rpc.
-- The daily answer never leaves the function. These tables store guesses and marks only.

begin;

create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon, authenticated, service_role;

create table if not exists private.word_play (
  user_id uuid not null references auth.users (id) on delete cascade,
  day text not null,
  guesses jsonb not null default '[]'::jsonb,
  status text not null default 'open',
  primary key (user_id, day)
);

create table if not exists private.word_streak (
  user_id uuid primary key references auth.users (id) on delete cascade,
  streak integer not null default 0,
  best integer not null default 0,
  last_day text
);

alter table private.word_play enable row level security;
alter table private.word_streak enable row level security;
revoke all on table private.word_play from public, anon, authenticated, service_role;
revoke all on table private.word_streak from public, anon, authenticated, service_role;

create or replace function public.word_load(p_user uuid, p_day text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_guesses jsonb;
  v_status text;
  v_streak integer;
  v_best integer;
  v_last text;
begin
  if p_user is null or p_day is null or p_day !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    return pg_catalog.jsonb_build_object('code', 'bad_request');
  end if;
  select guesses, status into v_guesses, v_status
  from private.word_play where user_id = p_user and day = p_day;
  select streak, best, last_day into v_streak, v_best, v_last
  from private.word_streak where user_id = p_user;
  return pg_catalog.jsonb_build_object(
    'code', 'ok',
    'guesses', coalesce(v_guesses, '[]'::jsonb),
    'status', coalesce(v_status, 'open'),
    'streak', coalesce(v_streak, 0),
    'best', coalesce(v_best, 0),
    'last', coalesce(v_last, '')
  );
end;
$$;

create or replace function public.word_apply(
  p_user uuid, p_day text, p_prev text, p_guess text, p_marks text, p_status text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_guesses jsonb;
  v_status text;
  v_len integer;
  v_streak integer;
  v_best integer;
  v_last text;
  v_found boolean;
begin
  if p_user is null or p_day is null or p_prev is null or p_guess is null or p_marks is null or p_status is null
     or p_day !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
     or p_prev !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
     or p_guess !~ '^[\u0627-\u064A]{5}$'
     or p_marks !~ '^[gyb]{5}$'
     or p_status not in ('open', 'won', 'lost')
     or (p_status = 'won' and p_marks <> 'ggggg')
     or (p_status <> 'won' and p_marks = 'ggggg') then
    return pg_catalog.jsonb_build_object('code', 'bad_request');
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('word:' || p_user::text, 0));

  select guesses, status into v_guesses, v_status
  from private.word_play where user_id = p_user and day = p_day
  for update;
  if not found then
    v_guesses := '[]'::jsonb;
    v_status := 'open';
  end if;

  select exists (
    select 1 from pg_catalog.jsonb_array_elements(v_guesses) e where e->>'w' = p_guess
  ) into v_found;
  if v_found then
    return public.word_load(p_user, p_day) || pg_catalog.jsonb_build_object('idempotent', true);
  end if;
  if v_status <> 'open' then
    return pg_catalog.jsonb_build_object('code', 'closed');
  end if;

  v_len := pg_catalog.jsonb_array_length(v_guesses) + 1;
  if v_len > 6 then
    return pg_catalog.jsonb_build_object('code', 'closed');
  end if;
  if p_status = 'lost' and v_len <> 6 then
    return pg_catalog.jsonb_build_object('code', 'bad_request');
  end if;
  if p_status = 'open' and v_len >= 6 then
    return pg_catalog.jsonb_build_object('code', 'bad_request');
  end if;

  v_guesses := v_guesses || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object('w', p_guess, 'm', p_marks));
  insert into private.word_play (user_id, day, guesses, status)
  values (p_user, p_day, v_guesses, p_status)
  on conflict (user_id, day) do update set guesses = excluded.guesses, status = excluded.status;

  if p_status in ('won', 'lost') then
    select streak, best, last_day into v_streak, v_best, v_last
    from private.word_streak where user_id = p_user for update;
    if not found then
      v_streak := 0; v_best := 0; v_last := '';
    end if;
    if p_status = 'won' then
      v_streak := case when v_last = p_prev then v_streak + 1 else 1 end;
    else
      v_streak := 0;
    end if;
    if v_streak > v_best then v_best := v_streak; end if;
    insert into private.word_streak (user_id, streak, best, last_day)
    values (p_user, v_streak, v_best, p_day)
    on conflict (user_id) do update
      set streak = excluded.streak, best = excluded.best, last_day = excluded.last_day;
  end if;

  return public.word_load(p_user, p_day) || pg_catalog.jsonb_build_object('idempotent', false);
end;
$$;

revoke all on function public.word_load(uuid, text) from public, anon, authenticated;
revoke all on function public.word_apply(uuid, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.word_load(uuid, text) to service_role;
grant execute on function public.word_apply(uuid, text, text, text, text, text) to service_role;

commit;
