/* BALL CLASH store. Loaded only when the store opens.
   The screen shows prices and previews. A purchase is sent to the server
   with a request id and no price. Coins move only after the server answers. */
(function(){
"use strict";
var SP=window.SP,h=SP.h,fmt=SP.fmt,L=window.BC_SHOP_LOGIC,UI=window.BCUI;
var S={tab:"balls",filt:"sale",kind:"ball",id:"comet",pend:false,rid:"",banner:"",note:""};
var inflight=null;
function $(id){return document.getElementById(id)}
function root(){return $("bcRoot")}
function coins(){var n=SP.P&&SP.P.coins;n=Math.floor(Number(n));return isFinite(n)&&n>0?n:0}
function owned(){return L.loadCache().owned}
function has(kind,id){return L.has(owned(),kind,id)}
function offer(kind,id){return L.findOffer(kind,id)}
function online(){return !!(SP.online&&SP.online())}
function looksMap(){try{var o=JSON.parse(localStorage.getItem("bc_look")||"{}");return o&&typeof o==="object"?o:{}}catch(e){return {}}}
function arenaNow(){try{return localStorage.getItem("bc_arena")||"classic"}catch(e){return "classic"}}
function stripEquip(){var clean=L.sanitizeEquip(looksMap(),arenaNow(),owned());try{localStorage.setItem("bc_look",JSON.stringify(clean.looks));localStorage.setItem("bc_arena",clean.arena)}catch(e){}}
function ballName(id){var K=BC.KINDS[id];return K?K.ar:id}
function itemName(kind,id){
  if(kind==="ball")return ballName(id);
  if(kind==="look")return BC.LOOKS[id]?BC.LOOKS[id].ar:id;
  return BC.ARENAS[id]?BC.ARENAS[id].ar:id;
}
function itemEn(kind,id){
  if(kind==="ball")return BC.KINDS[id]?BC.KINDS[id].en:"";
  if(kind==="look")return BC.LOOKS[id]?BC.LOOKS[id].en:"";
  return BC.ARENAS[id]?BC.ARENAS[id].en:"";
}
function itemRar(kind,id){
  if(kind==="ball")return (BC.KINDS[id]&&BC.KINDS[id].rar)||"common";
  if(kind==="look")return (BC.LOOKS[id]&&BC.LOOKS[id].rar)||"epic";
  return (BC.ARENAS[id]&&BC.ARENAS[id].rar)||"common";
}
function itemDesc(kind,id){
  if(kind==="ball")return BC.KINDS[id]?BC.KINDS[id].desc:"";
  if(kind==="look")return BC.LOOKS[id]?BC.LOOKS[id].desc:"";
  return BC.ARENAS[id]?BC.ARENAS[id].desc:"";
}
function equipped(kind,id){
  if(kind==="look"){var Lk=BC.LOOKS[id];return !!(Lk&&looksMap()[Lk.ball]===id)}
  if(kind==="arena")return arenaNow()===id;
  return false;
}
function rows(){
  var out=[];
  if(S.tab==="balls"){
    if(S.filt!=="sale")BC.LEGACY.forEach(function(id){out.push({kind:"ball",id:id,free:true})});
    L.CATALOG.filter(function(it){return it.kind==="ball"}).forEach(function(it){out.push({kind:"ball",id:it.id,free:false,price:it.price,rar:it.rar})});
  }else if(S.tab==="looks"){
    L.CATALOG.filter(function(it){return it.kind==="look"}).forEach(function(it){out.push({kind:"look",id:it.id,free:false,price:it.price,rar:it.rar})});
  }else{
    out.push({kind:"arena",id:"classic",free:true});
    L.CATALOG.filter(function(it){return it.kind==="arena"}).forEach(function(it){out.push({kind:"arena",id:it.id,free:false,price:it.price,rar:it.rar})});
  }
  return out.filter(function(it){
    var own=it.free||has(it.kind,it.id);
    if(S.filt==="sale")return !it.free&&!own;
    if(S.filt==="owned")return own;
    return true;
  });
}
function ensurePick(){
  var list=rows();
  if(!list.some(function(it){return it.kind===S.kind&&it.id===S.id})){
    var f=list[0];if(f){S.kind=f.kind;S.id=f.id}else if(S.tab==="balls"){S.kind="ball";S.id="comet"}
  }
}
function rarEl(rar){var name=(BC.RAR_NAME&&BC.RAR_NAME[rar])||rar;return h("span",{class:"bc-rar "+(rar||"common")},name)}
function paint(host){
  host.textContent="";
  var still=SP.reduced&&SP.reduced();
  if(S.kind==="arena"){
    if(still)host.append(UI.arenaThumb(S.id,220));
    else UI.mountLive(host,220,function(ctx,px,t){UI.paintArena(ctx,px,t,S.id)});
    return;
  }
  var ball=S.kind==="look"?BC.LOOKS[S.id].ball:S.id,skin=S.kind==="look"?S.id:null;
  if(still)host.append(UI.previewCanvas(ball,180,1.1,{skin:skin,still:true}));
  else UI.mountLive(host,180,function(ctx,px,t){UI.paintPreview(ctx,ball,px,t,{skin:skin})});
}
function priceLine(it){
  if(it.free)return h("span",{class:"bc-free"},"مجاني");
  if(has(it.kind,it.id))return h("span",{class:"bc-eq"},"عندك");
  return h("span",{class:"bc-price"},SP.coinEl(fmt(it.price)));
}
function actionBtn(it){
  var own=it.free||has(it.kind,it.id),eq=equipped(it.kind,it.id),off=it.free?null:offer(it.kind,it.id),price=off?off.price:0,short=!own&&coins()<price;
  if(it.kind==="ball"&&own)return h("button",{class:"small",disabled:true},"متاحة للعب");
  if(own&&(it.kind==="look"||it.kind==="arena")){
    return h("button",{class:"primary",disabled:eq,onclick:function(){equip(it)}},eq?"مستخدم":"جهّز");
  }
  if(short)return h("button",{class:"small bc-shortbtn",disabled:true},"رصيدك ما يكفي — ينقصك "+fmt(price-coins()));
  if(!online())return h("button",{class:"small",disabled:true},"الشراء من الخادم");
  return h("button",{class:"primary",onclick:function(){ask(it)}},"اشترِ");
}
function equip(it){
  if(it.kind==="look"){if(!L.canUseLook(it.id,owned()))return;var map=looksMap();map[BC.LOOKS[it.id].ball]=it.id;try{localStorage.setItem("bc_look",JSON.stringify(map))}catch(e){}}
  if(it.kind==="arena"){if(!L.canUseArena(it.id,owned()))return;try{localStorage.setItem("bc_arena",it.id)}catch(e){}}
  SP.sfx("unlock");render();
}
function newRid(){
  var chars="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-",a=new Uint8Array(16),s="";
  (window.crypto||crypto).getRandomValues(a);
  for(var i=0;i<16;i++)s+=chars[a[i]%chars.length];
  return s;
}
function ask(it){
  if(!online()){SP.toast("الشراء يصير على الخادم، ونت ما متصل الحين.","bad");return}
  var off=offer(it.kind,it.id);if(!off||has(it.kind,it.id)||coins()<off.price||S.pend)return;
  S.rid=newRid();S.pend=false;
  SP.openSheet(function(card,close){
    function draw(){
      card.textContent="";
      var left=coins()-off.price,lack=coins()<off.price;
      card.append(h("h3",{},"تأكيد الشراء"),h("p",{class:"lead"},"تشتري «"+itemName(it.kind,it.id)+"» بـ "+fmt(off.price)+" عملة؟"),
        lack?h("p",{class:"bc-short"},"رصيدك ما يكفي — ينقصك "+fmt(off.price-coins())):h("p",{class:"hint"},"يبقى معك "+fmt(Math.max(0,left))+" عملة. الخصم يتم على الخادم، ولو انضغط الزر مرتين ينخصم مرة واحدة."),
        h("div",{class:"row"},h("button",{class:"primary",disabled:S.pend||lack,onclick:function(){go(it,close,draw)}},S.pend?"جارٍ التأكد…":"اشترِ"),h("button",{disabled:S.pend,onclick:function(){if(!S.pend)close()}},"إلغاء")));
    }
    draw();
  });
}
async function go(it,close,draw){
  if(S.pend||inflight)return;
  var off=offer(it.kind,it.id);
  if(!off||coins()<off.price){draw();return}
  var requestId=S.rid;
  S.pend=true;draw();
  inflight=(async function(){
    var res=null,failed=false;
    try{res=await SP.api("bc_buy",{kind:it.kind,id:it.id,requestId:requestId})}
    catch(e){failed=true;SP.toast("ما وصل رد الخادم. أعد المحاولة بنفس الطلب، ولن ينخصم مرتين.","bad");SP.sfx("bad")}
    S.pend=false;inflight=null;
    if(failed){draw();return}
    take(res,it);
    if(res&&(res.code==="ok"||res.code==="owned"||res.code==="insufficient"))close();
    else draw();
    render();
  })();
}
function take(res,it){
  if(!res||typeof res!=="object"){SP.toast("متجر الكور ينتظر تحديث الخادم. ما انخصم شي.","bad");return}
  if(typeof res.coins==="number"&&SP.setCoins)SP.setCoins(res.coins);
  if(Array.isArray(res.owned))L.applyServer(res);
  else if(res.code==="ok"){var inv=L.loadCache();if(!L.has(inv.owned,it.kind,it.id))inv.owned.push({kind:it.kind,id:it.id});L.saveCache(inv)}
  stripEquip();
  var text=res.message||({
    ok:"صار عندك «"+itemName(it.kind,it.id)+"»",
    insufficient:"رصيدك ما يكفي"+(res.need?" — ينقصك "+fmt(res.need):""),
    owned:"هذي عندك من قبل",
    unknown:"هذا العنصر مو في المتجر",
    bad_request:"الطلب ما اكتمل. حاول مرة ثانية.",
    profile_table_missing:"متجر الكور ينتظر تحديث الخادم. ما انخصم شي.",
    profile_missing:"ما لقينا حسابك على الخادم. ما انخصم شي."
  }[res.code]||"الطلب ما اكتمل.");
  SP.toast(text,res.code==="ok"||res.code==="owned"?"good":"bad");
  if(res.code==="ok")SP.sfx("unlock");else if(res.code!=="owned")SP.sfx("bad");
}
async function pull(){
  if(!online()){S.banner="الشراء يصير على الخادم، ونت ما متصل الحين.";S.note="";render();return}
  S.banner="";S.note="يتأكد الرصيد من الخادم…";render();
  try{
    var res=await SP.api("bc_sync");
    if(res&&Array.isArray(res.owned)){L.applyServer(res);if(typeof res.coins==="number"&&SP.setCoins)SP.setCoins(res.coins);stripEquip();S.banner="";S.note=""}
    else{S.banner=(res&&res.message)||"متجر الكور ينتظر تحديث الخادم. ما انخصم شي.";S.note=""}
  }catch(e){S.banner="متجر الكور ينتظر تحديث الخادم. ما انخصم شي.";S.note=""}
  render();
}
function render(){
  ensurePick();
  var r=root();r.textContent="";
  var wallet=h("div",{class:"bc-wallet"},SP.coinEl(fmt(coins())));
  r.append(h("div",{class:"bc-shop"},h("div",{class:"bc-bar"},h("button",{class:"quit",onclick:function(){if(UI.mountLive){var host=r.querySelector(".bc-stage-cv");if(host)host.textContent=""}SP.openGame("ballclash")}},"رجوع"),h("div",{class:"bc-title"},h("b",{},"STORE"),h("span",{},"متجر الكور")),wallet)));
  var box=r.querySelector(".bc-shop");
  var tabs=h("div",{class:"chips bc-tabs",role:"tablist"});
  [["balls","الكور"],["looks","المظاهر"],["arenas","الساحات"]].forEach(function(t){tabs.append(h("button",{class:"chip"+(S.tab===t[0]?" on":""),role:"tab","aria-selected":S.tab===t[0]?"true":"false",onclick:function(){S.tab=t[0];S.filt=t[0]==="balls"?"sale":"all";render()}},t[1]))});
  box.append(tabs);
  box.append(h("p",{class:"bc-shop-note"},"عملات اللعبة فقط، بدون فلوس حقيقية. السعر يتحدد على الخادم، والضغط مرتين يخصم مرة واحدة."));
  if(S.banner)box.append(h("p",{class:"bc-shop-banner",role:"status"},S.banner));
  else if(S.note)box.append(h("p",{class:"hint"},S.note));
  var filts=h("div",{class:"chips"});
  [["sale","للبيع"],["owned","عندك"],["all","الكل"]].forEach(function(f){if(S.tab!=="balls"&&f[0]==="sale")return;filts.append(h("button",{class:"chip"+(S.filt===f[0]?" on":""),onclick:function(){S.filt=f[0];render()}},f[1]))});
  box.append(filts);
  var stage=h("div",{class:"bc-stage"}),host=h("div",{class:"bc-stage-cv"}),meta=h("div",{class:"bc-stage-meta"});
  stage.append(host,meta);box.append(stage);
  var cur=offer(S.kind,S.id),free=S.kind==="ball"&&BC.LEGACY&&BC.LEGACY.indexOf(S.id)>=0||S.kind==="arena"&&S.id==="classic";
  var own=free||has(S.kind,S.id);
  paint(host);
  var top=h("div",{class:"bc-stage-top"},h("b",{},itemName(S.kind,S.id)),rarEl(itemRar(S.kind,S.id)));
  if(equipped(S.kind,S.id))top.append(h("span",{class:"bc-eq"},"مستخدم"));
  else if(own)top.append(h("span",{class:"bc-eq"},S.kind==="ball"?"عندك":"مملوك"));
  meta.append(top,h("span",{class:"hint"},itemEn(S.kind,S.id)),h("p",{},itemDesc(S.kind,S.id)),priceLine({kind:S.kind,id:S.id,free:free,price:cur&&cur.price}),actionBtn({kind:S.kind,id:S.id,free:free,price:cur&&cur.price}));
  var list=rows(),grid=h("div",{class:"bc-grid"});
  if(!list.length)grid.append(h("p",{class:"hint"},S.filt==="owned"?"ما عندك شي من هذا القسم للحين.":"كل المعروض صار عندك."));
  list.forEach(function(it){
    var rar=it.rar||itemRar(it.kind,it.id),on=S.kind===it.kind&&S.id===it.id,own2=it.free||has(it.kind,it.id);
    var thumb;
    if(it.kind==="arena")thumb=UI.arenaThumb(it.id,120);
    else if(it.kind==="look")thumb=UI.previewCanvas(BC.LOOKS[it.id].ball,88,1.1,{skin:it.id,still:true});
    else thumb=UI.previewCanvas(it.id,88,1.1,{still:true});
    var card=h("button",{class:"bc-card rar-"+(rar||"common")+(on?" sel":""),onclick:function(){S.kind=it.kind;S.id=it.id;render()}},
      thumb,h("div",{class:"bc-cn"},h("b",{},itemName(it.kind,it.id)),h("span",{},itemEn(it.kind,it.id))),rarEl(rar),priceLine(it),
      equipped(it.kind,it.id)?h("span",{class:"bc-eq"},"مستخدم"):own2&&it.kind!=="ball"?h("span",{class:"hint"},"جاهز للتجهيز"):null);
    grid.append(card);
  });
  box.append(grid);
}
function open(){S.tab="balls";S.filt="sale";S.kind="ball";S.id="comet";SP.show("bc");render();pull()}
window.BCSHOP={open:open};
})();
