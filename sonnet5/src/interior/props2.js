import * as THREE from 'three';
import { makeRng } from '../core/rng.js';
import { screen, wallPanel, wallScreen, vent, pipe } from './props.js';

const rng = makeRng(9001);

export function sofa(kit, x, z, rot, len = 2.4, mat = null) {
  const M = kit.M;
  mat = mat || M.fabricRed;
  kit.push(x, 0, z, rot);
  kit.solid(mat, [0, 0.24, 0], [len, 0.48, 0.9]);
  kit.box(M.fabricRed === mat ? M.fabricRed : mat, [0, 0.56, 0.02], [len - 0.3, 0.16, 0.7]);
  kit.box(mat, [0, 0.72, -0.36], [len, 0.62, 0.2]);
  for (const s of [-1, 1]) kit.box(mat, [s * (len / 2 - 0.1), 0.45, 0], [0.2, 0.42, 0.9]);
  kit.box(M.steelDark, [0, 0.03, 0], [len - 0.1, 0.06, 0.8]);
  kit.pop();
}

export function bed(kit, x, z, rot, { blanket = null, w = 1.4, l = 2.1 } = {}) {
  const M = kit.M;
  kit.push(x, 0, z, rot);
  kit.solid(M.consoleDark, [0, 0.22, 0], [w + 0.1, 0.44, l + 0.1]);
  kit.box(M.bedWhite, [0, 0.5, 0], [w, 0.16, l]);
  kit.box(blanket || M.fabricBlue, [0, 0.6, 0.35], [w + 0.02, 0.06, l * 0.62]);
  kit.box(M.bedWhite, [-w * 0.22, 0.64, -l * 0.38], [w * 0.36, 0.12, 0.42]);
  kit.box(M.bedWhite, [w * 0.22, 0.64, -l * 0.38], [w * 0.36, 0.12, 0.42]);
  kit.box(M.wood, [0, 0.9, -l / 2 - 0.05], [w + 0.2, 0.9, 0.1]);
  kit.pop();
}

export function bunk(kit, x, z, rot, mat = null) {
  const M = kit.M;
  kit.push(x, 0, z, rot);
  kit.wall(0, 0, 0.5, 1.05, 0, 2.0);
  for (const y of [0.35, 1.3]) {
    kit.box(M.consoleDark, [0, y, 0], [0.96, 0.1, 2.05]);
    kit.box(M.bedWhite, [0, y + 0.12, 0], [0.9, 0.14, 2.0]);
    kit.box(mat || M.fabricBlue, [0, y + 0.2, 0.35], [0.92, 0.05, 1.3]);
    kit.box(M.bedWhite, [0, y + 0.22, -0.8], [0.6, 0.1, 0.34]);
    kit.box(M.panelWarm, [0.44, y + 0.5, -0.9], [0.04, 0.05, 0.14]);
  }
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) kit.box(M.steelDark, [sx * 0.5, 1.0, sz * 1.02], [0.06, 2.1, 0.06]);
  kit.box(M.steelDark, [0.52, 0.8, 0.2], [0.04, 1.3, 0.04]);
  for (let i = 0; i < 4; i++) kit.box(M.steel, [0.53, 0.5 + i * 0.28, 0.2], [0.04, 0.03, 0.34]);
  kit.pop();
}

export function desk(kit, x, z, rot, w = 1.5, { screenSeed = 1 } = {}) {
  const M = kit.M;
  kit.push(x, 0, z, rot);
  kit.solid(M.wood, [0, 0.74, 0], [w, 0.05, 0.75]);
  for (const s of [-1, 1]) kit.solid(M.wood, [s * (w / 2 - 0.2), 0.36, 0], [0.4, 0.72, 0.7]);
  for (let i = 0; i < 3; i++) for (const s of [-1, 1]) kit.box(M.steel, [s * (w / 2 - 0.2), 0.6 - i * 0.2, 0.36], [0.16, 0.02, 0.02]);
  screen(kit, ['text', 'chart', 'scope'][screenSeed % 3], screenSeed, [0.1, 1.05, -0.2], [0.55, 0.36], -0.12);
  kit.box(M.consoleDark, [0.1, 0.86, -0.2], [0.14, 0.24, 0.14]);
  kit.box(M.plastic, [-0.4, 0.78, 0.1], [0.3, 0.02, 0.22], [0, 0.2, 0]);
  kit.pop();
}

