/* BALL CLASH shop rules. The browser and the edge function both load this file.
   purchase() is the tested spec: the SQL function bc_shop_buy must follow it.
   A client price is ignored. Receipts are written only after a successful charge,
   so a failed try can be repeated, and a successful try cannot be charged twice. */
(function(root){
"use strict";
var RID=/^[A-Za-z0-9_-]{8,64}$/;
var BALL_PRICE={common:200,rare:420,epic:780,legendary:1500};
var BALLS=[
  ["sling","common"],["spark","common"],["cog","common"],
  ["glaive","rare"],["blizzard","rare"],["basilisk","rare"],
  ["trident","epic"],["comet","epic"],["arcblade","epic"],
  ["meteor","legendary"],["umbra","legendary"],["starlance","legendary"]
];
var LOOKS=[
  ["sh_royal","epic",450],["ls_neon","epic",450],["ts_neon","epic",450],["pl_neon","epic",450],["gh_abyss","epic",450],["lv_ember","epic",450],
  ["sw_royal","legendary",800],["hm_royal","legendary",800],["vd_abyss","legendary",800],["bh_abyss","legendary",800],["dr_ember","legendary",800],["ph_solar","legendary",800]
];
var ARENAS=[["ember","rare",350],["frost","rare",350],["abyss","epic",600]];
var CATALOG=[];
BALLS.forEach(function(b){CATALOG.push({kind:"ball",id:b[0],rar:b[1],price:BALL_PRICE[b[1]]})});
LOOKS.forEach(function(b){CATALOG.push({kind:"look",id:b[0],rar:b[1],price:b[2]})});
ARENAS.forEach(function(b){CATALOG.push({kind:"arena",id:b[0],rar:b[1],price:b[2]})});
var BY={};
CATALOG.forEach(function(it){BY[it.kind+":"+it.id]=it});
function findOffer(kind,id){return BY[kind+":"+id]||null}
function has(owned,kind,id){return (owned||[]).some(function(o){return o&&o.kind===kind&&o.id===id})}
function copyOwned(owned){return (owned||[]).filter(function(o){return o&&(o.kind==="ball"||o.kind==="look"||o.kind==="arena")&&typeof o.id==="string"}).map(function(o){return {kind:o.kind,id:o.id}})}
function copyReceipts(rec){var out={};if(!rec)return out;Object.keys(rec).forEach(function(k){var r=rec[k];if(r)out[k]={kind:r.kind,id:r.id,price:r.price,coinsAfter:r.coinsAfter,code:r.code}});return out}
function cloneState(state){
  state=state||{};
  var coins=Math.floor(Number(state.coins));
  if(!isFinite(coins)||coins<0)coins=0;
  return {coins:coins,owned:copyOwned(state.owned),receipts:copyReceipts(state.receipts)};
}
function result(code,state,extra){
  var o={code:code,charged:0,coins:state.coins,kind:extra.kind||null,id:extra.id||null,price:extra.price||0,state:state};
  if(extra.need)o.need=extra.need;
  if(extra.idempotent)o.idempotent=true;
  if(extra.charged)o.charged=extra.charged;
  return o;
}
/* Returns a new state. Does not mutate the state argument or any profile object. */
function purchase(state,req){
  var base=cloneState(state);
  req=req||{};
  var kind=req.kind,id=req.id,rid=req.requestId;
  if(kind!=="ball"&&kind!=="look"&&kind!=="arena")return result("bad_request",base,{kind:kind,id:id});
  if(typeof id!=="string"||!id||typeof rid!=="string"||!RID.test(rid))return result("bad_request",base,{kind:kind,id:id});
  var prev=base.receipts[rid];
  if(prev){
    if(prev.kind===kind&&prev.id===id&&prev.code==="ok")return result("ok",base,{kind:kind,id:id,price:prev.price,idempotent:true});
    return result("bad_request",base,{kind:kind,id:id});
  }
  var offer=findOffer(kind,id);
  if(!offer)return result("unknown",base,{kind:kind,id:id});
  if(has(base.owned,kind,id))return result("owned",base,{kind:kind,id:id,price:offer.price});
  if(base.coins<offer.price)return result("insufficient",base,{kind:kind,id:id,price:offer.price,need:offer.price-base.coins});
  var next=cloneState(base);
  next.coins-=offer.price;
  next.owned.push({kind:kind,id:id});
  next.receipts[rid]={kind:kind,id:id,price:offer.price,coinsAfter:next.coins,code:"ok"};
  return result("ok",next,{kind:kind,id:id,price:offer.price,charged:offer.price});
}
function canUseBall(id,owned){if(findOffer("ball",id))return has(owned,"ball",id);return true}
function canUseLook(id,owned){if(!id)return true;var offer=findOffer("look",id);if(!offer)return false;return has(owned,"look",id)}
function canUseArena(id,owned){if(!id||id==="classic")return true;var offer=findOffer("arena",id);if(!offer)return false;return has(owned,"arena",id)}
function lineupError(balls,owned){
  if(!Array.isArray(balls))return {code:"bad_lineup"};
  for(var i=0;i<balls.length;i++){var id=balls[i];if(findOffer("ball",id)&&!has(owned,"ball",id))return {code:"unowned",id:id}}
  return null;
}
function sanitizeEquip(looks,arena,owned){
  var next={};looks=looks&&typeof looks==="object"?looks:{};
  Object.keys(looks).forEach(function(ball){if(canUseLook(looks[ball],owned))next[ball]=looks[ball]});
  return {looks:next,arena:canUseArena(arena,owned)?(arena||"classic"):"classic"};
}
var CACHE_KEY="bc_inv_v1";
function emptyInv(){return {v:1,owned:[]}}
function loadCache(){
  try{
    if(typeof localStorage==="undefined")return emptyInv();
    var o=JSON.parse(localStorage.getItem(CACHE_KEY)||"null");
    if(!o||!Array.isArray(o.owned))return emptyInv();
    return {v:1,owned:copyOwned(o.owned)};
  }catch(e){return emptyInv()}
}
function saveCache(inv){
  try{if(typeof localStorage==="undefined")return;localStorage.setItem(CACHE_KEY,JSON.stringify({v:1,owned:copyOwned(inv&&inv.owned)}))}catch(e){}
}
function applyServer(res){
  var inv={v:1,owned:copyOwned(res&&res.owned)};
  saveCache(inv);
  return inv;
}
var api={CATALOG:CATALOG,BALL_PRICE:BALL_PRICE,findOffer:findOffer,purchase:purchase,canUseBall:canUseBall,canUseLook:canUseLook,canUseArena:canUseArena,lineupError:lineupError,sanitizeEquip:sanitizeEquip,loadCache:loadCache,saveCache:saveCache,applyServer:applyServer,has:has,CACHE_KEY:CACHE_KEY};
root.BC_SHOP_LOGIC=api;
if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof globalThis!=="undefined"?globalThis:this);
