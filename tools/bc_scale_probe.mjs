import {createRequire} from "node:module";
import {dirname, join} from "node:path";
import {fileURLToPath} from "node:url";
const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const BC = require(join(root, "bc_core.js"));
require(join(root, "bc_kinds.js"));
const ND = require(join(root, "bc_new_data.js"));
ND.apply(BC);
const ids = process.argv.slice(2);
const scales = [1.6, 2.2, 2.8, 3.4];
function rate(id, scale){
  const K = BC.KINDS[id]; K.pw = scale; K.hpf = scale;
  let s = 0, n = 0;
  for(const opp of ND.legacy){
    const st = BC.run({seed:7, synergy:false, maxT:90, teams:[{balls:[id]},{balls:[opp]}]});
    s += st.draw ? 0.5 : st.winner === 0 ? 1 : 0; n++;
  }
  return Math.round(s / n * 1000) / 1000;
}
for(const id of ids){
  const row = scales.map(sc => sc+":"+rate(id, sc)).join(" ");
  console.log(id, row);
}
