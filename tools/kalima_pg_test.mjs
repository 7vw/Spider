/* Local Postgres checks for كلمة اليوم. Not production. */
import pg from "pg";
import assert from "node:assert/strict";

const U = "22222222-2222-2222-2222-222222222222";
function client() {
  return new pg.Client({host: "/var/run/postgresql", database: "spider_bc", user: "postgres"});
}
async function withRole(role, fn) {
  const c = client();
  await c.connect();
  try { await c.query(`set role ${role}`); return await fn(c); }
  finally { await c.end(); }
}
async function apply(c, day, prev, guess, marks, status) {
  const r = await c.query(
    "select public.word_apply($1::uuid,$2,$3,$4,$5,$6) as j",
    [U, day, prev, guess, marks, status]
  );
  return r.rows[0].j;
}

const admin = client();
await admin.connect();
await admin.query("delete from private.word_play where user_id=$1", [U]);
await admin.query("delete from private.word_streak where user_id=$1", [U]);
await admin.query("delete from auth.users where id=$1", [U]);
await admin.query("insert into auth.users (id) values ($1::uuid)", [U]);

const empty = await withRole("service_role", async c => (await c.query("select public.word_load($1::uuid,$2) as j", [U, "2026-10-20"])).rows[0].j);
assert.equal(empty.code, "ok");
assert.equal(empty.status, "open");
assert.equal(empty.streak, 0);
assert.deepEqual(empty.guesses, []);
console.log("ok a new day has no guesses");

const first = await withRole("service_role", c => apply(c, "2026-10-20", "2026-10-19", "مدرسه", "ybgbg", "open"));
assert.equal(first.code, "ok");
assert.equal(first.idempotent, false);
assert.equal(first.guesses.length, 1);
assert.equal(first.streak, 0);
const again = await withRole("service_role", c => apply(c, "2026-10-20", "2026-10-19", "مدرسه", "ybgbg", "open"));
assert.equal(again.idempotent, true);
assert.equal(again.guesses.length, 1);
console.log("ok a repeated guess does not take another row");

const won = await withRole("service_role", c => apply(c, "2026-10-20", "2026-10-19", "عندما", "ggggg", "won"));
assert.equal(won.status, "won");
assert.equal(won.streak, 1);
assert.equal(won.best, 1);
const next = await withRole("service_role", c => apply(c, "2026-10-21", "2026-10-20", "اليوم", "ggggg", "won"));
assert.equal(next.streak, 2);
assert.equal(next.best, 2);
console.log("ok a win the next day continues the streak");

const gap = await withRole("service_role", c => apply(c, "2026-10-23", "2026-10-22", "الناس", "ggggg", "won"));
assert.equal(gap.streak, 1);
assert.equal(gap.best, 2);
console.log("ok a missed day starts the streak at one");

let lost = null;
for (let i = 0; i < 5; i++) {
  lost = await withRole("service_role", c => apply(c, "2026-10-24", "2026-10-23", "كتب" + "ابتهخ"[i] + "ا", "bbbbb", "open"));
  assert.equal(lost.status, "open");
}
lost = await withRole("service_role", c => apply(c, "2026-10-24", "2026-10-23", "ظلاما", "bbbbb", "lost"));
assert.equal(lost.status, "lost");
assert.equal(lost.streak, 0);
assert.equal(lost.best, 2);
console.log("ok six misses break the streak and keep the best");

const closed = await withRole("service_role", c => apply(c, "2026-10-24", "2026-10-23", "باباا", "bbbbb", "open"));
assert.equal(closed.code, "closed");
const bad = await withRole("service_role", c => apply(c, "2026-10-25", "2026-10-24", "عندما", "bbbbb", "won"));
assert.equal(bad.code, "bad_request");
console.log("ok a finished day and a false win are rejected");

let anonDenied = false;
try { await withRole("anon", c => apply(c, "2026-10-25", "2026-10-24", "عندما", "ggggg", "won")); }
catch (e) { anonDenied = /permission denied/i.test(e.message); }
assert.equal(anonDenied, true);
let authDenied = false;
try { await withRole("authenticated", c => c.query("select public.word_load($1::uuid,$2)", [U, "2026-10-20"])); }
catch (e) { authDenied = /permission denied/i.test(e.message); }
assert.equal(authDenied, true);
const pub = await admin.query("select has_function_privilege('public', 'public.word_apply(uuid,text,text,text,text,text)', 'execute') as ok");
assert.equal(pub.rows[0].ok, false);
let readDenied = false;
try { await withRole("service_role", c => c.query("select * from private.word_play")); }
catch (e) { readDenied = /permission denied/i.test(e.message); }
assert.equal(readDenied, true);
console.log("ok only service_role can call the wrappers, and it cannot read the tables");

await admin.end();
