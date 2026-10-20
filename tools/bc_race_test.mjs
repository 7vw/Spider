/* A purchase racing a bc_finish save.
   Live withProfile() reads profiles.version, edits data in memory, then
   updates where version = that old value (5 tries). The shop write has to
   bump version, or the finish save puts the old coin balance back while
   the owned row stays. This is an in-memory model of that race, plus a
   check that the migration text actually bumps version. It does not open
   a database. */
import {readFileSync} from "fs";
import {dirname, join} from "path";
import {fileURLToPath} from "url";
import assert from "node:assert/strict";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sql = readFileSync(join(root, "supabase/migrations/20261020140000_bc_shop.sql"), "utf8");

function clone(o){return JSON.parse(JSON.stringify(o))}

/* Mirrors private.bc_shop_buy's profile write. */
function shopWrite(row, {price, role, requestSeen}){
  if (requestSeen) return {row, code:"ok", charged:0, idempotent:true};
  const infinite = role === "owner" && row.data.owner && row.data.owner.infinite === true;
  if (!infinite && row.data.coins < price) return {row, code:"insufficient", charged:0};
  const next = clone(row);
  const charged = infinite ? 0 : price;
  next.data.coins = row.data.coins - charged;
  next.data.stats.purchases = (row.data.stats.purchases || 0) + 1;
  next.version = row.version + 1;
  next.updated_at = "bumped";
  next.data.__ver = next.version;
  next.owned = true;
  return {row: next, code:"ok", charged, idempotent:false};
}

/* The same write with the bug: coins change, version does not. */
function shopWriteForgottenVersion(row, price){
  const next = clone(row);
  next.data.coins = row.data.coins - price;
  next.data.stats.purchases = (row.data.stats.purchases || 0) + 1;
  next.owned = true;
  return next;
}

/* Mirrors db.updateProfile: one row updated where version = readVersion. */
function withProfileSave(row, readVersion, mutate){
  if (row.version !== readVersion) return {ok:false, row};
  const next = clone(row);
  mutate(next.data);
  next.version = readVersion + 1;
  next.updated_at = "profile";
  next.data.__ver = next.version;
  return {ok:true, row: next};
}

function checkAchievements(data){
  data.claimedAchievements = data.claimedAchievements || [];
  if (data.claimedAchievements.includes("shopper") || (data.stats.purchases || 0) < 5) return [];
  data.claimedAchievements.push("shopper");
  data.achievements = data.achievements || {};
  data.achievements.shopper = 1;
  data.coins += 150;
  return ["shopper"];
}

const start = {
  version: 7,
  updated_at: "t0",
  owned: false,
  data: {
    coins: 1000,
    __ver: 7,
    stats: {purchases: 4},
    owner: {infinite: false},
    claimedAchievements: [],
    achievements: {}
  }
};

{
  const readVersion = start.version;
  const finishPlan = clone(start.data);
  finishPlan.coins += 30;

  const bought = shopWrite(start, {price: 780, role: "player", requestSeen: false});
  assert.equal(bought.code, "ok");
  assert.equal(bought.charged, 780);
  assert.equal(bought.row.data.coins, 220);
  assert.equal(bought.row.version, 8);
  assert.equal(bought.row.updated_at, "bumped");
  assert.equal(bought.row.data.__ver, 8);
  assert.equal(bought.row.data.stats.purchases, 5);
  assert.equal(bought.row.owned, true);

  const stale = withProfileSave(bought.row, readVersion, data => { data.coins = finishPlan.coins; });
  assert.equal(stale.ok, false);
  assert.equal(bought.row.data.coins, 220);
  assert.equal(bought.row.owned, true);

  const retry = withProfileSave(bought.row, bought.row.version, data => { data.coins += 30; });
  assert.equal(retry.ok, true);
  assert.equal(retry.row.data.coins, 250);
  assert.equal(retry.row.data.stats.purchases, 5);
  assert.equal(retry.row.version, 9);
  assert.equal(retry.row.owned, true);

  const granted = checkAchievements(retry.row.data);
  assert.deepEqual(granted, ["shopper"]);
  assert.equal(retry.row.data.coins, 400);
  assert.deepEqual(checkAchievements(retry.row.data), []);
  console.log("ok a bc_finish that read first cannot restore coins after a purchase");
}

