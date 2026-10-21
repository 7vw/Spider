/* Alpha-beta chess bot off the main thread. importScripts paths are relative to this file.
   The budget is inside the worker. The page does not call pick() if this message is late. */
importScripts("vendor/chess.global.js", "chess_rules.js");
var BUDGET = {1: 400, 2: 700, 3: 1200, 4: 1800};
self.onmessage = function (e) {
  const d = e.data || {};
  const level = d.level | 0;
  const budget = BUDGET[level] || 400;
  try {
    const mv = self.CHESS.pick({sans: d.sans || [], tie: d.tie | 0}, level, {deadline: Date.now() + budget});
    self.postMessage({id: d.id, ok: true, mv: mv});
  } catch (err) {
    self.postMessage({id: d.id, ok: false});
  }
};
