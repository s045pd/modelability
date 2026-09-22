import * as THREE from 'three';
import {
  parametricSurface, profileCurve, surfaceBand, mergeAll, makeRng, mix,
} from '../lib/geom.js';
import { windowBand, instancedFrom, scatterOnSurface, orientToNormal, greebleKit, InstanceBuilder } from '../lib/greeble.js';
import { materials } from '../materials/library.js';
import { decalTexture } from '../materials/textures.js';

export const SAUCER = { cz: 118, rx: 232, rz: 207, topY: 27, botY: -21.2 };

const PROFILE = profileCurve([
  [0.000, 0.000, 27.0],
  [0.050, 0.115, 26.2],
  [0.120, 0.250, 24.6],
  [0.200, 0.395, 22.2],
  [0.280, 0.530, 19.0],
  [0.360, 0.665, 14.8],
  [0.420, 0.775, 10.6],
  [0.460, 0.870, 6.6],
  [0.490, 0.960, 2.6],
  [0.505, 1.000, -0.4],
  [0.520, 0.968, -3.4],
  [0.560, 0.885, -7.0],
  [0.620, 0.770, -11.0],
  [0.700, 0.620, -15.2],
  [0.800, 0.440, -18.6],
  [0.900, 0.250, -20.4],
  [0.960, 0.120, -21.0],
  [1.000, 0.000, -21.2],
]);

/** 平面轮廓修形：尾部收窄、舰首微尖。 */
function planScale(a) {
  const s = Math.sin(a);
  let k = 1;
  k -= 0.062 * Math.pow(Math.max(0, -s), 2.0);
  k += 0.014 * Math.pow(Math.max(0, s), 3);
  return k;
}

/** 由半径反查剖面参数 t，用于把平面贴花贴合到碟面上。 */
function buildInverse(t0, t1) {
  const N = 256;
  const rs = [];
  for (let i = 0; i <= N; i++) rs.push(PROFILE(mix(t0, t1, i / N)).r);
  const rising = rs[N] > rs[0];
  return (r) => {
    let lo = 0;
    let hi = N;
    while (hi - lo > 1) {
      const midI = (lo + hi) >> 1;
      const v = rs[midI];
      if (rising ? v < r : v > r) lo = midI; else hi = midI;
    }
    const a = rs[lo];
    const b = rs[hi];
    const k = Math.abs(b - a) < 1e-9 ? 0 : (r - a) / (b - a);
    return mix(t0, t1, (lo + k) / N);
  };
}
const INV_TOP = buildInverse(0, 0.505);
const INV_BOT = buildInverse(1, 0.505);

/** 碟部上下表面的高度场。 */
export function saucerHeight(x, z, top = true) {
  const dx = x / SAUCER.rx;
  const dz = (z - SAUCER.cz) / SAUCER.rz;
  const a = Math.atan2(dz, dx);
  const k = planScale(a);
  const rn = THREE.MathUtils.clamp(Math.hypot(dx, dz) / k, 0, 0.999);
  return PROFILE(top ? INV_TOP(rn) : INV_BOT(rn)).y;
}

const _p = new THREE.Vector3();
export function saucerSurface(inflate = 0) {
  // v 取负角方向，使 cross(dU,dV) 指向舰体外侧（法线必须朝外）
  // v=0 右舷(+X) · 0.25 舰尾(-Z) · 0.5 左舷(-X) · 0.75 舰首(+Z)
  return (u, v) => {
    const a = -v * Math.PI * 2;
    const { r, y } = PROFILE(u);
    const k = planScale(a) * (1 + inflate);
    return _p.set(
      SAUCER.rx * r * k * Math.cos(a),
      y * (1 + inflate * 0.6),
      SAUCER.cz + SAUCER.rz * r * k * Math.sin(a),
    ).clone();
  };
}

