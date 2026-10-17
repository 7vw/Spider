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
if(typeof module!=="undefined")module.exports=BC;
