import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../src/core/rng.js';

test('相同种子产生相同序列', () => {
  const a = makeRng(42), b = makeRng(42);
  for (let i = 0; i < 20; i++) assert.equal(a(), b());
});

test('range / int / pick 落在预期范围', () => {
  const r = makeRng(7);
  for (let i = 0; i < 200; i++) {
    const v = r.range(2, 5); assert.ok(v >= 2 && v < 5);
    const n = r.int(1, 3); assert.ok(n >= 1 && n <= 3 && Number.isInteger(n));
    assert.ok(['a', 'b', 'c'].includes(r.pick(['a', 'b', 'c'])));
  }
});