/** 舰桥模块（1 号甲板）与背脊上层建筑。 */
function bridgeModule(m) {
  const g = new THREE.Group();
  const base = SAUCER.topY - 0.6;

  const deck1 = profileCurve([
    [0.00, 17.5, 0.0],
    [0.18, 17.2, 1.6],
    [0.30, 16.0, 2.4],
    [0.46, 15.2, 3.2],
    [0.60, 14.0, 4.4],
    [0.78, 10.4, 6.6],
    [0.90, 6.2, 7.6],
    [1.00, 0.0, 8.3],
  ]);
  const domeFn = (u, v) => {
    const a = v * Math.PI * 2;
    const { r, y } = deck1(u);
    return _p.set(r * Math.cos(a) * 1.12, y, r * Math.sin(a)).clone();
  };
  const dome = new THREE.Mesh(parametricSurface(domeFn, 40, 72, { uvScale: [0.5, 2.4] }), m.hull);
  dome.name = 'bridge-dome';
  g.add(dome);

  // 舰桥外圈装甲环 + 传感器带
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(17.6, 1.0, 10, 64).rotateX(Math.PI / 2),
    m.trim,
  );
  ring.position.y = 0.9;
  g.add(ring);
  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(15.9, 16.6, 1.5, 64, 1, true),
    m.blackPanel,
  );
  band.position.y = 3.0;
  g.add(band);

  // 逃生舱阵列 + 顶灯
  const kit = greebleKit();
  const ib = new THREE.Matrix4();
  const builder = new InstanceBuilder();
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    const r = 16.4;
    ib.compose(
      new THREE.Vector3(Math.cos(a) * r * 1.1, 4.6, Math.sin(a) * r),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -a, 0)),
      new THREE.Vector3(2.2, 0.35, 1.3),
    );
    builder.add('b-pods', kit.plate, m.hullDark, ib);
  }
  builder.build(g);

  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.75, 12, 10), m.lightWhite);
  beacon.position.set(0, 8.9, 0);
  beacon.name = 'beacon:bridge';
  g.add(beacon);

  g.position.set(0, base, SAUCER.cz + 2);
  return g;
}

/** 背脊：从舰桥向尾部延伸的隆起结构，末端接主冲量引擎。 */
function dorsalSpine(m) {
  const fn = saucerSurface();
  const sections = [];
  const zs = [0.02, 0.10, 0.20, 0.30, 0.40, 0.50, 0.58];
  for (const t of zs) {
    // 沿 v=0.75（尾向）抬升一条脊
    const pAft = fn(0.14 + t * 0.30, 0.25);
    const halfW = mix(21, 34, t) * (1 - t * 0.25);
    const h = mix(5.2, 3.0, t);
    const pts = [];
    const N = 24;
    for (let i = 0; i < N; i++) {
      const ang = (i / N) * Math.PI * 2;
      const ex = Math.sign(Math.cos(ang)) * Math.pow(Math.abs(Math.cos(ang)), 0.55) * halfW;
      const ey = Math.sign(Math.sin(ang)) * Math.pow(Math.abs(Math.sin(ang)), 0.75) * h;
      pts.push([ex, ey]);
    }
    sections.push({ z: pAft.z, pts, offset: [0, pAft.y + h * 0.35] });
  }
  const geos = [];
  for (let i = 0; i < sections.length - 1; i++) {
    const a = sections[i];
    const b = sections[i + 1];
    const seg = new THREE.BufferGeometry();
    const pos = [];
    const idx = [];
    const n = a.pts.length;
    for (let j = 0; j < n; j++) {
      pos.push(a.pts[j][0] + a.offset[0], a.pts[j][1] + a.offset[1], a.z);
    }
    for (let j = 0; j < n; j++) {
      pos.push(b.pts[j][0] + b.offset[0], b.pts[j][1] + b.offset[1], b.z);
    }
    for (let j = 0; j < n; j++) {
      const j2 = (j + 1) % n;
      idx.push(j, j + n, j2, j2, j + n, j2 + n);
    }
    seg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    seg.setIndex(idx);
    seg.computeVertexNormals();
    const uv = new Float32Array((seg.getAttribute('position').count) * 2);
    for (let k = 0; k < uv.length / 2; k++) { uv[k * 2] = (k % n) / n * 3; uv[k * 2 + 1] = k < n ? 0 : 1; }
    seg.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geos.push(seg);
  }
  const mesh = new THREE.Mesh(mergeAll(geos), m.hull);
  mesh.name = 'dorsal-spine';
  return mesh;
}

