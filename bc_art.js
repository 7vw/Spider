/* BALL CLASH — art. Drawing only: nothing here changes a battle, so the server never needs it. */
var BCART=(function(){
"use strict";
var TAU=Math.PI*2;
function hx(c){var n=parseInt(c.slice(1),16);return [(n>>16)&255,(n>>8)&255,n&255]}
function rgba(c,a){var r=hx(c);return "rgba("+r[0]+","+r[1]+","+r[2]+","+a+")"}
function mix(c,d,t){var a=hx(c),b=hx(d);return "rgb("+Math.round(a[0]+(b[0]-a[0])*t)+","+Math.round(a[1]+(b[1]-a[1])*t)+","+Math.round(a[2]+(b[2]-a[2])*t)+")"}
function dark(c,t){return mix(c,"#05060C",t)}function light(c,t){return mix(c,"#FFFFFF",t)}
/* ---- per-ball look: face style, shell pattern, weapon style ---- */
var FACE={weapon:"brave",nature:"glow",power:"slit",creature:"beast",tech:"visor",legend:"divine"};
var SHELL={weapon:"metal",nature:"swirl",power:"rune",creature:"scale",tech:"hex",legend:"star"};
var OVR={spider:{face:"spider"},snake:{face:"snake"},bee:{face:"bee"},wolf:{face:"wolf"},ghost:{face:"ghost"},octopus:{face:"cute"},kraken:{face:"cute"},
  dragon:{face:"wolf"},phoenix:{face:"divine"},vampire:{face:"vamp"},reaper:{face:"skull"},void:{face:"void"},blackhole:{face:"void"},chameleon:{face:"snake"},
  mirror:{shell:"mirror"},magnet:{shell:"magnet"},chaos:{shell:"chaos"},time:{shell:"clock"},infinity:{shell:"star"},omega:{shell:"star"},earth:{shell:"rock"},lava:{shell:"lava"},
  ice:{shell:"ice"},water:{shell:"water"},fire:{shell:"flame"},lightning:{shell:"bolt"},poison:{shell:"bubble"},wind:{shell:"swirl"},light:{shell:"sun"},shadow:{shell:"smoke"},
  turret:{face:"visor"},drone:{face:"visor"},droneunit:{face:"visor"},turretunit:{face:"visor"}};
function look(K){var o=OVR[K.id]||{};return {face:o.face||FACE[K.group]||"brave",shell:o.shell||SHELL[K.group]||"metal"}}
/* ---- shell patterns, clipped to the ball ---- */
function shell(x,b,K,kind,t){
  var r=b.r,c=K.color;x.save();x.beginPath();x.arc(b.x,b.y,r,0,TAU);x.clip();x.translate(b.x,b.y);
  x.globalAlpha=.28;x.lineWidth=1.4;
  switch(kind){
    case "metal":x.strokeStyle=light(c,.6);for(var i=1;i<4;i++){x.beginPath();x.arc(0,0,r*i/4,0,TAU);x.stroke()}break;
    case "swirl":x.strokeStyle=light(c,.7);x.lineWidth=2;for(var s=0;s<3;s++){x.beginPath();for(var a=0;a<5;a+=.2){var rr=a*r/5;x.lineTo(Math.cos(a*2+s*2.1+t)*rr,Math.sin(a*2+s*2.1+t)*rr)}x.stroke()}break;
    case "rune":x.strokeStyle=light(c,.8);x.globalAlpha=.35+.15*Math.sin(t*3);x.beginPath();x.arc(0,0,r*.66,0,TAU);x.stroke();for(var k=0;k<6;k++){var a2=k*TAU/6+t*.5;x.beginPath();x.moveTo(Math.cos(a2)*r*.66,Math.sin(a2)*r*.66);x.lineTo(Math.cos(a2+2.1)*r*.66,Math.sin(a2+2.1)*r*.66);x.stroke()}break;
    case "scale":x.globalAlpha=.18;x.fillStyle=dark(c,.4);for(var yy=-r;yy<r;yy+=7)for(var xx=-r+(yy%14?3.5:0);xx<r;xx+=7){x.beginPath();x.arc(xx,yy,3.4,0,Math.PI);x.fill()}break;
    case "hex":x.strokeStyle=light(c,.5);for(var hy=-r;hy<r;hy+=9)for(var hx2=-r+((hy/9|0)%2?5:0);hx2<r;hx2+=10){x.beginPath();for(var q=0;q<6;q++){var aa=q*TAU/6;x.lineTo(hx2+Math.cos(aa)*4.5,hy+Math.sin(aa)*4.5)}x.closePath();x.stroke()}break;
    case "star":x.globalAlpha=.9;x.fillStyle="#FFFFFF";for(var st=0;st<9;st++){var sx=((st*73+11)%(r*2))-r,sy=((st*41+7)%(r*2))-r;x.globalAlpha=.4+.4*Math.sin(t*3+st);x.fillRect(sx,sy,1.6,1.6)}break;
    case "rock":x.fillStyle=dark(c,.45);x.globalAlpha=.4;[[-8,-6,6],[7,4,5],[-3,9,4],[9,-8,3]].forEach(function(p){x.beginPath();x.arc(p[0],p[1],p[2],0,TAU);x.fill()});break;
    case "lava":x.globalAlpha=.6;x.strokeStyle="#FFD23F";x.lineWidth=2;x.beginPath();x.moveTo(-r,3);x.quadraticCurveTo(-3,-8+Math.sin(t*2)*3,r,4);x.stroke();x.beginPath();x.moveTo(-r,12);x.quadraticCurveTo(4,4,r,14);x.stroke();break;
    case "ice":x.strokeStyle="#FFFFFF";x.globalAlpha=.45;for(var ic=0;ic<6;ic++){var ia=ic*TAU/6;x.beginPath();x.moveTo(0,0);x.lineTo(Math.cos(ia)*r*.8,Math.sin(ia)*r*.8);x.stroke()}break;
    case "water":x.strokeStyle="#FFFFFF";x.globalAlpha=.35;for(var w=-1;w<2;w++){x.beginPath();for(var wx=-r;wx<=r;wx+=3)x.lineTo(wx,w*8+Math.sin(wx*.3+t*4)*2.5);x.stroke()}break;
    case "flame":x.globalAlpha=.35;x.fillStyle="#FFE14D";for(var fl=0;fl<3;fl++){var fx2=(fl-1)*r*.42;x.beginPath();x.moveTo(fx2-5,r);x.quadraticCurveTo(fx2-6,r*.45,fx2,r*.2+Math.sin(t*9+fl)*3);x.quadraticCurveTo(fx2+6,r*.45,fx2+5,r);x.fill()}break;
    case "bolt":x.globalAlpha=.55;x.fillStyle="#FFFFFF";x.beginPath();x.moveTo(3,-r*.75);x.lineTo(-6,2);x.lineTo(1,2);x.lineTo(-3,r*.75);x.lineTo(7,-3);x.lineTo(0,-3);x.closePath();x.fill();break;
    case "bubble":x.strokeStyle="#EFFFD0";x.globalAlpha=.5;for(var bu=0;bu<5;bu++){var by=((t*20+bu*11)%(r*2))-r;x.beginPath();x.arc(((bu*13)%(r*1.4))-r*.7,-by,2+bu%3,0,TAU);x.stroke()}break;
    case "sun":x.strokeStyle="#FFFFFF";x.globalAlpha=.45;for(var su=0;su<12;su++){var sa=su*TAU/12+t;x.beginPath();x.moveTo(Math.cos(sa)*r*.35,Math.sin(sa)*r*.35);x.lineTo(Math.cos(sa)*r*.9,Math.sin(sa)*r*.9);x.stroke()}break;
    case "smoke":x.fillStyle="#000000";x.globalAlpha=.35;for(var sm=0;sm<4;sm++){x.beginPath();x.arc(Math.cos(t+sm*1.6)*r*.4,Math.sin(t*1.3+sm)*r*.4,r*.45,0,TAU);x.fill()}break;
    case "mirror":x.fillStyle="#FFFFFF";x.globalAlpha=.35;x.beginPath();x.moveTo(-r,-r*.2);x.lineTo(r*.2,-r);x.lineTo(r*.5,-r);x.lineTo(-r,r*.1);x.fill();break;
    case "magnet":x.globalAlpha=.7;x.fillStyle="#4FB3FF";x.fillRect(0,-r,r,r*2);break;
    case "chaos":x.globalAlpha=.4;["#FF4FD8","#39FF88","#FFE14D"].forEach(function(cc,ci){x.fillStyle=cc;x.beginPath();x.arc(Math.cos(t*2+ci*2.1)*r*.35,Math.sin(t*2+ci*2.1)*r*.35,r*.35,0,TAU);x.fill()});break;
    case "clock":x.strokeStyle="#FFFFFF";x.globalAlpha=.55;for(var cl=0;cl<12;cl++){var ca=cl*TAU/12;x.beginPath();x.moveTo(Math.cos(ca)*r*.62,Math.sin(ca)*r*.62);x.lineTo(Math.cos(ca)*r*.78,Math.sin(ca)*r*.78);x.stroke()}x.lineWidth=2;x.beginPath();x.moveTo(0,0);x.lineTo(Math.cos(t)*r*.5,Math.sin(t)*r*.5);x.stroke();break;
  }
  x.restore();
}
/* ---- faces: eyes look at the target, squint when hit, X when out ---- */
function eye(x,ex,ey,s,lx,ly,o){
  if(o.ko){x.strokeStyle="#1A0610";x.lineWidth=s*.45;x.beginPath();x.moveTo(ex-s*.6,ey-s*.6);x.lineTo(ex+s*.6,ey+s*.6);x.moveTo(ex+s*.6,ey-s*.6);x.lineTo(ex-s*.6,ey+s*.6);x.stroke();return}
  var sq=o.hurt?.35:1;
  x.fillStyle=o.white||"#FFFFFF";x.beginPath();x.ellipse(ex,ey,s,s*sq,0,0,TAU);x.fill();
  if(sq>.5){x.fillStyle=o.pupil||"#14101E";x.beginPath();if(o.slit)x.ellipse(ex+lx*s*.35,ey+ly*s*.35,s*.22,s*.7,0,0,TAU);else x.arc(ex+lx*s*.38,ey+ly*s*.38,s*.52,0,TAU);x.fill();
    x.fillStyle="#FFFFFF";x.beginPath();x.arc(ex+lx*s*.38-s*.18,ey+ly*s*.38-s*.2,s*.16,0,TAU);x.fill()}
}
function face(x,b,K,st,t){
  var f=look(K).face,r=b.r,tgt=null,bd=1e9,lx=0,ly=0;
  if(st&&b.alive){for(var i=0;i<st.balls.length;i++){var o=st.balls[i];if(!o.alive||o.team===b.team)continue;var d=(o.x-b.x)*(o.x-b.x)+(o.y-b.y)*(o.y-b.y);if(d<bd){bd=d;tgt=o}}}
  if(tgt){var dl=Math.sqrt(bd)||1;lx=(tgt.x-b.x)/dl;ly=(tgt.y-b.y)/dl}
  var hurt=b._hurt>0,ko=!b.alive,cx=b.x+lx*r*.12,cy=b.y+ly*r*.12-r*.05,s=r*.2,gap=r*.32,low=b.hp/b.maxHp<.35;
  x.save();
  if(f==="visor"){x.fillStyle="#0A0E18";x.beginPath();if(x.roundRect)x.roundRect(cx-r*.55,cy-r*.16,r*1.1,r*.32,r*.16);else x.rect(cx-r*.55,cy-r*.16,r*1.1,r*.32);x.fill();
    x.fillStyle=ko?"#444":hurt?"#FF4F7A":"#7FE8FF";x.shadowColor=x.fillStyle;x.shadowBlur=8;x.fillRect(cx-r*.42+lx*r*.12,cy-r*.05,r*.84,r*.1);x.restore();return}
  if(f==="spider"){[[-.36,-.02,.16],[.36,-.02,.16],[-.16,-.26,.11],[.16,-.26,.11]].forEach(function(e){var ex=cx+e[0]*r,ey=cy+e[1]*r,er=e[2]*r;x.fillStyle=ko?"#333":"#0B0610";x.beginPath();x.arc(ex,ey,er,0,TAU);x.fill();
      if(!ko){x.strokeStyle="#FFD23F";x.lineWidth=1;x.stroke();x.fillStyle="#FF2E4A";x.beginPath();x.arc(ex+lx*er*.3,ey+ly*er*.3,er*.45,0,TAU);x.fill();x.fillStyle="#FFFFFF";x.beginPath();x.arc(ex-er*.3,ey-er*.35,er*.22,0,TAU);x.fill()}});x.restore();return}
  if(f==="skull"){x.fillStyle="#0B0D12";[-1,1].forEach(function(sd){x.beginPath();x.ellipse(cx+sd*gap,cy,s*1.1,s*1.25,0,0,TAU);x.fill()});x.fillStyle=ko?"#333":"#7CFF9E";x.shadowColor="#7CFF9E";x.shadowBlur=8;[-1,1].forEach(function(sd){x.beginPath();x.arc(cx+sd*gap+lx*2,cy+ly*2,s*.35,0,TAU);x.fill()});x.restore();return}
  if(f==="void"){x.fillStyle="#E8D5FF";x.shadowColor="#B65CFF";x.shadowBlur=10;[-1,1].forEach(function(sd){x.beginPath();x.ellipse(cx+sd*gap,cy,s*.7,s*(hurt?.2:.45),0,0,TAU);x.fill()});x.restore();return}
  var o={hurt:hurt,ko:ko,slit:f==="snake"||f==="slit"||f==="wolf",pupil:f==="glow"||f==="divine"?light(K.color,.2):f==="vamp"?"#C8102E":f==="wolf"?"#2A1600":"#14101E",white:f==="wolf"?"#FFD23F":f==="ghost"?"#0E0B1A":f==="divine"?"#FFFDF0":"#FFFFFF"};
  if(f==="glow"||f==="divine"){x.shadowColor=light(K.color,.4);x.shadowBlur=8}
  if(f==="bee"){o.white="#1A1206";o.pupil="#FFD23F"}
  eye(x,cx-gap,cy,s,lx,ly,o);eye(x,cx+gap,cy,s,lx,ly,o);x.shadowBlur=0;
  if(!ko&&(f==="brave"||f==="wolf"||f==="slit"||low)){x.strokeStyle="#14101E";x.lineWidth=r*.07;x.lineCap="round";var tilt=low?.45:.28;
    x.beginPath();x.moveTo(cx-gap-s,cy-s*1.35-tilt*s);x.lineTo(cx-gap+s*.8,cy-s*1.05);x.moveTo(cx+gap+s,cy-s*1.35-tilt*s);x.lineTo(cx+gap-s*.8,cy-s*1.05);x.stroke()}
  if(f==="vamp"&&!ko){x.fillStyle="#FFFFFF";[-1,1].forEach(function(sd){x.beginPath();x.moveTo(cx+sd*r*.12,cy+r*.3);x.lineTo(cx+sd*r*.2,cy+r*.3);x.lineTo(cx+sd*r*.16,cy+r*.48);x.fill()})}
  if(f==="cute"&&!ko){x.fillStyle="rgba(255,120,160,.45)";[-1,1].forEach(function(sd){x.beginPath();x.arc(cx+sd*r*.55,cy+r*.25,r*.12,0,TAU);x.fill()})}
  if(ko){x.strokeStyle="#14101E";x.lineWidth=r*.06;x.beginPath();x.arc(cx,cy+r*.42,r*.18,Math.PI*1.15,Math.PI*1.85);x.stroke()}
  x.restore();
}
/* ---- the ball itself ---- */
function body(x,b,K,team,st,t,o){
  o=o||{};var r=b.r,c=K.color,s=b.s||{},dead=!b.alive,L=look(K);
  x.save();if(dead)x.globalAlpha=.35;else if(s.invis>0)x.globalAlpha=.3;
  x.fillStyle="rgba(0,0,0,.45)";x.beginPath();x.ellipse(b.x+r*.12,b.y+r*.92,r*.95,r*.3,0,0,TAU);x.fill();
  if(b.awake&&!dead){var ag=x.createRadialGradient(b.x,b.y,r*.8,b.x,b.y,r*1.9);ag.addColorStop(0,"rgba(230,184,92,.55)");ag.addColorStop(1,"rgba(230,184,92,0)");x.fillStyle=ag;x.beginPath();x.arc(b.x,b.y,r*1.9,0,TAU);x.fill()}
  var g=x.createRadialGradient(b.x-r*.35,b.y-r*.42,r*.08,b.x,b.y,r*1.05);g.addColorStop(0,light(c,.55));g.addColorStop(.35,c);g.addColorStop(.85,dark(c,.45));g.addColorStop(1,dark(c,.7));
  x.fillStyle=g;x.beginPath();x.arc(b.x,b.y,r,0,TAU);x.fill();
  if(!o.flat)shell(x,b,K,L.shell,t);
  x.lineWidth=b.summon?2.5:Math.max(3,r*.16);if(b.summon)x.setLineDash([5,4]);
  var rg=x.createLinearGradient(b.x,b.y-r,b.x,b.y+r);rg.addColorStop(0,light(team,.35));rg.addColorStop(1,dark(team,.25));x.strokeStyle=rg;x.beginPath();x.arc(b.x,b.y,r-x.lineWidth/2+1,0,TAU);x.stroke();x.setLineDash([]);
  x.strokeStyle="rgba(0,0,0,.55)";x.lineWidth=1.2;x.beginPath();x.arc(b.x,b.y,r,0,TAU);x.stroke();
  x.fillStyle="rgba(255,255,255,.55)";x.beginPath();x.ellipse(b.x-r*.38,b.y-r*.48,r*.28,r*.15,-.6,0,TAU);x.fill();
  face(x,b,K,st,t);
  if(!dead){
    if(s.freeze>0){x.fillStyle="rgba(200,240,255,.5)";x.beginPath();x.arc(b.x,b.y,r,0,TAU);x.fill();x.strokeStyle="#FFFFFF";x.lineWidth=1.5;for(var k=0;k<6;k++){var a=k*TAU/6;x.beginPath();x.moveTo(b.x+Math.cos(a)*r*.6,b.y+Math.sin(a)*r*.6);x.lineTo(b.x+Math.cos(a)*r*1.15,b.y+Math.sin(a)*r*1.15);x.stroke()}}
    if(s.web>0){x.strokeStyle="rgba(255,255,255,.75)";x.lineWidth=1;for(var w=0;w<5;w++){var wa=w*TAU/5+.3;x.beginPath();x.moveTo(b.x-Math.cos(wa)*r*1.25,b.y-Math.sin(wa)*r*1.25);x.quadraticCurveTo(b.x,b.y,b.x+Math.cos(wa+.6)*r*1.25,b.y+Math.sin(wa+.6)*r*1.25);x.stroke()}}
    if(b.shield>0){x.save();x.globalCompositeOperation="lighter";var sg=x.createRadialGradient(b.x,b.y,r,b.x,b.y,r*1.45);sg.addColorStop(0,"rgba(143,184,255,0)");sg.addColorStop(.75,"rgba(143,184,255,"+Math.min(.55,.15+b.shield/90)+")");sg.addColorStop(1,"rgba(143,184,255,0)");x.fillStyle=sg;x.beginPath();x.arc(b.x,b.y,r*1.45,0,TAU);x.fill();x.restore()}
    if(s.stun>0){x.fillStyle="#FFE14D";for(var z=0;z<3;z++){var za=t*6+z*2.1;x.beginPath();x.arc(b.x+Math.cos(za)*r*.7,b.y-r*1.05+Math.sin(za)*r*.2,2.5,0,TAU);x.fill()}}
  }
  x.restore();
}
/* ---- weapons, drawn along the engine's own hit segments so what you see is what hits ---- */
function seg(x,p,fn){var dx=p.x2-p.x1,dy=p.y2-p.y1,L=Math.sqrt(dx*dx+dy*dy);x.save();x.translate(p.x1,p.y1);x.rotate(Math.atan2(dy,dx));fn(L);x.restore()}
var STYLE={shadow:"#8D5BFF",time:"#7FE8FF",teleport:"#B9A2FF",clone:"#F472B6",ghost:"#E8E6FF",mirror:"#DDE6F5",chaos:"#FF4FD8",omega:"#E6B85C",infinity:"#B9A2FF",stormking:"#9FB4FF",chameleon:"#7BD389",turret:"#9AA6C0"};
function sword(x,L,w,K,t){
  var glow=STYLE[K.id],gl=L*.2,bw=Math.max(3.2,w*.85);
  x.fillStyle="#2A1E14";x.fillRect(-2,-bw*.45,gl*.85,bw*.9);x.strokeStyle="#8A6A3A";x.lineWidth=1;for(var i=2;i<gl*.85;i+=3.5){x.beginPath();x.moveTo(i,-bw*.45);x.lineTo(i+2,bw*.45);x.stroke()}
  x.fillStyle="#E6B85C";x.beginPath();x.arc(-2.5,0,bw*.55,0,TAU);x.fill();
  var gg=x.createLinearGradient(0,-bw*2,0,bw*2);gg.addColorStop(0,"#FFE7A3");gg.addColorStop(1,"#9C7330");x.fillStyle=gg;if(x.roundRect){x.beginPath();x.roundRect(gl-2.5,-bw*1.9,5,bw*3.8,2.5);x.fill()}else x.fillRect(gl-2.5,-bw*1.9,5,bw*3.8);
  if(glow){x.shadowColor=glow;x.shadowBlur=14}
  var bg=x.createLinearGradient(0,-bw,0,bw);if(glow){bg.addColorStop(0,light(glow,.7));bg.addColorStop(.5,"#FFFFFF");bg.addColorStop(1,glow)}else{bg.addColorStop(0,"#F7FAFF");bg.addColorStop(.48,"#C6CFDF");bg.addColorStop(.52,"#8E99B0");bg.addColorStop(1,"#5A6378")}
  x.fillStyle=bg;x.beginPath();x.moveTo(gl+2,-bw*.9);x.lineTo(L-bw*2.2,-bw*.8);x.lineTo(L,0);x.lineTo(L-bw*2.2,bw*.8);x.lineTo(gl+2,bw*.9);x.closePath();x.fill();x.shadowBlur=0;
  x.strokeStyle=glow?"rgba(255,255,255,.9)":"rgba(40,46,60,.55)";x.lineWidth=1;x.beginPath();x.moveTo(gl+4,0);x.lineTo(L*.78,0);x.stroke();
  x.strokeStyle="rgba(255,255,255,.85)";x.beginPath();x.moveTo(gl+3,-bw*.85);x.lineTo(L-bw*2.2,-bw*.75);x.lineTo(L-1,0);x.stroke();
}
function katana(x,L,w){var bw=2.8;x.fillStyle="#1A1A22";x.fillRect(-2,-2.4,L*.22,4.8);x.fillStyle="#C8102E";for(var i=0;i<L*.2;i+=4){x.beginPath();x.moveTo(i,-2.4);x.lineTo(i+2,0);x.lineTo(i,2.4);x.fill()}
  x.fillStyle="#E6B85C";x.beginPath();x.ellipse(L*.22,0,2.2,6,0,0,TAU);x.fill();
  var g=x.createLinearGradient(0,-bw*2,0,bw*2);g.addColorStop(0,"#FFFFFF");g.addColorStop(1,"#9AA6C0");x.fillStyle=g;
  x.beginPath();x.moveTo(L*.23,-bw);x.quadraticCurveTo(L*.7,-bw*2.4,L,-bw*1.8);x.quadraticCurveTo(L*.7,-bw*.2,L*.23,bw);x.closePath();x.fill();
  x.strokeStyle="rgba(255,255,255,.9)";x.lineWidth=.9;x.beginPath();for(var k=0;k<=12;k++){var px=L*.25+k*(L*.7/12);x.lineTo(px,-bw*.3-Math.sin(k*1.4)*.8-k*.07)}x.stroke()}
function axe(x,L,w){x.strokeStyle="#6B4A2B";x.lineWidth=4;x.lineCap="round";x.beginPath();x.moveTo(0,0);x.lineTo(L,0);x.stroke();x.strokeStyle="#4A3220";x.lineWidth=1;for(var i=4;i<L;i+=7){x.beginPath();x.moveTo(i,-1.5);x.lineTo(i+3,1.5);x.stroke()}
  var h=w*2.2,g=x.createLinearGradient(0,-h,0,h);g.addColorStop(0,"#F2F5FA");g.addColorStop(1,"#6E7891");x.fillStyle=g;
  x.beginPath();x.moveTo(L-10,-3);x.quadraticCurveTo(L-2,-h*1.1,L+6,-h);x.quadraticCurveTo(L+12,0,L+6,h);x.quadraticCurveTo(L-2,h*1.1,L-10,3);x.closePath();x.fill();
  x.strokeStyle="#FFFFFF";x.lineWidth=1.4;x.beginPath();x.moveTo(L+6,-h);x.quadraticCurveTo(L+12,0,L+6,h);x.stroke()}
function chainsaw(x,L,w,t){x.fillStyle="#FF8A1F";x.beginPath();if(x.roundRect)x.roundRect(-2,-6,L*.26,12,3);else x.rect(-2,-6,L*.26,12);x.fill();x.fillStyle="#1A1A22";x.fillRect(L*.05,-3,L*.12,6);
  x.fillStyle="#9AA6C0";x.beginPath();if(x.roundRect)x.roundRect(L*.24,-4.5,L*.78,9,4.5);else x.rect(L*.24,-4.5,L*.78,9);x.fill();
  x.fillStyle="#E8EBF2";var off=(t*60)%6;for(var i=L*.24+off;i<L;i+=6){x.beginPath();x.moveTo(i,-4.5);x.lineTo(i+3,-7.5);x.lineTo(i+6,-4.5);x.fill();x.beginPath();x.moveTo(i,4.5);x.lineTo(i+3,7.5);x.lineTo(i+6,4.5);x.fill()}}
function smallBlade(x,L,K){var f=K.id;
  if(f==="vampire"||f==="snake"||f==="spider"){var col=f==="snake"?"#E9FFE8":f==="spider"?"#2A0A12":"#FFFFFF";x.fillStyle=col;x.beginPath();x.moveTo(0,-3.5);x.quadraticCurveTo(L*.7,-4,L,2);x.quadraticCurveTo(L*.5,1,0,3.5);x.closePath();x.fill();
    if(f==="spider"){x.strokeStyle="#E62948";x.lineWidth=1;x.stroke()}return}
  if(f==="void"){x.shadowColor="#B65CFF";x.shadowBlur=10;x.fillStyle="#2A1050";x.beginPath();x.moveTo(0,0);x.lineTo(L*.5,-4);x.lineTo(L,0);x.lineTo(L*.5,4);x.closePath();x.fill();x.strokeStyle="#D9B8FF";x.lineWidth=1;x.stroke();x.shadowBlur=0;return}
  var g=x.createLinearGradient(0,-3,0,3);g.addColorStop(0,"#FFFFFF");g.addColorStop(1,"#7FA6C8");x.fillStyle="#2A1E14";x.fillRect(0,-1.6,L*.3,3.2);x.fillStyle="#E6B85C";x.fillRect(L*.3-1,-3.6,2,7.2);
  x.fillStyle=g;x.beginPath();x.moveTo(L*.32,-2.6);x.lineTo(L,0);x.lineTo(L*.32,2.6);x.closePath();x.fill()}
function spear(x,L,K,tipFrac){var rt=L*(1-tipFrac);
  if(K.id==="scorpion"){for(var i=0;i<6;i++){var px=rt*i/5;x.fillStyle=i%2?"#B07A44":"#D9A066";x.beginPath();x.arc(px,0,5.5-i*.4,0,TAU);x.fill()}
    x.fillStyle="#3A2410";x.beginPath();x.moveTo(rt,-5);x.quadraticCurveTo(L+4,-10,L,4);x.quadraticCurveTo(L-6,0,rt,5);x.fill();x.fillStyle="#8CFF2E";x.beginPath();x.arc(L-1,3,1.6,0,TAU);x.fill();return}
  var sg=x.createLinearGradient(0,-2,0,2);sg.addColorStop(0,"#C08A52");sg.addColorStop(1,"#6B4A2B");x.fillStyle=sg;x.fillRect(0,-2.2,rt,4.4);
  x.fillStyle="#2A1E14";[.25,.55].forEach(function(f){x.fillRect(rt*f,-2.8,4,5.6)});
  if(K.id==="magnet"){x.lineWidth=6;x.lineCap="butt";x.strokeStyle="#E62948";x.beginPath();x.arc(L-7,0,8,Math.PI/2,Math.PI*1.5);x.stroke();x.strokeStyle="#9AA6C0";x.beginPath();x.moveTo(L-7,-8);x.lineTo(L+1,-8);x.moveTo(L-7,8);x.lineTo(L+1,8);x.stroke();return}
  var g=x.createLinearGradient(0,-6,0,6);g.addColorStop(0,"#FFFFFF");g.addColorStop(.5,light(K.color,.3));g.addColorStop(1,"#6E7891");x.fillStyle=g;
  x.beginPath();x.moveTo(rt-2,0);x.quadraticCurveTo(rt+(L-rt)*.3,-7,L,0);x.quadraticCurveTo(rt+(L-rt)*.3,7,rt-2,0);x.fill();x.strokeStyle="rgba(40,46,60,.6)";x.lineWidth=1;x.beginPath();x.moveTo(rt,0);x.lineTo(L-2,0);x.stroke()}
function tentacle(x,L,K,t,phase){var c=K.color,n=10;x.lineCap="round";for(var i=0;i<n;i++){var a=i/n,b2=(i+1)/n,w=7*(1-a)+1.5,y1=Math.sin(t*4+phase+a*5)*4*a,y2=Math.sin(t*4+phase+b2*5)*4*b2;
    x.strokeStyle=mix(c,"#000000",a*.25);x.lineWidth=w;x.beginPath();x.moveTo(L*a,y1);x.lineTo(L*b2,y2);x.stroke();if(i%2===0&&i<n-1){x.fillStyle=light(c,.55);x.beginPath();x.arc(L*a+2,y1+w*.25,w*.18,0,TAU);x.fill()}}}
function hammerHead(x,b,p,K){x.save();x.translate(p.x2,p.y2);x.rotate(b.ang);var s=p.w/2;
  if(K.id==="shield"){var g=x.createRadialGradient(-s*.3,-s*.3,1,0,0,s*1.25);g.addColorStop(0,"#E8F0FF");g.addColorStop(1,"#4A6FB0");x.fillStyle=g;x.beginPath();x.arc(0,0,s*1.25,0,TAU);x.fill();x.strokeStyle="#E6B85C";x.lineWidth=2.5;x.stroke();x.fillStyle="#E6B85C";x.beginPath();x.arc(0,0,s*.35,0,TAU);x.fill();x.restore();return}
  if(K.roundHead){x.fillStyle="#3A4050";for(var k=0;k<8;k++){var a=k*TAU/8;x.beginPath();x.moveTo(Math.cos(a)*s*.9,Math.sin(a)*s*.9);x.lineTo(Math.cos(a+.2)*s*1.5,Math.sin(a+.2)*s*1.5);x.lineTo(Math.cos(a+.4)*s*.9,Math.sin(a+.4)*s*.9);x.fill()}
    var rg=x.createRadialGradient(-s*.3,-s*.3,1,0,0,s);rg.addColorStop(0,"#D9DEE8");rg.addColorStop(1,"#4A5266");x.fillStyle=rg;x.beginPath();x.arc(0,0,s,0,TAU);x.fill();x.restore();return}
  var hw=s*2.3,hh=s*1.45,g2=x.createLinearGradient(0,-hw/2,0,hw/2);g2.addColorStop(0,"#F2F5FA");g2.addColorStop(.5,"#9AA6C0");g2.addColorStop(1,"#4A5266");x.fillStyle=g2;
  x.beginPath();if(x.roundRect)x.roundRect(-hh/2,-hw/2,hh,hw,3);else x.rect(-hh/2,-hw/2,hh,hw);x.fill();x.fillStyle=K.color;x.fillRect(-hh/2,-hw*.12,hh,hw*.24);x.strokeStyle="rgba(255,255,255,.7)";x.lineWidth=1;x.strokeRect(-hh/2+1,-hw/2+1,hh-2,hw-2);x.restore()}
function disc(x,p,K,t){x.save();x.translate(p.x2,p.y2);var s=p.w/2;
  if(K.id==="earth"){x.rotate(t);var g=x.createLinearGradient(-s,-s,s,s);g.addColorStop(0,"#D9B48A");g.addColorStop(1,"#6B4A2B");x.fillStyle=g;x.beginPath();for(var k=0;k<7;k++){var a=k*TAU/7,rr=s*(.8+((k*37)%5)/12);x.lineTo(Math.cos(a)*rr,Math.sin(a)*rr)}x.closePath();x.fill();x.strokeStyle="rgba(0,0,0,.35)";x.stroke();x.restore();return}
  x.rotate(t*12);x.fillStyle="#C9D6E8";x.beginPath();for(var i=0;i<16;i++){var a2=i*TAU/16;x.lineTo(Math.cos(a2)*s*1.15,Math.sin(a2)*s*1.15);x.lineTo(Math.cos(a2+TAU/32)*s*.85,Math.sin(a2+TAU/32)*s*.85)}x.closePath();x.fill();
  x.fillStyle="#5A6378";x.beginPath();x.arc(0,0,s*.35,0,TAU);x.fill();x.strokeStyle="#FFFFFF";x.lineWidth=1;x.beginPath();x.arc(0,0,s*.7,0,TAU);x.stroke();x.restore()}
function scythe(x,parts,K,b){var sh=parts[0],b2=parts[2];x.lineCap="round";var dark2=K.id==="reaper";
  var sg=x.createLinearGradient(sh.x1,sh.y1,sh.x2,sh.y2);sg.addColorStop(0,dark2?"#2A2E3C":"#7A5634");sg.addColorStop(1,dark2?"#14161F":"#4A3626");x.strokeStyle=sg;x.lineWidth=4.5;x.beginPath();x.moveTo(sh.x1,sh.y1);x.lineTo(sh.x2,sh.y2);x.stroke();
  var Ex=sh.x2,Ey=sh.y2,Tx=b2.x2,Ty=b2.y2,mx=(Ex+Tx)/2,my=(Ey+Ty)/2,dx=Tx-Ex,dy=Ty-Ey,L=Math.sqrt(dx*dx+dy*dy)||1,nx=-dy/L,ny=dx/L;
  if((mx+nx-b.x)*(mx+nx-b.x)+(my+ny-b.y)*(my+ny-b.y)<(mx-nx-b.x)*(mx-nx-b.x)+(my-ny-b.y)*(my-ny-b.y)){nx=-nx;ny=-ny}
  var glow=dark2?"#7CFF9E":K.color;x.shadowColor=glow;x.shadowBlur=14;
  var g=x.createLinearGradient(Ex,Ey,Tx,Ty);g.addColorStop(0,dark2?"#C8FFD6":"#FFFFFF");g.addColorStop(.6,dark2?"#4AFF8A":light(glow,.4));g.addColorStop(1,glow);x.fillStyle=g;
  x.beginPath();x.moveTo(Ex,Ey);x.quadraticCurveTo(mx+nx*L*.55,my+ny*L*.55,Tx,Ty);x.quadraticCurveTo(mx+nx*L*.18,my+ny*L*.18,Ex-nx*3,Ey-ny*3);x.closePath();x.fill();x.shadowBlur=0;
  x.strokeStyle="rgba(255,255,255,.95)";x.lineWidth=1.3;x.beginPath();x.moveTo(Ex,Ey);x.quadraticCurveTo(mx+nx*L*.55,my+ny*L*.55,Tx,Ty);x.stroke();
  x.fillStyle="#E6B85C";x.beginPath();x.arc(Ex,Ey,3.2,0,TAU);x.fill()}
function beam(x,L,K,t){x.fillStyle="#2A2E3C";x.fillRect(-4,-5,10,10);var fl=.8+Math.random()*.4;x.globalCompositeOperation="lighter";
  x.strokeStyle=rgba(K.color,.35);x.lineWidth=10*fl;x.beginPath();x.moveTo(4,0);x.lineTo(L,0);x.stroke();x.strokeStyle=rgba(K.color,.85);x.lineWidth=4;x.stroke();x.strokeStyle="#FFFFFF";x.lineWidth=1.5;x.stroke();
  var fg=x.createRadialGradient(L,0,0,L,0,10);fg.addColorStop(0,"#FFFFFF");fg.addColorStop(1,rgba(K.color,0));x.fillStyle=fg;x.beginPath();x.arc(L,0,10,0,TAU);x.fill();x.globalCompositeOperation="source-over"}
function focus(x,b,K,t){if(K.w!=="none"||!b.alive)return;var a=b.ang,d=b.r+11,fx=b.x+Math.cos(a)*d,fy=b.y+Math.sin(a)*d,charge=K.ab?Math.max(0,1-(b.abT||0)/.6):0;
  x.save();x.translate(fx,fy);x.rotate(a+t);x.shadowColor=K.color;x.shadowBlur=8+charge*16;var g=x.createLinearGradient(-6,-6,6,6);g.addColorStop(0,"#FFFFFF");g.addColorStop(1,K.color);x.fillStyle=g;
  x.beginPath();x.moveTo(0,-7);x.lineTo(5,0);x.lineTo(0,7);x.lineTo(-5,0);x.closePath();x.fill();x.restore();
  if(charge>.2){x.save();x.globalCompositeOperation="lighter";x.strokeStyle=rgba(K.color,charge*.6);x.lineWidth=2;x.beginPath();x.arc(b.x,b.y,b.r+4+charge*4,0,TAU);x.stroke();x.restore()}}
function weapon(x,b,K,t){
  if(!b.alive||!BC.parts)return;var P=BC.parts(b);x.save();x.lineJoin="round";x.lineCap="round";
  switch(K.w){
    case "blade":P.forEach(function(p){seg(x,p,function(L){if(K.id==="katana")katana(x,L,p.w);else if(K.id==="axe")axe(x,L,p.w);else if(K.id==="chainsaw")chainsaw(x,L,p.w,t);else sword(x,L,p.w,K,t)})});break;
    case "blades":P.forEach(function(p){seg(x,p,function(L){if(K.id==="wolf"||K.id==="bloodmoon"){x.fillStyle=K.id==="wolf"?"#E8EBF2":"#FF4F6A";x.beginPath();x.moveTo(L*.15,-3);x.quadraticCurveTo(L*.7,-7,L,0);x.quadraticCurveTo(L*.6,2,L*.15,3);x.fill()}else sword(x,L,p.w,K,t)})});break;
    case "orbit":P.forEach(function(p){seg(x,p,function(L){smallBlade(x,L,K)})});break;
    case "pole":seg(x,{x1:P[0].x1,y1:P[0].y1,x2:P[1].x2,y2:P[1].y2},function(L){spear(x,L,K,K.tip||.3)});break;
    case "poles":for(var i=0;i<P.length;i+=2)(function(ii){seg(x,{x1:P[ii].x1,y1:P[ii].y1,x2:P[ii+1].x2,y2:P[ii+1].y2},function(L){if(K.id==="octopus"||K.id==="kraken")tentacle(x,L,K,t,ii);else spear(x,L,K,K.tip||.3)})})(i);break;
    case "hammer":seg(x,P[0],function(L){if(K.roundHead){x.strokeStyle="#5B6283";x.lineWidth=2;for(var c=0;c<L;c+=6){x.beginPath();x.ellipse(c+3,0,3.2,2,0,0,TAU);x.stroke()}}else{var hg=x.createLinearGradient(0,-2,0,2);hg.addColorStop(0,"#B07A44");hg.addColorStop(1,"#5A3A20");x.strokeStyle=hg;x.lineWidth=4.5;x.beginPath();x.moveTo(0,0);x.lineTo(L,0);x.stroke()}});hammerHead(x,b,P[1],K);break;
    case "discs":P.forEach(function(p){disc(x,p,K,t)});break;
    case "scythe":scythe(x,P,K,b);break;
    case "beam":seg(x,P[0],function(L){beam(x,L,K,t)});break;
  }
  x.restore();focus(x,b,K,t);
}
/* ---- projectiles with trails ---- */
function proj(x,p,t){
  p._tr=p._tr||[];p._tr.push([p.x,p.y]);if(p._tr.length>9)p._tr.shift();var tp=p.type,c=p.color,sp=Math.sqrt(p.vx*p.vx+p.vy*p.vy)||1,ux=p.vx/sp,uy=p.vy/sp;
  x.save();x.globalCompositeOperation="lighter";
  if(tp!=="rock"&&tp!=="boomerang"&&tp!=="bee"&&tp!=="webshot"){for(var i=0;i<p._tr.length;i++){var q=p._tr[i],a=i/p._tr.length;x.fillStyle=rgba(tp==="fire"?"#FF8A1F":c,a*.35);x.beginPath();x.arc(q[0],q[1],p.r*(.4+a*.6),0,TAU);x.fill()}}
  x.globalCompositeOperation="source-over";
  switch(tp){
    case "fire":case "plasma":{x.shadowColor=tp==="fire"?"#FF6A1F":c;x.shadowBlur=18;var g=x.createRadialGradient(p.x,p.y,1,p.x,p.y,p.r*1.2);g.addColorStop(0,"#FFFFFF");g.addColorStop(.35,tp==="fire"?"#FFE14D":light(c,.5));g.addColorStop(1,tp==="fire"?"#FF3D1F":c);x.fillStyle=g;x.beginPath();x.arc(p.x,p.y,p.r*1.1,0,TAU);x.fill();
      if(tp==="plasma"){x.strokeStyle="#FFFFFF";x.lineWidth=1;for(var k=0;k<3;k++){var a2=t*9+k*2.1;x.beginPath();x.moveTo(p.x,p.y);x.lineTo(p.x+Math.cos(a2)*p.r*1.6,p.y+Math.sin(a2)*p.r*1.6);x.stroke()}}break}
    case "ice":x.shadowColor="#BFF4FF";x.shadowBlur=10;x.fillStyle="#E8FBFF";x.beginPath();x.moveTo(p.x+ux*p.r*2,p.y+uy*p.r*2);x.lineTo(p.x-uy*p.r*.9,p.y+ux*p.r*.9);x.lineTo(p.x-ux*p.r*1.3,p.y-uy*p.r*1.3);x.lineTo(p.x+uy*p.r*.9,p.y-ux*p.r*.9);x.closePath();x.fill();x.strokeStyle="#7FD8FF";x.lineWidth=1;x.stroke();break;
    case "dart":case "bolt":case "light":case "rail":case "prism":{var L=tp==="rail"?38:tp==="light"?22:12,col=tp==="prism"?"hsl("+((t*240+p.x)%360)+",95%,70%)":c;x.shadowColor=col;x.shadowBlur=tp==="dart"?4:14;x.strokeStyle=col;x.lineWidth=tp==="rail"?5:3;x.beginPath();x.moveTo(p.x-ux*L,p.y-uy*L);x.lineTo(p.x,p.y);x.stroke();x.strokeStyle="#FFFFFF";x.lineWidth=1.2;x.stroke();
      if(tp==="dart"){x.fillStyle="#8CFF2E";x.beginPath();x.arc(p.x,p.y,2.5,0,TAU);x.fill()}break}
    case "wave":{var ang=Math.atan2(uy,ux);x.strokeStyle="#BFE9FF";x.lineWidth=5;x.beginPath();x.arc(p.x,p.y,p.r,ang-1.2,ang+1.2);x.stroke();x.strokeStyle="#3FB7FF";x.lineWidth=3;x.beginPath();x.arc(p.x-ux*4,p.y-uy*4,p.r*.85,ang-1.1,ang+1.1);x.stroke();break}
    case "rock":x.translate(p.x,p.y);x.rotate(t*6);x.fillStyle="#9A7650";x.beginPath();for(var r2=0;r2<6;r2++){var a3=r2*TAU/6,rr=p.r*(.8+(r2%2)*.3);x.lineTo(Math.cos(a3)*rr,Math.sin(a3)*rr)}x.closePath();x.fill();x.strokeStyle="#4A3220";x.stroke();break;
    case "boomerang":x.translate(p.x,p.y);x.rotate(p.age*16);x.strokeStyle="#C07A3A";x.lineWidth=5;x.beginPath();x.moveTo(-p.r*1.5,p.r*.4);x.quadraticCurveTo(0,-p.r*1.4,p.r*1.5,p.r*.4);x.stroke();x.strokeStyle="#FFD86B";x.lineWidth=1.5;x.stroke();break;
    case "webshot":x.strokeStyle="#FFFFFF";x.lineWidth=1.2;for(var w=0;w<6;w++){var wa=w*TAU/6;x.beginPath();x.moveTo(p.x,p.y);x.lineTo(p.x+Math.cos(wa)*p.r,p.y+Math.sin(wa)*p.r);x.stroke()}x.beginPath();x.arc(p.x,p.y,p.r*.6,0,TAU);x.stroke();break;
    case "bee":x.translate(p.x,p.y);x.rotate(Math.atan2(uy,ux));x.fillStyle="#FFD23F";x.beginPath();x.ellipse(0,0,p.r+2,p.r,0,0,TAU);x.fill();x.fillStyle="#1A1206";x.fillRect(-1,-p.r,2,p.r*2);x.fillRect(-p.r,-p.r*.6,1.5,p.r*1.2);
      x.fillStyle="rgba(255,255,255,.7)";var fl=Math.sin(t*60)*2;x.beginPath();x.ellipse(-1,-p.r-1-fl*.3,3,2,0,0,TAU);x.ellipse(-1,p.r+1+fl*.3,3,2,0,0,TAU);x.fill();break;
    case "rocket":{x.translate(p.x,p.y);x.rotate(Math.atan2(uy,ux));x.fillStyle="rgba(255,176,46,.85)";x.beginPath();x.moveTo(-8,-3);x.lineTo(-16-Math.random()*6,0);x.lineTo(-8,3);x.fill();
      x.fillStyle="#E8EBF2";x.beginPath();if(x.roundRect)x.roundRect(-9,-3.5,15,7,3);else x.rect(-9,-3.5,15,7);x.fill();x.fillStyle=c;x.beginPath();x.moveTo(6,-3.5);x.lineTo(11,0);x.lineTo(6,3.5);x.fill();x.fillStyle="#5A6378";x.beginPath();x.moveTo(-9,-3.5);x.lineTo(-12,-7);x.lineTo(-5,-3.5);x.moveTo(-9,3.5);x.lineTo(-12,7);x.lineTo(-5,3.5);x.fill();break}
    default:x.fillStyle=c;x.shadowColor=c;x.shadowBlur=10;x.beginPath();x.arc(p.x,p.y,p.r,0,TAU);x.fill();
  }
  x.restore();
}
/* ---- ground zones ---- */
function zone(x,z,t){
  var life=Math.max(0,Math.min(1,(z.ttl-z.age)*1.6)),tp=z.type;x.save();x.globalAlpha=life;
  if(tp==="lava"){var g=x.createRadialGradient(z.x,z.y,2,z.x,z.y,z.r);g.addColorStop(0,"rgba(255,225,77,.85)");g.addColorStop(.5,"rgba(255,106,31,.6)");g.addColorStop(1,"rgba(120,20,10,0)");x.fillStyle=g;x.beginPath();x.arc(z.x,z.y,z.r,0,TAU);x.fill();
    x.fillStyle="rgba(255,240,180,.8)";for(var k=0;k<4;k++){var ph=(t*1.5+k*.25)%1;x.globalAlpha=life*(1-ph);x.beginPath();x.arc(z.x+Math.cos(k*1.7)*z.r*.45,z.y+Math.sin(k*2.3)*z.r*.45,2+ph*5,0,TAU);x.fill()}}
  else if(tp==="web"){x.strokeStyle="rgba(255,255,255,.65)";x.lineWidth=1;for(var s=0;s<10;s++){var a=s*TAU/10;x.beginPath();x.moveTo(z.x,z.y);x.lineTo(z.x+Math.cos(a)*z.r,z.y+Math.sin(a)*z.r);x.stroke()}
    x.beginPath();for(var q=0;q<=60;q++){var aa=q*TAU/10,rr=z.r*(.15+q/60*.85);x.lineTo(z.x+Math.cos(aa)*rr,z.y+Math.sin(aa)*rr)}x.stroke()}
  else if(tp==="tornado"){x.strokeStyle="rgba(210,250,240,.75)";for(var r3=0;r3<4;r3++){x.lineWidth=3-r3*.5;x.beginPath();x.ellipse(z.x,z.y-r3*6,z.r*(.3+r3*.2),z.r*(.12+r3*.07),0,t*8+r3,t*8+r3+4.5);x.stroke()}
    x.fillStyle="rgba(200,200,180,.8)";for(var d=0;d<5;d++){var da=t*10+d*1.3;x.fillRect(z.x+Math.cos(da)*z.r*.7,z.y+Math.sin(da)*z.r*.3-8,2.5,2.5)}}
  else if(tp==="pull"){var g2=x.createRadialGradient(z.x,z.y,0,z.x,z.y,z.r);g2.addColorStop(0,"rgba(0,0,0,1)");g2.addColorStop(.25,"rgba(20,8,40,.95)");g2.addColorStop(.6,"rgba(141,101,246,.35)");g2.addColorStop(1,"rgba(141,101,246,0)");x.fillStyle=g2;x.beginPath();x.arc(z.x,z.y,z.r,0,TAU);x.fill();
    x.strokeStyle="rgba(230,200,255,.7)";x.lineWidth=2;for(var sp2=0;sp2<3;sp2++){x.beginPath();x.ellipse(z.x,z.y,z.r*(.35+sp2*.18),z.r*(.12+sp2*.06),t*2+sp2,0,TAU);x.stroke()}}
  else if(tp==="time"){x.strokeStyle="rgba(155,248,255,.6)";x.lineWidth=2;x.setLineDash([3,7]);x.beginPath();x.arc(z.x,z.y,z.r,0,TAU);x.stroke();x.setLineDash([]);for(var h=0;h<12;h++){var ha=h*TAU/12;x.beginPath();x.moveTo(z.x+Math.cos(ha)*z.r*.9,z.y+Math.sin(ha)*z.r*.9);x.lineTo(z.x+Math.cos(ha)*z.r,z.y+Math.sin(ha)*z.r);x.stroke()}
    x.lineWidth=3;x.beginPath();x.moveTo(z.x,z.y);x.lineTo(z.x+Math.cos(t*2)*z.r*.6,z.y+Math.sin(t*2)*z.r*.6);x.stroke()}
  else if(tp==="mine"){x.fillStyle="#2A2E3C";x.beginPath();x.arc(z.x,z.y,9,0,TAU);x.fill();x.strokeStyle="#5B6283";x.lineWidth=2;x.stroke();var on=(Math.floor(t*4)%2)===0;x.fillStyle=on?"#FF2E4A":"#5B1020";x.shadowColor="#FF2E4A";x.shadowBlur=on?10:0;x.beginPath();x.arc(z.x,z.y,3,0,TAU);x.fill();x.shadowBlur=0;
    x.strokeStyle="rgba(230,41,72,.25)";x.setLineDash([4,6]);x.beginPath();x.arc(z.x,z.y,z.r*.5,0,TAU);x.stroke();x.setLineDash([])}
  else if(tp==="star"){var f=Math.min(1,z.age/Math.max(.01,z.delay));if(!z.done){x.strokeStyle="rgba(255,241,196,.9)";x.lineWidth=2;x.beginPath();x.arc(z.x,z.y,z.r*(1-f*.5),0,TAU);x.stroke();x.beginPath();x.moveTo(z.x-z.r,z.y);x.lineTo(z.x+z.r,z.y);x.moveTo(z.x,z.y-z.r);x.lineTo(z.x,z.y+z.r);x.stroke();
      x.globalCompositeOperation="lighter";x.fillStyle="rgba(255,241,196,"+(f*.7)+")";x.fillRect(z.x-3*f,0,6*f,z.y)}else{x.globalCompositeOperation="lighter";var sg=x.createRadialGradient(z.x,z.y,0,z.x,z.y,z.r);sg.addColorStop(0,"rgba(255,255,255,.9)");sg.addColorStop(1,"rgba(255,241,196,0)");x.fillStyle=sg;x.beginPath();x.arc(z.x,z.y,z.r,0,TAU);x.fill()}}
  else if(tp==="cloud"){for(var c=0;c<6;c++){var ca=c*1.05+t*.4,cr=z.r*.45;var cg=x.createRadialGradient(z.x+Math.cos(ca)*z.r*.45,z.y+Math.sin(ca)*z.r*.35,1,z.x+Math.cos(ca)*z.r*.45,z.y+Math.sin(ca)*z.r*.35,cr);cg.addColorStop(0,"rgba(200,170,255,.45)");cg.addColorStop(1,"rgba(141,101,246,0)");x.fillStyle=cg;x.beginPath();x.arc(z.x+Math.cos(ca)*z.r*.45,z.y+Math.sin(ca)*z.r*.35,cr,0,TAU);x.fill()}}
  x.restore();
}
/* ---- the arena ---- */
function arena(x,W,H,t,teams){
  var g=x.createRadialGradient(W/2,H/2,W*.1,W/2,H/2,W*.75);g.addColorStop(0,"#161B30");g.addColorStop(1,"#07080F");x.fillStyle=g;x.fillRect(0,0,W,H);
  x.strokeStyle="rgba(141,101,246,.07)";x.lineWidth=1;for(var hy=0;hy<H+20;hy+=26)for(var hx2=(hy/26|0)%2?15:0;hx2<W+30;hx2+=30){x.beginPath();for(var q=0;q<6;q++){var a=q*Math.PI/3+Math.PI/6;x.lineTo(hx2+Math.cos(a)*15,hy+Math.sin(a)*15)}x.closePath();x.stroke()}
  x.save();x.translate(W/2,H/2);x.strokeStyle="rgba(230,41,72,.08)";x.lineWidth=2;for(var r=60;r<=180;r+=60){x.beginPath();for(var s=0;s<=8;s++){var aa=s*Math.PI/4;x.lineTo(Math.cos(aa)*r,Math.sin(aa)*r)}x.stroke()}for(var k=0;k<8;k++){var ka=k*Math.PI/4;x.beginPath();x.moveTo(0,0);x.lineTo(Math.cos(ka)*190,Math.sin(ka)*190);x.stroke()}x.restore();
  var v=x.createRadialGradient(W/2,H/2,W*.35,W/2,H/2,W*.75);v.addColorStop(0,"rgba(0,0,0,0)");v.addColorStop(1,"rgba(0,0,0,.55)");x.fillStyle=v;x.fillRect(0,0,W,H);
  x.save();x.shadowColor="#8D65F6";x.shadowBlur=16;var bg=x.createLinearGradient(0,0,W,H);bg.addColorStop(0,"#E62948");bg.addColorStop(.5,"#8D65F6");bg.addColorStop(1,"#E62948");x.strokeStyle=bg;x.lineWidth=4;x.strokeRect(3,3,W-6,H-6);x.restore();
  x.fillStyle="#E6B85C";[[0,0],[W,0],[0,H],[W,H]].forEach(function(c){x.beginPath();x.arc(c[0]?c[0]-8:8,c[1]?c[1]-8:8,4,0,TAU);x.fill()});
}
return {body:body,weapon:weapon,proj:proj,zone:zone,arena:arena,look:look,light:light,dark:dark,rgba:rgba};
})();
