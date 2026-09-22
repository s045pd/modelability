import * as THREE from 'three';
import { makeRng } from '../core/rng.js';
import { makeScreenTexture, makeSignTexture, drawScreen } from '../core/textures.js';

const PALETTE = [[3.2, 0.35, 0.2], [0.3, 2.8, 0.6], [3.2, 2.3, 0.3], [0.5, 1.5, 3.4], [3, 3, 3], [2.6, 0.6, 3.0], [0.3, 2.6, 2.8]];
const rng = makeRng(4242);

const screenMats = new Map();
const screenList = [];
let rr = 0;
export function updateScreens(t, count = 5) {
  const list = screenList;
  if (!list.length) return;
  for (let i = 0; i < count; i++) {
    rr = (rr + 1) % list.length;
    const tex = list[rr].map;
    const u = tex.userData;
    drawScreen(u.ctx, u.w, u.h, u.kind, u.seed, t + u.seed * 1.7);
    tex.needsUpdate = true;
  }
}
export function screenMat(kind, seed = 1, glow = 1.5) {
  const k = `${kind}${seed}${glow}`;
  let m = screenMats.get(k);
  if (!m) {
    m = new THREE.MeshBasicMaterial({ map: makeScreenTexture(kind, seed) });
    m.color.setRGB(glow, glow, glow);
    m.userData.noShadow = true;
    screenMats.set(k, m);
    screenList.push(m);
  }
  return m;
}

const signMats = new Map();
export function signMat(lines, opts) {
  const k = lines.join('|') + JSON.stringify(opts || {});
  let m = signMats.get(k);
  if (!m) {
    m = new THREE.MeshBasicMaterial({ map: makeSignTexture(lines, opts) });
    m.color.setRGB(1.25, 1.25, 1.25);
    m.userData.noShadow = true;
    signMats.set(k, m);
  }
  return m;
}

export function screen(kit, kind, seed, p, size, rotX = 0, rotY = 0, frame = true) {
  const [w, h] = size;
  if (frame) kit.box(kit.M.consoleDark, [p[0], p[1], p[2] - 0.012], [w + 0.08, h + 0.08, 0.03], [rotX, rotY, 0]);
  kit.pushEuler(p, [rotX, rotY, 0, 'YXZ']);
  kit.plane(screenMat(kind, seed), [0, 0, 0.006], [w, h]);
  kit.pop();
}

export function sign(kit, lines, p, rotY = 0, size = [0.9, 0.28], opts) {
  kit.pushEuler(p, [0, rotY, 0]);
  kit.plane(signMat(lines, opts), [0, 0, 0.012], size);
  kit.box(kit.M.consoleDark, [0, 0, 0], [size[0] + 0.05, size[1] + 0.05, 0.02]);
  kit.pop();
}

// 按钮阵列（贴在局部 XZ 平面上；调用方负责 push 倾斜）
export function buttonField(kit, w, d, { density = 0.6, step = 0.1, size = 0.055, y = 0.02 } = {}) {
  const M = kit.M;
  const nx = Math.floor(w / step), nz = Math.floor(d / step);
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    if (rng() > density) continue;
    const c = PALETTE[Math.floor(rng() * PALETTE.length)];
    const k = 0.35 + rng() * 0.9;
    const x = -w / 2 + (i + 0.5) * (w / nx), z = -d / 2 + (j + 0.5) * (d / nz);
    kit.box(M.lampVC, [x, y, z], [size, 0.03, size * (rng() < 0.3 ? 2.1 : 1)], null, [c[0] * k, c[1] * k, c[2] * k]);
  }
  for (let i = 0; i < Math.floor(nx / 4); i++) {
    const x = -w / 2 + (i + 0.5) * (w / Math.floor(nx / 4)), z = d * 0.3;
    kit.cyl(M.steel, [x, y + 0.015, z], 0.03, 0.05, { seg: 10 });
  }
}

