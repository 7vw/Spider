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
/* ---------- drawing: weapons, balls, statuses ---------- */
function line(x,x1,y1,x2,y2,w,col){x.strokeStyle=col;x.lineWidth=w;x.beginPath();x.moveTo(x1,y1);x.lineTo(x2,y2);x.stroke()}
function metal(x,p){var g=x.createLinearGradient(p.x1,p.y1,p.x2,p.y2);g.addColorStop(0,"#8A96B0");g.addColorStop(.6,"#EEF3FF");g.addColorStop(1,"#FFFFFF");return g}
function drawWeapon(x,b,K){
  var parts=BC.parts(b);x.lineCap="round";x.lineJoin="round";
  parts.forEach(function(p){
    if(K.w==="beam"){x.save();x.shadowColor=K.color;x.shadowBlur=12;line(x,p.x1,p.y1,p.x2,p.y2,p.w+3,K.color);x.restore();line(x,p.x1,p.y1,p.x2,p.y2,1.5,"#FFFFFF");return}
    if(p.round){x.save();x.translate(p.x2,p.y2);if(K.w==="hammer"&&!K.roundHead){x.rotate(b.ang);var w=p.w*1.05,ht=p.w*.62,g=x.createLinearGradient(0,-ht,0,ht);g.addColorStop(0,"#C9CFD9");g.addColorStop(1,"#5B6283");x.fillStyle=g;x.beginPath();if(x.roundRect)x.roundRect(-ht*.6,-w/2,ht*1.2,w,4);else x.rect(-ht*.6,-w/2,ht*1.2,w);x.fill();x.strokeStyle=K.color;x.lineWidth=2;x.stroke()}
      else if(K.w==="discs"){x.rotate(b.ang*3);x.fillStyle=K.color;x.beginPath();x.arc(0,0,p.w/2,0,7);x.fill();x.strokeStyle="#FFFFFF";x.setLineDash([3,3]);x.lineWidth=2;x.beginPath();x.arc(0,0,p.w/2,0,7);x.stroke();x.setLineDash([]);x.fillStyle="#1A1F2E";x.beginPath();x.arc(0,0,p.w/6,0,7);x.fill()}
      else{var g2=x.createRadialGradient(-p.w*.15,-p.w*.15,1,0,0,p.w/2);g2.addColorStop(0,"#FFFFFF");g2.addColorStop(1,K.color);x.fillStyle=g2;x.beginPath();x.arc(0,0,p.w/2,0,7);x.fill()}
      x.restore();return}
    if(!p.hurt){line(x,p.x1,p.y1,p.x2,p.y2,p.w+1,K.w==="hammer"?"#6B4A2B":K.w==="scythe"?"#5B4A3A":K.w==="poles"?shade(K.color):"#8A5A2B");return}
    if(K.w==="pole"||K.w==="poles"){line(x,p.x1,p.y1,p.x2,p.y2,p.w+1,K.color);line(x,p.x1,p.y1,p.x2,p.y2,1.5,"#FFFFFF");return}
    if(K.w==="scythe"){line(x,p.x1,p.y1,p.x2,p.y2,p.w+1,K.color);line(x,p.x1,p.y1,p.x2,p.y2,1.2,"#FFFFFF");return}
    line(x,p.x1,p.y1,p.x2,p.y2,p.w+.5,K.w==="orbit"||K.w==="blades"?K.color:metal(x,p));if(K.w==="blade"&&K.id!=="chainsaw")line(x,p.x1,p.y1,p.x1+(p.x2-p.x1)*.14,p.y1+(p.y2-p.y1)*.14,p.w+2,"#E6B85C");
    if(K.id==="chainsaw"){x.setLineDash([3,3]);line(x,p.x1,p.y1,p.x2,p.y2,p.w+3,"rgba(255,176,46,.7)");x.setLineDash([])}
  });
}
function drawBall(x,b,K,teamCol,ux,dead,st){
  x.save();var s=b.s||{};if(dead)x.globalAlpha=.25;else if(s.invis>0)x.globalAlpha=.32;
  x.fillStyle="rgba(0,0,0,.35)";x.beginPath();x.ellipse(b.x+3,b.y+5,b.r,b.r*.9,0,0,7);x.fill();
  if(!dead)drawWeapon(x,b,K);
  var g=x.createRadialGradient(b.x-b.r*.35,b.y-b.r*.4,b.r*.1,b.x,b.y,b.r);g.addColorStop(0,"#FFFFFF");g.addColorStop(.25,K.color);g.addColorStop(1,shade(K.color));
  x.fillStyle=g;x.beginPath();x.arc(b.x,b.y,b.r,0,7);x.fill();x.lineWidth=b.summon?2:4;if(b.summon)x.setLineDash([4,3]);x.strokeStyle=teamCol;x.stroke();x.setLineDash([]);
  if(!dead){
    if(s.freeze>0){x.fillStyle="rgba(191,244,255,.55)";x.beginPath();x.arc(b.x,b.y,b.r,0,7);x.fill()}
    if(s.burn>0){x.fillStyle="rgba(255,106,61,.85)";for(var k=0;k<5;k++){var a=k*1.26+(b.x+b.y)*.02;x.beginPath();x.arc(b.x+Math.cos(a)*b.r*.8,b.y+Math.sin(a)*b.r*.8-3,3+Math.random()*2,0,7);x.fill()}}
    if(s.poison>0){x.strokeStyle="rgba(140,255,46,.8)";x.lineWidth=2;x.beginPath();x.arc(b.x,b.y,b.r+3,0,7);x.stroke()}
    if(s.web>0){x.strokeStyle="rgba(255,255,255,.7)";x.lineWidth=1;for(var w2=0;w2<4;w2++){var aa=w2*.785;x.beginPath();x.moveTo(b.x-Math.cos(aa)*b.r*1.2,b.y-Math.sin(aa)*b.r*1.2);x.lineTo(b.x+Math.cos(aa)*b.r*1.2,b.y+Math.sin(aa)*b.r*1.2);x.stroke()}}
    if(s.slow>0||s.stun>0){x.strokeStyle=s.stun>0?"rgba(255,225,77,.9)":"rgba(127,232,255,.7)";x.setLineDash([3,4]);x.lineWidth=2;x.beginPath();x.arc(b.x,b.y,b.r+6,0,7);x.stroke();x.setLineDash([])}
    if(b.shield>0){x.strokeStyle="rgba(143,184,255,.85)";x.lineWidth=2+Math.min(5,b.shield/10);x.beginPath();x.arc(b.x,b.y,b.r+8,0,7);x.stroke()}}
  x.restore();
}
function drawProj(x,p){
  x.save();var t=p.type,sp=Math.sqrt(p.vx*p.vx+p.vy*p.vy)||1,ux=p.vx/sp,uy=p.vy/sp;
  if(t==="fire"||t==="plasma"){x.shadowColor=p.color;x.shadowBlur=14;var g=x.createRadialGradient(p.x,p.y,1,p.x,p.y,p.r);g.addColorStop(0,"#FFFFFF");g.addColorStop(.4,t==="fire"?"#FFD23F":"#E2B6FF");g.addColorStop(1,p.color);x.fillStyle=g;x.beginPath();x.arc(p.x,p.y,p.r,0,7);x.fill()}
  else if(t==="ice"){x.fillStyle="#E8FBFF";x.beginPath();x.moveTo(p.x+ux*p.r*1.6,p.y+uy*p.r*1.6);x.lineTo(p.x-uy*p.r,p.y+ux*p.r);x.lineTo(p.x-ux*p.r*1.2,p.y-uy*p.r*1.2);x.lineTo(p.x+uy*p.r,p.y-ux*p.r);x.closePath();x.fill()}
  else if(t==="dart"||t==="bolt"||t==="light"||t==="rail"||t==="prism"){var L=t==="rail"?34:t==="light"?18:10;x.shadowColor=p.color;x.shadowBlur=t==="dart"?0:10;line(x,p.x-ux*L,p.y-uy*L,p.x,p.y,t==="rail"?4:2.5,t==="prism"?"hsl("+((p.x+p.y)%360)+",90%,70%)":p.color)}
  else if(t==="wave"){x.strokeStyle=p.color;x.lineWidth=4;x.beginPath();x.arc(p.x,p.y,p.r,Math.atan2(uy,ux)-1.1,Math.atan2(uy,ux)+1.1);x.stroke()}
  else if(t==="rock"){x.fillStyle=p.color;x.fillRect(p.x-p.r,p.y-p.r,p.r*2,p.r*2)}
  else if(t==="boomerang"){x.translate(p.x,p.y);x.rotate(p.age*14);x.strokeStyle=p.color;x.lineWidth=4;x.beginPath();x.moveTo(-p.r*1.4,0);x.lineTo(0,-p.r);x.lineTo(p.r*1.4,0);x.stroke()}
  else if(t==="webshot"){x.strokeStyle="#FFFFFF";x.lineWidth=1.5;x.beginPath();x.arc(p.x,p.y,p.r,0,7);x.stroke();line(x,p.x-p.r,p.y,p.x+p.r,p.y,1,"#FFFFFF");line(x,p.x,p.y-p.r,p.x,p.y+p.r,1,"#FFFFFF")}
  else if(t==="bee"){x.fillStyle="#FFD23F";x.beginPath();x.arc(p.x,p.y,p.r+1,0,7);x.fill();x.fillStyle="#1A1206";x.fillRect(p.x-1,p.y-p.r,2,p.r*2);x.fillStyle="rgba(255,255,255,.6)";x.beginPath();x.arc(p.x-2,p.y-p.r,2.5,0,7);x.arc(p.x+2,p.y-p.r,2.5,0,7);x.fill()}
  else if(t==="rocket"){x.fillStyle="rgba(255,176,46,.6)";x.beginPath();x.arc(p.x-ux*10,p.y-uy*10,4+Math.random()*2,0,7);x.fill();x.fillStyle=p.color;x.beginPath();x.moveTo(p.x+ux*10,p.y+uy*10);x.lineTo(p.x-uy*5-ux*6,p.y+ux*5-uy*6);x.lineTo(p.x+uy*5-ux*6,p.y-ux*5-uy*6);x.closePath();x.fill()}
  else{x.fillStyle=p.color;x.beginPath();x.arc(p.x,p.y,p.r,0,7);x.fill()}
  x.restore();
}
function drawZone(x,z){
  x.save();var a=Math.max(.15,Math.min(1,(z.ttl-z.age)*1.5)),t=z.type;x.globalAlpha=a;
  if(t==="lava"||t==="cloud"||t==="heal"){var g=x.createRadialGradient(z.x,z.y,2,z.x,z.y,z.r);g.addColorStop(0,t==="lava"?"rgba(255,176,46,.65)":t==="cloud"?"rgba(185,162,255,.5)":"rgba(61,220,151,.4)");g.addColorStop(1,"rgba(0,0,0,0)");x.fillStyle=g;x.beginPath();x.arc(z.x,z.y,z.r,0,7);x.fill()}
  else if(t==="web"){x.strokeStyle="rgba(255,255,255,.5)";x.lineWidth=1;for(var k=0;k<8;k++){var aa=k*.785;line(x,z.x,z.y,z.x+Math.cos(aa)*z.r,z.y+Math.sin(aa)*z.r,1,"rgba(255,255,255,.45)")}[.4,.7,1].forEach(function(f){x.beginPath();x.arc(z.x,z.y,z.r*f,0,7);x.stroke()})}
  else if(t==="tornado"||t==="pull"){x.strokeStyle=t==="pull"?"rgba(141,101,246,.8)":"rgba(200,247,232,.75)";x.lineWidth=2.5;for(var q=0;q<3;q++){x.beginPath();x.arc(z.x,z.y,z.r*(.35+q*.3),z.age*6+q,z.age*6+q+3.4);x.stroke()}if(t==="pull"){x.fillStyle="#05040A";x.beginPath();x.arc(z.x,z.y,z.r*.2,0,7);x.fill()}}
  else if(t==="time"){x.strokeStyle="rgba(155,248,255,.55)";x.setLineDash([6,6]);x.lineWidth=2;x.beginPath();x.arc(z.x,z.y,z.r,0,7);x.stroke();x.setLineDash([])}
  else if(t==="mine"){x.fillStyle=(Math.floor(z.age*4)%2)?"#E62948":"#5B1020";x.beginPath();x.arc(z.x,z.y,7,0,7);x.fill();x.strokeStyle="rgba(230,41,72,.3)";x.beginPath();x.arc(z.x,z.y,z.r*.5,0,7);x.stroke()}
  else if(t==="star"){var f2=Math.min(1,z.age/Math.max(.01,z.delay));x.strokeStyle="rgba(255,241,196,.9)";x.lineWidth=2;x.beginPath();x.arc(z.x,z.y,z.r*(1-f2*.6),0,7);x.stroke();if(z.done){x.fillStyle="rgba(255,241,196,.6)";x.beginPath();x.arc(z.x,z.y,z.r,0,7);x.fill()}}
  x.restore();
}
function shade(hex){var n=parseInt(hex.slice(1),16),r=(n>>16)*.45|0,g=((n>>8)&255)*.45|0,b=(n&255)*.45|0;return "rgb("+r+","+g+","+b+")"}
function previewCanvas(kid,size){
  var cv=document.createElement("canvas"),dpr=Math.min(2,window.devicePixelRatio||1);cv.width=size*dpr;cv.height=size*dpr;cv.style.width=size+"px";cv.style.height=size+"px";
  var x=cv.getContext("2d"),K=BC.KINDS[kid],sc=size*dpr/150;x.scale(sc,sc);
  var b={x:K.w==='none'?75:62,y:80,r:K.r,K:K,ang:-.75,dir:1,len:K.len||0,head:K.head||0,count:K.count||1,s:{},shield:0};drawBall(x,b,K,"#FFFFFF",1,false);return cv;
}
/* ---------- formats, teams, presets ---------- */
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
  SP.openSheet(function(c,close){c.append(h("div",{class:"bc-dhead"},previewCanvas(kid,96),h("div",{},h("h3",{style:"margin:0"},K.ar),h("span",{class:"hint"},K.en+" · "+BC.GROUPS[K.group]))),
    h("p",{class:"lead"},K.desc),h("p",{class:"bc-grow"},ic("up"),"التطور: "+(K.growTxt||"—")),
    partners.length?h("div",{class:"bc-syn"},ic("spark"),h("span",{},partners.map(function(s){return s.ar}).join("، "))):null,
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
      grid.append(h("div",{class:"bc-card"+(taken?" taken":"")},h("button",{class:"bc-cv","aria-label":"تفاصيل "+K.ar,onclick:function(){details(kid)}},previewCanvas(kid,100)),h("div",{class:"bc-cn"},h("b",{},K.ar),h("span",{},K.en)),
        h("p",{class:"bc-desc"},K.desc),bars,h("button",{class:"primary small",disabled:lock||taken,onclick:function(){pick(kid)}},taken?"مختارة":"اختر")))});
    if(!grid.children.length)grid.append(h("p",{class:"hint"},"ما لقينا كورة بهالاسم."))}
  drawGrid();
  r.append(h("button",{class:"primary wide bc-start",disabled:!allFull(),onclick:function(){startBattle(true)}},allFull()?"ابدأ المعركة":"كمّل اختيار الكور"));
}
/* ---------- battle ---------- */
function rewardable(){return SP.online()&&(S.mode==="quick"||S.mode==="team"||S.mode==="draft"||S.mode==="tour-watch")}
async function startBattle(newSeed){
  if(newSeed||!S.seed)S.seed=Math.floor(Math.random()*2147483647)+1;
  S.srv=null;S.boost=null;
  if(rewardable()){var bt=document.querySelector("#bcRoot .bc-start");if(bt){bt.disabled=true;bt.textContent="يجهّز المعركة…"}
    try{var reg=await SP.api("bc_start",{mode:S.mode,teams:S.teams.map(function(t){return {balls:t.slots.slice()}}),opts:{ff:S.opts.ff,syn:S.opts.syn,hpMul:S.opts.hpMul,size:S.opts.size}});S.seed=reg.seed;S.srv=reg.id;S.boost=reg.boost||null}
    catch(e){S.srv=null;SP.toast("ما قدرنا نسجّل المعركة، بتنلعب تدريب","bad")}}
  S.st=BC.create({seed:S.seed,boost:S.boost,size:S.opts.size,ff:S.opts.ff,synergy:S.opts.syn,hpMul:S.opts.hpMul,teams:S.teams.map(function(t){return {name:t.name,color:t.color,balls:t.slots.slice()}})});
  S.fx=[];S.floats=[];S.shake=0;S.acc=0;S.last=0;S.paused=false;S.ended=false;
  var r=root();r.textContent="";
  r.append(h("div",{class:"bc-bar"},h("button",{class:"quit",onclick:function(){stop();renderPicker()}},"طلوع"),h("div",{class:"bc-title"},h("b",{},"BALL CLASH"),h("span",{id:"bcClock"},"٠:٠٠"))),
    h("div",{class:"bc-hud",id:"bcHud"}),
    h("div",{class:"bc-arena",id:"bcArenaWrap"},h("canvas",{id:"bcCanvas",role:"img","aria-label":"ساحة المعركة"})),
    h("div",{class:"bc-ctl"},h("div",{class:"seg3 bc-speed",role:"group","aria-label":"سرعة المشاهدة"},
        [1,2,4].map(function(v){return h("button",{class:S.speed===v?"on":"","data-v":String(v),onclick:function(){S.speed=v;speedBtns()}},v+"x")})),
      h("button",{id:"bcPause",onclick:togglePause},ic("pause"),h("span",{},"إيقاف"))),
    h("div",{class:"mg-win hidden",id:"bcWin",role:"dialog","aria-modal":"true"}));
  resize();hud();cancelAnimationFrame(S.raf);S.raf=requestAnimationFrame(loop);
}
function speedBtns(){document.querySelectorAll(".bc-speed button").forEach(function(b){b.classList.toggle("on",+b.dataset.v===S.speed)})}
function togglePause(){S.paused=!S.paused;S.last=0;var b=$("bcPause");if(b){b.textContent="";b.append(ic(S.paused?"play":"pause"),h("span",{},S.paused?"كمّل":"إيقاف"))}}
function stop(){cancelAnimationFrame(S.raf);S.raf=0}
function resize(){var cv=$("bcCanvas");if(!cv)return;var w=Math.max(260,Math.min($("bcArenaWrap").clientWidth||360,640,window.innerHeight-250)),dpr=Math.min(2,window.devicePixelRatio||1);
  cv.width=Math.round(w*dpr);cv.height=Math.round(w*dpr);cv.style.width=w+"px";cv.style.height=w+"px";S.scale=cv.width/S.st.W;S.ux=1/S.scale*dpr}
