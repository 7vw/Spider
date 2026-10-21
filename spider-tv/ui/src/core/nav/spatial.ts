// Pure geometry for D-pad navigation. Works on visual positions, so RTL layouts need no special casing.

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

const center = (b: Box) => ({ x: (b.left + b.right) / 2, y: (b.top + b.bottom) / 2 });

/** Gap between two 1-D ranges, 0 when they overlap. */
function rangeGap(a1: number, a2: number, b1: number, b2: number) {
  if (b2 < a1) return a1 - b2;
  if (b1 > a2) return b1 - a2;
  return 0;
}

/**
 * Scores a candidate for a move in `dir`, or returns null if it is not in that direction.
 * Lower is better: distance along the axis, plus a heavy penalty for sideways offset so that
 * items lined up with the current one win over closer diagonal ones.
 */
export function score(from: Box, to: Box, dir: Direction): number | null {
  const a = center(from);
  const b = center(to);
  const tol = 1;
  let primary: number;
  let orthGap: number;
  let orthCenter: number;
  switch (dir) {
    case 'right':
      if (b.x <= a.x + tol || to.left < from.left + tol) return null;
      primary = Math.max(0, to.left - from.right);
      orthGap = rangeGap(from.top, from.bottom, to.top, to.bottom);
      orthCenter = Math.abs(b.y - a.y);
      break;
    case 'left':
      if (b.x >= a.x - tol || to.right > from.right - tol) return null;
      primary = Math.max(0, from.left - to.right);
      orthGap = rangeGap(from.top, from.bottom, to.top, to.bottom);
      orthCenter = Math.abs(b.y - a.y);
      break;
    case 'down':
      if (b.y <= a.y + tol || to.top < from.top + tol) return null;
      primary = Math.max(0, to.top - from.bottom);
      orthGap = rangeGap(from.left, from.right, to.left, to.right);
      orthCenter = Math.abs(b.x - a.x);
      break;
    case 'up':
      if (b.y >= a.y - tol || to.bottom > from.bottom - tol) return null;
      primary = Math.max(0, from.top - to.bottom);
      orthGap = rangeGap(from.left, from.right, to.left, to.right);
      orthCenter = Math.abs(b.x - a.x);
      break;
  }
  // Items that do not overlap on the cross axis pay a flat penalty, so a lined-up target wins.
  return primary + (orthGap > 0 ? 200 + orthGap * 5 : 0) + orthCenter * 0.15;
}

export function pickBest<T>(from: Box, candidates: { box: Box; item: T }[], dir: Direction): T | null {
  let best: T | null = null;
  let bestScore = Infinity;
  for (const c of candidates) {
    const s = score(from, c.box, dir);
    if (s !== null && s < bestScore) {
      bestScore = s;
      best = c.item;
    }
  }
  return best;
}