{
  const broken = shopWriteForgottenVersion(start, 780);
  const stale = withProfileSave(broken, start.version, data => { data.coins = start.data.coins + 30; });
  assert.equal(stale.ok, true);
  assert.equal(stale.row.data.coins, 1030);
  assert.equal(stale.row.owned, true);
  console.log("ok without a version bump the finish save restores the old balance");
}

{
  const again = shopWrite(start, {price: 780, role: "player", requestSeen: true});
  assert.equal(again.charged, 0);
  assert.equal(again.idempotent, true);
  assert.equal(again.row.version, 7);
  assert.equal(again.row.data.coins, 1000);
  console.log("ok a repeated request does not write or bump version");
}

{
  let row = clone(start);
  row.data.coins = 10;
  row.data.owner.infinite = true;
  const player = shopWrite(row, {price: 780, role: "player", requestSeen: false});
  assert.equal(player.code, "insufficient");
  assert.equal(player.row.data.coins, 10);
  const owner = shopWrite(row, {price: 780, role: "owner", requestSeen: false});
  assert.equal(owner.code, "ok");
  assert.equal(owner.charged, 0);
  assert.equal(owner.row.data.coins, 10);
  assert.equal(owner.row.data.stats.purchases, 5);
  assert.equal(owner.row.version, 8);
  assert.equal(owner.row.owned, true);
  console.log("ok only the owner switch skips the charge, and the purchase still counts");
}

assert.equal(sql.includes("information_schema"), false);
assert.match(sql, /version = version \+ 1/);
assert.match(sql, /updated_at = pg_catalog\.now\(\)/);
assert.match(sql, /public\.profiles/);
assert.match(sql, /data->>'coins'/);
assert.match(sql, /stats,purchases/);
assert.match(sql, /owner,infinite/);
assert.match(sql, /v_role is distinct from 'owner'/);
assert.match(sql, /references auth\.users \(id\) on delete cascade/);
assert.match(sql, /^begin;/m);
assert.match(sql, /^commit;/m);
assert.match(sql, /create schema if not exists private/);
assert.equal(sql.includes("public.spider_profile"), false);
assert.equal(sql.includes("'eclipse'"), false);
assert.match(sql, /\('ball','umbra',1500\)/);
assert.match(sql, /revoke all on function private\.bc_shop_buy\(uuid, text, text, text\) from public, anon, authenticated/);
assert.match(sql, /grant execute on function private\.bc_shop_buy\(uuid, text, text, text\) to service_role/);
console.log("ok the migration hardcodes the live profile shape and bumps version");

const v9 = readFileSync(join(root, "supabase/functions/spider/index.ts"), "utf8");
const v8 = readFileSync(join(root, "supabase/functions/spider/v8.index.ts"), "utf8");
assert.match(v8, /sha256|SPIDER/);
assert.equal(v9.includes("BC_NEW_DATA.merge"), false);
assert.match(v9, /!BC\.KINDS\[k\]\.shop/);
assert.match(v9, /case "bc_buy":/);
assert.match(v9, /schema\("private"\)\.rpc/);
assert.match(v9, /checkAchievements\(reward\)/);
assert.match(v9, /id:"umbra"/);
assert.equal(v9.includes('id:"eclipse"'), true);
assert.equal((v9.match(/\{id:"eclipse"/g) || []).length, 1);
assert.match(v9, /SPIDER_NO_SERVE/);
assert.equal(v8.includes('id:"umbra"'), false);
console.log("ok v9 keeps the skin id eclipse and does not call merge");
