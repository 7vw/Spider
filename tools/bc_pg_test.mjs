/* Real Postgres checks for the shop migrations.
   Expects database spider_bc, the stand-in, and both migrations already applied
   (the shell script does that, including a second apply). */
import pg from "pg";
import assert from "node:assert/strict";

const PLAYER = "11111111-1111-1111-1111-111111111111";
const OWNER = "22222222-2222-2222-2222-222222222222";
const OTHER = "33333333-3333-3333-3333-333333333333";

function client() {
  return new pg.Client({host: "/var/run/postgresql", database: "spider_bc", user: "postgres"});
}

async function withRole(role, fn) {
  const c = client();
  await c.connect();
  try {
    await c.query("select set_config('request.jwt.claim.sub', '', false)");
    await c.query(`set role ${role}`);
    return await fn(c);
  } finally {
    await c.end();
  }
}

async function buy(c, user, kind, item, request) {
  const r = await c.query("select public.bc_shop_buy($1::uuid, $2, $3, $4) as j", [user, kind, item, request]);
  return r.rows[0].j;
}

const admin = client();
await admin.connect();

await admin.query("delete from public.profiles");
await admin.query("delete from auth.users");
await admin.query(
  `insert into auth.users (id) values ($1::uuid), ($2::uuid), ($3::uuid)`,
  [PLAYER, OWNER, OTHER]
);
await admin.query(
  `insert into public.profiles (id, role, nickname, data, version, updated_at) values
     ($1::uuid, 'player', 'لاعب', '{"coins":5000,"stats":{"purchases":4},"owner":{"infinite":false}}'::jsonb, 3, '2020-01-01'),
     ($2::uuid, 'owner', 'المالك', '{"coins":10,"stats":{"purchases":0},"owner":{"infinite":true}}'::jsonb, 2, '2020-01-01'),
     ($3::uuid, 'player', 'آخر', '{"coins":9000,"stats":{"purchases":0},"owner":{"infinite":true}}'::jsonb, 1, '2020-01-01')`,
  [PLAYER, OWNER, OTHER]
);
await admin.query(
  `insert into public.app_settings (key, value) values ('about', '{"t":"hi"}'::jsonb), ('secret', '{"t":"no"}'::jsonb)
   on conflict (key) do nothing`
);
await admin.query(
  `insert into public.rooms (code, member_ids) values ('ABCD', array[$1::uuid])
   on conflict (code) do update set member_ids = excluded.member_ids`,
  [PLAYER]
);

const rich = await withRole("service_role", c => buy(c, PLAYER, "ball", "meteor", "req-meteor-0001"));
assert.equal(rich.code, "ok");
assert.equal(rich.charged, 1500);
assert.equal(rich.coins, 3500);
assert.equal(rich.price, 1500);
assert.equal(rich.purchases, 5);
let row = (await admin.query("select version, data, updated_at from public.profiles where id = $1", [PLAYER])).rows[0];
assert.equal(row.version, 4);
assert.equal(row.data.coins, 3500);
assert.equal(row.data.__ver, 4);
assert.equal(row.data.stats.purchases, 5);
assert.ok(new Date(row.updated_at).getTime() > new Date("2020-01-01").getTime());
console.log("ok a buy with enough coins charges the catalog price and bumps version");

const poor = await withRole("service_role", async c => {
  await c.query("update public.profiles set data = jsonb_set(data, '{coins}', to_jsonb(100)) where id = $1", [OTHER]);
  return buy(c, OTHER, "ball", "sling", "req-poor-00001");
});
assert.equal(poor.code, "insufficient");
assert.equal(poor.charged, 0);
assert.equal(poor.need, 100);
const poorRow = (await admin.query("select version, data from public.profiles where id = $1", [OTHER])).rows[0];
assert.equal(poorRow.version, 1);
assert.equal(poorRow.data.coins, 100);
const poorReceipt = await admin.query("select 1 from private.bc_receipt where user_id = $1", [OTHER]);
assert.equal(poorReceipt.rowCount, 0);
console.log("ok a buy without enough coins writes nothing");

const owned = await withRole("service_role", c => buy(c, PLAYER, "ball", "meteor", "req-meteor-0002"));
assert.equal(owned.code, "owned");
assert.equal(owned.charged, 0);
row = (await admin.query("select version, data from public.profiles where id = $1", [PLAYER])).rows[0];
assert.equal(row.version, 4);
assert.equal(row.data.coins, 3500);
console.log("ok an already owned item does not charge");

const again = await withRole("service_role", c => buy(c, PLAYER, "ball", "meteor", "req-meteor-0001"));
assert.equal(again.code, "ok");
assert.equal(again.charged, 0);
assert.equal(again.idempotent, true);
assert.equal(again.coins, 3500);
row = (await admin.query("select version, data from public.profiles where id = $1", [PLAYER])).rows[0];
assert.equal(row.version, 4);
console.log("ok the same receipt charges once");

