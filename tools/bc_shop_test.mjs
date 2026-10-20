/* Purchase rules. These run the same function the store uses.
   The SQL migration is checked against this catalog. It is not applied here. */
import {createRequire} from "node:module";
import {readFileSync} from "node:fs";
import {dirname, join} from "node:path";
import {fileURLToPath} from "node:url";
import assert from "node:assert/strict";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const Shop = require(join(root, "bc_shop_logic.js"));
const Handler = require(join(root, "supabase/functions/spider/bc_shop_handler.js"));
const ND = require(join(root, "bc_new_data.js"));
const BC = require(join(root, "bc_core.js"));
require(join(root, "bc_kinds.js"));

let failed = 0;
function check(name, fn){
  try{ fn(); console.log("ok", name); }
  catch(e){ failed++; console.error("FAIL", name, e.message); }
}

const RID = "req-shop-0001";
const RID2 = "req-shop-0002";

check("insufficient coins leaves the wallet and writes no receipt", () => {
  const start = {coins:100, owned:[], receipts:{}, xp:40, v:2, skins:["red"]};
  const r = Shop.purchase(start, {kind:"ball", id:"sling", requestId:RID, price:1});
  assert.equal(r.code, "insufficient");
  assert.equal(r.charged, 0);
  assert.equal(r.coins, 100);
  assert.equal(r.need, 100);
  assert.deepEqual(r.state.owned, []);
  assert.deepEqual(r.state.receipts, {});
  assert.equal(start.coins, 100);
  assert.equal(start.xp, 40);
  assert.equal(start.v, 2);
  assert.deepEqual(start.skins, ["red"]);
});

check("a failed try does not stick, so the same request can succeed later", () => {
  const poor = Shop.purchase({coins:100, owned:[], receipts:{}}, {kind:"ball", id:"sling", requestId:RID});
  const later = Shop.purchase({coins:500, owned:poor.state.owned, receipts:poor.state.receipts}, {kind:"ball", id:"sling", requestId:RID, price:1});
  assert.equal(later.code, "ok");
  assert.equal(later.charged, 200);
  assert.equal(later.coins, 300);
  assert.equal(later.price, 200);
});

check("price sent by the client is ignored", () => {
  const r = Shop.purchase({coins:2000, owned:[], receipts:{}}, {kind:"look", id:"sw_royal", requestId:RID, price:1});
  assert.equal(r.code, "ok");
  assert.equal(r.charged, 800);
  assert.equal(r.coins, 1200);
});

check("already owned does not charge, even with a new request", () => {
  const first = Shop.purchase({coins:2000, owned:[], receipts:{}}, {kind:"arena", id:"abyss", requestId:RID});
  assert.equal(first.charged, 600);
  const again = Shop.purchase(first.state, {kind:"arena", id:"abyss", requestId:RID2, price:1});
  assert.equal(again.code, "owned");
  assert.equal(again.charged, 0);
  assert.equal(again.coins, first.coins);
  assert.equal(Object.keys(again.state.receipts).length, 1);
  assert.equal(again.state.owned.length, 1);
});

check("retry of a successful request charges nothing and keeps later coins", () => {
  const first = Shop.purchase({coins:1000, owned:[], receipts:{}}, {kind:"ball", id:"spark", requestId:RID});
  assert.equal(first.coins, 800);
  const earned = Shop.purchase(Object.assign({}, first.state, {coins:first.coins + 50}), {kind:"ball", id:"spark", requestId:RID});
  assert.equal(earned.code, "ok");
  assert.equal(earned.idempotent, true);
  assert.equal(earned.charged, 0);
  assert.equal(earned.coins, 850);
  assert.equal(Object.keys(earned.state.receipts).length, 1);
});

