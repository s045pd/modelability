import * as THREE from 'three';
import { wallSeg } from '../walls.js';
import { ceilLight } from '../props.js';

export const H = 3.2;

// 侧墙/后墙外壳：mat = 外侧，mat2 = 室内；方向保证 +z 侧朝外
export function roomShell(kit, { w, d, outside = null, inside = null, trim = null, floor = null, ceil = null, y0 = 0, h = H, doors = {}, lights = true, name = null, deck = 'DECK 4', lightMat = null, window = null }) {
  const M = kit.M;
  outside = outside || M.wall;
  inside = inside || M.wallWarm;
  const o = { mat: outside, mat2: inside, trim, y0, h };
  wallSeg(kit, -w / 2, 0, -w / 2, d, { ...o, doors: doors.left || [] });
  if (window) backWindowWall(kit, { w, d, y0, h, win: window, outside, inside });
  else wallSeg(kit, -w / 2, d, w / 2, d, { ...o, doors: doors.back || [] });
  wallSeg(kit, w / 2, d, w / 2, 0, { ...o, doors: doors.right || [] });
  kit.box(floor || M.floorLight, [0, y0 + 0.012, d / 2], [w - 0.02, 0.024, d - 0.02]);
  kit.box(ceil || M.ceiling, [0, y0 + h - 0.012, d / 2], [w - 0.02, 0.024, d - 0.02]);
  if (lights) {
    const nx = Math.max(1, Math.round(w / 4)), nz = Math.max(1, Math.round(d / 4));
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      const x = -w / 2 + (w / nx) * (i + 0.5), z = (d / nz) * (j + 0.5);
      ceilLight(kit, x, z, 1.6, 0.5, y0 + h, lightMat);
      if ((i + j) % 2 === 0) kit.light(x, y0 + h - 1.2, z, 0xfff2df, 20, 11);
    }
  }
  if (name) kit.zone(name, deck, 0, d / 2, w / 2, d / 2, y0, y0 + h + 0.2);
}

export function setSpawn(ctx, key, x, z, faceLocalZ = true) {
  const { kit } = ctx;
  const p = kit.toWorld(x, 0, z);
  ctx.world.spawns[key] = { x: p.x, y: kit.oy, z: p.z, yaw: kit.yaw() + (faceLocalZ ? Math.PI : 0) };
}

// 楔形舱室（局部象限 x>0,z>0）的地面/天花：多边形去掉走廊带与枢纽
export function wedgeShape(kit, mat, y, up = true, r0 = 8.6, r1 = 29.6, hw = 1.85) {
  const pts = [];
  const a0 = Math.asin(hw / r1), a1 = Math.acos(hw / r1);
  for (let i = 0; i <= 24; i++) { const a = a0 + ((a1 - a0) * i) / 24; pts.push([r1 * Math.cos(a), r1 * Math.sin(a)]); }
  const b0 = Math.asin(hw / r0), b1 = Math.acos(hw / r0);
  for (let i = 24; i >= 0; i--) { const a = b0 + ((b1 - b0) * i) / 24; pts.push([r0 * Math.cos(a), r0 * Math.sin(a)]); }
  const sh = new THREE.Shape();
  pts.forEach(([x, z], i) => { const yy = up ? -z : z; i ? sh.lineTo(x, yy) : sh.moveTo(x, yy); });
  const g = new THREE.ShapeGeometry(sh);
  g.rotateX(up ? -Math.PI / 2 : Math.PI / 2);
  kit.geo(mat, g, [0, y, 0]);
}

export const wedgePolar = (r, deg) => [r * Math.cos((deg * Math.PI) / 180), r * Math.sin((deg * Math.PI) / 180)];

// 楔形舱室的天花灯板与灯位网格
export function wedgeLighting(kit, { mat = null, color = 0xfff0dc, intensity = 11 } = {}) {
  const M = kit.M;
  for (const r of [11.5, 15.5, 19.5, 23.5, 27]) {
    for (const th of [16, 36, 56, 76]) {
      const [x, z] = wedgePolar(r, th);
      if (r > 25 && (th < 20 || th > 72)) continue;
      const rot = -(th * Math.PI) / 180 + Math.PI / 2;
      kit.push(x, 0, z, rot);
      ceilLight(kit, 0, 0, 1.6, 0.42, H, mat || M.panel);
      kit.pop();
      if (((r * 10 + th) | 0) % 2 === 0 || r > 20) kit.light(x, 2.0, z, color, intensity, 9);
    }
  }
}
