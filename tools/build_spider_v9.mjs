/* Build supabase/functions/spider/index.ts from the saved live v8 source.
   Re-run this after editing the shop scripts. Do not edit index.ts by hand. */
import {readFileSync, writeFileSync} from "fs";
import {dirname, join} from "path";
import {fileURLToPath} from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "supabase/functions/spider");
let src = readFileSync(join(dir, "v8.index.ts"), "utf8");
if (!src.startsWith("// SPIDER — Supabase Edge Function")) throw new Error("v8 header missing");
if (!src.includes("version:version+1")) throw new Error("v8 version lock missing");

src = src.replace(
`// SPIDER — Supabase Edge Function "spider" (accounts, rooms, 12 games, store, codes, friends, owner tools)
// Paste this whole file into: Supabase Dashboard → Edge Functions → spider → Code → Deploy
// It needs no secrets from you: Supabase provides SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to every function.
// @ts-nocheck`,
`// SPIDER — Supabase Edge Function "spider" v9
// Live v8 plus the Ball Clash coin shop. Paste this whole file into
// Supabase Dashboard → Edge Functions → spider → Code → Deploy.
// Rollback is the saved v8 file (v8.index.ts). Do not deploy until Mohammed approves.
// It needs no secrets from you: Supabase provides SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to every function.
// Shop balls are added by BC_NEW_DATA.apply inside the pasted scripts below.
// Do not also call merge(): apply already defined those ids, and merge throws.
// @ts-nocheck`
);

const shop = [
  "/* ===== Ball Clash shop scripts (inlined; apply runs once, merge is not called) ===== */",
  readFileSync(join(root, "bc_new_data.js"), "utf8").trimEnd(),
  readFileSync(join(root, "bc_shop_logic.js"), "utf8").trimEnd(),
  readFileSync(join(dir, "bc_shop_handler.js"), "utf8").trimEnd(),
  "globalThis.BC = BC;",
  ""
].join("\n");

const mark = "})(BC);\n";
const at = src.indexOf(mark);
if (at < 0) throw new Error("kinds closer missing");
src = src.slice(0, at + mark.length) + "\n" + shop + src.slice(at + mark.length);

src = src.replace(
  `okKind(k){return typeof BC!=="undefined"&&!!BC.KINDS[k]&&!BC.KINDS[k].hidden},`,
  `okKind(k){return typeof BC!=="undefined"&&!!BC.KINDS[k]&&!BC.KINDS[k].hidden&&!BC.KINDS[k].shop},`
);
src = src.replace(
  `autoFill(g,pv){const pool=BC.PICK.slice(),rnd=()=>pool[Math.floor(Math.random()*pool.length)];`,
  `autoFill(g,pv){const pool=BC.PICK.filter(k=>BC.KINDS[k]&&!BC.KINDS[k].shop),rnd=()=>pool[Math.floor(Math.random()*pool.length)];`
);

const startOld = `  case "bc_start":{
    limit(uid,"bc",30,60000);
    if(typeof BC==="undefined")fail("bad","اللعبة مو جاهزة في السيرفر");
    const teams=Array.isArray(p.teams)?p.teams:null;if(!teams||teams.length<2||teams.length>8)fail("bad","الفرق غير صحيحة");
    const clean=teams.map(t=>{const b=Array.isArray(t.balls)?t.balls.slice(0,8):[];if(!b.length||b.some(k=>!BC.KINDS[k]||BC.KINDS[k].hidden))fail("bad","كورة غير معروفة");return {balls:b}});`;
const startNew = `  case "bc_buy":
  case "bc_sync":{
    limit(uid,"bcshop",20,60000);
    const out=await BC_SHOP_HANDLER.dispatch(db,uid,action,p);
    if(action==="bc_buy"&&out&&out.code==="ok"&&!out.idempotent){
      try{
        const settled=await withProfile(db,uid,()=>{const reward=newOut();checkAchievements(reward);return reward});
        out.coins=settled.profile.coins;out.profile=settled.profile;out.out=settled.res;
      }catch(e){}
    }
    return out;
  }
  case "bc_start":{
    limit(uid,"bc",30,60000);
    if(typeof BC==="undefined")fail("bad","اللعبة مو جاهزة في السيرفر");
    const teams=Array.isArray(p.teams)?p.teams:null;if(!teams||teams.length<2||teams.length>8)fail("bad","الفرق غير صحيحة");
    const clean=teams.map(t=>{const b=Array.isArray(t.balls)?t.balls.slice(0,8):[];if(!b.length||b.some(k=>!BC.KINDS[k]||BC.KINDS[k].hidden))fail("bad","كورة غير معروفة");return {balls:b}});
    if(clean.some(t=>t.balls.some(k=>BC.KINDS[k]&&BC.KINDS[k].shop))){
      const owned=await BC_SHOP_HANDLER.ownedIds(db,uid);
      for(const t of clean){const e=BC_SHOP_HANDLER.lineupGuard(t.balls,owned);if(e)fail(e.code||"unowned","هذي الكورة من المتجر")}
    }`;
if (!src.includes(startOld)) throw new Error("bc_start block missing");
src = src.replace(startOld, startNew);

src = src.replace(
  `return {\n    async getProfile(id)`,
  `return {\n    async rpc(fn,args){return a.schema("private").rpc(fn,args)},\n    async getProfile(id)`
);

src = src.replace(
  `if(typeof Deno!=="undefined"&&Deno.serve){`,
  `if(typeof Deno!=="undefined"&&Deno.serve&&!(Deno.env&&Deno.env.get("SPIDER_NO_SERVE"))){`
);

if (src.includes("BC_NEW_DATA.merge")) throw new Error("merge call would crash boot");
if (!src.includes('id:"umbra"')) throw new Error("umbra missing");
if ((src.match(/version = version \+ 1/g) || []).length) throw new Error("shop SQL does not belong in the function");

src += `
if(typeof Deno==="undefined"||(Deno.env&&Deno.env.get("SPIDER_NO_SERVE"))){
  const bootErr=[];
  if(!BC.KINDS.umbra||BC.KINDS.umbra.shop!==true)bootErr.push("umbra");
  if(BC.KINDS.sword.pw!==1.117||BC.KINDS.sword.hpf!==1.117)bootErr.push("sword");
  if(BCR.okKind("umbra")||BCR.okKind("droneunit")||!BCR.okKind("sword"))bootErr.push("okKind");
  const pv=[{picks:[]}];
  BCR.autoFill({pick:"secret",n:1,size:4,locked:[false]},pv);
  if(!pv[0].picks.length||pv[0].picks.some(k=>!BC.KINDS[k]||BC.KINDS[k].shop))bootErr.push("autoFill");
  if(typeof handle!=="function"||!globalThis.BC_SHOP_HANDLER)bootErr.push("handle");
  if(bootErr.length)throw new Error("spider v9 boot: "+bootErr.join(","));
}
`;
writeFileSync(join(dir, "index.ts"), src);
console.log("index.ts", src.length);