const broke = await withRole("service_role", async c => {
  await c.query("update public.profiles set data = jsonb_set(data, '{coins}', to_jsonb(50)) where id = $1", [OTHER]);
  const first = await buy(c, OTHER, "ball", "sling", "req-retry-0001");
  await c.query("update public.profiles set data = jsonb_set(data, '{coins}', to_jsonb(500)) where id = $1", [OTHER]);
  const second = await buy(c, OTHER, "ball", "sling", "req-retry-0001");
  const third = await buy(c, OTHER, "ball", "sling", "req-retry-0001");
  return {first, second, third};
});
assert.equal(broke.first.code, "insufficient");
assert.equal(broke.second.code, "ok");
assert.equal(broke.second.charged, 200);
assert.equal(broke.second.coins, 300);
assert.equal(broke.third.charged, 0);
assert.equal(broke.third.idempotent, true);
console.log("ok a failed request can be retried and then charges once");

let priceArgFailed = false;
try {
  await withRole("service_role", c => c.query(
    "select public.bc_shop_buy($1::uuid, 'ball', 'spark', 'req-price-0001', 1)",
    [PLAYER]
  ));
} catch (e) {
  priceArgFailed = /function .* does not exist|bc_shop_buy/.test(e.message);
}
assert.equal(priceArgFailed, true);
const priced = await withRole("service_role", c => buy(c, PLAYER, "ball", "spark", "req-price-0001"));
assert.equal(priced.charged, 200);
assert.equal(priced.price, 200);
assert.equal(priced.coins, 3300);
console.log("ok a client price cannot be sent and the catalog price is charged");

const ownerBuy = await withRole("service_role", c => buy(c, OWNER, "ball", "umbra", "req-owner-0001"));
assert.equal(ownerBuy.code, "ok");
assert.equal(ownerBuy.charged, 0);
assert.equal(ownerBuy.infinite, true);
assert.equal(ownerBuy.coins, 10);
const ownerRow = (await admin.query("select version, data from public.profiles where id = $1", [OWNER])).rows[0];
assert.equal(ownerRow.version, 3);
assert.equal(ownerRow.data.coins, 10);
assert.equal(ownerRow.data.stats.purchases, 1);
console.log("ok the owner switch skips the charge and still counts the purchase");

const beforePar = (await admin.query("select version, data from public.profiles where id = $1", [PLAYER])).rows[0];
const [a, b] = await Promise.all([
  withRole("service_role", c => buy(c, PLAYER, "ball", "sling", "req-par-sling1")),
  withRole("service_role", c => buy(c, PLAYER, "ball", "cog", "req-par-cog001"))
]);
const codes = [a.code, b.code].sort();
assert.deepEqual(codes, ["ok", "ok"]);
assert.equal(a.charged + b.charged, 400);
row = (await admin.query("select version, data from public.profiles where id = $1", [PLAYER])).rows[0];
assert.equal(row.data.coins, beforePar.data.coins - 400);
assert.equal(row.version, beforePar.version + 2);
const both = await admin.query(
  "select item from private.bc_owned where user_id = $1 and item in ('sling','cog') order by item",
  [PLAYER]
);
assert.deepEqual(both.rows.map(r => r.item), ["cog", "sling"]);
console.log("ok two parallel buys both charge and the version moves twice");

const beforeSame = (await admin.query("select version, data from public.profiles where id = $1", [PLAYER])).rows[0];
const same = await Promise.all([
  withRole("service_role", c => buy(c, PLAYER, "look", "sw_royal", "req-par-same01")),
  withRole("service_role", c => buy(c, PLAYER, "look", "sw_royal", "req-par-same01"))
]);
const charged = same.reduce((n, r) => n + r.charged, 0);
assert.equal(charged, 800);
assert.ok(same.every(r => r.code === "ok"));
assert.equal(same.filter(r => r.charged === 0).length, 1);
row = (await admin.query("select version, data from public.profiles where id = $1", [PLAYER])).rows[0];
assert.equal(row.data.coins, beforeSame.data.coins - 800);
assert.equal(row.version, beforeSame.version + 1);
console.log("ok one receipt sent twice in parallel charges once");

