import * as THREE from 'three';
import { latheGeo, loftGeo, superSection } from '../core/geom.js';
import { makeRng } from '../core/rng.js';
import { HY, SX, SY, Z_AFT, HULL_PROFILE, hullR, hullPoint } from './dims.js';

const D2R = Math.PI / 180;

function hullBand(kit, mat, z0, z1, off) {
  const n = Math.max(1, Math.ceil((z1 - z0) / 4));
  const pts = [];
  for (let i = 0; i <= n; i++) { const z = z0 + ((z1 - z0) * i) / n; pts.push([hullR(z) + off, z]); }
  kit.geo(mat, latheGeo(pts, 128), [0, HY, 0], [Math.PI / 2, 0, 0], [SX, 1, SY]);
}

function meridian(kit, mat, phi, z0, z1, width) {
  const n = Math.ceil((z1 - z0) / 7);
  for (let i = 0; i < n; i++) {
    const a = hullPoint(z0 + ((z1 - z0) * i) / n, phi, 0.03), b = hullPoint(z0 + ((z1 - z0) * (i + 1)) / n, phi, 0.03);
    kit.strut(mat, a.p, b.p, width, 0.03, a.n);
  }
}

function pushHull(kit, z, phi, lift = 0) {
  const h = hullPoint(z, phi, lift);
  kit.pushEuler(h.p, [0, 0, Math.atan2(-h.n[0], h.n[1])]);
}

function hullWindows(kit, M, rng) {
  const rows = [46, 57, 68, 79, 90, 101, 112, 124, 135, 146].map((d) => d * D2R);
  for (const side of [-1, 1]) {
    rows.forEach((phi0, ri) => {
      const phi = side * phi0;
      for (let z = 34; z < 120; z += 2.5) {
        const zi = Math.round(z / 2.5);
        if (zi % 7 === 0 || rng() < 0.16) continue;
        const a = hullPoint(z, phi, 0.05), b = hullPoint(z + 1.3, phi, 0.05);
        const c = rng();
        kit.strut(c < 0.7 ? M.winWarm : c < 0.9 ? M.winCool : M.winOff, a.p, b.p, 0.34, 0.03, a.n);
      }
    });
  }
}

function hullGreebles(kit, M, rng, count) {
  const mats = [M.hullDark, M.steel, M.steelDark, M.hullWarm, M.gold];
  for (let i = 0; i < count; i++) {
    const z = rng.range(38, 122), phi = rng.range(0, Math.PI * 2);
    pushHull(kit, z, phi);
    const k = rng();
    const m = rng.pick(mats);
    if (k < 0.5) kit.box(m, [0, 0.08, 0], [rng.range(0.5, 2.4), rng.range(0.1, 0.32), rng.range(0.5, 2.2)], [0, rng.range(-0.3, 0.3), 0]);
    else if (k < 0.8) kit.cyl(m, [0, 0.1, 0], rng.range(0.2, 0.8), rng.range(0.15, 0.4), { seg: 14 });
    else { kit.box(M.hullBlack, [0, 0.06, 0], [1.6, 0.1, 0.9]); for (let q = 0; q < 5; q++) kit.box(M.lampAmber, [-0.6 + q * 0.3, 0.13, 0], [0.12, 0.04, 0.5]); }
    kit.pop();
  }
}

