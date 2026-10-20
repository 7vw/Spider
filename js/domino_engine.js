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
