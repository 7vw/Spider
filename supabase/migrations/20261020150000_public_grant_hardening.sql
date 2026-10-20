-- OPTIONAL. Do not apply with the shop migration, and do not apply to
-- production until Mohammed approves. This file was not run.
--
-- Confirmed from the live spider v8 source: every table read and write,
-- including public.accounts and public.game_secrets, goes through the
-- service-role client inside supaDB(). anon and authenticated are not used
-- for those tables. Revoking their write grants does not change the function.
--
-- Moving accounts or game_secrets out of public WOULD break the live function.
-- v8 calls a.from("accounts") and a.from("game_secrets"), which address the
-- public schema. v9 keeps those calls. This file does not move any table.
-- Backup tables are not touched.
--
-- Realtime on public.rooms needs SELECT for authenticated. The policies that
-- already exist stay in place; this only removes write grants the browser
-- does not have a policy for.

begin;

revoke insert, update, delete, truncate, references, trigger
  on all tables in schema public
  from anon, authenticated;

revoke all on table
  public.secret_codes,
  public.code_redemptions,
  public.solo_matches,
  public.match_results,
  public.audit_log,
  public.accounts,
  public.feedback,
  public.friends,
  public.game_secrets,
  public.line_scores,
  public.nest_scores
from anon, authenticated;

-- SELECT stays on the tables that have a read policy:
-- profiles, public_profiles, rooms, weekly_wins, app_settings.

do $$
declare
  r text;
begin
  foreach r in array array['postgres', 'supabase_admin']
  loop
    if exists (select 1 from pg_catalog.pg_roles where rolname = r) then
      execute format(
        'alter default privileges for role %I in schema public revoke insert, update, delete, truncate, references, trigger on tables from anon, authenticated',
        r
      );
      execute format(
        'alter default privileges for role %I in schema public revoke all on functions from anon, authenticated',
        r
      );
    end if;
  end loop;
end $$;

commit;

-- Not executed. A later function would have to call
-- .schema("private").from("accounts") and .schema("private").from("game_secrets")
-- before these two statements are safe:
--   alter table public.accounts set schema private;
--   alter table public.game_secrets set schema private;