export function biobed(kit, x, z, rot, seed = 1) {
  const M = kit.M;
  kit.push(x, 0, z, rot);
  kit.cyl(M.steelDark, [0, 0.28, 0], 0.16, 0.56, { seg: 12 });
  kit.box(M.steel, [0, 0.55, 0], [0.9, 0.06, 2.1]);
  kit.solid(M.plastic, [0, 0.66, 0], [0.86, 0.16, 2.0]);
  kit.box(M.bedWhite, [0, 0.75, -0.75], [0.5, 0.1, 0.4]);
  kit.box(M.consoleBlue, [0, 0.79, 0.3], [0.9, 0.02, 1.1]);
  kit.box(M.steelDark, [0, 0.05, 0], [0.7, 0.1, 1.2]);
  // 头端悬挂诊断板
  kit.box(M.steelDark, [0, 1.75, -1.0], [0.06, 1.4, 0.06]);
  kit.pushEuler([0, 1.5, -0.86], [0.42, 0, 0]);
  kit.box(M.consoleDark, [0, 0, 0], [0.9, 0.5, 0.06]);
  screen(kit, 'scope', seed, [-0.2, 0, 0.05], [0.42, 0.34], 0, 0, false);
  screen(kit, 'bars', seed + 1, [0.25, 0.03, 0.05], [0.3, 0.22], 0, 0, false);
  for (let i = 0; i < 4; i++) kit.box(M.lampVC, [0.32 + (i % 2) * 0.09, -0.16 + Math.floor(i / 2) * 0.06, 0.06], [0.05, 0.04, 0.02], null, [[3, 0.3, 0.2], [0.3, 2.8, 0.5], [3, 2.2, 0.3], [0.5, 1.5, 3.3]][i]);
  kit.pop();
  kit.pop();
}

// 计算机核心机架：大量闪烁灯
export function rack(kit, x, z, rot, w = 1.2, h = 2.2) {
  const M = kit.M;
  kit.push(x, 0, z, rot);
  kit.solid(M.consoleDark, [0, h / 2, 0], [w, h, 0.7]);
  kit.box(M.console, [0, h / 2, 0.36], [w - 0.06, h - 0.1, 0.02]);
  const cols = Math.floor(w / 0.16), rows = Math.floor((h - 0.4) / 0.14);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    if (rng() < 0.35) continue;
    kit.box(rng.pick(M.blink), [-w / 2 + 0.14 + i * 0.16, 0.25 + j * 0.14, 0.375], [0.05, 0.05, 0.02]);
  }
  for (let k = 0; k < 3; k++) {
    kit.cyl(M.steel, [-w * 0.28 + (k * w * 0.28), h - 0.3, 0.4], 0.15, 0.04, { seg: 16, rot: [Math.PI / 2, 0, 0] });
    kit.cyl(M.consoleDark, [-w * 0.28 + (k * w * 0.28), h - 0.3, 0.42], 0.04, 0.05, { seg: 8, rot: [Math.PI / 2, 0, 0] });
  }
  kit.pop();
}

export function planter(kit, x, z, rot, w = 2.4, d = 0.7, glow = null) {
  const M = kit.M;
  kit.push(x, 0, z, rot);
  kit.solid(M.steelDark, [0, 0.3, 0], [w, 0.6, d]);
  kit.box(M.soil, [0, 0.6, 0], [w - 0.1, 0.03, d - 0.1]);
  for (let i = 0; i < Math.floor(w / 0.25); i++) {
    const px = -w / 2 + 0.15 + i * 0.25 + rng() * 0.08, pz = (rng() - 0.5) * (d - 0.25);
    const hgt = 0.3 + rng() * 0.7;
    kit.beam(M.leaf, [px, 0.62, pz], [px + (rng() - 0.5) * 0.2, 0.62 + hgt, pz], 0.015, { seg: 4 });
    kit.sph(M.leaf, [px, 0.62 + hgt, pz], 0.12 + rng() * 0.1, { ws: 8, hs: 6, s: [1, 0.55, 1] });
    if (rng() < 0.3) kit.sph(rng.pick([M.chairRed, M.chairGold, M.chairOrange]), [px + 0.08, 0.5 + hgt, pz + 0.05], 0.05, { ws: 6, hs: 4 });
  }
  if (glow) kit.box(glow, [0, 1.65, 0], [w - 0.2, 0.05, 0.3]);
  kit.pop();
}

// 墙面沿线装饰（沿左/右墙）
export function wallDecor(kit, w, d, seed = 1, { from = 1.5, to = d - 1, step = 2.4 } = {}) {
  const r = makeRng(seed);
  const types = ['buttons', 'locker', 'vent', 'hatch'];
  for (const s of [-1, 1]) {
    let i = 0;
    for (let z = from; z < to; z += step + r() * 0.8) {
      const x = s * (w / 2 - 0.16);
      const rot = s < 0 ? Math.PI / 2 : -Math.PI / 2;
      if (r() < 0.45) wallScreen(kit, ['scope', 'chart', 'bars', 'text', 'ship'][(i + seed) % 5], seed + i, x, 1.55, z, rot, 0.8, 0.5);
      else wallPanel(kit, x, 1.45, z, rot, types[(i + seed) % 4]);
      i++;
    }
  }
}

