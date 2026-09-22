import * as THREE from 'three';
import { materials, warpCoreMaterial } from '../materials/library.js';
import {
  RoomBuilder, box, plane, lcarsWall, standingConsole, railing, roomShell,
} from './common.js';
import { makeRng, mix } from '../lib/geom.js';

const HX = 18;     // 半宽
const Z0 = -22;
const Z1 = 22;
const H = 8.8;     // 两层通高
const UPPER = 4.4;
const CORE_Z = -15;

/** 曲速核心：贯穿多层甲板的等离子柱。 */
function warpCore(rb, m) {
  const g = new THREE.Group();
  const coreMat = warpCoreMaterial({ tint: new THREE.Color(0.42, 0.72, 1.0), flow: 1.8 });

  const inner = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.45, 30, 44, 1, true), coreMat);
  inner.position.y = 6;
  g.add(inner);
  const outer = new THREE.Mesh(new THREE.CylinderGeometry(2.05, 2.05, 30, 48, 1, true), m.plasmaGlass);
  outer.position.y = 6;
  g.add(outer);

  // 分段环与磁约束线圈
  for (let y = -8; y <= 21; y += 1.45) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.16, 0.13, 8, 40), m.trimCool);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    g.add(ring);
  }
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    const strut = box(0.18, 30, 0.18, Math.cos(a) * 2.3, 6, Math.sin(a) * 2.3, m.consoleBody);
    g.add(strut);
  }

  // 反应室上下端（注入器）
  for (const y of [-8.6, 21.6]) {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 2.2, 1.6, 36), m.darkMetal);
    cap.position.y = y;
    g.add(cap);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(1.1, 24, 16), m.lcarsBlue);
    glow.position.y = y + (y < 0 ? 0.8 : -0.8);
    g.add(glow);
  }

  g.position.set(0, 0, CORE_Z);
  rb.add(g);
  rb.block(-2.5, CORE_Z - 2.5, 2.5, CORE_Z + 2.5, -20, 30);

  const l1 = rb.light(0, 2.2, CORE_Z, 0x6fb4ff, 110, 46);
  const l2 = rb.light(0, UPPER + 2.0, CORE_Z, 0x6fb4ff, 75, 40);
  rb.ctx.pulses.push({ light: l1, base: l1.intensity }, { light: l2, base: l2.intensity });

  // 水平注入管（向舰尾穿墙）
  const horiz = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 12, 28, 1, true), coreMat);
  horiz.rotation.x = Math.PI / 2;
  horiz.position.set(0, -6.2, CORE_Z - 6);
  rb.add(horiz);
  const horizShell = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 12, 30, 1, true), m.plasmaGlass);
  horizShell.rotation.x = Math.PI / 2;
  horizShell.position.set(0, -6.2, CORE_Z - 6);
  rb.add(horizShell);
}