/** 主冲量引擎（碟部尾部两组）。 */
function impulseEngines(m) {
  const g = new THREE.Group();
  for (const sx of [-1, 1]) {
    const unit = new THREE.Group();
    const housing = new THREE.Mesh(new THREE.BoxGeometry(36, 12, 16), m.hullDark);
    unit.add(housing);
    const bevel = new THREE.Mesh(new THREE.BoxGeometry(38, 4.4, 4), m.trim);
    bevel.position.set(0, 4.4, -7);
    unit.add(bevel);

    const grille = new THREE.Mesh(new THREE.PlaneGeometry(30, 8.4), m.impulse);
    grille.position.set(0, 0, -8.2);
    grille.rotation.y = Math.PI;
    grille.name = 'impulse-grille';
    unit.add(grille);
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(40, 15), new THREE.MeshBasicMaterial({
      color: 0xff7a33, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending,
      depthWrite: false, toneMapped: false,
    }));
    glow.position.set(0, 0, -9.4);
    glow.rotation.y = Math.PI;
    unit.add(glow);

    // 散热片
    for (let i = 0; i < 7; i++) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(1.1, 10.2, 13), m.darkMetal);
      fin.position.set(-14 + i * 4.7, 0.6, 1.5);
      unit.add(fin);
    }
    unit.position.set(sx * 38, 8.6, -30);
    unit.rotation.x = -0.34;
    g.add(unit);
  }
  g.name = 'impulse';
  return g;
}

