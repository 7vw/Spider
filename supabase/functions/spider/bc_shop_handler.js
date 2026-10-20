/* Ball Clash shop actions for the spider edge function.
   Live handle() is handle(action, p, user, db) and errors throw fail().
   There is no admin, json(), or payload inside handle. db.rpc calls
   private.bc_shop_* through the service-role client (see supaDB).

   In the action switch:
     case "bc_buy":
     case "bc_sync": {
       limit(uid, "bcshop", 20, 60000);
       const out = await BC_SHOP_HANDLER.dispatch(db, uid, action, p);
       if (action === "bc_buy" && out && out.code === "ok" && !out.idempotent) {
         try {
           const settled = await withProfile(db, uid, () => {
             const reward = newOut();
             checkAchievements(reward);
             return reward;
           });
           out.coins = settled.profile.coins;
           out.profile = settled.profile;
           out.out = settled.res;
         } catch (e) {}
       }
       return out;
     }
   Inside bc_start, after clean, only when a shop ball is present:
     const owned = await BC_SHOP_HANDLER.ownedIds(db, uid);
     for (const t of clean) {
       const e = BC_SHOP_HANDLER.lineupGuard(t.balls, owned);
       if (e) fail(e.code || "unowned", "هذي الكورة من المتجر");
     }
   The paste-ready file is index.ts. It inlines these scripts and lets
   BC_NEW_DATA.apply run once. Do not also call merge(): the ids already
   exist, and merge throws, which would crash the function at boot.
   Do not deploy until Mohammed approves. */
(function(root){
"use strict";
function logic(){return root.BC_SHOP_LOGIC}
var MSG={
  ok:"تم الشراء.",
  insufficient:"رصيدك ما يكفي.",
  owned:"هذي عندك من قبل.",
  unknown:"هذا العنصر مو في المتجر.",
  bad_request:"الطلب ما اكتمل. حاول مرة ثانية.",
  profile_table_missing:"متجر الكور ينتظر تحديث الخادم. ما انخصم شي.",
  profile_missing:"ما لقينا حسابك على الخادم. ما انخصم شي."
};
function message(code){return MSG[code]||MSG.bad_request}
function buyArgs(userId,payload){
  payload=payload||{};
  return {p_user:userId,p_kind:payload.kind,p_item:payload.id,p_request:payload.requestId};
}
function lineupGuard(balls,owned){
  var L=logic();
  if(!L)return {code:"bad_lineup"};
  return L.lineupError(balls,owned);
}
async function ownedIds(admin,userId){
  var sync=await admin.rpc("bc_shop_sync",{p_user:userId});
  if(!sync||sync.error)return null;
  var s=sync.data||{};
  if(s.code&&s.code!=="ok")return null;
  return Array.isArray(s.owned)?s.owned:[];
}
async function dispatch(admin,userId,action,payload){
  var L=logic();
  if(!L)return {code:"bad_request",charged:0,message:message("bad_request")};
  if(action==="bc_sync"){
    var sync=await admin.rpc("bc_shop_sync",{p_user:userId});
    if(sync&&sync.error)return {code:"bad_request",charged:0,message:message("bad_request")};
    var s=sync&&sync.data||{};
    if(s.code&&s.code!=="ok")return {code:s.code,charged:0,coins:null,message:message(s.code)};
    return {code:"ok",owned:s.owned||[],coins:typeof s.coins==="number"?s.coins:null,message:""};
  }
  if(action!=="bc_buy")return {code:"bad_request",charged:0,message:message("bad_request")};
  var offer=L.findOffer(payload&&payload.kind,payload&&payload.id);
  if(!offer)return {code:"unknown",charged:0,message:message("unknown")};
  var args=buyArgs(userId,payload);
  var bought=await admin.rpc("bc_shop_buy",args);
  if(bought&&bought.error)return {code:"bad_request",charged:0,message:message("bad_request")};
  var d=bought&&bought.data||{};
  d.message=message(d.code);
  return d;
}
var api={dispatch:dispatch,buyArgs:buyArgs,lineupGuard:lineupGuard,ownedIds:ownedIds,message:message,MSG:MSG};
root.BC_SHOP_HANDLER=api;
if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof globalThis!=="undefined"?globalThis:this);
