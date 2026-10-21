// SPIDER — Supabase Edge Function "spider" v10 + chess (social + domino + daily word + chess)
// Live v8 plus the Ball Clash coin shop. Paste this whole file into
// Supabase Dashboard → Edge Functions → spider → Code → Deploy.
// Rollback is the saved v8 file (v8.index.ts). Do not deploy until Mohammed approves.
// Supabase provides SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to every function.
// Daily word is the exception. Set KALIMA_SECRET, or one row in public.game_secrets, before turning it on.
// Without that secret the daily game stays off and the function does not send an answer.
// Shop balls are added by BC_NEW_DATA.apply inside the pasted scripts below.
// Do not also call merge(): apply already defined those ids, and merge throws.
// @ts-nocheck
/* BALL CLASH — battle engine v2. Shared by the browser and the server.
   Deterministic: fixed 60 Hz steps, one seeded random stream, trig built from + − × ÷ only.
   Every ball is data: a weapon shape, on-hit effects, a periodic ability, passives and a capped growth path. */
var BC=(function(){
"use strict";
var PI=3.141592653589793,TAU=6.283185307179586,DT=1/60;
function dsin(x){x=x-TAU*Math.floor((x+PI)/TAU);if(x>PI/2)x=PI-x;else if(x<-PI/2)x=-PI-x;var q=x*x;return x*(1-q/6*(1-q/20*(1-q/42*(1-q/72*(1-q/110*(1-q/156))))))}
function dcos(x){return dsin(x+PI/2)}
function rng(seed){var a=seed>>>0;return function(){a=(a+0x6D2B79F5)|0;var t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return ((t^(t>>>14))>>>0)/4294967296}}
function clamp(v,a,b){return v<a?a:v>b?b:v}
/* ===== the catalogue lives in BC.KINDS (filled by bc_kinds below) ===== */
var KINDS={},ORDER=[];
function def(o){var k={hp:95,mass:1,r:25,spin:3,cd:.35,kb:140,dmg:5,len:40,role:"melee",w:"blade",on:{},ab:null,grow:{},cap:{},pw:1,color:"#C9D6E8",tags:[]};for(var key in o)k[key]=o[key];KINDS[k.id]=k;ORDER.push(k.id);return k}
/* ===== set-up ===== */
function newBall(st,kid,team,x,y,opt){
  var K=KINDS[kid]||KINDS.sword,R=st.R,va=R()*TAU,sp=170+R()*60,hp=(opt&&opt.hp)||Math.round(K.hp*(K.hpf||1)*(st.hpMul||1));
  var b={i:st.balls.length,team:team,kind:K.id,K:K,x:x,y:y,vx:dcos(va)*sp,vy:dsin(va)*sp,r:K.r,m:K.mass,hp:hp,maxHp:hp,alive:true,
    ang:R()*TAU,dir:R()<.5?-1:1,spin:K.spin,dmg:K.dmg,len:K.len,head:K.head||0,kb:K.kb,count:K.count||1,cdm:1,abT:K.ab?(K.ab.first!=null?K.ab.first:K.ab.cd*(.4+R()*.5)):0,
    pmul:1,extraN:0,chainUp:0,auraUp:0,shieldUp:0,hits:0,lvl:0,cd:{},dealt:0,taken:0,healed:0,koT:-1,s:{},shield:0,revived:false,summon:!!(opt&&opt.summon),ttl:opt&&opt.ttl||0,owner:opt&&opt.owner!=null?opt.owner:-1,
    still:!!(opt&&opt.still),cyc:0};
  if(K.shieldMax)b.shield=K.shieldMax*.5*(K.hpf||1);
  st.balls.push(b);return b;
}
function create(cfg){
  var size=cfg.size||560,st={W:size,H:size,t:0,step:0,seed:cfg.seed>>>0,R:rng(cfg.seed||1),balls:[],proj:[],zones:[],teams:[],events:[],over:false,winner:-1,draw:false,
    maxT:cfg.maxT||90,ff:!!cfg.ff,syn:cfg.synergy!==false,hpMul:cfg.hpMul||1,clash:{}};
  var nT=cfg.teams.length;
  cfg.teams.forEach(function(tm,ti){
    st.teams.push({name:tm.name||("فريق "+(ti+1)),color:tm.color||["#E62948","#8D65F6","#39FF88","#E6B85C","#4FB3FF","#FF8A5C","#F472B6","#9BF8FF"][ti%8]});
    var n=tm.balls.length,ang=TAU*ti/nT+PI,cx=size/2+dcos(ang)*size*.32,cy=size/2+dsin(ang)*size*.32;
    tm.balls.forEach(function(kid,k){var col=Math.ceil(Math.sqrt(n)),row=Math.floor(k/col),c=k%col,off=(c-(col-1)/2)*58,offr=row*58;
      var px=-dsin(ang)*off-dcos(ang)*offr,py=dcos(ang)*off-dsin(ang)*offr;var nb=newBall(st,kid,ti,clamp(cx+px,40,size-40),clamp(cy+py,40,size-40));
      if(cfg.boost&&cfg.boost.team===ti){nb.boost=cfg.boost.f;nb.maxHp=Math.round(nb.maxHp*cfg.boost.f);nb.hp=nb.maxHp}});
  });
  st.syn=st.syn?synergies(st):[];
  return st;
}
/* ===== team synergies: real mechanics, capped ===== */
var SYN=[
  {a:"fire",b:"wind",id:"firewind",ar:"النار + الرياح: الحرق ينتشر"},
  {a:"water",b:"lightning",id:"wetshock",ar:"الماء + البرق: صعق مضاعف للمبلولين"},
  {a:"ice",b:"hammer",id:"shatter",ar:"الثلج + المطرقة: ضرر إضافي للمجمّدين"},
  {a:"poison",b:"vampire",id:"toxicblood",ar:"السم + مصاص الدماء: السم يعالج الفريق شوي"},
  {a:"spider",b:"scorpion",id:"webvenom",ar:"العنكبوت + العقرب: المحاصر بالخيوط يتسمم"},
  {a:"gravity",b:"rocket",id:"gravrocket",ar:"الجاذبية + الصواريخ: الصواريخ تنفجر أوسع"},
  {a:"shield",b:"laser",id:"guardbeam",ar:"الدرع + الليزر: حماية للفريق"},
  {a:"blackhole",b:"lightning",id:"stormwell",ar:"الثقب الأسود + البرق: صعق المتجمعين"}
];
function synergies(st){var out=[];st.teams.forEach(function(t,ti){var has={};st.balls.forEach(function(b){if(b.team===ti)has[b.kind]=1});
  SYN.forEach(function(s){if(has[s.a]&&has[s.b])out.push({team:ti,id:s.id,ar:s.ar})})});return out}
function hasSyn(st,team,id){for(var i=0;i<st.syn.length;i++)if(st.syn[i].team===team&&st.syn[i].id===id)return true;return false}
/* ===== geometry of weapons ===== */
function seg(b,a,r0,r1,w,hurt,p,round){var c=dcos(a),s=dsin(a);return {x1:b.x+c*r0,y1:b.y+s*r0,x2:b.x+c*r1,y2:b.y+s*r1,w:w,hurt:hurt,p:p,round:!!round}}
function parts(b){
  var K=b.K,o=[],i,a,r=b.r;
  switch(K.w){
    case "blade":o.push(seg(b,b.ang,r*.8,r+b.len,K.thick||5,true,0));break;
    case "blades":for(i=0;i<b.count;i++)o.push(seg(b,b.ang+TAU*i/b.count,r*.8,r+b.len,K.thick||5,true,i));break;
    case "orbit":for(i=0;i<b.count;i++){a=b.ang+TAU*i/b.count;o.push(seg(b,a,r+(K.orbit||15)-b.len/2,r+(K.orbit||15)+b.len/2,K.thick||4,true,i))}break;
    case "pole":{var rt=r+b.len*(1-(K.tip||.3));o.push(seg(b,b.ang,r*.5,rt,3,false,0));o.push(seg(b,b.ang,rt,r+b.len,5,true,1));break}
    case "poles":for(i=0;i<b.count;i++){a=b.ang+TAU*i/b.count;var rt2=r+b.len*(1-(K.tip||.3));o.push(seg(b,a,r*.5,rt2,3,false,i*2));o.push(seg(b,a,rt2,r+b.len,5,true,i*2+1))}break;
    case "hammer":o.push(seg(b,b.ang,r*.6,r+b.len,4,false,0));var hs=seg(b,b.ang,r+b.len,r+b.len,b.head*2,true,1,true);o.push(hs);break;
    case "discs":for(i=0;i<b.count;i++){a=b.ang+TAU*i/b.count;o.push(seg(b,a,r+b.len,r+b.len,(b.head||9)*2,true,i,true))}break;
    case "scythe":{o.push(seg(b,b.ang,r*.6,r+b.len,4,false,0));var c=dcos(b.ang),s=dsin(b.ang),ex=b.x+c*(r+b.len),ey=b.y+s*(r+b.len),pa=b.ang+PI/2*b.dir;
      var k1=dcos(pa),k2=dsin(pa),L=b.len*.55;o.push({x1:ex,y1:ey,x2:ex+k1*L*.6-c*L*.25,y2:ey+k2*L*.6-s*L*.25,w:5,hurt:true,p:1});o.push({x1:ex+k1*L*.6-c*L*.25,y1:ey+k2*L*.6-s*L*.25,x2:ex+k1*L-c*L*.75,y2:ey+k2*L-s*L*.75,w:4,hurt:true,p:2});break}
    case "beam":o.push(seg(b,b.ang,r,r+b.len,K.thick||3,true,0));break;
    case "none":default:break;
  }
  return o;
}
function segD2(px,py,x1,y1,x2,y2){var dx=x2-x1,dy=y2-y1,L=dx*dx+dy*dy,t=L>0?((px-x1)*dx+(py-y1)*dy)/L:0;t=t<0?0:t>1?1:t;var qx=x1+t*dx-px,qy=y1+t*dy-py;return qx*qx+qy*qy}
function segSeg(a,b){var d=Math.min(segD2(a.x1,a.y1,b.x1,b.y1,b.x2,b.y2),segD2(a.x2,a.y2,b.x1,b.y1,b.x2,b.y2),segD2(b.x1,b.y1,a.x1,a.y1,a.x2,a.y2),segD2(b.x2,b.y2,a.x1,a.y1,a.x2,a.y2)),rr=(a.w+b.w)/2;if(d<=rr*rr)return true;
  var d1=(b.x2-b.x1)*(a.y1-b.y1)-(b.y2-b.y1)*(a.x1-b.x1),d2=(b.x2-b.x1)*(a.y2-b.y1)-(b.y2-b.y1)*(a.x2-b.x1),d3=(a.x2-a.x1)*(b.y1-a.y1)-(a.y2-a.y1)*(b.x1-a.x1),d4=(a.x2-a.x1)*(b.y2-a.y1)-(a.y2-a.y1)*(b.x2-a.x1);
  return ((d1>0)!==(d2>0))&&((d3>0)!==(d4>0))}
function foe(st,a,b){return a.team!==b.team||(st.ff&&a!==b)}
function nearestFoe(st,b,exInvis){var best=null,bd=1e18;for(var j=0;j<st.balls.length;j++){var o=st.balls[j];if(!o.alive||!foe(st,b,o))continue;if(exInvis&&o.s.invis>0)continue;var dx=o.x-b.x,dy=o.y-b.y,d=dx*dx+dy*dy;if(d<bd){bd=d;best=o}}return best}
/* ===== damage pipeline ===== */
function heal(st,b,v){if(!b.alive||v<=0)return;var h=Math.min(v,b.maxHp-b.hp);b.hp+=h;b.healed+=h;if(h>.5)st.events.push({t:"heal",i:b.i,v:h})}
function damage(st,src,tgt,amt,how,x,y){
  if(!tgt.alive||amt<=0)return 0;var K=tgt.K;
  if(K.dodge&&how!=="dot"&&st.R()<K.dodge){st.events.push({t:"dodge",i:tgt.i,x:tgt.x,y:tgt.y});return 0}
  if(src){var SK=src.K;amt*=(SK.pw||1)*(src.boost||1)*(src.aw||1);
    if(SK.berserk)amt*=1+(1-src.hp/src.maxHp)*SK.berserk;
    if(SK.crit&&how!=="dot"&&st.R()<SK.crit){amt*=2;st.events.push({t:"crit",x:x!=null?x:tgt.x,y:y!=null?y:tgt.y})}
    if(tgt.s.freeze>0&&hasSyn(st,src.team,"shatter"))amt*=1.3;
    if(tgt.s.wet>0&&src.K.id==="lightning"&&hasSyn(st,src.team,"wetshock"))amt*=1.5;}
  if(K.armor)amt*=1-K.armor;
  if(tgt.shield>0){var ab=Math.min(tgt.shield,amt);tgt.shield-=ab;amt-=ab;if(ab>0)st.events.push({t:"block",i:tgt.i,x:tgt.x,y:tgt.y})}
  if(amt<=0)return 0;
  tgt.hp-=amt;tgt.taken+=amt;if(src){src.dealt+=amt;if(src.K.lifesteal)heal(st,src,amt*src.K.lifesteal)}
  if(src&&K.reflect&&how!=="reflect"&&how!=="dot"&&src.alive){var rf=amt*K.reflect;src.hp-=rf;src.taken+=rf;tgt.dealt+=rf;st.events.push({t:"reflect",i:tgt.i,x:src.x,y:src.y});if(src.hp<=0)ko(st,src,tgt)}
  if(how!=="dot")st.events.push({t:"hit",a:src?src.i:-1,b:tgt.i,dmg:Math.round(amt*10)/10,x:x!=null?x:tgt.x,y:y!=null?y:tgt.y,kind:src?src.kind:""});
  if(tgt.hp<=0)ko(st,tgt,src);
  return amt;
}
function ko(st,b,by){
  if(!b.alive)return;
  if(b.K.revive&&!b.revived){b.revived=true;b.hp=b.maxHp*b.K.revive;b.s={};st.events.push({t:"revive",i:b.i,x:b.x,y:b.y});return}
  b.hp=0;b.alive=false;b.koT=st.t;st.events.push({t:"ko",i:b.i,by:by?by.i:-1,x:b.x,y:b.y});
}
function applyFx(st,src,tgt,fx){
  if(!fx||!tgt.alive)return;var s=tgt.s;
  if(fx.burn){s.burn=Math.max(s.burn||0,fx.burn[1]);s.burnD=Math.min(6,Math.max(s.burnD||0,fx.burn[0]));s.burnBy=src?src.i:-1}
  if(fx.poison){s.poison=Math.max(s.poison||0,fx.poison[1]);s.poisonD=Math.min(4,(s.poisonD||0)+fx.poison[0]);s.poisonBy=src?src.i:-1}
  if(fx.slow){s.slow=Math.max(s.slow||0,fx.slow[1]);s.slowF=Math.min(s.slowF||1,fx.slow[0])}
  if(fx.freeze){s.chill=(s.chill||0)+1;if(s.chill>=fx.freeze[0]){s.freeze=fx.freeze[1];s.chill=0;st.events.push({t:"freeze",i:tgt.i})}}
  if(fx.web){s.web=Math.max(s.web||0,fx.web)}
  if(fx.wet){s.wet=Math.max(s.wet||0,fx.wet)}
  if(fx.stun){s.stun=Math.max(s.stun||0,fx.stun)}
  if(fx.knock&&src){var kx=tgt.x-src.x,ky=tgt.y-src.y,kl=Math.sqrt(kx*kx+ky*ky)||1;tgt.vx+=kx/kl*fx.knock/tgt.m;tgt.vy+=ky/kl*fx.knock/tgt.m}
  if(fx.chain&&src)chain(st,src,tgt,fx.chain[0],fx.chain[1]);
  if(src&&src.K.id==="scorpion"&&tgt.s.web>0&&hasSyn(st,src.team,"webvenom")){s.poison=3;s.poisonD=Math.min(5,(s.poisonD||0)+1.5)}
}
function chain(st,src,first,n,dmg){var hitSet={},cur=first,count=n+(src.chainUp||0);hitSet[first.i]=1;
  for(var k=0;k<count;k++){var best=null,bd=170*170;for(var j=0;j<st.balls.length;j++){var o=st.balls[j];if(!o.alive||hitSet[o.i]||!foe(st,src,o))continue;var dx=o.x-cur.x,dy=o.y-cur.y,d=dx*dx+dy*dy;if(d<bd){bd=d;best=o}}
    if(!best)break;st.events.push({t:"bolt",x1:cur.x,y1:cur.y,x2:best.x,y2:best.y});hitSet[best.i]=1;damage(st,src,best,dmg,"chain");cur=best}}
/* ===== projectiles, zones, summons ===== */
function shoot(st,b,tx,ty,p,spread,n){
  var dx=tx-b.x,dy=ty-b.y,dl=Math.sqrt(dx*dx+dy*dy)||1,ux=dx/dl,uy=dy/dl;n=n||1;
  for(var k=0;k<n;k++){var off=n>1?(k-(n-1)/2)*(spread||.2):0,c=dcos(off),s=dsin(off),vx=ux*c-uy*s,vy=ux*s+uy*c,v=p.v||420;
    st.proj.push({x:b.x+vx*(b.r+6),y:b.y+vy*(b.r+6),vx:vx*v,vy:vy*v,r:p.r||5,dmg:p.dmg*(b.pmul||1),team:b.team,owner:b.i,ttl:p.ttl||2,age:0,pierce:p.pierce||0,
      home:p.home||0,bounce:p.bounce||0,ret:!!p.ret,fx:p.fx||null,type:p.type||"orb",color:p.color||b.K.color,splash:p.splash||0,hitIds:{}})}
}
function zone(st,b,x,y,z){st.zones.push({x:x,y:y,r:z.r||50,ttl:z.ttl||3,age:0,team:b.team,owner:b.i,type:z.type,dps:(z.dps||0)*(b.pmul||1),fx:z.fx||null,pull:z.pull||0,push:z.push||0,delay:z.delay||0,boom:z.boom||0,follow:!!z.follow,color:z.color||b.K.color,trig:!!z.trig,done:false})}
function summon(st,b,kid,ttl,hpf,still){var o=newBall(st,kid,b.team,clamp(b.x+(st.R()-.5)*60,30,st.W-30),clamp(b.y+(st.R()-.5)*60,30,st.H-30),{summon:true,ttl:ttl,owner:b.i,hp:Math.max(8,Math.round(b.maxHp*hpf)),still:still});o.abT=.5;st.events.push({t:"summon",i:o.i});return o}
/* ===== abilities ===== */
function ability(st,b,ab){
  var tg=nearestFoe(st,b,true)||nearestFoe(st,b,false);if(!tg&&ab.t!=="shield"&&ab.t!=="heal")return;
  switch(ab.t){
    case "shoot":shoot(st,b,tg.x,tg.y,ab.p,ab.spread,(ab.n||1)+(b.extraN||0));break;
    case "nova":for(var k=0;k<(ab.n||8);k++){var a=TAU*k/(ab.n||8)+b.ang;shoot(st,b,b.x+dcos(a)*100,b.y+dsin(a)*100,ab.p)}break;
    case "breath":shoot(st,b,tg.x,tg.y,ab.p,.13,(ab.n||5)+(b.extraN||0));break;
    case "zoneSelf":zone(st,b,b.x,b.y,ab.z);break;
    case "zoneTarget":zone(st,b,tg.x,tg.y,ab.z);break;
    case "strike":var ts=st.balls.filter(function(o){return o.alive&&foe(st,b,o)});for(var q=0;q<Math.min(ts.length,(ab.n||2)+(b.extraN||0));q++){var o=ts[Math.floor(st.R()*ts.length)];zone(st,b,o.x,o.y,ab.z)}break;
    case "blink":{var dx=tg.x-b.x,dy=tg.y-b.y,dl=Math.sqrt(dx*dx+dy*dy)||1;b.x=clamp(tg.x+dx/dl*(tg.r+b.r+8),b.r,st.W-b.r);b.y=clamp(tg.y+dy/dl*(tg.r+b.r+8),b.r,st.H-b.r);
      st.events.push({t:"blink",i:b.i,x:b.x,y:b.y});if(ab.invis)b.s.invis=ab.invis;if(ab.dmg)damage(st,b,tg,ab.dmg,"ability",tg.x,tg.y);break}
    case "invis":b.s.invis=ab.dur||1.5;st.events.push({t:"fade",i:b.i});break;
    case "clone":var live=st.balls.filter(function(o){return o.alive&&o.summon&&o.owner===b.i}).length;if(live<(ab.max||2))summon(st,b,ab.kid||b.kind,ab.ttl||6,ab.hpf||.25,false);break;
    case "summon":var lv=st.balls.filter(function(o){return o.alive&&o.summon&&o.owner===b.i}).length;if(lv<(ab.max||1)+(b.extraN||0))summon(st,b,ab.kid,ab.ttl||8,ab.hpf||.3,!!ab.still);break;
    case "shield":{var hf=b.K.hpf||1;b.shield=Math.min(((b.K.shieldMax||40)+(b.shieldUp||0))*hf,b.shield+(ab.v||15)*hf)};if(hasSyn(st,b.team,"guardbeam"))st.balls.forEach(function(o){if(o.alive&&o.team===b.team&&o!==b)o.shield=Math.min(30,o.shield+6)});st.events.push({t:"shieldup",i:b.i});break;
    case "heal":st.balls.forEach(function(o){if(o.alive&&o.team===b.team){var dx=o.x-b.x,dy=o.y-b.y;if(dx*dx+dy*dy<(ab.r||160)*(ab.r||160))heal(st,o,ab.v||8)}});break;
    case "chain":damage(st,b,tg,ab.dmg,"ability",tg.x,tg.y);st.events.push({t:"bolt",x1:b.x,y1:b.y,x2:tg.x,y2:tg.y});chain(st,b,tg,ab.n||2,ab.dmg*.7);applyFx(st,b,tg,ab.fx);break;
    case "pull":zone(st,b,b.x,b.y,{type:"pull",r:ab.r||170,ttl:ab.dur||1.2,pull:ab.f||260,follow:true,color:b.K.color});break;
    case "random":ability(st,b,ab.list[Math.floor(st.R()*ab.list.length)]);break;
    case "cycle":ability(st,b,ab.list[b.cyc%ab.list.length]);b.cyc++;break;
  }
}
/* ===== growth after a hit (per-ball path, always capped) ===== */
function grow(st,b){var K=b.K,g=K.grow,c=K.cap;b.hits++;b.lvl++;
  for(var key in g){if(key==="addAt")continue;var cur=b[key]!=null?b[key]:0;b[key]=Math.min(cur+g[key],c[key]!=null?c[key]:cur+g[key])}
  if(g.addAt&&g.addAt.indexOf(b.hits)>=0&&b.count<(c.count||6)){b.count++;st.events.push({t:"up",i:b.i,what:K.addName||"قطعة إضافية"})}
  if(!b.awake&&b.hits>=8&&!b.summon){b.awake=true;b.aw=1.2;b.spin=b.spin*1.12;st.events.push({t:"awake",i:b.i})}
  else if(b.lvl%5===0)st.events.push({t:"lvl",i:b.i,lvl:b.lvl})}
/* ===== one fixed step ===== */
function step(st){
  if(st.over)return st;st.events=[];var B=st.balls,n=B.length,i,j,a,b,k;
  for(i=0;i<n;i++){a=B[i];if(!a.alive)continue;var s=a.s;
    if(a.summon&&a.ttl>0){a.ttl-=DT;if(a.ttl<=0){a.alive=false;a.koT=st.t;st.events.push({t:"vanish",i:a.i,x:a.x,y:a.y});continue}}
    for(var tk in s)if(typeof s[tk]==="number"&&tk!=="burnD"&&tk!=="poisonD"&&tk!=="slowF"&&tk!=="chill"&&tk!=="burnBy"&&tk!=="poisonBy"&&s[tk]>0)s[tk]=Math.max(0,s[tk]-DT);
    if(s.burn>0){damage(st,B[s.burnBy]||null,a,s.burnD*DT,"dot");if(hasSyn(st,(B[s.burnBy]||{}).team,"firewind")&&st.step%30===0)for(j=0;j<n;j++){b=B[j];if(b!==a&&b.alive&&b.team===a.team){var fx0=b.x-a.x,fy0=b.y-a.y;if(fx0*fx0+fy0*fy0<90*90){b.s.burn=Math.max(b.s.burn||0,1.5);b.s.burnD=Math.max(b.s.burnD||0,2)}}}}
    if(s.poison>0){var pb=B[s.poisonBy]||null;damage(st,pb,a,s.poisonD*DT,"dot");if(pb&&hasSyn(st,pb.team,"toxicblood")&&st.step%20===0)B.forEach(function(o){if(o.alive&&o.team===pb.team)heal(st,o,.4)})}
    if(!a.alive)continue;if(!(s.slow>0))s.slowF=1;if(!(s.burn>0))s.burnD=0;if(!(s.poison>0))s.poisonD=0;
    var slowF=(s.freeze>0?.25:1)*(s.slow>0?(s.slowF||1):1)*(s.web>0?.55:1)*(s.stun>0?.3:1);
    if(a.still){a.vx=0;a.vy=0}else{
      var tg=nearestFoe(st,a,true)||nearestFoe(st,a,false);
      if(tg){var ex=tg.x-a.x,ey=tg.y-a.y,el=Math.sqrt(ex*ex+ey*ey)||1,role=a.K.role,acc=150;
        if(role==="ranged"){var pref=a.K.range||230;acc=el<pref?-170:el>pref+60?120:0}
        else if(role==="support"){var ally=null,ad=1e18;for(j=0;j<n;j++){b=B[j];if(b===a||!b.alive||b.team!==a.team||b.summon)continue;var dx0=b.x-a.x,dy0=b.y-a.y,d0=dx0*dx0+dy0*dy0;if(d0<ad){ad=d0;ally=b}}
          if(ally&&ad>110*110){var al=Math.sqrt(ad);a.vx+=(ally.x-a.x)/al*140*DT;a.vy+=(ally.y-a.y)/al*140*DT;acc=0}else acc=el<170?-120:60}
        else if(role==="reach"){var want=a.r+a.len*.8+tg.r;acc=el<want?-60:150}
        a.vx+=ex/el*acc*DT;a.vy+=ey/el*acc*DT}
      var sp=Math.sqrt(a.vx*a.vx+a.vy*a.vy),lo=150*slowF,hi=420*Math.max(slowF,.35);if(a.K.fast){lo*=1.25;hi*=1.2}
      if(sp<lo){if(sp<=1){a.vx=lo;a.vy=0}else{a.vx*=lo/sp;a.vy*=lo/sp}}else if(sp>hi){a.vx*=hi/sp;a.vy*=hi/sp}
      a.x+=a.vx*DT;a.y+=a.vy*DT;
      if(a.x<a.r){a.x=a.r;a.vx=Math.abs(a.vx)}else if(a.x>st.W-a.r){a.x=st.W-a.r;a.vx=-Math.abs(a.vx)}
      if(a.y<a.r){a.y=a.r;a.vy=Math.abs(a.vy)}else if(a.y>st.H-a.r){a.y=st.H-a.r;a.vy=-Math.abs(a.vy)}}
    a.ang+=a.spin*a.dir*DT*(s.freeze>0?.2:1)*(s.stun>0?0:1)*Math.min(1,slowF*1.4);a.ang=a.ang-TAU*Math.floor(a.ang/TAU);
    if(a.K.ab&&(!a.summon||a.K.unit)&&!(s.freeze>0)&&!(s.stun>0)){a.abT-=DT;if(a.abT<=0){ability(st,a,a.K.ab);if(a.K.growOnAb)grow(st,a);a.abT=a.K.ab.cd*(a.cdm||1)}}
    if(a.K.aura&&st.step%15===0)for(j=0;j<n;j++){b=B[j];if(!b.alive||!foe(st,a,b))continue;var axd=b.x-a.x,ayd=b.y-a.y,ar=a.K.aura.r+(a.auraUp||0);if(axd*axd+ayd*ayd<ar*ar){damage(st,a,b,a.K.aura.dps/4,"aura",b.x,b.y);applyFx(st,a,b,a.K.aura.fx)}}
    if(a.K.regen&&st.step%30===0)heal(st,a,a.K.regen/2);
  }
  for(i=0;i<n;i++){a=B[i];if(!a.alive)continue;for(j=i+1;j<n;j++){b=B[j];if(!b.alive)continue;
    var dx2=b.x-a.x,dy2=b.y-a.y,rs=a.r+b.r,d2=dx2*dx2+dy2*dy2;if(d2>=rs*rs||d2===0)continue;var dd=Math.sqrt(d2),nx=dx2/dd,ny=dy2/dd,ov=rs-dd,ma=a.still?1e6:a.m,mb=b.still?1e6:b.m,tm=ma+mb;
    a.x-=nx*ov*mb/tm;a.y-=ny*ov*mb/tm;b.x+=nx*ov*ma/tm;b.y+=ny*ov*ma/tm;var rv=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;
    if(rv<0){var imp=-2*rv/tm;if(!a.still){a.vx-=imp*mb*nx;a.vy-=imp*mb*ny}if(!b.still){b.vx+=imp*ma*nx;b.vy+=imp*ma*ny}st.events.push({t:"bump",x:(a.x+b.x)/2,y:(a.y+b.y)/2})}
    if(foe(st,a,b)){if(a.K.contact&&(a.cd["c"+b.i]||-1)<=st.t){a.cd["c"+b.i]=st.t+.4;damage(st,a,b,a.K.contact,"contact",b.x,b.y)}if(b.K.contact&&(b.cd["c"+a.i]||-1)<=st.t){b.cd["c"+a.i]=st.t+.4;damage(st,b,a,b.K.contact,"contact",a.x,a.y)}}}}
  var P=[];for(i=0;i<n;i++)P.push(B[i].alive&&!(B[i].s.stun>0)?parts(B[i]):[]);
  for(i=0;i<n;i++){a=B[i];if(!a.alive||a.K.w==="beam")continue;for(j=i+1;j<n;j++){b=B[j];if(!b.alive||!foe(st,a,b)||b.K.w==="beam")continue;
    var key=i+":"+j;if(st.clash[key]>st.t)continue;var hit=false;
    for(var p=0;p<P[i].length&&!hit;p++)for(var q=0;q<P[j].length&&!hit;q++)if(segSeg(P[i][p],P[j][q])){hit=true;a.dir=-a.dir;b.dir=-b.dir;st.clash[key]=st.t+.25;
      if(a.K.id==="magnet"||b.K.id==="magnet"){var m=a.K.id==="magnet"?b:a;m.s.stun=Math.max(m.s.stun||0,.4)}
      st.events.push({t:"clash",x:(P[i][p].x2+P[j][q].x2)/2,y:(P[i][p].y2+P[j][q].y2)/2})}}}
  for(i=0;i<n;i++){a=B[i];if(!a.alive)continue;
    for(var pp=0;pp<P[i].length;pp++){var sg=P[i][pp];if(!sg.hurt)continue;
      for(j=0;j<n;j++){b=B[j];if(j===i||!b.alive||!foe(st,a,b))continue;var ck=i+">"+j+">"+sg.p;if((a.cd[ck]||-1)>st.t)continue;
        var d3=segD2(b.x,b.y,sg.x1,sg.y1,sg.x2,sg.y2),rr=b.r+sg.w/2;if(d3>rr*rr)continue;
        a.cd[ck]=st.t+a.K.cd*(a.cdm||1);var dealt=damage(st,a,b,a.dmg,"melee",sg.x2,sg.y2);
        if(dealt>0||b.shield>0){if(a.kb){var kx=b.x-a.x,ky=b.y-a.y,kl=Math.sqrt(kx*kx+ky*ky)||1;b.vx+=kx/kl*a.kb/b.m;b.vy+=ky/kl*a.kb/b.m}applyFx(st,a,b,a.K.on);grow(st,a)}}}}
  for(k=st.proj.length-1;k>=0;k--){var pr=st.proj[k],ow=B[pr.owner];pr.age+=DT;
    if(pr.home&&ow){var ht=nearestFoe(st,{x:pr.x,y:pr.y,team:pr.team},true);if(ht){var hx=ht.x-pr.x,hy=ht.y-pr.y,hl=Math.sqrt(hx*hx+hy*hy)||1,vl=Math.sqrt(pr.vx*pr.vx+pr.vy*pr.vy);pr.vx+=(hx/hl*vl-pr.vx)*pr.home*DT;pr.vy+=(hy/hl*vl-pr.vy)*pr.home*DT}}
    if(pr.ret&&ow&&ow.alive&&pr.age>pr.ttl*.45){var rx=ow.x-pr.x,ry=ow.y-pr.y,rl=Math.sqrt(rx*rx+ry*ry)||1,rv2=Math.sqrt(pr.vx*pr.vx+pr.vy*pr.vy);pr.vx+=(rx/rl*rv2-pr.vx)*4*DT;pr.vy+=(ry/rl*rv2-pr.vy)*4*DT;if(rl<ow.r){st.proj.splice(k,1);continue}}
    var slowed=1;for(var zz=0;zz<st.zones.length;zz++){var z=st.zones[zz];if(z.type==="time"&&z.team!==pr.team){var zx=pr.x-z.x,zy=pr.y-z.y;if(zx*zx+zy*zy<z.r*z.r)slowed=.4}}
    pr.x+=pr.vx*DT*slowed;pr.y+=pr.vy*DT*slowed;
    var gone=pr.age>pr.ttl;
    if(pr.x<pr.r||pr.x>st.W-pr.r||pr.y<pr.r||pr.y>st.H-pr.r){if(pr.bounce>0){pr.bounce--;if(pr.x<pr.r||pr.x>st.W-pr.r)pr.vx=-pr.vx;if(pr.y<pr.r||pr.y>st.H-pr.r)pr.vy=-pr.vy;pr.x=clamp(pr.x,pr.r,st.W-pr.r);pr.y=clamp(pr.y,pr.r,st.H-pr.r);pr.hitIds={}}else if(!pr.ret)gone=true}
    for(j=0;j<n&&!gone;j++){b=B[j];if(!b.alive||b.team===pr.team&&!st.ff||b.i===pr.owner||pr.hitIds[b.i])continue;
      if(b.K.absorb){var vx=pr.x-b.x,vy=pr.y-b.y;if(vx*vx+vy*vy<(b.r+60)*(b.r+60)){heal(st,b,pr.dmg*.5);st.events.push({t:"absorb",i:b.i,x:pr.x,y:pr.y});gone=true;break}}
      var qx=b.x-pr.x,qy=b.y-pr.y,rr2=b.r+pr.r;if(qx*qx+qy*qy>rr2*rr2)continue;
      pr.hitIds[b.i]=1;var src=ow||null;damage(st,src,b,pr.dmg,"proj",pr.x,pr.y);applyFx(st,src,b,pr.fx);
      if(src&&pr.dmg>0&&src.K.growOnProj)grow(st,src);
      if(pr.splash){var sr=pr.splash*(hasSyn(st,pr.team,"gravrocket")?1.4:1);st.events.push({t:"boom",x:pr.x,y:pr.y,r:sr});for(var u=0;u<n;u++){var o=B[u];if(o===b||!o.alive||o.team===pr.team)continue;var ox=o.x-pr.x,oy=o.y-pr.y;if(ox*ox+oy*oy<sr*sr)damage(st,src,o,pr.dmg*.5,"splash",o.x,o.y)}}
      if(pr.pierce>0)pr.pierce--;else gone=true}
    if(gone)st.proj.splice(k,1)}
  for(k=st.zones.length-1;k>=0;k--){var zn=st.zones[k],zo=B[zn.owner];zn.age+=DT;if(zn.follow&&zo&&zo.alive){zn.x=zo.x;zn.y=zo.y}
    if(zn.delay>0){if(zn.age>=zn.delay&&!zn.done){zn.done=true;st.events.push({t:"boom",x:zn.x,y:zn.y,r:zn.r});for(j=0;j<n;j++){b=B[j];if(!b.alive||b.team===zn.team)continue;var bx=b.x-zn.x,by=b.y-zn.y;if(bx*bx+by*by<(zn.r+b.r)*(zn.r+b.r)){damage(st,zo||null,b,zn.boom,"zone",b.x,b.y);applyFx(st,zo||null,b,zn.fx)}}}
      if(zn.age>=zn.delay+.2){st.zones.splice(k,1)}continue}
    if(zn.trig){var trg=false;for(j=0;j<n;j++){b=B[j];if(!b.alive||b.team===zn.team)continue;var tx=b.x-zn.x,ty=b.y-zn.y;if(tx*tx+ty*ty<(zn.r*.5+b.r)*(zn.r*.5+b.r)){trg=true;break}}
      if(trg){st.events.push({t:"boom",x:zn.x,y:zn.y,r:zn.r});for(j=0;j<n;j++){b=B[j];if(!b.alive||b.team===zn.team)continue;var mx=b.x-zn.x,my=b.y-zn.y;if(mx*mx+my*my<(zn.r+b.r)*(zn.r+b.r))damage(st,zo||null,b,zn.boom,"zone",b.x,b.y)}st.zones.splice(k,1);continue}}
    for(j=0;j<n;j++){b=B[j];if(!b.alive||b.team===zn.team&&zn.type!=="heal")continue;var gx=b.x-zn.x,gy=b.y-zn.y,g2=gx*gx+gy*gy;if(g2>(zn.r+b.r)*(zn.r+b.r))continue;var gl=Math.sqrt(g2)||1;
      if(zn.type==="heal"){if(b.team===zn.team&&st.step%15===0)heal(st,b,zn.dps/4);continue}
      if(zn.dps&&st.step%15===0)damage(st,zo||null,b,zn.dps/4,"zone",b.x,b.y);
      if(zn.fx&&st.step%15===0)applyFx(st,zo||null,b,zn.fx);
      if(zn.pull){b.vx-=gx/gl*zn.pull*DT;b.vy-=gy/gl*zn.pull*DT;if(zn.type==="pull"&&zo&&hasSyn(st,zo.team,"stormwell")&&st.step%30===0)damage(st,zo,b,1.5,"zone",b.x,b.y)}
      if(zn.push){b.vx+=gx/gl*zn.push*DT;b.vy+=gy/gl*zn.push*DT}
      if(zn.type==="time"){b.s.slow=Math.max(b.s.slow||0,.2);b.s.slowF=Math.min(b.s.slowF||1,.6)}}
    if(zn.age>=zn.ttl)st.zones.splice(k,1)}
  st.t+=DT;st.step++;
  var left={},anyMain=false;for(i=0;i<B.length;i++)if(B[i].alive&&!B[i].summon){left[B[i].team]=1;anyMain=true}
  var tl=Object.keys(left);
  if(tl.length<=1){st.over=true;st.winner=tl.length?+tl[0]:-1;st.draw=!tl.length;st.events.push({t:"end"})}
  else if(st.t>=st.maxT){var sc={},bt=-1,bv=-1,tie=false;for(i=0;i<B.length;i++){b=B[i];if(b.summon)continue;sc[b.team]=(sc[b.team]||0)+(b.alive?b.hp/b.maxHp:0)}
    for(var tkey in sc){if(sc[tkey]>bv+1e-9){bv=sc[tkey];bt=+tkey;tie=false}else if(Math.abs(sc[tkey]-bv)<=1e-9)tie=true}
    st.over=true;st.winner=tie?-1:bt;st.draw=tie;st.timeout=true;st.events.push({t:"end"})}
  return st;
}
function run(cfg){var st=create(cfg),guard=0;while(!st.over&&guard++<60*600)step(st);return st}
return {KINDS:KINDS,ORDER:ORDER,def:def,create:create,step:step,run:run,parts:parts,dsin:dsin,dcos:dcos,DT:DT,TAU:TAU,SYN:SYN,GROUPS:{weapon:"أسلحة",nature:"طبيعة",power:"قوى خارقة",creature:"مخلوقات",tech:"تقنية",legend:"أسطورية"}};
})();


/* BALL CLASH — the 60 balls (plus two summoned units). Data only; BC.def fills defaults. */
(function(BC){
"use strict";
var d=BC.def;
function sh(dmg,o){var p={dmg:dmg};for(var k in o)p[k]=o[k];return p}
/* ---------- weapons ---------- */
d({id:"sword",en:"Sword",ar:"السيف",group:"weapon",color:"#C9D6E8",w:"blade",len:46,dmg:8,spin:3.8,cd:.3,kb:160,hp:92,grow:{dmg:1,len:5},cap:{dmg:22,len:120},
  desc:"سيف يدور حوله. كل ضربة تطوّله وتزيد ضرره.",growTxt:"+١ ضرر و+٥ طول مع كل ضربة"});
d({id:"spear",en:"Spear",ar:"الرمح",group:"weapon",color:"#FFD86B",w:"pole",len:68,tip:.3,dmg:10,spin:2,cd:.45,kb:190,hp:92,role:"reach",grow:{len:5,dmg:.7},cap:{len:165,dmg:18},
  desc:"رمح طويل يضرب برأسه بس، ويحافظ على مسافته.",growTxt:"+٥ طول و+٠٫٧ ضرر"});
d({id:"dagger",en:"Dagger",ar:"الخناجر",group:"weapon",color:"#7FE8FF",w:"orbit",count:2,orbit:15,len:20,dmg:2.3,spin:5.5,cd:.25,kb:70,hp:92,mass:.9,
  grow:{spin:.38,dmg:.15,addAt:[6,14]},cap:{spin:15,dmg:5,count:4},addName:"خنجر إضافي",desc:"خنجرين يدورون بسرعة. يسرعون مع كل ضربة، ويزيد خنجر عند الضربة ٦ و١٤.",growTxt:"دوران أسرع وخناجر إضافية"});
d({id:"hammer",en:"Hammer",ar:"المطرقة",group:"weapon",color:"#FF8A5C",w:"hammer",len:42,head:13,dmg:11,spin:2.3,cd:.5,kb:300,hp:96,mass:1.2,r:27,grow:{head:.7,kb:20,dmg:.5},cap:{head:24,kb:560,dmg:16},
  desc:"مطرقة ثقيلة ترمي الخصم بعيد.",growTxt:"رأس أكبر ودفعة أقوى"});
d({id:"axe",en:"Axe",ar:"الفأس",group:"weapon",color:"#E0B080",w:"blade",thick:8,len:38,dmg:9,spin:2.8,cd:.45,kb:180,crit:.22,grow:{dmg:.8,len:3},cap:{dmg:18,len:80},
  desc:"فأس عريض، ربع ضرباته تقريبًا ضربات حرجة مضاعفة.",growTxt:"+٠٫٨ ضرر و+٣ طول"});
d({id:"katana",en:"Katana",ar:"الكاتانا",group:"weapon",color:"#F4F1EA",w:"blade",thick:3,len:44,dmg:3.8,spin:6.5,cd:.16,kb:60,fast:true,grow:{spin:.25,dmg:.18},cap:{spin:11,dmg:7},
  desc:"سيف خفيف سريع جدًا، ضربات كثيرة متتالية.",growTxt:"دوران أسرع وضرر أكبر"});
d({id:"chainsaw",en:"Chainsaw",ar:"المنشار",group:"weapon",color:"#FFB02E",w:"blade",thick:8,len:40,dmg:1.6,spin:2.4,cd:.09,kb:20,grow:{dmg:.06,len:2},cap:{dmg:3.2,len:80},
  desc:"منشار يقطع بشكل متواصل بدون دفع.",growTxt:"قطع أقوى وأطول"});
d({id:"flail",en:"Flail",ar:"الكرة الحديدية",group:"weapon",color:"#9AA6C0",w:"hammer",roundHead:true,len:70,head:11,dmg:8,spin:3.4,cd:.5,kb:240,grow:{len:3,head:.5,dmg:.4},cap:{len:115,head:18,dmg:14},
  desc:"كرة حديد على سلسلة طويلة تلف بقوة.",growTxt:"سلسلة أطول وكرة أكبر"});
d({id:"scythe",en:"Scythe",ar:"المنجل",group:"weapon",color:"#B9A2FF",w:"scythe",len:50,dmg:9,spin:2.6,cd:.45,kb:150,grow:{len:3,dmg:.6},cap:{len:90,dmg:17},
  desc:"منجل بنصل مقوّس يغطي مساحة واسعة.",growTxt:"نصل أوسع وضرر أكبر"});
d({id:"boomerang",en:"Boomerang",ar:"البومرنج",group:"weapon",color:"#FF6F61",w:"none",role:"ranged",range:200,growOnProj:true,
  ab:{t:"shoot",cd:1.1,p:sh(7,{v:380,r:7,ret:true,ttl:1.8,pierce:3,type:"boomerang"})},grow:{pmul:.05},cap:{pmul:1.8},desc:"يرمي بومرنج يقطع الخصوم ويرجع له.",growTxt:"ضرر الرمية يزيد"});
/* ---------- nature ---------- */
d({id:"fire",en:"Fire",ar:"النار",group:"nature",color:"#FF5A1F",w:"none",role:"ranged",growOnProj:true,ab:{t:"shoot",cd:1,p:sh(4,{v:380,r:8,type:"fire",fx:{burn:[3,2.5]}})},grow:{pmul:.04},cap:{pmul:1.7},
  desc:"كرات نار تحرق الخصم وتخليه يخسر صحة مع الوقت.",growTxt:"نار أقوى"});
d({id:"ice",en:"Ice",ar:"الثلج",group:"nature",color:"#BFF4FF",w:"none",role:"ranged",growOnProj:true,ab:{t:"shoot",cd:1.1,p:sh(5,{v:420,r:7,type:"ice",fx:{slow:[.6,1.6],freeze:[3,1.2]}})},grow:{pmul:.04},cap:{pmul:1.7},
  desc:"تبطّئ الخصم، وكل ٣ إصابات تجمّده ثانية.",growTxt:"ثلج أقوى"});
d({id:"lightning",en:"Lightning",ar:"البرق",group:"nature",color:"#FFE14D",w:"none",role:"ranged",growOnAb:true,ab:{t:"chain",cd:1.6,dmg:7,n:2},grow:{chainUp:.2},cap:{chainUp:4},
  desc:"صاعقة تقفز من خصم لخصم.",growTxt:"تقفز لأهداف أكثر"});
d({id:"poison",en:"Poison",ar:"السم",group:"nature",color:"#8CFF2E",w:"none",role:"ranged",growOnProj:true,ab:{t:"shoot",cd:.9,n:2,spread:.12,p:sh(2,{v:450,r:5,type:"dart",fx:{poison:[.8,3.5]}})},grow:{pmul:.03},cap:{pmul:1.6},
  desc:"سهام سم يتراكم مفعولها.",growTxt:"سم أقوى"});
d({id:"water",en:"Water",ar:"الماء",group:"nature",color:"#3FB7FF",w:"none",role:"ranged",growOnProj:true,ab:{t:"shoot",cd:1.3,p:sh(4,{v:320,r:14,type:"wave",pierce:2,fx:{knock:240,wet:3}})},grow:{pmul:.05},cap:{pmul:1.8},
  desc:"موجات تدفع الخصوم بعيد وتبللهم.",growTxt:"موجات أقوى"});
d({id:"wind",en:"Wind",ar:"الرياح",group:"nature",color:"#C8F7E8",w:"none",role:"ranged",growOnAb:true,ab:{t:"zoneTarget",cd:2.4,z:{type:"tornado",r:60,ttl:2.2,dps:5,push:300}},grow:{pmul:.05},cap:{pmul:1.8},
  desc:"أعاصير صغيرة تضرب وتطيّر الخصوم.",growTxt:"أعاصير أقوى"});
d({id:"earth",en:"Earth",ar:"الأرض",group:"nature",color:"#B58A5A",w:"discs",count:3,len:30,head:9,dmg:5,spin:2.5,cd:.4,kb:180,mass:1.3,armor:.15,hp:100,
  ab:{t:"shoot",cd:2.5,p:sh(8,{v:340,r:9,type:"rock",fx:{knock:200}})},grow:{head:.4,dmg:.3},cap:{head:15,dmg:10},desc:"صخور تدور حوله وتحميه، ويرمي صخرة كل شوي.",growTxt:"صخور أكبر"});
d({id:"lava",en:"Lava",ar:"الحمم",group:"nature",color:"#FF4D2E",w:"none",role:"ranged",growOnAb:true,ab:{t:"zoneTarget",cd:2,z:{type:"lava",r:46,ttl:3.2,dps:6,fx:{burn:[2,1.5]}}},grow:{pmul:.05},cap:{pmul:1.8},
  desc:"يحط برك حمم تحت الخصوم تحرقهم.",growTxt:"حمم أحر"});
d({id:"shadow",en:"Shadow",ar:"الظل",group:"nature",color:"#5B3B9E",w:"blade",len:34,dmg:6,spin:4,cd:.3,crit:.15,ab:{t:"blink",cd:3,invis:1,dmg:6},grow:{dmg:.5,len:2},cap:{dmg:14,len:70},
  desc:"ينتقل عبر الظلال ورا خصمه ويختفي لحظة.",growTxt:"ضرر أكبر"});
d({id:"light",en:"Light",ar:"النور",group:"nature",color:"#FFF8D6",w:"none",role:"ranged",growOnProj:true,ab:{t:"shoot",cd:.7,p:sh(4,{v:650,r:4,type:"light",pierce:1})},grow:{extraN:.08},cap:{extraN:2},
  desc:"أشعة سريعة تخترق أكثر من خصم.",growTxt:"أشعة أكثر مع الوقت"});
/* ---------- powers ---------- */
d({id:"gravity",en:"Gravity",ar:"الجاذبية",group:"power",color:"#6E5BFF",w:"none",contact:6,mass:1.4,hp:105,ab:{t:"pull",cd:3,r:170,f:300,dur:1.4},
  desc:"تسحب الخصوم لها وتسحقهم بالتصادم.",growTxt:"—"});
d({id:"blackhole",en:"Black Hole",ar:"الثقب الأسود",group:"power",color:"#2A1F45",w:"none",role:"ranged",growOnAb:true,ab:{t:"zoneTarget",cd:4,z:{type:"pull",r:110,ttl:2.4,pull:380,dps:8}},grow:{pmul:.05},cap:{pmul:1.6},
  desc:"يفتح ثقب أسود يسحب الخصوم ويضرهم.",growTxt:"ثقب أقوى"});
d({id:"time",en:"Time",ar:"الزمن",group:"power",color:"#9BF8FF",w:"blade",len:40,dmg:6,spin:3.5,cd:.32,ab:{t:"zoneSelf",cd:3.5,z:{type:"time",r:150,ttl:2.5,follow:true}},grow:{dmg:.5,len:2},cap:{dmg:13,len:70},
  desc:"يبطّئ الزمن حوله: الخصوم والمقذوفات تبطأ.",growTxt:"ضرر أكبر"});
d({id:"teleport",en:"Teleport",ar:"الانتقال",group:"power",color:"#B9A2FF",w:"blade",len:30,dmg:6,spin:4,cd:.3,ab:{t:"blink",cd:2.2,dmg:8},grow:{dmg:.4},cap:{dmg:12},
  desc:"ينتقل فجأة جنب خصمه ويضربه.",growTxt:"ضرر أكبر"});
d({id:"clone",en:"Clone",ar:"النسخ",group:"power",color:"#F472B6",w:"blade",len:36,dmg:6,spin:3.5,cd:.32,ab:{t:"clone",cd:4,max:2,ttl:6,hpf:.25},grow:{dmg:.4},cap:{dmg:12},
  desc:"يطلّع نسخ مؤقتة منه تقاتل معه.",growTxt:"ضرر أكبر"});
d({id:"ghost",en:"Ghost",ar:"الشبح",group:"power",color:"#E8E6FF",w:"blade",len:36,dmg:6.5,spin:3.6,cd:.3,dodge:.35,ab:{t:"invis",cd:4,dur:1.5},grow:{dmg:.4},cap:{dmg:12},
  desc:"تقريبًا ثلث الضربات تمر من خلاله، ويختفي كل شوي.",growTxt:"ضرر أكبر"});
d({id:"vampire",en:"Vampire",ar:"مصاص الدماء",group:"power",color:"#C8102E",w:"orbit",count:2,orbit:12,len:18,dmg:4.5,spin:4,cd:.3,lifesteal:.45,grow:{dmg:.25},cap:{dmg:9},
  desc:"أنياب تمتص صحة الخصم وتعالجه.",growTxt:"عضة أقوى"});
d({id:"mirror",en:"Mirror",ar:"المرآة",group:"power",color:"#DDE6F5",w:"blade",len:34,dmg:5,spin:3.4,cd:.32,reflect:.35,armor:.1,grow:{dmg:.4},cap:{dmg:11},
  desc:"يرجّع ثلث الضرر اللي ياخذه للمهاجم.",growTxt:"ضرر أكبر"});
d({id:"magnet",en:"Magnet",ar:"المغناطيس",group:"power",color:"#E62948",w:"pole",len:50,tip:.35,dmg:7,spin:2.6,cd:.4,ab:{t:"pull",cd:3.2,r:150,f:240,dur:1},grow:{len:3,dmg:.4},cap:{len:90,dmg:13},
  desc:"يسحب الخصوم، ولما تتصادم أسلحتهم معه تتعطل لحظة.",growTxt:"مدى أطول"});
d({id:"chaos",en:"Chaos",ar:"الفوضى",group:"power",color:"#FF4FD8",w:"blade",len:36,dmg:6,spin:3.6,cd:.32,
  ab:{t:"random",cd:2.2,list:[{t:"shoot",p:sh(5,{v:380,r:8,type:"fire",fx:{burn:[2,2]}})},{t:"shoot",p:sh(5,{v:400,r:7,type:"ice",fx:{slow:[.6,1.2]}})},{t:"blink",dmg:7},{t:"zoneTarget",z:{type:"lava",r:42,ttl:2.5,dps:5}},{t:"chain",dmg:6,n:2}]},
  grow:{dmg:.4},cap:{dmg:12},desc:"كل كم ثانية يسوي قدرة عشوائية: نار، أو ثلج، أو انتقال، أو حمم، أو برق.",growTxt:"ضرر أكبر"});
/* ---------- creatures ---------- */
d({id:"spider",en:"Spider",ar:"العنكبوت",group:"creature",color:"#E62948",w:"orbit",count:2,orbit:10,len:16,dmg:3.5,spin:4,cd:.28,
  ab:{t:"cycle",cd:1.6,list:[{t:"shoot",p:sh(3,{v:360,r:9,type:"webshot",fx:{web:2.2}})},{t:"zoneTarget",z:{type:"web",r:55,ttl:4,fx:{web:1}}}]},grow:{dmg:.2},cap:{dmg:7},
  desc:"يرمي خيوط ويحط شباك تمسك الخصوم وتبطّئهم.",growTxt:"عضة أقوى"});
d({id:"snake",en:"Snake",ar:"الثعبان",group:"creature",color:"#39FF88",w:"orbit",count:1,orbit:14,len:18,dmg:3,spin:5,cd:.25,fast:true,on:{poison:[1,3]},grow:{spin:.3},cap:{spin:10},
  desc:"سريع، وكل عضة تسمّم.",growTxt:"عضات أسرع"});
d({id:"scorpion",en:"Scorpion",ar:"العقرب",group:"creature",color:"#D9A066",w:"pole",len:55,tip:.3,dmg:6,spin:2.4,cd:.42,role:"reach",on:{poison:[1.2,3]},grow:{len:3,dmg:.4},cap:{len:100,dmg:12},
  desc:"ذيل طويل بإبرة سامة.",growTxt:"ذيل أطول"});
d({id:"dragon",en:"Dragon",ar:"التنين",group:"creature",color:"#FF3D2E",w:"none",role:"ranged",range:180,hp:105,mass:1.2,growOnAb:true,ab:{t:"breath",cd:2,n:5,p:sh(3,{v:330,r:7,ttl:.8,type:"fire",fx:{burn:[2.5,2]}})},grow:{extraN:.1},cap:{extraN:3},
  desc:"ينفث نار على شكل مروحة قدامه.",growTxt:"نفث أعرض"});
d({id:"bee",en:"Bee",ar:"النحل",group:"creature",color:"#FFD23F",w:"none",role:"ranged",growOnProj:true,ab:{t:"shoot",cd:.8,n:2,spread:.5,p:sh(2,{v:300,r:4,home:3.5,ttl:2.5,type:"bee",fx:{poison:[.6,2]}})},grow:{extraN:.06},cap:{extraN:2},
  desc:"سرب نحل يلاحق الخصوم ويلسعهم.",growTxt:"نحل أكثر"});
d({id:"octopus",en:"Octopus",ar:"الأخطبوط",group:"creature",color:"#F472B6",w:"poles",count:4,len:46,tip:.35,dmg:3.5,spin:2.6,cd:.35,on:{slow:[.7,1.2]},grow:{len:2},cap:{len:75},
  desc:"أربع أذرع تمسك وتبطّئ.",growTxt:"أذرع أطول"});
d({id:"wolf",en:"Wolf",ar:"الذئب",group:"creature",color:"#9AA6C0",w:"blades",count:2,len:26,dmg:5,spin:4.5,cd:.28,fast:true,berserk:1,grow:{dmg:.3},cap:{dmg:10},
  desc:"كل ما تقل صحته يصير أشرس.",growTxt:"مخالب أقوى"});
d({id:"phoenix",en:"Phoenix",ar:"العنقاء",group:"creature",color:"#FF8A3D",w:"none",role:"ranged",revive:.45,aura:{r:60,dps:3,fx:{burn:[1.5,1]}},growOnProj:true,
  ab:{t:"shoot",cd:1.4,p:sh(4,{v:360,r:8,type:"fire",fx:{burn:[2,2]}})},grow:{pmul:.04},cap:{pmul:1.6},desc:"لما تسقط ترجع مرة وحدة بنص صحتها تقريبًا، ونارها حولها.",growTxt:"نار أقوى"});
d({id:"kraken",en:"Kraken",ar:"الكراكن",group:"creature",color:"#2E8B7A",w:"poles",count:2,len:70,tip:.3,dmg:7,spin:1.8,cd:.45,hp:110,mass:1.3,r:28,role:"reach",on:{slow:[.6,1]},grow:{len:3},cap:{len:110},
  desc:"مجسّات طويلة جدًا تضرب من بعيد.",growTxt:"مجسات أطول"});
d({id:"chameleon",en:"Chameleon",ar:"الحرباء",group:"creature",color:"#7BD389",w:"blade",len:34,dmg:6,spin:4,cd:.3,crit:.3,ab:{t:"invis",cd:3.5,dur:2},grow:{dmg:.4},cap:{dmg:12},
  desc:"يختفي ويرجع بضربات حرجة.",growTxt:"ضرر أكبر"});
/* ---------- tech ---------- */
d({id:"laser",en:"Laser",ar:"الليزر",group:"tech",color:"#FF2E6A",w:"beam",len:140,thick:3,dmg:1.6,cd:.12,kb:0,spin:1.3,grow:{len:3,dmg:.03},cap:{len:220,dmg:2.6},
  desc:"شعاع ليزر طويل يلف ويحرق كل اللي يلمسه.",growTxt:"شعاع أطول"});
d({id:"rocket",en:"Rocket",ar:"الصواريخ",group:"tech",color:"#FF6A3D",w:"none",role:"ranged",growOnProj:true,ab:{t:"shoot",cd:1.8,p:sh(9,{v:280,r:7,home:3,ttl:3,type:"rocket",splash:60})},grow:{pmul:.04},cap:{pmul:1.6},
  desc:"صواريخ تلاحق الهدف وتنفجر.",growTxt:"صواريخ أقوى"});
d({id:"drone",en:"Drone",ar:"الدرونز",group:"tech",color:"#4FB3FF",w:"none",role:"ranged",ab:{t:"summon",cd:4,kid:"droneunit",max:2,ttl:8,hpf:.2},
  desc:"يطلّع درونز صغيرة تطلق على الخصوم.",growTxt:"—"});
d({id:"plasma",en:"Plasma",ar:"البلازما",group:"tech",color:"#B65CFF",w:"none",role:"ranged",growOnProj:true,ab:{t:"shoot",cd:1.5,p:sh(10,{v:240,r:12,type:"plasma",splash:50})},grow:{pmul:.04},cap:{pmul:1.6},
  desc:"كرات طاقة بطيئة تنفجر وتضر اللي حولها.",growTxt:"طاقة أقوى"});
d({id:"tesla",en:"Tesla",ar:"تسلا",group:"tech",color:"#7FE8FF",w:"none",contact:3,aura:{r:85,dps:7},hp:100,
  desc:"مجال كهربائي يصعق أي خصم يقرب.",growTxt:"—"});
d({id:"turret",en:"Turret",ar:"البرج",group:"tech",color:"#9AA6C0",w:"blade",len:28,dmg:5,spin:3,cd:.35,ab:{t:"summon",cd:5,kid:"turretunit",max:1,ttl:10,hpf:.35,still:true},grow:{dmg:.3},cap:{dmg:9},
  desc:"يركّب برج ثابت يطلق على الخصوم.",growTxt:"ضرر أكبر"});
d({id:"mine",en:"Mine",ar:"الألغام",group:"tech",color:"#E6B85C",w:"none",role:"ranged",range:200,ab:{t:"zoneSelf",cd:1.6,z:{type:"mine",r:46,ttl:12,trig:true,boom:14}},
  desc:"يزرع ألغام ورا ويخلي الخصم يلحقه عليها.",growTxt:"—"});
d({id:"shield",en:"Shield",ar:"الدرع",group:"tech",color:"#8FB8FF",w:"hammer",len:26,head:14,dmg:6,spin:2.4,cd:.45,kb:260,armor:.1,mass:1.3,shieldMax:50,ab:{t:"shield",cd:2.5,v:18},grow:{shieldUp:2,dmg:.3},cap:{shieldUp:30,dmg:10},
  desc:"درع يمتص الضرر ويتجدد، ويضرب بالدرع.",growTxt:"درع أكبر"});
d({id:"sawblade",en:"Sawblade",ar:"الشفرات",group:"tech",color:"#C9D6E8",w:"discs",count:2,len:30,head:10,dmg:3.5,spin:5,cd:.18,kb:50,grow:{spin:.2,addAt:[8]},cap:{spin:10,count:3},addName:"شفرة إضافية",
  desc:"شفرات دائرية تدور وتقطع.",growTxt:"أسرع وشفرة إضافية"});
d({id:"railgun",en:"Railgun",ar:"المدفع الكهرومغناطيسي",group:"tech",color:"#4FB3FF",w:"none",role:"ranged",range:260,growOnProj:true,ab:{t:"shoot",cd:2.6,p:sh(18,{v:900,r:5,pierce:5,type:"rail"})},grow:{pmul:.04},cap:{pmul:1.5},
  desc:"طلقة قوية جدًا تخترق كل اللي قدامها.",growTxt:"طلقة أقوى"});
/* ---------- legendary ---------- */
d({id:"reaper",en:"Reaper",ar:"حاصد الأرواح",group:"legend",color:"#3A3F5C",w:"scythe",len:52,dmg:9,spin:2.6,cd:.45,lifesteal:.3,grow:{len:3,dmg:.5},cap:{len:90,dmg:16},
  desc:"منجل يمتص صحة الضحايا.",growTxt:"منجل أوسع"});
d({id:"celestial",en:"Celestial",ar:"السماوي",group:"legend",color:"#FFF1C4",w:"none",role:"ranged",growOnAb:true,ab:{t:"strike",cd:2.2,n:2,z:{type:"star",r:46,delay:.8,boom:13,ttl:1}},grow:{extraN:.1},cap:{extraN:2},
  desc:"نجوم تنزل من السما على الخصوم.",growTxt:"نجوم أكثر"});
d({id:"void",en:"Void",ar:"الفراغ",group:"legend",color:"#1A1030",w:"orbit",count:2,orbit:14,len:22,dmg:4,spin:3.5,cd:.3,absorb:true,grow:{dmg:.25},cap:{dmg:8},
  desc:"يبلع المقذوفات القريبة ويتعالج منها.",growTxt:"شظايا أقوى"});
d({id:"omega",en:"Omega",ar:"أوميغا",group:"legend",color:"#E6B85C",w:"blade",len:40,dmg:7,spin:3.5,cd:.32,grow:{dmg:.6,len:3,spin:.15},cap:{dmg:18,len:100,spin:6},
  desc:"يتطور بكل الاتجاهات: ضرر، وطول، وسرعة.",growTxt:"كل شي يكبر"});
d({id:"hydra",en:"Hydra",ar:"الهيدرا",group:"legend",color:"#2ECC71",w:"blades",count:1,len:38,dmg:6,spin:3.2,cd:.32,grow:{addAt:[5,12,20]},cap:{count:4},addName:"رأس جديد",
  desc:"كل ما يضرب يطلع له رأس جديد يقاتل.",growTxt:"رؤوس إضافية"});
d({id:"stormking",en:"Storm King",ar:"ملك العواصف",group:"legend",color:"#9FB4FF",w:"blade",len:36,dmg:6,spin:3.4,cd:.32,
  ab:{t:"cycle",cd:2,list:[{t:"chain",dmg:7,n:2},{t:"zoneTarget",z:{type:"tornado",r:60,ttl:2,dps:5,push:300}}]},grow:{dmg:.3},cap:{dmg:10},desc:"يتناوب بين البرق والأعاصير.",growTxt:"ضرر أكبر"});
d({id:"bloodmoon",en:"Blood Moon",ar:"القمر الدموي",group:"legend",color:"#B3122E",w:"blades",count:2,len:34,dmg:5,spin:3.6,cd:.3,berserk:1.6,lifesteal:.15,grow:{dmg:.3},cap:{dmg:10},
  desc:"كل ما قلت صحته صار أقوى ويمتص صحة.",growTxt:"نصال أقوى"});
d({id:"prism",en:"Prism",ar:"المنشور",group:"legend",color:"#F7F7FF",w:"none",role:"ranged",growOnProj:true,ab:{t:"shoot",cd:1.2,p:sh(5,{v:520,r:5,bounce:3,pierce:1,type:"prism"})},grow:{extraN:.08},cap:{extraN:2},
  desc:"أشعة ترتد عن الجدران أكثر من مرة.",growTxt:"أشعة أكثر"});
d({id:"nebula",en:"Nebula",ar:"السديم",group:"legend",color:"#8D65F6",w:"none",role:"ranged",growOnAb:true,ab:{t:"zoneTarget",cd:2,z:{type:"cloud",r:70,ttl:4,dps:5,fx:{slow:[.8,1]}}},grow:{pmul:.04},cap:{pmul:1.6},
  desc:"سحب طاقة تضر وتبطّئ.",growTxt:"سحب أقوى"});
d({id:"infinity",en:"Infinity",ar:"اللانهاية",group:"legend",color:"#B9A2FF",w:"blade",len:38,dmg:6,spin:3.5,cd:.32,
  ab:{t:"cycle",cd:2,list:[{t:"shoot",p:sh(5,{v:380,r:8,type:"fire",fx:{burn:[2,2]}})},{t:"shoot",p:sh(5,{v:400,r:7,type:"ice",fx:{slow:[.6,1.2]}})},{t:"chain",dmg:6,n:2},{t:"blink",dmg:6},{t:"shield",v:14}]},
  shieldMax:30,grow:{dmg:.3},cap:{dmg:10},desc:"يدور على خمس قدرات بالترتيب: نار، وثلج، وبرق، وانتقال، ودرع.",growTxt:"ضرر أكبر"});
/* ---------- summoned units (not pickable) ---------- */
d({id:"droneunit",en:"Drone",ar:"درون",group:"tech",hidden:true,unit:true,color:"#4FB3FF",w:"none",role:"ranged",r:11,hp:20,mass:.5,ab:{t:"shoot",cd:1,first:.3,p:sh(3,{v:420,r:4,type:"bolt"})}});
d({id:"turretunit",en:"Turret",ar:"برج",group:"tech",hidden:true,unit:true,color:"#9AA6C0",w:"none",r:17,hp:30,mass:3,ab:{t:"shoot",cd:.7,first:.3,p:sh(4,{v:500,r:4,type:"bolt"})}});
/* measured balance (damage multiplier, health multiplier) from bc_balance.js over thousands of duels */
var BAL={"sword":[1.117,1.117],"spear":[1.193,1.193],"dagger":[1.197,1.197],"hammer":[1.15,1.15],"axe":[1.275,1.275],"katana":[1.606,1.606],"chainsaw":[2.029,2.029],"flail":[1.202,1.202],"scythe":[0.849,0.849],"boomerang":[0.739,0.739],"fire":[0.682,0.682],"ice":[0.72,0.72],"lightning":[0.555,0.555],"poison":[0.567,0.556],"water":[1.005,1.005],"wind":[1.11,1.11],"earth":[0.632,0.632],"lava":[0.664,0.664],"shadow":[0.819,0.819],"light":[0.501,0.501],"gravity":[1.205,1.205],"blackhole":[0.747,0.747],"time":[1.493,1.493],"teleport":[0.773,0.773],"clone":[1.268,1.268],"ghost":[1.328,1.328],"vampire":[1.362,1.362],"mirror":[1.399,1.399],"magnet":[1.56,1.56],"chaos":[0.968,0.968],"spider":[1.361,1.361],"snake":[2.095,2.061],"scorpion":[1.282,1.282],"dragon":[0.606,0.606],"bee":[0.436,0.45],"octopus":[0.95,0.95],"wolf":[1.035,1.035],"phoenix":[0.745,0.745],"kraken":[1.045,1.045],"chameleon":[1.655,1.655],"laser":[1.789,1.789],"rocket":[0.703,0.703],"drone":[0.923,0.923],"plasma":[0.818,0.818],"tesla":[1.347,1.347],"turret":[0.99,0.99],"mine":[0.561,0.561],"shield":[0.3,0.451],"sawblade":[1.116,1.116],"railgun":[0.643,0.643],"reaper":[0.722,0.722],"celestial":[2.187,2.159],"void":[1.292,1.292],"omega":[1.323,1.323],"hydra":[1.591,1.591],"stormking":[0.823,0.823],"bloodmoon":[0.861,0.861],"prism":[0.504,0.504],"nebula":[0.765,0.765],"infinity":[0.762,0.762]};
for(var id in BAL)if(BC.KINDS[id]){BC.KINDS[id].pw=BAL[id][0];BC.KINDS[id].hpf=BAL[id][1]}
BC.PICK=BC.ORDER.filter(function(id){return !BC.KINDS[id].hidden});
})(BC);

/* ===== Ball Clash shop scripts (inlined; apply runs once, merge is not called) ===== */
/* BALL CLASH — shop balls. Loaded after bc_kinds.js.
   Gameplay uses the same step() as the original 60. pw/hpf are the only
   balance knobs, tuned so each new ball wins about half its duels against
   that roster (sidegrade, not a straight upgrade). The sim never reads rar,
   shop, or art. */
(function(root){
"use strict";
var BALLS=[
  {id:"sling",en:"Sling",ar:"المقلاع",group:"weapon",color:"#E4C99A",w:"none",role:"ranged",range:200,shop:true,rar:"common",pw:1.086,hpf:1.086,
    art:{shell:"rock",face:"brave"},
    ab:{t:"shoot",cd:1.2,p:{dmg:5,v:340,r:6,type:"rock"}},grow:{pmul:.035},cap:{pmul:1.45},growOnProj:true,
    desc:"يرمي حصى ثقيلة بدون ارتداد. أبطأ من البومرنج، وما يقطع أكثر من هدف.",growTxt:"حصى أقوى"},
  {id:"spark",en:"Spark",ar:"الشرارة",group:"nature",color:"#FFE56A",w:"none",role:"ranged",range:210,shop:true,rar:"common",pw:0.629,hpf:0.629,
    art:{shell:"bolt",face:"glow",sig:"neon",trail:"neon"},
    ab:{t:"chain",cd:1.7,dmg:6,n:1},grow:{chainUp:.12},cap:{chainUp:2},growOnAb:true,
    desc:"صاعقة قصيرة تقفز لهدف واحد. أضيق من البرق الكامل.",growTxt:"تقفز أبعد شوي"},
  {id:"cog",en:"Cog",ar:"الترس",group:"tech",color:"#D5DDEA",w:"discs",count:1,len:28,head:9,dmg:4.2,spin:3.4,cd:.32,kb:80,hp:96,shop:true,rar:"common",pw:2.132,hpf:2.132,
    art:{shell:"hex",face:"visor"},
    grow:{spin:.12,dmg:.2},cap:{spin:6,dmg:8},
    desc:"ترس واحد يدور بثبات. أبطأ من الشفرات المزدوجة، وضربته أوضح.",growTxt:"دوران أسرع"},
  {id:"glaive",en:"Glaive",ar:"الحربة",group:"weapon",color:"#F3E6C4",w:"pole",len:60,tip:.32,dmg:8.5,spin:2.5,cd:.42,kb:150,hp:94,role:"reach",shop:true,rar:"rare",pw:1.364,hpf:1.364,
    art:{shell:"metal",face:"brave",trail:"gold"},
    grow:{len:3,dmg:.45},cap:{len:110,dmg:15},
    desc:"نصل مقوّس على عصا. أقصر من الرمح، وأسرع في اللفة.",growTxt:"نصل أطول"},
  {id:"blizzard",en:"Blizzard",ar:"الزمهرير",group:"nature",color:"#D5F4FF",w:"none",role:"ranged",range:220,shop:true,rar:"rare",pw:0.863,hpf:0.863,
    art:{shell:"ice",face:"slit",sig:"moon",trail:"ice"},
    ab:{t:"shoot",cd:1.25,n:2,spread:.22,p:{dmg:3,v:400,r:6,type:"ice",fx:{slow:[.72,1.15]}}},grow:{pmul:.035},cap:{pmul:1.5},growOnProj:true,
    desc:"شظايا ثلج تبطّئ، بدون تجميد. أوسع من طلقة الثلج الواحدة وأضعف في الضربة.",growTxt:"شظايا أقوى"},
  {id:"basilisk",en:"Basilisk",ar:"البازيليسق",group:"creature",color:"#8CFF6A",w:"orbit",count:1,orbit:16,len:18,dmg:3.4,spin:4.4,cd:.3,hp:94,shop:true,rar:"rare",pw:2.521,hpf:2.521,
    art:{shell:"scale",face:"snake"},
    on:{slow:[.7,1.1],poison:[.45,2]},grow:{spin:.2,dmg:.12},cap:{spin:8,dmg:6.5},
    desc:"ناب يدور ويبطّئ مع سم خفيف. أبطأ من الثعبان، وسمه أخف.",growTxt:"ناب أسرع"},
  {id:"trident",en:"Trident",ar:"الرمح الثلاثي",group:"weapon",color:"#8FD8FF",w:"poles",count:3,len:48,tip:.34,dmg:3.6,spin:2.15,cd:.4,kb:110,hp:98,role:"reach",shop:true,rar:"epic",pw:0.919,hpf:0.919,
    art:{shell:"water",face:"brave",sig:"neon",trail:"ice"},
    grow:{len:2,dmg:.22},cap:{len:78,dmg:7},
    desc:"ثلاثة رؤوس تغطي جوانب أكثر من الرمح الواحد، وكل رأس أضعف.",growTxt:"رؤوس أطول"},
  {id:"comet",en:"Comet",ar:"المذنّب",group:"power",color:"#FFB03A",w:"none",role:"ranged",range:200,shop:true,rar:"epic",pw:0.885,hpf:0.885,
    art:{shell:"comet",face:"glow",sig:"flame",trail:"fire"},
    ab:{t:"shoot",cd:1.7,p:{dmg:7,v:300,r:8,home:2.2,ttl:2.6,type:"rocket",splash:42}},grow:{pmul:.035},cap:{pmul:1.45},growOnProj:true,
    desc:"كرة نار تلاحق الهدف وتنفجر أضيق من الصاروخ.",growTxt:"انفجار أوضح"},
  {id:"arcblade",en:"Arcblade",ar:"النصل الضوئي",group:"tech",color:"#FF4FD8",w:"beam",len:100,thick:4,dmg:1.7,cd:.15,kb:8,spin:1.55,hp:90,shop:true,rar:"epic",pw:2.277,hpf:2.277,
    art:{shell:"neon",face:"visor",sig:"neon",trail:"neon"},
    grow:{len:2,dmg:.025},cap:{len:150,dmg:2.3},
    desc:"شعاع أقصر من الليزر وأسمك. يلف أسرع شوي، وما يوصل لنفس المدى.",growTxt:"شعاع أطول"},
  {id:"meteor",en:"Meteor",ar:"النيزك",group:"nature",color:"#FF5A1F",w:"none",role:"ranged",range:230,hp:100,shop:true,rar:"legendary",pw:1.631,hpf:1.631,
    art:{shell:"lava",face:"divine",sig:"flame",trail:"fire"},
    ab:{t:"strike",cd:2.35,n:1,z:{type:"star",r:48,delay:.75,boom:22,ttl:1}},grow:{extraN:.06},cap:{extraN:1},growOnAb:true,
    desc:"نيزك واحد ينزل على خصم. أبطأ من وابل النجوم، وضربته واحدة واضحة.",growTxt:"نيزك إضافي متأخر"},
  {id:"umbra",en:"Umbra",ar:"الظلّ",group:"power",color:"#2A2158",w:"blade",len:32,dmg:5.2,spin:3.3,cd:.34,kb:120,hp:96,dodge:.12,shop:true,rar:"legendary",pw:2.043,hpf:2.043,
    art:{shell:"smoke",face:"void",sig:"moon",trail:"void",color2:"#E6B85C"},
    ab:{t:"cycle",cd:3,list:[{t:"invis",dur:1},{t:"pull",r:120,f:190,dur:.9}]},grow:{dmg:.28},cap:{dmg:9},
    desc:"يتناوب بين اختفاء قصير وسحب خفيف. تفاديه أقل من الشبح، وسحبه أضعف من الجاذبية.",growTxt:"نصل أقوى"},
  {id:"starlance",en:"Starlance",ar:"رمح النجوم",group:"legend",color:"#FFF1C4",w:"pole",len:52,tip:.3,dmg:6.5,spin:2.2,cd:.44,kb:140,hp:96,role:"reach",shop:true,rar:"legendary",pw:1.375,hpf:1.375,
    art:{shell:"rays",face:"divine",sig:"crown",trail:"gold"},
    ab:{t:"strike",cd:3.4,n:1,z:{type:"star",r:36,delay:.7,boom:9,ttl:1}},grow:{len:2,dmg:.3},cap:{len:90,dmg:12},
    desc:"رمح متوسط مع نجمة بطيئة. ما يجمع مدى الرمح الكامل مع وابل السماوي.",growTxt:"رمح أطول"}
];
var LEGACY=["sword","spear","dagger","hammer","axe","katana","chainsaw","flail","scythe","boomerang","fire","ice","lightning","poison","water","wind","earth","lava","shadow","light","gravity","blackhole","time","teleport","clone","ghost","vampire","mirror","magnet","chaos","spider","snake","scorpion","dragon","bee","octopus","wolf","phoenix","kraken","chameleon","laser","rocket","drone","plasma","tesla","turret","mine","shield","sawblade","railgun","reaper","celestial","void","omega","hydra","stormking","bloodmoon","prism","nebula","infinity"];
function apply(BC){
  if(!BC||!BC.def)return;
  BALLS.forEach(function(b){if(!BC.KINDS[b.id])BC.def(b)});
  BC.PICK=BC.ORDER.filter(function(id){return !BC.KINDS[id].hidden});
  BC.LEGACY=LEGACY.slice();
}
function merge(BC){
  if(!BC||!BC.def)throw new Error("bc_core missing");
  BALLS.forEach(function(b){if(BC.KINDS[b.id])throw new Error("refusing to replace "+b.id);BC.def(b)});
  BC.PICK=BC.ORDER.filter(function(id){return !BC.KINDS[id].hidden});
  BC.LEGACY=LEGACY.slice();
}
root.BC_NEW_DATA={balls:BALLS,legacy:LEGACY,apply:apply,merge:merge};
if(typeof BC!=="undefined")apply(BC);
if(typeof module!=="undefined"&&module.exports)module.exports=root.BC_NEW_DATA;
})(typeof globalThis!=="undefined"?globalThis:this);
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
/* Ball Clash shop actions for the spider edge function.
   Live handle() is handle(action, p, user, db) and errors throw fail().
   There is no admin, json(), or payload inside handle. db.rpc calls the
   public wrappers (bc_shop_buy / bc_shop_sync), which only service_role may
   execute. Schema private stays off the API.

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
globalThis.BC = BC;


/* ================= basics ================= */
const clock={now:()=>Date.now()};
const store={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,String(v));return true}catch(e){return false}}};
const fmt=n=>{try{return Number(n).toLocaleString("ar-SA")}catch(e){return String(n)}};
const BAD_KEYS=new Set(["__proto__","constructor","prototype"]);
const has=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const int=(v,lo,hi,d)=>{v=Math.floor(Number(v));return Number.isFinite(v)?Math.max(lo,Math.min(hi,v)):d};

/* ================= catalog =================
   Every cosmetic lives here. Skins keep their array position forever because online
   games send the position, so new skins are only ever added at the end.
   how: free | level (lvl) | store (price, optional lvl) | ach (achievement id) | weekly | code | founder | event */
const RARITY={common:"عادي",rare:"نادر",epic:"ملحمي",legendary:"أسطوري",secret:"سرّي",owner:"حصري للمالك"};
const RAR_ORDER={common:0,rare:1,epic:2,legendary:3,secret:4,owner:5};
const SKINS=[
  {id:"toxic",name:"سمّ",c:"#39FF88",d:"#0E7A40",e:"spider",rar:"common",how:"free",fam:"green"},
  {id:"fire",name:"نار",c:"#FF7A1F",d:"#A33A00",e:"flame",rar:"common",how:"free",fam:"orange"},
  {id:"ice",name:"ثلج",c:"#7FE8FF",d:"#1B8FB0",e:"snow",rar:"common",how:"free",fam:"cyan"},
  {id:"bolt",name:"برق",c:"#FFE14D",d:"#B08900",e:"bolt",rar:"common",how:"free",fam:"yellow"},
  {id:"shade",name:"ظل",c:"#A06BFF",d:"#4B23A8",e:"moon",rar:"common",how:"free",fam:"violet"},
  {id:"gem",name:"جوهرة",c:"#FF4FD8",d:"#A0127F",e:"gem",rar:"common",how:"free",fam:"pink"},
  {id:"web",name:"شبكة",c:"#DDE6F0",d:"#7D8AA0",e:"none",pat:"web",pc:"rgba(20,26,40,.75)",rar:"rare",how:"level",lvl:3,fam:"silver"},
  {id:"neon",name:"نيون",c:"#00F0FF",d:"#2A3DFF",e:"none",pat:"rings",pc:"rgba(255,255,255,.6)",rar:"rare",how:"store",price:250,fam:"blue"},
  {id:"cyber",name:"سايبر",c:"#19F5C1",d:"#075E55",e:"none",pat:"circuit",pc:"rgba(4,24,20,.75)",rar:"rare",how:"store",price:300,fam:"teal"},
  {id:"gold",name:"ذهب",c:"#FFC93C",d:"#8A5A00",e:"spider",pat:"shine",rar:"rare",how:"level",lvl:10,fam:"gold"},
  {id:"mist",name:"ضباب",c:"#D9D2FF",d:"#8E84C9",e:"none",pat:"mist",pc:"rgba(255,255,255,.7)",rar:"rare",how:"ach",ach:"streak3",fam:"lavender"},
  {id:"acid",name:"حمض",c:"#B6FF2E",d:"#3E6B00",e:"none",pat:"bubbles",pc:"rgba(20,40,0,.55)",rar:"rare",how:"ach",ach:"beat_hard",fam:"lime"},
  {id:"galaxy",name:"مجرّة",c:"#8B5CFF",d:"#14083F",e:"none",pat:"stars",pc:"#FFFFFF",rar:"epic",how:"store",price:600,lvl:8,fam:"violet"},
  {id:"lava",name:"حمم",c:"#FF5A2E",d:"#4A0800",e:"none",pat:"crack",pc:"rgba(255,226,120,.95)",rar:"epic",how:"store",price:650,lvl:6,fam:"red"},
  {id:"chrome",name:"كروم",c:"#E8EEF6",d:"#4D5868",e:"none",pat:"shine",rar:"epic",how:"store",price:700,lvl:12,fam:"silver"},
  {id:"space",name:"فضاء",c:"#4D7CFF",d:"#061230",e:"orbit",ink:"rgba(255,255,255,.9)",pat:"stars",pc:"#FFFFFF",rar:"epic",how:"level",lvl:18,fam:"blue"},
  {id:"eclipse",name:"كسوف",c:"#FFB347",base:"#16141F",d:"#000000",e:"eclipse",rar:"legendary",how:"store",price:1500,lvl:20,fam:"amber"},
  {id:"crown",name:"تاج الشبكة",c:"#FFD86B",d:"#5A4100",e:"crown",pat:"web",pc:"rgba(60,40,0,.5)",rar:"legendary",how:"level",lvl:25,fam:"gold"},
  {id:"aurora",name:"شفق",c:"#5CFFD8",d:"#3B1FB0",e:"none",pat:"aurora",pc:"#B98CFF",rar:"legendary",how:"level",lvl:40,fam:"teal",anim:true},
  {id:"og",name:"العنكبوت الأصلي",c:"#7DFFB2",base:"#0C100E",d:"#000000",e:"spider",ink:"#39FF88",pat:"web",pc:"rgba(220,235,230,.5)",rar:"secret",how:"code",fam:"mint"},
  {id:"webmaster",name:"سيّد الشبكة",c:"#F2F7FF",d:"#9AA6B8",e:"dot",ink:"#39FF88",pat:"web",pc:"rgba(5,8,12,.85)",rar:"secret",how:"code",fam:"silver"},
  {id:"ink",name:"حبر الظلام",c:"#9D7BFF",base:"#0A0812",d:"#000000",e:"ink",ink:"#9D7BFF",rar:"secret",how:"code",fam:"violet",anim:true},
  {id:"future",name:"المستقبل",c:"#2BE4FF",base:"#1C2533",d:"#05080D",e:"none",pat:"circuit",pc:"rgba(43,228,255,.85)",rar:"secret",how:"code",fam:"cyan"},
  {id:"storm",name:"العاصفة",c:"#D7FF3A",base:"#101838",d:"#03061A",e:"bolt",ink:"#D7FF3A",pat:"sparks",pc:"rgba(240,255,200,.85)",rar:"secret",how:"code",fam:"lime",anim:true},
  {id:"ghost",name:"شبح الشبكة",c:"#E9E2FF",d:"#A99EDC",e:"none",pat:"mist",pc:"rgba(140,255,215,.6)",rar:"secret",how:"code",fam:"lavender",anim:true},
  {id:"founder",name:"عنكبوت المؤسس",c:"#39FF88",base:"#08090D",d:"#000000",e:"spider",ink:"#39FF88",pat:"split",pc:"#9B5CFF",rar:"secret",how:"founder",founder:true,fam:"green",anim:true},
  {id:"emerald",name:"زمرّد",c:"#2EE59D",d:"#04452B",e:"none",pat:"facets",pc:"rgba(255,255,255,.42)",rar:"epic",how:"store",price:550,fam:"green"},
  {id:"ruby",name:"ياقوت",c:"#FF3B6B",d:"#6B0018",e:"none",pat:"facets",pc:"rgba(255,255,255,.4)",rar:"epic",how:"store",price:550,fam:"red"},
  {id:"prism",name:"منشور",c:"#FF6B9A",d:"#3FB7FF",e:"none",pat:"tri",pc:"#FFE14D",rar:"rare",how:"store",price:350,fam:"pink"},
  {id:"moon",name:"قمر",c:"#D7DCE6",d:"#5A6272",e:"none",pat:"craters",pc:"rgba(60,66,80,.45)",rar:"rare",how:"store",price:300,fam:"silver"},
  {id:"sun",name:"شمس",c:"#FFD23F",d:"#E05A00",e:"none",pat:"rays",pc:"rgba(255,255,255,.55)",rar:"rare",how:"store",price:300,fam:"yellow"},
  {id:"planet",name:"كوكب حلقي",c:"#FF9F6B",d:"#7A2E0E",e:"orbit",ink:"rgba(255,255,255,.85)",pat:"bands",pc:"rgba(255,240,220,.4)",rar:"epic",how:"store",price:600,fam:"orange"},
  {id:"pixel",name:"بكسل",c:"#8BE9FD",d:"#2B3A67",e:"none",pat:"pixels",pc:"rgba(10,14,30,.5)",rar:"rare",how:"store",price:350,fam:"cyan"},
  {id:"marble",name:"رخام",c:"#F4F1EC",d:"#9A948A",e:"none",pat:"veins",pc:"rgba(90,80,70,.5)",rar:"epic",how:"store",price:600,fam:"white"},
  {id:"neonweb",name:"شبكة نيون",c:"#FF4FD8",base:"#0B0A14",d:"#000000",e:"none",pat:"web",pc:"rgba(255,79,216,.85)",rar:"epic",how:"store",price:700,fam:"pink"},
  {id:"eye",name:"العين",c:"#9CF6FF",d:"#155E75",e:"eye",rar:"rare",how:"store",price:300,fam:"cyan"},
  {id:"skull",name:"جمجمة",c:"#E8E8F0",d:"#6B6B80",e:"skull",rar:"epic",how:"store",price:500,lvl:8,fam:"white"},
  {id:"heart",name:"قلب",c:"#FF6B9A",d:"#B0144A",e:"heart",rar:"common",how:"store",price:120,fam:"pink"},
  {id:"star",name:"نجمة",c:"#FFE14D",d:"#C47F00",e:"star",rar:"common",how:"store",price:120,fam:"yellow"},
  {id:"vortex",name:"دوامة",c:"#7B5CFF",d:"#120A3A",e:"none",pat:"spiral",pc:"rgba(255,255,255,.55)",rar:"legendary",how:"level",lvl:32,fam:"violet",anim:true},
  {id:"royal",name:"ملكي",c:"#B98CFF",d:"#3A0E6B",e:"crown",ink:"#FFD86B",pat:"band",pc:"#FFD86B",rar:"epic",how:"store",price:700,fam:"violet"},
  {id:"inkdrop",name:"قطرة حبر",c:"#B48CFF",base:"#0B0A12",d:"#000000",e:"none",pat:"drip",pc:"rgba(155,92,255,.85)",rar:"epic",how:"store",price:650,fam:"violet"},
  {id:"obsidian",name:"زجاج بركاني",c:"#3B3F5C",d:"#0B0C15",e:"gem",rar:"epic",how:"store",price:700,fam:"black",pat:"facets"},
  {id:"coral",name:"مرجان",c:"#FF7F6E",d:"#A8323A",e:"wave",rar:"rare",how:"store",price:350,fam:"red",pat:"bubbles"},
  {id:"jade",name:"يشم",c:"#3BD18A",d:"#0D5C3A",e:"leaf",rar:"rare",how:"store",price:350,fam:"green",pat:"veins"},
  {id:"sapphire",name:"ياقوت أزرق",c:"#3A6BFF",d:"#0D1E66",e:"gem",rar:"epic",how:"store",price:650,fam:"blue",pat:"facets"},
  {id:"amber",name:"كهرمان",c:"#FFB02E",d:"#8A4B00",e:"dot",rar:"rare",how:"store",price:320,fam:"orange",pat:"drip"},
  {id:"nebula",name:"سديم",c:"#C06BFF",d:"#2A0B5C",e:"spiral",rar:"epic",how:"store",price:700,fam:"purple",pat:"stars"},
  {id:"sandstorm",name:"عاصفة رملية",c:"#E3B778",d:"#7A5226",e:"tornado",rar:"rare",how:"store",price:340,fam:"orange",pat:"mist"},
  {id:"rose",name:"وردة",c:"#FF6FA8",d:"#9C1F55",e:"heart",rar:"common",how:"store",price:150,fam:"pink"},
  {id:"steel",name:"فولاذ",c:"#AEB7C6",d:"#3A4456",e:"shield",rar:"common",how:"store",price:150,fam:"gray",pat:"shine"},
  {id:"matrix",name:"مصفوفة",c:"#39FF88",d:"#03210F",e:"cube",rar:"epic",how:"store",price:680,fam:"green",pat:"pixels"},
  {id:"sunset",name:"غروب",c:"#FF8A3D",d:"#7A1F5C",e:"sun",rar:"rare",how:"store",price:360,fam:"orange",pat:"bands"},
  {id:"glacier",name:"جليد قطبي",c:"#BFF4FF",d:"#2C7FA8",e:"snow",rar:"rare",how:"store",price:340,fam:"cyan",pat:"crack"},
  {id:"sting",name:"لدغة",c:"#B6FF3B",d:"#2F5C00",e:"stinger",rar:"epic",how:"store",price:650,fam:"green",pat:"drip"},
  {id:"phantom",name:"طيف",c:"#E8E6FF",d:"#5B5480",e:"mask",rar:"epic",how:"store",price:700,fam:"white",pat:"mist"},
  {id:"dragonfire",name:"نفَس التنين",c:"#FF4D2E",d:"#4A0A00",e:"flame",rar:"legendary",how:"store",price:1500,fam:"red",pat:"crack",anim:true},
  {id:"borealis",name:"شفق",c:"#5CFFD1",d:"#1B2A6B",e:"star",rar:"legendary",how:"level",lvl:47,fam:"cyan",pat:"aurora",anim:true},
  {id:"royalgold",name:"ذهب ملكي",c:"#F7D46B",d:"#7A4A0E",e:"crown",rar:"legendary",how:"store",price:1600,fam:"yellow",pat:"rays",anim:true},
  {id:"creator",name:"عنكبوت الخالق",c:"#FFD86B",base:"#0A0812",d:"#000000",e:"spider",ink:"#FFD86B",pat:"creator",pc:"rgba(255,216,107,.65)",rar:"owner",how:"owner",fam:"gold",anim:true}
];
const FRAMES=[
  {id:"basic",name:"أساسي",rar:"common",how:"free"},
  {id:"web",name:"شبكة",rar:"rare",how:"level",lvl:5},
  {id:"neon",name:"نيون",rar:"rare",how:"store",price:200},
  {id:"ice",name:"جليد",rar:"rare",how:"store",price:250},
  {id:"toxic",name:"سمّي",rar:"rare",how:"ach",ach:"wins10"},
  {id:"electric",name:"كهرباء",rar:"epic",how:"store",price:450,lvl:5},
  {id:"fire",name:"لهب",rar:"epic",how:"store",price:450,lvl:5},
  {id:"galaxy",name:"مجرّة",rar:"epic",how:"level",lvl:15},
  {id:"gold",name:"ذهبي",rar:"legendary",how:"level",lvl:35},
  {id:"legend",name:"عنكبوت أسطوري",rar:"legendary",how:"level",lvl:50},
  {id:"webverse",name:"إطار الأكوان",rar:"secret",how:"code"},
  {id:"power",name:"إطار القوة",rar:"secret",how:"code"},
  {id:"founder",name:"إطار المؤسس",rar:"secret",how:"founder",founder:true},
  {id:"chain",name:"سلاسل",rar:"rare",how:"store",price:250},
  {id:"stars",name:"نجوم",rar:"rare",how:"store",price:300},
  {id:"rainbow",name:"قوس قزح",rar:"epic",how:"store",price:600,lvl:10},
  {id:"smoke",name:"دخان",rar:"rare",how:"store",price:300},
  {id:"glass",name:"زجاج",rar:"rare",how:"store",price:250},
  {id:"pixel",name:"بكسل",rar:"rare",how:"store",price:300},
  {id:"lava",name:"حمم",rar:"epic",how:"store",price:550,lvl:6},
  {id:"thorns",name:"أشواك",rar:"epic",how:"level",lvl:23},
  {id:"royal",name:"ملكي",rar:"epic",how:"store",price:650,lvl:8},
  {id:"cyber",name:"سايبر",rar:"rare",how:"store",price:350},
  {id:"ink",name:"حبر",rar:"epic",how:"store",price:600},
  {id:"sakura",name:"زهر الكرز",rar:"rare",how:"store",price:280},
  {id:"obsidian",name:"زجاج بركاني",rar:"epic",how:"store",price:520},
  {id:"hexa",name:"سداسي",rar:"rare",how:"store",price:260},
  {id:"aurora",name:"شفق",rar:"legendary",how:"store",price:1300},
  {id:"sunburst",name:"شمس متفجرة",rar:"epic",how:"store",price:500},
  {id:"frostbite",name:"قضمة صقيع",rar:"rare",how:"store",price:280},
  {id:"ember",name:"جمر",rar:"rare",how:"store",price:300},
  {id:"jade",name:"يشم",rar:"rare",how:"store",price:300},
  {id:"dualring",name:"حلقتين",rar:"rare",how:"store",price:260},
  {id:"studs",name:"مرصّع",rar:"epic",how:"store",price:480},
  {id:"comet",name:"مذنّب",rar:"epic",how:"store",price:520},
  {id:"rune",name:"رونية",rar:"legendary",how:"level",lvl:46},
  {id:"carbon",name:"كربون",rar:"common",how:"store",price:120},
  {id:"candy",name:"حلاوة",rar:"common",how:"store",price:120},
  {id:"twilight",name:"شفق المغيب",rar:"rare",how:"store",price:300},
  {id:"creator",name:"تاج الخالق",rar:"owner",how:"owner"}
];
const DECOS=[
  {id:"none",name:"بدون",rar:"common",how:"free"},
  {id:"halo",name:"هالة نيون",rar:"rare",how:"store",price:300},
  {id:"webhalo",name:"هالة الشبكة",rar:"rare",how:"level",lvl:14},
  {id:"minispider",name:"عنكبوت صغير",rar:"rare",how:"level",lvl:27},
  {id:"eaura",name:"هالة كهربائية",rar:"epic",how:"store",price:500},
  {id:"faura",name:"هالة نار",rar:"epic",how:"store",price:500},
  {id:"iaura",name:"هالة جليد",rar:"epic",how:"store",price:500},
  {id:"saura",name:"هالة ظل",rar:"epic",how:"store",price:500},
  {id:"galring",name:"حلقة مجرّية",rar:"epic",how:"store",price:650,lvl:10},
  {id:"crown",name:"تاج العنكبوت",rar:"legendary",how:"store",price:1200,lvl:15},
  {id:"wings",name:"أجنحة ذهبية",rar:"legendary",how:"level",lvl:42},
  {id:"horns",name:"قرون",rar:"epic",how:"store",price:520},
  {id:"antenna",name:"مجسّات",rar:"rare",how:"store",price:300},
  {id:"laurel",name:"إكليل غار",rar:"epic",how:"store",price:560},
  {id:"orbitstars",name:"نجوم تدور",rar:"epic",how:"store",price:600},
  {id:"flamecrown",name:"تاج لهب",rar:"legendary",how:"store",price:1400},
  {id:"icecrown",name:"تاج جليد",rar:"epic",how:"store",price:560},
  {id:"catears",name:"آذان قطة",rar:"rare",how:"store",price:280},
  {id:"headphones",name:"سماعات",rar:"rare",how:"store",price:320},
  {id:"bow",name:"فيونكة",rar:"common",how:"store",price:140},
  {id:"sparkles",name:"لمعات",rar:"rare",how:"store",price:300},
  {id:"bubbles",name:"فقاعات",rar:"rare",how:"store",price:280},
  {id:"thornring",name:"حلقة أشواك",rar:"epic",how:"store",price:520},
  {id:"rune",name:"دائرة رونية",rar:"legendary",how:"store",price:1500},
  {id:"chain",name:"سلسلة",rar:"rare",how:"store",price:300},
  {id:"cometorbit",name:"مذنّب دوّار",rar:"epic",how:"store",price:600},
  {id:"petals",name:"بتلات",rar:"rare",how:"store",price:300},
  {id:"visor",name:"نظارة سايبر",rar:"epic",how:"store",price:540},
  {id:"duskwings",name:"أجنحة الغسق",rar:"epic",how:"store",price:620},
  {id:"starcrown",name:"تاج النجوم",rar:"legendary",how:"level",lvl:49},
];
const BGS=[
  {id:"none",name:"بدون",rar:"common",how:"free"},
  {id:"city",name:"مدينة العناكب",rar:"rare",how:"store",price:300},
  {id:"darkweb",name:"الشبكة المظلمة",rar:"rare",how:"level",lvl:11},
  {id:"skyline",name:"أفق نيون",rar:"rare",how:"level",lvl:22},
  {id:"galaxy",name:"مجرّة",rar:"epic",how:"store",price:500},
  {id:"cyber",name:"العالم الرقمي",rar:"rare",how:"store",price:350},
  {id:"throne",name:"العرش الذهبي",rar:"legendary",how:"store",price:1200,lvl:15},
  {id:"ink",name:"حبر الظلام",rar:"epic",how:"store",price:500},
  {id:"frozen",name:"مدينة الجليد",rar:"rare",how:"store",price:350},
  {id:"lava",name:"عالم الحمم",rar:"epic",how:"store",price:500},
  {id:"toxic",name:"الأخضر السام",rar:"rare",how:"store",price:300},
  {id:"multiverse",name:"الأكوان المتعددة",rar:"epic",how:"ach",ach:"wins100"},
  {id:"comic",name:"لوحات كوميكس",rar:"epic",how:"store",price:550},
  {id:"royalblack",name:"الأسود الملكي",rar:"epic",how:"store",price:600,lvl:8},
  {id:"storm",name:"عاصفة كهربائية",rar:"rare",how:"store",price:350},
  {id:"legend",name:"العنكبوت الأسطوري",rar:"legendary",how:"level",lvl:44},
  {id:"dunes",name:"كثبان",rar:"rare",how:"store",price:320},
  {id:"aurora",name:"شفق قطبي",rar:"epic",how:"store",price:560},
  {id:"ocean",name:"أعماق",rar:"rare",how:"store",price:320},
  {id:"sakura",name:"زهر الكرز",rar:"rare",how:"store",price:340},
  {id:"retrogrid",name:"شبكة ريترو",rar:"epic",how:"store",price:560},
  {id:"volcano",name:"بركان",rar:"epic",how:"store",price:540},
  {id:"forest",name:"غابة ليلية",rar:"rare",how:"store",price:320},
  {id:"peaks",name:"قمم ثلجية",rar:"rare",how:"store",price:320},
  {id:"deepspace",name:"فضاء عميق",rar:"legendary",how:"level",lvl:43},
  {id:"blueprint",name:"مخطط",rar:"common",how:"store",price:160},
  {id:"marble",name:"رخام ذهبي",rar:"epic",how:"store",price:600},
  {id:"rain",name:"مطر المدينة",rar:"rare",how:"store",price:340},
  {id:"honeycomb",name:"خلية",rar:"common",how:"store",price:160},
  {id:"creator",name:"عرش الخالق",rar:"owner",how:"owner"}
];
const BADGES=[
  {id:"spider",e:"🕷️",name:"عنكبوت",rar:"common",how:"free",art:{s:"circle",g:"spider",c:["#3A4160","#1E2234"]}},
  {id:"weaver",e:"🕸️",name:"نسّاج",rar:"rare",how:"level",lvl:7,art:{s:"hex",g:"web",c:["#8D65F6","#3E2394"]}},
  {id:"night",e:"🌙",name:"ليلي",rar:"rare",how:"store",price:200,art:{s:"shield",g:"moon",c:["#4553D6","#1B2266"]}},
  {id:"sniper",e:"🎯",name:"قنّاص",rar:"rare",how:"store",price:250,art:{s:"circle",g:"target",c:["#E62948","#6E0D20"]}},
  {id:"hot",e:"🔥",name:"حامي",rar:"rare",how:"ach",ach:"streak5",art:{s:"hex",g:"flame",c:["#FF7A1F","#A33A00"]}},
  {id:"fast",e:"⚡",name:"سريع",rar:"rare",how:"ach",ach:"fast_win",art:{s:"diamond",g:"bolt",c:["#FFC93C","#A86F00"]}},
  {id:"danger",e:"💀",name:"خطير",rar:"epic",how:"store",price:450,lvl:8,art:{s:"shield",g:"skull",c:["#7A1428","#24060C"]}},
  {id:"champ",e:"🏆",name:"بطل",rar:"epic",how:"ach",ach:"online25",art:{s:"crest",g:"trophy",c:["#E6B85C","#7A4A0E"]}},
  {id:"elite",e:"💎",name:"نخبة",rar:"legendary",how:"level",lvl:30,art:{s:"hex",g:"gem",c:["#4FB3FF","#1C3A9E"]}},
  {id:"legend",e:"🌌",name:"أسطورة",rar:"legendary",how:"level",lvl:45,art:{s:"seal",g:"spiral",c:["#8D65F6","#24104F"]}},
  {id:"weekly",e:"👑",name:"بطل الأسبوع",rar:"legendary",how:"weekly",art:{s:"crest",g:"crown",c:["#E62948","#5E0B1C"]}},
  {id:"og",e:"🕷️",name:"OG",rar:"secret",how:"code",art:{s:"hex",g:"spider",c:["#39FF88","#39FF88"]}},
  {id:"webmaster",e:"🕸️",name:"سيّد الشبكة",rar:"secret",how:"code",art:{s:"seal",g:"web",c:["#4FFFE0","#4FFFE0"]}},
  {id:"king",e:"👑",name:"ملك الشبكة",rar:"secret",how:"code",art:{s:"crest",g:"crown",c:["#C9FF4F","#C9FF4F"]}},
  {id:"power",e:"✊",name:"القوة",rar:"secret",how:"code",art:{s:"circle",g:"fist",c:["#FF4FD8","#FF4FD8"]}},
  {id:"founder",e:"👑",name:"FOUNDER",rar:"secret",how:"founder",founder:true,art:{s:"seal",g:"crown",c:["#F7DA97","#F7DA97"]}},
  {id:"star",e:"🌟",name:"نجم",rar:"common",how:"store",price:100,art:{s:"circle",g:"star",c:["#E6B85C","#8A5A12"]}},
  {id:"scorpion",e:"🦂",name:"عقرب",rar:"rare",how:"store",price:250,art:{s:"shield",g:"stinger",c:["#D9480F","#5C1C05"]}},
  {id:"snake",e:"🐍",name:"أفعى",rar:"rare",how:"store",price:250,art:{s:"hex",g:"snake",c:["#22C55E","#0B4A24"]}},
  {id:"brain",e:"🧠",name:"عبقري",rar:"epic",how:"store",price:450,art:{s:"circle",g:"mind",c:["#F472B6","#6E1A4A"]}},
  {id:"shield",e:"🛡️",name:"حارس",rar:"rare",how:"store",price:300,art:{s:"shield",g:"shield",c:["#7C8BA6","#1F2A3A"]}},
  {id:"swords",e:"⚔️",name:"مقاتل",rar:"rare",how:"store",price:300,art:{s:"crest",g:"swords",c:["#94A3B8","#2B3647"]}},
  {id:"gamepad",e:"🎮",name:"محترف",rar:"epic",how:"level",lvl:26,art:{s:"hex",g:"pad",c:["#8D65F6","#B0193A"]}},
  {id:"tornado",e:"🌪️",name:"إعصار",rar:"epic",how:"store",price:500,art:{s:"circle",g:"tornado",c:["#5EEAD4","#0F5F58"]}},
  {id:"planet",e:"🪐",name:"كوني",rar:"epic",how:"store",price:500,art:{s:"circle",g:"planet",c:["#FB923C","#5B2380"]}},
  {id:"cube",e:"🧊",name:"بارد",rar:"rare",how:"store",price:250,art:{s:"diamond",g:"cube",c:["#7FE8FF","#16627F"]}},
  {id:"owl",e:"🦉",name:"حكيم",rar:"rare",how:"level",lvl:24,art:{s:"shield",g:"owl",c:["#B7791F","#3F2A0A"]}},
  {id:"heart",e:"💜",name:"وفي",rar:"rare",how:"ach",ach:"login7",art:{s:"circle",g:"heart",c:["#B9A2FF","#4B2DAE"]}},
  {id:"eye",name:"عين الصقر",rar:"rare",how:"store",price:300,art:{s:"shield",g:"eye",c:["#0EA5E9","#0B3A5C"]}},
  {id:"blade",name:"نصل",rar:"rare",how:"store",price:300,art:{s:"diamond",g:"sword",c:["#CBD5E1","#3C4A60"]}},
  {id:"rocket",name:"صاروخ",rar:"epic",how:"store",price:480,art:{s:"circle",g:"rocket",c:["#E62948","#3B0A30"]}},
  {id:"sprig",name:"غصن",rar:"common",how:"store",price:120,art:{s:"circle",g:"leaf",c:["#4ADE80","#166534"]}},
  {id:"sun",name:"شمس",rar:"rare",how:"store",price:260,art:{s:"seal",g:"sun",c:["#FBBF24","#B45309"]}},
  {id:"comet",name:"مذنّب",rar:"epic",how:"level",lvl:33,art:{s:"hex",g:"comet",c:["#60A5FA","#2A2780"]}},
  {id:"key",name:"مفتاح",rar:"rare",how:"store",price:280,art:{s:"shield",g:"key",c:["#E6B85C","#6E420C"]}},
  {id:"mask",name:"قناع",rar:"epic",how:"store",price:480,art:{s:"crest",g:"mask",c:["#A855F7","#33075A"]}},
  {id:"wing",name:"جناح",rar:"epic",how:"store",price:500,art:{s:"hex",g:"wing",c:["#E0F2FE","#56657E"]}},
  {id:"infinity",name:"لا نهاية",rar:"legendary",how:"store",price:1200,art:{s:"seal",g:"infinity",c:["#8D65F6","#B0193A"]}},
  {id:"hourglass",name:"صبور",rar:"rare",how:"store",price:280,art:{s:"diamond",g:"hourglass",c:["#FCD34D","#8A3A0E"]}},
  {id:"compass",name:"مستكشف",rar:"rare",how:"store",price:280,art:{s:"circle",g:"compass",c:["#2DD4BF","#124A46"]}},
  {id:"note",name:"نغمة",rar:"common",how:"store",price:140,art:{s:"circle",g:"note",c:["#F472B6","#831843"]}},
  {id:"feather",name:"ريشة",rar:"rare",how:"store",price:260,art:{s:"shield",g:"feather",c:["#93C5FD","#1E3A8A"]}},
  {id:"summit",name:"القمة",rar:"rare",how:"level",lvl:19,art:{s:"hex",g:"mountain",c:["#94A3B8","#1E293B"]}},
  {id:"wave",name:"موجة",rar:"rare",how:"store",price:260,art:{s:"circle",g:"wave",c:["#38BDF8","#0C4A6E"]}},
  {id:"frost",name:"صقيع",rar:"rare",how:"store",price:260,art:{s:"hex",g:"snow",c:["#BAE6FD","#0369A1"]}},
  {id:"atom",name:"ذرّي",rar:"epic",how:"store",price:500,art:{s:"seal",g:"atom",c:["#22D3EE","#5B21B6"]}},
  {id:"anchor",name:"ثابت",rar:"rare",how:"store",price:280,art:{s:"shield",g:"anchor",c:["#60A5FA","#1E3A8A"]}},
  {id:"fang",name:"أنياب",rar:"epic",how:"store",price:480,art:{s:"crest",g:"fang",c:["#E62948","#2B0A12"]}},
  {id:"owner",e:"👑",name:"OWNER",rar:"owner",how:"owner",art:{s:"crest",g:"crown",c:["#E6B85C","#E6B85C"]}},
  {id:"creator",e:"👑",name:"GAME CREATOR",rar:"owner",how:"owner",art:{s:"seal",g:"spider",c:["#E6B85C","#E6B85C"]}}
];
const THEMES=[
  {id:"default",name:"افتراضي",rar:"common",how:"free"},
  {id:"toxic",name:"أخضر سام",rar:"rare",how:"level",lvl:9},
  {id:"fire",name:"لهب",rar:"rare",how:"store",price:200},
  {id:"ice",name:"جليدي",rar:"rare",how:"level",lvl:17},
  {id:"electric",name:"كهربائي",rar:"epic",how:"ach",ach:"multi_bot"},
  {id:"purple",name:"بنفسجي نيون",rar:"epic",how:"level",lvl:20},
  {id:"galaxy",name:"مجرّي",rar:"epic",how:"store",price:600,lvl:10},
  {id:"gold",name:"ذهبي",rar:"legendary",how:"level",lvl:38},
  {id:"rainbow",name:"قوس قزح",rar:"legendary",how:"level",lvl:48},
  {id:"multiverse",name:"الأكوان المتعددة",rar:"secret",how:"code"},
  {id:"founder",name:"المؤسس",rar:"secret",how:"founder",founder:true},
  {id:"sunset",name:"غروب",rar:"rare",how:"store",price:250},
  {id:"ocean",name:"محيط",rar:"rare",how:"store",price:250},
  {id:"cyber",name:"رقمي",rar:"epic",how:"store",price:450},
  {id:"aurora",name:"شفق",rar:"epic",how:"store",price:500},
  {id:"lava",name:"حمم",rar:"rare",how:"store",price:300},
  {id:"neonpink",name:"نيون وردي",rar:"rare",how:"store",price:300},
  {id:"emerald",name:"زمرد",rar:"rare",how:"store",price:300},
  {id:"silver",name:"فضي",rar:"common",how:"store",price:150},
  {id:"sunrise",name:"شروق",rar:"rare",how:"store",price:300},
  {id:"holo",name:"هولوغرام",rar:"legendary",how:"level",lvl:41},
  {id:"shadow",name:"ظل مزدوج",rar:"epic",how:"store",price:480},
  {id:"candy",name:"حلاوة",rar:"common",how:"store",price:150},
  {id:"royal",name:"ملكي",rar:"epic",how:"store",price:520},
  {id:"creator",name:"الخالق",rar:"owner",how:"owner"}
];
const TITLES=[
  {id:"rookie",name:"مبتدئ",rar:"common",how:"free"},
  {id:"adventurer",name:"مغامر",rar:"common",how:"store",price:150},
  {id:"weaver",name:"نسّاج الشبكة",rar:"rare",how:"level",lvl:6},
  {id:"tactician",name:"تكتيكي",rar:"rare",how:"store",price:300},
  {id:"hunter",name:"الصياد",rar:"rare",how:"ach",ach:"wins10"},
  {id:"hardslayer",name:"قاهر الصعب",rar:"rare",how:"ach",ach:"beat_hard"},
  {id:"social",name:"اجتماعي",rar:"rare",how:"ach",ach:"online_first"},
  {id:"loyal",name:"المواظب",rar:"rare",how:"ach",ach:"login7"},
  {id:"climber",name:"متسلّق",rar:"rare",how:"level",lvl:12},
  {id:"silent",name:"الظل الصامت",rar:"epic",how:"store",price:500,lvl:8},
  {id:"expert",name:"خبير الشبكة",rar:"epic",how:"ach",ach:"wins25"},
  {id:"threads",name:"ملك الخيوط",rar:"epic",how:"ach",ach:"walls100"},
  {id:"secrets",name:"صياد الأسرار",rar:"epic",how:"ach",ach:"secret_first"},
  {id:"silk",name:"سيّد الحرير",rar:"epic",how:"level",lvl:28},
  {id:"undefeated",name:"لا يُهزم",rar:"legendary",how:"ach",ach:"streak10"},
  {id:"legend",name:"أسطورة سبايدر",rar:"legendary",how:"level",lvl:50},
  {id:"weekly",name:"بطل الأسبوع",rar:"legendary",how:"weekly"},
  {id:"founder",name:"مؤسس سبايدر",rar:"secret",how:"founder",founder:true},
  {id:"challenger",name:"المتحدي",rar:"common",how:"store",price:150},
  {id:"fox",name:"الثعلب",rar:"rare",how:"store",price:200},
  {id:"strategist",name:"المخطط",rar:"rare",how:"store",price:250},
  {id:"gaps",name:"صائد الثغرات",rar:"rare",how:"store",price:300},
  {id:"quick",name:"سريع البديهة",rar:"rare",how:"store",price:300},
  {id:"gate",name:"حارس البوابة",rar:"rare",how:"level",lvl:21},
  {id:"nomad",name:"رحّال الشبكة",rar:"rare",how:"ach",ach:"moves1000"},
  {id:"trapper",name:"صانع الفخاخ",rar:"epic",how:"store",price:500},
  {id:"mastermind",name:"العقل المدبر",rar:"epic",how:"store",price:600,lvl:10},
  {id:"onlineking",name:"ملك الأونلاين",rar:"legendary",how:"ach",ach:"online25"},
  {id:"threadhunter",name:"صياد الخيوط",rar:"rare",how:"store",price:280},
  {id:"architect",name:"مهندس الشبكة",rar:"epic",how:"store",price:500},
  {id:"mazelord",name:"سيد المتاهات",rar:"epic",how:"store",price:520},
  {id:"stubborn",name:"الخصم العنيد",rar:"rare",how:"store",price:260},
  {id:"comeback",name:"ملك العودة",rar:"epic",how:"store",price:500},
  {id:"roadblock",name:"قاطع الطريق",rar:"rare",how:"store",price:280},
  {id:"rising",name:"النجم الصاعد",rar:"common",how:"store",price:120},
  {id:"visionary",name:"بعيد النظر",rar:"rare",how:"store",price:260},
  {id:"calm",name:"الهادئ",rar:"common",how:"store",price:120},
  {id:"ambusher",name:"المباغت",rar:"rare",how:"store",price:280},
  {id:"edgeguard",name:"حارس الحافة",rar:"rare",how:"store",price:280},
  {id:"schemer",name:"مدبّر الكمائن",rar:"epic",how:"store",price:480},
  {id:"loner",name:"الذئب الوحيد",rar:"rare",how:"store",price:300},
  {id:"patient",name:"صاحب النفس الطويل",rar:"rare",how:"store",price:280},
  {id:"sharp",name:"حاد الذكاء",rar:"rare",how:"store",price:260},
  {id:"webknight",name:"فارس الشبكة",rar:"epic",how:"store",price:520},
  {id:"sly",name:"الماكر",rar:"common",how:"store",price:130},
  {id:"fearless",name:"بلا خوف",rar:"common",how:"store",price:130},
  {id:"companion",name:"رفيق الدرب",rar:"rare",how:"store",price:260},
  {id:"livinglegend",name:"الأسطورة الحية",rar:"legendary",how:"level",lvl:34},
  {id:"creator",name:"THE CREATOR",rar:"owner",how:"owner"},
  {id:"owner",name:"OWNER",rar:"owner",how:"owner"}
];
const BOARDS=[
  {id:"classic",name:"الكلاسيكية",rar:"common",how:"free"},
  {id:"neoncity",name:"مدينة نيون",rar:"rare",how:"store",price:350},
  {id:"dark",name:"ساحة الظلام",rar:"rare",how:"store",price:300},
  {id:"popart",name:"بوب آرت",rar:"epic",how:"store",price:550},
  {id:"cybergrid",name:"الشبكة الرقمية",rar:"rare",how:"store",price:400},
  {id:"galaxy",name:"ساحة المجرّة",rar:"epic",how:"store",price:600},
  {id:"lava",name:"ساحة الحمم",rar:"epic",how:"store",price:550},
  {id:"frozen",name:"شبكة الجليد",rar:"rare",how:"level",lvl:31},
  {id:"golden",name:"القصر الذهبي",rar:"legendary",how:"level",lvl:37},
  {id:"toxiclab",name:"المختبر السام",rar:"rare",how:"store",price:350},
  {id:"rooftop",name:"سطح منتصف الليل",rar:"rare",how:"level",lvl:8},
  {id:"royal",name:"الشبكة الملكية",rar:"legendary",how:"store",price:1200,lvl:12},
  {id:"desert",name:"صحراء",rar:"rare",how:"store",price:380},
  {id:"abyss",name:"الأعماق",rar:"rare",how:"store",price:380},
  {id:"jungle",name:"أدغال",rar:"rare",how:"store",price:380},
  {id:"sakura",name:"زهر الكرز",rar:"epic",how:"store",price:600},
  {id:"synthwave",name:"سينث ويف",rar:"epic",how:"store",price:650},
  {id:"magma",name:"صهارة",rar:"epic",how:"store",price:620},
  {id:"hive",name:"خلية",rar:"rare",how:"store",price:360},
  {id:"auroraboard",name:"ليل الشفق",rar:"epic",how:"store",price:650},
  {id:"blueprint",name:"مخطط هندسي",rar:"common",how:"store",price:180},
  {id:"marble",name:"رخام أسود",rar:"epic",how:"store",price:620},
  {id:"runestone",name:"حجر الرونية",rar:"legendary",how:"store",price:1400},
  {id:"storm",name:"عاصفة",rar:"rare",how:"store",price:380},
  {id:"creator",name:"طاولة الخالق",rar:"owner",how:"owner"}
];
const WEBS=[
  {id:"classic",name:"الكلاسيكي",rar:"common",how:"free"},
  {id:"electric",name:"كهربائي",rar:"rare",how:"store",price:300},
  {id:"fire",name:"ناري",rar:"rare",how:"store",price:300},
  {id:"ice",name:"جليدي",rar:"rare",how:"store",price:300},
  {id:"ink",name:"حبر أسود",rar:"epic",how:"store",price:450},
  {id:"golden",name:"ذهبي",rar:"epic",how:"store",price:500,lvl:6},
  {id:"neon",name:"نيون مزدوج",rar:"rare",how:"store",price:350},
  {id:"galaxy",name:"مجرّي",rar:"epic",how:"store",price:450},
  {id:"crystal",name:"كريستال",rar:"rare",how:"level",lvl:13},
  {id:"shadow",name:"ظل",rar:"rare",how:"level",lvl:29},
  {id:"laser",name:"ليزر",rar:"epic",how:"store",price:500},
  {id:"royal",name:"ملكي",rar:"legendary",how:"store",price:900,lvl:12},
  {id:"toxic",name:"سام",rar:"rare",how:"store",price:320},
  {id:"sakura",name:"زهري",rar:"rare",how:"store",price:320},
  {id:"aqua",name:"مائي",rar:"rare",how:"store",price:300},
  {id:"lava",name:"حمم",rar:"epic",how:"store",price:560},
  {id:"retro",name:"ريترو",rar:"epic",how:"store",price:560},
  {id:"jade",name:"يشم",rar:"rare",how:"store",price:320},
  {id:"storm",name:"عاصفة",rar:"epic",how:"store",price:580},
  {id:"silk",name:"حرير",rar:"common",how:"store",price:150},
  {id:"rune",name:"رونية",rar:"legendary",how:"store",price:1300},
  {id:"obsidian",name:"زجاج بركاني",rar:"epic",how:"store",price:560},
  {id:"sunbeam",name:"شعاع الشمس",rar:"rare",how:"store",price:320},
  {id:"aurora",name:"شفق",rar:"legendary",how:"store",price:1350},
  {id:"creator",name:"خيوط الخالق",rar:"owner",how:"owner"}
];
const MOVES=[
  {id:"none",name:"بدون",rar:"common",how:"free"},
  {id:"webtrail",name:"أثر الشبكة",rar:"rare",how:"level",lvl:4},
  {id:"electric",name:"أثر كهربائي",rar:"rare",how:"store",price:300},
  {id:"fire",name:"أثر ناري",rar:"rare",how:"store",price:300},
  {id:"ice",name:"جزيئات جليد",rar:"rare",how:"store",price:300},
  {id:"smoke",name:"دخان سام",rar:"rare",how:"store",price:350},
  {id:"dust",name:"غبار المجرّة",rar:"epic",how:"store",price:450},
  {id:"sparks",name:"لمعات ذهبية",rar:"epic",how:"store",price:500},
  {id:"shadow",name:"أثر الظل",rar:"epic",how:"store",price:450},
  {id:"rainbow",name:"أثر قوس قزح",rar:"legendary",how:"level",lvl:39},
  {id:"glitch",name:"خلل رقمي",rar:"epic",how:"store",price:500},
  {id:"petals",name:"بتلات طائرة",rar:"rare",how:"store",price:320},
  {id:"bubbles",name:"فقاعات",rar:"rare",how:"store",price:300},
  {id:"stars",name:"نجوم",rar:"rare",how:"store",price:320},
  {id:"comet",name:"ذيل مذنّب",rar:"epic",how:"store",price:560},
  {id:"hearts",name:"قلوب",rar:"common",how:"store",price:160},
  {id:"pixels",name:"بكسلات",rar:"rare",how:"store",price:320},
  {id:"rings",name:"حلقات",rar:"rare",how:"store",price:300},
  {id:"notes",name:"نغمات",rar:"rare",how:"store",price:300},
  {id:"leaves",name:"أوراق",rar:"rare",how:"store",price:300},
  {id:"lavatrail",name:"قطرات حمم",rar:"epic",how:"store",price:540},
  {id:"ghost",name:"طيف",rar:"epic",how:"store",price:560},
  {id:"plasma",name:"بلازما",rar:"epic",how:"store",price:580},
  {id:"confettitrail",name:"قصاصات",rar:"rare",how:"store",price:320},
  {id:"royaltrail",name:"أثر ملكي",rar:"legendary",how:"store",price:1300},
];
const WINS=[
  {id:"classic",name:"الكلاسيكي",rar:"common",how:"free"},
  {id:"spiders",name:"انفجار العناكب",rar:"epic",how:"level",lvl:36},
  {id:"crown",name:"التاج الذهبي",rar:"legendary",how:"store",price:1200,lvl:15},
  {id:"lightning",name:"صاعقة",rar:"epic",how:"store",price:550},
  {id:"webburst",name:"انفجار الشبكة",rar:"rare",how:"level",lvl:16},
  {id:"portal",name:"بوابة المجرّة",rar:"epic",how:"store",price:600},
  {id:"firecel",name:"احتفال النار",rar:"rare",how:"store",price:400},
  {id:"icestorm",name:"عاصفة الجليد",rar:"rare",how:"store",price:400},
  {id:"neonpulse",name:"نبض نيون",rar:"rare",how:"store",price:350},
  {id:"confetti",name:"قصاصات",rar:"rare",how:"store",price:300},
  {id:"royal",name:"انتصار ملكي",rar:"legendary",how:"store",price:1000,lvl:12},
  {id:"inktake",name:"اجتياح الحبر",rar:"epic",how:"store",price:550},
  {id:"rift",name:"شق الأكوان",rar:"legendary",how:"store",price:1100,lvl:18},
  {id:"fireworks",name:"ألعاب نارية",rar:"epic",how:"store",price:620},
  {id:"aurorawin",name:"شفق",rar:"legendary",how:"store",price:1400},
  {id:"heartsrain",name:"قلوب",rar:"rare",how:"store",price:360},
  {id:"starfall",name:"مطر النجوم",rar:"epic",how:"store",price:600},
  {id:"shockwave",name:"موجة صدمة",rar:"rare",how:"store",price:360},
  {id:"sakurawin",name:"عاصفة بتلات",rar:"rare",how:"store",price:380},
  {id:"runecircle",name:"دائرة رونية",rar:"legendary",how:"store",price:1450},
  {id:"pixelwin",name:"فوز بكسلي",rar:"rare",how:"store",price:360},
  {id:"tornadowin",name:"إعصار",rar:"epic",how:"store",price:600},
  {id:"sunrise",name:"شروق",rar:"rare",how:"store",price:380},
  {id:"thunderdome",name:"رعد مزدوج",rar:"epic",how:"store",price:640},
  {id:"creator",name:"انتصار الخالق",rar:"owner",how:"owner"}
];
const EMOTES=[
  {id:"laugh",t:"😂",name:"ضحك",rar:"common",how:"free",anim:"pop",art:{s:"bubble",g:"laugh",x:"هههه",c:["#FBBF24","#C2410C"]}},
  {id:"devil",t:"😈",name:"شرير",rar:"common",how:"free",anim:"pop",art:{s:"badge",g:"horns",c:["#E62948","#6E0D20"]}},
  {id:"spider",t:"🕷️",name:"عنكبوت",rar:"common",how:"free",anim:"spin",art:{s:"badge",g:"spider",c:["#2A3048","#11141F"]}},
  {id:"crown",t:"👑",name:"تاج",rar:"common",how:"free",anim:"bounce",art:{s:"burst",g:"crown",c:["#E6B85C","#8A5A12"]}},
  {id:"fire",t:"🔥",name:"نار",rar:"common",how:"free",anim:"pulse",art:{s:"burst",g:"flame",c:["#FF8A3D","#B42318"]}},
  {id:"bolt",t:"⚡",name:"برق",rar:"common",how:"free",anim:"pop",art:{s:"badge",g:"bolt",c:["#FFC93C","#9A6400"]}},
  {id:"gg",t:"GG",name:"GG",rar:"common",how:"free",anim:"pop",art:{s:"tag",x:"GG",c:["#3DDC97","#0F6E5C"]}},
  {id:"nice",t:"حركة حلوة!",name:"حركة حلوة",rar:"common",how:"free",anim:"pop",art:{s:"bubble",x:"حركة حلوة!",c:["#8D65F6","#4B2DAE"]}},
  {id:"wp",t:"لعبت صح",name:"لعبت صح",rar:"common",how:"free",anim:"pop",art:{s:"bubble",x:"لعبت صح",c:["#4FB3FF","#1C4E9E"]}},
  {id:"revenge",t:"الثأر!",name:"الثأر",rar:"common",how:"free",anim:"pop",art:{s:"burst",x:"الثأر!",c:["#E62948","#6E0D20"]}},
  {id:"stuck",t:"🕸️ علقت!",name:"علقت",rar:"rare",how:"store",price:150,anim:"spin",art:{s:"bubble",g:"web",x:"علقت!",c:["#64748B","#1E293B"]}},
  {id:"over",t:"💀 خلاص",name:"خلاص",rar:"rare",how:"store",price:150,anim:"pop",art:{s:"bubble",g:"skull",x:"خلاص",c:["#52525B","#18181B"]}},
  {id:"genius",t:"🧠 عبقري",name:"عبقري",rar:"rare",how:"store",price:200,anim:"bounce",art:{s:"bubble",g:"mind",x:"عبقري",c:["#F472B6","#8E1450"]}},
  {id:"easy",t:"😎 سهلة",name:"سهلة",rar:"rare",how:"store",price:200,anim:"pop",art:{s:"tag",g:"shades",x:"سهلة",c:["#22D3EE","#0E6A80"]}},
  {id:"run",t:"🏃 اهرب!",name:"اهرب",rar:"epic",how:"store",price:350,anim:"dash",art:{s:"tag",g:"dash",x:"اهرب!",c:["#FB923C","#B43F0C"]}},
  {id:"boom",t:"💥 بووم",name:"بووم",rar:"epic",how:"store",price:350,anim:"boom",art:{s:"burst",x:"بووم",c:["#FF5C6C","#A51C1C"]}},
  {id:"king",t:"👑 الملك وصل",name:"الملك وصل",rar:"legendary",how:"store",price:800,anim:"bounce",art:{s:"tag",g:"crown",x:"الملك وصل",c:["#E6B85C","#7A4A0E"]}},
  {id:"hi",t:"سلام",name:"سلام",rar:"common",how:"free",anim:"pop",art:{s:"bubble",g:"hand",x:"سلام",c:["#4FB3FF","#1C4E9E"]}},
  {id:"thanks",t:"شكرًا",name:"شكرًا",rar:"common",how:"free",anim:"pop",art:{s:"bubble",g:"heart",x:"شكرًا",c:["#F472B6","#8E1450"]}},
  {id:"wow",t:"واو!",name:"واو",rar:"common",how:"free",anim:"boom",art:{s:"burst",x:"واو!",c:["#FBBF24","#B45309"]}},
  {id:"ohno",t:"أوه لا",name:"أوه لا",rar:"common",how:"free",anim:"pop",art:{s:"bubble",x:"أوه لا",c:["#94A3B8","#334155"]}},
  {id:"focus",t:"ركّز",name:"ركّز",rar:"rare",how:"store",price:150,anim:"pulse",art:{s:"tag",g:"target",x:"ركّز",c:["#E62948","#6E0D20"]}},
  {id:"sleepy",t:"نايم؟",name:"نايم؟",rar:"rare",how:"store",price:150,anim:"pop",art:{s:"bubble",g:"zzz",x:"نايم؟",c:["#6366F1","#312E81"]}},
  {id:"lucky",t:"يا حظك",name:"يا حظك",rar:"rare",how:"store",price:200,anim:"bounce",art:{s:"tag",g:"clover",x:"يا حظك",c:["#22C55E","#14532D"]}},
  {id:"yourturn",t:"دورك",name:"دورك",rar:"rare",how:"store",price:150,anim:"pulse",art:{s:"tag",g:"hourglass",x:"دورك",c:["#E6B85C","#7A4A0E"]}},
  {id:"trap",t:"مصيدة!",name:"مصيدة!",rar:"epic",how:"store",price:350,anim:"boom",art:{s:"burst",g:"web",x:"مصيدة!",c:["#8D65F6","#24104F"]}},
  {id:"nopass",t:"ما تعدّي",name:"ما تعدّي",rar:"epic",how:"store",price:350,anim:"pop",art:{s:"tag",g:"shield",x:"ما تعدّي",c:["#64748B","#0F172A"]}},
  {id:"duel",t:"تحدّي",name:"تحدّي",rar:"epic",how:"store",price:350,anim:"boom",art:{s:"burst",g:"swords",x:"تحدّي",c:["#E62948","#3B0A30"]}},
  {id:"bro",t:"أخوي",name:"أخوي",rar:"rare",how:"store",price:150,anim:"bounce",art:{s:"bubble",g:"heart",x:"أخوي",c:["#3DDC97","#0F6E5C"]}},
  {id:"creator",t:"👑 THE CREATOR",name:"THE CREATOR",rar:"owner",how:"owner",anim:"boom",art:{s:"tag",g:"crown",x:"THE CREATOR",c:["#8D65F6","#2A1466"]}}
];
const LOBBIES=[
  {id:"classic",name:"الكلاسيكية",rar:"common",how:"free"},
  {id:"neon",name:"نيون",rar:"rare",how:"store",price:300},
  {id:"cyber",name:"سايبر",rar:"rare",how:"store",price:300},
  {id:"galaxy",name:"مجرّة",rar:"epic",how:"store",price:500},
  {id:"royal",name:"ملكية",rar:"epic",how:"store",price:600},
  {id:"darkspider",name:"العنكبوت المظلم",rar:"rare",how:"level",lvl:19},
  {id:"sakura",name:"زهر الكرز",rar:"rare",how:"store",price:320},
  {id:"desert",name:"صحراء",rar:"rare",how:"store",price:320},
  {id:"abyss",name:"أعماق",rar:"rare",how:"store",price:320},
  {id:"synth",name:"سينث ويف",rar:"epic",how:"store",price:520},
  {id:"aurora",name:"شفق",rar:"epic",how:"store",price:540},
  {id:"magma",name:"صهارة",rar:"epic",how:"store",price:520},
  {id:"blueprint",name:"مخطط",rar:"common",how:"store",price:160},
  {id:"marble",name:"رخام ذهبي",rar:"epic",how:"store",price:560},
  {id:"rune",name:"رونية",rar:"legendary",how:"store",price:1200},
];
const SOUNDS=[
  {id:"classic",name:"كلاسيكي",rar:"common",how:"free"},
  {id:"cyber",name:"سايبر",rar:"rare",how:"store",price:250},
  {id:"electric",name:"كهربائي",rar:"rare",how:"store",price:250},
  {id:"arcade",name:"أركيد",rar:"epic",how:"store",price:400},
  {id:"dark",name:"مظلم",rar:"rare",how:"level",lvl:33},
  {id:"royal",name:"ملكي",rar:"epic",how:"store",price:500},
  {id:"glass",name:"زجاج",rar:"rare",how:"store",price:300},
  {id:"bass",name:"عميق",rar:"rare",how:"store",price:300},
  {id:"chime",name:"أجراس",rar:"epic",how:"store",price:480},
  {id:"chip",name:"رقاقة",rar:"rare",how:"store",price:320},
  {id:"warm",name:"دافئ",rar:"common",how:"store",price:150},
  {id:"space",name:"فضاء",rar:"epic",how:"store",price:500},
];
const XMARKS=[
  {id:"classic",name:"كلاسيك",rar:"common",how:"free",st:null},
  {id:"neon",name:"نيون",rar:"rare",how:"store",price:300,st:{x:["#FF4FD8","#FF9BEA"],o:["#00F0FF","#9BF8FF"],k:"line",g:1}},
  {id:"toxic",name:"سام",rar:"rare",how:"store",price:300,st:{x:["#8CFF2E","#39FF88"],o:["#39FF88","#C8FF6B"],k:"line",g:1}},
  {id:"ice",name:"جليد",rar:"rare",how:"store",price:320,st:{x:["#BFF4FF","#7FE8FF"],o:["#E8FBFF","#7FE8FF"],k:"double",g:0}},
  {id:"pixel",name:"بكسل",rar:"rare",how:"store",price:320,st:{x:["#39FF88","#39FF88"],o:["#FFE14D","#FFE14D"],k:"pixel",g:0}},
  {id:"brush",name:"فرشاة حبر",rar:"rare",how:"store",price:300,st:{x:["#F4F1EA","#C9C3B6"],o:["#F4F1EA","#C9C3B6"],k:"brush",g:0}},
  {id:"sakura",name:"ساكورا",rar:"rare",how:"store",price:320,st:{x:["#FFB3D1","#FF6FA8"],o:["#FFD6E7","#FF6FA8"],k:"round",g:0}},
  {id:"shadow",name:"ظل",rar:"rare",how:"store",price:300,st:{x:["#9D7BFF","#5B3B9E"],o:["#B9A2FF","#5B3B9E"],k:"dash",g:0}},
  {id:"flame",name:"لهب",rar:"epic",how:"store",price:560,st:{x:["#FFD23F","#FF5A1F"],o:["#FFB347","#FF2E2E"],k:"brush",g:1}},
  {id:"gold",name:"ذهب",rar:"epic",how:"store",price:580,st:{x:["#FFE7A3","#C08A1E"],o:["#FFF1C4","#C08A1E"],k:"round",g:1}},
  {id:"glitch",name:"قلتش",rar:"epic",how:"store",price:560,st:{x:["#00F0FF","#FF4FD8"],o:["#FF4FD8","#00F0FF"],k:"double",g:1}},
  {id:"lava",name:"حمم",rar:"epic",how:"store",price:560,st:{x:["#FFB02E","#FF4D2E"],o:["#FF4D2E","#FFB02E"],k:"brush",g:1}},
  {id:"galaxy",name:"مجرّة",rar:"epic",how:"store",price:580,st:{x:["#8D65F6","#4FB3FF"],o:["#B9A2FF","#FF4FD8"],k:"double",g:1}},
  {id:"aurora",name:"شفق",rar:"legendary",how:"store",price:1300,st:{x:["#5CFFD1","#B9A2FF"],o:["#5CFFD1","#4FB3FF"],k:"double",g:1}},
  {id:"royal",name:"ملكي",rar:"legendary",how:"store",price:1350,st:{x:["#E6B85C","#8D65F6"],o:["#FFE7A3","#8D65F6"],k:"round",g:1}},
  {id:"creator",name:"الخالق",rar:"owner",how:"owner",st:{x:["#FFE7A3","#8D65F6"],o:["#FFF1C4","#B9A2FF"],k:"double",g:1}}
];
const DOMTILES=[
  {id:"classic",name:"عاجي",rar:"common",how:"free",look:"classic"},
  {id:"night",name:"ليل",rar:"common",how:"store",price:180,look:"night"},
  {id:"jade",name:"يشم",rar:"rare",how:"store",price:320,look:"jade"},
  {id:"blood",name:"عقيق",rar:"rare",how:"store",price:450,look:"blood"}
];
const DOMTABLES=[
  {id:"wood",name:"خشب",rar:"common",how:"free",look:"wood"},
  {id:"marble",name:"رخام",rar:"common",how:"store",price:160,look:"marble"},
  {id:"felt",name:"جوخ",rar:"rare",how:"store",price:280,look:"felt"},
  {id:"royal",name:"ملكي",rar:"rare",how:"store",price:420,look:"royal"}
];
const CHBOARDS=[
  {id:"classic",name:"ليل",rar:"common",how:"free",look:"classic",sq:["#2A241C","#C4B49A","#E6B85C"]},
  {id:"night",name:"منتصف الليل",rar:"common",how:"store",price:180,look:"night",sq:["#12151E","#3A4158","#9BB0D0"]},
  {id:"marble",name:"رخام",rar:"rare",how:"store",price:320,look:"marble",sq:["#1C2430","#A8B0BE","#E6E1D6"]},
  {id:"royal",name:"ملكي",rar:"rare",how:"store",price:450,look:"royal",sq:["#160E22","#5A3E78","#E6B85C"]}
];
const CHPIECES=[
  {id:"classic",name:"عاج وحبر",rar:"common",how:"free",look:"classic",pc:["#F4EFE4","#1A140E","#E6B85C"]},
  {id:"gold",name:"ذهب",rar:"common",how:"store",price:160,look:"gold",pc:["#F8E7B0","#5C4310","#FFE7A3"]},
  {id:"jade",name:"يشم",rar:"rare",how:"store",price:280,look:"jade",pc:["#E7FFF6","#0E3D30","#5CFFD1"]},
  {id:"blood",name:"عقيق",rar:"rare",how:"store",price:420,look:"blood",pc:["#FFE8E4","#6A1220","#FF6B7A"]}
];
const CATS={skin:SKINS,frame:FRAMES,deco:DECOS,bg:BGS,badge:BADGES,theme:THEMES,title:TITLES,board:BOARDS,web:WEBS,move:MOVES,win:WINS,emote:EMOTES,lobby:LOBBIES,sound:SOUNDS,xmark:XMARKS,domtile:DOMTILES,domtable:DOMTABLES,chboard:CHBOARDS,chpiece:CHPIECES};
const CAT_NAME={skin:"سكنات",frame:"إطارات",deco:"زينة",bg:"خلفيات",badge:"شارات",theme:"ألوان الاسم",title:"ألقاب",board:"طاولات",web:"خيوط",move:"تأثيرات الحركة",win:"تأثيرات الفوز",emote:"تفاعلات",lobby:"غرف الانتظار",sound:"حزم الأصوات",xmark:"أشكال XO",domtile:"أحجار الدومينو",domtable:"طاولات الدومينو",chboard:"رقاع الشطرنج",chpiece:"قطع الشطرنج"};
const CAT_ONE={skin:"سكن",xmark:"شكل XO",frame:"إطار",deco:"زينة",bg:"خلفية",badge:"شارة",theme:"لون اسم",title:"لقب",board:"طاولة",web:"خيط",move:"تأثير حركة",win:"تأثير فوز",emote:"تفاعل",lobby:"غرفة انتظار",sound:"حزمة أصوات",domtile:"حجر دومينو",domtable:"طاولة دومينو",chboard:"رقعة شطرنج",chpiece:"قطع شطرنج"};
const CAT_MINE={skin:"سكنك",frame:"إطارك",deco:"زينتك",bg:"خلفيتك",badge:"شارتك",theme:"لون اسمك",title:"لقبك",board:"طاولتك",web:"خيطك",move:"تأثير حركتك",win:"تأثير فوزك",emote:"تفاعلك",lobby:"غرفتك",sound:"أصواتك",xmark:"شكل XO حقك",domtile:"حجارك",domtable:"طاولة الدومينو",chboard:"رقعتك",chpiece:"قطعك"};
const EQUIP_TYPES=Object.keys(CATS).filter(t=>t!=="emote");
const ITEM_INDEX={};
for(const t in CATS){ITEM_INDEX[t]={};CATS[t].forEach((it,i)=>{it.type=t;ITEM_INDEX[t][it.id]=it;if(t==="skin")it.idx=i})}
const findItem=(t,id)=>(has(ITEM_INDEX,t)&&typeof id==="string"&&has(ITEM_INDEX[t],id))?ITEM_INDEX[t][id]:null;
const skinIdx=id=>{const s=findItem("skin",id);return s?s.idx:0};
const BASE_OWNED={};const DEFAULT_EQUIP={};
for(const t in CATS){BASE_OWNED[t]=CATS[t].filter(i=>i.how==="free").map(i=>i.id);DEFAULT_EQUIP[t]=BASE_OWNED[t][0]}
DEFAULT_EQUIP.skin="toxic";
const isOwnerItem=it=>!!it&&it.rar==="owner";
/* bundles: every part is a store item; the price is 25% under the parts still missing */
const BUNDLES=[
  {id:"ink",name:"حزمة الحبر الأسود",e:"🖤",items:[["skin","inkdrop"],["web","ink"],["bg","ink"],["win","inktake"]]},
  {id:"cyber",name:"حزمة سايبر",e:"💠",items:[["skin","cyber"],["board","cybergrid"],["move","glitch"],["theme","cyber"]]},
  {id:"royal",name:"الحزمة الملكية",e:"👑",items:[["skin","royal"],["board","royal"],["frame","royal"],["deco","crown"],["win","royal"]]},
  {id:"galaxy",name:"حزمة المجرّة",e:"🌌",items:[["skin","galaxy"],["board","galaxy"],["web","galaxy"],["bg","galaxy"]]},
  {id:"toxin",name:"حزمة السموم",items:[["skin","sting"],["web","toxic"],["bg","forest"],["win","shockwave"]]},
  {id:"desert",name:"حزمة الصحراء",items:[["skin","sandstorm"],["board","desert"],["bg","dunes"],["lobby","desert"]]},
  {id:"aurora",name:"حزمة الشفق",items:[["frame","aurora"],["web","aurora"],["bg","aurora"],["win","aurorawin"]]}
];
const CREATOR_BUNDLE=[["skin","creator"],["frame","creator"],["badge","creator"],["title","creator"],["theme","creator"],["win","creator"],["board","creator"],["web","creator"],["bg","creator"],["emote","creator"]];

/* ================= levels ================= */
const MAX_LEVEL=50;
const xpNeed=L=>100+25*(L-1);
function levelInfo(xp){
  let L=1,acc=0;while(L<MAX_LEVEL&&xp>=acc+xpNeed(L)){acc+=xpNeed(L);L++}
  const need=L<MAX_LEVEL?xpNeed(L):0;
  return {L,into:need?xp-acc:0,need,pct:need?Math.min(1,(xp-acc)/need):1};
}
const LEVEL_ITEMS={};
for(const t in CATS)for(const it of CATS[t])if(it.how==="level")(LEVEL_ITEMS[it.lvl]=LEVEL_ITEMS[it.lvl]||[]).push({t,id:it.id});
function levelRewards(L){const items=LEVEL_ITEMS[L]||[];return items.concat([{t:"coins",n:L===MAX_LEVEL?1000:items.length?30:40+L*6}])}

/* ================= achievements ================= */
const ACHS=[
  {id:"first_game",name:"أول خطوة",desc:"العب أول مباراة",goal:1,val:p=>p.totalGames,rw:[{t:"coins",n:20}]},
  {id:"first_win",name:"أول انتصار",desc:"حقق أول فوز",goal:1,val:p=>p.wins,rw:[{t:"coins",n:50}]},
  {id:"wins10",name:"صياد",desc:"حقق ١٠ انتصارات",goal:10,val:p=>p.wins,rw:[{t:"title",id:"hunter"},{t:"frame",id:"toxic"},{t:"coins",n:100}]},
  {id:"wins25",name:"خبير الشبكة",desc:"حقق ٢٥ انتصار",goal:25,val:p=>p.wins,rw:[{t:"title",id:"expert"},{t:"coins",n:200}]},
  {id:"wins100",name:"أسطورة الشبكة",desc:"حقق ١٠٠ انتصار",goal:100,val:p=>p.wins,rw:[{t:"bg",id:"multiverse"},{t:"coins",n:600}]},
  {id:"streak3",name:"هاتريك",desc:"٣ انتصارات متتالية",goal:3,val:p=>p.bestWinStreak,rw:[{t:"skin",id:"mist"},{t:"coins",n:50}]},
  {id:"streak5",name:"ما يوقفني شيء",desc:"٥ انتصارات متتالية",goal:5,val:p=>p.bestWinStreak,rw:[{t:"badge",id:"hot"},{t:"coins",n:100}]},
  {id:"streak10",name:"لا يُهزم",desc:"١٠ انتصارات متتالية",goal:10,val:p=>p.bestWinStreak,rw:[{t:"title",id:"undefeated"},{t:"coins",n:300}]},
  {id:"streak20",name:"سلسلة أسطورية",desc:"٢٠ انتصار متتالي",goal:20,val:p=>p.bestWinStreak,rw:[{t:"coins",n:600}]},
  {id:"beat_hard",name:"هزمت الصعب",desc:"اهزم الكمبيوتر الصعب",goal:1,val:p=>p.highestBotDifficulty>=3?1:0,rw:[{t:"skin",id:"acid"},{t:"title",id:"hardslayer"},{t:"coins",n:100}]},
  {id:"multi_bot",name:"ضد الكل",desc:"اربح ضد ٣ عناكب في نفس المباراة",goal:1,val:p=>p.stats.maxBotsBeaten>=3?1:0,rw:[{t:"theme",id:"electric"},{t:"coins",n:150}]},
  {id:"online_first",name:"اجتماعي",desc:"العب أول مباراة أونلاين",goal:1,val:p=>p.onlineGames,rw:[{t:"title",id:"social"},{t:"coins",n:50}]},
  {id:"online_win",name:"أول فوز أونلاين",desc:"اربح مباراة أونلاين",goal:1,val:p=>p.onlineWins,rw:[{t:"coins",n:75}]},
  {id:"online25",name:"ملك الشبكة",desc:"اربح ٢٥ مباراة أونلاين",goal:25,val:p=>p.onlineWins,rw:[{t:"badge",id:"champ"},{t:"title",id:"onlineking"},{t:"coins",n:300}]},
  {id:"walls100",name:"ملك الخيوط",desc:"مدّ ١٠٠ خيط",goal:100,val:p=>p.totalWalls,rw:[{t:"title",id:"threads"},{t:"coins",n:100}]},
  {id:"moves1000",name:"رحّالة",desc:"تحرّك ١٠٠٠ حركة",goal:1000,val:p=>p.totalMoves,rw:[{t:"title",id:"nomad"},{t:"coins",n:150}]},
  {id:"fast_win",name:"سريع البرق",desc:"اربح مباراة في أقل من دقيقة ونص",goal:1,val:p=>p.fastestWinMs&&p.fastestWinMs<=90000?1:0,rw:[{t:"badge",id:"fast"},{t:"coins",n:75}]},
  {id:"no_walls",name:"بدون خيوط",desc:"اربح بدون ما تمدّ أي خيط",goal:1,val:p=>p.stats.noWallWin?1:0,rw:[{t:"coins",n:75}]},
  {id:"comeback",name:"قلب الطاولة",desc:"اربح بعد ما كان خصمك على بعد خطوة من الفوز",goal:1,val:p=>p.stats.comeback?1:0,rw:[{t:"coins",n:100}]},
  {id:"collector",name:"جامع الكرات",desc:"امتلك ١٠ سكنات",goal:10,val:p=>p.owned.skin.length,rw:[{t:"coins",n:200}]},
  {id:"secret_first",name:"صياد الأسرار",desc:"اكتشف أول عنصر سري",goal:1,val:p=>p.discoveredSecrets.length,rw:[{t:"title",id:"secrets"},{t:"coins",n:100}]},
  {id:"login7",name:"أسبوع كامل",desc:"استلم مكافأة اليوم السابع",goal:1,val:p=>p.stats.login7?1:0,rw:[{t:"title",id:"loyal"},{t:"badge",id:"heart"},{t:"coins",n:100}]},
  {id:"daily_all",name:"منتظم",desc:"خلّص كل مهام يوم واحد",goal:1,val:p=>p.stats.dailyAll,rw:[{t:"coins",n:50}]},
  {id:"shopper",name:"متسوّق",desc:"اشترِ ٥ عناصر من المتجر",goal:5,val:p=>p.stats.purchases,rw:[{t:"coins",n:150}]},
  {id:"stylist",name:"منسّق",desc:"احفظ أول تنسيق",goal:1,val:p=>p.loadouts.length,rw:[{t:"coins",n:50}]},
  {id:"weekly_champ",name:"بطل الأسبوع",desc:"اطلع الأول في ترتيب أسبوع",goal:1,val:p=>p.championWeeks.length,rw:[{t:"coins",n:300}]}
];
const ACH_INDEX={};ACHS.forEach(a=>ACH_INDEX[a.id]=a);

/* ================= missions & daily rewards ================= */
const DAILY_POOL=[
  {id:"d_play2",n:"العب مباراتين",ev:"game",t:2,xp:40,c:30},
  {id:"d_finish3",n:"أكمل ٣ مباريات",ev:"game",t:3,xp:60,c:45},
  {id:"d_win1",n:"اربح مباراة",ev:"win",t:1,xp:50,c:40},
  {id:"d_botwin2",n:"اربح مرتين ضد الكمبيوتر",ev:"botWin",t:2,xp:60,c:45},
  {id:"d_online1",n:"اربح مباراة أونلاين",ev:"onlineWin",t:1,xp:80,c:60,online:true},
  {id:"d_walls5",n:"مدّ ٥ خيوط",ev:"wall",t:5,xp:30,c:25},
  {id:"d_hard1",n:"العب ضد الكمبيوتر الصعب",ev:"hardGame",t:1,xp:40,c:30},
  {id:"d_moves20",n:"تحرّك ٢٠ حركة",ev:"move",t:20,xp:30,c:25}
];
const WEEKLY_MISSIONS=[
  {id:"w_play15",n:"العب ١٥ مباراة",ev:"game",t:15,xp:250,c:200},
  {id:"w_win10",n:"اربح ١٠ مباريات",ev:"win",t:10,xp:300,c:250},
  {id:"w_online5",n:"اربح ٥ مباريات أونلاين",ev:"onlineWin",t:5,xp:400,c:300},
  {id:"w_walls50",n:"مدّ ٥٠ خيط",ev:"wall",t:50,xp:200,c:150},
  {id:"w_streak3",n:"حقق سلسلة ٣ انتصارات",ev:"streak",t:3,max:true,xp:200,c:150}
];
const MISSION_INDEX={};DAILY_POOL.concat(WEEKLY_MISSIONS).forEach(m=>MISSION_INDEX[m.id]=m);
const DAILY_BONUS=[{t:"xp",n:100},{t:"coins",n:75}];
const WEEKLY_BONUS=[{t:"xp",n:300},{t:"coins",n:300}];
const LOGIN_REWARDS=[[{t:"coins",n:50}],[{t:"xp",n:100}],[{t:"coins",n:75}],[{t:"xp",n:150}],[{t:"coins",n:100}],[{t:"coins",n:100},{t:"xp",n:150}],[{t:"coins",n:300}]];

/* ================= secret codes =================
   One place to add codes. Fields: rewards, active, rarity, optional expires (ISO date),
   optional maxUses (a limit across ALL players, which only a server can count), campaign, bundle.
   Anything shipped in this file can be read by anyone who opens the source, so these are
   fun unlocks, not real secrets. CodeService.provider is the swap point for a server later. */
const SECRET_CODES={
  SPIDER2004:{rewards:[{t:"skin",id:"og"},{t:"badge",id:"og"}],active:true,rarity:"secret",campaign:"launch"},
  WEBMASTER:{rewards:[{t:"skin",id:"webmaster"},{t:"badge",id:"webmaster"}],active:true,rarity:"secret",campaign:"launch"},
  BLACKINK:{rewards:[{t:"skin",id:"ink"}],active:true,rarity:"secret",campaign:"launch"},
  "2099":{rewards:[{t:"skin",id:"future"}],active:true,rarity:"secret",campaign:"launch"},
  MULTIVERSE:{rewards:[{t:"theme",id:"multiverse"}],active:true,rarity:"secret",campaign:"launch"},
  WEBVERSE:{rewards:[{t:"frame",id:"webverse"}],active:true,rarity:"secret",campaign:"launch"},
  KINGOFWEB:{rewards:[{t:"badge",id:"king"}],active:true,rarity:"secret",campaign:"launch"},
  WITHGREATPOWER:{rewards:[{t:"frame",id:"power"},{t:"badge",id:"power"},{t:"coins",n:500}],active:true,rarity:"secret",bundle:"حزمة القوة",campaign:"launch"},
  STORM:{rewards:[{t:"skin",id:"storm"}],active:true,rarity:"secret",campaign:"launch"},
  GHOST:{rewards:[{t:"skin",id:"ghost"}],active:true,rarity:"secret",campaign:"launch"},
  SPIDER:{rewards:[{t:"coins",n:250}],active:true,rarity:"common",campaign:"coins"},
  MOHAMMED:{rewards:[{t:"skin",id:"founder"},{t:"frame",id:"founder"},{t:"badge",id:"founder"},{t:"theme",id:"founder"},{t:"title",id:"founder"},{t:"coins",n:2000}],active:true,rarity:"secret",founder:true,bundle:"حزمة المؤسس",campaign:"founder"}
};

/* ================= events =================
   Ready for seasonal events (Ramadan, Eid, Saudi National Day, Halloween, winter, anniversary).
   An event lists catalog items (added to the arrays above with how:"event", event:"<id>"),
   optional missions and codes, and a date window. Nothing shows while no event is running.
   Example:
   {id:"national-day",name:"اليوم الوطني",start:"2027-09-20",end:"2027-09-27",
    items:[["skin","nd-green"]],missions:[{id:"e_nd_win3",n:"اربح ٣ مباريات",ev:"win",t:3,xp:150,c:150}],
    codes:{NATIONALDAY:{rewards:[{t:"badge",id:"nd"}],active:true,rarity:"epic"}}} */
const EVENTS=[];
function activeEvents(){const t=clock.now();return EVENTS.filter(e=>e.active!==false&&Date.parse(e.start)<=t&&t<Date.parse(e.end))}

/* ================= time (Saudi time, weeks start on Sunday) ================= */
const DAY=86400000,RIYADH_OFFSET=3*3600000;
const dayIdx=(t)=>Math.floor(((t==null?clock.now():t)+RIYADH_OFFSET)/DAY);
const weekStart=(d)=>{d=d==null?dayIdx():d;return d-((d+4)%7)};
const weekEndsAt=()=>(weekStart()+7)*DAY-RIYADH_OFFSET;
const dayEndsAt=()=>(dayIdx()+1)*DAY-RIYADH_OFFSET;

/* ================= game rules (unchanged gameplay) ================= */
const N=9,S=11;
const DIRS=[[1,0],[-1,0],[0,1],[0,-1]];
const STARTS=[[8,4],[0,4],[4,0],[4,8]];
const wallsPer=n=>n===2?10:n===3?7:5;
const goalOf=(i,r,c)=>i===0?r===0:i===1?r===N-1:i===2?c===N-1:c===0;
const inB=(r,c)=>r>=0&&r<N&&c>=0&&c<N;
/* walls live in two 8x8 grids: h = horizontal, v = vertical, indexed by the crossing point */
function wset(walls){const h=new Uint8Array(64),v=new Uint8Array(64);for(const w of walls)(w[2]?v:h)[w[0]*8+w[1]]=1;return {h,v}}
const W=(a,r,c)=>r>=0&&r<8&&c>=0&&c<8&&a[r*8+c]===1;
function withWall(ws,r,c,o){const h=ws.h.slice(),v=ws.v.slice();(o?v:h)[r*8+c]=1;return {h,v}}
function isOpen(ws,r,c,dr,dc){
  if(!inB(r+dr,c+dc))return false;
  if(dr===1)return !(W(ws.h,r,c)||W(ws.h,r,c-1));
  if(dr===-1)return !(W(ws.h,r-1,c)||W(ws.h,r-1,c-1));
  if(dc===1)return !(W(ws.v,r,c)||W(ws.v,r-1,c));
  return !(W(ws.v,r,c-1)||W(ws.v,r-1,c-1));
}
function validMoves(g,i){
  const ws=wset(g.walls),[r,c]=g.pos[i];
  const occ=new Set();g.pos.forEach((p,j)=>{if(j!==i)occ.add(p[0]*N+p[1])});
  const O=(a,b)=>occ.has(a*N+b);
  const out=new Map();
  for(const [dr,dc] of DIRS){
    if(!isOpen(ws,r,c,dr,dc))continue;
    const nr=r+dr,nc=c+dc;
    if(!O(nr,nc)){out.set(nr*N+nc,[nr,nc]);continue}
    if(isOpen(ws,nr,nc,dr,dc)&&!O(nr+dr,nc+dc)){out.set((nr+dr)*N+nc+dc,[nr+dr,nc+dc]);continue}
    for(const [pr,pc] of (dr?[[0,1],[0,-1]]:[[1,0],[-1,0]])){
      if(isOpen(ws,nr,nc,pr,pc)&&!O(nr+pr,nc+pc))out.set((nr+pr)*N+nc+pc,[nr+pr,nc+pc]);
    }
  }
  return [...out.values()];
}
function hasPath(ws,i,p){
  const seen=new Uint8Array(N*N),q=[p[0]*N+p[1]];seen[q[0]]=1;
  for(let h=0;h<q.length;h++){const k=q[h],r=(k/N)|0,c=k%N;if(goalOf(i,r,c))return true;
    for(const [dr,dc] of DIRS){if(!isOpen(ws,r,c,dr,dc))continue;const k2=(r+dr)*N+c+dc;if(!seen[k2]){seen[k2]=1;q.push(k2)}}}
  return false;
}
function distMap(ws,i){
  const d=new Uint8Array(N*N).fill(99),q=[];
  for(let r=0;r<N;r++)for(let c=0;c<N;c++)if(goalOf(i,r,c)){d[r*N+c]=0;q.push(r*N+c)}
  for(let h=0;h<q.length;h++){const k=q[h],r=(k/N)|0,c=k%N,v=d[k]+1;
    for(const [dr,dc] of DIRS){if(!isOpen(ws,r,c,dr,dc))continue;const k2=(r+dr)*N+c+dc;if(d[k2]>v){d[k2]=v;q.push(k2)}}}
  return d;
}
function conflict(ws,r,c,o){
  if(r<0||r>N-2||c<0||c>N-2)return "المكان برا اللوحة";
  if(W(ws.h,r,c)||W(ws.v,r,c))return "يتقاطع مع خيط ثاني";
  if(o===0&&(W(ws.h,r,c-1)||W(ws.h,r,c+1)))return "يركب على خيط موجود";
  if(o===1&&(W(ws.v,r-1,c)||W(ws.v,r+1,c)))return "يركب على خيط موجود";
  return null;
}
function wallError(g,w){
  const [r,c,o]=w,ws=wset(g.walls),e=conflict(ws,r,c,o);if(e)return e;
  const ws2=withWall(ws,r,c,o);
  for(let i=0;i<g.n;i++)if(!hasPath(ws2,i,g.pos[i]))return "يسكّر الطريق كامل على "+g.players[i].nick;
  return null;
}
const clone=g=>JSON.parse(JSON.stringify(g));
function nextTurn(g){g.turn=(g.turn+1)%g.n}
function doMove(g,i,to){
  const n=clone(g),from=n.pos[i].slice();
  n.pos[i]=[to[0],to[1]];n.seq++;n.last={t:"m",i,from,to:[to[0],to[1]]};
  if(goalOf(i,to[0],to[1])){n.winner=i;const id=n.players[i].id;n.score[id]=(n.score[id]||0)+1}else nextTurn(n);
  return n;
}
function doWall(g,i,w){const n=clone(g);n.walls.push([w[0],w[1],w[2],i]);n.left[i]--;n.seq++;n.last={t:"w",i};nextTurn(n);return n}
function doSkip(g){const n=clone(g);n.seq++;n.last={t:"s",i:g.turn};nextTurn(n);return n}
const newMid=()=>"m"+Math.random().toString(36).slice(2,10)+Math.random().toString(36).slice(2,6);
function newGame(players,o){
  const n=players.length,round=o.round||1,seq=o.seq||1;
  return {seq,s0:seq,mid:o.mid||newMid(),bs:findItem("board",o.bs)?o.bs:"classic",n,players,pos:STARTS.slice(0,n).map(p=>p.slice()),walls:[],left:Array(n).fill(wallsPer(n)),
    turn:(round-1)%n,winner:null,timer:o.timer||0,last:null,score:o.score||{},round};
}
/* two balls of the same colour family would be hard to tell apart on the board,
   so a clash swaps the later player to a free base ball for this game only */
function distinctSkins(pl){
  const fams=new Set();
  for(const p of pl){
    let k=(Number.isInteger(p.skin)&&p.skin>=0&&p.skin<SKINS.length)?p.skin:0;
    if(fams.has(SKINS[k].fam)){const alt=SKINS.findIndex(s=>s.how==="free"&&!fams.has(s.fam));if(alt>=0)k=alt}
    p.skin=k;fams.add(SKINS[k].fam);
  }
  return pl;
}
function anyWall(g){for(let r=0;r<N-1;r++)for(let c=0;c<N-1;c++)for(const o of [0,1])if(!wallError(g,[r,c,o]))return true;return false}
function stuck(g,i){return validMoves(g,i).length===0&&(g.left[i]<=0||!anyWall(g))}

/* computer player: scores every move and every legal wall by the race
   (opponents' shortest path minus its own) and keeps walls for when they really hurt */
const BOT={1:{noise:1.4,wc:1.8,rnd:.22,wallChance:.35},2:{noise:.45,wc:1.3,rnd:0,wallChance:1},3:{noise:.05,wc:2.5,rnd:0,wallChance:1}};
const at=(m,p)=>m[p[0]*N+p[1]];
function botPlay(g){
  const i=g.turn,P=BOT[g.players[i].bot]||BOT[2];
  const moves=validMoves(g,i);
  if(P.rnd&&moves.length&&Math.random()<P.rnd)return {t:"m",to:moves[Math.floor(Math.random()*moves.length)]};
  const ws=wset(g.walls),opps=[];for(let j=0;j<g.n;j++)if(j!==i)opps.push(j);
  const myMap=distMap(ws,i);
  let oppMin=99,oppSum=0;for(const j of opps){const d=at(distMap(ws,j),g.pos[j]);if(d<oppMin)oppMin=d;oppSum+=d}
  const danger=(om,my)=>my===0?1000:(om<=1?-100:0);
  let best=null;
  const consider=(s,a)=>{s+=Math.random()*P.noise;if(!best||s>best.s)best={s,a}};
  for(const m of moves){const my=at(myMap,m);consider((oppMin-my)+.12*oppSum+danger(oppMin,my)+.01,{t:"m",to:m})}
  if(g.left[i]>0&&Math.random()<P.wallChance){
    for(let r=0;r<N-1;r++)for(let c=0;c<N-1;c++)for(const o of [0,1]){
      if(conflict(ws,r,c,o))continue;
      const ws2=withWall(ws,r,c,o),my=at(distMap(ws2,i),g.pos[i]);if(my>=99)continue;
      let om=99,os=0,blocked=false;
      for(const j of opps){const d=at(distMap(ws2,j),g.pos[j]);if(d>=99){blocked=true;break}if(d<om)om=d;os+=d}
      if(blocked)continue;
      consider((om-my)+.12*os-P.wc+danger(om,my),{t:"w",w:[r,c,o]});
    }
  }
  return best?best.a:null;
}

/* every state that arrives from another device is rebuilt field by field */
const okP=p=>Array.isArray(p)&&Number.isInteger(p[0])&&Number.isInteger(p[1])&&inB(p[0],p[1]);
function sanitize(g){
  if(!g||typeof g!=="object")return null;
  const n=g.n;
  if(!Number.isInteger(n)||n<2||n>4||!Number.isInteger(g.seq)||g.seq<1)return null;
  if(!Array.isArray(g.players)||g.players.length!==n||!Array.isArray(g.pos)||g.pos.length!==n)return null;
  const players=[];
  for(const p of g.players){
    if(!p||typeof p!=="object"||typeof p.id!=="string"||!p.id)return null;
    let id=p.id.slice(0,64);if(BAD_KEYS.has(id))id="x"+id;
    players.push({id,nick:String(p.nick||"لاعب").slice(0,16),skin:(Number.isInteger(p.skin)&&p.skin>=0&&p.skin<SKINS.length)?p.skin:0,bot:0});
  }
  const pos=[];for(const p of g.pos){if(!okP(p))return null;pos.push([p[0],p[1]])}
  if(!Array.isArray(g.walls)||g.walls.length>40)return null;
  const walls=[];
  for(const w of g.walls){
    if(!Array.isArray(w))return null;const [r,c,o,i]=w;
    if(![r,c,o,i].every(Number.isInteger)||r<0||r>N-2||c<0||c>N-2||(o!==0&&o!==1)||i<0||i>=n)return null;
    walls.push([r,c,o,i]);
  }
  if(!Array.isArray(g.left)||g.left.length!==n||!g.left.every(x=>Number.isInteger(x)&&x>=0&&x<=10))return null;
  if(!Number.isInteger(g.turn)||g.turn<0||g.turn>=n)return null;
  const winner=(Number.isInteger(g.winner)&&g.winner>=0&&g.winner<n)?g.winner:null;
  const score={};
  if(g.score&&typeof g.score==="object"){let k=0;for(const id of Object.keys(g.score)){if(k++>=16)break;const v=g.score[id];if(!BAD_KEYS.has(id)&&Number.isInteger(v)&&v>=0&&v<1000)score[id.slice(0,64)]=v}}
  let last=null;const l=g.last;
  if(l&&typeof l==="object"&&Number.isInteger(l.i)&&l.i>=0&&l.i<n){
    if(l.t==="m"&&okP(l.from)&&okP(l.to))last={t:"m",i:l.i,from:[l.from[0],l.from[1]],to:[l.to[0],l.to[1]]};
    else if(l.t==="w"||l.t==="s")last={t:l.t,i:l.i};
  }
  const round=(Number.isInteger(g.round)&&g.round>=1&&g.round<100000)?g.round:1;
  const mid=(typeof g.mid==="string"&&/^[a-z0-9]{4,24}$/.test(g.mid))?g.mid:"legacy"+round;
  const s0=(Number.isInteger(g.s0)&&g.s0>=1&&g.s0<=g.seq)?g.s0:g.seq;
  const bs=findItem("board",g.bs)?g.bs:"classic";
  return {seq:g.seq,s0,mid,bs,n,players,pos,walls,left:g.left.slice(),turn:g.turn,winner,timer:[0,30,60].includes(g.timer)?g.timer:0,last,score,round};
}

/* ================= more games (shared by the browser and the server) =================
   Every game follows the same shape: new(players,opts) → state, legal(g,seat,a) → error text or null,
   apply(g,seat,a) → new state, bot(g) → action, skip(g) → new state. WEBBOUND keeps its own functions. */
const dupe=o=>JSON.parse(JSON.stringify(o));
function gmBase(game,players,o){
  o=o||{};const n=players.length,seq=o.seq||1;
  return {game,n,players:players.map(p=>({id:p.id,nick:p.nick,skin:p.skin,bot:p.bot||0})),turn:((o.round||1)-1)%n,seq,s0:seq,mid:newMid(),
    winner:null,round:o.round||1,score:o.score||{},timer:o.timer||0,bs:o.bs||"classic",last:null,mv:Array(n).fill(0),walls:[]};
}
function gmScore(g){const w=g.players[g.winner].id;g.score[w]=(g.score[w]||0)+1}
/* ---- WEBGRID: dots and threads; close a box to claim it and play again ---- */
const WG={
  new(players,o){const g=gmBase("webgrid",players,o);g.R=5;g.C=5;g.h=Array(6*5).fill(0);g.v=Array(5*6).fill(0);g.b=Array(25).fill(0);g.pts=Array(g.n).fill(0);g.lastBox=-1;return g},
  legal(g,seat,a){
    if(g.winner!=null)return "انتهت المباراة";
    if(!a||a.t!=="l"||(a.o!=="h"&&a.o!=="v")||!Number.isInteger(a.r)||!Number.isInteger(a.c))return "حركة غير صحيحة";
    if(a.o==="h"){if(a.r<0||a.r>g.R||a.c<0||a.c>=g.C)return "برا اللوحة";if(g.h[a.r*g.C+a.c])return "الخيط موجود"}
    else{if(a.r<0||a.r>=g.R||a.c<0||a.c>g.C)return "برا اللوحة";if(g.v[a.r*(g.C+1)+a.c])return "الخيط موجود"}
    return null;
  },
  sides(g,r,c){const C=g.C;return (g.h[r*C+c]?1:0)+(g.h[(r+1)*C+c]?1:0)+(g.v[r*(C+1)+c]?1:0)+(g.v[r*(C+1)+c+1]?1:0)},
  boxesOf(g,a){const o=[];if(a.o==="h"){if(a.r>0)o.push([a.r-1,a.c]);if(a.r<g.R)o.push([a.r,a.c])}else{if(a.c>0)o.push([a.r,a.c-1]);if(a.c<g.C)o.push([a.r,a.c])}return o},
  apply(g0,seat,a){
    const g=dupe(g0),C=g.C;
    if(a.o==="h")g.h[a.r*C+a.c]=seat+1;else g.v[a.r*(C+1)+a.c]=seat+1;
    g.mv[seat]=(g.mv[seat]||0)+1;let got=0;
    for(const [r,c] of WG.boxesOf(g,a))if(!g.b[r*C+c]&&WG.sides(g,r,c)===4){g.b[r*C+c]=seat+1;g.pts[seat]++;got++;g.lastBox=seat}
    g.seq++;g.last={i:seat,a:{t:"l",o:a.o,r:a.r,c:a.c},got};
    if(g.b.every(x=>x)){const top=Math.max(...g.pts),tied=g.pts.map((p,i)=>p===top?i:-1).filter(i=>i>=0);
      g.winner=tied.length===1?tied[0]:(tied.includes(g.lastBox)?g.lastBox:tied[0]);gmScore(g)}
    else if(!got)g.turn=(g.turn+1)%g.n;
    return g;
  },
  skip(g0){const g=dupe(g0);g.turn=(g.turn+1)%g.n;g.seq++;g.last={i:g0.turn,a:{t:"s"}};return g},
  lines(g){const o=[];for(let r=0;r<=g.R;r++)for(let c=0;c<g.C;c++)if(!g.h[r*g.C+c])o.push({t:"l",o:"h",r,c});
    for(let r=0;r<g.R;r++)for(let c=0;c<=g.C;c++)if(!g.v[r*(g.C+1)+c])o.push({t:"l",o:"v",r,c});return o},
  giveaway(g,a){let s=WG.apply(g,g.turn,a),n=0,k=0;const opp=s.turn;
    while(s.winner==null&&s.turn===opp&&k++<60){const t=WG.lines(s).find(x=>WG.boxesOf(s,x).some(([r,c])=>!s.b[r*s.C+c]&&WG.sides(s,r,c)===3));if(!t)break;const b=s.pts[opp];s=WG.apply(s,opp,t);n+=s.pts[opp]-b}
    return n},
  bot(g){
    const L=WG.lines(g);if(!L.length)return null;const lvl=g.players[g.turn].bot||2,pick=a=>a[Math.floor(Math.random()*a.length)];
    if(lvl===1&&Math.random()<.55)return pick(L);
    const take=L.filter(a=>WG.boxesOf(g,a).some(([r,c])=>!g.b[r*g.C+c]&&WG.sides(g,r,c)===3));if(take.length)return pick(take);
    const safe=L.filter(a=>!WG.boxesOf(g,a).some(([r,c])=>!g.b[r*g.C+c]&&WG.sides(g,r,c)===2));if(safe.length)return pick(safe);
    if(lvl<3)return pick(L);
    let best=null,bv=1e9;for(const a of L){const v=WG.giveaway(g,a);if(v<bv){bv=v;best=a}}return best;
  }
};
/* ---- XO∞: three marks each; the fourth wipes your oldest, so there are no draws ---- */
const XO_LINES=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
const XO={
  new(players,o){const g=gmBase("xo",players.slice(0,2),o);g.cells=Array(9).fill(0);g.order=[[],[]];return g},
  legal(g,seat,a){if(g.winner!=null)return "انتهت المباراة";if(!a||a.t!=="p"||!Number.isInteger(a.k)||a.k<0||a.k>8)return "حركة غير صحيحة";if(g.cells[a.k])return "الخانة مشغولة";return null},
  wins(g,s){return XO_LINES.some(l=>l.every(k=>g.cells[k]===s+1))},
  apply(g0,seat,a){
    const g=dupe(g0);
    if(g.order[seat].length>=3){const old=g.order[seat].shift();g.cells[old]=0}
    g.cells[a.k]=seat+1;g.order[seat].push(a.k);g.mv[seat]=(g.mv[seat]||0)+1;g.seq++;g.last={i:seat,a:{t:"p",k:a.k}};
    if(XO.wins(g,seat)){g.winner=seat;gmScore(g)}else g.turn=1-seat;
    if(g.seq-g.s0>=120&&g.winner==null){g.winner=g.turn;gmScore(g)}   /* safety: a very long game ends */
    return g;
  },
  skip(g0){const g=dupe(g0);g.turn=1-g.turn;g.seq++;g.last={i:g0.turn,a:{t:"s"}};return g},
  free(g){const o=[];for(let k=0;k<9;k++)if(!g.cells[k])o.push(k);return o},
  key(g){return g.cells.join("")+g.order[0].join("")+"/"+g.order[1].join("")+g.turn},
  search(g,me,depth,al,be,memo){
    if(g.winner!=null)return g.winner===me?100+depth:-100-depth;if(depth===0)return 0;
    const k=XO.key(g)+depth;if(memo.has(k))return memo.get(k);
    const maxi=g.turn===me;let best=maxi?-1e9:1e9;
    for(const c of XO.free(g)){const v=XO.search(XO.apply(g,g.turn,{t:"p",k:c}),me,depth-1,al,be,memo);
      if(maxi){if(v>best)best=v;if(best>al)al=best}else{if(v<best)best=v;if(best<be)be=best}if(al>=be)break}
    memo.set(k,best);return best;
  },
  bot(g){
    const F=XO.free(g),me=g.turn,lvl=g.players[me].bot||2,pick=a=>a[Math.floor(Math.random()*a.length)];
    if(!F.length)return null;
    if(lvl===1&&Math.random()<.6)return {t:"p",k:pick(F)};
    const depth=lvl>=3?8:2,memo=new Map();let best=[],bv=-1e9;
    for(const k of F){const v=XO.search(XO.apply(g,me,{t:"p",k}),me,depth,-1e9,1e9,memo)+(k===4?.5:[0,2,6,8].includes(k)?.2:0);if(v>bv+1e-9){bv=v;best=[k]}else if(Math.abs(v-bv)<1e-9)best.push(k)}
    return {t:"p",k:pick(best)};
  }
};
const GAME_RULES={webgrid:WG,xo:XO};
const MIN_PLAYERS={webbound:2,webgrid:2,xo:2},MAX_PLAYERS={webbound:4,webgrid:4,xo:2};
/* ---- WORDWEB: same hidden word for everyone, guess letters at the same time ----
   The word and each player's found letters stay on the server; the shared state only holds counts. */
const WW_CATS={
  fruit:{name:"فواكه",words:["تفاح","موز","برتقال","عنب","فراولة","مانجو","بطيخ","شمام","كمثرى","رمان","تين","مشمش","خوخ","كيوي","أناناس","جوافة","ليمون","يوسفي","توت","كرز","تمر","أفوكادو","نارنج","برقوق","بابايا","زيتون"]},
  veg:{name:"خضار",words:["طماطم","خيار","جزر","بطاطس","بصل","ثوم","فلفل","باذنجان","كوسة","ملفوف","خس","سبانخ","بقدونس","نعناع","فجل","ذرة","بامية","قرنبيط","بروكلي","شمندر","ملوخية","فاصوليا","عدس","كرفس","زنجبيل"]},
  country:{name:"دول",words:["السعودية","مصر","الأردن","الكويت","قطر","البحرين","الإمارات","العراق","سوريا","لبنان","فلسطين","اليمن","السودان","ليبيا","تونس","الجزائر","المغرب","تركيا","اليابان","الصين","الهند","فرنسا","ألمانيا","إسبانيا","إيطاليا","البرازيل","كندا","المكسيك","روسيا","ماليزيا","إندونيسيا","باكستان","أستراليا","الأرجنتين"]},
  animal:{name:"حيوانات",words:["أسد","نمر","فيل","زرافة","حصان","جمل","غزال","ذئب","ثعلب","دب","قرد","أرنب","سنجاب","تمساح","سلحفاة","ثعبان","عقرب","عنكبوت","نحلة","فراشة","صقر","نسر","حمامة","بطريق","دلفين","حوت","قرش","أخطبوط","كنغر","باندا","فهد","ضبع","وعل"]},
  sport:{name:"رياضة",words:["تنس","سباحة","ملاكمة","جري","فروسية","رماية","غوص","تزلج","شطرنج","بولينج","كاراتيه","جودو","مصارعة","جمباز","تجديف","بلياردو","هوكي","بيسبول","كريكت","ركبي","جولف","تايكوندو","سنوكر","باركور","هجن"]},
  job:{name:"مهن",words:["طبيب","مهندس","معلم","محامي","طيار","شرطي","نجار","حداد","خباز","طباخ","صيدلي","ممرض","مزارع","صياد","رسام","مصور","مبرمج","كاتب","صحفي","سائق","خياط","حلاق","محاسب","مذيع","جندي","قاضي","إطفائي","بحار"]},
  food:{name:"أكلات",words:["كبسة","مندي","جريش","قرصان","مطازيز","مرقوق","حنيني","سليق","مضغوط","شاورما","فلافل","حمص","فول","كنافة","بسبوسة","لقيمات","معصوب","سمبوسة","مقلوبة","منسف","كشري","برياني","بيتزا","برجر","معكرونة","شوربة","سلطة","مثلوثة"]},
  names:{name:"أسماء",words:["محمد","أحمد","عبدالله","خالد","فهد","سعود","فيصل","عمر","علي","يوسف","سلمان","ناصر","ماجد","تركي","بندر","نايف","سارة","نورة","فاطمة","مريم","ريم","هند","لمى","جود","دانة","شهد","غادة","منيرة","رهف","وعد"]}
};
const WW={
  simultaneous:true,
  KEYS:"ا ب ت ث ج ح خ د ذ ر ز س ش ص ض ط ظ ع غ ف ق ك ل م ن ه و ي ة".split(" "),
  norm:c=>({"أ":"ا","إ":"ا","آ":"ا","ٱ":"ا","ؤ":"و","ئ":"ي","ى":"ي"}[c]||c),
  pick(cat){const w=(WW_CATS[cat]||WW_CATS.fruit).words;return w[Math.floor(Math.random()*w.length)]},
  new(players,o){const g=gmBase("wordweb",players,o);g.cat=WW_CATS[o.cat]?o.cat:"fruit";g.max=6;g.len=0;g.turn=0;g.reveal=null;
    g.prog=g.players.map(()=>({found:0,wrong:0,done:false,out:false}));return g},
  /* one guess against the secret: returns the new private record and the positions found */
  guess(word,mine,ch){
    const pos=[];for(let i=0;i<word.length;i++)if(WW.norm(word[i])===ch)pos.push(i);
    const m={tried:mine.tried.concat([ch]),found:[...new Set(mine.found.concat(pos))].sort((a,b)=>a-b)};
    return {m,pos};
  },
  view(word,m,ended){return {letters:[...word].map((c,i)=>ended||m.found.includes(i)?c:null),tried:m.tried,found:m.found}},
  /* apply a guess result to the shared state (counts only) */
  record(g0,seat,pos,foundCount,len){
    const g=dupe(g0),p=g.prog[seat];p.found=foundCount;if(!pos.length)p.wrong++;
    g.seq++;g.last={i:seat,a:{t:"g"},got:pos.length};g.mv[seat]=(g.mv[seat]||0)+1;
    if(p.found>=len)p.done=true;else if(p.wrong>=g.max)p.out=true;
    if(p.done){g.winner=seat;gmScore(g)}
    else if(g.prog.every(x=>x.done||x.out)){let best=0;g.prog.forEach((x,i)=>{const b=g.prog[best];if(x.found>b.found||(x.found===b.found&&x.wrong<b.wrong))best=i});g.winner=best;gmScore(g)}
    return g;
  },
  botLetter(g,seat,mine,len){
    const lvl=g.players[seat].bot||2,left=WW.KEYS.filter(k=>!mine.tried.includes(k));if(!left.length)return null;
    const FREQ="ا ل ي م و ن ر ت ب ه ع د س ف ك ق ح ج ش ص خ ط ز ض ث ذ غ ظ ة".split(" ");
    if(lvl===1&&Math.random()<.35)return left[Math.floor(Math.random()*left.length)];
    if(lvl>=3||(lvl===2&&Math.random()<.55)||(lvl===1&&Math.random()<.2)){
      const words=(WW_CATS[g.cat]||WW_CATS.fruit).words.filter(w=>w.length===len&&mine.tried.every(t=>{
        const hits=[...w].map((c,i)=>WW.norm(c)===t?i:-1).filter(i=>i>=0);return hits.every(i=>mine.found.includes(i))&&(hits.length>0)===mine.found.some(i=>WW.norm(w[i])===t)}));
      if(words.length){const cnt={};for(const w of words)for(const c of new Set([...w].map(WW.norm)))if(left.includes(c))cnt[c]=(cnt[c]||0)+1;
        const best=Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a])[0];if(best)return best}
    }
    const order=FREQ.filter(k=>left.includes(k));return order[Math.min(order.length-1,Math.floor(Math.random()*(lvl===2?3:1)))];
  },
  legal(){return null},apply(g){return g},bot(){return null},skip(g){return g}
};
GAME_RULES.wordweb=WW;MIN_PLAYERS.wordweb=2;MAX_PLAYERS.wordweb=4;
/* ---- WEBLINE: a spider spins a thread that grows with every fly; hit a wall or your thread and it's over.
   Fully deterministic: the same seed and the same turns always give the same run, so the server can replay it. */
const WL={
  W:16,H:16,DIRS:[[-1,0],[0,1],[1,0],[0,-1]],
  rng(seed){let a=seed>>>0;return ()=>{a=(a+0x6D2B79F5)|0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return ((t^(t>>>14))>>>0)/4294967296}},
  daySeed(day){let h=2166136261;for(const ch of "WEBLINE:"+day){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0},
  day(ms){return new Date(ms+3*3600000).toISOString().slice(0,10)},          /* Saudi date */
  start(seed){const s={seed:seed>>>0,body:[[8,5],[8,4],[8,3]],dir:1,tick:0,score:0,alive:true};s.r=WL.rng(s.seed);s.food=WL.place(s);return s},
  place(s){const W=WL.W,H=WL.H,occ=new Set(s.body.map(([r,c])=>r*W+c));
    for(let k=0;k<200;k++){const i=Math.floor(s.r()*W*H);if(!occ.has(i))return [Math.floor(i/W),i%W]}
    for(let i=0;i<W*H;i++)if(!occ.has(i))return [Math.floor(i/W),i%W];return null},
  step(s,turn){
    if(!s.alive)return s;
    if(turn!=null&&turn>=0&&turn<4&&turn!==s.dir&&(turn+2)%4!==s.dir)s.dir=turn;
    const [dr,dc]=WL.DIRS[s.dir],nr=s.body[0][0]+dr,nc=s.body[0][1]+dc;s.tick++;
    if(nr<0||nr>=WL.H||nc<0||nc>=WL.W){s.alive=false;return s}
    const eat=!!s.food&&nr===s.food[0]&&nc===s.food[1],body=eat?s.body:s.body.slice(0,-1);
    if(body.some(([r,c])=>r===nr&&c===nc)){s.alive=false;return s}
    s.body=[[nr,nc]].concat(body);
    if(eat){s.score++;s.food=WL.place(s);if(!s.food)s.alive=false}
    return s},
  replay(seed,inputs,maxTicks){
    const s=WL.start(seed),lim=Math.min(maxTicks||20000,20000);let k=0;
    while(s.alive&&s.tick<lim){let turn=null;if(k<inputs.length&&inputs[k][0]===s.tick){turn=inputs[k][1];k++}WL.step(s,turn)}
    return s},
  speed(score){return Math.max(70,150-score*4)},
  reward(score,daily){const f=daily?1:.5;return {xp:Math.round(Math.min(10+score*3,80)*f),coins:Math.round(Math.min(5+score*2,60)*f)}}
};
MIN_PLAYERS.webline=1;MAX_PLAYERS.webline=1;
/* ---- الضامة (Gulf / Turkish draughts): orthogonal moves, captures are compulsory and the longest capture must be taken,
   men move forward or sideways, a man reaching the far row becomes a flying king. Board cells 0..63; seat 0 starts at the bottom. */
const DM={
  new(players,o){const g=gmBase("dama",players.slice(0,2),o),b=Array(64).fill(0);
    for(let c=0;c<8;c++){b[8+c]=2;b[16+c]=2;b[40+c]=1;b[48+c]=1}g.b=b;g.quiet=0;return g},
  own(p,s){return !!p&&((p-1)%2)===s},
  king(p){return p>=3},
  dirs(p,s){return DM.king(p)?[[1,0],[-1,0],[0,1],[0,-1]]:[[s===0?-1:1,0],[0,1],[0,-1]]},
  capt(b,i,s,p,path,n,acc,last){
    const r=i>>3,c=i&7;let any=false;
    for(const [dr,dc] of DM.dirs(p,s)){
      if(last&&dr===-last[0]&&dc===-last[1])continue;
      let rr=r+dr,cc=c+dc;
      if(DM.king(p))while(rr>=0&&rr<8&&cc>=0&&cc<8&&!b[rr*8+cc]){rr+=dr;cc+=dc}
      if(rr<0||rr>7||cc<0||cc>7)continue;
      const k=rr*8+cc;if(!b[k]||DM.own(b[k],s))continue;
      let lr=rr+dr,lc=cc+dc;
      while(lr>=0&&lr<8&&lc>=0&&lc<8&&!b[lr*8+lc]){
        const land=lr*8+lc,nb=b.slice();nb[land]=p;nb[i]=0;nb[k]=0;any=true;
        DM.capt(nb,land,s,p,path.concat([land]),n+1,acc,[dr,dc]);
        if(!DM.king(p))break;lr+=dr;lc+=dc}
    }
    if(!any&&n)acc.push({path,n});
  },
  moves(g,s){
    const caps=[];for(let i=0;i<64;i++)if(DM.own(g.b[i],s))DM.capt(g.b,i,s,g.b[i],[i],0,caps,null);
    if(caps.length){const best=Math.max(...caps.map(x=>x.n));return caps.filter(x=>x.n===best).map(x=>x.path)}
    const out=[];
    for(let i=0;i<64;i++){const p=g.b[i];if(!DM.own(p,s))continue;const r=i>>3,c=i&7;
      for(const [dr,dc] of DM.dirs(p,s)){let rr=r+dr,cc=c+dc;while(rr>=0&&rr<8&&cc>=0&&cc<8&&!g.b[rr*8+cc]){out.push([i,rr*8+cc]);if(!DM.king(p))break;rr+=dr;cc+=dc}}}
    return out;
  },
  legal(g,s,a){if(g.winner!=null)return "انتهت المباراة";if(!a||a.t!=="mv"||!Array.isArray(a.path)||a.path.length<2||!a.path.every(x=>Number.isInteger(x)&&x>=0&&x<64))return "حركة غير صحيحة";
    const k=a.path.join(",");return DM.moves(g,s).some(p=>p.join(",")===k)?null:"حركة غير مسموحة، وتذكّر إن الأكل إجباري"},
  apply(g0,s,a){
    const g=dupe(g0),path=a.path,p=g.b[path[0]];let caps=0;
    for(let t=1;t<path.length;t++){const f=path[t-1],to=path[t],dr=Math.sign((to>>3)-(f>>3)),dc=Math.sign((to&7)-(f&7));
      let rr=(f>>3)+dr,cc=(f&7)+dc;while(rr*8+cc!==to){const k=rr*8+cc;if(g.b[k]&&!DM.own(g.b[k],s)){g.b[k]=0;caps++}rr+=dr;cc+=dc}
      g.b[to]=g.b[f];g.b[f]=0}
    const end=path[path.length-1];if(!DM.king(p)&&((s===0&&end<8)||(s===1&&end>=56)))g.b[end]=s===0?3:4;
    g.mv[s]=(g.mv[s]||0)+1;g.seq++;g.last={i:s,a:{t:"mv",path:path.slice()},got:caps};g.quiet=caps?0:(g.quiet||0)+1;
    const o=1-s,mat=x=>g.b.reduce((n,q)=>n+(DM.own(q,x)?(DM.king(q)?3:1):0),0);
    if(!g.b.some(q=>DM.own(q,o))||!DM.moves(g,o).length){g.winner=s;gmScore(g)}
    else if(g.quiet>=60){const m0=mat(0),m1=mat(1);g.winner=m0===m1?s:(m0>m1?0:1);gmScore(g)}
    else g.turn=o;
    return g;
  },
  skip(g0){const g=dupe(g0);g.turn=1-g.turn;g.seq++;g.last={i:g0.turn,a:{t:"s"}};return g},
  score(g,me){let v=0;for(let i=0;i<64;i++){const q=g.b[i];if(!q)continue;const own=DM.own(q,me),r=i>>3;
    let w=DM.king(q)?5:1+(((q-1)%2)===0?(7-r):r)*.06;v+=own?w:-w}return v},
  search(g,me,d,al,be){
    if(g.winner!=null)return g.winner===me?1000+d:-1000-d;if(d===0)return DM.score(g,me);
    const maxi=g.turn===me;let best=maxi?-1e9:1e9;
    for(const p of DM.moves(g,g.turn)){const v=DM.search(DM.apply(g,g.turn,{t:"mv",path:p}),me,d-1,al,be);
      if(maxi){if(v>best)best=v;if(best>al)al=best}else{if(v<best)best=v;if(best<be)be=best}if(al>=be)break}
    return best;
  },
  bot(g){const ms=DM.moves(g,g.turn);if(!ms.length)return null;const lvl=g.players[g.turn].bot||2,me=g.turn,pick=a=>a[Math.floor(Math.random()*a.length)];
    if(lvl===1&&Math.random()<.5)return {t:"mv",path:pick(ms)};
    if(ms.length===1)return {t:"mv",path:ms[0]};
    const d=lvl>=3?3:1;let best=[],bv=-1e9;
    for(const p of ms){const v=DM.search(DM.apply(g,me,{t:"mv",path:p}),me,d,-1e9,1e9);if(v>bv+1e-6){bv=v;best=[p]}else if(Math.abs(v-bv)<1e-6)best.push(p)}
    return {t:"mv",path:pick(best)}}
};
GAME_RULES.dama=DM;MIN_PLAYERS.dama=2;MAX_PLAYERS.dama=2;
/* ================= hidden-information games =================
   Same shape as the others plus: hidden:true, deal(g) → private data per seat, and legal/apply/bot/view/skip
   receive that private data. The server keeps it; the shared state only has what everyone may see. */

/* ---- BLUFF (كذّاب): hidden dice, raise the bid or call it a lie ---- */
const BF={hidden:true,
  new(players,o){const g=gmBase("bluff",players,o);g.dice=g.players.map(()=>5);g.bid=null;g.reveal=null;g.out=g.players.map(()=>false);g.rnd=1;g.timer=0;return g},
  roll(n){return Array.from({length:n},()=>1+Math.floor(Math.random()*6))},
  deal(g){return g.players.map((p,i)=>({dice:BF.roll(g.dice[i])}))},
  total(g){return g.dice.reduce((a,b)=>a+b,0)},
  higher(b,q,f){return !b||q>b.q||(q===b.q&&f>b.f)},
  next(g,k){for(let t=1;t<=g.n;t++){const j=(k+t)%g.n;if(!g.out[j])return j}return k},
  legal(g,s,a){
    if(g.winner!=null)return "انتهت المباراة";if(g.turn!==s)return "مو دورك";if(!a)return "حركة غير صحيحة";
    if(a.t==="bid"){if(!Number.isInteger(a.q)||!Number.isInteger(a.f)||a.f<1||a.f>6||a.q<1||a.q>BF.total(g))return "مزايدة غير صحيحة";
      if(!BF.higher(g.bid,a.q,a.f))return "لازم تزايد: عدد أكبر، أو نفس العدد بوجه أعلى";return null}
    if(a.t==="call")return g.bid?null:"ما فيه مزايدة تكذّبها";
    return "حركة غير صحيحة";
  },
  apply(g0,s,a,pv0){
    const g=dupe(g0),pv=dupe(pv0);g.seq++;g.mv[s]=(g.mv[s]||0)+1;
    if(a.t==="bid"){g.bid={q:a.q,f:a.f,by:s};g.reveal=null;g.last={i:s,a:{t:"bid",q:a.q,f:a.f}};g.turn=BF.next(g,s);return {g,privs:pv}}
    const all=pv.map(x=>x.dice),cnt=all.flat().filter(d=>d===g.bid.f).length,bidder=g.bid.by,loser=cnt>=g.bid.q?s:bidder;
    g.reveal={dice:all,q:g.bid.q,f:g.bid.f,count:cnt,caller:s,bidder,loser,rnd:g.rnd};g.last={i:s,a:{t:"call"}};
    g.dice[loser]--;if(g.dice[loser]<=0)g.out[loser]=true;
    const alive=g.out.map((o,i)=>o?-1:i).filter(i=>i>=0);
    if(alive.length===1){g.winner=alive[0];gmScore(g);return {g,privs:pv}}
    g.bid=null;g.rnd++;g.turn=g.out[loser]?BF.next(g,loser):loser;
    return {g,privs:g.players.map((p,i)=>({dice:BF.roll(g.dice[i])}))};
  },
  view(g,s,pv){return {dice:(pv[s]||{}).dice||[]}},
  skip(g0,pv){return BF.apply(g0,g0.turn,g0.bid?{t:"call"}:{t:"bid",q:1,f:6},pv)},
  bot(g,s,pv){
    const mine=pv[s].dice,unk=BF.total(g)-mine.length,lvl=g.players[s].bot||2,b=g.bid,exp=f=>mine.filter(d=>d===f).length+unk/6;
    if(b){const risk=b.q-exp(b.f),th=lvl===1?2.2:lvl===2?1.1:.55;if(risk>th)return {t:"call"}}
    let best=null,bv=-1e9;
    for(let f=1;f<=6;f++){const q=b?(f>b.f?b.q:b.q+1):Math.max(1,Math.round(exp(f)*.8));if(q>BF.total(g)||!BF.higher(b,q,f))continue;
      const v=exp(f)-q+Math.random()*(lvl===1?2:lvl===2?.8:.3);if(v>bv){bv=v;best={t:"bid",q,f}}}
    if(!best)return {t:"call"};if(b&&bv<-1.2)return {t:"call"};return best;
  }
};
/* ---- FLYHUNT (صيد الذباب): hidden fleets of flies on 8×8; a hit lets you shoot again ---- */
const FH={hidden:true,SHIPS:[4,3,2,2],
  new(players,o){const g=gmBase("flyhunt",players.slice(0,2),o);g.shots=[Array(64).fill(0),Array(64).fill(0)];g.sunk=[[],[]];g.left=[11,11];g.timer=0;return g},
  place(){
    for(let tries=0;tries<300;tries++){const occ=Array(64).fill(0),ships=[];let ok=true;
      for(const len of FH.SHIPS){let done=false;
        for(let k=0;k<200&&!done;k++){const hor=Math.random()<.5,r=Math.floor(Math.random()*(hor?8:9-len)),c=Math.floor(Math.random()*(hor?9-len:8)),cells=[];
          for(let t=0;t<len;t++)cells.push((r+(hor?0:t))*8+c+(hor?t:0));
          if(cells.every(i=>{const rr=i>>3,cc=i&7;for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){const r2=rr+dr,c2=cc+dc;if(r2>=0&&r2<8&&c2>=0&&c2<8&&occ[r2*8+c2])return false}return true})){cells.forEach(i=>occ[i]=1);ships.push(cells);done=true}}
        if(!done){ok=false;break}}
      if(ok)return ships}
    return [[0,1,2,3],[16,17,18],[32,33],[48,49]];
  },
  deal(){return [{ships:FH.place()},{ships:FH.place()}]},
  legal(g,s,a){if(g.winner!=null)return "انتهت المباراة";if(g.turn!==s)return "مو دورك";if(!a||a.t!=="shot"||!Number.isInteger(a.k)||a.k<0||a.k>63)return "حركة غير صحيحة";if(g.shots[1-s][a.k])return "ضربت هالخانة قبل";return null},
  apply(g0,s,a,pv){
    const g=dupe(g0),o=1-s,ships=pv[o].ships,hi=ships.findIndex(sh=>sh.includes(a.k));g.seq++;g.mv[s]=(g.mv[s]||0)+1;
    if(hi<0){g.shots[o][a.k]=1;g.turn=o;g.last={i:s,a:{t:"shot",k:a.k},hit:false};return {g,privs:pv}}
    g.shots[o][a.k]=2;g.left[o]--;let sunk=false;const sh=ships[hi];
    if(sh.every(i=>g.shots[o][i]>=2)){sunk=true;g.sunk[o].push(sh.slice());sh.forEach(i=>g.shots[o][i]=3)}
    g.last={i:s,a:{t:"shot",k:a.k},hit:true,sunk};if(g.left[o]<=0){g.winner=s;gmScore(g)}
    return {g,privs:pv};
  },
  view(g,s,pv){return {ships:(pv[s]||{}).ships||[]}},
  skip(g0,pv){const g=dupe(g0);g.turn=1-g.turn;g.seq++;g.last={i:g0.turn,a:{t:"s"}};return {g,privs:pv}},
  bot(g,s){
    const o=1-s,sh=g.shots[o],lvl=g.players[s].bot||2,free=[],pick=a=>a[Math.floor(Math.random()*a.length)];for(let k=0;k<64;k++)if(!sh[k])free.push(k);
    if(lvl===1&&Math.random()<.55)return {t:"shot",k:pick(free)};
    const hits=[];for(let k=0;k<64;k++)if(sh[k]===2)hits.push(k);
    if(hits.length){const near=[];for(const k of hits){const r=k>>3,c=k&7;for(const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]){const r2=r+dr,c2=c+dc;if(r2>=0&&r2<8&&c2>=0&&c2<8&&!sh[r2*8+c2])near.push(r2*8+c2)}}
      const inline=near.filter(k=>hits.some(h=>Math.abs(h-k)===1&&(h>>3)===(k>>3)&&hits.includes(2*h-k))||hits.some(h=>Math.abs(h-k)===8&&hits.includes(2*h-k)));
      if(inline.length)return {t:"shot",k:pick(inline)};if(near.length)return {t:"shot",k:pick(near)}}
    const sunk=new Set(g.sunk[o].flat()),bad=k=>{const r=k>>3,c=k&7;for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){const r2=r+dr,c2=c+dc;if(r2>=0&&r2<8&&c2>=0&&c2<8&&sunk.has(r2*8+c2))return true}return false};
    let pool=free.filter(k=>!bad(k));if(lvl>=3){const par=pool.filter(k=>((k>>3)+(k&7))%2===0);if(par.length)pool=par}
    return {t:"shot",k:pick(pool.length?pool:free)};
  }
};
/* ---- WEBWAR (حرب الخيوط): grow your web cell by cell; empty areas you alone surround become yours ---- */
const WR={N:7,
  new(players,o){const g=gmBase("webwar",players,o),N=7;g.c=Array(N*N).fill(0);[0,N*N-1,N-1,N*(N-1)].slice(0,g.n).forEach((k,i)=>{g.c[k]=i+1});return g},
  adj(i){const N=7,r=Math.floor(i/N),c=i%N,o=[];if(r>0)o.push(i-N);if(r<N-1)o.push(i+N);if(c>0)o.push(i-1);if(c<N-1)o.push(i+1);return o},
  moves(g,s){const o=[];for(let i=0;i<49;i++)if(!g.c[i]&&WR.adj(i).some(j=>g.c[j]===s+1))o.push(i);return o},
  capture(g){const seen=Array(49).fill(false),got=Array(g.n).fill(0);
    for(let i=0;i<49;i++){if(g.c[i]||seen[i])continue;const reg=[],own=new Set(),st=[i];seen[i]=true;
      while(st.length){const k=st.pop();reg.push(k);for(const j of WR.adj(k)){if(g.c[j])own.add(g.c[j]);else if(!seen[j]){seen[j]=true;st.push(j)}}}
      if(own.size===1&&reg.length<=10){const w=[...own][0];for(const k of reg)g.c[k]=w;got[w-1]+=reg.length}}
    return got},
  count(g,s){return g.c.filter(x=>x===s+1).length},
  legal(g,s,a){if(g.winner!=null)return "انتهت المباراة";if(!a||a.t!=="p"||!Number.isInteger(a.k)||a.k<0||a.k>48)return "حركة غير صحيحة";if(!WR.moves(g,s).includes(a.k))return "مد خيطك لخانة فاضية جنب أرضك";return null},
  advance(g,s){for(let t=1;t<=g.n;t++){const k=(s+t)%g.n;if(WR.moves(g,k).length){g.turn=k;return}}
    const cnt=g.players.map((p,i)=>WR.count(g,i)),top=Math.max(...cnt),tied=cnt.map((v,i)=>v===top?i:-1).filter(i=>i>=0);g.winner=tied.includes(g.last&&g.last.i)?g.last.i:tied[0];gmScore(g)},
  apply(g0,s,a){const g=dupe(g0);g.c[a.k]=s+1;g.mv[s]=(g.mv[s]||0)+1;g.seq++;const got=WR.capture(g);g.last={i:s,a:{t:"p",k:a.k},got:got[s]};WR.advance(g,s);return g},
  skip(g0){const g=dupe(g0);g.seq++;g.last={i:g0.turn,a:{t:"s"}};WR.advance(g,g0.turn);return g},
  bot(g){const s=g.turn,ms=WR.moves(g,s);if(!ms.length)return null;const lvl=g.players[s].bot||2,pick=a=>a[Math.floor(Math.random()*a.length)];
    if(lvl===1&&Math.random()<.5)return {t:"p",k:pick(ms)};
    let best=null,bv=-1e9;
    for(const k of ms){const t=WR.apply(g,s,{t:"p",k});let v=WR.count(t,s)+WR.moves(t,s).length*.35;
      if(lvl>=3)for(let j=0;j<g.n;j++){if(j===s)continue;let worst=0;for(const m of WR.moves(t,j)){const u=WR.apply(t,j,{t:"p",k:m});worst=Math.max(worst,WR.count(u,j)-WR.count(t,j)-1)}v-=worst*.8}
      v+=Math.random()*.15;if(v>bv){bv=v;best=k}}
    return {t:"p",k:best};
  }
};
GAME_RULES.bluff=BF;GAME_RULES.flyhunt=FH;GAME_RULES.webwar=WR;
MIN_PLAYERS.bluff=2;MAX_PLAYERS.bluff=6;MIN_PLAYERS.flyhunt=2;MAX_PLAYERS.flyhunt=2;MIN_PLAYERS.webwar=2;MAX_PLAYERS.webwar=4;
/* ---- WEBNEST (بيت العنكبوت): 2048 with spider stages; deterministic from a seed so the server can replay it ---- */
const NST={
  STAGES:["","بيضة","يرقة","فقس","عنكبوت صغير","نسّاج","صياد","قافز","حارس","عنكبوت ذهبي","عنكبوت أسطوري","ملكة العناكب","ملكة العناكب+","ملكة العناكب++"],
  daySeed(day){let h=2166136261;for(const ch of "WEBNEST:"+day){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0},
  start(seed){const s={seed:seed>>>0,b:Array(16).fill(0),score:0,moves:0,alive:true,max:1};s.r=WL.rng(s.seed);NST.spawn(s);NST.spawn(s);return s},
  spawn(s){const free=[];for(let i=0;i<16;i++)if(!s.b[i])free.push(i);if(!free.length)return;const i=free[Math.floor(s.r()*free.length)];s.b[i]=s.r()<.9?1:2},
  slide(line){const v=line.filter(x=>x),out=[];let gain=0;for(let k=0;k<v.length;k++){if(k+1<v.length&&v[k]===v[k+1]){out.push(v[k]+1);gain+=2**(v[k]+1);k++}else out.push(v[k])}while(out.length<4)out.push(0);return {out,gain}},
  move(s,d){
    const b=s.b,nb=b.slice();let gain=0,changed=false;
    for(let k=0;k<4;k++){const idx=[];for(let t=0;t<4;t++){const r=d===0?t:d===2?3-t:k,c=d===3?t:d===1?3-t:k;idx.push(r*4+c)}
      const res=NST.slide(idx.map(i=>b[i]));idx.forEach((i,t)=>{if(nb[i]!==res.out[t])changed=true;nb[i]=res.out[t]});gain+=res.gain}
    if(!changed)return false;s.b=nb;s.score+=gain;s.moves++;s.max=Math.max(s.max,...nb);NST.spawn(s);if(!NST.canMove(s))s.alive=false;return true},
  canMove(s){const b=s.b;for(let i=0;i<16;i++){if(!b[i])return true;const r=i>>2,c=i&3;if(c<3&&b[i]===b[i+1])return true;if(r<3&&b[i]===b[i+4])return true}return false},
  replay(seed,inputs){const s=NST.start(seed);for(const d of inputs){if(!s.alive)break;NST.move(s,d)}return s},
  reward(score,daily){const f=daily?1:.5;return {xp:Math.round(Math.min(10+score/40,80)*f),coins:Math.round(Math.min(5+score/60,60)*f)}}
};
/* ---- NIGHTWEB (مين العنكبوت؟): hidden roles, secret night actions, open day votes; the winning TEAM is rewarded ---- */
const NW={hidden:true,simultaneous:true,
  ROLE:{spider:"عنكبوت",doctor:"طبيب",seer:"كاشف",fly:"ذبابة"},
  new(players,o){const g=gmBase("nightweb",players.slice(0,10),o);g.timer=0;g.alive=g.players.map(()=>true);g.phase="night";g.day=1;g.votes=g.players.map(()=>null);
    g.nightCount=0;g.log=[];g.dead={};g.phaseAt=clock.now();g.spiders=g.n>=7?2:1;g.turn=0;return g},
  deal(g){const n=g.n,roles=Array(n).fill("fly"),idx=[...Array(n).keys()];for(let i=n-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[idx[i],idx[j]]=[idx[j],idx[i]]}
    let k=0;for(let s=0;s<g.spiders;s++)roles[idx[k++]]="spider";roles[idx[k++]]="doctor";if(n>=5)roles[idx[k++]]="seer";
    const sp=roles.map((r,i)=>r==="spider"?i:-1).filter(i=>i>=0);
    return roles.map((role,i)=>({role,mates:role==="spider"?sp.filter(x=>x!==i):[],seen:[],act:null}))},
  actors(g,pv){const o=[];for(let i=0;i<g.n;i++)if(g.alive[i]&&["spider","doctor","seer"].includes(pv[i].role))o.push(i);return o},
  legal(g,s,a,pv){
    if(g.winner!=null)return "انتهت المباراة";if(!a)return "حركة غير صحيحة";
    if(a.t==="force")return g.alive[s]&&clock.now()-g.phaseAt>=90000?null:"تقدر تنهي المرحلة بعد دقيقة ونص من بدايتها";
    if(!g.alive[s])return "طلعت من اللعبة، تقدر تتفرّج بس";const t=a.target;
    if(a.t==="night"){if(g.phase!=="night")return "الحين نهار";const me=pv&&pv[s];
      if(!me||!["spider","doctor","seer"].includes(me.role))return "ما عندك شي تسويه بالليل";if(me.act!=null)return "اخترت خلاص";
      if(!Number.isInteger(t)||t<0||t>=g.n||!g.alive[t])return "اختر لاعب حي";if(me.role==="spider"&&pv[t].role==="spider")return "هذا عنكبوت مثلك";if(me.role==="seer"&&t===s)return "اختر غيرك";return null}
    if(a.t==="vote"){if(g.phase!=="day")return "الحين ليل";if(g.votes[s]!=null)return "صوّت خلاص";if(t!==-1&&(!Number.isInteger(t)||t<0||t>=g.n||!g.alive[t]))return "اختر لاعب حي";return null}
    return "حركة غير صحيحة"},
  apply(g0,s,a,pv0){
    const g=dupe(g0),pv=dupe(pv0);g.seq++;g.mv[s]=(g.mv[s]||0)+1;
    if(a.t==="night"){const me=pv[s];me.act=a.target;g.nightCount++;if(me.role==="seer")me.seen.push({i:a.target,spider:pv[a.target].role==="spider",day:g.day});
      g.last={i:-1,a:{t:"night"}};if(NW.actors(g,pv).every(i=>pv[i].act!=null))NW.endNight(g,pv);return {g,privs:pv}}
    if(a.t==="vote"){g.votes[s]=a.target;g.last={i:s,a:{t:"vote",target:a.target}};if(g.players.every((p,i)=>!g.alive[i]||g.votes[i]!=null))NW.endDay(g,pv);return {g,privs:pv}}
    g.last={i:s,a:{t:"force"}};if(g.phase==="night")NW.endNight(g,pv);else NW.endDay(g,pv);return {g,privs:pv}},
  endNight(g,pv){const picks={};let save=-1;
    for(let i=0;i<g.n;i++){const p=pv[i];if(!g.alive[i]||p.act==null)continue;if(p.role==="spider")picks[p.act]=(picks[p.act]||0)+1;if(p.role==="doctor")save=p.act}
    const ks=Object.keys(picks).map(Number);let v=-1;if(ks.length){const top=Math.max(...ks.map(k=>picks[k]));v=ks.filter(k=>picks[k]===top).sort((a,b)=>a-b)[0]}
    if(v>=0&&v!==save){g.alive[v]=false;g.dead[v]=pv[v].role;g.log.push({t:"kill",i:v,role:pv[v].role,day:g.day})}else g.log.push({t:v>=0?"saved":"quiet",day:g.day});
    for(const p of pv)p.act=null;g.nightCount=0;
    if(!NW.check(g,pv)){g.phase="day";g.votes=g.players.map(()=>null);g.phaseAt=clock.now()}},
  endDay(g,pv){const tally={};g.votes.forEach((v,i)=>{if(g.alive[i]&&v!=null&&v>=0)tally[v]=(tally[v]||0)+1});
    const ks=Object.keys(tally).map(Number);let out=-1;if(ks.length){const top=Math.max(...ks.map(k=>tally[k])),tops=ks.filter(k=>tally[k]===top);if(tops.length===1)out=tops[0]}
    if(out>=0){g.alive[out]=false;g.dead[out]=pv[out].role;g.log.push({t:"out",i:out,role:pv[out].role,day:g.day,votes:tally[out]})}else g.log.push({t:"tie",day:g.day});
    if(!NW.check(g,pv)){g.phase="night";g.day++;g.votes=g.players.map(()=>null);g.phaseAt=clock.now()}},
  check(g,pv){const sp=g.players.filter((p,i)=>g.alive[i]&&pv[i].role==="spider").length,others=g.alive.filter(Boolean).length-sp;
    const team=sp===0?"flies":sp>=others?"spiders":null;if(!team)return false;
    g.team=team;g.winners=g.players.map((p,i)=>i).filter(i=>(pv[i].role==="spider")===(team==="spiders"));g.winner=g.winners[0];
    for(const i of g.winners){const w=g.players[i].id;g.score[w]=(g.score[w]||0)+1}g.roles=pv.map(x=>x.role);g.phase="end";return true},
  view(g,s,pv){const me=pv[s]||{};return {role:me.role,mates:me.mates||[],seen:me.seen||[],acted:me.act!=null}},
  skip(g0,pv){return {g:g0,privs:pv}},bot(){return null}
};
GAME_RULES.nightweb=NW;MIN_PLAYERS.nightweb=4;MAX_PLAYERS.nightweb=10;
/* ---- BALL CLASH online: secret or drafted line-ups; the server seeds and decides the battle, every player watches the same one ---- */
const BCR={hidden:true,simultaneous:true,
  new(players,o){const g=gmBase("ballclash",players.slice(0,4),o);g.timer=0;g.size=Math.min(5,Math.max(1,(o.bcSize|0)||2));g.pick=o.bcPick==="draft"?"draft":"secret";
    g.phase="pick";g.locked=g.players.map(()=>false);g.picks=g.players.map(()=>[]);g.turn=0;g.deadline=clock.now()+(g.pick==="draft"?25000:75000);return g},
  deal(g){return g.players.map(()=>({picks:[]}))},
  okKind(k){return typeof BC!=="undefined"&&!!BC.KINDS[k]&&!BC.KINDS[k].hidden&&!BC.KINDS[k].shop},
  legal(g,s,a,pv){
    if(g.winner!=null||g.phase!=="pick")return "انتهى الاختيار";if(!a)return "حركة غير صحيحة";
    if(a.t==="timeout")return clock.now()>=g.deadline?null:"باقي وقت";
    if(a.t==="pick"){if(g.pick!=="secret")return "حركة غير صحيحة";if(g.locked[s])return "قفلت تشكيلتك";if(!Array.isArray(a.balls)||a.balls.length!==g.size||!a.balls.every(BCR.okKind))return "اختر "+g.size+" كور";return null}
    if(a.t==="draft"){if(g.pick!=="draft")return "حركة غير صحيحة";if(g.turn!==s)return "مو دورك";if(!BCR.okKind(a.k))return "كورة غير معروفة";if(g.picks.some(p=>p.includes(a.k)))return "هذي الكورة مختارة";return null}
    return "حركة غير صحيحة"},
  apply(g0,s,a,pv0){const g=dupe(g0),pv=dupe(pv0);g.seq++;g.mv[s]=(g.mv[s]||0)+1;
    if(a.t==="pick"){pv[s].picks=a.balls.slice();g.locked[s]=true;g.last={i:s,a:{t:"lock"}}}
    else if(a.t==="draft"){g.picks[s].push(a.k);g.last={i:s,a:{t:"draft",k:a.k}};BCR.nextTurn(g)}
    else{BCR.autoFill(g,pv);g.last={i:s,a:{t:"timeout"}}}
    if(BCR.ready(g))BCR.begin(g,pv);return {g,privs:pv}},
  nextTurn(g){for(let k=1;k<=g.n;k++){const t=(g.turn+k)%g.n;if(g.picks[t].length<g.size){g.turn=t;g.deadline=clock.now()+25000;return}}},
  ready(g){return g.pick==="secret"?g.locked.every(Boolean):g.picks.every(p=>p.length>=g.size)},
  autoFill(g,pv){const pool=BC.PICK.filter(k=>BC.KINDS[k]&&!BC.KINDS[k].shop),rnd=()=>pool[Math.floor(Math.random()*pool.length)];
    if(g.pick==="secret"){for(let i=0;i<g.n;i++)if(!g.locked[i]){pv[i].picks=Array.from({length:g.size},rnd);g.locked[i]=true}}
    else{const used=new Set(g.picks.flat()),free=pool.filter(k=>!used.has(k));g.picks[g.turn].push(free[Math.floor(Math.random()*free.length)]||pool[0]);BCR.nextTurn(g)}},
  begin(g,pv){g.lineups=g.pick==="secret"?pv.map(x=>x.picks.slice()):g.picks.map(p=>p.slice());g.seed=(Math.floor(Math.random()*2147483646)+1)>>>0;g.phase="battle";
    const tot=g.lineups.reduce((s,b)=>s+b.length,0);g.arena=tot<=4?440:560;
    const st=BC.run({seed:g.seed,size:g.arena,teams:g.lineups.map(b=>({balls:b}))});let w=st.winner;
    if(st.draw||w<0){let bv=-1;st.teams.forEach((t,ti)=>{const v=st.balls.filter(b=>b.team===ti&&!b.summon).reduce((a,b)=>a+Math.max(0,b.hp)/b.maxHp,0);if(v>bv){bv=v;w=ti}})}
    g.battleT=Math.round(st.t*10)/10;g.winner=w;const id=g.players[w].id;g.score[id]=(g.score[id]||0)+1},
  view(g,s,pv){return {picks:(pv[s]||{}).picks||[]}},
  skip(g0,pv){return {g:g0,privs:pv}},bot(){return null}
};
GAME_RULES.ballclash=BCR;MAX_PLAYERS.ballclash=4;MIN_PLAYERS.ballclash=2;
/* @domino-engine-start */
/* Double-six dominoes. Classic script: sets globalThis.DOMINO.
   Saudi café round ("أبو ستة"): two players draw, four play block in teams.
   The chain has two ends. A double is crosswise and does not open a third arm.
   One round is one match. Bots are deterministic from the seed and the move count. */
(function (root) {
"use strict";
const TILES = [];
for (let a = 0; a <= 6; a++) for (let b = a; b <= 6; b++) TILES.push([a, b]);

function rngOf(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle(list, rnd) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const t = list[i]; list[i] = list[j]; list[j] = t;
  }
  return list;
}
function pipSum(id) { const t = TILES[id]; return t[0] + t[1]; }
function handPips(hand) { let s = 0; for (const id of hand) s += pipSum(id); return s; }
function otherPip(id, pip) {
  const t = TILES[id];
  if (t[0] === t[1]) return t[0];
  return t[0] === pip ? t[1] : t[0];
}
function endsFor(id, left, right) {
  const t = TILES[id];
  if (!t) return [];
  const out = [];
  if (t[0] === left || t[1] === left) out.push("L");
  if (t[0] === right || t[1] === right) {
    if (left !== right || !out.length) out.push("R");
    else if (!out.includes("R")) out.push("R");
  }
  return out;
}
function clone(o) { return JSON.parse(JSON.stringify(o)); }

function award(g) {
  if (g.draw || g.winner == null) return;
  const seats = g.n === 4 ? [g.winner % 2, (g.winner % 2) + 2] : [g.winner];
  g.winners = seats;
  for (const s of seats) {
    const id = g.players[s].id;
    g.score[id] = (g.score[id] || 0) + 1;
  }
}
function finishOut(g, seat) {
  g.winner = seat;
  g.draw = false;
  const seats = g.hands.map(handPips);
  const score = g.n === 4 ? seats[1 - (seat % 2)] + seats[1 - (seat % 2) + 2] : seats[1 - seat];
  g.pip = { kind: "out", score: score, seats: seats };
  award(g);
}
function finishBlock(g) {
  const seats = g.hands.map(handPips);
  g.pip = { kind: "block", score: 0, seats: seats };
  if (g.n === 4) {
    const t0 = seats[0] + seats[2], t1 = seats[1] + seats[3];
    if (t0 === t1) { g.draw = true; g.winner = null; return; }
    g.winner = t0 < t1 ? 0 : 1;
    g.draw = false;
    g.pip.score = Math.abs(t0 - t1);
    award(g);
    return;
  }
  if (seats[0] === seats[1]) { g.draw = true; g.winner = null; return; }
  g.winner = seats[0] < seats[1] ? 0 : 1;
  g.draw = false;
  g.pip.score = Math.abs(seats[0] - seats[1]);
  award(g);
}
function maybeEnd(g) {
  const empty = g.hands.findIndex(h => h.length === 0);
  if (empty >= 0) { finishOut(g, empty); return; }
  if (g.passes >= g.n && g.yard.length === 0) finishBlock(g);
}

function deal(seed, n, players, o) {
  o = o || {};
  seed = seed >>> 0;
  const rnd = rngOf(seed);
  const deck = shuffle(TILES.map((_, i) => i), rnd);
  const hands = [];
  for (let i = 0; i < n; i++) hands.push(deck.splice(0, 7));
  const yard = n === 2 ? deck : [];
  let best = null;
  for (let s = 0; s < n; s++) {
    for (const id of hands[s]) {
      const t = TILES[id];
      const score = (t[0] === t[1] ? 100 : 0) + t[0] + t[1];
      if (!best || score > best.score) best = { s: s, id: id, score: score };
    }
  }
  hands[best.s] = hands[best.s].filter(id => id !== best.id);
  const openTile = TILES[best.id];
  const pl = players.slice(0, n).map(p => ({ id: p.id, nick: p.nick, skin: p.skin, bot: p.bot || 0 }));
  return {
    game: "domino", n: n, seed: seed, variant: n === 4 ? "block" : "draw",
    players: pl, hands: hands, yard: yard,
    chain: [{ id: best.id, end: "O" }], left: openTile[0], right: openTile[1],
    turn: (best.s + 1) % n, passes: 0, moves: [],
    winner: null, draw: false, winners: null, pip: null,
    open: { seat: best.s, id: best.id },
    seq: o.seq || 1, s0: o.seq || 1,
    mid: o.mid || ("dm" + seed.toString(36)),
    round: o.round || 1, score: o.score ? clone(o.score) : {},
    timer: 0, bs: o.bs || "classic", last: { i: best.s, a: { t: "open", id: best.id } },
    mv: Array(n).fill(0), walls: []
  };
}

function legalActs(g, seat) {
  const plays = [];
  const hand = g.hands[seat] || [];
  for (const id of hand) {
    for (const end of endsFor(id, g.left, g.right)) plays.push({ t: "play", id: id, end: end });
  }
  if (plays.length) return plays;
  if (g.variant === "draw" && g.yard.length) return [{ t: "draw" }];
  return [{ t: "pass" }];
}
function sameAct(a, b) {
  if (!a || !b || a.t !== b.t) return false;
  if (a.t === "play") return a.id === b.id && a.end === b.end;
  return true;
}
function legal(g, seat, a) {
  if (!g || g.winner != null || g.draw) return "انتهت الجولة";
  if (seat !== g.turn) return "مو دورك";
  if (!a || typeof a !== "object") return "حركة غير صحيحة";
  const acts = legalActs(g, seat);
  if (a.t === "play") {
    if (!Number.isInteger(a.id) || a.id < 0 || a.id > 27) return "حجر غير معروف";
    if (a.end !== "L" && a.end !== "R") return "جهة غير صحيحة";
    if (!acts.some(x => x.t === "play" && x.id === a.id && x.end === a.end)) return "ما ينلعب هالحجر هنا";
    return null;
  }
  if (a.t === "draw") return acts.some(x => x.t === "draw") ? null : "ما تقدر تسحب";
  if (a.t === "pass") return acts.some(x => x.t === "pass") ? null : "عندك حركة";
  return "حركة غير صحيحة";
}
function apply(g0, seat, a) {
  const g = clone(g0);
  if (a.t === "play") {
    const i = g.hands[seat].indexOf(a.id);
    g.hands[seat].splice(i, 1);
    if (a.end === "L") {
      g.left = otherPip(a.id, g.left);
      g.chain.unshift({ id: a.id, end: "L" });
    } else {
      g.right = otherPip(a.id, g.right);
      g.chain.push({ id: a.id, end: "R" });
    }
    g.passes = 0;
    g.moves.push({ t: "play", id: a.id, end: a.end });
    g.last = { i: seat, a: { t: "play", id: a.id, end: a.end } };
    g.mv[seat] = (g.mv[seat] || 0) + 1;
    g.seq++;
    if (g.hands[seat].length === 0) finishOut(g, seat);
    else { g.turn = (seat + 1) % g.n; maybeEnd(g); }
    return g;
  }
  if (a.t === "draw") {
    const id = g.yard.shift();
    g.hands[seat].push(id);
    g.moves.push({ t: "draw" });
    g.last = { i: seat, a: { t: "draw" } };
    g.mv[seat] = (g.mv[seat] || 0) + 1;
    g.seq++;
    if (!legalActs(g, seat).some(x => x.t === "play")) {
      g.passes++;
      g.turn = (seat + 1) % g.n;
      maybeEnd(g);
    }
    return g;
  }
  g.passes++;
  g.moves.push({ t: "pass" });
  g.last = { i: seat, a: { t: "pass" } };
  g.seq++;
  g.turn = (seat + 1) % g.n;
  maybeEnd(g);
  return g;
}

function botPick(g) {
  const seat = g.turn;
  const acts = legalActs(g, seat);
  if (!acts.length) return null;
  const lvl = (g.players[seat] && g.players[seat].bot) || 2;
  let x = (g.seed ^ Math.imul(g.moves.length + 1, 0x9E3779B1) ^ Math.imul(seat + 1, 0x85EBCA6B)) >>> 0;
  const rnd = () => { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; return x / 4294967296; };
  const plays = acts.filter(a => a.t === "play");
  if (lvl <= 1) return acts[Math.floor(rnd() * acts.length)];
  if (!plays.length) return acts[0];
  if (lvl === 2 && rnd() < 0.35) return plays[Math.floor(rnd() * plays.length)];
  const hand = g.hands[seat];
  const emptying = plays.filter(a => hand.length === 1);
  const pool = emptying.length ? emptying : plays;
  let best = pool[0], bv = -1e9;
  for (const a of pool) {
    const t = TILES[a.id];
    let keep = 0;
    for (const id of hand) if (id !== a.id) {
      const u = TILES[id];
      if (u[0] === t[0] || u[1] === t[0] || u[0] === t[1] || u[1] === t[1]) keep++;
    }
    const v = (t[0] === t[1] ? 40 : 0) + (t[0] + t[1]) * 3 + keep * 5;
    if (v > bv) { bv = v; best = a; }
  }
  return best;
}

function replay(seed, n, moves, botLevels) {
  if (n !== 2 && n !== 4) throw new Error("n");
  if (!Array.isArray(moves) || moves.length > 200) throw new Error("len");
  const levels = Array.isArray(botLevels) ? botLevels : [];
  const players = [];
  for (let i = 0; i < n; i++) players.push({ id: "P" + i, nick: "P" + i, skin: i, bot: levels[i] | 0 });
  let g = deal(seed, n, players, {});
  let steps = 0;
  for (const m of moves) {
    if (g.winner != null || g.draw) break;
    if (steps++ > 200) throw new Error("long");
    if ((g.players[g.turn].bot || 0) > 0) {
      const expect = botPick(g);
      if (!sameAct(expect, m)) throw new Error("bot");
    }
    const e = legal(g, g.turn, m);
    if (e) throw new Error(e);
    g = apply(g, g.turn, m);
  }
  if (g.winner == null && !g.draw) throw new Error("open");
  return g;
}
function playerWon(g, seat) {
  if (!g || g.draw || g.winner == null || seat < 0) return false;
  if (g.n === 4) return seat % 2 === g.winner % 2;
  return g.winner === seat;
}

function toPublic(g) {
  return {
    game: "domino", n: g.n, variant: g.variant, players: g.players.map(p => ({ id: p.id, nick: p.nick, skin: p.skin, bot: p.bot || 0 })),
    turn: g.turn, passes: g.passes, seq: g.seq, s0: g.s0, mid: g.mid, round: g.round, score: g.score,
    timer: g.timer, bs: g.bs, last: g.last, mv: g.mv, walls: g.walls,
    winner: g.winner, draw: g.draw, winners: g.winners, pip: g.pip, open: g.open,
    chain: g.chain, left: g.left, right: g.right,
    counts: g.hands.map(h => h.length), yardN: g.yard.length, moves: g.moves.map(m => ({ t: m.t, id: m.id, end: m.end }))
  };
}
function splitPriv(g) {
  return g.hands.map(h => ({ hand: h.slice(), yard: g.yard.slice(), seed: g.seed >>> 0 }));
}
function rehydrate(pub, privs) {
  const g = clone(pub);
  g.hands = (privs || []).map(p => (p && p.hand ? p.hand.slice() : []));
  g.yard = (privs && privs[0] && privs[0].yard) ? privs[0].yard.slice() : [];
  g.seed = (privs && privs[0] && privs[0].seed) >>> 0;
  g.moves = (pub.moves || []).map(m => ({ t: m.t, id: m.id, end: m.end }));
  return g;
}

const rules = {
  hidden: true,
  new(players, o) {
    o = o || {};
    let pl = players.slice();
    if (pl.length >= 4) pl = pl.slice(0, 4);
    else if (pl.length !== 2) pl = pl.slice(0, 2);
    const n = pl.length === 4 ? 4 : 2;
    const seed = (o.seed ? (o.seed >>> 0) : ((Math.floor(Math.random() * 2147483646) + 1) >>> 0));
    const mid = o.mid || ("dm" + seed.toString(36) + Math.random().toString(36).slice(2, 7));
    const full = deal(seed, n, pl, { seq: o.seq || 1, mid: mid, round: o.round || 1, score: o.score || {}, bs: o.bs || "classic" });
    const pub = toPublic(full);
    pub.seed = seed;
    return pub;
  },
  deal(g) {
    const seed = g.seed >>> 0;
    const full = deal(seed, g.n, g.players, { seq: g.seq, mid: g.mid, round: g.round, score: g.score, bs: g.bs });
    delete g.seed;
    return splitPriv(full);
  },
  legal(g, seat, a, pv) { return legal(rehydrate(g, pv), seat, a); },
  apply(g, seat, a, pv) {
    const next = apply(rehydrate(g, pv), seat, a);
    return { g: toPublic(next), privs: splitPriv(next) };
  },
  bot(g, seat, pv) { return botPick(rehydrate(g, pv)); },
  skip(g, pv) {
    const full = rehydrate(g, pv);
    const acts = legalActs(full, full.turn);
    const a = acts[0] || { t: "pass" };
    const next = apply(full, full.turn, a);
    return { g: toPublic(next), privs: splitPriv(next) };
  },
  view(g, seat, pv) {
    const p = (pv && pv[seat]) || { hand: [] };
    return { hand: (p.hand || []).slice() };
  }
};

root.DOMINO = {
  tiles: TILES, endsFor, deal, legal, apply, bot: botPick, replay, playerWon, rules,
  pips: pipSum
};
})(typeof globalThis !== "undefined" ? globalThis : this);
/* @domino-engine-end */
const DOMINO=globalThis.DOMINO;
GAME_RULES.domino=DOMINO.rules;MIN_PLAYERS.domino=2;MAX_PLAYERS.domino=4;

/* @kalima-engine-start */
/* Shared scorer for كلمة اليوم. Classic script: sets globalThis.KALIMA.
   The same file is spliced into the spider function. It does not contain answers. */
(function (root) {
  const TASH = /[\u064B-\u0652\u0670\u0640\u06D6-\u06ED]/g;
  const MAP = {"أ": "ا", "إ": "ا", "آ": "ا", "ٱ": "ا", "ة": "ه", "ى": "ي", "ؤ": "و", "ئ": "ي"};
  function norm(s) {
    s = String(s == null ? "" : s).replace(TASH, "").replace(/ء/g, "");
    let out = "";
    for (const ch of s) out += MAP[ch] || ch;
    return out;
  }
  function score(answer, guess) {
    const a = [...answer], g = [...guess], m = ["b", "b", "b", "b", "b"], left = {};
    for (let i = 0; i < 5; i++) {
      if (g[i] === a[i]) m[i] = "g";
      else left[a[i]] = (left[a[i]] || 0) + 1;
    }
    for (let i = 0; i < 5; i++) {
      if (m[i] === "g") continue;
      if (left[g[i]]) { m[i] = "y"; left[g[i]]--; }
    }
    return m.join("");
  }
  function dayIndex(day, n) {
    const p = String(day).split("-").map(Number);
    const k = Math.round((Date.UTC(p[0], p[1] - 1, p[2]) - Date.UTC(2026, 0, 1)) / 86400000);
    return ((k % n) + n) % n;
  }
  function prevDay(day) {
    const p = String(day).split("-").map(Number);
    const dt = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
    dt.setUTCDate(dt.getUTCDate() - 1);
    return dt.toISOString().slice(0, 10);
  }
  root.KALIMA = {
    norm, score, dayIndex, prevDay, LEN: 5, TRIES: 6,
    ALPHA: "ابتثجحخدذرزسشصضطظعغفقكلمنهوي"
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
/* @kalima-engine-end */
/* @kalima-answers-start */
/* Daily answers for كلمة اليوم. Same MIT FrequencyWords source as the guess list.
   Server only. Do not add this file to the service worker, the artifact, or app.js. */
globalThis.KALIMA_ANSWERS=["عندما","لماذا","الامر","اعتقد","الوقت","اليوم","يمكنك","مرحبا","الرجل","لدينا","سيكون","الناس","علينا","واحده","العمل","عليها","المال","ستكون","السيد","بحاجه","الذين","دايما","تعتقد","مشكله","ارجوك","تماما","الشخص","النار","قليلا","مالذي","والان","انتظر","السبب","سنوات","الباب","حياتي","ثلاثه","كانوا","كثيرا","كبيره","احتاج","هنالك","جميله","دولار","لانني","الخاص","بسرعه","الارض","طريقه","رايعه","دقيقه","ثانيه","لكنني","بينما","لديها","ساكون","تتحدث","المره","الخير","متاكد","جميعا","احاول","الموت","سياره","مجددا","اتمني","سعيده","علاقه","صغيره","الاقل","لنذهب","صديقي","ساذهب","اتعلم","نهايه","لديهم","جديده","الاول","دقايق","عزيزي","الجنس","ينبغي","الطفل","تحتاج","اريدك","تفعله","وماذا","سيدتي","البعض","البيت","تكوني","والدك","السجن","الليل","بانني","طويله","والدي","ترجمه","نحتاج","ايتها","اتحدث","احدهم","البقا","معرفه","العام","حياتك","عليهم","نتحدث","لاحقا","سافعل","لكنها","يمكنه","الاخر","تحاول","بخصوص","اخبرك","الحال","النوم","دكتور","انظري","الحرب","تعالي","مايكل","حاولت","دعونا","عايله","بعيدا","اعطني","اصبحت","رساله","العشا","النسا","الفتي","اتذكر","ساعات","حينما","امراه","حقيقي","مجنون","زوجتي","اتعرف","فرانك","قريبا","حقيقه","اللقا","بانها","الملك","الوضع","ولكني","مدينه","انتهي","يحاول","اصدقا","النوع","الجيد","اليها","بيننا","عمليه","بعضنا","دعيني","بنفسك","فعلته","ولكنه","مليون","يحتاج","النظر","اتريد","سيحدث","الصعب","ساقوم","اربعه","ساعود","بكثير","يتحدث","بعدها","تبدين","للعمل","جريمه","توقفي","بنفسي","الشمس","يفترض","السما","اطفال","يارجل","وداعا","مشاكل","البحث","ستفعل","مستعد","لانها","سنذهب","مختلف","رايعا","طالما","مقابل","عليكم","باننا","الخطا","لفتره","زوجتك","نفسها","لكننا","والذي","مفهوم","فعلها","ينتهي","منتصف","رايته","الهوا","سنكون","موجود","القتل","ممتاز","لطيفه","اوليك","حوالي","اخيرا","اعاده","انتما","السنه","مازال","ميلاد","ستعمل","يعتقد","العرض","القصه","تفعلي","الصور","الوغد","اسمعي","ولكنك","قايمه","حينها","مازلت","صديقك","ايجاد","البشر","اعرفه","البحر","رويتك","يستحق","دعينا","تقلقي","تغيير","منزلي","خايفه","كثيره","اطلاق","بماذا","عندها","يتعلق","اخبار","القلب","استطع","الينا","لاننا","العيش","القوه","منطقه","وظيفه","اثنان","القول","تحدثت","حياته","يبدوا","للابد","اشخاص","الامن","افعله","سنفعل","الدما","اثنين","تريده","الجيش","اعتذر","ديفيد","كلانا","سنقوم","واحدا","صندوق","الكلب","ابتعد","الغير","الهدف","وجدنا","بجانب","غريبه","تناول","رايحه","حبيبي","ساتصل","مكانك","الصوت","والتي","الخلف","ابنتي","الهرا","مثيره","ليسوا","لديكم","الرغم","طريقي","قادمه","بالله","اذهبي","زوجته","القبض","الشاب","احضرت","الكره","اللعب","يفعله","تتذكر","اريده","اشكرك","بطاقه","متاخر","ماهذا","كلارك","وهناك","الرقص","لرويه","مدرسه","نحاول","كيفيه","اسبوع","يجعلك","بدايه","الغدا","كامله","وربما","لربما","لنفسك","تتحرك","اتفهم","ملابس","صديقه","المهم","جزيلا","الخطه","وصلنا","اقوله","شخصيه","اتصلت","تتكلم","روبرت","ساقول","الشعر","مثلما","حصلنا","بوسعي","بمجرد","الرقم","اليكس","اراهن","مساله","احسنت","عظيمه","العمر","حمايه","تقوله","للبيت","معذره","فتيات","تتوقف","اللحم","القدم","قالوا","تاريخ","باريس","تنتهي","موخرا","حالما","بعضهم","بامان","تظنين","الالم","سابقا","اسمها","والتر","جاهزه","تقولي","ستذهب","الديك","لكنهم","القمر","وكانت","طايره","استمع","وكذلك","مرتين","تعرفي","الزمن","انتهت","طبيعي","منزلك","طويلا","اعمال","مشغول"];
/* @kalima-answers-end */
/* @kalima-guesses-start */
/* كلمة اليوم lists. Source: Hermit Dave, FrequencyWords, 2018 Arabic 50k.
   https://github.com/hermitdave/FrequencyWords  License: MIT.
   Normalised alef, hamza carriers, taa marbuta and alef maqsura.
   This file is the allowed-guess list. It is not the daily answer order. */
globalThis.KALIMA_GUESSES=["اانتم","اباحي","اباده","ابالغ","ابالي","ابانا","اباها","ابتاع","ابتاه","ابتدا","ابتسم","ابتعت","ابتعد","ابتكر","ابتلع","ابتهج","ابحاث","ابحثي","ابحرت","ابداع","ابداي","ابدوا","ابديه","ابديي","ابراج","ابريا","ابريق","ابريل","ابطال","ابعاد","ابعدت","ابعده","ابعدي","ابقار","ابقني","ابقها","ابقوا","ابقيا","ابقيت","ابقيك","ابقيه","ابلاغ","ابلغت","ابلغك","ابليت","ابليس","ابنتك","ابنته","ابنتي","ابننا","ابنها","ابنهم","ابهام","ابواب","ابواي","ابولو","ابونا","ابوها","ابويك","ابوين","ابويه","ابيعه","ابينا","ابيها","اتابع","اتاخر","اتاسف","اتاكد","اتالم","اتامل","اتاني","اتباع","اتبحث","اتبعت","اتبعك","اتبعه","اتبعي","اتبول","اتتبع","اتتني","اتجاه","اتجسس","اتجمد","اتجنب","اتجهت","اتجول","اتحاد","اتحدث","اتحرك","اتحسب","اتحسن","اتحقق","اتحكم","اتحمل","اتحول","اتخاذ","اتخذت","اتخرج","اتخطي","اتخلص","اتخلي","اتخيل","اتدبر","اتدخل","اتدرب","اتدرك","اتدري","اتذكر","اتذمر","اتذوق","اتردد","اترغب","اتركك","اتركه","اتركي","اترون","اتريد","اترين","اتزوج","اتسال","اتسبب","اتسكع","اتسلق","اتسلل","اتسمح","اتسمع","اتسوق","اتشرف","اتشعر","اتشوق","اتصال","اتصدق","اتصرف","اتصلت","اتصلي","اتصور","اتضور","اتطفل","اتطلع","اتطوع","اتظنه","اتعجب","اتعرض","اتعرف","اتعرق","اتعقب","اتعلم","اتعمد","اتعمل","اتعني","اتعهد","اتغير","اتفاق","اتفحص","اتفعل","اتفقت","اتفقد","اتفكر","اتفهم","اتفوه","اتقان","اتقبل","اتقدم","اتقصد","اتقول","اتقوم","اتقيا","اتكلم","اتلفت","اتلقي","اتمام","اتمتع","اتمرن","اتمزح","اتمسك","اتمشي","اتمكن","اتملك","اتممت","اتمني","اتنفس","اتهام","اتهمت","اتوتر","اتوجد","اتوجه","اتورط","اتوسل","اتوقع","اتوقف","اتولي","اتومن","اتوود","اتيتم","اتيتي","اتيحت","اتيلا","اتينا","اثارا","اثارت","اثاره","اثبات","اثبتت","اثبتي","اثرها","اثريا","اثريه","اثنان","اثنين","اثينا","اجابت","اجابه","اجاثا","اجازه","اجاشي","اجانب","اجبار","اجبرت","اجبرك","اجبره","اجبني","اجتزت","اجتمع","اجدها","اجدهم","اجراس","اجربه","اجرحك","اجروا","اجريت","اجساد","اجسام","اجعلك","اجعله","اجعلي","اجلبه","اجلبي","اجلسا","اجلسي","اجلكم","اجلنا","اجلها","اجلهم","اجمعي","اجنبي","اجنحه","اجهاد","اجهاض","اجهزه","اجوبه","اجيال","اجيبي","اجيده","احادي","احارب","احافظ","احاول","احباط","احببت","احبتك","احبته","احبكم","احبني","احبها","احبهم","احبوا","احتاج","احتجت","احترس","احترق","احترم","احتسا","احتسي","احتضر","احتفظ","احتفل","احتمل","احتوا","احجار","احجيه","احداث","احدثت","احدثك","احدكم","احدنا","احدها","احدهم","احذرك","احذري","احذيه","احراج","احرار","احراز","احراق","احرزت","احرصي","احرقت","احزري","احزمه","احزمي","احساس","احسان","احسدك","احسست","احسنت","احصلت","احصلي","احصنه","احضار","احضان","احضرت","احضرك","احضره","احضري","احفاد","احكام","احلام","احمقا","احملك","احمله","احميك","احميه","احواض","احوال","اخاطب","اخاطر","اخافه","اخاها","اخبار","اخبرت","اخبرك","اخبره","اخبري","اختار","اختاه","اختبا","اختبر","اختبي","اخترت","اخترع","اخترق","اختطف","اختفا","اختفت","اختفي","اختلط","اختلف","اختلق","اختنا","اختنق","اختها","اخدعك","اخدمك","اخذتك","اخذتم","اخذته","اخذتي","اخذلك","اخذنا","اخذني","اخذها","اخذهم","اخذوا","اخذوه","اخراج","اخران","اخرجا","اخرجت","اخرجك","اخرجه","اخرجي","اخرسي","اخرها","اخرون","اخرين","اخسرك","اخسره","اخشاه","اخضاع","اخطات","اخطار","اخطيت","اخفاق","اخفتك","اخفضي","اخفقت","اخفيت","اخفيه","اخلاق","اخلعي","اخلوا","اخماد","اخوات","اخوان","اخوتك","اخوتي","اخوكم","اخوها","اخويه","اخيرا","اخيره","اخيفك","اخيها","اداره","ادافع","اداما","ادامز","ادانه","ادايك","ادايي","ادجار","ادخال","ادخلا","ادخلت","ادخلك","ادخله","ادخلي","ادراج","ادراك","ادركت","ادعمك","ادعها","ادعهم","ادعوا","ادعوك","ادعوه","ادغار","ادفعه","ادفعي","ادليت","ادمان","ادمغه","ادوات","ادوار","ادولف","ادوين","ادويه","اذاعه","اذاني","اذكرك","اذكره","اذكيا","اذلال","اذناي","اذنكم","اذنيك","اذنيه","اذهبا","اذهبو","اذهبي","اذيتك","اراجع","ارادت","ارادك","اراده","ارادو","اراضي","اراقب","اراقه","اراكم","اراكي","ارانب","اراني","اراها","اراهم","اراهن","ارايت","ارباح","ارباع","اربطه","اربعا","اربعه","ارتاح","ارتبط","ارتجف","ارتحت","ارتدا","ارتدت","ارتدي","ارتشر","ارتشي","ارتفع","ارتكب","ارتني","ارجاع","ارجعه","ارجعي","ارجوا","ارجوك","ارجون","ارحلي","اردتك","اردتم","اردته","اردتي","اردنا","ارسال","ارسطو","ارسلت","ارسلك","ارسله","ارسلي","ارشيف","ارضنا","ارضهم","ارضيه","ارطال","ارغوس","ارفعه","ارفعي","ارقام","ارقصي","اركان","اركبي","اركضي","ارلين","ارمله","ارمها","ارموا","ارنست","ارهاب","ارواح","اروني","اروين","اريان","اريتك","اريدك","اريده","اريكا","اريكم","اريكه","ارينا","اريني","اريها","اريهم","ازاحه","ازاله","ازداد","ازرار","ازعاج","ازعجك","ازهار","ازواج","اساسا","اساسي","اساعد","اسافر","اسالك","اساله","اسالي","اسامح","اسامه","اسباب","اسبوع","استاذ","استحق","استحم","استدر","استرح","استرخ","استرد","استطع","استعد","استغل","استقر","استقل","استلم","استمر","استمع","اسحاق","اسحبه","اسحبي","اسدني","اسديت","اسرار","اسرتك","اسرته","اسرتي","اسرعا","اسرعت","اسرعي","اسرهم","اسطول","اسعار","اسعاف","اسفان","اسفون","اسقاط","اسقطت","اسقطه","اسكتي","اسلاك","اسلام","اسلحه","اسلوب","اسماك","اسمحي","اسمعا","اسمعت","اسمعك","اسمعه","اسمعي","اسمها","اسمهم","اسميه","اسنان","اسهال","اسوار","اسواق","اسودا","اسوكا","اسياد","اسيطر","اسيلك","اسيله","اسيوي","اشارت","اشارك","اشاره","اشاعه","اشاهد","اشباح","اشتاق","اشترت","اشترك","اشتري","اشتغل","اشتقت","اشتكي","اشجار","اشخاص","اشرار","اشراف","اشربه","اشربي","اشرحي","اشرطه","اشرقت","اشعار","اشعاع","اشعال","اشعلت","اشكال","اشكرك","اشكره","اشياا","اشياك","اصابت","اصابع","اصابك","اصابه","اصبته","اصبحا","اصبحت","اصبعك","اصبعه","اصبعي","اصبنا","اصحاب","اصحيح","اصدار","اصدرت","اصدقا","اصدقك","اصدقه","اصطاد","اصطحب","اصطدم","اصعدي","اصغوا","اصفاد","اصلاح","اصلحت","اصلحه","اصليه","اصمتي","اصمدي","اصناف","اصنعي","اصوات","اصيبت","اضاجع","اضاعه","اضافه","اضافي","اضراب","اضرار","اضربك","اضربه","اضطرت","اضعاف","اضعته","اضعنا","اضعها","اضعهم","اضغطي","اضلاع","اطارد","اطالب","اطباق","اطراف","اطردك","اطعام","اطعمه","اطفات","اطفال","اطفيه","اطفيي","اطلاع","اطلاق","اطلبه","اطلبي","اطلعت","اطلعك","اطلقت","اطلقي","اطمين","اطنان","اطوار","اظافر","اظننا","اظنني","اظنها","اظنهم","اظهار","اظهرت","اظهري","اعادت","اعاده","اعارض","اعاقب","اعاقه","اعالج","اعامل","اعاني","اعاود","اعتاد","اعتبر","اعتدا","اعتدت","اعتدي","اعتذر","اعترض","اعترف","اعتزم","اعتقد","اعتقل","اعتمد","اعتني","اعثري","اعجاب","اعجبت","اعجبك","اعداد","اعدام","اعدته","اعددت","اعدكم","اعدنا","اعدني","اعدها","اعدهم","اعدوا","اعذار","اعراض","اعرضه","اعرفك","اعرفه","اعشاب","اعصاب","اعصار","اعطاك","اعطاه","اعطتك","اعطته","اعطنا","اعطني","اعطها","اعطهم","اعطوا","اعطوك","اعطوه","اعطيت","اعطيك","اعطيه","اعقاب","اعلام","اعلان","اعلاه","اعلمت","اعلمك","اعلمه","اعلمي","اعلنت","اعماق","اعمال","اعمده","اعمله","اعملي","اعنيه","اعواد","اعوام","اعوضك","اعياد","اعيدك","اعيده","اعيدي","اعينك","اغادر","اغاني","اغبيا","اغتصب","اغتنم","اغراض","اغراق","اغربي","اغرقت","اغسطس","اغضبك","اغطيه","اغلاق","اغلفه","اغلقت","اغلقه","اغلقي","اغمضي","اغنيا","اغنيس","اغنيه","افاده","افاعي","افتتح","افتحه","افتحي","افترض","افتقد","افراد","افراغ","افرغت","افساد","افسدت","افضله","افطار","افعال","افعلت","افعله","افعلي","افقدك","افقده","افكار","افلام","افلست","افهمت","افهمك","افهمه","افواه","افيري","افيقي","اقابل","اقاتل","اقارب","اقاطع","اقامت","اقامه","اقاوم","اقبال","اقبلك","اقبله","اقتبس","اقتحم","اقترب","اقترح","اقترف","اقتلع","اقتلك","اقتله","اقتنع","اقحمت","اقدام","اقدمت","اقدمك","اقدمه","اقراص","اقراط","اقراه","اقراي","اقربا","اقزام","اقسام","اقسمت","اقصدك","اقصده","اقضوا","اقفاص","اقفال","اقفزي","اقفلت","اقلام","اقلعت","اقلها","اقليم","اقمار","اقمنا","اقناع","اقنعت","اقنعك","اقنعه","اقوال","اقوله","اقويا","اكافح","اكانت","اكتبه","اكتبي","اكترث","اكتشف","اكتفي","اكتمل","اكرهك","اكرهه","اكسيد","اكلته","اكلمك","اكلمه","اكلنا","اكلها","اكلوا","اكمال","اكمام","اكملت","اكملي","اكواب","اكوام","اكونه","اكياس","اكيده","الابا","الابد","الابر","الابن","الاتي","الاثر","الاجر","الاجل","الاحد","الاحظ","الاحق","الاخت","الاخذ","الاخر","الادا","الادب","الاذن","الاذي","الارا","الارث","الارز","الارض","الارق","الازل","الاسد","الاسر","الاسف","الاسم","الاسو","الاسي","الاشد","الاصل","الافق","الاقل","الاكل","الالب","الالف","الالم","الاله","الالي","الامد","الامر","الامس","الامل","الامم","الامن","الامه","الانف","الاهل","الاهم","الاهي","الاوز","الاول","الايس","الايل","الايه","الباب","البار","الباص","البال","البته","البجع","البحث","البحر","البدا","البدل","البرت","البرج","البرد","البرق","البري","البسه","البشر","البشع","البصر","البصل","البطل","البطن","البطه","البطي","البعث","البعد","البعض","البغل","البقا","البقر","البقع","البكا","البكر","البكم","البلا","البلد","البنا","البنت","البند","البنك","البني","البهو","البوب","البوح","البوس","البوق","البول","البوم","البيت","البير","البيض","البيع","التاج","التام","التبت","التبغ","التحف","التحق","الترم","التزم","التسع","التعب","التفت","التقت","التقط","التقي","التله","التنس","التهم","التوت","التين","الثار","الثدي","الثرا","الثري","الثقب","الثقل","الثقه","الثلث","الثلج","الثمل","الثمن","الثنا","الثوب","الثور","الثوم","الجاد","الجار","الجاز","الجاف","الجان","الجبر","الجبل","الجبن","الجثث","الجثه","الجدد","الجدل","الجده","الجدي","الجذب","الجذر","الجذع","الجرا","الجرح","الجرد","الجرذ","الجرس","الجرف","الجره","الجرو","الجري","الجزا","الجزر","الجزم","الجسد","الجسر","الجسم","الجشع","الجعه","الجلد","الجلل","الجلي","الجمع","الجمل","الجنس","الجنه","الجني","الجهد","الجهل","الجهه","الجوز","الجوع","الجوي","الجيب","الجيد","الجيش","الجيل","الجين","الحاج","الحاد","الحار","الحاق","الحال","الحبر","الحبس","الحبل","الحبه","الحجر","الحجز","الحجم","الحجه","الحدث","الحدس","الحذا","الحذر","الحرب","الحرج","الحرس","الحرص","الحرف","الحرق","الحرم","الحره","الحزب","الحزم","الحزن","الحسا","الحسد","الحسن","الحشد","الحصص","الحصن","الحصه","الحصي","الحطب","الحظر","الحفر","الحفظ","الحفل","الحقد","الحقل","الحقن","الحكم","الحكه","الحلق","الحلم","الحلو","الحمد","الحمر","الحمض","الحمل","الحمم","الحمي","الحوت","الحوض","الحيض","الحيل","الحين","الحيه","الخاص","الخال","الخام","الخان","الخبر","الخبز","الختم","الخجل","الخدش","الخدع","الخدم","الخرا","الخرف","الخرق","الخزف","الخزي","الخشب","الخشن","الخصر","الخصم","الخضر","الخطا","الخطب","الخطر","الخطط","الخطف","الخطه","الخفا","الخفي","الخلا","الخلد","الخلط","الخلف","الخلق","الخلل","الخمر","الخمس","الخنق","الخوخ","الخوض","الخوف","الخير","الخيط","الخيل","الدار","الدخل","الدرب","الدرج","الدرس","الدرع","الدسم","الدعا","الدعم","الدفع","الدفن","الدفه","الدقه","الدلو","الدما","الدمج","الدمي","الدهر","الدهن","الدوا","الدور","الدوق","الدول","الدون","الدير","الديك","الدين","الديه","الذات","الذان","الذره","الذري","الذعر","الذقن","الذكا","الذكر","الذكي","الذنب","الذهب","الذهن","الذوق","الذيب","الذيل","الذين","الراب","الراس","الراي","الربح","الربط","الربع","الربو","الرتب","الرتل","الرجا","الرجل","الرحب","الرحم","الردا","الردي","الرسم","الرشد","الرضا","الرضع","الرطب","الرعب","الرعد","الرغم","الرفض","الرفع","الرقص","الرقم","الركض","الركل","الركن","الرمح","الرمز","الرمل","الرمي","الرنه","الرهن","الروث","الروح","الروس","الروك","الروم","الروي","الريث","الريح","الريش","الريف","الريه","الزبد","الزحف","الزرع","الزمن","الزنا","الزوج","الزيت","السار","الساق","السام","السبب","السبت","السبع","السبل","الستم","السته","السجق","السجل","السجن","السحب","السحر","السرا","السرب","السرج","السري","السطح","السطر","السطو","السعر","السعه","السعي","السفر","السفن","السقف","السكر","السكك","السكن","السكه","السلع","السلك","السلم","السله","السما","السمع","السمك","السمو","السنا","السنه","السهر","السهل","السهم","السود","السور","السوط","السوق","السيد","السير","السيف","السيي","الشاب","الشاذ","الشاش","الشاق","الشان","الشاه","الشاي","الشبح","الشبه","الشتا","الشجر","الشحم","الشحن","الشخص","الشده","الشرا","الشرب","الشرج","الشرح","الشرط","الشرف","الشرق","الشعب","الشعر","الشغب","الشغف","الشغل","الشفا","الشفق","الشقق","الشقه","الشقي","الشكر","الشكل","الشلل","الشمس","الشمع","الشمل","الشنق","الشهر","الشوا","الشوط","الشيخ","الشيف","الشيك","الشيي","الصبح","الصبر","الصبي","الصحف","الصحن","الصحه","الصحي","الصخب","الصخر","الصدا","الصدد","الصدر","الصدع","الصدف","الصدق","الصدي","الصرع","الصرف","الصعب","الصعق","الصغر","الصفا","الصفح","الصفر","الصفه","الصقر","الصلب","الصله","الصمت","الصمغ","الصنع","الصنف","الصوت","الصور","الصوف","الصيت","الصيد","الصيف","الصين","الضال","الضان","الضبط","الضجه","الضحك","الضخم","الضرب","الضرر","الضعف","الضغط","الضفه","الضلع","الضيا","الضيف","الضيق","الطبخ","الطبع","الطبق","الطبل","الطبي","الطرد","الطرف","الطرق","الطعم","الطعن","الطفح","الطفل","الطقس","الطلا","الطلب","الطلق","الطمع","الطهو","الطهي","الطوب","الطوق","الطول","الطيب","الطير","الطيف","الطين","الظرف","الظلم","الظهر","العاب","العاج","العار","العام","العبث","العبد","العجز","العجل","العدا","العدد","العدل","العدم","العده","العدو","العذب","العذر","العرا","العرب","العرس","العرش","العرض","العرق","العزا","العزف","العزل","العزم","العسل","العشا","العشب","العشر","العصا","العصب","العصر","العصي","العضو","العطا","العطر","العطش","العطف","العطل","العظم","العفن","العفو","العقد","العقل","العكس","العلب","العلم","العلن","العمد","العمر","العمق","العمل","العمه","العمي","العنا","العنب","العنف","العنق","العنه","العهد","العود","العون","العيب","العيد","العيش","العين","الغاز","الغام","الغبا","الغبي","الغجر","الغدا","الغدد","الغده","الغذا","الغرا","الغرب","الغرز","الغرض","الغرف","الغرق","الغزل","الغزو","الغسق","الغشا","الغصن","الغضب","الغطا","الغطس","الغنا","الغنم","الغني","الغوا","الغوص","الغول","الغيت","الغير","الفار","الفاس","الفان","الفاي","الفتح","الفتي","الفجر","الفجل","الفحص","الفحل","الفحم","الفخذ","الفخر","الفدا","الفرا","الفرج","الفرح","الفرخ","الفرد","الفرز","الفرس","الفرص","الفرع","الفرق","الفرن","الفرو","الفزع","الفشل","الفصح","الفصل","الفضا","الفضل","الفضه","الفضي","الفطر","الفعل","الفقر","الفكر","الفكه","الفلك","الفلم","الفنا","الفني","الفهد","الفهم","الفوج","الفور","الفوز","الفوق","الفول","الفيس","الفيل","الفين","الفيه","القاع","القاك","القبر","القبض","القبل","القبه","القبو","القتل","القدر","القدس","القدم","القذر","القذف","القرا","القرب","القرد","القرش","القرص","القرض","القرع","القرف","القرن","القري","القزم","القسم","القشه","القصد","القصر","القصص","القصف","القصه","القضا","القطب","القطر","القطط","القطع","القطن","القطه","القفز","القفص","القفل","القلب","القلق","القلم","القله","القمح","القمر","القمع","القمل","القمه","القنب","القوا","القوس","القول","القوم","القوه","القوي","القيت","القيد","القيل","القيم","الكاس","الكبد","الكبر","الكتب","الكتف","الكتل","الكثر","الكذب","الكرز","الكرم","الكره","الكسر","الكسل","الكشف","الكشك","الكعب","الكعك","الكلب","الكلي","الكنز","الكهف","الكوب","الكوخ","الكود","الكوك","الكون","الكيس","الكيك","الكيل","اللبس","اللبن","اللتي","اللثه","اللجو","اللحم","اللحن","اللذي","اللطف","اللعب","اللغز","اللغم","اللغه","اللفت","اللفه","اللقا","اللقب","اللمس","اللهب","اللهو","اللهي","اللوا","اللوح","اللوز","اللوم","اللون","الليل","الليه","الماس","المال","المان","المثل","المجد","المجي","المحب","المحك","المحل","المدن","المده","المدي","المرج","المرح","المرض","المرق","المره","المزح","المسا","المسح","المسخ","المسك","المسن","المسه","المشع","المشي","المصل","المضي","المطر","المقر","المقص","الملا","الملح","الملف","الملك","الملل","الملي","الممر","الممل","المنح","المني","المهد","المهر","المهم","الموت","الموز","الموس","المول","المون","الميت","الميث","الميل","الميه","النار","الناس","الناي","النبا","النبض","النبي","النتن","النجم","النحت","النحس","النحل","النحو","النخب","الندا","الندم","النذل","النرد","النزف","النزل","النسا","النسب","النسخ","النسر","النسل","النشر","النصب","النصر","النصف","النصل","النضج","النطق","النظر","النظم","النعش","النفخ","النفس","النفط","النفع","النفق","النقا","النقد","النقر","النقش","النقص","النقل","النقي","النكت","النمر","النمط","النمل","النمو","النهج","النهر","النور","النوع","النوم","النيل","النين","النيه","الهام","الهبه","الهدر","الهدف","الهدو","الهذا","الهرا","الهرب","الهرم","الهضم","الهلع","الهمج","الهمس","الهنا","الهند","الهوا","الهوت","الهوس","الهوي","الهيب","الواح","الوان","الواي","الوبا","الوتد","الوتر","الوجه","الوحش","الوحل","الوخز","الورا","الورد","الورق","الورك","الورم","الوزن","الوسخ","الوسط","الوشم","الوصف","الوصل","الوصي","الوضع","الوطن","الوعا","الوعد","الوعي","الوغد","الوفا","الوقت","الوقح","الوقع","الولا","الولد","الومك","الومه","الوهج","الوهم","الويب","الياس","الياف","اليخت","اليزا","اليسا","اليست","اليشا","اليفه","اليكس","اليكم","اليكي","اليله","اليمن","الينا","اليها","اليهم","اليوت","اليوم","امارا","امارس","اماكن","امالك","امالي","امامك","امامه","امامي","امانا","امانع","امانه","اماني","امبير","امتار","امتعه","امتلك","امتنا","امثال","امراض","امران","امراه","امرتك","امركم","امرنا","امرني","امرها","امرهم","امرين","امساك","امسكت","امسكه","امسكي","امسيه","امضيت","امطار","امطرت","امكنك","امكنه","املاك","املكه","املنا","املين","امممم","امنحك","امنحه","امنعك","امنوا","امنون","امنين","امنيه","امهات","اموات","امواج","اموال","امورا","امورك","اموري","اميال","اميره","اميري","اميلي","امينه","انادي","اناسا","اناقش","اناقه","اناني","انبطح","انبوب","انتاج","انتبه","انتجت","انتحر","انتزع","انتشر","انتصر","انتظر","انتقل","انتقم","انتما","انتمي","انتها","انتهت","انتهي","انتون","انجاب","انجاح","انجاز","انجبت","انجزت","انجلس","انجلو","انجيل","انحني","انخفض","اندرس","اندرو","اندري","انذار","انذاك","انزال","انزعج","انزعي","انزلق","انزله","انزلي","انسات","انساك","انسان","انساه","انستي","انسجه","انسحب","انسوا","انسيت","انشات","انشطه","انصار","انصتي","انصحك","انصرف","انضمت","انضمي","انطلق","انطون","انظار","انظرا","انظرن","انظرو","انظري","انظمه","انعاش","انعطف","انفاس","انفاق","انفجر","انفصل","انفقت","انفها","انقاذ","انقذت","انقذك","انقذه","انقضت","انقضي","انقطع","انقلب","انكار","انكسر","انكما","انماط","انهار","انهضي","انهما","انهوا","انهيت","انهيه","انوار","انواع","انياب","انيتا","انيقا","انيقه","انيكا","اهالي","اهانه","اهتمي","اهدار","اهداف","اهداي","اهدرت","اهديي","اهربي","اهزمك","اهكذا","اهلها","اهليه","اهمال","اهملت","اهميه","اهناك","اهنيك","اواثق","اواجه","اواخر","اواصل","اواعد","اوافق","اوامر","اوايل","اوبرا","اوبري","اوتار","اوتيس","اوجدت","اودري","اوديت","اوديل","اودين","اوذيك","اوراق","اورام","اوراي","اوربا","اورسن","اورين","اوستن","اوشام","اوشكت","اوصاف","اوصلت","اوصلك","اوصله","اوضاع","اوضحت","اوعدك","اوعيه","اوغاد","اوغست","اوقات","اوقعت","اوقفت","اوقفك","اوقفه","اوقفي","اولاد","اولاف","اولسن","اوليا","اوليس","اوليغ","اوليف","اوليك","اوليه","اونيل","اوهام","اوهاي","اوووه","اوينز","ايادي","اياما","ايامك","ايامه","ايامي","اياها","اياهم","ايبدو","ايتام","ايتها","ايثان","ايثيل","ايجاد","ايجار","ايجدر","ايداع","ايديث","ايديك","ايدين","ايديي","ايذاك","ايران","ايرني","ايرون","ايريد","ايريس","ايريك","ايرين","ايزاك","ايزرا","ايستر","ايصال","ايعرف","ايعلم","ايعني","ايغان","ايغور","ايفان","ايفري","ايفون","ايقاظ","ايقاع","ايقاف","ايلاي","ايلند","ايلول","ايليا","ايليس","ايلين","ايمان","ايمكن","ايملي","ايميت","ايميل","اينزو","اينما","ايهاب","ايهما","ايوجد","ايولس","باانك","باانه","بابقا","بابلو","بابنا","بابني","بابها","بابيك","باتسي","باتلر","باتون","باتيل","باجرا","باحثا","باحثه","باحدي","باحسن","باختك","باختي","باخذه","باخري","باخفا","باخلا","باخيك","باداه","بادره","باراك","باربر","باربع","باربي","باردا","بارده","بارزه","بارعا","بارعه","باركر","باركس","باركك","بارلو","بارنز","بارني","بارود","بارون","باريت","باريس","باريش","بازلا","بازمه","باستا","باستر","باسرع","باسره","باسفل","باسما","باسمك","باسمه","باسمي","باسوا","باشعه","باشيا","باعطا","باعلي","باعها","باعوا","بافري","بافضل","باقرب","باقصي","باقيه","باكبر","باكثر","باكرا","باكلي","باكيت","بالاس","بالبد","بالتر","بالجز","بالحب","بالحر","بالحظ","بالحي","بالخط","بالدف","بالدم","بالذي","بالرب","بالرد","بالزي","بالسر","بالسن","بالسو","بالشر","بالشك","بالشي","بالصف","بالضو","بالطب","بالعد","بالغا","بالغت","بالغد","بالغش","بالغه","بالفن","بالقا","بالكم","بالله","بالما","بالمخ","بالمر","بالون","باليد","باليه","بامان","بامبي","بامرك","بامره","بامري","بامور","باناس","باندا","باندي","بانشا","بانشي","بانكس","بانكم","بانكي","باننا","بانني","بانها","بانهم","باهظه","باورز","باولا","باولو","باوند","باوني","بايام","بايبر","بايدج","بايدي","بايذا","بايسا","بايسه","بايعه","بايكر","بايلي","باينز","ببالك","ببالي","ببضعه","ببعيد","ببقيه","ببيعه","بتاتا","بتتبع","بتحسن","بتصرف","بتعقب","بتغير","بتفقد","بتمعن","بتهمه","بتهور","بتولي","بثبات","بثلاث","بجانب","بجدول","بجديه","بجرعه","بجروح","بجسدك","بجسده","بجسدي","بجعله","بجلسه","بجمال","بجميع","بجنون","بجهاز","بجوار","بجوده","بجوله","بحاجه","بحادث","بحاله","بحانه","بحبها","بحثنا","بحثوا","بحدوث","بحدود","بحركه","بحريه","بحساب","بحضور","بحفله","بحقكم","بحكمه","بحلول","بحماس","بحمام","بحمله","بحوزه","بحياه","بحيره","بخارج","بخداع","بخدعه","بخدمه","بخصوص","بخطوه","بخلاف","بخمسه","بخيبه","بداتم","بداته","بداتي","بداخل","بداعي","بدافع","بدانا","بداوا","بدايل","بدايه","بدايي","بدخول","بدرجه","بدعوه","بدلات","بدلتك","بدلتي","بدليل","بدوار","بدوام","بدورك","بدوره","بدوري","بدونك","بدونه","بدوني","بدووا","بديعه","بديلا","بديله","بدينه","بديهي","بذاته","بذالك","بذكري","بذلنا","بذييه","براحه","برادا","برادو","برادي","براسك","براسه","براسي","براعم","براعه","براغي","برافو","برامج","برانت","براند","برانش","براون","برايت","برايد","برايس","برايك","برايم","براين","برايي","بربكم","برجال","برحله","برغبه","برفقه","برقصه","برقيه","بركان","بركوب","برلين","برمته","برمجه","برميل","برهان","بروان","بروتس","بروده","برودي","بروعه","بروفه","بروكس","برونو","برويه","بريان","بريتا","بريتي","بريجز","بريدا","بريدج","بريدك","بريده","بريدي","بريغز","برينا","برينت","برينر","برينس","برييا","برييس","برييه","بزمام","بزواج","بزوجه","بزوجي","بساطه","بساعه","بسباق","بسببك","بسببه","بسببي","بستان","بسرعه","بسرقه","بسرور","بسريه","بسكته","بسكين","بسلاح","بسلام","بسماع","بسوال","بسيطا","بسيطه","بشارع","بشانك","بشانه","بشاني","بشبكه","بشجره","بشراب","بشرتك","بشرته","بشرتي","بشرطه","بشركه","بشريا","بشريط","بشريه","بشعرك","بشعور","بشكلا","بشييا","بصباح","بصحبه","بصحتك","بصداع","بصدده","بصدمه","بصديق","بصريه","بصفتك","بصفته","بصفتي","بصفقه","بصمات","بصوره","بصيره","بصيغه","بضاعه","بضايع","بضربك","بضربه","بضربي","بطاطا","بطاطس","بطاقه","بطانه","بطبيب","بطردك","بطرده","بطردي","بطريق","بطلقه","بطلنا","بطنها","بطوله","بطولي","بطييا","بطييه","بظروف","بعالم","بعبور","بعتها","بعدما","بعدنا","بعدها","بعدهم","بعدوي","بعديذ","بعدين","بعشره","بعضكم","بعضنا","بعضها","بعضهم","بعضهن","بعطله","بعقلك","بعقله","بعقلي","بعلاج","بعمرك","بعمري","بعملك","بعمله","بعملي","بعوده","بعيار","بعيدا","بعيده","بعينك","بعينه","بعيني","بعيون","بغايه","بغداد","بغرفه","بغسيل","بغضون","بغموض","بغيضه","بفارغ","بفارق","بفتاه","بفتحه","بفتره","بفرصه","بفرقه","بفريق","بفضلك","بفعله","بفكره","بفندق","بفيلم","بقاتل","بقاعه","بقاله","بقايا","بقايك","بقايه","بقايي","بقبضه","بقبله","بقبول","بقتال","بقتلك","بقتله","بقتلي","بقدرك","بقدره","بقدري","بقدمك","بقدمي","بقدوم","بقرار","بقراه","بقربك","بقربه","بقربي","بقسوه","بقشيش","بقضيه","بقطعه","بقلبك","بقلبه","بقلبي","بقليل","بقولك","بقوله","بقولي","بقياس","بقيتي","بقيمه","بقينا","بكافه","بكامل","بكتاب","بكثره","بكثير","بكرات","بكفاه","بكلام","بكلتا","بكلمه","بكليه","بكميه","بكونك","بكونه","بكوني","بلادك","بلاده","بلادي","بلازا","بلاغا","بلاكي","بلانت","بلانش","بلانك","بلاير","بلايك","بلاين","بلحظه","بلدان","بلدتي","بلدنا","بلدها","بلديه","بلعبه","بلغنا","بلقاك","بلكنه","بلهجه","بلوتو","بلوحه","بلوزه","بليله","بليون","بماده","بماذا","بمازق","بمالك","بمامن","بمايه","بمبلغ","بمتجر","بمتعه","بمجال","بمجرد","بمجلس","بمحطه","بمركز","بمرور","بمزاج","بمزيد","بمسدس","بمسرح","بمضرب","بمطعم","بمظهر","بمعدل","بمعظم","بمعني","بمقتل","بمكان","بمكتب","بمنزل","بمهمه","بموته","بموجب","بموعد","بموقع","بموقف","بميات","بناتك","بناتي","بنادق","بنادي","بنايه","بنتلي","بنجاح","بنزهه","بنزين","بنسات","بنسبه","بنسخه","بنشاط","بنطال","بنظام","بنظرك","بنظره","بنظري","بنفسك","بنفسه","بنفسي","بنقطه","بنقله","بنكهه","بنوبه","بنيته","بنيتي","بنينا","بهاتف","بهاذا","بهجوم","بهكذا","بهولا","بهييه","بوابه","بواحد","بوارو","بوتشي","بوجبه","بوجهك","بوجهه","بوجهي","بوجود","بوحده","بودره","بودين","بورتر","بوردن","بورصه","بورطه","بوركت","بورما","بوروز","بوريس","بوسان","بوسطن","بوسعك","بوسعه","بوسعي","بوسكو","بوصات","بوصله","بوضعك","بوضعه","بوضوح","بوعدك","بوعده","بوعدي","بوفاه","بوفيه","بوقتك","بوقته","بوقتي","بولدر","بولوك","بوليس","بولين","بومان","بومبي","بويكا","بوينت","بيانا","بيانو","بياني","بيبسي","بيترا","بيترز","بيترو","بيتزا","بيتسي","بيتشر","بيتكم","بيتنا","بيتها","بيتهم","بيتون","بيدرو","بيدنا","بيدها","بيديك","بيديه","بيرتا","بيرتي","بيرجر","بيردي","بيرسي","بيرغر","بيرنز","بيرني","بيروت","بيرون","بيريز","بيشوب","بيضها","بيطري","بيعها","بيعهم","بيكون","بيكيت","بيلار","بيمان","بينجو","بينجي","بيندر","بينغو","بينكم","بينكي","بينما","بيننا","بينها","بينهم","بينيت","بيورن","بيومك","بيونغ","بيييه","تابعت","تابعه","تابعي","تابوت","تابين","تاتشر","تاتوا","تاتون","تاتيا","تاتيك","تاتين","تاثرت","تاثير","تاجرت","تاجير","تاجيل","تاخذك","تاخذه","تاخذي","تاخرت","تاخري","تاخير","تاديه","تاذيت","تاركا","تاريخ","تارين","تاسيس","تافها","تافهه","تاكدت","تاكدي","تاكسي","تاكله","تاكلي","تاكيد","تالفه","تالمت","تاليا","تاليف","تامبا","تامين","تانجو","تاندي","تانيا","تانيب","تاهيل","تاولر","تايتن","تايجر","تايغر","تايلا","تايلر","تايمز","تايها","تايهه","تاييد","تبادل","تبالغ","تبالي","تبتسم","تبتعد","تبتلع","تبحثي","تبداي","تبدوا","تبدون","تبديل","تبدين","تبديي","تبرعت","تبريد","تبرير","تبريه","تبعته","تبقوا","تبقون","تبقين","تبقيه","تبكين","تبلغي","تبلين","تبولت","تبيعه","تتابع","تتاثر","تتاجر","تتاخر","تتاذي","تتاسف","تتاكد","تتالم","تتبرع","تتبعت","تتبعك","تتبعه","تتبعي","تتبول","تتجرا","تتجسس","تتجمد","تتجمع","تتجنب","تتجول","تتحدث","تتحدي","تتحرك","تتحسن","تتحطم","تتحقق","تتحكم","تتحلي","تتحمس","تتحمل","تتحول","تتخذي","تتخطي","تتخلص","تتخلي","تتخيل","تتدبر","تتدخل","تتدرب","تتدفق","تتدلي","تتذكر","تتذمر","تتذوق","تترجم","تتردد","تتركك","تتركه","تتركي","تتزوج","تتسال","تتسبب","تتسرب","تتسرع","تتسكع","تتسلق","تتسلل","تتسني","تتسوق","تتشكل","تتصرف","تتصلي","تتصور","تتضمن","تتطلب","تتطلع","تتطور","تتعبي","تتعثر","تتعدي","تتعرض","تتعرف","تتعرق","تتعطل","تتعفن","تتعقب","تتعلق","تتعلم","تتغذي","تتغلب","تتغوط","تتغير","تتفتح","تتفقد","تتفهم","تتفوق","تتفوه","تتقبل","تتقدم","تتقيا","تتكرر","تتكلم","تتكون","تتلقي","تتمتع","تتمدد","تتمرن","تتمسك","تتمشي","تتمكن","تتمني","تتنحي","تتنفس","تتنقل","تتنهد","تتهرب","تتوتر","تتوجه","تتورط","تتوسل","تتوفر","تتوقع","تتوقف","تتولي","تتوهج","تتويج","تثبتي","تثبيت","تثرثر","تثقوا","تثقين","تجادل","تجارب","تجاره","تجاري","تجاهك","تجاهل","تجاهه","تجاهي","تجاوب","تجاوز","تجتاز","تجتمع","تجدنا","تجدني","تجدها","تجدهم","تجدوا","تجدون","تجديد","تجدين","تجديه","تجرات","تجربه","تجربي","تجروي","تجريب","تجرين","تجسيد","تجعلك","تجعله","تجعلي","تجلبه","تجلبي","تجلسي","تجمدت","تجميد","تجميع","تجميل","تجنبه","تجنيد","تجهيز","تجولت","تجويف","تجيبي","تحارب","تحافظ","تحالف","تحاول","تحبان","تحبني","تحبها","تحبهم","تحبون","تحبين","تحبيه","تحتاج","تحتجز","تحترق","تحترم","تحتسب","تحتسي","تحتضر","تحتفظ","تحتفل","تحتمل","تحتنا","تحتها","تحتوي","تحدثا","تحدثت","تحدثي","تحديا","تحديث","تحديد","تحذير","تحررت","تحركا","تحركت","تحركو","تحركي","تحرير","تحريك","تحسبا","تحسنت","تحسين","تحصلت","تحصلي","تحصيل","تحضره","تحضري","تحضير","تحطمت","تحطيم","تحظين","تحفيز","تحققت","تحققي","تحقيق","تحكمي","تحليل","تحليه","تحمست","تحملت","تحمله","تحملي","تحميل","تحميه","تحولت","تحويل","تحيات","تخادع","تخاطب","تخاطر","تخافي","تخالف","تخبرك","تخبره","تخبري","تختار","تختبر","تختبي","تخترق","تختفي","تختلط","تختلف","تختلق","تختنق","تخجلي","تخدير","تخرجت","تخرجك","تخرجه","تخرجي","تخريب","تخزين","تخسري","تخشاه","تخشين","تخصصك","تخصصي","تخصني","تخصيص","تخطيت","تخطيط","تخفيض","تخفيف","تخفين","تخفيه","تخلصت","تخلصي","تخلوا","تخليت","تخمين","تخويف","تخيلت","تخيله","تخيلي","تخييم","تداخل","تدافع","تدبرت","تدبير","تدحرج","تدخلت","تدخلي","تدخين","تدربت","تدركي","تدريب","تدريس","تدرين","تدعنا","تدعني","تدعها","تدعهم","تدعوا","تدعوه","تدعين","تدعيه","تدفعه","تدفعي","تدفيه","تدقيق","تدليك","تدمرت","تدمير","تدنيس","تدهور","تدوير","تدوين","تذاكر","تذكار","تذكرت","تذكرك","تذكره","تذكري","تذكير","تذهبا","تذهبي","تذوقت","تذوقه","ترابط","تراجع","تراسي","ترافس","ترافق","تراقب","تراكم","ترامب","ترانا","تراني","تراها","تراهم","تراهن","تربطه","تربيت","تربيه","ترتاح","ترتبط","ترتجف","ترتدي","ترتعش","ترتفع","ترتكب","ترتيب","ترجعي","ترجمه","ترحلي","ترحيب","ترحيل","ترخيص","ترددت","تردين","ترسله","ترسلي","ترشيح","ترعرع","ترغبي","ترفضي","ترفعي","ترفيه","ترقصي","ترقيه","تركتك","تركته","تركتي","تركزي","تركنا","تركني","تركها","تركهم","تركوا","تركوه","تركيا","تركيب","تركيز","ترميم","ترمين","ترهات","ترودي","ترونه","ترياق","تريان","تريدك","تريدن","تريده","تريدي","تريزا","تريسي","تريشا","ترينا","ترينت","ترينه","تريني","تريها","تريهم","تزايد","تزداد","تزدهر","تزعجك","تزعجي","تزوجا","تزوجت","تزويد","تزوير","تزييف","تزيين","تسارع","تساعد","تسافر","تساقط","تسالت","تساله","تسالي","تسامح","تساول","تساوي","تسببت","تستحق","تستحم","تستخف","تستطع","تستعد","تستغل","تستقر","تستقل","تستلم","تستمر","تستمع","تستند","تسجيل","تسحبه","تسخير","تسخين","تسديد","تسربت","تسرعي","تسرني","تسريب","تسريح","تسريع","تسطيع","تسعون","تسعين","تسلسل","تسلقت","تسللت","تسليط","تسليم","تسليه","تسمحي","تسمعه","تسمعي","تسميم","تسمين","تسميه","تسهيل","تسويق","تسويه","تسيطر","تسييي","تشابل","تشابه","تشابي","تشاجر","تشارك","تشاكي","تشانج","تشانس","تشانغ","تشاهد","تشايس","تشبثي","تشبهك","تشبهه","تشبيه","تشتاق","تشتبه","تشترك","تشتري","تشتعل","تشتغل","تشتكي","تشتيت","تشجيع","تشخيص","تشربه","تشربي","تشرحي","تشرشل","تشرفت","تشريح","تشرين","تشستر","تشعرك","تشعري","تشغلي","تشغيل","تشفير","تشكيل","تشكين","تشونغ","تشويش","تشويه","تشيري","تشيلي","تشينج","تشينغ","تشينو","تشيني","تصابي","تصادف","تصادم","تصارع","تصاعد","تصبحي","تصحيح","تصدقه","تصدقي","تصديق","تصرخي","تصرفا","تصرفت","تصرفك","تصرفه","تصرفي","تصريح","تصريف","تصطاد","تصطدم","تصعدي","تصعيد","تصغين","تصفيف","تصفيق","تصفيه","تصلنا","تصلني","تصلوا","تصليح","تصلين","تصميم","تصنعه","تصنعي","تصنيع","تصنيف","تصورت","تصوره","تصوري","تصويب","تصويت","تصوير","تصيبك","تضاجع","تضارب","تضاعف","تضايق","تضحكي","تضحيه","تضربه","تضررت","تضطري","تضعني","تضعها","تضعهم","تضعوا","تضعين","تضعيه","تضغطي","تضليل","تضيعي","تضييع","تضييق","تطابق","تطارد","تطالب","تطبيق","تطلبه","تطلبي","تطلقت","تطلقي","تطهير","تطورا","تطورت","تطوعت","تطوير","تظاهر","تظنان","تظنني","تظنها","تظنون","تظنين","تظهري","تعادل","تعارض","تعازي","تعاشر","تعاطف","تعاطي","تعافي","تعاقب","تعالا","تعالج","تعالو","تعالي","تعامل","تعاني","تعاود","تعاون","تعبثي","تعبير","تعبيه","تعتاد","تعتبر","تعتذر","تعترض","تعترف","تعتزم","تعتقد","تعتقل","تعتمد","تعتني","تعثرت","تعثري","تعجبك","تعجبه","تعداد","تعدني","تعديت","تعديل","تعدين","تعذيب","تعرضت","تعرضه","تعرضي","تعرفا","تعرفت","تعرفك","تعرفن","تعرفه","تعرفي","تعريض","تعريف","تعزيز","تعطلت","تعطني","تعطيك","تعطيل","تعطين","تعطيه","تعقبت","تعقبه","تعقيد","تعلقت","تعلمت","تعلمك","تعلمه","تعلمي","تعليق","تعليم","تعمدت","تعمله","تعملي","تعميم","تعنين","تعنيه","تعهدت","تعودا","تعودت","تعودي","تعويض","تعيده","تعيدي","تعيسا","تعيسه","تعيشي","تعيين","تغادر","تغازل","تغذيه","تغضبي","تغطيه","تغلبت","تغلقي","تغليف","تغنين","تغيبت","تغيرت","تغيري","تغيير","تفاحه","تفادي","تفاعل","تفاهم","تفاهه","تفاوض","تفتحه","تفتحي","تفترض","تفتقد","تفتقر","تفتيش","تفجير","تفحصت","تفحصي","تفريغ","تفريق","تفزعي","تفسدي","تفسير","تفصيل","تفضلا","تفضلت","تفضله","تفضلي","تفعلا","تفعله","تفعلي","تفعيل","تفقدت","تفقده","تفقدي","تفكري","تفكير","تفكيك","تفهمت","تفهمه","تفهمي","تفوزي","تفوقت","تفويت","تفويض","تقابل","تقاتل","تقارب","تقارن","تقاسم","تقاطع","تقاعد","تقامر","تقاوم","تقبلت","تقبله","تقبلي","تقبيل","تقتحم","تقترب","تقترح","تقترف","تقتلك","تقتله","تقتلي","تقدري","تقدما","تقدمت","تقدمك","تقدمه","تقدمي","تقدير","تقديم","تقراه","تقراي","تقرري","تقريب","تقرير","تقسيم","تقصده","تقصدي","تقضون","تقضين","تقطعي","تقطيع","تقعين","تقفزي","تقفوا","تقفون","تقفين","تقلقا","تقلقي","تقلني","تقلها","تقليد","تقليص","تقليل","تقنيا","تقنيه","تقودك","تقودي","تقوله","تقولي","تقوما","تقومي","تقويم","تقويه","تقيات","تقيمي","تقييد","تقييم","تكافح","تكبير","تكتبه","تكتبي","تكترث","تكتسب","تكتشف","تكتفي","تكتمل","تكتيك","تكذبي","تكرار","تكرهك","تكرهه","تكريم","تكساس","تكسير","تكفلت","تكلفه","تكلمت","تكلمي","تكليف","تكملي","تكونا","تكونت","تكونه","تكونو","تكوني","تكوين","تكيلا","تكييف","تلاحظ","تلاحق","تلاشت","تلاشي","تلاعب","تلامس","تلايم","تلبسه","تلبسي","تلبيه","تلتحق","تلتزم","تلتصق","تلتفت","تلتقط","تلتقي","تلتهم","تلتيم","تلعبي","تلفاز","تلفيق","تلقوا","تلقيت","تلقين","تلمسه","تلمسي","تلميح","تلميذ","تلميع","تلومي","تليها","تمارا","تمارس","تماسك","تمالك","تماما","تمانع","تمانه","تمتعت","تمتعي","تمتلك","تمتلي","تمثال","تمثيل","تمديد","تمرير","تمرين","تمزحي","تمزقت","تمزيق","تمساح","تمسكه","تمسكي","تمشيط","تمشين","تمضين","تمضيه","تمكنا","تمكنت","تمكنك","تملكه","تمنحك","تمنحه","تمنيت","تمهلي","تموتي","تمويل","تمويه","تميمه","تمييز","تنادي","تنازل","تناسب","تناغم","تنافس","تناقش","تناقض","تنامي","تناول","تنبات","تنبعث","تنبيه","تنتبه","تنتحر","تنتشر","تنتصر","تنتظر","تنتقل","تنتقم","تنتمي","تنتهك","تنتهي","تنجحي","تنجذب","تنحدر","تنحرف","تنحني","تنحوا","تنخفض","تندفع","تندمج","تندمي","تنزعج","تنزلق","تنزلي","تنساه","تنسحب","تنسوا","تنسيق","تنسين","تنشيط","تنصتي","تنصرف","تنصيب","تنضمي","تنطبق","تنطلق","تنطوي","تنظري","تنظيف","تنظيم","تنفتح","تنفجر","تنفسك","تنفسي","تنفصل","تنفيذ","تنقطع","تنقلب","تنقيه","تنكري","تنكسر","تنهار","تنوره","تنوين","تهاجم","تهاني","تهتمي","تهجيه","تهداي","تهديد","تهديه","تهديي","تهربي","تهريب","تهمني","تهنيه","تهويه","توابل","تواجد","تواجه","توازن","تواصل","تواضع","تواعد","توافق","توايم","توباك","توبيخ","توثيق","توجهت","توجهي","توجيه","توحيد","تودون","توديع","تودين","توذني","توذيه","تورتل","تورطت","توروس","توريز","توريس","توريط","توزيع","توسلت","توسيع","توصلت","توصيل","توصيه","توضيح","توظيف","توفيا","توفيت","توفير","توقعت","توقعه","توقعي","توقفا","توقفت","توقفن","توقفه","توقفو","توقفي","توقيت","توقيع","توقيف","توكيل","تولسا","تولمك","توليت","توليد","توماس","تومني","تونيا","تويتر","تيانا","تيتان","تيتوس","تيرنر","تيرنس","تيريل","تيسلا","تيلور","تيمبل","تيمنا","تينكر","ثابتا","ثابته","ثاقبه","ثالثا","ثالثه","ثانوي","ثانيا","ثانيه","ثدييك","ثرثار","ثرثره","ثروات","ثروتك","ثروته","ثروتي","ثعبان","ثقافه","ثقتنا","ثقتها","ثقتهم","ثقيلا","ثقيله","ثلاثا","ثلاثه","ثلاثي","ثلاجه","ثلجيه","ثماني","ثملين","ثمنها","ثمينه","ثنايي","ثواني","ثيابا","ثيابك","ثيابه","ثيابي","ثيران","ثيلما","جاتني","جادون","جادين","جارتك","جارتي","جارزا","جارنا","جاريت","جاريد","جاريه","جاسبر","جاستن","جاسوس","جاسون","جاشوا","جافين","جاكسن","جاكوب","جاكيت","جالسا","جالسه","جالوت","جالون","جامحه","جامعه","جامعي","جانبا","جانبك","جانبه","جانبي","جانيت","جانيس","جانين","جاهدا","جاهده","جاهزا","جاهزه","جاهله","جاووا","جايتس","جايزه","جايسن","جايعا","جايعه","جايلز","جايمس","جايمي","جايني","جايوا","جايوس","جبانا","جبانه","جبريل","جبهتك","جبهته","جثتها","جثتين","جثثهم","جثمان","جحيما","جداول","جدتها","جدران","جدولك","جدوله","جدولي","جديدا","جديده","جديرا","جديره","جذابا","جذابه","جراحه","جراحي","جرانت","جراند","جرايس","جرايم","جربته","جربنا","جربني","جربها","جربوا","جربيه","جرحتك","جرذان","جرعات","جروحك","جريتا","جريده","جريفن","جريمه","جرييه","جزيره","جزيلا","جزييا","جزييه","جستين","جسدها","جسديا","جسديه","جسمها","جسيكا","جعلتك","جعلته","جعلتي","جعلنا","جعلني","جعلها","جعلهم","جعلوا","جعلوك","جعلوه","جلاله","جلبتك","جلبته","جلبتي","جلبنا","جلبها","جلبوا","جلدها","جلديه","جلسات","جلسنا","جلوسك","جلوسي","جليدي","جليسه","جماعه","جماعي","جمالا","جمالك","جمجمه","جمعنا","جمعها","جمعيه","جمهور","جميعا","جميلا","جميله","جناحي","جنازه","جنايه","جنايي","جنديا","جنديه","جنرال","جنسنا","جنسيا","جنسيه","جنكيز","جنوبا","جنوبي","جنودا","جنودك","جنوده","جنودي","جنونا","جنونك","جنونه","جنوني","جنيفر","جنيها","جهازك","جهازه","جهازي","جهدنا","جهزوا","جهودك","جوابا","جوابك","جوابي","جوارب","جوانا","جوانب","جواهر","جوايز","جوبال","جوثام","جوديث","جورجي","جوردن","جوردي","جوزيف","جوستن","جوسون","جوشوا","جوفري","جولات","جولدن","جوليا","جوليت","جولين","جوليو","جوميز","جوناس","جوناه","جونسن","جوهره","جيتار","جيثرو","جيدان","جيداي","جيدون","جيدين","جيران","جيرسي","جيركو","جيرمي","جيروم","جيزيل","جيسكا","جيسون","جيشنا","جيفري","جيكوب","جيمبو","جينات","جينجر","جينسن","جينفر","جينكس","جينيا","جينين","جيوبك","جيوبه","جيونغ","حاجات","حاجتك","حاجته","حاجتي","حادثا","حادثه","حاذري","حاربت","حارسا","حارسك","حارسه","حارسي","حارقه","حاسمه","حاسوب","حاضرا","حاضره","حاضنه","حافظت","حافظه","حافظي","حافلا","حافله","حالات","حالتك","حالته","حالتي","حالفك","حالكم","حالما","حالنا","حالها","حالهم","حاليا","حاملا","حامله","حاملي","حاميه","حانات","حانتي","حاولا","حاولت","حاولو","حاولي","حاويه","حايره","حبيبك","حبيبه","حبيبي","حبيسه","حتفها","حتفهم","حتميه","حثاله","حجاره","حجرتك","حجرتي","حجزنا","حجمها","حدايق","حدثتك","حدثني","حددنا","حددوا","حدوثه","حدودك","حدوده","حدودي","حديثا","حديثك","حديثه","حديثي","حديدي","حديقه","حذاري","حذايك","حذايه","حذايي","حذرتك","حذرني","حذرين","حراره","حراري","حراسه","حرايق","حربنا","حربيه","حررني","حرفيا","حرقها","حركات","حركتك","حركته","حركتي","حريتك","حريته","حريتي","حريصا","حريصه","حزامك","حزامي","حزينا","حزينه","حسابا","حسابك","حسابه","حسابي","حساسا","حساسه","حسبتك","حسبما","حسننا","حشرات","حصانا","حصانك","حصانه","حصاني","حصريا","حصريه","حصلتم","حصلتي","حصلنا","حصلوا","حصولك","حصوله","حصولي","حضاره","حضانه","حضرتك","حضرنا","حضروا","حضورك","حضوره","حضوري","حطموا","حظيره","حظينا","حفظها","حفلات","حفلتك","حفلتي","حفيدك","حفيده","حفيدي","حقايب","حقايق","حققته","حققنا","حقوقك","حقوقه","حقوقي","حقيبه","حقيرا","حقيره","حقيقا","حقيقه","حقيقي","حكايه","حكمنا","حكومه","حكومي","حكيما","حكيمه","حلاقه","حلاوه","حلقات","حلقها","حللنا","حلمات","حلمنا","حلمها","حلوتي","حماتي","حماسك","حماسه","حماسي","حماقه","حماله","حماما","حمامك","حمامه","حمامي","حمايه","حملتك","حملته","حملتي","حملها","حمودي","حموله","حميمه","حنجره","حواجز","حوادث","حوالي","حوريه","حولكم","حولنا","حولها","حولهم","حياتك","حياته","حياتي","حيازه","حيالك","حياله","حيالي","حيتان","حيثما","حينما","حينها","حينيذ","حيوات","حيوان","حيويه","خاتما","خاتمك","خاتمه","خاتمي","خادعه","خادما","خادمك","خادمه","خادمي","خارجا","خارجه","خارجي","خارطه","خارقا","خارقه","خاسره","خاصتك","خاصته","خاصتي","خاصيه","خاضعه","خاطرت","خاطرك","خاطري","خاطفه","خاطيا","خاطيه","خالتك","خالتي","خالده","خالفت","خاليا","خاليه","خاننا","خانني","خاويه","خايبه","خايفا","خايفه","خاينا","خاينه","خبرتك","خبرتي","خبيثه","خبيرا","خبيره","خجلان","خجولا","خجوله","خداعك","خداعه","خداعي","خدعتك","خدعته","خدعنا","خدعني","خدمات","خدمتك","خدمته","خدمتي","خذلتك","خذوني","خذوها","خذوهم","خذيني","خذيها","خرافه","خرايط","خرجتم","خرجتي","خرجنا","خرجوا","خرطوم","خروجك","خروجه","خروجي","خريطه","خزانه","خزاين","خزينه","خساره","خساير","خسرته","خسرنا","خسروا","خشبيه","خصايص","خصوصا","خصيتي","خصيصا","خطابا","خطابك","خطابه","خطابي","خطانا","خطاها","خطايا","خطبكم","خطبها","خطتنا","خطتها","خطتهم","خطرون","خطرين","خططنا","خططوا","خطفها","خطفوا","خطوات","خطوبه","خطوتك","خطوره","خطيبك","خطيبه","خطيبي","خطيرا","خطيره","خطييه","خفيفا","خفيفه","خلاصه","خلافا","خلالك","خلاله","خلالي","خلايا","خلفكم","خلفنا","خلفها","خلفهم","خلفيه","خلقنا","خلويه","خليفه","خليلك","خليله","خليلي","خمسون","خمسين","خمنوا","خنتني","خنزير","خنفسا","خواتم","خوادم","خوذتك","خورخي","خوزيه","خوسيه","خوليو","خيارا","خيارك","خياري","خياطه","خيالك","خيالي","خيانه","خيريه","داخلك","داخله","داخلي","دادلي","داربي","دارسي","داركن","دارلا","دارما","دارون","داريس","داريل","دارين","داريو","داستن","داستي","داعمه","دافعا","دافعت","دافعي","دافني","دافيا","دافيد","دافيس","دافيه","داكنه","دالاس","داليا","داليك","دامغه","دامون","دامين","داميه","دانتي","دانكن","دانيل","داهيه","داوني","دايان","دايره","دايري","دايزي","دايفد","دايفس","دايلي","دايما","دايمن","دايمه","داينا","دبابه","دبليو","دجاجه","دخلتم","دخلتي","دخلنا","دخلوا","دخولك","دخوله","دخولي","دراجه","دراسه","دراسي","دراما","درامي","درايف","درايك","درايه","درجات","دردشه","درسنا","دروسا","دزينه","دستور","دعابه","دعاره","دعامه","دعانا","دعاني","دعايه","دعتني","دعمكم","دعمنا","دعوات","دعوتك","دعوته","دعوتي","دعونا","دعوني","دعوها","دعوهم","دعينا","دعيني","دعيها","دعيهم","دفاتر","دفاعا","دفاعك","دفاعي","دفعات","دفعتك","دفعته","دفعتي","دفعنا","دفعني","دفعها","دفعوا","دفنها","دقايق","دقيقا","دقيقه","دكتور","دكستر","دلاله","دلايل","دليلا","دليلك","دماغك","دماغه","دماغي","دمايك","دمايه","دمايي","دمرنا","دمروا","دموعك","دموعي","دمويه","دميتي","دنبار","دنكان","دواسه","دواعي","دوافع","دوامه","دوايت","دواير","دوايك","دواين","دوايي","دوجيت","دورات","دوران","دورتي","دورثي","دوركم","دورنا","دورها","دوريت","دوريس","دورين","دوريه","دوسون","دوفال","دولاب","دولار","دولان","دوليه","دونات","دونام","دونلي","دونما","دونها","ديارك","دياري","ديانا","ديانه","ديبرا","ديدان","ديريك","ديزني","ديسكو","ديفرو","ديفون","ديفيا","ديفيد","ديفيز","ديفيس","ديفين","ديكسن","ديكنز","ديكور","ديكون","ديلان","ديلون","ديليا","ديلين","ديمبي","ديمون","دينار","دينفر","ديننا","دينيس","دينيه","ديونك","ديونه","ديوني","دييجو","دييغو","ذاتها","ذاتيا","ذاتيه","ذاكره","ذاهبا","ذاهبه","ذبابه","ذخيره","ذراعك","ذراعه","ذراعي","ذريعه","ذكايك","ذكايي","ذكراه","ذكرته","ذكرتي","ذكرني","ذكرها","ذكروا","ذنبها","ذنوبي","ذهابا","ذهابك","ذهابه","ذهابي","ذهبتم","ذهبتي","ذهبنا","ذهبوا","ذهبيه","ذهنيا","ذهنيه","ذوبان","رابحه","رابطه","رابيت","راتبك","راتبه","راتبي","راتني","راتها","راجعت","راجنر","راجيف","راحتك","راحتي","راحله","رادار","رادلي","رادها","راديو","راستي","راسها","راسيل","راشده","راشيل","راضيا","راضيه","راعيه","راغبا","راغبه","رافعه","راقبت","راقبه","راقبي","راقصه","راقيه","راكبي","راكون","راكيل","رالفي","رامبل","رامبو","رامزي","راموس","رامون","راندل","راندي","رانشو","رانكل","راهبه","راهنت","راهول","راونا","راوول","رايان","رايتك","رايتم","رايته","رايتي","رايحه","رايدر","رايدن","رايده","رايعا","رايعه","رايفن","رايكم","رايلي","راينا","راينر","رايها","رايهم","رباطه","رباعي","ربحنا","ربطات","ربطها","ربيكا","رتبتك","رتبنا","رجالا","رجالك","رجاله","رجالي","رجايا","رجعنا","رجلان","رجلنا","رجلها","رجليك","رجلين","رجليه","رجولي","رحبوا","رحلات","رحلتك","رحلته","رحلتي","رحلنا","رحلوا","رحمتك","رحمها","رحيلك","رحيله","رحيلي","رحيما","رحيمه","رخصتك","رخصتي","رخيصا","رخيصه","ردايي","ردييه","رساله","رسايل","رسمها","رسميا","رسميه","رشيقه","رصاصه","رضاكم","رضيعه","رعايه","رغبات","رغبتك","رغبته","رغبتي","رفاقك","رفاقه","رفاقي","رفضته","رفضنا","رفضها","رفضوا","رفعها","رفيعه","رفيقك","رفيقه","رفيقي","رقابه","رقاقه","رقايق","رقبتك","رقبته","رقبتي","رقصات","رقصنا","رقمها","رقميه","رقيقا","رقيقه","ركبتك","ركبته","ركبتي","ركبنا","ركزوا","رمادي","رمزيه","رمضان","رمليه","رميته","رميها","رهانا","رهانك","رهاين","رهيبا","رهيبه","رهينه","روابط","رواتب","رواسب","روايح","روايه","روبرت","روبنز","روبوت","روبين","روبيه","روتين","روجرز","روحها","روحيه","رودني","روزلي","روزين","روستي","روسكو","روسيا","روسيل","روسيه","روشيل","روفوس","روكسي","روكيت","رومان","رومني","روميو","روندا","روهان","روهيت","رويال","رويتك","رويته","رويتي","رويدا","رويدك","روينا","رياسه","رياضه","رياضي","ريبلي","ريتشل","ريتشي","ريتيك","ريتيه","ريثما","ريجان","ريديك","ريستي","ريسلر","ريغان","ريفرز","ريفير","ريفين","ريفيه","ريلين","ريمون","رينيه","رييسا","رييسك","رييسه","رييسي","زاكري","زالوا","زاندر","زاويه","زايده","زايفه","زبادي","زباين","زبونا","زبونه","زبوني","زجاجه","زجاجي","زراعه","زفافك","زفافه","زفافي","زلزال","زمنيه","زميلك","زميله","زميلي","زهريه","زهورا","زواجا","زواجك","زواجه","زواجي","زوايا","زوجات","زوجان","زوجتك","زوجته","زوجتي","زوجها","زوجين","زوجيه","زومبي","زويلا","زياده","زياره","زيتون","زيلدا","سابحث","سابدا","سابدو","سابذل","سابعث","سابقا","سابقه","سابقي","سابكي","سابلغ","سابني","سابيع","سابين","ساتبع","ساتجه","ساترك","ساتصل","ساتون","ساثبت","ساجدك","ساجده","ساجرب","ساجري","ساجعل","ساجلب","ساجلس","ساجمع","ساجهز","ساجيب","ساحات","ساحبك","ساحجز","ساحرا","ساحرص","ساحرق","ساحره","ساحصل","ساحضر","ساحطم","ساحظي","ساحقق","ساحقه","ساحمل","ساحمي","ساحول","ساخبر","ساخذك","ساخذه","ساخرج","ساخره","ساخسر","ساخلد","ساخلع","ساخنا","ساخنه","سادتي","سادخل","سادعك","سادعه","سادعو","سادفع","سادمر","ساذجا","ساذجه","ساذكر","ساذهب","ساراك","ساراه","سارتب","سارجع","سارحل","سارسل","سارغب","سارفض","سارفع","سارقص","سارقه","ساركب","ساركل","سارمي","ساريك","ساريه","ساسال","ساسحب","ساسرق","ساسعد","ساسقط","ساسكي","ساسلم","ساسمح","ساسمع","ساسير","ساشرب","ساشرح","ساشعر","ساشغل","ساصاب","ساصبح","ساصدق","ساصرخ","ساصعد","ساصلح","ساصنع","ساضرب","ساضطر","ساضعك","ساضعه","ساضيف","ساطبخ","ساطرح","ساطعه","ساطلب","ساطلق","ساطير","ساظهر","ساعات","ساعتك","ساعته","ساعتي","ساعثر","ساعدت","ساعدك","ساعده","ساعدي","ساعرض","ساعرف","ساعطي","ساعقد","ساعلم","ساعلن","ساعمل","ساعود","ساعيد","ساعيش","ساغطي","ساغلق","ساغني","ساغيب","ساغير","سافاج","سافتح","سافجر","سافحص","سافدج","سافرت","سافعل","سافقد","سافكر","سافله","سافوز","ساقاي","ساقبض","ساقبل","ساقتل","ساقدر","ساقدم","ساقرا","ساقرر","ساقضي","ساقطع","ساقطه","ساقفز","ساقلك","ساقها","ساقود","ساقول","ساقوم","ساقيك","ساقيم","ساقين","ساقيه","ساكتب","ساكذب","ساكره","ساكسر","ساكمل","ساكنا","ساكنه","ساكون","سالتك","سالته","سالحق","سالعب","سالغي","سالقي","سالما","سالمه","سالنا","سالني","سالوا","سامرز","سامسك","سامشي","سامضي","سامكث","ساموت","ساميه","سانال","سانام","سانتا","سانتو","سانتي","سانجح","سانجو","ساندس","ساندم","ساندي","سانزع","سانزل","سانسا","سانسي","سانشو","سانضم","سانظر","سانظف","سانقذ","سانقل","سانهي","ساهتم","ساهرب","ساهمت","ساوصل","ساوضح","ساوفر","ساوقع","ساوقف","سايان","سايدي","سايرس","سايقك","سايقه","سايقي","سايكس","سايلس","سايلم","سايمن","ساينت","سباحه","سبارو","سبايس","سبايك","سببته","سببها","سبحان","سبعون","سبعين","سبنسر","سبونج","سبيرز","سبيلا","سبيلك","سبيله","سبيلي","سبينس","ستابس","ستاتي","ستاخذ","ستارك","ستاره","ستاسي","ستاكل","ستاير","ستاين","ستبحث","ستبدا","ستبدو","ستبقي","ستبكي","ستبلغ","ستبيع","ستترك","ستتصل","ستثبت","ستجده","ستجري","ستجعل","ستجلب","ستجلس","ستجني","ستجيب","ستحبه","ستحدث","ستحصل","ستحضر","ستحظي","ستحقق","ستحمل","ستخبر","ستخرج","ستخسر","ستدخل","ستدرك","ستدفع","ستدمر","ستدوم","ستذهب","سترات","ستراه","ستربح","سترتك","سترته","سترتي","سترجع","سترحل","سترسل","سترغب","ستركب","سترون","ستريت","ستريد","سترين","ستزول","ستزيد","ستسبب","ستسعد","ستسقط","ستسمح","ستسمع","ستسير","ستشرب","ستشرق","ستشعر","ستشهد","ستصاب","ستصبح","ستصدق","ستصنع","ستضرب","ستضطر","ستضيع","ستطلب","ستطلق","ستطير","ستظهر","ستعثر","ستعجب","ستعرض","ستعرف","ستعطي","ستعلم","ستعمل","ستعود","ستعيد","ستعيش","ستغدو","ستغرق","ستغضب","ستغلق","ستغني","ستغير","ستفتح","ستفسد","ستفشل","ستفعل","ستفقد","ستفكر","ستفهم","ستفوز","ستقام","ستقبل","ستقتل","ستقدر","ستقدم","ستقضي","ستقطع","ستقلع","ستقود","ستقول","ستقوم","ستقيم","ستكتب","ستكسر","ستكشف","ستكون","ستلعب","ستلقي","ستمضي","ستمطر","ستمكث","ستموت","ستنال","ستنام","ستنجح","ستنجو","ستندم","ستنزل","ستنسي","ستنضم","ستنظر","ستنفذ","ستنقذ","ستنهي","ستهبط","ستهتم","ستهرب","ستودي","ستورم","ستوري","ستوفر","ستوقع","ستوقف","ستوكس","ستوول","ستيرن","ستيسي","ستيفن","ستيفي","ستيلا","ستيوي","سجاده","سجاير","سجلات","سجلنا","سجلوا","سجيتك","سجينا","سجينه","سحابه","سحبنا","سحبها","سحبوا","سحرها","سحريه","سحليه","سخافه","سخريه","سخونه","سخيفا","سخيفه","سداده","سديده","سراحك","سراحه","سراحي","سرداب","سرطان","سرعان","سرعتك","سرعته","سرعتي","سرقات","سرقتك","سرقته","سرقتي","سرقنا","سرقها","سرقوا","سروال","سروري","سريرك","سريره","سريري","سريعا","سريعه","سطحيه","سعاده","سعرها","سعيدا","سعيده","سفانا","سفينه","سقراط","سقطنا","سقطوا","سقوطه","سقيفه","سكاري","سكافو","سكالي","سكايب","سكران","سكنيه","سكوبي","سكوتر","سكوتش","سكوتي","سكولي","سكوير","سكيبر","سكيتر","سكيلز","سكينا","سكينر","سكينه","سكيني","سلاتر","سلاحا","سلاحف","سلاحك","سلاحه","سلاحي","سلاسل","سلالم","سلاله","سلامه","سلامي","سلايد","سلبيا","سلبيه","سلسله","سلطات","سلطان","سلطتك","سلطته","سلطتي","سلمان","سلمني","سلمون","سلميه","سلوكك","سلوكه","سلوكي","سليبي","سليتر","سليما","سليمه","سماعك","سماعه","سماعي","سمبسن","سمحتم","سمحتي","سمحنا","سمحوا","سمسار","سمعتك","سمعتم","سمعته","سمعتي","سمعنا","سمعها","سمعوا","سمورف","سموكي","سميتي","سميره","سميكه","سمينا","سمينه","سناتي","سناخذ","سنارت","سناكل","سنباي","سنبحث","سنبدا","سنبذل","سنبقي","سنبني","سنبيع","سنتات","سنتان","سنتجه","سنترك","سنتصل","سنتين","سنجاب","سنجده","سنجرب","سنجري","سنجعل","سنجلب","سنجلس","سنحصل","سنحضر","سنحظي","سنحقق","سنخبر","سنخرج","سنخسر","سنخوض","سندات","سندخل","سندفع","سنذهب","سنراك","سنراه","سنربح","سنرجع","سنرحل","سنرسل","سنركب","سنسمع","سنسير","سنشرب","سنصبح","سنصعد","سنصلح","سنصنع","سنضطر","سنطلب","سنطلق","سنعبر","سنعثر","سنعرض","سنعرف","سنعلم","سنعمل","سنعود","سنعيد","سنعيش","سنغلق","سنغير","سنفتح","سنفعل","سنفقد","سنفكر","سنفوز","سنقبض","سنقتل","سنقدم","سنقضي","سنقطع","سنقود","سنقول","سنقوم","سنقيم","سنكمل","سنكون","سنلحق","سنلعب","سنلقي","سنمسك","سنمشي","سنمضي","سنموت","سننال","سننام","سننجح","سننجو","سننزل","سننظر","سننقذ","سننهي","سنهبط","سنهتم","سنهرب","سنوات","سنوقف","سنويا","سنويه","سنيور","سهوله","سوابق","سوالا","سوالك","سواله","سوالي","سوانا","سواها","سوايل","سوراج","سوريا","سورين","سوزان","سوليس","سونيا","سويتز","سويتس","سويدي","سويفت","سويني","سياتل","سياتي","سياخذ","سياده","سياره","سياسه","سياسي","سياكل","سيبحث","سيبدا","سيبدو","سيبقي","سيبلي","سيبيل","سيترك","سيتصل","سيثبت","سيثير","سيجار","سيجدي","سيجري","سيجعل","سيجلب","سيجلس","سيحدث","سيحدد","سيحصل","سيحضر","سيحطم","سيحظي","سيحقق","سيحكم","سيحمل","سيحين","سيخبر","سيخرج","سيخسر","سيدات","سيدان","سيدتك","سيدتي","سيدخل","سيدفع","سيدمر","سيدنا","سيدني","سيدوم","سيذهب","سيراك","سيربح","سيرتك","سيرته","سيرتي","سيرجع","سيرجي","سيرحل","سيرسل","سيرغب","سيرغي","سيرفع","سيرون","سيريد","سيريل","سيزار","سيزول","سيزيد","سيسبب","سيسعد","سيسعي","سيسقط","سيسكو","سيسمح","سيسمع","سيسهل","سيسير","سيسيل","سيشعر","سيشكل","سيشهد","سيصاب","سيصبح","سيصدر","سيصدق","سيصعب","سيصلح","سيصنع","سيضرب","سيضطر","سيضيع","سيطرت","سيطره","سيطلب","سيطلق","سيطول","سيظهر","سيعبر","سيعثر","سيعرض","سيعرف","سيعطي","سيعلم","سيعمل","سيعني","سيعود","سيعيد","سيعيش","سيغدو","سيغضب","سيغطي","سيغلق","سيغير","سيفتح","سيفسد","سيفسر","سيفشل","سيفعل","سيفقد","سيفكر","سيفلح","سيفهم","سيفوز","سيفيد","سيقام","سيقان","سيقبض","سيقبل","سيقتل","سيقدم","سيقرر","سيقضي","سيقطع","سيقفز","سيقود","سيقول","سيقوم","سيقيم","سيكتب","سيكشف","سيكفي","سيكلف","سيكون","سيلاس","سيلحق","سيلعب","سيلفا","سيلفر","سيلفي","سيلقي","سيلما","سيليا","سيلين","سيمضي","سيمكو","سيموت","سيمور","سيمون","سينال","سينام","سينجح","سينجر","سينجو","سيندي","سينزل","سينسي","سينضم","سينظر","سينفذ","سينفع","سينقذ","سينما","سينهي","سينيه","سيهتم","سيهرب","سيوثر","سيودي","سيوذي","سيوفر","سيوقف","سيولد","سيولم","سيونج","سيونغ","سيوول","سييرا","سيينا","سييون","سييين","شابات","شابين","شاحبا","شاحبه","شاحنه","شاذين","شارات","شاربي","شارتك","شارتي","شارعي","شارفت","شاركت","شارلز","شارلي","شارما","شارون","شاسعه","شاشات","شاعري","شاغره","شافيز","شاكرا","شاكره","شامبو","شامله","شانتي","شاننا","شانها","شانهم","شانون","شانيل","شاهدا","شاهدت","شاهدك","شاهده","شاهدي","شايان","شايبه","شايعه","شايكه","شبابك","شبابه","شبابي","شبكات","شبيهه","شتاين","شجارا","شجاعا","شجاعه","شجعان","شحنات","شحنها","شخصان","شخصيا","شخصين","شخصيه","شديدا","شديده","شرابا","شرابك","شرابه","شرابي","شراره","شراكه","شراوه","شرايح","شرايط","شرايه","شربته","شربنا","شرحها","شرطيا","شرطيه","شرعيا","شرعيه","شركات","شركتك","شركته","شركتي","شروطك","شروطي","شريان","شريحه","شريرا","شريره","شريطا","شريطه","شريفه","شريكا","شريكك","شريكه","شريكي","شطاير","شطرنج","شطيره","شظايا","شعاري","شعبنا","شعبها","شعبيه","شعرتي","شعرنا","شعرها","شعرهم","شعروا","شعورا","شعورك","شعوره","شعوري","شغلها","شغلوا","شفاهك","شفاهي","شفتاي","شفتيك","شفرات","شقتنا","شقتها","شقيقك","شقيقه","شقيقي","شكاوي","شكركم","شكلها","شكوكي","شمالا","شمالي","شمسنا","شمسيه","شمشون","شميدت","شنايا","شنيعه","شهاده","شهدنا","شهران","شهريا","شهرين","شهيتك","شهيتي","شهيره","شوارع","شواطي","شوربه","شورتي","شوستر","شولتز","شوهدت","شووني","شيبرد","شيرلي","شيرون","شيريل","شيستر","شيطان","شيفره","شيفون","شيكات","شيلبي","شيلدن","شيموس","شينجي","شيوعي","شييان","شييين","صابون","صاحبك","صاحبه","صاحبي","صاحيه","صاخبه","صادره","صادفت","صادقا","صادقه","صارمه","صاروخ","صاعدا","صاعقه","صاغيه","صافره","صافيه","صالات","صالحا","صالحك","صالحه","صالون","صامتا","صامته","صامده","صانعه","صانعي","صايبا","صايبه","صايدي","صباحا","صباحك","صباحي","صبورا","صبوره","صبيان","صبيحه","صحافه","صحتكم","صحتها","صحفيا","صحفيه","صحيحا","صحيحه","صحيفه","صداقه","صدرها","صدريه","صدقتك","صدقته","صدقني","صدقوا","صدمات","صدمته","صدمني","صديقا","صديقك","صديقه","صديقي","صراحه","صرامه","صربيا","صرخات","صرصور","صريحا","صريحه","صعدنا","صعوبه","صعودا","صغارا","صغاري","صغيرا","صغيره","صغيري","صفاره","صفايح","صفحات","صفقات","صفقتك","صفقوا","صفيحه","صقليه","صلابه","صناعه","صناعي","صنبور","صندوق","صنعته","صنعنا","صنعها","صنعوا","صنيعا","صوابا","صوابك","صوابه","صوابي","صوبوا","صوتنا","صوتها","صوتوا","صوتيه","صورتك","صورته","صورتي","صورنا","صورها","صورهم","صوفيا","صونيا","صياغه","صيانه","صيحات","صيفيه","صينيه","ضابطا","ضابطه","ضاجعت","ضايعا","ضايعه","ضبابي","ضحايا","ضحكات","ضحكنا","ضحيته","ضرايب","ضربات","ضربتك","ضربته","ضربتي","ضربنا","ضربني","ضربها","ضربهم","ضربوا","ضروره","ضروري","ضريبه","ضعفهم","ضعوها","ضعيفا","ضعيفه","ضعيها","ضغاين","ضغينه","ضماده","ضمانه","ضمنها","ضمنهم","ضميرك","ضميري","ضواحي","ضوييه","ضيافه","ضيفنا","ضيوفك","ضيوفي","ضييله","طابعه","طابور","طاردت","طاريه","طازجه","طاعون","طاغيه","طاقتك","طاقته","طاقتي","طاقمك","طاقمه","طاقمي","طالبا","طالبه","طالما","طاهره","طاهيه","طاوله","طايرا","طايره","طايشه","طايفه","طايله","طباخه","طباعه","طبعات","طبقات","طبيبا","طبيبك","طبيبه","طبيبي","طبيعه","طبيعي","طردتك","طردته","طردنا","طردني","طردها","طردهم","طرزان","طرقنا","طريفا","طريفه","طريقا","طريقك","طريقه","طريقي","طعاما","طعامك","طعامه","طعامي","طعمها","طعنات","طعنته","طفلان","طفلتك","طفلتي","طفلنا","طفلها","طفلين","طفوله","طفولي","طفيفه","طفيلي","طلابك","طلابي","طلاقك","طلاقي","طلبات","طلبتم","طلبته","طلبتي","طلبنا","طلبها","طلبوا","طلبيه","طلقات","طليقا","طليقه","طماطم","طموحك","طموحه","طهران","طوابع","طوابق","طواري","طوكيو","طولها","طوماس","طومسن","طويلا","طويله","طياره","طيبون","طيبين","طيران","ظاهره","ظريفا","ظريفه","ظللنا","ظننتك","ظننته","ظننتي","ظهرنا","ظهرها","ظهروا","ظهورك","ظهوره","ظهيره","عابره","عاتقك","عاتقي","عاجزا","عاجزه","عاجلا","عاجله","عادات","عادتا","عادتك","عادته","عادتي","عادلا","عادله","عادوا","عاديا","عاديه","عارضه","عارمه","عاريا","عاريه","عازبه","عازفه","عازمه","عاشرت","عاشقه","عاشوا","عاصفه","عاصمه","عاطفه","عاطفي","عاطله","عاقبه","عاقلا","عاقله","عالجت","عالقا","عالقه","عالما","عالمك","عالمه","عالمي","عاليا","عاليه","عامان","عاملا","عامله","عامود","عامين","عانوا","عانيت","عاودي","عايدا","عايده","عايشه","عايقا","عايله","عايلي","عباده","عباره","عبدول","عبرنا","عبرها","عبروا","عبقري","عبوات","عتيقه","عثرتم","عثرنا","عثروا","عثمان","عجاله","عجايب","عجايز","عجلات","عجلوا","عجوزا","عجوزه","عجيبه","عداله","عدايي","عدتما","عددكم","عددنا","عددها","عددهم","عدسات","عدونا","عديده","عديمه","عديمي","عديني","عربات","عربتك","عربتي","عربون","عرضته","عرضنا","عرضها","عرضهم","عرضوا","عرضيا","عرضيه","عرفتك","عرفتم","عرفته","عرفتي","عرفنا","عرفني","عرفها","عرفوا","عرقله","عروسه","عروقك","عروقي","عريضه","عزيزه","عزيزي","عزيمه","عسانا","عساها","عسكري","عسلنا","عشايك","عشايي","عشتها","عشرات","عشرون","عشرين","عشيره","عشيقك","عشيقه","عشيقي","عصابه","عصبيا","عصبيه","عصرنا","عصريه","عصفور","عصيان","عصيبا","عصيبه","عضلات","عضويه","عطشان","عطلات","عطلتك","عطلتي","عظامك","عظامه","عظامي","عظميه","عظيما","عظيمه","عفريت","عفويه","عقابا","عقابك","عقابه","عقابي","عقارب","عقاري","عقبات","عقدنا","عقلها","عقليا","عقليه","عقوبه","عقيده","عكسيه","علاجا","علاجك","علاجه","علاجي","علاقه","علامه","علاوه","علشان","علقنا","علمتك","علمته","علمتي","علمنا","علمني","علمها","علموا","علميا","علميه","علنيه","عليكم","عليكن","عليكي","علينا","عليني","عليها","عليهم","عليهن","عماذا","عمرنا","عمرها","عمرهم","عملات","عملاق","عملتم","عملته","عملتي","عملكم","عملنا","عملها","عملهم","عملوا","عمليا","عمليه","عمودك","عمودي","عموله","عموما","عمومي","عميقا","عميقه","عميلا","عميلك","عميله","عميلي","عناصر","عناكب","عنايه","عندكم","عندما","عندنا","عندها","عندهم","عنديذ","عنصري","عنقها","عنكما","عنهما","عنوان","عنيته","عنيدا","عنيده","عنيفا","عنيفه","عهدها","عواصف","عواطف","عواقب","عوالم","عوامل","عوايق","عوايل","عودتك","عودته","عودتي","عودوا","عويصه","عياده","عيدان","عينات","عيناك","عينان","عيناه","عيناي","عينها","عينيك","عينين","عينيه","عيونك","عيونه","عيوني","غابات","غادرا","غادرت","غادري","غارزا","غارقه","غاريت","غازات","غازيه","غاضبا","غاضبه","غافين","غالبا","غالون","غاليا","غاليه","غامره","غامضا","غامضه","غاندي","غايبا","غايبه","غايوس","غثيان","غدايك","غدايي","غذايي","غرابه","غرامه","غرامي","غرانت","غراند","غرايز","غرايس","غربيه","غرفتك","غرفته","غرفتي","غرفهم","غرورك","غروفر","غريبا","غريبه","غريبي","غريتا","غريزه","غريفن","غساله","غسلها","غضبها","غضبهم","غطايي","غلطتك","غلطته","غلطتي","غنايي","غنيمه","غواصه","غوثام","غوثري","غوردن","غوميز","غيابك","غيابه","غيابي","غيتار","غيثرو","غيرته","غيرتي","غيرنا","غيرها","غيرهم","غيروا","غينيا","غيورا","غيوره","فابيو","فاتتك","فاتحه","فاتنا","فاتنه","فاتني","فاحصه","فاخره","فادحا","فادحه","فارجو","فارسا","فارسي","فارغا","فارغه","فارغو","فارقا","فارقت","فارلي","فاروق","فاريد","فاريس","فاريل","فازوا","فاسدا","فاسده","فاسقه","فاشلا","فاشله","فاصله","فاطمه","فاعلا","فاعله","فاقدا","فاقده","فاكثر","فاكهه","فالان","فالكو","فالون","فانتم","فانتي","فانسي","فاننا","فانني","فانها","فانهم","فاولر","فايبر","فايده","فايقه","فتاتك","فتاته","فتاتي","فتانا","فتحات","فتحته","فتحنا","فتحها","فتحوا","فترات","فتشنا","فتشوا","فتيات","فتيان","فجروا","فحصنا","فحصها","فخامه","فخورا","فخوره","فذهبت","فراشك","فراشه","فراشي","فراغك","فراغي","فرامل","فرانز","فرانك","فراني","فربما","فرحان","فرديه","فرسان","فرشاه","فرصتك","فرصته","فرصتي","فرصنا","فرضيه","فرعون","فرقتك","فرقتي","فرقعه","فرنسا","فرنسي","فرودو","فروست","فرويد","فريتز","فريجر","فريدا","فريده","فريدي","فريزر","فريسه","فريقا","فريقك","فريقه","فريقي","فستان","فسيتم","فشلنا","فشلوا","فشييا","فصلنا","فصلها","فصيله","فضايح","فضايي","فضلات","فضلكم","فضولي","فضيحه","فضيعه","فضيله","فطاير","فطورك","فطيره","فظاعه","فظيعا","فظيعه","فعاله","فعلتك","فعلتم","فعلته","فعلتي","فعلنا","فعلها","فعلهم","فعلوا","فعلوه","فعليا","فعليك","فعليه","ففكرت","فقاعه","فقالت","فقدان","فقدتك","فقدتم","فقدته","فقدتي","فقدنا","فقدوا","فقرات","فقررت","فقيرا","فقيره","فكانت","فكاهي","فكتور","فكرتك","فكرتم","فكرته","فكرتي","فكرنا","فكروا","فلابد","فلتعد","فلتكن","فلديك","فلديه","فلذلك","فلسفه","فلسوف","فلنري","فلنعد","فلنقل","فلنقم","فلنكن","فلورا","فلويد","فليست","فليكس","فليكن","فلينت","فماذا","فنادق","فنانا","فنانه","فنجان","فندقك","فندقي","فنسنت","فهمتك","فهمتم","فهمته","فهمتي","فهمنا","فهمها","فهموا","فهناك","فواكه","فوايد","فوتنا","فوجدت","فوجيت","فودكا","فوربز","فوربس","فورست","فوريه","فوستر","فوسكو","فوضوي","فوقنا","فوقها","فوكين","فولفو","فولكر","فولير","فيبدو","فيجاس","فيجاي","فيدلر","فيديو","فيران","فيرجل","فيردي","فيروس","فيريس","فيزيا","فيستا","فيضان","فيغاس","فيكون","فيلبس","فيلدز","فيلكس","فيلما","فيلمك","فيلمه","فيلمي","فيليب","فيليس","فيمكن","فينست","فينشي","فينكس","فينلي","فينوس","فينيس","فيهما","فيوري","فيولا","فيونا","فيينا","قابلت","قابله","قابلي","قابيل","قاتلا","قاتلت","قاتله","قاتلي","قاتمه","قادرا","قادره","قادما","قادمه","قادنا","قادني","قاذفه","قاربا","قاربت","قاربك","قاربه","قاربي","قاريه","قاسيا","قاسيه","قاضيه","قاطعت","قاطعه","قاعات","قاعده","قافله","قافيه","قالته","قالها","قالوا","قالوه","قاموا","قاموس","قانون","قاومت","قايدا","قايدك","قايده","قايدي","قايلا","قايله","قايما","قايمه","قباله","قبايل","قبرها","قبضتك","قبضتم","قبضته","قبضتي","قبضنا","قبضوا","قبطان","قبعات","قبعتك","قبعته","قبعتي","قبلات","قبلتك","قبلته","قبلتي","قبلما","قبلنا","قبلني","قبلها","قبلهم","قبلوا","قبولك","قبوله","قبولي","قبيحا","قبيحه","قبيله","قتالا","قتالك","قتالي","قتلتك","قتلتم","قتلته","قتلتي","قتلكم","قتلنا","قتلني","قتلها","قتلهم","قتلوا","قتلوه","قتيلا","قداحه","قدامي","قدرات","قدرتك","قدرته","قدرتي","قدرما","قدرنا","قدرها","قدماك","قدماي","قدمته","قدمنا","قدمها","قدموا","قدميك","قدمين","قدميه","قدومك","قدومه","قدومي","قديسه","قديما","قديمه","قذاره","قذايف","قذيفه","قراات","قرابه","قراته","قراتي","قرارا","قرارك","قراره","قراري","قرانا","قررتم","قررتي","قررنا","قرروا","قرصان","قريبا","قريبك","قريبه","قريبي","قريتك","قريتي","قسايم","قسمنا","قسيمه","قصاري","قصاصه","قصايد","قصتنا","قصتها","قصدته","قصيده","قصيرا","قصيره","قضايا","قضايي","قضبان","قضيبك","قضيبه","قضيبي","قضيتك","قضيته","قضيتي","قضينا","قطرات","قطرها","قطعته","قطعتي","قطعنا","قطعها","قطعوا","قطنيه","قلاده","قلبها","قلبيه","قلتها","قلتيه","قلقنا","قلقون","قلقين","قلناه","قليلا","قليله","قمامه","قمتما","قمصان","قميصا","قميصك","قميصه","قميصي","قنابل","قناعا","قناعك","قنبله","قنديل","قنوات","قنينه","قهوتك","قهوتي","قواته","قوارب","قواعد","قوانا","قواها","قواهم","قوايم","قوتنا","قوتها","قوتهم","قوسين","قولها","قولوا","قومنا","قوموا","قياده","قياسي","قيامك","قيامه","قيامي","قيراط","قيمتك","قيمته","كابتن","كابوا","كابوت","كابور","كابوس","كابول","كابون","كابير","كاتبا","كاتبه","كاتلر","كاتيا","كاحلك","كاحلي","كاحمق","كادوا","كاذبا","كاذبه","كاران","كارتر","كارثه","كارثي","كارسن","كارفر","كارلا","كارلو","كارلي","كارما","كارمن","كارول","كاريف","كارين","كاسان","كاسبر","كاسين","كافحت","كافري","كافضل","كافيا","كافيه","كالتي","كالدر","كالذي","كالفن","كاليب","كالين","كاليه","كامبل","كامدن","كاملا","كامله","كاميل","كانتا","كاندي","كانكم","كانما","كاننا","كانني","كانها","كانهم","كانوا","كانون","كاهيل","كايتي","كايسي","كايلا","كايلب","كايلي","كاينا","كبديل","كبرنا","كبروا","كبريا","كبريت","كبقيه","كبيرا","كبيره","كتابا","كتابك","كتابه","كتابي","كتبته","كتبنا","كتبها","كتبوا","كتفها","كتفيك","كتمان","كتيبه","كثافه","كثيرا","كثيره","كثيفه","كجندي","كحارس","كحولي","كدليل","كدمات","كذالك","كذبتي","كذبوا","كراسي","كرافت","كرامه","كراون","كراين","كرتون","كرجال","كرستي","كرسيك","كرسيه","كرسيي","كرهته","كروجر","كروسو","كروغر","كروفت","كرولي","كريسي","كريكت","كريما","كريمر","كريمه","كريهه","كرييس","كزوجه","كسبنا","كسرته","كسرها","كسروا","كسلاح","كسوله","كشافه","كشاهد","كشرطي","كشريك","كشفنا","كشفها","كشمير","كصديق","كضابط","كطبيب","كطفله","كعامل","كعكات","كعكتي","كعميل","كفاله","كفانا","كفايه","كفتاه","كفريق","كفيلم","كفيله","كقاتل","كقايد","كقطعه","كلارا","كلارك","كلاري","كلاما","كلامك","كلامه","كلامي","كلانا","كلاود","كلاوس","كلايد","كلاير","كلايف","كلاين","كلبنا","كلبها","كلعبه","كلفنا","كلفني","كلمات","كلمتك","كلمته","كلمتي","كلمني","كلوزو","كلوني","كليتي","كلينا","كلينت","كلينم","كمثال","كمدير","كمصدر","كمكان","كملكه","كميات","كمينا","كنايه","كنتما","كنساس","كنيسه","كهديه","كهربا","كهولا","كواحد","كواكب","كوانغ","كوبرا","كوبير","كوبين","كوتون","كورال","كورتس","كوركي","كوريا","كورين","كوريه","كوزمو","كوستا","كوكبي","كولبي","كولدن","كولور","كولون","كوليت","كولير","كولين","كومار","كونان","كونتا","كونتي","كوندي","كونرز","كونلي","كوننا","كونها","كونهم","كونوا","كونور","كونيه","كوهين","كويكب","كوينز","كيبنر","كيتنغ","كيتون","كيران","كيربي","كيرتس","كيرلي","كيرين","كيسلر","كيشان","كيفما","كيفين","كيفيه","كيلسو","كيلسي","كيلوا","كيلير","كيمبر","كيمبل","كيميا","كينان","كينجي","كيندا","كيندل","كيندي","كينزي","كينيا","كينيث","كيوتو","كيوكو","كيونج","كيونغ","كييبه","لاااا","لااحد","لااظن","لاباس","لابحث","لابدا","لابعد","لابقا","لابقي","لابنك","لابني","لابيك","لاتدع","لاتصل","لاتقل","لاتقم","لاتكن","لاتيه","لاثبت","لاجرا","لاجعل","لاجلب","لاجلك","لاجله","لاجلي","لاحدي","لاحصل","لاحضر","لاحظت","لاحظي","لاحقا","لاحمي","لاخبر","لاختك","لاختي","لاخذك","لاخذه","لاخذي","لاخرج","لاخري","لاخفا","لاخلا","لاخيك","لادخل","لادفع","لاذهب","لاراك","لاراه","لاربع","لارسن","لارضا","لاركن","لاروش","لاريك","لازال","لازلت","لازلو","لاسال","لاسفل","لاسمح","لاسمع","لاشرح","لاشعر","لاشهر","لاشيا","لاشيي","لاصبح","لاصقه","لاصنع","لاطلب","لاطول","لاظهر","لاعبا","لاعبه","لاعبي","لاعثر","لاعرض","لاعرف","لاعضا","لاعطا","لاعلم","لاعلي","لاعمل","لاعود","لاعيد","لاعيش","لاغير","لافته","لافضل","لافعل","لافكر","لافهم","لافون","لاقتل","لاقدم","لاقرب","لاقصي","لاقضي","لاقلق","لاقول","لاقوم","لاكبر","لاكتب","لاكثر","لاكون","لالاف","لالعب","لالغا","لالقا","لالقي","لامار","لامرك","لامره","لامري","لامعه","لاموت","لامور","لاناس","لانام","لاندي","لانشا","لانقذ","لانكم","لانكي","لاننا","لانني","لانها","لانهم","لانهي","لاهتم","لاوري","لايام","لايجب","لايحب","لايحه","لايذا","لايزا","لايسي","لايقا","لايقه","لايلا","لايهم","لايون","لباسك","لباسي","لباقي","لبرهه","لبضعه","لبقيه","لبلدي","لبنان","لبيتك","لبيته","لبيتي","لتاتي","لتاخذ","لتاكل","لتبحث","لتبدا","لتبدو","لتبقي","لتتبع","لتتصل","لتثبت","لتجعل","لتجلب","لتجنب","لتحدث","لتحدي","لتحصل","لتحضر","لتحظي","لتحمل","لتحمي","لتخبر","لتخرج","لتخطي","لتدخل","لتدفع","لتذكر","لتذهب","لتراه","لتركك","لتسمح","لتسمه","لتشعر","لتصبح","لتصنع","لتطلب","لتظهر","لتعرف","لتعقب","لتعلم","لتعمل","لتعود","لتعيد","لتعيش","لتغير","لتفعل","لتفقد","لتفكر","لتفهم","لتقبل","لتقتل","لتقدم","لتقرر","لتقضي","لتقلق","لتقول","لتقوم","لتكون","لتلعب","لتلقي","لتموت","لتنام","لتنظر","لتنقذ","لتنهي","لتهرب","لتوقف","لتولي","لتونا","لتوها","لثلاث","لثمان","لجدتي","لجعلك","لجعله","لجعلي","لجلسه","لجميع","لجهاز","لجوله","لحادث","لحالك","لحاله","لحالي","لحانه","لحدوث","لحركه","لحساب","لحضور","لحظات","لحفله","لحقوق","لحمام","لحمله","لحياه","لحيتك","لخارج","لخداع","لخدمه","لخمسه","لداخل","لدخول","لدرجه","لدعمك","لدعوه","لدليل","لدوره","لديكم","لديكي","لدينا","لديها","لديهم","لديهن","لذالك","لذكري","لذهاب","لذيذا","لذيذه","لراحه","لراسك","لربما","لرجال","لرحله","لركوب","لروما","لرويه","لرييس","لزاما","لزفاف","لزواج","لزوجك","لزوجه","لزوجي","لسابق","لساعه","لسانك","لسانه","لساني","لسباق","لسبعه","لستما","لسرقه","لسكان","لسلاح","لسماع","لسنين","لسوال","لسيده","لشبكه","لشراب","لشرطه","لشركه","لشعور","لشهور","لصاحب","لصالح","لصدمه","لصديق","لصوره","لضابط","لضربه","لضمان","لطبيب","لطريق","لطفلك","لطفله","لطفلي","لطيفا","لطيفه","لعالم","لعبتك","لعبته","لعبتي","لعبنا","لعبها","لعبور","لعشره","لعطله","لعقود","لعلاج","لعلمك","لعلنا","لعلها","لعملك","لعمله","لعملي","لعوده","لعينا","لعينه","لغايه","لغتنا","لغتهم","لغرفه","لغسيل","لفافه","لفايف","لفتاه","لفتره","لفرقه","لفريق","لفعلت","لفعله","لفكره","لفندق","لفيلم","لقاات","لقاتل","لقاعه","لقانا","لقاوك","لقايد","لقايك","لقايه","لقايي","لقبول","لقتال","لقتلك","لقتله","لقتلي","لقرار","لقراه","لقرون","لقضيه","لقطات","لقلبك","لقلبي","لقليل","لقوات","لقولك","لقوله","لقولي","لقياس","لكامل","لكانت","لكبار","لكتاب","لكثير","لكلام","لكلمه","لكليه","لكمات","لكنكم","لكننا","لكنني","لكنها","لكنهم","لكوكب","لكونك","لكونه","لكوني","لكيلا","للابد","للاخر","للاذي","للارض","للاسف","للاكل","للالم","للاله","للامر","للامل","للامم","للامن","للباب","للبحث","للبحر","للبدا","للبشر","للبعض","للبقا","للبكا","للبنا","للبنك","للبيت","للبيض","للبيع","للثقه","للجثه","للجدل","للجري","للجسم","للجنس","للجنه","للجهه","للجيش","للحاق","للحجز","للحدث","للحرب","للحزب","للحزن","للحظه","للحفل","للحكم","للحمض","للحمل","للخطا","للخطر","للخطه","للخلف","للخوف","للخير","للدعم","للدفع","للدما","للدور","للذات","للذعر","للذين","للراس","للربح","للرجل","للرسم","للرقص","للرقم","للركض","للروح","للزمن","للسبب","للسجل","للسجن","للسحر","للسطح","للسفر","للسكن","للسما","للسنه","للسوق","للسيد","للسير","للشخص","للشرا","للشرب","للشرح","للشرق","للشعب","للشعر","للشفا","للشقه","للشكر","للشمس","للشهر","للصحه","للصدر","للصوت","للصور","للصيد","للصين","للضحك","للضرب","للضغط","للطبخ","للطرد","للطعن","للطفل","للطلب","للعار","للعام","للعبث","للعبه","للعجب","للعدو","للعرش","للعرض","للعشا","للعقل","للعلم","للعلن","للعمل","للعنف","للعيش","للعين","للغاز","للغدا","للغذا","للغرب","للغضب","للغنا","للفتي","للفحص","للفرد","للفشل","للفصل","للفضا","للفوز","للقبض","للقبو","للقتل","للقرف","للقرن","للقسم","للقصر","للقصه","للقضا","للقطط","للقفز","للقلب","للقلق","للقمر","للقمه","للقول","للقوه","للكتب","للكذب","للكره","للكسر","للكشف","للكلب","للكون","للمال","للمجي","للمرح","للمرض","للمره","للمشي","للمضي","للملك","للموت","للنار","للناس","للنسا","للنشر","للنصف","للنظر","للنفط","للنقل","للنهر","للنوم","للنيل","للهدف","للهرب","للهند","للهوا","للهول","للوجه","للوحه","للورا","للوزن","للوضع","للوطن","للوعي","للوقت","لليله","لليوم","لمادا","لماده","لماذا","لمبني","لمتجر","لمجرد","لمجلس","لمجله","لمحطه","لمدير","لمركز","لمزيد","لمستك","لمسته","لمسرح","لمسها","لمطعم","لمعان","لمعرض","لمعظم","لمقتل","لمكان","لمكتب","لمنزل","لمنصب","لمنعه","لمهمه","لموعد","لموقع","لموقف","لميات","لناخذ","لنادي","لناكل","لنامل","لنبحث","لنبدا","لنبقي","لنترك","لنتصل","لنجرب","لنجعل","لنجلب","لنجلس","لنجمع","لنحصل","لنحضر","لنحظي","لنخرج","لندخل","لنذهب","لنرجع","لنرحل","لنرفع","لنرقص","لنركز","لنسرع","لنسمع","لنشرب","لنصبح","لنصعد","لنصنع","لنطلب","لنظام","لنعثر","لنعرف","لنعطي","لنعقد","لنعمل","لنعود","لنعيد","لنعيش","لنغير","لنفتح","لنفسك","لنفسه","لنفسي","لنفعل","لنفكر","لنقتل","لنقدم","لنقضي","لنقطه","لنقول","لنقوم","لنكمل","لنكون","لنلعب","لنلقي","لنمسك","لنمضي","لننسي","لننظر","لننقذ","لننهي","لنهرب","لنوبه","لنوقف","لهاتف","لهاذا","لهجتك","لهجوم","لهذين","لهناك","لهولا","لهييه","لواحد","لوازم","لوالد","لوبوس","لوبيز","لوجان","لوجبه","لوجهك","لوجهه","لوجود","لوحات","لوحتك","لوحتي","لوحدك","لوحده","لوحدي","لوران","لورنا","لورنس","لوريل","لورين","لوسيا","لوسيل","لوشيس","لوصول","لوضعك","لوضعه","لوغان","لوفاه","لوقتك","لوكاس","لوكان","لوكنت","لولاك","لولاي","لومان","لوميس","لونها","لوهله","لويجي","لويزا","لياتي","لياخذ","لياقه","ليالي","ليبحث","ليبدا","ليبدو","ليبقي","ليبيا","ليتصل","ليتني","ليتون","ليثبت","ليجعل","ليجلب","ليجلس","ليحدث","ليحصل","ليحضر","ليحمي","ليخرج","ليدخل","ليدفع","ليديا","ليذهب","ليروا","ليروي","ليزبن","ليزلي","ليستا","ليستر","ليسلي","ليسمح","ليسوا","ليصبح","ليصنع","ليطلب","ليظهر","ليعرف","ليعلم","ليعمل","ليعود","ليعيش","ليفاي","ليفعل","ليفون","ليفيا","ليفين","ليقتل","ليقول","ليقوم","ليكتر","ليكسي","ليكون","ليلتك","ليلتي","ليلعب","ليلند","ليليث","ليليه","ليمان","ليموت","ليمون","ليندا","ليندن","لينزي","لينقذ","لينكس","لينور","لينوس","لينون","لينيت","لينين","ليهدا","لييما","لييمه","مابعد","مابين","ماتوا","ماتيو","ماثيس","ماثيو","ماجور","ماجيك","ماحدث","ماحصل","ماخطب","ماخوذ","مادام","مادبه","مادمت","ماديا","ماديه","ماذلك","ماربل","مارتا","مارتن","مارتي","مارثا","مارجو","مارجي","مارست","مارسل","مارسي","مارشا","مارشل","مارغو","مارفن","ماركت","ماركس","ماركه","ماركو","ماركي","مارلا","مارلو","مارلي","مارني","ماريا","ماريس","ماريل","مارين","ماريو","مازال","مازلت","ماساه","ماسبب","ماستر","ماسوف","ماسون","ماشيه","ماضيك","ماضيه","ماضيي","ماعدا","ماعلي","مافيا","ماقبل","ماقلت","ماكان","ماكاو","ماكاي","ماكجي","ماكره","ماكسي","ماكغي","ماكنا","ماكنت","ماكنه","ماكوي","ماكين","مالدي","مالذي","مالكه","مالكي","مالنا","مالها","مالهم","مالوف","مالون","ماليا","ماليك","ماليه","مامدي","مامور","ماندي","مانوع","ماهذا","ماهذه","ماهرا","ماهره","ماهيه","ماوتش","ماونت","مايبل","مايبي","مايتي","مايجب","مايجن","مايده","مايرز","مايسي","مايكا","مايكل","مايكي","مايلز","مايلو","مايلي","مايهم","ماييه","مباحث","مبادي","مبارك","مباره","مباشر","مبالغ","مباني","مبتدي","مبتذل","مبتسم","مبتكر","مبتله","مبتهج","مبدعه","مبرحا","مبرمج","مبروك","مبعوث","مبكرا","مبكره","مبلغا","مبلله","مبنيه","مبهجه","مبهره","مبهمه","مبيعا","متابع","متاثر","متاجر","متاحا","متاحه","متاخر","متاسف","متاعب","متاكد","متانق","متاهه","متبرع","متبقي","متجرا","متجرك","متجري","متجمد","متجها","متجهه","متجول","متحدث","متحرك","متحضر","متحكم","متحمس","متحول","متخصص","متخفي","متخلف","متدرب","متدين","مترجم","متردد","متروك","متزوج","متسخه","متسكع","متشرد","متشوق","متصله","متطرف","متطفل","متطور","متطوع","متعبا","متعبه","متعدد","متعصب","متعفن","متعقب","متعلق","متعلم","متعمد","متعهد","متعود","متغير","متفرغ","متفهم","متفوق","متقدم","متقطع","متقلب","متقنه","متكبر","متكرر","متلهف","متمرد","متمسك","متميز","متنزه","متنقل","متنكر","متنها","متهمه","متهور","متوتر","متوجه","متوحش","متورط","متوسط","متوفر","متوفي","متوقع","متوقف","متيقن","متينه","مثاره","مثالا","مثالي","مثبته","مثلكم","مثلما","مثلنا","مثلها","مثلهم","مثليه","مثيرا","مثيره","مثيلا","مجاري","مجازي","مجالا","مجانا","مجاني","مجبرا","مجبره","مجتمع","مجددا","مجديه","مجرفه","مجرما","مجرمه","مجروح","مجزره","مجلات","مجمده","مجموع","مجنون","مجهزه","مجهود","مجهول","مجييك","مجييه","مجييي","محارب","محاسب","محاصر","محاطه","محافظ","محاكم","محاله","محامي","محايد","محبطا","محبطه","محبوب","محبوس","محبين","محتاج","محتار","محتال","محتجز","محترف","محترق","محترم","محتمل","محتوم","محتوي","محجوز","محددا","محدده","محدود","محرجا","محرجه","محرره","محرقه","محرمه","محروق","محزنه","محسوب","محشوه","محصنه","محصور","محصول","محطات","محطما","محطمه","محظور","محظوظ","محفظه","محفوظ","محققا","محققه","محققي","محقون","محقين","محكمه","محكوم","محلات","محلاه","محلها","محلول","محليا","محليه","محمصه","محمله","محمود","محمول","محميه","مخادع","مخارج","مخازن","مخاطر","مخالب","مخالف","مخاوف","مخباه","مخبول","مختبر","مختبي","مخترع","مخترق","مختصر","مختفي","مختلط","مختلف","مختله","مخدرا","مخدره","مخرجا","مخزون","مخصصه","مخطاه","مخططه","مخطوب","مخطيا","مخطيه","مخفوق","مخفيه","مخلصا","مخلصه","مخلوط","مخلوق","مخمور","مخيبه","مخيفا","مخيفه","مخيله","مداخل","مدارس","مدافع","مدبره","مدتها","مدخنه","مدربه","مدربي","مدرسه","مدرسي","مدرعه","مدركا","مدركه","مدروس","مدريد","مدعاه","مدعوه","مدفوع","مدفون","مدلله","مدمره","مدمنا","مدمنه","مدمني","مدنيه","مدهشا","مدهشه","مدونه","مديرا","مديرك","مديره","مديري","مدينا","مدينه","مذاقه","مذبحه","مذعور","مذكره","مذكور","مذنبا","مذنبه","مذهلا","مذهله","مذهول","مذووب","مذياع","مراحل","مرادك","مرارا","مراره","مراسل","مراسم","مرافق","مراقب","مراكز","مراهق","مراهن","مربحه","مربعه","مربكه","مربوط","مربيه","مرتاب","مرتاح","مرتان","مرتبط","مرتبك","مرتبه","مرتدي","مرتعب","مرتفع","مرتين","مرحاض","مرحبا","مرحله","مررنا","مررها","مرساه","مرسوم","مرشحه","مرضاك","مرضاه","مرضاي","مرضها","مرضيه","مرعبا","مرعبه","مرعوب","مرغوب","مرفوض","مركبه","مركزا","مركزك","مركزه","مركزي","مرهقا","مرهقه","مرهون","مروان","مروحه","مرورك","مروري","مروعا","مروعه","مرونه","مريبا","مريبه","مريحا","مريحه","مريضا","مريضك","مريضه","مريضي","مريعا","مريعه","مرييه","مزاجك","مزاجه","مزاجي","مزارع","مزايا","مزدحم","مزدوج","مزرعه","مزريه","مزعجا","مزعجه","مزوده","مزوره","مزيدا","مزيفا","مزيفه","مساحه","مسارح","مسارك","مساره","مساعد","مسافر","مسافه","مساكن","مسالم","مساله","مساوك","مسايل","مسبقا","مسبقه","مستاه","مستجد","مستعد","مستقر","مستقل","مستمر","مستمع","مستند","مستوي","مسجله","مسجون","مسحها","مسحور","مسحوق","مسدسا","مسدسك","مسدسه","مسدسي","مسدود","مسرحي","مسرعا","مسرعه","مسرور","مسروق","مسطحه","مسعور","مسكتك","مسكنك","مسكني","مسكون","مسكين","مسلحا","مسلحه","مسلسل","مسلمه","مسليا","مسليه","مسمار","مسموح","مسموع","مسوول","مسيحي","مسيره","مسيطر","مسيول","مشابه","مشارف","مشارك","مشاعر","مشاغب","مشاكس","مشاكل","مشاهد","مشبوه","مشتاق","مشتبه","مشتته","مشترك","مشتري","مشتعل","مشجعه","مشجعي","مشحون","مشدده","مشدود","مشرحه","مشرفه","مشرقه","مشروب","مشروط","مشروع","مشعوذ","مشغول","مشفره","مشكله","مشكوك","مشلول","مشهدا","مشهور","مشوشا","مشوشه","مشوقا","مشوقه","مشوهه","مشويه","مشينا","مشييه","مصابا","مصابه","مصادر","مصارع","مصارف","مصاصه","مصاصو","مصاصي","مصالح","مصانع","مصباح","مصدرا","مصدرك","مصدره","مصدري","مصدوم","مصرفي","مصطفي","مصطلح","مصغره","مصلحه","مصممه","مصنوع","مصوره","مصيبه","مصيده","مصيرك","مصيره","مصيري","مضاده","مضارب","مضاعف","مضبوط","مضحكا","مضحكه","مضروب","مضطرا","مضطرب","مضطره","مضغوط","مضمار","مضمون","مضيعه","مضيفه","مضييه","مطابق","مطارد","مطاطي","مطاعم","مطالب","مطبخك","مطبخي","مطرقه","مطرود","مطعما","مطعمك","مطعمي","مطفاه","مطلقا","مطلقه","مطلوب","مطمين","مطولا","مطيعا","مطيعه","مظاهر","مظلما","مظلمه","مظهرك","مظهره","مظهري","معادن","معارض","معارف","معارك","معاطف","معافي","معاقب","معالج","معالم","معامل","معباه","معتاد","معتدل","معتقل","معتمد","معتوه","معجبا","معجبه","معجبي","معجزه","معجون","معدات","معدتك","معدته","معدتي","معدله","معدني","معديه","معذره","معرضه","معرفه","معركه","معروض","معروف","معزول","معسكر","معصمك","معصمي","معضله","معطفا","معطفك","معطفه","معطفي","معطله","معظمه","معقدا","معقده","معقول","معكما","معلقا","معلقه","معلما","معلمك","معلمه","معلمي","معلوم","معناه","معهما","معيار","معيشه","معينه","مغادر","مغاير","مغتصب","مغرما","مغرمه","مغرور","مغريه","مغسله","مغطاه","مغفلا","مغفله","مغلقا","مغلقه","مغمور","مغنيه","مفاجي","مفاصل","مفاعل","مفتاح","مفترس","مفترض","مفترق","مفتوح","مفتول","مفتون","مفرطه","مفرغه","مفصله","مفصول","مفضله","مفعمه","مفعول","مفقود","مفكره","مفلسه","مفهوم","مفيدا","مفيده","مقابر","مقابل","مقاتل","مقاسك","مقاطع","مقاعد","مقالا","مقاله","مقامر","مقاول","مقاوم","مقبره","مقبله","مقبوض","مقبول","مقتبس","مقتله","مقتنع","مقتول","مقدار","مقدرا","مقدره","مقدسه","مقدما","مقدمه","مقربه","مقرفا","مقرفه","مقززه","مقصدك","مقصدي","مقصود","مقطوع","مقعدا","مقعدك","مقعده","مقعدي","مقفله","مقلاه","مقلقه","مقلوب","مقليه","مقنعا","مقنعه","مقوله","مقياس","مقيدا","مقيده","مقيمه","مكابح","مكاتب","مكانا","مكانك","مكانه","مكاني","مكتبا","مكتبك","مكتبه","مكتبي","مكتشف","مكتمل","مكتوب","مكتوف","مكتيب","مكثفه","مكروه","مكسور","مكشوف","مكلفه","مكنسه","مكونه","مكياج","مكيده","ملابس","ملاذا","ملازم","ملاعب","ملاكا","ملاكم","ملاكي","ملامح","ملاهي","ملايم","ملتزم","ملتصق","ملتقي","ملتوي","ملحمه","ملحوظ","ملزمه","ملطخه","ملعقه","ملعون","ملفات","ملفها","ملفوف","ملقاه","ملكات","ملكتك","ملكتي","ملككم","ملكنا","ملكها","ملكهم","ملكيه","ملموس","ملهمه","ملوثه","ملونه","مليار","مليسا","مليون","ملييا","ملييه","مماثل","مماذا","ممتاز","ممتعا","ممتعه","ممتلي","ممتنا","ممتنه","ممثلا","ممثله","ممثلي","ممرات","ممرضه","ممزقه","ممسحه","ممسكه","ممفيس","ممكنا","ممكنه","مملكه","مملوه","مملين","ممنوع","مميته","مميزا","مميزه","مناجم","مناره","منازل","مناسب","مناشف","مناصب","مناطق","مناظر","مناعه","منافس","منافع","منافق","منبهر","منبوذ","منتبه","منتجع","منتجه","منتخب","منتدي","منتزه","منتشر","منتشي","منتصب","منتصف","منتظر","منتظم","منتفخ","منتهي","منجذب","منحتك","منحته","منحدر","منحرف","منحنا","منحني","منحها","منحهم","منخفض","مندفع","مندهش","مندوب","منديل","منزعج","منزلا","منزلك","منزله","منزلي","منسحب","منشار","منشاه","منشغل","منشفه","منشور","منصبك","منصبه","منصبي","منصفا","منصفه","منضده","منطاد","منطقه","منطقي","منطلق","منظار","منظرك","منظمه","منظور","منعزل","منعشه","منعطف","منعنا","منعني","منعها","منعهم","منفتح","منفرد","منفصل","منفضه","منفعل","منفعه","منكما","منهكه","منهما","منومه","منيعه","مهاجر","مهاجم","مهاره","مهامك","مهبلك","مهبلي","مهتما","مهتمه","مهجور","مهدده","مهذبا","مهذبه","مهزله","مهمات","مهمتك","مهمته","مهمتي","مهمله","مهمين","مهنتك","مهنته","مهنتي","مهندس","مهنيه","مهووس","مهينه","موارد","مواسم","مواطن","موافق","مواقع","مواقف","مواهب","موتمر","موتنا","موتها","موتهم","موثرا","موثره","موثقه","موثوق","موجات","موجهه","موجود","موحده","موخرا","موخره","موديل","موذيه","موران","موراي","مورتن","مورتي","مورفي","مورلي","موريس","موريل","مورين","موزلي","موسسه","موسفه","موسكو","موصول","موضوع","موطنك","موطنه","موطني","موظفا","موظفه","موظفي","موعدا","موعدك","موعده","موعدي","موفقا","موفقه","موقتا","موقته","موقعا","موقعك","موقعه","موقعي","موقفا","موقفك","موقفه","موقفي","موقنه","موقوف","موكده","موكلك","موكلي","مولان","مولاي","مولدر","مولدك","مولدي","مولعا","مولعه","مولفه","مولما","مولمه","مولود","مولوك","مومنا","مومنه","موميا","مونتي","مونرو","مونيك","موهبه","موهلا","موهله","موهوب","مويرا","ميامي","ميتال","ميتان","ميتشل","ميتون","ميتين","ميثاق","ميجان","ميجور","ميجيل","ميدان","ميدوز","ميراث","ميرتل","ميرزا","ميرسر","ميرسي","ميرفي","ميرلن","ميريك","ميريل","ميرين","ميزان","ميستك","ميستي","ميسون","ميشيل","ميعاد","ميغان","ميغيل","ميلاد","ميلان","ميللر","ميللي","ميلنر","ميلير","ميلين","ميندي","ميونخ","ميونغ","ميووس","ميويه","مييوس","ناتجه","ناتلي","ناثان","ناثين","ناجحا","ناجحه","ناجون","ناجين","ناحيه","ناخذك","ناخذه","نادرا","نادره","نادله","نادما","نادمه","نادني","ناديا","ناديت","ناديك","نادين","ناديه","ناريه","ناسفه","ناضجه","ناظري","ناعمه","نافذه","نافعه","نافيد","ناقشت","ناقصه","ناقله","ناكله","نالوا","ناموا","ناندو","نانسي","ناهيك","نايبه","نايثن","نايجل","نايلز","نايما","نايمه","ناينا","نباتي","نبالغ","نبتعد","نبتون","نبضات","نبضها","نبقيه","نبيلا","نبيله","نتابع","نتاخر","نتاكد","نتالي","نتايج","نتبعه","نتتبع","نتجنب","نتجول","نتحدث","نتحرك","نتحقق","نتحكم","نتحمل","نتخطي","نتخلص","نتخلي","نتخيل","نتدبر","نتدخل","نتدرب","نتذكر","نترات","نتركك","نتركه","نتزوج","نتسال","نتسكع","نتسلق","نتسلل","نتصرف","نتصور","نتطلع","نتعرض","نتعرف","نتعشي","نتعقب","نتعلم","نتفحص","نتفقد","نتفهم","نتقدم","نتكلم","نتلقي","نتمتع","نتمرن","نتمسك","نتمشي","نتمكن","نتمني","نتوجه","نتوصل","نتوقع","نتوقف","نتولي","نتيجه","نجاحا","نجاحك","نجاحه","نجاحي","نجتاز","نجتمع","نجحنا","نجحوا","نجدها","نجدهم","نجعلك","نجعله","نجونا","نحارب","نحافظ","نحاول","نحبها","نحبهم","نحتاج","نحترم","نحتسي","نحتفظ","نحتفل","نحضره","نحنحه","نحونا","نحوها","نحيفه","نحيله","نخاطر","نخبرك","نخبره","نخبكم","نخبنا","نختار","نختبر","نختبي","نختفي","نختلف","نخرجك","نخرجه","نداات","ندافع","ندعها","ندعهم","ندعوا","ندعوك","ندعوه","نراجع","نراقب","نراكم","نراها","نراهم","نراهن","نرتاح","نرتدي","نرتكب","نرجوا","نريدك","نريده","نريهم","نزاهه","نزلنا","نزولا","نساعد","نسافر","نسالك","نساله","نسايي","نسبيا","نستحق","نستطع","نستعد","نستغل","نستقل","نستمر","نستمع","نسختك","نسختي","نسمعك","نسمعه","نسميه","نسيان","نسيتم","نسيته","نسيتي","نسيطر","نسينا","نشارك","نشانا","نشاهد","نشترك","نشتري","نشرات","نشرها","نشكرك","نشيطه","نصايح","نصطاد","نصفها","نصفهم","نصفين","نصيبك","نصيبه","نصيبي","نصيحه","نضعها","نضعهم","نطارد","نطالب","نطلبه","نظاره","نظافه","نظاما","نظامك","نظامه","نظامي","نظرات","نظرتك","نظرتم","نظرتي","نظرنا","نظرها","نظرهم","نظروا","نظريا","نظريه","نظفوا","نظيفا","نظيفه","نعالج","نعاني","نعتبر","نعتذر","نعترف","نعتقد","نعتمد","نعتني","نعرفه","نعطيك","نعطيه","نعلمه","نعمله","نعناع","نعومي","نعيدك","نعيده","نغادر","نفاثه","نفايه","نفترض","نفترق","نفتقد","نفذوا","نفسنا","نفسها","نفسهم","نفسيا","نفسيه","نفعله","نفقات","نفقده","نقابل","نقابه","نقاتل","نقاله","نقانق","نقتحم","نقترب","نقتله","نقدمه","نقديه","نقرات","نقطتي","نقلنا","نقلها","نقلهم","نقلوا","نقودا","نقودك","نقوده","نقودي","نقوله","نكافح","نكتشف","نكران","نلاحظ","نلاحق","نلتزم","نلتقط","نلتقي","نماذج","نمارس","نمتلك","نملكه","نموذج","نناقش","ننتصر","ننتظر","ننتقل","ننتمي","ننتهي","ننسحب","ننطلق","ننفصل","ننقله","نهاجم","نهارا","نهارك","نهايه","نهايي","نواجه","نوادي","نواصل","نوافذ","نوافق","نوايا","نوبات","نوبتي","نورما","نوريس","نورين","نوعان","نوعنا","نوعها","نوعين","نوعيه","نوفاك","نوقفه","نولان","نومنا","نومها","نومهم","نوويه","نيابه","نيثان","نيران","نيسان","نيفيل","نيكول","نيلسن","نينجا","نيوتن","هاتان","هاتشي","هاتفا","هاتفك","هاتفه","هاتفي","هاتين","هاجمت","هاجمك","هاجمه","هاديا","هاديس","هاديه","هاربا","هاربر","هاربه","هاردي","هارفي","هاركر","هارلم","هارلن","هارلي","هارون","هاريت","هاريس","هاسكل","هاسون","هاللو","هامده","هاملت","هانتر","هانحن","هانسن","هانيه","هاهنا","هاواي","هاورد","هاولا","هاويه","هايتس","هايتي","هايدن","هايدي","هايزل","هايفن","هايلا","هايله","هايلي","هاينز","هبطنا","هجرتك","هجرته","هجرني","هجرها","هجمات","هجوما","هدايا","هددني","هدسون","هدفنا","هدفها","هدفهم","هدويك","هديتك","هديتي","هرايك","هربتي","هربنا","هربوا","هرمون","هروبك","هروبه","هزليه","هزمتك","هزمنا","هزيمه","هكتور","هلموا","هلوسه","همسات","همفري","همممم","هنالك","هندسه","هنديه","هنريك","هنييا","هنييه","هواتف","هواده","هوارد","هوانج","هوانغ","هوايه","هوايي","هوجمت","هوراس","هولدر","هولدن","هولمز","هوليس","هوندا","هويات","هويتك","هويته","هويتي","هياكل","هيتلر","هيجان","هيدرا","هيرست","هيرلي","هيستر","هيسوس","هيكوك","هيلدا","هيلدي","هيلين","هينري","هيهات","هيوجو","هيوغو","هيونج","هيونغ","واااو","وابحث","وابدا","وابقي","وابنك","وابنه","وابني","وابوس","وابوك","واترز","واترك","واتصل","واتضح","واتيت","واثقا","واثقه","واثنا","واجبك","واجبه","واجبي","واجعل","واجلب","واجلس","واجهت","واجهه","واجهي","واحبك","واحدا","واحده","واحصل","واحضر","واخبر","واختك","واختي","واخذت","واخرج","واخري","واخشي","واذهب","واراد","واربع","وارجو","وارحل","واردت","وارده","وارسل","وارسو","وارغب","وارنر","واريد","واريك","وارين","واسرع","واسعه","واسفل","واسمع","واسمك","واسمه","واسمي","واسوا","واسود","واشرب","واشعر","واشيا","واصبح","واصلت","واصلي","واضاف","واضحا","واضحه","واطلب","واطلق","واظهر","واعثر","واعدت","واعدك","واعده","واعرف","واعضا","واعطي","واعلم","واعلي","واعمل","واعني","واعود","واعيا","واعيد","واعيش","واعيه","واغلق","وافضل","وافعل","وافقت","وافكر","واقسم","واقعا","واقعه","واقعي","واقفا","واقفه","واقول","واقوم","واقوي","واقيه","واكبر","واكثر","واكره","واكون","والاب","والاس","والام","والان","والبد","والتر","والتي","والجز","والحب","والحق","والدا","والدك","والدم","والدن","والده","والدو","والدي","والذي","والرب","والشر","والشي","والعب","والقا","والقي","والكر","والكل","والله","والما","واليس","واليك","وامام","وامسك","وامها","وامور","وانتم","وانتي","واندا","وانظر","وانقذ","وانكم","وانما","واننا","وانني","وانها","وانهم","وانهي","وايات","وايتي","وايضا","وايلد","وايلي","وباقي","وبدات","وبدلا","وبدون","وبذلك","وبرغم","وبسبب","وبشان","وبشده","وبشكل","وبصحه","وبضعه","وبفضل","وبقدر","وبقيت","وبقيه","وبنفس","وبهذا","وبهذه","وبينك","وبينه","وبيني","وتاتي","وتاخذ","وتاكد","وتاكل","وتبحث","وتبدا","وتبدو","وتبقي","وتبين","وتترك","وتجعل","وتجلب","وتجلس","وتحدث","وتحصل","وتحضر","وتحقق","وتحمل","وتخبر","وتخرج","وتدخل","وتذكر","وتذهب","وترحل","وتركت","وتريد","وتسبب","وتسعه","وتشرب","وتشعر","وتصبح","وتطلب","وتطلق","وتظهر","وتعال","وتعرف","وتعلم","وتعمل","وتعني","وتعود","وتعيش","وتغير","وتفعل","وتفقد","وتفكر","وتقتل","وتقدم","وتقول","وتقوم","وتكون","وتلعب","وتلقي","وتموت","وتنظر","وتوجد","وتوقف","وتيره","وثاقي","وثايق","وثلاث","وثيقه","وجاهز","وجبات","وجبتك","وجبتي","وجدتك","وجدتم","وجدته","وجدتي","وجدنا","وجدني","وجدها","وجدوا","وجدوه","وجعلت","وجعله","وجلبت","وجلست","وجميع","وجميل","وجهات","وجهاز","وجهتك","وجهته","وجهتي","وجهنا","وجهها","وجودك","وجوده","وجودي","وجيزه","وحاول","وحدات","وحدتك","وحدتي","وحدكم","وحدنا","وحدها","وحدهم","وحشيه","وحصلت","وحياه","وحيدا","وحيده","وخارج","وخاصه","وخرجت","وخسرت","وخطير","وخلال","وخمسه","وخيمه","وداعا","ودايع","ودخلت","ودعنا","ودعني","ودفعت","ودودا","ودوده","وديعه","وذكيه","وذهبت","وراثي","وراقب","ورانا","وراها","وراهم","ورايت","ورايع","ورايك","ورايه","ورايي","وربطه","وربما","ورجال","ورحلت","وردنا","وردني","ورديه","ورفضت","ورقيه","ورويه","وريثه","ورييس","وزاره","وزنها","وزوجك","وزوجه","وزوجي","وزيره","وساخذ","وساده","وساري","وساظل","وساعد","وسالت","وسامه","وسايد","وسايل","وسبعه","وستجد","وستري","وستون","وسرعه","وسرقت","وسرقه","وسريع","وسعنا","وسعيد","وسقطت","وسمعت","وسنجد","وسنري","وسهلا","وسهله","وسيتم","وسيده","وسيطه","وسيله","وسيما","وشانك","وشانه","وشاني","وشاهد","وشراب","وشركه","وشعرت","وشكرا","وشيكا","وشيكه","وصاحب","وصايه","وصديق","وصفات","وصفته","وصفتي","وصفها","وصلتك","وصلتم","وصلتي","وصلنا","وصلني","وصلوا","وصنعت","وصوره","وصولا","وصولك","وصوله","وصولي","وصيته","وصيفه","وضعتك","وضعتم","وضعته","وضعتي","وضعكم","وضعنا","وضعني","وضعها","وضعهم","وضعوا","وضعوه","وضعيه","وضوحا","وضيعه","وطبقا","وطعام","وطلبت","وطننا","وطنهم","وطنيه","وطوال","وظايف","وظننت","وظيفه","وعادت","وعاده","وعدتك","وعدته","وعدنا","وعدني","وعرفت","وعشره","وعصير","وعلمت","وعليك","وعليه","وعملت","وعملي","وعندي","وعودي","وعيها","وغادر","وغرفه","وغريب","وفاتك","وفاته","وفاتي","وفتاه","وفجاه","وفريق","وفشلت","وفعلت","وفقدت","وفكرت","وفيات","وفيما","وفيها","وقاتل","وقاحه","وقالت","وقامت","وقايع","وقايي","وقتكم","وقتلت","وقتله","وقتما","وقتنا","وقتها","وقتهم","وقدمت","وقررت","وقضيت","وقطعه","وقعتي","وقعنا","وقعوا","وقفنا","وقفها","وقفوا","وقلبي","وقليل","وقمنا","وقولي","وقومي","وقويه","وكاله","وكانا","وكانت","وكانك","وكانه","وكاني","وكبير","وكتبت","وكثير","وكذبت","وكذلك","وكسرت","وكلما","وكلمه","وكلنا","وكلها","وكلهم","وكوني","وكيله","وكيلي","ولابد","ولاجل","ولاده","ولاعه","ولاكن","ولانك","ولانه","ولاول","ولايك","ولايه","ولايي","ولحسن","ولدان","ولدنا","ولدها","ولدوا","ولديك","ولديه","ولذلك","ولسبب","ولسنا","ولسوف","ولطيف","ولكنا","ولكنك","ولكنه","ولكني","ولمده","ولنري","ولهذا","وليام","وليست","وليكن","وليله","وليمه","وماتت","وماذا","وماري","وماهو","وماهي","ومثلك","ومثير","ومجرد","ومضات","ومعظم","ومعنا","ومعها","ومعهم","ومكان","ومكتب","وملكه","ومنزل","ومهما","وناخذ","وناكل","ونامل","ونبحث","ونبدا","ونترك","ونجعل","ونحصل","ونحضر","ونخرج","ونذهب","ونرحل","ونريد","ونسيت","ونشرب","ونطلب","ونظام","ونظرت","ونعرف","ونعلم","ونعمل","ونعود","ونعيد","ونعيش","ونفعل","ونقول","ونقوم","ونكون","ونلعب","ونلقي","وننسي","وننظر","وهاهو","وهاهي","وهربت","وهكذا","وهميه","وهناك","وهولا","وواحد","وواضح","ووالد","ووجدت","ووسيم","ووصلت","ووضعت","ووضعه","ووفقا","ووقعت","وياتي","وياخذ","ويبدا","ويبدو","ويبقي","ويترك","ويتني","ويجري","ويجعل","ويحصل","ويحمل","ويخرج","ويديك","ويذهب","ويريد","ويزلي","ويستن","ويسكي","ويسلر","ويسلي","ويشعر","ويصبح","ويطلب","ويطلق","ويظهر","ويعرف","ويعلم","ويعمل","ويعني","ويعود","ويعيش","ويفعل","ويقتل","ويقول","ويقوم","ويكون","ويلاه","ويلكس","ويلما","ويليس","ويمكن","ويموت","وينتر","وينجر","ويندل","ويندي","وينظر","ويوجد","ويوما","ياابي","يااخي","ياامي","يابني","ياتوا","ياتون","ياتيك","ياخذك","ياخذه","ياربي","يارجل","يارده","ياسيد","ياصاح","يافتي","يافعا","يافعه","ياقوم","ياكله","يالله","يالها","يالهي","يامرك","يانكي","ياهذا","ياولد","يايتس","يايسا","يايسه","يبارك","يبالغ","يبالي","يبتسم","يبتعد","يبتلع","يبدوا","يبدون","يبقوا","يبقون","يبقيك","يبقيه","يبكون","يبنون","يبيعه","يتابع","يتاثر","يتاجر","يتاخر","يتاذي","يتاكد","يتالم","يتبعك","يتبعه","يتبقي","يتبول","يتتبع","يتجرا","يتجسس","يتجمد","يتجمع","يتجنب","يتجول","يتحتم","يتحدث","يتحدي","يتحرش","يتحرك","يتحسن","يتحطم","يتحقق","يتحكم","يتحمل","يتحول","يتخطي","يتخلص","يتخلي","يتخيل","يتدخل","يتدرب","يتدفق","يتذكر","يتردد","يتركك","يتركه","يتزوج","يتسال","يتسبب","يتسرب","يتسكع","يتسلق","يتسلل","يتسني","يتصرف","يتصور","يتضمن","يتطلب","يتطلع","يتطور","يتعدي","يتعرض","يتعرف","يتعفن","يتعقب","يتعلق","يتعلم","يتعين","يتغذي","يتغلب","يتغوط","يتغير","يتفقد","يتفهم","يتفوق","يتفوه","يتقبل","يتقدم","يتقيا","يتكرر","يتكلم","يتكون","يتلقي","يتمتع","يتمزق","يتمسك","يتمشي","يتمكن","يتمني","يتنفس","يتنقل","يتوجب","يتوجه","يتورط","يتوسل","يتوفر","يتوقع","يتوقف","يتولي","يتوهم","يتيمه","يثرثر","يثقوا","يثقون","يثيرك","يجادل","يجبرك","يجتاز","يجتمع","يجدنا","يجدني","يجدها","يجدوا","يجدون","يجدوه","يجرون","يجعلك","يجعله","يجنون","يحارب","يحافظ","يحاكم","يحاول","يحبان","يحببن","يحبنا","يحبني","يحبها","يحبهم","يحبوا","يحبون","يحتاج","يحتجز","يحترق","يحترم","يحتسب","يحتسي","يحتضر","يحتفظ","يحتفل","يحتمل","يحتوي","يحضره","يحظوا","يحظون","يحمله","يحمون","يحميك","يحميه","يخاطر","يخالف","يخبرك","يخبره","يختار","يختبر","يختبي","يخترع","يخترق","يختطف","يختفي","يختلط","يختلف","يختلق","يختنق","يخدعك","يخشون","يخصنا","يخصني","يخفون","يخفيه","يخونك","يخيفك","يدافع","يدعنا","يدعني","يدعوا","يدعوك","يدعون","يدعوه","يدغدغ","يدفعك","يدفعه","يدويا","يدويه","يدينا","يديها","يذكرك","يذكره","يذهبن","يرافق","يراقب","يرانا","يراني","يراها","يراهم","يراهن","يربطه","يرتاح","يرتبط","يرتجف","يرتدي","يرتفع","يرتكب","يردون","يرمون","يروقك","يرونا","يرونك","يرونه","يروني","يريحك","يريدك","يريده","يرينا","يريني","يزداد","يزدهر","يزعجك","يسارا","يسارك","يساري","يساعد","يسافر","يسالك","يساوي","يسببه","يستحق","يستحم","يستطع","يستعد","يستغل","يستقر","يستلم","يستمر","يستمع","يستند","يسرني","يسعدك","يسعنا","يسعني","يسعون","يسمعك","يسمعه","يسمون","يسميه","يسيطر","يشابه","يشارك","يشاهد","يشبهك","يشبهه","يشتاق","يشتبه","يشترك","يشتري","يشتعل","يشتغل","يشتكي","يشعرك","يشكرك","يشكون","يصادف","يصارع","يصدقك","يصطاد","يصطدم","يصلني","يصلوا","يصلون","يصنعه","يصيبك","يضاجع","يضاهي","يضايق","يضحكك","يضربك","يضربه","يضعنا","يضعني","يضعها","يضعوا","يضعون","يطابق","يطارد","يطالب","يطلبه","يظنني","يظنوا","يظنون","يعادل","يعارض","يعاشر","يعاقب","يعالج","يعامل","يعاني","يعاود","يعتاد","يعتبر","يعتذر","يعترض","يعترف","يعتقد","يعتمد","يعتني","يعجبك","يعجبه","يعدون","يعرفك","يعرفن","يعرفه","يعطني","يعطوك","يعطون","يعطيك","يعطيه","يعقوب","يعلمك","يعلمه","يعملن","يعمله","يعنون","يعنيك","يعنيه","يعودا","يعيده","يغادر","يغتفر","يغضبك","يغنون","يفترض","يفتقد","يفتقر","يفعلن","يفعله","يفعلو","يفهمه","يفوتك","يفيدك","يقابل","يقاتل","يقارب","يقارن","يقاوم","يقتحم","يقترب","يقترح","يقتصر","يقتلك","يقتله","يقدمه","يقراه","يقصده","يقضون","يقظين","يقعون","يقفون","يقلقك","يقودك","يقوده","يقوله","يقينا","يكافح","يكترث","يكتشف","يكتمل","يكرهك","يكرهه","يكفيك","يكلفك","يكونا","يكونو","يلاحظ","يلاحق","يلايم","يلتزم","يلتصق","يلتقط","يلتقي","يلتهم","يلزمك","يلقوا","يلقون","يلمسك","يلمسه","يلومك","يمارس","يمانع","يمتلك","يمتلي","يمرون","يمشون","يمكنا","يمكنك","يمكنه","يمكني","يملكه","يمنحك","يمنحه","يمنعك","يمنعه","يمينا","يمينك","يميني","ينادي","يناسب","يناقش","يناير","ينبغي","ينبوع","ينتبه","ينتحر","ينتشر","ينتصب","ينتصر","ينتظر","ينتقل","ينتقم","ينتمي","ينتهي","ينجوا","ينحدر","ينحني","ينخفض","يندفع","ينزعج","ينزلق","ينسحب","ينسوا","ينسون","ينطبق","ينطلق","ينطوي","ينعكس","ينفتح","ينفجر","ينفصل","ينقذك","ينقصك","ينقصه","ينقطع","ينقلب","ينكسر","ينهار","ينوون","يهاجم","يهمنا","يهمني","يهمهم","يهودي","يهوذا","يواجه","يواصل","يواعد","يوافق","يوتاه","يوجين","يوحنا","يودون","يوذيك","يوذيه","يوصلك","يوقفك","يوقفه","يولمك","يوليو","يومان","يومكم","يومنا","يومها","يوميا","يومين","يوميه","يونان","يونيو","يوهان"];
/* @kalima-guesses-end */
/* @chess-engine-start */
/* chess.js 1.4.0 — BSD-2-Clause. Copyright (c) 2025 Jeff Hlywa.
   Vendored for SPIDER so the browser and the edge function share one rules implementation.
   No GPL engine (Stockfish is not included). Source: https://github.com/jhlywa/chess.js
   The BSD notice below is kept inside the library source. */
var Chess=(function(){
// @generated by Peggy 4.2.0.
//
// https://peggyjs.org/



  function rootNode(comment) {
  	return comment !== null ? { comment, variations: [] } : { variations: []}
  }

  function node(move, suffix, nag, comment, variations) {
  	const node = { move, variations };

    if (suffix) {
    	node.suffix = suffix;
    }

    if (nag) {
    	node.nag = nag;
    }

    if (comment !== null) {
    	node.comment = comment;
    }

    return node
  }

  function lineToTree(...nodes) {
  	const [root, ...rest] = nodes;

    let parent = root;

    for (const child of rest) {
    	if (child !== null) {
        	parent.variations = [child, ...child.variations];
            child.variations = [];
            parent = child;
        }
    }

  	return root
  }

  function pgn(headers, game) {
  	if (game.marker && game.marker.comment) {
    	let node = game.root;
        while (true) {
        	const next = node.variations[0];
            if (!next) {
            	node.comment = game.marker.comment;
            	break
            }
            node = next;
        }
    }

  	return {
    	headers,
        root: game.root,
        result: (game.marker && game.marker.result) ?? undefined
    }
  }

function peg$subclass(child, parent) {
  function C() { this.constructor = child; }
  C.prototype = parent.prototype;
  child.prototype = new C();
}

function peg$SyntaxError(message, expected, found, location) {
  var self = Error.call(this, message);
  // istanbul ignore next Check is a necessary evil to support older environments
  if (Object.setPrototypeOf) {
    Object.setPrototypeOf(self, peg$SyntaxError.prototype);
  }
  self.expected = expected;
  self.found = found;
  self.location = location;
  self.name = "SyntaxError";
  return self;
}

peg$subclass(peg$SyntaxError, Error);

function peg$padEnd(str, targetLength, padString) {
  padString = padString || " ";
  if (str.length > targetLength) { return str; }
  targetLength -= str.length;
  padString += padString.repeat(targetLength);
  return str + padString.slice(0, targetLength);
}

peg$SyntaxError.prototype.format = function(sources) {
  var str = "Error: " + this.message;
  if (this.location) {
    var src = null;
    var k;
    for (k = 0; k < sources.length; k++) {
      if (sources[k].source === this.location.source) {
        src = sources[k].text.split(/\r\n|\n|\r/g);
        break;
      }
    }
    var s = this.location.start;
    var offset_s = (this.location.source && (typeof this.location.source.offset === "function"))
      ? this.location.source.offset(s)
      : s;
    var loc = this.location.source + ":" + offset_s.line + ":" + offset_s.column;
    if (src) {
      var e = this.location.end;
      var filler = peg$padEnd("", offset_s.line.toString().length, ' ');
      var line = src[s.line - 1];
      var last = s.line === e.line ? e.column : line.length + 1;
      var hatLen = (last - s.column) || 1;
      str += "\n --> " + loc + "\n"
          + filler + " |\n"
          + offset_s.line + " | " + line + "\n"
          + filler + " | " + peg$padEnd("", s.column - 1, ' ')
          + peg$padEnd("", hatLen, "^");
    } else {
      str += "\n at " + loc;
    }
  }
  return str;
};

peg$SyntaxError.buildMessage = function(expected, found) {
  var DESCRIBE_EXPECTATION_FNS = {
    literal: function(expectation) {
      return "\"" + literalEscape(expectation.text) + "\"";
    },

    class: function(expectation) {
      var escapedParts = expectation.parts.map(function(part) {
        return Array.isArray(part)
          ? classEscape(part[0]) + "-" + classEscape(part[1])
          : classEscape(part);
      });

      return "[" + (expectation.inverted ? "^" : "") + escapedParts.join("") + "]";
    },

    any: function() {
      return "any character";
    },

    end: function() {
      return "end of input";
    },

    other: function(expectation) {
      return expectation.description;
    }
  };

  function hex(ch) {
    return ch.charCodeAt(0).toString(16).toUpperCase();
  }

  function literalEscape(s) {
    return s
      .replace(/\\/g, "\\\\")
      .replace(/"/g,  "\\\"")
      .replace(/\0/g, "\\0")
      .replace(/\t/g, "\\t")
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")
      .replace(/[\x00-\x0F]/g,          function(ch) { return "\\x0" + hex(ch); })
      .replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) { return "\\x"  + hex(ch); });
  }

  function classEscape(s) {
    return s
      .replace(/\\/g, "\\\\")
      .replace(/\]/g, "\\]")
      .replace(/\^/g, "\\^")
      .replace(/-/g,  "\\-")
      .replace(/\0/g, "\\0")
      .replace(/\t/g, "\\t")
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")
      .replace(/[\x00-\x0F]/g,          function(ch) { return "\\x0" + hex(ch); })
      .replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) { return "\\x"  + hex(ch); });
  }

  function describeExpectation(expectation) {
    return DESCRIBE_EXPECTATION_FNS[expectation.type](expectation);
  }

  function describeExpected(expected) {
    var descriptions = expected.map(describeExpectation);
    var i, j;

    descriptions.sort();

    if (descriptions.length > 0) {
      for (i = 1, j = 1; i < descriptions.length; i++) {
        if (descriptions[i - 1] !== descriptions[i]) {
          descriptions[j] = descriptions[i];
          j++;
        }
      }
      descriptions.length = j;
    }

    switch (descriptions.length) {
      case 1:
        return descriptions[0];

      case 2:
        return descriptions[0] + " or " + descriptions[1];

      default:
        return descriptions.slice(0, -1).join(", ")
          + ", or "
          + descriptions[descriptions.length - 1];
    }
  }

  function describeFound(found) {
    return found ? "\"" + literalEscape(found) + "\"" : "end of input";
  }

  return "Expected " + describeExpected(expected) + " but " + describeFound(found) + " found.";
};

function peg$parse(input, options) {
  options = options !== undefined ? options : {};

  var peg$FAILED = {};
  var peg$source = options.grammarSource;

  var peg$startRuleFunctions = { pgn: peg$parsepgn };
  var peg$startRuleFunction = peg$parsepgn;

  var peg$c0 = "[";
  var peg$c1 = "\"";
  var peg$c2 = "]";
  var peg$c3 = ".";
  var peg$c4 = "O-O-O";
  var peg$c5 = "O-O";
  var peg$c6 = "0-0-0";
  var peg$c7 = "0-0";
  var peg$c8 = "$";
  var peg$c9 = "{";
  var peg$c10 = "}";
  var peg$c11 = ";";
  var peg$c12 = "(";
  var peg$c13 = ")";
  var peg$c14 = "1-0";
  var peg$c15 = "0-1";
  var peg$c16 = "1/2-1/2";
  var peg$c17 = "*";

  var peg$r0 = /^[a-zA-Z]/;
  var peg$r1 = /^[^"]/;
  var peg$r2 = /^[0-9]/;
  var peg$r3 = /^[.]/;
  var peg$r4 = /^[a-zA-Z1-8\-=]/;
  var peg$r5 = /^[+#]/;
  var peg$r6 = /^[!?]/;
  var peg$r7 = /^[^}]/;
  var peg$r8 = /^[^\r\n]/;
  var peg$r9 = /^[ \t\r\n]/;

  var peg$e0 = peg$otherExpectation("tag pair");
  var peg$e1 = peg$literalExpectation("[", false);
  var peg$e2 = peg$literalExpectation("\"", false);
  var peg$e3 = peg$literalExpectation("]", false);
  var peg$e4 = peg$otherExpectation("tag name");
  var peg$e5 = peg$classExpectation([["a", "z"], ["A", "Z"]], false, false);
  var peg$e6 = peg$otherExpectation("tag value");
  var peg$e7 = peg$classExpectation(["\""], true, false);
  var peg$e8 = peg$otherExpectation("move number");
  var peg$e9 = peg$classExpectation([["0", "9"]], false, false);
  var peg$e10 = peg$literalExpectation(".", false);
  var peg$e11 = peg$classExpectation(["."], false, false);
  var peg$e12 = peg$otherExpectation("standard algebraic notation");
  var peg$e13 = peg$literalExpectation("O-O-O", false);
  var peg$e14 = peg$literalExpectation("O-O", false);
  var peg$e15 = peg$literalExpectation("0-0-0", false);
  var peg$e16 = peg$literalExpectation("0-0", false);
  var peg$e17 = peg$classExpectation([["a", "z"], ["A", "Z"], ["1", "8"], "-", "="], false, false);
  var peg$e18 = peg$classExpectation(["+", "#"], false, false);
  var peg$e19 = peg$otherExpectation("suffix annotation");
  var peg$e20 = peg$classExpectation(["!", "?"], false, false);
  var peg$e21 = peg$otherExpectation("NAG");
  var peg$e22 = peg$literalExpectation("$", false);
  var peg$e23 = peg$otherExpectation("brace comment");
  var peg$e24 = peg$literalExpectation("{", false);
  var peg$e25 = peg$classExpectation(["}"], true, false);
  var peg$e26 = peg$literalExpectation("}", false);
  var peg$e27 = peg$otherExpectation("rest of line comment");
  var peg$e28 = peg$literalExpectation(";", false);
  var peg$e29 = peg$classExpectation(["\r", "\n"], true, false);
  var peg$e30 = peg$otherExpectation("variation");
  var peg$e31 = peg$literalExpectation("(", false);
  var peg$e32 = peg$literalExpectation(")", false);
  var peg$e33 = peg$otherExpectation("game termination marker");
  var peg$e34 = peg$literalExpectation("1-0", false);
  var peg$e35 = peg$literalExpectation("0-1", false);
  var peg$e36 = peg$literalExpectation("1/2-1/2", false);
  var peg$e37 = peg$literalExpectation("*", false);
  var peg$e38 = peg$otherExpectation("whitespace");
  var peg$e39 = peg$classExpectation([" ", "\t", "\r", "\n"], false, false);

  var peg$f0 = function(headers, game) { return pgn(headers, game) };
  var peg$f1 = function(tagPairs) { return Object.fromEntries(tagPairs) };
  var peg$f2 = function(tagName, tagValue) { return [tagName, tagValue] };
  var peg$f3 = function(root, marker) { return { root, marker} };
  var peg$f4 = function(comment, moves) { return lineToTree(rootNode(comment), ...moves.flat()) };
  var peg$f5 = function(san, suffix, nag, comment, variations) { return node(san, suffix, nag, comment, variations) };
  var peg$f6 = function(nag) { return nag };
  var peg$f7 = function(comment) { return comment.replace(/[\r\n]+/g, " ") };
  var peg$f8 = function(comment) { return comment.trim() };
  var peg$f9 = function(line) { return line };
  var peg$f10 = function(result, comment) { return { result, comment } };
  var peg$currPos = options.peg$currPos | 0;
  var peg$posDetailsCache = [{ line: 1, column: 1 }];
  var peg$maxFailPos = peg$currPos;
  var peg$maxFailExpected = options.peg$maxFailExpected || [];
  var peg$silentFails = options.peg$silentFails | 0;

  var peg$result;

  if (options.startRule) {
    if (!(options.startRule in peg$startRuleFunctions)) {
      throw new Error("Can't start parsing from rule \"" + options.startRule + "\".");
    }

    peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
  }

  function peg$literalExpectation(text, ignoreCase) {
    return { type: "literal", text: text, ignoreCase: ignoreCase };
  }

  function peg$classExpectation(parts, inverted, ignoreCase) {
    return { type: "class", parts: parts, inverted: inverted, ignoreCase: ignoreCase };
  }

  function peg$endExpectation() {
    return { type: "end" };
  }

  function peg$otherExpectation(description) {
    return { type: "other", description: description };
  }

  function peg$computePosDetails(pos) {
    var details = peg$posDetailsCache[pos];
    var p;

    if (details) {
      return details;
    } else {
      if (pos >= peg$posDetailsCache.length) {
        p = peg$posDetailsCache.length - 1;
      } else {
        p = pos;
        while (!peg$posDetailsCache[--p]) {}
      }

      details = peg$posDetailsCache[p];
      details = {
        line: details.line,
        column: details.column
      };

      while (p < pos) {
        if (input.charCodeAt(p) === 10) {
          details.line++;
          details.column = 1;
        } else {
          details.column++;
        }

        p++;
      }

      peg$posDetailsCache[pos] = details;

      return details;
    }
  }

  function peg$computeLocation(startPos, endPos, offset) {
    var startPosDetails = peg$computePosDetails(startPos);
    var endPosDetails = peg$computePosDetails(endPos);

    var res = {
      source: peg$source,
      start: {
        offset: startPos,
        line: startPosDetails.line,
        column: startPosDetails.column
      },
      end: {
        offset: endPos,
        line: endPosDetails.line,
        column: endPosDetails.column
      }
    };
    return res;
  }

  function peg$fail(expected) {
    if (peg$currPos < peg$maxFailPos) { return; }

    if (peg$currPos > peg$maxFailPos) {
      peg$maxFailPos = peg$currPos;
      peg$maxFailExpected = [];
    }

    peg$maxFailExpected.push(expected);
  }

  function peg$buildStructuredError(expected, found, location) {
    return new peg$SyntaxError(
      peg$SyntaxError.buildMessage(expected, found),
      expected,
      found,
      location
    );
  }

  function peg$parsepgn() {
    var s0, s1, s2;

    s0 = peg$currPos;
    s1 = peg$parsetagPairSection();
    s2 = peg$parsemoveTextSection();
    s0 = peg$f0(s1, s2);

    return s0;
  }

  function peg$parsetagPairSection() {
    var s0, s1, s2;

    s0 = peg$currPos;
    s1 = [];
    s2 = peg$parsetagPair();
    while (s2 !== peg$FAILED) {
      s1.push(s2);
      s2 = peg$parsetagPair();
    }
    s2 = peg$parse_();
    s0 = peg$f1(s1);

    return s0;
  }

  function peg$parsetagPair() {
    var s0, s2, s4, s6, s7, s8, s10;

    peg$silentFails++;
    s0 = peg$currPos;
    peg$parse_();
    if (input.charCodeAt(peg$currPos) === 91) {
      s2 = peg$c0;
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e1); }
    }
    if (s2 !== peg$FAILED) {
      peg$parse_();
      s4 = peg$parsetagName();
      if (s4 !== peg$FAILED) {
        peg$parse_();
        if (input.charCodeAt(peg$currPos) === 34) {
          s6 = peg$c1;
          peg$currPos++;
        } else {
          s6 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e2); }
        }
        if (s6 !== peg$FAILED) {
          s7 = peg$parsetagValue();
          if (input.charCodeAt(peg$currPos) === 34) {
            s8 = peg$c1;
            peg$currPos++;
          } else {
            s8 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$e2); }
          }
          if (s8 !== peg$FAILED) {
            peg$parse_();
            if (input.charCodeAt(peg$currPos) === 93) {
              s10 = peg$c2;
              peg$currPos++;
            } else {
              s10 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$e3); }
            }
            if (s10 !== peg$FAILED) {
              s0 = peg$f2(s4, s7);
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      if (peg$silentFails === 0) { peg$fail(peg$e0); }
    }

    return s0;
  }

  function peg$parsetagName() {
    var s0, s1, s2;

    peg$silentFails++;
    s0 = peg$currPos;
    s1 = [];
    s2 = input.charAt(peg$currPos);
    if (peg$r0.test(s2)) {
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e5); }
    }
    if (s2 !== peg$FAILED) {
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        s2 = input.charAt(peg$currPos);
        if (peg$r0.test(s2)) {
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e5); }
        }
      }
    } else {
      s1 = peg$FAILED;
    }
    if (s1 !== peg$FAILED) {
      s0 = input.substring(s0, peg$currPos);
    } else {
      s0 = s1;
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e4); }
    }

    return s0;
  }

  function peg$parsetagValue() {
    var s0, s1, s2;

    peg$silentFails++;
    s0 = peg$currPos;
    s1 = [];
    s2 = input.charAt(peg$currPos);
    if (peg$r1.test(s2)) {
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e7); }
    }
    while (s2 !== peg$FAILED) {
      s1.push(s2);
      s2 = input.charAt(peg$currPos);
      if (peg$r1.test(s2)) {
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e7); }
      }
    }
    s0 = input.substring(s0, peg$currPos);
    peg$silentFails--;
    s1 = peg$FAILED;
    if (peg$silentFails === 0) { peg$fail(peg$e6); }

    return s0;
  }

  function peg$parsemoveTextSection() {
    var s0, s1, s3;

    s0 = peg$currPos;
    s1 = peg$parseline();
    peg$parse_();
    s3 = peg$parsegameTerminationMarker();
    if (s3 === peg$FAILED) {
      s3 = null;
    }
    peg$parse_();
    s0 = peg$f3(s1, s3);

    return s0;
  }

  function peg$parseline() {
    var s0, s1, s2, s3;

    s0 = peg$currPos;
    s1 = peg$parsecomment();
    if (s1 === peg$FAILED) {
      s1 = null;
    }
    s2 = [];
    s3 = peg$parsemove();
    while (s3 !== peg$FAILED) {
      s2.push(s3);
      s3 = peg$parsemove();
    }
    s0 = peg$f4(s1, s2);

    return s0;
  }

  function peg$parsemove() {
    var s0, s4, s5, s6, s7, s8, s9, s10;

    s0 = peg$currPos;
    peg$parse_();
    peg$parsemoveNumber();
    peg$parse_();
    s4 = peg$parsesan();
    if (s4 !== peg$FAILED) {
      s5 = peg$parsesuffixAnnotation();
      if (s5 === peg$FAILED) {
        s5 = null;
      }
      s6 = [];
      s7 = peg$parsenag();
      while (s7 !== peg$FAILED) {
        s6.push(s7);
        s7 = peg$parsenag();
      }
      s7 = peg$parse_();
      s8 = peg$parsecomment();
      if (s8 === peg$FAILED) {
        s8 = null;
      }
      s9 = [];
      s10 = peg$parsevariation();
      while (s10 !== peg$FAILED) {
        s9.push(s10);
        s10 = peg$parsevariation();
      }
      s0 = peg$f5(s4, s5, s6, s8, s9);
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parsemoveNumber() {
    var s0, s1, s2, s3, s4, s5;

    peg$silentFails++;
    s0 = peg$currPos;
    s1 = [];
    s2 = input.charAt(peg$currPos);
    if (peg$r2.test(s2)) {
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e9); }
    }
    while (s2 !== peg$FAILED) {
      s1.push(s2);
      s2 = input.charAt(peg$currPos);
      if (peg$r2.test(s2)) {
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e9); }
      }
    }
    if (input.charCodeAt(peg$currPos) === 46) {
      s2 = peg$c3;
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e10); }
    }
    if (s2 !== peg$FAILED) {
      s3 = peg$parse_();
      s4 = [];
      s5 = input.charAt(peg$currPos);
      if (peg$r3.test(s5)) {
        peg$currPos++;
      } else {
        s5 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e11); }
      }
      while (s5 !== peg$FAILED) {
        s4.push(s5);
        s5 = input.charAt(peg$currPos);
        if (peg$r3.test(s5)) {
          peg$currPos++;
        } else {
          s5 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e11); }
        }
      }
      s1 = [s1, s2, s3, s4];
      s0 = s1;
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e8); }
    }

    return s0;
  }

  function peg$parsesan() {
    var s0, s1, s2, s3, s4, s5;

    peg$silentFails++;
    s0 = peg$currPos;
    s1 = peg$currPos;
    if (input.substr(peg$currPos, 5) === peg$c4) {
      s2 = peg$c4;
      peg$currPos += 5;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e13); }
    }
    if (s2 === peg$FAILED) {
      if (input.substr(peg$currPos, 3) === peg$c5) {
        s2 = peg$c5;
        peg$currPos += 3;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e14); }
      }
      if (s2 === peg$FAILED) {
        if (input.substr(peg$currPos, 5) === peg$c6) {
          s2 = peg$c6;
          peg$currPos += 5;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e15); }
        }
        if (s2 === peg$FAILED) {
          if (input.substr(peg$currPos, 3) === peg$c7) {
            s2 = peg$c7;
            peg$currPos += 3;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$e16); }
          }
          if (s2 === peg$FAILED) {
            s2 = peg$currPos;
            s3 = input.charAt(peg$currPos);
            if (peg$r0.test(s3)) {
              peg$currPos++;
            } else {
              s3 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$e5); }
            }
            if (s3 !== peg$FAILED) {
              s4 = [];
              s5 = input.charAt(peg$currPos);
              if (peg$r4.test(s5)) {
                peg$currPos++;
              } else {
                s5 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$e17); }
              }
              if (s5 !== peg$FAILED) {
                while (s5 !== peg$FAILED) {
                  s4.push(s5);
                  s5 = input.charAt(peg$currPos);
                  if (peg$r4.test(s5)) {
                    peg$currPos++;
                  } else {
                    s5 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$e17); }
                  }
                }
              } else {
                s4 = peg$FAILED;
              }
              if (s4 !== peg$FAILED) {
                s3 = [s3, s4];
                s2 = s3;
              } else {
                peg$currPos = s2;
                s2 = peg$FAILED;
              }
            } else {
              peg$currPos = s2;
              s2 = peg$FAILED;
            }
          }
        }
      }
    }
    if (s2 !== peg$FAILED) {
      s3 = input.charAt(peg$currPos);
      if (peg$r5.test(s3)) {
        peg$currPos++;
      } else {
        s3 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e18); }
      }
      if (s3 === peg$FAILED) {
        s3 = null;
      }
      s2 = [s2, s3];
      s1 = s2;
    } else {
      peg$currPos = s1;
      s1 = peg$FAILED;
    }
    if (s1 !== peg$FAILED) {
      s0 = input.substring(s0, peg$currPos);
    } else {
      s0 = s1;
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e12); }
    }

    return s0;
  }

  function peg$parsesuffixAnnotation() {
    var s0, s1, s2;

    peg$silentFails++;
    s0 = peg$currPos;
    s1 = [];
    s2 = input.charAt(peg$currPos);
    if (peg$r6.test(s2)) {
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e20); }
    }
    while (s2 !== peg$FAILED) {
      s1.push(s2);
      if (s1.length >= 2) {
        s2 = peg$FAILED;
      } else {
        s2 = input.charAt(peg$currPos);
        if (peg$r6.test(s2)) {
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e20); }
        }
      }
    }
    if (s1.length < 1) {
      peg$currPos = s0;
      s0 = peg$FAILED;
    } else {
      s0 = s1;
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e19); }
    }

    return s0;
  }

  function peg$parsenag() {
    var s0, s2, s3, s4, s5;

    peg$silentFails++;
    s0 = peg$currPos;
    peg$parse_();
    if (input.charCodeAt(peg$currPos) === 36) {
      s2 = peg$c8;
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e22); }
    }
    if (s2 !== peg$FAILED) {
      s3 = peg$currPos;
      s4 = [];
      s5 = input.charAt(peg$currPos);
      if (peg$r2.test(s5)) {
        peg$currPos++;
      } else {
        s5 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e9); }
      }
      if (s5 !== peg$FAILED) {
        while (s5 !== peg$FAILED) {
          s4.push(s5);
          s5 = input.charAt(peg$currPos);
          if (peg$r2.test(s5)) {
            peg$currPos++;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$e9); }
          }
        }
      } else {
        s4 = peg$FAILED;
      }
      if (s4 !== peg$FAILED) {
        s3 = input.substring(s3, peg$currPos);
      } else {
        s3 = s4;
      }
      if (s3 !== peg$FAILED) {
        s0 = peg$f6(s3);
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      if (peg$silentFails === 0) { peg$fail(peg$e21); }
    }

    return s0;
  }

  function peg$parsecomment() {
    var s0;

    s0 = peg$parsebraceComment();
    if (s0 === peg$FAILED) {
      s0 = peg$parserestOfLineComment();
    }

    return s0;
  }

  function peg$parsebraceComment() {
    var s0, s1, s2, s3, s4;

    peg$silentFails++;
    s0 = peg$currPos;
    if (input.charCodeAt(peg$currPos) === 123) {
      s1 = peg$c9;
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e24); }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$currPos;
      s3 = [];
      s4 = input.charAt(peg$currPos);
      if (peg$r7.test(s4)) {
        peg$currPos++;
      } else {
        s4 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e25); }
      }
      while (s4 !== peg$FAILED) {
        s3.push(s4);
        s4 = input.charAt(peg$currPos);
        if (peg$r7.test(s4)) {
          peg$currPos++;
        } else {
          s4 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e25); }
        }
      }
      s2 = input.substring(s2, peg$currPos);
      if (input.charCodeAt(peg$currPos) === 125) {
        s3 = peg$c10;
        peg$currPos++;
      } else {
        s3 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e26); }
      }
      if (s3 !== peg$FAILED) {
        s0 = peg$f7(s2);
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e23); }
    }

    return s0;
  }

  function peg$parserestOfLineComment() {
    var s0, s1, s2, s3, s4;

    peg$silentFails++;
    s0 = peg$currPos;
    if (input.charCodeAt(peg$currPos) === 59) {
      s1 = peg$c11;
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e28); }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$currPos;
      s3 = [];
      s4 = input.charAt(peg$currPos);
      if (peg$r8.test(s4)) {
        peg$currPos++;
      } else {
        s4 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e29); }
      }
      while (s4 !== peg$FAILED) {
        s3.push(s4);
        s4 = input.charAt(peg$currPos);
        if (peg$r8.test(s4)) {
          peg$currPos++;
        } else {
          s4 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e29); }
        }
      }
      s2 = input.substring(s2, peg$currPos);
      s0 = peg$f8(s2);
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e27); }
    }

    return s0;
  }

  function peg$parsevariation() {
    var s0, s2, s3, s5;

    peg$silentFails++;
    s0 = peg$currPos;
    peg$parse_();
    if (input.charCodeAt(peg$currPos) === 40) {
      s2 = peg$c12;
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e31); }
    }
    if (s2 !== peg$FAILED) {
      s3 = peg$parseline();
      if (s3 !== peg$FAILED) {
        peg$parse_();
        if (input.charCodeAt(peg$currPos) === 41) {
          s5 = peg$c13;
          peg$currPos++;
        } else {
          s5 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e32); }
        }
        if (s5 !== peg$FAILED) {
          s0 = peg$f9(s3);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      if (peg$silentFails === 0) { peg$fail(peg$e30); }
    }

    return s0;
  }

  function peg$parsegameTerminationMarker() {
    var s0, s1, s3;

    peg$silentFails++;
    s0 = peg$currPos;
    if (input.substr(peg$currPos, 3) === peg$c14) {
      s1 = peg$c14;
      peg$currPos += 3;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e34); }
    }
    if (s1 === peg$FAILED) {
      if (input.substr(peg$currPos, 3) === peg$c15) {
        s1 = peg$c15;
        peg$currPos += 3;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e35); }
      }
      if (s1 === peg$FAILED) {
        if (input.substr(peg$currPos, 7) === peg$c16) {
          s1 = peg$c16;
          peg$currPos += 7;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e36); }
        }
        if (s1 === peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 42) {
            s1 = peg$c17;
            peg$currPos++;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$e37); }
          }
        }
      }
    }
    if (s1 !== peg$FAILED) {
      peg$parse_();
      s3 = peg$parsecomment();
      if (s3 === peg$FAILED) {
        s3 = null;
      }
      s0 = peg$f10(s1, s3);
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e33); }
    }

    return s0;
  }

  function peg$parse_() {
    var s0, s1;

    peg$silentFails++;
    s0 = [];
    s1 = input.charAt(peg$currPos);
    if (peg$r9.test(s1)) {
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e39); }
    }
    while (s1 !== peg$FAILED) {
      s0.push(s1);
      s1 = input.charAt(peg$currPos);
      if (peg$r9.test(s1)) {
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e39); }
      }
    }
    peg$silentFails--;
    s1 = peg$FAILED;
    if (peg$silentFails === 0) { peg$fail(peg$e38); }

    return s0;
  }

  peg$result = peg$startRuleFunction();

  if (options.peg$library) {
    return /** @type {any} */ ({
      peg$result,
      peg$currPos,
      peg$FAILED,
      peg$maxFailExpected,
      peg$maxFailPos
    });
  }
  if (peg$result !== peg$FAILED && peg$currPos === input.length) {
    return peg$result;
  } else {
    if (peg$result !== peg$FAILED && peg$currPos < input.length) {
      peg$fail(peg$endExpectation());
    }

    throw peg$buildStructuredError(
      peg$maxFailExpected,
      peg$maxFailPos < input.length ? input.charAt(peg$maxFailPos) : null,
      peg$maxFailPos < input.length
        ? peg$computeLocation(peg$maxFailPos, peg$maxFailPos + 1)
        : peg$computeLocation(peg$maxFailPos, peg$maxFailPos)
    );
  }
}

/**
 * @license
 * Copyright (c) 2025, Jeff Hlywa (jhlywa@gmail.com)
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice,
 *    this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */
const MASK64 = 0xffffffffffffffffn;
function rotl(x, k) {
    return ((x << k) | (x >> (64n - k))) & 0xffffffffffffffffn;
}
function wrappingMul(x, y) {
    return (x * y) & MASK64;
}
// xoroshiro128**
function xoroshiro128(state) {
    return function () {
        let s0 = BigInt(state & MASK64);
        let s1 = BigInt((state >> 64n) & MASK64);
        const result = wrappingMul(rotl(wrappingMul(s0, 5n), 7n), 9n);
        s1 ^= s0;
        s0 = (rotl(s0, 24n) ^ s1 ^ (s1 << 16n)) & MASK64;
        s1 = rotl(s1, 37n);
        state = (s1 << 64n) | s0;
        return result;
    };
}
const rand = xoroshiro128(0xa187eb39cdcaed8f31c4b365b102e01en);
const PIECE_KEYS = Array.from({ length: 2 }, () => Array.from({ length: 6 }, () => Array.from({ length: 128 }, () => rand())));
const EP_KEYS = Array.from({ length: 8 }, () => rand());
const CASTLING_KEYS = Array.from({ length: 16 }, () => rand());
const SIDE_KEY = rand();
const WHITE = 'w';
const BLACK = 'b';
const PAWN = 'p';
const KNIGHT = 'n';
const BISHOP = 'b';
const ROOK = 'r';
const QUEEN = 'q';
const KING = 'k';
const DEFAULT_POSITION = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
class Move {
    color;
    from;
    to;
    piece;
    captured;
    promotion;
    /**
     * @deprecated This field is deprecated and will be removed in version 2.0.0.
     * Please use move descriptor functions instead: `isCapture`, `isPromotion`,
     * `isEnPassant`, `isKingsideCastle`, `isQueensideCastle`, `isCastle`, and
     * `isBigPawn`
     */
    flags;
    san;
    lan;
    before;
    after;
    constructor(chess, internal) {
        const { color, piece, from, to, flags, captured, promotion } = internal;
        const fromAlgebraic = algebraic(from);
        const toAlgebraic = algebraic(to);
        this.color = color;
        this.piece = piece;
        this.from = fromAlgebraic;
        this.to = toAlgebraic;
        /*
         * HACK: The chess['_method']() calls below invoke private methods in the
         * Chess class to generate SAN and FEN. It's a bit of a hack, but makes the
         * code cleaner elsewhere.
         */
        this.san = chess['_moveToSan'](internal, chess['_moves']({ legal: true }));
        this.lan = fromAlgebraic + toAlgebraic;
        this.before = chess.fen();
        // Generate the FEN for the 'after' key
        chess['_makeMove'](internal);
        this.after = chess.fen();
        chess['_undoMove']();
        // Build the text representation of the move flags
        this.flags = '';
        for (const flag in BITS) {
            if (BITS[flag] & flags) {
                this.flags += FLAGS[flag];
            }
        }
        if (captured) {
            this.captured = captured;
        }
        if (promotion) {
            this.promotion = promotion;
            this.lan += promotion;
        }
    }
    isCapture() {
        return this.flags.indexOf(FLAGS['CAPTURE']) > -1;
    }
    isPromotion() {
        return this.flags.indexOf(FLAGS['PROMOTION']) > -1;
    }
    isEnPassant() {
        return this.flags.indexOf(FLAGS['EP_CAPTURE']) > -1;
    }
    isKingsideCastle() {
        return this.flags.indexOf(FLAGS['KSIDE_CASTLE']) > -1;
    }
    isQueensideCastle() {
        return this.flags.indexOf(FLAGS['QSIDE_CASTLE']) > -1;
    }
    isBigPawn() {
        return this.flags.indexOf(FLAGS['BIG_PAWN']) > -1;
    }
}
const EMPTY = -1;
const FLAGS = {
    NORMAL: 'n',
    CAPTURE: 'c',
    BIG_PAWN: 'b',
    EP_CAPTURE: 'e',
    PROMOTION: 'p',
    KSIDE_CASTLE: 'k',
    QSIDE_CASTLE: 'q',
    NULL_MOVE: '-',
};
// prettier-ignore
const SQUARES = [
    'a8', 'b8', 'c8', 'd8', 'e8', 'f8', 'g8', 'h8',
    'a7', 'b7', 'c7', 'd7', 'e7', 'f7', 'g7', 'h7',
    'a6', 'b6', 'c6', 'd6', 'e6', 'f6', 'g6', 'h6',
    'a5', 'b5', 'c5', 'd5', 'e5', 'f5', 'g5', 'h5',
    'a4', 'b4', 'c4', 'd4', 'e4', 'f4', 'g4', 'h4',
    'a3', 'b3', 'c3', 'd3', 'e3', 'f3', 'g3', 'h3',
    'a2', 'b2', 'c2', 'd2', 'e2', 'f2', 'g2', 'h2',
    'a1', 'b1', 'c1', 'd1', 'e1', 'f1', 'g1', 'h1'
];
const BITS = {
    NORMAL: 1,
    CAPTURE: 2,
    BIG_PAWN: 4,
    EP_CAPTURE: 8,
    PROMOTION: 16,
    KSIDE_CASTLE: 32,
    QSIDE_CASTLE: 64,
    NULL_MOVE: 128,
};
/* eslint-disable @typescript-eslint/naming-convention */
// these are required, according to spec
const SEVEN_TAG_ROSTER = {
    Event: '?',
    Site: '?',
    Date: '????.??.??',
    Round: '?',
    White: '?',
    Black: '?',
    Result: '*',
};
/**
 * These nulls are placeholders to fix the order of tags (as they appear in PGN spec); null values will be
 * eliminated in getHeaders()
 */
const SUPLEMENTAL_TAGS = {
    WhiteTitle: null,
    BlackTitle: null,
    WhiteElo: null,
    BlackElo: null,
    WhiteUSCF: null,
    BlackUSCF: null,
    WhiteNA: null,
    BlackNA: null,
    WhiteType: null,
    BlackType: null,
    EventDate: null,
    EventSponsor: null,
    Section: null,
    Stage: null,
    Board: null,
    Opening: null,
    Variation: null,
    SubVariation: null,
    ECO: null,
    NIC: null,
    Time: null,
    UTCTime: null,
    UTCDate: null,
    TimeControl: null,
    SetUp: null,
    FEN: null,
    Termination: null,
    Annotator: null,
    Mode: null,
    PlyCount: null,
};
const HEADER_TEMPLATE = {
    ...SEVEN_TAG_ROSTER,
    ...SUPLEMENTAL_TAGS,
};
/* eslint-enable @typescript-eslint/naming-convention */
/*
 * NOTES ABOUT 0x88 MOVE GENERATION ALGORITHM
 * ----------------------------------------------------------------------------
 * From https://github.com/jhlywa/chess.js/issues/230
 *
 * A lot of people are confused when they first see the internal representation
 * of chess.js. It uses the 0x88 Move Generation Algorithm which internally
 * stores the board as an 8x16 array. This is purely for efficiency but has a
 * couple of interesting benefits:
 *
 * 1. 0x88 offers a very inexpensive "off the board" check. Bitwise AND (&) any
 *    square with 0x88, if the result is non-zero then the square is off the
 *    board. For example, assuming a knight square A8 (0 in 0x88 notation),
 *    there are 8 possible directions in which the knight can move. These
 *    directions are relative to the 8x16 board and are stored in the
 *    PIECE_OFFSETS map. One possible move is A8 - 18 (up one square, and two
 *    squares to the left - which is off the board). 0 - 18 = -18 & 0x88 = 0x88
 *    (because of two-complement representation of -18). The non-zero result
 *    means the square is off the board and the move is illegal. Take the
 *    opposite move (from A8 to C7), 0 + 18 = 18 & 0x88 = 0. A result of zero
 *    means the square is on the board.
 *
 * 2. The relative distance (or difference) between two squares on a 8x16 board
 *    is unique and can be used to inexpensively determine if a piece on a
 *    square can attack any other arbitrary square. For example, let's see if a
 *    pawn on E7 can attack E2. The difference between E7 (20) - E2 (100) is
 *    -80. We add 119 to make the ATTACKS array index non-negative (because the
 *    worst case difference is A8 - H1 = -119). The ATTACKS array contains a
 *    bitmask of pieces that can attack from that distance and direction.
 *    ATTACKS[-80 + 119=39] gives us 24 or 0b11000 in binary. Look at the
 *    PIECE_MASKS map to determine the mask for a given piece type. In our pawn
 *    example, we would check to see if 24 & 0x1 is non-zero, which it is
 *    not. So, naturally, a pawn on E7 can't attack a piece on E2. However, a
 *    rook can since 24 & 0x8 is non-zero. The only thing left to check is that
 *    there are no blocking pieces between E7 and E2. That's where the RAYS
 *    array comes in. It provides an offset (in this case 16) to add to E7 (20)
 *    to check for blocking pieces. E7 (20) + 16 = E6 (36) + 16 = E5 (52) etc.
 */
// prettier-ignore
// eslint-disable-next-line
const Ox88 = {
    a8: 0, b8: 1, c8: 2, d8: 3, e8: 4, f8: 5, g8: 6, h8: 7,
    a7: 16, b7: 17, c7: 18, d7: 19, e7: 20, f7: 21, g7: 22, h7: 23,
    a6: 32, b6: 33, c6: 34, d6: 35, e6: 36, f6: 37, g6: 38, h6: 39,
    a5: 48, b5: 49, c5: 50, d5: 51, e5: 52, f5: 53, g5: 54, h5: 55,
    a4: 64, b4: 65, c4: 66, d4: 67, e4: 68, f4: 69, g4: 70, h4: 71,
    a3: 80, b3: 81, c3: 82, d3: 83, e3: 84, f3: 85, g3: 86, h3: 87,
    a2: 96, b2: 97, c2: 98, d2: 99, e2: 100, f2: 101, g2: 102, h2: 103,
    a1: 112, b1: 113, c1: 114, d1: 115, e1: 116, f1: 117, g1: 118, h1: 119
};
const PAWN_OFFSETS = {
    b: [16, 32, 17, 15],
    w: [-16, -32, -17, -15],
};
const PIECE_OFFSETS = {
    n: [-18, -33, -31, -14, 18, 33, 31, 14],
    b: [-17, -15, 17, 15],
    r: [-16, 1, 16, -1],
    q: [-17, -16, -15, 1, 17, 16, 15, -1],
    k: [-17, -16, -15, 1, 17, 16, 15, -1],
};
// prettier-ignore
const ATTACKS = [
    20, 0, 0, 0, 0, 0, 0, 24, 0, 0, 0, 0, 0, 0, 20, 0,
    0, 20, 0, 0, 0, 0, 0, 24, 0, 0, 0, 0, 0, 20, 0, 0,
    0, 0, 20, 0, 0, 0, 0, 24, 0, 0, 0, 0, 20, 0, 0, 0,
    0, 0, 0, 20, 0, 0, 0, 24, 0, 0, 0, 20, 0, 0, 0, 0,
    0, 0, 0, 0, 20, 0, 0, 24, 0, 0, 20, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 20, 2, 24, 2, 20, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 2, 53, 56, 53, 2, 0, 0, 0, 0, 0, 0,
    24, 24, 24, 24, 24, 24, 56, 0, 56, 24, 24, 24, 24, 24, 24, 0,
    0, 0, 0, 0, 0, 2, 53, 56, 53, 2, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 20, 2, 24, 2, 20, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 20, 0, 0, 24, 0, 0, 20, 0, 0, 0, 0, 0,
    0, 0, 0, 20, 0, 0, 0, 24, 0, 0, 0, 20, 0, 0, 0, 0,
    0, 0, 20, 0, 0, 0, 0, 24, 0, 0, 0, 0, 20, 0, 0, 0,
    0, 20, 0, 0, 0, 0, 0, 24, 0, 0, 0, 0, 0, 20, 0, 0,
    20, 0, 0, 0, 0, 0, 0, 24, 0, 0, 0, 0, 0, 0, 20
];
// prettier-ignore
const RAYS = [
    17, 0, 0, 0, 0, 0, 0, 16, 0, 0, 0, 0, 0, 0, 15, 0,
    0, 17, 0, 0, 0, 0, 0, 16, 0, 0, 0, 0, 0, 15, 0, 0,
    0, 0, 17, 0, 0, 0, 0, 16, 0, 0, 0, 0, 15, 0, 0, 0,
    0, 0, 0, 17, 0, 0, 0, 16, 0, 0, 0, 15, 0, 0, 0, 0,
    0, 0, 0, 0, 17, 0, 0, 16, 0, 0, 15, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 17, 0, 16, 0, 15, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 17, 16, 15, 0, 0, 0, 0, 0, 0, 0,
    1, 1, 1, 1, 1, 1, 1, 0, -1, -1, -1, -1, -1, -1, -1, 0,
    0, 0, 0, 0, 0, 0, -15, -16, -17, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, -15, 0, -16, 0, -17, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, -15, 0, 0, -16, 0, 0, -17, 0, 0, 0, 0, 0,
    0, 0, 0, -15, 0, 0, 0, -16, 0, 0, 0, -17, 0, 0, 0, 0,
    0, 0, -15, 0, 0, 0, 0, -16, 0, 0, 0, 0, -17, 0, 0, 0,
    0, -15, 0, 0, 0, 0, 0, -16, 0, 0, 0, 0, 0, -17, 0, 0,
    -15, 0, 0, 0, 0, 0, 0, -16, 0, 0, 0, 0, 0, 0, -17
];
const PIECE_MASKS = { p: 0x1, n: 0x2, b: 0x4, r: 0x8, q: 0x10, k: 0x20 };
const SYMBOLS = 'pnbrqkPNBRQK';
const PROMOTIONS = [KNIGHT, BISHOP, ROOK, QUEEN];
const RANK_1 = 7;
const RANK_2 = 6;
/*
 * const RANK_3 = 5
 * const RANK_4 = 4
 * const RANK_5 = 3
 * const RANK_6 = 2
 */
const RANK_7 = 1;
const RANK_8 = 0;
const SIDES = {
    [KING]: BITS.KSIDE_CASTLE,
    [QUEEN]: BITS.QSIDE_CASTLE,
};
const ROOKS = {
    w: [
        { square: Ox88.a1, flag: BITS.QSIDE_CASTLE },
        { square: Ox88.h1, flag: BITS.KSIDE_CASTLE },
    ],
    b: [
        { square: Ox88.a8, flag: BITS.QSIDE_CASTLE },
        { square: Ox88.h8, flag: BITS.KSIDE_CASTLE },
    ],
};
const SECOND_RANK = { b: RANK_7, w: RANK_2 };
const SAN_NULLMOVE = '--';
// Extracts the zero-based rank of an 0x88 square.
function rank(square) {
    return square >> 4;
}
// Extracts the zero-based file of an 0x88 square.
function file(square) {
    return square & 0xf;
}
function isDigit(c) {
    return '0123456789'.indexOf(c) !== -1;
}
// Converts a 0x88 square to algebraic notation.
function algebraic(square) {
    const f = file(square);
    const r = rank(square);
    return ('abcdefgh'.substring(f, f + 1) +
        '87654321'.substring(r, r + 1));
}
function swapColor(color) {
    return color === WHITE ? BLACK : WHITE;
}
function validateFen(fen) {
    // 1st criterion: 6 space-seperated fields?
    const tokens = fen.split(/\s+/);
    if (tokens.length !== 6) {
        return {
            ok: false,
            error: 'Invalid FEN: must contain six space-delimited fields',
        };
    }
    // 2nd criterion: move number field is a integer value > 0?
    const moveNumber = parseInt(tokens[5], 10);
    if (isNaN(moveNumber) || moveNumber <= 0) {
        return {
            ok: false,
            error: 'Invalid FEN: move number must be a positive integer',
        };
    }
    // 3rd criterion: half move counter is an integer >= 0?
    const halfMoves = parseInt(tokens[4], 10);
    if (isNaN(halfMoves) || halfMoves < 0) {
        return {
            ok: false,
            error: 'Invalid FEN: half move counter number must be a non-negative integer',
        };
    }
    // 4th criterion: 4th field is a valid e.p.-string?
    if (!/^(-|[abcdefgh][36])$/.test(tokens[3])) {
        return { ok: false, error: 'Invalid FEN: en-passant square is invalid' };
    }
    // 5th criterion: 3th field is a valid castle-string?
    if (/[^kKqQ-]/.test(tokens[2])) {
        return { ok: false, error: 'Invalid FEN: castling availability is invalid' };
    }
    // 6th criterion: 2nd field is "w" (white) or "b" (black)?
    if (!/^(w|b)$/.test(tokens[1])) {
        return { ok: false, error: 'Invalid FEN: side-to-move is invalid' };
    }
    // 7th criterion: 1st field contains 8 rows?
    const rows = tokens[0].split('/');
    if (rows.length !== 8) {
        return {
            ok: false,
            error: "Invalid FEN: piece data does not contain 8 '/'-delimited rows",
        };
    }
    // 8th criterion: every row is valid?
    for (let i = 0; i < rows.length; i++) {
        // check for right sum of fields AND not two numbers in succession
        let sumFields = 0;
        let previousWasNumber = false;
        for (let k = 0; k < rows[i].length; k++) {
            if (isDigit(rows[i][k])) {
                if (previousWasNumber) {
                    return {
                        ok: false,
                        error: 'Invalid FEN: piece data is invalid (consecutive number)',
                    };
                }
                sumFields += parseInt(rows[i][k], 10);
                previousWasNumber = true;
            }
            else {
                if (!/^[prnbqkPRNBQK]$/.test(rows[i][k])) {
                    return {
                        ok: false,
                        error: 'Invalid FEN: piece data is invalid (invalid piece)',
                    };
                }
                sumFields += 1;
                previousWasNumber = false;
            }
        }
        if (sumFields !== 8) {
            return {
                ok: false,
                error: 'Invalid FEN: piece data is invalid (too many squares in rank)',
            };
        }
    }
    // 9th criterion: is en-passant square legal?
    if ((tokens[3][1] == '3' && tokens[1] == 'w') ||
        (tokens[3][1] == '6' && tokens[1] == 'b')) {
        return { ok: false, error: 'Invalid FEN: illegal en-passant square' };
    }
    // 10th criterion: does chess position contain exact two kings?
    const kings = [
        { color: 'white', regex: /K/g },
        { color: 'black', regex: /k/g },
    ];
    for (const { color, regex } of kings) {
        if (!regex.test(tokens[0])) {
            return { ok: false, error: `Invalid FEN: missing ${color} king` };
        }
        if ((tokens[0].match(regex) || []).length > 1) {
            return { ok: false, error: `Invalid FEN: too many ${color} kings` };
        }
    }
    // 11th criterion: are any pawns on the first or eighth rows?
    if (Array.from(rows[0] + rows[7]).some((char) => char.toUpperCase() === 'P')) {
        return {
            ok: false,
            error: 'Invalid FEN: some pawns are on the edge rows',
        };
    }
    return { ok: true };
}
// this function is used to uniquely identify ambiguous moves
function getDisambiguator(move, moves) {
    const from = move.from;
    const to = move.to;
    const piece = move.piece;
    let ambiguities = 0;
    let sameRank = 0;
    let sameFile = 0;
    for (let i = 0, len = moves.length; i < len; i++) {
        const ambigFrom = moves[i].from;
        const ambigTo = moves[i].to;
        const ambigPiece = moves[i].piece;
        /*
         * if a move of the same piece type ends on the same to square, we'll need
         * to add a disambiguator to the algebraic notation
         */
        if (piece === ambigPiece && from !== ambigFrom && to === ambigTo) {
            ambiguities++;
            if (rank(from) === rank(ambigFrom)) {
                sameRank++;
            }
            if (file(from) === file(ambigFrom)) {
                sameFile++;
            }
        }
    }
    if (ambiguities > 0) {
        if (sameRank > 0 && sameFile > 0) {
            /*
             * if there exists a similar moving piece on the same rank and file as
             * the move in question, use the square as the disambiguator
             */
            return algebraic(from);
        }
        else if (sameFile > 0) {
            /*
             * if the moving piece rests on the same file, use the rank symbol as the
             * disambiguator
             */
            return algebraic(from).charAt(1);
        }
        else {
            // else use the file symbol
            return algebraic(from).charAt(0);
        }
    }
    return '';
}
function addMove(moves, color, from, to, piece, captured = undefined, flags = BITS.NORMAL) {
    const r = rank(to);
    if (piece === PAWN && (r === RANK_1 || r === RANK_8)) {
        for (let i = 0; i < PROMOTIONS.length; i++) {
            const promotion = PROMOTIONS[i];
            moves.push({
                color,
                from,
                to,
                piece,
                captured,
                promotion,
                flags: flags | BITS.PROMOTION,
            });
        }
    }
    else {
        moves.push({
            color,
            from,
            to,
            piece,
            captured,
            flags,
        });
    }
}
function inferPieceType(san) {
    let pieceType = san.charAt(0);
    if (pieceType >= 'a' && pieceType <= 'h') {
        const matches = san.match(/[a-h]\d.*[a-h]\d/);
        if (matches) {
            return undefined;
        }
        return PAWN;
    }
    pieceType = pieceType.toLowerCase();
    if (pieceType === 'o') {
        return KING;
    }
    return pieceType;
}
// parses all of the decorators out of a SAN string
function strippedSan(move) {
    return move.replace(/=/, '').replace(/[+#]?[?!]*$/, '');
}
class Chess {
    _board = new Array(128);
    _turn = WHITE;
    _header = {};
    _kings = { w: EMPTY, b: EMPTY };
    _epSquare = -1;
    _halfMoves = 0;
    _moveNumber = 0;
    _history = [];
    _comments = {};
    _castling = { w: 0, b: 0 };
    _hash = 0n;
    // tracks number of times a position has been seen for repetition checking
    _positionCount = new Map();
    constructor(fen = DEFAULT_POSITION, { skipValidation = false } = {}) {
        this.load(fen, { skipValidation });
    }
    clear({ preserveHeaders = false } = {}) {
        this._board = new Array(128);
        this._kings = { w: EMPTY, b: EMPTY };
        this._turn = WHITE;
        this._castling = { w: 0, b: 0 };
        this._epSquare = EMPTY;
        this._halfMoves = 0;
        this._moveNumber = 1;
        this._history = [];
        this._comments = {};
        this._header = preserveHeaders ? this._header : { ...HEADER_TEMPLATE };
        this._hash = this._computeHash();
        this._positionCount = new Map();
        /*
         * Delete the SetUp and FEN headers (if preserved), the board is empty and
         * these headers don't make sense in this state. They'll get added later
         * via .load() or .put()
         */
        this._header['SetUp'] = null;
        this._header['FEN'] = null;
    }
    load(fen, { skipValidation = false, preserveHeaders = false } = {}) {
        let tokens = fen.split(/\s+/);
        // append commonly omitted fen tokens
        if (tokens.length >= 2 && tokens.length < 6) {
            const adjustments = ['-', '-', '0', '1'];
            fen = tokens.concat(adjustments.slice(-(6 - tokens.length))).join(' ');
        }
        tokens = fen.split(/\s+/);
        if (!skipValidation) {
            const { ok, error } = validateFen(fen);
            if (!ok) {
                throw new Error(error);
            }
        }
        const position = tokens[0];
        let square = 0;
        this.clear({ preserveHeaders });
        for (let i = 0; i < position.length; i++) {
            const piece = position.charAt(i);
            if (piece === '/') {
                square += 8;
            }
            else if (isDigit(piece)) {
                square += parseInt(piece, 10);
            }
            else {
                const color = piece < 'a' ? WHITE : BLACK;
                this._put({ type: piece.toLowerCase(), color }, algebraic(square));
                square++;
            }
        }
        this._turn = tokens[1];
        if (tokens[2].indexOf('K') > -1) {
            this._castling.w |= BITS.KSIDE_CASTLE;
        }
        if (tokens[2].indexOf('Q') > -1) {
            this._castling.w |= BITS.QSIDE_CASTLE;
        }
        if (tokens[2].indexOf('k') > -1) {
            this._castling.b |= BITS.KSIDE_CASTLE;
        }
        if (tokens[2].indexOf('q') > -1) {
            this._castling.b |= BITS.QSIDE_CASTLE;
        }
        this._epSquare = tokens[3] === '-' ? EMPTY : Ox88[tokens[3]];
        this._halfMoves = parseInt(tokens[4], 10);
        this._moveNumber = parseInt(tokens[5], 10);
        this._hash = this._computeHash();
        this._updateSetup(fen);
        this._incPositionCount();
    }
    fen({ forceEnpassantSquare = false, } = {}) {
        let empty = 0;
        let fen = '';
        for (let i = Ox88.a8; i <= Ox88.h1; i++) {
            if (this._board[i]) {
                if (empty > 0) {
                    fen += empty;
                    empty = 0;
                }
                const { color, type: piece } = this._board[i];
                fen += color === WHITE ? piece.toUpperCase() : piece.toLowerCase();
            }
            else {
                empty++;
            }
            if ((i + 1) & 0x88) {
                if (empty > 0) {
                    fen += empty;
                }
                if (i !== Ox88.h1) {
                    fen += '/';
                }
                empty = 0;
                i += 8;
            }
        }
        let castling = '';
        if (this._castling[WHITE] & BITS.KSIDE_CASTLE) {
            castling += 'K';
        }
        if (this._castling[WHITE] & BITS.QSIDE_CASTLE) {
            castling += 'Q';
        }
        if (this._castling[BLACK] & BITS.KSIDE_CASTLE) {
            castling += 'k';
        }
        if (this._castling[BLACK] & BITS.QSIDE_CASTLE) {
            castling += 'q';
        }
        // do we have an empty castling flag?
        castling = castling || '-';
        let epSquare = '-';
        /*
         * only print the ep square if en passant is a valid move (pawn is present
         * and ep capture is not pinned)
         */
        if (this._epSquare !== EMPTY) {
            if (forceEnpassantSquare) {
                epSquare = algebraic(this._epSquare);
            }
            else {
                const bigPawnSquare = this._epSquare + (this._turn === WHITE ? 16 : -16);
                const squares = [bigPawnSquare + 1, bigPawnSquare - 1];
                for (const square of squares) {
                    // is the square off the board?
                    if (square & 0x88) {
                        continue;
                    }
                    const color = this._turn;
                    // is there a pawn that can capture the epSquare?
                    if (this._board[square]?.color === color &&
                        this._board[square]?.type === PAWN) {
                        // if the pawn makes an ep capture, does it leave its king in check?
                        this._makeMove({
                            color,
                            from: square,
                            to: this._epSquare,
                            piece: PAWN,
                            captured: PAWN,
                            flags: BITS.EP_CAPTURE,
                        });
                        const isLegal = !this._isKingAttacked(color);
                        this._undoMove();
                        // if ep is legal, break and set the ep square in the FEN output
                        if (isLegal) {
                            epSquare = algebraic(this._epSquare);
                            break;
                        }
                    }
                }
            }
        }
        return [
            fen,
            this._turn,
            castling,
            epSquare,
            this._halfMoves,
            this._moveNumber,
        ].join(' ');
    }
    _pieceKey(i) {
        if (!this._board[i]) {
            return 0n;
        }
        const { color, type } = this._board[i];
        const colorIndex = {
            w: 0,
            b: 1,
        }[color];
        const typeIndex = {
            p: 0,
            n: 1,
            b: 2,
            r: 3,
            q: 4,
            k: 5,
        }[type];
        return PIECE_KEYS[colorIndex][typeIndex][i];
    }
    _epKey() {
        return this._epSquare === EMPTY ? 0n : EP_KEYS[this._epSquare & 7];
    }
    _castlingKey() {
        const index = (this._castling.w >> 5) | (this._castling.b >> 3);
        return CASTLING_KEYS[index];
    }
    _computeHash() {
        let hash = 0n;
        for (let i = Ox88.a8; i <= Ox88.h1; i++) {
            // did we run off the end of the board
            if (i & 0x88) {
                i += 7;
                continue;
            }
            if (this._board[i]) {
                hash ^= this._pieceKey(i);
            }
        }
        hash ^= this._epKey();
        hash ^= this._castlingKey();
        if (this._turn === 'b') {
            hash ^= SIDE_KEY;
        }
        return hash;
    }
    /*
     * Called when the initial board setup is changed with put() or remove().
     * modifies the SetUp and FEN properties of the header object. If the FEN
     * is equal to the default position, the SetUp and FEN are deleted the setup
     * is only updated if history.length is zero, ie moves haven't been made.
     */
    _updateSetup(fen) {
        if (this._history.length > 0)
            return;
        if (fen !== DEFAULT_POSITION) {
            this._header['SetUp'] = '1';
            this._header['FEN'] = fen;
        }
        else {
            this._header['SetUp'] = null;
            this._header['FEN'] = null;
        }
    }
    reset() {
        this.load(DEFAULT_POSITION);
    }
    get(square) {
        return this._board[Ox88[square]];
    }
    findPiece(piece) {
        const squares = [];
        for (let i = Ox88.a8; i <= Ox88.h1; i++) {
            // did we run off the end of the board
            if (i & 0x88) {
                i += 7;
                continue;
            }
            // if empty square or wrong color
            if (!this._board[i] || this._board[i]?.color !== piece.color) {
                continue;
            }
            // check if square contains the requested piece
            if (this._board[i].color === piece.color &&
                this._board[i].type === piece.type) {
                squares.push(algebraic(i));
            }
        }
        return squares;
    }
    put({ type, color }, square) {
        if (this._put({ type, color }, square)) {
            this._updateCastlingRights();
            this._updateEnPassantSquare();
            this._updateSetup(this.fen());
            return true;
        }
        return false;
    }
    _set(sq, piece) {
        this._hash ^= this._pieceKey(sq);
        this._board[sq] = piece;
        this._hash ^= this._pieceKey(sq);
    }
    _put({ type, color }, square) {
        // check for piece
        if (SYMBOLS.indexOf(type.toLowerCase()) === -1) {
            return false;
        }
        // check for valid square
        if (!(square in Ox88)) {
            return false;
        }
        const sq = Ox88[square];
        // don't let the user place more than one king
        if (type == KING &&
            !(this._kings[color] == EMPTY || this._kings[color] == sq)) {
            return false;
        }
        const currentPieceOnSquare = this._board[sq];
        // if one of the kings will be replaced by the piece from args, set the `_kings` respective entry to `EMPTY`
        if (currentPieceOnSquare && currentPieceOnSquare.type === KING) {
            this._kings[currentPieceOnSquare.color] = EMPTY;
        }
        this._set(sq, { type: type, color: color });
        if (type === KING) {
            this._kings[color] = sq;
        }
        return true;
    }
    _clear(sq) {
        this._hash ^= this._pieceKey(sq);
        delete this._board[sq];
    }
    remove(square) {
        const piece = this.get(square);
        this._clear(Ox88[square]);
        if (piece && piece.type === KING) {
            this._kings[piece.color] = EMPTY;
        }
        this._updateCastlingRights();
        this._updateEnPassantSquare();
        this._updateSetup(this.fen());
        return piece;
    }
    _updateCastlingRights() {
        this._hash ^= this._castlingKey();
        const whiteKingInPlace = this._board[Ox88.e1]?.type === KING &&
            this._board[Ox88.e1]?.color === WHITE;
        const blackKingInPlace = this._board[Ox88.e8]?.type === KING &&
            this._board[Ox88.e8]?.color === BLACK;
        if (!whiteKingInPlace ||
            this._board[Ox88.a1]?.type !== ROOK ||
            this._board[Ox88.a1]?.color !== WHITE) {
            this._castling.w &= -65;
        }
        if (!whiteKingInPlace ||
            this._board[Ox88.h1]?.type !== ROOK ||
            this._board[Ox88.h1]?.color !== WHITE) {
            this._castling.w &= -33;
        }
        if (!blackKingInPlace ||
            this._board[Ox88.a8]?.type !== ROOK ||
            this._board[Ox88.a8]?.color !== BLACK) {
            this._castling.b &= -65;
        }
        if (!blackKingInPlace ||
            this._board[Ox88.h8]?.type !== ROOK ||
            this._board[Ox88.h8]?.color !== BLACK) {
            this._castling.b &= -33;
        }
        this._hash ^= this._castlingKey();
    }
    _updateEnPassantSquare() {
        if (this._epSquare === EMPTY) {
            return;
        }
        const startSquare = this._epSquare + (this._turn === WHITE ? -16 : 16);
        const currentSquare = this._epSquare + (this._turn === WHITE ? 16 : -16);
        const attackers = [currentSquare + 1, currentSquare - 1];
        if (this._board[startSquare] !== null ||
            this._board[this._epSquare] !== null ||
            this._board[currentSquare]?.color !== swapColor(this._turn) ||
            this._board[currentSquare]?.type !== PAWN) {
            this._hash ^= this._epKey();
            this._epSquare = EMPTY;
            return;
        }
        const canCapture = (square) => !(square & 0x88) &&
            this._board[square]?.color === this._turn &&
            this._board[square]?.type === PAWN;
        if (!attackers.some(canCapture)) {
            this._hash ^= this._epKey();
            this._epSquare = EMPTY;
        }
    }
    _attacked(color, square, verbose) {
        const attackers = [];
        for (let i = Ox88.a8; i <= Ox88.h1; i++) {
            // did we run off the end of the board
            if (i & 0x88) {
                i += 7;
                continue;
            }
            // if empty square or wrong color
            if (this._board[i] === undefined || this._board[i].color !== color) {
                continue;
            }
            const piece = this._board[i];
            const difference = i - square;
            // skip - to/from square are the same
            if (difference === 0) {
                continue;
            }
            const index = difference + 119;
            if (ATTACKS[index] & PIECE_MASKS[piece.type]) {
                if (piece.type === PAWN) {
                    if ((difference > 0 && piece.color === WHITE) ||
                        (difference <= 0 && piece.color === BLACK)) {
                        if (!verbose) {
                            return true;
                        }
                        else {
                            attackers.push(algebraic(i));
                        }
                    }
                    continue;
                }
                // if the piece is a knight or a king
                if (piece.type === 'n' || piece.type === 'k') {
                    if (!verbose) {
                        return true;
                    }
                    else {
                        attackers.push(algebraic(i));
                        continue;
                    }
                }
                const offset = RAYS[index];
                let j = i + offset;
                let blocked = false;
                while (j !== square) {
                    if (this._board[j] != null) {
                        blocked = true;
                        break;
                    }
                    j += offset;
                }
                if (!blocked) {
                    if (!verbose) {
                        return true;
                    }
                    else {
                        attackers.push(algebraic(i));
                        continue;
                    }
                }
            }
        }
        if (verbose) {
            return attackers;
        }
        else {
            return false;
        }
    }
    attackers(square, attackedBy) {
        if (!attackedBy) {
            return this._attacked(this._turn, Ox88[square], true);
        }
        else {
            return this._attacked(attackedBy, Ox88[square], true);
        }
    }
    _isKingAttacked(color) {
        const square = this._kings[color];
        return square === -1 ? false : this._attacked(swapColor(color), square);
    }
    hash() {
        return this._hash.toString(16);
    }
    isAttacked(square, attackedBy) {
        return this._attacked(attackedBy, Ox88[square]);
    }
    isCheck() {
        return this._isKingAttacked(this._turn);
    }
    inCheck() {
        return this.isCheck();
    }
    isCheckmate() {
        return this.isCheck() && this._moves().length === 0;
    }
    isStalemate() {
        return !this.isCheck() && this._moves().length === 0;
    }
    isInsufficientMaterial() {
        /*
         * k.b. vs k.b. (of opposite colors) with mate in 1:
         * 8/8/8/8/1b6/8/B1k5/K7 b - - 0 1
         *
         * k.b. vs k.n. with mate in 1:
         * 8/8/8/8/1n6/8/B7/K1k5 b - - 2 1
         */
        const pieces = {
            b: 0,
            n: 0,
            r: 0,
            q: 0,
            k: 0,
            p: 0,
        };
        const bishops = [];
        let numPieces = 0;
        let squareColor = 0;
        for (let i = Ox88.a8; i <= Ox88.h1; i++) {
            squareColor = (squareColor + 1) % 2;
            if (i & 0x88) {
                i += 7;
                continue;
            }
            const piece = this._board[i];
            if (piece) {
                pieces[piece.type] = piece.type in pieces ? pieces[piece.type] + 1 : 1;
                if (piece.type === BISHOP) {
                    bishops.push(squareColor);
                }
                numPieces++;
            }
        }
        // k vs. k
        if (numPieces === 2) {
            return true;
        }
        else if (
        // k vs. kn .... or .... k vs. kb
        numPieces === 3 &&
            (pieces[BISHOP] === 1 || pieces[KNIGHT] === 1)) {
            return true;
        }
        else if (numPieces === pieces[BISHOP] + 2) {
            // kb vs. kb where any number of bishops are all on the same color
            let sum = 0;
            const len = bishops.length;
            for (let i = 0; i < len; i++) {
                sum += bishops[i];
            }
            if (sum === 0 || sum === len) {
                return true;
            }
        }
        return false;
    }
    isThreefoldRepetition() {
        return this._getPositionCount(this._hash) >= 3;
    }
    isDrawByFiftyMoves() {
        return this._halfMoves >= 100; // 50 moves per side = 100 half moves
    }
    isDraw() {
        return (this.isDrawByFiftyMoves() ||
            this.isStalemate() ||
            this.isInsufficientMaterial() ||
            this.isThreefoldRepetition());
    }
    isGameOver() {
        return this.isCheckmate() || this.isDraw();
    }
    moves({ verbose = false, square = undefined, piece = undefined, } = {}) {
        const moves = this._moves({ square, piece });
        if (verbose) {
            return moves.map((move) => new Move(this, move));
        }
        else {
            return moves.map((move) => this._moveToSan(move, moves));
        }
    }
    _moves({ legal = true, piece = undefined, square = undefined, } = {}) {
        const forSquare = square ? square.toLowerCase() : undefined;
        const forPiece = piece?.toLowerCase();
        const moves = [];
        const us = this._turn;
        const them = swapColor(us);
        let firstSquare = Ox88.a8;
        let lastSquare = Ox88.h1;
        let singleSquare = false;
        // are we generating moves for a single square?
        if (forSquare) {
            // illegal square, return empty moves
            if (!(forSquare in Ox88)) {
                return [];
            }
            else {
                firstSquare = lastSquare = Ox88[forSquare];
                singleSquare = true;
            }
        }
        for (let from = firstSquare; from <= lastSquare; from++) {
            // did we run off the end of the board
            if (from & 0x88) {
                from += 7;
                continue;
            }
            // empty square or opponent, skip
            if (!this._board[from] || this._board[from].color === them) {
                continue;
            }
            const { type } = this._board[from];
            let to;
            if (type === PAWN) {
                if (forPiece && forPiece !== type)
                    continue;
                // single square, non-capturing
                to = from + PAWN_OFFSETS[us][0];
                if (!this._board[to]) {
                    addMove(moves, us, from, to, PAWN);
                    // double square
                    to = from + PAWN_OFFSETS[us][1];
                    if (SECOND_RANK[us] === rank(from) && !this._board[to]) {
                        addMove(moves, us, from, to, PAWN, undefined, BITS.BIG_PAWN);
                    }
                }
                // pawn captures
                for (let j = 2; j < 4; j++) {
                    to = from + PAWN_OFFSETS[us][j];
                    if (to & 0x88)
                        continue;
                    if (this._board[to]?.color === them) {
                        addMove(moves, us, from, to, PAWN, this._board[to].type, BITS.CAPTURE);
                    }
                    else if (to === this._epSquare) {
                        addMove(moves, us, from, to, PAWN, PAWN, BITS.EP_CAPTURE);
                    }
                }
            }
            else {
                if (forPiece && forPiece !== type)
                    continue;
                for (let j = 0, len = PIECE_OFFSETS[type].length; j < len; j++) {
                    const offset = PIECE_OFFSETS[type][j];
                    to = from;
                    while (true) {
                        to += offset;
                        if (to & 0x88)
                            break;
                        if (!this._board[to]) {
                            addMove(moves, us, from, to, type);
                        }
                        else {
                            // own color, stop loop
                            if (this._board[to].color === us)
                                break;
                            addMove(moves, us, from, to, type, this._board[to].type, BITS.CAPTURE);
                            break;
                        }
                        /* break, if knight or king */
                        if (type === KNIGHT || type === KING)
                            break;
                    }
                }
            }
        }
        /*
         * check for castling if we're:
         *   a) generating all moves, or
         *   b) doing single square move generation on the king's square
         */
        if (forPiece === undefined || forPiece === KING) {
            if (!singleSquare || lastSquare === this._kings[us]) {
                // king-side castling
                if (this._castling[us] & BITS.KSIDE_CASTLE) {
                    const castlingFrom = this._kings[us];
                    const castlingTo = castlingFrom + 2;
                    if (!this._board[castlingFrom + 1] &&
                        !this._board[castlingTo] &&
                        !this._attacked(them, this._kings[us]) &&
                        !this._attacked(them, castlingFrom + 1) &&
                        !this._attacked(them, castlingTo)) {
                        addMove(moves, us, this._kings[us], castlingTo, KING, undefined, BITS.KSIDE_CASTLE);
                    }
                }
                // queen-side castling
                if (this._castling[us] & BITS.QSIDE_CASTLE) {
                    const castlingFrom = this._kings[us];
                    const castlingTo = castlingFrom - 2;
                    if (!this._board[castlingFrom - 1] &&
                        !this._board[castlingFrom - 2] &&
                        !this._board[castlingFrom - 3] &&
                        !this._attacked(them, this._kings[us]) &&
                        !this._attacked(them, castlingFrom - 1) &&
                        !this._attacked(them, castlingTo)) {
                        addMove(moves, us, this._kings[us], castlingTo, KING, undefined, BITS.QSIDE_CASTLE);
                    }
                }
            }
        }
        /*
         * return all pseudo-legal moves (this includes moves that allow the king
         * to be captured)
         */
        if (!legal || this._kings[us] === -1) {
            return moves;
        }
        // filter out illegal moves
        const legalMoves = [];
        for (let i = 0, len = moves.length; i < len; i++) {
            this._makeMove(moves[i]);
            if (!this._isKingAttacked(us)) {
                legalMoves.push(moves[i]);
            }
            this._undoMove();
        }
        return legalMoves;
    }
    move(move, { strict = false } = {}) {
        /*
         * The move function can be called with in the following parameters:
         *
         * .move('Nxb7')       <- argument is a case-sensitive SAN string
         *
         * .move({ from: 'h7', <- argument is a move object
         *         to :'h8',
         *         promotion: 'q' })
         *
         *
         * An optional strict argument may be supplied to tell chess.js to
         * strictly follow the SAN specification.
         */
        let moveObj = null;
        if (typeof move === 'string') {
            moveObj = this._moveFromSan(move, strict);
        }
        else if (move === null) {
            moveObj = this._moveFromSan(SAN_NULLMOVE, strict);
        }
        else if (typeof move === 'object') {
            const moves = this._moves();
            // convert the pretty move object to an ugly move object
            for (let i = 0, len = moves.length; i < len; i++) {
                if (move.from === algebraic(moves[i].from) &&
                    move.to === algebraic(moves[i].to) &&
                    (!('promotion' in moves[i]) || move.promotion === moves[i].promotion)) {
                    moveObj = moves[i];
                    break;
                }
            }
        }
        // failed to find move
        if (!moveObj) {
            if (typeof move === 'string') {
                throw new Error(`Invalid move: ${move}`);
            }
            else {
                throw new Error(`Invalid move: ${JSON.stringify(move)}`);
            }
        }
        //disallow null moves when in check
        if (this.isCheck() && moveObj.flags & BITS.NULL_MOVE) {
            throw new Error('Null move not allowed when in check');
        }
        /*
         * need to make a copy of move because we can't generate SAN after the move
         * is made
         */
        const prettyMove = new Move(this, moveObj);
        this._makeMove(moveObj);
        this._incPositionCount();
        return prettyMove;
    }
    _push(move) {
        this._history.push({
            move,
            kings: { b: this._kings.b, w: this._kings.w },
            turn: this._turn,
            castling: { b: this._castling.b, w: this._castling.w },
            epSquare: this._epSquare,
            halfMoves: this._halfMoves,
            moveNumber: this._moveNumber,
        });
    }
    _movePiece(from, to) {
        this._hash ^= this._pieceKey(from);
        this._board[to] = this._board[from];
        delete this._board[from];
        this._hash ^= this._pieceKey(to);
    }
    _makeMove(move) {
        const us = this._turn;
        const them = swapColor(us);
        this._push(move);
        if (move.flags & BITS.NULL_MOVE) {
            if (us === BLACK) {
                this._moveNumber++;
            }
            this._halfMoves++;
            this._turn = them;
            this._epSquare = EMPTY;
            return;
        }
        this._hash ^= this._epKey();
        this._hash ^= this._castlingKey();
        if (move.captured) {
            this._hash ^= this._pieceKey(move.to);
        }
        this._movePiece(move.from, move.to);
        // if ep capture, remove the captured pawn
        if (move.flags & BITS.EP_CAPTURE) {
            if (this._turn === BLACK) {
                this._clear(move.to - 16);
            }
            else {
                this._clear(move.to + 16);
            }
        }
        // if pawn promotion, replace with new piece
        if (move.promotion) {
            this._clear(move.to);
            this._set(move.to, { type: move.promotion, color: us });
        }
        // if we moved the king
        if (this._board[move.to].type === KING) {
            this._kings[us] = move.to;
            // if we castled, move the rook next to the king
            if (move.flags & BITS.KSIDE_CASTLE) {
                const castlingTo = move.to - 1;
                const castlingFrom = move.to + 1;
                this._movePiece(castlingFrom, castlingTo);
            }
            else if (move.flags & BITS.QSIDE_CASTLE) {
                const castlingTo = move.to + 1;
                const castlingFrom = move.to - 2;
                this._movePiece(castlingFrom, castlingTo);
            }
            // turn off castling
            this._castling[us] = 0;
        }
        // turn off castling if we move a rook
        if (this._castling[us]) {
            for (let i = 0, len = ROOKS[us].length; i < len; i++) {
                if (move.from === ROOKS[us][i].square &&
                    this._castling[us] & ROOKS[us][i].flag) {
                    this._castling[us] ^= ROOKS[us][i].flag;
                    break;
                }
            }
        }
        // turn off castling if we capture a rook
        if (this._castling[them]) {
            for (let i = 0, len = ROOKS[them].length; i < len; i++) {
                if (move.to === ROOKS[them][i].square &&
                    this._castling[them] & ROOKS[them][i].flag) {
                    this._castling[them] ^= ROOKS[them][i].flag;
                    break;
                }
            }
        }
        this._hash ^= this._castlingKey();
        // if big pawn move, update the en passant square
        if (move.flags & BITS.BIG_PAWN) {
            let epSquare;
            if (us === BLACK) {
                epSquare = move.to - 16;
            }
            else {
                epSquare = move.to + 16;
            }
            if ((!((move.to - 1) & 0x88) &&
                this._board[move.to - 1]?.type === PAWN &&
                this._board[move.to - 1]?.color === them) ||
                (!((move.to + 1) & 0x88) &&
                    this._board[move.to + 1]?.type === PAWN &&
                    this._board[move.to + 1]?.color === them)) {
                this._epSquare = epSquare;
                this._hash ^= this._epKey();
            }
            else {
                this._epSquare = EMPTY;
            }
        }
        else {
            this._epSquare = EMPTY;
        }
        // reset the 50 move counter if a pawn is moved or a piece is captured
        if (move.piece === PAWN) {
            this._halfMoves = 0;
        }
        else if (move.flags & (BITS.CAPTURE | BITS.EP_CAPTURE)) {
            this._halfMoves = 0;
        }
        else {
            this._halfMoves++;
        }
        if (us === BLACK) {
            this._moveNumber++;
        }
        this._turn = them;
        this._hash ^= SIDE_KEY;
    }
    undo() {
        const hash = this._hash;
        const move = this._undoMove();
        if (move) {
            const prettyMove = new Move(this, move);
            this._decPositionCount(hash);
            return prettyMove;
        }
        return null;
    }
    _undoMove() {
        const old = this._history.pop();
        if (old === undefined) {
            return null;
        }
        this._hash ^= this._epKey();
        this._hash ^= this._castlingKey();
        const move = old.move;
        this._kings = old.kings;
        this._turn = old.turn;
        this._castling = old.castling;
        this._epSquare = old.epSquare;
        this._halfMoves = old.halfMoves;
        this._moveNumber = old.moveNumber;
        this._hash ^= this._epKey();
        this._hash ^= this._castlingKey();
        this._hash ^= SIDE_KEY;
        const us = this._turn;
        const them = swapColor(us);
        if (move.flags & BITS.NULL_MOVE) {
            return move;
        }
        this._movePiece(move.to, move.from);
        // to undo any promotions
        if (move.piece) {
            this._clear(move.from);
            this._set(move.from, { type: move.piece, color: us });
        }
        if (move.captured) {
            if (move.flags & BITS.EP_CAPTURE) {
                // en passant capture
                let index;
                if (us === BLACK) {
                    index = move.to - 16;
                }
                else {
                    index = move.to + 16;
                }
                this._set(index, { type: PAWN, color: them });
            }
            else {
                // regular capture
                this._set(move.to, { type: move.captured, color: them });
            }
        }
        if (move.flags & (BITS.KSIDE_CASTLE | BITS.QSIDE_CASTLE)) {
            let castlingTo, castlingFrom;
            if (move.flags & BITS.KSIDE_CASTLE) {
                castlingTo = move.to + 1;
                castlingFrom = move.to - 1;
            }
            else {
                castlingTo = move.to - 2;
                castlingFrom = move.to + 1;
            }
            this._movePiece(castlingFrom, castlingTo);
        }
        return move;
    }
    pgn({ newline = '\n', maxWidth = 0, } = {}) {
        /*
         * using the specification from http://www.chessclub.com/help/PGN-spec
         * example for html usage: .pgn({ max_width: 72, newline_char: "<br />" })
         */
        const result = [];
        let headerExists = false;
        /* add the PGN header information */
        for (const i in this._header) {
            /*
             * TODO: order of enumerated properties in header object is not
             * guaranteed, see ECMA-262 spec (section 12.6.4)
             *
             * By using HEADER_TEMPLATE, the order of tags should be preserved; we
             * do have to check for null placeholders, though, and omit them
             */
            const headerTag = this._header[i];
            if (headerTag)
                result.push(`[${i} "${this._header[i]}"]` + newline);
            headerExists = true;
        }
        if (headerExists && this._history.length) {
            result.push(newline);
        }
        const appendComment = (moveString) => {
            const comment = this._comments[this.fen()];
            if (typeof comment !== 'undefined') {
                const delimiter = moveString.length > 0 ? ' ' : '';
                moveString = `${moveString}${delimiter}{${comment}}`;
            }
            return moveString;
        };
        // pop all of history onto reversed_history
        const reversedHistory = [];
        while (this._history.length > 0) {
            reversedHistory.push(this._undoMove());
        }
        const moves = [];
        let moveString = '';
        // special case of a commented starting position with no moves
        if (reversedHistory.length === 0) {
            moves.push(appendComment(''));
        }
        // build the list of moves.  a move_string looks like: "3. e3 e6"
        while (reversedHistory.length > 0) {
            moveString = appendComment(moveString);
            const move = reversedHistory.pop();
            // make TypeScript stop complaining about move being undefined
            if (!move) {
                break;
            }
            // if the position started with black to move, start PGN with #. ...
            if (!this._history.length && move.color === 'b') {
                const prefix = `${this._moveNumber}. ...`;
                // is there a comment preceding the first move?
                moveString = moveString ? `${moveString} ${prefix}` : prefix;
            }
            else if (move.color === 'w') {
                // store the previous generated move_string if we have one
                if (moveString.length) {
                    moves.push(moveString);
                }
                moveString = this._moveNumber + '.';
            }
            moveString =
                moveString + ' ' + this._moveToSan(move, this._moves({ legal: true }));
            this._makeMove(move);
        }
        // are there any other leftover moves?
        if (moveString.length) {
            moves.push(appendComment(moveString));
        }
        // is there a result? (there ALWAYS has to be a result according to spec; see Seven Tag Roster)
        moves.push(this._header.Result || '*');
        /*
         * history should be back to what it was before we started generating PGN,
         * so join together moves
         */
        if (maxWidth === 0) {
            return result.join('') + moves.join(' ');
        }
        // TODO (jah): huh?
        const strip = function () {
            if (result.length > 0 && result[result.length - 1] === ' ') {
                result.pop();
                return true;
            }
            return false;
        };
        // NB: this does not preserve comment whitespace.
        const wrapComment = function (width, move) {
            for (const token of move.split(' ')) {
                if (!token) {
                    continue;
                }
                if (width + token.length > maxWidth) {
                    while (strip()) {
                        width--;
                    }
                    result.push(newline);
                    width = 0;
                }
                result.push(token);
                width += token.length;
                result.push(' ');
                width++;
            }
            if (strip()) {
                width--;
            }
            return width;
        };
        // wrap the PGN output at max_width
        let currentWidth = 0;
        for (let i = 0; i < moves.length; i++) {
            if (currentWidth + moves[i].length > maxWidth) {
                if (moves[i].includes('{')) {
                    currentWidth = wrapComment(currentWidth, moves[i]);
                    continue;
                }
            }
            // if the current move will push past max_width
            if (currentWidth + moves[i].length > maxWidth && i !== 0) {
                // don't end the line with whitespace
                if (result[result.length - 1] === ' ') {
                    result.pop();
                }
                result.push(newline);
                currentWidth = 0;
            }
            else if (i !== 0) {
                result.push(' ');
                currentWidth++;
            }
            result.push(moves[i]);
            currentWidth += moves[i].length;
        }
        return result.join('');
    }
    /**
     * @deprecated Use `setHeader` and `getHeaders` instead. This method will return null header tags (which is not what you want)
     */
    header(...args) {
        for (let i = 0; i < args.length; i += 2) {
            if (typeof args[i] === 'string' && typeof args[i + 1] === 'string') {
                this._header[args[i]] = args[i + 1];
            }
        }
        return this._header;
    }
    // TODO: value validation per spec
    setHeader(key, value) {
        this._header[key] = value ?? SEVEN_TAG_ROSTER[key] ?? null;
        return this.getHeaders();
    }
    removeHeader(key) {
        if (key in this._header) {
            this._header[key] = SEVEN_TAG_ROSTER[key] || null;
            return true;
        }
        return false;
    }
    // return only non-null headers (omit placemarker nulls)
    getHeaders() {
        const nonNullHeaders = {};
        for (const [key, value] of Object.entries(this._header)) {
            if (value !== null) {
                nonNullHeaders[key] = value;
            }
        }
        return nonNullHeaders;
    }
    loadPgn(pgn, { strict = false, newlineChar = '\r?\n', } = {}) {
        // If newlineChar is not the default, replace all instances with \n
        if (newlineChar !== '\r?\n') {
            pgn = pgn.replace(new RegExp(newlineChar, 'g'), '\n');
        }
        const parsedPgn = peg$parse(pgn);
        // Put the board in the starting position
        this.reset();
        // parse PGN header
        const headers = parsedPgn.headers;
        let fen = '';
        for (const key in headers) {
            // check to see user is including fen (possibly with wrong tag case)
            if (key.toLowerCase() === 'fen') {
                fen = headers[key];
            }
            this.header(key, headers[key]);
        }
        /*
         * the permissive parser should attempt to load a fen tag, even if it's the
         * wrong case and doesn't include a corresponding [SetUp "1"] tag
         */
        if (!strict) {
            if (fen) {
                this.load(fen, { preserveHeaders: true });
            }
        }
        else {
            /*
             * strict parser - load the starting position indicated by [Setup '1']
             * and [FEN position]
             */
            if (headers['SetUp'] === '1') {
                if (!('FEN' in headers)) {
                    throw new Error('Invalid PGN: FEN tag must be supplied with SetUp tag');
                }
                // don't clear the headers when loading
                this.load(headers['FEN'], { preserveHeaders: true });
            }
        }
        let node = parsedPgn.root;
        while (node) {
            if (node.move) {
                const move = this._moveFromSan(node.move, strict);
                if (move == null) {
                    throw new Error(`Invalid move in PGN: ${node.move}`);
                }
                else {
                    this._makeMove(move);
                    this._incPositionCount();
                }
            }
            if (node.comment !== undefined) {
                this._comments[this.fen()] = node.comment;
            }
            node = node.variations[0];
        }
        /*
         * Per section 8.2.6 of the PGN spec, the Result tag pair must match match
         * the termination marker. Only do this when headers are present, but the
         * result tag is missing
         */
        const result = parsedPgn.result;
        if (result &&
            Object.keys(this._header).length &&
            this._header['Result'] !== result) {
            this.setHeader('Result', result);
        }
    }
    /*
     * Convert a move from 0x88 coordinates to Standard Algebraic Notation
     * (SAN)
     *
     * @param {boolean} strict Use the strict SAN parser. It will throw errors
     * on overly disambiguated moves (see below):
     *
     * r1bqkbnr/ppp2ppp/2n5/1B1pP3/4P3/8/PPPP2PP/RNBQK1NR b KQkq - 2 4
     * 4. ... Nge7 is overly disambiguated because the knight on c6 is pinned
     * 4. ... Ne7 is technically the valid SAN
     */
    _moveToSan(move, moves) {
        let output = '';
        if (move.flags & BITS.KSIDE_CASTLE) {
            output = 'O-O';
        }
        else if (move.flags & BITS.QSIDE_CASTLE) {
            output = 'O-O-O';
        }
        else if (move.flags & BITS.NULL_MOVE) {
            return SAN_NULLMOVE;
        }
        else {
            if (move.piece !== PAWN) {
                const disambiguator = getDisambiguator(move, moves);
                output += move.piece.toUpperCase() + disambiguator;
            }
            if (move.flags & (BITS.CAPTURE | BITS.EP_CAPTURE)) {
                if (move.piece === PAWN) {
                    output += algebraic(move.from)[0];
                }
                output += 'x';
            }
            output += algebraic(move.to);
            if (move.promotion) {
                output += '=' + move.promotion.toUpperCase();
            }
        }
        this._makeMove(move);
        if (this.isCheck()) {
            if (this.isCheckmate()) {
                output += '#';
            }
            else {
                output += '+';
            }
        }
        this._undoMove();
        return output;
    }
    // convert a move from Standard Algebraic Notation (SAN) to 0x88 coordinates
    _moveFromSan(move, strict = false) {
        // strip off any move decorations: e.g Nf3+?! becomes Nf3
        let cleanMove = strippedSan(move);
        if (!strict) {
            if (cleanMove === '0-0') {
                cleanMove = 'O-O';
            }
            else if (cleanMove === '0-0-0') {
                cleanMove = 'O-O-O';
            }
        }
        //first implementation of null with a dummy move (black king moves from a8 to a8), maybe this can be implemented better
        if (cleanMove == SAN_NULLMOVE) {
            const res = {
                color: this._turn,
                from: 0,
                to: 0,
                piece: 'k',
                flags: BITS.NULL_MOVE,
            };
            return res;
        }
        let pieceType = inferPieceType(cleanMove);
        let moves = this._moves({ legal: true, piece: pieceType });
        // strict parser
        for (let i = 0, len = moves.length; i < len; i++) {
            if (cleanMove === strippedSan(this._moveToSan(moves[i], moves))) {
                return moves[i];
            }
        }
        // the strict parser failed
        if (strict) {
            return null;
        }
        let piece = undefined;
        let matches = undefined;
        let from = undefined;
        let to = undefined;
        let promotion = undefined;
        /*
         * The default permissive (non-strict) parser allows the user to parse
         * non-standard chess notations. This parser is only run after the strict
         * Standard Algebraic Notation (SAN) parser has failed.
         *
         * When running the permissive parser, we'll run a regex to grab the piece, the
         * to/from square, and an optional promotion piece. This regex will
         * parse common non-standard notation like: Pe2-e4, Rc1c4, Qf3xf7,
         * f7f8q, b1c3
         *
         * NOTE: Some positions and moves may be ambiguous when using the permissive
         * parser. For example, in this position: 6k1/8/8/B7/8/8/8/BN4K1 w - - 0 1,
         * the move b1c3 may be interpreted as Nc3 or B1c3 (a disambiguated bishop
         * move). In these cases, the permissive parser will default to the most
         * basic interpretation (which is b1c3 parsing to Nc3).
         */
        let overlyDisambiguated = false;
        matches = cleanMove.match(/([pnbrqkPNBRQK])?([a-h][1-8])x?-?([a-h][1-8])([qrbnQRBN])?/);
        if (matches) {
            piece = matches[1];
            from = matches[2];
            to = matches[3];
            promotion = matches[4];
            if (from.length == 1) {
                overlyDisambiguated = true;
            }
        }
        else {
            /*
             * The [a-h]?[1-8]? portion of the regex below handles moves that may be
             * overly disambiguated (e.g. Nge7 is unnecessary and non-standard when
             * there is one legal knight move to e7). In this case, the value of
             * 'from' variable will be a rank or file, not a square.
             */
            matches = cleanMove.match(/([pnbrqkPNBRQK])?([a-h]?[1-8]?)x?-?([a-h][1-8])([qrbnQRBN])?/);
            if (matches) {
                piece = matches[1];
                from = matches[2];
                to = matches[3];
                promotion = matches[4];
                if (from.length == 1) {
                    overlyDisambiguated = true;
                }
            }
        }
        pieceType = inferPieceType(cleanMove);
        moves = this._moves({
            legal: true,
            piece: piece ? piece : pieceType,
        });
        if (!to) {
            return null;
        }
        for (let i = 0, len = moves.length; i < len; i++) {
            if (!from) {
                // if there is no from square, it could be just 'x' missing from a capture
                if (cleanMove ===
                    strippedSan(this._moveToSan(moves[i], moves)).replace('x', '')) {
                    return moves[i];
                }
                // hand-compare move properties with the results from our permissive regex
            }
            else if ((!piece || piece.toLowerCase() == moves[i].piece) &&
                Ox88[from] == moves[i].from &&
                Ox88[to] == moves[i].to &&
                (!promotion || promotion.toLowerCase() == moves[i].promotion)) {
                return moves[i];
            }
            else if (overlyDisambiguated) {
                /*
                 * SPECIAL CASE: we parsed a move string that may have an unneeded
                 * rank/file disambiguator (e.g. Nge7).  The 'from' variable will
                 */
                const square = algebraic(moves[i].from);
                if ((!piece || piece.toLowerCase() == moves[i].piece) &&
                    Ox88[to] == moves[i].to &&
                    (from == square[0] || from == square[1]) &&
                    (!promotion || promotion.toLowerCase() == moves[i].promotion)) {
                    return moves[i];
                }
            }
        }
        return null;
    }
    ascii() {
        let s = '   +------------------------+\n';
        for (let i = Ox88.a8; i <= Ox88.h1; i++) {
            // display the rank
            if (file(i) === 0) {
                s += ' ' + '87654321'[rank(i)] + ' |';
            }
            if (this._board[i]) {
                const piece = this._board[i].type;
                const color = this._board[i].color;
                const symbol = color === WHITE ? piece.toUpperCase() : piece.toLowerCase();
                s += ' ' + symbol + ' ';
            }
            else {
                s += ' . ';
            }
            if ((i + 1) & 0x88) {
                s += '|\n';
                i += 8;
            }
        }
        s += '   +------------------------+\n';
        s += '     a  b  c  d  e  f  g  h';
        return s;
    }
    perft(depth) {
        const moves = this._moves({ legal: false });
        let nodes = 0;
        const color = this._turn;
        for (let i = 0, len = moves.length; i < len; i++) {
            this._makeMove(moves[i]);
            if (!this._isKingAttacked(color)) {
                if (depth - 1 > 0) {
                    nodes += this.perft(depth - 1);
                }
                else {
                    nodes++;
                }
            }
            this._undoMove();
        }
        return nodes;
    }
    setTurn(color) {
        if (this._turn == color) {
            return false;
        }
        this.move('--');
        return true;
    }
    turn() {
        return this._turn;
    }
    board() {
        const output = [];
        let row = [];
        for (let i = Ox88.a8; i <= Ox88.h1; i++) {
            if (this._board[i] == null) {
                row.push(null);
            }
            else {
                row.push({
                    square: algebraic(i),
                    type: this._board[i].type,
                    color: this._board[i].color,
                });
            }
            if ((i + 1) & 0x88) {
                output.push(row);
                row = [];
                i += 8;
            }
        }
        return output;
    }
    squareColor(square) {
        if (square in Ox88) {
            const sq = Ox88[square];
            return (rank(sq) + file(sq)) % 2 === 0 ? 'light' : 'dark';
        }
        return null;
    }
    history({ verbose = false } = {}) {
        const reversedHistory = [];
        const moveHistory = [];
        while (this._history.length > 0) {
            reversedHistory.push(this._undoMove());
        }
        while (true) {
            const move = reversedHistory.pop();
            if (!move) {
                break;
            }
            if (verbose) {
                moveHistory.push(new Move(this, move));
            }
            else {
                moveHistory.push(this._moveToSan(move, this._moves()));
            }
            this._makeMove(move);
        }
        return moveHistory;
    }
    /*
     * Keeps track of position occurrence counts for the purpose of repetition
     * checking. Old positions are removed from the map if their counts are reduced to 0.
     */
    _getPositionCount(hash) {
        return this._positionCount.get(hash) ?? 0;
    }
    _incPositionCount() {
        this._positionCount.set(this._hash, (this._positionCount.get(this._hash) ?? 0) + 1);
    }
    _decPositionCount(hash) {
        const currentCount = this._positionCount.get(hash) ?? 0;
        if (currentCount === 1) {
            this._positionCount.delete(hash);
        }
        else {
            this._positionCount.set(hash, currentCount - 1);
        }
    }
    _pruneComments() {
        const reversedHistory = [];
        const currentComments = {};
        const copyComment = (fen) => {
            if (fen in this._comments) {
                currentComments[fen] = this._comments[fen];
            }
        };
        while (this._history.length > 0) {
            reversedHistory.push(this._undoMove());
        }
        copyComment(this.fen());
        while (true) {
            const move = reversedHistory.pop();
            if (!move) {
                break;
            }
            this._makeMove(move);
            copyComment(this.fen());
        }
        this._comments = currentComments;
    }
    getComment() {
        return this._comments[this.fen()];
    }
    setComment(comment) {
        this._comments[this.fen()] = comment.replace('{', '[').replace('}', ']');
    }
    /**
     * @deprecated Renamed to `removeComment` for consistency
     */
    deleteComment() {
        return this.removeComment();
    }
    removeComment() {
        const comment = this._comments[this.fen()];
        delete this._comments[this.fen()];
        return comment;
    }
    getComments() {
        this._pruneComments();
        return Object.keys(this._comments).map((fen) => {
            return { fen: fen, comment: this._comments[fen] };
        });
    }
    /**
     * @deprecated Renamed to `removeComments` for consistency
     */
    deleteComments() {
        return this.removeComments();
    }
    removeComments() {
        this._pruneComments();
        return Object.keys(this._comments).map((fen) => {
            const comment = this._comments[fen];
            delete this._comments[fen];
            return { fen: fen, comment: comment };
        });
    }
    setCastlingRights(color, rights) {
        for (const side of [KING, QUEEN]) {
            if (rights[side] !== undefined) {
                if (rights[side]) {
                    this._castling[color] |= SIDES[side];
                }
                else {
                    this._castling[color] &= ~SIDES[side];
                }
            }
        }
        this._updateCastlingRights();
        const result = this.getCastlingRights(color);
        return ((rights[KING] === undefined || rights[KING] === result[KING]) &&
            (rights[QUEEN] === undefined || rights[QUEEN] === result[QUEEN]));
    }
    getCastlingRights(color) {
        return {
            [KING]: (this._castling[color] & SIDES[KING]) !== 0,
            [QUEEN]: (this._castling[color] & SIDES[QUEEN]) !== 0,
        };
    }
    moveNumber() {
        return this._moveNumber;
    }
}


return Chess;
})();
if (typeof globalThis!=="undefined") globalThis.Chess=Chess;

/* Chess rules for SPIDER. Uses the vendored chess.js (BSD-2-Clause) for legality.
   The bot is an alpha-beta search in this file, not a GPL engine.
   Levels 1–2 break equal scores with a seed (g.tie) so two bots do not repeat one line.
   Levels 3–4, and a missing seed, keep the smallest SAN. A deadline aborts inside the
   search and keeps the last finished root move. The same file is spliced into the edge function. */
(function (root) {
  const Chess = root.Chess;
  if (!Chess) throw new Error("chess");
  const CLOCKS = {"3+2": [180000, 2000], "5+0": [300000, 0], "10+0": [600000, 0]};
  const DEPTH = [0, 1, 2, 3, 4];
  const CAP = [0, 800, 2500, 12000, 40000];
  const VAL = {p: 100, n: 320, b: 330, r: 500, q: 900, k: 0};
  const PST = {
    p: [0,0,0,0,0,0,0,0,50,50,50,50,50,50,50,50,10,10,20,30,30,20,10,10,5,5,10,25,25,10,5,5,0,0,0,20,20,0,0,0,5,-5,-10,0,0,-10,-5,5,5,10,10,-20,-20,10,10,5,0,0,0,0,0,0,0,0],
    n: [-50,-40,-30,-30,-30,-30,-40,-50,-40,-20,0,5,5,0,-20,-40,-30,0,10,15,15,10,0,-30,-30,5,15,20,20,15,5,-30,-30,0,15,20,20,15,0,-30,-30,5,10,15,15,10,5,-30,-40,-20,0,5,5,0,-20,-40,-50,-40,-30,-30,-30,-30,-40,-50],
    b: [-20,-10,-10,-10,-10,-10,-10,-20,-10,5,0,0,0,0,5,-10,-10,10,10,10,10,10,10,-10,-10,0,10,10,10,10,0,-10,-10,5,5,10,10,5,5,-10,-10,0,5,10,10,5,0,-10,-10,0,0,0,0,0,0,-10,-20,-10,-10,-10,-10,-10,-10,-20],
    r: [0,0,0,5,5,0,0,0,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,5,10,10,10,10,10,10,5,0,0,0,0,0,0,0,0],
    q: [-20,-10,-10,-5,-5,-10,-10,-20,-10,0,5,0,0,0,0,-10,-10,5,5,5,5,5,0,-10,0,0,5,5,5,5,0,-5,-5,0,5,5,5,5,0,-5,-10,0,5,5,5,5,0,-10,-10,0,0,0,0,0,0,-10,-20,-10,-10,-5,-5,-10,-10,-20],
    k: [-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-20,-30,-30,-40,-40,-30,-30,-20,-10,-20,-20,-20,-20,-20,-20,-10,20,20,0,0,0,0,20,20,20,30,10,0,0,10,30,20]
  };

  function playSans(sans) {
    const c = new Chess();
    for (let i = 0; i < sans.length; i++) {
      if (!c.move(sans[i])) throw new Error("illegal");
    }
    return c;
  }
  function kingSq(c, color) {
    const b = c.board();
    for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
      const p = b[r][f];
      if (p && p.type === "k" && p.color === color) return p.square;
    }
    return "";
  }
  function flagOutcome(c, seat) {
    if (c.isInsufficientMaterial()) return {winner: null, draw: true, reason: "time"};
    return {winner: seat, draw: false, reason: "time"};
  }
  function outcome(c) {
    if (c.isCheckmate()) return {winner: c.turn() === "w" ? 1 : 0, draw: false, reason: "mate", check: kingSq(c, c.turn())};
    if (c.isStalemate()) return {winner: null, draw: true, reason: "stalemate", check: ""};
    if (c.isInsufficientMaterial()) return {winner: null, draw: true, reason: "material", check: ""};
    if (c.isThreefoldRepetition()) return {winner: null, draw: true, reason: "rep", check: ""};
    if (c.isDrawByFiftyMoves()) return {winner: null, draw: true, reason: "50", check: ""};
    return {winner: null, draw: false, reason: "", check: c.inCheck() ? kingSq(c, c.turn()) : ""};
  }
  function stamp(g, c, mv) {
    const o = outcome(c);
    g.fen = c.fen();
    g.turn = c.turn() === "w" ? 0 : 1;
    if (mv) g.last = {from: mv.from, to: mv.to, san: mv.san};
    g.winner = o.winner;
    g.draw = o.draw;
    g.reason = o.reason;
    g.check = o.check;
    g.seq = (g.seq || 0) + 1;
    return g;
  }
  function clone(g) {
    return JSON.parse(JSON.stringify(g));
  }
  function clockNow(a, g) {
    if (a && a.serverNow) return a.serverNow;
    if (a && a.now) return a.now;
    return g.ck ? g.ck.at : 0;
  }
  function fresh(players, o) {
    o = o || {};
    const spec = CLOCKS[o.clock] || null;
    const g = {
      game: "chess", n: 2, players: players.slice(0, 2).map(p => ({id: p.id, nick: p.nick, skin: p.skin || 0, bot: p.bot || 0})),
      turn: 0, sans: [], fen: new Chess().fen(), last: null, check: "", offer: null,
      clock: spec ? o.clock : "", tie: o.tie | 0,
      ck: spec ? {base: spec[0], inc: spec[1], left: [spec[0], spec[0]], at: o.now || 0} : null,
      winner: null, draw: false, reason: "",
      seq: o.seq || 1, mid: o.mid || ("ch" + ((o.seed || Math.floor(Math.random() * 1e9)) >>> 0).toString(36)),
      mv: [0, 0], walls: [], score: o.score || {}, round: o.round || 1, timer: 0, bs: "classic"
    };
    g.s0 = g.seq;
    return g;
  }

  function legal(g, seat, a) {
    if (!g || g.winner != null || g.draw) return "انتهت المباراة";
    if (!a || typeof a !== "object") return "حركة غير صحيحة";
    if (seat !== 0 && seat !== 1) return "مو مقعدك";
    if (a.t === "resign") return "";
    if (a.t === "draw") {
      if (seat !== g.turn) return "مو دورك";
      if (g.offer != null) return "فيه عرض قائم";
      return "";
    }
    if (a.t === "draw_yes" || a.t === "draw_no") {
      if (g.offer == null || g.offer === seat) return "ما فيه عرض";
      return "";
    }
    if (a.t === "flag") {
      if (!g.ck) return "ما فيه ساعة";
      if (seat === g.turn) return "الساعة على خصمك";
      const now = clockNow(a, g);
      if (!now) return "الوقت غير معروف";
      const left = g.ck.left[g.turn] - Math.max(0, now - g.ck.at);
      if (left > -150) return "لسه فيه وقت";
      return "";
    }
    if (a.t !== "mv") return "حركة غير معروفة";
    if (seat !== g.turn) return "مو دورك";
    let c;
    try { c = playSans(g.sans || []); } catch (e) { return "السجل غير صحيح"; }
    const promo = a.promotion ? String(a.promotion).toLowerCase() : "";
    const moves = c.moves({verbose: true}).filter(m => m.from === a.from && m.to === a.to);
    if (!moves.length) return "حركة غير قانونية";
    if (moves.some(m => m.promotion) && !promo) return "اختر القطعة";
    if (promo && !moves.some(m => m.promotion === promo)) return "ترقية غير صحيحة";
    if (g.ck) {
      const now = clockNow(a, g);
      const left = g.ck.left[g.turn] - Math.max(0, now - (g.ck.at || now));
      if (left < -150) return "خلص الوقت";
    }
    return "";
  }

  function apply(g, seat, a) {
    const n = clone(g);
    const now = clockNow(a, n);
    if (a.t === "resign") {
      n.winner = seat === 0 ? 1 : 0;
      n.draw = false;
      n.reason = "resign";
      n.offer = null;
      n.seq++;
      return n;
    }
    if (a.t === "draw") { n.offer = seat; n.seq++; return n; }
    if (a.t === "draw_no") { n.offer = null; n.seq++; return n; }
    if (a.t === "draw_yes") {
      n.winner = null; n.draw = true; n.reason = "agree"; n.offer = null; n.seq++;
      return n;
    }
    if (a.t === "flag") {
      const c = playSans(n.sans || []);
      const fo = flagOutcome(c, seat);
      n.offer = null;
      n.winner = fo.winner; n.draw = fo.draw; n.reason = fo.reason;
      if (n.ck) { n.ck.left[n.turn] = Math.min(0, n.ck.left[n.turn]); n.ck.at = now || n.ck.at; }
      n.seq++;
      return n;
    }
    if (n.ck && now) {
      const side = n.turn;
      const elapsed = Math.max(0, now - (n.ck.at || now));
      n.ck.left[side] = n.ck.left[side] - elapsed + (n.ck.inc || 0);
      n.ck.at = now;
    }
    const c = playSans(n.sans || []);
    const mv = c.move({from: a.from, to: a.to, promotion: a.promotion ? String(a.promotion).toLowerCase() : undefined});
    if (!mv) throw new Error("illegal");
    n.sans.push(mv.san);
    n.mv[seat] = (n.mv[seat] || 0) + 1;
    n.offer = null;
    return stamp(n, c, mv);
  }

  function material(c) {
    const b = c.board();
    let s = 0;
    for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
      const p = b[r][f];
      if (!p || p.type === "k") continue;
      const i = r * 8 + f;
      const v = VAL[p.type] + (PST[p.type][p.color === "w" ? i : (i ^ 56)] || 0);
      s += p.color === "w" ? v : -v;
    }
    return s;
  }
  function order(moves) {
    return moves.slice().sort((a, b) => {
      const sa = (a.captured ? 8 : 0) + (a.promotion ? 4 : 0);
      const sb = (b.captured ? 8 : 0) + (b.promotion ? 4 : 0);
      if (sa !== sb) return sb - sa;
      return a.san < b.san ? -1 : a.san > b.san ? 1 : 0;
    });
  }
  function mateScore(c, d) {
    return (c.turn() === "w" ? -1 : 1) * (100000 + d);
  }

  function tieKey(tie, ply, san) {
    let h = (tie >>> 0) ^ Math.imul(ply + 1, 0x9E3779B1);
    for (let i = 0; i < san.length; i++) h = Math.imul(h ^ san.charCodeAt(i), 0x01000193) >>> 0;
    return h >>> 0;
  }
  function asMove(m) {
    return m ? {t: "mv", from: m.from, to: m.to, promotion: m.promotion || ""} : null;
  }
  function pick(g, level, opt) {
    const c = playSans((g && g.sans) || []);
    if (c.isGameOver()) return null;
    const lvl = level >= 1 && level <= 4 ? level | 0 : 1;
    const depth = DEPTH[lvl];
    const cap = CAP[lvl];
    const deadline = opt && opt.deadline || 0;
    const tie = g && g.tie | 0;
    const ply = ((g && g.sans) || []).length;
    const useTie = tie > 0 && lvl <= 2;
    let nodes = 0, aborted = false;
    const rootMoves = order(c.moves({verbose: true}));
    if (!rootMoves.length) return null;
    if (deadline && Date.now() > deadline) return asMove(rootMoves[0]);
    const white = c.turn() === "w";
    let best = null, bestSc = 0, bestSan = "";
    for (let i = 0; i < rootMoves.length; i++) {
      if (deadline && Date.now() > deadline) break;
      const m = rootMoves[i];
      c.move(m);
      let sc;
      if (m.san.indexOf("#") >= 0) sc = white ? 100000 : -100000;
      else if (depth <= 1) sc = (c.isThreefoldRepetition() || c.isDrawByFiftyMoves() || c.isInsufficientMaterial()) ? 0 : material(c);
      else sc = search(depth - 1, -1e15, 1e15);
      c.undo();
      if (aborted) {
        aborted = false;
        if (!best) { best = m; bestSc = sc; bestSan = m.san; }
        break;
      }
      let better = !best;
      if (!better && sc !== bestSc) better = white ? sc > bestSc : sc < bestSc;
      if (!better && sc === bestSc) better = useTie ? tieKey(tie, ply, m.san) < tieKey(tie, ply, bestSan) : m.san < bestSan;
      if (better) { best = m; bestSc = sc; bestSan = m.san; }
    }
    return asMove(best);

    function search(d, alpha, beta) {
      nodes++;
      if ((nodes & 63) === 0 && deadline && Date.now() > deadline) { aborted = true; return material(c); }
      if (c.isDrawByFiftyMoves() || c.isInsufficientMaterial() || c.isThreefoldRepetition()) return 0;
      if (d <= 0 || nodes > cap) return material(c);
      const w = c.turn() === "w";
      const ms = order(c.moves({verbose: true}));
      if (!ms.length) return c.inCheck() ? mateScore(c, d) : 0;
      if (w) {
        let bestV = -1e15;
        for (let i = 0; i < ms.length; i++) {
          if (deadline && Date.now() > deadline) { aborted = true; return material(c); }
          c.move(ms[i]);
          const sc = ms[i].san.indexOf("#") >= 0 ? 100000 + d : search(d - 1, alpha, beta);
          c.undo();
          if (aborted) return material(c);
          if (sc > bestV) bestV = sc;
          if (sc > alpha) alpha = sc;
          if (alpha >= beta) break;
        }
        return bestV;
      }
      let bestV = 1e15;
      for (let i = 0; i < ms.length; i++) {
        if (deadline && Date.now() > deadline) { aborted = true; return material(c); }
        c.move(ms[i]);
        const sc = ms[i].san.indexOf("#") >= 0 ? -100000 - d : search(d - 1, alpha, beta);
        c.undo();
        if (aborted) return material(c);
        if (sc < bestV) bestV = sc;
        if (sc < beta) beta = sc;
        if (alpha >= beta) break;
      }
      return bestV;
    }
  }

  function replay(sans, bots, opt) {
    if (!Array.isArray(sans) || sans.length > 400) throw new Error("long");
    const levels = [bots && bots[0] | 0, bots && bots[1] | 0];
    const tie = opt && opt.tie | 0;
    let g = fresh([
      {id: "w", nick: "أبيض", bot: levels[0]},
      {id: "b", nick: "أسود", bot: levels[1]}
    ], {seq: 1, mid: "chreplay", tie: tie});
    const verify = !(opt && opt.bots === false);
    for (let i = 0; i < sans.length; i++) {
      if (g.winner != null || g.draw) throw new Error("over");
      const seat = g.turn;
      const c = playSans(g.sans);
      const mv = c.moves({verbose: true}).find(m => m.san === sans[i]);
      if (!mv) throw new Error("illegal");
      if (verify && levels[seat]) {
        const exp = pick(g, levels[seat]);
        if (!exp || exp.from !== mv.from || exp.to !== mv.to || (exp.promotion || "") !== (mv.promotion || "")) throw new Error("bot");
      }
      g = apply(g, seat, {t: "mv", from: mv.from, to: mv.to, promotion: mv.promotion || ""});
    }
    return g;
  }

  function perft(fen, depth) {
    const c = fen ? new Chess(fen) : new Chess();
    function rec(d) {
      const ms = c.moves({verbose: true});
      if (d === 1) return ms.length;
      let n = 0;
      for (let i = 0; i < ms.length; i++) {
        c.move(ms[i]);
        n += rec(d - 1);
        c.undo();
      }
      return n;
    }
    if (!depth || depth <= 0) return 1;
    return rec(depth);
  }

  const rules = {
    new(players, o) { return fresh(players, o); },
    legal, apply,
    bot(g) {
      const seat = g.turn;
      const lvl = (g.players[seat] && g.players[seat].bot) || 1;
      return pick(g, lvl);
    },
    skip(g) {
      const n = clone(g);
      try {
        const c = playSans(n.sans || []);
        return stamp(n, c, n.last);
      } catch (e) {
        n.winner = n.turn === 0 ? 1 : 0;
        n.reason = "resign";
        n.seq++;
        return n;
      }
    }
  };

  root.CHESS = {rules, pick, replay, perft, probe: function (fen) { return outcome(new Chess(fen)); }, flagOutcome: function (fen, seat) { return flagOutcome(new Chess(fen), seat); }, clocks: CLOCKS};
})(typeof globalThis !== "undefined" ? globalThis : this);

const CHESS=globalThis.CHESS;
GAME_RULES.chess=CHESS.rules;MIN_PLAYERS.chess=2;MAX_PLAYERS.chess=2;
/* @chess-engine-end */
const KALIMA=globalThis.KALIMA;
const KALIMA_ANSWERS=globalThis.KALIMA_ANSWERS;
const KALIMA_GUESS=new Set(globalThis.KALIMA_GUESSES);


/* ================= player profile (saved on this device) =================
   Private progression (coins, XP, inventory, codes, claims) never leaves the device.
   Only the public part from myPub() is shown to other players online. */
const PROFILE_KEY="spider_profile",SCHEMA=2;
/* schema 2 added the store expansion (new categories, wishlist, loadouts) and owner data;
   missing fields are filled by normalizeProfile, so the step only records the upgrade */
const MIGRATIONS={2:p=>{p.migratedV2=clock.now()}};
const newId=()=>"c"+Math.random().toString(36).slice(2,12);
const NUM_KEYS=["xp","coins","totalGames","wins","losses","currentWinStreak","bestWinStreak","onlineGames","onlineWins","botGames","botWins",
  "highestBotDifficulty","weeklyWins","lastWeeklyReset","totalMoves","totalWalls","totalDurationMs","fastestWinMs","createdAt"];
function defaultProfile(){
  return {v:SCHEMA,id:newId(),nickname:"",createdAt:clock.now(),
    level:1,xp:0,coins:0,
    totalGames:0,wins:0,losses:0,currentWinStreak:0,bestWinStreak:0,
    onlineGames:0,onlineWins:0,botGames:0,botWins:0,highestBotDifficulty:0,
    weeklyWins:0,lastWeeklyReset:weekStart(),
    totalMoves:0,totalWalls:0,totalDurationMs:0,fastestWinMs:0,
    skinUse:{},modeCount:{bot:0,online:0},
    stats:{maxBotsBeaten:0,noWallWin:false,comeback:false,login7:false,dailyAll:0,purchases:0},
    owned:Object.fromEntries(Object.keys(CATS).map(t=>[t,BASE_OWNED[t].slice()])),
    equipped:Object.assign({},DEFAULT_EQUIP),
    achievements:{},claimedAchievements:[],claimedLevelRewards:[],redeemedCodes:[],discoveredSecrets:[],
    dailyMissions:null,weeklyMissions:null,
    dailyLogin:{lastDay:-1,day:0},
    lastDailyWinBonus:-1,
    matchHistory:[],claimedMatches:[],
    lb:{week:weekStart(),rows:{}},championWeeks:[],
    settings:{mute:false,botCount:1,botLevel:2,timer:0,fx:"full",muteEmotes:false},
    wishlist:[],loadouts:[],adminAch:[],
    owner:{infinite:false,xpBoost:false,coinBoost:false,seeSteps:false,seePath:false,seeHint:false,seeSecrets:false,slowLine:false,nestUndo:false,bcPower:false,stealth:false,log:[]}
  };
}
/* the first version kept a few settings under separate keys: carry them over once */
function legacyImport(p){
  const nick=store.get("spider_nick");if(nick)p.nickname=nick.slice(0,16);
  const sk=Number(store.get("spider_skin"));if(Number.isInteger(sk)&&sk>=0&&sk<6&&store.get("spider_skin")!==null)p.equipped.skin=SKINS[sk].id;
  if(store.get("spider_mute")==="1")p.settings.mute=true;
  const b=Number(store.get("spider_bots"));if(b>=1&&b<=3)p.settings.botCount=b;
  const l=Number(store.get("spider_level"));if(l>=1&&l<=3)p.settings.botLevel=l;
  const t=Number(store.get("spider_timer"));if([30,60].includes(t))p.settings.timer=t;
  const id=store.get("spider_cid");if(id)p.id=id.slice(0,64);
  return p;
}
const strArr=(a,ok,max)=>Array.isArray(a)?[...new Set(a.filter(x=>typeof x==="string"&&x.length<=64&&ok(x)))].slice(-(max||500)):[];
function normalizeProfile(raw){
  const d=defaultProfile();
  const p=Object.assign(d,(raw&&typeof raw==="object"&&!Array.isArray(raw))?raw:{});
  let v=int(p.v,0,999,0);while(v<SCHEMA){v++;if(MIGRATIONS[v])MIGRATIONS[v](p)}p.v=SCHEMA;
  for(const k of NUM_KEYS)p[k]=int(p[k],0,1e12,0);
  p.highestBotDifficulty=int(p.highestBotDifficulty,0,3,0);
  p.nickname=String(p.nickname||"").slice(0,16);
  p.id=(typeof p.id==="string"&&p.id)?p.id.slice(0,64):newId();
  const obj=(k)=>{const fresh=defaultProfile()[k];const cur=p[k];p[k]=(cur&&typeof cur==="object"&&!Array.isArray(cur))?Object.assign(fresh,cur):fresh};
  ["stats","modeCount","settings","dailyLogin","achievements","skinUse"].forEach(obj);
  p.stats.maxBotsBeaten=int(p.stats.maxBotsBeaten,0,3,0);p.stats.dailyAll=int(p.stats.dailyAll,0,1e6,0);p.stats.purchases=int(p.stats.purchases,0,1e6,0);
  p.settings.fx=p.settings.fx==="lite"?"lite":"full";p.settings.muteEmotes=!!p.settings.muteEmotes;
  p.settings.botCount=int(p.settings.botCount,1,3,1);p.settings.botLevel=int(p.settings.botLevel,1,3,2);
  p.settings.timer=[0,30,60].includes(p.settings.timer)?p.settings.timer:0;p.settings.mute=!!p.settings.mute;
  p.dailyLogin={lastDay:int(p.dailyLogin.lastDay,-1,1e7,-1),day:int(p.dailyLogin.day,0,7,0)};
  p.modeCount={bot:int(p.modeCount.bot,0,1e9,0),online:int(p.modeCount.online,0,1e9,0)};
  for(const k of Object.keys(p.skinUse))if(!findItem("skin",k))delete p.skinUse[k];else p.skinUse[k]=int(p.skinUse[k],0,1e9,0);
  const owned=(p.owned&&typeof p.owned==="object")?p.owned:{};
  p.owned={};for(const t in CATS)p.owned[t]=strArr((owned[t]||[]).concat(BASE_OWNED[t]),id=>!!findItem(t,id));
  const eq=(p.equipped&&typeof p.equipped==="object")?p.equipped:{};
  p.equipped={};for(const t in CATS)p.equipped[t]=p.owned[t].includes(eq[t])?eq[t]:DEFAULT_EQUIP[t];
  p.claimedAchievements=strArr(p.claimedAchievements,id=>has(ACH_INDEX,id));
  p.adminAch=strArr(p.adminAch,id=>has(ACH_INDEX,id)&&p.claimedAchievements.includes(id));
  p.wishlist=strArr(p.wishlist,k=>{const [t,id]=k.split(":");return !!findItem(t,id)},100);
  p.loadouts=Array.isArray(p.loadouts)?p.loadouts.filter(l=>l&&typeof l==="object"&&typeof l.id==="string").slice(0,6).map(l=>{
    const items={};const src=(l.items&&typeof l.items==="object")?l.items:{};
    for(const t of EQUIP_TYPES)if(findItem(t,src[t]))items[t]=src[t];
    return {id:l.id.slice(0,24),name:String(l.name||"تنسيق").slice(0,24),items};
  }):[];
  const ow=(p.owner&&typeof p.owner==="object")?p.owner:{};
  p.owner={infinite:!!ow.infinite,xpBoost:!!ow.xpBoost,coinBoost:!!ow.coinBoost,seeSteps:!!ow.seeSteps,seePath:!!ow.seePath,seeHint:!!ow.seeHint,seeSecrets:!!ow.seeSecrets,slowLine:!!ow.slowLine,nestUndo:!!ow.nestUndo,bcPower:!!ow.bcPower,stealth:!!ow.stealth,
    log:Array.isArray(ow.log)?ow.log.filter(x=>x&&typeof x==="object"&&typeof x.cmd==="string").slice(-100):[]};
  for(const k of Object.keys(p.achievements))if(!has(ACH_INDEX,k))delete p.achievements[k];
  p.claimedLevelRewards=Array.isArray(p.claimedLevelRewards)?[...new Set(p.claimedLevelRewards.filter(n=>Number.isInteger(n)&&n>=2&&n<=MAX_LEVEL))]:[];
  p.redeemedCodes=strArr(p.redeemedCodes,c=>c.length<=32);
  p.discoveredSecrets=strArr(p.discoveredSecrets,s=>{const [t,id]=s.split(":");return !!findItem(t,id)});
  p.claimedMatches=strArr(p.claimedMatches,()=>true,200);
  p.championWeeks=Array.isArray(p.championWeeks)?p.championWeeks.filter(Number.isInteger):[];
  p.matchHistory=Array.isArray(p.matchHistory)?p.matchHistory.filter(m=>m&&typeof m==="object"&&typeof m.id==="string").slice(0,20):[];
  if(!p.lb||typeof p.lb!=="object"||!p.lb.rows||typeof p.lb.rows!=="object")p.lb={week:weekStart(),rows:{}};
  p.lb.week=int(p.lb.week,0,1e7,weekStart());
  for(const k of Object.keys(p.lb.rows))if(BAD_KEYS.has(k)||!p.lb.rows[k]||typeof p.lb.rows[k]!=="object")delete p.lb.rows[k];
  const lm=(m,defs)=>m&&typeof m==="object"&&Array.isArray(m.list)?{...m,list:m.list.filter(x=>x&&has(MISSION_INDEX,x.id)).map(x=>({id:x.id,p:int(x.p,0,1e6,0),done:!!x.done}))}:null;
  p.dailyMissions=lm(p.dailyMissions);p.weeklyMissions=lm(p.weeklyMissions);
  p.lastDailyWinBonus=int(p.lastDailyWinBonus,-1,1e7,-1);
  p.level=levelInfo(p.xp).L;
  return p;
}
function loadProfile(){
  const s=store.get(PROFILE_KEY);let raw=null;
  if(s){try{raw=JSON.parse(s)}catch(e){raw=null}}
  return raw?normalizeProfile(raw):normalizeProfile(legacyImport(defaultProfile()));
}
let P=normalizeProfile(null);
function saveProfile(){store.set(PROFILE_KEY,JSON.stringify(P))}

/* ================= progression ================= */
const isOwned=(t,id)=>!!P.owned[t]&&P.owned[t].includes(id);
const newOut=()=>({xp:0,coins:0,items:[],levelUps:[],ach:[],missions:[],streak:0,firstWinBonus:0,xpBefore:P.xp,levelBefore:P.level});
function giveItem(t,id,out){
  const it=findItem(t,id);if(!it||isOwned(t,id))return false;
  P.owned[t].push(id);
  if(it.rar==="secret"&&!P.discoveredSecrets.includes(t+":"+id))P.discoveredSecrets.push(t+":"+id);
  out.items.push({t,id});return true;
}
function grant(rewards,out){
  for(const r of rewards){
    if(r.t==="coins"){P.coins+=r.n;out.coins+=r.n}
    else if(r.t==="xp")addXp(r.n,out);
    else giveItem(r.t,r.id,out);
  }
}
function addXp(n,out){
  const before=levelInfo(P.xp).L;P.xp+=n;out.xp+=n;
  const after=levelInfo(P.xp).L;
  for(let L=before+1;L<=after;L++){
    if(P.claimedLevelRewards.includes(L))continue;
    P.claimedLevelRewards.push(L);
    const rw=levelRewards(L);out.levelUps.push({L,rewards:rw});
    grant(rw,out);
  }
  P.level=after;
}
function checkAchievements(out){
  let again=true;
  while(again){again=false;
    for(const a of ACHS){
      if(P.claimedAchievements.includes(a.id)||a.val(P)<a.goal)continue;
      P.claimedAchievements.push(a.id);P.achievements[a.id]=clock.now();out.ach.push(a.id);grant(a.rw,out);again=true;
    }
  }
}
function seeded(seed){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}}
function ensureMissions(){
  const d=dayIdx(),w=weekStart();
  if(!P.dailyMissions||P.dailyMissions.day!==d){
    const r=seeded(d*7919+13),pool=DAILY_POOL.slice(),pick=[];let online=false;
    while(pick.length<3&&pool.length){const m=pool.splice(Math.floor(r()*pool.length),1)[0];if(m.online&&online)continue;if(m.online)online=true;pick.push({id:m.id,p:0,done:false})}
    P.dailyMissions={day:d,list:pick,bonus:false};
  }
  if(!P.weeklyMissions||P.weeklyMissions.week!==w)P.weeklyMissions={week:w,list:WEEKLY_MISSIONS.map(m=>({id:m.id,p:0,done:false})),bonus:false};
}
function trackMission(ev,amount,out){
  ensureMissions();
  for(const [set,bonus,kind] of [[P.dailyMissions,DAILY_BONUS,"daily"],[P.weeklyMissions,WEEKLY_BONUS,"weekly"]]){
    for(const m of set.list){
      const def=MISSION_INDEX[m.id];if(m.done||!def||def.ev!==ev)continue;
      m.p=def.max?Math.max(m.p,amount):m.p+amount;
      if(m.p>=def.t){m.p=def.t;m.done=true;grant([{t:"xp",n:def.xp},{t:"coins",n:def.c}],out);out.missions.push({name:def.n,kind})}
    }
    if(!set.bonus&&set.list.length&&set.list.every(m=>m.done)){
      set.bonus=true;grant(bonus,out);out.missions.push({name:kind==="daily"?"خلّصت كل مهام اليوم":"خلّصت كل مهام الأسبوع",kind,bonus:true});
      if(kind==="daily")P.stats.dailyAll++;
    }
  }
}
function loginStatus(){
  const d=dayIdx(),dl=P.dailyLogin,claimedToday=dl.lastDay===d;
  const next=claimedToday?dl.day:(dl.lastDay===d-1&&dl.day<7?dl.day+1:1);
  return {claimedToday,next};
}
function claimLogin(){
  const st=loginStatus();if(st.claimedToday)return null;
  const out=newOut();P.dailyLogin={lastDay:dayIdx(),day:st.next};
  grant(LOGIN_REWARDS[st.next-1],out);
  if(st.next===7)P.stats.login7=true;
  checkAchievements(out);saveProfile();
  return {day:st.next,out};
}
/* weekly reset: only the weekly counters start over; everything else stays */
function weeklyRollover(out){
  const w=weekStart();
  if(P.lb.week===w&&P.lastWeeklyReset===w)return false;
  const rows=Object.values(P.lb.rows||{}),mine=rows.find(r=>r.me),top=rows.reduce((m,r)=>Math.max(m,r.w||0),0);
  if(P.lb.week!==w&&mine&&mine.w>=3&&mine.w===top&&!P.championWeeks.includes(P.lb.week)){
    P.championWeeks.push(P.lb.week);grant([{t:"badge",id:"weekly"},{t:"title",id:"weekly"}],out);checkAchievements(out);
  }
  P.lb={week:w,rows:{}};P.weeklyWins=0;P.lastWeeklyReset=w;
  return true;
}
/* the only data other players receive: what this player wears and their level */
function pubEff(t,ownerOk){const id=P.equipped[t],it=findItem(t,id);return (!it||(isOwnerItem(it)&&!ownerOk))?DEFAULT_EQUIP[t]:id}
const PUB_KEYS={fr:"frame",bd:"badge",ti:"title",th:"theme",dc:"deco",bg:"bg",wb:"web",mv:"move",vf:"win",xm:"xmark"};
function myPub(ownerOk){const o={lv:P.level};for(const k in PUB_KEYS)o[k]=pubEff(PUB_KEYS[k],ownerOk);return o}
/* ownerOk: the sender is the verified artifact owner; owner-only looks from anyone else fall back to defaults */
function sanPub(x,ownerOk){
  x=(x&&typeof x==="object")?x:{};const o={lv:Number.isInteger(x.lv)?Math.max(1,Math.min(MAX_LEVEL,x.lv)):1};
  for(const k in PUB_KEYS){const t=PUB_KEYS[k],it=findItem(t,x[k]);o[k]=(it&&(!isOwnerItem(it)||ownerOk))?x[k]:(k==="bd"||k==="ti"?"":DEFAULT_EQUIP[t])}
  return o;
}
/* the local weekly board: real results of online matches this device took part in */
function lbRecord(g,pubs,myId){
  const rows=P.lb.rows;
  g.players.forEach((pl,i)=>{
    if(BAD_KEYS.has(pl.id))return;
    const r=rows[pl.id]||(rows[pl.id]={w:0,g:0});
    const pub=pl.id===myId?myPub():(pubs[pl.id]||null);
    r.n=pl.nick;r.s=pl.skin;r.at=clock.now();
    if(pub){r.f=pub.fr;r.b=pub.bd;r.t=pub.th;r.l=pub.lv;r.d=pub.dc}
    r.g++;if(g.winner===i)r.w++;if(pl.id===myId)r.me=true;
  });
  const ids=Object.keys(rows);
  if(ids.length>60)ids.sort((a,b)=>(rows[a].at||0)-(rows[b].at||0)).slice(0,ids.length-60).forEach(k=>{if(!rows[k].me)delete rows[k]});
}
function lbSorted(){
  const rows=Object.entries(P.lb.rows).map(([id,r])=>Object.assign({id},r)).filter(r=>r.g>0);
  rows.sort((a,b)=>(b.w-a.w)||(a.g-b.g)||((b.me?1:0)-(a.me?1:0)));
  rows.forEach(r=>r.rank=1+rows.filter(x=>x.w>r.w).length);
  return rows;
}
/* one call per finished match; the match id makes a second call a no-op */
function finishMatch(c){
  if(!c||!c.mid||P.claimedMatches.includes(c.mid))return null;
  P.claimedMatches.push(c.mid);if(P.claimedMatches.length>200)P.claimedMatches.splice(0,P.claimedMatches.length-200);
  const out=newOut();
  weeklyRollover(out);
  P.totalGames++;P.totalMoves+=c.moves;P.totalWalls+=c.walls;P.totalDurationMs+=c.durMs;
  P.skinUse[c.skinId]=(P.skinUse[c.skinId]||0)+1;P.modeCount[c.mode]=(P.modeCount[c.mode]||0)+1;
  if(c.mode==="bot")P.botGames++;else P.onlineGames++;
  let xp=20,coins=5;
  if(c.won){
    P.wins++;P.currentWinStreak++;P.bestWinStreak=Math.max(P.bestWinStreak,P.currentWinStreak);
    if(c.mode==="bot"){
      P.botWins++;P.highestBotDifficulty=Math.max(P.highestBotDifficulty,c.botLevel);
      xp+=Math.round(({1:30,2:50,3:80}[c.botLevel]||30)*(1+.25*(c.bots-1)));coins+=10;
      P.stats.maxBotsBeaten=Math.max(P.stats.maxBotsBeaten,c.bots);
    }else{P.onlineWins++;P.weeklyWins++;xp+=100;coins+=20}
    if(!P.fastestWinMs||c.durMs<P.fastestWinMs)P.fastestWinMs=c.durMs;
    if(c.walls===0)P.stats.noWallWin=true;
    if(c.comeback)P.stats.comeback=true;
    if(P.lastDailyWinBonus!==dayIdx()){P.lastDailyWinBonus=dayIdx();coins+=25;out.firstWinBonus=25}
    out.streak=P.currentWinStreak;
  }else{P.losses++;P.currentWinStreak=0}
  xp*=c.xpMul||1;coins*=c.coinMul||1;
  out.baseXp=xp;out.baseCoins=coins;out.boosted=(c.xpMul||1)>1||(c.coinMul||1)>1;
  grant([{t:"xp",n:xp},{t:"coins",n:coins}],out);
  trackMission("game",1,out);
  if(c.moves)trackMission("move",c.moves,out);
  if(c.walls)trackMission("wall",c.walls,out);
  if(c.mode==="bot"&&c.botLevel===3)trackMission("hardGame",1,out);
  if(c.won){trackMission("win",1,out);trackMission(c.mode==="bot"?"botWin":"onlineWin",1,out);trackMission("streak",P.currentWinStreak,out)}
  checkAchievements(out);
  P.matchHistory.unshift({id:c.mid,at:clock.now(),mode:c.mode,won:c.won,opp:c.opponents.slice(0,3),lvl:c.botLevel||0,dur:c.durMs,moves:c.moves,walls:c.walls,xp:out.xp,coins:out.coins});
  if(P.matchHistory.length>20)P.matchHistory.length=20;
  saveProfile();
  return out;
}
/* ================= store ================= */
function canBuy(t,id){
  const it=findItem(t,id);
  if(!it||it.how!=="store")return {ok:false,why:"notforsale"};
  if(isOwned(t,id))return {ok:false,why:"owned"};
  if(it.lvl&&P.level<it.lvl)return {ok:false,why:"level",lvl:it.lvl};
  if(P.coins<it.price)return {ok:false,why:"coins",need:it.price-P.coins};
  return {ok:true};
}
/* free: the verified owner's unlimited-coins switch (checked by the caller) */
function canAfford(price,free){return free||P.coins>=price}
function buy(t,id,free){
  const it=findItem(t,id),c=canBuy(t,id);
  if(!c.ok&&!(free&&c.why==="coins"))return c;
  if(!free)P.coins-=it.price;
  P.stats.purchases++;
  const out=newOut();giveItem(t,id,out);checkAchievements(out);saveProfile();
  return {ok:true,out};
}
function equip(t,id,ownerOk){
  const it=findItem(t,id);if(!it||!isOwned(t,id)||!EQUIP_TYPES.includes(t))return false;
  if(isOwnerItem(it)&&!ownerOk)return false;
  P.equipped[t]=id;saveProfile();return true;
}
/* ================= bundles ================= */
function bundleInfo(b){
  const parts=b.items.map(([t,id])=>({t,id,it:findItem(t,id),own:isOwned(t,id)})).filter(x=>x.it);
  const missing=parts.filter(x=>!x.own),full=missing.reduce((s,x)=>s+(x.it.price||0),0);
  const price=Math.floor(full*.75/10)*10,lvl=missing.reduce((m,x)=>Math.max(m,x.it.lvl||0),0);
  return {parts,missing,full,price,lvl,complete:!missing.length,saving:full-price};
}
function buyBundle(bid,free){
  const b=BUNDLES.find(x=>x.id===bid);if(!b)return {ok:false,why:"notforsale"};
  const bi=bundleInfo(b);
  if(bi.complete)return {ok:false,why:"owned"};
  if(bi.lvl&&P.level<bi.lvl)return {ok:false,why:"level",lvl:bi.lvl};
  if(!canAfford(bi.price,free))return {ok:false,why:"coins",need:bi.price-P.coins};
  if(!free)P.coins-=bi.price;
  const out=newOut();for(const x of bi.missing)giveItem(x.t,x.id,out);
  P.stats.purchases+=bi.missing.length;checkAchievements(out);saveProfile();
  return {ok:true,out,paid:free?0:bi.price};
}
/* ================= wishlist & loadouts ================= */
function toggleWish(t,id){const k=t+":"+id,i=P.wishlist.indexOf(k);if(i>=0)P.wishlist.splice(i,1);else if(findItem(t,id))P.wishlist.push(k);saveProfile();return i<0}
const isWished=(t,id)=>P.wishlist.includes(t+":"+id);
function saveLoadout(name,items){
  if(P.loadouts.length>=6)return null;
  const clean={};for(const t of EQUIP_TYPES)if(findItem(t,items[t]))clean[t]=items[t];
  const l={id:"l"+Math.random().toString(36).slice(2,9),name:String(name||"تنسيق").trim().slice(0,24)||"تنسيق",items:clean};
  P.loadouts.push(l);const out=newOut();checkAchievements(out);saveProfile();return l;
}
function updateLoadout(id,patch){
  const l=P.loadouts.find(x=>x.id===id);if(!l)return false;
  if(typeof patch.name==="string")l.name=patch.name.trim().slice(0,24)||l.name;
  if(patch.items){const clean={};for(const t of EQUIP_TYPES)if(findItem(t,patch.items[t]))clean[t]=patch.items[t];l.items=clean}
  saveProfile();return true;
}
function deleteLoadout(id){const i=P.loadouts.findIndex(x=>x.id===id);if(i<0)return false;P.loadouts.splice(i,1);saveProfile();return true}
function loadoutMissing(l,ownerOk){return Object.entries(l.items).filter(([t,id])=>{const it=findItem(t,id);return !it||!isOwned(t,id)||(isOwnerItem(it)&&!ownerOk)})}
function equipLoadout(id,ownerOk){
  const l=P.loadouts.find(x=>x.id===id);if(!l)return null;
  const missing=loadoutMissing(l,ownerOk);
  for(const [t,iid] of Object.entries(l.items))if(!missing.some(m=>m[0]===t))P.equipped[t]=iid;
  saveProfile();return {missing};
}
/* ================= owner operations =================
   The UI only calls these after Claude confirms the viewer owns the artifact (Owner.verified).
   Everything lands in the real profile and is logged; competitive stats are never touched. */
function ownerLog(cmd,detail){P.owner.log.push({at:clock.now(),cmd,detail:String(detail||"").slice(0,80)});if(P.owner.log.length>100)P.owner.log.splice(0,P.owner.log.length-100)}
function ownerAddCoins(n){n=int(n,1,1e7,0);if(!n)return null;const out=newOut();P.coins+=n;out.coins+=n;ownerLog("ADDCOINS","+"+n);saveProfile();return out}
function ownerAddXp(n){n=int(n,1,1e7,0);if(!n)return null;const out=newOut();addXp(n,out);checkAchievements(out);ownerLog("ADDXP","+"+n);saveProfile();return out}
function xpForLevel(L){let s=0;for(let l=1;l<L;l++)s+=xpNeed(l);return s}
function ownerSetLevel(L){
  L=int(L,1,MAX_LEVEL,0);if(!L)return null;const out=newOut(),target=xpForLevel(L);
  if(target>P.xp)addXp(target-P.xp,out);else{P.xp=target;P.level=levelInfo(P.xp).L}
  checkAchievements(out);ownerLog(L===MAX_LEVEL?"MAXLEVEL":"SETLEVEL","→ "+L);saveProfile();return out;
}
function ownerUnlock(filter,label){
  const out=newOut();
  for(const t in CATS)for(const it of CATS[t])if(filter(t,it))giveItem(t,it.id,out);
  checkAchievements(out);ownerLog(label,out.items.length+" عنصر");saveProfile();return out;
}
function ownerAllAchievements(){
  const out=newOut();
  for(const a of ACHS){if(P.claimedAchievements.includes(a.id))continue;
    P.claimedAchievements.push(a.id);P.achievements[a.id]=clock.now();P.adminAch.push(a.id);out.ach.push(a.id);grant(a.rw,out)}
  ownerLog("ALLACHIEVEMENTS",out.ach.length+" إنجاز");saveProfile();return out;
}
function ownerGrant(list,label){const out=newOut();for(const [t,id] of list)giveItem(t,id,out);checkAchievements(out);ownerLog(label,out.items.length+" عنصر");saveProfile();return out}
function ownerToggle(key,label){P.owner[key]=!P.owner[key];ownerLog(label,P.owner[key]?"تشغيل":"إيقاف");saveProfile();return P.owner[key]}

/* ================= secret codes =================
   redeem() is the only entry point the UI uses. Today the local provider checks codes on the
   device; later a server provider with the same redeem(code) shape can take over validation,
   expiry and usage limits without touching the UI. */
function cleanRewards(list){
  if(!Array.isArray(list))return [];
  return list.slice(0,12).map(r=>{
    if(!r||typeof r!=="object")return null;
    if(r.t==="coins"||r.t==="xp"){const n=int(r.n,1,100000,0);return n?{t:r.t,n}:null}
    const it=findItem(r.t,r.id);return it&&!isOwnerItem(it)?{t:r.t,id:r.id}:null;
  }).filter(Boolean);
}
const LocalCodeProvider={
  /* remote(code) is set by the page when Claude's shared database is available: it returns the
     owner-written row for that code or null. Only the artifact owner can write those rows. */
  remote:null,
  async check(code){
    let row=null;
    if(this.remote){try{row=await this.remote(code)}catch(e){row=null}}
    if(row&&row.override&&has(SECRET_CODES,code)){if(row.active===false)return {ok:false,err:"invalid"}}
    else if(row&&!row.override){
      const rewards=cleanRewards(row.rewards);
      if(row.active===false||!rewards.length)return {ok:false,err:"invalid"};
      if(row.expires&&clock.now()>Date.parse(row.expires))return {ok:false,err:"invalid"};
      return {ok:true,def:{rewards,active:true,rarity:"secret",campaign:"owner",bundle:typeof row.label==="string"?row.label.slice(0,40):""}};
    }
    if(!has(SECRET_CODES,code))return {ok:false,err:"invalid"};
    const def=SECRET_CODES[code];
    if(def.active===false)return {ok:false,err:"invalid"};
    if(def.expires&&clock.now()>Date.parse(def.expires))return {ok:false,err:"invalid"};
    return {ok:true,def};
  }
};
const CodeService={
  provider:LocalCodeProvider,
  normalize(s){return String(s||"").replace(/[٠-٩]/g,d=>"٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(/[۰-۹]/g,d=>"۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/[\s\-_\u2010-\u2015\u2212.·]+/g,"").toUpperCase().slice(0,32)},
  async redeem(input){
    const code=this.normalize(input);
    if(!code)return {ok:false,err:"invalid"};
    if(P.redeemedCodes.includes(code))return {ok:false,err:"used"};
    const res=await this.provider.check(code);
    if(!res.ok)return res;
    P.redeemedCodes.push(code);
    const out=newOut();grant(res.def.rewards,out);checkAchievements(out);saveProfile();
    return {ok:true,code,def:res.def,out};
  }
};

/* ===================================================================
   SERVER — every write in the game goes through here.
   The game rules and progression above are the same code the browser
   runs; here they run on the server's copy of the data, so a player
   can't change coins, items, codes or match results from their browser.
   =================================================================== */
const OWNER_CMDS_SERVER=new Set(["GODMODE","MAXLEVEL","INFINITECOINS","ADDCOINS","ADDXP","UNLOCKALL","SECRETALL","ALLACHIEVEMENTS","XPBOOST","COINBOOST","FOUNDERONLY","CREATOR"]);
const BOT_NAMES_S=["الرتيلاء","الصياد","أبو شبكة"];
class Fail extends Error{constructor(code,msg){super(msg||code);this.code=code}}
const fail=(code,msg)=>{throw new Fail(code,msg)};
const isInt=(v,lo,hi)=>Number.isInteger(v)&&v>=lo&&v<=hi;
const cleanNick=s=>String(s||"").replace(/[\u0000-\u001f<>]/g,"").trim().slice(0,16);
const nowIso=()=>new Date(clock.now()).toISOString();
const deep=o=>JSON.parse(JSON.stringify(o));
/* best-effort per-instance limiter for sensitive actions (codes, owner tools) */
const hits=new Map();
function limit(uid,key,max,ms){
  const k=uid+":"+key,t=clock.now(),arr=(hits.get(k)||[]).filter(x=>t-x<ms);
  if(arr.length>=max)fail("slow","استنى شوي وجرّب مرة ثانية");
  arr.push(t);hits.set(k,arr);
}
function memberCard(uid,role){const ok=role==="owner";const vis=ok&&!(P.owner&&P.owner.stealth);return {id:uid,nick:P.nickname||"لاعب",skin:skinIdx(pubEff("skin",vis)),pub:myPub(vis),owner:vis,lv:P.level}}
function publicCard(role){const ok=role==="owner";return {nickname:P.nickname||"لاعب",level:P.level,pub:Object.assign(myPub(ok&&!(P.owner&&P.owner.stealth)),{sk:skinIdx(pubEff("skin",ok&&!(P.owner&&P.owner.stealth)))}),is_owner:ok&&!(P.owner&&P.owner.stealth)}}
/* only non-economic things come over from a device's old local save */
function importLegacy(p,legacy){
  if(!legacy||typeof legacy!=="object")return;
  if(typeof legacy.nickname==="string")p.nickname=cleanNick(legacy.nickname);
  const s=legacy.settings&&typeof legacy.settings==="object"?legacy.settings:{};
  if(typeof s.mute==="boolean")p.settings.mute=s.mute;
  if(s.fx==="lite"||s.fx==="full")p.settings.fx=s.fx;
  if(isInt(s.botCount,1,3))p.settings.botCount=s.botCount;
  if(isInt(s.botLevel,1,3))p.settings.botLevel=s.botLevel;
  if([0,30,60].includes(s.timer))p.settings.timer=s.timer;
}

/* ---------- profile access: load → change synchronously → save if nobody else saved first ---------- */
async function loadOrCreate(db,uid,opts){
  let row=await db.getProfile(uid);
  if(!row){
    const fresh=normalizeProfile(null);fresh.id=uid;
    if(opts&&opts.legacy)importLegacy(fresh,opts.legacy);
    if(opts&&opts.nickname&&!fresh.nickname)fresh.nickname=cleanNick(opts.nickname);
    await db.insertProfile(uid,fresh,fresh.nickname);
    row=await db.getProfile(uid);
    if(!row)fail("server","تعذّر إنشاء الحساب");
  }
  return row;
}
async function withProfile(db,uid,fn,opts){
  for(let i=0;i<5;i++){
    const row=await loadOrCreate(db,uid,opts);
    /* from here to the save call nothing awaits, so P belongs to this request only */
    P=normalizeProfile(row.data);P.id=uid;
    const role=row.role==="owner"?"owner":"player";
    ensureMissions();
    const res=fn(role,row);
    P.__ver=row.version+1;   /* lets the browser ignore an older reply that arrives late */
    const data=deep(P),card=publicCard(role);
    if(await db.updateProfile(uid,row.version,data,data.nickname)){await db.setPublic(uid,card);return {res,profile:data,role}}
  }
  fail("busy","الخادم مشغول، جرّب مرة ثانية");
}
async function readProfile(db,uid){const row=await loadOrCreate(db,uid);P=normalizeProfile(row.data);P.id=uid;return {role:row.role==="owner"?"owner":"player",profile:deep(P)}}

/* ---------- match helpers shared by solo and online ---------- */
function checkAction(G,seat,a){
  if(!a||typeof a!=="object")fail("illegal");
  if(G.game&&GAME_RULES[G.game]){const RU=GAME_RULES[G.game];if(G.game==="chess")a=Object.assign({},a,{serverNow:clock.now()});const e=RU.legal(G,seat,a);if(e)fail("illegal",e);return RU.apply(G,seat,a)}
  if(a.t==="m"){
    if(!Array.isArray(a.to)||!isInt(a.to[0],0,N-1)||!isInt(a.to[1],0,N-1))fail("illegal");
    if(!validMoves(G,seat).some(m=>m[0]===a.to[0]&&m[1]===a.to[1]))fail("illegal","حركة غير مسموحة");
    const ng=doMove(G,seat,a.to);ng.mv[seat]=(ng.mv[seat]||0)+1;return ng;
  }
  if(a.t==="w"){
    if(!Array.isArray(a.w)||!isInt(a.w[0],0,N-2)||!isInt(a.w[1],0,N-2)||!isInt(a.w[2],0,1))fail("illegal");
    if(G.left[seat]<=0)fail("illegal","خلصت خيوطك");
    const e=wallError(G,[a.w[0],a.w[1],a.w[2]]);if(e)fail("illegal",e);
    return doWall(G,seat,[a.w[0],a.w[1],a.w[2]]);
  }
  if(a.t==="s"){if(!stuck(G,seat))fail("illegal","عندك حركة متاحة");return doSkip(G)}
  fail("illegal");
}
function noteMinOpp(G,seat){
  const ws=wset(G.walls);let m=99;
  for(let j=0;j<G.n;j++)if(j!==seat){const d=distMap(ws,j)[G.pos[j][0]*N+G.pos[j][1]];if(d<m)m=d}
  if(!G.mo)G.mo=Array(G.n).fill(99);if(m<G.mo[seat])G.mo[seat]=m;
}
function skipGone(G){let k=0;while(G.winner==null&&(G.gone||[]).includes(G.turn)&&k++<G.n)nextTurn(G)}
function extras(G,t0){G.mv=Array(G.n).fill(0);G.mo=Array(G.n).fill(99);G.t0=t0;G.gone=[];return G}
function matchCtx(G,seat,mode,won,role,extra){
  return Object.assign({mode,won,durMs:Math.max(0,clock.now()-(G.t0||clock.now())),moves:(G.mv||[])[seat]||0,
    walls:(G.walls||[]).filter(w=>w[3]===seat).length,mid:G.mid,skinId:pubEff("skin",role==="owner"),
    opponents:G.players.filter((p,i)=>i!==seat).map(p=>p.nick),comeback:won&&((G.mo||[])[seat]??99)<=1,
    xpMul:role==="owner"&&P.owner.xpBoost?10:1,coinMul:role==="owner"&&P.owner.coinBoost?10:1},extra||{});
}
function riyadhDay(ms){return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Riyadh",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(ms))}
/* @kalima-pick-start */
/* Daily answer. The pool order in this file is not the schedule.
   The owner sets one of these and never commits the value:
     KALIMA_SECRET=a-random-string-of-at-least-16-chars
     insert into public.game_secrets (k, v) values ('kalima', '{"s":"REPLACE-WITH-A-RANDOM-STRING-OF-AT-LEAST-16-CHARS"}') on conflict (k) do update set v = excluded.v, updated_at = now();
   The env var wins over the table. If both are missing or shorter than 16 characters,
   word_start returns disabled and word_guess refuses. Neither response includes the answer. */
let kalimaPermCache=null;
function kalimaSecretText(env, row){
  const e=String(env||"");
  if(e.length>=16)return e;
  let s="";
  if(typeof row==="string")s=row;
  else if(row&&typeof row==="object")s=typeof row.s==="string"?row.s:(typeof row.secret==="string"?row.secret:"");
  return s.length>=16?s:"";
}
async function kalimaHmac(secret, msg){
  const enc=new TextEncoder();
  const key=await crypto.subtle.importKey("raw", enc.encode(secret), {name:"HMAC", hash:"SHA-256"}, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(String(msg))));
}
async function kalimaPerm(secret, n){
  if(kalimaPermCache&&kalimaPermCache.secret===secret&&kalimaPermCache.n===n)return kalimaPermCache.perm;
  const perm=Array.from({length:n}, (_,i)=>i);
  let block=0, buf=new Uint8Array(0), at=0;
  async function next32(){
    if(at+4>buf.length){buf=await kalimaHmac(secret, "kalima-perm:"+block); block++; at=0}
    const x=((buf[at]<<24)|(buf[at+1]<<16)|(buf[at+2]<<8)|buf[at+3])>>>0;
    at+=4;
    return x;
  }
  for(let i=n-1;i>0;i--){
    const span=i+1;
    const limit=Math.floor(0x100000000/span)*span;
    let r=await next32();
    while(r>=limit)r=await next32();
    const j=r%span;
    const t=perm[i]; perm[i]=perm[j]; perm[j]=t;
  }
  kalimaPermCache={secret, n, perm};
  return perm;
}
async function kalimaAnswer(secret, day, list){
  const perm=await kalimaPerm(secret, list.length);
  const mac=await kalimaHmac(secret, String(day));
  const x=((mac[0]<<24)|(mac[1]<<16)|(mac[2]<<8)|mac[3])>>>0;
  return list[perm[x%list.length]];
}
async function kalimaSecret(db){
  let env="";
  try{
    if(typeof Deno!=="undefined"&&Deno.env)env=String(Deno.env.get("KALIMA_SECRET")||"");
    else if(typeof process!=="undefined"&&process.env)env=String(process.env.KALIMA_SECRET||"");
  }catch(e){env=""}
  let row=null;
  if(env.length<16&&db&&typeof db.getSecret==="function"){
    try{row=await db.getSecret("kalima")}catch(e){row=null}
  }
  return kalimaSecretText(env, row);
}
/* @kalima-pick-end */
async function settle(db,uid,G,seat,mode,won,extra){
  if(G&&(G.game==="domino"||G.game==="chess"))return null;   /* dom_finish / chess_finish pay after a replay */
  if(G.seq-(G.s0||G.seq)<(G.game==="ballclash"?1:G.game==="xo"?5:G.game==="wordweb"?3:(mode==="online"?6:3)))return null;     /* too short to count */
  const inserted=await db.insertResult({mid:G.mid,user_id:uid,mode,won,week:weekStart()});
  const w=await withProfile(db,uid,role=>finishMatch(matchCtx(G,seat,mode,won,role,extra)));
  if(inserted&&mode==="online")await db.bumpWeekly(weekStart(),uid,won);
  return w;
}

/* ---------- solo matches against the computer (the server plays the bots) ---------- */
function runBots(G,steps){
  const cap=G&&G.game==="chess"?4:60;
  let k=0;while(G.winner==null&&!G.draw&&G.players[G.turn]&&G.players[G.turn].bot&&k++<cap){
    const seat=G.turn;
    if(G.game){const RU=GAME_RULES[G.game],act=RU.bot(G);G=act?RU.apply(G,seat,act):RU.skip(G)}
    else{const act=botPlay(G);G=!act?doSkip(G):act.t==="m"?doMove(G,seat,act.to):doWall(G,seat,act.w);if(act&&act.t==="m")G.mv[seat]=(G.mv[seat]||0)+1}
    steps.push(deep(G));
  }
  return G;
}

/* ---------- online rooms: one row per room, only this function writes it ---------- */
const ROOM_ALPHA="ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const newCode=()=>{let s="";for(let i=0;i<4;i++)s+=ROOM_ALPHA[Math.floor(Math.random()*ROOM_ALPHA.length)];return s};
async function roomUpdate(db,code,fn){
  for(let i=0;i<5;i++){
    const room=await db.getRoom(code);if(!room)fail("no_room","الغرفة مو موجودة");
    const r=deep(room);const res=fn(r,room);
    if(res&&res.noWrite)return {room,res};
    r.seq=room.seq+1;r.updated_at=nowIso();
    const saved=await db.updateRoom(code,room.seq,r);
    if(saved)return {room:saved,res};
  }
  fail("busy","الغرفة مشغولة، جرّب مرة ثانية");
}
function seatOf(G,uid){return G?G.players.findIndex(p=>p.id===uid):-1}
function startRound(r){
  const prev=r.state,game=(r.settings&&GAME_RULES[r.settings.game])?r.settings.game:"webbound",members=r.members.slice(0,MAX_PLAYERS[game]||4);
  let players=distinctSkins(members.map(m=>({id:m.id,nick:m.nick,skin:m.skin,bot:0})));
  if(game==="domino"){
    const want=(r.settings&&r.settings.domSeats)===4||players.length>=3?4:2;
    let b=0;while(players.length<want&&b<3){players.push({id:"B"+b,nick:BOT_NAMES_S[b]||"كمبيوتر",skin:b+1,bot:2});b++}
    players=players.slice(0,want);
  }
  const o={seq:(prev?prev.seq:0)+1,timer:(r.settings&&r.settings.timer)||0,score:prev?Object.assign({},prev.score):{},round:prev?prev.round+1:1,bs:(r.settings&&r.settings.bs)||"classic"};
  if(game==="wordweb")o.cat=(r.settings&&r.settings.cat)||"fruit";
  if(game==="ballclash"){o.bcSize=(r.settings&&r.settings.bcSize)||2;o.bcPick=(r.settings&&r.settings.bcPick)||"secret"}
  if(game==="chess"){const ck=r.settings&&r.settings.chessClock;o.clock=["3+2","5+0","10+0"].includes(ck)?ck:"";o.now=clock.now()}
  const G=game==="webbound"?newGame(players,o):GAME_RULES[game].new(players,o);
  extras(G,clock.now());
  r.state=G;r.status="playing";r.turn_started_at=nowIso();
}
async function afterRoom(db,before,after,leaverId){
  /* rewards once the game in this row ended (or a seated player left mid-game) */
  const out={};
  const G=after.state;if(!G)return out;
  const endedNow=G.winner!=null&&!(before.state&&before.state.mid===G.mid&&before.state.winner!=null);
  if(endedNow){
    for(let i=0;i<G.n;i++){const pl=G.players[i];if((G.gone||[]).includes(i))continue;
      const w=await settle(db,pl.id,G,i,"online",G.winners?G.winners.includes(i):G.winner===i);if(w)out[pl.id]=w.res}
  }
  if(leaverId){const seat=seatOf(G,leaverId);if(seat>=0)await settle(db,leaverId,G,seat,"online",false)}
  return out;
}


/* ---------- username + password accounts: no email is ever sent ----------
   The password is stored as a PBKDF2 hash. Logging in on another device gets a
   one-time token from the server that the browser exchanges for that account's session. */
const PW_ITER=100000,FAKE_DOMAIN="players.spider-game.app";
const cleanUser=s=>String(s||"").trim().toLowerCase();
const hex=buf=>Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("");
function randomHex(n){const a=new Uint8Array(n);crypto.getRandomValues(a);return hex(a)}
async function pbkdf2(pass,salt,iter){
  const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(pass),"PBKDF2",false,["deriveBits"]);
  return hex(await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt:new TextEncoder().encode(salt),iterations:iter},key,256));
}
function sameHex(a,b){if(typeof a!=="string"||typeof b!=="string"||a.length!==b.length)return false;let d=0;for(let i=0;i<a.length;i++)d|=a.charCodeAt(i)^b.charCodeAt(i);return d===0}


/* ---------- owner-only views: checked on the server for every request ---------- */
async function ownerOn(db,uid,key){const row=await loadOrCreate(db,uid);return row.role==="owner"&&!!(row.data&&row.data.owner&&row.data.owner[key])}
function peekFor(G,seat,pv){if(G.game==="bluff")return {dice:pv.map(x=>x?x.dice:[])};if(G.game==="flyhunt")return {ships:pv[1-seat]?pv[1-seat].ships:[]};if(G.game==="nightweb")return {roles:pv.map(x=>x?x.role:null)};if(G.game==="domino")return {hands:pv.map(x=>x?x.hand:[])};return null}
/* ---------- hidden-information games: each seat's private data is a separate server-only record ---------- */
async function hLoad(db,key,G){const out=[];for(let s=0;s<G.n;s++){const v=await db.getSecret(key+":h"+s);out.push(v&&v.mid===G.mid?v.d:null)}return out}
async function hSave(db,key,G,privs,old){for(let s=0;s<privs.length;s++){if(old&&JSON.stringify(old[s])===JSON.stringify(privs[s]))continue;await db.setSecret(key+":h"+s,{mid:G.mid,d:privs[s]})}}
function hRunBots(G,privs,steps){const HG=GAME_RULES[G.game];let k=0;const cap=G.game==="domino"?160:80;
  while(G.winner==null&&!G.draw&&G.players[G.turn]&&G.players[G.turn].bot&&k++<cap){const a=HG.bot(G,G.turn,privs);const r=a?HG.apply(G,G.turn,a,privs):HG.skip(G,privs);G=r.g;privs=r.privs;steps.push(deep(G))}
  return {G,privs}}
/* ---------- about page settings (owner-edited) ---------- */
const SOCIALS=["instagram","tiktok","x","discord","email","whatsapp"];
function defaultAbout(){return {dev:"Mohammed",welcome:"أهلًا فيك في SPIDER، منصة ألعاب عربية تجمعك بأصحابك. أول لعبة فيها WEBBOUND، والجاي أكثر.",links:{}}}
function cleanAbout(p){
  const out={dev:String(p.dev||"Mohammed").replace(/[<>]/g,"").trim().slice(0,40)||"Mohammed",welcome:String(p.welcome||"").replace(/[<>]/g,"").trim().slice(0,400),links:{}};
  const L=p.links&&typeof p.links==="object"?p.links:{};
  for(const k of SOCIALS){const v=L[k];if(!v||typeof v!=="object")continue;let u=String(v.url||"").trim().slice(0,200);if(!u)continue;
    if(k==="email"){if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(u))fail("bad","الإيميل غير صحيح");}
    else if(k==="whatsapp"){u=u.replace(/[^\d+]/g,"");if(!/^\+?\d{8,15}$/.test(u))fail("bad","رقم الواتساب غير صحيح");}
    else{if(!/^https:\/\/[^\s<>"']+$/.test(u))fail("bad","رابط "+k+" لازم يبدأ بـ https://");}
    out.links[k]={url:u,on:!!v.on};}
  return out;
}
/* ===================== actions ===================== */
async function handle(action,p,user,db){
  const uid=user.id;p=p&&typeof p==="object"?p:{};
  switch(action){
  /* ---- account ---- */
  case "boot":{
    const row=await loadOrCreate(db,uid,{legacy:p.legacy,nickname:p.nickname});
    const w=weekStart(),lastW=(row.data&&row.data.lastWeeklyReset)||w;
    let champ=false;
    if(lastW!==w){const top=await db.weeklyTop(lastW,1),mine=await db.weeklyRow(lastW,uid);champ=!!(mine&&mine.wins>=3&&top[0]&&mine.wins===top[0].wins)}
    let ownerId=null;
    if(row.role!=="owner"&&!(row.data&&row.data.ownerFriend)){ownerId=await db.ownerId();if(ownerId&&ownerId!==uid)await db.makeFriends(uid,ownerId,"accepted",ownerId)}
    const r=await withProfile(db,uid,()=>{
      const out=newOut();
      if(ownerId)P.ownerFriend=true;
      out.gifts=(P.gifts||[]).filter(g=>!g.seen);for(const g of P.gifts||[])g.seen=true;
      if(P.lastWeeklyReset!==w){
        if(champ&&!P.championWeeks.includes(lastW)){P.championWeeks.push(lastW);grant([{t:"badge",id:"weekly"},{t:"title",id:"weekly"}],out);checkAchievements(out)}
        P.weeklyWins=0;P.lastWeeklyReset=w;P.lb={week:w,rows:{}};
      }
      return out;
    });
    const acct=await db.accountByUser(uid),ann=await db.getSetting("announce");
    return {profile:r.profile,role:r.role,out:r.res,now:clock.now(),username:acct?acct.username:null,gifts:r.res.gifts||[],announce:ann&&ann.on&&ann.text?ann:null};
  }
  case "profile":{const r=await readProfile(db,uid);return {profile:r.profile,role:r.role,now:clock.now()}}
  case "set_nick":{const r=await withProfile(db,uid,()=>{P.nickname=cleanNick(p.nick)});return {profile:r.profile}}
  case "settings":{const r=await withProfile(db,uid,()=>{importLegacy(P,{settings:p})});return {profile:r.profile}}
  case "equip":{const r=await withProfile(db,uid,role=>{if(!equip(p.t,p.id,role==="owner"))fail("bad","ما تقدر تلبس هذا")});return {profile:r.profile}}
  case "equip_many":{const r=await withProfile(db,uid,role=>{const it=p.items&&typeof p.items==="object"?p.items:{};for(const t of EQUIP_TYPES)if(typeof it[t]==="string")equip(t,it[t],role==="owner")});return {profile:r.profile}}
  case "wish":{const r=await withProfile(db,uid,()=>toggleWish(String(p.t),String(p.id)));return {profile:r.profile,on:r.res}}
  case "buy":{const r=await withProfile(db,uid,role=>{const x=buy(String(p.t),String(p.id),role==="owner"&&P.owner.infinite);if(!x.ok)fail(x.why,x.why==="coins"?"رصيدك ما يكفي":x.why==="level"?"يحتاج المستوى "+x.lvl:"ما ينفع تشتريه");return x.out});return {profile:r.profile,out:r.res}}
  case "buy_bundle":{const r=await withProfile(db,uid,role=>{const x=buyBundle(String(p.id),role==="owner"&&P.owner.infinite);if(!x.ok)fail(x.why);return x.out});return {profile:r.profile,out:r.res}}
  case "loadout_save":{const r=await withProfile(db,uid,()=>{const l=saveLoadout(String(p.name||""),p.items||{});if(!l)fail("full","عندك ٦ تنسيقات");const out=newOut();checkAchievements(out);return out});return {profile:r.profile,out:r.res}}
  case "loadout_update":{const r=await withProfile(db,uid,()=>{if(!updateLoadout(String(p.id),{name:typeof p.name==="string"?p.name:undefined,items:p.items}))fail("bad")});return {profile:r.profile}}
  case "loadout_delete":{const r=await withProfile(db,uid,()=>{if(!deleteLoadout(String(p.id)))fail("bad")});return {profile:r.profile}}
  case "loadout_equip":{const r=await withProfile(db,uid,role=>{const x=equipLoadout(String(p.id),role==="owner");if(!x)fail("bad");return x.missing});return {profile:r.profile,missing:r.res}}
  case "claim_login":{const r=await withProfile(db,uid,()=>{const x=claimLogin();if(!x)fail("claimed","استلمت مكافأة اليوم");return x});return {profile:r.profile,out:r.res.out,day:r.res.day}}
  case "leaderboard":{
    const w=weekStart(),rows=await db.weeklyTop(w,50),ids=rows.map(x=>x.user_id);
    const cards=ids.length?await db.publicCards(ids):[],byId={};for(const c of cards)byId[c.id]=c;
    const me=rows.find(x=>x.user_id===uid)||await db.weeklyRow(w,uid);
    return {week:w,endsAt:weekEndsAt(),rows:rows.map(x=>({id:x.user_id,w:x.wins,g:x.games,card:byId[x.user_id]||null})),me:me?{w:me.wins,g:me.games}:null};
  }


  /* ---- username + password ---- */
  case "account_create":{
    limit(uid,"acct",6,60000);
    const name=cleanUser(p.username),pass=String(p.password||"");
    if(!/^[a-z0-9_]{3,20}$/.test(name))fail("bad","اسم المستخدم من ٣ إلى ٢٠: حروف إنجليزية صغيرة أو أرقام أو _");
    if(pass.length<6||pass.length>72)fail("bad","كلمة السر ٦ أحرف على الأقل");
    if(await db.accountByUser(uid))fail("bad","حسابك له اسم مستخدم من قبل");
    if(await db.getAccount(name))fail("taken","الاسم مستخدم، اختر غيره");
    const u=await db.authUser(uid);if(!u)fail("server","تعذّر إنشاء الحساب");
    const salt=randomHex(16),hash=await pbkdf2(pass,salt,PW_ITER);
    if(!(await db.insertAccount({username:name,user_id:uid,salt,hash,iter:PW_ITER})))fail("taken","الاسم مستخدم، اختر غيره");
    if(!u.email)await db.authSetEmail(uid,name+"@"+FAKE_DOMAIN);
    return {username:name};
  }
  case "account_login":{
    limit(uid,"login",10,60000);
    const name=cleanUser(p.username),pass=String(p.password||"");
    const a=await db.getAccount(name);
    if(!a)fail("bad_login","اسم المستخدم أو كلمة السر غلط");
    if(a.locked_until&&Date.parse(a.locked_until)>clock.now())fail("locked","محاولات كثيرة غلط، جرّب بعد ١٠ دقايق");
    const hash=await pbkdf2(pass,a.salt,a.iter);
    if(!sameHex(hash,a.hash)){const n=(a.fails||0)+1;await db.accountFail(name,n,n>=8?new Date(clock.now()+600000).toISOString():null);fail("bad_login","اسم المستخدم أو كلمة السر غلط")}
    if(a.fails)await db.accountFail(name,0,null);
    const u=await db.authUser(a.user_id);if(!u||!u.email)fail("server","تعذّر الدخول");
    return {token_hash:await db.authLinkToken(u.email),username:name};
  }
  case "account_password":{
    limit(uid,"acct",6,60000);
    const a=await db.accountByUser(uid);if(!a)fail("bad","ما عندك اسم مستخدم");
    const full=await db.getAccount(a.username),old=await pbkdf2(String(p.old||""),full.salt,full.iter);
    if(!sameHex(old,full.hash))fail("bad_login","كلمة السر الحالية غلط");
    const pass=String(p.password||"");if(pass.length<6||pass.length>72)fail("bad","كلمة السر ٦ أحرف على الأقل");
    const salt=randomHex(16);await db.updateAccountHash(a.username,salt,await pbkdf2(pass,salt,PW_ITER),PW_ITER);
    return {ok:true};
  }
  /* ---- secret codes (and owner commands, which only the owner role can run) ---- */
  case "redeem":{
    limit(uid,"redeem",8,60000);
    const code=CodeService.normalize(p.code);if(!code)return {ok:false,err:"invalid"};
    if(OWNER_CMDS_SERVER.has(code)){const row=await loadOrCreate(db,uid);if(row.role!=="owner")return {ok:false,err:"invalid"};return {ok:true,ownerCmd:code}}
    const prow=await loadOrCreate(db,uid);const recent=((prow.data&&prow.data.codeFails)||[]).filter(t=>clock.now()-t<600000);
    if(recent.length>=10)return {ok:false,err:"slow"};
    const u=await db.useCode(code,uid);
    if(!u||!u.ok){const err=(u&&u.err)||"invalid";
      if(err==="invalid"||err==="expired")await withProfile(db,uid,()=>{P.codeFails=((P.codeFails||[]).filter(t=>clock.now()-t<600000)).concat([clock.now()]).slice(-12)});
      return {ok:false,err}}
    const rewards=cleanRewards(u.rewards);
    const r=await withProfile(db,uid,()=>{if(!P.redeemedCodes.includes(code))P.redeemedCodes.push(code);const out=newOut();grant(rewards,out);checkAchievements(out);return out});
    return {ok:true,code,founder:!!u.founder,label:u.label||"",out:r.res,profile:r.profile};
  }
  case "owner":{
    limit(uid,"owner",30,60000);
    const cmd=String(p.cmd||""),n=Number(p.n);
    const r=await withProfile(db,uid,role=>{
      if(role!=="owner")fail("invalid","الكود غير صحيح أو غير متاح");
      switch(cmd){
        case "MAXLEVEL":return ownerSetLevel(MAX_LEVEL);
        case "SETLEVEL":return ownerSetLevel(n);
        case "ADDCOINS":{const o=ownerAddCoins(n);if(!o)fail("bad","الكمية غير صحيحة");return o}
        case "ADDXP":{const o=ownerAddXp(n);if(!o)fail("bad","الكمية غير صحيحة");return o}
        case "INFINITECOINS":ownerToggle("infinite","INFINITECOINS");return newOut();
        case "XPBOOST":ownerToggle("xpBoost","XPBOOST");return newOut();
        case "SEESTEPS":ownerToggle("seeSteps","SEESTEPS");return newOut();
        case "SEEPATH":ownerToggle("seePath","SEEPATH");return newOut();
        case "SEEHINT":ownerToggle("seeHint","SEEHINT");return newOut();
        case "SEESECRETS":ownerToggle("seeSecrets","SEESECRETS");return newOut();
        case "SLOWLINE":ownerToggle("slowLine","SLOWLINE");return newOut();
        case "NESTUNDO":ownerToggle("nestUndo","NESTUNDO");return newOut();
        case "BCPOWER":ownerToggle("bcPower","BCPOWER");return newOut();
        case "STEALTH":ownerToggle("stealth","STEALTH");return newOut();
        case "COINBOOST":ownerToggle("coinBoost","COINBOOST");return newOut();
        case "UNLOCKALL":return ownerUnlock(()=>true,"UNLOCKALL");
        case "SECRETALL":return ownerUnlock((t,it)=>it.rar==="secret","SECRETALL");
        case "UNLOCKTYPE":{const t=String(p.t);if(!CATS[t])fail("bad");return ownerUnlock(tt=>tt===t,"UNLOCK_"+t.toUpperCase())}
        case "ALLACHIEVEMENTS":return ownerAllAchievements();
        case "FOUNDERONLY":return ownerGrant(SECRET_CODES.MOHAMMED.rewards.filter(x=>x.id).map(x=>[x.t,x.id]),"FOUNDERONLY");
        case "CREATOR":return ownerGrant(CREATOR_BUNDLE,"CREATOR");
        case "IDENTITY":return ownerGrant([["badge","owner"],["title","owner"]],"OWNER_IDENTITY");
        default:fail("bad","أمر غير معروف");
      }
    });
    await db.audit(uid,cmd,{n:Number.isFinite(n)?n:null,t:p.t||null});
    return {profile:r.profile,out:r.res,cmd};
  }
  case "owner_codes":{
    const row=await loadOrCreate(db,uid);if(row.role!=="owner")fail("invalid","الكود غير صحيح أو غير متاح");
    return {codes:await db.listCodes()};
  }
  case "owner_code_save":{
    limit(uid,"owner",30,60000);
    const row=await loadOrCreate(db,uid);if(row.role!=="owner")fail("invalid","الكود غير صحيح أو غير متاح");
    const code=CodeService.normalize(p.code);
    if(!/^[A-Z0-9]{4,24}$/.test(code))fail("bad","الكود من ٤ إلى ٢٤ حرف إنجليزي أو رقم (الشرطة مسموحة وما تنحسب)");
    if(OWNER_CMDS_SERVER.has(code))fail("bad","هالاسم محجوز لأوامر المالك");
    const rewards=cleanRewards(p.rewards);if(!rewards.length)fail("bad","أضف مكافأة وحدة على الأقل");
    const max=p.max_uses==null||p.max_uses===""?null:Number(p.max_uses);if(max!==null&&!isInt(max,1,1000000))fail("bad","عدد الاستخدامات غير صحيح");
    const exp=p.expires?new Date(p.expires):null;if(exp&&isNaN(exp.getTime()))fail("bad","تاريخ غير صحيح");
    let grp=null;if(p.grp){const g=CodeService.normalize(p.grp);const all=await db.listCodes();const base=all.find(c=>c.code===g);if(!base)fail("bad","الكود اللي تبيه بديل له مو موجود");grp=base.grp||base.code}
    await db.upsertCode({code,rewards,active:true,expires_at:exp?exp.toISOString():null,max_uses:max,label:cleanNick(p.label||"").slice(0,40),builtin:false,founder:false,grp});
    await db.audit(uid,"CODE_SAVE",{code});
    return {codes:await db.listCodes()};
  }
  case "owner_code_set":{
    const row=await loadOrCreate(db,uid);if(row.role!=="owner")fail("invalid","الكود غير صحيح أو غير متاح");
    const code=CodeService.normalize(p.code);
    if(p.delete){await db.deleteCode(code);await db.audit(uid,"CODE_DELETE",{code})}
    else{await db.updateCode(code,{active:!!p.active});await db.audit(uid,p.active?"CODE_ON":"CODE_OFF",{code})}
    return {codes:await db.listCodes()};
  }



  /* ---- WEBLINE: replay the run on the server, then score it ---- */
  case "line_info":{const day=WL.day(clock.now());return {day,seed:WL.daySeed(day)}}
  case "line_submit":{
    limit(uid,"line",20,60000);
    const daily=p.mode==="daily",day=WL.day(clock.now());
    const seed=daily?WL.daySeed(day):(Number(p.seed)>>>0);
    if(daily&&p.day&&p.day!==day&&p.day!==WL.day(clock.now()-15*60000))fail("bad","انتهى تحدي هذاك اليوم");
    const seedUsed=daily&&p.day&&p.day!==day?WL.daySeed(p.day):seed,dayUsed=daily&&p.day?p.day:day;
    const inp=Array.isArray(p.inputs)?p.inputs:null;if(!inp||inp.length>6000)fail("bad","تسجيل اللعبة غير صحيح");
    let last=-1;for(const x of inp){if(!Array.isArray(x)||!Number.isInteger(x[0])||!Number.isInteger(x[1])||x[0]<=last||x[1]<0||x[1]>3)fail("bad","تسجيل اللعبة غير صحيح");last=x[0]}
    const run=WL.replay(seedUsed,inp,20000);
    if(Number(p.score)!==run.score)fail("bad","النتيجة ما تطابق اللعب");
    const dur=Math.max(0,Number(p.duration)||0);if(dur<run.tick*70*.7)fail("bad","اللعبة أسرع من الطبيعي");
    let best=run.score,rank=null;
    const r=await withProfile(db,uid,()=>{const out=newOut();
      if(P.lineDay!==day){P.lineDay=day;P.lineRuns=0}
      if(P.lineRuns<5){P.lineRuns++;const rw=WL.reward(run.score,daily);grant([{t:"xp",n:rw.xp},{t:"coins",n:rw.coins}],out)}else out.capped=true;
      P.lineBest=Math.max(P.lineBest||0,run.score);P.totalGames=(P.totalGames||0)+1;return out});
    if(daily){const prev=await db.getLineScore(dayUsed,uid);if(!prev||run.score>prev.score)await db.setLineScore(dayUsed,uid,run.score,run.tick);best=Math.max(run.score,prev?prev.score:0);rank=await db.lineRank(dayUsed,best)}
    return {score:run.score,ticks:run.tick,best,rank,daily,out:r.res,profile:r.profile};
  }
  case "line_board":{
    const day=WL.day(clock.now()),rows=await db.lineTop(day,20),cards=rows.length?await db.publicCards(rows.map(x=>x.user_id)):[],by={};for(const c of cards)by[c.id]=c;
    const mine=await db.getLineScore(day,uid);
    return {day,rows:rows.map((x,i)=>({rank:i+1,score:x.score,me:x.user_id===uid,card:by[x.user_id]||null})),mine:mine?{score:mine.score,rank:await db.lineRank(day,mine.score)}:null};
  }

  /* ---- BALL CLASH: the server picks the seed, replays the battle itself, then rewards ---- */
  case "bc_buy":
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
    }
    const o=p.opts||{},cfg={teams:clean,ff:!!o.ff,synergy:o.syn!==false,hpMul:[.5,1,1.5,2].includes(o.hpMul)?o.hpMul:1,size:[440,560,720].includes(o.size)?o.size:560};
    if(String(p.mode)!=="custom"&&await ownerOn(db,uid,"bcPower"))cfg.boost={team:0,f:1.3};
    const id=newId(),seed=(Math.floor(Math.random()*2147483646)+1)>>>0;
    await db.setSecret("bc:"+uid,{id,seed,cfg,t0:clock.now(),mode:String(p.mode||"quick")});
    return {id,seed,boost:cfg.boost||null};
  }
  case "bc_finish":{
    const pend=await db.getSecret("bc:"+uid);if(!pend||pend.id!==p.id)fail("bad","ما لقينا المعركة");
    await db.setSecret("bc:"+uid,{id:null});
    const st=BC.run(Object.assign({seed:pend.seed},pend.cfg));
    if(clock.now()-pend.t0<st.t*1000/4-3000)fail("bad","المعركة خلصت أسرع من الممكن");
    const won=!st.draw&&st.winner===0,day=WL.day(clock.now());
    const r=await withProfile(db,uid,()=>{const out=newOut();if(P.bcDay!==day){P.bcDay=day;P.bcRuns=0}
      if(P.bcRuns<15){P.bcRuns++;const big=pend.cfg.teams[0].balls.length>2?1.3:1;grant([{t:"xp",n:Math.round((st.draw?15:won?25:10)*big)},{t:"coins",n:Math.round((st.draw?12:won?30:8)*big)}],out)}else out.capped=true;
      P.bcPlayed=(P.bcPlayed||0)+1;if(won)P.bcWins=(P.bcWins||0)+1;return out});
    return {won,draw:st.draw,winner:st.winner,out:r.res,profile:r.profile};
  }
  /* ---- WEBNEST: same idea as WEBLINE — replay the moves, then score ---- */
  case "nest_info":{const day=WL.day(clock.now());return {day,seed:NST.daySeed(day)}}
  case "nest_submit":{
    limit(uid,"nest",20,60000);
    const daily=p.mode==="daily",day=WL.day(clock.now()),dayUsed=daily&&p.day&&p.day===WL.day(clock.now()-15*60000)?p.day:day;
    const seed=daily?NST.daySeed(dayUsed):(Number(p.seed)>>>0);
    const inp=Array.isArray(p.inputs)?p.inputs:null;if(!inp||inp.length>20000||!inp.every(d=>Number.isInteger(d)&&d>=0&&d<=3))fail("bad","تسجيل اللعبة غير صحيح");
    const run=NST.replay(seed,inp);if(Number(p.score)!==run.score)fail("bad","النتيجة ما تطابق اللعب");
    if((Number(p.duration)||0)<run.moves*60)fail("bad","اللعبة أسرع من الطبيعي");
    const r=await withProfile(db,uid,()=>{const out=newOut();if(P.nestDay!==day){P.nestDay=day;P.nestRuns=0}
      if(P.nestRuns<5){P.nestRuns++;const rw=NST.reward(run.score,daily);grant([{t:"xp",n:rw.xp},{t:"coins",n:rw.coins}],out)}else out.capped=true;
      P.nestBest=Math.max(P.nestBest||0,run.score);P.totalGames=(P.totalGames||0)+1;return out});
    let best=run.score,rank=null;
    if(daily){const prev=await db.getLineScore(dayUsed,uid,"nest_scores");if(!prev||run.score>prev.score)await db.setLineScore(dayUsed,uid,run.score,run.moves,"nest_scores");best=Math.max(run.score,prev?prev.score:0);rank=await db.lineRank(dayUsed,best,"nest_scores")}
    return {score:run.score,moves:run.moves,max:run.max,best,rank,daily,out:r.res,profile:r.profile};
  }
  case "nest_board":{
    const day=WL.day(clock.now()),rows=await db.lineTop(day,20,"nest_scores"),cards=rows.length?await db.publicCards(rows.map(x=>x.user_id)):[],by={};for(const c of cards)by[c.id]=c;
    const mine=await db.getLineScore(day,uid,"nest_scores");
    return {day,rows:rows.map((x,i)=>({rank:i+1,score:x.score,me:x.user_id===uid,card:by[x.user_id]||null})),mine:mine?{score:mine.score,rank:await db.lineRank(day,mine.score,"nest_scores")}:null};
  }
  /* ---- friends (everyone has the owner as a friend, and can't remove them) ---- */
  case "friends_list":{
    const rows=await db.friendsOf(uid),ownerId=await db.ownerId();
    const other=r=>r.a===uid?r.b:r.a,ids=[...new Set(rows.map(other))];
    const cards=ids.length?await db.publicCards(ids):[],by={};for(const c of cards)by[c.id]=c;
    const pack=r=>{const id=other(r);return {id,card:by[id]||null,owner:id===ownerId,since:r.created_at}};
    const friends=rows.filter(r=>r.status==="accepted").map(pack),incoming=rows.filter(r=>r.status==="pending"&&r.requested_by!==uid).map(pack),outgoing=rows.filter(r=>r.status==="pending"&&r.requested_by===uid).map(pack);
    friends.sort((x,y)=>(y.owner-x.owner)||String((x.card||{}).nickname||"").localeCompare(String((y.card||{}).nickname||""),"ar"));
    return {friends,incoming,outgoing,count:friends.length};
  }
  case "friend_add":{
    limit(uid,"friend",12,60000);
    const name=cleanUser(p.username);if(!/^[a-z0-9_]{3,20}$/.test(name))fail("bad","اكتب اسم المستخدم صح");
    const acc=await db.getAccount(name);if(!acc)fail("bad","ما لقينا لاعب بهالاسم");
    const to=acc.user_id;if(to===uid)fail("bad","هذا أنت 😄".replace(" 😄",""));
    const ex=await db.getFriend(uid,to);
    if(ex&&ex.status==="accepted")fail("bad","هو من أصحابك من قبل");
    if(ex&&ex.requested_by===uid)fail("bad","أرسلت له طلب من قبل");
    if(ex){await db.makeFriends(uid,to,"accepted",ex.requested_by);return {ok:true,accepted:true}}
    if((await db.friendsOf(uid)).length>=500)fail("bad","وصلت الحد الأعلى للأصحاب");
    await db.makeFriends(uid,to,"pending",uid);return {ok:true,accepted:false};
  }
  case "friend_respond":{
    const other=String(p.id||"");const ex=await db.getFriend(uid,other);
    if(!ex||ex.status!=="pending"||ex.requested_by===uid)fail("bad","ما فيه طلب");
    if(p.accept)await db.makeFriends(uid,other,"accepted",ex.requested_by);else await db.deleteFriend(uid,other);
    return {ok:true};
  }
  case "friend_remove":{
    const other=String(p.id||"");if(other===await db.ownerId())fail("bad","صاحب اللعبة ما ينحذف من أصحابك");
    await db.deleteFriend(uid,other);return {ok:true};
  }
  /* ---- owner: gifts and the announcement for everyone ---- */
  case "owner_gift":{
    limit(uid,"owner",30,60000);
    const row=await loadOrCreate(db,uid);if(row.role!=="owner")fail("invalid","الكود غير صحيح أو غير متاح");
    let to=p.id?String(p.id):null;
    if(!to&&p.username){const acc=await db.getAccount(cleanUser(p.username));if(!acc)fail("bad","ما لقينا لاعب بهالاسم");to=acc.user_id}
    if(!to)fail("bad","اختر اللاعب");if(to===uid)fail("bad","الهدية لغيرك");
    if(!(await db.getProfile(to)))fail("bad","ما لقينا اللاعب");
    const rewards=[];const n=Math.floor(Number(p.coins)||0);if(n){if(!(n>0&&n<=100000))fail("bad","العملات من ١ إلى ١٠٠٬٠٠٠");rewards.push({t:"coins",n})}
    if(p.item&&p.item.t&&p.item.id){const it=findItem(String(p.item.t),String(p.item.id));if(!it||it.rar==="owner")fail("bad","العنصر مو متاح للإهداء");rewards.push({t:String(p.item.t),id:it.id})}
    if(!rewards.length)fail("bad","أضف عملات أو عنصر");
    const note=String(p.note||"").replace(/[<>]/g,"").trim().slice(0,120);
    const r=await withProfile(db,to,()=>{const out=newOut();grant(rewards,out);P.gifts=(P.gifts||[]).concat([{rewards,note,at:clock.now(),seen:false}]).slice(-20);return out});
    await db.audit(uid,"GIFT",{to,coins:n||null,item:p.item||null});
    return {ok:true,nick:r.profile.nickname||"لاعب"};
  }
  case "owner_announce_save":{
    const row=await loadOrCreate(db,uid);if(row.role!=="owner")fail("invalid","الكود غير صحيح أو غير متاح");
    const text=String(p.text||"").replace(/[<>]/g,"").trim().slice(0,240),v={text,on:!!p.on&&!!text,id:clock.now()};
    await db.setSetting("announce",v);await db.audit(uid,"ANNOUNCE",{on:v.on});return {announce:v};
  }
  case "announce_get":{const a=await db.getSetting("announce");return {announce:a||{text:"",on:false}}}
  /* ---- owner: dashboard, redemptions, audit, about page, messages ---- */
  case "owner_stats":{const row=await loadOrCreate(db,uid);if(row.role!=="owner")fail("invalid","الكود غير صحيح أو غير متاح");return {stats:await db.stats(weekStart())}}
  case "owner_redemptions":{const row=await loadOrCreate(db,uid);if(row.role!=="owner")fail("invalid","الكود غير صحيح أو غير متاح");
    const rows=await db.recentRedemptions(60),cards=rows.length?await db.publicCards([...new Set(rows.map(r=>r.user_id))]):[],by={};for(const c of cards)by[c.id]=c;
    return {rows:rows.map(r=>({code:r.code,at:r.redeemed_at,nick:(by[r.user_id]||{}).nickname||"لاعب"}))}}
  case "owner_audit":{const row=await loadOrCreate(db,uid);if(row.role!=="owner")fail("invalid","الكود غير صحيح أو غير متاح");return {rows:await db.recentAudit(80)}}
  case "about_get":{return {about:Object.assign(defaultAbout(),await db.getSetting("about")||{})}}
  case "owner_about_save":{
    const row=await loadOrCreate(db,uid);if(row.role!=="owner")fail("invalid","الكود غير صحيح أو غير متاح");
    const v=cleanAbout(p);await db.setSetting("about",v);await db.audit(uid,"ABOUT_SAVE",{});return {about:v}}
  case "feedback_send":{
    if(p.website)return {ok:true};                       /* honeypot: bots fill hidden fields */
    const kinds=["idea","bug","player","question","partner"];
    const kind=kinds.includes(p.kind)?p.kind:"question",title=String(p.title||"").trim().slice(0,80),body=String(p.body||"").trim().slice(0,1500),contact=String(p.contact||"").trim().slice(0,80);
    if(title.length<3)fail("bad","اكتب عنوان أوضح");if(body.length<10)fail("bad","اكتب تفاصيل أكثر (١٠ أحرف على الأقل)");
    if(await db.feedbackCount(uid,clock.now()-3600000)>=3)fail("slow","أرسلت رسائل كثيرة، جرّب بعد ساعة");
    const {profile}=await readProfile(db,uid);
    await db.insertFeedback({user_id:uid,kind,title,body,contact:contact||null,nickname:cleanNick(profile.nickname)||"لاعب"});return {ok:true}}
  case "owner_feedback":{const row=await loadOrCreate(db,uid);if(row.role!=="owner")fail("invalid","الكود غير صحيح أو غير متاح");
    if(p.id&&["read","done","deleted"].includes(p.status))await db.setFeedback(Number(p.id),p.status);return {rows:await db.listFeedback(60)}}
  /* ---- matches against the computer ---- */
  case "solo_start":{
    const game=GAME_RULES[p.game]?p.game:"webbound";if(game==="nightweb"||game==="ballclash")fail("bad","هذي اللعبة أونلاين بس");
    if(game==="chess"){
      const lvl=isInt(p.level,1,4)?p.level:2;
      await db.cleanSolo(uid);
      const {profile,role}=await readProfile(db,uid);P=normalizeProfile(profile);
      const ok=role==="owner";
      const human={id:uid,nick:P.nickname||"أنت",skin:skinIdx(pubEff("skin",ok)),bot:0};
      const cpu={id:"B0",nick:BOT_NAMES_S[0],skin:1,bot:lvl};
      const pl=p.color==="b"?[cpu,human]:[human,cpu];
      const clockKey=["3+2","5+0","10+0"].includes(p.clock)?p.clock:"";
      const tie=(crypto.getRandomValues(new Uint32Array(1))[0]&0x7fffffff)||1;
      let G=extras(GAME_RULES.chess.new(pl,{seq:1,round:1,score:{},clock:clockKey,now:clock.now(),tie}),clock.now());
      const steps=[];G=runBots(G,steps);
      const row=await db.insertSolo({user_id:uid,state:G,history:[],practice:false,seq:1});
      return {id:row.id,state:G,steps};
    }
    let bots=Math.min(isInt(p.bots,1,3)?p.bots:1,MAX_PLAYERS[game]-1);if(game==="domino")bots=isInt(p.bots,3,3)?3:1;const lvl=isInt(p.level,1,3)?p.level:2;
    await db.cleanSolo(uid);
    const {profile,role}=await readProfile(db,uid);P=normalizeProfile(profile);
    const ok=role==="owner";
    const pl=[{id:uid,nick:P.nickname||"أنت",skin:skinIdx(pubEff("skin",ok)),bot:0}];
    for(let k=0;k<bots;k++)pl.push({id:"B"+k,nick:BOT_NAMES_S[k],skin:k+1,bot:lvl});
    let G=extras(game==="webbound"?newGame(distinctSkins(pl),{seq:1,round:1,score:{},bs:pubEff("board",ok)}):GAME_RULES[game].new(distinctSkins(pl),{seq:1,round:1,score:{},bs:pubEff("board",ok)}),clock.now());
    let word=null;if(game==="wordweb"){G.cat=WW_CATS[p.cat]?p.cat:"fruit";word=WW.pick(G.cat);G.len=word.length}
    const steps=[],HG=GAME_RULES[game];let privs=null;
    if(HG&&HG.hidden){privs=HG.deal(G);const r0=hRunBots(G,privs,steps);G=r0.G;privs=r0.privs}
    else if(game!=="wordweb")G=runBots(G,steps);
    const row=await db.insertSolo({user_id:uid,state:G,history:[],practice:false,seq:1});
    if(word)await db.setSecret("s:"+row.id+":w",{word,mid:G.mid});
    if(privs){await hSave(db,"s:"+row.id,G,privs,null);const v1=HG.view(G,0,privs);if(await ownerOn(db,uid,"seeSecrets"))v1.peek=peekFor(G,0,privs);return {id:row.id,state:G,steps,view:v1}}
    const sec=word&&await ownerOn(db,uid,"seeSecrets");
    return {id:row.id,state:G,steps,ww:word?Object.assign(WW.view(word,{tried:[],found:[]},false),sec?{secret:word}:{}):undefined};
  }
  case "solo_act":{
    {const row0=await db.getSolo(String(p.id),uid);const HG=row0&&row0.state&&GAME_RULES[row0.state.game];
    if(HG&&HG.hidden){
      let G=row0.state;if(G.winner!=null)fail("ended");if(p.gseq!=null&&p.gseq!==G.seq)fail("stale");
      let privs=await hLoad(db,"s:"+row0.id,G);if(privs.some(x=>x==null))fail("busy","لحظة");const old=privs;
      const e=HG.legal(G,0,p.a,privs);if(e)fail("illegal",e);
      let r=HG.apply(G,0,p.a,privs);G=r.g;privs=r.privs;const steps=[deep(G)];
      const rb=hRunBots(G,privs,steps);G=rb.G;privs=rb.privs;
      const saved=await db.updateSolo(row0.id,uid,row0.seq,{state:G,seq:row0.seq+1,updated_at:nowIso()});if(!saved)fail("stale");
      await hSave(db,"s:"+row0.id,G,privs,old);
      let result=null;if(G.winner!=null&&!row0.practice){const w=await settle(db,uid,G,0,"bot",G.winner===0,{botLevel:(G.players.find(x=>x.bot)||{}).bot||2,bots:G.n-1});if(w)result={out:w.res,profile:w.profile}}
      const v0=HG.view(G,0,privs);if(await ownerOn(db,uid,"seeSecrets"))v0.peek=peekFor(G,0,privs);
      return {state:G,steps,result,practice:row0.practice,view:v0};
    }}
    if(p.a&&p.a.t==="g"){
      const row=await db.getSolo(String(p.id),uid);if(!row)fail("no_match","المباراة انتهت");let G=row.state;
      if(G.game!=="wordweb"||G.winner!=null)fail("ended");const ch=String(p.a.ch||"");if(!WW.KEYS.includes(ch))fail("illegal","حرف غير صحيح");
      if(G.prog[0].done||G.prog[0].out)fail("bad","خلصت محاولاتك");
      const W=await db.getSecret("s:"+row.id+":w");if(!W)fail("busy");
      let mine=await db.getSecret("s:"+row.id+":"+uid);if(!mine||mine.mid!==G.mid)mine={mid:G.mid,tried:[],found:[]};if(mine.tried.includes(ch))fail("bad","جربت هالحرف");
      const a1=WW.guess(W.word,mine,ch);a1.m.mid=G.mid;G=WW.record(G,0,a1.pos,a1.m.found.length,W.word.length);const steps=[deep(G)];
      let bm=await db.getSecret("s:"+row.id+":b");if(!bm||bm.mid!==G.mid)bm={mid:G.mid,tried:[],found:[]};
      if(G.winner==null&&!G.prog[1].done&&!G.prog[1].out){const bc=WW.botLetter(G,1,bm,W.word.length);if(bc){const a2=WW.guess(W.word,bm,bc);a2.m.mid=G.mid;bm=a2.m;G=WW.record(G,1,a2.pos,bm.found.length,W.word.length);steps.push(deep(G))}}
      while(G.winner==null&&(G.prog[0].done||G.prog[0].out)&&!G.prog[1].done&&!G.prog[1].out){const bc=WW.botLetter(G,1,bm,W.word.length);if(!bc)break;const a2=WW.guess(W.word,bm,bc);a2.m.mid=G.mid;bm=a2.m;G=WW.record(G,1,a2.pos,bm.found.length,W.word.length);steps.push(deep(G))}
      if(G.winner!=null)G.reveal=W.word;
      const saved=await db.updateSolo(row.id,uid,row.seq,{state:G,seq:row.seq+1,updated_at:nowIso()});if(!saved)fail("stale");
      await db.setSecret("s:"+row.id+":"+uid,a1.m);await db.setSecret("s:"+row.id+":b",bm);
      let result=null;if(G.winner!=null&&!row.practice){const w=await settle(db,uid,G,0,"bot",G.winner===0,{botLevel:G.players[1].bot||2,bots:1});if(w)result={out:w.res,profile:w.profile}}
      const vs2=WW.view(W.word,a1.m,G.winner!=null);if(await ownerOn(db,uid,"seeSecrets"))vs2.secret=W.word;
      return {state:G,steps,result,practice:row.practice,ww:vs2};
    }
    const row=await db.getSolo(String(p.id),uid);if(!row)fail("no_match","المباراة انتهت");
    let G=row.state;if(G.winner!=null||G.draw)fail("ended");
    if(G.game==="chess"){
      const seat=G.players.findIndex(x=>x.id===uid);if(seat<0)fail("not_player");
      const off=p.a&&["resign","draw_yes","draw_no"].includes(p.a.t);
      const selfFlag=p.a&&p.a.t==="flag"&&seat===G.turn;
      if(!off&&!selfFlag&&p.a&&p.a.t!=="flag"&&(G.players[G.turn].bot||G.turn!==seat))fail("not_your_turn");
      if(p.a&&p.a.t==="flag"&&seat!==G.turn){}
      else if(!off&&!selfFlag&&G.turn!==seat)fail("not_your_turn");
      if(p.gseq!==G.seq)fail("stale");
      const hist=(row.history||[]).concat([G]).slice(-40);
      const who=selfFlag?1-seat:seat;
      G=checkAction(G,who,p.a);const steps=[deep(G)];G=runBots(G,steps);
      const saved=await db.updateSolo(row.id,uid,row.seq,{state:G,history:hist,seq:row.seq+1,updated_at:nowIso()});
      if(!saved)fail("stale");
      return {state:G,steps,result:null,practice:row.practice};
    }
    if(G.players[G.turn].bot||G.turn!==0)fail("not_your_turn");
    if(p.gseq!==G.seq)fail("stale");
    const hist=(row.history||[]).concat([G]).slice(-40);
    if(!G.game)noteMinOpp(G,0);
    G=checkAction(G,0,p.a);const steps=[deep(G)];G=runBots(G,steps);
    const saved=await db.updateSolo(row.id,uid,row.seq,{state:G,history:hist,seq:row.seq+1,updated_at:nowIso()});
    if(!saved)fail("stale");
    let result=null;
    if(G.winner!=null&&!row.practice){const w=await settle(db,uid,G,0,"bot",G.winner===0,{botLevel:G.players.reduce((m,x)=>Math.max(m,x.bot||0),0),bots:G.players.filter(x=>x.bot).length});if(w)result={out:w.res,profile:w.profile}}
    return {state:G,steps,result,practice:row.practice};
  }
  case "solo_undo":{
    const row=await db.getSolo(String(p.id),uid);if(!row)fail("no_match");
    const hist=(row.history||[]).slice();if(!hist.length)fail("bad");
    const G=hist.pop();
    const saved=await db.updateSolo(row.id,uid,row.seq,{state:G,history:hist,practice:true,seq:row.seq+1,updated_at:nowIso()});if(!saved)fail("stale");
    return {state:G,practice:true};
  }
  case "solo_rematch":{
    const row=await db.getSolo(String(p.id),uid);if(!row)fail("no_match");
    const prev=row.state;const pl=prev.players.map(x=>Object.assign({},x));
    const {profile,role}=await readProfile(db,uid);P=normalizeProfile(profile);
    pl[0].skin=skinIdx(pubEff("skin",role==="owner"));pl[0].nick=P.nickname||pl[0].nick;distinctSkins(pl);
    const o2={seq:prev.seq+1,round:prev.round+1,score:Object.assign({},prev.score),bs:pubEff("board",role==="owner"),cat:prev.cat,clock:prev.clock||"",now:clock.now()};
    if(prev.game==="chess")o2.tie=(crypto.getRandomValues(new Uint32Array(1))[0]&0x7fffffff)||1;
    let G=extras(prev.game&&GAME_RULES[prev.game]?GAME_RULES[prev.game].new(pl,o2):newGame(pl,o2),clock.now());
    let word=null;if(G.game==="wordweb"){word=WW.pick(G.cat);G.len=word.length}
    const steps=[],HG2=GAME_RULES[G.game];let privs2=null;
    if(HG2&&HG2.hidden){privs2=HG2.deal(G);const r0=hRunBots(G,privs2,steps);G=r0.G;privs2=r0.privs}
    else if(G.game!=="wordweb")G=runBots(G,steps);
    const r2=await db.insertSolo({user_id:uid,state:G,history:[],practice:false,seq:1});
    if(privs2){await hSave(db,"s:"+r2.id,G,privs2,null);const v2=HG2.view(G,0,privs2);if(await ownerOn(db,uid,"seeSecrets"))v2.peek=peekFor(G,0,privs2);return {id:r2.id,state:G,steps,view:v2}}
    if(word)await db.setSecret("s:"+r2.id+":w",{word,mid:G.mid});
    return {id:r2.id,state:G,steps,ww:word?WW.view(word,{tried:[],found:[]},false):undefined};
  }
  case "solo_forfeit":{
    const row=await db.getSolo(String(p.id),uid);if(!row||row.practice||row.state.winner!=null||row.state.draw)return {ok:true};
    const G=row.state;
    if(G.game==="chess"){
      await db.updateSolo(row.id,uid,row.seq,{practice:true,seq:row.seq+1,updated_at:nowIso()});
      return {ok:true};
    }
    const acts=((G.mv||[])[0]||0)+G.walls.filter(w=>w[3]===0).length;
    await db.updateSolo(row.id,uid,row.seq,{practice:true,seq:row.seq+1,updated_at:nowIso()});
    if(acts>=3){const w=await withProfile(db,uid,role=>finishMatch(matchCtx(G,0,"bot",false,role,{botLevel:G.players.reduce((m,x)=>Math.max(m,x.bot||0),0),bots:G.players.filter(x=>x.bot).length})));return {ok:true,profile:w.profile,counted:true}}
    return {ok:true};
  }

  /* ---- online rooms ---- */
  case "room_create":{
    await db.cleanRooms();
    const {role,profile}=await readProfile(db,uid);P=normalizeProfile(profile);
    const ok=role==="owner",card=memberCard(uid,role);
    for(let i=0;i<6;i++){
      const code=newCode();
      const row=await db.insertRoom({code,host:uid,status:"lobby",members:[Object.assign(card,{ready:true})],member_ids:[uid],
        settings:{timer:P.settings.timer||0,bs:pubEff("board",ok),lt:pubEff("lobby",ok),public:!!p.public,name:"غرفة "+(P.nickname||"لاعب"),game:GAME_RULES[p.game]?p.game:"webbound"},state:null,seq:1});
      if(row)return {room:row};
    }
    fail("busy");
  }
  case "room_join":{
    const code=String(p.code||"").toUpperCase();if(!/^[A-Z0-9]{4}$/.test(code))fail("bad","الكود ٤ حروف وأرقام");
    const {role,profile}=await readProfile(db,uid);P=normalizeProfile(profile);const card=memberCard(uid,role);
    const r=await roomUpdate(db,code,r=>{
      const i=r.members.findIndex(m=>m.id===uid);
      if(i>=0){r.members[i]=Object.assign(card,{ready:r.members[i].ready||r.host===uid});return}
      if(r.members.length>=8)fail("full","الغرفة ممتلئة");
      if(r.status==="lobby"&&r.members.length>=(MAX_PLAYERS[(r.settings&&r.settings.game)||"webbound"]||4)+4)fail("full","الغرفة ممتلئة");
      r.members.push(Object.assign(card,{ready:false}));r.member_ids.push(uid);
    });
    return {room:r.room};
  }
  case "room_me":{
    const code=String(p.code||"").toUpperCase();
    const {role,profile}=await readProfile(db,uid);P=normalizeProfile(profile);const card=memberCard(uid,role),ok=role==="owner";
    const r=await roomUpdate(db,code,r=>{const i=r.members.findIndex(m=>m.id===uid);if(i<0)fail("not_member");r.members[i]=Object.assign(card,{ready:r.members[i].ready||r.host===uid});
      if(r.host===uid&&r.status!=="playing"){r.settings.bs=pubEff("board",ok);r.settings.lt=pubEff("lobby",ok)}});
    return {room:r.room};
  }
  case "room_settings":{
    const code=String(p.code||"").toUpperCase();
    const r=await roomUpdate(db,code,r=>{if(r.host!==uid)fail("not_host");if([0,30,60].includes(p.timer))r.settings.timer=p.timer;if(p.cat&&WW_CATS[p.cat])r.settings.cat=p.cat;if([1,2,3,4,5].includes(p.bcSize))r.settings.bcSize=p.bcSize;if(["secret","draft"].includes(p.bcPick))r.settings.bcPick=p.bcPick;if(p.domSeats===2||p.domSeats===4)r.settings.domSeats=p.domSeats;if(["none","3+2","5+0","10+0"].includes(p.chessClock))r.settings.chessClock=p.chessClock==="none"?"":p.chessClock});
    return {room:r.room};
  }
  case "room_start":
  case "room_rematch":{
    const code=String(p.code||"").toUpperCase();
    const r=await roomUpdate(db,code,r=>{
      if(r.host!==uid)fail("not_host","بس صاحب الغرفة يبدأ");
      if(action==="room_start"&&r.status==="playing")return {noWrite:true};
      if(action==="room_rematch"&&r.status!=="ended")return {noWrite:true};
      const gmn=(r.settings&&r.settings.game)||"webbound",minP=gmn==="domino"?1:(MIN_PLAYERS[gmn]||2);
      if(r.members.length<minP)fail("need2",minP>2?"تحتاج "+minP+" لاعبين على الأقل":"ننتظر لاعب ثاني");
      if(r.status==="ended"&&r.state&&r.state.game==="wordweb"){}
      if(action==="room_start"&&!p.force){const wait=r.members.slice(0,4).filter(m=>m.id!==r.host&&!m.ready);if(wait.length)fail("not_ready","ننتظر "+wait.map(m=>m.nick).join("، ")+" يضغط جاهز")}
      startRound(r);
      if(r.state.game==="wordweb"){const w=WW.pick(r.state.cat);r.state.len=w.length;return {word:w}}
      if(r.state.game==="domino"){const HG=GAME_RULES.domino;let privs=HG.deal(r.state);
        if(r.state.winner==null&&!r.state.draw&&r.state.players[r.state.turn]&&r.state.players[r.state.turn].bot){const rb=hRunBots(r.state,privs,[]);r.state=rb.G;privs=rb.privs}
        if(r.state.winner!=null||r.state.draw)r.status="ended";
        return {privs}}
    });
    if(r.res&&r.res.word)await db.setSecret(code+":w",{word:r.res.word,mid:r.room.state.mid});
    const HGs=r.room.state&&GAME_RULES[r.room.state.game];if(HGs&&HGs.hidden&&r.room.state){const privs=(r.res&&r.res.privs)||HGs.deal(r.room.state);await hSave(db,code,r.room.state,privs,null)}
    return {room:r.room};
  }
  case "word_view":{
    if(p.solo){const row=await db.getSolo(String(p.solo),uid);if(!row||row.state.game!=="wordweb")fail("no_match");const W=await db.getSecret("s:"+row.id+":w");let m=await db.getSecret("s:"+row.id+":"+uid);if(!W)fail("busy");if(!m||m.mid!==row.state.mid)m={tried:[],found:[]};const vs=WW.view(W.word,m,row.state.winner!=null);if(await ownerOn(db,uid,"seeSecrets"))vs.secret=W.word;return {ww:vs}}
    const code=String(p.code||"").toUpperCase(),room=await db.getRoom(code);if(!room||!room.member_ids.includes(uid)||!room.state||room.state.game!=="wordweb")fail("no_room");
    const W=await db.getSecret(code+":w");if(!W||W.mid!==room.state.mid)return {ww:null};let m=await db.getSecret(code+":"+uid);if(!m||m.mid!==room.state.mid)m={tried:[],found:[]};
    const vv=WW.view(W.word,m,room.state.winner!=null);if(await ownerOn(db,uid,"seeSecrets"))vv.secret=W.word;return {ww:vv};
  }
  case "my_view":{
    const peekOn=await ownerOn(db,uid,"seeSecrets");
    if(p.solo){const row=await db.getSolo(String(p.solo),uid);const HG=row&&GAME_RULES[row.state.game];if(!HG||!HG.hidden)fail("no_match");const pv=await hLoad(db,"s:"+row.id,row.state);if(!pv[0])return {view:null};const vw=HG.view(row.state,0,pv);if(peekOn)vw.peek=peekFor(row.state,0,pv);return {view:vw}}
    const code=String(p.code||"").toUpperCase(),room=await db.getRoom(code);if(!room||!room.member_ids.includes(uid)||!room.state)fail("no_room");
    const HG=GAME_RULES[room.state.game];if(!HG||!HG.hidden)fail("no_room");const seat=seatOf(room.state,uid);if(seat<0)return {view:null};
    const pv=await hLoad(db,code,room.state);if(!pv[seat])return {view:null};const vw=HG.view(room.state,seat,pv);if(peekOn&&pv.every(x=>x))vw.peek=peekFor(room.state,seat,pv);return {view:vw};
  }
  case "room_hact":{
    const code=String(p.code||"").toUpperCase(),room=await db.getRoom(code);
    if(!room||room.status!=="playing"||!room.state)fail("not_playing","المباراة مو شغّالة");
    const G=room.state,HG=GAME_RULES[G.game];if(!HG||!HG.hidden)fail("bad");const seat=seatOf(G,uid);if(seat<0)fail("not_player");
    const privs=await hLoad(db,code,G);if(privs.some(x=>x==null))fail("busy","لحظة، نجهّز الجولة");
    const e=HG.legal(G,seat,p.a,privs);if(e)fail("illegal",e);
    let res=HG.apply(G,seat,p.a,privs);
    if(res.g.game==="domino"&&res.g.winner==null&&!res.g.draw&&res.g.players[res.g.turn]&&res.g.players[res.g.turn].bot){const rb=hRunBots(res.g,res.privs,[]);res={g:rb.G,privs:rb.privs}}
    let before=null;
    const r=await roomUpdate(db,code,(rr,orig)=>{before=orig;if(rr.status!=="playing"||!rr.state||rr.state.seq!==G.seq||rr.state.mid!==G.mid)fail("stale","تغيّرت المباراة، جرّب مرة ثانية");
      rr.state=res.g;rr.turn_started_at=nowIso();if(res.g.winner!=null||res.g.draw)rr.status="ended"});
    await hSave(db,code,res.g,res.privs,privs);
    const rewards=await afterRoom(db,before,r.room,null);
    const vh=HG.view(res.g,seat,res.privs);if(await ownerOn(db,uid,"seeSecrets"))vh.peek=peekFor(res.g,seat,res.privs);
    return {room:r.room,mine:rewards[uid]||null,view:vh};
  }
  case "room_guess":{
    const code=String(p.code||"").toUpperCase(),ch=String(p.ch||"");
    if(!WW.KEYS.includes(ch))fail("illegal","حرف غير صحيح");
    const room=await db.getRoom(code);if(!room||room.status!=="playing"||!room.state||room.state.game!=="wordweb")fail("not_playing","المباراة مو شغّالة");
    const seat=seatOf(room.state,uid);if(seat<0)fail("not_player");const pr=room.state.prog[seat];if(pr.done||pr.out)fail("bad","خلصت محاولاتك");
    const W=await db.getSecret(code+":w");if(!W||W.mid!==room.state.mid)fail("busy","لحظة، الكلمة تتجهز");
    let mine=await db.getSecret(code+":"+uid);if(!mine||mine.mid!==room.state.mid)mine={mid:room.state.mid,tried:[],found:[]};
    if(mine.tried.includes(ch))fail("bad","جربت هالحرف");
    const {m,pos}=WW.guess(W.word,mine,ch);m.mid=room.state.mid;await db.setSecret(code+":"+uid,m);
    let before=null;
    const r=await roomUpdate(db,code,(rr,orig)=>{before=orig;
      if(rr.status!=="playing"||!rr.state||rr.state.mid!==m.mid)fail("not_playing","المباراة انتهت");if(rr.state.winner!=null)fail("ended");
      const ng=WW.record(rr.state,seat,pos,m.found.length,W.word.length);if(ng.winner!=null){ng.reveal=W.word;rr.status="ended"}
      rr.state=ng;rr.turn_started_at=nowIso()});
    const rewards=await afterRoom(db,before,r.room,null);
    const vg=WW.view(W.word,m,r.room.state.winner!=null);if(await ownerOn(db,uid,"seeSecrets"))vg.secret=W.word;
    return {room:r.room,mine:rewards[uid]||null,ww:vg};
  }
  case "room_act":
  case "room_skip":{
    const code=String(p.code||"").toUpperCase();let before=null;
    const r=await roomUpdate(db,code,(r,orig)=>{
      before=orig;
      if(r.status!=="playing"||!r.state)fail("not_playing");
      const G=r.state;if(G.winner!=null||(G.game==="chess"&&G.draw))fail("ended");
      if(p.gseq!==G.seq)fail("stale");
      const seat=seatOf(G,uid);if(seat<0)fail("not_player");
      let ng;
      if(G.game&&GAME_RULES[G.game]&&GAME_RULES[G.game].hidden)fail("bad","استخدم room_hact");
      if(action==="room_act"){
        const off=G.game==="chess"&&p.a&&["resign","draw_yes","draw_no"].includes(p.a.t);
        const selfFlag=G.game==="chess"&&p.a&&p.a.t==="flag"&&seat===G.turn;
        const oppFlag=G.game==="chess"&&p.a&&p.a.t==="flag"&&seat!==G.turn;
        if(!off&&!selfFlag&&!oppFlag&&G.turn!==seat)fail("not_your_turn","مو دورك");
        if(!G.game)noteMinOpp(G,seat);
        ng=checkAction(G,selfFlag?1-seat:seat,p.a);
      }
      else{
        const elapsed=clock.now()-Date.parse(r.turn_started_at||r.updated_at),lim=G.timer?G.timer*1000:90000;
        if(elapsed<lim-1000)fail("too_early","لسه وقت اللاعب ما خلص");
        ng=G.game?GAME_RULES[G.game].skip(G):doSkip(G);
      }
      skipGone(ng);r.state=ng;r.turn_started_at=nowIso();if(ng.winner!=null||ng.draw)r.status="ended";
    });
    const rewards=await afterRoom(db,before,r.room,null);
    return {room:r.room,mine:rewards[uid]||null};
  }
  case "room_leave":{
    const code=String(p.code||"").toUpperCase();let before=null,wasSeated=false;
    const r=await roomUpdate(db,code,(r,orig)=>{
      before=orig;const i=r.members.findIndex(m=>m.id===uid);if(i<0)return {noWrite:true};
      r.members.splice(i,1);r.member_ids=r.member_ids.filter(x=>x!==uid);
      if(r.host===uid&&r.members.length)r.host=r.members[0].id;
      const G=r.state;
      if(r.status==="playing"&&G&&G.game==="chess"&&G.winner==null&&!G.draw){
        const seat=seatOf(G,uid);
        if(seat>=0){G.winner=seat===0?1:0;G.draw=false;G.reason="resign";G.offer=null;G.seq++;r.status="ended";r.turn_started_at=nowIso()}
      }else if(r.status==="playing"&&G&&G.winner==null){
        const seat=seatOf(G,uid);
        if(seat>=0){wasSeated=true;G.gone=[...new Set([...(G.gone||[]),seat])];
          const alive=G.players.map((x,k)=>k).filter(k=>!G.gone.includes(k));
          if(alive.length===1){G.winner=alive[0];const wid=G.players[alive[0]].id;G.score[wid]=(G.score[wid]||0)+1;r.status="ended"}
          else skipGone(G);
          G.seq++;r.turn_started_at=nowIso();}
      }
    });
    const rewards=r.res&&r.res.noWrite?{}:await afterRoom(db,before,r.room,wasSeated?uid:null);
    if(r.room&&!r.room.members.length)await db.deleteRoom(code);
    return {ok:true};
  }
  case "room_ready":{
    const code=String(p.code||"").toUpperCase();
    const r=await roomUpdate(db,code,r=>{const i=r.members.findIndex(m=>m.id===uid);if(i<0)fail("not_member");if(r.status==="playing")return {noWrite:true};r.members[i].ready=r.host===uid?true:!!p.ready});
    return {room:r.room};
  }
  case "room_lobby":{
    const code=String(p.code||"").toUpperCase();
    const r=await roomUpdate(db,code,r=>{if(r.host!==uid)fail("not_host");if(r.status!=="ended")return {noWrite:true};r.status="lobby";for(const m of r.members)m.ready=m.id===r.host});
    return {room:r.room};
  }
  case "room_list":{
    const rows=await db.listPublicRooms(clock.now()-20*60000);
    return {rooms:rows.filter(x=>x.members.length<(MAX_PLAYERS[(x.settings&&x.settings.game)||"webbound"]||4)&&!x.member_ids.includes(uid)&&(!p.game||((x.settings&&x.settings.game)||"webbound")===p.game)).slice(0,20).map(x=>{const host=x.members.find(m=>m.id===x.host)||x.members[0]||{};
      const gm=(x.settings&&x.settings.game)||"webbound";
      return {code:x.code,name:(x.settings&&x.settings.name)||"غرفة",game:gm,count:x.members.length,max:MAX_PLAYERS[gm]||4,timer:(x.settings&&x.settings.timer)||0,host:{nick:host.nick,skin:host.skin,pub:host.pub,owner:!!host.owner}}})};
  }
  case "room_quick":{
    const rows=await db.listPublicRooms(clock.now()-20*60000);
    for(const x of rows){
      const gm=(x.settings&&x.settings.game)||"webbound";if(p.game&&gm!==p.game)continue;
      if(x.members.length>=(MAX_PLAYERS[gm]||4)||x.member_ids.includes(uid))continue;
      try{const j=await handle("room_join",{code:x.code},user,db);if(j&&j.room)return {room:j.room,joined:true}}catch(e){}
    }
    const c=await handle("room_create",{public:true,game:p.game},user,db);return {room:c.room,joined:false};
  }
  case "room_get":{
    const code=String(p.code||"").toUpperCase();const room=await db.getRoom(code);
    if(!room||!room.member_ids.includes(uid))fail("no_room","الغرفة مو موجودة");
    return {room};
  }
  /* ---- social: friend code, requests, block, last_seen. No email leaves the server. ---- */
  case "social_touch":{
    const r=await db.rpc("social_touch",{p_user:uid});
    if(!r||r.error)fail("bad","تعذّر تحديث الحضور");
    return r.data||{code:"ok"};
  }
  case "social_list":{
    const r=await db.rpc("social_list",{p_user:uid});
    if(!r||r.error)fail("bad","تعذّر قراءة الأصحاب");
    return r.data||{code:"bad_request"};
  }
  case "social_search":{
    limit(uid,"social",20,60000);
    const r=await db.rpc("social_search",{p_user:uid,p_q:String(p.q||"").slice(0,16)});
    if(!r||r.error)fail("bad","تعذّر البحث");
    return r.data||{code:"bad_request",rows:[]};
  }
  case "social_request":{
    limit(uid,"social",12,60000);
    const other=String(p.id||"");
    if(!/^[0-9a-f-]{36}$/i.test(other))fail("bad","اختر لاعب من نتائج البحث");
    const r=await db.rpc("social_request",{p_user:uid,p_other:other});
    if(!r||r.error)fail("bad","ما انرسل الطلب");
    const d=r.data||{};
    if(d.code==="blocked")fail("bad","ما تقدر ترسل لهذا اللاعب");
    if(d.code==="missing")fail("bad","ما لقينا اللاعب");
    if(d.code==="full")fail("bad","وصلت الحد الأعلى للأصحاب");
    if(d.code!=="ok")fail("bad","ما انرسل الطلب");
    return d;
  }
  case "social_respond":{
    const other=String(p.id||"");
    if(!/^[0-9a-f-]{36}$/i.test(other))fail("bad","ما فيه طلب");
    const r=await db.rpc("social_respond",{p_user:uid,p_other:other,p_accept:!!p.accept});
    if(!r||r.error||!r.data||r.data.code!=="ok")fail("bad","ما فيه طلب");
    return r.data;
  }
  case "social_remove":{
    const other=String(p.id||"");
    if(!/^[0-9a-f-]{36}$/i.test(other))fail("bad","اختر صاحب");
    const r=await db.rpc("social_remove",{p_user:uid,p_other:other});
    if(!r||r.error)fail("bad","ما انحذف");
    return r.data||{code:"ok"};
  }
  case "social_block":{
    limit(uid,"social",12,60000);
    const other=String(p.id||"");
    if(!/^[0-9a-f-]{36}$/i.test(other))fail("bad","اختر لاعب");
    const r=await db.rpc("social_block",{p_user:uid,p_other:other,p_on:p.on!==false});
    if(!r||r.error)fail("bad","ما تغيّر الحظر");
    return r.data||{code:"ok"};
  }
  case "social_card":{
    const r=await db.rpc("social_card_set",{p_user:uid,p_avatar:typeof p.avatar==="string"?p.avatar:"",p_fav:typeof p.fav==="string"?p.fav:""});
    if(!r||r.error)fail("bad","ما انحفظت البطاقة");
    const w=await withProfile(db,uid,()=>{
      const icons=["spark","moon","star","heart","crown","bolt","flame","globe","target","medal","cloud","eye"];
      const games=["","webbound","webgrid","xo","wordweb","webline","dama","bluff","flyhunt","webwar","webnest","nightweb","ballclash","domino","kalima","chess"];
      if(icons.includes(p.avatar))P.avatarIcon=p.avatar;
      if(typeof p.fav==="string"&&games.includes(p.fav))P.favGame=p.fav;
    });
    return {profile:w.profile,card:r.data};
  }
  case "social_chat":{
    limit(uid,"chatfast",1,2500);
    limit(uid,"chat",8,60000);
    const id=String(p.id||"");
    const r=await db.rpc("social_chat_ok",{p_id:id});
    if(!r||r.error||!r.data||r.data.code!=="ok")fail("bad","هذي العبارة مو متاحة");
    return {ok:true,id};
  }
  case "bot_deal":{
    limit(uid,"deal",12,60000);
    if(p.game!=="domino"&&p.game!=="chess")fail("bad","لعبة غير معروفة");
    const seed=(crypto.getRandomValues(new Uint32Array(1))[0]&0x7fffffff)||1;
    const raw=crypto.getRandomValues(new Uint8Array(18));
    const alphabet="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let nonce="";for(let i=0;i<raw.length;i++)nonce+=alphabet[raw[i]%alphabet.length];
    if(p.game==="chess"){
      const lvl=isInt(p.level,1,4)?p.level:1;
      const color=p.color==="b"?"b":"w";
      const bots=color==="b"?[lvl,0]:[0,lvl];
      const opened=await db.rpc("bot_deal_open",{p_user:uid,p_nonce:nonce,p_game:"chess",p_seed:seed,p_spec:{bots,level:lvl,color},p_ttl:7200});
      if(!opened||opened.error||!opened.data||opened.data.code!=="ok")fail("bad","ما قدرنا نوزع القطع");
      return {nonce,seed,bots,level:lvl,color,game:"chess"};
    }
    const n=p.n===4?4:2;
    const lvl=isInt(p.level,1,3)?p.level:2;
    const bots=[0];
    for(let i=0;i<(n===4?3:1);i++)bots.push(lvl);
    const opened=await db.rpc("bot_deal_open",{p_user:uid,p_nonce:nonce,p_game:"domino",p_seed:seed,p_spec:{n,bots},p_ttl:7200});
    if(!opened||opened.error||!opened.data||opened.data.code!=="ok")fail("bad","ما قدرنا نوزع الأحجار");
    return {nonce,seed,n,bots,game:"domino"};
  }
  case "dom_finish":{
    limit(uid,"dom",20,60000);
    const req=String(p.requestId||"");
    if(!/^[A-Za-z0-9:_-]{8,80}$/.test(req))fail("bad","طلب غير صحيح");
    let won=false,amount=10;
    if(p.code){
      const code=String(p.code||"").toUpperCase();
      const room=await db.getRoom(code);
      if(!room||!(room.member_ids||[]).includes(uid)||!room.state||room.state.game!=="domino")fail("bad","الغرفة مو موجودة");
      const seat=seatOf(room.state,uid);if(seat<0)fail("not_player","ما كنت في المباراة");
      if(room.state.winner==null&&!room.state.draw)fail("bad","المباراة ما خلصت");
      won=DOMINO.playerWon(room.state,seat);amount=20;
    }else if(p.solo){
      const row=await db.getSolo(String(p.solo),uid);
      if(!row||!row.state||row.state.game!=="domino")fail("bad","ما لقينا المباراة");
      if(row.state.winner==null&&!row.state.draw)fail("bad","المباراة ما خلصت");
      won=DOMINO.playerWon(row.state,0);
    }else{
      const nonce=String(p.nonce||"");
      if(!/^[A-Za-z0-9]{16,40}$/.test(nonce))fail("bad","التوزيع مو من الخادم");
      const moves=Array.isArray(p.moves)?p.moves.slice(0,201):null;if(!moves||moves.length>200)fail("bad","السجل غير صحيح");
      const deal=await db.rpc("bot_deal_take",{p_user:uid,p_nonce:nonce,p_game:"domino",p_min_ms:12000});
      if(!deal||deal.error||!deal.data)fail("bad","ما لقينا التوزيع");
      if(deal.data.code==="early")fail("bad","المباراة قصيرة");
      if(deal.data.code!=="ok")fail("bad","التوزيع ما عاد صالح");
      const spec=deal.data.spec||{};
      const n=spec.n===4?4:2;
      const bots=Array.isArray(spec.bots)?spec.bots.map(x=>Number(x)|0):[];
      if(bots.length!==n||bots[0]!==0||bots.some((b,i)=>i>0&&(b<1||b>3)))fail("bad","الكمبيوتر مو مضبوط");
      let st;try{st=DOMINO.replay(Number(deal.data.seed)>>>0,n,moves,bots)}catch(e){fail("bad","الحركات ما تطابق اللعب")}
      won=DOMINO.playerWon(st,0);
    }
    if(!won)return {won:false,amount:0};
    const day=riyadhDay(clock.now());
    const paid=await db.rpc("coin_grant",{p_user:uid,p_request:req,p_kind:"domino",p_amount:amount,p_day:day,p_cap:8});
    if(!paid||paid.error||!paid.data||paid.data.code!=="ok")fail("bad","ما انحسبت المكافأة");
    return {won:true,amount:paid.data.granted||0,capped:!!paid.data.capped,idempotent:!!paid.data.idempotent,coins:paid.data.coins,version:paid.data.version};
  }
  case "word_start":{
    limit(uid,"word",40,60000);
    const day=riyadhDay(clock.now());
    const secret=await kalimaSecret(db);
    if(!secret)return {day,guesses:[],status:"off",disabled:true,streak:0,best:0,tries:6};
    const r=await db.rpc("word_load",{p_user:uid,p_day:day});
    if(!r||r.error||!r.data||r.data.code!=="ok")fail("bad","تعذّر فتح كلمة اليوم");
    return {day,guesses:r.data.guesses||[],status:r.data.status||"open",streak:r.data.streak||0,best:r.data.best||0,tries:6};
  }
  case "word_guess":{
    limit(uid,"wordfast",1,350);
    limit(uid,"word",40,60000);
    const day=riyadhDay(clock.now());
    const secret=await kalimaSecret(db);
    if(!secret)fail("bad","كلمة اليوم غير مفعّلة");
    const guess=KALIMA.norm(p.word);
    if(!/^[\u0627-\u064A]{5}$/.test(guess)||!KALIMA_GUESS.has(guess))fail("bad","الكلمة مو في القائمة");
    const cur=await db.rpc("word_load",{p_user:uid,p_day:day});
    if(!cur||cur.error||!cur.data||cur.data.code!=="ok")fail("bad","تعذّر فتح كلمة اليوم");
    const rows=Array.isArray(cur.data.guesses)?cur.data.guesses:[];
    if(rows.some(g=>g&&g.w===guess))return {day,guesses:rows,status:cur.data.status||"open",streak:cur.data.streak||0,best:cur.data.best||0,tries:6,idempotent:true};
    if((cur.data.status&&cur.data.status!=="open")||rows.length>=6)fail("bad","خلصت كلمة اليوم");
    const answer=await kalimaAnswer(secret, day, KALIMA_ANSWERS);
    const marks=KALIMA.score(answer,guess);
    const status=marks==="ggggg"?"won":rows.length+1>=6?"lost":"open";
    const saved=await db.rpc("word_apply",{p_user:uid,p_day:day,p_prev:KALIMA.prevDay(day),p_guess:guess,p_marks:marks,p_status:status});
    if(!saved||saved.error||!saved.data||saved.data.code==="bad_request")fail("bad","ما انحفظ التخمين");
    if(saved.data.code==="closed")fail("bad","خلصت كلمة اليوم");
    return {day,guesses:saved.data.guesses||[],status:saved.data.status||status,streak:saved.data.streak||0,best:saved.data.best||0,tries:6,idempotent:!!saved.data.idempotent};
  }
  case "chess_finish":{
    limit(uid,"chess",20,60000);
    const req=String(p.requestId||"");
    if(!/^[A-Za-z0-9:_-]{8,80}$/.test(req))fail("bad","طلب غير صحيح");
    let won=false,amount=10;
    if(p.code){
      const code=String(p.code||"").toUpperCase();
      const room=await db.getRoom(code);
      if(!room||!(room.member_ids||[]).includes(uid)||!room.state||room.state.game!=="chess")fail("bad","الغرفة مو موجودة");
      const seat=seatOf(room.state,uid);if(seat<0)fail("not_player","ما كنت في المباراة");
      const st=room.state;
      if(st.winner==null&&!st.draw)fail("bad","المباراة ما خلصت");
      let replayed;
      try{replayed=CHESS.replay(st.sans||[],[0,0],{bots:false})}catch(e){fail("bad","الحركات ما تطابق اللعب")}
      const terminal=["mate","stalemate","rep","50","material"];
      if(terminal.includes(st.reason)){
        if(replayed.winner!==st.winner||!!replayed.draw!==!!st.draw||replayed.reason!==st.reason)fail("bad","الحركات ما تطابق اللعب");
      }else if(st.reason==="resign"||st.reason==="time"||st.reason==="agree"){
        if((replayed.winner!=null||replayed.draw)&&replayed.reason!==st.reason)fail("bad","الحركات ما تطابق اللعب");
      }else fail("bad","نتيجة غير معروفة");
      won=st.winner===seat&&(st.reason==="mate"||st.reason==="resign"||st.reason==="time");
      amount=20;
    }else if(p.solo){
      const row=await db.getSolo(String(p.solo),uid);
      if(!row||!row.state||row.state.game!=="chess")fail("bad","ما لقينا المباراة");
      const st=row.state;
      const seat=st.players.findIndex(x=>x.id===uid);if(seat<0)fail("not_player");
      if(st.winner==null&&!st.draw)fail("bad","المباراة ما خلصت");
      const bots=st.players.map(x=>x.bot|0);
      let replayed;
      try{replayed=CHESS.replay(st.sans||[],bots,{tie:st.tie|0})}catch(e){fail("bad","الحركات ما تطابق اللعب")}
      if(replayed.winner!==st.winner||!!replayed.draw!==!!st.draw||replayed.reason!==st.reason)fail("bad","الحركات ما تطابق اللعب");
      won=st.winner===seat&&st.reason==="mate";
    }else{
      const nonce=String(p.nonce||"");
      if(!/^[A-Za-z0-9]{16,40}$/.test(nonce))fail("bad","التوزيع مو من الخادم");
      const sans=Array.isArray(p.sans)?p.sans.slice(0,401):null;
      if(!sans||sans.length>400)fail("bad","السجل غير صحيح");
      const deal=await db.rpc("bot_deal_take",{p_user:uid,p_nonce:nonce,p_game:"chess",p_min_ms:12000});
      if(!deal||deal.error||!deal.data)fail("bad","ما لقينا التوزيع");
      if(deal.data.code==="early")fail("bad","المباراة قصيرة");
      if(deal.data.code!=="ok")fail("bad","التوزيع ما عاد صالح");
      const spec=deal.data.spec||{};
      const bots=Array.isArray(spec.bots)?spec.bots.map(x=>Number(x)|0):[];
      if(bots.length!==2||bots.filter(b=>b===0).length!==1||bots.some(b=>b!==0&&(b<1||b>4)))fail("bad","الكمبيوتر مو مضبوط");
      const seat=bots[0]===0?0:1;
      let st;
      try{st=CHESS.replay(sans,bots,{tie:Number(deal.data.seed)>>>0})}catch(e){fail("bad","الحركات ما تطابق اللعب")}
      won=st.winner===seat&&st.reason==="mate";
    }
    if(!won)return {won:false,amount:0};
    const day=riyadhDay(clock.now());
    const paid=await db.rpc("coin_grant",{p_user:uid,p_request:req,p_kind:"chess",p_amount:amount,p_day:day,p_cap:8});
    if(!paid||paid.error||!paid.data||paid.data.code!=="ok")fail("bad","ما انحسبت المكافأة");
    return {won:true,amount:paid.data.granted||0,capped:!!paid.data.capped,idempotent:!!paid.data.idempotent,coins:paid.data.coins,version:paid.data.version};
  }
  }
  fail("bad","طلب غير معروف");
}

/* ===================== HTTP entry (Supabase Edge Function) ===================== */
/* Max-Age lets the browser skip the extra permission request before every move */
const CORS={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Access-Control-Max-Age":"86400"};
function supaDB(a){
  const chk=r=>{if(r.error)throw r.error;return r.data};
  const iso=ms=>new Date(ms).toISOString();
  return {
    async rpc(fn,args){return a.rpc(fn,args)},
    async getProfile(id){return chk(await a.from("profiles").select("id,role,data,version").eq("id",id).maybeSingle())},
    async insertProfile(id,data,nickname){const r=await a.from("profiles").insert({id,data,nickname:nickname||"",version:1});if(r.error&&r.error.code!=="23505")throw r.error},
    async updateProfile(id,version,data,nickname){const r=chk(await a.from("profiles").update({data,nickname:nickname||"",version:version+1,updated_at:iso(Date.now())}).eq("id",id).eq("version",version).select("version"));return Array.isArray(r)&&r.length===1},
    async setPublic(id,card){chk(await a.from("public_profiles").upsert(Object.assign({id,updated_at:iso(Date.now())},card)))},
    async publicCards(ids){return chk(await a.from("public_profiles").select("id,nickname,level,pub,is_owner,updated_at").in("id",ids))||[]},
    async useCode(code,uid){return chk(await a.rpc("use_code",{p_code:code,p_user:uid}))},
    async listCodes(){return chk(await a.from("secret_codes").select("code,rewards,active,expires_at,max_uses,uses,label,builtin,created_at").order("builtin",{ascending:true}).order("created_at",{ascending:false}))||[]},
    async upsertCode(row){chk(await a.from("secret_codes").upsert(row))},
    async updateCode(code,patch){chk(await a.from("secret_codes").update(patch).eq("code",code))},
    async deleteCode(code){chk(await a.from("secret_codes").delete().eq("code",code))},
    async getRoom(code){return chk(await a.from("rooms").select("*").eq("code",code).maybeSingle())},
    async insertRoom(row){const r=await a.from("rooms").insert(row).select("*").maybeSingle();if(r.error){if(r.error.code==="23505")return null;throw r.error}return r.data},
    async updateRoom(code,seq,row){
      const patch={host:row.host,status:row.status,members:row.members,member_ids:row.member_ids,settings:row.settings,state:row.state,seq:row.seq,turn_started_at:row.turn_started_at,updated_at:row.updated_at};
      const r=chk(await a.from("rooms").update(patch).eq("code",code).eq("seq",seq).select("*"));return Array.isArray(r)&&r.length?r[0]:null},
    async deleteRoom(code){chk(await a.from("rooms").delete().eq("code",code))},
    async listPublicRooms(sinceMs){return chk(await a.from("rooms").select("code,host,members,member_ids,settings,status,updated_at").eq("status","lobby").eq("settings->>public","true").gt("updated_at",iso(sinceMs)).order("updated_at",{ascending:false}).limit(40))||[]},
    async cleanRooms(){chk(await a.from("rooms").delete().lt("updated_at",iso(Date.now()-86400000)))},
    async getSolo(id,uid){if(!/^[0-9a-f-]{36}$/i.test(id))return null;return chk(await a.from("solo_matches").select("*").eq("id",id).eq("user_id",uid).maybeSingle())},
    async insertSolo(row){return chk(await a.from("solo_matches").insert(row).select("*").single())},
    async updateSolo(id,uid,seq,patch){const r=chk(await a.from("solo_matches").update(patch).eq("id",id).eq("user_id",uid).eq("seq",seq).select("id"));return Array.isArray(r)&&r.length===1},
    async cleanSolo(uid){chk(await a.from("solo_matches").delete().eq("user_id",uid).lt("updated_at",iso(Date.now()-86400000)))},
    async insertResult(row){const r=await a.from("match_results").insert(row);if(r.error){if(r.error.code==="23505")return false;throw r.error}return true},
    async bumpWeekly(week,uid,won){chk(await a.rpc("bump_weekly",{p_week:week,p_user:uid,p_won:won}))},
    async weeklyTop(week,n){return chk(await a.from("weekly_wins").select("user_id,wins,games").eq("week",week).gt("games",0).order("wins",{ascending:false}).order("games",{ascending:true}).limit(n))||[]},
    async weeklyRow(week,uid){return chk(await a.from("weekly_wins").select("user_id,wins,games").eq("week",week).eq("user_id",uid).maybeSingle())},
    async audit(actor,action,detail){await a.from("audit_log").insert({actor,action,detail})},
    async stats(week){const cnt=async q=>{const r=await q;if(r.error)throw r.error;return r.count||0};
      return {players:await cnt(a.from("profiles").select("id",{count:"exact",head:true})),
        playing:await cnt(a.from("rooms").select("code",{count:"exact",head:true}).eq("status","playing")),
        open:await cnt(a.from("rooms").select("code",{count:"exact",head:true}).eq("status","lobby")),
        redeemedToday:await cnt(a.from("code_redemptions").select("code",{count:"exact",head:true}).gt("redeemed_at",iso(Date.now()-86400000))),
        newMessages:await cnt(a.from("feedback").select("id",{count:"exact",head:true}).eq("status","new")),
        weekGames:((chk(await a.from("weekly_wins").select("games").eq("week",week))||[]).reduce((n,r)=>n+r.games,0))}},
    async recentRedemptions(n){return chk(await a.from("code_redemptions").select("user_id,code,redeemed_at").order("redeemed_at",{ascending:false}).limit(n))||[]},
    async recentAudit(n){return chk(await a.from("audit_log").select("action,detail,created_at").order("created_at",{ascending:false}).limit(n))||[]},
    async getSetting(key){const r=chk(await a.from("app_settings").select("value").eq("key",key).maybeSingle());return r?r.value:null},
    async setSetting(key,value){chk(await a.from("app_settings").upsert({key,value,updated_at:iso(Date.now())}))},
    async feedbackCount(uid,since){const r=await a.from("feedback").select("id",{count:"exact",head:true}).eq("user_id",uid).gt("created_at",iso(since));if(r.error)throw r.error;return r.count||0},
    async insertFeedback(row){chk(await a.from("feedback").insert(row))},
    async listFeedback(n){return chk(await a.from("feedback").select("id,kind,title,body,contact,nickname,status,created_at").neq("status","deleted").order("created_at",{ascending:false}).limit(n))||[]},
    async setFeedback(id,status){chk(await a.from("feedback").update({status}).eq("id",id))},
    async getLineScore(day,uid,tb){return chk(await a.from(tb||"line_scores").select("score,ticks").eq("day",day).eq("user_id",uid).maybeSingle())},
    async setLineScore(day,uid,score,ticks,tb){chk(await a.from(tb||"line_scores").upsert({day,user_id:uid,score,ticks,created_at:iso(Date.now())}))},
    async lineTop(day,n,tb){return chk(await a.from(tb||"line_scores").select("user_id,score").eq("day",day).order("score",{ascending:false}).order("created_at",{ascending:true}).limit(n))||[]},
    async lineRank(day,score,tb){const r=await a.from(tb||"line_scores").select("user_id",{count:"exact",head:true}).eq("day",day).gt("score",score);if(r.error)throw r.error;return (r.count||0)+1},
    async getSecret(k){const r=chk(await a.from("game_secrets").select("v").eq("k",k).maybeSingle());return r?r.v:null},
    async setSecret(k,v){chk(await a.from("game_secrets").upsert({k,v,updated_at:iso(Date.now())}))},
    async ownerId(){const r=chk(await a.from("profiles").select("id").eq("role","owner").order("created_at",{ascending:true}).limit(1));return r&&r[0]?r[0].id:null},
    async friendsOf(uid){return chk(await a.from("friends").select("a,b,status,requested_by,created_at").or(`a.eq.${uid},b.eq.${uid}`).limit(1000))||[]},
    async getFriend(x,y){const [p,q]=x<y?[x,y]:[y,x];return chk(await a.from("friends").select("a,b,status,requested_by").eq("a",p).eq("b",q).maybeSingle())},
    async makeFriends(x,y,status,by){const [p,q]=x<y?[x,y]:[y,x];chk(await a.from("friends").upsert({a:p,b:q,status,requested_by:by}))},
    async deleteFriend(x,y){const [p,q]=x<y?[x,y]:[y,x];chk(await a.from("friends").delete().eq("a",p).eq("b",q))},
    async getAccount(name){return chk(await a.from("accounts").select("*").eq("username",name).maybeSingle())},
    async accountByUser(uid){return chk(await a.from("accounts").select("username").eq("user_id",uid).maybeSingle())},
    async insertAccount(row){const r=await a.from("accounts").insert(row);if(r.error){if(r.error.code==="23505")return false;throw r.error}return true},
    async accountFail(name,n,until){chk(await a.from("accounts").update({fails:n,locked_until:until}).eq("username",name))},
    async updateAccountHash(name,salt,hash,iter){chk(await a.from("accounts").update({salt,hash,iter,fails:0,locked_until:null}).eq("username",name))},
    async authUser(uid){const r=await a.auth.admin.getUserById(uid);if(r.error)throw r.error;return r.data&&r.data.user},
    async authSetEmail(uid,email){const r=await a.auth.admin.updateUserById(uid,{email,email_confirm:true});if(r.error)throw r.error},
    async authLinkToken(email){const r=await a.auth.admin.generateLink({type:"magiclink",email});if(r.error)throw r.error;return r.data.properties.hashed_token}
  };
}
if(typeof Deno!=="undefined"&&Deno.serve&&!(Deno.env&&Deno.env.get("SPIDER_NO_SERVE"))){
  const {createClient}=await import("npm:@supabase/supabase-js@2");
  const admin=createClient(Deno.env.get("SUPABASE_URL"),Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),{auth:{persistSession:false,autoRefreshToken:false}});
  const db=supaDB(admin);
  /* checks the login token locally with the project's public keys (no extra network trip);
     falls back to asking the auth server for older projects */
  async function whoIs(jwt){
    try{if(admin.auth.getClaims){const r=await admin.auth.getClaims(jwt);const c=r&&r.data&&r.data.claims;if(c&&c.sub&&!r.error)return {id:c.sub,is_anonymous:!!c.is_anonymous}}}catch(e){}
    const {data,error}=await admin.auth.getUser(jwt);
    return error||!data||!data.user?null:data.user;
  }
  Deno.serve(async req=>{
    const send=(o,s)=>new Response(JSON.stringify(o),{status:s||200,headers:{...CORS,"Content-Type":"application/json"}});
    if(req.method==="OPTIONS")return new Response("ok",{headers:CORS});
    try{
      const jwt=(req.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"");
      if(!jwt)return send({error:"auth",message:"سجّل دخول أول"},401);
      const user=await whoIs(jwt);
      if(!user)return send({error:"auth",message:"سجّل دخول أول"},401);
      const body=await req.json().catch(()=>({}));
      return send(await handle(String(body.action||""),body.payload||{},user,db));
    }catch(e){
      if(e instanceof Fail)return send({error:e.code,message:e.message},400);
      console.error(e);return send({error:"server",message:"صار خطأ في الخادم"},500);
    }
  });
}
if(typeof Deno==="undefined"||(Deno.env&&Deno.env.get("SPIDER_NO_SERVE"))){
  const bootErr=[];
  if(!BC.KINDS.umbra||BC.KINDS.umbra.shop!==true)bootErr.push("umbra");
  if(BC.KINDS.sword.pw!==1.117||BC.KINDS.sword.hpf!==1.117)bootErr.push("sword");
  if(BCR.okKind("umbra")||BCR.okKind("droneunit")||!BCR.okKind("sword"))bootErr.push("okKind");
  const pv=[{picks:[]}];
  BCR.autoFill({pick:"secret",n:1,size:4,locked:[false]},pv);
  if(!pv[0].picks.length||pv[0].picks.some(k=>!BC.KINDS[k]||BC.KINDS[k].shop))bootErr.push("autoFill");
  if(typeof handle!=="function"||!globalThis.BC_SHOP_HANDLER)bootErr.push("handle");
  if(!GAME_RULES.domino||GAME_RULES.domino.hidden!==true)bootErr.push("domino");
  const dOpen=DOMINO.rules.new([{id:"h",nick:"ح"},{id:"b",nick:"ب",bot:1}],{seed:7});
  if(!dOpen.moves||dOpen.chain.length!==1)bootErr.push("domino-open");
  if(!KALIMA||KALIMA.score("مدرسه","مدرسه")!=="ggggg"||KALIMA.norm("مدرسة")!=="مدرسه")bootErr.push("kalima");
  if(!KALIMA_ANSWERS||KALIMA_ANSWERS.length<365||!KALIMA_GUESS.has(KALIMA_ANSWERS[0]))bootErr.push("kalima-list");
  if(KALIMA.dayIndex("2026-01-01",KALIMA_ANSWERS.length)!==0)bootErr.push("kalima-day");
  if(riyadhDay(Date.parse("2026-10-20T20:59:00Z"))!=="2026-10-20")bootErr.push("riyadh-before");
  if(riyadhDay(Date.parse("2026-10-20T21:00:00Z"))!=="2026-10-21")bootErr.push("riyadh-after");
  if(kalimaSecretText("short", null)!=="")bootErr.push("kalima-secret-short");
  if(kalimaSecretText("", {s:"0123456789abcdef"})!=="0123456789abcdef")bootErr.push("kalima-secret-row");
  if(!CHESS||!GAME_RULES.chess||CHESS.perft(undefined,1)!==20)bootErr.push("chess");
  if(bootErr.length)throw new Error("spider v10 boot: "+bootErr.join(","));
}
