import test from 'node:test';
import assert from 'node:assert/strict';
import { makeKit } from './helpers.mjs';
import { wallSeg } from '../src/interior/walls.js';
import { stairs } from '../src/interior/props2.js';
import { stepWalk } from '../src/player/walker.js';

function walk(world, s, dirX, dirZ, seconds, speed = 3.3) {
  const dt = 1 / 60;
  for (let t = 0; t < seconds; t += dt) {
    const r = stepWalk(world, s, dirX * speed * dt, dirZ * speed * dt, dt);
    s.x = r.x; s.y = r.y; s.z = r.z; s.vy = r.vy;
  }
  return s;
}

test('玩家被实体墙挡住', () => {
  const { world, kit } = makeKit();
  kit.floorRect(0, 0, 20, 20, 0);
  wallSeg(kit, -5, -4, 5, -4, { h: 3 });
  const s = walk(world, { x: 0, y: 0, z: 0, vy: 0 }, 0, -1, 4);
  assert.ok(s.z > -4 + 0.15 + 0.34 - 0.05, `z=${s.z}`);
});

test('自动门：关闭时阻挡，靠近打开后可通过', () => {
  const { world, kit } = makeKit();
  kit.floorRect(0, 0, 20, 20, 0);
  wallSeg(kit, -5, -4, 5, -4, { h: 3, doors: [{ t: 5, w: 2.2, type: 'door', radius: 3 }] });
  // 远离时门关闭
  world.updateDoors(0, 0, 8, 0.1);
  const closed = walk(world, { x: 0, y: 0, z: -2.5, vy: 0 }, 0, -1, 0.3);
  assert.ok(closed.z > -4, '关闭的门应挡住');
  // 靠近后逐帧更新，门打开
  const s = { x: 0, y: 0, z: -1.5, vy: 0 };
  const dt = 1 / 60;
  for (let t = 0; t < 3; t += dt) {
    world.updateDoors(s.x, s.y, s.z, dt);
    const r = stepWalk(world, s, 0, -3.3 * dt, dt);
    s.x = r.x; s.z = r.z; s.y = r.y;
  }
  assert.ok(s.z < -4.5, `应穿过门，z=${s.z}`);
});

test('楼梯：沿台阶爬升到 4.5 米平台', () => {
  const { world, kit } = makeKit();
  kit.floorRect(0, 0, 20, 30, 0);
  const steps = 16;
  stairs(kit, { x: 0, z: 12, ry: Math.PI, w: 1.5, steps, rise: 4.5 / steps, run: 0.3 });
  kit.floorRect(0, 6, 3, 3, 4.5);
  const s = walk(world, { x: 0, y: 0, z: 14, vy: 0 }, 0, -1, 2.9);
  assert.ok(Math.abs(s.y - 4.5) < 0.05, `y=${s.y} z=${s.z}`);
  assert.ok(s.z < 7.2 && s.z > 3, `应站在平台上 z=${s.z}`);
});

test('平台边缘无栏杆时会坠落回下层', () => {
  const { world, kit } = makeKit();
  kit.floorRect(0, 0, 10, 10, 0);
  kit.floorRect(0, 0, 2, 2, 3);
  const s = walk(world, { x: 0, y: 3, z: 0, vy: 0 }, 0, -1, 2.0);
  assert.ok(s.y < 0.5, `y=${s.y}`);
});

test('无地板处不可行走', () => {
  const { world, kit } = makeKit();
  kit.floorRect(0, 0, 3, 3, 0);
  const s = walk(world, { x: 0, y: 0, z: 0, vy: 0 }, 1, 0, 4);
  assert.ok(s.x <= 3.0 + 1e-6, `x=${s.x}`);
});