check("unknown id and a bad request id write nothing", () => {
  const u = Shop.purchase({coins:5000, owned:[], receipts:{}}, {kind:"ball", id:"sword", requestId:RID});
  assert.equal(u.code, "unknown");
  assert.equal(u.charged, 0);
  assert.equal(u.coins, 5000);
  const b = Shop.purchase({coins:5000, owned:[], receipts:{}}, {kind:"ball", id:"sling", requestId:"short"});
  assert.equal(b.code, "bad_request");
  assert.deepEqual(b.state.receipts, {});
  const reused = Shop.purchase({coins:5000, owned:[], receipts:{[RID]:{kind:"ball", id:"spark", price:200, coinsAfter:4800, code:"ok"}}}, {kind:"ball", id:"sling", requestId:RID});
  assert.equal(reused.code, "bad_request");
  assert.equal(reused.coins, 5000);
});

check("only coins would change on a profile the caller updates", () => {
  const profile = {xp:10, v:2, owned:{skin:["classic"]}, coins:900, nickname:"م"};
  const r = Shop.purchase({coins:profile.coins, owned:[], receipts:{}}, {kind:"ball", id:"cog", requestId:RID});
  profile.coins = r.coins;
  assert.equal(profile.coins, 700);
  assert.equal(profile.xp, 10);
  assert.equal(profile.v, 2);
  assert.deepEqual(profile.owned.skin, ["classic"]);
  assert.equal(profile.nickname, "م");
});

check("lineup guard blocks shop balls that are not owned", () => {
  assert.equal(Shop.lineupError(["sword","spear"], []), null);
  assert.deepEqual(Shop.lineupError(["sword","comet"], []), {code:"unowned", id:"comet"});
  assert.equal(Shop.lineupError(["comet"], [{kind:"ball", id:"comet"}]), null);
  assert.equal(Shop.canUseBall("sword", []), true);
  assert.equal(Shop.canUseBall("comet", []), false);
  assert.equal(Shop.canUseLook(null, []), true);
  assert.equal(Shop.canUseLook("sw_royal", []), false);
  assert.equal(Shop.canUseArena("classic", []), true);
  assert.equal(Shop.canUseArena("abyss", []), false);
});

check("equipped paid items drop when the server list does not include them", () => {
  const clean = Shop.sanitizeEquip({sword:"sw_royal", hammer:"hm_royal"}, "abyss", [{kind:"look", id:"sw_royal"}]);
  assert.deepEqual(clean.looks, {sword:"sw_royal"});
  assert.equal(clean.arena, "classic");
});

check("the handler never forwards a client price", () => {
  const args = Handler.buyArgs("user-1", {kind:"ball", id:"comet", requestId:RID, price:1});
  assert.deepEqual(args, {p_user:"user-1", p_kind:"ball", p_item:"comet", p_request:RID});
  assert.equal("price" in args, false);
  assert.equal(Handler.lineupGuard(["meteor"], []).code, "unowned");
});

check("catalog matches the migration and the shop balls", () => {
  const sql = readFileSync(join(root, "supabase/migrations/20261020140000_bc_shop.sql"), "utf8");
  const rows = [...sql.matchAll(/\('([^']+)','([^']+)',(\d+)\)/g)].map(m => ({kind:m[1], id:m[2], price:+m[3]}));
  assert.equal(rows.length, Shop.CATALOG.length);
  const sqlKey = rows.map(r => r.kind+":"+r.id+":"+r.price).sort();
  const jsKey = Shop.CATALOG.map(r => r.kind+":"+r.id+":"+r.price).sort();
  assert.deepEqual(sqlKey, jsKey);
  const shopBalls = ND.balls.filter(b => b.shop).map(b => b.id).sort();
  const catBalls = Shop.CATALOG.filter(r => r.kind === "ball").map(r => r.id).sort();
  assert.deepEqual(shopBalls, catBalls);
  ND.legacy.forEach(id => assert.equal(Shop.findOffer("ball", id), null));
  assert.equal(Shop.findOffer("arena", "classic"), null);
  const prices = {common:200, rare:420, epic:780, legendary:1500};
  ND.balls.forEach(b => assert.equal(Shop.findOffer("ball", b.id).price, prices[b.rar]));
});

