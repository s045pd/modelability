import { latheGeo } from '../core/geom.js';
import { makeRng } from '../core/rng.js';
import { makeTextTexture } from '../core/textures.js';
import { saucerProfile, saucerTopY, saucerBotY, polar } from './profile.js';
import { surfaceDecal, decalMaterial } from './decal.js';
import { pushSurface, surfacePoint } from './util.js';

const D2R = Math.PI / 180;

function ringStrip(kit, mat, r0, r1, off, side, segs = 200) {
  const n = Math.max(2, Math.ceil((r1 - r0) / 1.5));
  const pts = [];
  if (side > 0) for (let i = n; i >= 0; i--) { const r = r0 + ((r1 - r0) * i) / n; pts.push([r, saucerTopY(r) + off]); }
  else for (let i = 0; i <= n; i++) { const r = r0 + ((r1 - r0) * i) / n; pts.push([r, saucerBotY(r) - off]); }
  kit.geo(mat, latheGeo(pts, segs));
}

// 沿表面圆弧的扁条（用于窗带、分格线）
function arcStrip(kit, mat, side, r, phi0, phi1, width, lift = 0.04, thick = 0.04) {
  const n = Math.max(2, Math.ceil(Math.abs(phi1 - phi0) / (4 * D2R)));
  for (let i = 0; i < n; i++) {
    const a = surfacePoint(side, r, phi0 + ((phi1 - phi0) * i) / n, lift);
    const b = surfacePoint(side, r, phi0 + ((phi1 - phi0) * (i + 1)) / n, lift);
    kit.strut(mat, a.p, b.p, width, thick, a.n);
  }
}

function radialSeams(kit, side, count, r0, r1, phase = 0, mat) {
  for (let k = 0; k < count; k++) {
    const phi = phase + (k / count) * Math.PI * 2;
    const n = Math.ceil((r1 - r0) / 5);
    for (let i = 0; i < n; i++) {
      const ra = r0 + ((r1 - r0) * i) / n, rb = r0 + ((r1 - r0) * (i + 1)) / n;
      const a = surfacePoint(side, ra, phi, 0.03), b = surfacePoint(side, rb, phi, 0.03);
      kit.strut(mat, a.p, b.p, 0.07, 0.03, a.n);
    }
  }
}

function surfaceWindows(kit, M, rng, side, r, step, opts = {}) {
  const { w = 0.7, h = 0.22, skip = 0.12, group = 9 } = opts;
  const n = Math.round((Math.PI * 2) / step);
  for (let i = 0; i < n; i++) {
    if (i % group === 0) continue;
    if (rng() < skip) continue;
    const phi = (i / n) * Math.PI * 2;
    const a = surfacePoint(side, r, phi - step * 0.28, 0.035), b = surfacePoint(side, r, phi + step * 0.28, 0.035);
    const c = rng();
    kit.strut(c < 0.72 ? M.winWarm : c < 0.9 ? M.winCool : M.winOff, a.p, b.p, h, 0.03, a.n);
  }
}

function rimWindows(kit, M, rng) {
  const rows = [0.62, 0.3, -0.02, -0.34, -0.66];
  const n = 230;
  const rimR = (y) => 63.92 - 0.32 * Math.pow((y - 0.1) / 0.75, 2);
  rows.forEach((y, ri) => {
    for (let i = 0; i < n; i++) {
      if (i % 10 === 0) continue;
      if (rng() < 0.1 + ri * 0.02) continue;
      const phi = (i / n) * Math.PI * 2;
      const r = rimR(y) + 0.02;
      const dphi = (Math.PI * 2 / n) * 0.3;
      const [x0, z0] = polar(phi - dphi, r), [x1, z1] = polar(phi + dphi, r);
      const [nx, nz] = [Math.sin(phi), -Math.cos(phi)];
      const c = rng();
      kit.strut(c < 0.75 ? M.winWarm : c < 0.92 ? M.winCool : M.winOff, [x0, y, z0], [x1, y, z1], 0.17, 0.035, [nx, 0, nz]);
    }
  });
}

