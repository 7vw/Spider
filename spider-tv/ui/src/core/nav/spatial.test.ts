import { describe, expect, it } from 'vitest';
import { pickBest, score, type Box } from './spatial';

const box = (left: number, top: number, w = 100, h = 60): Box => ({ left, top, right: left + w, bottom: top + h });

describe('spatial navigation', () => {
  const row = [box(0, 0), box(120, 0), box(240, 0), box(360, 0)];
  const items = row.map((b, i) => ({ box: b, item: i }));

  it('moves along a row', () => {
    expect(pickBest(row[1], items, 'right')).toBe(2);
    expect(pickBest(row[1], items, 'left')).toBe(0);
    expect(pickBest(row[0], items, 'left')).toBeNull();
  });

  it('prefers aligned items over closer diagonal ones', () => {
    const from = box(0, 0);
    const aligned = box(0, 300);
    const diagonal = box(150, 90);
    expect(pickBest(from, [{ box: aligned, item: 'a' }, { box: diagonal, item: 'd' }], 'down')).toBe('a');
  });

  it('enters a row below at the overlapping tile', () => {
    const tab = box(250, -200, 80, 40);
    expect(pickBest(tab, items, 'down')).toBe(2);
  });

  it('ignores items behind the move direction', () => {
    expect(score(box(100, 0), box(0, 0), 'right')).toBeNull();
    expect(score(box(0, 100), box(0, 0), 'down')).toBeNull();
  });
});