function loop(ts){
  if(!S.st)return;
  if(!S.last)S.last=ts;var dt=Math.min(.1,(ts-S.last)/1000);S.last=ts;
  if(!S.paused&&!S.st.over&&!document.hidden){S.acc+=dt*S.speed;var guard=0;
    while(S.acc>=BC.DT&&!S.st.over&&guard++<16){S.acc-=BC.DT;BC.step(S.st);onEvents(S.st.events)}}
  draw();if(S.st.over&&!S.ended){S.ended=true;setTimeout(showWin,900)}
  S.raf=requestAnimationFrame(loop);
}
function onEvents(ev){
  for(var i=0;i<ev.length;i++){var e=ev[i];
    if(e.t==="hit"){var n=Q==="low"?2:Math.min(14,4+Math.round(e.dmg));for(var k=0;k<n;k++)S.fx.push({x:e.x,y:e.y,vx:(Math.random()-.5)*360,vy:(Math.random()-.5)*360,life:.35+Math.random()*.25,c:"#FFE7A3"});
      S.floats.push({x:e.x,y:e.y-10,txt:"-"+fmt(e.dmg),life:.9,c:"#FFFFFF"});S.shake=Math.min(8,S.shake+e.dmg*.35);if(S.snd<performance.now()){SP.sfx("move");S.snd=performance.now()+90}}
    else if(e.t==="clash"){for(var k2=0;k2<10;k2++)S.fx.push({x:e.x,y:e.y,vx:(Math.random()-.5)*420,vy:(Math.random()-.5)*420,life:.25,c:"#FFFFFF"});S.floats.push({x:e.x,y:e.y,txt:"تِنْق!",life:.6,c:"#B9F0FF"})}
    else if(e.t==="ko"){var b=S.st.balls[e.i];for(var k3=0;k3<40;k3++)S.fx.push({x:e.x,y:e.y,vx:(Math.random()-.5)*600,vy:(Math.random()-.5)*600,life:.6+Math.random()*.5,c:b.K.color});S.shake=12;SP.sfx("bad");SP.buzz&&SP.buzz(60)}
    else if(e.t==="bolt"){S.fx.push({bolt:true,x1:e.x1,y1:e.y1,x2:e.x2,y2:e.y2,life:.22,c:"#FFE14D"})}
    else if(e.t==="boom"){S.fx.push({ring:true,x:e.x,y:e.y,r:(e.r||40)*.4,life:.45,c:"#FFB02E"});S.shake=Math.min(10,S.shake+4)}
    else if(e.t==="revive"||e.t==="summon"||e.t==="blink"){S.fx.push({ring:true,x:e.x||S.st.balls[e.i].x,y:e.y||S.st.balls[e.i].y,r:20,life:.5,c:e.t==="revive"?"#FF8A3D":"#B9A2FF"});if(e.t==="revive")S.floats.push({x:S.st.balls[e.i].x,y:S.st.balls[e.i].y-30,txt:"رجعت!",life:1.2,c:"#FF8A3D"})}
    else if(e.t==="dodge"){S.floats.push({x:e.x,y:e.y-20,txt:"تفادى",life:.7,c:"#E8E6FF"})}
    else if(e.t==="crit"){S.floats.push({x:e.x,y:e.y-26,txt:"حرجة!",life:.8,c:"#FF4F7A"})}
    else if(e.t==="up"||e.t==="lvl"){var bb=S.st.balls[e.i];S.floats.push({x:bb.x,y:bb.y-bb.r-26,txt:e.t==="up"?e.what:"مستوى "+fmt(e.lvl),life:1.1,c:"#E6B85C"});S.fx.push({ring:true,x:bb.x,y:bb.y,r:bb.r,life:.5,c:"#E6B85C"})}
  }
  if(ev.length)hud();
}
function hud(){
  var st=S.st,el=$("bcHud");if(!el)return;el.textContent="";el.style.gridTemplateColumns="repeat("+Math.min(4,st.teams.length>4?4:2)+",minmax(0,1fr))";
  st.teams.forEach(function(t,ti){var mine=st.balls.filter(function(b){return b.team===ti}),alive=mine.filter(function(b){return b.alive}).length,hp=mine.reduce(function(a,b){return a+Math.max(0,b.hp)},0),max=mine.reduce(function(a,b){return a+b.maxHp},0);
    var syn=st.syn.filter(function(s){return s.team===ti});
    el.append(h("div",{class:"bc-ht",style:"--tc:"+t.color,title:syn.map(function(s){return s.ar}).join("، ")},h("div",{class:"bc-htn"},h("i",{}),h("b",{},t.name),h("span",{},fmt(alive)+"/"+fmt(mine.length))),h("div",{class:"bc-hp"},h("b",{style:"width:"+Math.max(0,Math.round(hp/max*100))+"%"}))))});
}
function draw(){
  var cv=$("bcCanvas");if(!cv||!S.st)return;var x=cv.getContext("2d"),st=S.st,sc=S.scale,ux=S.ux;
  x.setTransform(1,0,0,1,0,0);x.fillStyle="#0B0E18";x.fillRect(0,0,cv.width,cv.height);
  var shx=0,shy=0;if(S.shake>.2&&!SP.reduced()&&Q!=="low"){shx=(Math.random()-.5)*S.shake;shy=(Math.random()-.5)*S.shake;S.shake*=.88}else S.shake=0;
  x.setTransform(sc,0,0,sc,shx,shy);
  x.strokeStyle="rgba(255,255,255,.05)";x.lineWidth=1*ux;for(var g=40;g<st.W;g+=40){x.beginPath();x.moveTo(g,0);x.lineTo(g,st.H);x.moveTo(0,g);x.lineTo(st.W,g);x.stroke()}
  x.strokeStyle="rgba(141,101,246,.55)";x.lineWidth=4*ux;x.strokeRect(2,2,st.W-4,st.H-4);
  st.zones.forEach(function(z){drawZone(x,z)});
  st.balls.forEach(function(b){if(!b.alive&&(st.t-b.koT>1.2||b.summon))return;drawBall(x,b,b.K,st.teams[b.team].color,1,!b.alive,st)});
  st.proj.forEach(function(p){drawProj(x,p)});
  st.balls.forEach(function(b){if(!b.alive||b.summon)return;var w=b.r*2,y0=b.y-b.r-14;x.fillStyle="rgba(0,0,0,.55)";x.fillRect(b.x-w/2,y0,w,6);x.fillStyle=st.teams[b.team].color;x.fillRect(b.x-w/2,y0,w*Math.max(0,b.hp/b.maxHp),6);
    if(b.lvl){x.fillStyle="#E6B85C";x.font="700 "+(12)+"px Readex Pro,system-ui";x.textAlign="center";x.fillText(String(b.lvl),b.x+b.r+6,y0+6)}});
  var dt=1/60*S.speed;
  if(Q==="low"&&S.fx.length>60)S.fx.splice(0,S.fx.length-60);
  S.fx=S.fx.filter(function(p){p.life-=dt;if(p.life<=0)return false;x.globalAlpha=Math.min(1,p.life*2);
    if(p.bolt){x.strokeStyle=p.c;x.lineWidth=2.5;x.beginPath();x.moveTo(p.x1,p.y1);var mx=(p.x1+p.x2)/2+(Math.random()-.5)*20,my=(p.y1+p.y2)/2+(Math.random()-.5)*20;x.lineTo(mx,my);x.lineTo(p.x2,p.y2);x.stroke()}
    else if(p.ring){x.strokeStyle=p.c;x.lineWidth=3;x.beginPath();x.arc(p.x,p.y,p.r+(0.5-p.life)*60,0,7);x.stroke()}else{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.92;p.vy*=.92;x.fillStyle=p.c;x.fillRect(p.x-2,p.y-2,4,4)}x.globalAlpha=1;return true});
  S.floats=S.floats.filter(function(f){f.life-=dt;if(f.life<=0)return false;f.y-=30*dt;x.globalAlpha=Math.min(1,f.life*1.6);x.fillStyle=f.c;x.font="800 16px Readex Pro,system-ui";x.textAlign="center";x.strokeStyle="rgba(0,0,0,.6)";x.lineWidth=3;x.strokeText(f.txt,f.x,f.y);x.fillText(f.txt,f.x,f.y);x.globalAlpha=1;return true});
  var t=Math.floor(st.t),c=$("bcClock");if(c)c.textContent=fmt(Math.floor(t/60))+":"+String(t%60).padStart(2,"0").replace(/\d/g,function(d){return "٠١٢٣٤٥٦٧٨٩"[d]});
}
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
  w.append(h("div",{class:"card"},h("div",{class:"win",style:"color:"+(st.draw?"#fff":st.teams[st.winner].color)},title),
    h("p",{class:"lead"},(st.timeout?"خلص الوقت، وفاز الأكثر صحة. ":"")+"أفضل كورة: "+mvp.K.ar+" بـ"+fmt(Math.round(mvp.dealt))+" ضرر"),tbl,
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
    var st=BC.run({seed:(T.seed+r*1009+mi*7919)>>>0,teams:[{balls:a.balls},{balls:b.balls}]});res[mi]=st.draw?(st.balls[0].hp>=st.balls[1].hp?m[0]:m[1]):(st.winner===0?m[0]:m[1])});
  if(live>=0){var m=ms[live].slice();if(T.ent[m[1]].me)m=[m[1],m[0]];S.tour.live={r:r,mi:live,m:m};S.teams=[{name:T.ent[m[0]].me?"مشاركك":T.ent[m[0]].name,color:"#E62948",size:T.ent[m[0]].balls.length,slots:T.ent[m[0]].balls.slice()},{name:T.ent[m[1]].me?"مشاركك":T.ent[m[1]].name,color:"#8D65F6",size:T.ent[m[1]].balls.length,slots:T.ent[m[1]].balls.slice()}];
    S.seed=(T.seed+r*1009+live*7919)>>>0;S.mode="tour-watch";startBattle(false);return}
  tourAdvance(r);
}
function tourAfterLive(st){var T=S.tour,L=T.live;T.live=null;S.mode="tour";var winIdx=st.draw?(st.balls[0].hp>=st.balls[1].hp?L.m[0]:L.m[1]):(st.winner===0?L.m[0]:L.m[1]);T.res[L.r][L.mi]=winIdx;stop();tourPlay(L.r)}
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
function collectionOpen(){S.mode="browse";stop();S.rootEl=null;SP.show("bc");var r=root();r.textContent="";
  r.append(h("div",{class:"bc-bar"},h("button",{class:"quit",onclick:function(){SP.openGame("ballclash")}},"رجوع"),h("div",{class:"bc-title"},h("b",{},"COLLECTION"),h("span",{},"٦٠ كورة، كلها متاحة لك"))));
  var gq=h("div",{});r.append(gq);
  Object.keys(BC.GROUPS).forEach(function(g){var grid=h("div",{class:"bc-grid"});BC.PICK.filter(function(k){return BC.KINDS[k].group===g}).forEach(function(kid){var K=BC.KINDS[kid];
    grid.append(h("button",{class:"bc-card",onclick:function(){details(kid)}},previewCanvas(kid,80),h("div",{class:"bc-cn"},h("b",{},K.ar),h("span",{},K.en)),h("p",{class:"bc-desc"},K.desc)))});
    gq.append(h("h3",{style:"margin:14px 0 8px"},BC.GROUPS[g]),grid)});
}
addEventListener("resize",function(){if(S.st&&$("bcCanvas"))resize()});
document.addEventListener("visibilitychange",function(){if(document.hidden&&S.st&&!S.st.over&&!S.paused)togglePause()});
function watch(el,cfg,onEnd){stop();S.rootEl=el;S.mode="online-watch";S.onEnd=onEnd;S.opts={ff:false,syn:true,dup:true,hpMul:1,size:560};
  S.teams=cfg.teams.map(function(t){return {name:t.name,color:t.color,size:t.balls.length,slots:t.balls.slice()}});S.seed=cfg.seed;startBattle(false);
  var q=el.querySelector(".bc-bar");if(q)q.remove();}
function stopWatch(){if(S.mode==="online-watch"){stop();S.onEnd=null}}
window.BCUI={watch:watch,stopWatch:stopWatch,open:open,previewCanvas:previewCanvas,tour:tourOpen,stats:statsOpen,collection:collectionOpen};
})();
