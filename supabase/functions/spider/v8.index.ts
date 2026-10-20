// SPIDER — Supabase Edge Function "spider" (accounts, rooms, 12 games, store, codes, friends, owner tools)
// Paste this whole file into: Supabase Dashboard → Edge Functions → spider → Code → Deploy
// It needs no secrets from you: Supabase provides SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to every function.
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
const CATS={skin:SKINS,frame:FRAMES,deco:DECOS,bg:BGS,badge:BADGES,theme:THEMES,title:TITLES,board:BOARDS,web:WEBS,move:MOVES,win:WINS,emote:EMOTES,lobby:LOBBIES,sound:SOUNDS,xmark:XMARKS};
const CAT_NAME={skin:"سكنات",frame:"إطارات",deco:"زينة",bg:"خلفيات",badge:"شارات",theme:"ألوان الاسم",title:"ألقاب",board:"طاولات",web:"خيوط",move:"تأثيرات الحركة",win:"تأثيرات الفوز",emote:"تفاعلات",lobby:"غرف الانتظار",sound:"حزم الأصوات",xmark:"أشكال XO"};
const CAT_ONE={skin:"سكن",xmark:"شكل XO",frame:"إطار",deco:"زينة",bg:"خلفية",badge:"شارة",theme:"لون اسم",title:"لقب",board:"طاولة",web:"خيط",move:"تأثير حركة",win:"تأثير فوز",emote:"تفاعل",lobby:"غرفة انتظار",sound:"حزمة أصوات"};
const CAT_MINE={skin:"سكنك",frame:"إطارك",deco:"زينتك",bg:"خلفيتك",badge:"شارتك",theme:"لون اسمك",title:"لقبك",board:"طاولتك",web:"خيطك",move:"تأثير حركتك",win:"تأثير فوزك",emote:"تفاعلك",lobby:"غرفتك",sound:"أصواتك",xmark:"شكل XO حقك"};
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
  okKind(k){return typeof BC!=="undefined"&&!!BC.KINDS[k]&&!BC.KINDS[k].hidden},
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
  autoFill(g,pv){const pool=BC.PICK.slice(),rnd=()=>pool[Math.floor(Math.random()*pool.length)];
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
  if(G.game&&GAME_RULES[G.game]){const RU=GAME_RULES[G.game],e=RU.legal(G,seat,a);if(e)fail("illegal",e);return RU.apply(G,seat,a)}
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
async function settle(db,uid,G,seat,mode,won,extra){
  if(G.seq-(G.s0||G.seq)<(G.game==="ballclash"?1:G.game==="xo"?5:G.game==="wordweb"?3:(mode==="online"?6:3)))return null;     /* too short to count */
  const inserted=await db.insertResult({mid:G.mid,user_id:uid,mode,won,week:weekStart()});
  const w=await withProfile(db,uid,role=>finishMatch(matchCtx(G,seat,mode,won,role,extra)));
  if(inserted&&mode==="online")await db.bumpWeekly(weekStart(),uid,won);
  return w;
}

/* ---------- solo matches against the computer (the server plays the bots) ---------- */
function runBots(G,steps){
  let k=0;while(G.winner==null&&G.players[G.turn].bot&&k++<60){
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
  const prev=r.state,game=(r.settings&&GAME_RULES[r.settings.game])?r.settings.game:"webbound",members=r.members.slice(0,MAX_PLAYERS[game]);
  const players=distinctSkins(members.map(m=>({id:m.id,nick:m.nick,skin:m.skin,bot:0})));
  const o={seq:(prev?prev.seq:0)+1,timer:(r.settings&&r.settings.timer)||0,score:prev?Object.assign({},prev.score):{},round:prev?prev.round+1:1,bs:(r.settings&&r.settings.bs)||"classic"};
  if(game==="wordweb")o.cat=(r.settings&&r.settings.cat)||"fruit";
  if(game==="ballclash"){o.bcSize=(r.settings&&r.settings.bcSize)||2;o.bcPick=(r.settings&&r.settings.bcPick)||"secret"}
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
function peekFor(G,seat,pv){if(G.game==="bluff")return {dice:pv.map(x=>x?x.dice:[])};if(G.game==="flyhunt")return {ships:pv[1-seat]?pv[1-seat].ships:[]};if(G.game==="nightweb")return {roles:pv.map(x=>x?x.role:null)};return null}
/* ---------- hidden-information games: each seat's private data is a separate server-only record ---------- */
async function hLoad(db,key,G){const out=[];for(let s=0;s<G.n;s++){const v=await db.getSecret(key+":h"+s);out.push(v&&v.mid===G.mid?v.d:null)}return out}
async function hSave(db,key,G,privs,old){for(let s=0;s<privs.length;s++){if(old&&JSON.stringify(old[s])===JSON.stringify(privs[s]))continue;await db.setSecret(key+":h"+s,{mid:G.mid,d:privs[s]})}}
function hRunBots(G,privs,steps){const HG=GAME_RULES[G.game];let k=0;
  while(G.winner==null&&G.players[G.turn].bot&&k++<80){const a=HG.bot(G,G.turn,privs);const r=a?HG.apply(G,G.turn,a,privs):HG.skip(G,privs);G=r.g;privs=r.privs;steps.push(deep(G))}
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
  case "bc_start":{
    limit(uid,"bc",30,60000);
    if(typeof BC==="undefined")fail("bad","اللعبة مو جاهزة في السيرفر");
    const teams=Array.isArray(p.teams)?p.teams:null;if(!teams||teams.length<2||teams.length>8)fail("bad","الفرق غير صحيحة");
    const clean=teams.map(t=>{const b=Array.isArray(t.balls)?t.balls.slice(0,8):[];if(!b.length||b.some(k=>!BC.KINDS[k]||BC.KINDS[k].hidden))fail("bad","كورة غير معروفة");return {balls:b}});
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
    const bots=Math.min(isInt(p.bots,1,3)?p.bots:1,MAX_PLAYERS[game]-1),lvl=isInt(p.level,1,3)?p.level:2;
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
    let G=row.state;if(G.winner!=null)fail("ended");if(G.players[G.turn].bot||G.turn!==0)fail("not_your_turn");
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
    const o2={seq:prev.seq+1,round:prev.round+1,score:Object.assign({},prev.score),bs:pubEff("board",role==="owner"),cat:prev.cat};
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
    const row=await db.getSolo(String(p.id),uid);if(!row||row.practice||row.state.winner!=null)return {ok:true};
    const G=row.state;const acts=((G.mv||[])[0]||0)+G.walls.filter(w=>w[3]===0).length;
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
    const r=await roomUpdate(db,code,r=>{if(r.host!==uid)fail("not_host");if([0,30,60].includes(p.timer))r.settings.timer=p.timer;if(p.cat&&WW_CATS[p.cat])r.settings.cat=p.cat;if([1,2,3,4,5].includes(p.bcSize))r.settings.bcSize=p.bcSize;if(["secret","draft"].includes(p.bcPick))r.settings.bcPick=p.bcPick});
    return {room:r.room};
  }
  case "room_start":
  case "room_rematch":{
    const code=String(p.code||"").toUpperCase();
    const r=await roomUpdate(db,code,r=>{
      if(r.host!==uid)fail("not_host","بس صاحب الغرفة يبدأ");
      if(action==="room_start"&&r.status==="playing")return {noWrite:true};
      if(action==="room_rematch"&&r.status!=="ended")return {noWrite:true};
      const gmn=(r.settings&&r.settings.game)||"webbound",minP=MIN_PLAYERS[gmn]||2;
      if(r.members.length<minP)fail("need2",minP>2?"تحتاج "+minP+" لاعبين على الأقل":"ننتظر لاعب ثاني");
      if(r.status==="ended"&&r.state&&r.state.game==="wordweb"){}
      if(action==="room_start"&&!p.force){const wait=r.members.slice(0,4).filter(m=>m.id!==r.host&&!m.ready);if(wait.length)fail("not_ready","ننتظر "+wait.map(m=>m.nick).join("، ")+" يضغط جاهز")}
      startRound(r);
      if(r.state.game==="wordweb"){const w=WW.pick(r.state.cat);r.state.len=w.length;return {word:w}}
    });
    if(r.res&&r.res.word)await db.setSecret(code+":w",{word:r.res.word,mid:r.room.state.mid});
    const HGs=r.room.state&&GAME_RULES[r.room.state.game];if(HGs&&HGs.hidden&&r.room.status==="playing")await hSave(db,code,r.room.state,HGs.deal(r.room.state),null);
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
    const res=HG.apply(G,seat,p.a,privs);let before=null;
    const r=await roomUpdate(db,code,(rr,orig)=>{before=orig;if(rr.status!=="playing"||!rr.state||rr.state.seq!==G.seq||rr.state.mid!==G.mid)fail("stale","تغيّرت المباراة، جرّب مرة ثانية");
      rr.state=res.g;rr.turn_started_at=nowIso();if(res.g.winner!=null)rr.status="ended"});
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
      const G=r.state;if(G.winner!=null)fail("ended");
      if(p.gseq!==G.seq)fail("stale");
      const seat=seatOf(G,uid);if(seat<0)fail("not_player");
      let ng;
      if(G.game&&GAME_RULES[G.game]&&GAME_RULES[G.game].hidden)fail("bad","استخدم room_hact");
      if(action==="room_act"){if(G.turn!==seat)fail("not_your_turn","مو دورك");if(!G.game)noteMinOpp(G,seat);ng=checkAction(G,seat,p.a)}
      else{
        const elapsed=clock.now()-Date.parse(r.turn_started_at||r.updated_at),lim=G.timer?G.timer*1000:90000;
        if(elapsed<lim-1000)fail("too_early","لسه وقت اللاعب ما خلص");
        ng=G.game?GAME_RULES[G.game].skip(G):doSkip(G);
      }
      skipGone(ng);r.state=ng;r.turn_started_at=nowIso();if(ng.winner!=null)r.status="ended";
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
      if(r.status==="playing"&&G&&G.winner==null){
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
if(typeof Deno!=="undefined"&&Deno.serve){
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