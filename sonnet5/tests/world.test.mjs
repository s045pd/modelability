import test from 'node:test';
import assert from 'node:assert/strict';
import { World } from '../src/core/world.js';
import { near } from './helpers.mjs';

test('圆形玩家被墙体推开', () => {
  const w = new World();
  w.addWall({ cx: 1, cz: 0, hx: 0.1, hz: 3, y0: 0, y1: 3 });
  const [x, z] = w.resolve(0.85, 0, 0.34, 0, 1.75);
  assert.ok(x <= 1 - 0.1 - 0.34 + 1e-6, `x=${x}`);
  assert.ok(near(z, 0, 1e-6));
});

test('旋转 45° 的墙同样阻挡', () => {
  const w = new World();
  w.addWall({ cx: 0, cz: 0, hx: 2, hz: 0.1, yaw: Math.PI / 4, y0: 0, y1: 3 });
  const [x, z] = w.resolve(0.1, 0.1, 0.34, 0, 1.75);
  const dist = Math.abs((x + z) / Math.SQRT2); // 到墙中线的距离（墙沿 (1,-1) 方向）
  assert.ok(dist >= 0.1 + 0.34 - 1e-3 || Math.abs(x - z) > 2, `dist=${dist}`);
});

test('高度范围不重叠的墙被忽略', () => {
  const w = new World();
  w.addWall({ cx: 1, cz: 0, hx: 0.1, hz: 3, y0: 4, y1: 6 });
  const [x] = w.resolve(0.9, 0, 0.34, 0, 1.75);
  assert.ok(near(x, 0.9));
});

test('地板取不高于脚底+台阶高度的最高者', () => {
  const w = new World();
  w.addFloor({ cx: 0, cz: 0, hx: 10, hz: 10, y0: 0 });
  w.addFloor({ cx: 0, cz: 0, hx: 2, hz: 2, y0: 0.3 });
  w.addFloor({ cx: 0, cz: 0, hx: 1, hz: 1, y0: 1.5 });
  assert.equal(w.floorAt(0, 0, 0), 0.3);
  assert.equal(w.floorAt(5, 5, 0), 0);
  assert.equal(w.floorAt(0, 0, 1.2), 1.5);
  assert.equal(w.floorAt(20, 20, 0), null);
});

test('斜面地板线性插值', () => {
  const w = new World();
  w.addFloor({ cx: 0, cz: 0, hx: 1, hz: 2, y0: 0, y1: 2 });
  assert.ok(near(w.floorAt(0, -2, 5), 0));
  assert.ok(near(w.floorAt(0, 0, 5), 1));
  assert.ok(near(w.floorAt(0, 2, 5), 2));
});

test('区域查询：更小的区域优先', () => {
  const w = new World();
  const mk = (name, hx, hz) => w.zones.push({ name, deck: 'D', cx: 0, cz: 0, hx, hz, c: 1, s: 0, y0: -1, y1: 5, area: hx * hz });
  mk('大厅', 10, 10); mk('电梯', 2, 2);
  assert.equal(w.zoneAt(0, 1, 0).name, '电梯');
  assert.equal(w.zoneAt(6, 1, 0).name, '大厅');
  assert.equal(w.zoneAt(50, 1, 0), null);
});