check("server copy of the shop rules matches the client file", () => {
  const a = readFileSync(join(root, "bc_shop_logic.js"), "utf8");
  const b = readFileSync(join(root, "supabase/functions/spider/bc_shop_logic.js"), "utf8");
  assert.equal(a, b);
  const c = readFileSync(join(root, "bc_new_data.js"), "utf8");
  const d = readFileSync(join(root, "supabase/functions/spider/bc_new_data.js"), "utf8");
  assert.equal(c, d);
});

check("adding shop balls does not change a legacy kind", () => {
  const before = JSON.stringify(BC.KINDS.sword);
  ND.apply(BC);
  assert.equal(JSON.stringify(BC.KINDS.sword), before);
  assert.equal(BC.KINDS.sword.pw, BC.KINDS.sword.hpf);
  assert.ok(BC.KINDS.comet);
  assert.throws(() => ND.merge(BC), /refusing to replace/);
});

{
  const state = {coins:5000, owned:[], receipts:{}};
  let seen = null;
  const admin = {rpc: async (name, args) => {
    seen = args;
    assert.equal("price" in args, false);
    if(name !== "bc_shop_buy") return {data:{owned:state.owned, coins:state.coins}};
    const r = Shop.purchase(state, {kind:args.p_kind, id:args.p_item, requestId:args.p_request, price:1});
    state.coins = r.state.coins; state.owned = r.state.owned; state.receipts = r.state.receipts;
    return {data:{code:r.code, charged:r.charged, coins:r.coins, price:r.price, kind:r.kind, id:r.id, owned:r.state.owned, need:r.need}};
  }};
  const out = await Handler.dispatch(admin, "11111111-1111-1111-1111-111111111111", "bc_buy", {kind:"ball", id:"comet", requestId:RID, price:1});
  assert.equal(seen.p_item, "comet");
  assert.equal(out.charged, 780);
  assert.equal(out.coins, 4220);
  const again = await Handler.dispatch(admin, "11111111-1111-1111-1111-111111111111", "bc_buy", {kind:"ball", id:"comet", requestId:RID2, price:1});
  assert.equal(again.code, "owned");
  assert.equal(again.charged, 0);
  assert.equal(state.coins, 4220);
  const broke = {coins:100, owned:[], receipts:{}};
  const admin2 = {rpc: async (name, args) => {
    assert.equal("price" in args, false);
    const r = Shop.purchase(broke, {kind:args.p_kind, id:args.p_item, requestId:args.p_request});
    return {data:{code:r.code, charged:r.charged, coins:r.coins, need:r.need, owned:r.state.owned}};
  }};
  const poor = await Handler.dispatch(admin2, "u", "bc_buy", {kind:"ball", id:"meteor", requestId:RID, price:1});
  assert.equal(poor.code, "insufficient");
  assert.equal(poor.charged, 0);
  assert.equal(broke.coins, 100);
  const owned = await Handler.ownedIds({rpc: async () => ({data:{code:"ok", owned:[{kind:"ball", id:"comet"}]}})}, "u");
  assert.deepEqual(owned, [{kind:"ball", id:"comet"}]);
  const unread = await Handler.ownedIds({rpc: async () => ({error:{message:"down"}})}, "u");
  assert.equal(unread, null);
  assert.equal(Handler.lineupGuard(["sword"], unread), null);
  assert.equal(Handler.lineupGuard(["comet"], unread).code, "unowned");
  const missing = await Handler.dispatch({rpc: async () => ({data:{code:"profile_table_missing", owned:[], coins:null}})}, "u", "bc_sync", {});
  assert.equal(missing.code, "profile_table_missing");
  assert.equal(missing.owned, undefined);
  console.log("ok dispatch keeps the charge on the server");
}
if(failed){ console.error(failed+" failed"); process.exit(1); }
console.log("shop tests passed");
