/* Ball Clash shop actions for the spider edge function.
   The live function source is not in this repo. Wire this in without changing
   existing actions. Do not deploy until Mohammed approves.

   In the request switch, before the existing cases:
     if (action === "bc_buy" || action === "bc_sync") {
       return json(await BC_SHOP_HANDLER.dispatch(admin, user.id, action, payload || {}));
     }
   Inside bc_start, before the kind-id check, for every team ball list:
     const owned = await BC_SHOP_HANDLER.ownedIds(admin, user.id);
     const err = BC_SHOP_HANDLER.lineupGuard(balls, owned);
     if (err) return json({ error: err.code || "unowned", id: err.id }, 400);
   ownedIds returns null when the ownership read fails. The guard then
   rejects every shop ball and still allows the original free balls.
   Load bc_shop_logic.js and bc_new_data.js in the same deploy, and merge kinds
   with BC_NEW_DATA.merge(BC) so an existing id is never replaced.
   The handler does not send a price. bc_shop_buy reads bc_catalog. */
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
