import * as THREE from 'three';
import { materials } from '../materials/library.js';
import { RoomBuilder, box, plane, lcarsWall, roomShell } from './common.js';
import { mix, makeRng } from '../lib/geom.js';

const HX = 16;
const Z_DOOR = -25;
const Z_FWD = 22;
const H = 22;

/** 6 型穿梭机。 */
function shuttle(m, scale = 1) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(3.0, 2.15, 6.4), m.doorLeaf);
  body.position.y = 1.5;
  g.add(body);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.7, 1.0), m.doorLeaf);
  nose.position.set(0, 1.5, 3.5);
  g.add(nose);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.3, 5.6), m.trimCool);
  roof.position.set(0, 2.66, -0.2);
  g.add(roof);
  // 前风挡与侧窗
  g.add(plane(2.0, 0.72, 0, 1.95, 4.02, m.windowDim, [0, 0, 0]));
  for (const sx of [-1, 1]) {
    g.add(plane(2.6, 0.5, sx * 1.51, 2.0, 1.2, m.windowDim, [0, sx * Math.PI / 2, 0]));
    // 短舱
    const nac = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.75, 4.2), m.hullDark);
    nac.position.set(sx * 1.85, 1.1, -0.6);
    g.add(nac);
    const grille = plane(3.4, 0.4, sx * 2.24, 1.1, -0.6, m.lightBlue, [0, sx * Math.PI / 2, 0]);
    g.add(grille);
  }
  // 尾门与着陆架
  g.add(box(2.4, 1.7, 0.12, 0, 1.35, -3.24, m.trimCool));
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    g.add(box(0.2, 0.46, 0.2, sx * 1.1, 0.23, sz * 2.2, m.consoleBody));
  }
  g.scale.setScalar(scale);
  return g;
}

export function buildShuttlebay(ctx, origin) {
  const m = materials();
  const rb = new RoomBuilder(ctx, origin, 'shuttlebay');
  const rng = makeRng(919);

  roomShell(rb, {
    x0: -HX, z0: Z_DOOR, x1: HX, z1: Z_FWD, y: 0, h: H, thickness: 0.4,
    floorMat: m.grating, ceilMat: m.ceiling, wallMat: m.bulkhead,
    openings: {
      south: [{ from: -18, to: 18, bottom: 0.6, top: 20.6 }],
      north: [{ from: -1.5, to: 1.5, bottom: 0, top: 2.4 }],
    },
  });
  rb.door({ x: 0, y: 0, z: Z_FWD - 0.08, rotY: Math.PI, width: 2.0, height: 2.42, tag: 'shuttlebay' });

  // —— 舱门力场（朝向星空）
  const frame = [
    [0, 0.35, Z_DOOR + 0.3, 36, 0.6, 0.8],
    [0, 20.9, Z_DOOR + 0.3, 36, 0.6, 0.8],
    [-18, 10.6, Z_DOOR + 0.3, 0.7, 20.6, 0.8],
    [18, 10.6, Z_DOOR + 0.3, 0.7, 20.6, 0.8],
  ];
  for (const [x, y, z, w, h, d] of frame) rb.add(box(w, h, d, x, y, z, m.trimCool));

  // —— 甲板标线与引导灯
  for (let i = 0; i < 11; i++) {
    const z = mix(Z_DOOR + 2, Z_FWD - 2, i / 10);
    for (const sx of [-1, 1]) {
      rb.add(plane(0.5, 1.6, sx * 12, 0.02, z, m.lcarsAmber, [-Math.PI / 2, 0, 0]));
    }
  }
  rb.add(plane(9, 0.35, 0, 0.02, Z_DOOR + 8, m.lcarsAmber, [-Math.PI / 2, 0, 0]));
  rb.add(plane(0.35, 24, 0, 0.02, Z_DOOR + 20, m.lcarsAmber, [-Math.PI / 2, 0, 0]));

  // —— 停放的穿梭机
  const parks = [[-8.5, 6, 0.1], [8.5, 6, -0.1], [-8.5, -6, Math.PI * 0.02], [9.0, -12, 0.26]];
  for (const [x, z, rot] of parks) {
    const s = shuttle(m);
    s.position.set(x, 0, z);
    s.rotation.y = rot;
    rb.add(s);
    rb.block(x - 2.4, z - 3.6, x + 2.4, z + 3.8, 0, 3.0);
  }

  // —— 侧壁观察窗与控制室
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const z = mix(Z_DOOR + 6, Z_FWD - 6, i / 3);
      rb.add(plane(6.0, 2.2, sx * (HX - 0.12), 8.6, z, m.windowDim, [0, sx > 0 ? -Math.PI / 2 : Math.PI / 2, 0]));
      rb.add(box(0.2, 0.3, 6.4, sx * (HX - 0.2), 7.4, z, m.trimCool));
    }
    // 下层设备与工作台
    for (let i = 0; i < 5; i++) {
      const z = mix(Z_DOOR + 4, Z_FWD - 4, i / 4);
      rb.add(box(1.2, 2.2, 2.4, sx * (HX - 0.8), 1.1, z, m.consoleBody));
      rb.add(lcarsWall(sx * (HX - 1.45), 1.7, z, 1.8, 1.0, sx > 0 ? -Math.PI / 2 : Math.PI / 2, 820 + i * 2, 1.2));
      rb.block(sx * (HX - 1.5), z - 1.3, sx * (HX - 0.2), z + 1.3, 0, 2.3);
    }
  }

  // —— 顶部桁架与灯阵
  for (let i = 0; i < 9; i++) {
    const z = mix(Z_DOOR + 2, Z_FWD - 2, i / 8);
    rb.add(box(HX * 2 - 0.6, 0.35, 0.5, 0, H - 0.4, z, m.trimCool));
    if (i % 2 === 0) {
      rb.strip(0, H - 0.7, z, 12, 1.3, { color: 0xeaf1ff, intensity: 170, distance: 58, mat: m.lightPanelBright });
    }
  }
  for (const sx of [-1, 1]) rb.light(sx * 10, 6, 0, 0xbfd2ff, 65, 42);
  rb.light(0, 9, Z_DOOR + 4, 0x7fb0ff, 80, 44);

  // —— 牵引发射控制台
  rb.add(box(4.0, 1.1, 1.2, 0, 0.55, Z_FWD - 3.2, m.consoleBody));
  rb.add(plane(3.8, 1.0, 0, 1.18, Z_FWD - 3.55, m.lcarsLit(860, 768, 220, 1.4), [-0.95, 0, 0]));
  rb.block(-2.1, Z_FWD - 4.0, 2.1, Z_FWD - 2.5, 0, 1.2);

  rb.hotspot('turbolift-bay', 0, 1.5, Z_FWD - 0.8, '涡轮电梯 · 选择目的地', 'turbolift');
  rb.spawn('shuttlebay', 0, 0, Z_FWD - 6.5, 0);
  return rb.group;
}
