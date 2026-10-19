/* Game rules for every title except WEBBOUND.
   Loaded as a normal script (no eval). The shell sets globalThis.SPIDER_GAMES = {clock, newMid} first.
   BC stays a global looked up when Ball Clash calls it, after bc_core.js has loaded. */
(function (SP) {
"use strict";
const clock = SP.clock, newMid = SP.newMid;
if (!clock || typeof newMid !== "function") throw new Error("games");
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
SP.games={WG,XO,WW,WL,DM,BF,FH,WR,NST,NW,BCR,GAME_RULES,MIN_PLAYERS,MAX_PLAYERS,WW_CATS};
})(globalThis.SPIDER_GAMES);
