/* Perft on the standard positions, plus 1,000 level-1 bot-vs-bot games.
   Level 1 is depth 1 with a node cap: deep enough to stay legal, fast enough to finish.
   Higher levels use the same picker at depth 2–4. */
import fs from "fs";
import vm from "vm";

const ctx = {console, globalThis: null};
ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(new URL("../js/vendor/chess.global.js", import.meta.url), "utf8"), ctx);
vm.runInContext(fs.readFileSync(new URL("../js/chess_rules.js", import.meta.url), "utf8"), ctx);
const CHESS = ctx.CHESS;
const Chess = ctx.Chess;
const rules = CHESS.rules;
let fail = 0;
function eq(name, got, want) {
  if (got !== want) { fail++; console.log("FAIL", name, got, "!=", want); }
  else console.log("ok", name);
}

const START = [
  [1, 20], [2, 400], [3, 8902], [4, 197281]
];
for (const [d, n] of START) eq("start d" + d, CHESS.perft(undefined, d), n);
const KIWI = "r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1";
eq("kiwi d1", CHESS.perft(KIWI, 1), 48);
eq("kiwi d2", CHESS.perft(KIWI, 2), 2039);
eq("kiwi d3", CHESS.perft(KIWI, 3), 97862);
const P3 = "8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1";
eq("pos3 d1", CHESS.perft(P3, 1), 14);
eq("pos3 d2", CHESS.perft(P3, 2), 191);
eq("pos3 d3", CHESS.perft(P3, 3), 2812);
eq("pos3 d4", CHESS.perft(P3, 4), 43238);
const P4 = "r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1";
eq("pos4 d1", CHESS.perft(P4, 1), 6);
eq("pos4 d2", CHESS.perft(P4, 2), 264);
eq("pos4 d3", CHESS.perft(P4, 3), 9467);
const P5 = "rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8";
eq("pos5 d1", CHESS.perft(P5, 1), 44);
eq("pos5 d2", CHESS.perft(P5, 2), 1486);
eq("pos5 d3", CHESS.perft(P5, 3), 62379);

function play(sans) {
  let g = rules.new([{id: "a", nick: "أ", bot: 0}, {id: "b", nick: "ب", bot: 0}], {seq: 1, mid: "cht"});
  for (const san of sans) {
    const c = new Chess();
    for (const s of g.sans) c.move(s);
    const m = c.moves({verbose: true}).find(x => x.san === san);
    if (!m) throw new Error("missing " + san);
    const a = {t: "mv", from: m.from, to: m.to, promotion: m.promotion || ""};
    const err = rules.legal(g, g.turn, a);
    if (err) throw new Error(err + " " + san);
    g = rules.apply(g, g.turn, a);
  }
  return g;
}
const fool = play(["f3", "e5", "g4", "Qh4#"]);
eq("fool mate", fool.reason, "mate");
eq("fool winner", fool.winner, 1);
const chk = play(["e4", "f6", "Qh5+"]);
eq("check sq", chk.check, "e8");
const rep = play(["Nf3", "Nf6", "Ng1", "Ng8", "Nf3", "Nf6", "Ng1", "Ng8"]);
eq("threefold", rep.reason, "rep");
const ep = play(["e4", "a6", "e5", "d5", "exd6"]);
eq("ep san", ep.sans[4], "exd6");
const castle = play(["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "O-O"]);
eq("castle", castle.sans[6], "O-O");
const promo = play(["e4", "d5", "exd5", "c6", "dxc6", "Nf6", "cxb7", "Nc6", "bxa8=Q"]);
eq("promo", promo.sans[8], "bxa8=Q");
eq("stalemate", CHESS.probe("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1").reason, "stalemate");
eq("material", CHESS.probe("8/8/8/8/8/8/6k1/6K1 w - - 0 1").reason, "material");
eq("fifty", CHESS.probe("8/8/4k3/8/4P3/4K3/8/8 w - - 100 80").reason, "50");
eq("flag loss", CHESS.flagOutcome("8/8/4k3/8/4P3/4K3/8/8 w - - 0 1", 1).reason, "time");
eq("flag winner", CHESS.flagOutcome("8/8/4k3/8/4P3/4K3/8/8 w - - 0 1", 1).winner, 1);
eq("flag material draw", CHESS.flagOutcome("8/8/8/8/8/8/6k1/6K1 w - - 0 1", 1).draw, true);

let timed = rules.new([{id: "a", nick: "a", bot: 0}, {id: "b", nick: "b", bot: 0}], {clock: "3+2", now: 5000, mid: "chtm"});
timed.ck.left[0] = 100;
timed.ck.at = 5000;
const flagged = rules.apply(timed, 1, {t: "flag", serverNow: 5400});
eq("flag apply", flagged.reason === "time" && flagged.winner === 1, true);
const agreed = rules.apply(rules.apply(timed, 0, {t: "draw"}), 1, {t: "draw_yes"});
eq("agree", agreed.reason, "agree");
const resigned = rules.apply(timed, 0, {t: "resign"});
eq("resign", resigned.winner, 1);

let threw = false;
try { CHESS.replay(["e4", "a5"], [0, 1]); } catch (e) { threw = true; }
eq("forged bot rejected", threw, true);

const t0 = Date.now();
let games = 0, illegal = 0, moves = 0;
const reasons = {};
for (let i = 0; i < 1000; i++) {
  let g = rules.new([{id: "a", nick: "a", bot: 1}, {id: "b", nick: "b", bot: 1}], {mid: "g" + i, seq: 1});
  let guard = 0;
  while (g.winner == null && !g.draw && guard++ < 240) {
    const a = CHESS.pick(g, 1);
    const err = a && rules.legal(g, g.turn, a);
    if (!a || err) { illegal++; break; }
    g = rules.apply(g, g.turn, a);
    moves++;
  }
  try {
    const st = CHESS.replay(g.sans, [1, 1], {bots: false});
    if (st.winner !== g.winner || !!st.draw !== !!g.draw || st.reason !== g.reason) illegal++;
  } catch (e) { illegal++; }
  reasons[g.reason || "open"] = (reasons[g.reason || "open"] || 0) + 1;
  games++;
  if (i && i % 200 === 0) console.log("games", i, "moves", moves, "illegal", illegal, "s", ((Date.now() - t0) / 1000).toFixed(1));
}
console.log(JSON.stringify({games, moves, illegal, reasons, seconds: +((Date.now() - t0) / 1000).toFixed(1), fail}));
if (illegal || fail || games !== 1000) process.exit(1);
console.log("chess tests passed");
