/* Local Postgres checks for the social migration. Not production. */
import pg from "pg";
import assert from "node:assert/strict";

const A = "11111111-1111-1111-1111-111111111111";
const B = "22222222-2222-2222-2222-222222222222";
const C = "33333333-3333-3333-3333-333333333333";

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
async function rpc(c, fn, params) {
  const keys = Object.keys(params);
  const sql = `select public.${fn}(${keys.map((k, i) => `$${i + 1}`).join(",")}) as j`;
  const r = await c.query(sql, keys.map(k => params[k]));
  return r.rows[0].j;
}

const admin = client();
await admin.connect();
await admin.query("delete from public.profiles");
await admin.query("delete from auth.users");
await admin.query(`insert into auth.users (id) values ($1::uuid), ($2::uuid), ($3::uuid)`, [A, B, C]);
await admin.query(
  `insert into public.profiles (id, role, nickname, data, version) values
     ($1::uuid,'player','فهد','{"level":4,"coins":20,"email":"secret-a@example.com"}'::jsonb,1),
     ($2::uuid,'player','سارة','{"level":2,"coins":9,"email":"secret-b@example.com"}'::jsonb,1),
     ($3::uuid,'player','فهدان','{"level":7,"coins":3,"email":"secret-c@example.com"}'::jsonb,1)`,
  [A, B, C]
);

const touch = await withRole("service_role", c => rpc(c, "social_touch", {p_user: A}));
assert.equal(touch.code, "ok");
assert.match(touch.friendCode, /^[A-HJ-NP-Z2-9]{6}$/);
const again = await withRole("service_role", c => rpc(c, "social_touch", {p_user: A}));
assert.equal(again.friendCode, touch.friendCode);
console.log("ok a friend code is stable and has no email");

const list0 = await withRole("service_role", c => rpc(c, "social_list", {p_user: A}));
assert.equal(list0.count, 0);
assert.equal(JSON.stringify(list0).includes("@"), false);
assert.equal(JSON.stringify(list0).includes("email"), false);
console.log("ok the friends list is empty and hides emails");

const codeB = (await withRole("service_role", c => rpc(c, "social_touch", {p_user: B}))).friendCode;
await withRole("service_role", c => rpc(c, "social_touch", {p_user: C}));
const byCode = await withRole("service_role", c => rpc(c, "social_search", {p_user: A, p_q: codeB}));
assert.equal(byCode.rows.length, 1);
assert.equal(byCode.rows[0].nick, "سارة");
assert.equal(byCode.rows[0].id, B);
assert.equal(JSON.stringify(byCode).includes("secret"), false);
const byName = await withRole("service_role", c => rpc(c, "social_search", {p_user: A, p_q: "فهد"}));
const nicks = byName.rows.map(r => r.nick).sort();
assert.deepEqual(nicks, ["فهدان"]);
assert.equal(byName.rows.some(r => r.id === A), false);
console.log("ok search hits a code or a display name and never yourself");

const req = await withRole("service_role", c => rpc(c, "social_request", {p_user: A, p_other: B}));
assert.equal(req.accepted, false);
const dup = await withRole("service_role", c => rpc(c, "social_request", {p_user: A, p_other: B}));
assert.equal(dup.already, true);
const back = await withRole("service_role", c => rpc(c, "social_request", {p_user: B, p_other: A}));
assert.equal(back.accepted, true);
let listed = await withRole("service_role", c => rpc(c, "social_list", {p_user: A}));
assert.equal(listed.count, 1);
assert.equal(listed.friends[0].nick, "سارة");
assert.ok(listed.friends[0].seen);
console.log("ok a request is accepted by the other side and shows last_seen");

await withRole("service_role", c => rpc(c, "social_request", {p_user: C, p_other: A}));
const no = await withRole("service_role", c => rpc(c, "social_respond", {p_user: A, p_other: C, p_accept: false}));
assert.equal(no.accepted, false);
listed = await withRole("service_role", c => rpc(c, "social_list", {p_user: A}));
assert.equal(listed.incoming.length, 0);
console.log("ok a request can be declined");

const blocked = await withRole("service_role", c => rpc(c, "social_block", {p_user: A, p_other: B, p_on: true}));
assert.equal(blocked.blocked, true);
listed = await withRole("service_role", c => rpc(c, "social_list", {p_user: A}));
assert.equal(listed.count, 0);
assert.equal(listed.blocked.length, 1);
const afterBlock = await withRole("service_role", c => rpc(c, "social_request", {p_user: B, p_other: A}));
assert.equal(afterBlock.code, "blocked");
const hidden = await withRole("service_role", c => rpc(c, "social_search", {p_user: A, p_q: codeB}));
assert.equal(hidden.rows.length, 0);
await withRole("service_role", c => rpc(c, "social_block", {p_user: A, p_other: B, p_on: false}));
console.log("ok a block removes the friendship and hides search");

const card = await withRole("service_role", c => rpc(c, "social_card_set", {p_user: A, p_avatar: "moon", p_fav: "dama"}));
assert.equal(card.avatar, "moon");
assert.equal(card.fav, "dama");
const badCard = await withRole("service_role", c => rpc(c, "social_card_set", {p_user: A, p_avatar: "upload", p_fav: "not-a-game"}));
assert.equal(badCard.avatar, "moon");
assert.equal(badCard.fav, "dama");
console.log("ok the avatar is a built-in id and a bad value is ignored");

const chat = await withRole("service_role", c => rpc(c, "social_chat_ok", {p_id: "nice"}));
assert.equal(chat.code, "ok");
const chatBad = await withRole("service_role", c => rpc(c, "social_chat_ok", {p_id: "free text"}));
assert.equal(chatBad.code, "bad_request");
console.log("ok chat accepts a preset id and rejects free text");

async function denied(role, sql) {
  try { await withRole(role, c => c.query(sql)); return false; }
  catch (e) { return /permission denied/i.test(e.message); }
}
assert.equal(await denied("anon", `select public.social_list('${A}')`), true);
assert.equal(await denied("authenticated", `select public.social_search('${A}','فهد')`), true);
assert.equal(await denied("service_role", "select * from private.friend_codes"), true);
assert.equal(await denied("anon", "select private.social_list(null)"), true);
const priv = await admin.query(
  `select has_function_privilege('anon','public.social_list(uuid)','execute') as anon,
          has_function_privilege('authenticated','public.social_request(uuid,uuid)','execute') as auth,
          has_function_privilege('service_role','public.social_list(uuid)','execute') as svc,
          has_function_privilege('public','public.social_touch(uuid)','execute') as pub`
);
assert.equal(priv.rows[0].anon, false);
assert.equal(priv.rows[0].auth, false);
assert.equal(priv.rows[0].svc, true);
assert.equal(priv.rows[0].pub, false);
console.log("ok only service_role can call the social wrappers");

await admin.end();
console.log("social postgres tests passed");
