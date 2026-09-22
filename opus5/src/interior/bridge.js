import * as THREE from 'three';
import { materials, viewscreenMaterial } from '../materials/library.js';
import {
  RoomBuilder, arcWall, box, plane, chair, standingConsole, railing, lcarsWall,
} from './common.js';
import { makeRng } from '../lib/geom.js';

const R = 9.45;          // 舱壁内半径
const WELL_R = 4.9;      // 指挥区下沉半径
const WELL_Y = -0.42;
const WALL_H = 3.3;
const D = Math.PI / 180;

/** 方位角 → 坐标：0° 舰首(+Z)，90° 右舷(+X) */
const at = (deg, r) => [Math.sin(deg * D) * r, Math.cos(deg * D) * r];

/** 曲面控制台（战术台/后部站位）。 */
function arcConsole(r, a0deg, spanDeg, seed, { height = 1.12, tilt = 0.55 } = {}) {
  const m = materials();
  const g = new THREE.Group();
  const a0 = a0deg * D;
  const span = spanDeg * D;
  // three 的 Cylinder thetaStart 从 +Z 开始并朝 +X 增加，与方位角一致
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(r, r + 0.12, height, 40, 1, true, a0, span),
    m.consoleBody,
  );
  body.position.y = height / 2;
  g.add(body);

  const top = new THREE.Mesh(
    new THREE.RingGeometry(r - 0.02, r + 0.46, 40, 1, a0, span),
    m.consoleBody,
  );
  top.rotation.x = -Math.PI / 2;
  top.position.y = height;
  g.add(top);

  const face = new THREE.Mesh(
    new THREE.CylinderGeometry(r - 0.02, r - 0.30, 0.56, 40, 1, true, a0, span),
    m.lcarsLit(seed, 1024, 200, 1.5),
  );
  face.position.y = height + 0.26;
  g.add(face);

  const lip = new THREE.Mesh(
    new THREE.TorusGeometry(r + 0.44, 0.045, 8, 48, span),
    m.trimWarm,
  );
  lip.rotation.x = Math.PI / 2;
  lip.rotation.z = -a0 - span;
  lip.position.y = height + 0.03;
  g.add(lip);
  return g;
}

/** 穹顶天花板：同心灯槽 + 外缘深色压边，去掉杂乱的放射肋。 */
function ceilingDome(rb) {
  const m = materials();
  // 半球压扁后，赤道正好落在墙顶，避免出现缝隙
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(R + 0.04, 64, 24, 0, Math.PI * 2, 0, Math.PI / 2),
    m.ceiling,
  );
  dome.scale.set(1, 0.135, 1);
  dome.position.y = WALL_H;
  rb.add(dome);

  // 外缘压边
  const edge = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.03, R - 0.03, 0.26, 72, 1, true), m.trimWarm);
  edge.position.y = WALL_H - 0.13;
  rb.add(edge);

  // 同心灯槽（内凹的发光环 + 深色分隔）
  const domeY = (r) => WALL_H + 0.135 * Math.sqrt(Math.max(0, (R + 0.04) ** 2 - r * r)) - 0.05;
  const rings = [[8.05, 0.62], [6.15, 0.5], [4.15, 0.38], [2.1, 0.3]];
  for (const [r, w] of rings) {
    const lift = domeY(r) - WALL_H;
    const lit = new THREE.Mesh(new THREE.RingGeometry(r - w / 2, r + w / 2, 80), m.lightPanel);
    lit.rotation.x = Math.PI / 2;
    lit.position.y = WALL_H + lift;
    rb.add(lit);
    const sep = new THREE.Mesh(new THREE.TorusGeometry(r + w / 2 + 0.09, 0.055, 6, 72), m.consoleBody);
    sep.rotation.x = Math.PI / 2;
    sep.position.y = WALL_H + lift + 0.02;
    rb.add(sep);
  }

  for (const [a, r] of [[45, 6.2], [135, 6.2], [225, 6.2], [315, 6.2]]) {
    const [x, z] = at(a, r);
    rb.light(x, WALL_H - 0.25, z, 0xffe6c4, 24, 20);
  }
  rb.light(0, WALL_H - 0.5, 2.2, 0xd6e6ff, 16, 16);
}

