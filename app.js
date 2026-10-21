(function(){
"use strict";
//#PURE
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

/* @split-lazy-start */
/* Game rules for every title except WEBBOUND. Loaded on first open so the home screen does not parse them. */
let WG,XO,WW,WL,DM,BF,FH,WR,NST,NW,BCR;
let GAME_RULES={};
let MIN_PLAYERS={webbound:2};
let MAX_PLAYERS={webbound:4};
let WW_CATS={};
function takeGames(){
  const ex=globalThis.SPIDER_GAMES&&globalThis.SPIDER_GAMES.games;
  if(!ex||!ex.GAME_RULES)throw new Error("games");
  WG=ex.WG;XO=ex.XO;WW=ex.WW;WL=ex.WL;DM=ex.DM;BF=ex.BF;FH=ex.FH;WR=ex.WR;NST=ex.NST;NW=ex.NW;BCR=ex.BCR;
  GAME_RULES=ex.GAME_RULES;MIN_PLAYERS=ex.MIN_PLAYERS;MAX_PLAYERS=ex.MAX_PLAYERS;WW_CATS=ex.WW_CATS;
}
let gamesCssP=null,gamesP=null;
function ensureGamesCss(){
  if(gamesCssP)return gamesCssP;
  gamesCssP=new Promise(ok=>{
    let link=document.querySelector("link[data-games-css]");
    if(link&&link.rel==="stylesheet"){if(link.sheet){ok();return}link.addEventListener("load",()=>ok(),{once:true});link.addEventListener("error",()=>ok(),{once:true});return}
    link=document.createElement("link");
    link.rel="stylesheet";link.href="games.css?v=14";link.setAttribute("data-games-css","");
    link.onload=()=>ok();link.onerror=()=>ok();
    document.head.append(link);
  });
  return gamesCssP;
}
function loadGameScript(src){
  return new Promise((ok,bad)=>{
    const s=document.createElement("script");
    s.src=src;s.onload=()=>ok();s.onerror=()=>bad(new Error("games"));
    document.head.append(s);
  });
}
function ensureGames(){
  if(gamesP)return gamesP;
  gamesP=(async()=>{
    await ensureGamesCss();
    if(!(globalThis.SPIDER_GAMES&&globalThis.SPIDER_GAMES.games)){
      globalThis.SPIDER_GAMES={clock, newMid};
      await loadGameScript("js/domino_engine.js?v=1");
      await loadGameScript("js/minigames.js?v=6");
    }
    takeGames();
    registerChess();
  })().catch(e=>{gamesP=null;throw e});
  return gamesP;
}
/* @split-lazy-end */
/* @kalima-load-start */
let kalimaP=null;
function ensureKalima(){
  if(kalimaP)return kalimaP;
  kalimaP=(async()=>{
    await ensureGamesCss();
    if(!globalThis.KALIMA)await loadGameScript("js/kalima_engine.js?v=1");
    if(!globalThis.KALIMA_GUESSES)await loadGameScript("js/kalima_guesses.js?v=1");
  })().catch(e=>{kalimaP=null;throw e});
  return kalimaP;
}
/* @kalima-load-end */
/* @chess-load-start */
let chessP=null;
function registerChess(){
  if(!globalThis.CHESS)return;
  GAME_RULES.chess=globalThis.CHESS.rules;
  MIN_PLAYERS.chess=2;MAX_PLAYERS.chess=2;
}
function ensureChess(){
  if(chessP)return chessP;
  chessP=(async()=>{
    await ensureGamesCss();
    if(!globalThis.Chess)await loadGameScript("js/vendor/chess.global.js?v=1");
    if(!globalThis.CHESS)await loadGameScript("js/chess_rules.js?v=2");
    registerChess();
  })().catch(e=>{chessP=null;throw e});
  return chessP;
}
/* @chess-load-end */

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
function setCoins(n){n=Math.floor(Number(n));if(!Number.isFinite(n)||n<0)return;P.coins=n;saveProfile();const cc=$("homeCoins");if(cc){cc.textContent="";cc.removeAttribute("aria-label");cc.append(ic("coin","gold"),h("span",{class:"sr-only"},"رصيد العملات"),h("span",{},coinsText()))}}

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
//#END-PURE

/* ================= DOM helpers ================= */
const NS="http://www.w3.org/2000/svg";
const $=id=>document.getElementById(id);
function h(tag,a,...kids){
  const e=document.createElement(tag);
  if(a)for(const k in a){const v=a[k];if(v==null||v===false)continue;
    if(k==="class")e.className=v;else if(k==="text")e.textContent=v;
    else if(k.slice(0,2)==="on"&&typeof v==="function")e.addEventListener(k.slice(2),v);
    else e.setAttribute(k,v===true?"":v)}
  for(const c of kids.flat()){if(c==null||c===false)continue;e.append(c.nodeType?c:document.createTextNode(String(c)))}
  return e;
}
const add=(el,...kids)=>{for(const k of kids.flat())if(k!=null&&k!==false)el.append(k);return el};
function mk(tag,attrs,parent){const e=document.createElementNS(NS,tag);if(attrs)for(const k in attrs)if(attrs[k]!=null)e.setAttribute(k,attrs[k]);if(parent)parent.appendChild(e);return e}
let uid=0;
const plural=(n,one,two,few,many)=>{n=Math.floor(n);return n===1?one:n===2?two:(n>=3&&n<=10)?fmt(n)+" "+few:fmt(n)+" "+many};
function leftText(ms){
  ms=Math.max(0,ms);const d=Math.floor(ms/DAY),hh=Math.floor(ms%DAY/3600000),mm=Math.floor(ms%3600000/60000);
  const D=d?plural(d,"يوم","يومين","أيام","يوم"):"",H=hh?plural(hh,"ساعة","ساعتين","ساعات","ساعة"):"",M=mm?plural(mm,"دقيقة","دقيقتين","دقائق","دقيقة"):"";
  if(d)return H?D+" و"+H:D;if(hh)return M?H+" و"+M:H;return M||"أقل من دقيقة";
}
const mmss=ms=>{if(!ms)return "—";const s=Math.round(ms/1000);return fmt(Math.floor(s/60))+":"+(s%60<10?"٠":"")+fmt(s%60)};
const displayName=()=>P.nickname||"لاعب";
const myNick=()=>(P.nickname||"لاعب").slice(0,16);
const reduceMotion=()=>{try{return matchMedia("(prefers-reduced-motion: reduce)").matches}catch(e){return false}};
const lite=()=>P.settings.fx==="lite"||reduceMotion();

/* ================= owner identity =================
   verified comes only from Claude (user.isOwner()). ownerId is the owner's platform id, read from a
   database document that only the artifact owner is allowed to write. */
const Owner={verified:false,id:null,ownerId:null};
const ownerOk=()=>Owner.verified;
function eff(t){const id=P.equipped[t],it=findItem(t,id);return (!it||(isOwnerItem(it)&&!Owner.verified))?DEFAULT_EQUIP[t]:id}
const effItem=t=>findItem(t,eff(t));

/* ================= balls ================= */
const EMBLEM_NATIVE=new Set(["bolt","crown","dot","eclipse","eye","flame","gem","heart","ink","moon","orbit","skull","snow","spider","star"]);
function emblem(parent,type,cx,cy,s,ink){
  if(!type||type==="none")return null;
  const g=mk("g",{transform:"translate("+cx+" "+cy+") scale("+s+")"},parent);
  ink=ink||"rgba(5,6,12,.82)";
  if(typeof GLYPH!=="undefined"&&GLYPH[type]&&!EMBLEM_NATIVE.has(type)){const gg=mk("g",{transform:"translate(-1.25 -1.25) scale(.1042)",color:ink},g);gg.innerHTML=GLYPH[type];return g}
  if(type==="spider"){
    mk("ellipse",{cx:0,cy:.45,rx:.75,ry:.95,fill:ink},g);mk("circle",{cx:0,cy:-.75,r:.5,fill:ink},g);
    for(const sg of [-1,1])for(const [a,b,c,d] of [[.5,-.3,1.6,-1.4],[.6,.1,1.9,-.2],[.6,.5,1.8,1.1],[.5,.9,1.3,1.9]])
      mk("path",{d:"M"+(a*sg)+" "+b+" L"+(c*sg)+" "+d,stroke:ink,"stroke-width":".32","stroke-linecap":"round",fill:"none"},g);
  }else if(type==="flame")mk("path",{d:"M0,-2.1 C1.3,-.7 1.6,.4 1.05,1.35 C.6,2.1 -.6,2.1 -1.05,1.35 C-1.5,.5 -.7,-.3 -.35,-1 C-.1,-.4 .2,-.2 0,-2.1Z",fill:ink},g);
  else if(type==="snow"){for(const a of [0,60,120])mk("line",{x1:0,y1:-1.9,x2:0,y2:1.9,stroke:ink,"stroke-width":".38","stroke-linecap":"round",transform:"rotate("+a+")"},g)}
  else if(type==="bolt")mk("polygon",{points:".55,-2.1 -1.15,.3 -.05,.3 -.55,2.1 1.15,-.45 .05,-.45",fill:ink},g);
  else if(type==="moon")mk("path",{d:"M.4,-1.8 A1.8,1.8 0 1 0 .4,1.8 A2.2,2.2 0 0 1 .4,-1.8Z",fill:ink},g);
  else if(type==="gem")mk("polygon",{points:"0,-2 1.5,-.5 0,2 -1.5,-.5",fill:ink},g);
  else if(type==="orbit"){mk("ellipse",{cx:0,cy:0,rx:2.3,ry:.8,fill:"none",stroke:ink,"stroke-width":".3",transform:"rotate(-20)"},g);mk("circle",{cx:0,cy:0,r:.9,fill:ink},g)}
  else if(type==="eclipse")mk("circle",{cx:0,cy:0,r:2.1,fill:"#000",stroke:ink==="rgba(5,6,12,.82)"?"#FFD9A0":ink,"stroke-width":".45"},g);
  else if(type==="crown")mk("path",{d:"M-1.7,1 L-1.7,-1 L-.85,0 L0,-1.5 L.85,0 L1.7,-1 L1.7,1Z",fill:ink},g);
  else if(type==="ink")mk("path",{d:"M0,-2 C1.2,-.6 1.7,.5 1.1,1.4 C.7,2 .1,1.6 0,1 C-.2,1.8 -1,2 -1.3,1.2 C-1.7,.3 -1,-.7 0,-2Z",fill:ink},g);
  else if(type==="dot")mk("circle",{cx:0,cy:0,r:.8,fill:ink},g);
  else if(type==="eye"){mk("path",{d:"M-2.1,0 Q0,-1.7 2.1,0 Q0,1.7 -2.1,0Z",fill:"#fff",stroke:ink,"stroke-width":".3"},g);mk("circle",{r:.8,fill:ink},g)}
  else if(type==="skull"){mk("path",{d:"M-1.5,.3 C-1.7,-1.9 1.7,-1.9 1.5,.3 L1,.65 L1,1.45 L-1,1.45 L-1,.65Z",fill:ink},g);mk("circle",{cx:-.55,cy:-.25,r:.38,fill:"#fff"},g);mk("circle",{cx:.55,cy:-.25,r:.38,fill:"#fff"},g)}
  else if(type==="heart")mk("path",{d:"M0,1.6 C-2.3,0 -1.6,-1.9 0,-.7 C1.6,-1.9 2.3,0 0,1.6Z",fill:ink},g);
  else if(type==="star")mk("path",{d:starPath(0,0,1.95,.8),fill:ink},g);
  return g;
}
function starPath(x,y,ro,ri){let d="";for(let k=0;k<10;k++){const a=-Math.PI/2+k*Math.PI/5,r=k%2?ri:ro;d+=(k?"L":"M")+(x+Math.cos(a)*r).toFixed(2)+","+(y+Math.sin(a)*r).toFixed(2)}return d+"Z"}
function zigzag(x1,y1,x2,y2,amp){
  amp=amp||.6;const len=Math.hypot(x2-x1,y2-y1),n=Math.max(4,Math.round(len/1.6)),nx=-(y2-y1)/len,ny=(x2-x1)/len;let d="M"+x1+","+y1;
  for(let i=1;i<n;i++){const t=i/n,o=(i%2?1:-1)*amp;d+="L"+(x1+(x2-x1)*t+nx*o).toFixed(2)+","+(y1+(y2-y1)*t+ny*o).toFixed(2)}
  return d+"L"+x2+","+y2;
}
function pattern(g,type,r,col){
  const sw=r*.06;
  if(type==="web"){
    for(let k=0;k<8;k++){const a=k*Math.PI/4;mk("line",{x1:0,y1:0,x2:Math.cos(a)*r,y2:Math.sin(a)*r,stroke:col,"stroke-width":sw},g)}
    for(const f of [.38,.7]){let d="";for(let k=0;k<=8;k++){const a=k*Math.PI/4;d+=(k?"L":"M")+(Math.cos(a)*r*f).toFixed(3)+","+(Math.sin(a)*r*f).toFixed(3)}mk("path",{d,fill:"none",stroke:col,"stroke-width":sw},g)}
  }else if(type==="rings"){for(const f of [.35,.62,.88])mk("circle",{r:r*f,fill:"none",stroke:col,"stroke-width":sw},g)}
  else if(type==="circuit"){
    mk("path",{d:`M${-.75*r},${-.25*r}H${-.15*r}V${.25*r}H${.6*r}M${-.45*r},${.6*r}H${.15*r}V${.85*r}M${.2*r},${-.8*r}V${-.45*r}H${.7*r}`,fill:"none",stroke:col,"stroke-width":sw*1.1},g);
    for(const [x,y] of [[-.75,-.25],[.6,.25],[-.45,.6],[.7,-.45]])mk("circle",{cx:x*r,cy:y*r,r:r*.08,fill:col},g);
  }else if(type==="shine")mk("ellipse",{cx:-.15*r,cy:-.32*r,rx:.95*r,ry:.17*r,fill:"rgba(255,255,255,.5)",transform:"rotate(-32)"},g);
  else if(type==="mist"){for(const [x,y,rx,ry] of [[-.3,.2,.6,.3],[.35,-.15,.5,.25],[0,.62,.7,.2],[-.2,-.55,.45,.18]])mk("ellipse",{cx:x*r,cy:y*r,rx:rx*r,ry:ry*r,fill:col},g)}
  else if(type==="bubbles"){for(const [x,y,s] of [[-.4,.3,.18],[.3,.45,.12],[.45,-.2,.16],[-.1,-.45,.1],[.05,.05,.08]])mk("circle",{cx:x*r,cy:y*r,r:s*r,fill:"none",stroke:col,"stroke-width":sw},g)}
  else if(type==="stars"){for(const [x,y,s] of [[-.5,-.3,.07],[.4,-.5,.05],[.2,.1,.08],[-.2,.55,.05],[.6,.35,.06],[-.65,.2,.04],[0,-.7,.04]])mk("circle",{cx:x*r,cy:y*r,r:s*r,fill:col},g)}
  else if(type==="crack")mk("path",{d:`M${-.85*r},${-.1*r}L${-.35*r},${.12*r}L${-.1*r},${-.25*r}L${.3*r},${.05*r}L${.8*r},${-.2*r}M${-.1*r},${-.25*r}L${.05*r},${.55*r}L${.35*r},${.8*r}`,fill:"none",stroke:col,"stroke-width":sw*1.2,"stroke-linejoin":"round"},g);
  else if(type==="aurora"){mk("ellipse",{cx:0,cy:.3*r,rx:r,ry:.38*r,fill:col,opacity:".55"},g);mk("ellipse",{cx:.1*r,cy:-.3*r,rx:.9*r,ry:.22*r,fill:"#FFFFFF",opacity:".25"},g)}
  else if(type==="sparks"){for(const [x,y] of [[-.5,-.35],[.45,.4],[.35,-.55]])mk("path",{d:`M${(x-.12)*r},${(y-.12)*r}L${x*r},${y*r}L${(x-.05)*r},${(y+.02)*r}L${(x+.12)*r},${(y+.14)*r}`,fill:"none",stroke:col,"stroke-width":sw},g)}
  else if(type==="split")mk("path",{d:`M0,${-r}A${r},${r} 0 0 1 0,${r}Z`,fill:col,opacity:".85"},g);
  else if(type==="facets"){
    const pts=[[0,-1],[.87,-.5],[.87,.5],[0,1],[-.87,.5],[-.87,-.5]].map(([x,y])=>[x*r*.6,y*r*.6]);
    mk("polygon",{points:pts.map(p=>p[0].toFixed(2)+","+p[1].toFixed(2)).join(" "),fill:"none",stroke:col,"stroke-width":sw},g);
    for(const [x,y] of pts){mk("line",{x1:0,y1:0,x2:x,y2:y,stroke:col,"stroke-width":sw*.7},g);mk("line",{x1:x,y1:y,x2:x*1.75,y2:y*1.75,stroke:col,"stroke-width":sw*.7},g)}
  }else if(type==="tri"){
    const w=(a0,a1,fill)=>mk("path",{d:`M0,0L${(Math.cos(a0)*r*1.3).toFixed(2)},${(Math.sin(a0)*r*1.3).toFixed(2)}A${r*1.3},${r*1.3} 0 0 1 ${(Math.cos(a1)*r*1.3).toFixed(2)},${(Math.sin(a1)*r*1.3).toFixed(2)}Z`,fill,opacity:".85"},g);
    w(-Math.PI/2,Math.PI/6,col);w(Math.PI/6,Math.PI*5/6,"rgba(63,183,255,.75)");
  }else if(type==="craters"){for(const [x,y,s] of [[-.35,-.3,.22],[.3,.1,.16],[-.1,.45,.13],[.45,-.45,.1]])mk("circle",{cx:x*r,cy:y*r,r:s*r,fill:col},g)}
  else if(type==="rays"){for(let k=0;k<12;k++){const a=k*Math.PI/6;mk("line",{x1:Math.cos(a)*r*.48,y1:Math.sin(a)*r*.48,x2:Math.cos(a)*r,y2:Math.sin(a)*r,stroke:col,"stroke-width":sw*1.3,"stroke-linecap":"round"},g)}}
  else if(type==="bands"){for(const [y,hh] of [[-.55,.14],[-.15,.2],[.3,.12],[.6,.1]])mk("rect",{x:-r,y:y*r,width:2*r,height:hh*r,fill:col},g)}
  else if(type==="pixels"){const s=r/3;for(let i=-3;i<3;i++)for(let j=-3;j<3;j++)if((i+j+6)%2===0)mk("rect",{x:i*s,y:j*s,width:s,height:s,fill:col},g)}
  else if(type==="veins")mk("path",{d:`M${-r},${-.2*r}C${-.4*r},${-.5*r} ${.1*r},${.2*r} ${r},${-.3*r}M${-.6*r},${.6*r}C${-.2*r},${.2*r} ${.3*r},${.7*r} ${.8*r},${.3*r}M${-.2*r},${-.9*r}C0,${-.5*r} ${-.3*r},${-.2*r} 0,0`,fill:"none",stroke:col,"stroke-width":sw*.9},g);
  else if(type==="spiral"){let d="";for(let k=0;k<=60;k++){const a=k*.32,rr=r*k/60;d+=(k?"L":"M")+(Math.cos(a)*rr).toFixed(2)+","+(Math.sin(a)*rr).toFixed(2)}mk("path",{d,fill:"none",stroke:col,"stroke-width":sw*1.1},g)}
  else if(type==="band"){mk("rect",{x:-r,y:.18*r,width:2*r,height:.2*r,fill:col},g);mk("rect",{x:-r,y:.45*r,width:2*r,height:.06*r,fill:col,opacity:".7"},g)}
  else if(type==="drip")mk("path",{d:`M${-r},${-.35*r}H${r}V${-.1*r}C${.6*r},${-.1*r} ${.6*r},${.35*r} ${.45*r},${.35*r}C${.3*r},${.35*r} ${.3*r},${-.05*r} ${.05*r},${-.05*r}C${-.15*r},${-.05*r} ${-.15*r},${.6*r} ${-.35*r},${.6*r}C${-.55*r},${.6*r} ${-.5*r},${-.1*r} ${-r},${-.1*r}Z`,fill:col},g);
  else if(type==="creator"){pattern(g,"web",r,col);mk("circle",{r:r*.9,fill:"none",stroke:"#B98CFF","stroke-width":sw*1.5,opacity:".9"},g)}
}
function ballGraphic(parent,sk,cx,cy,r,o){
  o=o||{};const id=++uid,g=mk("g",{transform:"translate("+cx+" "+cy+")"},parent);
  const defs=mk("defs",{},g),gr=mk("radialGradient",{id:"bg"+id,cx:"35%",cy:"30%",r:"75%"},defs);
  if(sk.base){mk("stop",{offset:"0%","stop-color":"#fff","stop-opacity":".35"},gr);mk("stop",{offset:"40%","stop-color":sk.base},gr);mk("stop",{offset:"100%","stop-color":sk.d},gr)}
  else{mk("stop",{offset:"0%","stop-color":"#fff","stop-opacity":".95"},gr);mk("stop",{offset:"38%","stop-color":sk.c},gr);mk("stop",{offset:"100%","stop-color":sk.d},gr)}
  const cp=mk("clipPath",{id:"bc"+id},defs);mk("circle",{r},cp);
  if(sk.anim&&o.anim!==false)mk("circle",{r:r*1.22,fill:sk.c,class:"halo"},g);
  mk("circle",{r,fill:"url(#bg"+id+")",filter:o.filter||null},g);
  if(sk.base)mk("circle",{r:r-.15,fill:"none",stroke:sk.c,"stroke-width":r*.07,opacity:".85"},g);
  if(sk.pat)pattern(mk("g",{"clip-path":"url(#bc"+id+")"},g),sk.pat,r,sk.pc||"rgba(255,255,255,.5)");
  emblem(g,sk.e,0,0,r/3.6,sk.ink);
  return g;
}
function ballSvg(sk,size){
  const sv=mk("svg",{viewBox:"-5.4 -5.4 10.8 10.8","aria-hidden":"true"});
  if(size){sv.setAttribute("width",size);sv.setAttribute("height",size)}
  ballGraphic(sv,sk,0,0,4.3);return sv;
}
function decoEl(id){
  if(!id||id==="none"||/aura$/.test(id))return null;
  const box=h("span",{class:"dec dec-"+id,"aria-hidden":"true"});
  let sv;
  if(id==="halo"){sv=mk("svg",{viewBox:"-10 -3 20 6"});mk("ellipse",{rx:8.5,ry:2,fill:"none",stroke:"#00F0FF","stroke-width":1.4},sv);mk("ellipse",{rx:8.5,ry:2,fill:"none",stroke:"#FFFFFF","stroke-width":.4,opacity:".8"},sv);box.style.filter="drop-shadow(0 0 4px #00F0FF)"}
  else if(id==="crown"){sv=mk("svg",{viewBox:"-10 -7 20 12"});mk("path",{d:"M-8,4 L-8,-3 L-4,1 L0,-6 L4,1 L8,-3 L8,4Z",fill:"#FFD86B",stroke:"#8A5A00","stroke-width":.6,"stroke-linejoin":"round"},sv);for(const x of [-8,0,8])mk("circle",{cx:x,cy:x?-3.6:-6.4,r:1.1,fill:"#FF4FD8"},sv)}
  else if(id==="webhalo"){sv=mk("svg",{viewBox:"-12 -12 24 24"});const g=mk("g",{fill:"none",stroke:"rgba(220,255,235,.6)","stroke-width":.35},sv);for(let k=0;k<12;k++){const a=k*Math.PI/6;mk("line",{x1:0,y1:0,x2:Math.cos(a)*12,y2:Math.sin(a)*12},g)}for(const r of [9.5,11.5])mk("circle",{r},g)}
  else if(id==="galring"){sv=mk("svg",{viewBox:"-14 -8 28 16"});mk("ellipse",{rx:13,ry:3.6,fill:"none",stroke:"#B98CFF","stroke-width":.9,transform:"rotate(-14)"},sv);mk("circle",{cx:-11,cy:2.4,r:1.6,fill:"#7FE8FF"},sv);mk("circle",{cx:9,cy:-3.4,r:.8,fill:"#fff"},sv)}
  else if(id==="minispider"){sv=mk("svg",{viewBox:"0 0 10 18"});mk("line",{x1:5,y1:0,x2:5,y2:9,stroke:"rgba(220,255,235,.7)","stroke-width":.4},sv);const u=mk("use",{href:"#spiderSym",x:1,y:8,width:8,height:8},sv);u.style.color="#39FF88"}
  else if(id==="wings"){sv=mk("svg",{viewBox:"-20 -8 40 16"});for(const s of [-1,1])mk("path",{d:`M${s*7},0 C${s*12},-8 ${s*19},-6 ${s*19},-3 C${s*16},-2 ${s*17},1 ${s*14},2 C${s*16},4 ${s*12},6 ${s*7},3Z`,fill:"#FFD86B",stroke:"#8A5A00","stroke-width":.4,opacity:".95"},sv)}
  if(!sv&&typeof DECO_NEW!=="undefined"&&DECO_NEW[id])sv=svgNode(DECO_NEW[id]);
  if(sv)box.append(sv);return box;
}
function avatar(skinId,frameId,size,deco){
  const sk=findItem("skin",skinId)||SKINS[0],dc=findItem("deco",deco)?deco:"none";
  const a=h("span",{class:"av fr-"+(findItem("frame",frameId)?frameId:"basic")+(dc!=="none"?" dc-"+dc:""),style:"--s:"+(size||48)+"px","aria-hidden":"true"});
  a.append(ballSvg(sk));add(a,decoEl(dc));return a;
}
const myAvatar=size=>avatar(eff("skin"),eff("frame"),size,eff("deco"));
const nameEl=(name,theme)=>h("span",{class:"nt nt-"+(findItem("theme",theme)?theme:"default")},name);
const badgeEl=(id,size)=>{const b=findItem("badge",id);if(!b)return null;const s=h("span",{class:"bdg",title:b.name,role:"img","aria-label":"شارة "+b.name});s.append(badgeNode(b,size||22));return s};
const rarTag=it=>h("span",{class:"rar r-"+it.rar},RARITY[it.rar]+(it.founder?"، المؤسس":""));

/* ================= boards, threads and effects =================
   Board styles only repaint the background, cells and web lines: the 9x9 grid, goal edges,
   threads, balls and the highlighted moves are drawn the same way on every board. */
const BOARD_STYLE={
  classic:{box:"#05060C",cell:"rgba(24,22,30,.75)",stroke:"rgba(255,46,77,.2)",web:"rgba(235,235,245,.12)",corner:"rgba(235,235,245,.34)"},
  neoncity:{box:"#0A0618",cell:"rgba(30,16,56,.6)",stroke:"rgba(255,79,216,.3)",web:"rgba(255,140,235,.1)",corner:"rgba(255,160,240,.35)",deco:"skyline",dc:"#FF4FD8",dc2:"#00F0FF"},
  dark:{box:"#000000",cell:"rgba(16,16,20,.9)",stroke:"rgba(255,255,255,.17)",web:"rgba(255,255,255,.2)",corner:"rgba(255,255,255,.5)"},
  popart:{box:"#170A2A",cell:"rgba(255,255,255,.05)",stroke:"rgba(255,225,77,.45)",web:"rgba(255,79,216,.14)",corner:"rgba(255,225,77,.5)",deco:"halftone",dc:"#FF4FD8"},
  cybergrid:{box:"#021014",cell:"rgba(4,30,30,.55)",stroke:"rgba(25,245,193,.42)",web:"rgba(25,245,193,.08)",corner:"rgba(25,245,193,.35)",deco:"circuit",dc:"#19F5C1"},
  galaxy:{box:"#0B0626",cell:"rgba(24,12,60,.5)",stroke:"rgba(139,92,255,.32)",web:"rgba(200,180,255,.1)",corner:"rgba(200,180,255,.35)",deco:"stars",dc:"#FFFFFF"},
  lava:{box:"#160300",cell:"rgba(40,8,2,.7)",stroke:"rgba(255,90,46,.38)",web:"rgba(255,170,120,.1)",corner:"rgba(255,140,90,.4)",deco:"cracks",dc:"#FF7A1F"},
  frozen:{box:"#03141F",cell:"rgba(127,232,255,.07)",stroke:"rgba(190,245,255,.38)",web:"rgba(225,250,255,.16)",corner:"rgba(225,250,255,.5)",deco:"frost",dc:"#BFF4FF"},
  golden:{box:"#120C00",cell:"rgba(60,42,0,.5)",stroke:"rgba(255,201,60,.45)",web:"rgba(255,216,107,.13)",corner:"rgba(255,216,107,.5)",deco:"ornament",dc:"#FFC93C"},
  toxiclab:{box:"#021A0A",cell:"rgba(10,40,20,.62)",stroke:"rgba(182,255,46,.32)",web:"rgba(182,255,46,.1)",corner:"rgba(182,255,46,.4)",deco:"bubbles",dc:"#B6FF2E"},
  rooftop:{box:"#070B22",cell:"rgba(20,26,54,.6)",stroke:"rgba(160,180,255,.22)",web:"rgba(200,210,255,.1)",corner:"rgba(200,210,255,.35)",deco:"moon",dc:"#E8ECFF"},
  royal:{box:"#0A0612",cell:"rgba(40,20,62,.55)",stroke:"rgba(255,216,107,.4)",web:"rgba(255,216,107,.13)",corner:"rgba(255,216,107,.5)",deco:"crowns",dc:"#FFD86B",dc2:"#B98CFF"},
  creator:{box:"#07040C",cell:"rgba(30,16,40,.62)",stroke:"rgba(255,216,107,.48)",web:"rgba(255,216,107,.16)",corner:"rgba(185,140,255,.55)",deco:"creator",dc:"#FFD86B",dc2:"#B98CFF"}
,
  desert:{box:"#1A0F06",cell:"rgba(60,36,16,.55)",stroke:"rgba(227,183,120,.4)",web:"rgba(255,220,170,.1)",corner:"rgba(255,210,150,.36)",deco:"dunes",dc:"#E3B778",dc2:"#8A5A2B"},
  abyss:{box:"#020A14",cell:"rgba(6,30,52,.55)",stroke:"rgba(56,189,248,.36)",web:"rgba(127,232,255,.1)",corner:"rgba(127,232,255,.36)",deco:"waves",dc:"#38BDF8"},
  jungle:{box:"#04120A",cell:"rgba(10,40,22,.55)",stroke:"rgba(74,222,128,.36)",web:"rgba(180,255,200,.1)",corner:"rgba(160,255,190,.34)",deco:"vines",dc:"#4ADE80",dc2:"#166534"},
  sakura:{box:"#1A0C16",cell:"rgba(60,24,46,.5)",stroke:"rgba(255,111,168,.4)",web:"rgba(255,200,225,.1)",corner:"rgba(255,180,215,.38)",deco:"petals",dc:"#FFB3D1"},
  synthwave:{box:"#12041F",cell:"rgba(40,10,60,.5)",stroke:"rgba(255,46,147,.46)",web:"rgba(255,140,200,.1)",corner:"rgba(255,210,63,.36)",deco:"retro",dc:"#FF2E93",dc2:"#FFD23F"},
  magma:{box:"#140504",cell:"rgba(50,12,8,.6)",stroke:"rgba(255,77,46,.42)",web:"rgba(255,170,120,.1)",corner:"rgba(255,176,46,.38)",deco:"lava",dc:"#FF4D2E",dc2:"#FFB02E"},
  hive:{box:"#120C02",cell:"rgba(50,36,8,.5)",stroke:"rgba(230,162,60,.42)",web:"rgba(255,220,150,.1)",corner:"rgba(255,200,110,.36)",deco:"hex",dc:"#E6A23C"},
  auroraboard:{box:"#04101C",cell:"rgba(10,34,52,.5)",stroke:"rgba(92,255,209,.36)",web:"rgba(185,162,255,.12)",corner:"rgba(92,255,209,.36)",deco:"aurora",dc:"#5CFFD1",dc2:"#8D65F6"},
  blueprint:{box:"#0A1F45",cell:"rgba(30,70,140,.35)",stroke:"rgba(191,216,255,.46)",web:"rgba(191,216,255,.12)",corner:"rgba(191,216,255,.4)",deco:"blueprint",dc:"#BFD8FF"},
  marble:{box:"#0B0B0E",cell:"rgba(30,30,36,.62)",stroke:"rgba(230,184,92,.4)",web:"rgba(255,240,200,.08)",corner:"rgba(230,184,92,.4)",deco:"marble",dc:"#E6B85C"},
  runestone:{box:"#0C0818",cell:"rgba(30,20,50,.6)",stroke:"rgba(141,101,246,.46)",web:"rgba(185,162,255,.12)",corner:"rgba(230,184,92,.4)",deco:"runes",dc:"#B9A2FF",dc2:"#E6B85C"},
  storm:{box:"#070B16",cell:"rgba(20,28,48,.58)",stroke:"rgba(159,180,255,.36)",web:"rgba(200,215,255,.1)",corner:"rgba(200,215,255,.36)",deco:"rain",dc:"#9FB4FF",dc2:"#FFE14D"},
};
function cornerWeb(parent,x,y,sx,sy,R,stroke,sw){
  const g=mk("g",{transform:"translate("+x+" "+y+") scale("+sx+" "+sy+")",fill:"none",stroke,"stroke-width":sw,"pointer-events":"none"},parent);
  const angs=[0,22.5,45,67.5,90].map(a=>a*Math.PI/180);
  for(const a of angs)mk("line",{x1:0,y1:0,x2:Math.cos(a)*R,y2:Math.sin(a)*R},g);
  for(const f of [.3,.55,.8]){const rr=R*f;let d="";
    angs.forEach((a,k)=>{const px=Math.cos(a)*rr,py=Math.sin(a)*rr;
      if(k===0)d+="M"+px+" "+py;else{const am=(a+angs[k-1])/2,rm=rr*.86;d+=" Q"+(Math.cos(am)*rm)+" "+(Math.sin(am)*rm)+" "+px+" "+py}});
    mk("path",{d},g)}
  return g;
}
const crownPath=(x,y,s)=>`M${x-4*s},${y+2*s}L${x-4*s},${y-1.5*s}L${x-2*s},${y+.5*s}L${x},${y-3*s}L${x+2*s},${y+.5*s}L${x+4*s},${y-1.5*s}L${x+4*s},${y+2*s}Z`;
function boardDeco(g,st,T,defs,glow){
  const d=st.deco;if(!d)return;
  const c1=st.dc||"#fff",c2=st.dc2||c1,pr=(k,m)=>((k*m)%997)/997;
  if(d==="skyline"){
    let x=0,p="M0,"+T;const hs=[14,22,10,26,16,30,12,20,24,9,18,28,14];
    for(let i=0;x<T-.01;i++){const w=T/13,hh=hs[i%hs.length]*T/99;p+=`L${x.toFixed(1)},${(T-hh).toFixed(1)}L${(x+w).toFixed(1)},${(T-hh).toFixed(1)}`;x+=w}
    mk("path",{d:p+`L${T},${T}Z`,fill:"rgba(12,6,28,.92)",stroke:c1,"stroke-width":.35,"stroke-opacity":".75"},g);
    for(let k=0;k<30;k++)mk("rect",{x:(pr(k,37)*T).toFixed(1),y:(T-pr(k,53)*T*.2-2).toFixed(1),width:.9,height:1.2,fill:k%3?c2:c1,opacity:".75"},g);
  }else if(d==="halftone"){
    const id="ht"+(++uid),pt=mk("pattern",{id,width:3,height:3,patternUnits:"userSpaceOnUse"},defs);mk("circle",{cx:1.5,cy:1.5,r:.75,fill:c1,opacity:".38"},pt);
    mk("rect",{x:0,y:0,width:T,height:T,fill:"url(#"+id+")"},g);
    for(let k=0;k<6;k++)mk("line",{x1:-5,y1:k*T/5,x2:T*.45,y2:k*T/5-T*.3,stroke:"#FFE14D","stroke-width":.6,opacity:".35"},g);
  }else if(d==="circuit"){for(let k=0;k<9;k++){const y=(k+.5)*T/9,x=pr(k,29)*T*.6;mk("path",{d:`M${x},${y}H${x+T*.2}V${y+T*.06}H${x+T*.38}`,fill:"none",stroke:c1,"stroke-width":.4,opacity:".5"},g);mk("circle",{cx:x+T*.38,cy:y+T*.06,r:.8,fill:c1,opacity:".7"},g)}}
  else if(d==="stars"){mk("ellipse",{cx:T*.3,cy:T*.35,rx:T*.32,ry:T*.2,fill:"rgba(139,92,255,.2)"},g);mk("ellipse",{cx:T*.72,cy:T*.7,rx:T*.3,ry:T*.17,fill:"rgba(63,183,255,.15)"},g);
    for(let k=0;k<64;k++)mk("circle",{cx:(pr(k,73)*T).toFixed(1),cy:(pr(k,41)*T).toFixed(1),r:k%7===0?.6:.3,fill:c1,opacity:k%3?".5":".9"},g)}
  else if(d==="cracks")mk("path",{d:`M0,${T*.3}L${T*.2},${T*.35}L${T*.35},${T*.2}L${T*.55},${T*.38}L${T*.75},${T*.25}L${T},${T*.32}M${T*.35},${T*.2}L${T*.4},${T*.6}L${T*.6},${T*.7}L${T*.8},${T*.62}L${T},${T*.8}M${T*.4},${T*.6}L${T*.25},${T*.85}L${T*.3},${T}`,fill:"none",stroke:c1,"stroke-width":1,opacity:".65",filter:glow},g);
  else if(d==="frost"){
    for(const [x,y,sx,sy] of [[0,0,1,1],[T,0,-1,1],[0,T,1,-1],[T,T,-1,-1]])for(let k=0;k<5;k++){const a=k*22.5*Math.PI/180,l=T*.16;mk("line",{x1:x,y1:y,x2:x+sx*Math.cos(a)*l,y2:y+sy*Math.sin(a)*l,stroke:c1,"stroke-width":.35,opacity:".55"},g)}
    for(let k=0;k<14;k++){const x=pr(k,37)*T,y=pr(k,59)*T;for(const a of [0,60,120])mk("line",{x1:x-1.1,y1:y,x2:x+1.1,y2:y,stroke:c1,"stroke-width":.22,opacity:".55",transform:`rotate(${a} ${x.toFixed(1)} ${y.toFixed(1)})`},g)}
  }else if(d==="ornament"){
    mk("rect",{x:1.4,y:1.4,width:T-2.8,height:T-2.8,rx:2,fill:"none",stroke:c1,"stroke-width":.55,opacity:".6"},g);
    mk("rect",{x:3,y:3,width:T-6,height:T-6,rx:2,fill:"none",stroke:c1,"stroke-width":.3,opacity:".35"},g);
    for(const [x,y] of [[T/2,1.4],[T/2,T-1.4],[1.4,T/2],[T-1.4,T/2]])mk("rect",{x:x-1.4,y:y-1.4,width:2.8,height:2.8,fill:c1,opacity:".7",transform:`rotate(45 ${x} ${y})`},g);
  }else if(d==="bubbles"){for(let k=0;k<22;k++)mk("circle",{cx:(pr(k,61)*T).toFixed(1),cy:(pr(k,83)*T).toFixed(1),r:(.6+pr(k,17)*2.2).toFixed(2),fill:"none",stroke:c1,"stroke-width":.3,opacity:".45"},g)}
  else if(d==="moon"){mk("circle",{cx:T*.8,cy:T*.18,r:T*.15,fill:c1,opacity:".07"},g);mk("circle",{cx:T*.8,cy:T*.18,r:T*.085,fill:c1,opacity:".5"},g);
    let x=0,p="M0,"+T;const hs=[8,14,6,18,10,20,7,12,16];for(let i=0;x<T-.01;i++){const w=T/9,hh=hs[i%hs.length]*T/99;p+=`L${x.toFixed(1)},${(T-hh).toFixed(1)}L${(x+w).toFixed(1)},${(T-hh).toFixed(1)}`;x+=w}
    mk("path",{d:p+`L${T},${T}Z`,fill:"rgba(4,6,18,.85)"},g)}
  else if(d==="crowns"){mk("rect",{x:1.4,y:1.4,width:T-2.8,height:T-2.8,rx:2,fill:"none",stroke:c2,"stroke-width":.5,opacity:".6"},g);
    for(const [x,y] of [[6,6],[T-6,6],[6,T-6],[T-6,T-6]])mk("path",{d:crownPath(x,y,.7),fill:c1,opacity:".55"},g)}
  else if(d==="creator"){
    for(let k=0;k<16;k++){const a=k/16*Math.PI*2;mk("line",{x1:T/2,y1:T/2,x2:T/2+Math.cos(a)*T*.75,y2:T/2+Math.sin(a)*T*.75,stroke:k%2?c2:c1,"stroke-width":.35,opacity:".28"},g)}
    mk("circle",{cx:T/2,cy:T/2,r:T*.42,fill:"none",stroke:c2,"stroke-width":.5,opacity:".45"},g);
    for(const [x,y] of [[6,6],[T-6,6],[6,T-6],[T-6,T-6]])mk("path",{d:crownPath(x,y,.7),fill:c1,opacity:".6"},g);
  }
  else if(d==="dunes"){mk("circle",{cx:T*.78,cy:T*.2,r:T*.09,fill:c1,opacity:".22"},g);
    [[.72,.34],[.82,.24],[.92,.16]].forEach(([y,o],k)=>mk("path",{d:`M0,${T*y} Q${T*.25},${T*(y-.07)} ${T*.5},${T*y} T${T},${T*(y-.03)} L${T},${T} L0,${T}Z`,fill:k%2?c2:c1,opacity:o},g))}
  else if(d==="waves"){for(let k=0;k<8;k++){const y=T*(.1+k*.115);let s=`M0,${y}`;for(let x=0;x<T;x+=T/8)s+=` q${T/32},${-T/45} ${T/16},0 t${T/16},0`;mk("path",{d:s,fill:"none",stroke:c1,"stroke-width":.6,opacity:(.5-k*.03).toFixed(2)},g)}}
  else if(d==="vines"){for(const [x0,y0,sx,sy] of [[0,0,1,1],[T,T,-1,-1]]){let s=`M${x0},${y0}`;for(let k=1;k<=5;k++)s+=` Q${x0+sx*T*(k*.09+.05)},${y0+sy*T*(k*.06)} ${x0+sx*T*k*.1},${y0+sy*T*(k*.11)}`;mk("path",{d:s,fill:"none",stroke:c2,"stroke-width":1.1,opacity:".8"},g);
      for(let k=1;k<=6;k++)mk("ellipse",{cx:x0+sx*T*k*.085,cy:y0+sy*T*k*.09,rx:2.2,ry:1,fill:c1,opacity:".7",transform:`rotate(${sx*sy*35} ${x0+sx*T*k*.085} ${y0+sy*T*k*.09})`},g)}}
  else if(d==="petals"){for(let k=0;k<28;k++){const x=pr(k,61)*T,y=pr(k,83)*T;mk("ellipse",{cx:x,cy:y,rx:1.1,ry:.6,fill:c1,opacity:(.5+pr(k,7)*.4).toFixed(2),transform:`rotate(${(pr(k,29)*180).toFixed(0)} ${x} ${y})`},g)}}
  else if(d==="retro"){mk("circle",{cx:T/2,cy:T*.3,r:T*.16,fill:c2,opacity:".2"},g);for(let k=0;k<4;k++)mk("rect",{x:T*.34,y:T*(.3+k*.035),width:T*.32,height:T*.012,fill:st.box,opacity:".8"},g);
    const hz=T*.46;for(let k=0;k<6;k++){const y=hz+(T-hz)*Math.pow(k/5,1.6);mk("line",{x1:0,y1:y,x2:T,y2:y,stroke:c1,"stroke-width":.4,opacity:".3"},g)}
    for(let k=-6;k<=6;k++)mk("line",{x1:T/2,y1:hz,x2:T/2+k*T*.18,y2:T,stroke:c1,"stroke-width":.35,opacity:".28"},g)}
  else if(d==="lava"){for(let k=0;k<3;k++){const x0=T*(.2+k*.3);let s=`M${x0.toFixed(1)},0`;for(let y=T/5;y<=T+1;y+=T/5){const x=x0+(pr(k*11+y,17)-.5)*T*.12,xc=x0+(pr(k*5+y,23)-.5)*T*.16;s+=` Q${xc.toFixed(1)},${(y-T/10).toFixed(1)} ${x.toFixed(1)},${y.toFixed(1)}`}
    mk("path",{d:s,fill:"none",stroke:c1,"stroke-width":2.2,opacity:".3","stroke-linecap":"round"},g);mk("path",{d:s,fill:"none",stroke:c2,"stroke-width":.6,opacity:".75","stroke-linecap":"round"},g)}}
  else if(d==="hex"){const s=T/9,hgt=s*Math.sqrt(3)/2;let path="";for(let r=0;r*hgt<T+hgt;r++)for(let c=0;c*s*1.5<T+s;c++){const cx=c*s*1.5,cy=r*hgt*2+(c%2?hgt:0);let q="";for(let a=0;a<6;a++){const t=a*Math.PI/3;q+=(a?"L":"M")+(cx+s/2*Math.cos(t)).toFixed(1)+","+(cy+s/2*Math.sin(t)).toFixed(1)}path+=q+"Z"}
    mk("path",{d:path,fill:"none",stroke:c1,"stroke-width":.5,opacity:".42"},g)}
  else if(d==="aurora"){const id="au"+(++uid),lg=mk("linearGradient",{id,x1:0,y1:0,x2:1,y2:0},defs);mk("stop",{offset:"0","stop-color":c1},lg);mk("stop",{offset:"1","stop-color":c2},lg);
    mk("path",{d:`M0,${T*.3} C${T*.25},${T*.05} ${T*.5},${T*.4} ${T*.75},${T*.15} S${T},${T*.25} ${T},${T*.2} V${T*.42} C${T*.7},${T*.55} ${T*.4},${T*.3} 0,${T*.5}Z`,fill:`url(#${id})`,opacity:".2"},g);
    for(let k=0;k<14;k++)mk("circle",{cx:pr(k,41)*T,cy:pr(k,59)*T*.5,r:.35,fill:"#fff",opacity:".6"},g)}
  else if(d==="blueprint"){let s="";for(let k=1;k<24;k++){const v=k*T/24;s+=`M${v},0V${T}M0,${v}H${T}`}mk("path",{d:s,stroke:c1,"stroke-width":.15,opacity:".14"},g);
    mk("circle",{cx:T*.8,cy:T*.2,r:T*.1,fill:"none",stroke:c1,"stroke-width":.3,opacity:".3"},g);mk("path",{d:`M${T*.08},${T*.92}H${T*.4}M${T*.08},${T*.9}V${T*.94}M${T*.4},${T*.9}V${T*.94}`,stroke:c1,"stroke-width":.3,opacity:".35"},g)}
  else if(d==="marble"){for(let k=0;k<4;k++){const y0=T*(.15+k*.23);let s=`M0,${y0.toFixed(1)}`;for(let x=T/4;x<=T+1;x+=T/4){const y=y0+(pr(k*7+x,31)-.5)*T*.1,yc=y0+(pr(k*3+x,37)-.5)*T*.16;s+=` Q${(x-T/8).toFixed(1)},${yc.toFixed(1)} ${x.toFixed(1)},${y.toFixed(1)}`}
    mk("path",{d:s,fill:"none",stroke:c1,"stroke-width":(.35+k%2*.45).toFixed(2),opacity:(.35+k%2*.15).toFixed(2),"stroke-linecap":"round"},g)}}
  else if(d==="runes"){mk("circle",{cx:T/2,cy:T/2,r:T*.44,fill:"none",stroke:c1,"stroke-width":.7,opacity:".5"},g);mk("circle",{cx:T/2,cy:T/2,r:T*.38,fill:"none",stroke:c2,"stroke-width":.3,"stroke-dasharray":"1.5 2",opacity:".5"},g);
    for(let k=0;k<12;k++){const a=k*Math.PI/6,x=T/2+Math.cos(a)*T*.41,y=T/2+Math.sin(a)*T*.41;mk("path",{d:`M${x-1},${y-1.4}L${x+1},${y+1.4}M${x+1},${y-1.4}L${x},${y}`,stroke:c1,"stroke-width":.35,opacity:".45"},g)}}
  else if(d==="rain"){for(let k=0;k<44;k++){const x=pr(k,47)*T*1.1,y=pr(k,71)*T;mk("line",{x1:x,y1:y,x2:x-2.2,y2:y+5,stroke:c1,"stroke-width":.3,opacity:".24"},g)}
    mk("path",{d:`M${T*.72},${T*.04} L${T*.64},${T*.2} L${T*.7},${T*.2} L${T*.6},${T*.38}`,fill:"none",stroke:c2,"stroke-width":.6,opacity:".45"},g)}
}
/* draws background, decoration, cells and web; returns the glow filter reference for this svg */
function boardBase(svg,styleId,n,beforeCells){
  const st=BOARD_STYLE[styleId]||BOARD_STYLE.classic,T=n*S,gid="gl"+(++uid),glow="url(#"+gid+")";
  const defs=mk("defs",{},svg);
  const f=mk("filter",{id:gid,filterUnits:"userSpaceOnUse",x:-12,y:-12,width:T+27,height:T+27},defs);
  mk("feGaussianBlur",{stdDeviation:"1",result:"b"},f);const fm=mk("feMerge",{},f);mk("feMergeNode",{in:"b"},fm);mk("feMergeNode",{in:"SourceGraphic"},fm);
  mk("rect",{x:-4.5,y:-4.5,width:T+9,height:T+9,rx:5,fill:st.box},svg);
  boardDeco(mk("g",{"pointer-events":"none"},svg),st,T,defs,glow);
  if(beforeCells)beforeCells(glow);
  const cells=mk("g",{},svg);
  for(let r=0;r<n;r++)for(let c=0;c<n;c++)mk("rect",{x:c*S+.7,y:r*S+.7,width:S-1.4,height:S-1.4,rx:"1.8",fill:st.cell,stroke:st.stroke,"stroke-width":".35"},cells);
  const web=mk("g",{stroke:st.web,"stroke-width":".28",fill:"none","pointer-events":"none"},svg);
  const C=T/2,sp=16,R=T*.727,step=T*.0727;
  for(let k=0;k<sp;k++){const a=k/sp*Math.PI*2;mk("line",{x1:C,y1:C,x2:C+Math.cos(a)*R,y2:C+Math.sin(a)*R},web)}
  for(let ring=1;ring<=n;ring++){const rr=ring*step;let d="";
    for(let k=0;k<=sp;k++){const a=k/sp*Math.PI*2,x=C+Math.cos(a)*rr,y=C+Math.sin(a)*rr;
      if(k===0)d+="M"+x.toFixed(2)+" "+y.toFixed(2);else{const am=(k-.5)/sp*Math.PI*2,rm=rr*.9;d+=" Q"+(C+Math.cos(am)*rm).toFixed(2)+" "+(C+Math.sin(am)*rm).toFixed(2)+" "+x.toFixed(2)+" "+y.toFixed(2)}}
    mk("path",{d},web)}
  for(const [x,y,sx,sy] of [[-3.5,-3.5,1,1],[T+3.5,-3.5,-1,1],[-3.5,T+3.5,1,-1],[T+3.5,T+3.5,-1,-1]])cornerWeb(svg,x,y,sx,sy,14*n/9,st.corner,.3);
  return {defs,glow,T};
}
const WEB_STYLE={
  classic:{knot:"circle"},
  electric:{glow:"#FFE14D",core:"#FFFFFF",zig:true,knot:"dot"},
  fire:{glow:"#FF5A1F",core:"#FFE7A0",cls:"wflick",knot:"dot"},
  ice:{glow:"#7FE8FF",core:"#FFFFFF",knot:"diamond"},
  ink:{glow:"#9D7BFF",core:"#1A0F33",w:2.7,cw:.75,knot:"blob"},
  golden:{glow:"#FFC93C",core:"#FFF6D0",knot:"star"},
  neon:{dual:["#FF4FD8","#00F0FF"],core:"#FFFFFF",cw:.35,knot:"dot"},
  galaxy:{glow:"#8B5CFF",core:"#E8DBFF",stars:true,knot:"star"},
  crystal:{glow:"rgba(220,240,255,.9)",core:"#FFFFFF",knot:"diamond",op:.92},
  shadow:{glow:"#4A4A60",core:"#C8C8D8",knot:"dot"},
  laser:{glow:"#FF2E55",core:"#FFE0E6",w:1.3,cw:.35,cls:"wpulse",knot:"none"},
  royal:{glow:"#B98CFF",core:"#FFD86B",cw:.6,knot:"gold"},
  creator:{glow:"#FFD86B",core:"#FFF3C4",cw:.6,cls:"wpulse",knot:"violet",stars:true}
,
  toxic:{glow:"#B6FF3B",core:"#F4FFD0",cls:"wpulse",knot:"blob"},
  sakura:{glow:"#FF8FB8",core:"#FFF0F6",knot:"star"},
  aqua:{glow:"#38BDF8",core:"#E0F7FF",w:2.2,knot:"circle"},
  lava:{glow:"#FF4D2E",core:"#FFB02E",cls:"wflick",w:2.4,knot:"dot"},
  retro:{dual:["#FF2E93","#FFD23F"],core:"#FFFFFF",cw:.35,knot:"diamond"},
  jade:{glow:"#3BD18A",core:"#E6FFF2",knot:"diamond"},
  storm:{glow:"#9FB4FF",core:"#FFFFFF",zig:true,cls:"wpulse",knot:"dot"},
  silk:{glow:"rgba(255,255,255,.35)",core:"#FFFFFF",w:1.4,cw:.5,knot:"circle"},
  rune:{glow:"#8D65F6",core:"#E6B85C",cw:.6,stars:true,cls:"wpulse",knot:"violet"},
  obsidian:{glow:"#3B3F5C",core:"#B9A2FF",w:2.6,knot:"diamond"},
  sunbeam:{glow:"#FFD23F",core:"#FFFFFF",knot:"star"},
  aurora:{dual:["#5CFFD1","#8D65F6"],core:"#FFFFFF",cw:.35,stars:true,knot:"star"},
};
function wallLine(w){const [r,c,o]=w,len=2*S-1.6;if(o===0){const y=(r+1)*S,x=c*S+.8;return [x,y,x+len,y]}const x=(c+1)*S,y=r*S+.8;return [x,y,x,y+len]}
/* one thread; the small dot in the middle keeps the owner's colour visible on styled threads */
function drawSilk(parent,w,color,o){
  const [x1,y1,x2,y2]=wallLine(w),web=o.dashed?"classic":(WEB_STYLE[o.web]?o.web:"classic"),st=WEB_STYLE[web];
  const g=mk("g",{opacity:o.op!=null?o.op:(st.op||1)},parent);
  const cls=[o.fresh?"fresh":"",st.cls||""].filter(Boolean).join(" ");if(cls)g.setAttribute("class",cls);
  const da=o.dashed?"1.5 1.1":null;
  const line=(stroke,width,filter)=>{
    if(st.zig)return mk("path",{d:zigzag(x1,y1,x2,y2),stroke,"stroke-width":width,"stroke-linecap":"round","stroke-linejoin":"round",fill:"none",filter},g);
    return mk("line",{x1,y1,x2,y2,stroke,"stroke-width":width,"stroke-linecap":"round",filter,"stroke-dasharray":da},g);
  };
  if(st.dual){const [dx,dy]=y1===y2?[0,.45]:[.45,0];
    mk("line",{x1:x1-dx,y1:y1-dy,x2:x2-dx,y2:y2-dy,stroke:st.dual[0],"stroke-width":1.2,"stroke-linecap":"round",filter:o.glow},g);
    mk("line",{x1:x1+dx,y1:y1+dy,x2:x2+dx,y2:y2+dy,stroke:st.dual[1],"stroke-width":1.2,"stroke-linecap":"round",filter:o.glow},g)}
  else line(st.glow||color,st.w||2.1,o.glow);
  line(st.core||"#F4FFF8",st.cw||.5,null);
  if(o.dashed)return g;
  const knots=[[x1,y1],[x2,y2],[(x1+x2)/2,(y1+y2)/2]],core=st.core||"#F4FFF8";
  if(st.stars)for(const f of [.25,.75])mk("circle",{cx:x1+(x2-x1)*f,cy:y1+(y2-y1)*f,r:.35,fill:"#FFFFFF"},g);
  for(const [x,y] of knots){
    if(st.knot==="circle")mk("circle",{cx:x,cy:y,r:.7,fill:core},g);
    else if(st.knot==="dot")mk("circle",{cx:x,cy:y,r:.5,fill:core},g);
    else if(st.knot==="diamond")mk("rect",{x:x-.6,y:y-.6,width:1.2,height:1.2,fill:core,transform:`rotate(45 ${x} ${y})`},g);
    else if(st.knot==="star")mk("path",{d:starPath(x,y,1,.4),fill:core},g);
    else if(st.knot==="blob")mk("circle",{cx:x,cy:y,r:.95,fill:st.glow},g);
    else if(st.knot==="gold")mk("circle",{cx:x,cy:y,r:.75,fill:"#FFD86B"},g);
    else if(st.knot==="violet")mk("circle",{cx:x,cy:y,r:.75,fill:"#B98CFF"},g);
  }
  if(web!=="classic")mk("circle",{cx:(x1+x2)/2,cy:(y1+y2)/2,r:.75,fill:color,stroke:"#05060C","stroke-width":.25},g);
  return g;
}
/* movement trail between two cells; skipped in lite mode */
function trailFx(layer,from,to,id,glow){
  if(!id||id==="none"||lite()||!layer)return;
  const g=mk("g",{class:"trail","pointer-events":"none"},layer);
  const ax=from[1]*S+S/2,ay=from[0]*S+S/2,bx=to[1]*S+S/2,by=to[0]*S+S/2;
  const pts=k=>Array.from({length:k},(_,i)=>[ax+(bx-ax)*i/(k-1),ay+(by-ay)*i/(k-1)]);
  const dl=ms=>"animation-delay:"+ms+"ms";
  if(id==="webtrail"){mk("line",{x1:ax,y1:ay,x2:bx,y2:by,stroke:"#F4FFF8","stroke-width":.35},g);for(const [x,y] of pts(4))mk("circle",{cx:x,cy:y,r:.45,fill:"#F4FFF8"},g)}
  else if(id==="petals")pts(6).forEach(([x,y],i)=>mk("ellipse",{cx:x+(i%2?.7:-.7),cy:y,rx:.9,ry:.5,fill:i%2?"#FFB3D1":"#FF6FA8",transform:`rotate(${i*35} ${x} ${y})`,class:"rise",style:dl(i*40)},g));
  else if(id==="bubbles")pts(5).forEach(([x,y],i)=>mk("circle",{cx:x,cy:y,r:(.6+i%3*.25).toFixed(2),fill:"none",stroke:"#7FE8FF","stroke-width":.25,class:"rise",style:dl(i*50)},g));
  else if(id==="stars")pts(6).forEach(([x,y],i)=>mk("path",{d:starPath(x,y,.9,.3),fill:i%2?"#FFFFFF":"#FFE9A8",class:"grow",style:dl(i*40)},g));
  else if(id==="comet"){const gid="cm"+(++uid),lg=mk("linearGradient",{id:gid,gradientUnits:"userSpaceOnUse",x1:ax,y1:ay,x2:bx,y2:by},g);mk("stop",{offset:"0","stop-color":"#4FB3FF","stop-opacity":"0"},lg);mk("stop",{offset:"1","stop-color":"#FFFFFF"},lg);mk("line",{x1:ax,y1:ay,x2:bx,y2:by,stroke:`url(#${gid})`,"stroke-width":1.6,"stroke-linecap":"round",filter:glow},g)}
  else if(id==="hearts")pts(5).forEach(([x,y],i)=>mk("path",{d:`M${x},${y+.7}c-1.4,-.9 -1.6,-2 -.8,-2.4 .4,-.2 .8,0 .8,.4 0,-.4 .4,-.6 .8,-.4 .8,.4 .6,1.5 -.8,2.4z`,fill:"#FF4F7A",class:"rise",style:dl(i*45)},g));
  else if(id==="pixels")pts(8).forEach(([x,y],i)=>mk("rect",{x:x-.5+((i*37)%3-1)*.5,y:y-.5+((i*53)%3-1)*.5,width:1,height:1,fill:["#39FF88","#3FB7FF","#FF4FD8","#FFE14D"][i%4],style:dl(i*30)},g));
  else if(id==="rings")[0,1,2].forEach(i=>mk("circle",{cx:ax,cy:ay,r:2+i*1.4,fill:"none",stroke:"#B9A2FF","stroke-width":.3,class:"grow",style:dl(i*80)},g));
  else if(id==="notes")pts(4).forEach(([x,y],i)=>{const n=mk("g",{class:"rise",style:dl(i*60)},g);mk("ellipse",{cx:x,cy:y+.6,rx:.6,ry:.45,fill:"#F472B6"},n);mk("line",{x1:x+.55,y1:y+.5,x2:x+.55,y2:y-1.4,stroke:"#F472B6","stroke-width":.22},n)});
  else if(id==="leaves")pts(6).forEach(([x,y],i)=>mk("ellipse",{cx:x+(i%2?.8:-.8),cy:y,rx:1,ry:.45,fill:i%2?"#4ADE80":"#16A34A",transform:`rotate(${-30+i*25} ${x} ${y})`,class:"rise",style:dl(i*40)},g));
  else if(id==="lavatrail")pts(5).forEach(([x,y],i)=>mk("circle",{cx:x,cy:y,r:(1.1-i*.12).toFixed(2),fill:i%2?"#FFB02E":"#FF4D2E",filter:glow,style:dl(i*50)},g));
  else if(id==="ghost")pts(4).forEach(([x,y],i)=>mk("circle",{cx:x,cy:y,r:3.4,fill:"rgba(232,230,255,"+(.06+i*.05).toFixed(2)+")",stroke:"rgba(232,230,255,.25)","stroke-width":.2,style:dl(i*60)},g));
  else if(id==="plasma"){mk("path",{d:zigzag(ax,ay,bx,by,1.1),stroke:"#8D65F6","stroke-width":.9,fill:"none",filter:glow},g);mk("path",{d:zigzag(ax,ay,bx,by,.6),stroke:"#7FE8FF","stroke-width":.35,fill:"none"},g)}
  else if(id==="confettitrail")pts(8).forEach(([x,y],i)=>mk("rect",{x:x-.4,y:y-.2,width:.8,height:.4,fill:["#FF4F7A","#FFE14D","#3FB7FF","#39FF88"][i%4],transform:`rotate(${i*40} ${x} ${y})`,class:"rise",style:dl(i*30)},g));
  else if(id==="royaltrail"){mk("line",{x1:ax,y1:ay,x2:bx,y2:by,stroke:"#8D65F6","stroke-width":.5,opacity:".8",filter:glow},g);pts(5).forEach(([x,y],i)=>mk("path",{d:starPath(x,y,1,.33),fill:"#E6B85C",class:"grow",style:dl(i*50)},g))}
  else if(id==="electric")mk("path",{d:zigzag(ax,ay,bx,by,1.3),stroke:"#FFE14D","stroke-width":.7,fill:"none",filter:glow},g);
  else if(id==="fire")pts(6).forEach(([x,y],i)=>mk("circle",{cx:x+(i%2?.6:-.6),cy:y,r:(1-i*.09).toFixed(2),fill:i%2?"#FFB347":"#FF5A1F",class:"rise",style:dl(i*40)},g));
  else if(id==="ice")pts(6).forEach(([x,y],i)=>mk("rect",{x:x-.55,y:y-.55,width:1.1,height:1.1,fill:"#BFF4FF",transform:`rotate(45 ${x} ${y})`,style:dl(i*40)},g));
  else if(id==="smoke")pts(4).forEach(([x,y],i)=>mk("circle",{cx:x,cy:y,r:1.8,fill:"rgba(140,255,120,.35)",class:"grow",style:dl(i*60)},g));
  else if(id==="dust")pts(8).forEach(([x,y],i)=>mk("circle",{cx:x+((i*37)%5-2)*.4,cy:y+((i*53)%5-2)*.4,r:.38,fill:i%2?"#FFFFFF":"#B98CFF",style:dl(i*30)},g));
  else if(id==="sparks")pts(5).forEach(([x,y],i)=>mk("path",{d:starPath(x,y,1.2,.38),fill:"#FFD86B",class:"grow",style:dl(i*50)},g));
  else if(id==="shadow")pts(3).forEach(([x,y],i)=>mk("circle",{cx:x,cy:y,r:3.2,fill:"rgba(60,30,110,.45)",style:dl(i*70)},g));
  else if(id==="rainbow"){const cols=["#FF6B9A","#FF9F43","#FFE14D","#39FF88","#3FB7FF","#B08BFF"],ps=pts(7);for(let i=0;i<6;i++)mk("line",{x1:ps[i][0],y1:ps[i][1],x2:ps[i+1][0],y2:ps[i+1][1],stroke:cols[i],"stroke-width":1.2,"stroke-linecap":"round"},g)}
  else if(id==="glitch")pts(6).forEach(([x,y],i)=>mk("rect",{x:x+((i*7)%3-1)*.8,y:y+((i*11)%3-1)*.8,width:1.3,height:.7,fill:i%2?"#00F0FF":"#FF4FD8",style:dl(i*35)},g));
  setTimeout(()=>g.remove(),1200);
}
/* victory effect centred on (cx,cy); the same drawing is used on the board and in the result card */
function victoryFx(layer,cx,cy,id,color,glow,keep){
  if(lite())id="classic";
  const g=mk("g",{class:id==="classic"?"burst":"vfx","pointer-events":"none",transform:`translate(${cx} ${cy})`},layer);
  const ray=(n,r0,r1,col,w,cls,off)=>{for(let k=0;k<n;k++){const a=(k+(off||0))/n*Math.PI*2;mk("line",{x1:Math.cos(a)*r0,y1:Math.sin(a)*r0,x2:Math.cos(a)*r1,y2:Math.sin(a)*r1,stroke:typeof col==="function"?col(k):col,"stroke-width":w,"stroke-linecap":"round",filter:glow,class:cls||null},g)}};
  const ring=(r,col,w,cls,dash)=>mk("circle",{r,fill:"none",stroke:col,"stroke-width":w,class:cls,"stroke-dasharray":dash||null,filter:glow},g);
  const sprinkle=(n,cls,fn)=>{for(let k=0;k<n;k++)fn(k,cls)};
  switch(id){
    case "fireworks":for(const [ox,oy,col] of [[-10,-8,"#FF4F7A"],[10,-12,"#FFE14D"],[0,6,"#3FB7FF"]]){const sg=mk("g",{transform:`translate(${ox} ${oy})`},g);for(let k=0;k<10;k++){const a=k/10*Math.PI*2;mk("line",{x1:Math.cos(a)*2,y1:Math.sin(a)*2,x2:Math.cos(a)*8,y2:Math.sin(a)*8,stroke:col,"stroke-width":.5,"stroke-linecap":"round",filter:glow,class:"vdraw"},sg)}}break;
    case "aurorawin":for(let k=0;k<3;k++)mk("path",{d:`M-26,${-4+k*5} C-12,${-16+k*5} 12,${8+k*5} 26,${-6+k*5}`,pathLength:60,fill:"none",stroke:["#5CFFD1","#4FB3FF","#B9A2FF"][k],"stroke-width":(1.4-k*.3).toFixed(1),"stroke-linecap":"round",opacity:".85",filter:glow,class:"vdraw"},g);break;
    case "heartsrain":for(let k=0;k<8;k++){const a=k/8*Math.PI*2,hg=mk("g",{class:"vfly",style:`--dx:${(Math.cos(a)*20).toFixed(1)}px;--dy:${(Math.sin(a)*20).toFixed(1)}px`},g);mk("path",{d:"M0,1.6c-3,-2 -3.4,-4.4 -1.7,-5.2 .9,-.4 1.7,0 1.7,.9 0,-.9 .8,-1.3 1.7,-.9 1.7,.8 1.3,3.2 -1.7,5.2z",fill:"#FF4F7A"},hg)}break;
    case "starfall":for(let k=0;k<10;k++){const a=k/10*Math.PI*2,sg=mk("g",{class:"vfly",style:`--dx:${(Math.cos(a)*24).toFixed(1)}px;--dy:${(Math.sin(a)*24).toFixed(1)}px`},g);mk("path",{d:starPath(0,0,2,.7),fill:k%2?"#FFE9A8":"#FFFFFF"},sg)}ring(6,"#FFE9A8",.5,"vgrow");break;
    case "shockwave":ring(6,color,1,"vgrow");ring(12,color,.6,"vgrow2");ring(18,"#FFFFFF",.3,"vgrow3","1 2");break;
    case "sakurawin":for(let k=0;k<12;k++){const a=k/12*Math.PI*2,pg=mk("g",{class:"vfly",style:`--dx:${(Math.cos(a)*22).toFixed(1)}px;--dy:${(Math.sin(a)*22).toFixed(1)}px`},g);mk("ellipse",{rx:1.6,ry:.9,fill:k%2?"#FFB3D1":"#FF6FA8",transform:`rotate(${k*30})`},pg)}break;
    case "runecircle":ring(14,"#8D65F6",.7,"vgrow");ring(18,"#E6B85C",.4,"vgrow2","1.5 2");ray(8,9,13,"#B9A2FF",.5,"vdraw");break;
    case "pixelwin":for(let k=0;k<14;k++){const a=k/14*Math.PI*2,q=mk("g",{class:"vfly",style:`--dx:${(Math.cos(a)*20).toFixed(1)}px;--dy:${(Math.sin(a)*20).toFixed(1)}px`},g);mk("rect",{x:-1,y:-1,width:2,height:2,fill:["#39FF88","#3FB7FF","#FF4FD8","#FFE14D"][k%4]},q)}break;
    case "tornadowin":{let d="M0,0";for(let k=1;k<=40;k++){const a=k*.45,r=k*.55;d+=`L${(Math.cos(a)*r).toFixed(2)},${(Math.sin(a)*r).toFixed(2)}`}mk("path",{d,pathLength:60,fill:"none",stroke:color,"stroke-width":.6,"stroke-linecap":"round",filter:glow,class:"vdraw"},g);break}
    case "sunrise":ray(16,8,20,"#FFD23F",.6,"vdraw");mk("circle",{r:6,fill:"#FFB02E",opacity:".9",class:"vhold",filter:glow},g);break;
    case "thunderdome":for(const s of [-1,1])mk("path",{d:`M${s*14},-30L${s*8},-14L${s*13},-12L${s*6},2`,fill:"none",stroke:"#FFE14D","stroke-width":1.1,"stroke-linejoin":"round",filter:glow,class:"vflash"},g);ring(10,"#9FB4FF",.6,"vgrow");break;
    case "spiders":ray(12,5,20,color,.5,"vdraw");
      for(let k=0;k<6;k++){const a=k/6*Math.PI*2,u=mk("use",{href:"#spiderSym",x:-3,y:-3,width:6,height:6,class:"vfly",style:`--dx:${(Math.cos(a)*22).toFixed(1)}px;--dy:${(Math.sin(a)*22).toFixed(1)}px;color:${color}`},g)}break;
    case "crown":ray(10,6,22,"#FFD86B",.6,"vdraw");mk("path",{d:crownPath(0,-11,1.6),fill:"#FFD86B",stroke:"#8A5A00","stroke-width":.3,class:"vhold"},g);break;
    case "lightning":mk("path",{d:"M2,-40L-3,-22L3,-20L-4,-2",fill:"none",stroke:"#FFE14D","stroke-width":1.4,"stroke-linejoin":"round",filter:glow,class:"vflash"},g);ring(8,"#FFE14D",.8,"vgrow");ring(14,"#FFFFFF",.4,"vgrow2");break;
    case "webburst":{const w=mk("g",{class:"vgrow"},g);for(let k=0;k<12;k++){const a=k/12*Math.PI*2;mk("line",{x1:0,y1:0,x2:Math.cos(a)*24,y2:Math.sin(a)*24,stroke:"#F4FFF8","stroke-width":.4},w)}for(const r of [8,15,22])mk("circle",{r,fill:"none",stroke:"#F4FFF8","stroke-width":.35},w);break}
    case "portal":ring(6,"#8B5CFF",1,"vgrow","2 1.5");ring(11,"#4D7CFF",.8,"vgrow2","3 2");ring(16,"#FF4FD8",.6,"vgrow3","1.5 2");mk("circle",{r:4,fill:"rgba(139,92,255,.4)",class:"vgrow"},g);break;
    case "firecel":sprinkle(14,"vrise",k=>mk("circle",{cx:((k*37)%25-12),cy:((k*13)%8),r:.6+(k%3)*.3,fill:k%2?"#FFB347":"#FF5A1F",class:"vrise",style:"animation-delay:"+(k*50)+"ms"},g));ring(6,"#FF7A1F",.6,"vgrow");break;
    case "icestorm":sprinkle(12,"vfall",k=>mk("rect",{x:((k*29)%28-14),y:((k*17)%14-14),width:1.3,height:1.3,fill:"#BFF4FF",transform:`rotate(45 ${((k*29)%28-14)} ${((k*17)%14-14)})`,class:"vfall",style:"animation-delay:"+(k*60)+"ms"},g));ring(10,"#7FE8FF",.7,"vgrow");break;
    case "neonpulse":ring(6,"#FF4FD8",1,"vgrow");ring(6,"#00F0FF",1,"vgrow2");ring(6,"#FF4FD8",1,"vgrow3");break;
    case "confetti":{const cols=["#FF6B9A","#FFE14D","#39FF88","#3FB7FF","#B08BFF","#FF9F43"];sprinkle(24,"vfall",k=>mk("rect",{x:((k*37)%44-22),y:((k*23)%24-26),width:1.4,height:.8,fill:cols[k%6],class:"vfall",style:"animation-delay:"+(k*35)+"ms",transform:`rotate(${k*29} ${((k*37)%44-22)} ${((k*23)%24-26)})`},g));break}
    case "royal":{const r=mk("g",{class:"vspin"},g);for(let k=0;k<12;k++){const a=k/12*Math.PI*2;mk("line",{x1:Math.cos(a)*7,y1:Math.sin(a)*7,x2:Math.cos(a)*20,y2:Math.sin(a)*20,stroke:k%2?"#B98CFF":"#FFD86B","stroke-width":.6,"stroke-linecap":"round"},r)}
      setTimeout(()=>r.remove(),1800);mk("path",{d:crownPath(0,-10,1.5),fill:"#FFD86B",class:"vhold"},g);ring(9,"#B98CFF",.6,"vgrow");break}
    case "inktake":for(let k=0;k<6;k++){const a=k/6*Math.PI*2;mk("circle",{cx:Math.cos(a)*6,cy:Math.sin(a)*6,r:6,fill:"rgba(40,15,80,.75)",class:k%2?"vgrow2":"vgrow"},g)}mk("circle",{r:9,fill:"rgba(20,8,40,.8)",class:"vgrow3"},g);break;
    case "rift":mk("line",{x1:0,y1:-30,x2:0,y2:30,stroke:"#FFFFFF","stroke-width":1,filter:glow,class:"vflash"},g);
      for(const [dx,col,cls] of [[-1.2,"#00F0FF","vgrow"],[1.2,"#FF4FD8","vgrow2"],[0,"#FFE14D","vgrow3"]])mk("circle",{cx:dx,r:10,fill:"none",stroke:col,"stroke-width":.8,class:cls},g);break;
    case "creator":ray(16,6,24,k=>k%2?"#B98CFF":"#FFD86B",.6,"vdraw");mk("path",{d:crownPath(0,-11,1.7),fill:"#FFD86B",stroke:"#8A5A00","stroke-width":.3,class:"vhold"},g);
      {const w=mk("g",{class:"vgrow"},g);for(const r of [8,14,20])mk("circle",{r,fill:"none",stroke:"#FFD86B","stroke-width":.35},w)}break;
    default:ray(16,5,26,color,.7);
  }
  if(!keep)setTimeout(()=>g.remove(),2600);
  return g;
}
function miniBoard(boardId,o){
  o=o||{};const n=o.n||5,T=n*S;
  const sv=mk("svg",{viewBox:`-4.5 -4.5 ${T+9} ${T+9}`,class:"mb","aria-hidden":"true"});
  const b=boardBase(sv,boardId,n);
  const mid=Math.floor(n/2);
  if(o.web){drawSilk(sv,[mid-1,mid-1,0,0],o.color||"#39FF88",{web:o.web,glow:b.glow});if(o.more)drawSilk(sv,[mid,mid+0,1,0],o.color||"#39FF88",{web:o.web,glow:b.glow})}
  const fx=mk("g",{},sv);
  if(o.skin){const pg=mk("g",{class:"pawn",style:`transform:translate(${(mid+.5)*S}px,${(n-1+.5)*S}px)`},sv);ballGraphic(pg,o.skin,0,0,3.6,{filter:b.glow});sv._pawn=pg}
  sv._b=b;sv._fx=fx;sv._n=n;return sv;
}
function webSample(id){const sv=mk("svg",{viewBox:"0 0 40 22",class:"mb","aria-hidden":"true"});mk("rect",{width:40,height:22,rx:4,fill:"#07080F"},sv);
  const g=mk("g",{transform:"translate(-2.2 -1)"},sv);drawSilk(g,[0,0,0,0],"#39FF88",{web:id});const g2=mk("g",{transform:"translate(17 0)"},sv);drawSilk(g2,[0,0,1,0],"#FF7A1F",{web:id});return sv}

/* ================= item previews ================= */

function lobbyThumb(id,big){
  const el=h("div",{class:"lobthumb lt-"+id,style:`width:100%;max-width:${big?260:110}px;padding:${big?"16px":"8px"};border-radius:12px;border:1px solid var(--line);background:var(--panel);text-align:center`});
  el.append(h("div",{class:"code",style:`font-size:${big?40:20}px;margin:0;letter-spacing:.12em`},"AB12"),h("div",{style:"font-size:"+(big?14:12)+"px;color:var(--muted)"},"غرفة "+((findItem("lobby",id)||{}).name||"")));
  const wrap=h("div",{id:big?"lobPrev":null,class:"lt-"+id,style:"width:100%;display:grid;place-items:center"});wrap.append(el);
  return wrap;
}
function itemPreview(t,it,big){
  switch(t){
    case "skin":return ballSvg(it,big?60:46);
    case "frame":return avatar(eff("skin"),it.id,big?62:54,eff("deco"));
    case "deco":return avatar(eff("skin"),eff("frame"),big?58:48,it.id);
    case "bg":return h("div",{class:"has-bg bg-"+it.id,style:"width:100%;height:58px;border-radius:12px"});
    case "badge":return badgeNode(it,big?66:54);
    case "theme":return h("span",{style:"font-weight:800;font-size:18px"},nameEl(displayName(),it.id));
    case "title":return h("span",{class:"ttl"},"«"+it.name+"»");
    case "board":{const sv=miniBoard(it.id,{n:5});sv.style.width="78px";return sv}
    case "web":{const sv=webSample(it.id);sv.style.width="92px";return sv}
    case "move":return h("span",{class:"fx-mini"},svgNode(fxMiniSvg("move",it.id,big?66:54)));
    case "win":return h("span",{class:"fx-mini"},svgNode(fxMiniSvg("win",it.id,big?66:54)));
    case "emote":return h("span",{class:"emo-st"},emoteNode(it,big?46:34));
    case "lobby":return lobbyThumb(it.id,false);
    case "sound":return h("span",{class:"snd-ic"},ic("sound"));
    case "xmark":{const st=it.st,z=big?66:54;return htmlEl("span","fx-mini",`<svg viewBox="0 0 64 40" width="${z*1.5}" height="${z}" aria-hidden="true">${xoStyled(0,18,20,20,st,"#B9A2FF",1)}${xoStyled(1,46,20,20,st,"#FFB02E",1)}</svg>`)}
    case "domtile":case "domtable":return domSwatch(t,it,!!big);
    case "chboard":case "chpiece":return chSwatch(t,it,!!big);
  }
  return h("span",{},"?");
}
function chSwatch(t,it,big){
  const z=big?96:46;
  if(t==="chboard"){
    const s=it.sq||["#2A241C","#C4B49A","#E6B85C"];
    let cells="";
    for(let r=0;r<4;r++)for(let c=0;c<4;c++)cells+=`<rect x="${c}" y="${r}" width="1" height="1" fill="${(r+c)%2?s[0]:s[1]}"/>`;
    return htmlEl("span","",`<svg viewBox="0 0 4 4" width="${z}" height="${z}" aria-hidden="true">${cells}</svg>`);
  }
  const p=it.pc||["#F4EFE4","#1A140E","#E6B85C"];
  return htmlEl("span","",`<svg viewBox="0 0 46 46" width="${z}" height="${z}" aria-hidden="true"><rect width="46" height="46" rx="10" fill="#1A1420"/><circle cx="16" cy="24" r="8" fill="${p[1]}"/><circle cx="30" cy="24" r="8" fill="${p[0]}" stroke="${p[2]}"/></svg>`);
}
let sheetTimers=[];
/* larger, live preview used in the item sheet and the customize screen */
function bigPreview(t,it,box){
  const wrap=h("div",{class:"pvbig"});box.append(wrap);
  if(t==="skin"){const sv=miniBoard(eff("board"),{n:5,skin:it,web:eff("web")});wrap.append(sv)}
  else if(t==="board"){wrap.append(miniBoard(it.id,{n:9,skin:effItem("skin"),web:eff("web"),more:true}))}
  else if(t==="web"){wrap.append(miniBoard(eff("board"),{n:5,web:it.id,more:true,color:effItem("skin").c}))}
  else if(t==="frame"||t==="deco")wrap.append(avatar(eff("skin"),t==="frame"?it.id:eff("frame"),110,t==="deco"?it.id:eff("deco")));
  else if(t==="bg"||t==="theme"||t==="title"||t==="badge"){
    const bg=t==="bg"?it.id:eff("bg"),card=h("div",{class:"sample-card"+(bg!=="none"?" has-bg bg-"+bg:"")});
    card.append(myAvatar(64),h("div",{},h("div",{class:"pname"},nameEl(displayName(),t==="theme"?it.id:eff("theme")),badgeEl(t==="badge"?it.id:eff("badge"))),
      h("div",{class:"ptitle"},(t==="title"?it:effItem("title")).name)));
    wrap.style.background="transparent";wrap.style.border="0";wrap.append(card);
    if(t==="badge")wrap.append(h("div",{style:"position:absolute;top:8px;inset-inline-end:10px;line-height:0"},badgeNode(it,44)));
  }
  else if(t==="move"){
    const sv=miniBoard(eff("board"),{n:5,skin:effItem("skin")});wrap.append(sv);
    let at=[4,2],up=true;const step=()=>{const to=up?[3,2]:[4,2];trailFx(sv._fx,at,to,it.id,sv._b.glow);sv._pawn.style.transition="transform .32s cubic-bezier(.3,1.35,.5,1)";sv._pawn.style.transform=`translate(${(to[1]+.5)*S}px,${(to[0]+.5)*S}px)`;at=to;up=!up};
    setTimeout(step,250);sheetTimers.push(setInterval(step,1300));
    if(lite())wrap.append(h("p",{class:"hint",style:"position:absolute;bottom:4px"},"المؤثرات الخفيفة شغّالة، فالأثر ما يطلع"));
  }
  else if(t==="win"){
    const sv=mk("svg",{viewBox:"-32 -32 64 64",class:"mb",style:"width:180px"});const gid="vw"+(++uid);
    const f=mk("filter",{id:gid,x:"-50%",y:"-50%",width:"200%",height:"200%"},mk("defs",{},sv));mk("feGaussianBlur",{stdDeviation:".8",result:"b"},f);const fm=mk("feMerge",{},f);mk("feMergeNode",{in:"b"},fm);mk("feMergeNode",{in:"SourceGraphic"},fm);
    ballGraphic(sv,effItem("skin"),0,0,4.5);const play=()=>victoryFx(sv,0,0,it.id,effItem("skin").c,"url(#"+gid+")");
    play();sheetTimers.push(setInterval(play,2700));wrap.append(sv);
  }
  else if(t==="emote"){const b=h("span",{class:"emo-st a-"+it.anim},emoteNode(it,60));wrap.append(b);
    sheetTimers.push(setInterval(()=>{b.classList.remove("a-"+it.anim);void b.offsetWidth;b.classList.add("a-"+it.anim)},1800))}
  else if(t==="lobby")wrap.append(lobbyThumb(it.id,true));
  else if(t==="domtile"||t==="domtable")wrap.append(domSwatch(t,it,true));
  else if(t==="chboard"||t==="chpiece")wrap.append(chSwatch(t,it,true));
  else if(t==="sound"){const r=h("div",{class:"row",style:"flex-wrap:wrap;padding:12px;width:100%"});
    for(const [k,l] of [["move","حركة"],["wall","خيط"],["win","فوز"],["unlock","فتح مكافأة"]])r.append(h("button",{class:"small",onclick:()=>sfx(k,it.id,true)},"▶ "+l));
    wrap.append(r);if(P.settings.mute)wrap.append(h("p",{class:"hint",style:"margin:0 0 8px"},"الصوت مكتوم من الإعدادات، والمعاينة تشتغل رغم كذا."))}
  return wrap;
}
function miniIcon(t,id){
  /* small drawn thumbnails (never emoji) for reward chips and bundle parts */
  const it=findItem(t,id);if(!it)return h("span",{});
  switch(t){
    case "skin":return ballSvg(it,20);
    case "badge":return badgeNode(it,20);
    case "frame":return avatar(eff("skin"),id,22);
    case "deco":return avatar(eff("skin"),"basic",22,id);
    case "bg":return h("span",{class:"has-bg bg-"+id,style:"display:inline-block;width:26px;height:17px;border-radius:5px;vertical-align:middle"});
    case "theme":return h("span",{class:"nt nt-"+id,style:"font-weight:800;font-size:14px"},"أب");
    case "title":return h("span",{class:"mini-ttl"},"لقب");
    case "board":{const s=miniBoard(id,{n:3});s.style.width="22px";return s}
    case "web":{const s=webSample(id);s.style.width="26px";return s}
    case "move":case "win":return svgNode(fxMiniSvg(t,id,22));
    case "emote":return emoteNode(it,18);
    case "lobby":return h("span",{class:"lt-"+id,style:"display:inline-block;line-height:0"},h("span",{class:"lobthumb mini-lob"}));
    case "sound":return ic("sound");
    case "xmark":return htmlEl("span","",`<svg viewBox="0 0 40 20" width="30" height="15" aria-hidden="true">${xoStyled(0,10,10,11,it.st,"#B9A2FF",1)}${xoStyled(1,30,10,11,it.st,"#FFB02E",1)}</svg>`);
    case "domtile":case "domtable":return domSwatch(t,it,false);
    case "chboard":case "chpiece":return chSwatch(t,it,false);
  }
  return h("span",{});
}
function howText(t,it){
  if(it.how==="free")return "متاح للجميع";
  if(it.how==="level")return "المستوى "+fmt(it.lvl);
  if(it.how==="store")return "من المتجر بـ "+fmt(it.price)+" عملة"+(it.lvl?"، يحتاج المستوى "+fmt(it.lvl):"");
  if(it.how==="ach")return "إنجاز: "+((ACH_INDEX[it.ach]||{}).name||"");
  if(it.how==="weekly")return "يروح لبطل الأسبوع";
  if(it.how==="event")return "فعالية خاصة";
  if(it.how==="owner")return "حصري لصاحب اللعبة";
  return "عنصر سري";
}
function rwChip(r){
  if(r.t==="coins")return h("span",{class:"rwc"},ic("coin","gold"),"+"+fmt(r.n));
  if(r.t==="xp")return h("span",{class:"rwc"},"+"+fmt(r.n)+" XP");
  const it=findItem(r.t,r.id);if(!it)return null;
  return h("span",{class:"rwc"},miniIcon(r.t,r.id),it.name);
}
const rwChips=list=>h("div",{class:"rwchips"},list.map(rwChip));

/* ================= sound & haptics ================= */
const PACKS={glass:{w:"sine",m:2,len:.6},bass:{w:"triangle",m:.5,len:1.4},chime:{w:"sine",m:1.6,len:1.2,harm:true},chip:{w:"square",m:1.8,len:.5,arp:true},warm:{w:"triangle",m:.8,len:1.1},space:{w:"sine",m:1.2,len:1.6,harm:true},classic:{m:1,len:1},cyber:{w:"square",m:1.25,len:.8},electric:{w:"sawtooth",m:1.1,len:.9},arcade:{w:"square",m:1.5,len:.7,arp:true},dark:{w:"sine",m:.6,len:1.35},royal:{w:"triangle",m:.9,len:1.2,harm:true}};
let actx=null;
function sfx(kind,packId,force){
  if(P.settings.mute&&!force)return;
  const pk=PACKS[packId||eff("sound")]||PACKS.classic;
  try{
    actx=actx||new (window.AudioContext||window.webkitAudioContext)();
    if(actx.state==="suspended")actx.resume();
    const t=actx.currentTime;
    const note=(f1,f2,st,dur,type,vol)=>{
      const play=(fa,fb,v)=>{const o=actx.createOscillator(),gn=actx.createGain();o.type=pk.w||type;o.frequency.setValueAtTime(fa,t+st);if(fb)o.frequency.exponentialRampToValueAtTime(fb,t+st+dur*pk.len);
        gn.gain.setValueAtTime(.0001,t+st);gn.gain.exponentialRampToValueAtTime(v,t+st+.012);gn.gain.exponentialRampToValueAtTime(.0001,t+st+dur*pk.len);o.connect(gn);gn.connect(actx.destination);o.start(t+st);o.stop(t+st+dur*pk.len+.03)};
      const v=pk.w==="square"||pk.w==="sawtooth"?vol*.45:vol;
      play(f1*pk.m,f2?f2*pk.m:0,v);if(pk.harm&&vol>.09)play(f1*pk.m*1.5,f2?f2*pk.m*1.5:0,v*.35);
    };
    if(kind==="move")note(420,640,0,.09,"triangle",.18);
    else if(kind==="move2")note(340,500,0,.09,"triangle",.12);
    else if(kind==="wall"){note(1500,260,0,.16,"sawtooth",.05);note(720,190,.02,.15,"triangle",.1)}
    else if(kind==="turn"){note(660,0,0,.1,"sine",.15);note(990,0,.11,.14,"sine",.13)}
    else if(kind==="bad")note(170,120,0,.14,"square",.04);
    else if(kind==="skip")note(300,200,0,.12,"sine",.1);
    else if(kind==="win"){[523,659,784,1047].forEach((f,k)=>note(f,0,k*.11,.24,"triangle",.15));if(pk.arp)[1319,1568].forEach((f,k)=>note(f,0,.45+k*.07,.12,"square",.1))}
    else if(kind==="lose")[392,330,262].forEach((f,k)=>note(f,0,k*.14,.22,"sine",.12));
    else if(kind==="coin"){note(988,0,0,.07,"square",.05);note(1319,0,.07,.16,"square",.05)}
    else if(kind==="level")[523,659,784,1047,1319].forEach((f,k)=>note(f,0,k*.08,.2,"triangle",.14));
    else if(kind==="unlock"){note(784,1568,0,.35,"sine",.12);note(1175,0,.12,.3,"triangle",.08)}
    else if(kind==="founder")[392,523,659,784,1047,1319,1568].forEach((f,k)=>note(f,0,k*.1,.32,k%2?"triangle":"sine",.13));
    else if(kind==="emote")note(880,1100,0,.08,"sine",.08);
  }catch(e){}
}
const buzz=p=>{try{const ua=navigator.userActivation;if(navigator.vibrate&&(!ua||ua.hasBeenActive))navigator.vibrate(p)}catch(e){}};

/* ================= original vector art: badges and reaction stickers =================
   Every badge is a shape + a symbol drawn here + a level of finish that follows its rarity.
   Every reaction is a sticker (bubble, burst, tag or round badge) with a symbol and/or a word. */
const GLYPH={
 spider:'<g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 10.5 6.5 7.2 4.2 8M9.6 12.3 5 11.6 3 13M9.8 14 6 16.2 4.8 19M10.6 15.2 8.4 18.6 8.2 21M14 10.5l3.5-3.3 2.3.8M14.4 12.3l4.6-.7 2 1.4M14.2 14l3.8 2.2 1.2 2.8M13.4 15.2l2.2 3.4.2 2.4"/></g><circle cx="12" cy="9.6" r="2.3" fill="currentColor"/><ellipse cx="12" cy="14.6" rx="3" ry="3.7" fill="currentColor"/>',
 web:'<g fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4"/><path d="M12 6.2 16.1 7.9 17.8 12 16.1 16.1 12 17.8 7.9 16.1 6.2 12 7.9 7.9Z"/><path d="M12 9.3 13.9 10.1 14.7 12 13.9 13.9 12 14.7 10.1 13.9 9.3 12 10.1 10.1Z"/></g>',
 moon:'<path d="M15.6 3.4a8.6 8.6 0 1 0 5 15.3A7.2 7.2 0 0 1 15.6 3.4Z" fill="currentColor"/>',
 target:'<g fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.4"/></g><circle cx="12" cy="12" r="1.6" fill="currentColor"/>',
 flame:'<path d="M12 22c-4 0-6.6-2.7-6.6-6.3 0-3.8 3.3-5.7 3.9-9.9 2.3 1.3 3.7 3.4 4 5.6 1.1-.9 1.8-2.2 1.9-3.7 2.3 1.8 3.7 4.5 3.7 7.4 0 4-2.9 6.9-6.9 6.9Z" fill="currentColor"/>',
 bolt:'<path d="M13.6 2 4.8 13.6h6.1L9.6 22 19.2 9.6H13Z" fill="currentColor"/>',
 skull:'<path fill="currentColor" fill-rule="evenodd" d="M12 3C7.3 3 4 6.2 4 10.6c0 2.5 1.1 4.3 2.8 5.4V19a1 1 0 0 0 1 1h1.4v-2h1.6v2h2.4v-2h1.6v2h1.4a1 1 0 0 0 1-1v-3c1.7-1.1 2.8-2.9 2.8-5.4C20 6.2 16.7 3 12 3Zm-3.3 7.1a1.9 1.9 0 1 1 0 3.8 1.9 1.9 0 0 1 0-3.8Zm6.6 0a1.9 1.9 0 1 1 0 3.8 1.9 1.9 0 0 1 0-3.8Z"/>',
 trophy:'<path d="M7 3.5h10v5.2a5 5 0 0 1-10 0Z" fill="currentColor"/><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M7 5.2H4.2v1.2A3.4 3.4 0 0 0 7.6 9.8M17 5.2h2.8v1.2a3.4 3.4 0 0 1-3.4 3.4M12 13.7v3.3M8.4 20.5h7.2"/></g><path d="M9.4 17h5.2v2.5H9.4Z" fill="currentColor"/>',
 gem:'<path d="M7 4h10l4 5-9 11L3 9Z" fill="currentColor"/><g fill="none" stroke="#000" stroke-opacity=".28" stroke-width="1"><path d="M3 9h18M9.5 4 8 9l4 11 4-11-1.5-5"/></g>',
 spiral:'<path d="M12 12.6c.5 0 .9-.4.9-.9 0-1.2-1.4-1.6-2.3-.9-1.4 1.1-.9 3.4.7 4.1 2.6 1.1 5.2-1 5-3.7-.3-3.9-4.8-5.6-8-3.6-3.7 2.3-3.5 8 .3 10.2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="18.6" cy="6" r="1.2" fill="currentColor"/><circle cx="5.2" cy="17.4" r=".9" fill="currentColor"/>',
 crown:'<path d="M3 8.2 7.6 12 12 5l4.4 7L21 8.2l-2 9.3H5Z" fill="currentColor"/><path d="M5 19h14v2H5Z" fill="currentColor"/>',
 fist:'<g fill="currentColor"><rect x="6.5" y="9" width="11" height="9" rx="2.6"/><rect x="6.5" y="5.6" width="2.8" height="5" rx="1.4"/><rect x="9.6" y="4.8" width="2.8" height="5.6" rx="1.4"/><rect x="12.7" y="5.2" width="2.8" height="5.4" rx="1.4"/><rect x="15.6" y="6.4" width="2.4" height="4.6" rx="1.2"/><path d="M8.5 18h7.5v3.4H8.5Z"/></g>',
 star:'<path d="m12 2.8 2.8 6 6.5.7-4.9 4.4 1.4 6.4L12 17l-5.8 3.3 1.4-6.4-4.9-4.4 6.5-.7Z" fill="currentColor"/>',
 stinger:'<path d="M6 19.5c-1.6-3.6.6-7.4 4.4-7.7 2.6-.2 4.7-1.4 5.6-3.7.6-1.5.3-3.2-.8-4.3" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="m14.2 2.6 4.6.4-2.2 4.2Z" fill="currentColor"/><circle cx="6.6" cy="19.6" r="2" fill="currentColor"/>',
 snake:'<path d="M6 20c-2.4 0-3.2-2.6-1.2-3.9 2.6-1.7 8.4-.4 10.4-3.3 1.6-2.4-.7-5.2-3.6-4.4" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><path d="M11.4 8.4c-.5-2.7 1.5-4.9 4.3-4.6 2 .2 3.4 1.7 3.4 3.4 0 1.6-1.4 2.8-3.4 2.8-1.6 0-3.6-.4-4.3-1.6Z" fill="currentColor"/>',
 mind:'<path d="M12 5.2C9.2 3.4 5.4 5 5.6 8.4 3.4 9.4 3.6 13.6 6.4 14.3c-.4 3.4 3.3 4.9 5.6 3 2.3 1.9 6 .4 5.6-3 2.8-.7 3-4.9.8-5.9.2-3.4-3.6-5-6.4-3.2Z" fill="currentColor"/><path d="M12 5.4v12M8.4 9.2c1.2.2 2 1 2.2 2.2M15.6 9.2c-1.2.2-2 1-2.2 2.2" fill="none" stroke="#000" stroke-opacity=".3" stroke-width="1.2" stroke-linecap="round"/>',
 shield:'<path d="M12 2.8 19.5 5.6v6c0 4.6-3.2 8.1-7.5 9.6-4.3-1.5-7.5-5-7.5-9.6v-6Z" fill="currentColor"/><path d="M8.4 11.4 11 14l4.6-5" fill="none" stroke="#000" stroke-opacity=".32" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
 swords:'<g fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><path d="M4 4l10.5 10.5M20 4 9.5 14.5M6.4 16.6l-2.4 2.4M17.6 16.6l2.4 2.4M8.2 13.6l-2.6 2.6M15.8 13.6l2.6 2.6"/></g>',
 pad:'<path d="M7.5 8h9a4.6 4.6 0 0 1 4.5 5.6l-.8 3.6a2.4 2.4 0 0 1-4.2 1L14.3 16H9.7L8 18.2a2.4 2.4 0 0 1-4.2-1L3 13.6A4.6 4.6 0 0 1 7.5 8Z" fill="currentColor"/><path d="M7.6 11v3.4M5.9 12.7h3.4" stroke="#000" stroke-opacity=".35" stroke-width="1.6" stroke-linecap="round"/><circle cx="15.6" cy="11.6" r="1" fill="#000" fill-opacity=".35"/><circle cx="17.6" cy="13.6" r="1" fill="#000" fill-opacity=".35"/>',
 tornado:'<path d="M3.5 5.5h17M5.5 9.5h13M8 13.5h8.5M10 17.5h5.5M11.6 21h2.6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
 planet:'<circle cx="12" cy="12" r="5.6" fill="currentColor"/><ellipse cx="12" cy="12" rx="10" ry="3.4" transform="rotate(-20 12 12)" fill="none" stroke="currentColor" stroke-width="1.6"/>',
 cube:'<path d="M12 2.8 20 7.3v9.4L12 21.2 4 16.7V7.3Z" fill="currentColor"/><path d="M4 7.3 12 12l8-4.7M12 12v9.2" fill="none" stroke="#000" stroke-opacity=".3" stroke-width="1.3"/>',
 owl:'<path d="M5 5.5 8 8h8l3-2.5V14a7 7 0 0 1-14 0Z" fill="currentColor"/><circle cx="9" cy="12" r="2.6" fill="#fff"/><circle cx="15" cy="12" r="2.6" fill="#fff"/><circle cx="9" cy="12" r="1.2" fill="#111"/><circle cx="15" cy="12" r="1.2" fill="#111"/>',
 heart:'<path d="M12 20.2S3.5 15.1 3.5 9.3A4.6 4.6 0 0 1 12 6.8a4.6 4.6 0 0 1 8.5 2.5c0 5.8-8.5 10.9-8.5 10.9Z" fill="currentColor"/>',
 eye:'<path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z" fill="currentColor"/><circle cx="12" cy="12" r="3.6" fill="#000" fill-opacity=".45"/><circle cx="13.2" cy="10.8" r="1.1" fill="#fff" fill-opacity=".8"/>',
 sword:'<path d="M18.8 3.2 20.8 5.2 10.4 15.6l-2-2Z" fill="currentColor"/><path d="m6.2 12.6 5.2 5.2M7.6 16.4l-3.4 3.4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
 rocket:'<path d="M14.5 3.5c3.2-.9 6 0 6 0s.9 2.8 0 6c-.8 2.9-3.6 6-7.1 7.9l-6.8-6.8C8.5 7.1 11.6 4.3 14.5 3.5Z" fill="currentColor"/><circle cx="15.2" cy="8.8" r="1.8" fill="#000" fill-opacity=".35"/><path d="M6.5 13.6 3.5 14.5l2.4-4.3 2.8-.5M10.4 17.5l-.9 3 4.3-2.4.5-2.8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
 leaf:'<path d="M5 19C4 11 9 4.5 20 4c-.4 10.6-6.6 16-15 15Z" fill="currentColor"/><path d="M5 19c3.6-4.6 7-7.8 11-10.2" fill="none" stroke="#000" stroke-opacity=".3" stroke-width="1.4" stroke-linecap="round"/>',
 sun:'<circle cx="12" cy="12" r="4.6" fill="currentColor"/><path d="M12 2.5v2.6M12 18.9v2.6M2.5 12h2.6M18.9 12h2.6M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
 comet:'<circle cx="16.5" cy="7.5" r="3.6" fill="currentColor"/><path d="M13.6 10.4 4 20M12.6 7.8 5.6 14.8M15.8 11.6 9.4 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-opacity=".75"/>',
 key:'<circle cx="8" cy="15.6" r="4.4" fill="currentColor"/><circle cx="8" cy="15.6" r="1.6" fill="#000" fill-opacity=".4"/><path d="M11.2 12.4 19.6 4M16.4 7.2l2.6 2.6M14.2 9.4l2 2" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
 mask:'<path d="M3 7.5c3-1.4 6-1.5 9 0 3-1.5 6-1.4 9 0 0 6-2.2 10-5.4 10-1.8 0-2.6-1.6-3.6-3-1 1.4-1.8 3-3.6 3C5.2 17.5 3 13.5 3 7.5Z" fill="currentColor"/><path d="M6.4 10.6c1.2-.8 2.6-.8 3.6 0M14 10.6c1-.8 2.4-.8 3.6 0" stroke="#000" stroke-opacity=".5" stroke-width="1.8" stroke-linecap="round"/>',
 wing:'<path d="M3 17c4.5-.2 8.5-2.7 11-6.6C16 7.2 18.4 4.8 21 4c-.2 3.6-1.7 6.8-4 9 1.3 0 2.4-.3 3.4-.9-1.6 2.6-4 4.2-7 4.6 1 .5 2.2.7 3.5.6-2.7 2-6.5 2.6-10.4 1.4Z" fill="currentColor"/>',
 infinity:'<path d="M12 12c-1.8-2.6-3.6-4-5.6-4a4 4 0 1 0 0 8c2 0 3.8-1.4 5.6-4Zm0 0c1.8 2.6 3.6 4 5.6 4a4 4 0 1 0 0-8c-2 0-3.8 1.4-5.6 4Z" fill="none" stroke="currentColor" stroke-width="2.4"/>',
 hourglass:'<path d="M6.5 3h11M6.5 21h11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M7.5 4h9c0 3.4-2.2 5.6-4.5 8 2.3 2.4 4.5 4.6 4.5 8h-9c0-3.4 2.2-5.6 4.5-8C9.7 9.6 7.5 7.4 7.5 4Z" fill="currentColor"/>',
 compass:'<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="m15.8 8.2-2.4 5.2-5.2 2.4 2.4-5.2Z" fill="currentColor"/>',
 note:'<path d="M9 17.5V6l10-2.2v11.4" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><ellipse cx="6.8" cy="17.6" rx="2.6" ry="2.1" fill="currentColor"/><ellipse cx="16.8" cy="15.4" rx="2.6" ry="2.1" fill="currentColor"/>',
 feather:'<path d="M19.5 4.5C12 4.5 6.5 9.6 6 17l-1.5 2.5L7 18c7.4-.5 12.5-6 12.5-13.5Z" fill="currentColor"/><path d="M6.6 17.4 15.6 8.4" stroke="#000" stroke-opacity=".3" stroke-width="1.3" stroke-linecap="round"/>',
 mountain:'<path d="M2.5 19.5 9.2 7.5l3.6 6 2.2-3.2 6.5 9.2Z" fill="currentColor"/><path d="m7.6 10.4 1.6-2.9 1.8 3-1.4-.6Z" fill="#fff" fill-opacity=".85"/>',
 wave:'<path d="M2.5 15c2.2 0 2.2-2 4.4-2s2.2 2 4.4 2 2.2-2 4.4-2 2.2 2 4.4 2M2.5 19.5c2.2 0 2.2-2 4.4-2s2.2 2 4.4 2 2.2-2 4.4-2 2.2 2 4.4 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M5 10.5c1.4-4 5-6.4 9.4-5.5-2.4.8-3.4 2.6-2.8 4.4.5 1.5 2.4 2.2 4.2 1.4-1.6 2.7-5 3.4-7.8 1.8-1.1-.6-2.1-1.4-3-2.1Z" fill="currentColor"/>',
 snow:'<path d="M12 2.5v19M3.8 7.2l16.4 9.6M3.8 16.8l16.4-9.6M9.4 4.2 12 6.4l2.6-2.2M9.4 19.8 12 17.6l2.6 2.2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
 atom:'<g fill="none" stroke="currentColor" stroke-width="1.6"><ellipse cx="12" cy="12" rx="9.5" ry="3.8"/><ellipse cx="12" cy="12" rx="9.5" ry="3.8" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9.5" ry="3.8" transform="rotate(-60 12 12)"/></g><circle cx="12" cy="12" r="2" fill="currentColor"/>',
 anchor:'<circle cx="12" cy="5" r="2.2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7.2V20.5M8 11h8M4.5 13.5c.3 4.3 3.5 7 7.5 7s7.2-2.7 7.5-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
 fang:'<path d="M4 5h16c0 3-1.2 5-3 6l-1.2 7.5L13.6 11h-3.2l-2.2 7.5L7 11C5.2 10 4 8 4 5Z" fill="currentColor"/>',
 clover:'<g fill="currentColor"><circle cx="9" cy="9" r="3.6"/><circle cx="15" cy="9" r="3.6"/><circle cx="9" cy="15" r="3.6"/><circle cx="15" cy="15" r="3.6"/></g><path d="M12 12c1.6 3.4 3.2 6 6 8.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none"/>',
 horns:'<path d="M5 9c-1.5-2.2-1.4-4.6.4-6.5.3 2 1.4 3.4 3.2 4.3M19 9c1.5-2.2 1.4-4.6-.4-6.5-.3 2-1.4 3.4-3.2 4.3" fill="currentColor"/><circle cx="12" cy="13.2" r="7.4" fill="currentColor"/><path d="M8.6 11.6l2 1M15.4 11.6l-2 1M8.6 16c2.2 1.6 4.6 1.6 6.8 0" stroke="#000" stroke-opacity=".5" stroke-width="1.6" stroke-linecap="round" fill="none"/>',
 shades:'<circle cx="12" cy="12" r="9" fill="currentColor"/><path d="M5 10.2h14l-.6 1.6c-.4 1.3-1.6 2.2-3 2.2h-.3c-1.3 0-2.4-.9-2.8-2.1L12 11l-.3.9c-.4 1.2-1.5 2.1-2.8 2.1h-.3c-1.4 0-2.6-.9-3-2.2Z" fill="#111"/><path d="M8.5 16.4c2.2 1.2 4.8 1.2 7 0" stroke="#111" stroke-width="1.6" stroke-linecap="round" fill="none"/>',
 zzz:'<path d="M5 8h5l-5 6h5M13 4h4l-4 5h4M14 15h5l-5 6h5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
 dash:'<path d="M10 5.5h9M6 10.5h11M3 15.5h12M8 20h8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
 hand:'<path d="M8 13V6.2a1.5 1.5 0 0 1 3 0V11V4.6a1.5 1.5 0 0 1 3 0V11 5.6a1.5 1.5 0 0 1 3 0v8.2c0 4.2-2.6 7.2-6.4 7.2-2.6 0-4.4-1.4-5.6-3.4l-2-3.4a1.4 1.4 0 0 1 2.3-1.6Z" fill="currentColor"/>',
 laugh:'<circle cx="12" cy="12" r="9" fill="currentColor"/><path d="M7.4 9.6l2.2 1.2-2.2 1.2M16.6 9.6l-2.2 1.2 2.2 1.2" stroke="#111" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M7 14h10c-.4 2.8-2.6 4.6-5 4.6S7.4 16.8 7 14Z" fill="#111"/>'
};
const SHAPE={
 hex:'M32 3 57 17.5v29L32 61 7 46.5v-29Z',
 shield:'M32 4 56 12v18c0 15-10.5 25.5-24 30C18.5 55.5 8 45 8 30V12Z',
 circle:'M32 4a28 28 0 1 1 0 56 28 28 0 0 1 0-56Z',
 diamond:'M32 3 61 32 32 61 3 32Z',
 crest:'M10 7h44v25c0 14.5-10.5 23.5-22 28C20.5 55.5 10 46.5 10 32Z',
 seal:(()=>{let d="";for(let i=0;i<24;i++){const a=i*Math.PI/12-Math.PI/2,r=i%2?26:29.5;d+=(i?"L":"M")+(32+r*Math.cos(a)).toFixed(1)+" "+(32+r*Math.sin(a)).toFixed(1)}return d+"Z"})()
};
let artSeq2=0;
function svgNode(str){const t=document.createElement("template");t.innerHTML=str.trim();return t.content.firstChild}
const shade=(hex,f)=>{const n=parseInt(hex.slice(1),16),r=n>>16,g=n>>8&255,b=n&255,m=v=>Math.max(0,Math.min(255,Math.round(f<0?v*(1+f):v+(255-v)*f)));return "#"+((1<<24)|(m(r)<<16)|(m(g)<<8)|m(b)).toString(16).slice(1)};
/* a badge as an SVG string; detail grows with rarity */
function badgeSvg(it,size){
  const a=it.art||{s:"circle",g:"star",c:["#5B6283","#2A2F45"]},k="bd"+(++artSeq2),r=it.rar,d=SHAPE[a.s]||SHAPE.circle,c0=a.c[0],c1=a.c[1];
  const inner=`<path d="${d}" transform="translate(32 32) scale(.8) translate(-32 -32)"`;
  let defs=`<linearGradient id="${k}f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(c0,.12)}"/><stop offset="1" stop-color="${c1}"/></linearGradient>`;
  let body="",glyphCol="#fff",extra="";
  if(r==="common"){body=`<path d="${d}" fill="${c0}" stroke="${shade(c0,-.45)}" stroke-width="2"/>`}
  else if(r==="rare"){body=`<path d="${d}" fill="url(#${k}f)"/>${inner} fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="2"/>`}
  else if(r==="epic"){
    defs+=`<radialGradient id="${k}h" cx=".35" cy=".25" r=".7"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>`;
    body=`<path d="${d}" fill="url(#${k}f)" stroke="${shade(c0,.35)}" stroke-width="2"/><path d="${d}" fill="url(#${k}h)"/>${inner} fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1.6" stroke-dasharray="3 3"/>`;
  }else if(r==="legendary"){
    defs+=`<linearGradient id="${k}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF1C4"/><stop offset=".45" stop-color="#E6B85C"/><stop offset="1" stop-color="#8A5A12"/></linearGradient>`;
    let rays="";for(let i=0;i<12;i++){const t=i*Math.PI/6;rays+=`<path d="M32 32L${(32+31*Math.cos(t-.09)).toFixed(1)} ${(32+31*Math.sin(t-.09)).toFixed(1)}L${(32+31*Math.cos(t+.09)).toFixed(1)} ${(32+31*Math.sin(t+.09)).toFixed(1)}Z" fill="#E6B85C" opacity=".22"/>`}
    body=`${rays}<path d="${d}" fill="url(#${k}g)" stroke="#5E3A0A" stroke-width="1.5"/>${inner} fill="url(#${k}f)" stroke="#FFF1C4" stroke-opacity=".7" stroke-width="1.4"/>`;
  }else if(r==="secret"){
    defs+=`<linearGradient id="${k}d" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1B2230"/><stop offset="1" stop-color="#07090E"/></linearGradient><filter id="${k}n" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
    body=`<path d="${d}" fill="url(#${k}d)"/><path d="${d}" fill="none" stroke="${c0}" stroke-width="2.6" filter="url(#${k}n)"/>${inner} fill="none" stroke="${c0}" stroke-opacity=".35" stroke-width="1"/>`;
    glyphCol=c0;extra=`<g transform="rotate(30 32 32)"><rect class="sheen" x="-24" y="-14" width="18" height="92" fill="url(#${k}s)"/></g>`;
  }else{ /* owner */
    defs+=`<linearGradient id="${k}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF1C4"/><stop offset=".5" stop-color="#E6B85C"/><stop offset="1" stop-color="#7A4A0E"/></linearGradient><linearGradient id="${k}v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8D65F6"/><stop offset="1" stop-color="#2A1466"/></linearGradient>`;
    body=`<path d="${d}" fill="url(#${k}g)" stroke="#4A2C06" stroke-width="1.5"/>${inner} fill="url(#${k}v)" stroke="#FFF1C4" stroke-opacity=".8" stroke-width="1.4"/>`;
    glyphCol="#F7DA97";extra=`<g transform="rotate(30 32 32)"><rect class="sheen" x="-24" y="-14" width="18" height="92" fill="url(#${k}s)"/></g>`;
  }
  if(extra)defs+=`<linearGradient id="${k}s" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".32"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>`;
  const gl=GLYPH[a.g]||GLYPH.star;
  return `<svg class="bart r-${r}" viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true"><defs>${defs}<clipPath id="${k}c"><path d="${d}"/></clipPath></defs>${body}<g transform="translate(17 17) scale(1.25)" color="${glyphCol}" style="filter:drop-shadow(0 1px 1px rgba(0,0,0,.45))">${gl}</g><g clip-path="url(#${k}c)">${extra}</g></svg>`;
}
const badgeNode=(it,size)=>svgNode(badgeSvg(it,size));
/* a reaction sticker as an SVG string */
function emoteSvg(it,h){
  const a=it.art||{s:"bubble",x:it.name,c:["#8D65F6","#5B3BC7"]},k="em"+(++artSeq2),c0=a.c[0],c1=a.c[1],txt=a.x||"",g=a.g?GLYPH[a.g]:"";
  const tw=txt?Math.max(26,txt.length*(/[\u0600-\u06FF]/.test(txt)?11.2:13.5)):0,gw=g?30:0,pad=g&&txt?6:0;
  let W=Math.max(64,tw+gw+pad+34),H=64;
  if(!txt)W=64;
  const lux=it.rar==="legendary"||it.rar==="owner";
  let shape;
  if(a.s==="burst"){let d="";const n=14,cx=W/2,cy=H/2-2;for(let i=0;i<n*2;i++){const t=i*Math.PI/n,rx=(i%2?W/2-8:W/2-2),ry=(i%2?H/2-10:H/2-4);d+=(i?"L":"M")+(cx+rx*Math.cos(t)).toFixed(1)+" "+(cy+ry*Math.sin(t)).toFixed(1)}shape=d+"Z"}
  else if(a.s==="tag")shape=`M14 8H${W-6}a6 6 0 0 1 6 6v30a6 6 0 0 1-6 6H14L4 29Z`;
  else if(a.s==="badge"&&!txt)shape="M32 6a24 24 0 1 1 0 48 24 24 0 0 1 0-48Z";
  else shape=`M16 6H${W-16}a12 12 0 0 1 12 12v18a12 12 0 0 1-12 12H30l-12 9 2-9h-4A12 12 0 0 1 4 36V18A12 12 0 0 1 16 6Z`;
  const cy=a.s==="bubble"?28:30;
  const textX=g?(W-gw-pad)/2+4:W/2;
  return `<svg class="eart${lux?" lux":""}" viewBox="0 0 ${W.toFixed(0)} ${H}" height="${h}" width="${(h*W/H).toFixed(0)}" aria-hidden="true"><defs><linearGradient id="${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(c0,.18)}"/><stop offset="1" stop-color="${c1}"/></linearGradient></defs>
<path d="${shape}" fill="url(#${k})" stroke="${lux?"#F7DA97":"#fff"}" stroke-width="${lux?3:3.2}" stroke-linejoin="round"/>
<path d="${shape}" fill="none" stroke="#000" stroke-opacity=".25" stroke-width="1" transform="translate(0 1.5)"/>
${g?`<g transform="translate(${(txt?W-gw-12:W/2-15).toFixed(1)} ${(cy-15).toFixed(1)}) scale(1.25)" color="${lux?"#FFF1C4":"#fff"}">${g}</g>`:""}
${txt?`<text x="${textX.toFixed(1)}" y="${cy+7}" text-anchor="middle" font-family="Readex Pro,IBM Plex Sans Arabic,system-ui,sans-serif" font-weight="700" font-size="${/[\u0600-\u06FF]/.test(txt)?19:20}" fill="${lux?"#FFF1C4":"#fff"}" stroke="rgba(0,0,0,.25)" stroke-width=".6" paint-order="stroke">${txt.replace(/&/g,"&amp;").replace(/</g,"&lt;")}</text>`:""}
</svg>`;
}
const emoteNode=(it,h)=>svgNode(emoteSvg(it,h));

/* ---- avatar decorations added in 3.0 (positions in the stylesheet: .dec-<id>) ---- */
const DECO_NEW={
 horns:'<svg viewBox="-12 -9 24 11"><defs><linearGradient id="dh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF8A9C"/><stop offset="1" stop-color="#8A0F25"/></linearGradient></defs><path d="M-6.5 1.5C-9.5-2-9-6-5.5-8.5-6.6-5-5.6-2.6-2.8.3Z" fill="url(#dh)" stroke="#3B0610" stroke-width=".5"/><path d="M6.5 1.5C9.5-2 9-6 5.5-8.5 6.6-5 5.6-2.6 2.8.3Z" fill="url(#dh)" stroke="#3B0610" stroke-width=".5"/></svg>',
 antenna:'<svg viewBox="-12 -10 24 12"><g fill="none" stroke="#7FE8FF" stroke-width=".9" stroke-linecap="round"><path d="M-3 1C-4-3-7-6-9-7.5"/><path d="M3 1C4-3 7-6 9-7.5"/></g><circle cx="-9.2" cy="-7.8" r="1.6" fill="#7FE8FF"/><circle cx="9.2" cy="-7.8" r="1.6" fill="#7FE8FF"/><circle cx="-9.6" cy="-8.3" r=".5" fill="#fff"/><circle cx="8.8" cy="-8.3" r=".5" fill="#fff"/></svg>',
 laurel:'<svg viewBox="-16 -8 32 14"><g fill="#7BC86C" stroke="#2E6B2A" stroke-width=".35">'+[...Array(6)].map((_,i)=>{const t=.35+i*.33,x=-13*Math.cos(t),y=-2+5.5*Math.sin(t);return `<ellipse cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" rx="2.2" ry=".95" transform="rotate(${(60-i*25).toFixed(0)} ${x.toFixed(2)} ${y.toFixed(2)})"/><ellipse cx="${(-x).toFixed(2)}" cy="${y.toFixed(2)}" rx="2.2" ry=".95" transform="rotate(${(-60+i*25).toFixed(0)} ${(-x).toFixed(2)} ${y.toFixed(2)})"/>`}).join("")+'</g><circle cx="0" cy="4.6" r="1.1" fill="#E6B85C"/></svg>',
 orbitstars:'<svg viewBox="-14 -14 28 28" class="spin-slow"><g fill="#FFE9A8">'+[0,1,2].map(i=>{const t=i*2.094,x=12*Math.cos(t),y=12*Math.sin(t);return `<path transform="translate(${x.toFixed(2)} ${y.toFixed(2)})" d="M0-2.2.6-.6 2.2 0 .6.6 0 2.2-.6.6-2.2 0-.6-.6Z"/>`}).join("")+'</g><circle r="12" fill="none" stroke="#FFE9A8" stroke-opacity=".18" stroke-width=".3"/></svg>',
 flamecrown:'<svg viewBox="-12 -12 24 13"><defs><linearGradient id="dfl" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#FF4D2E"/><stop offset=".6" stop-color="#FFB02E"/><stop offset="1" stop-color="#FFF1A8"/></linearGradient></defs><g class="flick" fill="url(#dfl)"><path d="M-9 0C-10-4-7-6-6.5-9-5-6-4.5-4-4-2-3.6-5-1.8-7-1.5-10.5 0-7.5 1-5 1.5-2 2-5 3.5-7 4.5-9.5 5-6.5 6.5-4.5 7-2 8-4.5 9.4-5.5 10-7 10.6-3.5 9.8-1 9 0Z"/></g></svg>',
 icecrown:'<svg viewBox="-12 -11 24 12"><defs><linearGradient id="dic" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#5CC8FF"/></linearGradient></defs><path d="M-10 0-8.5-5-7-1.5-5-9-3 -2-1.5-6 0-10.5 1.5-6 3-2 5-9 7-1.5 8.5-5 10 0Z" fill="url(#dic)" stroke="#1B6F8F" stroke-width=".4" stroke-linejoin="round"/></svg>',
 catears:'<svg viewBox="-12 -9 24 10"><path d="M-9 1-7.5-8-2.5-1.5Z" fill="#2A2F45" stroke="#11141F" stroke-width=".5" stroke-linejoin="round"/><path d="M9 1 7.5-8 2.5-1.5Z" fill="#2A2F45" stroke="#11141F" stroke-width=".5" stroke-linejoin="round"/><path d="M-7.6-5.4-4.4-1.8-7.8-.4Z" fill="#FF8FB8"/><path d="M7.6-5.4 4.4-1.8 7.8-.4Z" fill="#FF8FB8"/></svg>',
 headphones:'<svg viewBox="-14 -14 28 22"><path d="M-11.5 2C-11.5-7-6-12 0-12S11.5-7 11.5 2" fill="none" stroke="#2A2F45" stroke-width="2.2" stroke-linecap="round"/><rect x="-14" y="-1" width="5" height="8.5" rx="2.2" fill="#E62948"/><rect x="9" y="-1" width="5" height="8.5" rx="2.2" fill="#E62948"/><rect x="-13" y="1" width="1.4" height="4.5" rx=".7" fill="#fff" opacity=".5"/></svg>',
 bow:'<svg viewBox="-10 -6 20 12"><path d="M0 0C-3-4.5-8.5-5-8.5-.5S-3 3.5 0 0C3-4.5 8.5-5 8.5-.5S3 3.5 0 0Z" fill="#FF6FA8" stroke="#9C1F55" stroke-width=".5"/><path d="M-1 0 -3 5.5M1 0 3 5.5" stroke="#FF6FA8" stroke-width="1.4" stroke-linecap="round"/><circle r="1.5" fill="#FFD1E3" stroke="#9C1F55" stroke-width=".4"/></svg>',
 sparkles:'<svg viewBox="-14 -14 28 28"><g fill="#FFFFFF" class="twinkle">'+[[-11,-9,1.2],[11,-6,1],[-9,10,.9],[12,9,1.3]].map(([x,y,s])=>`<path transform="translate(${x} ${y}) scale(${s})" d="M0-2.4.5-.5 2.4 0 .5.5 0 2.4-.5.5-2.4 0-.5-.5Z"/>`).join("")+'</g></svg>',
 bubbles:'<svg viewBox="-6 -14 12 26" class="rise"><g fill="none" stroke="#7FE8FF" stroke-width=".5"><circle cx="-2" cy="6" r="2"/><circle cx="2.5" cy="-1" r="1.4"/><circle cx="-1" cy="-7" r="1"/><circle cx="2" cy="-11.5" r=".7"/></g><circle cx="-2.6" cy="5.4" r=".5" fill="#fff" opacity=".8"/></svg>',
 thornring:'<svg viewBox="-14 -14 28 28"><circle r="11.6" fill="none" stroke="#1F5C2A" stroke-width="1.1"/><g fill="#2E8A3E">'+[...Array(14)].map((_,i)=>{const t=i*Math.PI/7;return `<path transform="rotate(${(t*180/Math.PI).toFixed(1)})" d="M11.2-.8 13.8 0 11.2.8Z"/>`}).join("")+'</g></svg>',
 rune:'<svg viewBox="-15 -15 30 30" class="spin-slow"><circle r="13.4" fill="none" stroke="#8D65F6" stroke-width=".6" stroke-opacity=".8"/><circle r="11.6" fill="none" stroke="#E6B85C" stroke-width=".35" stroke-dasharray="1.2 1.6"/><g stroke="#B9A2FF" stroke-width=".5" stroke-linecap="round" fill="none">'+[...Array(8)].map((_,i)=>`<path transform="rotate(${i*45})" d="M0-12.6v-1.6M-.7-13.6h1.4"/>`).join("")+'</g></svg>',
 chain:'<svg viewBox="-16 -5 32 9"><g fill="none" stroke="#B8C0D0" stroke-width=".9">'+[...Array(7)].map((_,i)=>`<ellipse cx="${-12+i*4}" cy="${(Math.abs(i-3)*.55).toFixed(2)}" rx="2.1" ry="1.2" transform="rotate(${(i-3)*8} ${-12+i*4} ${(Math.abs(i-3)*.55).toFixed(2)})"/>`).join("")+'</g></svg>',
 cometorbit:'<svg viewBox="-15 -9 30 18" class="spin-slow"><ellipse rx="13.5" ry="5" fill="none" stroke="#7FE8FF" stroke-opacity=".25" stroke-width=".4" transform="rotate(-12)"/><path d="M6 -5.2C9 -5.5 11.5-4.5 13-3" stroke="#7FE8FF" stroke-width="1.2" stroke-linecap="round" fill="none" opacity=".7"/><circle cx="13" cy="-3" r="1.3" fill="#FFFFFF"/></svg>',
 petals:'<svg viewBox="-14 -14 28 28" class="drift"><g fill="#FFB3D1">'+[[-11,-8,30],[10,-10,-20],[-12,6,70],[11,7,-60],[0,-13,10]].map(([x,y,r])=>`<path transform="translate(${x} ${y}) rotate(${r})" d="M0-1.8C1.4-1.8 1.8 0 0 1.8-1.8 0-1.4-1.8 0-1.8Z"/>`).join("")+'</g></svg>',
 visor:'<svg viewBox="-12 -3 24 6"><defs><linearGradient id="dv" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#00F0FF" stop-opacity=".3"/><stop offset=".5" stop-color="#00F0FF"/><stop offset="1" stop-color="#00F0FF" stop-opacity=".3"/></linearGradient></defs><rect x="-11" y="-2.2" width="22" height="4.4" rx="2.2" fill="#0B1220" stroke="#00F0FF" stroke-width=".5"/><rect x="-9" y="-.7" width="18" height="1.4" rx=".7" fill="url(#dv)"/></svg>',
 duskwings:'<svg viewBox="-20 -9 40 16"><g fill="#3B2266" stroke="#8D65F6" stroke-width=".4" opacity=".95">'+[-1,1].map(s=>`<path d="M${s*6},0 C${s*10},-8 ${s*16},-8 ${s*19},-5 C${s*17},-3 ${s*17},-1 ${s*19},1 C${s*16},1 ${s*15},3 ${s*15},5 C${s*12},3 ${s*9},4 ${s*6},3Z"/>`).join("")+'</g></svg>',
 starcrown:'<svg viewBox="-12 -11 24 12"><defs><linearGradient id="dsc" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF1C4"/><stop offset="1" stop-color="#B07A1E"/></linearGradient></defs><path d="M-10 0 -9-4-5-2-3-7 0-3 3-7 5-2 9-4 10 0Z" fill="url(#dsc)" stroke="#6E420C" stroke-width=".4" stroke-linejoin="round"/>'+[[-9,-4.6,.8],[-3,-7.6,1],[3,-7.6,1],[9,-4.6,.8],[0,-10,1.3]].map(([x,y,s])=>`<path transform="translate(${x} ${y}) scale(${s})" d="M0-1.6.4-.4 1.6 0 .4.4 0 1.6-.4.4-1.6 0-.4-.4Z" fill="#FFFFFF"/>`).join("")+'<circle cx="0" cy="-1.6" r=".9" fill="#8D65F6"/></svg>'
};

/* ---- drawn thumbnails for movement and win effects (colours + a symbol from the library) ---- */
const FX_STYLE={
 win:{classic:[["#FFE14D","#FFFFFF"],"star"],spiders:[["#39FF88","#F4FFF8"],"spider"],crown:[["#FFD86B","#FFF1C4"],"crown"],lightning:[["#FFE14D","#9FB4FF"],"bolt"],webburst:[["#F4FFF8","#B9A2FF"],"web"],
  portal:[["#8D65F6","#4FB3FF"],"spiral"],firecel:[["#FF7A1F","#FFD23F"],"flame"],icestorm:[["#7FE8FF","#FFFFFF"],"snow"],neonpulse:[["#FF4FD8","#00F0FF"],"target"],confetti:[["#FF4F7A","#FFE14D","#3FB7FF","#39FF88"],"star"],
  royal:[["#E6B85C","#8D65F6"],"crown"],inktake:[["#9D7BFF","#5B3B9E"],"web"],rift:[["#8D65F6","#E62948"],"eye"],creator:[["#FFD86B","#8D65F6"],"crown"],fireworks:[["#FF4F7A","#FFE14D","#3FB7FF"],"star"],
  aurorawin:[["#5CFFD1","#B9A2FF"],"wave"],heartsrain:[["#FF4F7A","#FFB3D1"],"heart"],starfall:[["#FFE9A8","#FFFFFF"],"comet"],shockwave:[["#E62948","#FFFFFF"],"target"],sakurawin:[["#FFB3D1","#FF6FA8"],"leaf"],
  runecircle:[["#8D65F6","#E6B85C"],"compass"],pixelwin:[["#39FF88","#3FB7FF","#FF4FD8","#FFE14D"],"cube"],tornadowin:[["#E62948","#FF8A9C"],"tornado"],sunrise:[["#FFD23F","#FFB02E"],"sun"],thunderdome:[["#FFE14D","#9FB4FF"],"bolt"]},
 move:{none:[["#5B6283"],"target"],webtrail:[["#F4FFF8"],"web"],electric:[["#FFE14D"],"bolt"],fire:[["#FF5A1F","#FFB347"],"flame"],ice:[["#BFF4FF"],"snow"],smoke:[["#8CFF78"],"tornado"],dust:[["#B98CFF","#FFFFFF"],"star"],
  sparks:[["#FFD86B"],"star"],shadow:[["#7C5BD0"],"mask"],rainbow:[["#FF6B9A","#FFE14D","#39FF88","#3FB7FF"],"star"],glitch:[["#39FF88","#FF4FD8"],"cube"],petals:[["#FFB3D1"],"leaf"],bubbles:[["#7FE8FF"],"target"],
  stars:[["#FFE9A8"],"star"],comet:[["#4FB3FF","#FFFFFF"],"comet"],hearts:[["#FF4F7A"],"heart"],pixels:[["#39FF88","#3FB7FF","#FF4FD8"],"cube"],rings:[["#B9A2FF"],"target"],notes:[["#F472B6"],"note"],leaves:[["#4ADE80"],"leaf"],
  lavatrail:[["#FF4D2E","#FFB02E"],"flame"],ghost:[["#E8E6FF"],"mask"],plasma:[["#8D65F6","#7FE8FF"],"bolt"],confettitrail:[["#FF4F7A","#FFE14D","#3FB7FF"],"star"],royaltrail:[["#E6B85C","#8D65F6"],"crown"]}
};
function fxMiniSvg(kind,id,size){
  const st=(FX_STYLE[kind]||{})[id]||[["#B9A2FF"],"star"],cs=st[0],gl=GLYPH[st[1]]||GLYPH.star;
  if(kind==="win"){let rays="";for(let k=0;k<12;k++){const a=k*Math.PI/6,c=cs[k%cs.length];rays+=`<line x1="${(32+Math.cos(a)*16).toFixed(1)}" y1="${(32+Math.sin(a)*16).toFixed(1)}" x2="${(32+Math.cos(a)*28).toFixed(1)}" y2="${(32+Math.sin(a)*28).toFixed(1)}" stroke="${c}" stroke-width="3" stroke-linecap="round"/>`}
    return `<svg viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true"><circle cx="32" cy="32" r="13" fill="${cs[0]}" fill-opacity=".16"/>${rays}<g transform="translate(22 22) scale(.8333)" color="${cs[0]}">${gl}</g></svg>`}
  let marks="";for(let k=0;k<3;k++){const c=cs[k%cs.length];marks+=`<g transform="translate(${4+k*13} 25) scale(.58)" color="${c}" opacity="${(.4+k*.22).toFixed(2)}">${gl}</g>`}
  return `<svg viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true"><path d="M6 32H46" stroke="${cs[0]}" stroke-opacity=".3" stroke-width="2" stroke-dasharray="2 3"/>${marks}<circle cx="53" cy="32" r="7.5" fill="#E62948"/><circle cx="50.8" cy="29.8" r="2.3" fill="#fff" opacity=".6"/></svg>`;
}

/* ================= toasts & sheets ================= */
function toast(msg,kind){
  const host=$("toasts");if(!host)return;
  const inMatch=document.body.classList.contains("in-match");
  [...host.children].forEach(t=>{if(t.dataset.msg===msg)t.remove()});
  if(inMatch)while(host.firstChild)host.firstChild.remove();
  const t=h("div",{class:"toast"+(kind?" "+kind:""),role:"status"},msg);
  t.dataset.msg=msg;host.append(t);
  setTimeout(()=>{t.classList.add("out");setTimeout(()=>t.remove(),260)},2600);
}
let sheetOnClose=null;
function openSheet(build,onClose){
  for(const tm of sheetTimers)clearInterval(tm);sheetTimers=[];
  const card=$("sheetCard");card.textContent="";sheetOnClose=onClose||null;
  build(card,closeSheet);$("sheet").classList.remove("hidden");
  const f=card.querySelector("button,input,select");if(f)setTimeout(()=>f.focus({preventScroll:true}),60);
}
function closeSheet(){
  if($("sheet").classList.contains("hidden"))return;
  for(const tm of sheetTimers)clearInterval(tm);sheetTimers=[];
  $("sheet").classList.add("hidden");const cb=sheetOnClose;sheetOnClose=null;if(cb)cb();refreshPage();
}
$("sheet").addEventListener("click",e=>{if(e.target===$("sheet"))closeSheet()});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("sheet").classList.contains("hidden"))closeSheet()});
function confirmSheet(title,body,yes,onYes){
  openSheet((c,close)=>{c.append(h("h3",{},title),h("p",{class:"lead"},body),
    h("div",{class:"row"},h("button",{class:"primary",onclick:()=>{close();onYes()}},yes),h("button",{onclick:close},"إلغاء")))});
}
function afterGains(out){
  if(!out)return;
  for(const id of out.ach){const a=ACH_INDEX[id];toast("إنجاز جديد: "+a.name,"good")}
  if(out.levelUps.length)setTimeout(()=>levelUpSheet(out),out.ach.length?500:0);
  updateNavDot();
}
function levelUpSheet(out){
  const last=out.levelUps[out.levelUps.length-1];sfx("level");buzz([30,40,30]);
  const rewards=[].concat(...out.levelUps.map(l=>l.rewards));
  openSheet((c,close)=>c.append(h("div",{class:"center"},
    h("div",{class:"bigemo"},ic("up")),h("h3",{},"ارتفع مستواك!"),h("div",{class:"lvbig"},fmt(last.L)),h("p",{class:"lead"},"وصلت للمستوى "+fmt(last.L)),
    rewards.length?h("div",{style:"display:flex;justify-content:center"},rwChips(rewards.slice(0,24))):null,
    h("button",{class:"primary wide",style:"margin-top:16px",onclick:close},"يا سلام"))));
}

/* ================= navigation ================= */
const PAGES=["home","games","webbound","leaders","store","profile","about"],SCREENS=["home","games","webbound","leaders","store","profile","about","customize","owner","lobby","game","mg","wl","nst","bc","km","ch"];
let screen="home";
let lastScreen="home";
function show(id){if(typeof screen!=="undefined"&&screen&&screen!==id&&screen!=="about")lastScreen=screen;
  if(id==="owner"&&!Owner.verified)id="profile";
  screen=id;
  document.body.classList.toggle("in-match",["game","mg","wl","nst","bc","lobby","km","ch"].includes(id));
  for(const s of SCREENS)$(s).classList.toggle("hidden",s!==id);
  const navOn=PAGES.includes(id);
  $("nav").classList.toggle("hidden",!navOn);document.body.classList.toggle("has-nav",navOn);
  const navId=id==="webbound"?"games":id==="about"?"profile":id;
  document.querySelectorAll("#nav button").forEach(b=>{const on=b.dataset.go===navId;b.classList.toggle("on",on);if(on)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current")});
  window.scrollTo(0,0);
  refreshPage();
}
function refreshPage(){
  if(screen==="home")renderHome();else if(screen==="games")renderGames();else if(screen==="webbound")renderWebbound();else if(screen==="about")renderAbout();else if(screen==="leaders")renderLeaders();else if(screen==="store")renderStore();
  else if(screen==="profile")renderProfile();else if(screen==="lobby")renderLobby();
  else if(screen==="customize")renderCustomize();else if(screen==="owner")renderOwner();
}
document.querySelectorAll("#nav button").forEach(b=>b.addEventListener("click",()=>{if(screen!==b.dataset.go){sfx("move");show(b.dataset.go)}}));
function updateNavDot(){$("navDot").classList.toggle("hidden",loginStatus().claimedToday)}

/* ================= home ================= */
function seg(id,val,onPick,disabled){
  $(id).querySelectorAll("button").forEach(b=>{const v=+b.dataset.v;b.classList.toggle("sel",v===val);b.setAttribute("aria-pressed",String(v===val));b.disabled=!!disabled;b.onclick=()=>onPick(v)});
}
function bgClass(el,bg){
  for(const c of [...el.classList])if(c.startsWith("bg-")||c==="has-bg")el.classList.remove(c);
  if(bg&&bg!=="none")el.classList.add("has-bg","bg-"+bg);
}
const ownerTag=()=>h("span",{class:"ownertag",title:"صاحب اللعبة، متحقق منه"},ic("crown"),"OWNER");
function playerStrip(el){
  el.textContent="";const li=levelInfo(P.xp);bgClass(el,eff("bg"));
  el.setAttribute("aria-label","تقدّمك: "+displayName()+"، المستوى "+fmt(li.L)+" ، افتح حسابي");
  el.append(myAvatar(56),
    h("div",{class:"who"},
      h("div",{class:"pname"},nameEl(displayName(),eff("theme")),badgeEl(eff("badge")),Owner.verified?ownerTag():null),
      h("div",{class:"ptitle"},effItem("title").name),
      h("div",{class:"chips"},h("span",{class:"pill"},"المستوى "+fmt(li.L)),h("span",{class:"pill coins"},coinEl(coinsText())),
        P.currentWinStreak>=2?h("span",{class:"pill hot"},ic("flame"),fmt(P.currentWinStreak)):null)),
    h("span",{class:"go","aria-hidden":"true",style:"font-size:20px;opacity:.7"},"‹"));
}
const freeCoins=()=>Owner.verified&&P.owner.infinite;
const coinsText=()=>freeCoins()?"∞":fmt(P.coins);
const FAQ=[
  ["كيف أفوز؟","وصّل كرتك للحافة اللي بلونك قبل باقي اللاعبين."],
  ["كيف أمدّ الخيط؟","اضغط «مدّ خيط»، المس الفراغ بين الخانات واسحب لين يصير الخيط مكانه، وبعدين ثبّته. ما تقدر تمدّ خيط يسكّر الطريق كامل على أي لاعب."],
  ["أقدر أنط فوق لاعب؟","إيه. ولو فيه خيط يمنع النطة المستقيمة، تطلع لك حركة بالمائل."],
  ["كم خيط عندي؟","١٠ في مباراة الاثنين، ٧ للثلاثة، و٥ للأربعة."],
  ["كيف أجمع XP؟","من إكمال المباريات والفوز والمهام اليومية والأسبوعية والإنجازات والمكافأة اليومية."],
  ["وش فايدة XP؟","يرفع مستواك، وكل مستوى يفتح مكافأة: عملات أو عنصر جديد."],
  ["كيف أجمع عملات SPIDER؟","من اللعب والفوز والمهام والإنجازات والمكافأة اليومية والأكواد."],
  ["وش الفرق بين XP والعملات؟","XP يرفع مستواك، والعملات تشتري فيها من المتجر."],
  ["وش الأشياء اللي أقدر أخصصها؟","الكرة، والإطار، والزينة، وخلفية الحساب، والشارة، ولون الاسم، واللقب، وطاولة اللعب، وشكل الخيوط، وتأثير الحركة، وتأثير الفوز، والتفاعلات، وشكل غرفة الانتظار، وحزمة الأصوات."],
  ["وش الحزم؟","مجموعة عناصر متناسقة بسعر أقل من مجموع أسعارها. إذا عندك جزء منها، تدفع بس على اللي ناقصك."],
  ["وش التنسيقات؟","تحفظ مظهرك الكامل باسم، وتلبسه بضغطة وحدة من «حسابي». تقدر تحفظ لين ٦ تنسيقات."],
  ["أقدر أشوف العنصر قبل لا أشتريه؟","إيه، اضغط على أي عنصر في المتجر وتطلع لك معاينة: الطاولة على لوحة، والخيط على خيط، والتأثير يشتغل قدامك."],
  ["الطاولة اللي أشوفها أونلاين من يختارها؟","صاحب الغرفة. كل لاعب يشوف كرة الثاني وخيوطه وتأثيراته."],
  ["المؤثرات ثقيلة على جوالي؟","من «حسابي» ثم الإعدادات اختر «مؤثرات خفيفة»، وتنطفي آثار الحركة وتأثيرات الفوز الكبيرة."],
  ["متى يتجدد ترتيب المتصدرين؟","كل أسبوع يوم الأحد الساعة ١٢ بالليل بتوقيت السعودية."],
  ["هل انتصاراتي ضد الكمبيوتر تدخل في الترتيب؟","لا، الترتيب الأسبوعي على الانتصارات الأونلاين بس."],
  ["إذا خسرت أخسر عملات أو مستوى؟","لا، الخسارة تصفّر سلسلة الانتصارات بس."],
  ["وين ينحفظ تقدّمي؟","في نسخة الموقع على خادم SPIDER، وتقدر تدخل من أي جهاز لو سويت اسم مستخدم وكلمة سر من «حسابي». وفي نسخة Claude على هذا الجهاز."],
  ["هل الأشكال تعطيني أفضلية؟","لا، كل العناصر شكلية بس، واللعبة مو Pay to Win."],
  ["ليش مباريات نفس الجوال ما تنحسب؟","لأن اللعبة ما تقدر تعرف مين اللاعب صاحب الحساب فيها، فتبقى للمتعة."],
  ["وش يصير لو تراجعت ضد الكمبيوتر؟","المباراة تصير تدريب وما تعطي مكافآت."],
  ["وش العناصر السرية؟","عناصر نادرة ما ينكشف شكلها ولا طريقة فتحها، تلقاها من أكواد أو فعاليات خاصة."],
  ["أقدر أستخدم الكود السري أكثر من مرة؟","لا، كل كود مرة وحدة لكل حساب."],
  ["كيف ألعب مع صاحبي أونلاين؟","سوّ غرفة من الرئيسية وأرسل لصاحبك رابط اللعبة وكود الغرفة. في نسخة Claude تدعوه من زر المشاركة ولازم يكون عنده حساب Claude، وفي نسخة الموقع يدخل بدون حساب."]
];
function renderFaq(){const f=$("faq");f.textContent="";for(const [q,a] of FAQ)f.append(h("details",{},h("summary",{},q),h("p",{},a)))}
/* ================= daily login ================= */
function loginCalendar(box,onClaim){
  const st=loginStatus(),cal=h("div",{class:"cal"});
  LOGIN_REWARDS.forEach((rw,i)=>{
    const d=i+1,got=st.claimedToday?d<=st.next:d<st.next,today=!st.claimedToday&&d===st.next;
    cal.append(h("div",{class:"day"+(got?" got":"")+(today?" today":"")+(d===7?" d7":"")},
      h("b",{},(got?"✓ ":"")+"اليوم "+fmt(d)),rw.map(r=>h("div",{},r.t==="coins"?fmt(r.n)+" عملة":fmt(r.n)+" XP"))));
  });
  box.append(cal);
  if(st.claimedToday)box.append(h("p",{class:"hint center"},"استلمت مكافأة اليوم. ارجع بعد "+leftText(dayEndsAt()-clock.now())));
  else box.append(h("button",{class:"primary wide",onclick:async e=>{e.target.disabled=true;let r;try{r=await Act.claimLogin()}catch(x){toast(x.message,"bad");e.target.disabled=false;return}
    sfx("coin");buzz(15);toast("استلمت مكافأة اليوم "+fmt(r.day),"good");onClaim&&onClaim(r);afterGains(r.out)}},"استلم مكافأة اليوم "+fmt(st.next)));
  box.append(h("p",{class:"hint center"},"إذا فوّت يوم ترجع لليوم الأول."));
}
function openLogin(){
  openSheet((c,close)=>{c.append(h("h3",{class:"ic-h"},ic("calendar"),"المكافأة اليومية"),h("p",{class:"lead"},"ادخل كل يوم وخذ مكافأتك. اليوم السابع أكبر وحدة."));
    loginCalendar(c,()=>{c.textContent="";c.append(h("h3",{class:"ic-h"},ic("calendar"),"المكافأة اليومية"));loginCalendar(c);c.append(h("button",{class:"wide",style:"margin-top:10px",onclick:close},"تمام"))})});
}

/* ================= leaderboard ================= */
function renderLeaders(){
  if(Platform.kind==="web"&&Cloud.on)return renderNetLeaders();
  const out=newOut();if(weeklyRollover(out)){saveProfile();if(out.items.length){sfx("unlock");toast("فزت ببطل الأسبوع الماضي!","good")}}
  $("lbCountdown").textContent="ينتهي الأسبوع بعد: "+leftText(weekEndsAt()-clock.now());
  const body=$("lbBody");body.textContent="";
  const rows=lbSorted();
  if(!rows.length){
    body.append(h("div",{class:"card empty"},h("div",{class:"empty-ic"},ic("web2")),h("p",{style:"margin:0 0 4px;font-weight:700;color:var(--ink)"},"ما فيه نتائج هالأسبوع للحين"),
      h("p",{class:"hint",style:"margin:0 0 14px"},"العب أونلاين مع أصحابك، وكل فوز يرفعك في الترتيب."),h("button",{class:"primary",onclick:()=>show("home")},"العب الحين")));
  }else{
    const rowName=r=>h("div",{class:"pname",style:"font-size:15px;justify-content:inherit"},nameEl(r.n||"لاعب",r.t),badgeEl(r.b));
    const pod=h("div",{class:"podium"});
    rows.slice(0,3).forEach((r,i)=>pod.append(h("div",{class:"pod p"+(i+1)+(r.me?" me":"")},
      h("div",{class:"medal"},rankMedal(i+1,i===0?40:34)),avatar((SKINS[r.s]||SKINS[0]).id,r.f,i===0?58:48,r.d),
      h("div",{class:"nm"},nameEl(r.n||"لاعب",r.t)),h("div",{class:"ptitle"},r.b?badgeEl(r.b,16):null,"المستوى "+fmt(r.l||1)),
      h("span",{class:"pill"},plural(r.w,"فوز واحد","فوزين","انتصارات","فوز")))));
    body.append(pod);
    const list=h("div",{class:"list",style:"margin-bottom:12px"});
    rows.slice(3).forEach(r=>list.append(h("div",{class:"lrow"+(r.me?" me":"")},h("span",{class:"rk"},fmt(r.rank)),avatar((SKINS[r.s]||SKINS[0]).id,r.f,38,r.d),
      h("div",{class:"grow"},rowName(r),h("div",{class:"ptitle"},"المستوى "+fmt(r.l||1))),h("span",{class:"w"},ic("trophy"),fmt(r.w)))));
    if(rows.length>3)body.append(list);
    const mine=rows.find(r=>r.me);
    if(mine)body.append(h("div",{class:"lb-me"},h("span",{},"مكانك"),h("b",{},"#"+fmt(mine.rank)),h("span",{class:"w"},ic("trophy"),fmt(mine.w))));
    else body.append(h("div",{class:"lb-me"},h("span",{},"مكانك"),h("b",{},"—"),h("span",{class:"faint"},"العب أونلاين وفز عشان تدخل الترتيب")));
  }
  const mine=rows.find(r=>r.me);
  $("lbNote").textContent="";
  add($("lbNote"),
    h("p",{style:"margin:0 0 8px;color:var(--ink);font-weight:700"},"انتصاراتك الأونلاين هالأسبوع: "+fmt(P.weeklyWins)+(mine?"، ومركزك "+fmt(mine.rank):"")),
    P.championWeeks.length?h("p",{style:"margin:0 0 8px",class:"ic-line"},ic("crown"),"صرت بطل الأسبوع "+plural(P.championWeeks.length,"مرة وحدة","مرتين","مرات","مرة")+"."):null,
    h("p",{style:"margin:0 0 8px"},"لما يتجدد الأسبوع، صاحب أكثر انتصارات (٣ على الأقل) ياخذ شارة ولقب «بطل الأسبوع». باقي تقدمك ما يتصفّر."),
    h("p",{style:"margin:0"},"الترتيب هنا من المباريات الأونلاين اللي لعبتها على هذا الجهاز. لما يرجع الاتصال، يطلع الترتيب العالمي لكل اللاعبين."));
}


function rankMedal(n,size){
  const col=n===1?["#FFE7A3","#C08A1E"]:n===2?["#F1F4FA","#8A93A8"]:["#F6C29A","#9A5A2A"],k="rm"+(++artSeq2);
  return svgNode(`<svg viewBox="0 0 40 40" width="${size||34}" height="${size||34}" aria-hidden="true"><defs><linearGradient id="${k}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${col[0]}"/><stop offset="1" stop-color="${col[1]}"/></linearGradient></defs><path d="M20 2 35.6 11v18L20 38 4.4 29V11Z" fill="url(#${k})" stroke="rgba(0,0,0,.35)"/><text x="20" y="26.5" text-anchor="middle" font-family="Readex Pro,system-ui" font-weight="700" font-size="17" fill="#1A1206">${n}</text></svg>`);
}
function renderNetLeaders(){
  const cd=$("lbCountdown");cd.textContent="";cd.append(h("span",{class:"chip on sm"},"كل الألعاب"),h("span",{class:"lb-cd"},ic("clock"),"ينتهي الأسبوع بعد "+leftText(weekEndsAt()-clock.now())));
  const body=$("lbBody");body.textContent="";
  if(!lbCache||Date.now()-(lbCache.at||0)>20000)loadNetLeaders();
  if(!lbCache){body.append(h("div",{class:"card empty"},"يحمّل الترتيب…"));return}
  if(lbCache.error){body.append(h("div",{class:"card empty"},h("p",{},softenErr(lbCache.error)),h("button",{onclick:()=>{lbCache=null;loadNetLeaders()}},"حاول مرة ثانية")));return}
  const rows=lbCache.rows.map((x,i)=>{const c=x.card||{},pub=c.pub||{};return {id:x.id,w:x.w,g:x.g,n:c.nickname||"لاعب",s:Number.isInteger(pub.sk)?pub.sk:0,f:pub.fr,b:pub.bd,t:pub.th,d:pub.dc,l:c.level||1,owner:!!c.is_owner,me:x.id===cid}});
  rows.forEach(r=>r.rank=1+rows.filter(x=>x.w>r.w).length);
  if(!rows.length){body.append(h("div",{class:"card empty"},h("div",{class:"empty-ic"},ic("web2")),h("p",{style:"margin:0 0 4px;font-weight:700;color:var(--ink)"},"ما فيه نتائج هالأسبوع للحين"),h("p",{class:"hint",style:"margin:0 0 14px"},"العب أونلاين، وكل فوز يرفعك في الترتيب."),h("button",{class:"primary",onclick:()=>show("home")},"العب الحين")))}
  else{
    const pod=h("div",{class:"podium"});
    rows.slice(0,3).forEach((r,i)=>pod.append(h("div",{class:"pod p"+(i+1)+(r.me?" me":"")},h("div",{class:"medal"},rankMedal(i+1,i===0?40:34)),avatar((SKINS[r.s]||SKINS[0]).id,r.f,i===0?58:48,r.d),
      h("div",{class:"nm"},nameEl(r.n,r.t)),h("div",{class:"ptitle"},r.b?badgeEl(r.b,16):null,"المستوى "+fmt(r.l)),r.owner?ownerTag():null,h("span",{class:"pill"},plural(r.w,"فوز واحد","فوزين","انتصارات","فوز")))));
    body.append(pod);
    const list=h("div",{class:"list",style:"margin-bottom:12px"});
    rows.slice(3).forEach(r=>list.append(h("div",{class:"lrow"+(r.me?" me":"")},h("span",{class:"rk"},fmt(r.rank)),avatar((SKINS[r.s]||SKINS[0]).id,r.f,38,r.d),
      h("div",{class:"grow"},h("div",{class:"pname",style:"font-size:15px"},nameEl(r.n,r.t),badgeEl(r.b)),h("div",{class:"ptitle"},"المستوى "+fmt(r.l))),h("span",{class:"w"},ic("trophy"),fmt(r.w)))));
    if(rows.length>3)body.append(list);
    const mine=rows.find(r=>r.me);
    if(mine)body.append(h("div",{class:"lb-me"},h("span",{},"مكانك"),h("b",{},"#"+fmt(mine.rank)),h("span",{class:"w"},ic("trophy"),fmt(mine.w))));
    else body.append(h("div",{class:"lb-me"},h("span",{},"مكانك"),h("b",{},"—"),h("span",{class:"faint"},"العب أونلاين وفز عشان تدخل الترتيب")));
  }
  const me=lbCache.me;$("lbNote").textContent="";
  add($("lbNote"),h("p",{style:"margin:0 0 8px;color:var(--ink);font-weight:700"},"انتصاراتك الأونلاين هالأسبوع: "+fmt(me?me.w:0)),
    P.championWeeks.length?h("p",{style:"margin:0 0 8px",class:"ic-line"},ic("crown"),"صرت بطل الأسبوع "+plural(P.championWeeks.length,"مرة وحدة","مرتين","مرات","مرة")+"."):null,
    h("p",{style:"margin:0 0 8px"},"لما يتجدد الأسبوع، صاحب أكثر انتصارات (٣ على الأقل) ياخذ شارة ولقب «بطل الأسبوع»."),
    h("p",{style:"margin:0"},"هذا الترتيب العالمي لكل اللاعبين، ويحسبه الخادم من المباريات الأونلاين."));
}

$("homeGamesAll").addEventListener("click",()=>show("games"));

/* ================= platform: game registry, artwork, home, games hub, WEBBOUND entry =================
   SPIDER is the platform; WEBBOUND is its first game.
   Coins, XP, levels and the profile cosmetics (skin, frame, badge, name colour, title, background,
   decoration, emotes, sounds) belong to the platform and carry across games. Each game lists the
   cosmetic categories only it uses; for WEBBOUND that is board, web, move, win and lobby.
   Stats and the leaderboard are WEBBOUND's today; a second game gets its own block through a
   data migration when it arrives. Storage keys and database ids stay as they are. */
const GAME_CATS={arcade:"أركيد",party:"جماعية",strategy:"استراتيجية",word:"كلمات"};
const GAMES=[{
  id:"webbound",name:"WEBBOUND",nameAr:"ويب باوند",category:"strategy",status:"live",
  tagline:"سباق وخيوط على شبكة ٩×٩",
  desc:"وصّل كرتك للحافة اللي بلونك قبل الكل، وسكّر الطريق على خصومك بخيوط الشبكة.",
  players:"٢–٤ لاعبين",length:"٥–١٠ دقايق",colors:["#E62948","#8D65F6"],
  modes:["online","bot","local"],cosmetics:["board","web","move","win","lobby"],maxBots:3,maxLocal:4,
  rules:null
},{
  id:"webgrid",name:"WEBGRID",nameAr:"ويب جريد",category:"strategy",status:"live",
  tagline:"ارسم الخيوط وسكّر المربعات",
  desc:"كل دور ترسم خيط بين نقطتين. اللي يسكّر مربع ياخذه ويلعب مرة ثانية، واللي يجمع أكثر مربعات يفوز.",
  players:"٢–٤ لاعبين",length:"٣–٦ دقايق",colors:["#3FB7FF","#E62948"],
  modes:["online","bot","local"],cosmetics:["web"],maxBots:3,maxLocal:4,
  rules:["في دورك اضغط بين نقطتين عشان ترسم خيط.","لو سكّرت مربع (الأربع جهات) ياخذ لونك، وتلعب مرة ثانية.","انتبه: الخيط الثالث حول أي مربع يعطي خصمك فرصة يسكّره.","لما تتسكّر كل المربعات الـ٢٥، يفوز صاحب أكثر مربعات."]
},{
  id:"xo",name:"XO∞",nameAr:"إكس أو اللانهائية",category:"strategy",status:"live",
  tagline:"ثلاث علامات بس، وما فيه تعادل",
  desc:"كل لاعب عنده ٣ علامات على اللوحة. لما تحط الرابعة تختفي أقدم وحدة لك، فاللعبة ما تخلص بتعادل أبدًا.",
  players:"لاعبين",length:"١–٣ دقايق",colors:["#B9A2FF","#FFB02E"],
  modes:["online","bot","local"],cosmetics:["web"],maxBots:1,maxLocal:2,
  rules:["صفّ ٣ علامات بخط مستقيم وتفوز.","عندك ٣ علامات بس. الرابعة تمسح أقدم علامة لك.","العلامة اللي بتختفي في دورك الجاي تبين باهتة وترمش.","ما فيه تعادل، فخطط قبل ما تحط علامتك."]
},{
  id:"wordweb",name:"WORDWEB",nameAr:"وورد ويب",category:"party",status:"live",
  tagline:"نفس الكلمة للكل، مين يكشفها أول؟",
  desc:"صاحب الغرفة يختار التصنيف، وتطلع كلمة مخفية وحدة للكل. خمّن الحروف من الكيبورد، وأول واحد يكمّل الكلمة يفوز.",
  players:"٢–٤ لاعبين",length:"٢–٤ دقايق",colors:["#39FF88","#8D65F6"],
  modes:["online","bot"],cosmetics:[],maxBots:1,maxLocal:0,
  rules:["الكل يخمّن بنفس الوقت، مو بالدور.","كل حرف صح ينكشف لك أنت بس، وخصمك يشوف إنك لقيت حرف.","عندك ٦ أخطاء. كل غلطة تنزّل العنكبوت، وبالسادسة ينقطع خيطه.","أول واحد يكمّل الكلمة يفوز. ولو الكل خلصت أخطاؤه، يفوز اللي كشف أكثر."]
},{
  id:"webline",name:"WEBLINE",nameAr:"ويب لاين",category:"arcade",status:"live",
  tagline:"كل ذبابة تطوّل خيطك",
  desc:"عنكبوتك يغزل خيط وراه. كل ذبابة تاكلها تطوّل الخيط وتسرّعك، ولو صدمت الجدار أو خيطك تخسر.",
  players:"لاعب واحد",length:"١–٥ دقايق",colors:["#39FF88","#E62948"],
  modes:["daily","free"],cosmetics:["skin"],maxBots:0,maxLocal:0,
  rules:["حرّك العنكبوت بالسحب أو بالأسهم أو بالأزرار.","كل ذبابة تزيد نتيجتك وتطوّل خيطك وتسرّعك.","لو صدمت الجدار أو خيطك، تنتهي الجولة.","تحدي اليوم نفسه لكل اللاعبين، وأول ٥ جولات في اليوم لها مكافآت."]
},{
  id:"dama",name:"DAMA",nameAr:"الضامة",category:"strategy",status:"live",
  tagline:"الضامة الخليجية: أكل إجباري وملوك طايرة",
  desc:"اللعبة الشعبية المعروفة. القطع تمشي لقدّام أو على الجنب، والأكل إجباري وتاخذ أطول أكلة. اللي يوصل للطرف الثاني يصير ملك يمشي أي مسافة.",
  players:"لاعبين",length:"١٠–٢٠ دقيقة",colors:["#E6B85C","#E62948"],
  modes:["online","bot","local"],cosmetics:[],maxBots:1,maxLocal:2,
  rules:["القطعة تمشي خانة وحدة لقدّام أو يمين أو يسار، وما ترجع لورا.","الأكل إجباري: تنط فوق قطعة الخصم للخانة الفاضية وراها، وتكمل الأكل لو تقدر.","لو فيه أكثر من أكلة، لازم تاخذ اللي تاكل أكثر قطع.","اللي توصل للصف الأخير تصير ملك يمشي ويأكل من بعيد. واللي يخلص قطعه أو حركاته يخسر."]
},{
  id:"bluff",name:"BLUFF",nameAr:"كذّاب",category:"party",status:"live",
  tagline:"نردك مخفي، والكذب مسموح",
  desc:"كل لاعب عنده ٥ نردات ما يشوفها غيره. زايد على عدد الأوجه على الطاولة، أو كذّب اللي قبلك. اللي يغلط يخسر نرد، وآخر واحد يبقى معه نرد يفوز.",
  players:"٢–٦ لاعبين",length:"٥–١٠ دقايق",colors:["#E62948","#E6B85C"],
  modes:["online","bot"],cosmetics:[],maxBots:3,maxLocal:0,
  rules:["كل جولة كل لاعب يرمي نرداته، ويشوف نرده هو بس.","بدورك زايد: «على الطاولة كلها فيه على الأقل ٤ خمسات» مثلًا.","اللي بعدك يا يرفع (عدد أكبر، أو نفس العدد بوجه أعلى)، يا يقول «كذّاب!».","تنكشف كل النردات: لو المزايدة صحيحة يخسر المكذِّب نرد، ولو غلط يخسر المزايد."]
},{
  id:"flyhunt",name:"FLYHUNT",nameAr:"صيد الذباب",category:"strategy",status:"live",
  tagline:"ذبابك مخفي، اصطد ذباب خصمك قبله",
  desc:"كل لاعب عنده ذباب مخبّى في شبكته (٤ مجموعات). تتبادلون الضربات، وكل إصابة تعطيك ضربة ثانية. أول واحد يصيد كل ذباب خصمه يفوز.",
  players:"لاعبين",length:"٥–١٠ دقايق",colors:["#39FF88","#E62948"],
  modes:["online","bot"],cosmetics:[],maxBots:1,maxLocal:0,
  rules:["ذبابك يتوزّع لحاله في شبكتك: مجموعة ٤، ومجموعة ٣، ومجموعتين ٢.","بدورك اضرب خانة في شبكة خصمك.","لو أصبت، تلعب مرة ثانية. ولو صدت المجموعة كاملة تبين كلها.","المجموعات ما تلمس بعض، حتى على الأقطار، فاستفد من هالمعلومة."]
},{
  id:"webwar",name:"WEBWAR",nameAr:"حرب الخيوط",category:"strategy",status:"live",
  tagline:"مد شبكتك وحاصر الأرض",
  desc:"كل لاعب يبدأ من زاوية. بدورك مد خيطك لخانة جنب أرضك، وأي منطقة فاضية تحاصرها لحالك تصير لك كلها. اللي يملك أكثر أرض يفوز.",
  players:"٢–٤ لاعبين",length:"٤–٨ دقايق",colors:["#8D65F6","#39FF88"],
  modes:["online","bot","local"],cosmetics:[],maxBots:3,maxLocal:4,
  rules:["بدورك اختر خانة فاضية جنب أرضك (فوق أو تحت أو يمين أو يسار).","أي منطقة فاضية (١٠ خانات أو أقل) محاطة بأرضك بس، تصير لك كلها.","اللي ما عنده حركة يتجاوز دوره.","لما تمتلي اللوحة، يفوز صاحب أكبر أرض."]
},{
  id:"webnest",name:"WEBNEST",nameAr:"بيت العنكبوت",category:"arcade",status:"live",
  tagline:"ادمج البيض لين تطلع الملكة",
  desc:"حرّك البيت كله يمين أو يسار أو فوق أو تحت. كل مرحلتين متشابهة تندمج وتكبر، من بيضة لين ملكة العناكب. التحدي اليومي نفسه لكل اللاعبين.",
  players:"لاعب واحد",length:"٣–١٠ دقايق",colors:["#E6B85C","#8D65F6"],
  modes:["daily","free"],cosmetics:[],maxBots:0,maxLocal:0,
  rules:["اسحب أو استخدم الأسهم: كل المراحل تتحرك لنفس الاتجاه.","مرحلتين متشابهة تندمج وتصير المرحلة الأكبر، وتاخذ نقاطها.","بعد كل حركة تطلع بيضة جديدة.","لما ما يبقى ولا حركة، تنتهي الجولة. وأول ٥ جولات في اليوم لها مكافآت."]
},{
  id:"nightweb",name:"NIGHTWEB",nameAr:"مين العنكبوت؟",category:"party",status:"live",
  tagline:"لعبة القعدات: مين العنكبوت بينكم؟",
  desc:"كل لاعب ياخذ دور مخفي. بالليل العنكبوت يصيد والطبيب يحمي والكاشف يكشف. بالنهار تتناقشون وتصوّتون مين تطلعون. الذباب يفوزون لو طلّعوا العناكب، والعناكب يفوزون لو صاروا نصّ الأحياء.",
  players:"٤–١٠ لاعبين",length:"١٠–٢٠ دقيقة",colors:["#8D65F6","#E62948"],
  modes:["online"],cosmetics:[],maxBots:0,maxLocal:0,
  rules:["دورك مخفي: عنكبوت، أو طبيب، أو كاشف، أو ذبابة. اضغط بطاقتك عشان تشوفه.","بالليل: العنكبوت يختار ضحية، والطبيب يحمي واحد، والكاشف يعرف هل لاعب عنكبوت أو لا.","بالنهار: تناقشوا (صوت أو وجهًا لوجه) وصوّتوا. الأكثر أصوات يطلع وينكشف دوره.","العناكب يفوزون لو صاروا نصّ الأحياء، والذباب يفوزون لو طلّعوا كل العناكب. والمكافأة لكل الفريق الفايز."]
},{
  id:"ballclash",name:"BALL CLASH",nameAr:"صراع الكور",category:"arcade",status:"live",
  tagline:"اختر كورتك، والفيزياء تقرر",
  desc:"معارك تلقائية في ساحة مربعة: كل كورة معها سلاح حقيقي يضرب ويرد، ويقوى مع كل ضربة. اختر كورتك أو فريقك وتابع المعركة.",
  players:"١–٤ لاعبين",length:"١–٢ دقيقة",colors:["#E62948","#E6B85C"],
  modes:["online","quick","team"],cosmetics:[],maxBots:0,maxLocal:0,
  rules:["اختر كورة لفريقك، والكمبيوتر يختار كورته (أو اختر له).","المعركة تمشي لحالها: الكور تنط وتتصادم، والأسلحة تضرب.","كل ضربة ناجحة تطوّر سلاح الكورة: يطول، أو يسرع، أو تقوى دفعته.","يفوز الفريق اللي يبقى له آخر كورة. ولو خلص الوقت، يفوز الأكثر صحة."]
},{
  id:"domino",name:"DOMINO",nameAr:"دومينو",category:"strategy",status:"live",
  tagline:"أبو ستة: سحب لاثنين، وفرق لأربعة",
  desc:"دومينو الدبل سكس بجولة وحدة. تلعب لحالك ضد الكمبيوتر، أو تفتح غرفة خاصة والكمبيوتر يكمّل المقاعد الفاضية.",
  players:"٢ أو ٤",length:"٥–١٢ دقيقة",colors:["#E6B85C","#1C140C"],
  modes:["online","bot","local"],cosmetics:["domtile","domtable"],maxBots:3,maxLocal:4,
  rules:["الجولة وحدة، مو سباق لمية.","اثنين: كل واحد ٧ أحجار، والباقي سحب. ما عندك لعب؟ تسحب حجر، وإذا انلعب تكمل، وإلا يمر الدور.","أربعة: فرق متقابلة، ٧ أحجار وما فيه سحب. اللي ما يقدر يلعب يمرّر.","يفتح أعلى دبل، وإذا ما فيه دبل يفتح أعلى مجموع. الدبل يعرض عرض بس وما يفتح طرف ثالث.","اللي يخلّص أحجاره ياخذ نقاط الخصم. وإذا انسدّت الطاولة، الأقل نقاط ياخذ الفرق. التعادل ما يعطي عملات."]
},{
  id:"chess",name:"CHESS",nameAr:"شطرنج",category:"strategy",status:"live",
  tagline:"رقعة كاملة، ضد الكمبيوتر أو مع أصحابك",
  desc:"شطرنج بقواعده: تبييت، أخذ بالمرور، ترقية، كش مات، بات، وتكرار وخمسين نقلة. تلعب أبيض أو أسود ضد الكمبيوتر، أو تفتح غرفة خاصة بساعة.",
  players:"لاعبين",length:"٣–١٠ دقايق",colors:["#C4B49A","#1A140E"],
  modes:["online","bot"],cosmetics:["chboard","chpiece"],maxBots:1,maxLocal:0,
  rules:["الأبيض يبدأ. اختر قطعة ثم وجهتها، أو اسحبها على الشاشة الكبيرة.","التبييت والأخذ بالمرور والترقية لقائد أو قلعة أو فيل أو حصان كلها محسوبة.","الكش مات ينهي الجولة. البات والتكرار والخمسين نقلة ونقص القطع تعادل.","فوز الكش مات على الكمبيوتر ١٠ عملات، وفوز الغرفة ٢٠. الحد ٨ انتصارات في اليوم. التعادل والخسارة ما يعطون."]
},{
  id:"kalima",name:"KALIMA",nameAr:"كلمة اليوم",category:"word",status:"live",
  tagline:"خمّن كلمة من خمسة حروف",
  desc:"كلمة واحدة في اليوم، يختارها الخادم وما تنرسل لجهازك. عندك ست محاولات، والحروف تصير أخضر أو ذهبي أو رمادي.",
  players:"لاعب واحد",length:"دقيقة",colors:["#39FF88","#E6B85C"],
  modes:["daily","free"],cosmetics:[],maxBots:0,maxLocal:0,
  rules:["الكلمة خمسة حروف، وشكل الألف والتاء المربوطة يتوحّد.","الأخضر: الحرف في مكانه. الذهبي: الحرف موجود في مكان ثاني. الرمادي: الحرف مو في الكلمة.","كلمة اليوم مرة واحدة لكل يوم، والسلسلة تكمل لو لعبت اليوم اللي بعده.","التدريب يشتغل بدون نت، وما يحسب في السلسلة."]
}];
let curGame="webbound";
let chColor="w",chClock="none",chFlipManual=null;
function chLevel(){try{const n=+localStorage.getItem("spider_chlevel");if(n>=1&&n<=4)return n}catch(e){}return Math.min(3,Math.max(1,P.settings.botLevel||2))}
function chSetLevel(n){try{localStorage.setItem("spider_chlevel",String(n))}catch(e){}}
let wlBoardCache=null,wlBoardAt=0;
let wwCat=(()=>{try{return localStorage.getItem("spider_wwcat")||"fruit"}catch(e){return "fruit"}})();
const MODES={
  quick:{name:"QUICK BATTLE",sub:"١ ضد ١ ضد الكمبيوتر",icon:"bolt"},team:{name:"TEAM BATTLE",sub:"٢ ضد ٢ ضد الكمبيوتر",icon:"users"},
  online:{name:"أونلاين",sub:"ضد أصحابك من أي جهاز",icon:"globe"},
  daily:{name:"تحدي اليوم",sub:"نفس الخريطة للكل",icon:"calendar"},free:{name:"لعب حر",sub:"خريطة عشوائية",icon:"bolt"},bot:{name:"ضد الكمبيوتر",sub:"سهل، متوسط، صعب",icon:"cpu"},
  local:{name:"نفس الجهاز",sub:"٢–٤ لاعبين على جوال واحد",icon:"users"}
};
const gameById=id=>GAMES.find(g=>g.id===id)||GAMES[0];
function domCoverSvg(){
  return `<svg viewBox="0 0 360 200" preserveAspectRatio="xMidYMid slice" role="img" aria-label="غلاف دومينو: طاولة غامقة وحجرين">
<defs><linearGradient id="dmf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2A1840"/><stop offset="1" stop-color="#140E12"/></linearGradient></defs>
<rect width="360" height="200" fill="url(#dmf)"/>
<ellipse cx="180" cy="118" rx="150" ry="46" fill="#3A2416"/>
<g transform="translate(132 78) rotate(-18)"><rect width="36" height="68" rx="6" fill="#F3E6C8"/><line x1="4" y1="34" x2="32" y2="34" stroke="#C8B48A"/><circle cx="18" cy="17" r="3.2" fill="#1C140C"/><circle cx="12" cy="46" r="3" fill="#1C140C"/><circle cx="24" cy="56" r="3" fill="#1C140C"/></g>
<g transform="translate(188 84) rotate(12)"><rect width="36" height="68" rx="6" fill="#1B2433" stroke="#E6B85C"/><line x1="4" y1="34" x2="32" y2="34" stroke="#E6B85C"/><circle cx="18" cy="12" r="2.6" fill="#E6B85C"/><circle cx="18" cy="22" r="2.6" fill="#E6B85C"/><circle cx="12" cy="46" r="2.6" fill="#E6B85C"/><circle cx="24" cy="46" r="2.6" fill="#E6B85C"/><circle cx="12" cy="56" r="2.6" fill="#E6B85C"/><circle cx="24" cy="56" r="2.6" fill="#E6B85C"/></g>
</svg>`;
}
function kmCoverSvg(){
  return `<svg viewBox="0 0 360 200" preserveAspectRatio="xMidYMid slice" role="img" aria-label="غلاف كلمة اليوم: خمسة مربعات">
<rect width="360" height="200" fill="#120E18"/>
<g transform="translate(70 68)">
<rect width="40" height="48" rx="8" fill="#1F8A4C"/><rect x="48" width="40" height="48" rx="8" fill="#8A6A22"/><rect x="96" width="40" height="48" rx="8" fill="#2A3142"/><rect x="144" width="40" height="48" rx="8" fill="#2A3142"/><rect x="192" width="40" height="48" rx="8" fill="#1F8A4C"/>
</g></svg>`;
}
function chCoverSvg(){
  return `<svg viewBox="0 0 360 200" preserveAspectRatio="xMidYMid slice" role="img" aria-label="غلاف شطرنج: رقعة داكنة وقطع">
<rect width="360" height="200" fill="#120E18"/>
<g transform="translate(108 28)">${[0,1,2,3].map(r=>[0,1,2,3].map(c=>`<rect x="${c*36}" y="${r*36}" width="36" height="36" fill="${(r+c)%2?"#2A241C":"#C4B49A"}"/>`).join("")).join("")}
<circle cx="54" cy="54" r="10" fill="#1A140E"/><circle cx="90" cy="90" r="10" fill="#F4EFE4" stroke="#E6B85C"/></g></svg>`;
}
function chIconSvg(){
  return `<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="16" fill="#1A1420"/><rect x="14" y="14" width="18" height="18" fill="#C4B49A"/><rect x="32" y="14" width="18" height="18" fill="#2A241C"/><rect x="14" y="32" width="18" height="18" fill="#2A241C"/><rect x="32" y="32" width="18" height="18" fill="#C4B49A"/><circle cx="23" cy="23" r="5" fill="#1A140E"/><circle cx="41" cy="41" r="5" fill="#F4EFE4"/></svg>`;
}
function kmIconSvg(){
  return `<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="16" fill="#1A1424"/><rect x="8" y="18" width="10" height="12" rx="2" fill="#39FF88"/><rect x="20" y="18" width="10" height="12" rx="2" fill="#E6B85C"/><rect x="32" y="18" width="10" height="12" rx="2" fill="#3A4256"/><rect x="44" y="18" width="10" height="12" rx="2" fill="#3A4256"/><rect x="14" y="34" width="10" height="12" rx="2" fill="#3A4256"/><rect x="26" y="34" width="10" height="12" rx="2" fill="#39FF88"/><rect x="38" y="34" width="10" height="12" rx="2" fill="#E6B85C"/></svg>`;
}
function domIconSvg(){
  return `<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="16" fill="#24180F"/><rect x="22" y="8" width="20" height="48" rx="4" fill="#F3E6C8"/><line x1="26" y1="32" x2="38" y2="32" stroke="#C8B48A"/><circle cx="32" cy="20" r="2.4" fill="#1C140C"/><circle cx="28" cy="42" r="2.2" fill="#1C140C"/><circle cx="36" cy="48" r="2.2" fill="#1C140C"/></svg>`;
}
const coverSvg=id=>id==="chess"?chCoverSvg():id==="kalima"?kmCoverSvg():id==="domino"?domCoverSvg():id==="ballclash"?bcCoverSvg():id==="nightweb"?nwCoverSvg():id==="webnest"?nsCoverSvg():id==="bluff"?bfCoverSvg():id==="flyhunt"?fhCoverSvg():id==="webwar"?wrCoverSvg():id==="dama"?dmCoverSvg():id==="webline"?wlCoverSvg():id==="webgrid"?wgCoverSvg():id==="xo"?xoCoverSvg():id==="wordweb"?wwCoverSvg():wbCoverSvg();
const iconSvg=id=>id==="chess"?chIconSvg():id==="kalima"?kmIconSvg():id==="domino"?domIconSvg():id==="ballclash"?bcIconSvg():id==="nightweb"?nwIconSvg():id==="webnest"?nsIconSvg():id==="bluff"?bfIconSvg():id==="flyhunt"?fhIconSvg():id==="webwar"?wrIconSvg():id==="dama"?dmIconSvg():id==="webline"?wlIconSvg():id==="webgrid"?wgIconSvg():id==="xo"?xoIconSvg():id==="wordweb"?wwIconSvg():wbIconSvg();
const SVGNS="http://www.w3.org/2000/svg";
function ic(n,cls){const s=document.createElementNS(SVGNS,"svg");s.setAttribute("aria-hidden","true");s.setAttribute("class","ic"+(cls?" "+cls:""));const u=document.createElementNS(SVGNS,"use");u.setAttribute("href","#i-"+n);s.append(u);return s}
function coinEl(txt){return h("span",{class:"coin-amt"},ic("coin","gold"),h("span",{},String(txt)))}
function htmlEl(tag,cls,html){const e=document.createElement(tag);if(cls)e.className=cls;e.innerHTML=html;return e}

/* ---- original cover art for WEBBOUND: a 9×9 board in perspective with glowing threads ---- */
let artSeq=0;
function wbCoverSvg(){
  const k="wb"+(++artSeq),cx=180,B=198.9,C=-2.9,A=172,ZN=1,ZF=2.4;
  const pt=(X,Z)=>[+(cx+X*A/Z).toFixed(1),+(C+B/Z).toFixed(1)];
  const Zs=[...Array(10)].map((_,i)=>ZN+i*(ZF-ZN)/9),Xs=[...Array(10)].map((_,j)=>-1+j*2/9);
  const line=(a,b,st,w,op)=>`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${st}" stroke-width="${w}" stroke-opacity="${op}" stroke-linecap="round"/>`;
  let grid="";
  for(let i=0;i<10;i++)grid+=line(pt(-1,Zs[i]),pt(1,Zs[i]),"#fff",1-i*.045,(.16-i*.011).toFixed(3));
  for(let j=0;j<10;j++)grid+=line(pt(Xs[j],ZN),pt(Xs[j],ZF),"#fff",.8,.1);
  const quad=[pt(-1,ZN),pt(1,ZN),pt(1,ZF),pt(-1,ZF)].map(p=>p.join(",")).join(" ");
  const cell=(c,r)=>pt((Xs[c]+Xs[c+1])/2,(Zs[r]+Zs[r+1])/2),z=r=>(Zs[r]+Zs[r+1])/2;
  const wall=(a,b,col,w)=>`<g filter="url(#${k}g)">${line(a,b,col,w,1)}${line(a,b,"#fff",w*.32,.85)}</g>`;
  const orb=(c,r,col,dark,rad)=>{const p=cell(c,r),R=(rad/z(r)).toFixed(1);
    return `<ellipse cx="${p[0]}" cy="${(p[1]+R*.55).toFixed(1)}" rx="${(R*1.1).toFixed(1)}" ry="${(R*.35).toFixed(1)}" fill="#000" opacity=".45"/>
      <circle cx="${p[0]}" cy="${p[1]}" r="${(R*1.9).toFixed(1)}" fill="${col}" opacity=".18" filter="url(#${k}b)"/>
      <circle cx="${p[0]}" cy="${p[1]}" r="${R}" fill="url(#${k}${dark})"/>
      <circle cx="${(p[0]-R*.32).toFixed(1)}" cy="${(p[1]-R*.36).toFixed(1)}" r="${(R*.28).toFixed(1)}" fill="#fff" opacity=".55"/>`};
  let web="";for(let a=0;a<6;a++){const t=a*Math.PI/10;web+=line([352,6],[352-150*Math.cos(t),6+150*Math.sin(t)],"#fff",.6,.12)}
  for(const r of [28,52,80,112])web+=`<path d="M${352-r} 6 Q ${352-r*.72} ${6+r*.5} ${352-r*.81} ${6+r*.59} T ${352-r*.31} ${6+r*.95}" fill="none" stroke="#fff" stroke-opacity=".08"/>`;
  let dust="";for(let i=0;i<22;i++){const x=(i*73)%360,y=(i*41)%70+4;dust+=`<circle cx="${x}" cy="${y}" r="${(i%3)*.35+.4}" fill="#fff" opacity="${.12+(i%4)*.06}"/>`}
  return `<svg viewBox="0 0 360 200" preserveAspectRatio="xMidYMid slice" role="img" aria-label="غلاف لعبة WEBBOUND: لوحة ٩×٩ عليها كرتين وخيوط مضيئة">
<defs>
 <linearGradient id="${k}s" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1C0E1C"/><stop offset=".5" stop-color="#0E1120"/><stop offset="1" stop-color="#160F2E"/></linearGradient>
 <radialGradient id="${k}r" cx=".82" cy=".1" r=".75"><stop offset="0" stop-color="#E62948" stop-opacity=".42"/><stop offset="1" stop-color="#E62948" stop-opacity="0"/></radialGradient>
 <radialGradient id="${k}v" cx=".08" cy=".95" r=".7"><stop offset="0" stop-color="#8D65F6" stop-opacity=".4"/><stop offset="1" stop-color="#8D65F6" stop-opacity="0"/></radialGradient>
 <linearGradient id="${k}f" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#1E2334"/><stop offset="1" stop-color="#0F1220"/></linearGradient>
 <radialGradient id="${k}red" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#FF8A9C"/><stop offset=".45" stop-color="#E62948"/><stop offset="1" stop-color="#6E0B1D"/></radialGradient>
 <radialGradient id="${k}vio" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#D5C4FF"/><stop offset=".45" stop-color="#8D65F6"/><stop offset="1" stop-color="#3A2280"/></radialGradient>
 <filter id="${k}g" x="-20%" y="-200%" width="140%" height="500%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
 <filter id="${k}b" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5"/></filter>
</defs>
<rect width="360" height="200" fill="url(#${k}s)"/><rect width="360" height="200" fill="url(#${k}r)"/><rect width="360" height="200" fill="url(#${k}v)"/>
${dust}${web}
<polygon points="${quad}" fill="url(#${k}f)" opacity=".92"/>
${grid}
${line(pt(-1,ZN),pt(1,ZN),"#E62948",2.4,.95)}${line(pt(-1,ZF),pt(1,ZF),"#8D65F6",1.6,.9)}
${wall(pt(Xs[2],Zs[5]),pt(Xs[4],Zs[5]),"#E62948",3.2)}
${wall(pt(Xs[6],Zs[3]),pt(Xs[6],Zs[5]),"#8D65F6",2.6)}
${wall(pt(Xs[5],Zs[7]),pt(Xs[7],Zs[7]),"#E6B85C",1.8)}
${orb(4,1,"#E62948","red",15)}${orb(5,6,"#8D65F6","vio",15)}
</svg>`;
}
/* small square mark for the game */
function wbIconSvg(){
  const k="wi"+(++artSeq);let g="";for(let i=1;i<4;i++){g+=`<line x1="${8+i*12}" y1="8" x2="${8+i*12}" y2="56" stroke="#fff" stroke-opacity=".14"/><line x1="8" y1="${8+i*12}" x2="56" y2="${8+i*12}" stroke="#fff" stroke-opacity=".14"/>`}
  return `<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="${k}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2A1124"/><stop offset="1" stop-color="#18143A"/></linearGradient></defs>
<rect width="64" height="64" rx="16" fill="url(#${k})"/><rect x="8" y="8" width="48" height="48" rx="4" fill="none" stroke="#fff" stroke-opacity=".18"/>${g}
<line x1="20" y1="32" x2="44" y2="32" stroke="#E62948" stroke-width="3" stroke-linecap="round"/><line x1="44" y1="20" x2="44" y2="32" stroke="#8D65F6" stroke-width="3" stroke-linecap="round"/>
<circle cx="26" cy="44" r="5.5" fill="#E62948"/><circle cx="38" cy="20" r="5" fill="#8D65F6"/></svg>`;
}

/* ---------- navigation helpers ---------- */
let wbMode="online",gameCat="all",modeChosen=false;
const OFFLINE_MSG="ما فيه اتصال، تقدر تلعب ضد الكمبيوتر";
function offlineNow(){return !navigator.onLine||Cloud.offline||(Platform.kind==="web"&&!Cloud.on&&!Cloud.booting)}
function softenErr(msg){if(msg&&/انتهت الجلسة/.test(String(msg))&&offlineNow())return OFFLINE_MSG;return msg||""}
function preferOfflineMode(g){
  if(modeChosen||!offlineNow())return;
  const prefer=g.modes.includes("bot")?"bot":g.modes.includes("local")?"local":g.modes.includes("free")?"free":g.modes[0];
  if(prefer&&g.modes.includes(prefer)&&wbMode==="online")wbMode=prefer;
}
const HERO_IDS=["webbound","ballclash","dama","wordweb","webline"];
function heroGames(){return HERO_IDS.map(id=>GAMES.find(g=>g.id===id)).filter(Boolean)}
async function openGame(id,mode){
  if(id==="kalima"){
    document.documentElement.classList.add("app-loading");document.documentElement.setAttribute("aria-busy","true");
    try{
      await ensureKalima();
      curGame="kalima";
      try{localStorage.setItem("spider_last","kalima")}catch(e){}
      show("km");
      if(mode==="free")kmStart("practice");
      else if(mode==="daily")kmStart("daily");
      else kmStart("pick");
    }catch(e){toast("تعذّر تحميل اللعبة، تحقق من الاتصال وحاول مرة ثانية","bad")}
    finally{document.documentElement.classList.remove("app-loading");document.documentElement.removeAttribute("aria-busy")}
    return;
  }
  const need=id!=="webbound"&&!(globalThis.SPIDER_GAMES&&globalThis.SPIDER_GAMES.games);
  if(need){document.documentElement.classList.add("app-loading");document.documentElement.setAttribute("aria-busy","true")}
  try{
    if(id!=="webbound"){try{await ensureGames()}catch(e){toast("تعذّر تحميل اللعبة، تحقق من الاتصال وحاول مرة ثانية","bad");return}}
    if(id==="chess"){try{await ensureChess()}catch(e){toast("تعذّر تحميل اللعبة، تحقق من الاتصال وحاول مرة ثانية","bad");return}}
    if(gameById(id).id!==curGame){curGame=gameById(id).id;roomsCache=null;roomsAt=0}
    try{localStorage.setItem("spider_last",gameById(id).id)}catch(e){}
    if(mode&&MODES[mode]){wbMode=mode;modeChosen=true}
    show("webbound");
    if(mode==="help"){const hb=curGame==="webbound"?$("helpBox"):$("gmRules");if(hb.tagName==="DETAILS")hb.open=true;setTimeout(()=>hb.scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"}),50)}
  }finally{if(need){document.documentElement.classList.remove("app-loading");document.documentElement.removeAttribute("aria-busy")}}
}
/* ---------- home ---------- */
function rewardBit(r){
  if(r.t==="coins")return h("b",{class:"rw-coin"},ic("coin","gold"),fmt(r.n));
  if(r.t==="xp")return h("b",{},fmt(r.n)+" XP");
  const it=findItem(r.t,r.id);return h("b",{},(it?it.name:"")+" · "+(CAT_ONE[r.t]||""));
}
function progressBar(pct,label){return h("div",{class:"pbar",role:"progressbar","aria-valuemin":"0","aria-valuemax":"100","aria-valuenow":String(Math.round(pct)),"aria-label":label},h("i",{style:"width:"+Math.max(3,Math.min(100,pct)).toFixed(1)+"%"}))}
function renderHome(){
  const av=$("homeAv");av.textContent="";av.append(myAvatar(38));
  const cc=$("homeCoins");cc.textContent="";cc.removeAttribute("aria-label");cc.append(ic("coin","gold"),h("span",{class:"sr-only"},"رصيد العملات"),h("span",{},coinsText()));
  const b=$("homeBanners");b.textContent="";
  const an=Cloud.announce;let annSeen="";try{annSeen=localStorage.getItem("spider_ann")||""}catch(e){}
  const offline=Platform.kind==="web"&&Cloud.offline&&!Cloud.booting;
  /* one banner only, and it overlays, so the hero stays put */
  if(offline)b.append(h("button",{class:"banner warn",onclick:()=>cloudStart()},ic("bolt"),h("span",{class:"grow"},Cloud.err==="rate"?"الخادم مزحوم بتسجيلات جديدة من شبكتك. اضغط للمحاولة مرة ثانية":"ما فيه اتصال بالخادم. اضغط للمحاولة مرة ثانية"),ic("chev")));
  else{const card=installCard();
    if(card)b.append(card);
    else if(an&&an.text&&String(an.id)!==annSeen)b.append(h("div",{class:"announce",role:"status"},ic("bolt"),h("span",{class:"grow"},an.text),h("button",{class:"icon","aria-label":"إخفاء الإعلان",onclick:()=>{try{localStorage.setItem("spider_ann",String(an.id))}catch(e){}renderHome()}},"×")));}
  /* a short curated row, not one slide per game */
  const heroes=heroGames(),tr=$("homeCarTrack"),dots=$("homeCarDots");
  if(tr.dataset.n!==String(heroes.length)){tr.dataset.n=String(heroes.length);
    const keep=tr.querySelector("[data-static]");
    [...tr.children].forEach(el=>{if(el!==keep)el.remove()});
    dots.textContent="";
    heroes.forEach((g,k)=>{
      if(k===0&&keep){
        const play=keep.querySelector("[data-act=play]");
        const help=keep.querySelector("[data-act=help]");
        if(play)play.onclick=()=>openGame(g.id);
        if(help)help.onclick=()=>openGame(g.id,"help");
      }else{
        tr.append(h("div",{class:"hero-card car-slide",role:"group","aria-roledescription":"شريحة"},
          htmlEl("div","hc-art",coverSvg(g.id)),
          h("div",{class:"hc-body"},
            h("div",{class:"hc-kicker"},h("span",{class:"status live"},h("i"),"متاحة"),h("span",{},GAME_CATS[g.category]+" · "+g.players)),
            h("div",{class:"hc-title"},g.name),h("div",{class:"hc-sub"},g.nameAr+" · "+g.tagline),
            h("div",{class:"hc-actions"},h("button",{class:"primary",onclick:()=>openGame(g.id)},ic("play"),"العب الآن"),
              g.rules||g.id==="webbound"?h("button",{class:"ghost",onclick:()=>openGame(g.id,"help")},"طريقة اللعب"):null))));
      }
      dots.append(h("button",{class:"car-dot",role:"tab","aria-label":g.name+" "+g.nameAr,"aria-selected":"false",onclick:()=>{carGo(k,true)}}));
    });
    tr.onscroll=()=>{clearTimeout(tr._t);tr._t=setTimeout(carSync,80)};
    tr.addEventListener("pointerdown",()=>{carHold=Date.now()+12000},{passive:true});
    carSync();
  }
  /* continue where you left off */
  const ct=$("homeCont");ct.textContent="";let last="";try{last=localStorage.getItem("spider_last")||""}catch(e){}
  const lg=last&&GAMES.find(x=>x.id===last);
  if(lg)ct.append(h("button",{class:"cont-card",onclick:()=>openGame(lg.id)},htmlEl("span","gc-icon",iconSvg(lg.id)),
    h("span",{class:"grow"},h("span",{class:"ck"},"كمّل من وين وقفت"),h("b",{},lg.name),h("span",{class:"cs"},lg.nameAr+" · "+GAME_CATS[lg.category])),h("span",{class:"cplay"},ic("play"))));
  /* all games */
  const gt=$("homeGames");
  if(!gt.querySelector("[data-game]")){
    gt.textContent="";
    for(const g of GAMES)gt.append(h("button",{class:"gtile","data-game":g.id,onclick:()=>openGame(g.id)},htmlEl("span","gc-icon",iconSvg(g.id)),
      h("span",{class:"gt-t"},h("b",{},g.name),h("span",{},g.players))));
  }else{
    gt.querySelectorAll("[data-game]").forEach(btn=>{
      btn.onclick=()=>openGame(btn.dataset.game);
      const icn=btn.querySelector(".gc-icon");
      if(icn&&!icn.querySelector("svg"))icn.innerHTML=iconSvg(btn.dataset.game);
    });
  }
  playerStrip($("homeStrip"));
  const li=levelInfo(P.xp),pr=$("homeProg");pr.textContent="";
  if(li.L>=MAX_LEVEL)pr.append(h("div",{class:"prow"},h("span",{},"وصلت لأعلى مستوى"),h("span",{class:"gold-t"},"المستوى "+fmt(MAX_LEVEL))));
  else{
    const need=li.need||1,into=Math.max(0,li.into||0),next=levelRewards(li.L+1)||[];
    pr.append(h("div",{class:"prow"},h("span",{},"المستوى "+fmt(li.L+1)+" بعد "+fmt(Math.max(0,need-into))+" XP"),h("span",{class:"faint"},fmt(into)+" / "+fmt(need))),
      progressBar(into/need*100,"التقدم للمستوى التالي"),
      next.length?h("div",{class:"nextrw"},ic("gift"),h("span",{},"مكافأة المستوى "+fmt(li.L+1)+":"),...next.map(rewardBit)):null);
  }
  const d=$("homeDaily");d.textContent="";
  const ls=loginStatus();
  d.append(h("button",{class:"dcard"+(ls.claimedToday?"":" ready"),onclick:openLogin},h("span",{class:"di"},ic("gift")),
    h("span",{class:"dt"},h("b",{},"المكافأة اليومية"),h("span",{},ls.claimedToday?"استلمتها اليوم، ارجع بكرة":"اليوم "+fmt(ls.next)+" من ٧ جاهزة")),ls.claimedToday?ic("check","ok"):h("span",{class:"dot"})));
  {const v=wlBoardCache,mine=v&&!v.error&&v.mine;
    d.append(h("button",{class:"dcard"+(mine?"":" ready"),onclick:()=>openGame("webline")},htmlEl("span","di g",wlIconSvg()),
      h("span",{class:"dt"},h("b",{},"تحدي WEBLINE اليوم"),h("span",{},mine?"أفضل نتيجة لك "+fmt(mine.score)+" · ترتيبك #"+fmt(mine.rank):"نفس الذباب لكل اللاعبين، ادخل الترتيب")),mine?ic("trophy","gold"):h("span",{class:"dot"})));
    if(Platform.kind==="web"&&!v&&typeof loadWlBoard==="function"&&!renderHome._wl){renderHome._wl=1;loadWlBoard().then(()=>{if(screen==="home")renderHome()})}}
  ensureMissions();
  const dm=P.dailyMissions.list,dd=dm.filter(m=>m.done).length,wm=(P.weeklyMissions&&P.weeklyMissions.list)||[],wd=wm.filter(m=>m.done).length;
  d.append(h("button",{class:"dcard",onclick:()=>{pfTab="missions";show("profile")}},h("span",{class:"di v"},ic("target")),
    h("span",{class:"dt"},h("b",{},"مهام اليوم"),progressBar(dm.length?dd/dm.length*100:0,"مهام اليوم")),h("span",{class:"cnt"},fmt(dd)+"/"+fmt(dm.length))));
  if(wm.length)d.append(h("button",{class:"dcard",onclick:()=>{pfTab="missions";show("profile")}},h("span",{class:"di g"},ic("calendar")),
    h("span",{class:"dt"},h("b",{},"تحديات الأسبوع"),progressBar(wd/wm.length*100,"تحديات الأسبوع")),h("span",{class:"cnt"},fmt(wd)+"/"+fmt(wm.length))));
  const f=$("homeFeat");f.textContent="";const items=featuredItems().slice(0,6);
  $("homeFeatSec").classList.toggle("hidden",!items.length);
  for(const [t,it] of items)f.append(featCard(t,it));
  updateNavDot();
}

/* ---------- games hub ---------- */
function gameCard(g){
  const open=()=>openGame(g.id);
  const c=h("div",{class:"gcard","data-game":g.id,role:"button",tabindex:"0"},
    htmlEl("div","gc-art",coverSvg(g.id)),
    h("div",{class:"gc-body"},
      h("div",{class:"gc-top"},h("span",{class:"gc-icon"}),h("span",{class:"gc-name"},h("b",{},g.name),h("span",{},g.nameAr)),h("span",{class:"status live"},h("i"),"متاحة")),
      h("p",{class:"gc-desc"},g.desc),
      h("div",{class:"gc-meta"},h("span",{class:"chip sm"},ic("users"),g.players),h("span",{class:"chip sm"},ic("clock"),g.length),h("span",{class:"chip sm"},GAME_CATS[g.category])),
      h("div",{class:"gc-modes"},...g.modes.map(m=>h("button",{class:"chip",onclick:e=>{e.stopPropagation();openGame(g.id,m)}},ic(MODES[m].icon),MODES[m].name)))));
  c.querySelector(".gc-icon").innerHTML=iconSvg(g.id);
  c.addEventListener("click",open);c.addEventListener("keydown",e=>{if((e.key==="Enter"||e.key===" ")&&e.target===c){e.preventDefault();open()}});
  return c;
}
function renderGames(){
  const cats=$("gameCats");cats.textContent="";
  const used=[...new Set(GAMES.map(g=>g.category))];
  for(const [id,name] of [["all","الكل"],...used.map(c=>[c,GAME_CATS[c]])]){
    const on=gameCat===id;cats.append(h("button",{class:"chip"+(on?" on":""),role:"tab","aria-selected":String(on),onclick:()=>{gameCat=id;renderGames()}},name));
  }
  const feat=$("gameFeat");
  if(feat){
    feat.textContent="";
    if(gameCat==="all"){
      const row=h("div",{class:"hscroll game-feat"});
      for(const id of ["webbound","ballclash","wordweb","kalima","chess","webline"]){
        const fg=GAMES.find(x=>x.id===id);if(!fg)continue;
        row.append(h("button",{class:"gtile feat-tile",onclick:()=>openGame(fg.id)},htmlEl("span","gc-icon",iconSvg(fg.id)),h("span",{class:"gt-t"},h("b",{},fg.name),h("span",{},fg.nameAr))));
      }
      feat.append(h("div",{class:"sec-title"},h("h2",{},"مختارة")),row);
    }
  }
  const list=$("gameList");list.textContent="";
  const shown=GAMES.filter(g=>gameCat==="all"||g.category===gameCat);
  if(!shown.length)list.append(h("p",{class:"hint"},"ما فيه ألعاب في هالتصنيف."));
  for(const g of shown)list.append(gameCard(g));
}

/* ---------- WEBBOUND entry ---------- */
function renderWebbound(){
  const g=gameById(curGame);
  const cv=$("wbCover");if(cv.dataset.game!==g.id){cv.dataset.game=g.id;cv.innerHTML=coverSvg(g.id)}
  const mt=$("wbMeta");if(mt.dataset.game!==g.id){mt.dataset.game=g.id;mt.textContent="";
    mt.append(h("div",{class:"wb-id"},htmlEl("span","gc-icon",iconSvg(g.id)),h("span",{class:"gc-name"},h("b",{},g.name),h("span",{},g.nameAr+" · "+GAME_CATS[g.category]))),
      h("p",{class:"gc-desc"},g.desc),h("div",{class:"gc-meta"},h("span",{class:"chip sm"},ic("users"),g.players),h("span",{class:"chip sm"},ic("clock"),g.length)));
    const gr=$("gmRules");gr.textContent="";if(g.rules){gr.append(h("h2",{},"طريقة اللعب"),h("ol",{class:"rules-ol"},...g.rules.map(r=>h("li",{},r))))}}
  $("gmRules").classList.toggle("hidden",!g.rules);$("helpBox").classList.toggle("hidden",g.id!=="webbound");
  const isBC=g.id==="ballclash";$("bcPanel").classList.toggle("hidden",!isBC);
  if(isBC){$("wlPanel").classList.add("hidden");$("wbModes").classList.add("hidden");document.querySelectorAll("#webbound .wbp").forEach(p=>p.classList.add("hidden"));$("pubSec").classList.add("hidden");return}
  const isLine=g.id==="webline"||g.id==="webnest";$("wlPanel").classList.toggle("hidden",!isLine);$("wbModes").classList.toggle("hidden",isLine);
  if(isLine){document.querySelectorAll("#webbound .wbp").forEach(p=>p.classList.add("hidden"));$("pubSec").classList.add("hidden");renderWlPanel();return}
  preferOfflineMode(g);
  if(!g.modes.includes(wbMode))wbMode=g.modes[0];
  $("wbModes").querySelectorAll("button").forEach(b=>b.classList.toggle("hidden",!g.modes.includes(b.dataset.mode)));
  let cp=$("wwCatPick");if(!cp){cp=h("div",{id:"wwCatPick"});$("btnBots").before(cp)}
  cp.textContent="";cp.classList.toggle("hidden",g.id!=="wordweb");
  if(g.id==="wordweb"){cp.append(h("span",{class:"lbl"},"التصنيف"),h("div",{class:"chips cat-chips"},...Object.keys(WW_CATS).map(k=>h("button",{class:"chip"+(wwCat===k?" on":""),onclick:()=>{wwCat=k;try{localStorage.setItem("spider_wwcat",k)}catch(e){}sfx("move");renderWebbound()}},WW_CATS[k].name))))}
  $("wbModes").querySelectorAll("button").forEach(b=>{const on=b.dataset.mode===wbMode;b.classList.toggle("on",on);b.setAttribute("aria-selected",String(on));b.tabIndex=on?0:-1;b.onclick=()=>{if(wbMode!==b.dataset.mode){wbMode=b.dataset.mode;modeChosen=true;sfx("move");renderWebbound()}}});
  document.querySelectorAll("#webbound .wbp").forEach(p=>p.classList.toggle("hidden",p.dataset.panel!==wbMode));
  if(wbMode==="online"&&offlineNow()){const cur=$("onlineErr").textContent||"";if(!cur||/انتهت الجلسة/.test(cur))onlineErr(OFFLINE_MSG)}
  $("pubSec").classList.toggle("hidden",Platform.kind!=="web");
  if(Platform.kind==="web"&&wbMode==="online"&&Date.now()-roomsAt>15000)loadRooms();
  const mb=g.maxBots||3;if(P.settings.botCount>mb)P.settings.botCount=mb;
  document.querySelectorAll("#botCount button").forEach(b=>{const v=+b.dataset.v;b.classList.toggle("hidden",g.id==="domino"?v===2:v>mb);b.textContent=g.id==="domino"?(v>=3?"٤ لاعبين":"٢ لاعبين"):["٠","١","٢","٣"][v]});
  if(g.id==="domino"&&P.settings.botCount===2)P.settings.botCount=1;
  $("botCount").closest(".card").querySelectorAll(".lbl")[0].classList.toggle("hidden",mb<2);$("botCount").classList.toggle("hidden",mb<2);
  document.querySelectorAll("[data-local]").forEach(b=>b.classList.toggle("hidden",g.id==="chess"||(g.id==="domino"?+b.dataset.local===3:+b.dataset.local>(g.maxLocal||4))));
  const lvlRow=$("botLevel");
  lvlRow.classList.toggle("hidden",g.id==="chess");
  if(lvlRow.previousElementSibling)lvlRow.previousElementSibling.classList.toggle("hidden",g.id==="chess");
  const botLead=document.querySelector('#webbound [data-panel="bot"] .lead');
  if(botLead)botLead.textContent=g.id==="chess"?"فوز الكش مات على الكمبيوتر يعطي ١٠ عملات، بحد ٨ في اليوم. التعادل والخسارة ما يعطون.":"كل فوز يعطيك XP وعملات، والصعب يعطي أكثر.";
  seg("botCount",P.settings.botCount,v=>{Act.settings({botCount:v});renderWebbound()});
  seg("botLevel",P.settings.botLevel,v=>{Act.settings({botLevel:v});renderWebbound()});
  let chp=$("chLobby");if(!chp){chp=h("div",{id:"chLobby"});$("btnBots").before(chp)}
  chp.textContent="";chp.classList.toggle("hidden",g.id!=="chess");
  if(g.id==="chess"){
    const lv=chLevel();
    chp.append(h("span",{class:"lbl"},"المستوى"),h("div",{class:"chips"},...[[1,"سهل"],[2,"متوسط"],[3,"صعب"],[4,"أستاذ"]].map(([n,name])=>h("button",{type:"button",class:"chip"+(lv===n?" on":""),onclick:()=>{chSetLevel(n);sfx("move");renderWebbound()}},name))),
      h("span",{class:"lbl mt"},"لونك"),h("div",{class:"chips"},h("button",{type:"button",class:"chip"+(chColor!=="b"?" on":""),onclick:()=>{chColor="w";renderWebbound()}},"أبيض"),h("button",{type:"button",class:"chip"+(chColor==="b"?" on":""),onclick:()=>{chColor="b";renderWebbound()}},"أسود")),
      h("span",{class:"lbl mt"},"الساعة"),h("div",{class:"chips"},...[["none","بدون"],["3+2","٣+٢"],["5+0","٥+٠"],["10+0","١٠+٠"]].map(([id,name])=>h("button",{type:"button",class:"chip"+(chClock===id?" on":""),onclick:()=>{chClock=id;renderWebbound()}},name))));
  }
}
$("wbBack").addEventListener("click",()=>show("games"));
$("wbModes").addEventListener("keydown",e=>{
  if(e.key!=="ArrowLeft"&&e.key!=="ArrowRight")return;
  const btns=[...$("wbModes").querySelectorAll("button")].filter(b=>!b.classList.contains("hidden"));
  if(!btns.length)return;
  e.preventDefault();
  let i=btns.findIndex(b=>b.dataset.mode===wbMode);if(i<0)i=0;
  const d=e.key==="ArrowLeft"?1:-1,n=btns[(i+d+btns.length)%btns.length];
  wbMode=n.dataset.mode;modeChosen=true;renderWebbound();const f=$("wbModes").querySelector('[data-mode="'+wbMode+'"]');if(f)f.focus();
});
$("homeAv").addEventListener("click",()=>show("profile"));
$("homeCoins").addEventListener("click",()=>show("store"));
$("homeStoreAll").addEventListener("click",()=>show("store"));

/* ---- original art for WEBGRID and XO∞ ---- */
function wgCoverSvg(){
  const k="wg"+(++artSeq),cols=["#3FB7FF","#E62948"];let dots="",lines="",boxes="";
  const X=c=>70+c*44,Y=r=>22+r*34;
  const own={"1,1":0,"1,2":0,"2,1":1,"3,3":1,"2,3":0};
  for(const key in own){const [r,c]=key.split(",").map(Number);boxes+=`<rect x="${X(c)+3}" y="${Y(r)+3}" width="38" height="28" rx="4" fill="${cols[own[key]]}" opacity=".32"/>`}
  const L=[[1,1,1,2,0],[1,2,1,3,0],[1,1,2,1,0],[2,1,2,2,1],[2,2,2,3,0],[1,3,2,3,0],[2,1,3,1,1],[3,1,3,2,1],[3,3,4,3,1],[3,4,4,4,1],[3,3,3,4,1],[4,3,4,4,1],[2,3,3,3,0],[2,4,3,4,0],[0,2,1,2,1],[3,2,4,2,0]];
  for(const [r1,c1,r2,c2,s] of L)lines+=`<line x1="${X(c1)}" y1="${Y(r1)}" x2="${X(c2)}" y2="${Y(r2)}" stroke="${cols[s]}" stroke-width="3.2" stroke-linecap="round" filter="url(#${k}g)"/>`;
  for(let r=0;r<5;r++)for(let c=0;c<6;c++)dots+=`<circle cx="${X(c)}" cy="${Y(r)}" r="3.2" fill="#E8EAF4"/>`;
  return `<svg viewBox="0 0 360 200" preserveAspectRatio="xMidYMid slice" role="img" aria-label="غلاف لعبة WEBGRID: نقاط وخيوط ومربعات ملوّنة"><defs><linearGradient id="${k}s" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0B1830"/><stop offset="1" stop-color="#1A0E26"/></linearGradient><radialGradient id="${k}r" cx=".85" cy=".1" r=".7"><stop offset="0" stop-color="#3FB7FF" stop-opacity=".35"/><stop offset="1" stop-color="#3FB7FF" stop-opacity="0"/></radialGradient><filter id="${k}g"><feGaussianBlur stdDeviation="1.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
<rect width="360" height="200" fill="url(#${k}s)"/><rect width="360" height="200" fill="url(#${k}r)"/>${boxes}${lines}${dots}</svg>`;
}
function wgIconSvg(){return `<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="16" fill="#0E1A33"/><rect x="18" y="18" width="14" height="14" rx="2" fill="#3FB7FF" opacity=".5"/><rect x="32" y="32" width="14" height="14" rx="2" fill="#E62948" opacity=".5"/><g stroke-width="2.6" stroke-linecap="round"><path d="M18 18h14v14H18Z" fill="none" stroke="#3FB7FF"/><path d="M32 32h14v14H32Z" fill="none" stroke="#E62948"/></g><g fill="#E8EAF4">${[18,32,46].map(x=>[18,32,46].map(y=>`<circle cx="${x}" cy="${y}" r="2.4"/>`).join("")).join("")}</g></svg>`}
function xoMark(kind,x,y,s,col,op){return kind===0?`<g opacity="${op}" stroke="${col}" stroke-width="${s*.2}" stroke-linecap="round"><path d="M${x-s/2} ${y-s/2}L${x+s/2} ${y+s/2}M${x+s/2} ${y-s/2}L${x-s/2} ${y+s/2}"/></g>`:`<circle cx="${x}" cy="${y}" r="${s/2}" fill="none" stroke="${col}" stroke-width="${s*.2}" opacity="${op}"/>`}
function xoCoverSvg(){
  const k="xc"+(++artSeq),cx=180,cy=100,sz=46;let grid="",marks="";
  for(const i of [1,2]){grid+=`<line x1="${cx-sz*1.5+i*sz}" y1="${cy-sz*1.5}" x2="${cx-sz*1.5+i*sz}" y2="${cy+sz*1.5}" stroke="#fff" stroke-opacity=".35" stroke-width="2.4" stroke-linecap="round"/><line x1="${cx-sz*1.5}" y1="${cy-sz*1.5+i*sz}" x2="${cx+sz*1.5}" y2="${cy-sz*1.5+i*sz}" stroke="#fff" stroke-opacity=".35" stroke-width="2.4" stroke-linecap="round"/>`}
  const P=(i)=>[cx-sz+(i%3)*sz,cy-sz+Math.floor(i/3)*sz];
  [[0,0,.35],[4,0,1],[8,0,1],[2,1,1],[6,1,.35],[5,1,1]].forEach(([i,kd,op])=>{const [x,y]=P(i);marks+=xoMark(kd,x,y,24,kd?"#FFB02E":"#B9A2FF",op)});
  return `<svg viewBox="0 0 360 200" preserveAspectRatio="xMidYMid slice" role="img" aria-label="غلاف لعبة XO∞: لوحة ثلاثة في ثلاثة وعلامات تختفي"><defs><linearGradient id="${k}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1A1030"/><stop offset="1" stop-color="#2A1408"/></linearGradient><filter id="${k}g"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
<rect width="360" height="200" fill="url(#${k})"/><text x="300" y="70" font-size="64" font-family="Readex Pro,system-ui" font-weight="700" fill="#B9A2FF" opacity=".16">∞</text><g filter="url(#${k}g)">${grid}${marks}</g></svg>`;
}
function xoIconSvg(){return `<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="16" fill="#1E1230"/>${xoMark(0,22,24,14,"#B9A2FF",1)}${xoMark(1,42,40,14,"#FFB02E",1)}${xoMark(0,42,22,10,"#B9A2FF",.35)}</svg>`}

function wwCoverSvg(){
  const k="ww"+(++artSeq),tiles=["ك","","ب","","ة"];let t="";
  tiles.forEach((ch,i)=>{const x=232-i*44;t+=`<rect x="${x}" y="112" width="36" height="44" rx="8" fill="${ch?"rgba(57,255,136,.16)":"rgba(255,255,255,.06)"}" stroke="${ch?"#39FF88":"rgba(255,255,255,.25)"}" stroke-width="1.6"/>`+(ch?`<text x="${x+18}" y="143" text-anchor="middle" font-family="IBM Plex Sans Arabic,Readex Pro,system-ui" font-weight="700" font-size="24" fill="#E8FFF1">${ch}</text>`:`<line x1="${x+10}" y1="146" x2="${x+26}" y2="146" stroke="rgba(255,255,255,.4)" stroke-width="2" stroke-linecap="round"/>`)});
  return `<svg viewBox="0 0 360 200" preserveAspectRatio="xMidYMid slice" role="img" aria-label="غلاف لعبة WORDWEB: حروف مخفية وعنكبوت معلّق"><defs><linearGradient id="${k}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0B2218"/><stop offset="1" stop-color="#1A1030"/></linearGradient></defs>
<rect width="360" height="200" fill="url(#${k})"/><g stroke="rgba(255,255,255,.18)" fill="none" stroke-width="1.2"><path d="M300 0Q312 30 360 34M318 0Q326 18 360 18M300 0L360 60M330 0Q340 40 360 46"/></g>
<line x1="310" y1="0" x2="310" y2="74" stroke="#E8EAF4" stroke-width="1.4"/><g transform="translate(310 84)"><ellipse rx="9" ry="11" fill="#141826" stroke="#39FF88" stroke-width="1.6"/><g stroke="#39FF88" stroke-width="1.6" stroke-linecap="round" fill="none"><path d="M-8 -4L-18 -12M-8 2L-19 2M-8 7L-17 15M8 -4L18 -12M8 2L19 2M8 7L17 15"/></g><circle cx="-3" cy="-4" r="1.8" fill="#39FF88"/><circle cx="3" cy="-4" r="1.8" fill="#39FF88"/></g>${t}</svg>`;
}
function wwIconSvg(){return `<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="16" fill="#0E2A1C"/><rect x="12" y="24" width="18" height="22" rx="5" fill="rgba(57,255,136,.18)" stroke="#39FF88" stroke-width="2"/><text x="21" y="41" text-anchor="middle" font-family="IBM Plex Sans Arabic,system-ui" font-weight="700" font-size="14" fill="#E8FFF1">ك</text><rect x="34" y="24" width="18" height="22" rx="5" fill="rgba(255,255,255,.06)" stroke="rgba(255,255,255,.35)" stroke-width="2"/><line x1="39" y1="40" x2="47" y2="40" stroke="rgba(255,255,255,.5)" stroke-width="2" stroke-linecap="round"/></svg>`}

/* ---- XO∞ marks: X and O drawn in the owner's chosen style ---- */
function xoStyled(kind,x,y,s,st,fallback,op){
  if(!st)return xoMark(kind,x,y,s,fallback,op);
  const c=kind===0?st.x:st.o,k="xm"+(++artSeq),w=s*.2,gl=st.g?` style="filter:drop-shadow(0 0 ${(s*.12).toFixed(1)}px ${c[0]})"`:"";
  const grad=`<defs><linearGradient id="${k}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c[0]}"/><stop offset="1" stop-color="${c[1]}"/></linearGradient></defs>`,P=`url(#${k})`,h=s/2;
  let body="";
  if(st.k==="pixel"){const q=s/5;const cells=kind===0?[[0,0],[4,0],[1,1],[3,1],[2,2],[1,3],[3,3],[0,4],[4,4]]:[[1,0],[2,0],[3,0],[0,1],[4,1],[0,2],[4,2],[0,3],[4,3],[1,4],[2,4],[3,4]];
    body=cells.map(([i,j])=>`<rect x="${(x-h+i*q).toFixed(2)}" y="${(y-h+j*q).toFixed(2)}" width="${(q*.9).toFixed(2)}" height="${(q*.9).toFixed(2)}" rx="${(q*.15).toFixed(2)}" fill="${P}"/>`).join("")}
  else if(st.k==="brush"){
    body=kind===0?`<path d="M${x-h} ${y-h+w*.3}Q${x} ${y-w*.2} ${x+h} ${y+h-w*.2}L${x+h-w*.5} ${y+h+w*.25}Q${x-w*.2} ${y+w*.4} ${x-h-w*.2} ${y-h+w*1.1}Z" fill="${P}"/><path d="M${x+h} ${y-h+w*.2}Q${x+w*.1} ${y} ${x-h+w*.2} ${y+h}L${x-h-w*.25} ${y+h-w*.6}Q${x} ${y-w*.5} ${x+h-w*.4} ${y-h-w*.2}Z" fill="${P}"/>`
      :`<circle cx="${x}" cy="${y}" r="${h}" fill="none" stroke="${P}" stroke-width="${(w*.85).toFixed(2)}"/><path d="M${x-h} ${y}A${h} ${h} 0 0 0 ${x+h*.2} ${y+h*.98}" fill="none" stroke="${P}" stroke-width="${(w*1.6).toFixed(2)}" stroke-linecap="round"/>`}
  else{const sw=st.k==="round"?w*1.35:w,da=st.k==="dash"?` stroke-dasharray="${(w*1.1).toFixed(1)} ${(w*.8).toFixed(1)}"`:"";
    const shape=(col,width,extra)=>kind===0?`<path d="M${x-h} ${y-h}L${x+h} ${y+h}M${x+h} ${y-h}L${x-h} ${y+h}" stroke="${col}" stroke-width="${width.toFixed(2)}" stroke-linecap="round" fill="none"${extra}/>`:`<circle cx="${x}" cy="${y}" r="${h}" stroke="${col}" stroke-width="${width.toFixed(2)}" fill="none"${extra}/>`;
    body=st.k==="double"?shape(c[1],w*1.8,` opacity=".45"`)+shape(P,w*.7,""):shape(P,sw,da)}
  return `<g opacity="${op}"${gl}>${grad}${body}</g>`;
}

function wlCoverSvg(){
  const k="wl"+(++artSeq);let grid="";for(let i=1;i<9;i++)grid+=`<line x1="${i*40}" y1="0" x2="${i*40}" y2="200" stroke="rgba(255,255,255,.05)"/>`;for(let i=1;i<5;i++)grid+=`<line x1="0" y1="${i*40}" x2="360" y2="${i*40}" stroke="rgba(255,255,255,.05)"/>`;
  return `<svg viewBox="0 0 360 200" preserveAspectRatio="xMidYMid slice" role="img" aria-label="غلاف لعبة WEBLINE: عنكبوت يغزل خيط طويل ويلاحق ذبابة"><defs><linearGradient id="${k}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0A1A12"/><stop offset="1" stop-color="#1A0E1E"/></linearGradient><filter id="${k}g"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
<rect width="360" height="200" fill="url(#${k})"/>${grid}
<path d="M60 160H140V100H220V60H300" fill="none" stroke="#E8EAF4" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" filter="url(#${k}g)" style="color:#39FF88"/><path d="M60 160H140V100H220V60H300" fill="none" stroke="#39FF88" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity=".7"/>
<g transform="translate(300 60)"><g stroke="#39FF88" stroke-width="2" stroke-linecap="round"><path d="M-6-4-18-14M-7 0-20 0M-6 4-18 14M6-4 18-14M7 0 20 0M6 4 18 14"/></g><circle r="10" fill="#E62948"/><circle cx="-3" cy="-3" r="2" fill="#fff"/><circle cx="3" cy="-3" r="2" fill="#fff"/></g>
<g transform="translate(250 140)"><ellipse cx="-6" cy="-6" rx="7" ry="4" fill="rgba(200,230,255,.55)" transform="rotate(-25 -6 -6)"/><ellipse cx="6" cy="-6" rx="7" ry="4" fill="rgba(200,230,255,.55)" transform="rotate(25 6 -6)"/><circle r="6" fill="#1A1F2E" stroke="#9BF8FF" stroke-width="1.6"/></g></svg>`;
}
function wlIconSvg(){return `<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="16" fill="#0E2418"/><path d="M14 46H30V30H46V20" fill="none" stroke="#39FF88" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="46" cy="18" r="6" fill="#E62948"/></svg>`}

/* ---- home carousel helpers ---- */
let carIdx=0,carHold=0;
function carGo(k,user){const tr=$("homeCarTrack");const n=tr&&tr.children.length;if(!n)return;carIdx=(k+n)%n;
  const el=tr.children[carIdx];tr.scrollTo({left:el.offsetLeft-tr.offsetLeft-(tr.clientWidth-el.clientWidth)/2,behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});
  if(user)carHold=Date.now()+12000;carDots()}
function carSync(){const tr=$("homeCarTrack");if(!tr||!tr.children.length)return;const mid=tr.getBoundingClientRect().left+tr.clientWidth/2;let best=0,bd=1e9;
  [...tr.children].forEach((el,k)=>{const r=el.getBoundingClientRect(),d=Math.abs(r.left+r.width/2-mid);if(d<bd){bd=d;best=k}});carIdx=best;carDots()}
function carDots(){document.querySelectorAll("#homeCarDots .car-dot").forEach((d,k)=>{d.classList.toggle("on",k===carIdx);d.setAttribute("aria-selected",String(k===carIdx))})}
setInterval(()=>{if(typeof screen==="undefined"||screen!=="home"||document.hidden||Date.now()<carHold||matchMedia("(prefers-reduced-motion: reduce)").matches)return;carGo(carIdx+1,false)},6500);

function dmCoverSvg(){
  const k="dm"+(++artSeq),S=22,X=180-S*4,Y=100-S*4;let cells="",pcs="";
  for(let r=0;r<8;r++)for(let c=0;c<8;c++)cells+=`<rect x="${X+c*S}" y="${Y+r*S}" width="${S}" height="${S}" fill="${(r+c)%2?"#2A2216":"#3A2E1C"}"/>`;
  const put=(r,c,col,kg)=>{pcs+=`<circle cx="${X+c*S+S/2}" cy="${Y+r*S+S/2}" r="${S*.38}" fill="${col}" stroke="rgba(0,0,0,.45)" stroke-width="1.5"/><circle cx="${X+c*S+S/2}" cy="${Y+r*S+S/2}" r="${S*.24}" fill="none" stroke="rgba(255,255,255,.35)"/>`+(kg?`<path d="M${X+c*S+S*.3} ${Y+r*S+S*.6}L${X+c*S+S*.3} ${Y+r*S+S*.38}L${X+c*S+S*.42} ${Y+r*S+S*.48}L${X+c*S+S*.5} ${Y+r*S+S*.32}L${X+c*S+S*.58} ${Y+r*S+S*.48}L${X+c*S+S*.7} ${Y+r*S+S*.38}L${X+c*S+S*.7} ${Y+r*S+S*.6}Z" fill="#1A1206"/>`:"")};
  [[1,1],[1,3],[2,2],[2,5],[1,6]].forEach(([r,c])=>put(r,c,"#E62948"));[[5,2],[6,1],[5,4],[6,6],[3,4]].forEach(([r,c],i)=>put(r,c,"#E6B85C",i===4));
  return `<svg viewBox="0 0 360 200" preserveAspectRatio="xMidYMid slice" role="img" aria-label="غلاف لعبة الضامة: لوحة ثمانية في ثمانية بقطع ذهبية وحمراء"><defs><radialGradient id="${k}" cx=".5" cy=".4" r=".8"><stop offset="0" stop-color="#2A1A0A"/><stop offset="1" stop-color="#0E0A06"/></radialGradient></defs><rect width="360" height="200" fill="url(#${k})"/><g>${cells}</g><rect x="${X}" y="${Y}" width="${S*8}" height="${S*8}" fill="none" stroke="#E6B85C" stroke-opacity=".5" stroke-width="2"/>${pcs}</svg>`;
}
function dmIconSvg(){return `<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="16" fill="#2A1A0A"/><circle cx="24" cy="38" r="11" fill="#E6B85C" stroke="rgba(0,0,0,.4)" stroke-width="2"/><circle cx="42" cy="24" r="11" fill="#E62948" stroke="rgba(0,0,0,.4)" stroke-width="2"/><path d="M17 41v-6l4 3 3-5 3 5 4-3v6Z" fill="#1A1206"/></svg>`}

/* ---- dice, flies and territory art ---- */
function dieSvg(f,size,col,hid){
  const P={1:[[.5,.5]],2:[[.28,.28],[.72,.72]],3:[[.25,.25],[.5,.5],[.75,.75]],4:[[.28,.28],[.72,.28],[.28,.72],[.72,.72]],5:[[.26,.26],[.74,.26],[.5,.5],[.26,.74],[.74,.74]],6:[[.28,.24],[.72,.24],[.28,.5],[.72,.5],[.28,.76],[.72,.76]]};
  const body=`<rect x="2" y="2" width="36" height="36" rx="9" fill="${hid?"#2A2F45":"#F4F1EA"}" stroke="${col||"#C9C3B6"}" stroke-width="2.5"/>`;
  const dots=hid?`<text x="20" y="27" text-anchor="middle" font-size="18" font-weight="700" fill="#7A82A6" font-family="system-ui">?</text>`:(P[f]||[]).map(([x,y])=>`<circle cx="${2+x*36}" cy="${2+y*36}" r="3.6" fill="${f===1?"#E62948":"#1A1206"}"/>`).join("");
  return `<svg viewBox="0 0 40 40" width="${size}" height="${size}" aria-hidden="true">${body}${dots}</svg>`;
}
function bfCoverSvg(){const k="bf"+(++artSeq);const d=(x,y,f,r)=>`<g transform="translate(${x} ${y}) rotate(${r})">${dieSvg(f,44).replace('<svg viewBox="0 0 40 40" width="44" height="44" aria-hidden="true">','<g transform="scale(1.1)">').replace("</svg>","</g>")}</g>`;
  return `<svg viewBox="0 0 360 200" preserveAspectRatio="xMidYMid slice" role="img" aria-label="غلاف لعبة كذّاب: نردات وكأس مقلوب"><defs><radialGradient id="${k}" cx=".5" cy=".55" r=".75"><stop offset="0" stop-color="#3A0E1A"/><stop offset="1" stop-color="#0E0810"/></radialGradient></defs><rect width="360" height="200" fill="url(#${k})"/>
<path d="M120 60h70l-8 74h-54Z" fill="#1E1420" stroke="#E6B85C" stroke-width="2.5"/><ellipse cx="155" cy="60" rx="35" ry="8" fill="#2A1A24" stroke="#E6B85C" stroke-width="2"/>${d(200,96,5,-12)}${d(246,110,3,10)}${d(212,140,1,6)}<text x="300" y="70" font-size="40" font-weight="700" fill="#E62948" opacity=".85" font-family="Readex Pro,system-ui">؟!</text></svg>`}
function bfIconSvg(){return `<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="16" fill="#3A0E1A"/><g transform="translate(10 14) scale(.9)">${dieSvg(5,40).replace(/<svg[^>]*>|<\/svg>/g,"")}</g><g transform="translate(30 26) scale(.7)">${dieSvg(2,40).replace(/<svg[^>]*>|<\/svg>/g,"")}</g></svg>`}
function flySvg(cx,cy,r,col){return `<g transform="translate(${cx} ${cy})"><ellipse cx="${-r*.55}" cy="${-r*.5}" rx="${r*.6}" ry="${r*.32}" fill="rgba(200,230,255,.55)" transform="rotate(-25 ${-r*.55} ${-r*.5})"/><ellipse cx="${r*.55}" cy="${-r*.5}" rx="${r*.6}" ry="${r*.32}" fill="rgba(200,230,255,.55)" transform="rotate(25 ${r*.55} ${-r*.5})"/><circle r="${r*.5}" fill="#1A1F2E" stroke="${col||"#9BF8FF"}" stroke-width="${r*.14}"/></g>`}
function fhCoverSvg(){const k="fh"+(++artSeq),S=20,X=100,Y=20;let g="";for(let r=0;r<8;r++)for(let c=0;c<8;c++)g+=`<rect x="${X+c*S}" y="${Y+r*S}" width="${S-2}" height="${S-2}" rx="3" fill="rgba(57,255,136,.07)"/>`;
  const hit=(r,c)=>`<path d="M${X+c*S+4} ${Y+r*S+4}l10 10m0-10l-10 10" stroke="#E62948" stroke-width="3" stroke-linecap="round"/>`,miss=(r,c)=>`<circle cx="${X+c*S+9}" cy="${Y+r*S+9}" r="2.5" fill="#7A82A6"/>`;
  return `<svg viewBox="0 0 360 200" preserveAspectRatio="xMidYMid slice" role="img" aria-label="غلاف لعبة صيد الذباب: شبكة فيها إصابات وذباب"><defs><linearGradient id="${k}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0A1A14"/><stop offset="1" stop-color="#0E0A18"/></linearGradient></defs><rect width="360" height="200" fill="url(#${k})"/>${g}${hit(2,3)}${hit(2,4)}${hit(2,5)}${miss(5,1)}${miss(1,6)}${miss(6,4)}${flySvg(X+3*S+9,Y+5*S+9,9,"#39FF88")}${flySvg(300,60,16,"#9BF8FF")}</svg>`}
function fhIconSvg(){return `<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="16" fill="#0A1A14"/><g stroke="rgba(57,255,136,.35)" stroke-width="1.5"><path d="M12 24h40M12 40h40M24 12v40M40 12v40"/></g><path d="M27 27l10 10m0-10l-10 10" stroke="#E62948" stroke-width="3.5" stroke-linecap="round"/></svg>`}
function wrCoverSvg(){const k="wr"+(++artSeq),S=24,X=96,Y=16,own=["#8D65F6","#39FF88","#E62948"];let g="";
  const map=["1110000","1111000","1101000","0000330","0003330","2200333","2220033"];
  map.forEach((row,r)=>[...row].forEach((ch,c)=>{const o=+ch;g+=`<rect x="${X+c*S}" y="${Y+r*S}" width="${S-3}" height="${S-3}" rx="5" fill="${o?own[o-1]:"rgba(255,255,255,.05)"}" opacity="${o?.75:1}"/>`}));
  return `<svg viewBox="0 0 360 200" preserveAspectRatio="xMidYMid slice" role="img" aria-label="غلاف لعبة حرب الخيوط: أراضي ملوّنة على شبكة"><defs><radialGradient id="${k}" cx=".5" cy=".5" r=".8"><stop offset="0" stop-color="#1A1030"/><stop offset="1" stop-color="#08060E"/></radialGradient></defs><rect width="360" height="200" fill="url(#${k})"/>${g}</svg>`}
function wrIconSvg(){return `<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="16" fill="#1A1030"/><rect x="12" y="12" width="18" height="18" rx="4" fill="#8D65F6"/><rect x="34" y="34" width="18" height="18" rx="4" fill="#39FF88"/><rect x="34" y="12" width="18" height="18" rx="4" fill="rgba(255,255,255,.12)"/><rect x="12" y="34" width="18" height="18" rx="4" fill="#8D65F6" opacity=".6"/></svg>`}

const NS_COL=["","#3A3F5C","#4B3F7A","#5B3BA0","#7A3FB8","#9D3FB8","#C03F8E","#E62948","#FF6A3D","#E6B85C","#FFD86B","#FFF1C4","#FFFFFF","#FFFFFF"];
function nsTileSvg(e,size){const col=NS_COL[e]||"#fff",dark=e>=10;
  const art=e<=2?`<ellipse cx="20" cy="22" rx="${7+e*1.5}" ry="${9+e*1.5}" fill="rgba(255,255,255,.85)"/>`:`<g stroke="${dark?"#1A1206":"#fff"}" stroke-width="2" stroke-linecap="round" opacity=".9"><path d="M14 18L6 12M14 22L5 22M14 26L6 32M26 18L34 12M26 22L35 22M26 26L34 32"/></g><circle cx="20" cy="22" r="${6+Math.min(e,11)*.4}" fill="${dark?"#1A1206":"#fff"}"/>`+(e>=11?`<path d="M13 10l3 5 4-6 4 6 3-5v6H13Z" fill="#1A1206"/>`:"");
  return `<svg viewBox="0 0 40 40" width="${size}" height="${size}" aria-hidden="true"><rect x="1" y="1" width="38" height="38" rx="9" fill="${col}"/>${art}</svg>`}
function nsCoverSvg(){const k="ns"+(++artSeq),S=40,X=100,Y=20;let t="";const m=[[1,2,0,3],[0,4,5,0],[6,0,7,9],[0,8,10,11]];
  m.forEach((row,r)=>row.forEach((e,c)=>{t+=e?`<g transform="translate(${X+c*S} ${Y+r*S})">${nsTileSvg(e,S-4).replace(/<svg[^>]*>|<\/svg>/g,"")}</g>`:`<rect x="${X+c*S}" y="${Y+r*S}" width="${S-4}" height="${S-4}" rx="8" fill="rgba(255,255,255,.05)"/>`}));
  return `<svg viewBox="0 0 360 200" preserveAspectRatio="xMidYMid slice" role="img" aria-label="غلاف لعبة بيت العنكبوت: مراحل العنكبوت من البيضة للملكة"><defs><radialGradient id="${k}" cx=".5" cy=".5" r=".8"><stop offset="0" stop-color="#2A1A3A"/><stop offset="1" stop-color="#0A0810"/></radialGradient></defs><rect width="360" height="200" fill="url(#${k})"/>${t}</svg>`}
function nsIconSvg(){return `<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="16" fill="#2A1A3A"/><g transform="translate(8 8) scale(.6)">${nsTileSvg(1,40).replace(/<svg[^>]*>|<\/svg>/g,"")}</g><g transform="translate(32 32) scale(.6)">${nsTileSvg(11,40).replace(/<svg[^>]*>|<\/svg>/g,"")}</g></svg>`}

function nwCoverSvg(){const k="nw"+(++artSeq);let stars="";for(let i=0;i<26;i++){const x=(i*137)%360,y=(i*71)%120;stars+=`<circle cx="${x}" cy="${y}" r="${i%3?1:1.6}" fill="#fff" opacity="${.3+(i%4)*.15}"/>`}
  const sil=(x,s)=>`<g transform="translate(${x} 150) scale(${s})"><circle r="16" cy="-30" fill="#0B0814"/><path d="M-22 40Q-22 -6 0 -10Q22 -6 22 40Z" fill="#0B0814"/></g>`;
  return `<svg viewBox="0 0 360 200" preserveAspectRatio="xMidYMid slice" role="img" aria-label="غلاف لعبة مين العنكبوت: ليل وقمر وظلال لاعبين وعيون عنكبوت"><defs><linearGradient id="${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1A1040"/><stop offset="1" stop-color="#2A0E24"/></linearGradient></defs><rect width="360" height="200" fill="url(#${k})"/>${stars}
<circle cx="290" cy="46" r="24" fill="#FFF1C4" opacity=".9"/><circle cx="300" cy="40" r="22" fill="#1A1040"/>${sil(70,1)}${sil(130,1.15)}${sil(250,1.05)}${sil(310,.9)}
<g transform="translate(190 150) scale(1.25)"><circle r="16" cy="-30" fill="#0B0814"/><path d="M-22 40Q-22 -6 0 -10Q22 -6 22 40Z" fill="#0B0814"/><circle cx="-6" cy="-32" r="2.6" fill="#E62948"/><circle cx="6" cy="-32" r="2.6" fill="#E62948"/></g></svg>`}
function nwIconSvg(){return `<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="16" fill="#1A1040"/><circle cx="44" cy="18" r="8" fill="#FFF1C4"/><circle cx="48" cy="15" r="7" fill="#1A1040"/><circle cx="32" cy="38" r="10" fill="#0B0814" stroke="#8D65F6" stroke-width="2"/><circle cx="28" cy="36" r="2" fill="#E62948"/><circle cx="36" cy="36" r="2" fill="#E62948"/></svg>`}

/* ================= install SPIDER as an app (add to home screen) ================= */
const APP_ICON="data:image/png;base64,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";
let installEvt=null;
const isStandalone=()=>matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;
const UA=navigator.userAgent;
const isIOS=()=>/iPhone|iPad|iPod/.test(UA)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
const isAndroid=()=>/Android/i.test(UA);
const inAppBrowser=()=>/Instagram|FBAN|FBAV|TikTok|musical_ly|Snapchat|Twitter|LinkedInApp|Line\//i.test(UA);
const iosNotSafari=()=>isIOS()&&(/CriOS|FxiOS|EdgiOS|OPiOS/.test(UA)||inAppBrowser()||!/Safari/.test(UA));
addEventListener("beforeinstallprompt",e=>{e.preventDefault();installEvt=e;if(typeof screen!=="undefined"&&screen==="home")renderHome()});
addEventListener("appinstalled",()=>{installEvt=null;toast("انضافت SPIDER لشاشتك الرئيسية","good");if(screen==="home")renderHome()});
const stepIc={
  share:`<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M8 7l4-4 4 4"/><path d="M7 10H5.5A1.5 1.5 0 0 0 4 11.5v8A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5v-8a1.5 1.5 0 0 0-1.5-1.5H17"/></g></svg>`,
  add:`<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8.5v7M8.5 12h7"/></g></svg>`,
  dots:`<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></g></svg>`,
  pc:`<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M9 20h6M12 16v4M12 7v5M9.5 9.5 12 12l2.5-2.5"/></g></svg>`,
  safari:`<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5Z"/></g></svg>`};
function instStep(n,iconHtml,title,sub){return h("div",{class:"inst-step"},h("span",{class:"inst-n"},fmt(n)),htmlEl("span","inst-si",iconHtml),h("div",{class:"grow"},h("b",{},title),sub?h("span",{},sub):null))}
function installCard(){
  if(Platform.kind!=="web"||isStandalone())return null;
  let hid=0;try{hid=+(localStorage.getItem("spider_inst_hide")||0)}catch(e){}if(Date.now()-hid<7*864e5)return null;
  return h("div",{class:"inst-card"},h("img",{src:APP_ICON,alt:"",class:"inst-ic"}),
    h("div",{class:"grow"},h("b",{},"ثبّت SPIDER على جوالك"),h("span",{},"تفتحها من شاشتك الرئيسية مثل أي تطبيق، بشاشة كاملة.")),
    h("button",{class:"primary small",onclick:openInstall},installEvt?"ثبّت":"كيف؟"),
    h("button",{class:"icon inst-x","aria-label":"إخفاء لمدة أسبوع",onclick:()=>{try{localStorage.setItem("spider_inst_hide",String(Date.now()))}catch(e){}renderHome()}},"×"));
}
function openInstall(){
  if(installEvt){const ev=installEvt;ev.prompt();ev.userChoice.then(c=>{if(c&&c.outcome==="accepted")installEvt=null;renderHome()}).catch(()=>{});return}
  openSheet((c,close)=>{
    c.append(h("div",{class:"inst-head"},h("img",{src:APP_ICON,alt:"أيقونة SPIDER",class:"inst-ic big"}),h("div",{},h("h3",{style:"margin:0"},"ثبّت SPIDER"),h("span",{class:"hint"},"بتطلع أيقونتها مع تطبيقاتك، وتفتح بشاشة كاملة بدون شريط المتصفح."))));
    if(isStandalone()){c.append(h("p",{class:"lead"},"SPIDER مثبتة عندك من قبل."))}
    else if(isIOS()){
      if(iosNotSafari())c.append(h("div",{class:"inst-warn"},htmlEl("span","inst-si",stepIc.safari),h("span",{},"افتح الرابط في Safari أول. في الآيفون الإضافة للشاشة الرئيسية تشتغل من Safari بس. اضغط «⋯» أو «فتح في المتصفح» واختر Safari.")));
      c.append(instStep(1,stepIc.share,"اضغط زر المشاركة","تحت في الآيفون، أو فوق في الآيباد."),instStep(2,stepIc.add,"اختر «إضافة إلى الشاشة الرئيسية»","انزل في القائمة لين تلقاها."),instStep(3,`<img src="${APP_ICON}" alt="" style="width:100%;height:100%;border-radius:9px">`,"اضغط «إضافة»","وبتلقى SPIDER مع تطبيقاتك."));
    }else if(isAndroid()){
      c.append(instStep(1,stepIc.dots,"افتح قائمة المتصفح","النقاط الثلاث فوق."),instStep(2,stepIc.add,"اختر «تثبيت التطبيق»","أو «إضافة إلى الشاشة الرئيسية»."),instStep(3,`<img src="${APP_ICON}" alt="" style="width:100%;height:100%;border-radius:9px">`,"اضغط «تثبيت»","وبتلقى SPIDER مع تطبيقاتك."));
    }else{
      c.append(instStep(1,stepIc.pc,"على الكمبيوتر (Chrome أو Edge)","اضغط أيقونة التثبيت في آخر شريط العنوان، أو من القائمة اختر «تثبيت SPIDER»."),instStep(2,stepIc.share,"على الآيفون","افتحها في Safari، وبعدها المشاركة ← «إضافة إلى الشاشة الرئيسية»."),instStep(3,stepIc.dots,"على الأندرويد","من قائمة Chrome اختر «تثبيت التطبيق»."));
    }
    c.append(h("button",{class:"primary wide",style:"margin-top:14px",onclick:close},"تمام"));
  });
}
function regSW(){try{if("serviceWorker" in navigator&&Platform.kind==="web"&&(location.protocol==="https:"||/^(localhost|127\.0\.0\.1)$/.test(location.hostname)))navigator.serviceWorker.register("sw.js").catch(()=>{})}catch(e){}}
if(document.readyState==="complete")setTimeout(regSW,1500);else addEventListener("load",()=>setTimeout(regSW,1500));

/* ---- BALL CLASH: its engine and screens live in their own files, loaded the first time the game opens ---- */
let bcLoading=null;
function loadBC(){
  if(window.BCUI&&window.BC)return Promise.resolve();
  if(bcLoading)return bcLoading;
  const add=src=>new Promise((ok,no)=>{const s=document.createElement("script");s.src=src+"?v=13";s.onload=ok;s.onerror=()=>no(new Error("ما قدرنا نحمّل ملفات اللعبة"));document.head.append(s)});
  bcLoading=add("bc_core.js").then(()=>add("bc_kinds.js")).then(()=>add("bc_new_data.js")).then(()=>add("bc_art.js")).then(()=>add("bc_shop_logic.js")).then(()=>add("bc_ui.js")).catch(e=>{bcLoading=null;throw e});
  return bcLoading;
}
async function bcOpen(mode){
  const bs=["bcQuick","bcTeam","bcCustom","bcDraft","bcTour","bcColl","bcShop","bcStats"].map(id=>$(id));bs.forEach(b=>b.disabled=true);
  try{await loadBC();if(mode==="tour")window.BCUI.tour();else if(mode==="stats")window.BCUI.stats();else if(mode==="collection")window.BCUI.collection();else if(mode==="shop")window.BCUI.openShop();else window.BCUI.open(mode)}catch(e){toast(e.message+". تأكد إن ملفات لعبة صراع الكور مرفوعة مع اللعبة.","bad")}
  finally{bs.forEach(b=>b.disabled=false)}
}
$("bcQuick").addEventListener("click",()=>bcOpen("quick"));
$("bcOnline").addEventListener("click",()=>{const op=document.querySelector('#webbound .wbp[data-panel="online"]');document.querySelectorAll("#webbound .wbp").forEach(p=>p.classList.toggle("hidden",p!==op));$("pubSec").classList.remove("hidden");loadBC().catch(()=>{});if(typeof refreshPub==="function")refreshPub();op.scrollIntoView({behavior:"smooth",block:"start"})});
$("bcTeam").addEventListener("click",()=>bcOpen("team"));
$("bcCustom").addEventListener("click",()=>bcOpen("custom"));
$("bcDraft").addEventListener("click",()=>bcOpen("draft"));
$("bcTour").addEventListener("click",()=>bcOpen("tour"));
$("bcColl").addEventListener("click",()=>bcOpen("collection"));
$("bcShop").addEventListener("click",()=>bcOpen("shop"));
$("bcStats").addEventListener("click",()=>bcOpen("stats"));
function bcCoverSvg(){const k="bc"+(++artSeq);
  const ball=(x,y,r,c,ring)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" stroke="${ring}" stroke-width="4"/><circle cx="${x-r*.35}" cy="${y-r*.35}" r="${r*.3}" fill="#fff" opacity=".45"/>`;
  return `<svg viewBox="0 0 360 200" preserveAspectRatio="xMidYMid slice" role="img" aria-label="غلاف لعبة صراع الكور: كورتين بسيف ومطرقة يتصادمون في ساحة مربعة"><defs><radialGradient id="${k}" cx=".5" cy=".5" r=".8"><stop offset="0" stop-color="#2A1030"/><stop offset="1" stop-color="#090B12"/></radialGradient></defs>
<rect width="360" height="200" fill="url(#${k})"/><rect x="70" y="14" width="220" height="172" rx="6" fill="none" stroke="#8D65F6" stroke-opacity=".6" stroke-width="3"/>
<g stroke-linecap="round"><path d="M135 112L196 70" stroke="#EEF3FF" stroke-width="6"/><path d="M128 106l14 12" stroke="#E6B85C" stroke-width="4"/></g>
<g><path d="M232 110L198 80" stroke="#6B4A2B" stroke-width="6" stroke-linecap="round"/><rect x="184" y="62" width="18" height="34" rx="4" fill="#C9CFD9" stroke="#FF8A5C" stroke-width="2" transform="rotate(-40 193 79)"/></g>
<g fill="#FFE7A3">${[0,1,2,3,4,5,6,7].map(i=>`<rect x="${196+Math.cos(i*.8)*14}" y="${74+Math.sin(i*.8)*14}" width="4" height="4"/>`).join("")}</g>
${ball(120,120,22,"#C9D6E8","#E62948")}${ball(244,118,24,"#FF8A5C","#8D65F6")}</svg>`}
function bcIconSvg(){return `<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="16" fill="#2A1030"/><path d="M22 40L42 20" stroke="#EEF3FF" stroke-width="4" stroke-linecap="round"/><circle cx="20" cy="42" r="10" fill="#C9D6E8" stroke="#E62948" stroke-width="3"/><circle cx="46" cy="22" r="6" fill="#FF8A5C" stroke="#8D65F6" stroke-width="2.5"/></svg>`}

/* ================= store ================= */
let stTab="all",stShown=24;
const SF={q:"",own:"all",rar:"all",sort:"price"};
const ST_TABS=[["all","الكل"],["wish","المفضلة"],["bundles","الحزم"],["balls","صراع الكور"],["domtile","أحجار"],["domtable","طاولة دومينو"],["chboard","رقعة"],["chpiece","قطع"],["skin","سكنات"],["board","طاولات"],["web","خيوط"],["xmark","XO"],["frame","إطارات"],["deco","زينة"],["bg","خلفيات"],["badge","شارات"],["theme","ألوان الاسم"],["title","ألقاب"],["move","تأثيرات الحركة"],["win","تأثيرات الفوز"],["emote","تفاعلات"],["lobby","غرف الانتظار"],["sound","أصوات"]];
function tabs(el,list,cur,onPick){
  el.textContent="";
  for(const [id,label] of list)el.append(h("button",{class:"tab"+(id===cur?" on":""),role:"tab","aria-selected":String(id===cur),onclick:()=>onPick(id)},label));
  /* bring the active tab into view by scrolling the strip sideways only, never the page */
  const on=el.querySelector(".tab.on");
  if(on)requestAnimationFrame(()=>{const er=el.getBoundingClientRect(),r=on.getBoundingClientRect();
    if(r.left<er.left)el.scrollLeft-=er.left-r.left+12;else if(r.right>er.right)el.scrollLeft+=r.right-er.right+12});
}
function itemMini(t,it){
  if(t==="skin")return ballSvg(it,32);
  if(t==="board"){const s=miniBoard(it.id,{n:3});s.style.width="34px";return s}
  if(t==="web"){const s=webSample(it.id);s.style.width="40px";return s}
  if(t==="frame")return avatar(eff("skin"),it.id,34);
  if(t==="deco")return avatar(eff("skin"),"basic",32,it.id);
  if(t==="bg")return h("span",{class:"has-bg bg-"+it.id,style:"display:inline-block;width:40px;height:26px;border-radius:7px"});
  return h("span",{style:"font-size:22px"},miniIcon(t,it.id));
}
function storeList(){
  const live=new Set(activeEvents().map(e=>e.id));let list=[];
  if(stTab==="wish"){for(const k of P.wishlist){const [t,id]=k.split(":"),it=findItem(t,id);if(it)list.push([t,it])}}
  else{const types=stTab==="all"?Object.keys(CATS):[stTab];for(const t of types)for(const it of CATS[t])if(it.how==="store"||(it.how==="event"&&live.has(it.event)&&it.price))list.push([t,it])}
  const q=SF.q.trim();
  if(q)list=list.filter(([t,it])=>it.name.includes(q)||CAT_NAME[t].includes(q)||CAT_ONE[t].includes(q)||(it.t&&it.t.includes(q))||RARITY[it.rar].includes(q));
  if(SF.own!=="all")list=list.filter(([t,it])=>SF.own==="owned"?isOwned(t,it.id):!isOwned(t,it.id));
  if(SF.rar!=="all")list=list.filter(([t,it])=>it.rar===SF.rar);
  const pr=it=>it.price||0,ro=it=>RAR_ORDER[it.rar]||0;
  if(SF.sort==="price")list.sort((a,b)=>pr(a[1])-pr(b[1]));
  else if(SF.sort==="pricedesc")list.sort((a,b)=>pr(b[1])-pr(a[1]));
  else list.sort((a,b)=>ro(b[1])-ro(a[1])||pr(b[1])-pr(a[1]));
  return list;
}
function renderStoreFilters(){
  const f=$("stFilters");f.textContent="";
  const row=(label,opts,cur,on)=>h("div",{},h("span",{class:"lbl"},label),h("div",{class:"row"},opts.map(([v,l])=>h("button",{class:v===cur?"sel":null,"aria-pressed":String(v===cur),onclick:()=>{on(v);renderStore()}},l))));
  f.append(row("الملكية",[["all","الكل"],["owned","أملكه"],["unowned","ما أملكه"]],SF.own,v=>SF.own=v),
    row("الندرة",[["all","الكل"],["common","عادي"],["rare","نادر"],["epic","ملحمي"],["legendary","أسطوري"]],SF.rar,v=>SF.rar=v),
    row("الترتيب",[["price","الأرخص"],["pricedesc","الأغلى"],["rar","الأندر"]],SF.sort,v=>SF.sort=v),
    h("button",{class:"small",onclick:()=>{SF.own="all";SF.rar="all";SF.sort="price";renderStore()}},"صفّر التصفية"));
  const n=(SF.own!=="all")+(SF.rar!=="all")+(SF.sort!=="price");
  $("stFilterBtn").textContent=n?"تصفية ("+fmt(n)+")":"تصفية";
}
function actionBtn(t,it,after){
  const owned=isOwned(t,it.id),cb=canBuy(t,it.id),free=freeCoins(),stop=fn=>e=>{e.stopPropagation();fn()};
  if(owned){
    if(t==="emote")return h("button",{disabled:true},"عندك ✓");
    if(P.equipped[t]===it.id&&eff(t)===it.id)return h("button",{disabled:true},"مستخدم ✓");
    if(isOwnerItem(it)&&!Owner.verified)return h("button",{disabled:true},"حصري للمالك");
    return h("button",{onclick:stop(async()=>{try{await Act.equip(t,it.id)}catch(x){toast(x.message,"bad");return}sfx("move");toast("صار "+CAT_MINE[t]+": "+it.name,"good");onEquipChanged();if(after)after();else refreshPage()})},"استخدام");
  }
  if(it.how!=="store")return h("button",{disabled:true},ic("lock"),howText(t,it));
  if(cb.why==="level")return h("button",{disabled:true},ic("lock"),"المستوى "+fmt(it.lvl));
  const can=cb.ok||(free&&cb.why==="coins");
  return h("button",{class:can?"primary":null,disabled:!can,onclick:stop(()=>tryBuy(t,it,after))},free?"خذه ∞":["اشترِ ",coinEl(fmt(it.price))]);
}
function storeNote(t,it){
  if(isOwned(t,it.id))return "عندك";const cb=canBuy(t,it.id);
  if(cb.why==="coins"&&!freeCoins())return "ناقصك "+fmt(cb.need)+" عملة";
  if(cb.why==="level")return "يفتح في المستوى "+fmt(it.lvl);
  return CAT_ONE[t];
}
function heartBtn(t,it,onChange){
  const on=isWished(t,it.id);
  const b=h("button",{class:"heart"+(on?" on":""),"aria-label":on?"شيله من المفضلة":"أضفه للمفضلة","aria-pressed":String(on)},ic(on?"heartf":"heart"));
  b.addEventListener("click",async e=>{e.stopPropagation();const now=!isWished(t,it.id);b.replaceChildren(ic(now?"heartf":"heart"));b.classList.toggle("on",now);b.setAttribute("aria-pressed",String(now));sfx("move");toast(now?"انضاف للمفضلة":"انشال من المفضلة");
    try{await Act.wish(t,it.id)}catch(x){toast(x.message,"bad")}if(onChange)onChange()});
  return b;
}
function storeCard(t,it){
  const card=h("div",{class:"item r-"+it.rar+"-b","data-k":t+":"+it.id,role:"button",tabindex:"0","aria-label":"معاينة "+it.name});
  card.addEventListener("click",()=>openItemSheet(t,it));card.addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target===card)openItemSheet(t,it)});
  if(P.equipped[t]===it.id&&t!=="emote")card.append(h("span",{class:"eq"},"مستخدم"));
  card.append(heartBtn(t,it,()=>{if(stTab==="wish")renderStore()}),h("div",{class:"pv"},itemPreview(t,it)),h("div",{class:"nm"},it.name),rarTag(it),h("div",{class:"how"},storeNote(t,it)),actionBtn(t,it));
  return card;
}
function featCard(t,it){
  const c=h("div",{class:"fcard",role:"button",tabindex:"0"});c.addEventListener("click",()=>openItemSheet(t,it));
  c.append(h("div",{style:"display:flex;align-items:center;gap:10px"},h("div",{style:"width:64px;display:grid;place-items:center"},itemPreview(t,it)),
    h("div",{style:"min-width:0"},h("div",{style:"font-weight:800"},it.name),h("div",{class:"ptitle"},CAT_ONE[t]+" ",rarTag(it)))),
    h("div",{style:"margin-top:10px"},isOwned(t,it.id)?h("span",{class:"pill"},"عندك ✓"):h("span",{class:"pill coins"},coinEl(fmt(it.price)))));
  return c;
}
const featuredItems=()=>{const out=[];for(const t in CATS)for(const it of CATS[t])if(it.how==="store"&&it.rar==="legendary")out.push([t,it]);return out};
function bundleCard(b,wide){
  const bi=bundleInfo(b),card=h("div",{class:"fcard",role:"button",tabindex:"0",style:wide?"width:auto":null,"data-b":b.id});
  card.addEventListener("click",()=>openBundleSheet(b));
  const parts=h("div",{class:"parts"});for(const p of bi.parts)parts.append(h("span",{title:p.it.name,style:p.own?"opacity:.35":null},itemMini(p.t,p.it)));
  card.append(h("div",{style:"font-weight:800;font-size:16px"},b.name),parts,
    bi.complete?h("span",{class:"pill"},"عندك كل عناصرها ✓")
      :h("div",{style:"display:flex;align-items:center;gap:8px;flex-wrap:wrap"},h("span",{class:"pill coins"},coinEl(freeCoins()?"∞":fmt(bi.price))),h("span",{class:"save-tag"},"توفّر "+fmt(bi.saving)),bi.lvl&&P.level<bi.lvl?h("span",{class:"pill"},ic("lock"),"المستوى "+fmt(bi.lvl)):null));
  return card;
}
function renderStore(){
  const w=$("stWallet");w.textContent="";w.append(h("span",{class:"pill coins"},coinEl(coinsText())),h("span",{class:"pill"},"المستوى "+fmt(P.level)));
  tabs($("stTabs"),ST_TABS,stTab,id=>{stTab=id;stShown=24;renderStore()});
  renderStoreFilters();
  const fb=$("stFeatured");fb.textContent="";
  if(stTab==="all"&&!SF.q.trim()){
    const row=h("div",{class:"featured"});for(const b of BUNDLES)row.append(bundleCard(b));for(const [t,it] of featuredItems())row.append(featCard(t,it));
    fb.append(h("div",{class:"sec-h",style:"margin-top:0"},h("h3",{},"مميّز"),h("span",{},"حزم وعناصر أسطورية")),row,h("div",{class:"sec-h"},h("h3",{},"كل العناصر")));
  }
  const box=$("stItems");box.textContent="";
  let more=$("stMore");
  if(!more){more=h("button",{id:"stMore",class:"wide",type:"button"});box.after(more);more.onclick=()=>{stShown+=24;renderStore()}}
  if(stTab==="balls"){
    box.className="list";
    box.append(h("div",{class:"card bc-shop-card"},h("h3",{class:"ic-h"},ic("spark"),"متجر صراع الكور"),
      h("p",{class:"lead"},"كور ومظاهر وساحات خاصة بالمعركة. الشراء من نفس المتجر، والرصيد واحد."),
      h("button",{class:"primary",onclick:()=>openMainBcShop()},"افتح متجر الكور")));
    $("stEmpty").classList.add("hidden");more.classList.add("hidden");return}
  if(stTab==="bundles"){box.className="list";for(const b of BUNDLES)box.append(bundleCard(b,true));$("stEmpty").classList.add("hidden");more.classList.add("hidden");return}
  box.className="items";
  const list=storeList(),shown=list.slice(0,stShown);
  for(const [t,it] of shown)box.append(storeCard(t,it));
  more.classList.toggle("hidden",list.length<=stShown);
  more.textContent="اعرض المزيد · "+fmt(Math.max(0,list.length-stShown))+" باقي";
  const empty=$("stEmpty");empty.classList.toggle("hidden",list.length>0);
  empty.querySelector("p").textContent=stTab==="wish"&&!P.wishlist.length?"ما أضفت شي للمفضلة. اضغط على القلب في أي عنصر يعجبك.":"ما فيه عناصر بهالبحث أو التصفية.";
}
async function openMainBcShop(){
  try{await loadBC();window.BCUI.openShop()}catch(e){toast((e&&e.message)||"ما قدرنا نفتح متجر الكور","bad")}
}
$("stSearch").addEventListener("input",()=>{SF.q=$("stSearch").value;stShown=24;renderStore()});
$("stFilterBtn").addEventListener("click",()=>{const f=$("stFilters"),open=f.classList.contains("hidden");f.classList.toggle("hidden",!open);$("stFilterBtn").setAttribute("aria-expanded",String(open))});
function tryBuy(t,it,after){
  const free=freeCoins();
  const go=async()=>{let r;try{r=await Act.buy(t,it.id)}catch(x){sfx("bad");toast(x.message,"bad");refreshPage();return}
    sfx("coin");setTimeout(()=>sfx("unlock"),120);buzz(15);toast("صار عندك "+it.name,"good");
    if(after)after();refreshPage();
    const card=document.querySelector('[data-k="'+t+":"+it.id+'"]');if(card)card.classList.add("bought");
    afterGains(r.out)};
  if(!free&&it.price>=500)confirmSheet("تأكيد الشراء","تشتري "+CAT_ONE[t]+" «"+it.name+"» بـ "+fmt(it.price)+" عملة؟ يبقى معك "+fmt(P.coins-it.price)+" عملة.","اشترِ",go);
  else go();
}
function openItemSheet(t,it){
  openSheet((c,close)=>{
    const render=()=>{
      for(const tm of sheetTimers)clearInterval(tm);sheetTimers=[];c.textContent="";
      const hb=heartBtn(t,it);hb.style.position="static";
      c.append(h("div",{style:"display:flex;align-items:flex-start;gap:8px"},h("div",{style:"flex:1;min-width:0"},h("h3",{style:"margin:0"},it.name),h("div",{class:"ptitle"},CAT_ONE[t]+" ",rarTag(it))),it.how==="store"?hb:null));
      bigPreview(t,it,c);
      const owned=isOwned(t,it.id),cb=canBuy(t,it.id);
      c.append(h("p",{class:"hint",style:"margin:0 0 12px"},owned?"عندك هذا العنصر."+(t!=="emote"?" تقدر تستخدمه من هنا أو من «تخصيص المظهر».":" يطلع في قائمة التفاعلات وقت المباراة."):
        howText(t,it)+(cb.why==="coins"&&!freeCoins()?". ناقصك "+fmt(cb.need)+" عملة":"")));
      c.append(h("div",{class:"row"},actionBtn(t,it,render),h("button",{onclick:close,style:"flex:none;padding:0 18px"},"إغلاق")));
    };
    render();
  });
}
function openBundleSheet(b){
  openSheet((c,close)=>{
    const render=()=>{
      c.textContent="";const bi=bundleInfo(b),free=freeCoins();
      c.append(h("h3",{},b.name),h("p",{class:"lead"},bi.complete?"عندك كل عناصر هالحزمة.":"تحصل على "+plural(bi.missing.length,"عنصر واحد","عنصرين","عناصر","عنصر")+(bi.parts.length>bi.missing.length?"، واللي عندك ما ينحسب في السعر.":"، كلها بسعر أقل.")));
      const list=h("div",{class:"parts-list"});
      for(const p of bi.parts)list.append(h("div",{class:"part"+(p.own?" own":"")},h("div",{class:"pv"},itemMini(p.t,p.it)),h("div",{style:"flex:1;min-width:0"},p.it.name,h("div",{class:"ptitle"},CAT_ONE[p.t])),
        h("span",{class:"tag"},p.own?"عندك ✓":coinEl(fmt(p.it.price)))));
      c.append(list);
      if(!bi.complete){
        c.append(h("p",{style:"margin:6px 0 12px;font-weight:700"},free?"مجانًا لأن رصيدك غير محدود ∞":"بدل "+fmt(bi.full)+" تدفع "+fmt(bi.price)+" عملة، وتوفّر "+fmt(bi.saving)+"."));
        const locked=bi.lvl&&P.level<bi.lvl,can=!locked&&(free||P.coins>=bi.price);
        const buyIt=async()=>{let r;try{r=await Act.buyBundle(b.id)}catch(x){sfx("bad");toast(x.message,"bad");render();return}
          sfx("coin");setTimeout(()=>sfx("unlock"),120);buzz(20);toast("صارت عندك "+b.name,"good");render();afterGains(r.out)};
        c.append(h("div",{class:"row"},h("button",{class:can?"primary":null,disabled:!can,onclick:()=>{if(!free&&bi.price>=500){close();confirmSheet("تأكيد الشراء","تشتري "+b.name+" بـ "+fmt(bi.price)+" عملة؟ يبقى معك "+fmt(P.coins-bi.price)+" عملة.","اشترِ",()=>{buyIt();openBundleSheet(b)})}else buyIt()}},
          locked?"مقفلة لين المستوى "+fmt(bi.lvl):can?(free?"خذها ∞":"اشترِ الحزمة"):"ناقصك "+fmt(bi.price-P.coins)+" عملة"),h("button",{onclick:close,style:"flex:none;padding:0 18px"},"إغلاق")));
      }else c.append(h("button",{class:"wide",onclick:close},"إغلاق"));
    };
    render();
  });
}

/* ================= secret codes =================
   Owner commands look like codes but only run after Claude confirms the viewer owns the artifact.
   For anyone else they behave exactly like an unknown code, so they don't even confirm they exist. */
const OWNER_CMDS=new Set(["GODMODE","MAXLEVEL","INFINITECOINS","ADDCOINS","ADDXP","UNLOCKALL","SECRETALL","ALLACHIEVEMENTS","XPBOOST","COINBOOST","FOUNDERONLY","CREATOR"]);
$("codeToggle").addEventListener("click",()=>{const b=$("codeBody"),open=b.classList.contains("hidden");b.classList.toggle("hidden",!open);$("codeToggle").setAttribute("aria-expanded",String(open));if(open)$("codeIn").focus()});
$("codeBtn").addEventListener("click",()=>submitCode($("codeIn"),$("codeMsg"),$("codeBtn")));
$("codeIn").addEventListener("keydown",e=>{if(e.key==="Enter")$("codeBtn").click()});
let codeBusy=false;
async function submitCode(inp,msg,btn){
  const say=(t,cls)=>{msg.textContent=t;msg.className=cls;msg.classList.remove("hidden")};
  if(!inp.value.trim()){say("اكتب الكود أول.","err");return}
  if(codeBusy)return;codeBusy=true;btn.disabled=true;const label=btn.textContent;btn.textContent="يتحقق…";btn.classList.add("busy");
  const fail=t=>{say(t,"err");inp.classList.remove("shake");void inp.offsetWidth;inp.classList.add("shake");sfx("bad");buzz(30)};
  try{
    let r;try{r=await Act.redeem(inp.value)}catch(x){fail(x.message);return}
    if(r.ok&&r.ownerCmd){inp.value="";msg.classList.add("hidden");runOwnerCmd(r.ownerCmd);return}
    if(!r.ok){fail({used:"استخدمت هذا الكود أو مكافأته من قبل.",expired:"انتهت صلاحية هذا الكود.",slow:"محاولات كثيرة، جرّب بعد عشر دقايق."}[r.err]||"الكود غير صحيح أو غير متاح.");return}
    inp.value="";msg.classList.add("hidden");
    if(r.founder)founderReveal(r.out);else codeReveal({out:r.out,def:{bundle:r.label||""}});
  }finally{codeBusy=false;btn.disabled=false;btn.textContent=label;btn.classList.remove("busy")}
}
function revealList(box,out,step){
  out.items.forEach(({t,id},i)=>{const it=findItem(t,id);
    const pv=t==="title"?h("span",{class:"mini-ttl",style:"font-size:13px;padding:4px 10px"},"لقب"):t==="theme"?h("span",{style:"font-weight:800;font-size:15px"},nameEl(displayName(),it.id)):itemMini(t,it);
    box.append(h("div",{class:"revi",style:"animation-delay:"+(i*step).toFixed(2)+"s"},h("div",{class:"pv"},pv),
      h("div",{class:"grow"},h("div",{style:"font-weight:800"},it.name),h("div",{class:"ptitle"},CAT_ONE[t]+" ",rarTag(it)))))});
  return out.items.length*step;
}
function coinsRow(box,out,delay){if(out.coins)box.append(h("div",{class:"revi",style:"animation-delay:"+delay.toFixed(2)+"s"},h("div",{class:"pv bdg-big"},ic("coin","gold")),h("div",{class:"grow"},h("div",{style:"font-weight:800"},"+"+fmt(out.coins)+" عملة سبايدر"))))}
function codeReveal(r){
  sfx("unlock");buzz([20,40,20]);
  const out=r.out,hasItems=out.items.length>0,first=out.items[0],one=first&&out.items.length===1&&first.t!=="emote";
  openSheet((c,close)=>{
    add(c,h("div",{class:"bigemo"},ic("gift")),h("h3",{class:"center"},hasItems?"فتحت عنصرًا سريًا!":"تم تفعيل الكود!"),r.def.bundle?h("p",{class:"lead center"},r.def.bundle):null);
    const box=h("div",{class:"reveal"});c.append(box);coinsRow(box,out,revealList(box,out,.35));
    c.append(h("div",{class:"row"},one?h("button",{class:"primary",onclick:async()=>{try{await Act.equip(first.t,first.id)}catch(x){toast(x.message,"bad");return}onEquipChanged();close();toast("لبست "+findItem(first.t,first.id).name,"good")}},"استخدمه الحين"):null,
      h("button",{class:one?"":"primary",onclick:close},"تمام")));
  },()=>afterGains(out));
}
function bundleReveal(out,title,sub,list,label,sound){
  sfx(sound||"founder");buzz([40,60,40,60,120]);
  openSheet((c,close)=>{
    c.append(title,h("p",{class:"lead center"},sub));
    const box=h("div",{class:"reveal"});c.append(box);const d=revealList(box,out,.5);coinsRow(box,out,d);
    if(!out.items.length)box.append(h("p",{class:"hint center"},"كل عناصرها عندك من قبل."));
    c.append(h("div",{class:"row"},h("button",{class:"primary",onclick:async()=>{const items={};for(const [t,id] of list)if(t!=="emote")items[t]=id;try{await Act.equipMany(items)}catch(x){toast(x.message,"bad");return}onEquipChanged();close();toast(label,"good")}},"لبّسها الحين"),h("button",{onclick:close},"بعدين")));
  },()=>afterGains(out));
}
const FOUNDER_LIST=[["skin","founder"],["frame","founder"],["badge","founder"],["theme","founder"],["title","founder"]];
function founderReveal(out){
  bundleReveal(out,h("div",{class:"founder-row"},h("span",{class:"crown","aria-hidden":"true"},ic("crown")),h("div",{class:"founder-h"},"FOUNDER UNLOCKED"),h("span",{class:"crown","aria-hidden":"true"},ic("crown"))),
    "حزمة المؤسس صارت لك. ما تنباع ولا تنفتح إلا بهالكود.",FOUNDER_LIST,"لبست حزمة المؤسس");
}
function creatorReveal(out){
  bundleReveal(out,h("div",{class:"creator-h"},ic("crown")," THE CREATOR HAS ARRIVED"),"حزمة الخالق حصرية لصاحب اللعبة: ما تنباع، ولا تجي من مستوى أو إنجاز أو كود عام.",
    CREATOR_BUNDLE.filter(([t])=>t!=="emote"),"لبست حزمة الخالق");
}
function openCodeSheet(){
  openSheet((c)=>{const inp=h("input",{maxlength:"32",autocomplete:"off",autocapitalize:"characters",spellcheck:"false",placeholder:"مثال: ABCD-1234","aria-label":"الكود السري",style:"direction:ltr;text-align:center;letter-spacing:.12em;text-transform:uppercase"});
    const msg=h("p",{class:"hidden",role:"status"}),btn=h("button",{class:"primary",style:"flex:none;padding:0 18px"},"استخدم الكود");
    btn.addEventListener("click",()=>submitCode(inp,msg,btn));inp.addEventListener("keydown",e=>{if(e.key==="Enter")btn.click()});
    c.append(h("h3",{class:"ic-h"},ic("key"),"عندك كود سري؟"),h("p",{class:"lead"},"كل كود ينفع مرة وحدة لكل حساب. الحروف الكبيرة والصغيرة والشرطة ما تفرق."),h("div",{class:"row codebox"},inp,btn),msg)});
}

/* ================= profile ================= */
let pfTab="stats",colTab="skin",editingName=false;
const PF_TABS=[["stats","الإحصائيات"],["friends","أصحابي"],["collection","المجموعة"],["loadouts","تنسيقاتي"],["ach","الإنجازات"],["missions","المهام"],["levels","المستويات"],["history","السجل"],["settings","الإعدادات"]];
const AVATAR_ICONS=[["spark","شرارة"],["moon","قمر"],["star","نجمة"],["heart","قلب"],["crown","تاج"],["bolt","برق"],["flame","لهب"],["globe","عالم"],["target","هدف"],["medal","ميدالية"],["cloud","غيم"],["eye","عين"]];
const CHAT_PRESETS=[["hi","هلا والله"],["come","يلا تعال"],["nice","كفو عليك"],["wait","استنى شوي"],["gg","لعبة حلوة"],["again","نلعب مرة ثانية؟"],["fast","يلا بسرعة"],["luck","حظ أوفر"]];
const CHAT_EMOJI=[["e0","😂"],["e1","🔥"],["e2","👏"],["e3","😎"],["e4","🕸️"],["e5","👍"],["e6","😮"],["e7","❤️"]];
let JOIN_CODE=(()=>{try{const q=new URLSearchParams(location.search).get("join")||"";const c=q.toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,4);return /^[A-Z0-9]{4}$/.test(c)?c:""}catch(e){return ""}})();
let JOIN_GAME=(()=>{try{const g=new URLSearchParams(location.search).get("g");return g==="domino"||g==="chess"?g:""}catch(e){return ""}})();
let INVITE_GAME="";
function localFriendCode(){
  const A="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let h=2166136261;const s=String((P&&P.id)||"spider");
  for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);
  let o="";for(let i=0;i<6;i++){o+=A[Math.abs(h)%32];h=Math.imul(h,1664525)+1013904223}
  return o;
}
function chatLabel(id){const p=CHAT_PRESETS.find(x=>x[0]===id);if(p)return p[1];const e=CHAT_EMOJI.find(x=>x[0]===id);return e?e[1]:""}
const DIFF=["—","سهل","متوسط","صعب"];
function netRank(){if(Platform.kind==="web"){const rows=lbCache&&lbCache.rows;if(!rows)return 0;const k=rows.findIndex(r=>r.id===cid);return k<0?0:k+1}return (lbSorted().find(r=>r.me)||{}).rank||0}
const qstat=(icon,v,label)=>h("div",{class:"qs"},h("span",{class:"qsi"},icon),h("b",{},v),h("span",{},label));
function segBar(frac,label,n){
  n=n||12;const on=Math.round(Math.max(0,Math.min(1,frac))*n);
  return h("div",{class:"segbar",role:"progressbar","aria-valuemin":"0","aria-valuemax":"100","aria-valuenow":String(Math.round(frac*100)),"aria-label":label},...Array.from({length:n},(_,k)=>h("i",{class:k<on?"on":""})));
}
function renderProfileHead(){
  bgClass($("pfCover"),eff("bg"));
  const head=$("pfHead");head.textContent="";
  const li=levelInfo(P.xp),rank=netRank(),wr=P.totalGames?Math.round(P.wins/P.totalGames*100):0;
  const nameRow=editingName
    ?h("div",{class:"namebox"},h("input",{id:"nameIn",maxlength:"16",value:P.nickname,placeholder:"اسمك","aria-label":"اسمك",autocomplete:"nickname"}),h("button",{class:"primary small",onclick:saveName},"حفظ"))
    :h("div",{class:"pf-name"},nameEl(displayName(),eff("theme")),badgeEl(eff("badge")),Owner.verified?ownerTag():null,
       h("button",{class:"icon edit","aria-label":"غيّر اسمك",onclick:()=>{editingName=true;renderProfileHead();const i=$("nameIn");i.focus();i.select()}},ic("edit")));
  head.append(h("div",{class:"pf-av"},myAvatar(100)),nameRow,h("div",{class:"pf-title"},effItem("title").name),
    h("div",{class:"pf-level"},h("span",{class:"lvl-badge","aria-hidden":"true"},fmt(li.L)),
      h("div",{class:"grow"},h("div",{class:"prow"},h("span",{},"المستوى "+fmt(li.L)),h("span",{class:"faint"},li.need?fmt(li.into)+" / "+fmt(li.need)+" XP":"أعلى مستوى")),progressBar(li.pct*100,"تقدم المستوى"))),
    h("div",{class:"pf-quick"},qstat(ic("trophy"),fmt(P.wins),"انتصار"),qstat(ic("percent"),fmt(wr)+"٪","نسبة الفوز"),qstat(ic("flame"),fmt(P.bestWinStreak),"أفضل سلسلة")),
    h("div",{class:"pf-wallet"},h("button",{class:"coinchip",onclick:()=>show("store"),"aria-label":"رصيدك، افتح المتجر"},ic("coin","gold"),h("span",{},coinsText())),
      rank?h("span",{class:"chip sm"},ic("trophy"),"#"+fmt(rank)+" هالأسبوع"):null,
      P.currentWinStreak>=2?h("span",{class:"chip sm hot"},ic("flame"),fmt(P.currentWinStreak)+" فوز متتالي"):null));
  if(editingName){const i=$("nameIn");i.addEventListener("keydown",e=>{if(e.key==="Enter")saveName();if(e.key==="Escape"){editingName=false;renderProfileHead()}})}
}
function colTotals(){let total=0,owned=0;for(const t in CATS){const v=visibleItems(t);total+=v.length;owned+=v.filter(i=>isOwned(t,i.id)).length}return {total,owned}}
const COL_RANK={owner:6,secret:5,legendary:4,epic:3,rare:2,common:1};
function renderColPrev(){
  const box=$("pfColPrev");box.textContent="";
  const {total,owned}=colTotals(),best=[];
  for(const t in CATS)for(const it of CATS[t])if(t!=="emote"&&it.how!=="free"&&isOwned(t,it.id))best.push([t,it]);
  best.sort((a,b)=>(COL_RANK[b[1].rar]||0)-(COL_RANK[a[1].rar]||0));
  box.append(h("div",{class:"card colprev"},
    h("div",{class:"cp-head"},h("span",{class:"cp-t"},ic("layers"),h("b",{},"مجموعتي")),h("span",{class:"faint"},fmt(owned)+" / "+fmt(total))),
    segBar(owned/Math.max(1,total),"اكتمال المجموعة",16),
    best.length?h("div",{class:"cgrid cp-items"},...best.slice(0,3).map(([t,it])=>colTile(t,it,true))):h("p",{class:"hint",style:"margin:10px 0 0"},"اجمع عناصر من المتجر والمستويات والمهام، وتطلع أبرزها هنا."),
    h("button",{class:"wide cp-all",onclick:()=>{pfTab="collection";renderProfile();$("pfTabs").scrollIntoView({block:"start"})}},ic("grid"),"كل المقتنيات"),
  ));
}
async function saveName(){const i=$("nameIn"),v=(i?i.value:"").trim().slice(0,16);try{await Act.setNick(v)}catch(x){toast(x.message,"bad");return}editingName=false;if(room)pushPresence();onEquipChanged();renderProfileHead();toast("انحفظ اسمك","good")}
function renderProfile(){
  renderProfileHead();renderColPrev();
  $("pfOwner").classList.toggle("hidden",!Owner.verified);
  const ac=$("acctCard");if(ac)ac.remove();const acn=accountCard();if(acn)$("pfTabs").before(acn);
  tabs($("pfTabs"),PF_TABS,pfTab,id=>{pfTab=id;renderProfile()});
  const b=$("pfBody");b.textContent="";
  ({stats:pfStats,friends:pfFriends,collection:pfCollection,loadouts:pfLoadouts,ach:pfAch,missions:pfMissions,levels:pfLevels,history:pfHistory,settings:pfSettings}[pfTab]||pfStats)(b);
}
const stat=(v,label)=>h("div",{class:"stat"},h("b",{},v),h("span",{},label));
const visibleItems=t=>CATS[t].filter(it=>!isOwnerItem(it)||Owner.verified||isOwned(t,it.id));
function pfIdentity(b){
  const cur=AVATAR_ICONS.some(x=>x[0]===P.avatarIcon)?P.avatarIcon:"spark";
  const grid=h("div",{class:"av-pick",role:"group","aria-label":"اختر أيقونة"});
  for(const [id,name] of AVATAR_ICONS){
    grid.append(h("button",{type:"button",class:id===cur?"on":"","aria-pressed":String(id===cur),"aria-label":name,onclick:async()=>{
      P.avatarIcon=id;saveProfile();
      if(Cloud.on){try{const r=await api("social_card",{avatar:id,fav:P.favGame||""});if(r&&r.profile)applyProfile(r.profile);P.avatarIcon=id}catch(e){toast(e.message,"bad")}}
      renderProfile();
    }},ic(id),h("span",{},name)));
  }
  const fav=h("select",{"aria-label":"لعبتك المفضلة",onchange:async e=>{
    P.favGame=e.target.value;saveProfile();
    if(Cloud.on){try{const r=await api("social_card",{avatar:P.avatarIcon||"spark",fav:P.favGame||""});if(r&&r.profile)applyProfile(r.profile);P.favGame=e.target.value}catch(err){toast(err.message,"bad")}}
  }},h("option",{value:""},"بدون"),...GAMES.map(g=>h("option",{value:g.id,selected:(P.favGame||"")===g.id},g.nameAr)));
  const li=levelInfo(P.xp);
  b.append(h("div",{class:"card",id:"pfIdentity"},
    h("h3",{style:"margin:0 0 8px"},"صورتك"),
    h("p",{class:"hint",style:"margin:0 0 8px"},"أيقونات جاهزة من اللعبة. ما فيه رفع صور، وإيميلك ما يظهر لأحد."),
    grid,
    h("div",{class:"pf-level",style:"margin-top:12px"},h("span",{class:"lvl-badge","aria-hidden":"true"},fmt(li.L)),h("div",{class:"grow"},h("div",{class:"prow"},h("span",{},"المستوى "+fmt(li.L)),h("span",{class:"faint"},"الإنجازات من تبويبها")))),
    h("span",{class:"lbl mt"},"لعبتك المفضلة"),fav));
}
function pfStats(b){
  pfIdentity(b);
  const wr=P.totalGames?Math.round(P.wins/P.totalGames*100):0;
  const ring=h("div",{class:"wr-ring",role:"img","aria-label":"نسبة الفوز "+fmt(wr)+"٪"});
  ring.innerHTML='<svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="10"/><circle cx="60" cy="60" r="50" fill="none" stroke="url(#wrg)" stroke-width="10" stroke-linecap="round" stroke-dasharray="'+(wr*3.1416).toFixed(1)+' 400" transform="rotate(-90 60 60)"/><defs><linearGradient id="wrg"><stop offset="0" stop-color="#E62948"/><stop offset="1" stop-color="#8D65F6"/></linearGradient></defs></svg>';
  ring.append(h("div",{class:"wr-in"},h("b",{},fmt(wr)+"٪"),h("span",{},"نسبة الفوز")));
  b.append(h("div",{class:"card wr-card"},ring,h("div",{class:"wr-side"},
    h("div",{class:"wr-row"},h("span",{},"المباريات"),h("b",{},fmt(P.totalGames))),h("div",{class:"wr-row"},h("span",{},"الانتصارات"),h("b",{class:"good-t"},fmt(P.wins))),h("div",{class:"wr-row"},h("span",{},"الخسائر"),h("b",{},fmt(P.losses))))));
  b.append(h("div",{class:"stats"},
    stat(fmt(P.currentWinStreak),"السلسلة الحالية"),stat(fmt(P.bestWinStreak),"أفضل سلسلة"),
    stat(fmt(P.onlineWins)+" / "+fmt(P.onlineGames),"فوز / مباريات أونلاين"),stat(fmt(P.botWins)+" / "+fmt(P.botGames),"فوز / مباريات ضد الكمبيوتر"),
    stat(DIFF[P.highestBotDifficulty],"أصعب مستوى هزمته")));
  let fav=null,favN=0;for(const k in P.skinUse)if(P.skinUse[k]>favN){favN=P.skinUse[k];fav=k}
  const favSk=findItem("skin",fav);
  const mostMode=P.modeCount.online||P.modeCount.bot?(P.modeCount.online>P.modeCount.bot?"أونلاين":"ضد الكمبيوتر"):"—";
  let total=0,owned=0,secrets=0;for(const t in CATS){const v=visibleItems(t);total+=v.length;owned+=v.filter(i=>isOwned(t,i.id)).length;secrets+=CATS[t].filter(i=>i.rar==="secret").length}
  const earned=P.claimedAchievements.length-P.adminAch.length;
  b.append(h("div",{class:"sec-h"},h("h3",{},"إحصائيات متقدمة")),h("div",{class:"stats"},
    h("div",{class:"stat"},h("b",{},favSk?ballSvg(favSk,26):null,favSk?favSk.name:"—"),h("span",{},"السكن المفضل")),
    stat(fmt(P.totalWalls),"خيوط مدّيتها"),stat(fmt(P.totalMoves),"مجموع الحركات"),
    stat(mmss(P.totalGames?P.totalDurationMs/P.totalGames:0),"متوسط مدة المباراة"),stat(mmss(P.fastestWinMs),"أسرع فوز"),
    stat(mostMode,"الوضع الأكثر لعبًا"),stat(fmt(earned)+" / "+fmt(ACHS.length),"إنجازات باللعب"),
    stat(fmt(owned)+" / "+fmt(total),"العناصر المملوكة"),stat(fmt(P.discoveredSecrets.length)+" / "+fmt(secrets),"أسرار مكتشفة")));
  b.append(h("p",{class:"hint"},"تنحسب المباريات ضد الكمبيوتر والأونلاين. مباريات نفس الجوال وجولات التدريب ما تدخل."+(P.adminAch.length?" الإنجازات اللي فتحتها من لوحة المالك ("+fmt(P.adminAch.length)+") ما تنحسب هنا.":"")));
}
let colOwn="all",colRar="all",colShow=60;
function colTile(t,it,compact){
  const owned=isOwned(t,it.id),eq=P.equipped[t]===it.id&&t!=="emote";
  if(!owned&&it.rar==="secret")return h("div",{class:"ctile r-secret unknown",role:"img","aria-label":"عنصر سري ما انكشف"},h("div",{class:"ct-art"},h("span",{class:"q"},"?")),h("div",{class:"ct-nm"},"???"),h("div",{class:"ct-sub"},RARITY.secret));
  const tile=h("div",{class:"ctile r-"+it.rar+(owned?"":" locked")+(eq?" eq":""),role:"button",tabindex:"0","data-k":t+":"+it.id,
    "aria-label":it.name+"، "+CAT_ONE[t]+"، "+RARITY[it.rar]+(owned?(eq?"، مستخدم":"، تملكه"):"، ما تملكه")});
  const open=()=>openItemSheet(t,it);
  tile.addEventListener("click",open);tile.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();open()}});
  tile.append(h("div",{class:"ct-art pv"},itemPreview(t,it),!owned?h("span",{class:"ct-lock"},ic("lock")):null,eq?h("span",{class:"ct-eq",title:"مستخدم"},ic("check")):null),
    h("div",{class:"ct-nm"},it.name),h("div",{class:"ct-sub"},compact?CAT_ONE[t]:RARITY[it.rar]));
  return tile;
}
const colCard=(t,it)=>colTile(t,it,false);
function pfCollection(b){
  const live=new Set(activeEvents().map(e=>e.id));
  const pool=t=>visibleItems(t).filter(it=>it.how!=="event"||live.has(it.event)||isOwned(t,it.id)).map(it=>[t,it]);
  if(colTab!=="all"&&!CATS[colTab])colTab="all";
  const chips=h("div",{class:"chips-row",role:"tablist","aria-label":"أقسام المجموعة"});
  for(const [id,name] of [["all","الكل"],...Object.keys(CATS).map(t=>[t,CAT_NAME[t]])]){
    const list=id==="all"?Object.keys(CATS).flatMap(pool):pool(id),own=list.filter(([t,it])=>isOwned(t,it.id)).length,on=colTab===id;
    chips.append(h("button",{class:"chip"+(on?" on":""),role:"tab","aria-selected":String(on),onclick:()=>{colTab=id;colShow=60;renderProfile()}},name,h("span",{class:"cnt"},fmt(own)+"/"+fmt(list.length))));
  }
  let items=colTab==="all"?Object.keys(CATS).flatMap(pool):pool(colTab);
  const own=items.filter(([t,it])=>isOwned(t,it.id)).length,total=items.length;
  const fOwn=h("div",{class:"seg-mini",role:"radiogroup","aria-label":"حسب الملكية"},...[["all","الكل"],["owned","أملكه"],["missing","ناقصني"]].map(([v,l])=>h("button",{class:colOwn===v?"on":"",role:"radio","aria-checked":String(colOwn===v),onclick:()=>{colOwn=v;colShow=60;renderProfile()}},l)));
  const fRar=h("select",{"aria-label":"الندرة",onchange:e=>{colRar=e.target.value;colShow=60;renderProfile()}},
    ...[["all","كل الندرات"],["common",RARITY.common],["rare",RARITY.rare],["epic",RARITY.epic],["legendary",RARITY.legendary],["secret",RARITY.secret]].map(([v,l])=>h("option",{value:v,selected:colRar===v},l)));
  if(colOwn==="owned")items=items.filter(([t,it])=>isOwned(t,it.id));
  if(colOwn==="missing")items=items.filter(([t,it])=>!isOwned(t,it.id));
  if(colRar!=="all")items=items.filter(([t,it])=>it.rar===colRar);
  items.sort((a,c)=>(isOwned(c[0],c[1].id)-isOwned(a[0],a[1].id))||((COL_RANK[c[1].rar]||0)-(COL_RANK[a[1].rar]||0)));
  const grid=h("div",{class:"cgrid"},...items.slice(0,colShow).map(([t,it])=>colTile(t,it,colTab==="all")));
  b.append(chips,
    h("div",{class:"col-prog card"},h("div",{class:"cp-head"},h("b",{},"اكتمال "+(colTab==="all"?"المجموعة":CAT_NAME[colTab])),h("span",{class:"faint"},fmt(own)+" / "+fmt(total))),segBar(own/Math.max(1,total),"نسبة الاكتمال",16)),
    h("div",{class:"col-filters"},fOwn,fRar),
    items.length?grid:h("div",{class:"card empty"},h("p",{style:"margin:0"},colOwn==="owned"?"ما عندك عناصر هنا للحين.":"ما فيه عناصر بهالتصفية.")),
    items.length>colShow?h("button",{class:"wide",style:"margin-top:12px",onclick:()=>{colShow+=60;renderProfile()}},"عرض المزيد ("+fmt(items.length-colShow)+")"):null);
}
/* ----- loadouts ----- */
function loadoutCard(l){
  const miss=loadoutMissing(l,Owner.verified),I=t=>l.items[t]||DEFAULT_EQUIP[t];
  const cur=EQUIP_TYPES.every(t=>!l.items[t]||P.equipped[t]===l.items[t]);
  const card=h("div",{class:"lo"+(cur?" cur":"")});
  const edit=()=>{czStart(l);show("customize")};
  const brd=miniBoard(I("board"),{n:3,web:I("web")});brd.classList.add("lo-board");
  card.append(h("div",{class:"lo-stage"+(I("bg")!=="none"?" has-bg bg-"+I("bg"):"")},avatar(I("skin"),I("frame"),66,I("deco")),brd),
    h("div",{class:"lo-info"},
      h("div",{class:"nm"},h("span",{},l.name),cur?h("span",{class:"chip sm now"},ic("check"),"مستخدم الآن"):null),
      h("div",{class:"ptitle"},nameEl(displayName(),I("theme"))),
      h("div",{class:"lo-tags"},...["skin","board","web","win"].map(t=>{const it=findItem(t,I(t));return it?h("span",{class:"chip sm"},it.name):null})),
      miss.length?h("div",{class:"miss"},"ناقص "+plural(miss.length,"عنصر","عنصرين","عناصر","عنصر")+": "+miss.map(([t,id])=>{const it=findItem(t,id);return it?it.name:"?"}).join("، ")):null));
  card.append(h("div",{class:"acts"},
    h("button",{class:"primary",onclick:async()=>{let r;try{r=await Act.loadoutEquip(l.id)}catch(x){toast(x.message,"bad");return}r.missing=r.missing||[];onEquipChanged();sfx("unlock");toast(r.missing.length?"لبست التنسيق، وفيه "+plural(r.missing.length,"عنصر","عنصرين","عناصر","عنصر")+" ما تملكه":"لبست «"+l.name+"»",r.missing.length?"bad":"good");renderProfile()}},"لبّسه"),
    h("button",{onclick:edit},"تعديل"),
    h("button",{onclick:()=>renameSheet(l)},"إعادة تسمية"),
    h("button",{onclick:()=>confirmSheet("حذف التنسيق","تحذف «"+l.name+"»؟ ما ينحذف أي عنصر تملكه.","احذف",async()=>{try{await Act.loadoutDelete(l.id)}catch(x){toast(x.message,"bad");return}toast("انحذف التنسيق");refreshPage()})},"حذف")));
  return card;
}
function renameSheet(l){
  openSheet((c,close)=>{const inp=h("input",{maxlength:"24",value:l?l.name:"","aria-label":"اسم التنسيق",placeholder:"اسم التنسيق"});
    const go=async()=>{const v=inp.value.trim();if(!v){inp.classList.add("shake");return}
      if(l){try{await Act.loadoutUpdate(l.id,{name:v})}catch(x){toast(x.message,"bad");return}toast("تغيّر الاسم","good")}close()};
    inp.addEventListener("keydown",e=>{if(e.key==="Enter")go()});
    c.append(h("h3",{},"اسم التنسيق"),inp,h("div",{class:"row",style:"margin-top:12px"},h("button",{class:"primary",onclick:go},"حفظ"),h("button",{onclick:close},"إلغاء")))});
}
function newLoadoutSheet(items,after){
  if(P.loadouts.length>=6){toast("عندك ٦ تنسيقات، احذف وحدة أول","bad");return}
  openSheet((c,close)=>{const inp=h("input",{maxlength:"24",placeholder:"مثلاً: الليل الملكي","aria-label":"اسم التنسيق"});
    const go=async()=>{const v=inp.value.trim();if(!v){inp.classList.remove("shake");void inp.offsetWidth;inp.classList.add("shake");return}
      let r;try{r=await Act.loadoutSave(v,items)}catch(x){toast(x.message,"bad");return}close();
      sfx("unlock");toast("انحفظ «"+v+"»","good");for(const id of ((r.out&&r.out.ach)||[]))toast("إنجاز جديد: "+ACH_INDEX[id].name,"good");if(after)after();refreshPage()};
    inp.addEventListener("keydown",e=>{if(e.key==="Enter")go()});
    c.append(h("h3",{},"تنسيق جديد"),h("p",{class:"lead"},"يحفظ كل اللي لابسه: الكرة والإطار والزينة والخلفية والطاولة والخيوط والتأثيرات والأصوات."),inp,
      h("div",{class:"row",style:"margin-top:12px"},h("button",{class:"primary",onclick:go},"احفظ"),h("button",{onclick:close},"إلغاء")))});
}
const currentLook=()=>{const o={};for(const t of EQUIP_TYPES)o[t]=eff(t);return o};
function pfLoadouts(b){
  b.append(h("div",{class:"sec-h",style:"margin-top:0"},h("h3",{},"تنسيقاتي"),h("span",{},fmt(P.loadouts.length)+" / "+fmt(6))));
  b.append(h("button",{class:"primary wide",style:"margin-bottom:12px",disabled:P.loadouts.length>=6,onclick:()=>newLoadoutSheet(currentLook(),()=>renderProfile())},"＋ احفظ مظهري الحالي كتنسيق"));
  if(!P.loadouts.length)b.append(h("div",{class:"card empty"},h("div",{class:"empty-ic"},ic("layers")),h("p",{style:"margin:0"},"ما عندك تنسيقات للحين. خصّص مظهرك واحفظه، وبعدين تلبسه بضغطة.")));
  const list=h("div",{class:"list"});for(const l of P.loadouts)list.append(loadoutCard(l));b.append(list);
}
function pfAch(b){
  const done=P.claimedAchievements.length;
  b.append(h("div",{class:"sec-h",style:"margin-top:0"},h("h3",{},"الإنجازات"),h("span",{},fmt(done)+" / "+fmt(ACHS.length))));
  const list=h("div",{class:"list"});
  const order=ACHS.slice().sort((x,y)=>{const dx=P.claimedAchievements.includes(x.id),dy=P.claimedAchievements.includes(y.id);if(dx!==dy)return dx?1:-1;return (y.val(P)/y.goal)-(x.val(P)/x.goal)});
  for(const a of order){
    const got=P.claimedAchievements.includes(a.id),v=Math.min(a.goal,a.val(P)),admin=P.adminAch.includes(a.id);
    list.append(h("div",{class:"li"+(got?" done":"")},h("div",{class:"ic"},ic(got?(admin?"crown":"medal"):"lock")),
      h("div",{class:"grow"},h("div",{class:"t"},a.name),h("div",{class:"d"},a.desc+(admin?" (من لوحة المالك)":"")),
        !got&&a.goal>1?h("div",{style:"margin-top:6px"},h("div",{class:"bar2"},h("i",{style:"width:"+Math.round(v/a.goal*100)+"%"})),h("div",{class:"xpline"},h("span",{},fmt(v)+" / "+fmt(a.goal)))):null,
        rwChips(a.rw))));
  }
  b.append(list);
}
function missionRow(m,def){
  const pct=Math.round(m.p/def.t*100);
  return h("div",{class:"li"+(m.done?" done":"")},h("div",{class:"ic"},ic(m.done?"check":"target")),
    h("div",{class:"grow"},h("div",{class:"t"},def.n),
      h("div",{style:"margin-top:6px"},h("div",{class:"bar2"},h("i",{style:"width:"+pct+"%"})),h("div",{class:"xpline"},h("span",{},fmt(m.p)+" / "+fmt(def.t)),h("span",{},"+"+fmt(def.xp)+" XP، +"+fmt(def.c)+" عملة")))));
}
function pfMissions(b){
  ensureMissions();
  const dm=P.dailyMissions,wm=P.weeklyMissions;
  b.append(h("div",{class:"sec-h",style:"margin-top:0"},h("h3",{},"مهام اليوم"),h("span",{},"تتجدد بعد "+leftText(dayEndsAt()-clock.now()))),
    h("div",{class:"list"},dm.list.map(m=>missionRow(m,MISSION_INDEX[m.id])),
      h("div",{class:"li"+(dm.bonus?" done":"")},h("div",{class:"ic"},ic(dm.bonus?"star":"gift")),h("div",{class:"grow"},h("div",{class:"t"},"خلّص كل مهام اليوم"),h("div",{class:"d"},dm.bonus?"استلمتها اليوم":"مكافأة إضافية"),rwChips(DAILY_BONUS)))),
    h("div",{class:"sec-h"},h("h3",{},"مهام الأسبوع"),h("span",{},"تتجدد بعد "+leftText(weekEndsAt()-clock.now()))),
    h("div",{class:"list"},wm.list.map(m=>missionRow(m,MISSION_INDEX[m.id])),
      h("div",{class:"li"+(wm.bonus?" done":"")},h("div",{class:"ic"},ic(wm.bonus?"star":"gift")),h("div",{class:"grow"},h("div",{class:"t"},"خلّص كل مهام الأسبوع"),h("div",{class:"d"},wm.bonus?"استلمتها هالأسبوع":"مكافأة كبيرة"),rwChips(WEEKLY_BONUS)))),
    h("div",{class:"sec-h"},h("h3",{},"المكافأة اليومية")));
  const card=h("div",{class:"card"});loginCalendar(card,()=>renderProfile());b.append(card);
  b.append(h("p",{class:"hint"},"المهام تتقدم من المباريات ضد الكمبيوتر والأونلاين، ومكافآتها تنضاف لك تلقائيًا."));
}
function pfLevels(b){
  const L=P.level;
  b.append(h("div",{class:"sec-h",style:"margin-top:0"},h("h3",{},"مكافآت المستويات"),h("span",{},"مستواك "+fmt(L))));
  const box=h("div",{class:"scrollbox"}),list=h("div",{class:"list"});let nextRow=null;
  for(let l=2;l<=MAX_LEVEL;l++){
    const got=l<=L,next=l===L+1;
    const row=h("div",{class:"li"+(got?" done":"")+(next?" next":"")},h("div",{class:"lvnum"},fmt(l)),
      h("div",{class:"grow"},rwChips(levelRewards(l)),next?h("div",{class:"d",style:"margin-top:4px"},"المكافأة القادمة"):null),
      h("span",{class:"tag"},got?"✓":"المستوى "+fmt(l)));
    if(next)nextRow=row;list.append(row);
  }
  box.append(list);b.append(box);
  if(nextRow)requestAnimationFrame(()=>{box.scrollTop=Math.max(0,nextRow.offsetTop-box.offsetTop-80)});
}
function pfHistory(b){
  b.append(h("div",{class:"sec-h",style:"margin-top:0"},h("h3",{},"سجل المباريات"),h("span",{},"آخر "+fmt(20)+" مباراة")));
  if(!P.matchHistory.length){b.append(h("div",{class:"card empty"},h("div",{class:"empty-ic"},ic("clock")),h("p",{style:"margin:0 0 12px"},"ما لعبت مباراة محسوبة للحين."),h("button",{class:"primary",onclick:()=>show("home")},"العب ضد الكمبيوتر")));return}
  const df=(()=>{try{return new Intl.DateTimeFormat("ar-SA-u-ca-gregory",{day:"numeric",month:"short",hour:"numeric",minute:"2-digit",timeZone:"Asia/Riyadh"})}catch(e){return null}})();
  const list=h("div",{class:"list"});
  for(const m of P.matchHistory){
    list.append(h("div",{class:"li"},h("div",{class:"ic"},ic(m.won?"trophy":"swords")),
      h("div",{class:"grow"},
        h("div",{class:"t"},(m.won?"فوز":"خسارة")+(m.mode==="online"?" أونلاين":" ضد الكمبيوتر ("+(DIFF[m.lvl]||"")+")")),
        h("div",{class:"d"},"ضد "+(m.opp&&m.opp.length?m.opp.join(" و"):"—")),h("div",{class:"d"},df?df.format(m.at):""),
        h("div",{class:"rwchips"},h("span",{class:"rwc"},"⏱ "+mmss(m.dur)),h("span",{class:"rwc"},fmt(m.moves)+" حركة"),h("span",{class:"rwc"},fmt(m.walls)+" خيط"),
          h("span",{class:"rwc"},"+"+fmt(m.xp)+" XP"),h("span",{class:"rwc"},"+"+fmt(m.coins)+" عملة")))));
  }
  b.append(list);
}
function pfSettings(b){
  b.append(h("button",{class:"wide",style:"margin-bottom:10px;display:flex;align-items:center;justify-content:center;gap:8px",onclick:()=>show("about")},ic("spark"),"عن SPIDER والتواصل"));
  if(Platform.kind==="web"&&!isStandalone())b.append(h("button",{class:"wide",style:"margin-bottom:10px;display:flex;align-items:center;justify-content:center;gap:8px",onclick:openInstall},h("img",{src:APP_ICON,alt:"",style:"width:22px;height:22px;border-radius:6px"}),"ثبّت SPIDER على جوالك"));
  const sw=(on,fn)=>{const s=h("button",{class:"switch"+(on?" on":""),role:"switch","aria-checked":String(on),onclick:()=>{fn();renderProfile()}});return s};
  const card=h("div",{class:"card"});
  card.append(
    h("div",{class:"setrow"},h("div",{},h("div",{class:"t"},"الصوت"),h("div",{class:"d"},"أصوات الحركة والخيوط والفوز")),sw(!P.settings.mute,()=>{Act.settings({mute:!P.settings.mute});renderSound();if(!P.settings.mute)sfx("move")})),
    h("div",{class:"setrow"},h("div",{},h("div",{class:"t"},"المؤثرات الكاملة"),h("div",{class:"d"},"إذا طفّيتها: آثار الحركة وتأثيرات الفوز الكبيرة ما تطلع، والأداء أخف")),sw(P.settings.fx!=="lite",()=>{Act.settings({fx:P.settings.fx==="lite"?"full":"lite"})})),
    h("div",{class:"setrow"},h("div",{},h("div",{class:"t"},"تفاعلات اللاعبين الثانيين"),h("div",{class:"d"},"تشوف التفاعلات اللي يرسلها خصومك أثناء المباراة")),sw(!P.settings.muteEmotes,()=>{Act.settings({muteEmotes:!P.settings.muteEmotes})})),
    h("div",{class:"setrow"},h("div",{},h("div",{class:"t"},"حزمة الأصوات"),h("div",{class:"d"},effItem("sound").name)),h("button",{class:"small",onclick:()=>{czStart();czTab="sound";show("customize")}},"غيّر")));
  b.append(card);
  if(reduceMotion())b.append(h("p",{class:"hint"},"جهازك مضبوط على تقليل الحركة، فالمؤثرات تطلع خفيفة دايمًا."));
}

/* ================= customize screen ================= */
let czDraft=null,czLoadout=null,czTab="skin";
function czStart(l){czLoadout=l?l.id:null;czDraft=l?Object.assign(currentLook(),l.items):currentLook();czTab="skin"}
function czPreviewBoard(){
  const sv=miniBoard(czDraft.board,{n:5,web:czDraft.web,skin:findItem("skin",czDraft.skin)||SKINS[0],color:(findItem("skin",czDraft.skin)||SKINS[0]).c});
  return sv;
}
let czBoardSvg=null;
function renderCustomize(){
  if(!czDraft)czStart();
  const pv=$("czPreview");pv.textContent="";
  const card=h("div",{class:"cz-card"+(czDraft.bg!=="none"?" has-bg bg-"+czDraft.bg:"")});
  card.append(avatar(czDraft.skin,czDraft.frame,78,czDraft.deco),h("div",{style:"min-width:0"},
    h("div",{class:"pname"},nameEl(displayName(),czDraft.theme),badgeEl(czDraft.badge)),h("div",{class:"ptitle"},(findItem("title",czDraft.title)||TITLES[0]).name),
    h("div",{class:"chips"},h("span",{class:"pill"},"الصوت: "+(findItem("sound",czDraft.sound)||SOUNDS[0]).name),h("span",{class:"pill"},"الغرفة: "+(findItem("lobby",czDraft.lobby)||LOBBIES[0]).name))));
  czBoardSvg=czPreviewBoard();
  const bw=h("div",{class:"cz-boardwrap",style:"background:"+(BOARD_STYLE[czDraft.board]||BOARD_STYLE.classic).box});bw.append(czBoardSvg);
  pv.append(card,bw);
  if(czLoadout){const l=P.loadouts.find(x=>x.id===czLoadout);if(l)pv.prepend(h("p",{class:"hint",style:"margin:0"},"تعدّل تنسيق «"+l.name+"»"))}
  tabs($("czTabs"),EQUIP_TYPES.map(t=>[t,CAT_NAME[t]]),czTab,id=>{czTab=id;renderCustomize()});
  const picks=$("czPicks");picks.textContent="";
  for(const it of CATS[czTab]){
    if(!isOwned(czTab,it.id)||(isOwnerItem(it)&&!Owner.verified))continue;
    const on=czDraft[czTab]===it.id;
    const b=h("button",{class:"cz-pick"+(on?" sel":""),"aria-pressed":String(on),onclick:()=>{czDraft[czTab]=it.id;sfx(czTab==="sound"?"move":"move",czTab==="sound"?it.id:null);renderCustomize()}},
      h("div",{class:"pv"},czTab==="title"?h("span",{style:"font-size:12px;font-weight:800"},"«"+it.name+"»"):czTab==="theme"?h("span",{style:"font-weight:800"},nameEl("أ ب",it.id)):itemMini(czTab,it)),
      h("span",{},it.name));
    picks.append(b);
  }
  const lock=CATS[czTab].filter(it=>!isOwned(czTab,it.id)&&(!isOwnerItem(it)||Owner.verified)).length;
  if(lock)picks.append(h("button",{class:"cz-pick",onclick:()=>{stTab=czTab;show("store")}},h("div",{class:"pv"},ic("bag")),h("span",{},"فيه "+fmt(lock)+" ما تملكها")));
  $("czSaveLo").textContent=czLoadout?"حدّث التنسيق":"احفظ كتنسيق";
}
$("czTryMove").addEventListener("click",()=>{if(!czBoardSvg)return;const id=czDraft.move;if(id==="none"){toast("ما اخترت تأثير حركة");return}
  if(lite()){toast("المؤثرات الخفيفة شغّالة، شغّل الكاملة من الإعدادات");return}
  const p=czBoardSvg._pawn;trailFx(czBoardSvg._fx,[4,2],[3,2],id,czBoardSvg._b.glow);p.style.transition="transform .32s cubic-bezier(.3,1.35,.5,1)";p.style.transform=`translate(${2.5*S}px,${3.5*S}px)`;
  setTimeout(()=>{trailFx(czBoardSvg._fx,[3,2],[4,2],id,czBoardSvg._b.glow);p.style.transform=`translate(${2.5*S}px,${4.5*S}px)`},700)});
$("czTryWin").addEventListener("click",()=>{if(!czBoardSvg)return;const sk=findItem("skin",czDraft.skin)||SKINS[0];victoryFx(czBoardSvg._fx,2.5*S,4.5*S,czDraft.win,sk.c,czBoardSvg._b.glow);sfx("win",czDraft.sound)});
$("czSave").addEventListener("click",async()=>{
  try{if(czLoadout)await Act.loadoutUpdate(czLoadout,{items:czDraft});await Act.equipMany(czDraft)}catch(x){toast(x.message,"bad");return}
  onEquipChanged();sfx("unlock");toast("انحفظ مظهرك","good");czDraft=null;czLoadout=null;pfTab=pfTab||"stats";show("profile");
});
$("czSaveLo").addEventListener("click",async()=>{
  if(czLoadout){try{await Act.loadoutUpdate(czLoadout,{items:czDraft})}catch(x){toast(x.message,"bad");return}toast("تحدّث التنسيق","good");czDraft=null;czLoadout=null;pfTab="loadouts";show("profile");return}
  newLoadoutSheet(Object.assign({},czDraft),()=>{pfTab="loadouts"});
});
const czExit=()=>{czDraft=null;czLoadout=null;show("profile")};
$("czCancel").addEventListener("click",czExit);$("czBack").addEventListener("click",czExit);
$("pfCustomize").addEventListener("click",()=>{czStart();show("customize")});
$("pfCode").addEventListener("click",openCodeSheet);
$("pfLogin").addEventListener("click",openLogin);
$("pfSetBtn").addEventListener("click",()=>{pfTab="settings";renderProfile();$("pfTabs").scrollIntoView({block:"start"})});
$("pfOwner").addEventListener("click",()=>show("owner"));
$("homeStrip").addEventListener("click",()=>show("profile"));

/* ----- friends ----- */
let frCache=null,frLoading=false;
async function loadFriends(){
  if(frLoading)return;frLoading=true;
  try{
    if(Platform.kind!=="web"||!Cloud.on)frCache={offline:true,friendCode:localFriendCode(),friends:[],incoming:[],outgoing:[],blocked:[],count:0};
    else{try{frCache=await api("social_list",{})}catch(e){if(/غير معروف/.test(String(e.message||"")))frCache=await api("friends_list",{});else throw e}}
  }catch(e){frCache={error:softenErr(e.message)||e.message}}
  frLoading=false;if(screen==="profile"&&pfTab==="friends")renderProfile();
}
function friendView(f){
  if(f&&f.card){const c=f.card,pub=sanPub(c.pub,!!c.is_owner)||{};return {id:f.id,nick:c.nickname||"لاعب",level:c.level||1,seen:c.updated_at,avatar:"spark",pub,owner:!!(f.owner||c.is_owner)}}
  return {id:f.id,nick:f.nick||"لاعب",level:f.level||1,seen:f.seen,avatar:AVATAR_ICONS.some(x=>x[0]===f.avatar)?f.avatar:"spark",pub:null,owner:false};
}
function seenLabel(s){const t=Date.parse(s||"");if(!t)return "ما دخل قريب";const m=Math.round((Date.now()-t)/60000);if(m<2)return "متصل";return lastSeen(s)}
const lastSeen=s=>{const t=Date.parse(s||"");if(!t)return "";const m=Math.round((Date.now()-t)/60000);return m<10?"نشط الحين":m<60?"نشط قبل "+fmt(m)+" دقيقة":m<1440?"نشط قبل "+fmt(Math.round(m/60))+" ساعة":"نشط قبل "+fmt(Math.round(m/1440))+" يوم"};
function friendRow(f,kind){
  const v=friendView(f),pub=v.pub||{},sk=SKINS[pub.sk]||SKINS[0];
  const face=v.pub?avatar(sk.id,pub.fr,44,pub.dc):h("span",{class:"pc-ball","aria-hidden":"true"},ic(v.avatar));
  const acts=[];
  const social=!!(frCache&&frCache.friendCode);
  if(kind==="in")acts.push(h("button",{class:"primary small",onclick:()=>frAct(social?"social_respond":"friend_respond",{id:v.id,accept:true},"صرتوا أصحاب")},"قبول"),h("button",{class:"small",onclick:()=>frAct(social?"social_respond":"friend_respond",{id:v.id,accept:false},"انرفض الطلب")},"رفض"));
  else if(kind==="out")acts.push(h("span",{class:"tagc"},"بانتظار الرد"));
  else if(kind==="hit")acts.push(h("button",{class:"primary small",onclick:()=>frAct("social_request",{id:v.id},"انرسل الطلب")},"أضف"));
  else if(kind==="block")acts.push(h("button",{class:"small",onclick:()=>frAct("social_block",{id:v.id,on:false},"انفك الحظر")},"فك الحظر"));
  else{if(Owner.verified&&!v.owner)acts.push(h("button",{class:"small",onclick:()=>giftTo(v.id,v.nick)},ic("gift"),"هدية"));
    if(!v.owner)acts.push(h("button",{class:"small",onclick:()=>confirmSheet("حذف صاحب","تحذف "+v.nick+" من أصحابك؟","احذف",()=>frAct(social?"social_remove":"friend_remove",{id:v.id},"انحذف"))},"حذف"),
      social?h("button",{class:"small",onclick:()=>confirmSheet("حظر","ما يقدر "+v.nick+" يرسل لك أو يبقى من أصحابك.","احظر",()=>frAct("social_block",{id:v.id,on:true},"انحظر"))},"حظر"):null)}
  return h("div",{class:"frow"},face,h("div",{class:"grow"},h("div",{class:"fn"},nameEl(v.nick,pub.th),pub.bd?badgeEl(pub.bd,16):null,v.owner?ownerTag():null),
    h("div",{class:"fm"},"المستوى "+fmt(v.level||1)+(kind==="hit"?"":" · "+seenLabel(v.seen)))),...acts);
}
async function frAct(action,payload,ok){try{await api(action,payload);toast(ok,"good");frCache=null;loadFriends()}catch(e){toast(e.message,"bad")}}
function pfFriends(b){
  if(!frCache){b.append(h("div",{class:"skel",style:"height:120px"}));loadFriends();return}
  if(frCache.error){b.append(h("p",{class:"err"},softenErr(frCache.error)||frCache.error),h("button",{onclick:()=>{frCache=null;renderProfile()}},"حاول مرة ثانية"));return}
  const code=(frCache.friendCode)||localFriendCode();
  const inp=h("input",{id:"friendQ",placeholder:"اسم اللاعب أو كود الصاحب",maxlength:"16","aria-label":"ابحث بالاسم أو بالكود"});
  const hits=h("div",{class:"list",id:"friendHits"});
  const add=h("button",{class:"primary",style:"flex:none;padding:0 16px",onclick:async()=>{
    const v=inp.value.trim();if(v.length<2){toast("اكتب حرفين على الأقل");return}
    if(!Cloud.on){toast(OFFLINE_MSG);return}
    add.disabled=true;hits.textContent="";
    try{const r=await api("social_search",{q:v});const rows=r&&r.rows||[];
      if(!rows.length)hits.append(h("p",{class:"hint"},"ما لقينا أحد."));
      else for(const f of rows)hits.append(friendRow(f,"hit"));
    }catch(e){toast(e.message,"bad")}finally{add.disabled=false}}},"دور");
  b.append(h("div",{class:"card center",id:"friendCodeCard"},h("span",{class:"lbl"},"كود صاحبك"),h("div",{class:"fcode"},code),
    h("button",{type:"button",onclick:async()=>{try{await navigator.clipboard.writeText(code);toast("اننسخ الكود","good")}catch(e){toast(code,"good")}}},"انسخ الكود"),
    h("p",{class:"hint"},"البحث بالاسم أو بالكود. الإيميل ما ينرسل ولا يطلع في النتائج.")),
    h("div",{class:"card frhead"},h("div",{class:"fr-count"},h("b",{},fmt(frCache.count||0)),h("span",{},(frCache.count||0)===1?"صاحب":"أصحاب")),
      frCache.offline?h("p",{class:"hint"},OFFLINE_MSG):h("p",{class:"hint",style:"margin:6px 0 10px"},"المتصل ظهره خلال دقيقتين. الباقي آخر ظهور."),
      h("div",{class:"row"},inp,add),hits));
  const incoming=frCache.incoming||[],friends=frCache.friends||[],outgoing=frCache.outgoing||[],blocked=frCache.blocked||[];
  if(incoming.length){b.append(h("div",{class:"sec-h"},h("h3",{},"طلبات صداقة"),h("span",{},fmt(incoming.length))));const l=h("div",{class:"list"});for(const f of incoming)l.append(friendRow(f,"in"));b.append(l)}
  b.append(h("div",{class:"sec-h"},h("h3",{},"أصحابي")));const l=h("div",{class:"list"});
  if(!friends.length)l.append(h("p",{class:"hint",style:"margin:8px"},"ما عندك أصحاب هنا للحين."));
  for(const f of friends)l.append(friendRow(f,"ok"));b.append(l);
  if(outgoing.length){b.append(h("div",{class:"sec-h"},h("h3",{},"طلبات أرسلتها")));const o=h("div",{class:"list"});for(const f of outgoing)o.append(friendRow(f,"out"));b.append(o)}
  if(blocked.length){b.append(h("div",{class:"sec-h"},h("h3",{},"محظورين")));const o=h("div",{class:"list"});for(const f of blocked)o.append(friendRow(f,"block"));b.append(o)}
}
function giftTo(id,nick){
  openSheet((c,close)=>{
    const coins=h("input",{type:"number",min:"0",max:"100000",placeholder:"عدد العملات (اختياري)","aria-label":"عملات"});
    const cat=h("select",{"aria-label":"نوع العنصر"},h("option",{value:""},"بدون عنصر"),...Object.keys(CATS).filter(t=>t!=="emote").map(t=>h("option",{value:t},CAT_ONE[t])));
    const itemSel=h("select",{"aria-label":"العنصر",class:"hidden"});
    cat.onchange=()=>{itemSel.textContent="";itemSel.classList.toggle("hidden",!cat.value);if(cat.value)for(const it of CATS[cat.value])if(it.rar!=="owner")itemSel.append(h("option",{value:it.id},it.name+" ("+RARITY[it.rar]+")"))};
    const note=h("input",{maxlength:"120",placeholder:"رسالة مع الهدية (اختياري)","aria-label":"رسالة"});
    const send=h("button",{class:"primary",onclick:async()=>{send.disabled=true;
      try{await api("owner_gift",{id,coins:Number(coins.value)||0,item:cat.value?{t:cat.value,id:itemSel.value}:null,note:note.value});close();toast("وصلت الهدية لـ "+(nick||"اللاعب"),"good")}catch(e){toast(e.message,"bad")}finally{send.disabled=false}}},"أرسل الهدية");
    c.append(h("h3",{class:"ic-h"},ic("gift"),"هدية لـ "+(nick||"لاعب")),coins,h("div",{style:"margin-top:8px"},cat),h("div",{style:"margin-top:8px"},itemSel),h("div",{style:"margin-top:8px"},note),
      h("div",{class:"row",style:"margin-top:12px"},send,h("button",{onclick:close},"إلغاء")));
  });
}

/* ================= owner panel =================
   Only reachable when Claude says this viewer owns the artifact. Every action is logged and saved
   to the real profile on this device. Codes made here are stored in Claude's shared database,
   where only the artifact owner is allowed to write. */
let owBusy=false;
function ownerGuard(){if(!Owner.verified){toast("هذي الأداة لصاحب اللعبة بس","bad");return false}if(owBusy)return false;owBusy=true;setTimeout(()=>{owBusy=false},400);return true}
function amountSheet(title,label,onOk){
  openSheet((c,close)=>{const inp=h("input",{type:"number",inputmode:"numeric",min:"1",max:"10000000",placeholder:"مثلاً 1000","aria-label":label});
    let done=false;const go=()=>{if(done)return;const n=Math.floor(Number(inp.value));if(!(n>0)){inp.classList.remove("shake");void inp.offsetWidth;inp.classList.add("shake");return}done=true;close();onOk(n)};
    inp.addEventListener("keydown",e=>{if(e.key==="Enter")go()});
    c.append(h("h3",{},title),h("span",{class:"lbl"},label),inp,h("div",{class:"row",style:"margin-top:12px"},h("button",{class:"primary",onclick:go},"أضف"),h("button",{onclick:close},"إلغاء")))});
}
function ownerDone(out,msg){if(msg)toast(msg,"good");sfx("unlock");if(out)afterGains(out);refreshPage()}
async function ownerCall(cmd,extra,msg,reveal){
  let r;try{r=await Act.owner(cmd,extra)}catch(x){toast(x.message,"bad");return null}
  if(reveal)reveal(r.out||newOut());else ownerDone(r.out,msg);
  return r;
}
function runOwnerCmd(code){
  if(!ownerGuard())return;
  switch(code){
    case "GODMODE":show("owner");toast("لوحة المالك","good");break;
    case "MAXLEVEL":ownerCall("MAXLEVEL",null,"وصلت للمستوى "+fmt(MAX_LEVEL));break;
    case "INFINITECOINS":ownerCall("INFINITECOINS",null,null).then(r=>{if(r)toast(P.owner.infinite?"الرصيد صار غير محدود ∞":"رجع الرصيد العادي","good")});break;
    case "ADDCOINS":amountSheet("إضافة عملات","كم عملة؟",n=>ownerCall("ADDCOINS",{n},"انضاف "+fmt(n)+" عملة"));break;
    case "ADDXP":amountSheet("إضافة XP","كم XP؟",n=>ownerCall("ADDXP",{n},"انضاف "+fmt(n)+" XP"));break;
    case "UNLOCKALL":ownerCall("UNLOCKALL",null,"انفتح كل شي في اللعبة");break;
    case "SECRETALL":ownerCall("SECRETALL",null,"انفتحت كل العناصر السرية");break;
    case "ALLACHIEVEMENTS":ownerCall("ALLACHIEVEMENTS",null,"انفتحت كل الإنجازات");break;
    case "XPBOOST":ownerCall("XPBOOST",null,null).then(r=>{if(r)toast(P.owner.xpBoost?"XP ×١٠ شغّال":"XP ×١٠ طافي","good")});break;
    case "COINBOOST":ownerCall("COINBOOST",null,null).then(r=>{if(r)toast(P.owner.coinBoost?"العملات ×١٠ شغّال":"العملات ×١٠ طافي","good")});break;
    case "FOUNDERONLY":ownerCall("FOUNDERONLY",null,null,founderReveal);break;
    case "CREATOR":ownerCall("CREATOR",null,null,creatorReveal);break;
  }
}
function ownerGrantIdentity(){
  if(!Owner.verified||(isOwned("badge","owner")&&isOwned("title","owner")))return;
  Act.owner("IDENTITY").then(()=>{toast("تحقق إنك صاحب اللعبة. شارة ولقب OWNER صارت لك","good");refreshPage()}).catch(()=>{});
}
/* ----- shared codes (Claude database) ----- */
let owCodes=null,owCodesErr="";
async function loadOwnerCodes(){
  owCodesErr="";
  if(!Platform.db){owCodes=null;return}
  try{const snap=await Platform.db.collection("codes").get();owCodes=snap.docs.filter(d=>d.exists).map(d=>({id:d.id,...d.data()}))}
  catch(e){owCodes=null;owCodesErr="ما قدرت أقرأ الأكواد المشتركة"}
}
function rewardText(r){if(r.t==="coins")return fmt(r.n)+" عملة";if(r.t==="xp")return fmt(r.n)+" XP";const it=findItem(r.t,r.id);return it?CAT_ONE[r.t]+": "+it.name:"؟"}
function codeForm(box){
  const draft={rewards:[]};
  const codeIn=h("input",{maxlength:"24",placeholder:"الكود (حروف إنجليزية وأرقام)",style:"direction:ltr;text-align:center;letter-spacing:.1em;text-transform:uppercase","aria-label":"الكود"});
  const typeSel=h("select",{"aria-label":"نوع المكافأة"},h("option",{value:"coins"},"عملات"),h("option",{value:"xp"},"XP"),...Object.keys(CATS).map(t=>h("option",{value:t},CAT_ONE[t])));
  const valBox=h("div",{});const list=h("div",{class:"crow"});
  const fillVal=()=>{valBox.textContent="";const t=typeSel.value;
    if(t==="coins"||t==="xp")valBox.append(h("input",{type:"number",min:"1",max:"100000",placeholder:"الكمية","aria-label":"الكمية",id:"owAmt"}));
    else valBox.append(h("select",{id:"owItem","aria-label":"العنصر"},CATS[t].filter(it=>!isOwnerItem(it)&&it.how!=="free").map(it=>h("option",{value:it.id},it.name+" ("+RARITY[it.rar]+")"))))};
  typeSel.addEventListener("change",fillVal);fillVal();
  const showList=()=>{list.textContent="";draft.rewards.forEach((r,i)=>list.append(h("button",{class:"rwc",style:"min-height:30px;border-radius:999px;flex:none","aria-label":"شيل "+rewardText(r),onclick:()=>{draft.rewards.splice(i,1);showList()}},rewardText(r)+" ✕")));if(!draft.rewards.length)list.append(h("span",{class:"hint",style:"margin:0"},"ما أضفت مكافآت للحين"))};
  showList();
  const addBtn=h("button",{class:"small",onclick:()=>{const t=typeSel.value;
    if(t==="coins"||t==="xp"){const n=Math.floor(Number($("owAmt").value));if(!(n>0&&n<=100000)){toast("اكتب كمية من ١ إلى ١٠٠٬٠٠٠","bad");return}draft.rewards.push({t,n})}
    else{const id=$("owItem").value;if(!findItem(t,id))return;if(draft.rewards.some(r=>r.t===t&&r.id===id))return;draft.rewards.push({t,id})}
    if(draft.rewards.length>12)draft.rewards.length=12;showList()}},"＋ أضف مكافأة");
  const exp=h("input",{type:"date","aria-label":"تاريخ الانتهاء (اختياري)"});
  const label=h("input",{maxlength:"40",placeholder:"اسم يظهر للاعب (اختياري)","aria-label":"اسم الكود"});
    const save=h("button",{class:"primary wide",onclick:async()=>{
    const code=CodeService.normalize(codeIn.value);
    if(!/^[A-Z0-9]{3,24}$/.test(code)){toast("الكود من ٣ إلى ٢٤ حرف إنجليزي أو رقم","bad");return}
    if(OWNER_CMDS.has(code)){toast("هالاسم محجوز لأوامر المالك","bad");return}
    if(!draft.rewards.length){toast("أضف مكافأة وحدة على الأقل","bad");return}
    if(!Platform.db||!Owner.verified)return;
    save.disabled=true;
    try{await Platform.db.collection("codes").doc(code).set({rewards:cleanRewards(draft.rewards),active:true,expires:exp.value?exp.value+"T23:59:59+03:00":null,label:label.value.trim().slice(0,40),createdAt:Date.now()});
      ownerLog("CODE_CREATE",code);saveProfile();toast("انحفظ الكود "+code+" وصار يشتغل لكل اللاعبين","good");await loadOwnerCodes();renderOwner()}
    catch(e){toast("ما انحفظ الكود: "+((e&&e.message)||"خطأ"),"bad")}
    finally{save.disabled=false}}},"احفظ الكود");
  box.append(h("span",{class:"lbl"},"الكود"),codeIn,h("span",{class:"lbl mt"},"المكافآت"),h("div",{class:"row"},typeSel),h("div",{style:"margin-top:8px"},valBox),
    h("div",{style:"margin-top:8px"},addBtn),list,h("span",{class:"lbl mt"},"ينتهي (اختياري، بتوقيت السعودية)"),exp,h("span",{class:"lbl mt"},"اسم يظهر عند الفتح"),label,h("div",{style:"margin-top:12px"},save));
}
async function setCodeActive(id,active,builtin){
  if(!Platform.db||!Owner.verified)return;
  try{
    const ref=Platform.db.collection("codes").doc(id);
    if(builtin){if(active)await ref.delete();else await ref.set({override:true,active:false,createdAt:Date.now()})}
    else await ref.update({active});
    ownerLog(active?"CODE_ON":"CODE_OFF",id);saveProfile();await loadOwnerCodes();renderOwner();toast(active?"الكود "+id+" شغّال":"الكود "+id+" موقوف","good");
  }catch(e){toast("ما تغيّرت حالة الكود","bad")}
}
async function deleteCode(id){
  if(!Platform.db||!Owner.verified)return;
  try{await Platform.db.collection("codes").doc(id).delete();ownerLog("CODE_DELETE",id);saveProfile();await loadOwnerCodes();renderOwner();toast("انحذف الكود","good")}catch(e){toast("ما انحذف الكود","bad")}
}
let owTab="account";
const OW_TABS_WEB=[["dash","لوحة القيادة"],["perks","مزايا المالك"],["account","الحساب"],["items","المقتنيات"],["identity","الهوية"],["codes","الأكواد"],["messages","الرسائل"],["about","عن SPIDER"],["log","السجل"]];
const OW_TABS=[["perks","مزايا المالك"],["account","الحساب"],["items","المقتنيات"],["identity","الهوية"],["codes","الأكواد"],["log","السجل"]];
function renderOwner(){
  const b=$("owBody");b.textContent="";
  if(!Owner.verified){b.append(h("div",{class:"card empty"},"هذي الصفحة لصاحب اللعبة بس."));return}
  const web=Platform.kind==="web";
  b.append(h("div",{class:"card ocard"},h("div",{class:"ostat"},ic("check","ok"),h("span",{},web?"الخادم متحقق إن حسابك مالك اللعبة":"Claude متحقق إنك صاحب هذي اللعبة")),
    h("p",{class:"hint",style:"margin:6px 0 0"},web?"كل أداة هنا تنفذ على الخادم وتنحفظ في حسابك، وتطلع لك في أي جهاز تدخل منه. وكل عملية تنسجل في سجل الخادم.":"الأدوات هنا تحفظ على حسابك في هذا الجهاز. المزامنة بين الأجهزة تحتاج الخادم.")));
  const OT=web?OW_TABS_WEB:OW_TABS;if(!OT.some(x=>x[0]===owTab))owTab=OT[0][0];
  const tb=h("div",{class:"tabs"});tabs(tb,OT,owTab,id=>{owTab=id;renderOwner()});b.append(tb);
  const card=h("div",{class:"card ocard"});b.append(card);
  const li=levelInfo(P.xp);
  if(owTab==="account"){
    const lvIn=h("input",{type:"number",min:"1",max:String(MAX_LEVEL),value:String(li.L),"aria-label":"المستوى"});
    const sw=(on,key,cmd)=>h("button",{class:"switch"+(on?" on":""),role:"switch","aria-checked":String(on),onclick:()=>runOwnerCmd(cmd)});
    card.append(h("h3",{},"الحساب"),h("div",{class:"chips",style:"margin-bottom:12px"},h("span",{class:"pill"},"المستوى "+fmt(li.L)),h("span",{class:"pill coins"},coinEl(coinsText())),h("span",{class:"pill"},fmt(P.xp)+" XP")),
      h("span",{class:"lbl"},"عدّل المستوى (١ إلى ٥٠)"),h("div",{class:"row"},lvIn,h("button",{class:"primary small",style:"min-height:48px",onclick:()=>{if(!ownerGuard())return;const L=Math.floor(Number(lvIn.value));if(!(L>=1&&L<=MAX_LEVEL)){toast("المستوى من ١ إلى ٥٠","bad");return}ownerCall("SETLEVEL",{n:L},"صار مستواك "+fmt(L))}},"طبّق")),
      h("div",{class:"okgrid",style:"margin-top:10px"},h("button",{onclick:()=>runOwnerCmd("ADDXP")},"＋ XP"),h("button",{onclick:()=>runOwnerCmd("ADDCOINS")},"＋ عملات"),h("button",{onclick:()=>runOwnerCmd("MAXLEVEL")},"أعلى مستوى")),
      h("div",{class:"setrow",style:"margin-top:8px"},h("div",{},h("div",{class:"t"},"رصيد غير محدود ∞"),h("div",{class:"d"},"تشتري من المتجر بدون ما ينقص رصيدك")),sw(P.owner.infinite,"infinite","INFINITECOINS")),
      h("div",{class:"setrow"},h("div",{},h("div",{class:"t"},"XP ×١٠"),h("div",{class:"d"},"على مكافآت المباريات")),sw(P.owner.xpBoost,"xpBoost","XPBOOST")),
      h("div",{class:"setrow"},h("div",{},h("div",{class:"t"},"العملات ×١٠"),h("div",{class:"d"},"على مكافآت المباريات")),sw(P.owner.coinBoost,"coinBoost","COINBOOST")),
      h("p",{class:"hint"},"أدوات المالك ما تغيّر انتصاراتك ولا الترتيب الأسبوعي ولا قواعد اللعب."));
  }else if(owTab==="items"){
    card.append(h("h3",{},"افتح المقتنيات"),h("div",{class:"okgrid"},
      h("button",{class:"primary",onclick:()=>runOwnerCmd("UNLOCKALL")},"كل شي"),h("button",{onclick:()=>runOwnerCmd("SECRETALL")},"كل السرّي"),h("button",{onclick:()=>runOwnerCmd("ALLACHIEVEMENTS")},"كل الإنجازات"),
      ...Object.keys(CATS).map(t=>h("button",{onclick:()=>{if(!ownerGuard())return;ownerCall("UNLOCKTYPE",{t},"انفتحت كل "+CAT_NAME[t])}},"كل "+CAT_NAME[t]))),
      h("button",{class:"wide",style:"margin-top:12px",onclick:()=>{czStart();show("customize")}},"جهّز أي عنصر تملكه"));
  }else if(owTab==="identity"){
    const owned=[];for(const t in CATS)for(const it of CATS[t])if(isOwnerItem(it)&&isOwned(t,it.id))owned.push({t,id:it.id});
    card.append(h("h3",{},"هوية المالك"),h("div",{class:"okgrid"},
      h("button",{class:"primary",onclick:()=>runOwnerCmd("CREATOR")},"حزمة الخالق"),h("button",{onclick:()=>runOwnerCmd("FOUNDERONLY")},"حزمة المؤسس"),
      h("button",{onclick:async()=>{if(!ownerGuard())return;try{if(!isOwned("badge","owner"))await Act.owner("IDENTITY");await Act.equip("badge","owner")}catch(x){toast(x.message,"bad");return}onEquipChanged();ownerDone(null,"لبست شارة OWNER")}},"لبّس شارة OWNER"),
      h("button",{onclick:async()=>{if(!ownerGuard())return;if(!isOwned("badge","founder")){toast("افتح حزمة المؤسس أول","bad");return}const it={};for(const [t,id] of FOUNDER_LIST)it[t]=id;try{await Act.equipMany(it)}catch(x){toast(x.message,"bad");return}onEquipChanged();ownerDone(null,"لبست حزمة المؤسس")}},"لبّس المؤسس"),
      h("button",{onclick:async()=>{if(!ownerGuard())return;if(!isOwned("skin","creator")){toast("افتح حزمة الخالق أول","bad");return}const it={};for(const [t,id] of CREATOR_BUNDLE)if(t!=="emote")it[t]=id;try{await Act.equipMany(it)}catch(x){toast(x.message,"bad");return}onEquipChanged();ownerDone(null,"لبست حزمة الخالق")}},"لبّس الخالق"),
      h("button",{onclick:()=>{czStart();show("customize")}},"اختر سكن وإطار ولون وتأثير")),
      h("div",{class:"sec-h"},h("h3",{},"مكافآت المالك"),h("span",{},fmt(owned.length))),
      owned.length?rwChips(owned):h("p",{class:"hint"},"ما فتحت عناصر حصرية للحين."));
  }else if(owTab==="perks"){renderOwnerPerks(card,web)
  }else if(owTab==="dash"&&web){renderOwnerDash(card)
  }else if(owTab==="messages"&&web){renderOwnerMessages(card)
  }else if(owTab==="about"&&web){renderOwnerAbout(card)
  }else if(owTab==="log"&&web){renderOwnerAudit(card)
  }else if(owTab==="codes"&&Platform.kind==="web"){renderNetOwnerCodes(card)
  }else if(owTab==="codes"){
    card.append(h("h3",{},"الأكواد السرية"));
    if(!Platform.db){card.append(h("p",{class:"hint"},"إنشاء الأكواد يحتاج قاعدة بيانات Claude، وما هي متاحة في هذا العرض. خارج Claude تحتاج الخادم."));}
    else{
      card.append(h("p",{class:"hint",style:"margin-top:0"},"الأكواد اللي تسويها هنا تنحفظ في قاعدة بيانات اللعبة، وكل لاعب يقدر يفعّلها مرة وحدة. حد الاستخدام العام وإحصائيات الاستخدام تحتاج الخادم."));
      const form=h("div",{});codeForm(form);card.append(form);
      if(owCodes===null&&!owCodesErr){card.append(h("p",{class:"hint"},"يحمّل الأكواد…"));loadOwnerCodes().then(()=>{if(screen==="owner"&&owTab==="codes")renderOwner()})}
      if(owCodesErr)card.append(h("p",{class:"err"},owCodesErr));
      const mine=(owCodes||[]).filter(c=>!c.override);
      card.append(h("div",{class:"sec-h"},h("h3",{},"أكوادك"),h("span",{},fmt(mine.length))));
      const l1=h("div",{class:"list"});
      for(const c of mine)l1.append(h("div",{class:"li"},h("div",{class:"grow"},h("div",{class:"t",style:"direction:ltr;text-align:right"},c.id),
        h("div",{class:"d"},(Array.isArray(c.rewards)?cleanRewards(c.rewards).map(rewardText).join("، "):"")+(c.expires?"، ينتهي "+String(c.expires).slice(0,10):"")+(c.active===false?"، موقوف":""))),
        h("button",{class:"small",onclick:()=>setCodeActive(c.id,c.active===false,false)},c.active===false?"شغّل":"أوقف"),
        h("button",{class:"small",onclick:()=>confirmSheet("حذف الكود","تحذف "+c.id+"؟ اللي فعّلوه يبقى معهم.","احذف",()=>deleteCode(c.id))},"حذف")));
      if(!mine.length)l1.append(h("p",{class:"hint"},"ما سويت أكواد للحين."));
      card.append(l1);
      const off=new Set((owCodes||[]).filter(c=>c.override&&c.active===false).map(c=>c.id));
      card.append(h("div",{class:"sec-h"},h("h3",{},"الأكواد المدمجة"),h("span",{},fmt(Object.keys(SECRET_CODES).length))));
      const l2=h("div",{class:"list"});
      for(const id of Object.keys(SECRET_CODES)){const on=!off.has(id);
        l2.append(h("div",{class:"li"},h("div",{class:"grow"},h("div",{class:"t",style:"direction:ltr;text-align:right"},id),h("div",{class:"d"},SECRET_CODES[id].rewards.map(rewardText).join("، ")+(on?"":"، موقوف"))),
          h("button",{class:"small",onclick:()=>setCodeActive(id,!on,true)},on?"أوقف":"شغّل")))}
      card.append(l2);
    }
  }else{
    const log=P.owner.log.slice().reverse();
    card.append(h("h3",{},"سجل العمليات"),log.length?h("div",{class:"olog"},log.slice(0,60).map(e=>h("div",{},h("code",{},e.cmd),h("span",{},(e.detail||"")+" ",h("span",{class:"tag"},new Date(e.at).toLocaleString("ar-SA-u-ca-gregory",{timeZone:"Asia/Riyadh",day:"numeric",month:"short",hour:"numeric",minute:"2-digit"})))))):h("p",{class:"hint"},"ما فيه عمليات للحين."));
  }
}
$("owBack").addEventListener("click",()=>show("profile"));

/* ----- codes on the web version: stored and checked on the server ----- */
let netCodes=null,netCodesErr="";
async function loadNetCodes(){try{const r=await api("owner_codes",{});netCodes=r.codes;netCodesErr=""}catch(e){netCodesErr=e.message}if(screen==="owner"&&owTab==="codes")renderOwner()}
async function netCodeCall(action,payload,ok){try{const r=await api(action,payload);netCodes=r.codes;if(ok)toast(ok,"good");renderOwner()}catch(e){toast(e.message,"bad")}}
function renderNetOwnerCodes(card){
  card.append(h("h3",{},"الأكواد السرية"),h("p",{class:"hint",style:"margin-top:0"},"الكود يتحقق منه الخادم، وكل لاعب يستخدمه مرة وحدة. تقدر تحدد عدد الاستخدامات وتاريخ الانتهاء."));
  const draft={rewards:[]};
  const codeIn=h("input",{maxlength:"24",placeholder:"الكود (حروف إنجليزية وأرقام)",style:"direction:ltr;text-align:center;letter-spacing:.1em;text-transform:uppercase","aria-label":"الكود"});
  const typeSel=h("select",{"aria-label":"نوع المكافأة"},h("option",{value:"coins"},"عملات"),h("option",{value:"xp"},"XP"),...Object.keys(CATS).map(t=>h("option",{value:t},CAT_ONE[t])));
  const valBox=h("div",{}),list=h("div",{class:"crow"});
  const fill=()=>{valBox.textContent="";const t=typeSel.value;
    if(t==="coins"||t==="xp")valBox.append(h("input",{type:"number",min:"1",max:"100000",placeholder:"الكمية","aria-label":"الكمية",id:"owAmt"}));
    else valBox.append(h("select",{id:"owItem","aria-label":"العنصر"},CATS[t].filter(it=>!isOwnerItem(it)&&it.how!=="free").map(it=>h("option",{value:it.id},it.name+" ("+RARITY[it.rar]+")"))))};
  typeSel.addEventListener("change",fill);fill();
  const show=()=>{list.textContent="";draft.rewards.forEach((r,i)=>list.append(h("button",{class:"rwc",style:"min-height:30px;border-radius:999px;flex:none",onclick:()=>{draft.rewards.splice(i,1);show()}},rewardText(r)+" ✕")));if(!draft.rewards.length)list.append(h("span",{class:"hint",style:"margin:0"},"ما أضفت مكافآت للحين"))};show();
  const addBtn=h("button",{class:"small",onclick:()=>{const t=typeSel.value;
    if(t==="coins"||t==="xp"){const n=Math.floor(Number($("owAmt").value));if(!(n>0&&n<=100000)){toast("اكتب كمية من ١ إلى ١٠٠٬٠٠٠","bad");return}draft.rewards.push({t,n})}
    else{const id=$("owItem").value;if(!findItem(t,id)||draft.rewards.some(r=>r.t===t&&r.id===id))return;draft.rewards.push({t,id})}show()}},"＋ أضف مكافأة");
  const uses=h("input",{type:"number",min:"1",placeholder:"بدون حد","aria-label":"عدد الاستخدامات"});
  const exp=h("input",{type:"date","aria-label":"تاريخ الانتهاء"});
  const label=h("input",{maxlength:"40",placeholder:"اسم يظهر للاعب (اختياري)","aria-label":"اسم الكود"});
  const grp=h("select",{"aria-label":"بديل لكود"},h("option",{value:""},"كود جديد مستقل"),...(netCodes||[]).map(c=>h("option",{value:c.code},"بديل لـ "+codeShow(c.code)+" (نفس المكافأة مرة وحدة)")));
  const save=h("button",{class:"primary wide",onclick:async()=>{
    if(!draft.rewards.length){toast("أضف مكافأة وحدة على الأقل","bad");return}
    save.disabled=true;await netCodeCall("owner_code_save",{code:codeIn.value,grp:grp.value||null,rewards:draft.rewards,max_uses:uses.value?Number(uses.value):null,expires:exp.value?exp.value+"T23:59:59+03:00":null,label:label.value},"انحفظ الكود");save.disabled=false}},"احفظ الكود");
  card.append(h("span",{class:"lbl"},"الكود"),codeIn,h("span",{class:"lbl mt"},"المكافآت"),typeSel,h("div",{style:"margin-top:8px"},valBox),h("div",{style:"margin-top:8px"},addBtn),list,
    h("span",{class:"lbl mt"},"عدد الاستخدامات لكل اللاعبين (اختياري)"),uses,h("span",{class:"lbl mt"},"ينتهي (اختياري، بتوقيت السعودية)"),exp,h("span",{class:"lbl mt"},"اسم يظهر عند الفتح"),label,h("span",{class:"lbl mt"},"يشارك مكافأة كود ثاني؟"),grp,h("div",{style:"margin-top:12px"},save));
  if(netCodes===null&&!netCodesErr){card.append(h("p",{class:"hint"},"يحمّل الأكواد…"));loadNetCodes()}
  if(netCodesErr)card.append(h("p",{class:"err"},netCodesErr));
  const all=netCodes||[];
  card.append(h("div",{class:"sec-h"},h("h3",{},"كل الأكواد"),h("span",{},fmt(all.length))));
  const l=h("div",{class:"list"});
  for(const c of all)l.append(h("div",{class:"li"},h("div",{class:"grow"},h("div",{class:"t",style:"direction:ltr;text-align:right"},codeShow(c.code)+(c.grp&&c.grp!==c.code?"  ↔ "+codeShow(c.grp):""),c.builtin?h("span",{class:"tagc",style:"margin-inline-start:6px"},"أساسي"):null),
    h("div",{class:"d"},cleanRewards(c.rewards).map(rewardText).join("، ")),
    h("div",{class:"d"},"استُخدم "+fmt(c.uses||0)+(c.max_uses?" من "+fmt(c.max_uses):"")+(c.expires_at?"، ينتهي "+String(c.expires_at).slice(0,10):"")+(c.active?"":"، موقوف"))),
    h("button",{class:"small",onclick:()=>netCodeCall("owner_code_set",{code:c.code,active:!c.active},c.active?"انوقف الكود":"اشتغل الكود")},c.active?"أوقف":"شغّل"),
    c.builtin?null:h("button",{class:"small",onclick:()=>confirmSheet("حذف الكود","تحذف "+c.code+"؟ اللي فعّلوه يبقى معهم.","احذف",()=>netCodeCall("owner_code_set",{code:c.code,delete:true},"انحذف الكود"))},"حذف")));
  card.append(l);
  card.append(h("div",{class:"sec-h"},h("h3",{},"آخر الاستخدامات")));
  const v=ownCache.red;if(!v){card.append(h("div",{class:"skel",style:"height:60px"}));ownLoad("red","owner_redemptions");return}
  if(v.error){card.append(h("p",{class:"err"},v.error));return}
  const hl=h("div",{class:"list"});for(const r of v.rows.slice(0,30))hl.append(h("div",{class:"li"},h("div",{class:"grow"},h("div",{class:"t",style:"direction:ltr;text-align:right"},codeShow(r.code)),h("div",{class:"d"},r.nick+" · "+fmtTime(r.at)))));
  if(!v.rows.length)hl.append(h("p",{class:"hint"},"ما انستخدم أي كود للحين."));card.append(hl);
}

/* ----- owner (web): dashboard, messages, about page, server log ----- */
const ownCache={};
async function ownLoad(key,action,payload){try{ownCache[key]=await api(action,payload||{})}catch(e){ownCache[key]={error:e.message}}if(screen==="owner")renderOwner()}
function ownState(card,key,action){const v=ownCache[key];if(!v){card.append(h("div",{class:"skel",style:"height:90px"}));ownLoad(key,action);return null}if(v.error){card.append(h("p",{class:"err"},v.error),h("button",{onclick:()=>{delete ownCache[key];renderOwner()}},"حاول مرة ثانية"));return null}return v}
const fmtTime=s=>{const d=new Date(s);return isNaN(d)?"":d.toLocaleString("ar-SA-u-ca-gregory",{dateStyle:"short",timeStyle:"short"})};
function renderOwnerDash(card){
  card.append(h("h3",{class:"ic-h"},ic("chart"),"لوحة القيادة"));
  const v=ownState(card,"stats","owner_stats");if(!v)return;const s=v.stats;
  const tile=(n,l,i)=>h("div",{class:"otile"},ic(i),h("b",{},fmt(n)),h("span",{},l));
  card.append(h("div",{class:"otiles"},tile(s.players,"لاعب مسجّل","users"),tile(s.weekGames,"مباراة أونلاين هالأسبوع","swords"),tile(s.playing,"مباراة شغّالة الحين","bolt"),
    tile(s.open,"غرفة انتظار مفتوحة","globe"),tile(s.redeemedToday,"كود انستخدم آخر ٢٤ ساعة","key"),tile(s.newMessages,"رسالة جديدة","inbox")),
    h("button",{class:"wide",style:"margin-top:12px",onclick:()=>{delete ownCache.stats;renderOwner()}},"تحديث"));
}
const FB_KIND={idea:"اقتراح",bug:"مشكلة",player:"بلاغ عن لاعب",question:"استفسار",partner:"تعاون"};
function renderOwnerMessages(card){
  card.append(h("h3",{class:"ic-h"},ic("inbox"),"رسائل اللاعبين"));
  const v=ownState(card,"fb","owner_feedback");if(!v)return;
  if(!v.rows.length){card.append(h("p",{class:"hint"},"ما وصلت رسائل للحين."));return}
  for(const m of v.rows)card.append(h("div",{class:"omsg"+(m.status==="new"?" new":"")},
    h("div",{class:"om-top"},h("span",{class:"tagc"+(m.kind==="bug"||m.kind==="player"?" warn":"")},FB_KIND[m.kind]||m.kind),h("b",{},m.title),h("span",{class:"faint"},fmtTime(m.created_at))),
    h("p",{},m.body),h("div",{class:"om-meta"},h("span",{},"من: "+(m.nickname||"لاعب")),m.contact?h("span",{style:"direction:ltr"},m.contact):null,m.status!=="new"?h("span",{class:"tagc ok"},m.status==="done"?"تم":"مقروءة"):null),
    h("div",{class:"row"},m.status==="new"?h("button",{class:"small",onclick:()=>ownLoad("fb","owner_feedback",{id:m.id,status:"read"})},"قريتها"):null,
      m.status!=="done"?h("button",{class:"small",onclick:()=>ownLoad("fb","owner_feedback",{id:m.id,status:"done"})},"تم"):null,
      h("button",{class:"small",onclick:()=>confirmSheet("حذف الرسالة","تحذف هالرسالة؟","احذف",()=>ownLoad("fb","owner_feedback",{id:m.id,status:"deleted"}))},"حذف"))));
}
function renderOwnerAbout(card){
  card.append(h("h3",{class:"ic-h"},ic("spark"),"صفحة عن SPIDER"));
  if(!aboutCache){card.append(h("div",{class:"skel",style:"height:90px"}));loadAbout().then(()=>{if(screen==="owner")renderOwner()});return}
  const a=aboutCache,dev=h("input",{maxlength:"40",value:a.dev||"","aria-label":"اسم المطوّر"}),wel=h("textarea",{maxlength:"400",rows:"3","aria-label":"رسالة الترحيب"});wel.value=a.welcome||"";
  card.append(h("p",{class:"hint",style:"margin-top:0"},"الرابط ما يطلع للاعبين إلا لو كتبته وفعّلت «يظهر»."),h("span",{class:"lbl"},"اسم المطوّر (Created by)"),dev,h("span",{class:"lbl mt"},"رسالة الترحيب"),wel);
  const rows={};
  for(const k of Object.keys(SOCIAL_META)){const v=(a.links||{})[k]||{};
    const inp=h("input",{value:v.url||"",placeholder:k==="email"?"name@example.com":k==="whatsapp"?"+9665xxxxxxxx":"https://…","aria-label":SOCIAL_META[k][0],style:"direction:ltr;text-align:left"});
    const on=h("button",{class:"switch"+(v.on?" on":""),role:"switch","aria-checked":String(!!v.on),"aria-label":"يظهر "+SOCIAL_META[k][0]});on.onclick=()=>{const x=!on.classList.contains("on");on.classList.toggle("on",x);on.setAttribute("aria-checked",String(x))};
    rows[k]={inp,on};card.append(h("div",{class:"olink"},h("span",{class:"ol-n"},ic(SOCIAL_META[k][1]),SOCIAL_META[k][0]),inp,on))}
  const save=h("button",{class:"primary wide",style:"margin-top:12px",onclick:async()=>{
    const links={};for(const k in rows){const u=rows[k].inp.value.trim();if(u)links[k]={url:u,on:rows[k].on.classList.contains("on")}}
    save.disabled=true;try{const r=await api("owner_about_save",{dev:dev.value,welcome:wel.value,links});aboutCache=r.about;aboutAt=Date.now();toast("انحفظت صفحة عن SPIDER","good")}catch(e){toast(e.message,"bad")}finally{save.disabled=false}}},"احفظ");
  card.append(save);
}
const AUDIT_LABEL={ADDCOINS:"إضافة عملات",ADDXP:"إضافة XP",SETLEVEL:"تعديل المستوى",MAXLEVEL:"أعلى مستوى",INFINITECOINS:"الرصيد غير المحدود",XPBOOST:"XP ×١٠",COINBOOST:"العملات ×١٠",UNLOCKALL:"فتح كل شي",SECRETALL:"فتح السري",UNLOCKTYPE:"فتح قسم",ALLACHIEVEMENTS:"كل الإنجازات",FOUNDERONLY:"حزمة المؤسس",CREATOR:"حزمة الخالق",IDENTITY:"هوية المالك",CODE_SAVE:"حفظ كود",CODE_ON:"تشغيل كود",CODE_OFF:"إيقاف كود",CODE_DELETE:"حذف كود",ABOUT_SAVE:"تعديل صفحة عن SPIDER"};
function renderOwnerAudit(card){
  card.append(h("h3",{class:"ic-h"},ic("clock"),"سجل الخادم"));
  const v=ownState(card,"audit","owner_audit");if(!v)return;
  if(!v.rows.length){card.append(h("p",{class:"hint"},"ما فيه عمليات للحين."));return}
  const l=h("div",{class:"list"});for(const r of v.rows){const d=r.detail||{};l.append(h("div",{class:"li"},h("div",{class:"grow"},h("div",{class:"t"},AUDIT_LABEL[r.action]||r.action),h("div",{class:"d"},(d.code?"الكود "+d.code+" · ":"")+(d.n?"الكمية "+fmt(d.n)+" · ":"")+fmtTime(r.created_at)))))}
  card.append(l);
}
const codeShow=c=>c.length===8?c.slice(0,4)+"-"+c.slice(4):c;

/* ----- owner perks: private match views, announcement, gifts ----- */
function renderOwnerPerks(card,web){
  card.append(h("h3",{class:"ic-h"},ic("crown"),"مزايا المالك"),h("p",{class:"hint",style:"margin-top:0"},"تظهر لك أنت بس، ومحد يعرف إنها شغّالة."));
  const sw=(k,cmd,label,desc)=>{const on=!!(P.owner&&P.owner[k]);const b=h("button",{class:"switch"+(on?" on":""),role:"switch","aria-checked":String(on),"aria-label":label,onclick:async()=>{b.disabled=true;try{await Act.owner(cmd);toast(label+(P.owner[k]?" شغّال":" طافي"),"good")}catch(e){toast(e.message,"bad")}renderOwner()}});
    return h("div",{class:"setrow"},h("div",{class:"grow"},h("b",{},label),h("div",{class:"hint",style:"margin:2px 0 0"},desc)),b)};
  card.append(sw("seeSteps","SEESTEPS","عدّاد الخطوات","يبين لك كم خطوة باقية لكل لاعب في WEBBOUND."),
    sw("seePath","SEEPATH","كشف مسار الخصم","يرسم أقصر طريق لكل خصم على الطاولة."),
    sw("seeHint","SEEHINT","تلميح أحسن حركة","زر «تلميح» في دورك: WEBBOUND، وWEBGRID، وXO∞، والضامة، وحرب الخيوط."),
    sw("seeSecrets","SEESECRETS","كشف الأسرار","تشوف نرد الكل في كذّاب، وذباب خصمك، وأدوار «مين العنكبوت؟»، وكلمة WORDWEB."),
    sw("slowLine","SLOWLINE","تبطيء WEBLINE","العنكبوت يمشي أبطأ في تحدي اليوم واللعب الحر."),
    sw("nestUndo","NESTUNDO","تراجع في بيت العنكبوت","زر يرجّع آخر حركة، والخادم يقبل النتيجة عادي."),
    sw("bcPower","BCPOWER","قوة المالك في BALL CLASH","فريقك ياخذ ٣٠٪ صحة وضرر زيادة، والخادم يحسبها في التحقق."),
    sw("stealth","STEALTH","وضع التخفي","يخفي تاج OWNER والدخلة الملكية وأشكالك الخاصة عن اللاعبين."));
  if(!web)return;
  card.append(h("div",{class:"sec-h"},h("h3",{class:"ic-h"},ic("bolt"),"إعلان لكل اللاعبين")));
  const txt=h("textarea",{maxlength:"240",rows:"3",placeholder:"مثال: تحديث جديد الليلة الساعة ٩!","aria-label":"نص الإعلان"});
  const cur=ownCache.ann;if(!cur){api("announce_get",{}).then(r=>{ownCache.ann=r.announce;if(screen==="owner"&&owTab==="perks")renderOwner()}).catch(()=>{})}else txt.value=cur.text||"";
  const save=on=>async()=>{try{const r=await api("owner_announce_save",{text:txt.value,on});ownCache.ann=r.announce;Cloud.announce=r.announce.on?r.announce:null;toast(on&&r.announce.on?"الإعلان ظاهر للكل الحين":"الإعلان مخفي","good");renderOwner()}catch(e){toast(e.message,"bad")}};
  card.append(txt,h("div",{class:"row",style:"margin-top:8px"},h("button",{class:"primary",onclick:save(true)},"انشر الإعلان"),h("button",{onclick:save(false)},"أخفِه")),
    cur?h("p",{class:"hint"},cur.on?"الإعلان ظاهر الحين.":"ما فيه إعلان ظاهر."):null);
  card.append(h("div",{class:"sec-h"},h("h3",{class:"ic-h"},ic("gift"),"هدية للاعب")),h("p",{class:"hint",style:"margin-top:0"},"اكتب اسم المستخدم حقه، أو أرسلها من «أصحابي» (كل اللاعبين عندك هناك)."));
  const un=h("input",{placeholder:"اسم المستخدم",autocapitalize:"none",spellcheck:"false",style:"direction:ltr;text-align:left","aria-label":"اسم المستخدم"});
  card.append(h("div",{class:"row"},un,h("button",{style:"flex:none;padding:0 16px",onclick:async()=>{const v=un.value.trim().toLowerCase();if(!v)return;
    try{const r=await api("friend_add",{username:v}).catch(()=>null);}catch(e){}
    giftToUser(v)}},"اختر الهدية")));
}
function giftToUser(username){
  openSheet((c,close)=>{
    const coins=h("input",{type:"number",min:"0",max:"100000",placeholder:"عدد العملات","aria-label":"عملات"}),note=h("input",{maxlength:"120",placeholder:"رسالة (اختياري)","aria-label":"رسالة"});
    const send=h("button",{class:"primary",onclick:async()=>{send.disabled=true;try{const r=await api("owner_gift",{username,coins:Number(coins.value)||0,note:note.value});close();toast("وصلت الهدية لـ "+r.nick,"good")}catch(e){toast(e.message,"bad")}finally{send.disabled=false}}},"أرسل");
    c.append(h("h3",{class:"ic-h"},ic("gift"),"هدية لـ @"+username),coins,h("div",{style:"margin-top:8px"},note),h("div",{class:"row",style:"margin-top:12px"},send,h("button",{onclick:close},"إلغاء")));
  });
}

/* ================= about SPIDER & contact ================= */
const SOCIAL_META={instagram:["إنستغرام","s-instagram"],tiktok:["تيك توك","s-tiktok"],x:["X","s-x"],discord:["ديسكورد","s-discord"],email:["الإيميل","s-email"],whatsapp:["واتساب","s-whatsapp"]};
let aboutCache=null,aboutAt=0;
async function loadAbout(){
  if(Platform.kind!=="web")return;
  try{if(!Cloud.on)await cloudStart();const r=await api("about_get",{});aboutCache=r.about;aboutAt=Date.now();if(screen==="about")renderAbout()}catch(e){}
}
function socialHref(k,u){return k==="email"?"mailto:"+u:k==="whatsapp"?"https://wa.me/"+u.replace(/[^\d]/g,""):u}
function renderAbout(){
  const a=aboutCache||{dev:"Mohammed",welcome:"أهلًا فيك في SPIDER، منصة ألعاب عربية تجمعك بأصحابك. أول لعبة فيها WEBBOUND، والجاي أكثر.",links:{}};
  $("abWelcome").textContent=a.welcome;
  $("abDev").textContent="";$("abDev").append(ic("spark"),"Created by ",h("b",{},a.dev));
  const L=$("abLinks");L.textContent="";let n=0;
  for(const k of Object.keys(SOCIAL_META)){const v=a.links&&a.links[k];if(!v||!v.on||!v.url)continue;n++;
    L.append(h("a",{class:"ab-link",href:socialHref(k,v.url),target:"_blank",rel:"noopener noreferrer","aria-label":SOCIAL_META[k][0]},ic(SOCIAL_META[k][1]),h("span",{},SOCIAL_META[k][0])))}
  $("abLinksCard").classList.toggle("hidden",!n);
  const web=Platform.kind==="web";
  $("abFormCard").classList.toggle("hidden",!web);
  if(web&&(!aboutCache||Date.now()-aboutAt>60000))loadAbout();
}
$("abBack").addEventListener("click",()=>show(history.length>1&&lastScreen&&lastScreen!=="about"?lastScreen:"profile"));
$("homeAbout").addEventListener("click",()=>show("about"));
$("fbSend").addEventListener("click",async()=>{
  const msg=$("fbMsg"),btn=$("fbSend");const say=(t,c)=>{msg.textContent=t;msg.className=c;msg.classList.remove("hidden")};
  const title=$("fbTitle").value.trim(),body=$("fbBody").value.trim();
  if(title.length<3){say("اكتب عنوان أوضح.","err");return}if(body.length<10){say("اكتب تفاصيل أكثر (١٠ أحرف على الأقل).","err");return}
  btn.disabled=true;btn.textContent="يرسل…";
  try{await api("feedback_send",{kind:$("fbKind").value,title,body,contact:$("fbContact").value.trim(),website:$("fbWebsite").value});
    $("fbTitle").value="";$("fbBody").value="";$("fbContact").value="";say("وصلت رسالتك، شكرًا لك.","ok");sfx("unlock")}
  catch(e){say(e.message,"err")}finally{btn.disabled=false;btn.textContent="أرسل"}
});

/* ================= platform (Claude-only features stay behind this) ================= */
/* The web version (GitHub Pages) talks to this Supabase project. The publishable key is
   meant to be public; never put a secret/service_role key here. */
const ONLINE_CONFIG={url:"https://xaqcqeenythjxadyflmr.supabase.co",key:"sb_publishable_4FL2grSmTjbiLa4SHXhpNg_i3w-k3GG"};
const SUPABASE_JS="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js";
const Platform={user:null,room:null,db:null,kind:"none",ready:null};
function loadScript(src){return new Promise((ok,bad)=>{const s=document.createElement("script");s.src=src;s.async=true;s.onload=()=>ok();s.onerror=()=>bad(new Error("load"));document.head.append(s)})}
Platform.ready=(async()=>{
  await new Promise(res=>requestAnimationFrame(()=>requestAnimationFrame(res)));
  const C=window.claude;
  if(C&&typeof C.use==="function"){
    Platform.kind="claude";
    let u=null,r=null,d=null;
    try{u=await C.use("user")}catch(e){}
    try{r=await C.use("room")}catch(e){}
    try{d=await C.use("db")}catch(e){}
    Platform.user=u;Platform.room=r;Platform.db=d;
    return;
  }
  if(!ONLINE_CONFIG.url||!ONLINE_CONFIG.key)return;
  try{
    if(!(window.supabase&&window.supabase.createClient))await loadScript(SUPABASE_JS);
    const sb=window.supabase;if(!sb||!sb.createClient)return;
    Cloud.sb=sb.createClient(ONLINE_CONFIG.url,ONLINE_CONFIG.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    Platform.kind="web";
  }catch(e){}
})();
const BOT_NAMES=["الرتيلاء","الصياد","أبو شبكة"];
const stepsTxt=d=>d>=99?"الطريق مسكّر":d===1?"باقي خطوة":d===2?"باقي خطوتين":d<=10?"باقي "+fmt(d)+" خطوات":"باقي "+fmt(d)+" خطوة";
/* ================= game state ================= */
let G=null,mode="local",tool="move",ghost=null,hist=[],winDismissed=-1;
let cid=P.id;
let room=null,roomCode="",isCreator=false,peers=[],unsubs=[],connected=false;
let botTimer=null,botSeq=-1,seenSeq=-1,seenAt=0,seenKey="",autoSkipSeq=-1,awayKey="",awaySince=0;
function stampSeen(){
  if(!G)return;
  const k=(G.mid||"")+"|"+G.seq+"|"+(G.rnd||0);
  if(k!==seenKey){seenKey=k;seenSeq=G.seq;seenAt=Date.now()}
}
let M=null,lastResult=null,winBuiltMid=null;
let emoteState=null,emoN=0,emoTimes=[],bubbles={},lastEmo={},trailSeq=-1,GLOW="url(#glow)";
const isOwnerId=id=>!!Owner.ownerId&&id===Owner.ownerId;
/* owner-only looks are shown only for the seat Claude confirms belongs to the artifact owner */
function seatIsOwner(i){
  const p=G&&G.players[i];if(!p||p.bot)return false;
  if(mode==="solo")return p.id===cid&&Owner.verified;
  if(mode==="room")return p.id===cid?Owner.verified:netRoster().some(r=>r.id===p.id&&r.owner);
  if(mode!=="online")return p.id==="L0"&&Owner.verified;
  if(p.id===cid)return Owner.verified;
  return isOwnerId(p.id)&&roster().some(r=>r.id===p.id&&r.owner);
}
const skinOf=i=>{const k=G&&G.players[i]?G.players[i].skin:i;let sk=SKINS[(k>=0&&k<SKINS.length)?k:0];if(isOwnerItem(sk)&&!seatIsOwner(i))sk=SKINS[i%6];return sk};
function onlineErr(msg){msg=softenErr(msg);const e=$("onlineErr");e.textContent=msg||"";e.classList.toggle("hidden",!msg)}
function setBusy(b){$("btnCreate").disabled=b;$("btnJoin").disabled=b;$("btnCreate").textContent=b?"جاري الاتصال…":"سوّ غرفة جديدة"}

/* ================= online room ================= */
async function enterRoom(code,creator){
  onlineErr("");setBusy(true);
  await Platform.ready;
  if(Platform.kind==="web"){setBusy(false);return netRoomEnter(creator,code)}
  if(!Platform.room){setBusy(false);onlineErr(window.claude?"التحدي أونلاين يشتغل لما تفتح اللعبة من رابطها داخل Claude وأنت مسجّل دخول. تقدر تلعب ضد الكمبيوتر أو على نفس الجوال الحين.":"ما قدرت أتصل بخادم الأونلاين. تأكد من الإنترنت وجرّب مرة ثانية.");return}
  let r;
  try{r=await Platform.room.join("spider-"+code.toLowerCase())}
  catch(e){setBusy(false);onlineErr("ما قدرت أدخل الغرفة. تأكد إن صاحب اللعبة دعاك لها، وجرّب مرة ثانية.");return}
  room=r;roomCode=code;isCreator=creator;mode="online";G=null;hist=[];peers=[];connected=false;
  try{peers=room.peers()}catch(e){}
  unsubs.push(room.onPeers(ch=>{peers=ch.peers;onPeers()},()=>{}));
  unsubs.push(room.onConnection(c=>{connected=c;renderConn()},()=>{connected=false;renderConn()}));
  pushPresence();setBusy(false);
  $("lobbyCode").textContent=code;show("lobby");renderConn();
}
function pushPresence(){if(room)room.presence({cid,nick:myNick(),skin:skinIdx(eff("skin")),host:isCreator,timer:P.settings.timer,lt:eff("lobby"),bs:eff("board"),g:G,pub:myPub(Owner.verified),em:emoteState}).catch(()=>{})}
function leaveRoom(){
  for(const u of unsubs){try{u()}catch(e){}}unsubs=[];
  if(room){const r=room;room=null;r.leave().catch(()=>{})}
  peers=[];connected=false;
}
function roster(){
  if(mode==="room")return netRoster();
  const m=new Map();
  for(const p of peers){
    const pr=p.presence||{};
    /* identity comes from the platform stamp (by) whenever it exists; the self-declared cid is a fallback */
    const pid=typeof p.by==="string"&&p.by?p.by:(typeof pr.cid==="string"?pr.cid:"");if(!pid)continue;
    const own=!!p.by&&isOwnerId(p.by),bs=findItem("board",pr.bs),lt=findItem("lobby",pr.lt),em=pr.em&&typeof pr.em==="object"?pr.em:null,emi=em&&findItem("emote",em.id);
    const e={id:pid.slice(0,64),nick:String(pr.nick||"لاعب").slice(0,16),skin:(Number.isInteger(pr.skin)&&pr.skin>=0&&pr.skin<SKINS.length)?pr.skin:0,
      host:pr.host===true,timer:[0,30,60].includes(pr.timer)?pr.timer:0,isMe:!!p.isMe||pid===cid,owner:own,pub:sanPub(pr.pub,own),
      bs:bs&&(!isOwnerItem(bs)||own)?pr.bs:"classic",lt:lt?pr.lt:"classic",
      em:emi&&(!isOwnerItem(emi)||own)&&Number.isInteger(em.n)?{id:em.id,n:em.n}:null};
    const old=m.get(e.id);if(!old||(e.host&&!old.host))m.set(e.id,e);
  }
  return [...m.values()];
}
const pubMap=()=>{const o={};for(const r of roster())o[r.id]=r.pub;return o};
function hostEntry(r){r=r||roster();return r.find(p=>p.host)||r.slice().sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0)[0]||null}
function amHost(){if(mode==="room")return !!NG.room&&NG.room.host===cid;if(mode!=="online")return false;if(isCreator)return true;const x=hostEntry();return !!x&&x.id===cid}
function onPeers(){
  let best=null,bestBy=null;
  for(const p of peers){const g=sanitize(p.presence&&p.presence.g);if(g&&(!best||g.seq>best.seq)){best=g;bestBy=p.by||null}}
  if(best&&isOwnerItem(findItem("board",best.bs))&&!(bestBy&&isOwnerId(bestBy))&&!(bestBy===null&&Owner.verified))best.bs="classic";
  checkEmotes();
  if(best&&(!G||best.seq>G.seq)){
    const prev=G;G=best;ghost=null;
    if(!prev||prev.round!==G.round){tool="move";winDismissed=-1}
    afterChange(prev,"remote");pushPresence();
  }
  if(G){if(screen!=="game")show("game");render()}else renderLobby();
}
function renderConn(){
  $("connL").classList.toggle("on",connected);$("connGd").classList.toggle("on",connected);
  $("connLt").textContent=connected?"متصل":"يتصل…";
  $("connG").classList.toggle("hidden",!(mode==="online"||mode==="room"));$("roomTag").textContent=roomCode;
}
function renderLobby(){renderLobbyBase();if(mode==="room")decorateNetLobby()}
function renderLobbyBase(){
  if(screen!=="lobby")return;
  const turnTimer=$("timerSeg");if(turnTimer){turnTimer.classList.remove("hidden");if(turnTimer.previousElementSibling)turnTimer.previousElementSibling.classList.remove("hidden")}
  let r=roster(),hst=hostEntry(r),host=amHost();
  if(mode==="invite"){
    r=[{id:cid||"me",nick:myNick(),skin:skinIdx(eff("skin")),host:true,isMe:true,owner:!!Owner.verified,pub:myPub(Owner.verified),lt:eff("lobby"),bs:eff("board"),timer:P.settings.timer}];
    hst=r[0];host=true;
  }
  r.sort((a,b)=>((hst&&b.id===hst.id)-(hst&&a.id===hst.id))||(a.id<b.id?-1:a.id>b.id?1:0));
  const list=$("lobbyList");list.textContent="";
  if(!r.length)list.append(h("li",{},"يتصل بالغرفة…"));
  r.forEach((p,k)=>{
    const pub=p.isMe?myPub(Owner.verified):p.pub,t=findItem("title",pub.ti);
    list.append(h("li",{},avatar(SKINS[p.skin].id,pub.fr,40,pub.dc),
      h("div",{class:"who"},h("span",{class:"nm"},nameEl(p.nick,pub.th),badgeEl(pub.bd),(p.isMe?Owner.verified:p.owner)?ownerTag():null,p.isMe?h("span",{class:"tag"},"(أنت)"):null),
        h("span",{class:"sub"},(t?t.name+"، ":"")+"المستوى "+fmt(pub.lv))),
      h("span",{class:"tag"},(hst&&p.id===hst.id?"صاحب الغرفة":"")+(k>=4?"يتفرّج":"")+(p.here===false?" غير متصل":""))));
  });
  const rs=mode==="room"&&NG.room?(NG.room.settings||{}):null;
  const lt=rs?(rs.lt||"classic"):host?eff("lobby"):(hst?hst.lt:"classic");
  for(const c of [...$("lobby").classList])if(c.startsWith("lt-"))$("lobby").classList.remove(c);
  $("lobby").classList.add("lt-"+lt);
  const th=$("lobbyThemes");th.textContent="";
  for(const it of LOBBIES){if(host&&!isOwned("lobby",it.id))continue;if(!host&&it.id!==lt)continue;
    th.append(h("button",{class:"tab"+(it.id===lt?" on":""),disabled:!host,"aria-pressed":String(it.id===lt),onclick:async()=>{if(mode==="room"){try{await Act.equip("lobby",it.id);await api("room_me",{code:roomCode})}catch(x){toast(x.message,"bad")}return}equip("lobby",it.id);pushPresence();renderLobby()}},it.name))}
  const bsName=(findItem("board",rs?(rs.bs||"classic"):host?eff("board"):(hst?hst.bs:"classic"))||BOARDS[0]).name;
  $("lobbyBoard").textContent=host?"طاولة المباراة: "+bsName+". تغيّرها من «تخصيص المظهر».":"طاولة المباراة: "+bsName+" (يختارها صاحب الغرفة)";
  const sk=$("skinsLobby");sk.textContent="";
  for(const id of P.owned.skin){const it=findItem("skin",id),on=eff("skin")===id;if(isOwnerItem(it)&&!Owner.verified)continue;
    sk.append(h("button",{type:"button",class:"skin"+(on?" sel":""),"aria-pressed":String(on),"aria-label":it.name,title:it.name,
      onclick:async()=>{if(mode==="room"){try{await Act.equip("skin",id);await api("room_me",{code:roomCode})}catch(x){toast(x.message,"bad")}return}equip("skin",id,Owner.verified);pushPresence();renderLobby()}},ballSvg(it)))}
  const tv=rs?(rs.timer||0):host?P.settings.timer:(hst?hst.timer:0);
  seg("timerSeg",tv,v=>{if(mode==="room"){Act.settings({timer:v});api("room_settings",{code:roomCode,timer:v}).catch(x=>toast(x.message,"bad"));return}P.settings.timer=v;saveProfile();pushPresence();renderLobby()},!host);
  $("btnStart").classList.toggle("hidden",!host);$("btnStart").disabled=mode==="invite"?false:r.length<2;
  $("lobbyHint").textContent=mode==="invite"
    ?"غرفة خاصة. شارك الرابط ويفتح عند صاحبك مباشرة، أو ابدأ والكمبيوتر يكمّل المقاعد."
    :host?(r.length<2?"ننتظر لاعب ثاني على الأقل…":r.length>4?"أول ٤ لاعبين يلعبون، والباقي يتفرّجون.":"جاهزين؟ ابدأ متى ما تبي.")
    :(hst?"ننتظر صاحب الغرفة يبدأ المباراة…":"ننتظر صاحب الغرفة يدخل…");
  if(mode==="invite"){$("connLt").textContent=Cloud.on?"متصل":"على جهازك";$("connL").classList.toggle("on",!!Cloud.on)}
  paintChat($("chatLobby"));
  syncChat();
}
function startOnline(){
  if(!room)return;
  const r=roster(),hst=hostEntry(r);
  r.sort((a,b)=>((hst&&b.id===hst.id)-(hst&&a.id===hst.id))||(a.id<b.id?-1:a.id>b.id?1:0));
  const pl=distinctSkins(r.slice(0,4).map(p=>({id:p.id,nick:p.nick,skin:p.skin,bot:0})));
  if(pl.length<2)return;
  const prev=G;
  G=newGame(pl,{seq:(prev?prev.seq:0)+1,timer:P.settings.timer,score:prev?Object.assign({},prev.score):{},round:prev?prev.round+1:1,bs:eff("board")});
  tool="move";ghost=null;winDismissed=-1;
  afterChange(prev,"me");pushPresence();show("game");render();
}
/* changing cosmetics while in a room or game updates what others see */
function onEquipChanged(){if(mode==="room"&&NG.room)api("room_me",{code:NG.room.code}).catch(()=>{});if(room)pushPresence();if(G&&screen==="game")render()}

/* ================= local games ================= */
function beginLocal(players){
  clearBot();leaveRoom();mode="local";hist=[];
  G=newGame(distinctSkins(players),{seq:1,round:1,score:{},bs:eff("board")});
  tool="move";ghost=null;winDismissed=-1;show("game");render();
}
function startLocal(n){
  if(curGame!=="webbound")return mgStartLocal(false,n);
  const pl=[];for(let i=0;i<n;i++)pl.push({id:"L"+i,nick:i===0&&P.nickname?myNick():"لاعب "+fmt(i+1),skin:i===0?skinIdx(eff("skin")):i,bot:0});
  beginLocal(pl);
}
function startBots(){
  if(curGame==="chess"){
    ensureChess().then(()=>Platform.kind==="web"&&Cloud.on?netSoloStart(false):chStartLocal()).catch(()=>toast("تعذّر تحميل اللعبة، تحقق من الاتصال وحاول مرة ثانية","bad"));
    return;
  }
  if(Platform.kind==="web"&&Cloud.on)return netSoloStart(false);
  if(curGame!=="webbound")return mgStartLocal(true);
  const pl=[{id:"L0",nick:P.nickname?myNick():"أنت",skin:skinIdx(eff("skin")),bot:0}];
  for(let k=0;k<P.settings.botCount;k++)pl.push({id:"B"+k,nick:BOT_NAMES[k],skin:k+1,bot:P.settings.botLevel});
  beginLocal(pl);
}
function again(){
  if(!G)return;
  if(mode==="solo")return netSoloStart(true);
  if(mode==="room"){if(amHost())netRoomCall("room_rematch");return}
  if(mode==="local"){
    clearBot();const prev=G;hist=[];
    const pl=prev.players.map(p=>Object.assign({},p));
    if(pl[0]&&pl[0].id==="L0"){pl[0].skin=skinIdx(eff("skin"));pl[0].nick=P.nickname?myNick():pl[0].nick;distinctSkins(pl)}
    G=newGame(pl,{seq:prev.seq+1,score:Object.assign({},prev.score),round:prev.round+1,bs:eff("board")});
    tool="move";ghost=null;winDismissed=-1;sfx("turn");render();
  }else if(amHost())startOnline();
}

/* ================= turns ================= */
function mySeat(){if(!G)return -1;if(mode==="local")return G.turn;return G.players.findIndex(p=>p.id===cid)}
function canAct(){
  if(G&&G.game==="chess"){
    if(G.winner!=null||G.draw)return false;
    if((mode==="solo"||mode==="room")&&NG.busy)return false;
    const s=chMySeat();
    return s>=0&&G.turn===s&&!(G.players[s]&&G.players[s].bot);
  }
  if(G&&G.game==="ballclash"){const s=mySeat();return G.winner==null&&!NG.busy&&s>=0&&G.phase==="pick"}
  if(G&&G.game==="nightweb"){const s=mySeat();return G.winner==null&&!NG.busy&&s>=0&&G.alive[s]}
  if(G&&G.game==="wordweb"){if(G.winner!=null||NG.busy)return false;const s=mode==="solo"?0:mode==="local"?wwSeat():mySeat();if(s<0)return false;const p=G.prog[s];return !p.done&&!p.out}
  if(!G||G.winner!=null)return false;
  if((mode==="solo"||mode==="room")&&NG.busy)return false;
  if(mode==="solo")return G.turn===0&&!G.players[0].bot;
  if(mode==="local")return !G.players[G.turn].bot;
  return mySeat()===G.turn;
}
const hasBots=()=>!!G&&G.players.some(p=>p.bot);
function commit(ng,src){
  if(mode==="local"){hist.push(G);if(hist.length>300)hist.shift()}
  if(M&&src!=="bot"&&src!=="remote"&&ng.last&&ng.last.t==="m"&&ng.last.i===M.seat&&ng.mid===M.mid)M.moves++;
  const prev=G;G=ng;ghost=null;
  if(G.left[G.turn]<=0&&tool==="wall")tool="move";
  afterChange(prev,src||"me");
  if(mode==="online")pushPresence();
  render();
}
function afterChange(prev,src){
  if(G&&G.game){mgSound(prev);return}
  if(!G)return;
  if(G.winner!=null){
    if(!prev||prev.winner==null||prev.round!==G.round){
      const seat=(mode==="online"||mode==="room")?mySeat():(hasBots()?0:-1);
      if(seat>=0&&G.winner!==seat){sfx("lose");buzz(60)}else{sfx("win");buzz([40,60,40,60,90])}
    }
    return;
  }
  const l=G.last;
  if(l&&prev&&prev.round===G.round&&G.seq===prev.seq+1){if(l.t==="m")sfx(src==="me"?"move":"move2");else if(l.t==="w")sfx("wall");else sfx("skip")}
  else if(prev&&prev.round!==G.round)sfx("turn");
  if(src==="remote"&&mySeat()===G.turn&&(!prev||prev.turn!==G.turn||prev.round!==G.round)){setTimeout(()=>sfx("turn"),150);buzz([25,50,25])}
  if(src==="me")buzz(10);
}
function clearBot(){if(botTimer){clearTimeout(botTimer);botTimer=null}}
function scheduleBot(){
  if(mode!=="local"||!G||G.winner!=null||!G.players[G.turn].bot){clearBot();return}
  if(botTimer&&botSeq===G.seq)return;
  clearBot();botSeq=G.seq;
  botTimer=setTimeout(()=>{
    botTimer=null;
    if(mode!=="local"||!G||G.seq!==botSeq||G.winner!=null||!G.players[G.turn].bot)return;
    const act=botPlay(G);
    const moveOk=a=>a&&a.to&&validMoves(G,G.turn).some(p=>p[0]===a.to[0]&&p[1]===a.to[1]);
    if(act&&act.t==="m"&&moveOk(act))commit(doMove(G,G.turn,act.to),"bot");
    else if(act&&act.t==="w"&&act.w&&!wallError(G,act.w))commit(doWall(G,G.turn,act.w),"bot");
    else if(stuck(G,G.turn))commit(doSkip(G),"bot");
    else clearBot();
  },600+Math.random()*450);
}
let undoArm=0;
function resetUndoBtn(){const b=$("btnUndo");b.textContent="تراجع عن آخر حركة";b.classList.remove("arm")}
function undo(){
  if(mode==="solo")return netSoloUndo();
  if(mode!=="local"||!hist.length)return;
  if(M&&M.done&&!M.practice){toast("المباراة انحسبت خلاص، والتراجع ما يلغي المكافأة","bad");return}
  if(M&&M.mode==="bot"&&!M.practice&&!M.done){
    if(Date.now()-undoArm>3000){undoArm=Date.now();const b=$("btnUndo");b.textContent="اضغط مرة ثانية: المباراة تصير تدريب بدون مكافآت";b.classList.add("arm");
      setTimeout(()=>{if(Date.now()-undoArm>=2900)resetUndoBtn()},3000);return}
    M.practice=true;toast("صارت المباراة تدريب، بدون مكافآت","bad");
  }
  undoArm=0;resetUndoBtn();
  clearBot();
  let st=hist.pop();
  while(hist.length&&st.players[st.turn].bot)st=hist.pop();
  G=st;ghost=null;tool="move";winDismissed=-1;sfx("skip");render();
}

/* ================= match tracking & rewards ================= */
function trackMatch(){
  if(!G||G.game||mode==="solo"||mode==="room")return;
  if(!M||M.mid!==G.mid){
    const bots=G.players.filter(p=>p.bot);
    M={mid:G.mid,mode:mode==="online"?"online":(bots.length?"bot":"local"),seat:mode==="online"?mySeat():(bots.length?0:-1),
      startedAt:Date.now(),moves:0,practice:false,done:P.claimedMatches.includes(G.mid),minOpp:99,
      botLevel:bots.reduce((m,p)=>Math.max(m,p.bot||0),0),bots:bots.length};
    lastResult=null;
  }
  if(M.mode==="online"&&M.seat<0)M.seat=mySeat();
  if(G.winner==null&&M.seat>=0&&G.turn===M.seat){
    const ws=wset(G.walls);
    for(let j=0;j<G.n;j++)if(j!==M.seat){const d=distMap(ws,j)[G.pos[j][0]*N+G.pos[j][1]];if(d<M.minOpp)M.minOpp=d}
  }
  if(G.winner!=null&&!M.done)endMatch();
}
function matchCtx(won){
  return {mode:M.mode,won,botLevel:M.botLevel,bots:M.bots,durMs:Date.now()-M.startedAt,moves:M.moves,
    walls:G.walls.filter(w=>w[3]===M.seat).length,mid:G.mid,skinId:eff("skin"),
    opponents:G.players.filter((p,i)=>i!==M.seat).map(p=>p.nick),comeback:won&&M.minOpp<=1,
    xpMul:Owner.verified&&P.owner.xpBoost?10:1,coinMul:Owner.verified&&P.owner.coinBoost?10:1};
}
function endMatch(){
  M.done=true;
  const why=M.mode==="local"?"local":M.seat<0?"spectator":M.practice?"practice":(M.mode==="online"&&G.seq-G.s0<6)?"short":null;
  if(why){lastResult={mid:G.mid,skipped:why};return}
  const won=G.winner===M.seat,pre=newOut();
  weeklyRollover(pre);
  if(M.mode==="online")lbRecord(G,pubMap(),cid);
  const out=finishMatch(matchCtx(won));
  if(!out){lastResult={mid:G.mid,skipped:"dup"};return}
  if(pre.items.length)out.items=pre.items.concat(out.items);
  lastResult={mid:G.mid,out,won};
  updateNavDot();
}
/* leaving a real match halfway counts as a loss, so quitting can't protect a streak */
function wouldForfeit(){
  if(mode==="solo")return !!(G&&G.winner==null&&NG.solo&&!NG.solo.practice&&((M&&M.moves)||0)+G.walls.filter(w=>w[3]===0).length>=3);
  if(mode==="room")return !!(G&&G.winner==null&&mySeat()>=0&&G.seq-(G.s0||G.seq)>=6);
  if(!G||G.winner!=null||!M||M.done||M.practice||M.seat<0||M.mode==="local")return false;
  const acts=M.mode==="online"?G.seq-G.s0:M.moves+G.walls.filter(w=>w[3]===M.seat).length;
  return acts>=(M.mode==="online"?6:3);
}
function forfeit(){
  if(mode==="solo"||mode==="room")return;
  if(!wouldForfeit())return;
  M.done=true;const out=finishMatch(matchCtx(false));
  if(out)toast("انحسبت خسارة لأنك طلعت من المباراة","bad");
}

/* ================= board drawing ================= */
const svg=$("board");
let L=null,boardKey="",drawn={round:-1,walls:-1},burstSeq=-1;
function buildBoard(){
  svg.textContent="";
  const strips=[[0,0,99,S],[0,99-S,99,S],[99-S,0,S,99],[0,0,S,99]];
  const edges=[[-1.6,-1.6,100.6,-1.6],[-1.6,100.6,100.6,100.6],[100.6,-1.6,100.6,100.6],[-1.6,-1.6,-1.6,100.6]];
  const b=boardBase(svg,G.bs||"classic",N,glow=>{
    for(let i=0;i<G.n;i++){
      const [x,y,w,hh]=strips[i];mk("rect",{x,y,width:w,height:hh,rx:"2",fill:skinOf(i).c,opacity:".08"},svg);
      const [x1,y1,x2,y2]=edges[i];mk("line",{x1,y1,x2,y2,stroke:skinOf(i).c,"stroke-width":"1.6","stroke-linecap":"round",filter:glow},svg);
    }
  });
  GLOW=b.glow;
  $("boardbox").style.background=(BOARD_STYLE[G.bs]||BOARD_STYLE.classic).box;
  L={trail:mk("g",{"pointer-events":"none"},svg),last:mk("g",{"pointer-events":"none"},svg),moves:mk("g",{},svg),walls:mk("g",{"pointer-events":"none"},svg),
     ghost:mk("g",{"pointer-events":"none"},svg),pawns:mk("g",{"pointer-events":"none"},svg),fx:mk("g",{"pointer-events":"none"},svg),pawn:[]};
  for(let i=0;i<G.n;i++){
    const g=mk("g",{class:"pawn"},L.pawns),sk=skinOf(i);
    const ring=mk("circle",{r:"4.2",fill:"none",stroke:sk.c,"stroke-width":".6",class:"ring"},g);
    mk("circle",{cy:"1.1",r:"3.5",fill:"#000",opacity:".45"},g);
    ballGraphic(g,sk,0,0,3.6,{filter:GLOW});
    L.pawn.push({g,ring});
  }
  drawn={round:-1,walls:-1};burstSeq=-1;trailSeq=G.seq;
  placePawns();
  requestAnimationFrame(()=>requestAnimationFrame(()=>{if(L)L.pawns.classList.add("ready")}));
}
function placePawns(){G.pos.forEach(([r,c],i)=>{const p=L.pawn[i];if(!p)return;p.g.style.transform="translate("+(c*S+S/2)+"px,"+(r*S+S/2)+"px)";p.ring.style.display=(G.winner==null&&G.turn===i)?"":"none"})}
const lookFor=(i,k)=>{const pl=G&&G.players[i];if(!pl||pl.bot)return null;const pub=pubFor(pl);if(!pub)return null;const v=pub[k];const t=PUB_KEYS[k],it=findItem(t,v);return it&&(!isOwnerItem(it)||seatIsOwner(i))?v:null};
const webFor=i=>lookFor(i,"wb")||"classic",moveFor=i=>lookFor(i,"mv")||"none",winFor=i=>lookFor(i,"vf")||"classic";
function drawWalls(){
  if(drawn.round===G.round&&drawn.walls===G.walls.length)return;
  const fresh=drawn.round===G.round&&G.walls.length===drawn.walls+1;
  L.walls.textContent="";
  G.walls.forEach((w,k)=>drawSilk(L.walls,w,skinOf(w[3]).c,{fresh:fresh&&k===G.walls.length-1,web:webFor(w[3]),glow:GLOW}));
  drawn.round=G.round;drawn.walls=G.walls.length;
}
function drawMoves(){
  L.moves.textContent="";
  if(!canAct()||tool!=="move")return;
  const col=skinOf(G.turn).c;
  for(const [r,c] of validMoves(G,G.turn)){
    const cx=c*S+S/2,cy=r*S+S/2;
    mk("circle",{cx,cy,r:"1.9",fill:col,"fill-opacity":".2",stroke:col,"stroke-width":".7",class:"mv","pointer-events":"none"},L.moves);
    const hit=mk("rect",{x:c*S,y:r*S,width:S,height:S,fill:"transparent",style:"cursor:pointer","data-cell":r+","+c},L.moves);
    hit.addEventListener("click",()=>{if(tool==="move")playAction({t:"m",to:[r,c]})});
  }
}
function drawGhost(){
  if(!L)return;
  L.ghost.textContent="";
  if(!ghost||tool!=="wall"||!canAct())return;
  const err=wallError(G,ghost);
  drawSilk(L.ghost,ghost,err?"#8a8fa8":skinOf(G.turn).c,{op:err?.65:.8,dashed:!!err,web:err?"classic":webFor(G.turn),glow:GLOW});
}
function drawLast(){
  L.last.textContent="";
  const l=G.last;if(!l||l.t!=="m"||G.winner!=null)return;
  const col=skinOf(l.i).c,[fr,fc]=l.from,[tr,tc]=l.to;
  mk("line",{x1:fc*S+S/2,y1:fr*S+S/2,x2:tc*S+S/2,y2:tr*S+S/2,stroke:col,"stroke-width":".5","stroke-dasharray":".6 1","stroke-linecap":"round",opacity:".7"},L.last);
  mk("circle",{cx:fc*S+S/2,cy:fr*S+S/2,r:"1.4",fill:"none",stroke:col,"stroke-width":".45",opacity:".7"},L.last);
}
function drawFx(){
  if(G.winner==null){L.fx.textContent="";burstSeq=-1;return}
  if(burstSeq===G.seq)return;burstSeq=G.seq;L.fx.textContent="";
  const [r,c]=G.pos[G.winner];victoryFx(L.fx,c*S+S/2,r*S+S/2,winFor(G.winner),skinOf(G.winner).c,GLOW,true);
}
function drawTrail(){
  const l=G.last;if(!l||l.t!=="m"||G.seq===trailSeq)return;trailSeq=G.seq;
  trailFx(L.trail,l.from,l.to,moveFor(l.i),GLOW);
}
function renderBoard(){
  const key=G.n+"|"+G.bs+"|"+G.players.map((p,i)=>skinOf(i).id).join(",");
  if(key!==boardKey||!L){boardKey=key;buildBoard()}
  $("game").style.setProperty("--turn",skinOf(G.winner!=null?G.winner:G.turn).c);
  drawLast();drawMoves();drawWalls();drawGhost();placePawns();drawTrail();drawFx();
}

/* wall placement: touch the gap between cells and slide */
let dragging=false;
function boardPoint(e){const m=svg.getScreenCTM();if(!m)return null;const pt=svg.createSVGPoint();pt.x=e.clientX;pt.y=e.clientY;return pt.matrixTransform(m.inverse())}
function ghostFrom(p){
  const fx=p.x/S,fy=p.y/S,dx=Math.abs(fx-Math.round(fx)),dy=Math.abs(fy-Math.round(fy));
  const r=Math.max(0,Math.min(N-2,Math.round(fy)-1)),c=Math.max(0,Math.min(N-2,Math.round(fx)-1));
  return [r,c,dy<=dx?0:1];
}
function setGhostFromEvent(e){
  const p=boardPoint(e);if(!p)return;const g=ghostFrom(p);
  if(ghost&&g[0]===ghost[0]&&g[1]===ghost[1]&&g[2]===ghost[2])return;
  ghost=g;updateGhostUI();
}
svg.addEventListener("pointerdown",e=>{if(tool!=="wall"||!canAct())return;e.preventDefault();dragging=true;try{svg.setPointerCapture(e.pointerId)}catch(_){}setGhostFromEvent(e)});
svg.addEventListener("pointermove",e=>{if(dragging)setGhostFromEvent(e)});
svg.addEventListener("pointerup",()=>{dragging=false});
svg.addEventListener("pointercancel",()=>{dragging=false});
function updateGhostUI(){
  drawGhost();
  const m=$("wallMsg"),err=ghost?wallError(G,ghost):null;
  m.classList.toggle("bad",!!err);
  m.textContent=!ghost?"المس الفراغ بين الخانات واسحب إصبعك لين يصير الخيط في مكانه."
    :err?"ما ينفع هنا، "+err+"."
    :"تمام. اضغط «ثبّت الخيط»، أو لفّه لو تبيه بالعكس.";
  $("btnPlace").disabled=!(ghost&&!err);
}

/* ================= game panels ================= */
function pubFor(p){
  if(mode==="room"){if(p.id===cid)return myPub(Owner.verified);const r=netRoster().find(x=>x.id===p.id);return r?r.pub:null}
  if(mode==="solo")return p.id===cid?myPub(Owner.verified):null;
  if(mode==="online"){if(p.id===cid)return myPub(Owner.verified);const r=roster().find(x=>x.id===p.id);return r?r.pub:null}
  return p.id==="L0"?myPub(Owner.verified):null;
}
function renderPlayers(){
  const box=$("players");box.textContent="";
  const ws=wset(G.walls),present=mode==="online"?new Set(roster().map(p=>p.id)):(mode==="room"&&NG.online.size?NG.online:null);
  G.players.forEach((p,i)=>{
    const sk=skinOf(i),pub=pubFor(p),bd=pub&&findItem("badge",pub.bd);
    const wins=G.score[p.id]||0;
    const wl=h("span",{class:"wl","aria-label":"الخيوط الباقية: "+fmt(G.left[i])});
    for(let k=0;k<wallsPer(G.n);k++)wl.append(h("i",{class:k>=G.left[i]?"used":null}));
    const av=pub?avatar(sk.id,pub.fr,34,pub.dc):h("span",{class:"pc-ball"},ballSvg(sk,30));
    const d=h("div",{class:"pc"+((G.winner==null?G.turn===i:G.winner===i)?" turn":"")+(present&&!present.has(p.id)?" away":"")},av,
      h("div",{class:"meta"},h("span",{class:"nm"},bd?badgeEl(bd.id,18):null,p.nick,p.bot?ic("cpu","pc-bot"):null,(mode==="online"||mode==="room")&&p.id===cid?h("span",{class:"you"},"أنت"):null),
        h("span",{class:"sub"},G.winner===i?h("span",{class:"arrived"},ic("trophy"),"وصل!"):(ownerSees("seeSteps")?stepsTxt(distMap(ws,i)[G.pos[i][0]*N+G.pos[i][1]]):null),wins?h("span",{class:"wins"},ic("trophy"),fmt(wins)):null),wl));
    d.style.setProperty("--c",sk.c);
    if(seatIsOwner(i)&&(mode==="online"||mode==="room"))d.querySelector(".nm").append(" ",ownerTag());
    const bb=bubbles[i];if(bb&&Date.now()<bb.until){const it=findItem("emote",bb.id);if(it)d.append(h("span",{class:"emo"+(Date.now()-bb.at<350?" a-"+it.anim:""),role:"img","aria-label":it.name},emoteNode(it,36)))}
    box.append(d);
  });
}
function renderStatus(){
  const s=$("status");s.textContent="";
  let txt;
  if(G.winner!=null){const w=G.players[G.winner];txt=((mode==="online"||mode==="room")&&w.id===cid)||(hasBots()&&!w.bot)?"فزت!":"فاز "+w.nick}
  else{
    const p=G.players[G.turn];
    if(mode==="local"||mode==="solo")txt=p.bot?p.nick+" يفكّر…":hasBots()?"دورك! حرّك كرتك أو مدّ خيط":"دور "+p.nick+": حرّك كرتك أو مدّ خيط";
    else txt=mySeat()===G.turn?"دورك! حرّك كرتك أو مدّ خيط":mySeat()<0?"تتفرّج الحين، دور "+p.nick:"ننتظر "+p.nick+" يلعب…";
  }
  add(s,h("span",{class:"sdot"}),h("span",{},txt),M&&M.practice&&G.winner==null?h("span",{class:"pill"},"تدريب"):null);
}
function renderControls(){
  const can=canAct(),over=G.winner!=null;
  if(G.left[G.turn]<=0&&tool==="wall"){tool="move";ghost=null}
  const seat=mySeat(),myLeft=seat>=0?G.left[seat]:0;
  $("actRow").classList.toggle("hidden",over);
  $("mMove").classList.toggle("sel",tool==="move");$("mWall").classList.toggle("sel",tool==="wall");
  $("mMove").disabled=!can;$("mWall").disabled=!can||G.left[G.turn]<=0;
  $("mWallN").textContent="("+fmt(Math.max(0,myLeft))+")";
  const wallOn=can&&tool==="wall";
  $("wallRow").classList.toggle("hidden",!wallOn);$("wallMsg").classList.toggle("hidden",!wallOn);
  svg.classList.toggle("wallmode",wallOn);
  if(wallOn)updateGhostUI();
  $("endRow").classList.toggle("hidden",!(over&&winDismissed===G.seq));
  $("btnAgain2").classList.toggle("hidden",!(mode==="local"||mode==="solo"||amHost()));
  $("btnAgain2").textContent=againLabel();
  const recorded=!!(M&&M.done&&!M.practice);
  $("btnUndo").classList.toggle("hidden",!!(recorded||!((mode==="local"&&hist.length>0&&(over||!G.players[G.turn].bot))||(mode==="solo"&&G.seq>(G.s0||G.seq)&&(over||!G.players[G.turn].bot)))));
  $("btnPass").classList.toggle("hidden",!(can&&stuck(G,G.turn)));
  updateSkip();
}
function updateSkip(){
  let showIt=false;
  if(G&&mode==="room"&&G.winner==null&&mySeat()>=0&&mySeat()!==G.turn){
    const pid=G.players[G.turn].id,away=NG.online.size>0&&!NG.online.has(pid),el=(Date.now()-seenAt)/1000;
    if((G.timer&&el>G.timer+5)||(away&&el>92))showIt=true;
  }
  if(G&&mode==="online"&&G.winner==null&&mySeat()>=0&&mySeat()!==G.turn){
    const pid=G.players[G.turn].id,away=!roster().some(p=>p.id===pid),key=G.seq+":"+pid;
    if(away){if(awayKey!==key){awayKey=key;awaySince=Date.now()}if(Date.now()-awaySince>4000)showIt=true}else awayKey="";
    if(G.timer&&(Date.now()-seenAt)/1000>G.timer+5)showIt=true;
  }
  $("btnSkip").classList.toggle("hidden",!showIt);
}
function mySeatForResult(){return M?M.seat:-1}
function againLabel(){
  const seat=mySeatForResult();
  if(!G||G.winner==null||seat<0||(M&&M.mode==="local"))return "جولة ثانية";
  return G.winner===seat?"إعادة التحدي":"اطلب الثأر";
}

/* ================= end-of-match screen ================= */
function countUp(el,to,prefix){
  if(matchMedia("(prefers-reduced-motion: reduce)").matches||!to){el.textContent=prefix+fmt(to);return}
  const t0=performance.now(),dur=700;
  const step=t=>{const k=Math.min(1,(t-t0)/dur);el.textContent=prefix+fmt(Math.round(to*(1-Math.pow(1-k,3))));if(k<1)requestAnimationFrame(step)};
  requestAnimationFrame(step);
}
function buildRewards(box,r){
  box.textContent="";
  if(!r)return;
  if(r.skipped){
    const msg={local:"مباريات نفس الجوال للمتعة وما تدخل في حسابك.",practice:"مباراة تدريب، بدون مكافآت.",spectator:"",short:"المباراة كانت قصيرة جدًا عشان تنحسب.",dup:"",offline:"ما فيه اتصال، المكافأة تنحسب لما تتصل بالخادم.",cap:"وصلت حد مكافآت الدومينو اليوم: ٨ جولات.",draw:"تعادل، وما فيه عملات.",loss:""}[r.skipped];
    if(msg)box.append(h("p",{class:"hint",style:"margin:10px 0"},msg));
    return;
  }
  const out=r.out;
  const xpB=h("b",{},"+٠"),coB=h("b",{},"+٠");
  box.append(h("div",{class:"rwrow"},h("div",{class:"rwbox"},xpB,h("span",{},"XP")),h("div",{class:"rwbox"},coB,h("span",{class:"coin-lbl"},ic("coin","gold"),"عملات"))));
  countUp(xpB,out.xp,"+");countUp(coB,out.coins,"+");
  const li=levelInfo(P.xp),before=levelInfo(out.xpBefore),up=li.L>before.L;
  const bar=h("i",{style:"width:"+(up?0:Math.round(before.pct*100))+"%"});
  box.append(h("div",{class:"lvl"},h("div",{class:"xpline"},h("span",{},"المستوى "+fmt(li.L)),h("span",{},li.need?fmt(Math.round(li.pct*100))+"٪":"أعلى مستوى")),h("div",{class:"bar2"},bar)));
  requestAnimationFrame(()=>requestAnimationFrame(()=>{bar.style.width=Math.round(li.pct*100)+"%"}));
  const chips=[];
  if(out.streak>=2)chips.push(["flame","سلسلة انتصارات ×"+fmt(out.streak)]);
  if(out.firstWinBonus)chips.push(["sun","أول فوز اليوم +"+fmt(out.firstWinBonus)+" عملة"]);
  for(const l of out.levelUps)chips.push(["up","ارتفع مستواك! وصلت للمستوى "+fmt(l.L),"lv"]);
  for(const it of out.items){const x=findItem(it.t,it.id);chips.push(["gift","مكافأة جديدة: "+x.name+" ("+CAT_ONE[it.t]+")",x.rar==="secret"?"sec":""])}
  for(const id of out.ach)chips.push(["medal","إنجاز: "+ACH_INDEX[id].name]);
  for(const m of out.missions)chips.push([m.bonus?"star":"target",(m.bonus?"":"مهمة مكتملة: ")+m.name]);
  if(chips.length){
    const seq=h("div",{class:"seq"});const show=chips.slice(0,7);
    show.forEach(([e,t,cls],i)=>seq.append(h("div",{class:"seqc"+(cls?" "+cls:""),style:"animation-delay:"+(.45+i*.22)+"s"},h("span",{class:"e"},ic(e==="sun"?"spark":e)),h("span",{},t))));
    if(chips.length>7)seq.append(h("div",{class:"seqc",style:"animation-delay:"+(.45+7*.22)+"s"},h("span",{class:"e"},ic("spark")),h("span",{},"و"+fmt(chips.length-7)+" أشياء ثانية في حسابك")));
    box.append(seq);
  }
  if(out.levelUps.length)setTimeout(()=>sfx("level"),900);
  else if(out.items.length||out.ach.length)setTimeout(()=>sfx("unlock"),900);
}
function renderWin(){
  const box=$("winBox");
  if(G.winner==null||winDismissed===G.seq){box.classList.add("hidden");return}
  const i=G.winner,p=G.players[i],sk=skinOf(i),wasHidden=box.classList.contains("hidden");
  box.classList.remove("hidden");
  if(wasHidden){
    const sp=$("winSpider"),vf=winFor(i);let fxs=$("winFx");
    if(!fxs){fxs=mk("svg",{id:"winFx",class:"winfx",viewBox:"-32 -32 64 64","aria-hidden":"true"});sp.after(fxs)}
    fxs.textContent="";
    if(vf!=="classic"&&!lite()){
      sp.classList.add("hidden");fxs.classList.remove("hidden");
      const gid="wf"+(++uid),f=mk("filter",{id:gid,x:"-50%",y:"-50%",width:"200%",height:"200%"},mk("defs",{},fxs));mk("feGaussianBlur",{stdDeviation:".8",result:"b"},f);const fm=mk("feMerge",{},f);mk("feMergeNode",{in:"b"},fm);mk("feMergeNode",{in:"SourceGraphic"},fm);
      ballGraphic(fxs,sk,0,0,5);victoryFx(fxs,0,0,vf,sk.c,"url(#"+gid+")",true);
    }else{fxs.classList.add("hidden");sp.classList.remove("hidden");sp.style.color=sk.c;sp.classList.remove("drop");void sp.getBoundingClientRect();sp.classList.add("drop")}
  }
  const seat=mySeatForResult(),counted=M&&M.mode!=="local"&&seat>=0;
  paintKicker($("winKicker"),counted&&i===seat,counted?seat:-1);
  $("winText").textContent=counted?(i===seat?"فزت!":"خسرت"):"فاز "+p.nick+"!";
  paintWinTitle($("winText"),!counted||i===seat,counted?seat:-1);
  $("winSub").textContent=counted&&i!==seat?"فاز "+p.nick+". تجيها المرة الجاية.":"";
  const wpub=pubFor(p),who=$("winWho");who.textContent="";
  who.append(wpub?avatar(sk.id,wpub.fr,44,wpub.dc):ballSvg(sk,40),h("div",{class:"ww-t"},h("b",{},nameEl(p.nick,wpub&&wpub.th),wpub&&wpub.bd?badgeEl(wpub.bd,16):null),h("span",{},p.bot?"الكمبيوتر":(findItem("title",wpub&&wpub.ti)||{}).name||"")));
  const ms=$("winStats");ms.textContent="";
  if(seat>=0){const myW=G.walls.filter(w=>w[3]===seat).length,dur=M&&M.startedAt?Math.max(1,Math.round((Date.now()-M.startedAt)/1000)):0;
    ms.append(h("div",{class:"wst"},h("b",{},fmt(dur>=60?Math.floor(dur/60):dur)+(dur>=60?":"+String(dur%60).padStart(2,"0"):"")),h("span",{},dur>=60?"دقيقة":"ثانية")),
      h("div",{class:"wst"},h("b",{},fmt((M&&M.moves)||0)),h("span",{},"حركاتك")),h("div",{class:"wst"},h("b",{},fmt(myW)),h("span",{},"خيوطك")),
      h("div",{class:"wst"},h("b",{},fmt(G.players.length)),h("span",{},"لاعبين")))}
  const r=lastResult&&lastResult.mid===G.mid?lastResult:null;
  if(winBuiltMid!==G.mid){winBuiltMid=G.mid;buildRewards($("winRewards"),r)}
  const ul=$("scores");ul.textContent="";
  G.players.map((q,k)=>({q,k,w:G.score[q.id]||0})).sort((a,b)=>b.w-a.w).forEach(({q,k,w})=>
    ul.append(h("li",{},ballSvg(skinOf(k),24),h("span",{},q.nick,q.bot?ic("cpu","pc-bot"):null),h("b",{class:"wins"},ic("trophy"),fmt(w)))));
  const canAgain=mode==="local"||mode==="solo"||amHost();
  $("btnAgain").textContent=againLabel();
  $("btnAgain").classList.toggle("hidden",!canAgain);$("againHint").classList.toggle("hidden",canAgain);
  $("btnLobby").classList.toggle("hidden",!(mode==="room"&&amHost()));
}
/* ---- owner-only views: steps, opponents' shortest paths, best-move hint ---- */
const ownerSees=k=>!!(Owner.verified&&P.owner&&P.owner[k]);
let hintCell=null,hintSeq=-1;
function shortestPath(ws,j,from){
  const d=distMap(ws,j);let [r,c]=from;const pts=[[r,c]];let guard=0;
  while(d[r*N+c]>0&&d[r*N+c]<99&&guard++<81){let moved=false;
    for(const [dr,dc] of DIRS){if(!isOpen(ws,r,c,dr,dc))continue;const k=(r+dr)*N+c+dc;if(d[k]===d[r*N+c]-1){r+=dr;c+=dc;pts.push([r,c]);moved=true;break}}
    if(!moved)break}
  return pts;
}
function drawOwnerFx(){
  const old=document.getElementById("ownerFx");if(old)old.remove();
  if(!G||screen!=="game"||G.winner!=null||!Owner.verified)return;
  const NS="http://www.w3.org/2000/svg",grp=document.createElementNS(NS,"g");grp.id="ownerFx";grp.setAttribute("pointer-events","none");
  const me=mode==="local"?(hasBots()?0:G.turn):mySeat(),ws=wset(G.walls);
  if(ownerSees("seePath"))for(let j=0;j<G.n;j++){if(j===me)continue;
    const pts=shortestPath(ws,j,G.pos[j]);if(pts.length<2)continue;
    const pl=document.createElementNS(NS,"polyline");pl.setAttribute("points",pts.map(([r,c])=>(c*S+S/2)+","+(r*S+S/2)).join(" "));
    pl.setAttribute("fill","none");pl.setAttribute("stroke",(skinOf(j)||{}).c||"#fff");pl.setAttribute("stroke-width","1.1");pl.setAttribute("stroke-dasharray","1.6 1.4");
    pl.setAttribute("stroke-linecap","round");pl.setAttribute("opacity",".85");grp.append(pl)}
  if(hintCell&&hintSeq===G.seq){const ci=document.createElementNS(NS,"circle");ci.setAttribute("cx",hintCell[1]*S+S/2);ci.setAttribute("cy",hintCell[0]*S+S/2);ci.setAttribute("r",S*.42);
    ci.setAttribute("fill","none");ci.setAttribute("stroke","#E6B85C");ci.setAttribute("stroke-width","1.2");ci.setAttribute("class","hint-ring");grp.append(ci)}
  $("board").append(grp);
}
$("btnHint").addEventListener("click",()=>{
  if(!G||!canAct()||!ownerSees("seeHint"))return;
  const g=JSON.parse(JSON.stringify(G));g.players[g.turn].bot=3;const a=botPlay(g);
  if(!a){toast("ما فيه حركة مقترحة");return}
  if(a.t==="m"){hintCell=a.to;hintSeq=G.seq;tool="move";toast("التلميح: حرّك كرتك للخانة المضيئة","good")}
  else{hintCell=null;tool="wall";ghost=[a.w[0],a.w[1],a.w[2]];toast("التلميح: هذا أفضل مكان لخيط، اضغط «ثبّت الخيط»","good")}
  sfx("move");render();
});
function paintWinTitle(el,won,seat){
  if(!el)return;
  el.classList.remove("is-win","is-loss","is-draw");
  el.classList.add(seat>=0&&!won?"is-loss":"is-win");
}
function paintKicker(el,won,seat){
  if(!el)return;
  el.classList.remove("is-win","is-loss");
  if(seat<0){el.textContent="انتهت";return}
  el.textContent=won?"فوز":"خسارة";
  el.classList.add(won?"is-win":"is-loss");
}
function render(){
  if(G)stampSeen();
  if(G&&G.game==="chess"){if(screen==="ch")chRender();return}
  if(G&&G.game){if(screen==="mg")mgRender();return}
  if(!G)return;
  trackMatch();
  renderPlayers();renderStatus();renderBoard();renderControls();renderWin();renderConn();scheduleBot();tick();
  try{drawOwnerFx()}catch(e){}
  const hb=$("btnHint");if(hb)hb.classList.toggle("hidden",!(G&&ownerSees("seeHint")&&canAct()));
  syncChat();
}

/* ================= emotes =================
   Sent through presence (the room's live state): at most one every 2.5 s and six a minute. */
function emoteSeat(){if(!G)return -1;if(mode==="online"||mode==="room"||mode==="solo")return mySeat();return G.players.findIndex(p=>p.id==="L0")}
function showBubble(seat,id){if(seat<0)return;bubbles[seat]={id,at:Date.now(),until:Date.now()+2600};if(screen==="game")renderPlayers();setTimeout(()=>{if(bubbles[seat]&&Date.now()>=bubbles[seat].until){delete bubbles[seat];if(G&&screen==="game")renderPlayers()}},2700)}
function sendEmote(id){
  const now=Date.now();emoTimes=emoTimes.filter(t=>now-t<60000);
  if(emoTimes.length&&now-emoTimes[emoTimes.length-1]<2500){toast("استنى شوي قبل التفاعل الجاي");return}
  if(emoTimes.length>=6){toast("وصلت الحد، جرّب بعد دقيقة");return}
  emoTimes.push(now);emoN++;emoteState={id,n:emoN};
  showBubble(emoteSeat(),id);sfx("emote");if(room)pushPresence();
  if(mode==="room"&&NG.ch){try{NG.ch.send({type:"broadcast",event:"emote",payload:{from:cid,e:id}})}catch(e){}}
}
function checkEmotes(){
  for(const r of roster()){
    if(r.isMe)continue;const n=r.em?r.em.n:0,seen=lastEmo[r.id];lastEmo[r.id]=n;
    /* the first sighting only records the counter, so an old emote isn't replayed to someone who just joined */
    if(seen===undefined||seen===n||!r.em||P.settings.muteEmotes||!G)continue;
    const seat=G.players.findIndex(p=>p.id===r.id);if(seat>=0){showBubble(seat,r.em.id);sfx("emote")}
  }
}
function renderEmoteTray(){
  const tr=$("emoteTray");tr.textContent="";
  for(const it of EMOTES){if(!isOwned("emote",it.id)||(isOwnerItem(it)&&!Owner.verified))continue;tr.append(h("button",{onclick:()=>sendEmote(it.id),"aria-label":"أرسل "+it.name},emoteNode(it,30)))}
  $("btnMuteEmo").textContent=P.settings.muteEmotes?"تفاعلات الآخرين مكتومة":"تفاعلات الآخرين ظاهرة";
  $("emoteHint").textContent=(mode==="online"||mode==="room")?"يطلع فوق اسمك عند الكل.":"يطلع فوق اسمك.";
}
const chatTimes=[];
function paintChat(el){
  if(!el)return;el.textContent="";
  for(const [id,t] of CHAT_PRESETS)el.append(h("button",{type:"button",onclick:()=>sendChat(id)},t));
  for(const [id,t] of CHAT_EMOJI)el.append(h("button",{type:"button","aria-label":"إيموجي "+t,onclick:()=>sendChat(id)},t));
}
function showChatLine(nick,text){
  const log=$("chatLog");if(log){log.append(h("p",{},h("b",{},nick+"：")," "+text));while(log.children.length>4)log.firstChild.remove()}
  const live=$("chatLine");if(live)live.textContent=nick+"： "+text;
}
async function sendChat(id){
  const text=chatLabel(id);if(!text)return;
  const now=Date.now(),recent=chatTimes.filter(t=>now-t<60000);
  if(recent.length&&now-recent[recent.length-1]<2500){toast("استنى شوي قبل الرسالة الجاية");return}
  if(recent.length>=8){toast("وصلت الحد، جرّب بعد دقيقة");return}
  if(Cloud.on){try{await api("social_chat",{id})}catch(e){toast(e.message,"bad");return}}
  chatTimes.length=0;chatTimes.push(...recent,now);
  showChatLine(myNick(),text);
  if(mode==="room"&&NG.ch){try{NG.ch.send({type:"broadcast",event:"chat",payload:{from:cid,id}})}catch(e){}}
}
function onNetChat(p){
  if(!p||!chatLabel(p.id))return;
  if(Array.isArray(P.blockIds)&&P.blockIds.includes(p.from))return;
  const m=NG.room&&NG.room.members&&NG.room.members.find(x=>x.id===p.from);
  showChatLine((m&&m.nick)||"لاعب",chatLabel(p.id));
}
function syncChat(){
  const on=mode==="room"||mode==="invite"||mode==="online";
  document.body.classList.toggle("has-chat",on);
  const el=$("chatGame");
  if(on&&el&&!el.childElementCount)paintChat(el);
  if(!on&&el)el.textContent="";
}
$("btnEmote").addEventListener("click",()=>{const b=$("emoteBox"),open=b.classList.contains("hidden");b.classList.toggle("hidden",!open);$("btnEmote").setAttribute("aria-expanded",String(open));if(open)renderEmoteTray()});
$("btnMuteEmo").addEventListener("click",()=>{P.settings.muteEmotes=!P.settings.muteEmotes;saveProfile();renderEmoteTray()});

/* ================= timers ================= */
let lbTick=0;
function tick(){
  if(G)stampSeen();
  if(screen==="ch")chTick();
  if(screen==="leaders"&&Date.now()-lbTick>30000){lbTick=Date.now();const cd=document.querySelector("#lbCountdown .lb-cd");if(cd)cd.replaceChildren(ic("clock"),"ينتهي الأسبوع بعد "+leftText(weekEndsAt()-clock.now()))}
  if(G&&G.game&&screen==="mg"){
    if(G.winner!=null){const lr=lastResult&&lastResult.mid===G.mid?lastResult:null,key=G.mid+"|"+(lr?(lr.out?"out":lr.skipped||""):"wait");if($("mgRewards").dataset.k!==key)renderMgWin()}
    const bar=$("mgTbar");
    if(!G.timer||G.winner!=null||G.game==="wordweb"||mode!=="room"){bar.classList.add("hidden");return}
    bar.classList.remove("hidden");const rem=Math.max(0,G.timer-(Date.now()-seenAt)/1000);$("mgTfill").style.transform="scaleX("+(rem/G.timer)+")";
    if(rem<=0&&mySeat()===G.turn&&autoSkipSeq!==G.seq){autoSkipSeq=G.seq;setTimeout(()=>{if(G&&G.seq===autoSkipSeq&&G.winner==null)netRoomSkip()},400)}
    return;
  }
  if(!G||screen!=="game")return;
  const bar=$("tbar");
  if(!G.timer||G.winner!=null){bar.classList.add("hidden")}
  else{
    bar.classList.remove("hidden");
    const rem=Math.max(0,G.timer-(Date.now()-seenAt)/1000);
    $("tfill").style.transform="scaleX("+(rem/G.timer)+")";
    if(rem<=0&&mode==="online"&&mySeat()===G.turn&&autoSkipSeq!==G.seq){autoSkipSeq=G.seq;commit(doSkip(G),"me");return}
    if(rem<=0&&mode==="room"&&mySeat()===G.turn&&autoSkipSeq!==G.seq){autoSkipSeq=G.seq;setTimeout(()=>{if(G&&G.seq===autoSkipSeq&&mode==="room")netRoomSkip()},1300);return}
  }
  updateSkip();
}
setInterval(tick,250);

/* ================= wiring ================= */
function renderSound(){$("btnSound").replaceChildren(ic(P.settings.mute?"mute":"sound"));$("btnSound").setAttribute("aria-pressed",String(!P.settings.mute))}
$("btnSound").onclick=()=>{P.settings.mute=!P.settings.mute;saveProfile();renderSound();if(!P.settings.mute)sfx("move")};
$("mMove").onclick=()=>{tool="move";ghost=null;render()};
$("mWall").onclick=()=>{tool="wall";ghost=null;render()};
$("btnRot").onclick=()=>{if(!canAct())return;ghost=ghost?[ghost[0],ghost[1],ghost[2]^1]:[3,3,0];updateGhostUI()};
$("btnPlace").onclick=()=>{if(!canAct()||!ghost)return;if(wallError(G,ghost)){sfx("bad");return}const w=[ghost[0],ghost[1],ghost[2]];tool="move";ghost=null;playAction({t:"w",w})};
$("btnUndo").onclick=undo;
$("btnPass").onclick=()=>playAction({t:"s"});
$("btnSkip").onclick=()=>{if(mode==="room"){netRoomSkip();return}if(G&&G.winner==null&&mode==="online"){awayKey="";commit(doSkip(G))}};
$("btnAgain").onclick=again;$("btnAgain2").onclick=again;
$("btnView").onclick=()=>{if(G){winDismissed=G.seq;render()}};
$("btnScore").onclick=()=>{winDismissed=-1;render()};
$("btnBots").onclick=startBots;
document.querySelectorAll("[data-local]").forEach(b=>b.onclick=()=>startLocal(+b.dataset.local));
$("btnCreate").onclick=()=>{const A="ABCDEFGHJKMNPQRSTUVWXYZ23456789";let s="";for(let i=0;i<4;i++)s+=A[Math.floor(Math.random()*A.length)];enterRoom(s,true)};
const joinEl=$("joinCode");
joinEl.addEventListener("input",()=>{const v=joinEl.value.toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,4);if(v!==joinEl.value)joinEl.value=v});
joinEl.addEventListener("keydown",e=>{if(e.key==="Enter")$("btnJoin").click()});
$("btnJoin").onclick=()=>{const c=joinEl.value.trim().toUpperCase();if(!/^[A-Z0-9]{4}$/.test(c)){onlineErr("كود الغرفة ٤ حروف وأرقام، تأكد منه.");return}enterRoom(c,false)};
$("btnStart").onclick=()=>{
  if(mode==="invite"){
    if(INVITE_GAME==="domino"){curGame="domino";ensureGames().then(()=>mgStartLocal(true)).catch(()=>toast("تعذّر تحميل اللعبة، تحقق من الاتصال وحاول مرة ثانية","bad"));return}
    if(INVITE_GAME==="chess"){curGame="chess";ensureChess().then(()=>chStartLocal()).catch(()=>toast("تعذّر تحميل اللعبة، تحقق من الاتصال وحاول مرة ثانية","bad"));return}
    curGame="webbound";beginLocal([{id:"L0",nick:P.nickname?myNick():"أنت",skin:skinIdx(eff("skin")),bot:0},{id:"B0",nick:BOT_NAMES[0],skin:1,bot:P.settings.botLevel}]);return}
  if(mode!=="room")return startOnline();
  const row=NG.room,wait=row?row.members.slice(0,4).filter(m=>m.id!==row.host&&!m.ready):[];
  if(wait.length)confirmSheet("تبدأ الحين؟",(wait.length===1?wait[0].nick+" ما ضغط «أنا جاهز»":"فيه "+fmt(wait.length)+" لاعبين ما ضغطوا «أنا جاهز»")+". تبدأ رغم كذا؟","ابدأ",()=>netRoomCall("room_start",{force:true}));
  else netRoomCall("room_start");
};
$("btnQuick").addEventListener("click",()=>netRoomQuick());
$("btnPublic").addEventListener("click",()=>netRoomEnter(true,null,{public:true}));
$("btnRooms").addEventListener("click",()=>loadRooms());
$("btnLobby").addEventListener("click",()=>{winDismissed=G?G.seq:-1;netRoomCall("room_lobby")});
function inviteUrl(code){
  if(!code||!/^https?:/.test(location.href))return "";
  const u=new URL(location.href);u.search="";u.hash="";u.searchParams.set("join",code);
  const gm=(NG.room&&NG.room.settings&&NG.room.settings.game)||(mode==="invite"?INVITE_GAME:curGame);
  if(gm==="domino"||gm==="chess")u.searchParams.set("g",gm);
  return u.toString();
}
function inviteText(code){const url=inviteUrl(code);return "تعال نلعب معي على SPIDER 🕸️\nالغرفة الخاصة: "+code+(url?"\n"+url:"")}
async function shareRoom(){
  const code=roomCode||($("lobbyCode")&&$("lobbyCode").textContent)||"";
  if(!/^[A-Z0-9]{4}$/.test(code)){toast("ادخل غرفة أول");return}
  const text=inviteText(code),url=inviteUrl(code);
  if(navigator.share){try{await navigator.share({title:"SPIDER",text,url:url||undefined});return}catch(e){if(e&&e.name==="AbortError")return}}
  const wa="https://wa.me/?text="+encodeURIComponent(text);
  openSheet((c,close)=>{
    c.append(h("h3",{},"شارك الغرفة"),h("p",{class:"lead",style:"white-space:pre-wrap"},text),
      h("a",{class:"primary",href:wa,target:"_blank",rel:"noopener noreferrer",style:"display:flex;align-items:center;justify-content:center;min-height:44px;border-radius:14px;text-decoration:none;margin-bottom:8px"},"واتساب"),
      h("div",{class:"row"},h("button",{class:"primary",onclick:async()=>{try{await navigator.clipboard.writeText(text);toast("اننسخت الدعوة","good")}catch(e){toast(code,"good")}close()}},"انسخ النص"),h("button",{onclick:close},"إغلاق")));
  });
}
$("btnShare").addEventListener("click",()=>{shareRoom()});
$("btnCopy").onclick=async()=>{
  const code=roomCode||($("lobbyCode")&&$("lobbyCode").textContent)||"";
  const txt=inviteText(code);let ok=false;
  try{await navigator.clipboard.writeText(txt);ok=true}catch(e){
    try{const ta=document.createElement("textarea");ta.value=txt;ta.style.position="fixed";ta.style.opacity="0";document.body.append(ta);ta.select();ok=document.execCommand("copy");ta.remove()}catch(_){}}
  $("btnCopy").textContent=ok?"انسخت ✓":"ما قدرت أنسخ، اكتب الكود لصاحبك";
  setTimeout(()=>{$("btnCopy").textContent="انسخ رسالة الدعوة"},2200);
};
function goHome(){
  wwStop();chStop();
  if(mode==="solo")netSoloForfeit();
  if(mode==="room")netRoomLeave();
  NG.solo=null;
  forfeit();
  clearBot();$("winBox").classList.add("hidden");
  const wasOnline=mode==="online";
  G=null;M=null;hist=[];ghost=null;tool="move";mode="local";boardKey="";L=null;winBuiltMid=null;bubbles={};lastEmo={};emoteState=null;
  NG.localPriv=null;NG.wwSecret=null;NG.wwMine=null;NG.ww=null;NG.hv=null;NG.wwFocus=null;
  $("emoteBox").classList.add("hidden");$("btnEmote").setAttribute("aria-expanded","false");
  document.body.classList.remove("has-chat");
  if(wasOnline)leaveRoom();
  show("home");
}
let quitArm=0;
$("btnQuit").onclick=()=>{
  const q=$("btnQuit");
  if(G&&G.winner==null&&Date.now()-quitArm>2500){
    quitArm=Date.now();q.textContent=wouldForfeit()?"متأكد؟ تنحسب خسارة":"متأكد؟";q.classList.add("arm");
    setTimeout(()=>{q.textContent="خروج";q.classList.remove("arm")},2500);return;
  }
  quitArm=0;q.textContent="خروج";q.classList.remove("arm");goHome();
};
$("btnLeaveLobby").onclick=goHome;$("btnHome").onclick=goHome;
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&ghost&&$("sheet").classList.contains("hidden")){ghost=null;updateGhostUI()}});


/* ================= cloud (web version: Supabase backend) =================
   Inside Claude the game keeps using Claude's rooms and saves on the device.
   Everywhere else (GitHub Pages) the server owns the data: every change goes
   through the "spider" Edge Function and the browser only shows the result. */
const Cloud={on:false,sb:null,user:null,role:"player",offline:false,booting:false};
let actQ=Promise.resolve();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function withTimeout(p,ms){return Promise.race([p,new Promise((_,rej)=>setTimeout(()=>rej(Object.assign(new Error("الخادم تأخر في الرد، جرّب مرة ثانية"),{code:"timeout"})),ms))])}
function jwtOk(t){
  if(!t||typeof t!=="string")return false;
  const p=t.split(".");if(p.length!==3)return false;
  try{const b=p[1].replace(/-/g,"+").replace(/_/g,"/");const j=JSON.parse(atob(b+(b.length%4? "=".repeat(4-b.length%4):"")));return !j.exp||j.exp*1000>Date.now()+15000}catch(e){return false}
}
async function sessionToken(allowNew){
  if(!Cloud.sb)return "";
  const got=await withTimeout(Cloud.sb.auth.getSession(),10000);
  let session=got.data&&got.data.session;
  const had=!!session;
  if(session&&!jwtOk(session.access_token)){
    try{const rf=await withTimeout(Cloud.sb.auth.refreshSession(),10000);session=rf.data&&rf.data.session}catch(e){session=null}
    if(!jwtOk(session&&session.access_token))session=null;
  }
  if(!session&&!had&&allowNew){
    const r=await withTimeout(Cloud.sb.auth.signInAnonymously(),10000);
    if(r.error)throw r.error;
    session=r.data&&r.data.session;
  }
  if(session&&session.user)Cloud.user=session.user;
  return session&&jwtOk(session.access_token)?session.access_token:"";
}
function fnStatus(e){return e&&(e.status||(e.context&&e.context.status))||0}
async function api(action,payload){
  if(!Cloud.sb)throw Object.assign(new Error("ما فيه اتصال بالخادم"),{code:"offline"});
  const call=async()=>{
    const token=await sessionToken(false);
    if(!token)throw Object.assign(new Error(offlineNow()?"ما فيه اتصال، تقدر تلعب ضد الكمبيوتر":"انتهت الجلسة، اضغط للمحاولة مرة ثانية"),{code:offlineNow()?"offline":"auth"});
    return withTimeout(Cloud.sb.functions.invoke("spider",{body:{action,payload:payload||{}},headers:{Authorization:"Bearer "+token}}),15000);
  };
  let r;
  try{r=await call()}
  catch(e){throw e.code?e:Object.assign(new Error("تعذّر الاتصال بالخادم، تأكد من الإنترنت"),{code:"net"})}
  if(r.error&&(fnStatus(r.error)===401||/\b401\b|unauthorized|jwt/i.test(String(r.error.message||"")))){
    try{
      const rf=await withTimeout(Cloud.sb.auth.refreshSession(),10000);
      const s=rf.data&&rf.data.session;
      if(s&&jwtOk(s.access_token)){Cloud.user=s.user;r=await withTimeout(Cloud.sb.functions.invoke("spider",{body:{action,payload:payload||{}},headers:{Authorization:"Bearer "+s.access_token}}),15000)}
    }catch(e){}
  }
  if(r.error){
    let code="net",msg="تعذّر الاتصال بالخادم، تأكد من الإنترنت";
    try{const j=await r.error.context.json();code=j.error||code;msg=j.message||msg}catch(e){}
    throw Object.assign(new Error(msg),{code});
  }
  return r.data;
}
function applyProfile(prof){
  if(!prof||typeof prof!=="object")return;
  if(P.__ver&&prof.__ver&&prof.__ver<P.__ver)return;
  P=normalizeProfile(prof);P.__ver=prof.__ver;if(Cloud.user)P.id=Cloud.user.id;saveProfile();
}
/* what changed between two copies of the profile, for the end-of-match screen */
function diffOut(a,b){
  const out={xp:Math.max(0,b.xp-a.xp),coins:b.coins-a.coins,items:[],levelUps:[],ach:[],missions:[],streak:b.currentWinStreak>a.currentWinStreak?b.currentWinStreak:0,firstWinBonus:0,xpBefore:a.xp,levelBefore:a.level};
  for(const t in b.owned)for(const id of b.owned[t])if(!(a.owned[t]||[]).includes(id))out.items.push({t,id});
  for(const id of b.claimedAchievements)if(!a.claimedAchievements.includes(id))out.ach.push(id);
  for(let L=a.level+1;L<=b.level;L++)out.levelUps.push({L,rewards:levelRewards(L)});
  return out;
}
const err=t=>{throw Object.assign(new Error(t),{code:"bad"})};
/* one entry point for every change to the player's data: the server when online, the device otherwise */
const Act={
  q(fn){const p=actQ.then(fn,fn);actQ=p.catch(()=>{});return p},
  async run(action,payload,local){
    if(!Cloud.on)return local();
    return this.q(async()=>{const r=await api(action,payload);if(r&&r.profile)applyProfile(r.profile);return r||{}});
  },
  equip(t,id){return this.run("equip",{t,id},()=>{if(!equip(t,id,Owner.verified))err("ما تقدر تلبس هذا");return {}})},
  equipMany(items){return this.run("equip_many",{items},()=>{for(const t of EQUIP_TYPES)if(items[t])equip(t,items[t],Owner.verified);return {}})},
  wish(t,id){return this.run("wish",{t,id},()=>({on:toggleWish(t,id)}))},
  buy(t,id){return this.run("buy",{t,id},()=>{const r=buy(t,id,freeCoins());if(!r.ok)err(r.why==="coins"?"رصيدك ما يكفي":r.why==="owned"?"عندك هذا من قبل":r.why==="level"?"يحتاج المستوى "+fmt(r.lvl):"ما ينفع تشتريه");if(freeCoins())ownerLog("FREEBUY",t+":"+id);return {out:r.out}})},
  buyBundle(id){return this.run("buy_bundle",{id},()=>{const r=buyBundle(id,freeCoins());if(!r.ok)err(r.why==="coins"?"رصيدك ما يكفي":r.why==="level"?"يحتاج المستوى "+fmt(r.lvl):"عندك كل عناصرها");return {out:r.out}})},
  loadoutSave(name,items){return this.run("loadout_save",{name,items},()=>{const before=P.claimedAchievements.length,l=saveLoadout(name,items);if(!l)err("عندك ٦ تنسيقات، احذف وحدة أول");const out=newOut();out.ach=P.claimedAchievements.slice(before);return {out}})},
  loadoutUpdate(id,patch){return this.run("loadout_update",Object.assign({id},patch),()=>{if(!updateLoadout(id,patch))err("ما لقيت التنسيق");return {}})},
  loadoutDelete(id){return this.run("loadout_delete",{id},()=>{deleteLoadout(id);return {}})},
  loadoutEquip(id){return this.run("loadout_equip",{id},()=>{const r=equipLoadout(id,Owner.verified);if(!r)err("ما لقيت التنسيق");return {missing:r.missing}})},
  claimLogin(){return this.run("claim_login",{},()=>{const r=claimLogin();if(!r)err("استلمت مكافأة اليوم");return r})},
  setNick(nick){return this.run("set_nick",{nick},()=>{P.nickname=String(nick||"").trim().slice(0,16);saveProfile();return {}})},
  settings(patch){Object.assign(P.settings,patch);saveProfile();if(!Cloud.on)return Promise.resolve({});return this.q(()=>api("settings",patch).catch(()=>({})))},
  async redeem(input){
    if(!Cloud.on){
      const code=CodeService.normalize(input);
      if(OWNER_CMDS.has(code))return Owner.verified?{ok:true,ownerCmd:code}:{ok:false,err:"invalid"};
      const r=await CodeService.redeem(input);return r.ok?{ok:true,out:r.out,founder:!!r.def.founder,label:r.def.bundle||"",code:r.code}:r;
    }
    return this.q(async()=>{const r=await api("redeem",{code:input});if(r.profile)applyProfile(r.profile);return r});
  },
  owner(cmd,extra){return this.run("owner",Object.assign({cmd},extra||{}),()=>{
    if(!Owner.verified)err("الكود غير صحيح أو غير متاح");
    const n=extra&&extra.n;
    switch(cmd){
      case "MAXLEVEL":return {out:ownerSetLevel(MAX_LEVEL)};
      case "SETLEVEL":return {out:ownerSetLevel(n)};
      case "ADDCOINS":{const o=ownerAddCoins(n);if(!o)err("الكمية غير صحيحة");return {out:o}}
      case "ADDXP":{const o=ownerAddXp(n);if(!o)err("الكمية غير صحيحة");return {out:o}}
      case "INFINITECOINS":ownerToggle("infinite","INFINITECOINS");return {};
      case "XPBOOST":ownerToggle("xpBoost","XPBOOST");return {};
      case "COINBOOST":ownerToggle("coinBoost","COINBOOST");return {};
      case "UNLOCKALL":return {out:ownerUnlock(()=>true,"UNLOCKALL")};
      case "SECRETALL":return {out:ownerUnlock((t,it)=>it.rar==="secret","SECRETALL")};
      case "UNLOCKTYPE":return {out:ownerUnlock(tt=>tt===extra.t,"UNLOCK_"+String(extra.t).toUpperCase())};
      case "ALLACHIEVEMENTS":return {out:ownerAllAchievements()};
      case "FOUNDERONLY":return {out:ownerGrant(SECRET_CODES.MOHAMMED.rewards.filter(r=>r.id).map(r=>[r.t,r.id]),"FOUNDERONLY")};
      case "CREATOR":return {out:ownerGrant(CREATOR_BUNDLE,"CREATOR")};
      case "IDENTITY":return {out:ownerGrant([["badge","owner"],["title","owner"]],"OWNER_IDENTITY")};
    }
    err("أمر غير معروف");
  })}
};

/* ---------- start-up: session (guest first), then the server copy of the profile ---------- */
function giftSheet(gifts){
  openSheet((c,close)=>{c.append(h("div",{class:"bigemo"},ic("gift")),h("h3",{class:"center"},"وصلتك هدية من صاحب اللعبة!"));
    for(const gf of gifts){if(gf.note)c.append(h("p",{class:"lead center"},"«"+gf.note+"»"));c.append(h("div",{class:"chips",style:"justify-content:center;margin:8px 0"},...gf.rewards.map(r=>h("span",{class:"pill"},rewardText(r)))))}
    c.append(h("button",{class:"primary wide",style:"margin-top:12px",onclick:()=>{close();refreshPage()}},"شكرًا!"));sfx("unlock")});
}
let cloudP=null;
async function cloudStart(){
  if(Platform.kind!=="web"||!Cloud.sb)return;
  if(cloudP)return cloudP;
  cloudP=(async()=>{
  Cloud.booting=true;Cloud.offline=false;
  try{
    const token=await sessionToken(true);
    if(!token||!Cloud.user)throw Object.assign(new Error(!navigator.onLine?"ما فيه اتصال، تقدر تلعب ضد الكمبيوتر":"انتهت الجلسة"),{code:!navigator.onLine?"offline":"auth"});
    cid=Cloud.user.id;
    const legacy=P.__ver?null:{nickname:P.nickname,settings:P.settings};
    const r=await api("boot",{legacy});
    applyProfile(r.profile);Cloud.role=r.role;Cloud.username=r.username||null;Owner.verified=r.role==="owner";Owner.id=cid;Cloud.on=true;Cloud.err="";
    if(Owner.verified&&!isOwned("badge","owner"))Act.owner("IDENTITY").then(()=>refreshPage()).catch(()=>{});
    Cloud.announce=r.announce||null;
    if(r.gifts&&r.gifts.length)setTimeout(()=>giftSheet(r.gifts),600);
    if(r.out&&r.out.items&&r.out.items.length)toast("فزت ببطل الأسبوع الماضي!","good");
    resumeRoom();
  }catch(e){
    Cloud.on=false;Cloud.offline=true;
    Cloud.err=e&&(e.status===429||/rate limit|too many/i.test(e.message||""))?"rate":"net";
  }finally{Cloud.booting=false;refreshPage()}
  })();
  try{return await cloudP}finally{cloudP=null}
}
function onAuthChange(){
  if(!Cloud.sb)return;
  Cloud.sb.auth.onAuthStateChange((ev,session)=>{
    const id=session&&session.user&&session.user.id;
    if(ev==="USER_UPDATED"&&session){Cloud.user=session.user;refreshPage();return}
    if(id&&Cloud.user&&id!==Cloud.user.id){Cloud.user=session.user;P=normalizeProfile(null);saveProfile();setTimeout(cloudStart,0)}
  });
}
/* ---------- account card (profile page): username + password, no email ---------- */
const FAKE_MAIL=/@players\.spider-game\.app$/;
const userInput=(ph,ac)=>h("input",{placeholder:ph,autocomplete:ac,autocapitalize:"none",spellcheck:"false",maxlength:"20",style:"direction:ltr;text-align:left","aria-label":ph});
const passInput=(ph,ac)=>h("input",{type:"password",placeholder:ph,autocomplete:ac,maxlength:"72",style:"direction:ltr;text-align:left","aria-label":ph});
const userOk=v=>/^[a-z0-9_]{3,20}$/.test(v);
function cloudErrText(){return Cloud.err==="rate"?"الخادم وقّف تسجيل لاعبين جدد من شبكتك مؤقتًا. جرّب بعد شوي، أو جرّب من شبكة ثانية (واي فاي بدل بيانات الجوال).":"ما قدرت أتصل بالخادم. تقدر تلعب، بس تقدمك ما ينحفظ على حسابك لين يرجع الاتصال."}
function accountCard(){
  if(Platform.kind!=="web")return null;
  const box=h("div",{class:"card",id:"acctCard"});
  if(!Cloud.on){
    box.append(h("h3",{class:"ic-h"},ic("cloud"),"حسابك"),h("p",{class:"lead"},Cloud.booting?"يتصل بالخادم…":cloudErrText()),
      Cloud.booting?null:h("button",{class:"wide",onclick:()=>cloudStart()},"حاول مرة ثانية"));
    return box;
  }
  if(Cloud.username){
    box.append(h("h3",{class:"ic-h"},ic("cloud"),"حسابك"),h("p",{class:"lead",style:"margin-bottom:6px;direction:ltr;text-align:right;font-weight:800;color:var(--ink)"},"@"+Cloud.username),
      h("p",{class:"hint",style:"margin-top:0"},"تقدمك محفوظ على الخادم، وتدخل من أي جهاز باسم المستخدم وكلمة السر."),
      h("div",{class:"row"},h("button",{onclick:()=>passwordSheet()},"غيّر كلمة السر"),
        h("button",{onclick:()=>confirmSheet("تسجيل خروج","تطلع من حسابك على هالجهاز؟ ترجع تدخل باسم المستخدم وكلمة السر أي وقت.","اطلع",doLogout)},"تسجيل خروج")));
    return box;
  }
  const u=Cloud.user||{},mail=u.email&&!FAKE_MAIL.test(u.email)?u.email:"";
  const user=userInput("اسم المستخدم (حروف إنجليزية)","username"),pass=passInput("كلمة السر (٦ أحرف على الأقل)","new-password");
  const msg=h("p",{class:"hidden",role:"status"});const say=(t,c)=>{msg.textContent=t;msg.className=c};
  const make=h("button",{class:"primary wide",onclick:async()=>{
    const un=user.value.trim().toLowerCase(),pw=pass.value;
    if(!userOk(un)){say("اسم المستخدم من ٣ إلى ٢٠: حروف إنجليزية صغيرة أو أرقام أو _","err");return}
    if(pw.length<6){say("كلمة السر ٦ أحرف على الأقل","err");return}
    make.disabled=true;
    try{const r=await api("account_create",{username:un,password:pw});Cloud.username=r.username;sfx("unlock");toast("انحفظ حسابك ✓ تقدر تدخل فيه من أي جهاز","good");refreshPage()}
    catch(x){say(x.message,"err")}finally{make.disabled=false}}},"سوّ الحساب");
  box.append(h("h3",{class:"ic-h"},ic("cloud"),"حسابك"),
    h("p",{class:"lead",style:"margin-bottom:10px"},mail?"حسابك مربوط بـ "+mail+". سوّ اسم مستخدم وكلمة سر عشان تدخل من أي جهاز بسهولة.":"تلعب كضيف، وتقدمك محفوظ على الخادم. لو تبي تدخل من جهاز ثاني، سوّ اسم مستخدم وكلمة سر. هذا اختياري، والأونلاين يشتغل بدونه."),
    user,h("div",{style:"margin-top:8px"},pass),h("div",{style:"margin-top:10px"},make),msg,
    h("button",{class:"link",onclick:()=>loginSheet()},"عندك حساب؟ ادخل"));
  return box;
}
async function switchedAccount(session){
  if(!session||!session.user)return;
  if(mode==="room")await netRoomLeave();
  Cloud.user=session.user;Cloud.username=null;Owner.verified=false;P=normalizeProfile(null);saveProfile();
  await cloudStart();show("profile");
}
async function doLogout(){
  if(mode==="room")await netRoomLeave();
  try{await Cloud.sb.auth.signOut()}catch(e){}
  Cloud.user=null;Cloud.username=null;Owner.verified=false;P=normalizeProfile(null);saveProfile();
  await cloudStart();show("home");toast("طلعت من حسابك");
}
function loginSheet(){
  openSheet((c,close)=>{
    const user=userInput("اسم المستخدم","username"),pass=passInput("كلمة السر","current-password");
    const msg=h("p",{class:"hidden",role:"status"});
    const btn=h("button",{class:"primary",onclick:async()=>{
      const un=user.value.trim().toLowerCase(),pw=pass.value;
      if(!userOk(un)||!pw){msg.textContent="اكتب اسم المستخدم وكلمة السر";msg.className="err";return}
      btn.disabled=true;
      try{
        const r=await api("account_login",{username:un,password:pw});
        const v=await Cloud.sb.auth.verifyOtp({token_hash:r.token_hash,type:"magiclink"});
        if(v.error||!v.data||!v.data.session)throw new Error("تعذّر الدخول، جرّب مرة ثانية");
        close();await switchedAccount(v.data.session);toast("أهلًا "+r.username,"good");
      }catch(x){msg.textContent=x.message;msg.className="err"}finally{btn.disabled=false}}},"ادخل");
    c.append(h("h3",{},"ادخل لحسابك"),h("p",{class:"lead"},"تقدمك كضيف على هالجهاز ما ينضاف للحساب اللي بتدخله."),user,h("div",{style:"margin-top:8px"},pass),
      h("div",{class:"row",style:"margin-top:12px"},btn,h("button",{onclick:close},"إغلاق")),msg);
    setTimeout(()=>user.focus(),60);
  });
}
function passwordSheet(){
  openSheet((c,close)=>{
    const old=passInput("كلمة السر الحالية","current-password"),nw=passInput("كلمة السر الجديدة","new-password");
    const msg=h("p",{class:"hidden",role:"status"});
    const btn=h("button",{class:"primary",onclick:async()=>{
      if(nw.value.length<6){msg.textContent="كلمة السر ٦ أحرف على الأقل";msg.className="err";return}
      btn.disabled=true;
      try{await api("account_password",{old:old.value,password:nw.value});close();toast("تغيّرت كلمة السر","good")}
      catch(x){msg.textContent=x.message;msg.className="err"}finally{btn.disabled=false}}},"احفظ");
    c.append(h("h3",{},"غيّر كلمة السر"),old,h("div",{style:"margin-top:8px"},nw),h("div",{class:"row",style:"margin-top:12px"},btn,h("button",{onclick:close},"إلغاء")),msg);
  });
}

/* ---------- matches the server runs ---------- */
const NG={solo:null,room:null,busy:false,ch:null,poll:null,online:new Set(),connected:false,lastRowAt:0,myResult:null,skipSeq:-1};
function setNetBusy(b){NG.busy=b;if(G&&screen==="game")renderControls();else if(G&&screen==="ch")chRender();else if(G&&screen==="mg")mgRender()}
async function playSteps(steps,mine){
  for(let i=0;i<steps.length;i++){
    const prev=G;G=steps[i];afterChange(prev,i===0&&mine?"me":"bot");render();
    if(i<steps.length-1)await sleep(i===0&&mine?420:650);
  }
}
function netMatchMeta(modeName,seat){NG.snap={mid:G&&G.mid,p:JSON.parse(JSON.stringify({xp:P.xp,coins:P.coins,owned:P.owned,achievements:P.achievements,claimedLevelRewards:P.claimedLevelRewards}))};
  const bots=G.players.filter(p=>p.bot);
  M={mid:G.mid,mode:modeName,seat,startedAt:Date.now(),moves:0,practice:false,done:false,minOpp:99,botLevel:bots.reduce((m,p)=>Math.max(m,p.bot||0),0),bots:bots.length};
  lastResult=null;winBuiltMid=null;winDismissed=-1;tool="move";ghost=null;NG.myResult=null;
}
async function netSoloStart(rematch){
  if(NG.busy)return;setNetBusy(true);
  try{
    const start=curGame==="chess"?{game:"chess",bots:1,level:chLevel(),color:chColor,clock:chClock==="none"?"":chClock,cat:wwCat}:{game:curGame,bots:P.settings.botCount,level:P.settings.botLevel,cat:wwCat};
    const r=rematch?await api("solo_rematch",{id:NG.solo.id}):await api("solo_start",start);
    NG.ww=r.ww||null;NG.wwMid=r.state&&r.state.mid;NG.hv=r.view||null;NG.hvKey=r.state?r.state.mid+":"+(r.state.rnd||0):"";
    clearBot();mode="solo";hist=[];NG.solo={id:r.id,practice:false};
    G=r.state;
    const seat=G.game==="chess"?Math.max(0,G.players.findIndex(p=>p.id===cid)):0;
    netMatchMeta("bot",seat);show(G.game==="chess"?"ch":G.game?"mg":"game");render();
  }catch(e){toast(e.message,"bad")}
  finally{setNetBusy(false);if(G)render()}
}
async function netHSolo(a){
  setNetBusy(true);
  try{const r=await api("solo_act",{id:NG.solo.id,gseq:G.seq,a});if(r.view){NG.hv=r.view;NG.hvKey=r.state.mid+":"+(r.state.rnd||0)}
    if(r.result){applyProfile(r.result.profile);lastResult={mid:r.state.mid,out:r.result.out,won:r.state.winner===0};if(M)M.done=true}
    else if(r.state.winner!=null)lastResult={mid:r.state.mid,skipped:NG.solo.practice||r.practice?"practice":"short"};
    const steps=r.steps.slice(),fin=r.state;let prev=G;G=steps.shift()||fin;mgSound(prev);mgRender();
    for(const st of steps){await sleep(G.game==="bluff"?900:520);prev=G;G=st;mgSound(prev);mgRender()}
    G=fin;if(G&&G.game==="domino"&&(G.winner!=null||G.draw)&&!r.result)domClaim()}
  catch(e){toast(e.message,"bad");sfx("bad")}finally{setNetBusy(false);if(G)render()}
}
async function netSoloAct(a){
  if(G&&G.game==="wordweb"){setNetBusy(true);try{const r=await api("solo_act",{id:NG.solo.id,gseq:G.seq,a});if(r.ww){NG.ww=r.ww;NG.wwMid=r.state.mid}
      if(r.result){applyProfile(r.result.profile);lastResult={mid:r.state.mid,out:r.result.out,won:r.state.winner===0};if(M)M.done=true}
      else if(r.state.winner!=null)lastResult={mid:r.state.mid,skipped:NG.solo.practice||r.practice?"practice":"short"};
      const prev=G;G=r.steps.length?r.steps[0]:r.state;mgSound(prev);mgRender();
      if(r.steps.length>1)setTimeout(()=>{const p2=G;G=r.state;mgSound(p2);mgRender()},650);else G=r.state;}
    catch(e){toast(e.message,"bad");sfx("bad")}finally{setNetBusy(false);if(G)render()}return}
  if(NG.busy||!canAct())return;
  const prev=G;let ng;
  try{ng=applyAny(G,G.turn,a)}catch(e){return}
  G=ng;afterChange(prev,"me");setNetBusy(true);render();
  try{
    const r=await api("solo_act",{id:NG.solo.id,gseq:prev.seq,a});
    if(a.t!=="w"&&a.t!=="s")M.moves++;
    const bots=r.steps.slice(1);
    if(bots.length){await sleep(380);await playSteps(bots,false)}
    G=r.state;
    if(r.result){applyProfile(r.result.profile);lastResult={mid:G.mid,out:r.result.out,won:G.winner===0};M.done=true;winBuiltMid=null}
    else if(G.winner!=null){M.done=true;lastResult={mid:G.mid,skipped:NG.solo.practice||r.practice?"practice":"short"};winBuiltMid=null}
    if(G&&G.game==="chess"&&(G.winner!=null||G.draw))chessClaim();
  }catch(e){G=prev;toast(e.message,"bad")}
  finally{setNetBusy(false);if(G)render()}
}
let undoArmNet=0;
async function netSoloUndo(){
  if(NG.busy||!NG.solo)return;
  if(!NG.solo.practice){
    if(Date.now()-undoArmNet>3000){undoArmNet=Date.now();const b=$("btnUndo");b.textContent="اضغط مرة ثانية: المباراة تصير تدريب بدون مكافآت";b.classList.add("arm");setTimeout(()=>{if(Date.now()-undoArmNet>=2900){b.textContent="تراجع عن آخر حركة";b.classList.remove("arm")}},3000);return}
  }
  undoArmNet=0;setNetBusy(true);
  try{const r=await api("solo_undo",{id:NG.solo.id});G=r.state;NG.solo.practice=true;M.practice=true;M.done=false;lastResult=null;winDismissed=-1;toast("صارت المباراة تدريب، بدون مكافآت","bad");sfx("skip")}
  catch(e){toast(e.message,"bad")}
  finally{const b=$("btnUndo");b.textContent="تراجع عن آخر حركة";b.classList.remove("arm");setNetBusy(false);render()}
}
function netSoloForfeit(){
  if(!NG.solo||!G||G.winner!=null||NG.solo.practice)return;
  const id=NG.solo.id;api("solo_forfeit",{id}).then(r=>{if(r&&r.profile)applyProfile(r.profile);if(r&&r.counted)toast("انحسبت خسارة لأنك طلعت من المباراة","bad")}).catch(()=>{});
}
/* ---- online rooms ---- */
async function netRoomEnter(create,code,opts){
  onlineErr("");setBusy(true);
  try{
    if(!Cloud.on)await cloudStart();
    if(!Cloud.on){onlineErr(cloudErrText());return}
    const r=create?await api("room_create",{public:!!(opts&&opts.public),game:curGame}):await api("room_join",{code});
    openNetRoom(r.room);
  }catch(e){onlineErr(e.message)}
  finally{setBusy(false)}
}
async function netRoomQuick(){
  onlineErr("");setBusy(true);
  try{if(!Cloud.on)await cloudStart();if(!Cloud.on){onlineErr(cloudErrText());return}
    const r=await api("room_quick",{game:curGame});openNetRoom(r.room);toast(r.joined?"دخلت غرفة عامة":"ما فيه غرف مفتوحة، سوّينا لك غرفة عامة","good")}
  catch(e){onlineErr(e.message)}finally{setBusy(false)}
}
let roomsCache=null,roomsAt=0,roomsLoading=false;
async function loadRooms(){
  if(Platform.kind!=="web"||roomsLoading)return;roomsLoading=true;renderRoomList();
  try{if(!Cloud.on)await cloudStart();const r=await api("room_list",{game:curGame});roomsCache=r.rooms}catch(e){roomsCache={error:e.message}}
  roomsLoading=false;roomsAt=Date.now();renderRoomList();
}
function renderRoomList(){
  const box=$("roomList");if(!box)return;box.textContent="";
  if(roomsLoading&&!roomsCache){box.append(h("div",{class:"skel",style:"height:62px"}),h("div",{class:"skel",style:"height:62px;margin-top:8px"}));return}
  if(!roomsCache)return;
  if(roomsCache.error){box.append(h("p",{class:"err",style:"margin:6px 0"},softenErr(roomsCache.error)));return}
  if(!roomsCache.length){box.append(h("div",{class:"rooms-empty"},ic("users"),h("span",{},"ما فيه غرف عامة مفتوحة الحين. سوّ غرفتك العامة وخلّ اللاعبين يدخلون.")));return}
  for(const r of roomsCache){const host=r.host||{},pub=sanPub(host.pub,!!host.owner)||{};
    box.append(h("div",{class:"roomrow"},avatar((SKINS[host.skin]||SKINS[0]).id,pub.fr,40,pub.dc),
      h("div",{class:"grow"},h("div",{class:"rn"},r.name,host.owner?ownerTag():null),
        h("div",{class:"rm"},h("span",{},ic("users"),fmt(r.count)+"/"+fmt(r.max)),h("span",{},ic("clock"),r.timer?fmt(r.timer)+" ثانية":"بدون وقت"),h("span",{class:"status live"},h("i"),"بانتظار لاعبين"))),
      h("button",{class:"primary small",onclick:()=>netRoomEnter(false,r.code),"aria-label":"ادخل "+r.name},"ادخل")))}
}
function royalEntrance(m){
  const o=h("div",{class:"royal-in",role:"status","aria-live":"polite"},h("div",{class:"ri-box"},ic("crown"),h("b",{},"THE CREATOR"),h("span",{},m.id===cid?"دخلت الغرفة":"دخل الغرفة")));
  document.body.append(o);sfx("unlock");setTimeout(()=>o.classList.add("out"),2300);setTimeout(()=>o.remove(),2900);
}
function decorateNetLobby(){
  const row=NG.room;if(!row)return;
  const list=$("lobbyList");list.textContent="";list.className="slots";
  const ms=row.members,gm=(row.settings&&row.settings.game)||"webbound",maxS=MAX_PLAYERS[gm]||4;
  let gc=$("lobbyGameChip");if(!gc){gc=h("span",{class:"chip on sm",id:"lobbyGameChip"});$("lobbyCode").before(gc)}gc.textContent=gameById(gm).name;
  let wc=$("lobbyCat");if(!wc){wc=h("div",{id:"lobbyCat"});list.after(wc)}wc.textContent="";wc.classList.toggle("hidden",gm!=="wordweb"&&gm!=="ballclash"&&gm!=="domino"&&gm!=="chess");
  const ts=$("timerSeg");if(ts){ts.classList.toggle("hidden",gm==="chess");if(ts.previousElementSibling)ts.previousElementSibling.classList.toggle("hidden",gm==="chess")}
  if(gm==="ballclash"){const st=row.settings||{},sz=st.bcSize||2,pk=st.bcPick||"secret",host=row.host===cid;
    wc.append(h("span",{class:"lbl mt"},"عدد الكور لكل لاعب"),host?h("div",{class:"chips"},...[1,2,3,4,5].map(n=>h("button",{class:"chip"+(sz===n?" on":""),onclick:()=>netRoomCall("room_settings",{bcSize:n})},fmt(n)))):h("p",{class:"hint",style:"margin:4px 0 0"},fmt(sz)+" كور"),
      h("span",{class:"lbl mt"},"طريقة الاختيار"),host?h("div",{class:"chips"},...[["secret","سري"],["draft","بالتناوب"]].map(v=>h("button",{class:"chip"+(pk===v[0]?" on":""),onclick:()=>netRoomCall("room_settings",{bcPick:v[0]})},v[1]))):h("p",{class:"hint",style:"margin:4px 0 0"},pk==="draft"?"بالتناوب":"سري"))}
  if(gm==="wordweb"){const cur=(row.settings&&row.settings.cat)||"fruit";
    wc.append(h("span",{class:"lbl mt"},"التصنيف"),row.host===cid?h("div",{class:"chips cat-chips"},...Object.keys(WW_CATS).map(k=>h("button",{class:"chip"+(cur===k?" on":""),onclick:()=>netRoomCall("room_settings",{cat:k})},WW_CATS[k].name))):h("p",{class:"hint",style:"margin:4px 0 0"},"صاحب الغرفة اختار: "+(WW_CATS[cur]||WW_CATS.fruit).name))}
  for(let k=0;k<maxS;k++){const m=ms[k];
    if(!m){list.append(h("li",{class:"slot empty"},h("span",{class:"slot-av"},ic("users")),h("span",{class:"slot-nm"},"بانتظار لاعب")));continue}
    const pub=sanPub(m.pub,!!m.owner)||{},isHost=m.id===row.host,here=!NG.online.size||NG.online.has(m.id)||m.id===cid;
    list.append(h("li",{class:"slot"+(m.id===cid?" me":"")+(here?"":" away")},avatar((SKINS[m.skin]||SKINS[0]).id,pub.fr,52,pub.dc),
      h("span",{class:"slot-nm"},nameEl(String(m.nick||"لاعب").slice(0,16),pub.th),pub.bd?badgeEl(pub.bd,16):null),
      h("span",{class:"slot-st"},isHost?h("span",{class:"tagc host"},ic("crown"),"صاحب الغرفة"):m.ready?h("span",{class:"tagc ok"},ic("check"),"جاهز"):h("span",{class:"tagc"},"مو جاهز"),
        m.owner?ownerTag():null,!here?h("span",{class:"tagc warn"},"غير متصل"):null)))}
  if(ms.length>maxS)list.append(h("li",{class:"slot-more"},"و"+fmt(ms.length-maxS)+" يتفرّجون"));
  const me=ms.find(m=>m.id===cid),host=row.host===cid,rb=$("btnReady");
  rb.classList.toggle("hidden",host||!me||ms.indexOf(me)>=maxS);
  if(me&&!host){rb.textContent=me.ready?"إلغاء الجاهزية":"أنا جاهز";rb.classList.toggle("primary",!me.ready);rb.onclick=()=>{sfx("move");netRoomCall("room_ready",{ready:!me.ready})}}
  if(gm==="domino"){const seats=(row.settings&&row.settings.domSeats)===4?4:2;
    wc.append(h("span",{class:"lbl mt"},"حجم الطاولة"),row.host===cid?h("div",{class:"chips"},h("button",{class:"chip"+(seats===2?" on":""),onclick:()=>netRoomCall("room_settings",{domSeats:2})},"٢ سحب"),h("button",{class:"chip"+(seats===4?" on":""),onclick:()=>netRoomCall("room_settings",{domSeats:4})},"٤ فرق")):h("p",{class:"hint",style:"margin:4px 0 0"},seats===4?"أربعة، والكمبيوتر يكمّل المقاعد":"اثنين، والكمبيوتر يكمّل لو لحالك"))}
  if(gm==="chess"){const ck=(row.settings&&row.settings.chessClock)||"";
    const opts=[["","بدون"],["3+2","٣+٢"],["5+0","٥+٠"],["10+0","١٠+٠"]];
    wc.append(h("span",{class:"lbl mt"},"الساعة"),row.host===cid?h("div",{class:"chips"},...opts.map(([id,name])=>h("button",{type:"button",class:"chip"+(ck===id?" on":""),onclick:()=>netRoomCall("room_settings",{chessClock:id||"none"})},name))):h("p",{class:"hint",style:"margin:4px 0 0"},(opts.find(o=>o[0]===ck)||opts[0])[1]))}
  const wait=ms.slice(0,maxS).filter(m=>m.id!==row.host&&!m.ready),sb=$("btnStart"),minP=gm==="domino"?1:(MIN_PLAYERS[gm]||2);
  if(host){sb.disabled=ms.length<minP;sb.textContent=ms.length<minP?(minP>2?"تحتاج "+fmt(minP)+" لاعبين ("+fmt(ms.length)+" الحين)":"ننتظر لاعب ثاني"):wait.length?"ابدأ (ننتظر "+plural(wait.length,"لاعب","لاعبين","لاعبين","لاعب")+")":"ابدأ المباراة"}
  $("lobbyHint").textContent=gm==="chess"&&host?"غرفة شطرنج خاصة. شارك الرابط، وتحتاج لاعبين اثنين. الأبيض هو صاحب الغرفة.":gm==="domino"&&host?"غرفة دومينو خاصة. شارك الرابط، أو ابدأ والكمبيوتر يكمّل لين تصير ٢ أو ٤.":host?(ms.length<2?"شارك الكود مع أصحابك، أو انتظر لاعبين من الغرف العامة.":wait.length?"تقدر تبدأ لما الكل يضغط «أنا جاهز».":"الكل جاهز، ابدأ متى ما تبي."):(me&&me.ready?"أنت جاهز، ننتظر صاحب الغرفة يبدأ.":"اضغط «أنا جاهز» لما تكون مستعد.");
}
async function openNetRoom(row){
  const gm=(row.settings&&row.settings.game)||"webbound";
  if(gm==="chess"){try{await ensureChess()}catch(e){toast("تعذّر تحميل اللعبة، تحقق من الاتصال وحاول مرة ثانية","bad");return}}
  else if(gm!=="webbound"){try{await ensureGames()}catch(e){toast("تعذّر تحميل اللعبة، تحقق من الاتصال وحاول مرة ثانية","bad");return}}
  leaveRoom();clearBot();mode="room";NG.room=null;NG.myResult=null;G=null;M=null;roomCode=row.code;
  try{localStorage.setItem("spider_room",row.code)}catch(e){}
  $("lobbyCode").textContent=row.code;subscribeNetRoom(row.code);onRoomRow(row,true);renderConn();
}
function subscribeNetRoom(code){
  unsubscribeNetRoom();
  const ch=Cloud.sb.channel("room-"+code,{config:{broadcast:{self:false},presence:{key:cid}}});
  ch.on("postgres_changes",{event:"*",schema:"public",table:"rooms",filter:"code=eq."+code},pl=>{
    if(pl.eventType==="DELETE"){netRoomGone();return}
    if(pl.new&&pl.new.code===code)onRoomRow(pl.new)});
  ch.on("broadcast",{event:"emote"},msg=>onNetEmote(msg&&msg.payload));
  ch.on("broadcast",{event:"chat"},msg=>onNetChat(msg&&msg.payload));
  ch.on("presence",{event:"sync"},()=>{NG.online=new Set(Object.keys(ch.presenceState()||{}));if(screen==="lobby")renderLobby();else if(G&&screen==="game")renderPlayers()});
  ch.subscribe(async st=>{
    NG.connected=connected=st==="SUBSCRIBED";renderConn();
    if(NG.connected){try{await ch.track({id:cid})}catch(e){}refreshNetRoom()}
  });
  NG.ch=ch;
  NG.poll=setInterval(()=>{if(mode==="room"&&NG.room&&(!NG.connected||Date.now()-NG.lastRowAt>8000))refreshNetRoom()},4000);
}
function unsubscribeNetRoom(){
  if(NG.poll){clearInterval(NG.poll);NG.poll=null}
  if(NG.ch){const c=NG.ch;NG.ch=null;try{c.untrack()}catch(e){}try{Cloud.sb.removeChannel(c)}catch(e){}}
  NG.online=new Set();NG.connected=false;
}
async function refreshNetRoom(force){
  if(!NG.room)return;
  try{const r=await api("room_get",{code:NG.room.code});onRoomRow(r.room,!!force)}
  catch(e){if(e.code==="no_room")netRoomGone()}
}
function netRoomGone(){
  if(mode!=="room")return;
  unsubscribeNetRoom();NG.room=null;try{localStorage.removeItem("spider_room")}catch(e){}
  toast("الغرفة انقفلت","bad");G=null;M=null;mode="local";show("home");
}
function onRoomRow(row,force){
  if(!row||mode!=="room")return;
  NG.lastRowAt=Date.now();
  if(!force&&NG.room&&row.seq<=NG.room.seq)return;
  const before=NG.room&&NG.room.code===row.code?new Set(NG.room.members.map(m=>m.id)):null;
  NG.room=row;roomCode=row.code;
  if(!(row.member_ids||[]).includes(cid)){netRoomGone();return}
  for(const m of row.members)if(m.owner&&(before?!before.has(m.id):m.id===cid))royalEntrance(m);
  if(row.status==="lobby"||!row.state){G=null;if(screen!=="lobby")show("lobby");else renderLobby();renderConn();return}
  /* my own move is already on screen while the server confirms it */
  if(NG.busy&&!force&&G&&row.state.mid===G.mid&&row.state.seq<G.seq){if(screen==="game"||screen==="mg"||screen==="ch")render();return}
  const prev=G;G=row.state;
  const seat=G.players.findIndex(p=>p.id===cid);
  if(!prev||prev.mid!==G.mid)netMatchMeta("online",seat);
  const mine=G.last&&G.players[G.last.i]&&G.players[G.last.i].id===cid;
  afterChange(prev,mine?"me":"remote");
  if(G.game==="chess"&&(G.winner!=null||G.draw)){if(M)M.done=true;chessClaim()}
  else if(G.game==="domino"&&(G.winner!=null||G.draw)){if(M)M.done=true;domClaim()}
  else if(G.winner!=null&&M&&!M.done){M.done=true;if(seat>=0)netFetchResult(G,seat)}
  const scr=G.game==="chess"?"ch":G.game?"mg":"game";if(screen!==scr)show(scr);render();
}
async function netFetchResult(g,seat){
  if(g.seq-(g.s0||g.seq)<(g.game==="ballclash"?1:g.game==="xo"?5:g.game==="wordweb"?3:6)){lastResult={mid:g.mid,skipped:"short"};winBuiltMid=null;render();return}
  for(let i=0;i<7;i++){
    if(NG.myResult&&NG.myResult.mid===g.mid){lastResult=NG.myResult;winBuiltMid=null;if(screen==="game"||screen==="mg")render();api("profile").then(x=>applyProfile(x.profile)).catch(()=>{});return}
    await sleep(i?900:500);
    try{const r=await api("profile");const np=normalizeProfile(r.profile);
      if(np.claimedMatches.includes(g.mid)){const out=diffOut(NG.snap&&NG.snap.mid===g.mid?Object.assign({},P,NG.snap.p):P,np);applyProfile(r.profile);lastResult={mid:g.mid,out,won:g.winner===seat};winBuiltMid=null;if(screen==="game"&&G&&G.mid===g.mid)render();return}}catch(e){}
  }
}
async function netRoomCall(action,extra,optimistic){
  if(NG.busy||!NG.room)return null;setNetBusy(true);
  try{const r=await api(action,Object.assign({code:NG.room.code},extra||{}));
    if(r.mine&&r.room&&r.room.state)NG.myResult={mid:r.room.state.mid,out:r.mine,won:r.room.state.winner===r.room.state.players.findIndex(p=>p.id===cid)};
    if(r.ww&&r.room&&r.room.state){NG.ww=r.ww;NG.wwMid=r.room.state.mid}
    if(r.view&&r.room&&r.room.state){NG.hv=r.view;NG.hvKey=r.room.state.mid+":"+(r.room.state.rnd||0)}
    if(r.room)onRoomRow(r.room);return r}
  catch(e){toast(e.message,"bad");if(optimistic||["stale","not_your_turn","ended","not_playing"].includes(e.code)){NG.busy=false;await refreshNetRoom(true)}return null}
  finally{setNetBusy(false);if(G)render()}
}
const netRoomAct=a=>{
  if(NG.busy||!G||!canAct())return;
  const prev=G;let ng;
  try{ng=applyAny(G,G.turn,a)}catch(e){return}
  G=ng;afterChange(prev,"me");render();
  if(a.t!=="w"&&a.t!=="s"&&M)M.moves++;
  return netRoomCall("room_act",{gseq:prev.seq,a},true);
};
const netRoomSkip=()=>netRoomCall("room_skip",{gseq:G.seq});
async function netRoomLeave(){
  const code=NG.room&&NG.room.code;unsubscribeNetRoom();NG.room=null;try{localStorage.removeItem("spider_room")}catch(e){}
  if(code)try{await api("room_leave",{code})}catch(e){}
}
async function resumeRoom(){
  let code=null;try{code=localStorage.getItem("spider_room")}catch(e){}
  if(!code||mode==="room")return;
  try{const r=await api("room_get",{code});if(r&&r.room){openNetRoom(r.room);toast("رجعناك لغرفتك "+code,"good")}}
  catch(e){try{localStorage.removeItem("spider_room")}catch(_){}}
}
function netRoster(){
  if(!NG.room)return [];
  const r=NG.room,known=NG.online.size>0;
  return r.members.map(m=>({id:m.id,nick:String(m.nick||"لاعب").slice(0,16),skin:isInt0(m.skin)?m.skin:0,host:m.id===r.host,timer:(r.settings||{}).timer||0,
    isMe:m.id===cid,owner:!!m.owner,pub:sanPub(m.pub,!!m.owner),lt:(r.settings||{}).lt||"classic",bs:(r.settings||{}).bs||"classic",em:null,here:!known||NG.online.has(m.id)||m.id===cid}));
}
const isInt0=v=>Number.isInteger(v)&&v>=0&&v<SKINS.length;
function onNetEmote(p){
  if(!p||typeof p!=="object"||!NG.room||!G)return;
  const m=NG.room.members.find(x=>x.id===p.from),it=findItem("emote",p.e);
  if(!m||!it||(isOwnerItem(it)&&!m.owner)||P.settings.muteEmotes)return;
  const seat=G.players.findIndex(x=>x.id===p.from);if(seat>=0){showBubble(seat,p.e);sfx("emote")}
}
/* ---- shared by every mode: one place that turns a chosen action into a move ---- */
function playAction(a){
  if(!canAct())return;
  if(a&&a.t==="m"){if(!a.to||!validMoves(G,G.turn).some(p=>p[0]===a.to[0]&&p[1]===a.to[1])){sfx("bad");return}}
  else if(a&&a.t==="w"){if(!a.w||wallError(G,a.w)){sfx("bad");return}}
  else if(a&&a.t==="s"){if(!stuck(G,G.turn)){sfx("bad");return}}
  if(mode==="solo")return netSoloAct(a);
  if(mode==="room")return netRoomAct(a);
  commit(a.t==="m"?doMove(G,G.turn,a.to):a.t==="w"?doWall(G,G.turn,a.w):doSkip(G));
}
/* ---- global weekly leaderboard from the server ---- */
let lbCache=null,lbLoading=false;
async function loadNetLeaders(){
  if(lbLoading)return;lbLoading=true;
  try{lbCache=await api("leaderboard",{});lbCache.at=Date.now()}catch(e){lbCache={error:e.message}}
  finally{lbLoading=false;if(screen==="leaders")renderLeaders()}
}

/* ================= start ================= */
P=loadProfile();cid=P.id;
ensureMissions();
const bootOut=newOut();weeklyRollover(bootOut);
saveProfile();
if($("heroWeb"))cornerWeb($("heroWeb"),0,0,1,1,150,"currentColor",.8);
renderFaq();renderSound();show("home");
setTimeout(maybeIntro,500);
function openInvite(code){
  INVITE_GAME=JOIN_GAME||INVITE_GAME;JOIN_GAME="";
  JOIN_CODE="";roomCode=code;mode="invite";isCreator=true;G=null;hist=[];
  try{const u=new URL(location.href);u.searchParams.delete("join");u.searchParams.delete("g");history.replaceState({},"",u.pathname+u.search+u.hash)}catch(e){}
  const box=$("lobbyCode");if(box)box.textContent=code;show("lobby");
  if(navigator.onLine)cloudStart().then(()=>{if(!Cloud.on||mode!=="invite")return;return api("room_join",{code})}).then(r=>{if(r&&r.room&&mode==="invite")openNetRoom(r.room)}).catch(()=>{});
}
function maybeIntro(){
  if(JOIN_CODE){openInvite(JOIN_CODE);return}
  let seen="";try{seen=localStorage.getItem("spider_intro")||""}catch(e){return}
  if(seen||screen!=="home")return;
  const steps=[
    ["أهلًا في SPIDER","ألعاب عربية، تلعبها مع أصحابك من أي جهاز. ولو ما فيه نت، تلعب ضد الكمبيوتر."],
    ["اختر لعبة وابدأ","من الرئيسية أو صفحة الألعاب. تبويب «ضد الكمبيوتر» يشتغل بدون حساب."],
    ["تقدّمك عندك","كل فوز يرفع مستواك. المتجر فيه الأشكال، وكود الهدية تحت في حسابك."]
  ];
  let i=0;
  const done=close=>{try{localStorage.setItem("spider_intro","1")}catch(e){}close()};
  openSheet((c,close)=>{
    const paint=()=>{c.textContent="";
      c.append(h("p",{class:"hint",style:"margin:0"},fmt(i+1)+" من "+fmt(steps.length)),
        h("h3",{style:"margin:8px 0 4px"},steps[i][0]),
        h("p",{class:"lead"},steps[i][1]),
        h("div",{class:"row"},
          h("button",{type:"button",onclick:()=>done(close)},"تخطّي"),
          h("button",{class:"primary",type:"button",onclick:()=>{if(i<steps.length-1){i++;paint()}else done(close)}},i<steps.length-1?"التالي":"يلا نلعب")));
    };
    paint();
  });
}
if(bootOut.items.length)setTimeout(()=>{sfx("unlock");toast("فزت ببطل الأسبوع الماضي! شارتك ولقبك في حسابك","good")},600);
Platform.ready.then(()=>{
  if(Platform.kind==="web"){onAuthChange();cloudStart();
    $("onlineHint").textContent="صاحبك يفتح نفس رابط اللعبة ويدخل كود الغرفة، بدون أي حساب.";
    $("lobbyInviteHint").textContent="أرسل رابط اللعبة لصاحبك، وخله يدخل الكود هذا.";
  }
});
Platform.ready.then(async()=>{
  const u=Platform.user,db=Platform.db;
  if(db)LocalCodeProvider.remote=async code=>{const s=await db.collection("codes").doc(code).get();return s.exists?s.data():null};
  if(!u)return;
  try{const id=await u.id();if(id){cid=id;Owner.id=id}}catch(e){}
  try{Owner.verified=!!(await u.isOwner())}catch(e){Owner.verified=false}
  if(db){
    try{const s=await db.doc("app/owner").get();const d=s.exists?s.data():null;Owner.ownerId=d&&typeof d.id==="string"?d.id:null}catch(e){}
    if(Owner.verified&&Owner.id&&Owner.ownerId!==Owner.id){try{await db.doc("app/owner").set({id:Owner.id,at:Date.now()});Owner.ownerId=Owner.id}catch(e){}}
  }
  if(Owner.verified){if(!Owner.ownerId)Owner.ownerId=Owner.id;ownerGrantIdentity()}
  if(!P.nickname){try{const nm=await u.name();if(nm&&!P.nickname){P.nickname=nm.slice(0,16);saveProfile()}}catch(e){}}
  if(room)pushPresence();
  if(G&&screen==="game"){boardKey="";render()}else refreshPage();
});

/* ================= match screen for WEBGRID and XO∞ ================= */
const applyAny=(g0,seat,a)=>g0.game?GAME_RULES[g0.game].apply(g0,seat,a):a.t==="m"?doMove(g0,seat,a.to):a.t==="w"?doWall(g0,seat,a.w):doSkip(g0);
const seatColor=i=>{const sk=skinOf(i);return (sk&&sk.c)||["#3FB7FF","#E62948","#FFB02E","#39FF88"][i%4]};
let mgQuitArm=0;
function mgSound(prev){
  if(!G)return;
  if(G.game==="wordweb"&&prev&&prev.prog&&prev.mid===G.mid){const me=mode==="solo"?0:mySeat();
    G.prog.forEach((p,i)=>{if(i===me)return;const q=prev.prog[i]||{};const nm=G.players[i].nick;
      if(p.found>q.found)toast(nm+" لقى حرف صح","good");else if(p.out&&!q.out)toast(nm+" خلصت محاولاته")});
    if(G.winner!=null&&prev.winner==null){sfx("unlock");buzz([30,40,30]);return}
    const mp=G.prog[me],mq=prev.prog[me];if(mp&&mq){if(mp.found>mq.found)sfx("unlock");else if(mp.wrong>mq.wrong){sfx("bad");buzz(40)}}
    return}
  if(G.winner!=null&&(!prev||prev.winner==null)){sfx("unlock");buzz([30,40,30]);return}
  if(prev&&prev.seq!==G.seq){if(G.last&&G.last.got)sfx("unlock");else sfx("move");
    if(G.winner==null&&(mode==="room"||mode==="solo")&&mySeat()===G.turn&&prev.turn!==G.turn)sfx("turn")}
}
function mgRender(){
  if(!G||!G.game)return;
  $("mgTitle").textContent=gameById(G.game).name;
  const pb=$("mgPlayers");pb.textContent="";
  G.players.forEach((p,i)=>{const pub=pubFor(p),sk=skinOf(i),on=G.game==="domino"?(G.winner==null&&!G.draw?G.turn===i:(G.winners?G.winners.includes(i):G.winner===i)):(G.winner==null?G.turn===i:G.winner===i);
    const sc=G.game==="domino"?((G.n===4?(i%2?"فريق ب":"فريق أ")+" · ":"")+"أحجار "+fmt((G.counts&&G.counts[i])||0)):G.game==="ballclash"?(G.phase==="pick"?(G.pick==="draft"?fmt(G.picks[i].length)+"/"+fmt(G.size):G.locked[i]?"قفل":"يختار"):""):G.game==="nightweb"?(G.alive[i]?(G.phase==="day"&&G.votes[i]!=null?"صوّت":"حي"):"طلع · "+NW.ROLE[G.dead[i]]):G.game==="bluff"?(G.out[i]?"خرج":"نرد "+fmt(G.dice[i])):G.game==="flyhunt"?"ذباب باقي "+fmt(G.left[i]):G.game==="webwar"?"الأرض "+fmt(WR.count(G,i)):G.game==="dama"?"القطع "+fmt(G.b.filter(q=>DM.own(q,i)).length):G.game==="webgrid"?fmt(G.pts[i])+" مربع":G.game==="wordweb"?(G.prog[i].done?"كمّل الكلمة!":G.prog[i].out?"انقطع خيطه":"لقى "+fmt(G.prog[i].found)+"/"+fmt(G.len)+" · أخطاء "+fmt(G.prog[i].wrong)+"/"+fmt(G.max)):"علامات "+fmt((G.order&&G.order[i]||[]).length)+"/٣";
    pb.append(h("div",{class:"pc"+(on?" turn":""),style:"--tc:"+seatColor(i)},pub?avatar(sk.id,pub.fr,34,pub.dc):h("span",{class:"pc-ball"},ballSvg(sk,30)),
      h("div",{class:"meta"},h("span",{class:"nm"},p.nick,p.bot?ic("cpu","pc-bot"):null,(mode==="room"||mode==="online")&&p.id===cid?h("span",{class:"you"},"أنت"):null),h("span",{class:"sub"},sc))))});
  const p=G.players[G.turn];let t;
  if(G.winner!=null&&G.game==="ballclash"&&NG.bcDone!==G.mid)t="المعركة شغّالة…";
  else if(G.game==="domino"&&(G.winner!=null||G.draw)){const mine=mode==="solo"?0:mode==="room"?mySeat():(hasBots()?0:-1);t=G.draw?"تعادل":(mine>=0&&globalThis.DOMINO&&DOMINO.playerWon(G,mine)?"فزت!":"فاز "+G.players[G.winner].nick)}
  else if(G.winner!=null){const w=G.players[G.winner];t=(w.id===cid||(mode==="local"&&hasBots()&&!w.bot))?"فزت!":"فاز "+w.nick}
  else if(G.game==="ballclash"){const s=mySeat();t=G.phase==="battle"?"المعركة شغّالة":G.pick==="draft"?(G.turn===s?"دورك تختار كورة":"دور "+G.players[G.turn].nick+" يختار"):s>=0&&G.locked[s]?"قفلت تشكيلتك، ننتظر الباقين":"اختر "+fmt(G.size)+" كور وقفّل بالسر"}
  else if(G.game==="nightweb"){const s=mySeat();t=s<0?"تتفرّج":!G.alive[s]?"طلعت من اللعبة، تقدر تتفرّج":G.phase==="night"?"الليل "+fmt(G.day)+": أصحاب الأدوار يختارون بالسر":"النهار "+fmt(G.day)+": تناقشوا وصوّتوا"}
  else if(G.game==="wordweb"){const s=mode==="solo"?0:mode==="local"?wwSeat():mySeat(),q=s>=0?G.prog[s]:null;t=!q?"تتفرّج على المباراة":q.out?"انقطع خيطك، ننتظر الباقين…":(mode==="local"&&!hasBots()?"دور "+G.players[s].nick+" — خمّن حرف":"خمّن حرف من الكيبورد")}
  else if(G.game==="domino")t=p&&p.bot?p.nick+" يفكّر…":canAct()?"دورك! العب حجر على أحد الطرفين":"ننتظر "+(p?p.nick:"")+"…";
  else if(mode==="local"&&!hasBots())t="دور "+p.nick+(G.game==="webwar"?": مد خيطك":G.game==="webgrid"?": ارسم خيط":G.game==="dama"?": حرّك قطعة":": اختر خانة");
  else if(p.bot)t=p.nick+" يفكّر…";
  else t=canAct()?(G.game==="bluff"?"دورك! زايد، أو قل كذّاب":G.game==="flyhunt"?"دورك! اضرب خانة في شبكة خصمك":G.game==="webwar"?"دورك! مد خيطك لخانة جنب أرضك":G.game==="webgrid"?"دورك! ارسم خيط بين نقطتين":G.game==="dama"?(dmHasCapture(G,G.turn)?"دورك! عندك أكل إجباري":"دورك! حرّك قطعة"):"دورك! اختر خانة"):"ننتظر "+p.nick+" يلعب…";
  $("mgStatus").textContent=t;
  const bd=$("mgBoard");bd.textContent="";bd.classList.toggle("bc-host",G.game==="ballclash");if(G.game==="ballclash")renderBCR(bd);else if(G.game==="nightweb")renderNW(bd);else if(G.game==="bluff")renderBF(bd);else if(G.game==="flyhunt")renderFH(bd);else if(G.game==="webwar")renderWR(bd);else if(G.game==="webgrid")renderWG(bd);else if(G.game==="wordweb")renderWW(bd);else if(G.game==="domino")renderDOM(bd);else if(G.game==="dama")renderDM(bd);else renderXO(bd);
  renderMgWin();
  const hb=$("mgHint"),hintable=["webgrid","xo","dama","webwar"].includes(G.game);if(hb)hb.classList.toggle("hidden",!(hintable&&ownerSees("seeHint")&&canAct()));
}
function renderWG(bd){
  const R=G.R,C=G.C,U=10,O=3,W=C*U+O*2,H=R*U+O*2,act=canAct(),L=G.last&&G.last.a&&G.last.a.t==="l"?G.last.a:null;
  let s=`<svg viewBox="0 0 ${W} ${H}" class="mgsvg wg" role="group" aria-label="لوحة WEBGRID">`;
  for(let r=0;r<R;r++)for(let c=0;c<C;c++){const o=G.b[r*C+c];if(o)s+=`<rect x="${O+c*U+.7}" y="${O+r*U+.7}" width="${U-1.4}" height="${U-1.4}" rx="1.4" fill="${seatColor(o-1)}" opacity=".34"/>`}
  for(let r=0;r<=R;r++)for(let c=0;c<C;c++){const o=G.h[r*C+c];
    if(o)s+=`<line x1="${O+c*U}" y1="${O+r*U}" x2="${O+(c+1)*U}" y2="${O+r*U}" stroke="${seatColor(o-1)}" stroke-width="1.15" stroke-linecap="round" class="${L&&L.o==="h"&&L.r===r&&L.c===c?"lastln":""}"/>`;
    else if(act)s+=`<rect class="hit" role="button" tabindex="0" data-o="h" data-r="${r}" data-c="${c}" x="${O+c*U+1}" y="${O+r*U-4}" width="${U-2}" height="8" rx="2"><title>خيط أفقي</title></rect>`}
  for(let r=0;r<R;r++)for(let c=0;c<=C;c++){const o=G.v[r*(C+1)+c];
    if(o)s+=`<line x1="${O+c*U}" y1="${O+r*U}" x2="${O+c*U}" y2="${O+(r+1)*U}" stroke="${seatColor(o-1)}" stroke-width="1.15" stroke-linecap="round" class="${L&&L.o==="v"&&L.r===r&&L.c===c?"lastln":""}"/>`;
    else if(act)s+=`<rect class="hit" role="button" tabindex="0" data-o="v" data-r="${r}" data-c="${c}" x="${O+c*U-4}" y="${O+r*U+1}" width="8" height="${U-2}" rx="2"><title>خيط عمودي</title></rect>`}
  const hA=hintOn();if(hA&&hA.t==="l"){const x1=O+hA.c*U,y1=O+hA.r*U,x2=hA.o==="h"?x1+U:x1,y2=hA.o==="h"?y1:y1+U;s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#E6B85C" stroke-width="1.6" stroke-dasharray="1.2 .8" class="hintln"/>`}
  for(let r=0;r<=R;r++)for(let c=0;c<=C;c++)s+=`<circle cx="${O+c*U}" cy="${O+r*U}" r=".95" fill="#E8EAF4"/>`;
  bd.innerHTML=s+"</svg>";
}
let wwLoading=false;
function wwFetch(){
  if(wwLoading||!G||G.game!=="wordweb")return;
  const body=mode==="solo"?{solo:NG.solo&&NG.solo.id}:{code:NG.room&&NG.room.code};
  if(!(body.solo||body.code))return;
  wwLoading=true;const mid=G.mid;
  api("word_view",body).then(r=>{if(r.ww&&G&&G.mid===mid){NG.ww=r.ww;NG.wwMid=mid;mgRender()}}).catch(()=>{}).finally(()=>{wwLoading=false});
}
function spiderMeter(w,max,out){
  const y=14+Math.min(w,max)*13;
  return `<svg viewBox="0 0 120 110" class="wwspider" role="img" aria-label="الأخطاء ${w} من ${max}"><g stroke="rgba(255,255,255,.22)" fill="none" stroke-width="1"><path d="M0 0Q30 10 60 0Q90 10 120 0M20 0Q40 22 60 8Q80 22 100 0"/></g>
  ${out?`<line x1="60" y1="6" x2="60" y2="${y-26}" stroke="#E8EAF4" stroke-width="1.4"/><line x1="60" y1="${y-14}" x2="60" y2="${y-8}" stroke="#E8EAF4" stroke-width="1.4" stroke-dasharray="2 2"/>`:`<line x1="60" y1="6" x2="60" y2="${y-9}" stroke="#E8EAF4" stroke-width="1.4"/>`}
  <g transform="translate(60 ${y})${out?" rotate(160)":""}"><ellipse rx="8" ry="10" fill="#141826" stroke="${out?"#E62948":"#39FF88"}" stroke-width="1.6"/><g stroke="${out?"#E62948":"#39FF88"}" stroke-width="1.5" stroke-linecap="round" fill="none"><path d="M-7 -4L-16 -11M-7 2L-17 2M-7 6L-15 13M7 -4L16 -11M7 2L17 2M7 6L15 13"/></g><circle cx="-3" cy="-4" r="1.6" fill="${out?"#E62948":"#39FF88"}"/><circle cx="3" cy="-4" r="1.6" fill="${out?"#E62948":"#39FF88"}"/></g></svg>`;
}
function renderWW(bd){
  if(!NG.ww||NG.wwMid!==G.mid)wwFetch();
  const me=mode==="solo"?0:mode==="local"?wwSeat():mySeat(),pr=me>=0?G.prog[me]:{wrong:0,found:0},v=NG.ww&&NG.wwMid===G.mid?NG.ww:null;
  const letters=G.reveal&&G.winner!=null?[...G.reveal]:(v?v.letters:Array(G.len).fill(null));
  if(v&&v.secret&&G.winner==null)bd.append(h("div",{class:"own-peek"},h("b",{},"الكلمة: "+v.secret),h("span",{},"تشوفها أنت بس")));
  bd.append(h("div",{class:"ww-top"},h("span",{class:"chip on sm"},WW_CATS[G.cat]?WW_CATS[G.cat].name:""),h("span",{class:"chip sm"},fmt(G.len)+" حروف")),
    htmlEl("div","ww-meter",spiderMeter(pr.wrong,G.max,!!pr.out)),
    h("div",{class:"ww-word","aria-label":"الكلمة"},...letters.map(c=>h("span",{class:"ww-t"+(c?" on":"")},c||""))));
  const tried=v?v.tried:[],hit=new Set();if(v)v.letters.forEach(c=>{if(c)hit.add(WW.norm(c))});
  const act=canAct(),kb=h("div",{class:"ww-kb",role:"group","aria-label":"الحروف"});
  for(const k of WW.KEYS){const t=tried.includes(k);kb.append(h("button",{class:"ww-k"+(t?(hit.has(k)?" ok":" no"):""),"data-ch":k,disabled:!act||t,"aria-label":"حرف "+k},k))}
  bd.append(kb);
}
function xoStyleOf(seat){
  const p=G.players[seat];if(!p||p.bot)return null;
  const mine=(mode==="local"&&seat===0)||((mode==="solo")&&seat===0)||p.id===cid;
  const id=mine?eff("xmark"):((pubFor(p)||{}).xm);const it=id&&findItem("xmark",id);return it?it.st:null;
}
let hvLoading=false;
function hvFetch(){
  if(hvLoading||!G||!isHidden(G))return;const key=G.mid+":"+(G.rnd||0);if(NG.hv&&NG.hvKey===key)return;
  const body=mode==="solo"?{solo:NG.solo&&NG.solo.id}:{code:NG.room&&NG.room.code};
  if(!(body.solo||body.code))return;
  hvLoading=true;
  api("my_view",body).then(r=>{if(r.view&&G&&G.mid+":"+(G.rnd||0)===key){NG.hv=r.view;NG.hvKey=key;mgRender()}}).catch(()=>{}).finally(()=>{hvLoading=false});
}
const meSeat=()=>mode==="solo"?0:mode==="local"?(hasBots()?0:G.turn):mySeat();
let bfQ=1,bfF=2,bfKey="";
function renderBF(bd){
  hvFetch();const me=meSeat(),v=NG.hv&&NG.hvKey===G.mid+":"+(G.rnd||0)?NG.hv:null,act=canAct();
  const rv=G.reveal;
  if(rv&&!G.bid){const w=h("div",{class:"bf-reveal"},h("b",{},"انكشفت النردات!"),
      h("p",{},G.players[rv.caller].nick+" كذّب مزايدة "+G.players[rv.bidder].nick+": "+fmt(rv.q)+" × "),htmlEl("span","bf-face",dieSvg(rv.f,22)),
      h("p",{},"العدد الحقيقي "+fmt(rv.count)+"، فخسر "+G.players[rv.loser].nick+" نرد."));
    const rows=h("div",{class:"bf-all"});rv.dice.forEach((d,i)=>rows.append(h("div",{class:"bf-row"},h("span",{},G.players[i].nick),htmlEl("span","bf-dice",d.map(f=>dieSvg(f,24,f===rv.f?"#E6B85C":null)).join("")))));
    w.append(rows);bd.append(w)}
  const cur=h("div",{class:"bf-bid"});
  if(G.bid)cur.append(h("span",{},G.players[G.bid.by].nick+" يقول: على الأقل"),h("b",{},fmt(G.bid.q)+" ×"),htmlEl("span","bf-face",dieSvg(G.bid.f,30)));
  else cur.append(h("span",{},"ما فيه مزايدة للحين، "+(act?"ابدأ أنت":"ننتظر أول مزايدة")),h("span",{class:"faint"},"على الطاولة "+fmt(BF.total(G))+" نرد"));
  bd.append(cur);
  if(v&&v.peek&&v.peek.dice){const all=v.peek.dice,box=h("div",{class:"own-peek"},h("b",{},"تشوفه أنت بس"));
    if(G.bid){const cnt=all.flat().filter(d=>d===G.bid.f).length;box.append(h("p",{},"العدد الحقيقي للوجه "+fmt(G.bid.f)+" على الطاولة: "+fmt(cnt)+(cnt>=G.bid.q?" (المزايدة صادقة)":" (المزايدة كذب!)")))}
    all.forEach((d,i)=>{if(i===me||!d.length)return;box.append(h("div",{class:"bf-row"},h("span",{},G.players[i].nick),htmlEl("span","bf-dice",d.map(f=>dieSvg(f,20)).join(""))))});bd.append(box)}
  bd.append(h("div",{class:"bf-mine"},h("span",{class:"lbl"},"نردك (محد يشوفه غيرك)"),htmlEl("div","bf-dice big",v?v.dice.map(f=>dieSvg(f,46)).join(""):Array(G.dice[me]||0).fill(0).map(()=>dieSvg(0,46,null,true)).join(""))));
  if(act){
    const key=G.mid+":"+G.seq;if(bfKey!==key){bfKey=key;if(G.bid){bfF=G.bid.f<6?G.bid.f+1:G.bid.f;bfQ=G.bid.f<6?G.bid.q:G.bid.q+1}else{bfQ=1;bfF=2}}
    const ok=BF.higher(G.bid,bfQ,bfF)&&bfQ<=BF.total(G);
    const faces=h("div",{class:"bf-faces",role:"radiogroup","aria-label":"الوجه"});for(let f=1;f<=6;f++)faces.append(h("button",{class:"bf-fb"+(bfF===f?" on":""),role:"radio","aria-checked":String(bfF===f),"aria-label":"وجه "+f,onclick:()=>{bfF=f;mgRender()}},htmlEl("span","",dieSvg(f,30))));
    bd.append(h("div",{class:"bf-ctl"},h("div",{class:"bf-q"},h("button",{class:"icon","aria-label":"أقل",onclick:()=>{bfQ=Math.max(1,bfQ-1);mgRender()}},"−"),h("b",{},fmt(bfQ)),h("button",{class:"icon","aria-label":"أكثر",onclick:()=>{bfQ=Math.min(BF.total(G),bfQ+1);mgRender()}},"+")),faces,
      h("div",{class:"row"},h("button",{class:"primary",disabled:!ok,onclick:()=>mgPlay({t:"bid",q:bfQ,f:bfF})},"زايد: "+fmt(bfQ)+" × "+fmt(bfF)),h("button",{class:"bf-call",disabled:!G.bid,onclick:()=>mgPlay({t:"call"})},"كذّاب!"))))}
}
function renderFH(bd){
  hvFetch();let me=meSeat();if(me<0)me=0;const op=1-me,act=canAct(),v=NG.hv&&NG.hvKey===G.mid+":0"?NG.hv:null,L=G.last&&G.last.a&&G.last.a.t==="shot"?G.last:null;
  const big=h("div",{class:"fh-grid",role:"grid","aria-label":"شبكة خصمك"});
  const peekShips=new Set(v&&v.peek&&v.peek.ships?v.peek.ships.flat():[]);
  const shotsOp=G.shots[op]||[],shotsMe=G.shots[me]||[];
  for(let k=0;k<64;k++){const st=shotsOp[k]||0,cls=(peekShips.has(k)&&!st?"peek ":"")+"fh-c"+(st===1?" miss":st===2?" hit":st===3?" sunk":"")+(L&&L.i===me&&L.a.k===k?" last":"");
    const b=h("button",{class:cls,"data-k":String(k),disabled:!(act&&!st),"aria-label":st===1?"فاضية":st>=2?"إصابة":"خانة"});
    if(st>=2)b.innerHTML=`<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5l10 10m0-10L5 15" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>`;big.append(b)}
  const mine=h("div",{class:"fh-grid small","aria-label":"شبكتك"}),myShips=new Set(v?v.ships.flat():[]);
  for(let k=0;k<64;k++){const st=shotsMe[k]||0;mine.append(h("span",{class:"fh-c"+(myShips.has(k)?" ship":"")+(st===1?" miss":st>=2?" hit":"")}))}
  bd.append(h("p",{class:"lbl"},"شبكة "+G.players[op].nick+(act?" (اضرب خانة)":"")),big,h("p",{class:"lbl mt"},"شبكتك وذبابك"),mine);
}
function renderWR(bd){
  const act=canAct(),ms=act?new Set(WR.moves(G,G.turn)):new Set(),L=G.last&&G.last.a&&G.last.a.t==="p"?G.last.a.k:-1,grid=h("div",{class:"wr-grid",role:"grid","aria-label":"لوحة حرب الخيوط"});
  const hA=hintOn();for(let k=0;k<49;k++){const o=G.c[k];const b=h("button",{class:"wr-c"+(o?" own":"")+(ms.has(k)?" can":"")+(k===L?" last":"")+(hA&&hA.t==="p"&&hA.k===k?" hintc":""),"data-k":String(k),disabled:!ms.has(k),style:o?"--oc:"+seatColor(o-1):"--oc:"+seatColor(G.turn),"aria-label":o?"أرض "+G.players[o-1].nick:ms.has(k)?"خانة متاحة":"خانة فاضية"});grid.append(b)}
  bd.append(grid);
}
let nwShow=false,bcSel=[];
const BCPAL=["#E62948","#8D65F6","#39FF88","#E6B85C"];
function renderBCR(bd){
  if(!window.BC||!window.BCUI){bd.append(h("div",{class:"skel",style:"height:160px"}));loadBC().then(()=>{if(G&&G.game==="ballclash")mgRender()}).catch(e=>toast(e.message,"bad"));return}
  const me=mySeat(),left=Math.max(0,Math.ceil(((G.deadline||0)-Date.now())/1000));
  if(G.phase==="battle"){
    if(!NG.bcW||NG.bcW.mid!==G.mid){const el=h("div",{class:"bc-watch"});NG.bcW={mid:G.mid,el};
      window.BCUI.watch(el,{seed:G.seed,size:G.arena||560,teams:G.lineups.map((b,i)=>({name:G.players[i].nick,color:BCPAL[i%4],balls:b}))},()=>{NG.bcDone=G.mid;renderMgWin()})}
    bd.append(NG.bcW.el);return}
  NG.bcW=null;
  if(G.mid!==NG.bcSelMid){NG.bcSelMid=G.mid;bcSel=[]}
  const head=h("div",{class:"bc-rtop"},h("b",{},G.pick==="draft"?"اختيار بالتناوب":"اختيار سري"),h("span",{class:"pill"},left>0?fmt(left)+" ث":"خلص الوقت"));bd.append(head);
  if(left<=0&&me>=0)bd.append(h("button",{class:"wide",onclick:()=>mgPlay({t:"timeout"})},"خلص الوقت: كمّل باختيار عشوائي للمتأخرين"));
  const rows=h("div",{class:"bc-rrows"});
  G.players.forEach((p,i)=>{const picks=G.pick==="draft"?G.picks[i]:i===me?(NG.hv&&NG.hv.picks&&NG.hv.picks.length?NG.hv.picks:bcSel):[];
    rows.append(h("div",{class:"bc-rrow",style:"--tc:"+BCPAL[i%4]},h("b",{},p.nick+(i===me?" (أنت)":"")),
      h("div",{class:"bc-rballs"},...Array.from({length:G.size},(_,k)=>{const kid=picks[k];return kid?window.BCUI.previewCanvas(kid,34):h("span",{class:"bc-rq"},G.pick==="secret"&&i!==me?(G.locked[i]?"✓":"?"):"+")}))))});
  bd.append(rows);
  const mineLocked=G.pick==="secret"&&me>=0&&G.locked[me],myTurn=G.pick==="draft"&&G.turn===me;
  if(me<0||mineLocked||(G.pick==="draft"&&!myTurn)){bd.append(h("p",{class:"hint center"},mineLocked?"تشكيلتك مقفولة. ننتظر الباقين…":me<0?"تتفرّج":"ننتظر دور "+G.players[G.turn].nick+"…"));return}
  const taken=new Set(G.pick==="draft"?G.picks.flat():[]),grid=h("div",{class:"bc-rgrid"});
  BC.PICK.forEach(kid=>{const K=BC.KINDS[kid],on=bcSel.includes(kid),shopLocked=!!K.shop,dis=taken.has(kid)||shopLocked;
    grid.append(h("button",{class:"bc-rk"+(on?" on":"")+(dis?" dis":""),disabled:taken.has(kid)||shopLocked,"aria-label":K.ar,onclick:()=>{if(shopLocked){toast("الغرف الأونلاين تلعب بالكور الأصلية","bad");return}if(G.pick==="draft"){mgPlay({t:"draft",k:kid});return}
      if(bcSel.length>=G.size)bcSel.pop();bcSel.push(kid);sfx("move");mgRender()}},window.BCUI.previewCanvas(kid,40),h("span",{},K.ar)))});
  if(G.pick==="secret")bd.append(h("button",{class:"primary wide",style:"margin:8px 0",disabled:bcSel.length!==G.size,onclick:()=>mgPlay({t:"pick",balls:bcSel.slice()})},bcSel.length===G.size?"قفّل التشكيلة":"اختر "+fmt(G.size-bcSel.length)+" كمان"));
  bd.append(grid);
}
async function nwSend(a){
  if(NG.busy)return;setNetBusy(true);
  for(let tryN=0;tryN<3;tryN++){
    try{const r=await api("room_hact",{code:NG.room.code,a});if(r.view){NG.hv=r.view;NG.hvKey=r.room.state.mid+":"+(r.room.state.rnd||0)}
      if(r.mine&&r.room&&r.room.state)NG.myResult={mid:r.room.state.mid,out:r.mine,won:(r.room.state.winners||[]).includes(mySeat())};
      onRoomRow(r.room,true);sfx("move");break}
    catch(e){if((e.code==="stale"||/تغيّرت/.test(e.message))&&tryN<2){await sleep(300+Math.random()*300);try{const rr=await api("room_get",{code:NG.room.code});if(rr.room)onRoomRow(rr.room,true)}catch(x){}continue}
      toast(e.message,"bad");sfx("bad");break}}
  setNetBusy(false);if(G)render();
}
function renderNW(bd){
  hvFetch();const me=mySeat(),v=NG.hv&&NG.hvKey===G.mid+":0"?NG.hv:null,alive=me>=0&&G.alive[me],night=G.phase==="night";
  bd.append(h("div",{class:"nw-phase "+(night?"n":"d")},ic(night?"moon":"sun"),h("b",{},(night?"الليل ":"النهار ")+fmt(G.day)),
    h("span",{},night?"العيون مغمضة… أصحاب الأدوار يختارون":"تناقشوا وصوّتوا مين العنكبوت")));
  if(v){const card=h("button",{class:"nw-role"+(nwShow?" open":""),onclick:()=>{nwShow=!nwShow;mgRender()},"aria-label":"بطاقة دورك"},
      nwShow?h("div",{},h("span",{class:"lbl"},"دورك"),h("b",{class:"r-"+v.role},NW.ROLE[v.role]),
        v.role==="spider"&&v.mates.length?h("p",{},"العنكبوت معك: "+v.mates.map(i=>G.players[i].nick).join("، ")):null,
        v.role==="seer"&&v.seen.length?h("div",{class:"nw-seen"},...v.seen.map(x=>h("p",{},G.players[x.i].nick+": "+(x.spider?"عنكبوت!":"مو عنكبوت")))):null,
        h("p",{class:"hint"},{spider:"بالليل اختر ضحية، وبالنهار لا تنكشف.",doctor:"بالليل اختر مين تحمي (حتى نفسك).",seer:"بالليل اختر لاعب وتعرف هل هو عنكبوت.",fly:"ما عندك دور بالليل. ركّز بالنقاش وصوّت صح."}[v.role]))
      :h("div",{},ic("eye"),h("b",{},"اضغط عشان تشوف دورك"),h("span",{class:"hint"},"خبّي الشاشة عن اللي جنبك")));bd.append(card)}
  const list=h("div",{class:"nw-list"}),tally={};if(!night)G.votes.forEach((t,i)=>{if(G.alive[i]&&t!=null&&t>=0)tally[t]=(tally[t]||0)+1});
  const canNight=night&&alive&&v&&["spider","doctor","seer"].includes(v.role)&&!v.acted,canVote=!night&&alive&&G.votes[me]==null;
  G.players.forEach((p,i)=>{const sk=skinOf(i),dead=!G.alive[i];
    const ok=G.alive[i]&&((canNight&&!(v.role==="spider"&&v.mates.includes(i))&&!(v.role==="spider"&&i===me)&&!(v.role==="seer"&&i===me))||canVote);
    list.append(h("div",{class:"nw-p"+(dead?" dead":"")+(i===me?" me":"")},h("span",{class:"pc-ball"},ballSvg(sk,30)),
      h("div",{class:"grow"},h("b",{},p.nick+(i===me?" (أنت)":""),v&&v.peek&&v.peek.roles&&i!==me&&!dead?h("span",{class:"own-tag"},NW.ROLE[v.peek.roles[i]]):null),h("span",{},dead?"طلع، كان "+NW.ROLE[G.dead[i]]:!night&&G.votes[i]!=null?(G.votes[i]<0?"ما صوّت على أحد":"صوّت على "+G.players[G.votes[i]].nick):"")),
      !night&&tally[i]?h("span",{class:"tagc warn"},fmt(tally[i])+" صوت"):null,
      ok?h("button",{class:"small primary",onclick:()=>mgPlay(night?{t:"night",target:i}:{t:"vote",target:i})},night?(v.role==="spider"?"اصطده":v.role==="doctor"?"احمه":"اكشفه"):"صوّت"):null))});
  bd.append(list);
  if(canVote)bd.append(h("button",{class:"wide",style:"margin-top:8px",onclick:()=>mgPlay({t:"vote",target:-1})},"ما أبي أصوّت على أحد"));
  if(night&&alive&&v&&(v.acted||v.role==="fly"))bd.append(h("p",{class:"hint center"},v.acted?"اخترت. ننتظر باقي أصحاب الأدوار…":"نام… ننتظر الليل يخلص."));
  if(alive&&Date.now()-(G.phaseAt||0)>90000)bd.append(h("button",{class:"wide",style:"margin-top:8px",onclick:()=>mgPlay({t:"force"})},"أنهِ المرحلة (فيه أحد متأخر)"));
  if(G.log.length){const lg=h("div",{class:"nw-log"},h("span",{class:"lbl"},"اللي صار"));
    for(const e of G.log.slice().reverse())lg.append(h("p",{},({kill:"الليل "+fmt(e.day)+": اصطادوا "+(G.players[e.i]||{}).nick+"، وكان "+NW.ROLE[e.role],saved:"الليل "+fmt(e.day)+": الطبيب أنقذ الضحية، وما مات أحد",quiet:"الليل "+fmt(e.day)+": ما صار شي",out:"النهار "+fmt(e.day)+": طلّعوا "+(G.players[e.i]||{}).nick+" بـ"+fmt(e.votes||0)+" صوت، وكان "+NW.ROLE[e.role],tie:"النهار "+fmt(e.day)+": تعادل التصويت، وما طلع أحد"}[e.t]||"")));
    bd.append(lg)}
}
let mgHintA=null;
$("mgHint").addEventListener("click",()=>{if(!G||!canAct())return;const g2=JSON.parse(JSON.stringify(G));g2.players[g2.turn].bot=3;const a=GAME_RULES[G.game].bot(g2);if(!a){toast("ما فيه حركة مقترحة");return}
  mgHintA={seq:G.seq,a};sfx("move");toast("التلميح ظاهر بالذهبي","good");mgRender()});
const hintOn=()=>mgHintA&&G&&mgHintA.seq===G.seq?mgHintA.a:null;
const DOM_FACE={classic:{face:"#F3E6C8",pip:"#1C140C",edge:"#C8B48A"},night:{face:"#1B2433",pip:"#E6B85C",edge:"#3D4B66"},jade:{face:"#12362C",pip:"#E7FFF3",edge:"#1F6B52"},blood:{face:"#3A1218",pip:"#FFD5D5",edge:"#7A2430"}};
const DOM_FELT={wood:"#3A2416",marble:"#243044",felt:"#0E3A2A",royal:"#2A1840"};
const DOM_PIP=[[],[[1,1]],[[0,0],[2,2]],[[0,0],[1,1],[2,2]],[[0,0],[0,2],[2,0],[2,2]],[[0,0],[0,2],[1,1],[2,0],[2,2]],[[0,0],[1,0],[2,0],[0,2],[1,2],[2,2]]];
function domLook(){
  const tile=findItem("domtile",eff("domtile"));const table=findItem("domtable",eff("domtable"));
  return {face:DOM_FACE[(tile&&tile.look)||"classic"]||DOM_FACE.classic,felt:DOM_FELT[(table&&table.look)||"wood"]||DOM_FELT.wood};
}
function domHalf(n,x,y,w,h,col){
  const cell=Math.min(w,h)/3;
  return (DOM_PIP[n]||[]).map(([cx,cy])=>`<circle cx="${(x+cell*(cx+.5)).toFixed(1)}" cy="${(y+cell*(cy+.5)).toFixed(1)}" r="${(cell*.22).toFixed(1)}" fill="${col}"/>`).join("");
}
function domTileHtml(id,wide){
  const D=globalThis.DOMINO;if(!D||!D.tiles[id])return "";
  const [a,b]=D.tiles[id],lk=domLook().face,w=wide?72:40,h=wide?40:76;
  const pips=wide?domHalf(a,4,4,32,32,lk.pip)+domHalf(b,36,4,32,32,lk.pip):domHalf(a,4,4,32,32,lk.pip)+domHalf(b,4,40,32,32,lk.pip);
  const mid=wide?`<line x1="36" y1="6" x2="36" y2="34" stroke="${lk.edge}"/>`:`<line x1="6" y1="38" x2="34" y2="38" stroke="${lk.edge}"/>`;
  return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true"><rect width="${w}" height="${h}" rx="6" fill="${lk.face}" stroke="${lk.edge}"/>${mid}${pips}</svg>`;
}
function domSwatch(t,it,big){
  const face=DOM_FACE[it.look]||DOM_FACE.classic,felt=DOM_FELT[it.look]||DOM_FELT.wood;
  if(t==="domtable")return h("span",{class:"dom-swatch",style:"display:inline-block;width:"+(big?120:46)+"px;height:"+(big?72:28)+"px;border-radius:12px;background:"+felt+";box-shadow:inset 0 0 0 2px rgba(255,255,255,.12)"});
  return htmlEl("span","dom-swatch",`<svg viewBox="0 0 40 76" width="${big?40:28}" height="${big?76:52}" aria-hidden="true"><rect width="40" height="76" rx="6" fill="${face.face}" stroke="${face.edge}"/><line x1="6" y1="38" x2="34" y2="38" stroke="${face.edge}"/>${domHalf(6,4,4,32,32,face.pip)}${domHalf(6,4,40,32,32,face.pip)}</svg>`);
}
let domSel=null;
function renderDOM(bd){
  const D=globalThis.DOMINO;if(!D){bd.append(h("p",{},"تعذّر تحميل الدومينو"));return}
  const lk=domLook(),hand=(NG.hv&&NG.hv.hand)||[],act=canAct();
  if(domSel&&domSel.seq!==G.seq)domSel=null;
  const table=h("div",{class:"dom-table",style:"background:"+lk.felt});
  const chain=h("div",{class:"dom-chain","aria-label":"سلسلة الأحجار"});
  (G.chain||[]).forEach(c=>{const tile=D.tiles[c.id]||[0,0];chain.append(htmlEl("span","dom-chain-tile"+(tile[0]===tile[1]?" dbl":""),domTileHtml(c.id,tile[0]===tile[1])))});
  table.append(chain);bd.append(table);
  const mine=h("div",{class:"dom-hand",role:"group","aria-label":"أحجارك"});
  if(!hand.length&&G.winner==null&&!G.draw)mine.append(h("p",{class:"hint"},"أحجار الخصم مخفية."));
  hand.forEach(id=>{const ends=D.endsFor(id,G.left,G.right),on=domSel&&domSel.id===id;
    mine.append(h("button",{type:"button",class:"dom-play"+(on?" on":"")+(ends.length?"":" dead"),"data-id":String(id),disabled:!act,"aria-label":"حجر "+(D.tiles[id]||[]).join("-")},htmlEl("span","",domTileHtml(id,false))))});
  bd.append(mine);
  if(act&&domSel&&hand.includes(domSel.id)){
    const ends=D.endsFor(domSel.id,G.left,G.right);
    if(ends.length>1)bd.append(h("div",{class:"dom-ends"},...ends.map(end=>h("button",{type:"button",class:"dom-end", "data-end":end},"طرف "+fmt(end==="L"?G.left:G.right)))));
  }
  const only=(NG.hv&&hand.length)?null:null;
  if(act&&hand.length){
    const any=hand.some(id=>D.endsFor(id,G.left,G.right).length);
    if(!any)bd.append(h("button",{type:"button",class:"primary wide dom-go","data-act":G.variant==="draw"&&G.yardN?"draw":"pass",style:"margin-top:8px"},G.variant==="draw"&&G.yardN?"اسحب حجر":"مرّر الدور"));
  }
  bd.append(h("p",{class:"hint"},G.variant==="block"?"أربعة لاعبين، فرق متقابلة، بدون سحب.":"اثنين، وإذا ما عندك لعب تسحب حجر."));
  void only;
}
let domClaimed="";
function domClaim(){
  if(!G||G.game!=="domino"||domClaimed===G.mid)return;
  if(G.winner==null&&!G.draw)return;
  domClaimed=G.mid;
  const seat=mode==="solo"?0:mode==="room"?mySeat():(hasBots()?0:-1);
  const won=seat>=0&&globalThis.DOMINO&&DOMINO.playerWon(G,seat);
  if(G.draw||!won){lastResult={mid:G.mid,won:false,skipped:G.draw?"draw":"loss"};return}
  if(!Cloud.on){lastResult={mid:G.mid,won:true,skipped:"offline"};return}
  const body={requestId:("dom-"+String(G.mid)).replace(/[^A-Za-z0-9:_-]/g,"").slice(0,80)};
  if(body.requestId.length<8)body.requestId=("dom-req-"+Date.now()).slice(0,80);
  if(mode==="room"&&NG.room)body.code=NG.room.code;
  else if(mode==="solo"&&NG.solo)body.solo=NG.solo.id;
  else{
    if(!NG.domNonce){lastResult={mid:G.mid,won:true,skipped:"offline"};return}
    body.nonce=NG.domNonce;body.moves=G.moves||[];
  }
  const send=()=>api("dom_finish",body).then(r=>{
    if(typeof r.coins==="number"){P.coins=r.coins;if(r.version)P.__ver=r.version;saveProfile()}
    if(r.capped&&!(r.amount>0))lastResult={mid:G.mid,won:true,skipped:"cap"};
    else lastResult={mid:G.mid,won:!!r.won,out:r.won?{xp:0,coins:r.amount||0,items:[],levelUps:[],ach:[],missions:[],xpBefore:P.xp,levelBefore:P.level,streak:0}:null,skipped:r.won?null:"loss"};
    if(screen==="mg"){const rb=$("mgRewards");if(rb)rb.dataset.k="";render()}
  }).catch(()=>{lastResult={mid:G.mid,won:true,skipped:"offline"};if(screen==="mg")render()});
  if(body.nonce){const wait=Math.max(0,12000-(Date.now()-(NG.domT0||Date.now())));setTimeout(send,wait)}
  else send();
}
let dmSel=null;
function dmHasCapture(g0,s){const acc=[];for(let i=0;i<64&&!acc.length;i++)if(DM.own(g0.b[i],s))DM.capt(g0.b,i,s,g0.b[i],[i],0,acc,null);return acc.length>0}
function dmMine(){return mode==="local"?G.turn:mode==="solo"?0:mySeat()}
function renderDM(bd){
  const me=dmMine(),flip=me===1,act=canAct()&&G.turn===(mode==="local"?G.turn:me),paths=act?DM.moves(G,G.turn):[];
  if(dmSel&&(dmSel.seq!==G.seq||!act))dmSel=null;
  const starts=new Set(paths.map(p=>p[0])),pre=dmSel?dmSel.part:null;
  const next=new Set(pre?paths.filter(p=>pre.every((x,k)=>p[k]===x)&&p.length>pre.length).map(p=>p[pre.length]):[]);
  const last=G.last&&G.last.a&&G.last.a.path?new Set(G.last.a.path):new Set();
  const grid=h("div",{class:"dm",role:"grid","aria-label":"لوحة الضامة"});
  for(let rr=0;rr<8;rr++)for(let cc=0;cc<8;cc++){const r=flip?7-rr:rr,c=flip?7-cc:cc,i=r*8+c,q=G.b[i];
    const hA=hintOn(),hp=hA&&hA.t==="mv"?hA.path:[];const cls="dm-c"+(hp.includes(i)?" hintc":"")+((r+c)%2?" d":"")+(last.has(i)?" last":"")+(pre&&pre[pre.length-1]===i?" sel":"")+(next.has(i)?" nx":"")+(!pre&&starts.has(i)?" can":"");
    const b=h("button",{class:cls,"data-i":String(i),"aria-label":(q?(DM.own(q,0)?"قطعة "+G.players[0].nick:"قطعة "+G.players[1].nick)+(DM.king(q)?" ملك":""):next.has(i)?"خانة متاحة":"خانة")});
    if(q){const s=DM.own(q,0)?0:1;b.append(h("span",{class:"dm-p"+(DM.king(q)?" k":""),style:"--pc:"+seatColor(s)},DM.king(q)?ic("crown"):null))}
    if(next.has(i))b.append(h("span",{class:"dm-dot"}));
    grid.append(b)}
  bd.append(grid,h("p",{class:"hint center",style:"margin:10px 0 0"},act?(pre?"اختر وين تروح، وفي الأكل المتتالي اضغط خانة خانة.":"القطع المضيئة تقدر تتحرك، والأكل إجباري."):""));
}
function dmClick(i){
  if(!G||G.game!=="dama"||!canAct())return;const paths=DM.moves(G,G.turn);
  if(dmSel){const pre=dmSel.part,cand=paths.filter(p=>pre.every((x,k)=>p[k]===x)&&p[pre.length]===i);
    if(cand.length){const part=pre.concat([i]),done=cand.find(p=>p.length===part.length);
      if(done&&cand.every(p=>p.length===part.length)){dmSel=null;sfx("move");mgPlay({t:"mv",path:done});return}
      dmSel={seq:G.seq,part};sfx("move");mgRender();return}}
  if(paths.some(p=>p[0]===i)){dmSel={seq:G.seq,part:[i]};sfx("move")}else dmSel=null;
  mgRender();
}
function renderXO(bd){
  const fade=[0,1].map(s=>G.order[s].length>=3?G.order[s][0]:-1),act=canAct(),grid=h("div",{class:"xo",role:"grid","aria-label":"لوحة XO∞"});
  for(let k=0;k<9;k++){const o=G.cells[k],fd=o&&fade[o-1]===k;
    const hA=hintOn();const b=h("button",{class:"xc"+(fd?" fading":"")+(G.last&&G.last.a&&G.last.a.k===k?" lastc":"")+(hA&&hA.t==="p"&&hA.k===k?" hintc":""),"data-k":String(k),disabled:!(act&&!o),"aria-label":o?(o===1?"X":"O")+(fd?"، بتختفي":""):"خانة فاضية"});
    if(o)b.innerHTML=`<svg viewBox="0 0 40 40" aria-hidden="true">${xoStyled(o-1,20,20,22,xoStyleOf(o-1),seatColor(o-1),1)}</svg>`;grid.append(b)}
  bd.append(grid,h("p",{class:"hint center",style:"margin:10px 0 0"},"العلامة الباهتة تختفي لما صاحبها يحط علامته الرابعة."));
}
function mgSub(seat){
  const w=G.players[G.winner];
  if(G.game==="nightweb")return (G.team==="flies"?"الذباب طلّعوا كل العناكب. ":"العناكب سيطروا على الشبكة. ")+"الأدوار: "+G.players.map((p,i)=>p.nick+" "+NW.ROLE[(G.roles||[])[i]]).join("، ");
  if(G.game==="bluff")return "آخر واحد بقى معه نرد.";
  if(G.game==="flyhunt")return "صاد كل الذباب.";
  if(G.game==="webwar")return "الأرض: "+G.players.map((p,i)=>p.nick+" "+fmt(WR.count(G,i))).join("، ");
  if(G.game==="wordweb")return "الكلمة: «"+(G.reveal||"")+"»";
  if(G.game==="webgrid")return "المربعات: "+G.players.map((p,i)=>p.nick+" "+fmt(G.pts[i])).join("، ");
  if(G.game==="dama")return "خلصت قطع الخصم، أو ما بقى له حركة.";
  if(G.game==="domino")return G.draw?"النقاط متساوية.":(G.pip&&G.pip.kind==="out"?"خلّص أحجاره وأخذ "+fmt(G.pip.score)+" نقطة.":"انسدّت الطاولة، والفرق "+fmt((G.pip&&G.pip.score)||0)+".");
  if(G.game==="xo")return G.long?"بعد ١٢٠ حركة فاز صاحب الدور الجاي.":"صفّيت ثلاث علامات!";
  if(seat>=0&&G.winner!==seat)return "فاز "+w.nick+". تجيها المرة الجاية.";
  return "";
}
function renderMgWin(){
  if(G&&G.game==="ballclash"&&G.winner!=null&&!(NG.bcDone&&NG.bcDone===G.mid)){$("mgWin").classList.add("hidden");return}
  const box=$("mgWin");if(!G||(G.winner==null&&!(G.game==="domino"&&G.draw))){box.classList.add("hidden");return}
  box.classList.remove("hidden");
  if(G.game==="domino"&&G.draw){paintKicker($("mgKicker"),false,-1);$("mgWinText").textContent="تعادل";paintWinTitle($("mgWinText"),false,-1);$("mgWinSub").textContent="النقاط متساوية في جولة أبو ستة.";
    const ul=$("mgScores");ul.textContent="";G.players.forEach((q,k)=>{ul.append(h("li",{},ballSvg(skinOf(k),22),h("span",{},q.nick),h("b",{class:"wins"},fmt((G.pip&&G.pip.seats&&G.pip.seats[k])||0))))});
    const rb=$("mgRewards");rb.textContent="";rb.append(h("p",{class:"hint center"},"التعادل ما يعطي عملات."));
    $("mgAgain").classList.toggle("hidden",!(mode==="local"||mode==="solo"||amHost()));return}
  const w=G.players[G.winner],seat=mode==="local"?(hasBots()?0:-1):mode==="solo"?0:mySeat();
  const won=G.winners?G.winners.includes(seat):G.winner===seat;
  paintKicker($("mgKicker"),!!won,seat);
  $("mgWinText").textContent=seat>=0?(won?"فزت!":"خسرت"):G.team?(G.team==="flies"?"فاز الذباب!":"فازت العناكب!"):"فاز "+w.nick+"!";
  paintWinTitle($("mgWinText"),seat<0||won,seat);
  $("mgWinSub").textContent=mgSub(seat);
  const ul=$("mgScores");ul.textContent="";G.players.forEach((q,k)=>{const n=G.game==="domino"?((G.pip&&G.pip.seats&&G.pip.seats[k])||0):(G.score[q.id]||0);ul.append(h("li",{},ballSvg(skinOf(k),22),h("span",{},q.nick,q.bot?ic("cpu","pc-bot"):null),h("b",{class:"wins"},G.game==="domino"?null:ic("trophy"),fmt(n))))});
  const rb=$("mgRewards"),lr=lastResult&&lastResult.mid===G.mid?lastResult:null,key=G.mid+"|"+(lr?(lr.out?"out":lr.skipped||""):"wait");
  if(rb.dataset.k!==key){rb.dataset.k=key;rb.textContent="";
    if(lr&&lr.out){winBuiltMid=null;buildRewards(rb,lr)}
    else if(lr&&lr.skipped){const msg={local:"مباريات نفس الجوال للمتعة وما تدخل في حسابك.",practice:"مباراة تدريب، بدون مكافآت.",spectator:"",short:"المباراة كانت قصيرة جدًا عشان تنحسب.",dup:"",offline:"ما فيه اتصال، المكافأة تنحسب لما تتصل بالخادم.",cap:"وصلت حد مكافآت الدومينو اليوم: ٨ جولات.",draw:"تعادل، وما فيه عملات.",loss:""}[lr.skipped];if(msg)rb.append(h("p",{class:"hint center"},msg))}
    else if(mode==="solo"||mode==="room")rb.append(h("div",{class:"skel",style:"height:54px"}))}
  const canAgain=mode==="local"||mode==="solo"||amHost();
  $("mgAgain").classList.toggle("hidden",!canAgain);$("mgAgainHint").classList.toggle("hidden",canAgain);
  $("mgLobby").classList.toggle("hidden",!(mode==="room"&&amHost()));
}
const isHidden=g0=>!!(g0&&GAME_RULES[g0.game]&&GAME_RULES[g0.game].hidden);
let wwTimer=null;
function wwStop(){if(wwTimer){clearTimeout(wwTimer);wwTimer=null}}
function wwSeat(){
  if(!G)return -1;
  if(mode==="solo")return 0;
  if(mode!=="local")return mySeat();
  if(hasBots())return 0;
  const alive=[];G.players.forEach((p,i)=>{if(G.prog[i]&&!G.prog[i].done&&!G.prog[i].out)alive.push(i)});
  if(!alive.length)return 0;
  if(NG.wwFocus==null||alive.indexOf(NG.wwFocus)<0)NG.wwFocus=alive[0];
  return NG.wwFocus;
}
function syncWwView(){
  if(!G||G.game!=="wordweb"||!NG.wwSecret)return;
  if(G.winner!=null)G.reveal=NG.wwSecret;
  const s=Math.max(0,wwSeat()),mine=(NG.wwMine&&NG.wwMine[s])||{tried:[],found:[]};
  NG.ww=WW.view(NG.wwSecret,mine,G.winner!=null);NG.wwMid=G.mid;
}
function syncHiddenView(){
  if(!G||!NG.localPriv)return;
  const RU=GAME_RULES[G.game];if(!RU||!RU.view)return;
  let seat=meSeat();if(seat<0)seat=0;
  NG.hv=RU.view(G,seat,NG.localPriv);
  NG.hvKey=G.mid+":"+(G.game==="flyhunt"?0:(G.rnd||0));
}
function mgBeginRewards(){
  const bots=G.players.filter(p=>p.bot);
  if(!bots.length){M=null;lastResult={mid:G.mid,skipped:"local"};return}
  M={mid:G.mid,mode:"bot",seat:0,startedAt:Date.now(),moves:0,practice:false,done:P.claimedMatches.includes(G.mid),minOpp:99,
    botLevel:bots.reduce((m,p)=>Math.max(m,p.bot||0),0),bots:bots.length};
  lastResult=null;
}
function mgSettle(){
  if(!G||!M||M.done||M.mode==="local")return;
  if(G.winner==null&&!(G.game==="domino"&&G.draw))return;
  if(G.game==="domino"){M.done=true;domClaim();return}
  endMatch();
}
function wwLocalGuess(seat,ch){
  if(!G||G.game!=="wordweb"||!NG.wwSecret||!NG.wwMine||!NG.wwMine[seat])return;
  const mine=NG.wwMine[seat];
  if(mine.tried.includes(ch)||G.prog[seat].done||G.prog[seat].out||G.winner!=null)return;
  const r=WW.guess(NG.wwSecret,mine,ch);NG.wwMine[seat]=r.m;const prev=G;
  G=WW.record(G,seat,r.pos,r.m.found.length,[...NG.wwSecret].length);
  if(M&&seat===M.seat)M.moves++;
  if(G.winner!=null){G.reveal=NG.wwSecret;wwStop()}
  syncWwView();mgSound(prev);mgSettle();mgRender();wwArm();
}
function wwArm(){
  if(wwTimer||mode!=="local"||!G||G.game!=="wordweb"||G.winner!=null||!NG.wwSecret)return;
  const bots=[];G.players.forEach((p,i)=>{if(p.bot&&G.prog[i]&&!G.prog[i].done&&!G.prog[i].out)bots.push(i)});
  if(!bots.length)return;
  const seat=bots[0],lvl=G.players[seat].bot||2,delay=lvl>=3?700:lvl===2?1100:1500;
  wwTimer=setTimeout(()=>{wwTimer=null;
    if(mode!=="local"||!G||G.game!=="wordweb"||G.winner!=null)return;
    if(!G.prog[seat]||G.prog[seat].done||G.prog[seat].out){wwArm();return}
    const ch=WW.botLetter(G,seat,NG.wwMine[seat],[...NG.wwSecret].length);
    if(ch)wwLocalGuess(seat,ch);
  },delay);
}
function mgBotDelay(){return G&&G.game==="bluff"&&G.reveal&&!G.bid?1400:620}
function mgPlay(a){
  if(!G||!G.game||!canAct())return;
  if(G.game==="nightweb"||G.game==="ballclash")return nwSend(a);
  if(isHidden(G)){
    const pv=mode==="local"?NG.localPriv:null;
    const e=GAME_RULES[G.game].legal(G,G.turn,a,pv);if(e){sfx("bad");toast(e,"bad");return}
    if(mode==="room")return netRoomCall("room_hact",{a});
    if(mode==="solo")return netHSolo(a);
    if(mode!=="local"||!pv)return;
    const RU=GAME_RULES[G.game],seat=G.turn,prev=G,res=RU.apply(G,seat,a,pv);
    G=res.g;NG.localPriv=res.privs;if(M&&seat===M.seat)M.moves++;
    syncHiddenView();mgSound(prev);mgSettle();mgRender();mgLocalBots();return}
  if(G.game==="wordweb"){
    if(mode==="room")return netRoomCall("room_guess",{ch:a.ch});
    if(mode==="solo")return netSoloAct(a);
    if(mode==="local")wwLocalGuess(wwSeat(),a.ch);
    return;
  }
  const RU=GAME_RULES[G.game],e=RU.legal(G,G.turn,a);if(e){sfx("bad");toast(e,"bad");return}
  if(mode==="solo")return netSoloAct(a);
  if(mode==="room")return netRoomAct(a);
  const prev=G,seat=G.turn;G=RU.apply(G,seat,a);if(M&&seat===M.seat)M.moves++;mgSound(prev);mgSettle();mgRender();mgLocalBots();
}
function mgLocalBots(delay){
  if(mode!=="local"||!G||!G.game||G.winner!=null||G.draw)return;
  if(G.game==="wordweb"){wwArm();return}
  if(!G.players[G.turn]||!G.players[G.turn].bot)return;
  const wait=delay==null?mgBotDelay():delay;
  setTimeout(()=>{
    try{
      if(mode!=="local"||!G||!G.game||G.winner!=null||G.draw||!G.players[G.turn]||!G.players[G.turn].bot)return;
      const RU=GAME_RULES[G.game],seat=G.turn,pv=NG.localPriv,prev=G;let act=null;
      try{act=RU.hidden?RU.bot(G,seat,pv):RU.bot(G)}catch(e){act=null}
      if(act){const err=RU.hidden?RU.legal(G,seat,act,pv):RU.legal(G,seat,act);if(err)act=null}
      if(RU.hidden){const res=act?RU.apply(G,seat,act,pv):RU.skip(G,pv);G=res.g;if(res.privs)NG.localPriv=res.privs;syncHiddenView()}
      else G=act?RU.apply(G,seat,act):RU.skip(G);
      mgSound(prev);mgSettle();mgRender();
      if(G&&G.winner==null&&!G.draw&&G.players[G.turn]&&G.players[G.turn].bot)mgLocalBots();
    }catch(e){}
  },wait);
}
function mgBeginLocal(gm,RU,pl,prev,cat,seed){
  const o={seq:prev?prev.seq+1:1,round:prev?prev.round+1:1,score:prev?Object.assign({},prev.score):{},cat};
  if(seed){o.seed=seed>>>0;NG.domT0=Date.now()}
  G=RU.new(distinctSkins(pl),o);
  if(gm.id==="wordweb"){NG.wwSecret=WW.pick(G.cat||cat);G.len=[...NG.wwSecret].length;NG.wwMine=G.players.map(()=>({tried:[],found:[]}));syncWwView()}
  else if(RU.hidden&&RU.deal){NG.localPriv=RU.deal(G);syncHiddenView();if(G.game==="domino"&&NG.localPriv&&NG.localPriv[0])NG.domSeed=NG.localPriv[0].seed>>>0}
  mgBeginRewards();show("mg");mgRender();mgLocalBots();
}
function mgStartLocal(withBots,n,prev){
  const gm=gameById(curGame);
  if(gm.id==="nightweb"||gm.id==="ballclash"){toast("هاللعبة تبدأ من غرفة أونلاين","bad");return}
  clearBot();wwStop();mode="local";hist=[];NG.solo=null;NG.localPriv=null;NG.wwSecret=null;NG.wwMine=null;NG.ww=null;NG.hv=null;NG.wwFocus=0;NG.domNonce="";
  const RU=GAME_RULES[gm.id];let pl;
  if(prev)pl=prev.players.map(x=>Object.assign({},x));
  else if(withBots){const four=gm.id==="domino"&&(P.settings.botCount||1)>=3;const k=gm.id==="domino"?(four?3:1):Math.min(P.settings.botCount||1,gm.maxBots||3);pl=[{id:"L0",nick:P.nickname||"أنت",skin:skinIdx(eff("skin")),bot:0}];for(let i=0;i<k;i++)pl.push({id:"B"+i,nick:BOT_NAMES[i],skin:i+1,bot:P.settings.botLevel||2})}
  else{n=gm.id==="domino"?(n>=4?4:2):Math.min(Math.max(n||2,gm.id==="wordweb"||gm.id==="bluff"||gm.id==="flyhunt"?2:2),gm.maxLocal||4);pl=[...Array(n)].map((_,i)=>({id:"L"+i,nick:i?("لاعب "+fmt(i+1)):(P.nickname||"لاعب "+fmt(1)),skin:i===0?skinIdx(eff("skin")):i,bot:0}))}
  const cat=(prev&&prev.cat)||wwCat;
  if(gm.id==="domino"&&withBots&&!prev&&Cloud.on){
    const lvl=P.settings.botLevel||2;
    api("bot_deal",{game:"domino",n:pl.length>=4?4:2,level:lvl}).then(d=>{
      NG.domNonce=d.nonce||"";
      mgBeginLocal(gm,RU,pl,prev,cat,d.seed>>>0);
    }).catch(()=>{NG.domNonce="";mgBeginLocal(gm,RU,pl,prev,cat,0)});
    return;
  }
  mgBeginLocal(gm,RU,pl,prev,cat,0);
}
$("mgBoard").addEventListener("click",e=>{
  const dp=e.target.closest(".dom-play");if(dp&&!dp.disabled&&G&&globalThis.DOMINO){const id=+dp.dataset.id,ends=DOMINO.endsFor(id,G.left,G.right);if(ends.length===1){domSel=null;mgPlay({t:"play",id,end:ends[0]})}else if(ends.length>1){domSel={id,seq:G.seq};mgRender()}else toast("ما ينلعب هالحجر هنا","bad");return}
  const de=e.target.closest(".dom-end");if(de&&domSel){mgPlay({t:"play",id:domSel.id,end:de.dataset.end});domSel=null;return}
  const dg=e.target.closest(".dom-go");if(dg&&!dg.disabled){mgPlay({t:dg.dataset.act});return}
  const key=e.target.closest(".ww-k");if(key&&!key.disabled){mgPlay({t:"g",ch:key.dataset.ch});return}
  const dc=e.target.closest(".dm-c");if(dc){dmClick(+dc.dataset.i);return}
  const fc=e.target.closest(".fh-c[data-k]");if(fc&&!fc.disabled){mgPlay({t:"shot",k:+fc.dataset.k});return}
  const wc=e.target.closest(".wr-c");if(wc&&!wc.disabled){mgPlay({t:"p",k:+wc.dataset.k});return}
  const ln=e.target.closest("[data-o]");if(ln){mgPlay({t:"l",o:ln.dataset.o,r:+ln.dataset.r,c:+ln.dataset.c});return}
  const cell=e.target.closest(".xc");if(cell&&!cell.disabled)mgPlay({t:"p",k:+cell.dataset.k});
});
$("mgBoard").addEventListener("keydown",e=>{
  if(e.key!=="Enter"&&e.key!==" ")return;
  const ln=e.target.closest&&e.target.closest("[data-o]");if(!ln)return;
  e.preventDefault();mgPlay({t:"l",o:ln.dataset.o,r:+ln.dataset.r,c:+ln.dataset.c});
});
$("mgQuit").addEventListener("click",()=>{
  if(G&&G.winner==null&&wouldForfeit()&&Date.now()-mgQuitArm>2500){mgQuitArm=Date.now();$("mgQuit").textContent="متأكد؟ تنحسب خسارة";setTimeout(()=>{$("mgQuit").textContent="خروج"},2500);return}
  $("mgQuit").textContent="خروج";goHome();
});
$("mgSound").addEventListener("click",()=>{Act.settings({mute:!P.settings.mute});$("mgSound").replaceChildren(ic(P.settings.mute?"mute":"sound"));if(!P.settings.mute)sfx("move")});
$("mgAgain").addEventListener("click",()=>{if(G&&G.game&&mode==="local")return mgStartLocal(false,0,G);again()});
$("mgHome").addEventListener("click",()=>goHome());
$("mgLobby").addEventListener("click",()=>netRoomCall("room_lobby"));

/* ================= WEBLINE ================= */
const WLG={s:null,mode:"daily",seed:0,day:"",inputs:[],queue:[],acc:0,last:0,dur:0,run:false,paused:false,raf:0,px:20};
async function loadWlBoard(){if(Platform.kind!=="web")return;const gid=curGame==="webnest"?"webnest":"webline";try{if(!Cloud.on)await cloudStart();const v=await api(gid==="webnest"?"nest_board":"line_board",{});v.gid=gid;wlBoardCache=v;wlBoardAt=Date.now()}catch(e){wlBoardCache={error:e.message}}if(screen==="webbound"&&(curGame==="webline"||curGame==="webnest"))renderWlPanel()}
function renderWlPanel(){
  const mine=$("wlMine"),bd=$("wlBoard");mine.textContent="";bd.textContent="";
  if(Platform.kind!=="web"){mine.append(h("p",{class:"hint"},"الترتيب والمكافآت في نسخة الموقع. هنا تقدر تلعب وتتدرّب."));return}
  const gid=curGame==="webnest"?"webnest":"webline";
  $("wlPanel").querySelector(".lead").textContent=gid==="webnest"?"نفس ترتيب البيض لكل اللاعبين اليوم، وأعلى نتيجة تتصدر. الخادم يعيد حركاتك ويتأكد من نتيجتك.":"نفس الخريطة ونفس الذباب لكل اللاعبين اليوم، وأعلى نتيجة تتصدر. الخادم يعيد تشغيل لعبتك ويتأكد من نتيجتك.";
  if(!wlBoardCache||wlBoardCache.gid!==gid||Date.now()-wlBoardAt>20000){if(wlBoardCache&&wlBoardCache.gid!==gid)wlBoardCache=null;loadWlBoard()}
  const v=wlBoardCache;if(!v){bd.append(h("div",{class:"skel",style:"height:60px"}));return}
  if(v.error){bd.append(h("p",{class:"err"},softenErr(v.error)));return}
  $("wlDay").textContent=v.day||"";
  mine.append(h("div",{class:"wl-mine"},h("span",{},"أفضل نتيجة لك اليوم"),h("b",{},v.mine?fmt(v.mine.score):"—"),v.mine?h("span",{class:"tagc"},"#"+fmt(v.mine.rank)):h("span",{class:"faint"},"ما لعبت اليوم")));
  if(!v.rows.length){bd.append(h("p",{class:"hint"},"محد لعب تحدي اليوم للحين. كن الأول!"));return}
  for(const r of v.rows){const c=r.card||{},pub=sanPub(c.pub,!!c.is_owner)||{},sk=SKINS[pub.sk]||SKINS[0];
    bd.append(h("div",{class:"li"+(r.me?" me":"")},h("b",{class:"wl-rank"},r.rank<=3?rankMedal(r.rank,26):"#"+fmt(r.rank)),avatar(sk.id,pub.fr,32,pub.dc),h("div",{class:"grow"},h("div",{class:"t"},nameEl(c.nickname||"لاعب",pub.th),c.is_owner?ownerTag():null)),h("b",{class:"wl-sc"},fmt(r.score))))}
}
const wlSkin=()=>(findItem("skin",eff("skin"))||SKINS[0]);
function wlMsg(t){const m=$("wlMsg");m.textContent=t;m.classList.toggle("hidden",!t)}
function wlResize(){const c=$("wlCanvas"),w=Math.max(220,Math.min($("wlWrap").clientWidth||320,520,innerHeight-260));const dpr=Math.min(2,devicePixelRatio||1);c.width=Math.round(w*dpr);c.height=Math.round(w*dpr);c.style.width=w+"px";c.style.height=w+"px";WLG.px=c.width/WL.W;if(WLG.s)wlDraw()}
async function wlStart(daily){
  WLG.mode=daily?"daily":"free";
  if(daily&&Platform.kind==="web"){try{if(!Cloud.on)await cloudStart();const r=await api("line_info",{});WLG.seed=r.seed;WLG.day=r.day}catch(e){toast(e.message,"bad");return}}
  else if(daily){WLG.day=WL.day(Date.now());WLG.seed=WL.daySeed(WLG.day)}
  else{WLG.seed=Math.floor(Math.random()*2147483647);WLG.day=""}
  WLG.s=WL.start(WLG.seed);WLG.inputs=[];WLG.queue=[];WLG.acc=0;WLG.last=0;WLG.dur=0;WLG.run=true;WLG.paused=false;
  $("wlScore").textContent="٠";$("wlWin").classList.add("hidden");show("wl");wlResize();
  wlMsg(matchMedia("(hover:none)").matches?"اسحب بإصبعك لتغيير الاتجاه":"استخدم الأسهم أو WASD");setTimeout(()=>{if(WLG.run&&!WLG.paused)wlMsg("")},1500);
  cancelAnimationFrame(WLG.raf);WLG.raf=requestAnimationFrame(wlLoop);
}
function wlTurn(d){if(!WLG.run)return;if(WLG.paused){wlResume();return}const lastDir=WLG.queue.length?WLG.queue[WLG.queue.length-1]:WLG.s.dir;if(d===lastDir||(d+2)%4===lastDir)return;if(WLG.queue.length<3)WLG.queue.push(d)}
function wlPause(){if(!WLG.run||WLG.paused)return;WLG.paused=true;wlMsg("متوقف، اضغط عشان تكمل")}
function wlResume(){if(!WLG.run)return;WLG.paused=false;WLG.last=0;wlMsg("")}
function wlLoop(ts){
  if(!WLG.run)return;
  if(WLG.paused){WLG.last=0;WLG.raf=requestAnimationFrame(wlLoop);return}
  if(!WLG.last)WLG.last=ts;const dt=Math.min(250,ts-WLG.last);WLG.last=ts;WLG.acc+=dt;WLG.dur+=dt;
  let sp=WL.speed(WLG.s.score)*(ownerSees("slowLine")?1.6:1);
  while(WLG.acc>=sp&&WLG.s.alive){WLG.acc-=sp;let turn=null;
    while(WLG.queue.length&&turn==null){const q=WLG.queue.shift();if(q!==WLG.s.dir&&(q+2)%4!==WLG.s.dir)turn=q}
    if(turn!=null)WLG.inputs.push([WLG.s.tick,turn]);
    const before=WLG.s.score;WL.step(WLG.s,turn);if(WLG.s.score>before){sfx("unlock");$("wlScore").textContent=fmt(WLG.s.score);sp=WL.speed(WLG.s.score)*(ownerSees("slowLine")?1.6:1)}}
  wlDraw();
  if(!WLG.s.alive){WLG.run=false;sfx("bad");buzz(60);setTimeout(wlEnd,450);return}
  WLG.raf=requestAnimationFrame(wlLoop);
}
function wlDraw(){
  const c=$("wlCanvas"),x=c.getContext("2d"),u=WLG.px,s=WLG.s,sk=wlSkin(),col=sk.c||"#39FF88";
  x.fillStyle="#0B0E18";x.fillRect(0,0,c.width,c.height);
  x.strokeStyle="rgba(255,255,255,.05)";x.lineWidth=1;for(let i=1;i<WL.W;i++){x.beginPath();x.moveTo(i*u,0);x.lineTo(i*u,c.height);x.moveTo(0,i*u);x.lineTo(c.width,i*u);x.stroke()}
  if(s.food){const [fr,fc]=s.food,cx=fc*u+u/2,cy=fr*u+u/2,bob=Math.sin(performance.now()/160)*u*.06,fl=.6+Math.abs(Math.sin(performance.now()/60))*.4;
    x.fillStyle="rgba(200,230,255,.5)";x.beginPath();x.ellipse(cx-u*.17,cy-u*.13+bob,u*.17*fl,u*.09,-.5,0,7);x.fill();x.beginPath();x.ellipse(cx+u*.17,cy-u*.13+bob,u*.17*fl,u*.09,.5,0,7);x.fill();
    x.fillStyle="#1A1F2E";x.strokeStyle="#9BF8FF";x.lineWidth=u*.05;x.beginPath();x.arc(cx,cy+bob,u*.17,0,7);x.fill();x.stroke()}
  x.lineCap="round";x.lineJoin="round";x.shadowColor=col;x.shadowBlur=u*.45;x.strokeStyle="#E8EAF4";x.lineWidth=u*.2;x.beginPath();
  s.body.forEach(([r,cc],i)=>{const px=cc*u+u/2,py=r*u+u/2;if(i)x.lineTo(px,py);else x.moveTo(px,py)});x.stroke();x.shadowBlur=0;
  x.fillStyle=col;s.body.forEach(([r,cc],i)=>{if(i&&i%2===0){x.beginPath();x.arc(cc*u+u/2,r*u+u/2,u*.08,0,7);x.fill()}});
  const [hr,hc]=s.body[0],hx=hc*u+u/2,hy=hr*u+u/2;x.strokeStyle=col;x.lineWidth=u*.06;
  for(const k of [-1,1])for(const a of [-.7,-.25,.25,.7]){x.beginPath();x.moveTo(hx,hy);x.lineTo(hx+k*u*.46,hy+a*u*.5);x.stroke()}
  x.fillStyle=col;x.beginPath();x.arc(hx,hy,u*.3,0,7);x.fill();x.fillStyle="#fff";x.beginPath();x.arc(hx-u*.1,hy-u*.06,u*.055,0,7);x.arc(hx+u*.1,hy-u*.06,u*.055,0,7);x.fill();
  if(!s.alive){x.fillStyle="rgba(230,41,72,.18)";x.fillRect(0,0,c.width,c.height)}
}
async function wlEnd(){
  const s=WLG.s;$("wlWin").classList.remove("hidden");$("wlWinScore").textContent=s.score?fmt(s.score):"صفر";$("wlWinSub").textContent=s.clear?"عبّيت الشبكة كاملة":(WLG.mode==="daily"?"تحدي اليوم":"لعب حر");
  const wk=$("wlKicker");if(wk){wk.textContent="انتهت";wk.classList.remove("is-win","is-loss")}
  const rb=$("wlRewards");rb.textContent="";
  if(Platform.kind!=="web"){rb.append(h("p",{class:"hint"},"النتائج والمكافآت تنحفظ في نسخة الموقع."));return}
  rb.append(h("div",{class:"skel",style:"height:50px"}));
  try{const r=await api("line_submit",{mode:WLG.mode,day:WLG.day,seed:WLG.seed,inputs:WLG.inputs,score:s.score,duration:Math.round(WLG.dur)});
    applyProfile(r.profile);rb.textContent="";
    if(r.daily)rb.append(h("p",{class:"lead center",style:"margin:0 0 8px"},"أفضل نتيجة لك اليوم "+fmt(r.best)+" · ترتيبك #"+fmt(r.rank)));
    if(r.out.capped)rb.append(h("p",{class:"hint center"},"خلصت مكافآت اليوم (٥ جولات)، والنتيجة انحسبت في الترتيب."));
    else rb.append(h("div",{class:"chips",style:"justify-content:center"},h("span",{class:"pill"},"+"+fmt(r.out.xp)+" XP"),h("span",{class:"pill coins"},coinEl("+"+fmt(r.out.coins)))));
    wlBoardCache=null}
  catch(e){rb.textContent="";rb.append(h("p",{class:"err"},softenErr(e.message)||e.message))}
}
function wlStop(){WLG.run=false;cancelAnimationFrame(WLG.raf)}
$("wlDaily").addEventListener("click",()=>curGame==="webnest"?nsStart(true):wlStart(true));
$("wlFree").addEventListener("click",()=>curGame==="webnest"?nsStart(false):wlStart(false));
$("wlAgain").addEventListener("click",()=>wlStart(WLG.mode==="daily"));
$("wlHome").addEventListener("click",()=>{wlStop();openGame("webline")});
$("wlQuit").addEventListener("click",()=>{wlStop();openGame("webline")});
document.querySelectorAll("#wl .wl-pad button").forEach(b=>b.addEventListener("click",()=>wlTurn(+b.dataset.d)));
$("wlWrap").addEventListener("click",()=>{if(WLG.paused)wlResume()});
addEventListener("keydown",e=>{if(screen!=="wl"||!WLG.run)return;const k={ArrowUp:0,KeyW:0,ArrowRight:1,KeyD:1,ArrowDown:2,KeyS:2,ArrowLeft:3,KeyA:3}[e.code];
  if(k!=null){e.preventDefault();wlTurn(k)}else if(e.code==="Space"||e.code==="KeyP"){e.preventDefault();WLG.paused?wlResume():wlPause()}});
let wlTouch=null;
$("wlWrap").addEventListener("touchstart",e=>{const t=e.touches[0];wlTouch=[t.clientX,t.clientY]},{passive:true});
$("wlWrap").addEventListener("touchmove",e=>{if(!wlTouch)return;const t=e.touches[0],dx=t.clientX-wlTouch[0],dy=t.clientY-wlTouch[1];if(Math.max(Math.abs(dx),Math.abs(dy))<22)return;
  wlTurn(Math.abs(dx)>Math.abs(dy)?(dx>0?1:3):(dy>0?2:0));wlTouch=[t.clientX,t.clientY]},{passive:true});
document.addEventListener("visibilitychange",()=>{if(document.hidden&&screen==="wl")wlPause()});
addEventListener("resize",()=>{if(screen==="wl")wlResize()});

/* ================= WEBNEST ================= */
const NSG={s:null,mode:"daily",seed:0,day:"",inputs:[],t0:0,run:false,busy:false};
async function nsStart(daily){
  NSG.mode=daily?"daily":"free";
  if(daily&&Platform.kind==="web"){try{if(!Cloud.on)await cloudStart();const r=await api("nest_info",{});NSG.seed=r.seed;NSG.day=r.day}catch(e){toast(e.message,"bad");return}}
  else if(daily){NSG.day=WL.day(Date.now());NSG.seed=NST.daySeed(NSG.day)}else{NSG.seed=Math.floor(Math.random()*2147483647);NSG.day=""}
  NSG.s=NST.start(NSG.seed);NSG.inputs=[];NSG.t0=Date.now();NSG.run=true;$("nsWin").classList.add("hidden");$("nsScore").textContent="٠";show("nst");nsDraw();
}
function nsDraw(){const gr=$("nsGrid");gr.textContent="";const sz=Math.min(($("nsWrap").clientWidth||340)/4-10,110);
  NSG.s.b.forEach(e=>gr.append(h("div",{class:"ns-c"+(e?" t":""),"aria-label":e?NST.STAGES[e]+" "+(2**e):"فاضية"},e?h("div",{class:"ns-t"},htmlEl("span","",nsTileSvg(e,sz)),h("b",{class:e>=10?"dk":""},fmt(2**e)),h("span",{class:"ns-n"+(e>=10?" dk":"")},NST.STAGES[e]||"")):null)))}
function nsUndoShow(){$("nsUndo").classList.toggle("hidden",!(ownerSees("nestUndo")&&NSG.run&&NSG.inputs.length))}
$("nsUndo").addEventListener("click",()=>{if(!NSG.run||!NSG.inputs.length)return;NSG.inputs.pop();NSG.s=NST.replay(NSG.seed,NSG.inputs);$("nsScore").textContent=fmt(NSG.s.score);sfx("move");nsDraw();nsUndoShow()});
function nsMove(d){if(!NSG.run)return;if(NST.move(NSG.s,d)){NSG.inputs.push(d);sfx("move");$("nsScore").textContent=fmt(NSG.s.score);nsDraw();nsUndoShow();if(!NSG.s.alive){NSG.run=false;sfx("bad");setTimeout(nsEnd,500)}}}
async function nsEnd(){
  const s=NSG.s;$("nsWin").classList.remove("hidden");$("nsWinScore").textContent=s.score?fmt(s.score):"صفر";$("nsWinSub").textContent=NSG.mode==="daily"?"تحدي اليوم":"لعب حر";
  const nk=$("nsKicker");if(nk){nk.textContent="انتهت";nk.classList.remove("is-win","is-loss")}
  $("nsWinMax").textContent="أكبر مرحلة وصلتها: "+(NST.STAGES[s.max]||"")+" ("+fmt(2**s.max)+")";
  const rb=$("nsRewards");rb.textContent="";
  if(Platform.kind!=="web"){rb.append(h("p",{class:"hint"},"النتائج والمكافآت تنحفظ في نسخة الموقع."));return}
  rb.append(h("div",{class:"skel",style:"height:50px"}));
  try{const r=await api("nest_submit",{mode:NSG.mode,day:NSG.day,seed:NSG.seed,inputs:NSG.inputs,score:s.score,duration:Date.now()-NSG.t0});applyProfile(r.profile);rb.textContent="";
    if(r.daily)rb.append(h("p",{class:"lead center",style:"margin:0 0 8px"},"أفضل نتيجة لك اليوم "+fmt(r.best)+" · ترتيبك #"+fmt(r.rank)));
    if(r.out.capped)rb.append(h("p",{class:"hint center"},"خلصت مكافآت اليوم (٥ جولات)، والنتيجة انحسبت في الترتيب."));
    else rb.append(h("div",{class:"chips",style:"justify-content:center"},h("span",{class:"pill"},"+"+fmt(r.out.xp)+" XP"),h("span",{class:"pill coins"},coinEl("+"+fmt(r.out.coins)))));
    wlBoardCache=null}
  catch(e){rb.textContent="";rb.append(h("p",{class:"err"},softenErr(e.message)||e.message))}
}
$("nsAgain").addEventListener("click",()=>nsStart(NSG.mode==="daily"));
$("nsHome").addEventListener("click",()=>{NSG.run=false;openGame("webnest")});
$("nsQuit").addEventListener("click",()=>{NSG.run=false;openGame("webnest")});
document.querySelectorAll("#nsPad button").forEach(b=>b.addEventListener("click",()=>nsMove(+b.dataset.d)));
addEventListener("keydown",e=>{if(screen!=="nst"||!NSG.run)return;const k={ArrowUp:0,KeyW:0,ArrowRight:1,KeyD:1,ArrowDown:2,KeyS:2,ArrowLeft:3,KeyA:3}[e.code];if(k!=null){e.preventDefault();nsMove(k)}});
let nsTouch=null;
$("nsWrap").addEventListener("touchstart",e=>{const t=e.touches[0];nsTouch=[t.clientX,t.clientY]},{passive:true});
$("nsWrap").addEventListener("touchend",e=>{if(!nsTouch)return;const t=e.changedTouches[0],dx=t.clientX-nsTouch[0],dy=t.clientY-nsTouch[1];nsTouch=null;if(Math.max(Math.abs(dx),Math.abs(dy))<24)return;nsMove(Math.abs(dx)>Math.abs(dy)?(dx>0?1:3):(dy>0?2:0))},{passive:true});

/* ================= كلمة اليوم ================= */
let kmMode="pick",kmRows=[],kmCur="",kmStatus="open",kmAnswer="",kmStreak=0,kmBest=0,kmMsg="",kmSet=null;
function kmAllowed(w){if(!kmSet&&globalThis.KALIMA_GUESSES)kmSet=new Set(globalThis.KALIMA_GUESSES);return !!(kmSet&&kmSet.has(w))}
function kmStart(mode){
  kmMode=mode;kmRows=[];kmCur="";kmStatus="open";kmAnswer="";kmStreak=0;kmBest=0;kmMsg="";
  if(mode==="practice"){
    const list=globalThis.KALIMA_GUESSES||[];
    kmAnswer=list.length?list[Math.floor(Math.random()*list.length)]:"";
    kmMsg="تدريب: ست محاولات، بدون سلسلة.";
    kmRender();return;
  }
  if(mode!=="daily"){kmMsg="كلمة اليوم مرة واحدة، أو تدريب بدون نت.";kmRender();return}
  kmRender();
  if(!Cloud.on){kmMsg="كلمة اليوم تحتاج اتصال بالخادم";kmStatus="offline";kmRender();return}
  api("word_start",{}).then(r=>{
    if(kmMode!=="daily")return;
    if(r.disabled||r.status==="off"){
      kmRows=[];kmStatus="off";kmStreak=0;kmBest=0;
      kmMsg="كلمة اليوم غير مفعّلة على الخادم.";
      kmRender();return;
    }
    kmRows=Array.isArray(r.guesses)?r.guesses.filter(g=>g&&typeof g.w==="string"&&typeof g.m==="string").slice(0,6):[];
    kmStatus=r.status||"open";kmStreak=r.streak||0;kmBest=r.best||0;
    kmMsg=kmStatus==="won"?"صح! السلسلة "+fmt(kmStreak):kmStatus==="lost"?"خلصت محاولات اليوم.":"كلمة اليوم · سلسلة "+fmt(kmStreak);
    kmRender();
  }).catch(()=>{if(kmMode==="daily"){kmMsg="كلمة اليوم تحتاج اتصال بالخادم";kmStatus="offline";kmRender()}});
}
function kmRender(){
  const K=globalThis.KALIMA;if(!K)return;
  const grid=$("kmGrid");grid.textContent="";
  for(let r=0;r<6;r++){
    const row=h("div",{class:"km-row"});
    const played=kmRows[r];
    for(let c=0;c<5;c++){
      const ch=played?played.w[c]:(r===kmRows.length?kmCur[c]||"":"");
      const mark=played?played.m[c]:"";
      row.append(h("div",{class:"km-cell"+(mark?" "+mark:""),"aria-label":ch||"خانة"},ch));
    }
    grid.append(row);
  }
  const best={};
  kmRows.forEach(g=>{[...g.w].forEach((ch,i)=>{const m=g.m[i];if(m==="g"||(m==="y"&&best[ch]!=="g")||(m==="b"&&!best[ch]))best[ch]=m})});
  const keys=$("kmKeys");keys.textContent="";
  const alpha=K.ALPHA,open=kmStatus==="open"&&(kmMode==="daily"||kmMode==="practice");
  for(let i=0;i<alpha.length;i+=7){
    const line=h("div",{class:"km-krow"});
    for(const ch of alpha.slice(i,i+7)){
      const m=best[ch]||"";
      line.append(h("button",{type:"button",class:"km-key"+(m?" "+m:""),disabled:!open,"data-ch":ch},ch));
    }
    keys.append(line);
  }
  keys.append(h("div",{class:"km-krow"},
    h("button",{type:"button",class:"km-key wide",disabled:!open,"data-act":"del"},"حذف"),
    h("button",{type:"button",class:"km-key wide primary",disabled:!open,"data-act":"ok"},"تأكيد")));
  $("kmStatus").textContent=kmMsg+(kmBest?"":"");
  if(kmBest&&kmMode==="daily")$("kmStatus").textContent=(kmMsg?kmMsg+" · ":"")+"أفضل سلسلة "+fmt(kmBest);
  const done=kmStatus==="won"||kmStatus==="lost";
  $("kmShare").classList.toggle("hidden",!(done&&kmRows.length));
  $("kmDaily").classList.toggle("hidden",kmMode==="daily"&&kmStatus==="open");
  $("kmPractice").classList.toggle("hidden",kmMode==="practice"&&kmStatus==="open");
}
async function kmSubmit(){
  const K=globalThis.KALIMA;if(!K||kmStatus!=="open")return;
  const guess=K.norm(kmCur);
  if([...guess].length!==5){toast("اكتب خمسة حروف","bad");return}
  if(kmMode==="practice"){
    if(!kmAllowed(guess)){toast("الكلمة مو في القائمة","bad");return}
    const marks=K.score(kmAnswer,guess);
    kmRows.push({w:guess,m:marks});kmCur="";
    if(marks==="ggggg"){kmStatus="won";kmMsg="صح! التدريب ما يحسب في السلسلة."}
    else if(kmRows.length>=6){kmStatus="lost";kmMsg="الكلمة كانت "+kmAnswer}
    kmRender();return;
  }
  if(kmMode!=="daily"||!Cloud.on){kmMsg="كلمة اليوم تحتاج اتصال بالخادم";kmStatus="offline";kmRender();return}
  try{
    const r=await api("word_guess",{word:guess});
    kmRows=Array.isArray(r.guesses)?r.guesses.slice(0,6):kmRows;
    kmStatus=r.status||kmStatus;kmStreak=r.streak||0;kmBest=r.best||0;kmCur="";
    kmMsg=kmStatus==="won"?"صح! السلسلة "+fmt(kmStreak):kmStatus==="lost"?"خلصت محاولات اليوم.":"سلسلة "+fmt(kmStreak);
  }catch(e){toast((e&&e.message)||"ما انحفظ التخمين","bad")}
  kmRender();
}
function kmShareText(){
  const lines=kmRows.map(r=>[...r.m].map(c=>c==="g"?"🟩":c==="y"?"🟨":"⬛").join(""));
  const head=(kmMode==="practice"?"تدريب كلمة ":"كلمة اليوم ")+fmt(kmRows.length)+"/٦";
  return head+"\n"+lines.join("\n");
}
$("kmQuit").addEventListener("click",()=>goHome());
$("kmDaily").addEventListener("click",()=>kmStart("daily"));
$("kmPractice").addEventListener("click",()=>kmStart("practice"));
$("kmKeys").addEventListener("click",e=>{
  const b=e.target.closest("button");if(!b||b.disabled)return;
  if(b.dataset.ch){if(kmCur.length<5){kmCur+=b.dataset.ch;kmRender()}}
  else if(b.dataset.act==="del"){kmCur=kmCur.slice(0,-1);kmRender()}
  else if(b.dataset.act==="ok")kmSubmit();
});
$("kmShare").addEventListener("click",async()=>{
  const text=kmShareText();
  if(navigator.share){try{await navigator.share({title:"كلمة اليوم",text});return}catch(e){if(e&&e.name==="AbortError")return}}
  try{await navigator.clipboard.writeText(text);toast("اننسخت النتيجة","good")}catch(e){openSheet((c,close)=>{c.append(h("h3",{},"النتيجة"),h("p",{class:"lead",style:"white-space:pre-wrap"},text),h("button",{class:"primary",onclick:close},"إغلاق"))})}
});
addEventListener("keydown",e=>{
  if(screen!=="km"||kmStatus!=="open")return;
  const K=globalThis.KALIMA;if(!K)return;
  if(e.key==="Enter"){e.preventDefault();kmSubmit();return}
  if(e.key==="Backspace"){e.preventDefault();kmCur=kmCur.slice(0,-1);kmRender();return}
  const n=K.norm(e.key);
  if(n.length===1&&K.ALPHA.includes(n)&&kmCur.length<5){e.preventDefault();kmCur+=n;kmRender()}
});

/* ================= chess ================= */
const CH_GLYPH={k:"♚",q:"♛",r:"♜",b:"♝",n:"♞",p:"♟"};
const CH_NAME={k:"ملك",q:"وزير",r:"قلعة",b:"فيل",n:"حصان",p:"بيدق"};
const CH_WHY={mate:"كش مات",resign:"استسلام",stalemate:"بات",rep:"تكرار ثلاثي","50":"قاعدة الخمسين نقلة",material:"نقص القطع",time:"خلص الوقت",agree:"اتفاق على التعادل"};
let chSel="",chPromo=null,chDrag=null,chBotToken=0,chClaimed="",chFlagSeq=-1,chAnimSeq=-1,chWorker=null,chReq=0;
const chPending=new Map();
function chStop(){chBotToken++;chSel="";chPromo=null;chDrag=null;chHidePromo();const g=$("chGhost");if(g)g.remove()}
function chMySeat(){
  if(!G||G.game!=="chess")return -1;
  if(mode==="local"){const i=G.players.findIndex(p=>!p.bot);return i<0?G.turn:i}
  if(mode==="solo"||mode==="room")return G.players.findIndex(p=>p.id===cid);
  return -1;
}
function chFlip(){if(chFlipManual!=null)return !!chFlipManual;return chMySeat()===1}
function chClockText(ms){const s=Math.max(0,Math.ceil(ms/1000));return fmt(Math.floor(s/60))+":"+(s%60<10?"٠":"")+fmt(s%60)}
function chPos(){
  const c=new Chess();
  for(const s of (G&&G.sans)||[]){if(!c.move(s))break}
  return c;
}
function chLook(){
  const b=findItem("chboard",eff("chboard"))||CHBOARDS[0];
  const p=findItem("chpiece",eff("chpiece"))||CHPIECES[0];
  return {sq:b.sq||["#2A241C","#C4B49A","#E6B85C"],pc:p.pc||["#F4EFE4","#1A140E","#E6B85C"]};
}
function chEnsureWorker(){
  if(chWorker)return chWorker;
  try{
    chWorker=new Worker("js/chess_worker.js?v=2");
    chWorker.onmessage=ev=>{const d=ev.data||{},fn=chPending.get(d.id);if(fn){chPending.delete(d.id);fn(d)}};
    chWorker.onerror=()=>{try{chWorker.terminate()}catch(e){}chWorker=null};
  }catch(e){chWorker=null}
  return chWorker;
}
function chAsk(sans,level,tie){
  return new Promise(res=>{
    const w=chEnsureWorker();
    if(!w){
      setTimeout(()=>{try{res(globalThis.CHESS.pick({sans:sans.slice(),tie:tie|0},level,{deadline:Date.now()+1800}))}catch(e){res(null)}},0);
      return;
    }
    const id=++chReq;
    const t=setTimeout(()=>{chPending.delete(id);res(null)},5000);
    chPending.set(id,d=>{clearTimeout(t);res(d&&d.ok?d.mv:null)});
    try{w.postMessage({id,sans,level,tie:tie|0})}catch(e){clearTimeout(t);chPending.delete(id);res(null)}
  });
}
function chLocalBot(){
  if(mode!=="local"||!G||G.game!=="chess"||G.winner!=null||G.draw)return;
  if(!G.players[G.turn]||!G.players[G.turn].bot)return;
  const token=++chBotToken,sans=G.sans.slice(),level=G.players[G.turn].bot||1,seq=G.seq,tie=G.tie|0;
  setTimeout(()=>{
    chAsk(sans,level,tie).then(mv=>{
      if(token!==chBotToken||!G||G.seq!==seq||mode!=="local"||G.winner!=null||G.draw)return;
      if(!mv)return;
      const act=Object.assign({now:Date.now()},mv);
      const err=globalThis.CHESS.rules.legal(G,G.turn,act);
      if(err)return;
      G=globalThis.CHESS.rules.apply(G,G.turn,act);
      chSel="";sfx(G.winner!=null?"win":G.check?"bad":"move2");
      chRender();
      if(G.winner!=null||G.draw)chessClaim();
      else chLocalBot();
    });
  },320);
}
function chBeginLocal(pl,tie){
  NG.chT0=Date.now();
  G=globalThis.CHESS.rules.new(pl,{seq:1,round:1,score:{},clock:chClock==="none"?"":chClock,now:Date.now(),tie:tie|0});
  show("ch");chRender();chLocalBot();
}
function chStartLocal(){
  if(!globalThis.CHESS)return;
  chStop();clearBot();mode="local";hist=[];NG.solo=null;M=null;NG.chNonce="";
  const me={id:"L0",nick:P.nickname?myNick():"أنت",skin:skinIdx(eff("skin")),bot:0};
  const bot={id:"B0",nick:"كمبيوتر",skin:1,bot:chLevel()};
  const pl=chColor==="b"?[bot,me]:[me,bot];
  chFlipManual=null;
  if(Cloud.on){
    api("bot_deal",{game:"chess",level:chLevel(),color:chColor==="b"?"b":"w"}).then(d=>{
      NG.chNonce=d&&d.nonce||"";
      chBeginLocal(pl,d&&d.seed||0);
    }).catch(()=>{NG.chNonce="";chBeginLocal(pl,0)});
    return;
  }
  chBeginLocal(pl,(Math.floor(Math.random()*0x7fffffff)||1));
}
function chPaintSound(){
  const b=$("chSound");if(!b)return;
  b.replaceChildren(ic(P.settings.mute?"mute":"sound"));
  b.setAttribute("aria-pressed",String(!P.settings.mute));
}
function chHidePromo(){const p=$("chPromo");if(p){p.classList.add("hidden");p.textContent=""}}
function chShowPromo(){
  const box=$("chPromo");if(!box||!chPromo)return;
  const lk=chLook(),seat=chMySeat();
  box.textContent="";
  const row=h("div",{class:"row"});
  for(const t of ["q","r","b","n"]){
    if(chPromo.opts&&!chPromo.opts.includes(t))continue;
    row.append(h("button",{type:"button","data-promo":t,"aria-label":CH_NAME[t],style:"color:"+(seat===0?lk.pc[0]:lk.pc[1])},CH_GLYPH[t]));
  }
  box.append(row);box.classList.remove("hidden");
}
function chCaptures(board,color){
  const start={q:1,r:2,b:2,n:2,p:8},have={q:0,r:0,b:0,n:0,p:0};
  for(const row of board)for(const p of row)if(p&&p.color===color&&have[p.type]!=null)have[p.type]++;
  const out=[];
  for(const t of ["q","r","b","n","p"])for(let i=0;i<start[t]-have[t];i++)out.push({t,color});
  return out;
}
function chPaintCaps(el,list,lk){
  if(!el)return;el.textContent="";
  for(const p of list)el.append(h("span",{class:"ch-mini","aria-hidden":"true",style:"color:"+(p.color==="w"?lk.pc[0]:lk.pc[1])},CH_GLYPH[p.t]));
}
function chPaintClocks(){
  const wrap=$("chClocks");if(!wrap)return;
  if(!G||!G.ck){wrap.classList.add("hidden");return}
  wrap.classList.remove("hidden");
  const flip=chFlip(),topSeat=flip?0:1,botSeat=1-topSeat,now=Date.now();
  const label=seat=>{
    let left=G.ck.left[seat];
    if(G.winner==null&&!G.draw&&G.turn===seat)left-=Math.max(0,now-(G.ck.at||now));
    const nick=G.players[seat]?G.players[seat].nick:"";
    return nick+"  "+chClockText(left);
  };
  const top=$("chClockTop"),bot=$("chClockBot");
  if(top){top.textContent=label(topSeat);top.classList.toggle("on",G.winner==null&&!G.draw&&G.turn===topSeat)}
  if(bot){bot.textContent=label(botSeat);bot.classList.toggle("on",G.winner==null&&!G.draw&&G.turn===botSeat)}
}
function chStatusText(){
  if(!G)return "";
  const mine=chMySeat();
  if(G.draw)return "تعادل"+(CH_WHY[G.reason]?" · "+CH_WHY[G.reason]:"");
  if(G.winner!=null){const w=G.players[G.winner];return (mine===G.winner?"فزت":"فاز "+(w?w.nick:""))+(CH_WHY[G.reason]?" · "+CH_WHY[G.reason]:"");}
  if(G.offer!=null)return G.offer===mine?"عرضت التعادل":(G.players[G.offer]?G.players[G.offer].nick:"الخصم")+" يعرض التعادل";
  if(G.check)return "كش";
  if(mine>=0&&G.turn===mine&&!(G.players[mine]&&G.players[mine].bot))return "دورك";
  return "دور "+(G.players[G.turn]?G.players[G.turn].nick:"");
}
function chPaintWin(){
  const box=$("chWin");if(!box||!G)return;
  const over=G.winner!=null||G.draw;
  box.classList.toggle("hidden",!over);
  if(!over)return;
  const mine=chMySeat(),won=mine>=0&&G.winner===mine&&!G.draw;
  const k=$("chKicker");
  if(k){k.classList.remove("is-win","is-loss");k.textContent=G.draw?"تعادل":mine<0?"انتهت":won?"فوز":"خسارة";if(!G.draw&&mine>=0)k.classList.add(won?"is-win":"is-loss")}
  const t=$("chWinText");
  if(t){t.classList.remove("is-win","is-loss","is-draw");t.textContent=G.draw?"تعادل":won?"فزت":"انتهت";t.classList.add(G.draw?"is-draw":won?"is-win":"is-loss")}
  const sub=$("chWinSub");if(sub)sub.textContent=CH_WHY[G.reason]||"";
  const rw=$("chRewards");
  if(rw){
    rw.textContent="";
    const lr=lastResult&&lastResult.mid===G.mid?lastResult:null;
    if(!lr)rw.append(h("p",{class:"hint"},"…"));
    else if(lr.skipped==="offline")rw.append(h("p",{class:"hint"},"فوزك واضح، والعملات تحتاج اتصال بالخادم."));
    else if(lr.skipped==="cap")rw.append(h("p",{class:"hint"},"وصلت حد مكافآت الشطرنج اليوم: ٨ جولات."));
    else if(lr.out&&lr.out.coins)rw.append(h("p",{class:"hint"},"+"+fmt(lr.out.coins)+" عملة"));
    else if(G.draw)rw.append(h("p",{class:"hint"},"التعادل ما يعطي عملات."));
    else if(!won)rw.append(h("p",{class:"hint"},"الخسارة ما تعطي عملات."));
    else rw.append(h("p",{class:"hint"},"هالنتيجة ما تعطيك عملات."));
  }
  const lobby=$("chLobby");if(lobby)lobby.classList.toggle("hidden",mode!=="room");
}
function chAnimate(el,fromSq){
  if(!el||reduceMotion())return;
  const from=$("chBoard").querySelector('[data-sq="'+fromSq+'"]');
  const to=el.parentElement;if(!from||!to)return;
  const a=from.getBoundingClientRect(),b=to.getBoundingClientRect();
  el.style.transform="translate("+(a.left-b.left)+"px,"+(a.top-b.top)+"px)";
  requestAnimationFrame(()=>{requestAnimationFrame(()=>{el.style.transition="transform .18s ease";el.style.transform="translate(0,0)"})});
}
function chRender(){
  if(!G||G.game!=="chess"||!$("chBoard"))return;
  if(!globalThis.Chess||!globalThis.CHESS)return;
  chPaintSound();chPaintClocks();
  const st=$("chStatus");if(st)st.textContent=chStatusText();
  const lk=chLook(),flip=chFlip(),c=chPos(),board=c.board();
  const mine=chMySeat(),myColor=mine===0?"w":mine===1?"b":"";
  const act=canAct();
  const moves=act?c.moves({verbose:true}):[];
  const fromSet=new Set(chSel?moves.filter(m=>m.from===chSel).map(m=>m.to):[]);
  const bd=$("chBoard");bd.textContent="";
  bd.style.setProperty("--ch-dark",lk.sq[0]);bd.style.setProperty("--ch-light",lk.sq[1]);
  for(let rr=0;rr<8;rr++)for(let cc=0;cc<8;cc++){
    const r=flip?7-rr:rr,f=flip?7-cc:cc;
    const sq="abcdefgh"[f]+(8-r);
    const piece=board[r][f];
    const dark=(r+f)%2===1;
    const btn=h("button",{type:"button",class:"ch-sq"+(G.last&&(G.last.from===sq||G.last.to===sq)?" last":"")+(G.check===sq?" chk":"")+(chSel===sq?" sel":""),"data-sq":sq,"aria-label":(piece?(piece.color==="w"?"أبيض ":"أسود ")+CH_NAME[piece.type]+" ":"")+sq,style:"background:"+(dark?lk.sq[0]:lk.sq[1])});
    if(piece){
      const pc=h("span",{class:"ch-pc",style:"color:"+(piece.color==="w"?lk.pc[0]:lk.pc[1])},CH_GLYPH[piece.type]);
      btn.append(pc);
    }else if(fromSet.has(sq)){
      const cap=moves.some(m=>m.from===chSel&&m.to===sq&&m.captured);
      btn.append(h("span",{class:"ch-dot"+(cap?" cap":""),"aria-hidden":"true"}));
    }
    if(fromSet.has(sq)&&piece)btn.append(h("span",{class:"ch-dot cap","aria-hidden":"true"}));
    bd.append(btn);
  }
  if(G.last&&G.last.from&&G.last.to&&chAnimSeq!==G.seq){
    chAnimSeq=G.seq;
    const pc=bd.querySelector('[data-sq="'+G.last.to+'"] .ch-pc');
    chAnimate(pc,G.last.from);
  }
  const botSeat=flip?1:0,topSeat=1-botSeat;
  const topColor=topSeat===0?"w":"b",botColor=botSeat===0?"w":"b";
  chPaintCaps($("chCapsTop"),chCaptures(board,botColor),lk);
  chPaintCaps($("chCapsBot"),chCaptures(board,topColor),lk);
  const ol=$("chMoves");if(ol){ol.textContent="";
    for(let i=0;i<G.sans.length;i+=2){
      const n=fmt(i/2+1);
      ol.append(h("li",{},n+". "+G.sans[i]+(G.sans[i+1]?" "+G.sans[i+1]:"")));
    }
    ol.scrollLeft=ol.scrollWidth;
  }
  const rs=$("chResign"),dr=$("chDraw");
  const live=G.winner==null&&!G.draw;
  if(rs)rs.disabled=!live||mine<0;
  if(dr){
    dr.disabled=!live||mine<0;
    if(G.offer==null)dr.textContent="عرض تعادل";
    else if(G.offer===mine)dr.textContent="عرضت تعادل";
    else dr.textContent="اقبل التعادل";
  }
  chPaintWin();
  if(chPromo)chShowPromo();else chHidePromo();
  void myColor;
}
function chTick(){
  if(screen!=="ch"||!G||G.game!=="chess")return;
  chPaintClocks();
  if(G.winner!=null||G.draw||!G.ck)return;
  const now=Date.now();
  const left=G.ck.left[G.turn]-Math.max(0,now-(G.ck.at||now));
  if(left>-150||chFlagSeq===G.seq)return;
  chFlagSeq=G.seq;
  chSend({t:"flag"});
}
async function chSend(a){
  if(!G||G.game!=="chess"||!globalThis.CHESS)return;
  const seat=chMySeat();
  if(seat<0)return;
  const act=Object.assign({now:Date.now()},a);
  const selfFlag=a.t==="flag"&&G.turn===seat;
  const who=selfFlag?1-seat:seat;
  if(!selfFlag){
    const err=globalThis.CHESS.rules.legal(G,who,act);
    if(err){sfx("bad");toast(err,"bad");return}
  }else if(mode==="local"){
    const err=globalThis.CHESS.rules.legal(G,who,act);
    if(err){sfx("bad");toast(err,"bad");return}
  }
  chPromo=null;chHidePromo();chSel="";
  if(mode==="local"){
    G=globalThis.CHESS.rules.apply(G,who,act);
    sfx(G.winner!=null?"win":G.draw?"move":G.check?"bad":"move");
    chRender();
    if(G.winner!=null||G.draw)chessClaim();
    else chLocalBot();
    return;
  }
  if(mode==="solo"){
    if(NG.busy||!NG.solo)return;
    setNetBusy(true);
    try{
      const r=await api("solo_act",{id:NG.solo.id,gseq:G.seq,a:act});
      G=r.state;sfx(G.winner!=null?"win":G.check?"bad":"move");
      if(G.winner!=null||G.draw)chessClaim();
    }catch(e){if(!(a.t==="flag"&&G&&(G.winner!=null||G.draw))){toast(e.message,"bad");sfx("bad")}}
    finally{setNetBusy(false);if(G)chRender()}
    return;
  }
  if(mode==="room"){
    if(NG.busy||!NG.room)return;
    const seq=G.seq;setNetBusy(true);
    try{
      const r=await api("room_act",{code:NG.room.code,gseq:seq,a:act});
      if(r&&r.room)onRoomRow(r.room,true);
    }catch(e){if(!(a.t==="flag"&&G&&(G.winner!=null||G.draw))){toast(e.message,"bad");sfx("bad");chFlagSeq=-1}}
    finally{setNetBusy(false);if(G&&screen==="ch")chRender()}
  }
}
function chTryMove(from,to){
  if(!from||!to||from===to){chSel=to&&chOwn(to)?to:"";chRender();return}
  const c=chPos();
  const ms=c.moves({verbose:true}).filter(m=>m.from===from&&m.to===to);
  if(!ms.length){if(chOwn(to))chSel=to;else{sfx("bad");chSel=""}chRender();return}
  if(ms.some(m=>m.promotion)){chPromo={from,to,opts:[...new Set(ms.map(m=>m.promotion))]};chShowPromo();return}
  chSend({t:"mv",from,to,promotion:""});
}
function chOwn(sq){
  const mine=chMySeat();if(mine<0||!G)return false;
  const c=chPos(),b=c.board();
  const f="abcdefgh".indexOf(sq[0]),r=8-Number(sq[1]);
  const p=b[r]&&b[r][f];
  return !!(p&&p.color===(mine===0?"w":"b"));
}
function chGhostAt(x,y,glyph,color){
  let g=$("chGhost");
  if(!g){g=h("div",{id:"chGhost",style:"position:fixed;z-index:40;pointer-events:none;font-size:42px;line-height:1;transform:translate(-50%,-50%)"});document.body.append(g)}
  g.style.left=x+"px";g.style.top=y+"px";g.style.color=color;g.textContent=glyph;
}
function chessClaim(){
  if(!G||G.game!=="chess"||chClaimed===G.mid)return;
  if(G.winner==null&&!G.draw)return;
  chClaimed=G.mid;
  const seat=chMySeat();
  const won=seat>=0&&G.winner===seat&&!G.draw;
  const payable=won&&((mode==="local"||mode==="solo")&&G.reason==="mate"||mode==="room"&&(G.reason==="mate"||G.reason==="resign"||G.reason==="time"));
  if(!payable){lastResult={mid:G.mid,won:!!won,skipped:G.draw?"draw":"loss"};chPaintWin();return}
  if(!Cloud.on){lastResult={mid:G.mid,won:true,skipped:"offline"};chPaintWin();return}
  let requestId=("ch-"+String(G.mid||"")).replace(/[^A-Za-z0-9:_-]/g,"").slice(0,80);
  if(requestId.length<8)requestId=("ch-req-"+Date.now()).slice(0,80);
  const body={requestId};
  if(mode==="room"&&NG.room)body.code=NG.room.code;
  else if(mode==="solo"&&NG.solo)body.solo=NG.solo.id;
  else{
    if(!NG.chNonce){lastResult={mid:G.mid,won:true,skipped:"offline"};chPaintWin();return}
    body.nonce=NG.chNonce;body.sans=(G.sans||[]).slice();
  }
  const send=()=>api("chess_finish",body).then(r=>{
    if(typeof r.coins==="number"){P.coins=r.coins;if(r.version)P.__ver=r.version;saveProfile()}
    if(r.capped&&!(r.amount>0))lastResult={mid:G.mid,won:true,skipped:"cap"};
    else lastResult={mid:G.mid,won:!!r.won,out:r.won?{xp:0,coins:r.amount||0,items:[],levelUps:[],ach:[],missions:[],xpBefore:P.xp,levelBefore:P.level,streak:0}:null,skipped:r.won?null:"loss"};
    if(screen==="ch")chPaintWin();
  }).catch(()=>{lastResult={mid:G.mid,won:true,skipped:"offline"};if(screen==="ch")chPaintWin()});
  if(body.nonce){const wait=Math.max(0,12000-(Date.now()-(NG.chT0||Date.now())));setTimeout(send,wait)}
  else send();
}
function chAgain(){
  if(mode==="solo")return netSoloStart(true);
  if(mode==="room"){if(NG.room&&NG.room.host===cid)netRoomCall("room_rematch");return}
  chStartLocal();
}
$("chQuit").onclick=()=>{
  const q=$("chQuit");
  if(G&&G.winner==null&&!G.draw&&Date.now()-quitArm>2500){
    quitArm=Date.now();q.textContent="متأكد؟";q.classList.add("arm");
    setTimeout(()=>{q.textContent="خروج";q.classList.remove("arm")},2500);return;
  }
  quitArm=0;q.textContent="خروج";q.classList.remove("arm");goHome();
};
$("chSound").onclick=()=>{P.settings.mute=!P.settings.mute;saveProfile();chPaintSound();renderSound();if(!P.settings.mute)sfx("move")};
$("chFlip").onclick=()=>{chFlipManual=!chFlip();sfx("move");chRender()};
$("chResign").onclick=()=>{if(!G||G.winner!=null||G.draw)return;confirmSheet("استسلام","تسلّم الجولة للخصم؟","استسلام",()=>chSend({t:"resign"}))};
$("chDraw").onclick=()=>{
  if(!G||G.winner!=null||G.draw)return;
  const mine=chMySeat();
  if(G.offer==null){if(G.turn!==mine){toast("عرض التعادل في دورك");return}chSend({t:"draw"});return}
  if(G.offer===mine){toast("ننتظر رد الخصم");return}
  openSheet((c,close)=>{
    c.append(h("h3",{},"عرض تعادل"),h("p",{class:"lead"},"الخصم يعرض التعادل."),
      h("div",{class:"row"},
        h("button",{class:"primary",type:"button",onclick:()=>{close();chSend({t:"draw_yes"})}},"أقبل"),
        h("button",{type:"button",onclick:()=>{close();chSend({t:"draw_no"})}},"أرفض")));
  });
};
$("chAgain").onclick=chAgain;
$("chHome").onclick=goHome;
$("chLobby").onclick=()=>{if(mode==="room")netRoomCall("room_lobby")};
$("chPromo").addEventListener("click",e=>{
  const b=e.target.closest("[data-promo]");if(!b||!chPromo)return;
  const pr=chPromo;chPromo=null;chHidePromo();
  chSend({t:"mv",from:pr.from,to:pr.to,promotion:b.dataset.promo});
});
$("chBoard").addEventListener("pointerdown",e=>{
  if(!G||G.game!=="chess"||(e.button!=null&&e.button!==0))return;
  const sqEl=e.target.closest(".ch-sq");if(!sqEl)return;
  const sq=sqEl.dataset.sq;
  if(chSel&&chSel!==sq){chTryMove(chSel,sq);return}
  if(!chOwn(sq)||!canAct()){chSel="";chRender();return}
  const lk=chLook(),mine=chMySeat();
  chDrag={from:sq,x:e.clientX,y:e.clientY,moved:false,id:e.pointerId,glyph:sqEl.querySelector(".ch-pc")?sqEl.querySelector(".ch-pc").textContent:"",color:mine===0?lk.pc[0]:lk.pc[1]};
  chSel=sq;
  try{$("chBoard").setPointerCapture(e.pointerId)}catch(err){}
  sqEl.classList.add("sel");
});
$("chBoard").addEventListener("pointermove",e=>{
  if(!chDrag||e.pointerId!==chDrag.id)return;
  if(Math.hypot(e.clientX-chDrag.x,e.clientY-chDrag.y)>8)chDrag.moved=true;
  if(chDrag.moved)chGhostAt(e.clientX,e.clientY,chDrag.glyph,chDrag.color);
});
$("chBoard").addEventListener("pointerup",e=>{
  if(!chDrag||e.pointerId!==chDrag.id)return;
  const d=chDrag;chDrag=null;
  const ghost=$("chGhost");if(ghost)ghost.remove();
  if(!d.moved){chSel=d.from;chRender();return}
  const under=document.elementFromPoint(e.clientX,e.clientY);
  const sq=under&&under.closest?under.closest(".ch-sq"):null;
  if(sq)chTryMove(d.from,sq.dataset.sq);
  else{chSel="";chRender()}
});
$("chBoard").addEventListener("pointercancel",()=>{chDrag=null;const g=$("chGhost");if(g)g.remove()});

/* ---- helpers shared with games that live in their own files (BALL CLASH) ---- */
window.SP={h,ic,htmlEl,fmt,show,toast,sfx,buzz,openSheet,openGame,api,applyProfile,setCoins,coinEl,online:()=>Platform.kind==="web"&&!!Cloud.on,reduced:()=>matchMedia("(prefers-reduced-motion: reduce)").matches,get P(){return P},get screen(){return screen}};
window.__spiderReady=true;
document.documentElement.classList.remove("app-loading");
document.documentElement.removeAttribute("aria-busy");
const __intent=window.__spiderIntent;
if(__intent){
  window.__spiderIntent=null;
  if(__intent.game)openGame(__intent.game,__intent.act==="help"?"help":undefined);
  else if(__intent.go)show(__intent.go);
  else if(__intent.id){const el=$(__intent.id);if(el)el.click()}
}
})();