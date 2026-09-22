import * as THREE from 'three';
import { materials } from '../materials/library.js';
import {
  RoomBuilder, roomShell, straightCorridor, box, lcarsWall, standingConsole,
} from './common.js';

const FLOOR = 0;          // 相对锚点
const CORR_H = 2.62;
const HALF = 1.32;

/**
 * 碟部 10 号甲板走廊网络：十字枢纽 + 四条辐射走廊 + 涡轮电梯厅。
 * 锚点位于枢纽中心。
 */
export function buildCorridors(ctx, origin) {
  const m = materials();
  const rb = new RoomBuilder(ctx, origin, 'corridors');
  const door = (x, z, rotY, tag) => rb.door({ x, y: FLOOR, z, rotY, width: 1.62, height: 2.32, tag });

  // —— 中央枢纽
  const HX = 2.35;
  const HZ = 2.35;
  roomShell(rb, {
    x0: -HX, z0: -HZ, x1: HX, z1: HZ, y: FLOOR, h: 2.95, thickness: 0.2,
    wallMat: m.bulkhead, floorMat: m.carpet, ceilMat: m.ceiling,
    openings: {
      north: [{ from: -HALF, to: HALF, bottom: FLOOR, top: FLOOR + 2.34 }],
      south: [{ from: -HALF, to: HALF, bottom: FLOOR, top: FLOOR + 2.34 }],
      east: [{ from: -HALF, to: HALF, bottom: FLOOR, top: FLOOR + 2.34 }],
      west: [{ from: -HALF, to: HALF, bottom: FLOOR, top: FLOOR + 2.34 }],
    },
  });
  rb.strip(0, FLOOR + 2.92, 0, 3.4, 3.4, { color: 0xffeed2, intensity: 12, distance: 14, mat: m.lightPanel });
  // 枢纽四角的斜切柱与甲板标识
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    rb.add(box(0.55, 2.95, 0.55, sx * (HX - 0.28), FLOOR + 1.475, sz * (HZ - 0.28), m.trimWarm, Math.PI / 4));
  }
  rb.add(lcarsWall(HX - 0.12, FLOOR + 1.62, -HZ + 0.9, 1.0, 0.72, -Math.PI / 2, 501, 1.2));
  rb.add(lcarsWall(-HX + 0.12, FLOOR + 1.62, HZ - 0.9, 1.0, 0.72, Math.PI / 2, 502, 1.2));

  // —— 四条走廊
  straightCorridor(rb, {
    axis: 'z', at: 0, from: HZ, to: 64, y: FLOOR, halfW: HALF, h: CORR_H, seed: 11,
    sideDoors: [
      { at: 12, side: 1, tag: 'quarters-a' },
      { at: 26, side: -1, tag: 'quarters-b' },
      { at: 40, side: 1, tag: 'science-lab' },
    ],
  });
  straightCorridor(rb, {
    axis: 'z', at: 0, from: -54, to: -HZ, y: FLOOR, halfW: HALF, h: CORR_H, seed: 12,
    sideDoors: [
      { at: -14, side: -1, tag: 'quarters-c' },
      { at: -30, side: 1, tag: 'sickbay' },
    ],
  });
  straightCorridor(rb, {
    axis: 'x', at: 0, from: HX, to: 22, y: FLOOR, halfW: HALF, h: CORR_H, seed: 13,
    sideDoors: [
      { at: 8, side: 1, tag: 'quarters-d' },
      { at: 8, side: -1, tag: 'quarters-e' },
      { at: 15, side: 1, tag: 'quarters-f' },
    ],
  });
  straightCorridor(rb, {
    axis: 'x', at: 0, from: -22, to: -HX, y: FLOOR, halfW: HALF, h: CORR_H, seed: 14,
    sideDoors: [{ at: -10, side: -1, tag: 'cargo' }],
  });

  // —— 东侧走廊尽头：舰员活动区
  roomShell(rb, {
    x0: 22, z0: -5.4, x1: 32, z1: 5.4, y: FLOOR, h: 2.95,
    wallMat: m.bulkheadWarm, floorMat: m.carpetWarm,
    openings: { west: [{ from: -HALF, to: HALF, bottom: FLOOR, top: FLOOR + 2.34 }] },
  });
  rb.strip(27, FLOOR + 2.92, 0, 5.6, 5.6, { color: 0xffe2bb, intensity: 15, distance: 16, mat: m.lightPanel });
  rb.add(standingConsole(31.4, FLOOR, 3.0, 2.0, -Math.PI / 2, 77));
  rb.block(30.7, 2.1, 32, 3.9, FLOOR, FLOOR + 1.3);
  for (let i = 0; i < 3; i++) {
    rb.add(lcarsWall(31.88, FLOOR + 1.7, -3.4 + i * 1.6, 1.3, 0.85, -Math.PI / 2, 520 + i, 1.1));
  }
  door(22, 0, Math.PI / 2, 'lounge-east');

  // —— 涡轮电梯厅（南走廊尽头）
  roomShell(rb, {
    x0: -3.0, z0: -62, x1: 3.0, z1: -54, y: FLOOR, h: 2.95,
    wallMat: m.bulkheadWarm, floorMat: m.carpet,
    openings: { north: [{ from: -HALF, to: HALF, bottom: FLOOR, top: FLOOR + 2.34 }] },
  });
  rb.strip(0, FLOOR + 2.92, -58, 3.2, 5.4, { color: 0xffe9cc, intensity: 11, distance: 13, mat: m.lightPanel });
  for (const sx of [-1, 1]) {
    door(sx * 1.55, -61.9, Math.PI, `turbolift-deck10-${sx}`);
    rb.add(lcarsWall(sx * 2.88, FLOOR + 1.6, -58.5, 1.2, 0.8, sx > 0 ? -Math.PI / 2 : Math.PI / 2, 540 + sx, 1.3));
  }
  rb.hotspot('turbolift-deck10', 0, FLOOR + 1.5, -61.2, '涡轮电梯 · 选择目的地', 'turbolift');
  door(0, -54, 0, 'turbolift-hall');

  rb.spawn('corridor', 0, FLOOR, -8, 0);
  return rb.group;
}
