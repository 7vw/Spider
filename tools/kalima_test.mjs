import assert from "node:assert/strict";
import fs from "fs";
import vm from "vm";

const engine = fs.readFileSync("js/kalima_engine.js", "utf8");
const context = { globalThis: {} };
vm.createContext(context);
vm.runInContext(engine, context);
const K = context.globalThis.KALIMA;

assert.equal(K.norm("أَسْتَاذَة"), "استاذه");
assert.equal(K.norm("مؤسسة"), "موسسه");
assert.equal(K.norm("شئون"), "شيون");
assert.equal(K.norm("على"), "علي");
assert.equal(K.norm("مَدْرَسَة"), "مدرسه");
assert.equal(K.score("مدرسه", "مدرسه"), "ggggg");
assert.equal(K.score("مدرسه", "سارحه"), "ybgbg");
const S = "\u0633", M = "\u0645", H = "\u0647";
assert.equal(K.score(S + M + S + M + H, M + S + M + S + M), "yyyyb");
assert.equal(K.score("كتابك", "ظنونظ"), "bbbbb");
assert.equal(K.dayIndex("2026-01-01", 400), 0);
assert.equal(K.dayIndex("2026-01-02", 400), 1);
assert.equal(K.dayIndex("2025-12-31", 400), 399);
assert.equal(K.prevDay("2026-03-01"), "2026-02-28");
assert.equal(K.prevDay("2028-03-01"), "2028-02-29");

const guesses = fs.readFileSync("js/kalima_guesses.js", "utf8");
const answers = fs.readFileSync("supabase/functions/spider/kalima_answers.js", "utf8");
assert.equal(guesses.includes("KALIMA_ANSWERS"), false);
const ans = [...answers.matchAll(/"([^"]+)"/g)].map(m => m[1]);
const gset = new Set([...guesses.matchAll(/"([^"]+)"/g)].map(m => m[1]));
assert.ok(ans.length >= 365);
assert.equal(ans.length, 400);
for (const w of ans) {
  assert.equal([...w].length, 5);
  assert.equal(gset.has(w), true);
  assert.equal(K.norm(w), w);
}
assert.equal(guesses.indexOf(ans.slice(0, 8).join(",")), -1);
const app = fs.readFileSync("app.js", "utf8");
const art = fs.readFileSync("artifact.html", "utf8");
const sw = fs.readFileSync("sw.js", "utf8");
for (const blob of [app, art, sw, guesses]) assert.equal(blob.includes("KALIMA_ANSWERS"), false);
console.log("ok kalima engine", ans.length, "answers", gset.size, "guesses");
