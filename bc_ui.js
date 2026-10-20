/* BALL CLASH — screens and drawing. Uses the platform helpers exposed as window.SP and the engine in bc_core.js. */
(function(){
"use strict";
var SP=window.SP,h=SP.h,ic=SP.ic,fmt=SP.fmt;
var TEAMC=["#E62948","#8D65F6"],TEAMN=["فريقك","الكمبيوتر"];
var Q=(function(){try{return localStorage.getItem("bc_q")||"high"}catch(e){return "high"}})();
var S={grp:"all",q:"",mode:"quick",teams:[],opts:{ff:false,syn:true,dup:true,hpMul:1,size:560},fmt:null,draft:null,side:0,st:null,speed:1,paused:false,raf:0,acc:0,last:0,fx:[],floats:[],shake:0,seed:0,ended:false,snd:0};
function $(id){return document.getElementById(id)}
function root(){return S.rootEl||$("bcRoot")}
function rnd(a){return a[Math.floor(Math.random()*a.length)]}
function shade(hex){var n=parseInt(hex.slice(1),16),r=(n>>16)*.45|0,g=((n>>8)&255)*.45|0,b=(n&255)*.45|0;return "rgb("+r+","+g+","+b+")"}
var RAR_L=BC.RAR_NAME||{common:"عادي",rare:"نادر",epic:"ملحمي",legendary:"أسطوري"};
function looksGet(){var o;try{o=JSON.parse(localStorage.getItem("bc_look")||"{}")}catch(e){o={}}if(!o||typeof o!=="object")return {};var out={};
  for(var k in o){var L=BC.LOOKS&&BC.LOOKS[o[k]];if(L&&L.ball===k)out[k]=o[k]}return out}
function looksSet(kind,id){var o=looksGet();if(!id)delete o[kind];else if(BC.LOOKS[id]&&BC.LOOKS[id].ball===kind)o[kind]=id;try{localStorage.setItem("bc_look",JSON.stringify(o))}catch(e){}}
function arenaGet(){var id="classic";try{id=localStorage.getItem("bc_arena")||"classic"}catch(e){}return BC.ARENAS&&BC.ARENAS[id]?id:"classic"}
function arenaSet(id){if(!BC.ARENAS||!BC.ARENAS[id])return;try{localStorage.setItem("bc_arena",id)}catch(e){}}
function reduced(){return !!(SP.reduced&&SP.reduced())}
function drawOpt(n){return {q:Q,reduce:reduced(),n:n||2}}
function rarBadge(rar){return h("span",{class:"bc-rar "+(rar||"common")},RAR_L[rar]||rar)}
function paintPreview(x,kid,px,t,opt){
  opt=opt||{};var dpr=Math.min(2,window.devicePixelRatio||1),K=BC.KINDS[kid];if(!K)return;
  x.setTransform(1,0,0,1,0,0);x.clearRect(0,0,px*dpr,px*dpr);
  x.fillStyle="#07080F";x.fillRect(0,0,px*dpr,px*dpr);
  var reach=K.w==="none"?18:Math.min(60,(K.len||30)+(K.head||0)+(K.orbit||0)),sc=px*dpr/(2*(K.r+reach*.75)+18);
  x.setTransform(sc,0,0,sc,0,0);
  var c=(K.r+reach*.75)+9,ang=opt.ang==null?t*(K.spin||2)*.35:-opt.ang;
  var b={x:c-reach*.18,y:c+reach*.12,r:K.r,K:K,ang:ang,dir:1,len:Math.min(K.len||0,K.w==="beam"?72:200),head:K.head||0,count:K.count||1,s:{},shield:K.shieldMax?18:0,alive:true,hp:1,maxHp:1,abT:.2,team:0,_skin:opt.skin||null};
  var o=drawOpt(1);if(opt.still)o.reduce=true;
  var foe={x:b.x+70,y:b.y-24,alive:true,team:1,r:8};
  BCART.weapon(x,b,K,o.reduce?b.ang:t,o);BCART.body(x,b,K,"#E62948",{balls:[b,foe]},o.reduce?0:t,o);
}
function previewCanvas(kid,size,ang,opt){
  opt=opt||{};var cv=document.createElement("canvas"),dpr=Math.min(2,window.devicePixelRatio||1);cv.width=size*dpr;cv.height=size*dpr;cv.style.width=size+"px";cv.style.height=size+"px";
  var skin=opt.skin===undefined?(looksGet()[kid]||null):opt.skin;
  paintPreview(cv.getContext("2d"),kid,size,ang==null?1.1:ang,{skin:skin,ang:ang==null?null:ang,still:ang!=null||reduced()});
  return cv;
}
function mountLive(host,size,paint){
  if(S.liveRaf){cancelAnimationFrame(S.liveRaf);S.liveRaf=0}
  host.textContent="";var cv=document.createElement("canvas"),dpr=Math.min(2,window.devicePixelRatio||1);
  cv.width=Math.round(size*dpr);cv.height=Math.round(size*dpr);cv.style.width=size+"px";cv.style.height=size+"px";host.append(cv);
  var ctx=cv.getContext("2d");
  function frame(ts){if(!host.isConnected){S.liveRaf=0;return}if(document.hidden){S.liveRaf=requestAnimationFrame(frame);return}paint(ctx,size,(ts||0)/1000);if(reduced())return;S.liveRaf=requestAnimationFrame(frame)}
  S.liveRaf=requestAnimationFrame(frame);
}

/* ---------- formats, teams, presets ---------- */
var GC={weapon:"#9AA6C0",nature:"#FF8A3D",power:"#B65CFF",creature:"#39FF88",tech:"#4FB3FF",legend:"#E6B85C"},ROLE={melee:"قريب",reach:"مدى",ranged:"بعيد",support:"دعم"};
var PAL=[["#E62948","الأحمر"],["#8D65F6","البنفسجي"],["#39FF88","الأخضر"],["#E6B85C","الذهبي"],["#4FB3FF","الأزرق"],["#FF8A5C","البرتقالي"],["#F472B6","الوردي"],["#9BF8FF","السماوي"]];
var FORMATS=[{id:"2v2",sizes:[2,2]},{id:"3v3",sizes:[3,3]},{id:"4v4",sizes:[4,4]},{id:"5v5",sizes:[5,5]},{id:"8v8",sizes:[8,8]},{id:"2v2v2",sizes:[2,2,2]},{id:"3v3v3",sizes:[3,3,3]},{id:"4v4v4v4",sizes:[4,4,4,4]},{id:"ffa",sizes:[1,1,1,1,1,1],ar:"الكل ضد الكل"}];
function fmtName(f){return f.ar||f.sizes.map(function(n){return fmt(n)}).join(" ضد ")}
function stat(K,what){var ab=K.ab&&K.ab.p?K.ab.p:null;
  if(what==="dmg")return Math.min(1,((K.w==="none"&&ab?ab.dmg*1.2:K.dmg)*(K.pw||1))/12);
  if(what==="reach")return Math.min(1,K.role==="ranged"?.95:((K.w==="none"?20:K.len||0)+(K.orbit||0)+(K.head||0))/90);
  if(what==="speed")return Math.min(1,(K.fast?1.3:1)*(K.spin||2)/6);
  return Math.min(1,(K.kb||0)/320)}
function presets(){try{return JSON.parse(localStorage.getItem("bc_presets")||"[]")}catch(e){return []}}
function savePresets(a){try{localStorage.setItem("bc_presets",JSON.stringify(a.slice(0,20)))}catch(e){}}
function mkTeams(sizes,custom){return sizes.map(function(n,ti){var mine=!custom&&ti===0;
  return {name:custom?("الفريق "+PAL[ti%8][1]):mine?"فريقك":(sizes.length>2?"الكمبيوتر "+fmt(ti):"الكمبيوتر"),color:PAL[ti%8][0],size:n,slots:[],ai:!mine}})}
function used(kid){return S.teams.some(function(t){return t.slots.indexOf(kid)>=0})}
function fillRandom(t){var pool=BC.PICK.filter(function(k){return S.opts.dup||!used(k)});while(t.slots.length<t.size&&pool.length){var k=pool.splice(Math.floor(Math.random()*pool.length),1)[0];t.slots.push(k)}}
function open(mode){
  stop();S.rootEl=null;S.mode=mode;S.side=0;S.ended=false;S.q="";S.grp="all";
  S.opts={ff:false,syn:true,dup:mode!=="draft",hpMul:1,size:560};
  S.fmt=mode==="quick"?{id:"1v1",sizes:[1,1]}:mode==="custom"?{id:"custom",sizes:[3,3]}:mode==="draft"?{id:"3v3",sizes:[3,3]}:FORMATS[0];
  S.teams=mkTeams(S.fmt.sizes,mode==="custom");
  if(mode!=="custom"&&mode!=="draft")S.teams.forEach(function(t){if(t.ai)fillRandom(t)});
  S.draft=mode==="draft"?{turn:0}:null;
  SP.show("bc");renderPicker();
}
function setFormat(f){S.fmt=f;S.side=0;S.teams=mkTeams(f.sizes,S.mode==="custom");if(S.mode==="team")S.teams.forEach(function(t){if(t.ai)fillRandom(t)});if(S.mode==="draft")S.draft={turn:0};renderPicker()}
function allFull(){return S.teams.every(function(t){return t.slots.length===t.size})}
function draftTurnTeam(){var tot=S.teams.reduce(function(a,t){return a+t.slots.length},0);return tot%2}
function aiDraftPick(){
  if(!S.draft||allFull())return;var t=S.teams[1],mine=t.slots,pool=BC.PICK.filter(function(k){return S.opts.dup||!used(k)});if(!pool.length)return;
  var partner=null;BC.SYN.forEach(function(s){if(partner)return;if(mine.indexOf(s.a)>=0&&pool.indexOf(s.b)>=0)partner=s.b;else if(mine.indexOf(s.b)>=0&&pool.indexOf(s.a)>=0)partner=s.a});
  var choice=partner||pool.slice().sort(function(a,b){return (BC.KINDS[b].pw*BC.KINDS[b].hpf)-(BC.KINDS[a].pw*BC.KINDS[a].hpf)}).slice(0,12)[Math.floor(Math.random()*12)]||pool[0];
  t.slots.push(choice);SP.sfx("move");renderPicker();
}
function pick(kid){
  if(S.mode==="draft"){if(draftTurnTeam()!==0)return;var me=S.teams[0];if(me.slots.length>=me.size)return;if(!S.opts.dup&&used(kid)){SP.toast("هذي الكورة مختارة","bad");return}
    me.slots.push(kid);SP.sfx("move");renderPicker();if(!allFull())setTimeout(aiDraftPick,650);return}
  var t=S.teams[S.side];if(!S.opts.dup&&used(kid)&&t.slots.indexOf(kid)<0){SP.toast("تكرار الكور مقفل في الإعدادات","bad");return}
  if(t.slots.length>=t.size)t.slots.pop();t.slots.push(kid);SP.sfx("move");
  if(t.slots.length===t.size){for(var k=1;k<=S.teams.length;k++){var n=(S.side+k)%S.teams.length;if(S.teams[n].slots.length<S.teams[n].size&&(S.mode==="custom"||!S.teams[n].ai||S.mode==="team")){S.side=n;break}}}
  renderPicker();
}
function details(kid){var K=BC.KINDS[kid],partners=BC.SYN.filter(function(s){return s.a===kid||s.b===kid});
  SP.openSheet(function(c,close){var live=h("div",{class:"bc-live"});
    if(reduced())live.append(previewCanvas(kid,120,1.1,{still:true}));
    else mountLive(live,120,function(ctx,px,t){paintPreview(ctx,kid,px,t,{skin:looksGet()[kid]||null})});
    var looks=(BC.LOOK_ORDER||[]).filter(function(id){return BC.LOOKS[id].ball===kid});
    var equipped=looksGet()[kid]||"";
    c.append(h("div",{class:"bc-dhead"},live,h("div",{},h("h3",{style:"margin:0"},K.ar),rarBadge(K.rar),h("span",{class:"hint"},K.en+" · "+BC.GROUPS[K.group]))),
    h("p",{class:"lead"},K.desc),h("p",{class:"bc-grow"},ic("up"),"التطور: "+(K.growTxt||"—")),
    partners.length?h("div",{class:"bc-syn"},ic("spark"),h("span",{},partners.map(function(s){return s.ar}).join("، "))):null,
    looks.length?h("div",{class:"bc-looks"},h("span",{class:"lbl"},"مظهر شكلي"),h("div",{class:"chips"},h("button",{class:"chip"+(!equipped?" on":""),onclick:function(){looksSet(kid,null);close();details(kid)}},"الأساس"+(equipped?"":" · مستخدم")),...looks.map(function(id){var L=BC.LOOKS[id];return h("button",{class:"chip"+(equipped===id?" on":""),onclick:function(){looksSet(kid,id);SP.sfx("unlock");close();details(kid)}},L.ar+(equipped===id?" · مستخدم":""))}))):null,
    h("p",{class:"hint"},"المظاهر شكلية فقط، وما تغيّر الضرر أو الصحة."),
    h("div",{class:"row",style:"margin-top:12px"},S.mode==="browse"||S.mode==="tour"?null:h("button",{class:"primary",onclick:function(){close();pick(kid)}},"اختر"),h("button",{onclick:close},"إغلاق")))})}
function presetSheet(){
  var t=S.teams[S.side];
  SP.openSheet(function(c,close){
    function draw(){c.textContent="";var list=presets();
      c.append(h("h3",{},"تشكيلاتي"),h("p",{class:"hint"},"تنحفظ في جهازك. «استخدم» يعبّي «"+t.name+"» بالتشكيلة."));
      if(!list.length)c.append(h("p",{class:"hint"},"ما عندك تشكيلات للحين."));
      list.forEach(function(p,pi){c.append(h("div",{class:"bc-pre"},h("div",{class:"grow"},h("b",{},p.name),h("span",{},p.balls.map(function(k){return (BC.KINDS[k]||{}).ar}).join("، "))),
        h("button",{class:"small primary",onclick:function(){t.slots=p.balls.slice(0,t.size);close();renderPicker()}},"استخدم"),
        h("button",{class:"small",onclick:function(){var nm=prompt("اسم التشكيلة",p.name);if(nm){list[pi].name=nm.slice(0,24);savePresets(list);draw()}}},"تسمية"),
        h("button",{class:"small",onclick:function(){list[pi].balls=t.slots.slice();savePresets(list);SP.toast("انحفظ التعديل","good");draw()}},"حدّث"),
        h("button",{class:"small",onclick:function(){list.splice(pi,1);savePresets(list);draw()}},"حذف")))});
      var nm=h("input",{maxlength:"24",placeholder:"اسم التشكيلة الجديدة","aria-label":"اسم التشكيلة"});
      c.append(h("div",{class:"row",style:"margin-top:10px"},nm,h("button",{class:"primary",disabled:!t.slots.length,onclick:function(){var l=presets();l.unshift({name:(nm.value||"تشكيلة "+fmt(l.length+1)).slice(0,24),balls:t.slots.slice()});savePresets(l);SP.toast("انحفظت التشكيلة","good");draw()}},"احفظ «"+t.name+"»")),
        h("button",{class:"wide",style:"margin-top:8px",onclick:close},"إغلاق"))}
    draw()});
}
function customSheet(){
  SP.openSheet(function(c,close){
    function draw(){c.textContent="";var o=S.opts;
      c.append(h("h3",{},"إعدادات المعركة المخصصة"));
      var nt=h("div",{class:"chips"});[2,3,4,6,8].forEach(function(n){nt.append(h("button",{class:"chip"+(S.teams.length===n?" on":""),onclick:function(){var sz=n>4?1:3;S.teams=mkTeams(Array(n).fill(sz),true);draw();renderPicker()}},n>4?fmt(n)+" (الكل ضد الكل)":fmt(n)+" فرق"))});
      c.append(h("span",{class:"lbl"},"عدد الفرق"),nt);
      S.teams.forEach(function(t,ti){var nmI=h("input",{value:t.name,maxlength:"18","aria-label":"اسم الفريق"});nmI.oninput=function(){t.name=nmI.value||t.name};
        var cols=h("div",{class:"bc-cols"});PAL.forEach(function(pc){cols.append(h("button",{class:"bc-col"+(t.color===pc[0]?" on":""),style:"background:"+pc[0],"aria-label":"لون "+pc[1],onclick:function(){t.color=pc[0];draw();renderPicker()}}))});
        c.append(h("div",{class:"bc-crow"},nmI,h("div",{class:"bc-step"},h("button",{class:"icon",onclick:function(){if(t.size>1){t.size--;t.slots=t.slots.slice(0,t.size);draw();renderPicker()}}},"−"),h("b",{},fmt(t.size)),h("button",{class:"icon",onclick:function(){if(t.size<8){t.size++;draw();renderPicker()}}},"+")),cols))});
      var uneq=S.teams.some(function(t){return t.size!==S.teams[0].size});if(uneq)c.append(h("p",{class:"inst-warn",style:"margin-top:8px"},"الفرق غير متساوية، فالمعركة ممكن ما تكون متوازنة."));
      function tog(key,label){return h("div",{class:"setrow"},h("b",{class:"grow"},label),h("button",{class:"switch"+(o[key]?" on":""),role:"switch","aria-checked":String(!!o[key]),"aria-label":label,onclick:function(){o[key]=!o[key];draw();renderPicker()}}))}
      c.append(tog("ff","ضرب الحلفاء (Friendly Fire)"),tog("syn","القدرات المشتركة"),tog("dup","تكرار الكورة نفسها"));
      var hpc=h("div",{class:"chips"});[[.5,"٥٠٪"],[1,"١٠٠٪"],[1.5,"١٥٠٪"],[2,"٢٠٠٪"]].forEach(function(v){hpc.append(h("button",{class:"chip"+(o.hpMul===v[0]?" on":""),onclick:function(){o.hpMul=v[0];draw()}},v[1]))});
      var szc=h("div",{class:"chips"});[[440,"صغيرة"],[560,"متوسطة"],[720,"كبيرة"]].forEach(function(v){szc.append(h("button",{class:"chip"+(o.size===v[0]?" on":""),onclick:function(){o.size=v[0];draw()}},v[1]))});
      c.append(h("span",{class:"lbl mt"},"الصحة الابتدائية"),hpc,h("span",{class:"lbl mt"},"حجم الساحة"),szc,
        h("div",{class:"row",style:"margin-top:12px"},h("button",{onclick:function(){S.teams.forEach(function(t){fillRandom(t)});draw();renderPicker()}},"تعبئة عشوائية"),h("button",{class:"primary",onclick:close},"تمام")))}
    draw()});
}
/* ---------- the pick screen (all modes) ---------- */
function renderPicker(){
  var r=root();r.textContent="";var draft=S.mode==="draft",custom=S.mode==="custom";
  var title={quick:"QUICK BATTLE",team:"TEAM BATTLE",custom:"CUSTOM BATTLE",draft:"TEAM DRAFT"}[S.mode];
  var sub=S.mode==="quick"?"١ ضد ١ ضد الكمبيوتر":custom?"أنت تختار كل الفرق وتتفرج":draft?"اختيار بالتناوب: أنت ثم الكمبيوتر":fmtName(S.fmt)+" ضد الكمبيوتر";
  r.append(h("div",{class:"bc-bar"},h("button",{class:"quit",onclick:function(){stop();SP.openGame("ballclash")}},"رجوع"),h("div",{class:"bc-title"},h("b",{},title),h("span",{},sub))));
  if(S.mode==="team"||draft){var fc=h("div",{class:"chips bc-grps"});(draft?FORMATS.filter(function(f){return f.sizes.length===2&&f.sizes[0]<=5}).concat([]):FORMATS).forEach(function(f){fc.append(h("button",{class:"chip"+(S.fmt.id===f.id?" on":""),onclick:function(){setFormat(f)}},fmtName(f)))});r.append(fc)}
  var tools0=h("div",{class:"row",style:"margin:8px 0"});
  if(custom)tools0.append(h("button",{onclick:customSheet},ic("users"),"إعدادات المعركة"));
  if(!custom||true)tools0.append(h("button",{onclick:presetSheet},ic("spark"),"تشكيلاتي"));
  r.append(tools0);
  if(draft){var dt=draftTurnTeam(),full=allFull();r.append(h("div",{class:"bc-turn"+(dt===0&&!full?" me":"")},full?"اكتملت التشكيلات! ابدأ المعركة.":dt===0?"دورك تختار كورة لفريقك":"الكمبيوتر يختار…"),
    h("div",{class:"row",style:"margin-bottom:8px"},h("button",{class:"small",disabled:dt!==0||full,onclick:function(){var pool=BC.PICK.filter(function(k){return S.opts.dup||!used(k)});pick(pool[Math.floor(Math.random()*pool.length)])}},"اختيار عشوائي"),
      h("button",{class:"small",onclick:function(){S.opts.dup=!S.opts.dup;renderPicker()}},S.opts.dup?"التكرار مسموح":"التكرار ممنوع")))}
  var teams=h("div",{class:"bc-teams"+(S.teams.length>2?" many":"")});
  S.teams.forEach(function(t,ti){
    var box=h("div",{class:"bc-team"+(S.side===ti&&!draft?" on":""),style:"--tc:"+t.color,onclick:function(){if(!draft){S.side=ti;renderPicker()}}},
      h("div",{class:"bc-th"},h("i",{}),h("b",{},t.name),!draft?h("button",{class:"link small",onclick:function(e){e.stopPropagation();t.slots=[];fillRandom(t);SP.sfx("move");renderPicker()}},"عشوائي"):null));
    var row=h("div",{class:"bc-slots"});
    for(var k=0;k<t.size;k++){(function(k){var kid=t.slots[k];
      row.append(h("button",{class:"bc-slot"+(kid?" full":""),"aria-label":kid?("شيل "+BC.KINDS[kid].ar):"خانة فاضية",onclick:function(e){e.stopPropagation();if(draft)return;S.side=ti;if(kid)t.slots.splice(k,1);renderPicker()}},
        kid?previewCanvas(kid,t.size>4?34:46):h("span",{class:"bc-plus"},"+"),t.size<=4?h("span",{},kid?BC.KINDS[kid].ar:"اختر"):null))})(k)}
    box.append(row);teams.append(box)});
  r.append(teams);
  if(!draft)r.append(h("p",{class:"hint center",style:"margin:6px 0 4px"},"تختار الحين لـ «"+S.teams[S.side].name+"». اضغط على أي فريق عشان تغيّر كوره."));
  var syn=S.opts.syn?BC.SYN.filter(function(s){return S.teams.some(function(t){return t.slots.indexOf(s.a)>=0&&t.slots.indexOf(s.b)>=0})}):[];
  if(syn.length)r.append(h("div",{class:"bc-syn"},ic("spark"),h("span",{},"قدرات مشتركة شغّالة: "+syn.map(function(s){return s.ar}).join("، "))));
  var tools=h("div",{class:"bc-tools"}),q=h("input",{type:"search",placeholder:"دوّر على كورة (عربي أو English)",value:S.q,"aria-label":"بحث"});q.oninput=function(){S.q=q.value;drawGrid()};
  var chips=h("div",{class:"chips bc-grps"});[["all","الكل"]].concat(Object.keys(BC.GROUPS).map(function(k){return [k,BC.GROUPS[k]]})).forEach(function(g){chips.append(h("button",{class:"chip"+(S.grp===g[0]?" on":""),onclick:function(){S.grp=g[0];renderPicker()}},g[1]))});
  tools.append(q,chips);r.append(tools);
  var grid=h("div",{class:"bc-grid",id:"bcGrid"});r.append(grid);
  function drawGrid(){grid.textContent="";var qq=S.q.trim().toLowerCase(),lock=draft&&(draftTurnTeam()!==0||allFull());
    BC.PICK.filter(function(kid){var K=BC.KINDS[kid];return (S.grp==="all"||K.group===S.grp)&&(!qq||K.ar.indexOf(S.q.trim())>=0||K.en.toLowerCase().indexOf(qq)>=0)}).forEach(function(kid){var K=BC.KINDS[kid],taken=!S.opts.dup&&used(kid);
      var bars=h("div",{class:"bc-bars"});[["dmg","الضرر"],["reach","المدى"],["speed","السرعة"],["kb","الدفع"]].forEach(function(q2){bars.append(h("div",{class:"bc-bar-r"},h("span",{},q2[1]),h("i",{},h("b",{style:"width:"+Math.round(stat(K,q2[0])*100)+"%"}))))});
      var skin=looksGet()[kid];
      grid.append(h("div",{class:"bc-card g-"+K.group+" rar-"+(K.rar||"common")+(taken?" taken":""),style:"--gc:"+GC[K.group]},h("span",{class:"bc-role"},ROLE[K.role]||"قريب"),rarBadge(K.rar),h("button",{class:"bc-cv","aria-label":"تفاصيل "+K.ar,onclick:function(){details(kid)}},previewCanvas(kid,108,null,{skin:skin||null})),h("div",{class:"bc-cn"},h("b",{},K.ar),h("span",{},K.en+(skin?" · "+BC.LOOKS[skin].ar:""))),
        h("p",{class:"bc-desc"},K.desc),bars,h("button",{class:"primary small",disabled:lock||taken,onclick:function(){pick(kid)}},taken?"مختارة":"اختر")))});
    if(!grid.children.length)grid.append(h("p",{class:"hint"},"ما لقينا كورة بهالاسم."))}
  drawGrid();
  r.append(h("button",{class:"primary wide bc-start",disabled:!allFull(),onclick:function(){startBattle(true)}},allFull()?"ابدأ المعركة":"كمّل اختيار الكور"));
}
/* ---------- battle ---------- */
function rewardable(){return SP.online()&&(S.mode==="quick"||S.mode==="team"||S.mode==="draft"||S.mode==="tour-watch")}
async function startBattle(newSeed){
  if(S.mode!=="custom"&&S.mode!=="online-watch"){var tot=S.teams.reduce(function(a,t){return a+t.slots.length},0);S.opts.size=tot<=4?440:560}
  if(newSeed||!S.seed)S.seed=Math.floor(Math.random()*2147483647)+1;
  S.srv=null;S.boost=null;
  if(rewardable()){var bt=document.querySelector("#bcRoot .bc-start");if(bt){bt.disabled=true;bt.textContent="يجهّز المعركة…"}
    try{var reg=await SP.api("bc_start",{mode:S.mode,teams:S.teams.map(function(t){return {balls:t.slots.slice()}}),opts:{ff:S.opts.ff,syn:S.opts.syn,hpMul:S.opts.hpMul,size:S.opts.size}});S.seed=reg.seed;S.srv=reg.id;S.boost=reg.boost||null}
    catch(e){S.srv=null;SP.toast("ما قدرنا نسجّل المعركة، بتنلعب تدريب","bad")}}
  S.st=BC.create({seed:S.seed,boost:S.boost,size:S.opts.size,ff:S.opts.ff,synergy:S.opts.syn,hpMul:S.opts.hpMul,teams:S.teams.map(function(t){return {name:t.name,color:t.color,balls:t.slots.slice()}})});
  applyLooks(S.st);
  S.fx=[];S.floats=[];S.shake=0;S.acc=0;S.last=0;S.paused=false;S.ended=false;S.intro=Q==="low"?1.2:2.4;S.stopT=0;S.slow=0;S.banner=null;S.feed=[];S.arCv=null;
  var r=root();r.textContent="";
  r.append(h("div",{class:"bc-bar"},h("button",{class:"quit",onclick:function(){stop();renderPicker()}},"طلوع"),h("div",{class:"bc-title"},h("b",{},"BALL CLASH"),h("span",{id:"bcClock"},"٠:٠٠"))),
    h("div",{class:"bc-hud",id:"bcHud"}),
    h("div",{class:"bc-arena",id:"bcArenaWrap"},h("canvas",{id:"bcCanvas",role:"img","aria-label":"ساحة المعركة"}),h("div",{class:"bc-feed",id:"bcFeed","aria-live":"polite"})),
    h("div",{class:"bc-ctl"},h("div",{class:"seg3 bc-speed",role:"group","aria-label":"سرعة المشاهدة"},
        [1,2,4].map(function(v){return h("button",{class:S.speed===v?"on":"","data-v":String(v),onclick:function(){S.speed=v;speedBtns()}},v+"x")})),
      h("button",{id:"bcPause",onclick:togglePause},ic("pause"),h("span",{},"إيقاف"))),
    h("div",{class:"mg-win hidden",id:"bcWin",role:"dialog","aria-modal":"true"}));
  resize();hud();cancelAnimationFrame(S.raf);S.raf=requestAnimationFrame(loop);
}
function speedBtns(){document.querySelectorAll(".bc-speed button").forEach(function(b){b.classList.toggle("on",+b.dataset.v===S.speed)})}
function togglePause(){S.paused=!S.paused;S.last=0;var b=$("bcPause");if(b){b.textContent="";b.append(ic(S.paused?"play":"pause"),h("span",{},S.paused?"كمّل":"إيقاف"))}}
function stop(){cancelAnimationFrame(S.raf);S.raf=0;if(S.liveRaf){cancelAnimationFrame(S.liveRaf);S.liveRaf=0}}
function resize(){var cv=$("bcCanvas");if(!cv)return;var w=Math.max(260,Math.min($("bcArenaWrap").clientWidth||360,640,window.innerHeight-250)),dpr=Math.min(2,window.devicePixelRatio||1);
  cv.width=Math.round(w*dpr);cv.height=Math.round(w*dpr);cv._sized=!!cv.isConnected;cv.style.width=w+"px";cv.style.height=w+"px";S.scale=cv.width/S.st.W;S.ux=1/S.scale*dpr}
function loop(ts){
  if(!S.st)return;
  if(!S.last)S.last=ts;var dt=Math.min(.1,(ts-S.last)/1000);S.last=ts;
  if(S.intro>0){S.intro-=dt}
  else if(S.stopT>0)S.stopT-=dt;
  else if(!S.paused&&!S.st.over&&!document.hidden){if(S.slow>0)S.slow-=dt;S.acc+=dt*S.speed*(S.slow>0?.35:1);var guard=0;
    while(S.acc>=BC.DT&&!S.st.over&&guard++<16){S.acc-=BC.DT;BC.step(S.st);onEvents(S.st.events)}}
  draw();if(S.st.over&&!S.ended){S.ended=true;setTimeout(showWin,900)}
  S.raf=requestAnimationFrame(loop);
}
function spark(x,y,n,c,sp,w){var cap=(Q==="low"||reduced())?Math.min(n,5):n;if(S.fx.length>70)return;for(var k=0;k<cap;k++){var a=Math.random()*6.283,v=(sp||300)*(.4+Math.random()*.8);S.fx.push({x:x,y:y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:.25+Math.random()*.28,c:c,w:w||2})}}
function applyLooks(st){if(S.mode==="online-watch")return;var map=looksGet();st.balls.forEach(function(b){if(b.summon)return;if(b.team!==0&&S.mode!=="custom")return;if(map[b.kind])b._skin=map[b.kind]})}
function feed(txt,c){S.feed.unshift({txt:txt,c:c});S.feed=S.feed.slice(0,4);var el=$("bcFeed");if(!el)return;el.textContent="";S.feed.forEach(function(f){el.append(h("div",{class:"bc-fi",style:"--fc:"+f.c},f.txt))})}
function onEvents(ev){
  var st=S.st;for(var i=0;i<ev.length;i++){var e=ev[i];
    if(e.t==="hit"){var HK=BC.KINDS[e.kind]||{},col=HK.color||"#FFE7A3",hr=HK.rar||"common",big=e.dmg>=9;
      spark(e.x,e.y,Q==="low"?3:Math.min(hr==="legendary"?18:12,4+Math.round(e.dmg)),col,big?440:300,big?3:2);
      S.fx.push({ring:true,x:e.x,y:e.y,r:4,life:.22,max:.22,c:col});
      if(Q!=="low"&&!reduced()&&(big||hr==="epic"||hr==="legendary"))S.fx.push({slash:true,x:e.x,y:e.y,a:Math.random()*6.283,life:.16,max:.16,c:col,w:hr==="legendary"?26:16});
      S.floats.push({x:e.x,y:e.y-12,txt:fmt(Math.round(e.dmg)),life:.9,max:.9,c:big?"#FFD23F":"#FFFFFF",big:big});if(st.balls[e.b])st.balls[e.b]._hurt=.22;
      S.shake=Math.min(10,S.shake+e.dmg*.4);if(big&&Q!=="low")S.stopT=.05;if(S.snd<performance.now()){SP.sfx("move");S.snd=performance.now()+80}}
    else if(e.t==="crit"){S.floats.push({x:e.x,y:e.y-34,txt:"حرجة!",life:1,max:1,c:"#FF4F7A",big:true});S.stopT=.08;spark(e.x,e.y,10,"#FF4F7A",480,3)}
    else if(e.t==="clash"){spark(e.x,e.y,12,"#B9F0FF",460,2);S.fx.push({ring:true,x:e.x,y:e.y,r:2,life:.2,max:.2,c:"#B9F0FF"});S.floats.push({x:e.x,y:e.y,txt:"تِنْق!",life:.55,max:.55,c:"#B9F0FF"})}
    else if(e.t==="ko"){var b=st.balls[e.i],by=st.balls[e.by],kr=b.K.rar||"common";
      spark(e.x,e.y,Q==="low"?8:28,b.K.color,620,3);spark(e.x,e.y,Q==="low"?3:10,"#FFFFFF",380,2);
      S.fx.push({ring:true,x:e.x,y:e.y,r:b.r,life:.55,max:.55,c:b.K.color});
      if(Q!=="low"&&!reduced()&&(kr==="epic"||kr==="legendary"))S.fx.push({shards:true,x:e.x,y:e.y,life:.48,max:.48,n:kr==="legendary"?8:5,c:b.K.color,a0:Math.random()*6});
      if(kr==="legendary"&&Q!=="low")S.fx.push({ring:true,x:e.x,y:e.y,r:b.r+8,life:.7,max:.7,c:"#E6B85C"});
      S.shake=14;if(!b.summon){S.slow=.75;S.banner={txt:"KO!",c:st.teams[by?by.team:b.team].color,life:1.4};feed((by?by.K.ar:"؟")+"  ⟵  "+b.K.ar,st.teams[by?by.team:b.team].color)}SP.sfx("bad");SP.buzz&&SP.buzz(60)}
    else if(e.t==="awake"){var aw=st.balls[e.i];S.banner={txt:"استيقاظ!",c:"#E6B85C",life:1.2};S.fx.push({ring:true,x:aw.x,y:aw.y,r:aw.r,life:.7,max:.7,c:"#E6B85C"});spark(aw.x,aw.y,20,"#E6B85C",400,2);SP.sfx("unlock")}
    else if(e.t==="bolt"){S.fx.push({bolt:true,x1:e.x1,y1:e.y1,x2:e.x2,y2:e.y2,life:.22,max:.22})}
    else if(e.t==="boom"){S.fx.push({ring:true,x:e.x,y:e.y,r:(e.r||40)*.3,life:.45,max:.45,c:"#FFB02E"});spark(e.x,e.y,Q==="low"?6:18,"#FFB02E",420,3);S.shake=Math.min(12,S.shake+5)}
    else if(e.t==="revive"){var rb=st.balls[e.i];S.banner={txt:"رجعت!",c:"#FF8A3D",life:1.2};S.fx.push({ring:true,x:rb.x,y:rb.y,r:rb.r,life:.7,max:.7,c:"#FF8A3D"})}
    else if(e.t==="summon"||e.t==="blink"){var sb=st.balls[e.i];S.fx.push({ring:true,x:e.x||sb.x,y:e.y||sb.y,r:12,life:.4,max:.4,c:"#B9A2FF"})}
    else if(e.t==="dodge"){S.floats.push({x:e.x,y:e.y-22,txt:"تفادى",life:.7,max:.7,c:"#E8E6FF"})}
    else if(e.t==="up"||e.t==="lvl"){var ub=st.balls[e.i];S.floats.push({x:ub.x,y:ub.y-ub.r-28,txt:e.t==="up"?e.what:"مستوى "+fmt(e.lvl),life:1.1,max:1.1,c:"#E6B85C"});S.fx.push({ring:true,x:ub.x,y:ub.y,r:ub.r,life:.45,max:.45,c:"#E6B85C"})}
  }
  if(ev.length)hud();
}
function hud(){
  var st=S.st,el=$("bcHud");if(!el)return;el.textContent="";el.style.gridTemplateColumns="repeat("+(st.teams.length>4?4:2)+",minmax(0,1fr))";
  st.teams.forEach(function(t,ti){var mine=st.balls.filter(function(b){return b.team===ti&&!b.summon}),alive=mine.filter(function(b){return b.alive}).length;
    var row=h("div",{class:"bc-hb"});mine.slice(0,8).forEach(function(b){var f=Math.max(0,b.hp/b.maxHp);row.append(h("span",{class:"bc-hm"+(b.alive?"":" out")+(b.awake?" aw":""),style:"--f:"+f+";--tc:"+t.color,title:b.K.ar},h("i",{style:"background:"+b.K.color})))});
    el.append(h("div",{class:"bc-ht",style:"--tc:"+t.color},h("div",{class:"bc-htn"},h("i",{}),h("b",{},t.name),h("span",{},fmt(alive)+"/"+fmt(mine.length))),row))});
}
function arenaCache(st){var th=arenaGet();if(S.arCv&&S.arCv._w===st.W&&S.arCv._th===th)return S.arCv;var c=document.createElement("canvas");c.width=st.W;c.height=st.H;c._w=st.W;c._th=th;BCART.arena(c.getContext("2d"),st.W,st.H,0,st.teams,th);S.arCv=c;return c}
function draw(){
  var cv=$("bcCanvas");if(!cv||!S.st)return;if(!cv._sized)resize();var x=cv.getContext("2d"),st=S.st,sc=S.scale,T=performance.now()/1000;
  x.setTransform(1,0,0,1,0,0);x.fillStyle="#07080F";x.fillRect(0,0,cv.width,cv.height);
  var shx=0,shy=0;if(S.shake>.2&&!SP.reduced()&&Q!=="low"){shx=(Math.random()-.5)*S.shake;shy=(Math.random()-.5)*S.shake;S.shake*=.86}else S.shake=0;
  x.setTransform(sc,0,0,sc,shx*sc,shy*sc);x.drawImage(arenaCache(st),0,0);
  st.zones.forEach(function(z){BCART.zone(x,z,T)});
  var opt=drawOpt(st.balls.length),TT=opt.reduce?0:T;
  st.balls.forEach(function(b){if(!b.alive&&(st.t-b.koT>1.2||b.summon))return;if(b._hurt>0)b._hurt-=1/60;BCART.weapon(x,b,b.K,TT,opt);BCART.body(x,b,b.K,st.teams[b.team].color,st,TT,opt)});
  st.proj.forEach(function(p){var ow=st.balls[p.owner],po={q:Q,reduce:opt.reduce,n:st.balls.length,rar:ow&&ow.K?ow.K.rar:"common"};if(ow&&ow._skin&&BC.LOOKS[ow._skin])po.trail=BC.LOOKS[ow._skin].trail;BCART.proj(x,p,TT,po)});
  st.balls.forEach(function(b){if(!b.alive||b.summon)return;var w=b.r*2.1,y0=b.y-b.r-15,f=Math.max(0,b.hp/b.maxHp);
    x.fillStyle="rgba(5,6,12,.75)";x.beginPath();if(x.roundRect)x.roundRect(b.x-w/2-1,y0-1,w+2,7,3.5);else x.rect(b.x-w/2-1,y0-1,w+2,7);x.fill();
    var hg=x.createLinearGradient(b.x-w/2,0,b.x+w/2,0);hg.addColorStop(0,BCART.light(st.teams[b.team].color,.25));hg.addColorStop(1,st.teams[b.team].color);x.fillStyle=f<.3?"#FF4F4F":hg;
    x.beginPath();if(x.roundRect)x.roundRect(b.x-w/2,y0,w*f,5,2.5);else x.rect(b.x-w/2,y0,w*f,5);x.fill();
    if(b.lvl){x.fillStyle=b.awake?"#E6B85C":"#1A1F33";x.beginPath();x.arc(b.x+w/2+7,y0+2.5,7,0,7);x.fill();x.strokeStyle="#E6B85C";x.lineWidth=1.2;x.stroke();x.fillStyle=b.awake?"#1A1206":"#E6B85C";x.font="800 8.5px system-ui";x.textAlign="center";x.textBaseline="middle";x.fillText(String(Math.min(99,b.lvl)),b.x+w/2+7,y0+3);x.textBaseline="alphabetic"}});
  var dt=1/60*S.speed*(S.slow>0?.35:1);x.save();x.globalCompositeOperation="lighter";
  S.fx=S.fx.filter(function(p){p.life-=dt;if(p.life<=0)return false;var a=Math.min(1,p.life*2.2);
    if(p.bolt){x.strokeStyle="rgba(255,225,77,"+a+")";x.lineWidth=2.5;x.beginPath();x.moveTo(p.x1,p.y1);for(var k=1;k<5;k++){var tt=k/5;x.lineTo(p.x1+(p.x2-p.x1)*tt+(Math.random()-.5)*16,p.y1+(p.y2-p.y1)*tt+(Math.random()-.5)*16)}x.lineTo(p.x2,p.y2);x.stroke()}
    else if(p.slash){x.strokeStyle=BCART.rgba(p.c,a);x.lineWidth=2.4;x.beginPath();x.arc(p.x,p.y,p.w||16,p.a,p.a+1.7);x.stroke()}
    else if(p.shards){var u=1-p.life/p.max;x.strokeStyle=BCART.rgba(p.c,a);x.lineWidth=1.6;for(var si=0;si<p.n;si++){var sa=(p.a0||0)+si*6.283/p.n,d0=8+u*34;x.beginPath();x.moveTo(p.x+Math.cos(sa)*d0,p.y+Math.sin(sa)*d0);x.lineTo(p.x+Math.cos(sa)*(d0+12),p.y+Math.sin(sa)*(d0+12));x.stroke()}}
    else if(p.ring){x.strokeStyle=BCART.rgba(p.c,a);x.lineWidth=3;x.beginPath();x.arc(p.x,p.y,p.r+(p.max-p.life)*90,0,7);x.stroke()}
    else{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.9;p.vy*=.9;x.strokeStyle=BCART.rgba(p.c,a);x.lineWidth=p.w||2;x.beginPath();x.moveTo(p.x,p.y);x.lineTo(p.x-p.vx*.03,p.y-p.vy*.03);x.stroke()}return true});
  x.restore();
  S.floats=S.floats.filter(function(f){f.life-=dt;if(f.life<=0)return false;f.y-=26*dt;var age=(f.max||1)-f.life,pop=age<.12?1.5-age*4:1;x.save();x.globalAlpha=Math.min(1,f.life*1.8);x.translate(f.x,f.y);x.scale(pop,pop);
    x.font=(f.big?"900 22px":"800 15px")+" Readex Pro,system-ui";x.textAlign="center";x.lineWidth=4;x.strokeStyle="rgba(5,6,12,.85)";x.strokeText(f.txt,0,0);x.fillStyle=f.c;x.fillText(f.txt,0,0);x.restore();return true});
  if(S.banner&&S.banner.life>0){S.banner.life-=1/60;var bl=S.banner,ba=Math.min(1,bl.life*2),bs=1+Math.max(0,bl.life-1.1)*.6;x.save();x.globalAlpha=ba;x.translate(st.W/2,st.H*.3);x.scale(bs,bs);x.font="900 46px Readex Pro,system-ui";x.textAlign="center";x.direction=/[A-Za-z]/.test(bl.txt)?"ltr":"rtl";
    x.lineWidth=8;x.strokeStyle="rgba(5,6,12,.9)";x.strokeText(bl.txt,0,0);var bgd=x.createLinearGradient(0,-30,0,10);bgd.addColorStop(0,"#FFFFFF");bgd.addColorStop(1,bl.c);x.fillStyle=bgd;x.fillText(bl.txt,0,0);x.restore()}
  if(S.intro>0)drawIntro(x,st);
  var t=Math.floor(st.t),c=$("bcClock");if(c)c.textContent=fmt(Math.floor(t/60))+":"+String(t%60).padStart(2,"0").replace(/\d/g,function(d){return "٠١٢٣٤٥٦٧٨٩"[d]});
}
function drawIntro(x,st){var a=Math.min(1,S.intro*2),n=Math.ceil(S.intro-.6);x.save();x.fillStyle="rgba(5,6,12,"+(.65*a)+")";x.fillRect(0,0,st.W,st.H);x.globalAlpha=a;x.textAlign="center";
  var names=st.teams.map(function(t){return t.name});x.font="800 22px Readex Pro,system-ui";
  if(names.length===2){x.fillStyle=st.teams[0].color;x.fillText(names[0],st.W*.27,st.H*.45);x.fillStyle=st.teams[1].color;x.fillText(names[1],st.W*.73,st.H*.45);x.font="900 54px Readex Pro,system-ui";x.direction="ltr";var vg=x.createLinearGradient(0,st.H*.4,0,st.H*.5);vg.addColorStop(0,"#FFE7A3");vg.addColorStop(1,"#E6B85C");x.fillStyle=vg;x.fillText("VS",st.W/2,st.H*.47)}
  else{x.fillStyle="#E6B85C";x.font="900 40px Readex Pro,system-ui";x.fillText(fmt(names.length)+" فرق",st.W/2,st.H*.45)}
  x.font="900 70px Readex Pro,system-ui";x.fillStyle="#FFFFFF";x.fillText(n>0?fmt(n):"قتال!",st.W/2,st.H*.68);x.restore()}
function statsGet(){try{return JSON.parse(localStorage.getItem("bc_stats")||"{}")}catch(e){return {}}}
function statsAdd(st){var s=statsGet();s.played=(s.played||0)+1;s.used=s.used||{};s.wins=s.wins||{};s.modes=s.modes||{};s.modes[S.mode]=(s.modes[S.mode]||0)+1;
  var playing=S.mode!=="custom"&&S.mode!=="browse";
  if(playing){S.teams[0].slots.forEach(function(k){s.used[k]=(s.used[k]||0)+1;if(st.winner===0)s.wins[k]=(s.wins[k]||0)+1});
    if(st.draw)s.draw=(s.draw||0)+1;else if(st.winner===0){s.win=(s.win||0)+1;s.streak=(s.streak||0)+1;s.best=Math.max(s.best||0,s.streak)}else{s.loss=(s.loss||0)+1;s.streak=0}}
  else s.watched=(s.watched||0)+1;
  try{localStorage.setItem("bc_stats",JSON.stringify(s))}catch(e){}}
function showWin(){
  var st=S.st;if(S.mode==="online-watch"){var cb=S.onEnd;S.onEnd=null;if(cb)cb(st);return}
  var w=$("bcWin");if(!w)return;if(S.tour&&S.tour.live){var sv=S.mode;S.mode="tour";statsAdd(st);S.mode=sv;tourAfterLive(st);return}statsAdd(st);w.textContent="";w.classList.remove("hidden");
  var playing=S.mode!=="custom",title=st.draw?"تعادل!":playing?(st.winner===0?"فاز فريقك!":"فاز "+st.teams[st.winner].name):"فاز "+st.teams[st.winner].name+"!",mvp=st.balls.slice().sort(function(a,b){return b.dealt-a.dealt})[0];
  var tbl=h("div",{class:"bc-stats"});st.balls.forEach(function(b){tbl.append(h("div",{class:"bc-sr",style:"--tc:"+st.teams[b.team].color},previewCanvas(b.kind,34),h("b",{},b.K.ar),h("span",{},"ضرر "+fmt(Math.round(b.dealt))),h("span",{},"ضربات "+fmt(b.hits)),h("span",{class:b.alive?"ok":"ko"},b.alive?"صامد":"خرج")))});
  var youWon=!st.draw&&playing&&st.winner===0,kicker=st.draw?"تعادل":!playing?"انتهت":youWon?"فوز":"خسارة";
  var lead=(st.draw&&st.timeout?"خلص الوقت والصحة متعادلة. ":st.timeout?"خلص الوقت، وفاز الأكثر صحة. ":"")+"أفضل كورة: "+mvp.K.ar+" بـ"+fmt(Math.round(mvp.dealt))+" ضرر";
  w.append(h("div",{class:"card"},h("div",{class:"result-kicker"+(st.draw||!playing?"":youWon?" is-win":" is-loss")},kicker),h("div",{class:"win",style:"color:"+(st.draw?"#fff":st.teams[st.winner].color)},title),
    h("p",{class:"lead"},lead),tbl,
    h("div",{id:"bcReward"},S.srv?h("div",{class:"skel",style:"height:40px"}):h("p",{class:"hint"},S.mode==="custom"?"المعركة المخصصة للمشاهدة، بدون مكافآت.":"معركة تدريب بدون مكافآت.")),
    h("div",{class:"row",style:"margin-top:10px"},h("button",{class:"primary",onclick:function(){startBattle(true)}},"معركة ثانية"),h("button",{onclick:function(){stop();renderPicker()}},"غيّر الكور")),
    h("button",{class:"wide",style:"margin-top:8px",onclick:function(){stop();SP.openGame("ballclash")}},"رجوع")));
  SP.sfx(!playing||st.winner===0?"unlock":"bad");
  if(S.srv){var sid=S.srv;S.srv=null;SP.api("bc_finish",{id:sid}).then(function(r){SP.applyProfile(r.profile);var box=$("bcReward");if(!box)return;box.textContent="";
      box.append(r.out.capped?h("p",{class:"hint"},"خلصت مكافآت اليوم (١٥ معركة)، والنتيجة انحسبت."):h("div",{class:"chips",style:"justify-content:center"},h("span",{class:"pill"},"+"+fmt(r.out.xp)+" XP"),h("span",{class:"pill coins"},SP.coinEl("+"+fmt(r.out.coins)))),
        h("p",{class:"hint",style:"margin:6px 0 0"},"السيرفر أعاد حساب المعركة وأكّد النتيجة."))})
    .catch(function(e){var box=$("bcReward");if(box){box.textContent="";box.append(h("p",{class:"err"},e.message))}})}
}
/* ---------- tournaments (knock-out brackets against the computer) ---------- */
function tourOpen(){stop();S.rootEl=null;S.mode="tour";S.tour={size:8,pair:false,stage:"setup"};S.opts={ff:false,syn:true,dup:true,hpMul:1,size:560};S.teams=mkTeams([1],false);S.teams[0].ai=false;S.side=0;S.q="";S.grp="all";SP.show("bc");tourSetup()}
function tourSetup(){
  var r=root();r.textContent="";var T=S.tour;
  r.append(h("div",{class:"bc-bar"},h("button",{class:"quit",onclick:function(){SP.openGame("ballclash")}},"رجوع"),h("div",{class:"bc-title"},h("b",{},"TOURNAMENT"),h("span",{},"بطولة إقصائية ضد الكمبيوتر"))));
  var sz=h("div",{class:"chips"});[4,8,16,32].forEach(function(n){sz.append(h("button",{class:"chip"+(T.size===n?" on":""),onclick:function(){T.size=n;tourSetup()}},fmt(n)+" مشارك"))});
  var ty=h("div",{class:"chips"});[[false,"كور فردية (١ ضد ١)"],[true,"ثنائيات (٢ ضد ٢)"]].forEach(function(v){ty.append(h("button",{class:"chip"+(T.pair===v[0]?" on":""),onclick:function(){T.pair=v[0];S.teams=mkTeams([v[0]?2:1],false);S.teams[0].ai=false;tourSetup()}},v[1]))});
  r.append(h("div",{class:"card"},h("span",{class:"lbl"},"عدد المشاركين"),sz,h("span",{class:"lbl mt"},"نوع البطولة"),ty,
    h("p",{class:"hint"},"اختر "+(T.pair?"كورتين":"كورة")+" لمشاركك، والباقين يختارهم الكمبيوتر. تشاهد مبارياتك مباشر، والباقي ينحسب على طول.")));
  var me=S.teams[0];
  r.append(h("div",{class:"bc-teams"},h("div",{class:"bc-team on",style:"--tc:#E62948"},h("div",{class:"bc-th"},h("i",{}),h("b",{},"مشاركك")),
    h("div",{class:"bc-slots"},...Array.from({length:me.size},function(_,k){var kid=me.slots[k];return h("button",{class:"bc-slot"+(kid?" full":""),onclick:function(){if(kid){me.slots.splice(k,1);tourSetup()}}},kid?previewCanvas(kid,46):h("span",{class:"bc-plus"},"+"),h("span",{},kid?BC.KINDS[kid].ar:"اختر"))})))));
  var grid=h("div",{class:"bc-grid"});BC.PICK.forEach(function(kid){var K=BC.KINDS[kid];grid.append(h("div",{class:"bc-card"},h("button",{class:"bc-cv",onclick:function(){details(kid)}},previewCanvas(kid,80)),h("div",{class:"bc-cn"},h("b",{},K.ar),h("span",{},K.en)),
    h("button",{class:"primary small",onclick:function(){if(me.slots.length>=me.size)me.slots.pop();me.slots.push(kid);SP.sfx("move");tourSetup()}},"اختر")))});
  r.append(grid,h("button",{class:"primary wide bc-start",disabled:me.slots.length<me.size,onclick:tourBegin},"ابدأ البطولة"));
}
function tourBegin(){
  var T=S.tour,pool=BC.PICK.filter(function(k){return S.teams[0].slots.indexOf(k)<0}),ent=[{name:"مشاركك",balls:S.teams[0].slots.slice(),me:true}];
  for(var i=1;i<T.size;i++){var balls=[];for(var k=0;k<(T.pair?2:1);k++)balls.push(pool.splice(Math.floor(Math.random()*pool.length),1)[0]);ent.push({name:balls.map(function(b){return BC.KINDS[b].ar}).join(" و"),balls:balls})}
  for(var j=ent.length-1;j>0;j--){var q=Math.floor(Math.random()*(j+1));var tmp=ent[j];ent[j]=ent[q];ent[q]=tmp}
  T.seed=Math.floor(Math.random()*2147483647)+1;T.rounds=[ent.map(function(e,ix){return ix})];T.ent=ent;T.res=[];T.stage="bracket";T.r=0;tourBracket();
}
function tourMatches(r){var T=S.tour,list=T.rounds[r],m=[];for(var i=0;i<list.length;i+=2)m.push([list[i],list[i+1]]);return m}
function tourPlay(r){
  var T=S.tour,ms=tourMatches(r),res=T.res[r]=T.res[r]||[],live=-1;
  ms.forEach(function(m,mi){if(res[mi]!=null)return;var a=T.ent[m[0]],b=T.ent[m[1]];if(a.me||b.me){live=mi;return}
    var st=BC.run({seed:(T.seed+r*1009+mi*7919)>>>0,teams:[{balls:a.balls},{balls:b.balls}]});res[mi]=tourPick(st,m)});
  if(live>=0){var m=ms[live].slice();if(T.ent[m[1]].me)m=[m[1],m[0]];S.tour.live={r:r,mi:live,m:m};S.teams=[{name:T.ent[m[0]].me?"مشاركك":T.ent[m[0]].name,color:"#E62948",size:T.ent[m[0]].balls.length,slots:T.ent[m[0]].balls.slice()},{name:T.ent[m[1]].me?"مشاركك":T.ent[m[1]].name,color:"#8D65F6",size:T.ent[m[1]].balls.length,slots:T.ent[m[1]].balls.slice()}];
    S.seed=(T.seed+r*1009+live*7919)>>>0;S.mode="tour-watch";startBattle(false);return}
  tourAdvance(r);
}
function tourPick(st,m){if(!st.draw)return st.winner===0?m[0]:m[1];var a=BC.teamShare(st,0),b=BC.teamShare(st,1);return b>a+1e-9?m[1]:m[0]}
function tourAfterLive(st){var T=S.tour,L=T.live;T.live=null;S.mode="tour";T.res[L.r][L.mi]=tourPick(st,L.m);stop();tourPlay(L.r)}
function tourAdvance(r){var T=S.tour,res=T.res[r];if(res.length<tourMatches(r).length||res.some(function(x){return x==null}))return tourBracket();
  if(res.length===1){T.champ=res[0];T.stage="done";var s=statsGet();s.tours=(s.tours||0)+1;if(T.ent[res[0]].me)s.tourWins=(s.tourWins||0)+1;try{localStorage.setItem("bc_stats",JSON.stringify(s))}catch(e){}
    SP.sfx(T.ent[res[0]].me?"unlock":"bad");return tourBracket()}
  T.rounds[r+1]=res.slice();T.r=r+1;tourBracket()}
function tourBracket(){
  var r=root();r.textContent="";var T=S.tour;stop();
  r.append(h("div",{class:"bc-bar"},h("button",{class:"quit",onclick:function(){SP.openGame("ballclash")}},"خروج"),h("div",{class:"bc-title"},h("b",{},"TOURNAMENT"),h("span",{},fmt(T.size)+" مشارك"))));
  if(T.stage==="done"){var ch=T.ent[T.champ];r.append(h("div",{class:"bc-champ"},ic("trophy"),h("b",{},ch.me?"أنت بطل البطولة!":"البطل: "+ch.name),h("div",{class:"bc-slots"},...ch.balls.map(function(k){return previewCanvas(k,56)}))))}
  var tree=h("div",{class:"bc-tree"});
  T.rounds.forEach(function(list,ri){var col=h("div",{class:"bc-round"},h("span",{class:"lbl"},ri===Math.log2(T.size)-1?"النهائي":ri===Math.log2(T.size)-2?"نصف النهائي":"الجولة "+fmt(ri+1)));
    tourMatches(ri).forEach(function(m,mi){var res=(T.res[ri]||[])[mi];col.append(h("div",{class:"bc-match"},...m.map(function(e){var E=T.ent[e];return h("div",{class:"bc-ent"+(res===e?" win":res!=null?" lose":"")+(E.me?" me":"")},h("span",{class:"bc-mini"},...E.balls.map(function(k){return previewCanvas(k,22)})),h("span",{},E.me?"مشاركك":E.name))})))});
    tree.append(col)});
  r.append(tree);
  if(T.stage!=="done"){var cur=T.rounds.length-1,meIn=T.rounds[cur].some(function(e){return T.ent[e].me});
    r.append(h("button",{class:"primary wide bc-start",onclick:function(){tourPlay(cur)}},meIn?"العب مباراتك في هالجولة":"احسب الجولة"))}
  else r.append(h("div",{class:"row",style:"margin-top:12px"},h("button",{class:"primary",onclick:tourOpen},"بطولة جديدة"),h("button",{onclick:function(){SP.openGame("ballclash")}},"رجوع")));
}
/* ---------- statistics, collection, settings ---------- */
function statsOpen(){stop();S.rootEl=null;SP.show("bc");var r=root();r.textContent="";var s=statsGet(),used=s.used||{},wins=s.wins||{};
  var fav=Object.keys(used).sort(function(a,b){return used[b]-used[a]})[0],best=Object.keys(used).filter(function(k){return used[k]>=3}).sort(function(a,b){return (wins[b]||0)/used[b]-(wins[a]||0)/used[a]})[0];
  var tile=function(n,l){return h("div",{class:"otile"},h("b",{},fmt(n||0)),h("span",{},l))};
  r.append(h("div",{class:"bc-bar"},h("button",{class:"quit",onclick:function(){SP.openGame("ballclash")}},"رجوع"),h("div",{class:"bc-title"},h("b",{},"STATISTICS"),h("span",{},"إحصائياتك في صراع الكور"))),
    h("div",{class:"otiles"},tile(s.played,"معركة"),tile(s.win,"فوز"),tile(s.loss,"خسارة"),tile(s.draw,"تعادل"),tile(s.best,"أطول سلسلة انتصارات"),tile(s.tourWins,"بطولة فزت فيها")),
    h("div",{class:"card",style:"margin-top:12px"},h("h3",{},"كورك"),
      fav?h("div",{class:"bc-pre"},previewCanvas(fav,40),h("div",{class:"grow"},h("b",{},"أكثر كورة تستخدمها: "+BC.KINDS[fav].ar),h("span",{},fmt(used[fav])+" معركة"))):h("p",{class:"hint"},"العب معارك وبتطلع هنا."),
      best?h("div",{class:"bc-pre"},previewCanvas(best,40),h("div",{class:"grow"},h("b",{},"أنجح كورة: "+BC.KINDS[best].ar),h("span",{},"فازت "+fmt(wins[best]||0)+" من "+fmt(used[best])))):null),
    h("div",{class:"card",style:"margin-top:12px"},h("h3",{},"جودة الرسومات"),h("p",{class:"hint"},"«خفيفة» تقلل المؤثرات للأجهزة الضعيفة."),
      h("div",{class:"chips"},...[["high","عالية"],["low","خفيفة"]].map(function(v){return h("button",{class:"chip"+(Q===v[0]?" on":""),onclick:function(){Q=v[0];try{localStorage.setItem("bc_q",Q)}catch(e){}statsOpen()}},v[1])}))));
}
function paintArena(ctx,px,t,theme){
  var dpr=Math.min(2,window.devicePixelRatio||1),w=Math.round(px*dpr),key=theme+"|"+w;
  if(!S._arPrev||S._arPrev._k!==key){var off=document.createElement("canvas");off.width=w;off.height=w;off._k=key;BCART.arena(off.getContext("2d"),w,w,0,[{color:"#E62948"},{color:"#8D65F6"}],theme);S._arPrev=off}
  ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,w,w);ctx.drawImage(S._arPrev,0,0);
  var sc=w/440,opt=drawOpt(2),tt=reduced()?0:t;ctx.setTransform(sc,0,0,sc,0,0);
  var balls=[{id:"sword",x:150,y:270,team:0},{id:"dragon",x:300,y:180,team:1}].map(function(s){var K=BC.KINDS[s.id];return {x:s.x,y:s.y,r:K.r,K:K,ang:tt*(K.spin||2)*.35,dir:1,len:Math.min(K.len||0,90),head:K.head||0,count:K.count||1,s:{},shield:0,alive:true,hp:1,maxHp:1,abT:.2,team:s.team,_skin:looksGet()[s.id]||null}});
  var st={balls:balls};balls.forEach(function(b){BCART.weapon(ctx,b,b.K,tt,opt);BCART.body(ctx,b,b.K,b.team?"#8D65F6":"#E62948",st,tt,opt)});
}
function arenaThumb(theme,size){var cv=document.createElement("canvas"),dpr=Math.min(2,window.devicePixelRatio||1),hgt=Math.round(size*.62);cv.width=Math.round(size*dpr);cv.height=Math.round(hgt*dpr);cv.style.width=size+"px";cv.style.height=hgt+"px";BCART.arena(cv.getContext("2d"),cv.width,cv.height,0,[{color:"#E62948"},{color:"#8D65F6"}],theme);return cv}
function collectionOpen(){S.mode="browse";stop();S.rootEl=null;SP.show("bc");if(!S.ward)S.ward={tab:"balls",grp:"all",rar:"all",set:"all",q:"",pick:"sword"};renderWard()}
function renderWard(){
  var r=root(),W=S.ward;r.textContent="";
  r.append(h("div",{class:"bc-bar"},h("button",{class:"quit",onclick:function(){stop();SP.openGame("ballclash")}},"رجوع"),h("div",{class:"bc-title"},h("b",{},"COLLECTION"),h("span",{},"كور، مظاهر، ساحات"))));
  var tabs=h("div",{class:"chips bc-tabs",role:"tablist"});
  [["balls","الكور"],["looks","المظاهر"],["arenas","الساحات"]].forEach(function(t){tabs.append(h("button",{class:"chip"+(W.tab===t[0]?" on":""),role:"tab","aria-selected":W.tab===t[0]?"true":"false",onclick:function(){W.tab=t[0];W.q="";if(t[0]==="balls"&&!BC.KINDS[W.pick])W.pick="sword";if(t[0]==="looks"&&!BC.LOOKS[W.pick])W.pick=BC.LOOK_ORDER[0];if(t[0]==="arenas"&&!BC.ARENAS[W.pick])W.pick=arenaGet();renderWard()}},t[1]))});
  r.append(tabs,h("p",{class:"hint"},"المظاهر والساحات شكلية ومجانية. ما تغيّر قوة الكورة."));
  var stage=h("div",{class:"bc-stage"}),host=h("div",{class:"bc-stage-cv"}),meta=h("div",{class:"bc-stage-meta"});stage.append(host,meta);r.append(stage);
  if(W.tab==="arenas"){var A=BC.ARENAS[W.pick]||BC.ARENAS.classic,onA=arenaGet()===A.id;
    if(reduced())host.append(arenaThumb(A.id,220));else mountLive(host,220,function(ctx,px,t){paintArena(ctx,px,t,A.id)});
    meta.append(h("div",{class:"bc-stage-top"},h("b",{},A.ar),rarBadge(A.rar),onA?h("span",{class:"bc-eq"},"مستخدم"):null),h("span",{class:"hint"},A.en),h("p",{},A.desc),h("button",{class:"primary small",disabled:onA,onclick:function(){arenaSet(A.id);S.arCv=null;SP.sfx("unlock");renderWard()}},onA?"مستخدمة في المعركة":"استخدم الساحة"));
  }else{var skin=null,kid;
    if(W.tab==="looks"){var L=BC.LOOKS[W.pick];kid=L.ball;skin=L.id}else{kid=BC.KINDS[W.pick]?W.pick:"sword";skin=looksGet()[kid]||null}
    var K=BC.KINDS[kid],eq=looksGet()[kid]||"";
    if(reduced())host.append(previewCanvas(kid,180,1.1,{skin:skin,still:true}));else mountLive(host,180,function(ctx,px,t){paintPreview(ctx,kid,px,t,{skin:skin})});
    var top=h("div",{class:"bc-stage-top"},h("b",{},W.tab==="looks"?L.ar:K.ar),rarBadge(W.tab==="looks"?L.rar:K.rar));
    if(W.tab==="looks"&&eq===L.id)top.append(h("span",{class:"bc-eq"},"مستخدم"));
    else if(W.tab==="balls"&&!eq)top.append(h("span",{class:"bc-eq"},"الأساس"));
    meta.append(top,h("span",{class:"hint"},W.tab==="looks"?L.en+" · "+K.ar:K.en+" · "+BC.GROUPS[K.group]),h("p",{},W.tab==="looks"?L.desc:K.desc));
    if(W.tab==="looks")meta.append(h("button",{class:"primary small",disabled:eq===L.id,onclick:function(){looksSet(kid,L.id);SP.sfx("unlock");renderWard()}},eq===L.id?"مستخدم على "+K.ar:"جهّز المظهر"));
    else{var looks=(BC.LOOK_ORDER||[]).filter(function(id){return BC.LOOKS[id].ball===kid});
      var chips=h("div",{class:"chips"},h("button",{class:"chip"+(!eq?" on":""),onclick:function(){looksSet(kid,null);renderWard()}},"الأساس"));
      looks.forEach(function(id){chips.append(h("button",{class:"chip"+(eq===id?" on":""),onclick:function(){looksSet(kid,id);SP.sfx("unlock");renderWard()}},BC.LOOKS[id].ar))});
      if(looks.length)meta.append(h("span",{class:"lbl"},"مظهر الكورة"),chips);
      meta.append(h("button",{class:"small",onclick:function(){details(kid)}},"التفاصيل"));
    }
  }
  var tools=h("div",{class:"bc-tools"});
  if(W.tab!=="arenas"){var q=h("input",{type:"search",placeholder:W.tab==="looks"?"دوّر على مظهر":"دوّر على كورة",value:W.q,"aria-label":"بحث"});q.oninput=function(){W.q=q.value;drawGrid()};tools.append(q)}
  var chips2=h("div",{class:"chips bc-grps"});
  if(W.tab==="balls")[["all","الكل"]].concat(Object.keys(BC.GROUPS).map(function(k){return [k,BC.GROUPS[k]]})).forEach(function(g){chips2.append(h("button",{class:"chip"+(W.grp===g[0]?" on":""),onclick:function(){W.grp=g[0];renderWard()}},g[1]))});
  if(W.tab==="looks")[["all","كل الأطقم"]].concat(Object.keys(BC.SETS).map(function(k){return [k,BC.SETS[k]]})).forEach(function(g){chips2.append(h("button",{class:"chip"+(W.set===g[0]?" on":""),onclick:function(){W.set=g[0];renderWard()}},g[1]))});
  [["all","كل الندرة"],["common","عادي"],["rare","نادر"],["epic","ملحمي"],["legendary","أسطوري"]].forEach(function(g){chips2.append(h("button",{class:"chip"+(W.rar===g[0]?" on":""),onclick:function(){W.rar=g[0];renderWard()}},g[1]))});
  tools.append(chips2);r.append(tools);
  var grid=h("div",{class:"bc-grid",id:"bcGrid"});r.append(grid);
  function drawGrid(){grid.textContent="";var qq=(W.q||"").trim().toLowerCase();
    if(W.tab==="arenas"){BC.ARENA_ORDER.forEach(function(id){var A=BC.ARENAS[id];if(W.rar!=="all"&&A.rar!==W.rar)return;var on=arenaGet()===id;
      grid.append(h("button",{class:"bc-card rar-"+(A.rar||"common")+(W.pick===id?" sel":""),onclick:function(){W.pick=id;renderWard()}},arenaThumb(id,140),h("div",{class:"bc-cn"},h("b",{},A.ar),h("span",{},A.en)),rarBadge(A.rar),on?h("span",{class:"bc-eq"},"مستخدم"):h("span",{class:"hint"},"اضغط للمعاينة")))});return}
    if(W.tab==="looks"){BC.LOOK_ORDER.forEach(function(id){var L=BC.LOOKS[id],K=BC.KINDS[L.ball];if(W.set!=="all"&&L.set!==W.set)return;if(W.rar!=="all"&&L.rar!==W.rar)return;if(qq&&L.ar.indexOf(W.q.trim())<0&&L.en.toLowerCase().indexOf(qq)<0&&K.ar.indexOf(W.q.trim())<0)return;var on=looksGet()[L.ball]===id;
      grid.append(h("button",{class:"bc-card g-"+K.group+" rar-"+(L.rar||"common")+(W.pick===id?" sel":""),style:"--gc:"+GC[K.group],onclick:function(){W.pick=id;renderWard()}},previewCanvas(L.ball,96,null,{skin:id}),h("div",{class:"bc-cn"},h("b",{},L.ar),h("span",{},L.en)),rarBadge(L.rar),h("p",{class:"bc-desc"},BC.SETS[L.set]+" · "+K.ar),on?h("span",{class:"bc-eq"},"مستخدم"):h("span",{class:"hint"},"معاينة قبل التجهيز")))});
      if(!grid.children.length)grid.append(h("p",{class:"hint"},"ما فيه مظهر بهالفلتر."));return}
    BC.PICK.filter(function(kid){var K=BC.KINDS[kid];return (W.grp==="all"||K.group===W.grp)&&(W.rar==="all"||K.rar===W.rar)&&(!qq||K.ar.indexOf(W.q.trim())>=0||K.en.toLowerCase().indexOf(qq)>=0)}).forEach(function(kid){var K=BC.KINDS[kid],skin=looksGet()[kid];
      grid.append(h("button",{class:"bc-card g-"+K.group+" rar-"+(K.rar||"common")+(W.pick===kid?" sel":""),style:"--gc:"+GC[K.group],onclick:function(){W.pick=kid;renderWard()}},h("span",{class:"bc-role"},ROLE[K.role]||"قريب"),previewCanvas(kid,96,null,{skin:skin||null}),h("div",{class:"bc-cn"},h("b",{},K.ar),h("span",{},K.en+(skin?" · "+BC.LOOKS[skin].ar:""))),rarBadge(K.rar),h("p",{class:"bc-desc"},K.desc)))});
    if(!grid.children.length)grid.append(h("p",{class:"hint"},"ما لقينا كورة بهالفلتر."))}
  drawGrid();
}
addEventListener("resize",function(){if(S.st&&$("bcCanvas"))resize()});
document.addEventListener("visibilitychange",function(){if(document.hidden&&S.st&&!S.st.over&&!S.paused)togglePause()});
function watch(el,cfg,onEnd){stop();S.rootEl=el;S.mode="online-watch";S.onEnd=onEnd;S.opts={ff:false,syn:true,dup:true,hpMul:1,size:560};
  S.teams=cfg.teams.map(function(t){return {name:t.name,color:t.color,size:t.balls.length,slots:t.balls.slice()}});S.seed=cfg.seed;S.opts.size=cfg.size||560;startBattle(false);
  var q=el.querySelector(".bc-bar");if(q)q.remove();}
function stopWatch(){if(S.mode==="online-watch"){stop();S.onEnd=null}}
window.BCUI={watch:watch,stopWatch:stopWatch,open:open,previewCanvas:previewCanvas,tour:tourOpen,stats:statsOpen,collection:collectionOpen};
})();
