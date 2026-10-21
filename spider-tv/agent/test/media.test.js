import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { encodeId, resolveId, kindOf } from '../lib/media.js';

const rootsList = ['/home/u/Videos', '/home/u/Music'];

test('ids round-trip inside their root', () => {
  const id = encodeId(0, 'Shows/ep 1.mp4');
  assert.equal(resolveId(id, rootsList).abs, path.resolve('/home/u/Videos/Shows/ep 1.mp4'));
});

test('ids cannot escape their root', () => {
  assert.throws(() => resolveId(encodeId(0, '../../../etc/passwd'), rootsList), /Outside/);
  assert.throws(() => resolveId(encodeId(0, '../Videos-evil/x'), rootsList), /Outside/);
  assert.throws(() => resolveId(encodeId(5, 'x'), rootsList), /Unknown root/);
  assert.throws(() => resolveId(Buffer.from('nonsense').toString('base64url'), rootsList));
});

test('kindOf', () => {
  assert.equal(kindOf('a.MKV'), 'video');
  assert.equal(kindOf('a.flac'), 'audio');
  assert.equal(kindOf('a.webp'), 'image');
  assert.equal(kindOf('a.txt'), 'other');
});
