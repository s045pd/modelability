import * as THREE from 'three';

import { wallSeg } from './walls.js';
import { consoleUnit, chair, sign, wallScreen, ceilLight, pipe } from './props.js';
import { stairs, railing } from './props2.js';
import { makeRng } from '../core/rng.js';
import { HY } from '../exterior/dims.js';

export const BAY_Y = HY - 4.35 + 0.1;
const BZ = 116.5;
const HALF_W = 11, HALF_L = 15.9, HH = 9.9;

// 伽利略号型穿梭机
function shuttle(kit, x, z, ry, tint) {
  const M = kit.M;
  kit.push(x, 0, z, ry);
  kit.push(0, 0, 0, 0); kit.wall(0, 0, 1.75, 3.6, 0, 3.0); kit.pop();
  // 起落架
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    kit.beam(M.steelDark, [sx * 1.2, 0.9, sz * 2.2], [sx * 1.45, 0.05, sz * 2.4], 0.07);
    kit.cyl(M.steelDark, [sx * 1.45, 0.05, sz * 2.4], 0.22, 0.08, { seg: 12 });
  }
  // 机身
  kit.box(tint, [0, 1.7, 0], [2.6, 1.7, 6.2]);
  kit.box(tint, [0, 1.7, -3.05], [2.2, 1.5, 0.5], [0, 0, 0]);
  kit.sph(tint, [0, 1.65, -3.2], 1, { ws: 20, hs: 10, s: [1.15, 0.8, 1.1] });
  kit.box(M.hullWarm, [0, 2.6, 0.4], [2.7, 0.14, 5.4]);
  kit.box(M.stripDark, [0, 0.82, 0], [2.7, 0.06, 6.2]);
  // 舷窗与舱门
  for (const s of [-1, 1]) {
    for (let i = 0; i < 4; i++) kit.box(M.winCool, [s * 1.31, 2.0, -1.9 + i * 0.9], [0.05, 0.4, 0.55]);
    kit.box(M.steelDark, [s * 1.31, 1.35, 1.2], [0.05, 1.3, 1.1]);
    kit.box(M.hazard, [s * 1.33, 0.9, 1.2], [0.03, 0.06, 1.15]);
  }
  kit.box(M.glass, [0, 2.0, -3.75], [1.6, 0.6, 0.06], [0.3, 0, 0]);
  kit.box(M.winCool, [0, 1.98, -3.8], [1.5, 0.5, 0.04], [0.3, 0, 0]);
  // 引擎舱
  for (const s of [-1, 1]) {
    kit.cyl(M.hullWarm, [s * 1.0, 2.9, 2.5], 0.34, 2.6, { seg: 14, rot: [Math.PI / 2, 0, 0] });
    kit.cyl(M.lampBlue, [s * 1.0, 2.9, 3.85], 0.28, 0.05, { seg: 14, rot: [Math.PI / 2, 0, 0] });
    kit.sph(M.lampRed, [s * 1.0, 2.9, 1.2], 0.2, { ws: 10, hs: 6 });
  }
  kit.box(M.hullDark, [0, 1.6, 3.2], [2.2, 1.2, 0.2]);
  for (let i = 0; i < 5; i++) kit.box(M.lampAmber, [-0.8 + i * 0.4, 1.4, 3.32], [0.2, 0.06, 0.03]);
  kit.sph(M.navGreen, [1.4, 2.6, -2.6], 0.08, { ws: 6, hs: 4 });
  kit.sph(M.navRed, [-1.4, 2.6, -2.6], 0.08, { ws: 6, hs: 4 });
  sign(kit, ['GALILEO', 'NCC-1701/7'], [1.33, 1.75, 0.2], Math.PI / 2, [0.9, 0.28], { size: 40 });
  kit.pop();
}