// 通用控制台：前侧朝 +z
export function consoleUnit(kit, o = {}) {
  const M = kit.M;
  const { x = 0, z = 0, rot = 0, w = 1.6, d = 0.8, screens = 1, kinds = ['scope', 'bars', 'chart', 'text', 'ship'], mat = M.console, top = M.consoleBlue, tilt = 0.38, density = 0.65, seed = 1, height = 0.88, hood = false } = o;
  kit.push(x, 0, z, rot);
  kit.solid(mat, [0, height / 2 - 0.02, 0], [w, height - 0.04, d]);
  kit.box(M.consoleDark, [0, 0.06, d / 2 - 0.02], [w - 0.1, 0.12, 0.05]);
  kit.box(M.consoleDark, [0, height + 0.01, 0], [w + 0.05, 0.05, d + 0.05]);
  kit.pushEuler([0, height + 0.07, 0.03], [tilt, 0, 0]);
  kit.box(top, [0, 0, 0], [w - 0.06, 0.04, d * 0.86]);
  buttonField(kit, w - 0.2, d * 0.7, { density, y: 0.04 });
  kit.pop();
  kit.box(M.lampWarm, [0, height - 0.04, d / 2 + 0.005], [w * 0.6, 0.02, 0.01]);
  if (hood) {
    kit.cyl(M.consoleDark, [0, height + 0.5, -0.05], 0.36, 0.6, { seg: 20, rt: 0.3 });
    kit.cyl(M.lampCyan, [0, height + 0.2, 0.16], 0.12, 0.03, { seg: 12, rot: [Math.PI / 2, 0, 0] });
  } else {
    const n = screens, sw = Math.min(0.62, (w - 0.15) / n - 0.06);
    for (let i = 0; i < n; i++) {
      const sx = (i - (n - 1) / 2) * (sw + 0.08);
      screen(kit, kinds[(seed + i) % kinds.length], seed + i, [sx, height + 0.42, -d / 2 + 0.12], [sw, sw * 0.62], -0.28);
      kit.box(M.consoleDark, [sx, height + 0.16, -d / 2 + 0.07], [0.05, 0.32, 0.05]);
    }
  }
  kit.pop();
}

export function chair(kit, x, z, rot = 0, mat = null, kind = 'swivel') {
  const M = kit.M;
  mat = mat || M.chairOrange;
  kit.push(x, 0, z, rot);
  if (kind === 'stool') {
    kit.cyl(M.steelDark, [0, 0.3, 0], 0.05, 0.6, { seg: 8 });
    kit.cyl(mat, [0, 0.62, 0], 0.22, 0.09, { seg: 16 });
    kit.cyl(M.steelDark, [0, 0.03, 0], 0.22, 0.05, { seg: 16 });
  } else {
    kit.cyl(M.steelDark, [0, 0.22, 0], 0.04, 0.44, { seg: 8 });
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; kit.beam(M.steelDark, [0, 0.05, 0], [Math.sin(a) * 0.26, 0.04, Math.cos(a) * 0.26], 0.018); }
    kit.box(mat, [0, 0.47, 0.02], [0.46, 0.1, 0.46]);
    kit.box(mat, [0, 0.82, -0.2], [0.44, 0.52, 0.08], [-0.1, 0, 0]);
    if (kind === 'arm') for (const s of [-1, 1]) { kit.box(M.consoleDark, [s * 0.26, 0.66, 0.0], [0.05, 0.05, 0.36]); kit.box(M.consoleDark, [s * 0.26, 0.56, -0.12], [0.04, 0.2, 0.04]); }
  }
  kit.push(0, 0, 0, 0); kit.wall(0, 0, 0.24, 0.24, 0, 0.9); kit.pop();
  kit.pop();
}

export function captainChair(kit, x, z, rot = 0) {
  const M = kit.M;
  kit.push(x, 0, z, rot);
  kit.cyl(M.steelDark, [0, 0.2, 0], 0.32, 0.4, { seg: 24, rt: 0.2 });
  kit.cyl(M.steel, [0, 0.42, 0], 0.36, 0.05, { seg: 24 });
  kit.box(M.chairGold, [0, 0.56, 0.02], [0.66, 0.2, 0.62]);
  kit.box(M.chairGold, [0, 0.98, -0.28], [0.62, 0.72, 0.14], [-0.12, 0, 0]);
  for (const s of [-1, 1]) {
    kit.box(M.chairGold, [s * 0.4, 0.76, 0.0], [0.12, 0.14, 0.6]);
    kit.pushEuler([s * 0.4, 0.84, 0.05], [0.15, 0, 0]);
    kit.box(M.consoleDark, [0, 0, 0], [0.13, 0.03, 0.42]);
    buttonField(kit, 0.1, 0.36, { density: 0.9, step: 0.06, size: 0.035, y: 0.02 });
    kit.pop();
    kit.box(M.steel, [s * 0.4, 0.66, -0.2], [0.05, 0.22, 0.05]);
  }
  kit.push(0, 0, 0, 0); kit.wall(0, 0, 0.42, 0.4, 0, 1.2); kit.pop();
  kit.pop();
}

