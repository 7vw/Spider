/* Shared scorer for كلمة اليوم. Classic script: sets globalThis.KALIMA.
   The same file is spliced into the spider function. It does not contain answers. */
(function (root) {
  const TASH = /[\u064B-\u0652\u0670\u0640\u06D6-\u06ED]/g;
  const MAP = {"أ": "ا", "إ": "ا", "آ": "ا", "ٱ": "ا", "ة": "ه", "ى": "ي", "ؤ": "و", "ئ": "ي"};
  function norm(s) {
    s = String(s == null ? "" : s).replace(TASH, "").replace(/ء/g, "");
    let out = "";
    for (const ch of s) out += MAP[ch] || ch;
    return out;
  }
  function score(answer, guess) {
    const a = [...answer], g = [...guess], m = ["b", "b", "b", "b", "b"], left = {};
    for (let i = 0; i < 5; i++) {
      if (g[i] === a[i]) m[i] = "g";
      else left[a[i]] = (left[a[i]] || 0) + 1;
    }
    for (let i = 0; i < 5; i++) {
      if (m[i] === "g") continue;
      if (left[g[i]]) { m[i] = "y"; left[g[i]]--; }
    }
    return m.join("");
  }
  function dayIndex(day, n) {
    const p = String(day).split("-").map(Number);
    const k = Math.round((Date.UTC(p[0], p[1] - 1, p[2]) - Date.UTC(2026, 0, 1)) / 86400000);
    return ((k % n) + n) % n;
  }
  function prevDay(day) {
    const p = String(day).split("-").map(Number);
    const dt = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
    dt.setUTCDate(dt.getUTCDate() - 1);
    return dt.toISOString().slice(0, 10);
  }
  root.KALIMA = {
    norm, score, dayIndex, prevDay, LEN: 5, TRIES: 6,
    ALPHA: "ابتثجحخدذرزسشصضطظعغفقكلمنهوي"
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
