/* Tune shop balls so each one wins about half its duels against the original 60.
   pw and hpf stay equal, the same knob the existing BAL map uses.
   Every step uses all 60 opponents and seeds 7, 11 and 42. */
import {createRequire} from "node:module";
import {readFileSync, writeFileSync} from "node:fs";
import {dirname, join} from "node:path";
import {fileURLToPath} from "node:url";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const BC = require(join(root, "bc_core.js"));
require(join(root, "bc_kinds.js"));
const ND = require(join(root, "bc_new_data.js"));
const before = {};
ND.legacy.forEach(function(id){
  const K = BC.KINDS[id];
  before[id] = JSON.stringify({pw:K.pw,hpf:K.hpf,hp:K.hp,dmg:K.dmg,len:K.len,spin:K.spin,cd:K.cd,kb:K.kb,w:K.w,ab:K.ab,on:K.on});
});
ND.apply(BC);
ND.legacy.forEach(function(id){
  const K = BC.KINDS[id];
  const now = JSON.stringify({pw:K.pw,hpf:K.hpf,hp:K.hp,dmg:K.dmg,len:K.len,spin:K.spin,cd:K.cd,kb:K.kb,w:K.w,ab:K.ab,on:K.on});
  if(now !== before[id]) throw new Error("legacy ball changed: "+id);
});

const PROBE = ["sword","boomerang","fire","lightning","gravity","ghost","snake","dragon","laser","shield","celestial","void"];
const PEER = {sling:"boomerang",spark:"lightning",cog:"sawblade",glaive:"spear",blizzard:"ice",basilisk:"snake",trident:"spear",comet:"rocket",arcblade:"laser",meteor:"celestial",eclipse:"ghost",starlance:"spear"};
const FIELD = ND.legacy.slice();
const SEEDS = [7, 11, 42];

function score(id, opp, seed){
  const st = BC.run({seed:seed, synergy:false, maxT:90, teams:[{balls:[id]},{balls:[opp]}]});
  if(st.draw) return 0.5;
  return st.winner === 0 ? 1 : 0;
}
function rate(id, scale, opps, seeds){
  const K = BC.KINDS[id];
  K.pw = scale; K.hpf = scale;
  let s = 0, n = 0;
  for(const opp of opps) for(const seed of seeds){ s += score(id, opp, seed); n++; }
  return s / n;
}
function search(id){
  let lo = 0.35, hi = 3.2, best = 1, bestD = 1, bestR = 0;
  for(let i = 0; i < 12; i++){
    const mid = Math.round(((lo + hi) / 2) * 1000) / 1000;
    const r = rate(id, mid, FIELD, SEEDS);
    const d = Math.abs(r - 0.5);
    if(d < bestD){ bestD = d; best = mid; bestR = r; }
    if(r > 0.5) hi = mid; else lo = mid;
    if(hi - lo < 0.015) break;
  }
  const peer = rate(id, best, [PEER[id]], SEEDS);
  BC.KINDS[id].pw = best; BC.KINDS[id].hpf = best;
  return {id, scale:best, field:Math.round(bestR * 1000) / 1000, peer:PEER[id], peerRate:Math.round(peer * 1000) / 1000};
}

const out = [];
for(const b of ND.balls){
  const t0 = Date.now();
  const row = search(b.id);
  row.ms = Date.now() - t0;
  out.push(row);
  console.log(row.id, "scale", row.scale, "field", row.field, "vs", row.peer, row.peerRate, row.ms+"ms");
}
const file = join(root, "bc_new_data.js");
let src = readFileSync(file, "utf8");
for(const row of out){
  const re = new RegExp('(id:"'+row.id+'"[^\\n]*?)pw:[0-9.]+,hpf:[0-9.]+');
  if(!re.test(src)) throw new Error("no pw line for "+row.id);
  src = src.replace(re, "$1pw:"+row.scale+",hpf:"+row.scale);
}
writeFileSync(file, src);
writeFileSync(join(root, "tools/fixtures/bc_balance_new.json"), JSON.stringify({
  method:"pw=hpf scale, probe then full field seeds 7/11/42, target 0.47-0.53",
  balls:out
}, null, 2)+"\n");
const bad = out.filter(r => r.field < 0.47 || r.field > 0.53);
if(bad.length){
  console.error("OUT OF BAND", bad.map(r => r.id+":"+r.field).join(" "));
  process.exit(2);
}
console.log("tuned", out.length);
