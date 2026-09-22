import { smoothCurve, makeProfileLookup } from '../core/geom.js';

// 碟体上/下表面剖面（单位：米，原点在碟体中心）
const TOP = [[0, 10.4], [8, 10.3], [16, 9.95], [26, 9.05], [36, 7.65], [46, 5.95], [54, 4.35], [59, 3.15], [62, 2.25], [63.2, 1.35]];
const BOT = [[0, -9.8], [8, -9.7], [16, -9.4], [26, -8.7], [36, -7.55], [44, -6.1], [52, -4.6], [58, -3.2], [62, -2.0], [63.2, -1.05]];
const RIM = [[63.62, 0.85], [63.92, 0.15], [63.62, -0.55]];

export const SAUCER_R = 63.9;

const topPts = smoothCurve(TOP, 90).sort((a, b) => a[0] - b[0]);
const botPts = smoothCurve(BOT, 90).sort((a, b) => a[0] - b[0]);
export const topLook = makeProfileLookup(topPts);
export const botLook = makeProfileLookup(botPts);
export const saucerTopY = (r) => topLook.y(r);
export const saucerBotY = (r) => botLook.y(r);

// 沿表面外法线（xz 平面内的 r 分量与 y 分量）
export function topNormal(r) { const s = topLook.slope(r); const l = Math.hypot(1, s); return [-s / l, 1 / l]; }
export function botNormal(r) { const s = botLook.slope(r); const l = Math.hypot(1, s); return [s / l, -1 / l]; }

// 完整剖面：底面中心 → 外缘 → 顶面中心（Lathe 外法线约定）
export function saucerProfile() {
  const pts = [];
  for (const p of botPts) pts.push([p[0], p[1]]);
  for (const p of RIM) pts.push([p[0], p[1]]);
  for (let i = topPts.length - 1; i >= 0; i--) pts.push([topPts[i][0], topPts[i][1]]);
  return pts;
}

// 极坐标(φ 从舰艏顺时针俯视, r) → 世界 xz
export const polar = (phi, r) => [r * Math.sin(phi), -r * Math.cos(phi)];