export function ceilingRun(kit, w, d, y, mats) {
  for (const s of [-1, 1]) {
    pipe(kit, [s * (w / 2 - 0.3), y - 0.15, 0.3], [s * (w / 2 - 0.3), y - 0.15, d - 0.3], 0.06, mats[0]);
    pipe(kit, [s * (w / 2 - 0.5), y - 0.12, 0.3], [s * (w / 2 - 0.5), y - 0.12, d - 0.3], 0.04, mats[1]);
  }
}

export function forceBars(kit, x, y0, z, len, h, rot = 0) {
  const M = kit.M;
  kit.push(x, y0, z, rot);
  for (let i = 0; i <= Math.floor(len / 0.18); i++) kit.box(M.lampBlue, [-len / 2 + i * 0.18, h / 2, 0], [0.025, h, 0.025]);
  kit.box(M.steelDark, [0, 0.03, 0], [len + 0.1, 0.06, 0.1]);
  kit.box(M.steelDark, [0, h, 0], [len + 0.1, 0.06, 0.1]);
  kit.pop();
}

// 楼梯：沿局部 +z 上升 steps*rise
export function stairs(kit, { x = 0, z = 0, ry = 0, w = 1.4, steps = 16, rise = 0.28, run = 0.3, mat = null, rails = true }) {
  const M = kit.M;
  mat = mat || M.grate;
  kit.push(x, 0, z, ry);
  for (let i = 0; i < steps; i++) {
    const top = (i + 1) * rise, zc = (i + 0.5) * run;
    kit.box(mat, [0, top - 0.03, zc], [w, 0.06, run + 0.02]);
    kit.box(M.steelDark, [0, top - rise / 2, zc - run / 2 + 0.02], [w, rise, 0.04]);
    kit.floorRect(0, zc, w / 2, run / 2 + 0.01, top);
  }
  const L = steps * run, T = steps * rise;
  for (const s of [-1, 1]) {
    kit.beam(M.steelDark, [s * w / 2, 0.1, 0], [s * w / 2, T + 0.1, L], 0.07, { round: false });
    if (rails) {
      kit.beam(M.railRed, [s * w / 2, 1.05, 0], [s * w / 2, T + 1.05, L], 0.035);
      for (let i = 0; i <= steps; i += 3) kit.beam(M.railRed, [s * w / 2, i * rise, i * run], [s * w / 2, i * rise + 1.05, i * run], 0.025);
      kit.wall(s * w / 2, L / 2, 0.05, L / 2, 0, T + 1.2);
    }
  }
  kit.pop();
}

export function railing(kit, x0, z0, x1, z1, y0, { h = 1.05, mat = null, post = 1.6 } = {}) {
  const M = kit.M;
  mat = mat || M.railRed;
  const len = Math.hypot(x1 - x0, z1 - z0);
  const n = Math.max(1, Math.round(len / post));
  for (let i = 0; i <= n; i++) kit.cyl(mat, [x0 + ((x1 - x0) * i) / n, y0 + h / 2, z0 + ((z1 - z0) * i) / n], 0.035, h, { seg: 6 });
  kit.beam(mat, [x0, y0 + h, z0], [x1, y0 + h, z1], 0.035);
  kit.beam(mat, [x0, y0 + h * 0.55, z0], [x1, y0 + h * 0.55, z1], 0.025);
  kit.push((x0 + x1) / 2, 0, (z0 + z1) / 2, Math.atan2(-(z1 - z0), x1 - x0));
  kit.wall(0, 0, len / 2 + 0.04, 0.05, y0, y0 + 1.3);
  kit.pop();
}

// 圆弧栏杆，可留出缺口 [a0,a1] 以弧度表示
export function railArc(kit, cx, cz, r, y0, gaps = [], segs = 32) {
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Math.PI * 2, a1 = ((i + 1) / segs) * Math.PI * 2, am = (a0 + a1) / 2;
    if (gaps.some(([g0, g1]) => am > g0 && am < g1)) continue;
    railing(kit, cx + Math.sin(a0) * r, cz + Math.cos(a0) * r, cx + Math.sin(a1) * r, cz + Math.cos(a1) * r, y0, { post: 3 });
  }
}