export function buildEngineering(ctx, origin) {
  const m = materials();
  const rb = new RoomBuilder(ctx, origin, 'engineering');
  const rng = makeRng(404);

  // —— 主体外壳
  roomShell(rb, {
    x0: -HX, z0: Z0, x1: HX, z1: Z1, y: 0, h: H, thickness: 0.3,
    floorMat: m.grating, ceilMat: m.ceiling, wallMat: m.bulkhead,
    openings: {
      north: [{ from: -1.4, to: 1.4, bottom: 0, top: 2.4 }],
    },
  });
  rb.door({ x: 0, y: 0, z: Z1 - 0.05, rotY: Math.PI, width: 1.9, height: 2.42, tag: 'engineering' });

  // 核心井（地板与天花板开口）
  const wellRing = new THREE.Mesh(new THREE.RingGeometry(2.5, 3.9, 48), m.darkMetal);
  wellRing.rotation.x = -Math.PI / 2;
  wellRing.position.set(0, 0.03, CORE_Z);
  rb.add(wellRing);
  rb.add(railing(
    Array.from({ length: 13 }, (_, i) => {
      const a = (i / 12) * Math.PI * 2;
      return [Math.cos(a) * 3.4, CORE_Z + Math.sin(a) * 3.4];
    }), 0, 1.05,
  ));

  warpCore(rb, m);

  // —— 上层走道
  const deckMat = m.grating;
  const decks = [
    [-HX + 0.3, Z0 + 0.3, -HX + 5.4, Z1 - 0.3],
    [HX - 5.4, Z0 + 0.3, HX - 0.3, Z1 - 0.3],
    [-HX + 5.4, Z0 + 0.3, HX - 5.4, Z0 + 5.0],
  ];
  for (const [ax, az, bx, bz] of decks) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(bx - ax, bz - az), deckMat);
    p.rotation.x = -Math.PI / 2;
    p.position.set((ax + bx) / 2, UPPER, (az + bz) / 2);
    rb.add(p);
    const under = new THREE.Mesh(new THREE.BoxGeometry(bx - ax, 0.3, bz - az), m.consoleBody);
    under.position.set((ax + bx) / 2, UPPER - 0.17, (az + bz) / 2);
    rb.add(under);
    rb.rect(ax, az, bx, bz, UPPER, 'eng-upper');
  }
  // 上层围栏
  rb.add(railing([[-HX + 5.4, Z0 + 5.0], [-HX + 5.4, Z1 - 0.4]], UPPER, 1.05));
  rb.add(railing([[HX - 5.4, Z0 + 5.0], [HX - 5.4, Z1 - 0.4]], UPPER, 1.05));
  rb.add(railing([[-HX + 5.4, Z0 + 5.0], [HX - 5.4, Z0 + 5.0]], UPPER, 1.05));

  // —— 楼梯（右舷）
  const stepN = 20;
  for (let i = 0; i < stepN; i++) {
    const y = (i + 1) * (UPPER / stepN);
    const z = 6 + i * 0.34;
    rb.add(box(3.0, 0.16, 0.36, HX - 7.2, y - 0.08, z, m.grating));
    rb.add(box(3.0, y, 0.06, HX - 7.2, y / 2, z + 0.18, m.consoleBody));
  }
  rb.ramp(HX - 8.7, 5.9, HX - 5.7, 6 + stepN * 0.34, 0, UPPER, 'z', 'eng-stairs');
  rb.add(railing([[HX - 5.6, 6.0], [HX - 5.6, 6 + stepN * 0.34]], 0, 1.05));

  // —— 主系统显示台（"台球桌"）
  const table = new THREE.Group();
  const tTop = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.12, 2.0), m.consoleBody);
  tTop.position.y = 1.02;
  table.add(tTop);
  const tScreen = plane(3.2, 1.84, 0, 1.09, 0, m.lcarsLit(880, 1024, 560, 1.6), [-Math.PI / 2, 0, 0]);
  table.add(tScreen);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    table.add(box(0.22, 0.98, 0.22, sx * 1.4, 0.49, sz * 0.78, m.consoleBody));
  }
  table.position.set(0, 0, 6.5);
  rb.add(table);
  rb.block(-1.9, 5.3, 1.9, 7.7, 0, 1.2);

  // —— 侧墙控制台阵列
  for (let i = 0; i < 6; i++) {
    const z = mix(Z0 + 4, Z1 - 4, i / 5);
    for (const sx of [-1, 1]) {
      rb.add(standingConsole(sx * (HX - 1.1), 0, z, 2.2, sx > 0 ? -Math.PI / 2 : Math.PI / 2, 700 + i * 2 + (sx > 0 ? 1 : 0)));
      rb.block(sx * (HX - 1.6), z - 1.1, sx * (HX - 0.2), z + 1.1, 0, 1.3);
      rb.add(lcarsWall(sx * (HX - 0.18), 2.1, z, 2.3, 1.3, sx > 0 ? -Math.PI / 2 : Math.PI / 2, 720 + i * 2 + (sx > 0 ? 1 : 0), 1.4));
      rb.add(lcarsWall(sx * (HX - 0.18), UPPER + 1.9, z, 2.3, 1.3, sx > 0 ? -Math.PI / 2 : Math.PI / 2, 740 + i * 2 + (sx > 0 ? 1 : 0), 1.2));
    }
  }

  // —— 尾墙：等离子导管与大屏
  rb.add(lcarsWall(0, UPPER + 2.2, Z0 + 0.2, 7.5, 3.0, 0, 760, 1.8));
  for (let i = 0; i < 8; i++) {
    const x = mix(-14, 14, i / 7);
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, H - 0.4, 12), m.trimCool);
    tube.position.set(x, H / 2, Z0 + 0.5);
    rb.add(tube);
  }

  // —— 照明
  for (let i = 0; i < 4; i++) {
    const z = mix(Z0 + 5, Z1 - 5, i / 3);
    rb.strip(0, H - 0.08, z, 9, 2.6, { color: 0xdfe8ff, intensity: 80, distance: 42, mat: m.lightPanelBright });
  }
  for (const sx of [-1, 1]) {
    rb.light(sx * 12, UPPER + 2.4, 8, 0xbcd0ff, 48, 32);
    rb.light(sx * 12, 2.4, -6, 0xffd7a8, 36, 26);
  }

  rb.hotspot('turbolift-eng', 1.9, 1.5, Z1 - 0.6, '涡轮电梯 · 选择目的地', 'turbolift');
  rb.spawn('engineering', 0, 0, 15.5, 0);
  return rb.group;
}
