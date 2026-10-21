/* Rules engine and bot. 10,000 bot-vs-bot games must finish with no illegal move. */
import fs from "fs";
import vm from "vm";
import assert from "node:assert/strict";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = fs.readFileSync(path.join(root, "js", "domino_engine.js"), "utf8");
const sandbox = { globalThis: {}, Math, JSON, Array, Number, Object };
sandbox.globalThis = sandbox;
vm.runInNewContext(src, sandbox, { filename: "domino_engine.js" });
const D = sandbox.DOMINO;
assert.ok(D && D.rules && D.tiles.length === 28);

function players(n, lvl) {
  return Array.from({ length: n }, (_, i) => ({ id: "P" + i, nick: "P" + i, skin: i, bot: lvl }));
}

let games = 0, steps = 0, draws = 0, team = 0;
for (let i = 0; i < 10000; i++) {
  const seed = (Math.imul(i + 1, 1103515245) + 12345) >>> 0;
  const n = i % 5 === 0 ? 4 : 2;
  const lvl = i % 2 ? 1 : 3;
  const bots = Array.from({ length: n }, (_, s) => (s === 0 && i % 7 === 0 ? 0 : lvl));
  if (i % 7 === 0) bots[0] = lvl;
  let g = D.deal(seed, n, players(n, lvl), {});
  assert.equal(g.hands.reduce((s, h) => s + h.length, 0) + g.yard.length + 1, 28);
  assert.equal(new Set(g.hands.flat().concat(g.yard, [g.open.id])).size, 28);
  let guard = 0;
  while (g.winner == null && !g.draw && guard < 200) {
    const a = D.bot(g);
    const e = D.legal(g, g.turn, a);
    assert.equal(e, null, "illegal seed " + seed + " " + e);
    const before = g.turn;
    g = D.apply(g, before, a);
    guard++;
  }
  assert.ok(g.winner != null || g.draw, "unfinished " + seed);
  assert.ok(guard < 200);
  const again = D.replay(seed, n, g.moves, Array(n).fill(lvl));
  assert.equal(again.winner, g.winner);
  assert.equal(again.draw, g.draw);
  assert.equal(again.moves.length, g.moves.length);
  if (g.draw) draws++;
  if (n === 4) team++;
  games++;
  steps += guard;
  if (g.winner != null) {
    assert.equal(D.playerWon(g, g.winner), true);
    if (n === 4) assert.equal(D.playerWon(g, g.winner % 2), true);
    if (n === 2) assert.equal(D.playerWon(g, 1 - g.winner), false);
  } else assert.equal(D.playerWon(g, 0), false);
}

const bad = D.deal(7, 2, players(2, 1), {});
assert.throws(() => D.replay(7, 2, [{ t: "play", id: 99, end: "L" }], [1, 1]));
assert.equal(D.legal(bad, bad.turn, { t: "nope" }), "حركة غير صحيحة");
const pub = D.rules.new(players(2, 2), { seed: 99, mid: "dmtest" });
assert.ok(pub.seed);
assert.equal(pub.hands, undefined);
assert.equal(pub.counts.reduce((s, n) => s + n, 0) + pub.yardN + 1, 28);
const priv = D.rules.deal(pub);
assert.equal(pub.seed, undefined);
assert.equal(priv[0].hand.length, pub.counts[0]);
assert.equal(pub.yard, undefined);
assert.equal(JSON.stringify(pub).includes('"yard":'), false);
const act = D.rules.bot(pub, pub.turn, priv);
assert.equal(D.rules.legal(pub, pub.turn, act, priv), null);

console.log("ok", games, "games", steps, "moves", draws, "draws", team, "team games");
