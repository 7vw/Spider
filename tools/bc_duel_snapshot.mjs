/* Proof that the original 60 still duel the same way after the shop balls load.
   The fixture was recorded from seed 7, each legacy ball versus sword, before any shop ball existed. */
import {createRequire} from "node:module";
import {readFileSync} from "node:fs";
import {dirname, join} from "node:path";
import {fileURLToPath} from "node:url";
import assert from "node:assert/strict";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const BC = require(join(root, "bc_core.js"));
require(join(root, "bc_kinds.js"));
const before = {};
for(const id of Object.keys(BC.KINDS)){
  const K = BC.KINDS[id];
  before[id] = JSON.stringify({pw:K.pw,hpf:K.hpf,hp:K.hp,dmg:K.dmg,len:K.len,spin:K.spin,cd:K.cd,kb:K.kb,w:K.w,count:K.count,ab:K.ab,on:K.on,grow:K.grow,cap:K.cap});
}
const ND = require(join(root, "bc_new_data.js"));
const fix = JSON.parse(readFileSync(join(root, "tools/fixtures/bc_duel_seed7.json"), "utf8"));
assert.equal(fix.seed, 7);
assert.equal(fix.vs, "sword");
function play(id){return BC.run({seed:7, synergy:false, maxT:90, teams:[{balls:[id]},{balls:["sword"]}]})}
function pack(st){
  const mains = st.balls.filter(b => !b.summon);
  const a = mains.find(b => b.team === 0);
  const s = mains.find(b => b.team === 1);
  return {winner:st.winner, draw:st.draw, t:st.t, timeout:!!st.timeout, aHp:a.hp, sHp:s.hp, aDealt:a.dealt, sDealt:s.dealt, aHits:a.hits, sHits:s.hits};
}
function asFixture(st, id){
  const a = st.balls.find(b => !b.summon && b.kind === id);
  const s = st.balls.find(b => !b.summon && b.kind === "sword");
  const n = v => Math.round(v * 10) / 10;
  return {winner:st.winner, draw:st.draw, t:Math.round(st.t * 1000) / 1000, timeout:!!st.timeout, aHp:n(a.hp), sHp:n(s.hp), aDealt:n(a.dealt), sDealt:n(s.dealt), aHits:a.hits, sHits:s.hits};
}
const ids = Object.keys(fix.rows);
const beforeRun = {};
for(const id of ids){
  const st = play(id);
  beforeRun[id] = JSON.stringify(pack(st));
  const row = asFixture(st, id);
  assert.deepEqual(row, fix.rows[id], id);
}
ND.apply(BC);
for(const id of Object.keys(before)){
  const K = BC.KINDS[id];
  const now = JSON.stringify({pw:K.pw,hpf:K.hpf,hp:K.hp,dmg:K.dmg,len:K.len,spin:K.spin,cd:K.cd,kb:K.kb,w:K.w,count:K.count,ab:K.ab,on:K.on,grow:K.grow,cap:K.cap});
  assert.equal(now, before[id], id);
}
let diffs = 0;
for(const id of ids){
  if(JSON.stringify(pack(play(id))) !== beforeRun[id]){ diffs++; console.error("changed", id); }
}
assert.equal(diffs, 0);
console.log("legacy duels", ids.length, "diffs", diffs);
