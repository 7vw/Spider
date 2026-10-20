/* Local Postgres checks for the domino coin grant. Not production. */
import pg from "pg";
import assert from "node:assert/strict";

const A = "11111111-1111-1111-1111-111111111111";
const DAY = "2026-10-20";

function client() {
  return new pg.Client({host: "/var/run/postgresql", database: "spider_bc", user: "postgres"});
}
async function withRole(role, fn) {
  const c = client();
  await c.connect();
  try {
    await c.query(`set role ${role}`);
    return await fn(c);
  } finally { await c.end(); }
}
async function grant(c, request, amount, day) {
  const r = await c.query(
    "select public.coin_grant($1::uuid, $2, 'domino', $3, $4, 8) as j",
    [A, request, amount, day || DAY]
  );
  return r.rows[0].j;
}

const admin = client();
await admin.connect();
await admin.query("delete from private.coin_receipt");
await admin.query("delete from public.profiles");
await admin.query("delete from auth.users");
await admin.query("insert into auth.users (id) values ($1::uuid)", [A]);
await admin.query(
  `insert into public.profiles (id, role, nickname, data, version) values
     ($1::uuid, 'player', 'فهد', '{"coins":40}'::jsonb, 2)`,
  [A]
);

const first = await withRole("service_role", c => grant(c, "dom-req-0001", 10));
assert.equal(first.code, "ok");
assert.equal(first.granted, 10);
assert.equal(first.coins, 50);
assert.equal(first.version, 3);
assert.equal(first.idempotent, false);
let row = (await admin.query("select version, data from public.profiles where id = $1", [A])).rows[0];
assert.equal(row.version, 3);
assert.equal(row.data.coins, 50);
assert.equal(row.data.__ver, 3);
console.log("ok grant bumps coins, version and __ver");

const again = await withRole("service_role", c => grant(c, "dom-req-0001", 10));
assert.equal(again.idempotent, true);
assert.equal(again.granted, 0);
assert.equal(again.coins, 50);
row = (await admin.query("select version, data from public.profiles where id = $1", [A])).rows[0];
assert.equal(row.version, 3);
console.log("ok same requestId does not pay twice");

for (let i = 2; i <= 8; i++) {
  const g = await withRole("service_role", c => grant(c, "dom-req-000" + i, i === 8 ? 20 : 10));
  assert.equal(g.granted, i === 8 ? 20 : 10);
}
const capped = await withRole("service_role", c => grant(c, "dom-req-0009", 10));
assert.equal(capped.capped, true);
assert.equal(capped.granted, 0);
row = (await admin.query("select version, data->>'coins' as coins from public.profiles where id = $1", [A])).rows[0];
const beforeCap = Number(row.coins);
const cappedAgain = await withRole("service_role", c => grant(c, "dom-req-0009", 10));
assert.equal(cappedAgain.idempotent, true);
row = (await admin.query("select version, data->>'coins' as coins from public.profiles where id = $1", [A])).rows[0];
assert.equal(Number(row.coins), beforeCap);
console.log("ok daily cap is 8 paid wins");

const nextDay = await withRole("service_role", c => grant(c, "dom-req-0010", 10, "2026-10-21"));
assert.equal(nextDay.granted, 10);
console.log("ok the cap resets on the next day key");

const bad = await withRole("service_role", c => grant(c, "dom-req-0011", 99));
assert.equal(bad.code, "bad_request");
console.log("ok amounts other than 10 or 20 are rejected");

for (const role of ["anon", "authenticated"]) {
  let denied = false;
  try { await withRole(role, c => grant(c, "dom-req-0099", 10)); }
  catch (e) { denied = /permission denied/i.test(e.message); }
  assert.equal(denied, true, role);
}
const pubExec = await admin.query(
  "select has_function_privilege('public', 'public.coin_grant(uuid,text,text,integer,text,integer)', 'execute') as ok"
);
assert.equal(pubExec.rows[0].ok, false);
let tableDenied = false;
try { await withRole("service_role", c => c.query("select * from private.coin_receipt")); }
catch (e) { tableDenied = /permission denied/i.test(e.message); }
assert.equal(tableDenied, true);
console.log("ok only the definer function can write receipts");

await admin.end();