export function table(kit, x, z, w, d, rot = 0, { h = 0.76, mat = null, leg = 'pedestal', round = false, topMat = null } = {}) {
  const M = kit.M;
  mat = mat || M.woodLight;
  kit.push(x, 0, z, rot);
  if (round) {
    kit.cyl(topMat || mat, [0, h, 0], w / 2, 0.05, { seg: 32 });
    kit.cyl(M.steelDark, [0, h / 2, 0], 0.07, h, { seg: 10 });
    kit.cyl(M.steelDark, [0, 0.03, 0], w * 0.25, 0.05, { seg: 20 });
    kit.push(0, 0, 0, 0); kit.wall(0, 0, w / 2, w / 2, 0, h + 0.03); kit.pop();
  } else {
    kit.box(topMat || mat, [0, h, 0], [w, 0.05, d]);
    if (leg === 'pedestal') {
      for (const s of [-1, 1]) { kit.box(M.steelDark, [s * (w / 2 - 0.25), h / 2, 0], [0.08, h, d * 0.7]); kit.box(M.steelDark, [s * (w / 2 - 0.25), 0.03, 0], [0.4, 0.05, d * 0.8]); }
    } else {
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) kit.box(M.steelDark, [sx * (w / 2 - 0.08), h / 2, sz * (d / 2 - 0.08)], [0.06, h, 0.06]);
    }
    kit.push(0, 0, 0, 0); kit.wall(0, 0, w / 2, d / 2, 0, h + 0.03); kit.pop();
  }
  kit.pop();
}

export function ceilLight(kit, x, z, w, d, y, mat = null) {
  const M = kit.M;
  kit.box(M.steelDark, [x, y - 0.015, z], [w + 0.1, 0.03, d + 0.1]);
  kit.box(mat || M.panel, [x, y - 0.04, z], [w, 0.03, d]);
}

export function pipe(kit, a, b, r = 0.06, mat = null) {
  kit.beam(mat || kit.M.tube, a, b, r, { seg: 8 });
}

export function vent(kit, x, y, z, rot, w = 0.7, h = 0.4) {
  const M = kit.M;
  kit.push(x, y, z, rot);
  kit.box(M.steelDark, [0, 0, 0], [w + 0.08, h + 0.08, 0.04]);
  for (let i = 0; i < Math.floor(h / 0.06); i++) kit.box(M.rubber, [0, -h / 2 + 0.04 + i * 0.06, 0.02], [w, 0.03, 0.02]);
  kit.pop();
}

export function locker(kit, x, z, rot, w = 0.9, h = 2.1, d = 0.55, mat = null) {
  const M = kit.M;
  kit.push(x, 0, z, rot);
  kit.solid(mat || M.plasticGrey, [0, h / 2, 0], [w, h, d]);
  const n = Math.max(1, Math.round(w / 0.45));
  for (let i = 1; i < n; i++) kit.box(M.consoleDark, [-w / 2 + (w / n) * i, h / 2, d / 2 + 0.005], [0.02, h - 0.1, 0.01]);
  for (let i = 0; i < n; i++) {
    const cx = -w / 2 + (w / n) * (i + 0.5);
    kit.box(M.steel, [cx + 0.12, h * 0.55, d / 2 + 0.02], [0.03, 0.16, 0.03]);
    vent(kit, cx, h * 0.85, d / 2 + 0.005, 0, w / n * 0.6, 0.12);
  }
  kit.pop();
}

export function plant(kit, x, z, s = 1) {
  const M = kit.M;
  kit.push(x, 0, z, 0);
  kit.cyl(M.consoleDark, [0, 0.25 * s, 0], 0.26 * s, 0.5 * s, { seg: 14, rt: 0.32 * s });
  kit.cyl(M.soil, [0, 0.49 * s, 0], 0.28 * s, 0.04, { seg: 14 });
  for (let i = 0; i < 9; i++) {
    const a = rng() * Math.PI * 2, r = rng() * 0.16 * s, hgt = (0.5 + rng() * 0.9) * s;
    kit.beam(M.leaf, [Math.cos(a) * r, 0.5 * s, Math.sin(a) * r], [Math.cos(a) * (r + 0.2 * s), 0.5 * s + hgt, Math.sin(a) * (r + 0.2 * s)], 0.02 * s, { seg: 4 });
    kit.sph(M.leaf, [Math.cos(a) * (r + 0.2 * s), 0.5 * s + hgt, Math.sin(a) * (r + 0.2 * s)], 0.14 * s, { ws: 8, hs: 6, s: [1, 0.5, 1] });
  }
  kit.push(0, 0, 0, 0); kit.wall(0, 0, 0.28 * s, 0.28 * s, 0, 1); kit.pop();
  kit.pop();
}