function greebles(kit, M, rng, side, count, rMin, rMax) {
  const mats = [M.hullDark, M.steel, M.steelDark, M.gold, M.hullWarm, M.hullBlack];
  for (let i = 0; i < count; i++) {
    const r = rng.range(rMin, rMax), phi = rng() * Math.PI * 2;
    pushSurface(kit, side, r, phi);
    const kind = rng();
    const m = rng.pick(mats);
    if (kind < 0.45) kit.box(m, [0, rng.range(0.03, 0.1), 0], [rng.range(0.4, 2.2), rng.range(0.12, 0.3), rng.range(0.3, 1.5)], [0, rng.range(-0.5, 0.5), 0]);
    else if (kind < 0.75) kit.cyl(m, [0, 0.1, 0], rng.range(0.2, 0.7), rng.range(0.15, 0.4), { seg: 14 });
    else if (kind < 0.9) { kit.cyl(M.steel, [0, 0.5, 0], 0.05, 1.0, { seg: 6 }); kit.sph(M.steel, [0, 1.02, 0], 0.09, { ws: 8, hs: 6 }); }
    else { kit.box(M.hullBlack, [0, 0.06, 0], [1.4, 0.1, 0.8]); for (let k = 0; k < 4; k++) kit.box(M.lampAmber, [-0.45 + k * 0.3, 0.13, 0], [0.12, 0.04, 0.5]); }
    kit.pop();
  }
}

function phaserBank(kit, M, side, r, phi) {
  pushSurface(kit, side, r, phi);
  kit.cyl(M.steelDark, [0, 0.05, 0], 1.9, 0.5, { seg: 28 });
  kit.cyl(M.gold, [0, 0.3, 0], 1.55, 0.14, { seg: 28 });
  kit.cyl(M.hullBlack, [0, 0.37, 0], 1.2, 0.1, { seg: 28 });
  kit.cyl(M.lampAmber, [0, 0.43, 0], 0.32, 0.08, { seg: 12 });
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; kit.box(M.steel, [Math.cos(a) * 1.7, 0.36, Math.sin(a) * 1.7], [0.16, 0.1, 0.16], [0, -a, 0]); }
  kit.pop();
}

function lifeboatHatch(kit, M, side, r, phi) {
  pushSurface(kit, side, r, phi);
  kit.box(M.stripDark, [0, 0.03, 0], [3.0, 0.05, 1.7]);
  kit.box(M.hullWarm, [0, 0.07, 0], [2.7, 0.05, 1.45]);
  for (const dx of [-0.5, 0.5]) kit.box(M.stripDark, [dx, 0.1, 0], [0.05, 0.04, 1.45]);
  kit.box(M.lampAmber, [1.05, 0.11, 0.55], [0.15, 0.04, 0.15]);
  kit.box(M.lampGreen, [1.05, 0.11, -0.55], [0.15, 0.04, 0.15]);
  kit.pop();
}

function registry(kit, M, text, side, phi0, phi1, rIn, rOut, size) {
  const tex = makeTextTexture(text, { w: size[0], h: size[1], font: `bold ${Math.round(size[1] * 0.78)}px "Arial Narrow","Helvetica Neue",Arial,sans-serif`, color: '#2f3640', letterSpacing: size[1] * 0.08 });
  const mat = decalMaterial(tex);
  const g = surfaceDecal((s, t) => {
    const phi = phi0 + (phi1 - phi0) * s, r = rIn + (rOut - rIn) * t;
    return surfacePoint(side, r, phi, 0.05).p;
  }, 64, 6, side);
  kit.geo(mat, g);
}

