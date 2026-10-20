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