export function buildShuttlebay(ctx) {
  const { kit, M, world } = ctx;
  const rng = makeRng(808);
  kit.push(0, BAY_Y, BZ, 0);

  kit.box(M.plate, [0, -0.04, 0], [HALF_W * 2, 0.08, HALF_L * 2]);
  kit.floorRect(0, 0, HALF_W, HALF_L, 0);
  kit.box(M.ceiling, [0, HH + 0.04, 0], [HALF_W * 2, 0.08, HALF_L * 2]);
  // 地面标线与着陆坪
  for (const [px, pz] of [[-4.2, 4.5], [4.2, 4.5]]) {
    kit.cyl(M.steelDark, [px, 0.02, pz], 4.0, 0.04, { seg: 40 });
    kit.geo(M.stripGold, new THREE.RingGeometry(3.7, 3.85, 48), [px, 0.045, pz], [-Math.PI / 2, 0, 0]);
    kit.geo(M.hazard, new THREE.RingGeometry(3.0, 3.1, 48), [px, 0.046, pz], [-Math.PI / 2, 0, 0]);
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; kit.box(M.lampAmber, [px + Math.sin(a) * 3.9, 0.05, pz + Math.cos(a) * 3.9], [0.16, 0.03, 0.16]); }
  }
  kit.box(M.hazard, [0, 0.01, HALF_L - 2.2], [HALF_W * 2 - 0.4, 0.02, 0.5]);
  for (let z = -12; z < 12; z += 2.5) kit.box(M.stripGold, [0, 0.012, z], [0.14, 0.01, 1.4]);

  // 墙体
  const wo = { mat: M.wallDark, mat2: M.wallDark, trim: M.consoleGold, h: HH, doorH: 2.5 };
  wallSeg(kit, -HALF_W, HALF_L, -HALF_W, -HALF_L, wo);
  wallSeg(kit, HALF_W, -HALF_L, HALF_W, HALF_L, wo);
  wallSeg(kit, -HALF_W, -HALF_L, HALF_W, -HALF_L, { ...wo, doors: [{ t: HALF_W, w: 2.0, type: 'lift', radius: 2.8, accent: 0xd8a830 }] });
  // 电梯轿厢
  {
    const o = { mat: M.wall, mat2: M.plastic, trim: M.consoleGold, h: 3.2 };
    wallSeg(kit, -1.4, -HALF_L - 0.15, -1.4, -HALF_L - 3.0, o);
    wallSeg(kit, -1.4, -HALF_L - 3.0, 1.4, -HALF_L - 3.0, o);
    wallSeg(kit, 1.4, -HALF_L - 3.0, 1.4, -HALF_L - 0.15, o);
    kit.box(M.plate, [0, 0.02, -HALF_L - 1.6], [2.8, 0.03, 2.9]);
    kit.box(M.ceiling, [0, 3.2, -HALF_L - 1.6], [2.8, 0.03, 2.9]);
    kit.box(M.panelWarm, [0, 3.15, -HALF_L - 1.6], [1.4, 0.03, 0.6]);
    kit.light(0, 2.2, -HALF_L - 1.6, 0xfff0d8, 10, 5);
    kit.interact(0, 1.0, -HALF_L - 1.4, 2.3, '涡轮电梯 · 选择目的地', () => ctx.ui.openLift('shuttlebay'));
    kit.interact(0, 1.0, -HALF_L + 1.3, 2.0, '呼叫涡轮电梯', () => ctx.ui.openLift('shuttlebay'));
  }
  // 后端：机库大门框（船体外壳已有开口，这里补内侧门框、边墙）
  for (const s of [-1, 1]) kit.box(M.steelDark, [s * (HALF_W - 0.4), HH / 2, HALF_L - 0.2], [0.8, HH, 0.5]);
  kit.box(M.steelDark, [0, HH - 0.3, HALF_L - 0.2], [HALF_W * 2, 0.6, 0.5]);
  kit.wall(0, HALF_L + 0.1, HALF_W, 0.1, -1, HH);

  // 穿梭机
  shuttle(kit, -4.2, 4.5, 0.15, M.hullWarm);
  shuttle(kit, 4.2, 4.5, -0.1, M.hullBlue);
  kit.interact(-4.2, 1.2, 4.5 - 4.8, 3.0, '伽利略号穿梭机', () => ctx.ui.toast('伽利略号 · 7 号穿梭机 · 运载 7 人 · 航程 12 光年'));

  // 前部控制塔（玻璃 + 平台，可由楼梯到达）
  kit.push(0, 0, -HALF_L, 0);
  const tz = 3.2, ty = 3.2;
  kit.box(M.steelDark, [0, ty - 0.1, tz], [10.4, 0.2, 4.4]);
  kit.geo(M.grate, new THREE.PlaneGeometry(10.2, 4.2), [0, ty + 0.005, tz], [-Math.PI / 2, 0, 0]);
  kit.floorRect(0, tz, 5.1, 2.1, ty);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) kit.cyl(M.steelDark, [sx * 5, ty / 2, tz + sz * 2.0], 0.14, ty, { seg: 10 });
  kit.box(M.glass, [0.9, ty + 1.2, tz + 2.1], [8.4, 2.0, 0.03]);
  railing(kit, -3.3, tz + 2.1, 5.1, tz + 2.1, ty, { post: 2.5 });
  railing(kit, -5.1, tz - 2.1, -5.1, tz + 2.1, ty, { post: 2 });
  railing(kit, 5.1, tz - 2.1, 5.1, tz + 2.1, ty, { post: 2 });
  kit.pop();
  // 塔台顶面上的控制台需要抬高：再次放置在塔台上
  kit.push(0, 3.2, -HALF_L + 3.2, 0);
  for (let i = 0; i < 3; i++) consoleUnit(kit, { x: -3 + i * 3, z: -0.9, rot: 0, w: 2.2, d: 0.8, screens: 2, seed: 75 + i, top: M.consoleGold, height: 0.9 });
  chair(kit, -3, 0.2, Math.PI, M.chairOrange, 'arm'); chair(kit, 3, 0.2, Math.PI, M.chairOrange, 'arm');
  kit.pop();
  stairs(kit, { x: -4.2, z: -HALF_L + 8.2, ry: Math.PI, w: 1.4, steps: 12, rise: 3.2 / 12, run: 0.3 });
  wallScreen(kit, 'ship', 71, 0, 6.5, -HALF_L + 0.17, 0, 5.5, 2.4);
  sign(kit, ['穿梭机库', 'SHUTTLE BAY 1'], [0, 8.4, -HALF_L + 0.18], 0, [2.8, 0.8], { size: 60 });

  // 侧墙设备：工具车、燃料罐、板条箱、机械臂导轨
  for (const s of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const z = -6 + i * 5;
      if (i % 2 === 0) {
        kit.cyl(M.pipeYellow, [s * 9.6, 1.0, z], 0.8, 2.0, { seg: 20 });
        kit.sph(M.pipeYellow, [s * 9.6, 2.0, z], 0.8, { ws: 16, hs: 8, s: [1, 0.5, 1] });
        kit.cyl(M.steelDark, [s * 9.6, 0.1, z], 0.9, 0.2, { seg: 20 });
        kit.push(0, 0, 0, 0); kit.wall(s * 9.6, z, 0.9, 0.9, 0, 2.5); kit.pop();
        kit.box(M.hazard, [s * 9.6, 1.4, z], [1.62, 0.15, 1.62], null);
      } else {
        for (let k = 0; k < 3; k++) kit.solid(rng.pick([M.hullDark, M.consoleGold, M.plasticGrey]), [s * 9.9, 0.45 + (k % 2) * 0.9, z + (k - 1) * 0.95], [1.4, 0.85, 0.9]);
      }
      kit.box(M.panelWarm, [s * (HALF_W - 0.2), 6.5, z], [0.04, 0.4, 2.6]);
    }
    for (let z = -10; z <= 10; z += 5) {
      kit.box(M.steelDark, [s * (HALF_W - 0.35), 4, z], [0.3, 8, 0.3]);
      pipe(kit, [s * (HALF_W - 0.5), 8.5, z], [s * (HALF_W - 0.5), 8.5, z + 5], 0.1, M.pipeBlue);
    }
    // 起重机轨道
    kit.box(M.hazard, [s * 8.5, HH - 0.8, 0], [0.4, 0.4, HALF_L * 2 - 1]);
  }
  kit.box(M.hazard, [0, HH - 1.0, 4], [HALF_W * 2 - 1, 0.5, 0.6]);
  kit.cyl(M.steelDark, [-2, HH - 1.5, 4], 0.5, 1.0, { seg: 12 });
  kit.beam(M.steel, [-2, HH - 2.0, 4], [-2, 5.2, 4], 0.03);
  kit.box(M.hazard, [-2, 5.0, 4], [0.4, 0.3, 0.4]);
  // 顶灯
  for (let z = -12; z <= 12; z += 4) for (const x of [-6, 0, 6]) { ceilLight(kit, x, z, 2.4, 0.6, HH, M.panel); if (z % 8 === 0) kit.light(x, HH - 2.0, z, 0xfff0e0, 18, 14); }
  kit.light(0, 5, 8, 0xd8e8ff, 16, 16);
  for (const x of [-6, 0, 6]) for (let z = -12; z <= 12; z += 6) kit.light(x, 7.5, z, 0xf0f4ff, 40, 15);
  kit.zone('穿梭机库', '副船体', 0, 0, HALF_W, HALF_L + 3.4, -2, HH + 0.4);
  const p = kit.toWorld(0, 0, 1);
  world.spawns.shuttlebay = { x: p.x, y: BAY_Y, z: p.z, yaw: Math.PI };
  const q = kit.toWorld(0, 0, HALF_L - 4.5);
  world.spawns.bayEntry = { x: q.x, y: BAY_Y, z: q.z, yaw: 0 };
  kit.pop();
}