function bridgeModule(kit, M, rng) {
  const prof = [[9.7, 10.2], [9.7, 10.85, true], [9.45, 11.05], [9.45, 11.5], [9.7, 11.65, true], [9.7, 13.0], [9.4, 13.45], [8.6, 13.95], [7.2, 14.45], [5.2, 14.85], [2.8, 15.1], [0, 15.2]];
  kit.geo(M.hull, latheGeo(prof, 96));
  // 舷窗环
  for (let i = 0; i < 40; i++) {
    if (i % 5 === 0) continue;
    const a = (i / 40) * Math.PI * 2;
    kit.box(rng() < 0.85 ? M.winWarm : M.winCool, [Math.cos(a) * 9.73, 12.2, Math.sin(a) * 9.73], [0.55, 0.34, 0.06], [0, -a + Math.PI / 2, 0]);
  }
  // 基座环、扶手、通风
  kit.torus(M.steelDark, [0, 10.55, 0], 9.95, 0.13, { rot: [Math.PI / 2, 0, 0], seg: 96 });
  kit.torus(M.gold, [0, 13.02, 0], 9.72, 0.07, { rot: [Math.PI / 2, 0, 0], seg: 96 });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + 0.13;
    kit.box(M.hullBlack, [Math.cos(a) * 9.72, 11.15, Math.sin(a) * 9.72], [0.9, 0.5, 0.08], [0, -a + Math.PI / 2, 0]);
    for (let k = 0; k < 4; k++) kit.box(M.steelDark, [Math.cos(a) * 9.74, 11.0 + k * 0.11, Math.sin(a) * 9.74], [0.82, 0.03, 0.05], [0, -a + Math.PI / 2, 0]);
  }
  // 同心分层
  for (const [r, y] of [[8.4, 13.95], [6.2, 14.6], [3.8, 14.98]]) kit.torus(M.stripDark, [0, y + 0.02, 0], r, 0.05, { rot: [Math.PI / 2, 0, 0], seg: 72 });
  // 顶部天线阵
  kit.cyl(M.steelDark, [0, 15.3, 0], 0.7, 0.3, { seg: 20 });
  kit.cyl(M.steel, [0, 16.6, 0], 0.09, 2.5, { seg: 8 });
  kit.cyl(M.steel, [0, 17.2, 0], 0.3, 0.06, { seg: 12 });
  kit.sph(M.strobe, [0, 17.9, 0], 0.16, { ws: 8, hs: 6 });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    kit.beam(M.steel, [Math.cos(a) * 0.4, 15.4, Math.sin(a) * 0.4], [Math.cos(a) * 1.3, 15.9, Math.sin(a) * 1.3], 0.05);
    kit.sph(M.blink[i], [Math.cos(a) * 1.35, 15.93, Math.sin(a) * 1.35], 0.1, { ws: 6, hs: 4 });
  }
  for (const a of [0.6, 2.1, 3.8, 5.2]) {
    kit.box(M.hullDark, [Math.cos(a) * 6.2, 14.65, Math.sin(a) * 6.2], [1.2, 0.18, 0.7], [0, -a, 0]);
    kit.cyl(M.steel, [Math.cos(a) * 6.2, 14.92, Math.sin(a) * 6.2], 0.28, 0.12, { seg: 12 });
  }
}

function impulseDeck(kit, M, rng) {
  const y0 = saucerTopY(50);
  kit.sph(M.hullWarm, [0, y0 + 0.6, 51], 1, { ws: 40, hs: 20, s: [8.4, 3.0, 6.2] });
  kit.sph(M.hullWarm, [0, y0 + 1.6, 55.4], 1, { ws: 32, hs: 16, s: [7.0, 2.1, 3.4] });
  kit.sph(M.impulse, [0, y0 + 2.05, 58.2], 1, { ws: 28, hs: 14, s: [5.4, 1.15, 0.9] });
  kit.sph(M.impulse, [0, y0 + 2.05, 58.6], 1, { ws: 16, hs: 10, s: [3.2, 0.5, 0.6] });
  for (const sx of [-1, 1]) {
    kit.sph(M.impulse, [sx * 6.6, y0 + 1.5, 55.0], 0.9, { ws: 16, hs: 10, s: [1, 0.7, 1] });
    kit.torus(M.gold, [sx * 6.6, y0 + 1.5, 55.0], 1.0, 0.09, { rot: [Math.PI / 2, 0, 0], seg: 24 });
  }
  for (let i = -4; i <= 4; i++) kit.box(M.stripDark, [i * 1.15, y0 + 2.55, 56.4], [0.12, 0.05, 2.2], [0.25, 0, 0]);
  for (let i = 0; i < 9; i++) kit.box(M.hullBlack, [-4.2 + i * 1.05, y0 + 2.9, 52.5], [0.7, 0.05, 0.16]);
  kit.torus(M.steelDark, [0, y0 + 0.4, 50.4], 8.6, 0.08, { rot: [Math.PI / 2, 0, 0], seg: 60, ts: 6 });
}

