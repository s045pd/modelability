import * as THREE from 'three';
import { parametricSurface, surfaceBand, mix, makeRng } from '../lib/geom.js';
import { windowBand, instancedFrom, scatterOnSurface, orientToNormal, greebleKit, InstanceBuilder } from '../lib/greeble.js';
import { materials } from '../materials/library.js';

const _p = new THREE.Vector3();

/** NACA 型翼剖面，v 绕剖面一周。 */
function airfoilPoint(v, chord, thick, blunt = 1.35) {
  const t = ((v % 1) + 1) % 1;
  const side = t < 0.5 ? 1 : -1;
  const x = t < 0.5 ? t * 2 : (1 - t) * 2;
  const xb = Math.pow(x, 1 / blunt);
  const yt = 5 * thick * (0.2969 * Math.sqrt(xb) - 0.126 * xb - 0.3516 * xb * xb + 0.2843 * xb ** 3 - 0.1015 * xb ** 4);
  return [(xb - 0.38) * chord, side * yt];
}

/** 连接碟部与次船体的背部支撑结构（颈部）。 */
export function neckSurface() {
  return (u, v) => {
    // u: 0 底部（次船体）→ 1 顶部（碟部）
    const y = mix(-34.5, -13.5, u);
    const zF = mix(30, 26, u);
    const zB = mix(-32, -62, u);
    const cz = (zF + zB) / 2;
    const hz = (zF - zB) / 2;
    const hw = mix(13.5, 11.0, u) * (1 - 0.12 * Math.sin(u * Math.PI));
    const [zc, xc] = airfoilPoint(v, hz * 2, hw / (hz * 2) * 2.0, 1.5);
    return _p.set(xc, y, cz + zc).clone();
  };
}

export function buildNeck() {
  const m = materials();
  const group = new THREE.Group();
  group.name = 'neck';
  const fn = neckSurface();
  const mesh = new THREE.Mesh(parametricSurface(fn, 48, 72, { uvScale: [0.6, 3.4] }), m.hullShell);
  mesh.name = 'neck-hull';
  group.add(mesh);

  // 侧面舷窗（多层甲板）
  const winGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const mats = [];
  for (const u of [0.18, 0.34, 0.50, 0.66, 0.82]) {
    for (const band of [[0.10, 0.40], [0.60, 0.90]]) {
      mats.push(...windowBand(fn, { rows: [u], perRow: 7, vRange: band, size: [2.0, 1.2], lift: 0.22, seed: 12 }));
    }
  }
  const win = instancedFrom(winGeo, m.window, mats, 'neck-windows');
  const rng = makeRng(88);
  const col = new THREE.Color();
  for (let i = 0; i < mats.length; i++) {
    col.setHSL(0.10, 0.45, rng() < 0.12 ? 0.05 : 0.55 + rng() * 0.3);
    win.setColorAt(i, col);
  }
  win.instanceColor.needsUpdate = true;
  group.add(win);

  // 前向光子鱼雷发射管（颈部前缘基部）
  const tube = new THREE.Mesh(new THREE.BoxGeometry(17, 5.5, 8), m.darkMetal);
  tube.position.set(0, -30, 26);
  group.add(tube);
  const muzzle = new THREE.Mesh(new THREE.PlaneGeometry(13, 3.2), new THREE.MeshBasicMaterial({ color: 0xff5522, toneMapped: false }));
  muzzle.position.set(0, -30, 30.2);
  group.add(muzzle);

  // greeble
  const kit = greebleKit();
  const builder = new InstanceBuilder();
  const mat4 = new THREE.Matrix4();
  for (const s of scatterOnSurface(fn, { uRange: [0.05, 0.95], uCount: 10, vCount: 20, jitter: 0.9, density: 0.5, seed: 61 })) {
    if (s.rand < 0.6) {
      orientToNormal(mat4, s.position, s.normal, new THREE.Vector3(2 + s.rand * 6, 0.3, 2 + s.rand * 4), s.rand * 6.28);
      builder.add('plate', kit.plate, m.hullDark, mat4);
    } else {
      orientToNormal(mat4, s.position, s.normal, new THREE.Vector3(1.2, 0.6, 1.2), 0);
      builder.add('hex', kit.hex, m.trim, mat4);
    }
  }
  builder.build(group);

  // 相位炮短列
  group.add(new THREE.Mesh(surfaceBand(fn, 0.62, 0.70, { vRange: [0.0, 1.0], lift: 0.25, vSegs: 60, uvScale: [1, 12] }), m.phaser));
  return { group, surface: fn };
}