function deflectorDish(kit, M) {
  const dish = HULL_PROFILE.slice(0, 4);
  kit.geo(M.copper, latheGeo(dish, 64), [0, HY, 0], [Math.PI / 2, 0, 0], [SX, 1, SY]);
  const ell = (mat, z, R, tube, seg = 64) => kit.geo(mat, new THREE.TorusGeometry(1, tube / R, 8, seg), [0, HY, z], [0, 0, 0], [SX * R, SY * R, R]);
  ell(M.gold, 22.15, 6.3, 0.28);
  ell(M.steelDark, 22.9, 8.2, 0.16);
  ell(M.gold, 23.5, 4.5, 0.11);
  ell(M.gold, 24.3, 2.5, 0.09);
  ell(M.lampBlue, 23.9, 3.4, 0.06);
  kit.sph(M.lampBlue, [0, HY, 24.6], 1.05, { ws: 24, hs: 14 });
  kit.cyl(M.steel, [0, HY, 23.3], 0.16, 3.0, { seg: 8, rot: [Math.PI / 2, 0, 0] });
  kit.sph(M.lampCyan, [0, HY, 21.6], 0.24, { ws: 10, hs: 6 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    kit.beam(M.gold, [Math.cos(a) * 0.9 * SX, HY + Math.sin(a) * 0.9 * SY, 24.6], [Math.cos(a) * 6.0 * SX, HY + Math.sin(a) * 6.0 * SY, 22.2], 0.09);
    kit.sph(M.lampBlue, [Math.cos(a + 0.26) * 3.9 * SX, HY + Math.sin(a + 0.26) * 3.9 * SY, 23.5], 0.14, { ws: 6, hs: 4 });
  }
}

function aftFace(kit, M) {
  const rx = 12.9 * SX, ry = 12.9 * SY;
  const shape = new THREE.Shape();
  shape.absellipse(0, 0, rx, ry, 0, Math.PI * 2, false, 0);
  const hole = new THREE.Path();
  const hx = 9.7, y0 = -4.35, y1 = 5.05;
  hole.moveTo(-hx, y0); hole.lineTo(-hx, y1); hole.lineTo(hx, y1); hole.lineTo(hx, y0); hole.lineTo(-hx, y0);
  shape.holes.push(hole);
  const g = new THREE.ShapeGeometry(shape, 64);
  kit.geo(M.hull, g, [0, HY, Z_AFT]);
  // 机库门框：向舱内凹入
  const cy = HY + (y0 + y1) / 2, hh = (y1 - y0) / 2;
  kit.box(M.steelDark, [0, HY + y1 + 0.3, Z_AFT - 0.5], [hx * 2 + 1.2, 0.6, 1.4]);
  kit.box(M.steelDark, [0, HY + y0 - 0.3, Z_AFT - 0.5], [hx * 2 + 1.2, 0.6, 1.4]);
  for (const sx of [-1, 1]) kit.box(M.steelDark, [sx * (hx + 0.3), cy, Z_AFT - 0.5], [0.6, hh * 2 + 1.2, 1.4]);
  // 警示条与引导灯
  for (let i = 0; i < 20; i++) {
    const x = -hx + 0.5 + i * ((hx * 2 - 1) / 19);
    kit.box(i % 2 ? M.hazard : M.rubber, [x, HY + y0 - 0.02, Z_AFT + 0.06], [0.9, 0.05, 0.6]);
    kit.box(M.lampAmber, [x, HY + y1 + 0.55, Z_AFT + 0.02], [0.35, 0.06, 0.06]);
  }
  for (const sx of [-1, 1]) for (let j = 0; j < 8; j++) kit.box(j % 2 ? M.lampGreen : M.lampRed, [sx * (hx + 0.75), HY + y0 + 0.6 + j * 1.15, Z_AFT + 0.02], [0.08, 0.3, 0.06]);
  // 装饰镶边
  const ring = new THREE.TorusGeometry(1, 0.16 / 12.5, 6, 72);
  kit.geo(M.stripGold, ring, [0, HY, Z_AFT + 0.02], [0, 0, 0], [SX * 12.5, SY * 12.5, 12.5]);
  // 力场
  const ff = new THREE.PlaneGeometry(hx * 2, y1 - y0);
  kit.geo(M.forcefield, ff, [0, cy, Z_AFT - 0.15], [0, Math.PI, 0]);
}

export function buildSecondary(kit, M) {
  const rng = makeRng(2023);
  kit.geo(M.hull, latheGeo(HULL_PROFILE.slice(3), 128), [0, HY, 0], [Math.PI / 2, 0, 0], [SX, 1, SY]);
  deflectorDish(kit, M);
  aftFace(kit, M);

  for (const z of [36, 50, 64, 78, 92, 106, 118]) { hullBand(kit, M.stripDark, z, z + 0.42, 0.03); hullBand(kit, M.stripLight, z + 0.9, z + 1.05, 0.03); }
  hullBand(kit, M.stripBlue, 43, 43.7, 0.035);
  hullBand(kit, M.stripRed, 99, 99.7, 0.035);
  hullBand(kit, M.stripGold, 30, 30.5, 0.035);
  for (let k = 0; k < 24; k++) meridian(kit, k % 3 === 0 ? M.stripLight : M.stripDark, (k / 24) * Math.PI * 2, 34, 124, k % 3 === 0 ? 0.08 : 0.06);
  hullWindows(kit, M, rng);
  hullGreebles(kit, M, rng, 190);

  // 龙骨灯带与传感器荚舱
  for (let z = 32; z < 126; z += 3.2) {
    const h = hullPoint(z, Math.PI, 0.04);
    kit.box(z % 6.4 < 3.2 ? M.lampCyan : M.lampWhite, [h.p[0], h.p[1], h.p[2]], [0.28, 0.05, 0.9]);
  }
  for (const z of [46, 70, 96]) {
    pushHull(kit, z, Math.PI);
    kit.cyl(M.steelDark, [0, 0.15, 0], 1.6, 0.6, { seg: 24 });
    kit.cyl(M.gold, [0, 0.42, 0], 1.25, 0.12, { seg: 24 });
    kit.cyl(M.lampAmber, [0, 0.5, 0], 0.4, 0.08, { seg: 12 });
    kit.pop();
  }
  // 顶面舱盖与舱段接缝
  for (const z of [56, 76, 96, 112]) {
    pushHull(kit, z, 0);
    kit.box(M.stripDark, [0, 0.04, 0], [5.4, 0.05, 3.2]);
    kit.box(M.hullWarm, [0, 0.08, 0], [5.0, 0.05, 2.8]);
    kit.box(M.stripDark, [0, 0.12, 0], [0.06, 0.04, 2.8]);
    kit.pop();
  }
  kit.sph(M.strobe, [0, HY - 13.1 * 1.0, 70], 0.2, { ws: 8, hs: 6 });
}

const NECK_SECTIONS = [
  { y: -3.0, zc: 34, hw: 13.5, hl: 27 },
  { y: -9.0, zc: 37, hw: 12.5, hl: 24 },
  { y: -15.0, zc: 42, hw: 10.5, hl: 21.5 },
  { y: -21.0, zc: 47, hw: 9.3, hl: 20 },
  { y: -27.0, zc: 53, hw: 9.6, hl: 21 },
  { y: -35.0, zc: 57, hw: 9.8, hl: 21.5 },
];

function neckAt(y) {
  const S = NECK_SECTIONS;
  for (let i = 1; i < S.length; i++) {
    if (y >= S[i].y) {
      const t = (y - S[i - 1].y) / (S[i].y - S[i - 1].y);
      const l = (k) => S[i - 1][k] + (S[i][k] - S[i - 1][k]) * t;
      return { zc: l('zc'), hw: l('hw'), hl: l('hl') };
    }
  }
  return S[S.length - 1];
}

export function buildNeck(kit, M) {
  const rng = makeRng(77);
  const secs = NECK_SECTIONS.map((s) => superSection(new THREE.Vector3(0, s.y, s.zc), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 1), s.hw, s.hl, 2.7, 56));
  kit.geo(M.hull, loftGeo(secs, { capStart: false, capEnd: false }));

  // 侧面舷窗与镶板
  for (const side of [-1, 1]) {
    for (let y = -11; y > -26; y -= 1.9) {
      const s = neckAt(y);
      for (let zz = -0.7; zz <= 0.7; zz += 0.11) {
        if (rng() < 0.2) continue;
        const z = s.zc + zz * s.hl;
        const xe = s.hw * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(zz), 2.7)), 1 / 2.7) + 0.06;
        const c = rng();
        kit.box(c < 0.7 ? M.winWarm : c < 0.9 ? M.winCool : M.winOff, [side * xe, y, z], [0.06, 0.26, 0.5]);
      }
    }
    for (const y of [-12.5, -17, -22]) {
      const s = neckAt(y);
      kit.box(M.stripDark, [side * (s.hw + 0.05), y, s.zc], [0.05, 0.14, s.hl * 1.5]);
    }
  }
  // 前后缘竖向缝线 / 前缘导流条
  for (const [zk, hk] of [[-1, 0], [1, 0]]) {
    for (let y = -10; y > -32; y -= 4) {
      const s = neckAt(y);
      kit.box(M.stripLight, [0, y, s.zc + zk * (s.hl + 0.04)], [s.hw * 0.7, 0.08, 0.05]);
    }
  }
  for (let i = 0; i < 26; i++) {
    const y = rng.range(-26, -10), s = neckAt(y), sd = rng() < 0.5 ? -1 : 1;
    const zz = rng.range(-0.5, 0.5);
    const xe = s.hw * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(zz), 2.7)), 1 / 2.7);
    kit.box(rng.pick([M.hullDark, M.steel, M.hullBlack]), [sd * (xe + 0.08), y, s.zc + zz * s.hl], [0.2, rng.range(0.3, 1.1), rng.range(0.6, 2.2)]);
  }
}