// 观察窗（用天空立方体）
export function viewport(kit, p, size, rotY = 0) {
  const M = kit.M;
  kit.pushEuler(p, [0, rotY, 0]);
  kit.box(M.steelDark, [0, 0, -0.03], [size[0] + 0.3, size[1] + 0.3, 0.1]);
  kit.plane(M.space, [0, 0, 0.03], size);
  kit.box(M.steelDark, [0, size[1] / 2 + 0.07, 0.04], [size[0] + 0.3, 0.14, 0.14]);
  kit.box(M.steelDark, [0, -size[1] / 2 - 0.07, 0.04], [size[0] + 0.3, 0.14, 0.14]);
  for (const s of [-1, 1]) kit.box(M.steelDark, [s * (size[0] / 2 + 0.07), 0, 0.04], [0.14, size[1] + 0.3, 0.14]);
  const n = Math.max(0, Math.floor(size[0] / 2.4));
  for (let i = 1; i <= n; i++) kit.box(M.steelDark, [-size[0] / 2 + (size[0] / (n + 1)) * i, 0, 0.04], [0.1, size[1], 0.1]);
  kit.pop();
}

export function wallScreen(kit, kind, seed, x, y, z, rot, w = 0.9, h = 0.55) {
  kit.push(x, y, z, rot);
  screen(kit, kind, seed, [0, 0, 0.03], [w, h]);
  kit.box(kit.M.consoleDark, [0, 0, 0.005], [w + 0.14, h + 0.14, 0.05]);
  kit.pop();
}

// 应急/维护面板
export function wallPanel(kit, x, y, z, rot, type = 'buttons') {
  const M = kit.M;
  kit.push(x, y, z, rot);
  if (type === 'locker') {
    kit.box(M.consoleRed, [0, 0, 0.04], [0.5, 0.7, 0.08]);
    kit.box(M.plastic, [0, 0.05, 0.09], [0.12, 0.34, 0.02]);
    kit.box(M.plastic, [0, 0.05, 0.09], [0.34, 0.12, 0.02]);
    kit.box(M.steel, [0, -0.27, 0.09], [0.3, 0.05, 0.02]);
  } else if (type === 'vent') {
    vent(kit, 0, 0, 0.03, 0, 0.7, 0.5);
  } else if (type === 'hatch') {
    kit.box(M.steelDark, [0, 0, 0.03], [0.9, 0.9, 0.06]);
    kit.box(M.plasticGrey, [0, 0, 0.07], [0.8, 0.8, 0.03]);
    kit.box(M.hazard, [0, 0.38, 0.09], [0.8, 0.05, 0.01]);
    kit.box(M.hazard, [0, -0.38, 0.09], [0.8, 0.05, 0.01]);
    kit.box(M.steel, [0.28, 0, 0.1], [0.06, 0.24, 0.03]);
    kit.box(M.lampAmber, [-0.3, 0.3, 0.1], [0.06, 0.06, 0.02]);
  } else {
    kit.box(M.consoleDark, [0, 0, 0.03], [0.55, 0.5, 0.06]);
    kit.pushEuler([0, -0.06, 0.07], [-Math.PI / 2, 0, 0]);
    buttonField(kit, 0.42, 0.26, { density: 0.7, step: 0.075, size: 0.04, y: 0 });
    kit.pop();
    screen(kit, 'text', 5, [0, 0.14, 0.075], [0.4, 0.16], 0, 0, false);
  }
  kit.pop();
}

export function bench(kit, x, z, rot, len = 2.0, mat = null) {
  const M = kit.M;
  kit.push(x, 0, z, rot);
  kit.solid(mat || M.fabricBlue, [0, 0.24, 0], [len, 0.48, 0.5]);
  kit.box(mat || M.fabricBlue, [0, 0.64, -0.22], [len, 0.5, 0.1]);
  kit.box(M.steelDark, [0, 0.02, 0], [len - 0.1, 0.04, 0.44]);
  kit.pop();
}

export function bookshelf(kit, x, z, rot, w = 1.6, h = 2.0, d = 0.32) {
  const M = kit.M;
  kit.push(x, 0, z, rot);
  kit.solid(M.wood, [0, h / 2, 0], [w, h, d]);
  const rows = 5;
  for (let r = 0; r < rows; r++) {
    const y = 0.25 + r * ((h - 0.35) / rows);
    kit.box(M.consoleDark, [0, y, d / 2 - 0.02], [w - 0.08, 0.03, 0.04]);
    let cx = -w / 2 + 0.08;
    while (cx < w / 2 - 0.12) {
      const bw = 0.03 + rng() * 0.05, bh = 0.16 + rng() * 0.12;
      const c = [M.consoleRed, M.consoleBlue, M.consoleGold, M.chairBlue, M.leather, M.plastic][Math.floor(rng() * 6)];
      kit.box(c, [cx + bw / 2, y + bh / 2 + 0.02, d / 2 - 0.05], [bw, bh, 0.2]);
      cx += bw + 0.005;
    }
  }
  kit.pop();
}