const PYLON = {
  root: { x: 46, y: -26, z: -196, chord: 112, thick: 17 },
  tip: { x: 97, y: 48, z: -226, chord: 84, thick: 12 },
};

export function pylonSurface(sx) {
  return (u, v) => {
    // 稍带弧度的后掠：中段外飘
    const k = u;
    const bow = Math.sin(k * Math.PI) * 6;
    const x = sx * (mix(PYLON.root.x, PYLON.tip.x, k) + bow);
    const y = mix(PYLON.root.y, PYLON.tip.y, k) - Math.sin(k * Math.PI) * 3.5;
    const cz = mix(PYLON.root.z, PYLON.tip.z, k) - Math.sin(k * Math.PI) * 5;
    const chord = mix(PYLON.root.chord, PYLON.tip.chord, k);
    const thick = mix(PYLON.root.thick, PYLON.tip.thick, k);
    const [zc, xc] = airfoilPoint(v, chord, thick / chord * 2.0, 1.6);
    return _p.set(x + xc * sx, y, cz + zc).clone();
  };
}

export function buildPylons() {
  const m = materials();
  const group = new THREE.Group();
  group.name = 'pylons';
  const surfaces = [];
  for (const sx of [-1, 1]) {
    const fn = pylonSurface(sx);
    surfaces.push(fn);
    const mesh = new THREE.Mesh(parametricSurface(fn, 44, 56, { uvScale: [2.0, 5.0], flip: sx < 0 }), m.hullShell);
    mesh.name = `pylon-${sx > 0 ? 'stbd' : 'port'}`;
    group.add(mesh);

    // 前缘强化条
    group.add(new THREE.Mesh(
      surfaceBand(fn, 0.04, 0.96, { vRange: [0.985, 1.015], lift: 0.18, uSegs: 30, vSegs: 3, uvScale: [16, 1], flip: sx < 0 }),
      m.trim,
    ));

    // 等离子导管（沿挂架内侧的发光线）
    const conduitPts = [];
    for (let i = 0; i <= 28; i++) {
      const p = fn(i / 28, 0.08);
      conduitPts.push(p.clone().add(new THREE.Vector3(-sx * 0.35, 0, 0)));
    }
    const conduit = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(conduitPts), 40, 0.75, 8, false),
      m.lightBlue,
    );
    group.add(conduit);

    // 舷窗与 greeble
    const winGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    const mats = [];
    for (const u of [0.22, 0.42, 0.62]) {
      mats.push(...windowBand(fn, { rows: [u], perRow: 4, vRange: [0.12, 0.36], size: [2.0, 1.2], lift: 0.22, seed: 4, flip: sx < 0 }));
    }
    group.add(instancedFrom(winGeo, m.windowDim, mats, `pylon-windows-${sx}`));

    const kit = greebleKit();
    const builder = new InstanceBuilder();
    const mat4 = new THREE.Matrix4();
    for (const s of scatterOnSurface(fn, { uRange: [0.08, 0.92], uCount: 10, vCount: 16, jitter: 0.9, density: 0.42, seed: 71 + sx, flip: sx < 0 })) {
      orientToNormal(mat4, s.position, s.normal, new THREE.Vector3(2 + s.rand * 7, 0.3 + s.rand * 0.5, 2 + s.rand * 4), s.rand * 6.28);
      builder.add('plate', kit.plate, m.hullDark, mat4);
    }
    builder.build(group);
  }
  return { group, surfaces };
}
