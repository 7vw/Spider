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
/* Visual rarity only. The step loop never reads rar, so duels stay on the measured BAL multipliers. */
var RAR_OF={
  sword:"common",spear:"common",dagger:"common",hammer:"rare",axe:"rare",katana:"rare",chainsaw:"epic",flail:"rare",scythe:"epic",boomerang:"rare",
  fire:"rare",ice:"rare",lightning:"epic",poison:"rare",water:"common",wind:"rare",earth:"common",lava:"epic",shadow:"epic",light:"rare",
  gravity:"epic",blackhole:"legendary",time:"epic",teleport:"rare",clone:"epic",ghost:"epic",vampire:"epic",mirror:"rare",magnet:"rare",chaos:"legendary",
  spider:"rare",snake:"common",scorpion:"rare",dragon:"legendary",bee:"common",octopus:"rare",wolf:"rare",phoenix:"legendary",kraken:"epic",chameleon:"rare",
  laser:"epic",rocket:"rare",drone:"rare",plasma:"epic",tesla:"epic",turret:"common",mine:"common",shield:"rare",sawblade:"rare",railgun:"epic",
  reaper:"legendary",celestial:"legendary",void:"legendary",omega:"legendary",hydra:"legendary",stormking:"legendary",bloodmoon:"legendary",prism:"legendary",nebula:"legendary",infinity:"legendary"
};
for(var rid in RAR_OF)if(BC.KINDS[rid])BC.KINDS[rid].rar=RAR_OF[rid];
/* Cosmetic looks. Ids are new and local (bc_look). They do not enter spider_profile or the server catalog. */
BC.LOOKS={};BC.LOOK_ORDER=[];
function lookDef(o){o.how="free";o.cosmetic=true;BC.LOOKS[o.id]=o;BC.LOOK_ORDER.push(o.id)}
lookDef({id:"sw_royal",ball:"sword",set:"royal",ar:"سيف ملكي",en:"Royal Edge",rar:"legendary",color:"#F7D46B",color2:"#7A4A0E",shell:"crown",face:"brave",sig:"crown",trail:"gold",desc:"حافة ذهبية وتاج صغير. الشكل بس، والسيف يبقى بنفس القوة."});
lookDef({id:"hm_royal",ball:"hammer",set:"royal",ar:"مطرقة البلاط",en:"Court Hammer",rar:"legendary",color:"#E6B85C",color2:"#6B4A2B",shell:"crown",face:"brave",sig:"crown",trail:"gold",desc:"رأس ذهبي للمطرقة. ما يزيد الدفع ولا الضرر."});
lookDef({id:"sh_royal",ball:"shield",set:"royal",ar:"درع التاج",en:"Crown Shield",rar:"epic",color:"#F2E2A8",color2:"#4A6FB0",shell:"mirror",face:"visor",sig:"crown",trail:"gold",desc:"درع بلون البلاط. الامتصاص نفسه."});
lookDef({id:"ls_neon",ball:"laser",set:"neon",ar:"ليزر نيون",en:"Neon Beam",rar:"epic",color:"#FF2E9A",color2:"#7FE8FF",shell:"neon",face:"visor",sig:"neon",trail:"neon",desc:"شعاع بخطوط نيون. الطول والضرر ما يتغيرون."});
lookDef({id:"ts_neon",ball:"tesla",set:"neon",ar:"ملف نيون",en:"Neon Coil",rar:"epic",color:"#7FE8FF",color2:"#3A6BFF",shell:"neon",face:"visor",sig:"neon",trail:"neon",desc:"ملف سماوي. مجال الصعق نفسه."});
lookDef({id:"pl_neon",ball:"plasma",set:"neon",ar:"بلازما نيون",en:"Neon Plasma",rar:"epic",color:"#D56BFF",color2:"#7FE8FF",shell:"neon",face:"glow",sig:"neon",trail:"neon",desc:"كرة طاقة بحلقة نيون. الانفجار نفسه."});
lookDef({id:"vd_abyss",ball:"void",set:"abyss",ar:"فراغ أعمق",en:"Deeper Void",rar:"legendary",color:"#12081C",color2:"#B65CFF",shell:"smoke",face:"void",sig:"void",trail:"void",desc:"دوامة أوضح حول الفراغ. البلع والعلاج نفسهم."});
lookDef({id:"gh_abyss",ball:"ghost",set:"abyss",ar:"شبح الهاوية",en:"Abyss Ghost",rar:"epic",color:"#C9B6FF",color2:"#2A1050",shell:"smoke",face:"ghost",sig:"void",trail:"void",desc:"ضباب بنفسجي. نسبة التفادي نفسها."});
lookDef({id:"bh_abyss",ball:"blackhole",set:"abyss",ar:"بئر الهاوية",en:"Abyss Well",rar:"legendary",color:"#0A0614",color2:"#8D65F6",shell:"smoke",face:"void",sig:"void",trail:"void",desc:"مركز أظلم وحلقات. سحب الثقب نفسه."});
lookDef({id:"dr_ember",ball:"dragon",set:"ember",ar:"جمر التنين",en:"Ember Dragon",rar:"legendary",color:"#FF5A1F",color2:"#FFD23F",shell:"flame",face:"wolf",sig:"wings",trail:"fire",desc:"أجنحة وجمر. نفث النار بنفس الضرر."});
lookDef({id:"ph_solar",ball:"phoenix",set:"ember",ar:"شمس العنقاء",en:"Solar Phoenix",rar:"legendary",color:"#FFD23F",color2:"#FF4D2E",shell:"sun",face:"divine",sig:"wings",trail:"fire",desc:"هالة شمس. الرجوع بعد السقوط بنفس النسبة."});
lookDef({id:"lv_ember",ball:"lava",set:"ember",ar:"قلب الجمر",en:"Ember Heart",rar:"epic",color:"#FF4D2E",color2:"#FFE14D",shell:"lava",face:"glow",sig:"flame",trail:"fire",desc:"قلب متوهج. برك الحمم نفسها."});
BC.SETS={royal:"الطقم الملكي",neon:"طقم النيون",abyss:"طقم الهاوية",ember:"طقم الجمر"};
BC.ARENAS={
  classic:{id:"classic",ar:"الكلاسيكية",en:"Classic",rar:"common",desc:"السداسيات الأصلية بإطار أحمر وبنفسجي."},
  abyss:{id:"abyss",ar:"الهاوية",en:"Abyss",rar:"epic",desc:"أرضية بنفسجية عميقة وحلقات حول الوسط."},
  ember:{id:"ember",ar:"الجمر",en:"Ember",rar:"rare",desc:"أرض دافئة وشقوق نار ثابتة."},
  frost:{id:"frost",ar:"الصقيع",en:"Frost",rar:"rare",desc:"جليد باهت وإطار سماوي."}
};
BC.ARENA_ORDER=["classic","abyss","ember","frost"];
BC.RAR_NAME={common:"عادي",rare:"نادر",epic:"ملحمي",legendary:"أسطوري"};
BC.PICK=BC.ORDER.filter(function(id){return !BC.KINDS[id].hidden});
})(typeof BC!=="undefined"?BC:require("./bc_core.js"));