function sensorDome(kit, M) {
  const dome = [[0, -11.78], [1.4, -11.7], [3.0, -11.4], [4.6, -10.75], [5.2, -10.1], [5.2, -9.72]];
  kit.geo(M.hullDark, latheGeo(dome, 64));
  kit.cyl(M.glass, [0, -11.55, 0], 2.6, 0.6, { seg: 48, rt: 1.3 });
  kit.sph(M.lampAmber, [0, -11.4, 0], 0.8, { ws: 20, hs: 12, s: [1, 0.55, 1] });
  kit.torus(M.gold, [0, -11.05, 0], 3.2, 0.09, { rot: [Math.PI / 2, 0, 0], seg: 64 });
  kit.torus(M.steel, [0, -10.4, 0], 4.8, 0.1, { rot: [Math.PI / 2, 0, 0], seg: 64 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    kit.box(M.steelDark, [Math.cos(a) * 3.9, -10.95, Math.sin(a) * 3.9], [0.5, 0.35, 0.9], [0, -a, 0]);
    kit.sph(M.lampBlue, [Math.cos(a) * 4.4, -10.7, Math.sin(a) * 4.4], 0.13, { ws: 6, hs: 4 });
  }
}

export function buildSaucer(kit, M) {
  const rng = makeRng(1701);
  kit.geo(M.hull, latheGeo(saucerProfile(), 192));

  // 边缘：护环、窗带
  kit.torus(M.hullDark, [0, 0.12, 0], 63.75, 0.2, { rot: [Math.PI / 2, 0, 0], seg: 288, ts: 8 });
  kit.torus(M.steel, [0, 1.26, 0], 63.05, 0.13, { rot: [Math.PI / 2, 0, 0], seg: 288, ts: 6 });
  kit.torus(M.steel, [0, -1.0, 0], 63.05, 0.13, { rot: [Math.PI / 2, 0, 0], seg: 288, ts: 6 });
  rimWindows(kit, M, rng);
  surfaceWindows(kit, M, rng, 1, 60.6, (2 * Math.PI) / 220, { h: 0.2 });
  surfaceWindows(kit, M, rng, 1, 59.3, (2 * Math.PI) / 200, { h: 0.2 });
  surfaceWindows(kit, M, rng, -1, 60.5, (2 * Math.PI) / 220, { h: 0.2 });
  surfaceWindows(kit, M, rng, -1, 59.2, (2 * Math.PI) / 200, { h: 0.2 });

  // 同心带：顶面
  for (const [r0, r1, m] of [[13.2, 13.5, M.stripDark], [21.0, 21.3, M.stripDark], [29.5, 29.85, M.stripDark], [38.0, 38.4, M.stripDark], [46.5, 46.9, M.stripDark], [55.5, 56.1, M.stripDark],
    [17, 17.16, M.stripLight], [25, 25.16, M.stripLight], [33.7, 33.86, M.stripLight], [42, 42.16, M.stripLight], [51, 51.16, M.stripLight], [57.6, 58.6, M.stripMid], [61.7, 62.1, M.stripDark]]) ringStrip(kit, m, r0, r1, 0.03, 1);
  ringStrip(kit, M.stripBlue, 43.2, 43.55, 0.035, 1);
  ringStrip(kit, M.stripRed, 34.6, 34.85, 0.035, 1);
  // 底面
  for (const [r0, r1, m] of [[11.5, 11.85, M.stripDark], [19, 19.35, M.stripDark], [27, 27.4, M.stripDark], [35, 35.45, M.stripDark], [43, 43.5, M.stripDark], [51, 51.6, M.stripDark],
    [15, 15.15, M.stripLight], [23, 23.15, M.stripLight], [31, 31.15, M.stripLight], [39, 39.15, M.stripLight], [47, 47.15, M.stripLight], [57.2, 58.2, M.stripMid], [61.5, 61.9, M.stripDark]]) ringStrip(kit, m, r0, r1, 0.03, -1);
  ringStrip(kit, M.stripGold, 6.6, 6.85, 0.04, -1);

  // 径向接缝
  radialSeams(kit, 1, 48, 13.5, 60.5, 0.02, M.stripDark);
  radialSeams(kit, 1, 16, 13.5, 60.5, 0.09, M.stripLight);
  radialSeams(kit, -1, 40, 12, 60.5, 0.05, M.stripDark);
  radialSeams(kit, -1, 8, 6.8, 60.5, 0.2, M.stripLight);

  // 甲板窗带（大型舷窗，参照 TOS 舰艏方向）
  for (const [r, side] of [[52.4, 1], [24, 1]]) {
    for (let k = 0; k < 14; k++) {
      const phi = (k / 14) * Math.PI * 2 + 0.11;
      arcStrip(kit, M.winWarm, side, r, phi, phi + 0.11, 0.32, 0.045, 0.03);
    }
  }
  for (let k = 0; k < 10; k++) {
    const phi = (k / 10) * Math.PI * 2 + 0.3;
    arcStrip(kit, M.winCool, -1, 36, phi, phi + 0.12, 0.3, 0.045, 0.03);
    arcStrip(kit, M.winWarm, -1, 27, phi + 0.2, phi + 0.29, 0.3, 0.045, 0.03);
  }

  // 附件
  greebles(kit, M, rng, 1, 170, 14, 57);
  greebles(kit, M, rng, -1, 130, 12, 57);
  for (let k = 0; k < 6; k++) phaserBank(kit, M, 1, 55.5, (k / 6) * Math.PI * 2 + 0.26);
  for (let k = 0; k < 4; k++) phaserBank(kit, M, -1, 54, (k / 4) * Math.PI * 2 + 0.78);
  for (let k = 0; k < 8; k++) { lifeboatHatch(kit, M, 1, 49.5, (k / 8) * Math.PI * 2 + 0.39); lifeboatHatch(kit, M, -1, 48, (k / 8) * Math.PI * 2); }

  bridgeModule(kit, M, rng);
  impulseDeck(kit, M, rng);
  sensorDome(kit, M);

  // 舷灯 / 频闪
  for (const [x, mat] of [[-1, M.navRed], [1, M.navGreen]]) {
    kit.sph(mat, [x * 63.9, 0.2, 0.2], 0.42, { ws: 12, hs: 8 });
  }
  kit.sph(M.strobe, [0, -11.9, 0], 0.22, { ws: 8, hs: 6 });
  kit.sph(M.lampWhite, [0, 5.6, 60.8], 0.2, { ws: 8, hs: 6 });

  // 编号与舰名
  registry(kit, M, 'NCC-1701', 1, 262 * D2R, 292 * D2R, 40, 49, [2048, 460]);
  registry(kit, M, 'NCC-1701', 1, 68 * D2R, 98 * D2R, 40, 49, [2048, 460]);
  registry(kit, M, 'U.S.S. ENTERPRISE', 1, -32 * D2R, 32 * D2R, 22.5, 26.5, [4096, 300]);
  registry(kit, M, 'NCC-1701', -1, 118 * D2R, 88 * D2R, 40, 49, [2048, 460]);
  registry(kit, M, 'NCC-1701', -1, 272 * D2R, 242 * D2R, 40, 49, [2048, 460]);
  registry(kit, M, 'U.S.S. ENTERPRISE', -1, 34 * D2R, -34 * D2R, 22.5, 26.5, [4096, 300]);
}
