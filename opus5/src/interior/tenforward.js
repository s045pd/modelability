import * as THREE from 'three';
import { materials } from '../materials/library.js';
import { RoomBuilder, box, plane, chair, lcarsWall } from './common.js';
import { makeRng, mix } from '../lib/geom.js';

const W = 34;      // 半宽
const D0 = 0;      // 尾侧墙（局部 z）
const H = 4.8;
const SAUCER_CZ = 118;

/** 前窗墙沿碟部轮廓的弧线（局部坐标，锚点 z = world 264）。 */
function frontZ(x, originZ) {
  const rn = 0.905;
  const dx = x / 232;
  const dz = 207 * Math.sqrt(Math.max(0, rn * rn - dx * dx));
  return (SAUCER_CZ + dz) - originZ;
}

export function buildTenForward(ctx, origin) {
  const m = materials();
  const rb = new RoomBuilder(ctx, origin, 'tenforward');
  const rng = makeRng(777);
  const zf = (x) => frontZ(x, origin.z);
  const zFrontMax = zf(0);

  // —— 地板 / 天花板：按弧形前缘裁切的多边形
  const shape = new THREE.Shape();
  shape.moveTo(-W, D0);
  shape.lineTo(W, D0);
  const N = 40;
  for (let i = 0; i <= N; i++) {
    const x = mix(W, -W, i / N);
    shape.lineTo(x, zf(x));
  }
  shape.lineTo(-W, D0);
  const slab = new THREE.ShapeGeometry(shape, 12);
  slab.rotateX(Math.PI / 2);

  const floor = new THREE.Mesh(slab.clone(), m.carpetWarm);
  rb.add(floor);
  const ceil = new THREE.Mesh(slab.clone(), m.ceiling);
  ceil.position.y = H;
  rb.add(ceil);

  // 走廊入口所在的尾墙
  const doorHalf = 1.35;
  rb.add(box(W - doorHalf, H, 0.24, -(W + doorHalf) / 2, H / 2, D0, m.bulkheadWarm));
  rb.add(box(W - doorHalf, H, 0.24, (W + doorHalf) / 2, H / 2, D0, m.bulkheadWarm));
  rb.add(box(doorHalf * 2, H - 2.4, 0.24, 0, H - (H - 2.4) / 2, D0, m.bulkheadWarm));
  rb.door({ x: 0, y: 0, z: D0 + 0.02, rotY: 0, width: 1.7, height: 2.4, tag: 'tenforward' });

  // —— 侧墙
  for (const sx of [-1, 1]) {
    const zEnd = zf(sx * W);
    rb.add(box(0.22, H, zEnd - D0, sx * W, H / 2, (D0 + zEnd) / 2, m.bulkheadWarm));
  }

  // —— 前窗墙：弧形窗框 + 中挺，窗洞直接通向星空
  const segs = 26;
  const sillH = 0.95;
  const headH = H - 0.85;
  for (let i = 0; i < segs; i++) {
    const x0 = mix(-W, W, i / segs);
    const x1 = mix(-W, W, (i + 1) / segs);
    const zm = (zf(x0) + zf(x1)) / 2;
    const wSeg = x1 - x0;
    const ang = Math.atan2(zf(x1) - zf(x0), wSeg);
    // 窗台
    rb.add(box(wSeg + 0.06, sillH, 0.5, (x0 + x1) / 2, sillH / 2, zm, m.bulkheadWarm, -ang));
    // 窗楣
    rb.add(box(wSeg + 0.06, H - headH, 0.5, (x0 + x1) / 2, (headH + H) / 2, zm, m.bulkheadWarm, -ang));
    // 中挺
    rb.add(box(0.2, headH - sillH, 0.34, x0, (sillH + headH) / 2, zf(x0), m.trimWarm, -ang));
    // 窗台灯槽
    rb.add(plane(wSeg, 0.3, (x0 + x1) / 2, sillH + 0.02, zm - 0.24, m.lightPanel, [-Math.PI / 2, 0, -ang]));
  }
  rb.add(box(0.2, headH - sillH, 0.34, W, (sillH + headH) / 2, zf(W), m.trimWarm));

  // —— 吧台：沿尾墙左舷布置，房间主体朝前窗敞开
  const barZ = 4.1;
  const barPts = [];
  for (let i = 0; i <= 24; i++) {
    const x = mix(-28, -6, i / 24);
    barPts.push([x, barZ + (x + 17) * 0.02]);
  }
  const barCurve = new THREE.CatmullRomCurve3(barPts.map(([x, z]) => new THREE.Vector3(x, 1.06, z)));
  const barTop = new THREE.Mesh(new THREE.TubeGeometry(barCurve, 60, 0.42, 4, false), m.trimWarm);
  barTop.scale.y = 0.22;
  rb.add(barTop);
  for (let i = 0; i <= 24; i++) {
    const [x, z] = barPts[i];
    if (i % 2 === 0) rb.add(box(0.42, 1.04, 0.66, x, 0.52, z, m.consoleBody));
    if (i % 3 === 0) {
      rb.add(box(0.42, 0.1, 0.42, x, 0.72, z + 1.25, m.trimWarm)); // 吧凳
      rb.add(box(0.1, 0.72, 0.1, x, 0.36, z + 1.25, m.consoleBody));
    }
  }
  rb.block(-28.8, barZ - 0.6, -5.2, barZ + 0.6, 0, 1.2);
  // 酒柜背板（贴尾墙，不阻断视线）
  rb.add(box(24, 2.5, 0.3, -17, 1.25, barZ - 2.4, m.bulkheadWarm));
  for (let i = 0; i < 7; i++) {
    rb.add(lcarsWall(-26 + i * 3.1, 1.65, barZ - 2.22, 1.4, 0.6, 0, 600 + i, 0.8));
  }
  rb.block(-29.2, barZ - 2.6, -4.8, barZ - 2.2, 0, 2.5);

  // —— 餐桌与座椅
  for (let i = 0; i < 14; i++) {
    const x = (rng() - 0.5) * 2 * (W - 7);
    const zMax = zf(x) - 3.4;
    const z = mix(barZ + 5.0, zMax, rng());
    if (z > zMax || z < barZ + 4.5) continue;
    const r = 0.62 + rng() * 0.2;
    const top = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.09, 24), m.trimWarm);
    top.position.set(x, 0.78, z);
    rb.add(top);
    rb.add(box(0.18, 0.74, 0.18, x, 0.37, z, m.consoleBody));
    const seats = 2 + Math.floor(rng() * 3);
    for (let k = 0; k < seats; k++) {
      const a = (k / seats) * Math.PI * 2 + rng();
      rb.add(chair(x + Math.cos(a) * (r + 0.55), 0, z + Math.sin(a) * (r + 0.55), -a + Math.PI / 2, 0.82));
    }
    rb.block(x - r - 0.2, z - r - 0.2, x + r + 0.2, z + r + 0.2, 0, 0.9);
  }

  // —— 照明：窗边冷光 + 舱内暖光
  for (let i = 0; i < 7; i++) {
    const x = mix(-W + 6, W - 6, i / 6);
    rb.light(x, H - 0.7, zf(x) - 3.0, 0xbcd4ff, 34, 28);
  }
  for (let i = 0; i < 5; i++) {
    const x = mix(-22, 22, i / 4);
    rb.strip(x, H - 0.06, barZ + 12, 6.0, 2.4, { color: 0xffd9a8, intensity: 44, distance: 28, mat: m.lightPanel });
  }
  rb.light(-17, 2.4, barZ - 1.2, 0xffc98a, 24, 20);

  // —— 天花板结构梁
  for (let i = 1; i < 8; i++) {
    const x = mix(-W, W, i / 8);
    const zEnd = zf(x);
    rb.add(box(0.28, 0.24, zEnd - D0 - 0.4, x, H - 0.14, (D0 + zEnd) / 2, m.trimWarm));
  }

  // —— 行走区域：按弧形前缘分条注册
  for (let i = 0; i < 24; i++) {
    const x0 = mix(-W, W, i / 24);
    const x1 = mix(-W, W, (i + 1) / 24);
    const zEnd = Math.min(zf(x0), zf(x1)) - 0.9;
    rb.rect(x0, D0 + 0.3, x1, zEnd, 0, 'tenforward');
  }

  rb.hotspot('turbolift-tenforward', 3.2, 1.5, 1.2, '涡轮电梯 · 选择目的地', 'turbolift');
  rb.spawn('tenforward', 8, 0, 6.5, Math.PI);
  return rb.group;
}
