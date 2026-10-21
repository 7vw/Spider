/* Chess rules for SPIDER. Uses the vendored chess.js (BSD-2-Clause) for legality.
   The bot is a deterministic alpha-beta search in this file, not a GPL engine.
   The same file is spliced into the edge function. */
(function (root) {
  const Chess = root.Chess;
  if (!Chess) throw new Error("chess");
  const CLOCKS = {"3+2": [180000, 2000], "5+0": [300000, 0], "10+0": [600000, 0]};
  const DEPTH = [0, 1, 2, 3, 4];
  const CAP = [0, 800, 2500, 12000, 40000];
  const VAL = {p: 100, n: 320, b: 330, r: 500, q: 900, k: 0};
  const PST = {
    p: [0,0,0,0,0,0,0,0,50,50,50,50,50,50,50,50,10,10,20,30,30,20,10,10,5,5,10,25,25,10,5,5,0,0,0,20,20,0,0,0,5,-5,-10,0,0,-10,-5,5,5,10,10,-20,-20,10,10,5,0,0,0,0,0,0,0,0],
    n: [-50,-40,-30,-30,-30,-30,-40,-50,-40,-20,0,5,5,0,-20,-40,-30,0,10,15,15,10,0,-30,-30,5,15,20,20,15,5,-30,-30,0,15,20,20,15,0,-30,-30,5,10,15,15,10,5,-30,-40,-20,0,5,5,0,-20,-40,-50,-40,-30,-30,-30,-30,-40,-50],
    b: [-20,-10,-10,-10,-10,-10,-10,-20,-10,5,0,0,0,0,5,-10,-10,10,10,10,10,10,10,-10,-10,0,10,10,10,10,0,-10,-10,5,5,10,10,5,5,-10,-10,0,5,10,10,5,0,-10,-10,0,0,0,0,0,0,-10,-20,-10,-10,-10,-10,-10,-10,-20],
    r: [0,0,0,5,5,0,0,0,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,5,10,10,10,10,10,10,5,0,0,0,0,0,0,0,0],
    q: [-20,-10,-10,-5,-5,-10,-10,-20,-10,0,5,0,0,0,0,-10,-10,5,5,5,5,5,0,-10,0,0,5,5,5,5,0,-5,-5,0,5,5,5,5,0,-5,-10,0,5,5,5,5,0,-10,-10,0,0,0,0,0,0,-10,-20,-10,-10,-5,-5,-10,-10,-20],
    k: [-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-20,-30,-30,-40,-40,-30,-30,-20,-10,-20,-20,-20,-20,-20,-20,-10,20,20,0,0,0,0,20,20,20,30,10,0,0,10,30,20]
  };

  function playSans(sans) {
    const c = new Chess();
    for (let i = 0; i < sans.length; i++) {
      if (!c.move(sans[i])) throw new Error("illegal");
    }
    return c;
  }
  function kingSq(c, color) {
    const b = c.board();
    for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
      const p = b[r][f];
      if (p && p.type === "k" && p.color === color) return p.square;
    }
    return "";
  }
  function flagOutcome(c, seat) {
    if (c.isInsufficientMaterial()) return {winner: null, draw: true, reason: "time"};
    return {winner: seat, draw: false, reason: "time"};
  }
  function outcome(c) {
    if (c.isCheckmate()) return {winner: c.turn() === "w" ? 1 : 0, draw: false, reason: "mate", check: kingSq(c, c.turn())};
    if (c.isStalemate()) return {winner: null, draw: true, reason: "stalemate", check: ""};
    if (c.isInsufficientMaterial()) return {winner: null, draw: true, reason: "material", check: ""};
    if (c.isThreefoldRepetition()) return {winner: null, draw: true, reason: "rep", check: ""};
    if (c.isDrawByFiftyMoves()) return {winner: null, draw: true, reason: "50", check: ""};
    return {winner: null, draw: false, reason: "", check: c.inCheck() ? kingSq(c, c.turn()) : ""};
  }
  function stamp(g, c, mv) {
    const o = outcome(c);
    g.fen = c.fen();
    g.turn = c.turn() === "w" ? 0 : 1;
    if (mv) g.last = {from: mv.from, to: mv.to, san: mv.san};
    g.winner = o.winner;
    g.draw = o.draw;
    g.reason = o.reason;
    g.check = o.check;
    g.seq = (g.seq || 0) + 1;
    return g;
  }
  function clone(g) {
    return JSON.parse(JSON.stringify(g));
  }
  function clockNow(a, g) {
    if (a && a.serverNow) return a.serverNow;
    if (a && a.now) return a.now;
    return g.ck ? g.ck.at : 0;
  }
  function fresh(players, o) {
    o = o || {};
    const spec = CLOCKS[o.clock] || null;
    const g = {
      game: "chess", n: 2, players: players.slice(0, 2).map(p => ({id: p.id, nick: p.nick, skin: p.skin || 0, bot: p.bot || 0})),
      turn: 0, sans: [], fen: new Chess().fen(), last: null, check: "", offer: null,
      clock: spec ? o.clock : "",
      ck: spec ? {base: spec[0], inc: spec[1], left: [spec[0], spec[0]], at: o.now || 0} : null,
      winner: null, draw: false, reason: "",
      seq: o.seq || 1, mid: o.mid || ("ch" + ((o.seed || Math.floor(Math.random() * 1e9)) >>> 0).toString(36)),
      mv: [0, 0], walls: [], score: o.score || {}, round: o.round || 1, timer: 0, bs: "classic"
    };
    g.s0 = g.seq;
    return g;
  }

  function legal(g, seat, a) {
    if (!g || g.winner != null || g.draw) return "انتهت المباراة";
    if (!a || typeof a !== "object") return "حركة غير صحيحة";
    if (seat !== 0 && seat !== 1) return "مو مقعدك";
    if (a.t === "resign") return "";
    if (a.t === "draw") {
      if (seat !== g.turn) return "مو دورك";
      if (g.offer != null) return "فيه عرض قائم";
      return "";
    }
    if (a.t === "draw_yes" || a.t === "draw_no") {
      if (g.offer == null || g.offer === seat) return "ما فيه عرض";
      return "";
    }
    if (a.t === "flag") {
      if (!g.ck) return "ما فيه ساعة";
      if (seat === g.turn) return "الساعة على خصمك";
      const now = clockNow(a, g);
      if (!now) return "الوقت غير معروف";
      const left = g.ck.left[g.turn] - Math.max(0, now - g.ck.at);
      if (left > -150) return "لسه فيه وقت";
      return "";
    }
    if (a.t !== "mv") return "حركة غير معروفة";
    if (seat !== g.turn) return "مو دورك";
    let c;
    try { c = playSans(g.sans || []); } catch (e) { return "السجل غير صحيح"; }
    const promo = a.promotion ? String(a.promotion).toLowerCase() : "";
    const moves = c.moves({verbose: true}).filter(m => m.from === a.from && m.to === a.to);
    if (!moves.length) return "حركة غير قانونية";
    if (moves.some(m => m.promotion) && !promo) return "اختر القطعة";
    if (promo && !moves.some(m => m.promotion === promo)) return "ترقية غير صحيحة";
    if (g.ck) {
      const now = clockNow(a, g);
      const left = g.ck.left[g.turn] - Math.max(0, now - (g.ck.at || now));
      if (left < -150) return "خلص الوقت";
    }
    return "";
  }

  function apply(g, seat, a) {
    const n = clone(g);
    const now = clockNow(a, n);
    if (a.t === "resign") {
      n.winner = seat === 0 ? 1 : 0;
      n.draw = false;
      n.reason = "resign";
      n.offer = null;
      n.seq++;
      return n;
    }
    if (a.t === "draw") { n.offer = seat; n.seq++; return n; }
    if (a.t === "draw_no") { n.offer = null; n.seq++; return n; }
    if (a.t === "draw_yes") {
      n.winner = null; n.draw = true; n.reason = "agree"; n.offer = null; n.seq++;
      return n;
    }
    if (a.t === "flag") {
      const c = playSans(n.sans || []);
      const fo = flagOutcome(c, seat);
      n.offer = null;
      n.winner = fo.winner; n.draw = fo.draw; n.reason = fo.reason;
      if (n.ck) { n.ck.left[n.turn] = Math.min(0, n.ck.left[n.turn]); n.ck.at = now || n.ck.at; }
      n.seq++;
      return n;
    }
    if (n.ck && now) {
      const side = n.turn;
      const elapsed = Math.max(0, now - (n.ck.at || now));
      n.ck.left[side] = n.ck.left[side] - elapsed + (n.ck.inc || 0);
      n.ck.at = now;
    }
    const c = playSans(n.sans || []);
    const mv = c.move({from: a.from, to: a.to, promotion: a.promotion ? String(a.promotion).toLowerCase() : undefined});
    if (!mv) throw new Error("illegal");
    n.sans.push(mv.san);
    n.mv[seat] = (n.mv[seat] || 0) + 1;
    n.offer = null;
    return stamp(n, c, mv);
  }

  function material(c) {
    const b = c.board();
    let s = 0;
    for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
      const p = b[r][f];
      if (!p || p.type === "k") continue;
      const i = r * 8 + f;
      const v = VAL[p.type] + (PST[p.type][p.color === "w" ? i : (i ^ 56)] || 0);
      s += p.color === "w" ? v : -v;
    }
    return s;
  }
  function order(moves) {
    return moves.slice().sort((a, b) => {
      const sa = (a.captured ? 8 : 0) + (a.promotion ? 4 : 0);
      const sb = (b.captured ? 8 : 0) + (b.promotion ? 4 : 0);
      if (sa !== sb) return sb - sa;
      return a.san < b.san ? -1 : a.san > b.san ? 1 : 0;
    });
  }
  function mateScore(c, d) {
    return (c.turn() === "w" ? -1 : 1) * (100000 + d);
  }

  function pick(g, level) {
    const c = playSans((g && g.sans) || []);
    if (c.isGameOver()) return null;
    const lvl = level >= 1 && level <= 4 ? level | 0 : 1;
    const depth = DEPTH[lvl];
    const cap = CAP[lvl];
    let nodes = 0;
    const rootMoves = order(c.moves({verbose: true}));
    const white = c.turn() === "w";
    let best = null, bestSc = 0, bestSan = "";
    for (let i = 0; i < rootMoves.length; i++) {
      const m = rootMoves[i];
      c.move(m);
      let sc;
      if (m.san.indexOf("#") >= 0) sc = white ? 100000 : -100000;
      else if (depth <= 1) sc = (c.isThreefoldRepetition() || c.isDrawByFiftyMoves() || c.isInsufficientMaterial()) ? 0 : material(c);
      else sc = search(depth - 1, -1e15, 1e15);
      c.undo();
      let better = !best;
      if (!better && sc !== bestSc) better = white ? sc > bestSc : sc < bestSc;
      if (!better && sc === bestSc) better = m.san < bestSan;
      if (better) { best = m; bestSc = sc; bestSan = m.san; }
    }
    if (!best) return null;
    return {t: "mv", from: best.from, to: best.to, promotion: best.promotion || ""};

    function search(d, alpha, beta) {
      nodes++;
      if (c.isCheckmate()) return mateScore(c, d);
      if (c.isDraw()) return 0;
      if (d <= 0 || nodes > cap) return material(c);
      const w = c.turn() === "w";
      const ms = order(c.moves({verbose: true}));
      if (!ms.length) return 0;
      if (w) {
        let bestV = -1e15;
        for (let i = 0; i < ms.length; i++) {
          c.move(ms[i]);
          const sc = ms[i].san.indexOf("#") >= 0 ? 100000 + d : search(d - 1, alpha, beta);
          c.undo();
          if (sc > bestV) bestV = sc;
          if (sc > alpha) alpha = sc;
          if (alpha >= beta) break;
        }
        return bestV;
      }
      let bestV = 1e15;
      for (let i = 0; i < ms.length; i++) {
        c.move(ms[i]);
        const sc = ms[i].san.indexOf("#") >= 0 ? -100000 - d : search(d - 1, alpha, beta);
        c.undo();
        if (sc < bestV) bestV = sc;
        if (sc < beta) beta = sc;
        if (alpha >= beta) break;
      }
      return bestV;
    }
  }

  function replay(sans, bots, opt) {
    if (!Array.isArray(sans) || sans.length > 400) throw new Error("long");
    const levels = [bots && bots[0] | 0, bots && bots[1] | 0];
    let g = fresh([
      {id: "w", nick: "أبيض", bot: levels[0]},
      {id: "b", nick: "أسود", bot: levels[1]}
    ], {seq: 1, mid: "chreplay"});
    const verify = !(opt && opt.bots === false);
    for (let i = 0; i < sans.length; i++) {
      if (g.winner != null || g.draw) throw new Error("over");
      const seat = g.turn;
      const c = playSans(g.sans);
      const mv = c.moves({verbose: true}).find(m => m.san === sans[i]);
      if (!mv) throw new Error("illegal");
      if (verify && levels[seat]) {
        const exp = pick(g, levels[seat]);
        if (!exp || exp.from !== mv.from || exp.to !== mv.to || (exp.promotion || "") !== (mv.promotion || "")) throw new Error("bot");
      }
      g = apply(g, seat, {t: "mv", from: mv.from, to: mv.to, promotion: mv.promotion || ""});
    }
    return g;
  }

  function perft(fen, depth) {
    const c = fen ? new Chess(fen) : new Chess();
    function rec(d) {
      const ms = c.moves({verbose: true});
      if (d === 1) return ms.length;
      let n = 0;
      for (let i = 0; i < ms.length; i++) {
        c.move(ms[i]);
        n += rec(d - 1);
        c.undo();
      }
      return n;
    }
    if (!depth || depth <= 0) return 1;
    return rec(depth);
  }

  const rules = {
    new(players, o) { return fresh(players, o); },
    legal, apply,
    bot(g) {
      const seat = g.turn;
      const lvl = (g.players[seat] && g.players[seat].bot) || 1;
      return pick(g, lvl);
    },
    skip(g) {
      const n = clone(g);
      try {
        const c = playSans(n.sans || []);
        return stamp(n, c, n.last);
      } catch (e) {
        n.winner = n.turn === 0 ? 1 : 0;
        n.reason = "resign";
        n.seq++;
        return n;
      }
    }
  };

  root.CHESS = {rules, pick, replay, perft, probe: function (fen) { return outcome(new Chess(fen)); }, flagOutcome: function (fen, seat) { return flagOutcome(new Chess(fen), seat); }, clocks: CLOCKS};
})(typeof globalThis !== "undefined" ? globalThis : this);
