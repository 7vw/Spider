/* Alpha-beta chess bot off the main thread. importScripts paths are relative to this file. */
importScripts("vendor/chess.global.js", "chess_rules.js");
self.onmessage = function (e) {
  const d = e.data || {};
  try {
    const mv = self.CHESS.pick({sans: d.sans || []}, d.level | 0);
    self.postMessage({id: d.id, ok: true, mv: mv});
  } catch (err) {
    self.postMessage({id: d.id, ok: false});
  }
};