export function buildBridge(ctx, origin) {
  const m = materials();
  const rb = new RoomBuilder(ctx, origin, 'bridge');
  const rng = makeRng(31);

  // —— 地板：外圈步道 + 下沉指挥区
  const ring = new THREE.Mesh(new THREE.RingGeometry(WELL_R, R, 80), m.carpet);
  ring.rotation.x = -Math.PI / 2;
  rb.add(ring);
  const well = new THREE.Mesh(new THREE.CircleGeometry(WELL_R, 72), m.carpetWarm);
  well.rotation.x = -Math.PI / 2;
  well.position.y = WELL_Y;
  rb.add(well);
  const riser = new THREE.Mesh(new THREE.CylinderGeometry(WELL_R, WELL_R, -WELL_Y, 72, 1, true), m.trimWarm);
  riser.position.y = WELL_Y / 2;
  rb.add(riser);

  rb.annulus(0, 0, WELL_R, R - 0.15, 0, 0, Math.PI * 2, 'bridge-ring');
  rb.circle(0, 0, WELL_R - 0.05, WELL_Y, 'bridge-well');

  // —— 舱壁：按开口分段
  const openings = [
    [-26, 26, 'viewscreen'],
    [60, 78, 'readyroom'],
    [-78, -60, 'head'],
    [126, 146, 'turbolift-stbd'],
    [-146, -126, 'turbolift-port'],
    [172, 188, 'lounge'],
  ].sort((a, b) => a[0] - b[0]);

  let cursor = -180;
  for (const [a0, a1] of openings) {
    if (a0 > cursor) {
      rb.add(arcWall(R, cursor * D, (a0 - cursor) * D, WELL_Y, WALL_H, m.bulkheadWarm, 40));
    }
    cursor = Math.max(cursor, a1);
  }
  if (cursor < 180) rb.add(arcWall(R, cursor * D, (180 - cursor) * D, WELL_Y, WALL_H, m.bulkheadWarm, 40));

  // 舱壁腰线与竖肋
  for (let k = 0; k < 24; k++) {
    const a = -180 + k * 15;
    const inDoor = openings.some(([s, e]) => a > s - 1 && a < e + 1);
    if (inDoor) continue;
    const [x, z] = at(a, R - 0.08);
    rb.add(box(0.12, WALL_H - 0.1, 0.1, x, (WALL_H + WELL_Y) / 2, z, m.rib, a * D));
  }
  const band = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.14, R - 0.14, 0.16, 72, 1, true), m.trimWarm);
  band.position.y = 2.42;
  rb.add(band);

  // —— 主屏幕
  const screenSpan = 46 * D;
  const screen = new THREE.Mesh(
    new THREE.CylinderGeometry(R - 0.22, R - 0.22, 2.55, 48, 1, true, -screenSpan / 2, screenSpan),
    viewscreenMaterial(),
  );
  screen.position.y = 1.42;
  screen.name = 'viewscreen';
  rb.add(screen);
  const frameTop = new THREE.Mesh(
    new THREE.CylinderGeometry(R - 0.1, R - 0.1, 0.34, 48, 1, true, -screenSpan / 2 - 0.05, screenSpan + 0.1),
    m.trimWarm,
  );
  frameTop.position.y = 2.86;
  rb.add(frameTop);
  const frameBot = frameTop.clone();
  frameBot.position.y = 0.0;
  rb.add(frameBot);
  rb.light(0, 1.8, R - 2.6, 0x6f9fd8, 13, 15);

  // —— 指挥席
  rb.add(chair(0, WELL_Y, -1.15, 0, 1.12));
  rb.add(chair(-2.05, WELL_Y, -1.0, 0.12, 1.0));
  rb.add(chair(2.05, WELL_Y, -1.0, -0.12, 1.0));
  // 扶手控制面板
  for (const sx of [-1, 1]) {
    rb.add(plane(0.3, 0.16, sx * 0.39, WELL_Y + 0.75, -0.95, m.lcarsLit(7 + sx, 256, 140), [-Math.PI / 2 + 0.25, 0, 0]));
  }
  rb.block(-0.5, -1.6, 0.5, -0.7, 0, 1.4);

  // —— CONN / OPS
  for (const [sx, seed] of [[-1, 21], [1, 22]]) {
    rb.add(standingConsole(sx * 1.35, WELL_Y, 3.25, 1.7, Math.PI, seed));
    rb.add(chair(sx * 1.35, WELL_Y, 2.25, Math.PI, 0.95));
    rb.block(sx * 1.35 - 0.9, 2.95, sx * 1.35 + 0.9, 3.7, 0, 1.3);
  }

  // —— 战术台（指挥席正后方的弧形台）
  rb.add(arcConsole(5.35, 152, 56, 33, { height: 1.16 }));
  rb.add(railing([
    at(140, 5.05), at(155, 5.05), at(170, 5.05), at(185, 5.05), at(200, 5.05), at(215, 5.05),
  ].map(([x, z]) => [x, z]), 0, 0.98));

  // —— 后部与侧向站位
  const stations = [96, 112, -96, -112, 158, -158, 40, -40];
  stations.forEach((a, i) => {
    const [x, z] = at(a, R - 1.05);
    rb.add(standingConsole(x, 0, z, 1.85, a * D, 40 + i));
    rb.block(x - 0.95, z - 0.95, x + 0.95, z + 0.95, 0, 1.3);
    const [wx, wz] = at(a, R - 0.2);
    rb.add(lcarsWall(wx, 2.05, wz, 1.9, 0.95, a * D + Math.PI, 60 + i, 1.1));
  });

  // —— 舱门
  for (const [a, tag] of [[68, 'ready-room'], [-68, 'head'], [136, 'turbolift-stbd'], [-136, 'turbolift-port'], [180, 'lounge']]) {
    const [x, z] = at(a, R - 0.18);
    rb.door({ x, y: 0, z, rotY: a * D + Math.PI, width: 1.62, height: 2.34, tag });
    const [lx, lz] = at(a, R - 0.5);
    rb.light(lx, 2.2, lz, 0xffc879, 5, 7);
  }

  // —— 涡轮电梯壁龛（呼叫板）
  for (const a of [136, -136]) {
    const [x, z] = at(a, R - 0.35);
    rb.hotspot(`turbolift-bridge-${a}`, x, 1.5, z, '涡轮电梯 · 选择目的地', 'turbolift');
  }

  ceilingDome(rb);

  // —— 地毯嵌花与甲板铭牌
  const inlay = new THREE.Mesh(new THREE.RingGeometry(WELL_R - 0.55, WELL_R - 0.22, 64), m.trimWarm);
  inlay.rotation.x = -Math.PI / 2;
  inlay.position.y = WELL_Y + 0.006;
  rb.add(inlay);

  rb.spawn('bridge', -6.9, 0, -2.6, Math.PI * 0.72);
  return rb.group;
}