/** 船长游艇 + 下部传感器阵列。 */
function ventralHardware(m) {
  const g = new THREE.Group();
  const yacht = new THREE.Mesh(
    new THREE.SphereGeometry(20, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    m.hull,
  );
  yacht.scale.set(1.35, 0.42, 2.1);
  yacht.rotation.x = Math.PI;
  yacht.position.set(0, -20.1, SAUCER.cz - 96);
  g.add(yacht);
  const yachtRim = new THREE.Mesh(new THREE.TorusGeometry(19, 0.7, 8, 48), m.trim);
  yachtRim.rotation.x = Math.PI / 2;
  yachtRim.scale.set(1.35, 2.1, 1);
  yachtRim.position.set(0, -19.6, SAUCER.cz - 96);
  g.add(yachtRim);

  const sensor = new THREE.Mesh(new THREE.SphereGeometry(13, 40, 22, 0, Math.PI * 2, 0, Math.PI / 2), m.trim);
  sensor.rotation.x = Math.PI;
  sensor.scale.set(1, 0.55, 1);
  sensor.position.set(0, -21.0, SAUCER.cz);
  g.add(sensor);
  const sensorLens = new THREE.Mesh(new THREE.SphereGeometry(6.2, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2), m.lightBlue);
  sensorLens.rotation.x = Math.PI;
  sensorLens.scale.set(1, 0.5, 1);
  sensorLens.position.set(0, -27.6, SAUCER.cz);
  g.add(sensorLens);
  return g;
}

/** 舷窗、逃生舱门、RCS、相位炮列、舷号涂装等表面细节。 */
function surfaceDetails(m) {
  const g = new THREE.Group();
  const fn = saucerSurface();
  const rng = makeRng(42);

  // —— 相位炮列（背腹各一条环带）
  for (const [u0, u1, nm] of [[0.401, 0.417, 'dorsal'], [0.593, 0.609, 'ventral']]) {
    const band = surfaceBand(fn, u0, u1, { lift: 0.35, vSegs: 220, uvScale: [1, 40] });
    const mesh = new THREE.Mesh(band, m.phaser);
    mesh.name = `phaser-${nm}`;
    g.add(mesh);
  }

  // —— 舷窗
  const winGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const skipAft = (v) => Math.abs(v - 0.25) < 0.055; // 冲量引擎区
  const rows = [
    { u: 0.438, n: 132, size: [2.0, 1.15] },
    { u: 0.470, n: 138, size: [2.0, 1.15] },
    { u: 0.502, n: 142, size: [2.2, 1.35] },
    { u: 0.534, n: 138, size: [2.0, 1.15] },
    { u: 0.566, n: 132, size: [2.0, 1.15] },
    { u: 0.352, n: 104, size: [2.3, 1.2] },
    { u: 0.655, n: 96, size: [2.2, 1.1] },
  ];
  const mats = [];
  for (const r of rows) {
    mats.push(...windowBand(fn, {
      rows: [r.u], perRow: r.n, size: r.size, lift: 0.22, skip: skipAft, seed: r.n,
    }));
  }
  const windows = instancedFrom(winGeo, m.window, mats, 'saucer-windows');
  const col = new THREE.Color();
  for (let i = 0; i < mats.length; i++) {
    const t = rng();
    if (t < 0.10) col.setRGB(0.04, 0.05, 0.07);
    else if (t < 0.22) col.setRGB(0.45, 0.62, 0.85);
    else col.setHSL(0.10 + rng() * 0.03, 0.5, 0.5 + rng() * 0.35);
    windows.setColorAt(i, col);
  }
  windows.instanceColor.needsUpdate = true;
  g.add(windows);

  // —— 逃生艇舱门（成排的圆角矩形浅浮雕）
  const podGeo = new THREE.BoxGeometry(1, 0.10, 1).translate(0, 0.05, 0);
  const podMats = [];
  for (const u of [0.318, 0.334, 0.676, 0.692]) {
    podMats.push(...windowBand(fn, {
      rows: [u], perRow: 112, size: [2.6, 1.5], lift: 0.02, seed: 3,
      skip: (v) => Math.abs(v - 0.25) < 0.07,
    }));
  }
  g.add(instancedFrom(podGeo, m.hull, podMats, 'lifeboats'));

  // —— RCS 姿态推进器四联组
  const rcsGeo = mergeAll([
    new THREE.BoxGeometry(4.6, 0.7, 3.2).translate(0, 0.35, 0),
    new THREE.BoxGeometry(1.7, 0.95, 1.2).translate(-1.1, 0.5, 0),
    new THREE.BoxGeometry(1.7, 0.95, 1.2).translate(1.1, 0.5, 0),
  ]);
  const rcsMats = [];
  for (const u of [0.455, 0.555]) {
    for (const v of [0.06, 0.19, 0.31, 0.44, 0.56, 0.69, 0.81, 0.94]) {
      rcsMats.push(...windowBand(fn, { rows: [u], perRow: 1, vRange: [v, v], size: [1, 1], lift: 0.05 }));
    }
  }
  g.add(instancedFrom(rcsGeo, m.trim, rcsMats, 'rcs'));

  // —— 表面 greeble：通讯阵列、散热板、传感器窗
  const kit = greebleKit();
  const builder = new InstanceBuilder();
  const mat4 = new THREE.Matrix4();
  const samples = scatterOnSurface(fn, {
    uRange: [0.08, 0.40], uCount: 7, vCount: 40, jitter: 0.95, density: 0.16, seed: 91,
  });
  for (const s of samples) {
    const kind = s.rand;
    if (kind < 0.55) {
      orientToNormal(mat4, s.position, s.normal, new THREE.Vector3(4 + s.rand * 10, 0.16, 3 + s.rand * 7), s.rand * 6.28);
      builder.add('plate', kit.plate, m.hull, mat4);
    } else if (kind < 0.74) {
      orientToNormal(mat4, s.position, s.normal, new THREE.Vector3(1.6, 0.4 + s.rand * 0.5, 1.6), s.rand * 6.28);
      builder.add('hex', kit.hex, m.trim, mat4);
    } else if (kind < 0.9) {
      orientToNormal(mat4, s.position, s.normal, new THREE.Vector3(5.2, 0.2, 1.4), s.rand * 6.28);
      builder.add('slab', kit.slab, m.hull, mat4);
    } else {
      orientToNormal(mat4, s.position, s.normal, new THREE.Vector3(1.4, 0.9, 1.4), 0);
      builder.add('dome', kit.dome, m.lightBlue, mat4);
    }
  }
  const ventral = scatterOnSurface(fn, {
    uRange: [0.62, 0.95], uCount: 8, vCount: 44, jitter: 0.9, density: 0.30, seed: 77,
  });
  for (const s of ventral) {
    if (s.rand < 0.62) {
      orientToNormal(mat4, s.position, s.normal, new THREE.Vector3(3 + s.rand * 9, 0.22, 2.4 + s.rand * 6), s.rand * 6.28);
      builder.add('plate', kit.plate, m.hull, mat4);
    } else {
      orientToNormal(mat4, s.position, s.normal, new THREE.Vector3(1.2, 0.5 + s.rand * 0.8, 1.2), 0);
      builder.add('cyl', kit.cyl, m.trim, mat4);
    }
  }
  builder.build(g);

  // —— 航行灯：红（左舷）绿（右舷）频闪 + 白色防撞灯
  const lightGeo = new THREE.SphereGeometry(1.15, 10, 8);
  const addBeacon = (u, v, mat, name) => {
    const p = fn(u, v);
    const mesh = new THREE.Mesh(lightGeo, mat);
    mesh.position.copy(p).multiplyScalar(1.002);
    mesh.position.y += 0.4;
    mesh.name = name;
    g.add(mesh);
  };
  addBeacon(0.495, 0.5, m.lightRed, 'beacon:strobe');
  addBeacon(0.495, 0.0, m.lightGreen, 'beacon:strobe');
  addBeacon(0.44, 0.75, m.lightWhite, 'beacon:strobe');
  addBeacon(0.56, 0.75, m.lightWhite, 'beacon:strobe');
  addBeacon(0.44, 0.25, m.lightWhite, 'beacon:strobe');

  return g;
}

/** 贴合碟面曲率的涂装贴花（平面投影会穿模，必须按高度场蒙皮）。 */
function conformingDecal(texture, {
  cx = 0, cz = 0, w = 100, h = 20, top = true, lift = 0.5,
  color = 0x8b929f, opacity = 0.82, rotate = 0, flipU = false,
}) {
  const segs = 28;
  const geo = new THREE.PlaneGeometry(w, h, segs, segs);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  const cr = Math.cos(rotate);
  const sr = Math.sin(rotate);
  if (flipU) for (let i = 0; i < uv.count; i++) uv.setX(i, 1 - uv.getX(i));
  for (let i = 0; i < pos.count; i++) {
    const lx = pos.getX(i);
    const ly = pos.getY(i);
    const X = cx + lx * cr - ly * sr;
    const Z = cz + lx * sr + ly * cr;
    const Y = saucerHeight(X, Z, top) + (top ? lift : -lift);
    pos.setXYZ(i, X, Y, Z);
  }
  geo.computeVertexNormals();
  geo.setAttribute('uv', uv);
  const mat = new THREE.MeshBasicMaterial({
    map: texture, transparent: true, depthWrite: false, opacity,
    color, toneMapped: false, side: THREE.DoubleSide,
    polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6,
  });
  return new THREE.Mesh(geo, mat);
}

function named(n, o) { o.name = n; return o; }

function markings() {
  const g = new THREE.Group();
  g.name = 'markings';
  const nameTex = decalTexture(['U.S.S. ENTERPRISE'], { w: 2048, h: 256, color: '#ffffff' });
  const regTex = decalTexture(['NCC-1701-D'], { w: 1024, h: 256, color: '#ffffff' });

  // 背面：舰名在前，舷号在后
  g.add(named('decal:top-name', conformingDecal(nameTex, { cx: 0, cz: SAUCER.cz + 96, w: 168, h: 21, top: true, flipU: true })));
  g.add(named('decal:top-reg', conformingDecal(regTex, { cx: 0, cz: SAUCER.cz + 62, w: 104, h: 26, top: true, flipU: true })));
  // 腹面：大号舷号
  g.add(named('decal:bot-reg', conformingDecal(regTex, { cx: 0, cz: SAUCER.cz - 30, w: 170, h: 42, top: false })));
  g.add(named('decal:bot-name', conformingDecal(nameTex, { cx: 0, cz: SAUCER.cz + 82, w: 150, h: 19, top: false })));
  return g;
}

export function buildSaucer() {
  const m = materials();
  const group = new THREE.Group();
  group.name = 'saucer';

  const fn = saucerSurface();
  const hullGeo = parametricSurface(fn, 120, 220, { uvScale: [11, 30] });
  const hull = new THREE.Mesh(hullGeo, m.hullShell);
  hull.name = 'saucer-hull';
  group.add(hull);

  group.add(bridgeModule(m));
  group.add(dorsalSpine(m));
  group.add(impulseEngines(m));
  group.add(ventralHardware(m));
  group.add(surfaceDetails(m));
  group.add(markings());

  return { group, surface: fn };
}
