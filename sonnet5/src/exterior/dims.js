import { makeProfileLookup } from '../core/geom.js';

// 副船体（轴向 = z，前 = 小 z）
export const HY = -40.5;
export const SX = 1.04;
export const SY = 0.92;
export const Z_DISH = 25.2;
export const Z_AFT = 132.5;

// [r, z]（Lathe 外法线：沿行进方向右手侧；前端为 dish 凹面）
export const HULL_PROFILE = [
  [0, 25.2], [2.5, 24.6], [4.5, 23.4], [6.2, 22.0], [8.6, 22.8], [11.5, 24.5], [13.6, 28.0], [14.6, 34.0], [15.0, 42.0],
  [15.0, 100.0], [14.85, 112.0], [14.3, 122.0], [13.6, 129.0], [12.9, Z_AFT],
];
const rz = HULL_PROFILE.slice(4).map(([r, z]) => [z, r]);
export const hullLook = makeProfileLookup(rz);
export const hullR = (z) => hullLook.y(z);

// 副船体表面点：φ 自顶面起顺时针（+x 侧为 90°）
export function hullPoint(z, phi, off = 0) {
  const r = hullR(z) + off;
  const s = Math.sin(phi), c = Math.cos(phi);
  const n = [s / SX, c / SY, 0];
  const l = Math.hypot(n[0], n[1]);
  return { p: [SX * r * s, HY + SY * r * c, z], n: [n[0] / l, n[1] / l, 0] };
}

export const NAC = { x: 30, y: 7.2, z0: 88, z1: 226, R: 5.5 };
// 曲速舱剖面 [r, 轴向 t]，t 自舱首起算
export const NAC_PROFILE = [
  [4.9, 5.6], [5.4, 6.4], [5.5, 9], [5.5, 14], [5.18, 14.6, true], [5.18, 15.6], [5.5, 16.2, true], [5.55, 30],
  [5.55, 100], [5.4, 112], [4.95, 124], [4.2, 132], [3.3, 137], [2.6, 138.5],
];
export const nacLook = makeProfileLookup(NAC_PROFILE.map(([r, t]) => [t, r]));
export const nacR = (t) => nacLook.y(t);