const before = (await admin.query("select version, data from public.profiles where id = $1", [PLAYER])).rows[0];
const readVersion = before.version;
const staleData = JSON.parse(JSON.stringify(before.data));
staleData.coins = before.data.coins + 30;
const sessionA = client();
const sessionB = client();
await sessionA.connect();
await sessionB.connect();
await sessionA.query("begin");
await sessionA.query("set role service_role");
const seen = await sessionA.query("select version, data from public.profiles where id = $1", [PLAYER]);
assert.equal(seen.rows[0].version, readVersion);
await sessionB.query("set role service_role");
const raced = await sessionB.query("select public.bc_shop_buy($1::uuid, 'ball', 'glaive', 'req-race-glaive') as j", [PLAYER]);
assert.equal(raced.rows[0].j.code, "ok");
assert.equal(raced.rows[0].j.charged, 420);
const stale = await sessionA.query(
  "update public.profiles set data = $1::jsonb, nickname = nickname, version = version + 1, updated_at = now() where id = $2 and version = $3",
  [JSON.stringify(staleData), PLAYER, readVersion]
);
assert.equal(stale.rowCount, 0);
await sessionA.query("commit");
await sessionB.end();
await sessionA.end();
row = (await admin.query("select version, data from public.profiles where id = $1", [PLAYER])).rows[0];
assert.equal(row.data.coins, before.data.coins - 420);
assert.equal(row.version, readVersion + 1);
const ownedGlaive = await admin.query("select 1 from private.bc_owned where user_id = $1 and item = 'glaive'", [PLAYER]);
assert.equal(ownedGlaive.rowCount, 1);
const retry = client();
await retry.connect();
await retry.query("set role service_role");
const fresh = await retry.query("select version, data from public.profiles where id = $1", [PLAYER]);
const nextData = fresh.rows[0].data;
nextData.coins += 30;
const saved = await retry.query(
  "update public.profiles set data = $1::jsonb, version = version + 1, updated_at = now() where id = $2 and version = $3",
  [JSON.stringify(nextData), PLAYER, fresh.rows[0].version]
);
assert.equal(saved.rowCount, 1);
await retry.end();
row = (await admin.query("select version, data from public.profiles where id = $1", [PLAYER])).rows[0];
assert.equal(row.data.coins, before.data.coins - 420 + 30);
assert.equal(row.version, readVersion + 2);
console.log("ok a withProfile save that read first cannot restore coins, and its retry adds the reward");

async function denied(role, sql, params) {
  try {
    await withRole(role, c => c.query(sql, params));
    return false;
  } catch (e) {
    return /permission denied/i.test(e.message);
  }
}
assert.equal(await denied("anon", "select public.bc_shop_buy($1::uuid, 'ball', 'comet', 'req-anon-00001')", [PLAYER]), true);
assert.equal(await denied("authenticated", "select public.bc_shop_sync($1::uuid)", [PLAYER]), true);
assert.equal(await denied("anon", "select private.bc_shop_sync($1::uuid)", [PLAYER]), true);
assert.equal(await denied("service_role", "select private.bc_shop_sync($1::uuid)", [PLAYER]), true);
assert.equal(await denied("service_role", "select * from private.bc_catalog"), true);
assert.equal(await denied("authenticated", "update public.profiles set nickname = 'hack' where id = $1", [PLAYER]), true);
assert.equal(await denied("anon", "update public.app_settings set value = '{}'::jsonb where key = 'about'"), true);
console.log("ok anon and authenticated cannot execute the shop or update profiles, and service_role cannot see private");

const mine = await withRole("authenticated", async c => {
  await c.query("select set_config('request.jwt.claim.sub', $1, false)", [PLAYER]);
  const profile = await c.query("select id from public.profiles order by id");
  const room = await c.query("select code from public.rooms order by code");
  return {profile: profile.rows.map(r => r.id), room: room.rows.map(r => r.code)};
});
assert.deepEqual(mine.profile, [PLAYER]);
assert.deepEqual(mine.room, ["ABCD"]);
const about = await withRole("anon", async c => {
  const r = await c.query("select key from public.app_settings order by key");
  return r.rows.map(x => x.key);
});
assert.deepEqual(about, ["about"]);
console.log("ok select policies still return the caller's profile, room, and public settings");

const priv = await admin.query(
  `select has_function_privilege('anon', 'public.bc_shop_buy(uuid,text,text,text)', 'execute') as anon_buy,
          has_function_privilege('authenticated', 'public.bc_shop_sync(uuid)', 'execute') as auth_sync,
          has_function_privilege('service_role', 'public.bc_shop_buy(uuid,text,text,text)', 'execute') as svc_buy,
          has_table_privilege('authenticated', 'public.profiles', 'update') as auth_upd,
          has_table_privilege('authenticated', 'public.profiles', 'select') as auth_sel,
          has_table_privilege('anon', 'public.game_secrets', 'select') as anon_secret`
);
const p = priv.rows[0];
const pubExec = await admin.query(
  `select has_function_privilege('public', 'public.bc_shop_buy(uuid,text,text,text)', 'execute') as public_buy,
          has_function_privilege('service_role', 'private.bc_shop_buy(uuid,text,text,text)', 'execute') as svc_private`
);
assert.equal(pubExec.rows[0].public_buy, false);
assert.equal(pubExec.rows[0].svc_private, false);
assert.equal(p.anon_buy, false);
assert.equal(p.auth_sync, false);
assert.equal(p.svc_buy, true);
assert.equal(p.auth_upd, false);
assert.equal(p.auth_sel, true);
assert.equal(p.anon_secret, false);
console.log("ok privilege catalog matches the wrappers and the hardening revoke");

await admin.end();
if (process.exitCode) {
  console.error("postgres tests failed");
  process.exit(process.exitCode);
}
console.log("postgres tests passed");
