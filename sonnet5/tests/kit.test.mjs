import test from 'node:test';
import assert from 'node:assert/strict';
import { makeKit } from './helpers.mjs';
import { near } from './helpers.mjs';

test('矩阵栈：碰撞体按局部坐标、偏航与 y 偏移换算到世界', () => {
  const { world, kit } = makeKit();
  kit.push(10, 2, 5, Math.PI / 2);
  const w = kit.wall(3, 0, 1, 0.5, 0, 2);
  kit.pop();
  // 局部 +x 在偏航 90° 时指向世界 -z
  assert.ok(near(w.cx, 10, 1e-6));
  assert.ok(near(w.cz, 2, 1e-6));
  assert.ok(near(w.y0, 2) && near(w.y1, 4));
  assert.ok(near(Math.abs(w.s), 1, 1e-6));
});

test('嵌套矩阵栈：弹出后恢复', () => {
  const { kit } = makeKit();
  kit.push(1, 0, 0, 0).push(0, 0, 2, 0);
  assert.ok(near(kit.toWorld(0, 0, 0).x, 1) && near(kit.toWorld(0, 0, 0).z, 2));
  kit.pop();
  assert.ok(near(kit.toWorld(0, 0, 0).z, 0));
  kit.pop();
  assert.ok(near(kit.toWorld(0, 0, 0).x, 0));
});

test('区域与灯位：登记为世界坐标', () => {
  const { world, kit } = makeKit();
  kit.push(20, 1, -10, 0);
  kit.zone('测试区', 'D', 0, 0, 2, 2, 0, 3);
  kit.light(1, 2, 0, 0xffffff, 10, 5);
  kit.pop();
  assert.equal(world.zoneAt(20, 2, -10).name, '测试区');
  assert.ok(near(world.anchors[0].x, 21) && near(world.anchors[0].y, 3) && near(world.anchors[0].z, -10));
});

test('批处理：按材质合并为单个网格', () => {
  const { kit } = makeKit();
  for (let i = 0; i < 50; i++) kit.box(kit.M.plain, [i, 0, 0], [1, 1, 1]);
  const meshes = kit.b.build(kit.group);
  assert.equal(meshes.length, 1);
  assert.equal(meshes[0].geometry.attributes.position.count, 50 * 36);
});
