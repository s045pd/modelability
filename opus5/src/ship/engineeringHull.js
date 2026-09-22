import * as THREE from 'three';
import { parametricSurface, surfaceBand, makeRng, mix } from '../lib/geom.js';
import { windowBand, instancedFrom, scatterOnSurface, orientToNormal, greebleKit, InstanceBuilder } from '../lib/greeble.js';
import { materials, deflectorMaterial, forceFieldMaterial } from '../materials/library.js';
import { decalTexture } from '../materials/textures.js';

/** [z, 半宽, 顶部y, 底部y, 截面指数] —— 次船体纵向控制剖面。 */
const SECTIONS = [
  [34, 15, -47, -61, 2.4],
  [22, 26, -41, -71, 2.6],
  [0, 38, -34, -81, 2.8],
  [-40, 47, -30, -90, 3.0],
  [-90, 53, -28, -96, 3.1],
  [-140, 56, -27, -99, 3.1],
  [-190, 56, -28, -99, 3.0],
  [-235, 53, -30, -95, 3.0],
  [-270, 50, -33, -90, 2.9],
  [-296, 46, -36, -84, 2.8],
  [-312, 40, -40, -78, 2.6],
  [-321, 34, -44, -74, 2.5],
];

export const ENG = {
  front: SECTIONS[0][0],
  back: SECTIONS[SECTIONS.length - 1][0],
  deflectorZ: 30,
  bayZ: -300,
};

function sectionAt(u) {
  const f = THREE.MathUtils.clamp(u, 0, 1) * (SECTIONS.length - 1);
  const i = Math.min(Math.floor(f), SECTIONS.length - 2);
  const t = f - i;
  const a = SECTIONS[i];
  const b = SECTIONS[i + 1];
  return {
    z: mix(a[0], b[0], t),
    w: mix(a[1], b[1], t),
    top: mix(a[2], b[2], t),
    bot: mix(a[3], b[3], t),
    e: mix(a[4], b[4], t),
  };
}

const _p = new THREE.Vector3();
export function engineeringSurface() {
  return (u, v) => {
    const s = sectionAt(u);
    const a = v * Math.PI * 2;
    const cy = (s.top + s.bot) / 2;
    const hy = (s.top - s.bot) / 2;
    const ct = Math.cos(a);
    const st = Math.sin(a);
    const ex = Math.sign(ct) * Math.pow(Math.abs(ct), 2 / s.e) * s.w;
    // 顶面更平（肩部），底面略带龙骨
    const shape = st >= 0 ? Math.pow(Math.abs(st), 2 / (s.e * 1.15)) : -Math.pow(Math.abs(st), 2 / (s.e * 0.85));
    return _p.set(ex, cy + shape * hy, s.z).clone();
  };
}

/** 主偏导盘组件。 */
function deflector(m) {
  const g = new THREE.Group();
  const z = 33;
  const housing = new THREE.Mesh(
    new THREE.CylinderGeometry(19, 22, 14, 48, 1, true).rotateX(Math.PI / 2),
    m.hullDark,
  );
  housing.position.set(0, -54, z - 5);
  g.add(housing);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(19.5, 2.2, 12, 56), m.trim);
  ring.position.set(0, -54, z + 1.4);
  g.add(ring);

  const dishMat = deflectorMaterial();
  const dish = new THREE.Mesh(new THREE.SphereGeometry(19, 48, 24, 0, Math.PI * 2, 0, Math.PI * 0.32), dishMat);
  dish.rotation.x = Math.PI / 2;
  dish.position.set(0, -54, z - 1.5);
  dish.name = 'deflector-dish';
  g.add(dish);

  const emitter = new THREE.Mesh(new THREE.SphereGeometry(4.2, 24, 16), m.lightBlue);
  emitter.position.set(0, -54, z + 3.2);
  g.add(emitter);

  const glow = new THREE.PointLight(0x7fb6ff, 260, 130, 2);
  glow.position.set(0, -54, z + 10);
  g.add(glow);

  // 环形加强肋与导波管
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const rib = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.2, 13), m.trim);
    rib.position.set(Math.cos(a) * 21, -54 + Math.sin(a) * 21, z - 6);
    rib.lookAt(0, -54, z - 6);
    g.add(rib);
  }
  return g;
}

/** 主穿梭机舱（2/3 号舱）外部舱门与力场。 */
function shuttlebayExterior(m) {
  const g = new THREE.Group();
  const z = -320.2;
  // 门框必须是四条边，实心板会把机库内部朝星空的视线整个挡死
  const frameBars = [
    [0, -48.4, 44, 3.2],
    [0, -69.6, 44, 3.2],
    [-19.4, -59, 3.2, 24],
    [19.4, -59, 3.2, 24],
  ];
  for (const [fx, fy, fw, fh] of frameBars) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, 6), m.hullDark);
    bar.position.set(fx, fy, z + 3.4);
    g.add(bar);
  }
  // 舱口保持通透：舱内可直接望见星空，只留边框与力场
  const field = new THREE.Mesh(new THREE.PlaneGeometry(36, 20), forceFieldMaterial());
  field.position.set(0, -59, z + 0.6);
  field.rotation.y = Math.PI;
  field.name = 'bay-field';
  g.add(field);
  // 引导灯
  for (let i = 0; i < 12; i++) {
    const t = i / 11;
    for (const sx of [-1, 1]) {
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.7, 0.5), m.lightWhite);
      lamp.position.set(sx * 18.6, -68.6 + t * 19.2, z + 1.4);
      g.add(lamp);
    }
  }
  const lightIn = new THREE.PointLight(0xa8ccff, 900, 150, 2);
  lightIn.position.set(0, -59, z + 20);
  g.add(lightIn);
  return g;
}

/** 尾部冲量引擎与推进器组。 */
function aftDrive(m) {
  const g = new THREE.Group();
  for (const sx of [-1, 1]) {
    const housing = new THREE.Mesh(new THREE.BoxGeometry(20, 10, 12), m.hullDark);
    housing.position.set(sx * 27, -44, -308);
    g.add(housing);
    const grille = new THREE.Mesh(new THREE.PlaneGeometry(16, 7), m.impulse);
    grille.position.set(sx * 27, -44, -314.4);
    grille.rotation.y = Math.PI;
    g.add(grille);
  }
  return g;
}

/** 船体表面：舷窗、救生艇、相位炮、牵引光束、greeble。 */
function surfaceDetails(m) {
  const g = new THREE.Group();
  const fn = engineeringSurface();
  const rng = makeRng(511);

  // 侧舷窗（多层甲板）
  const winGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const mats = [];
  const rows = [0.055, 0.115, 0.175, 0.235];
  for (const vv of [0.02, 0.10, 0.90, 0.98]) { /* 顶部保留 */ }
  for (const u of [0.18, 0.28, 0.38, 0.48, 0.58, 0.68, 0.76]) {
    for (const band of [[0.03, 0.21], [0.79, 0.97]]) {
      mats.push(...windowBand(fn, {
        rows: [u], perRow: 9, vRange: band, size: [2.1, 1.25], lift: 0.25, seed: u * 100,
      }));
    }
  }
  // 顶部甲板窗
  for (const u of [0.22, 0.34, 0.46, 0.58]) {
    mats.push(...windowBand(fn, { rows: [u], perRow: 7, vRange: [0.30, 0.70], size: [2.1, 1.2], lift: 0.25, seed: 9 }));
  }
  const win = instancedFrom(winGeo, m.window, mats, 'eng-windows');
  const col = new THREE.Color();
  for (let i = 0; i < mats.length; i++) {
    const t = rng();
    if (t < 0.12) col.setRGB(0.04, 0.05, 0.07);
    else col.setHSL(0.09 + rng() * 0.04, 0.45, 0.5 + rng() * 0.35);
    win.setColorAt(i, col);
  }
  win.instanceColor.needsUpdate = true;
  g.add(win);

  // 相位炮列（背部与腹部纵向条带）
  const dorsal = surfaceBand(fn, 0.12, 0.62, {
    vRange: [0.22, 0.28], lift: 0.3, uSegs: 40, vSegs: 4, uvScale: [30, 1],
  });
  g.add(new THREE.Mesh(dorsal, m.phaser));
  const ventral = surfaceBand(fn, 0.14, 0.66, {
    vRange: [0.72, 0.78], lift: 0.3, uSegs: 40, vSegs: 4, uvScale: [30, 1],
  });
  g.add(new THREE.Mesh(ventral, m.phaser));

  // 救生艇舱门阵列
  const podGeo = new THREE.BoxGeometry(1, 0.2, 1).translate(0, 0.1, 0);
  const podMats = [];
  for (const u of [0.30, 0.42, 0.54]) {
    for (const band of [[0.06, 0.18], [0.82, 0.94]]) {
      podMats.push(...windowBand(fn, { rows: [u], perRow: 6, vRange: band, size: [3.4, 2.2], lift: 0.02, seed: 5 }));
    }
  }
  g.add(instancedFrom(podGeo, m.hull, podMats, 'eng-lifeboats'));

  // greeble：装甲板、散热器、管路、天线
  const kit = greebleKit();
  const builder = new InstanceBuilder();
  const mat4 = new THREE.Matrix4();
  const samples = scatterOnSurface(fn, {
    uRange: [0.05, 0.94], uCount: 26, vCount: 40, jitter: 0.95, density: 0.62, seed: 303,
  });
  for (const s of samples) {
    const k = s.rand;
    if (k < 0.38) {
      orientToNormal(mat4, s.position, s.normal, new THREE.Vector3(3 + k * 12, 0.35 + k, 2.4 + k * 7), k * 6.28);
      builder.add('plate', kit.plate, m.hullDark, mat4);
    } else if (k < 0.58) {
      orientToNormal(mat4, s.position, s.normal, new THREE.Vector3(2.0, 0.7 + k * 2.2, 2.0), k * 6.28);
      builder.add('hex', kit.hex, m.trim, mat4);
    } else if (k < 0.74) {
      orientToNormal(mat4, s.position, s.normal, new THREE.Vector3(1.3, 1.4 + k * 3, 1.3), 0);
      builder.add('cyl', kit.cyl, m.trim, mat4);
    } else if (k < 0.86) {
      orientToNormal(mat4, s.position, s.normal, new THREE.Vector3(6 + k * 8, 0.55, 1.5), k * 6.28);
      builder.add('slab', kit.slab, m.darkMetal, mat4);
    } else if (k < 0.95) {
      orientToNormal(mat4, s.position, s.normal, new THREE.Vector3(2.6, 0.5, 2.6), k * 6.28);
      builder.add('ring', kit.ring, m.trim, mat4);
    } else {
      orientToNormal(mat4, s.position, s.normal, new THREE.Vector3(1.1, 0.8, 1.1), 0);
      builder.add('dome', kit.dome, m.lightBlue, mat4);
    }
  }
  builder.build(g);

  // 牵引光束发射器（艇库上方）
  const tractor = new THREE.Mesh(new THREE.SphereGeometry(4.6, 24, 16), m.trim);
  tractor.position.set(0, -44, -295);
  g.add(tractor);
  const tractorLens = new THREE.Mesh(new THREE.SphereGeometry(3.1, 20, 14), m.lightBlue);
  tractorLens.position.set(0, -44.5, -297.6);
  g.add(tractorLens);

  // 舷号涂装
  const tex = decalTexture(['NCC-1701-D'], { w: 1024, h: 256, color: '#5a6069' });
  for (const sx of [-1, 1]) {
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(64, 16),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.8, toneMapped: false, color: 0x9aa0ab }),
    );
    const p = fn(0.42, sx > 0 ? 0.0 : 0.5);
    plane.position.copy(p).add(new THREE.Vector3(sx * 1.2, 6, 0));
    plane.rotation.y = sx > 0 ? Math.PI / 2 : -Math.PI / 2;
    g.add(plane);
  }
  return g;
}

export function buildEngineeringHull() {
  const m = materials();
  const group = new THREE.Group();
  group.name = 'engineering-hull';
  const fn = engineeringSurface();

  const hull = new THREE.Mesh(parametricSurface(fn, 132, 84, { uvScale: [7.5, 5.5] }), m.hullShell);
  hull.name = 'eng-hull';
  group.add(hull);

  // 前后封盖
  const nose = new THREE.Mesh(new THREE.SphereGeometry(16, 28, 18, 0, Math.PI * 2, 0, Math.PI / 2), m.hull);
  nose.rotation.x = Math.PI / 2;
  nose.scale.set(1, 1, 0.5);
  nose.position.set(0, -54, 34);
  group.add(nose);
  // 尾封板：按末端剖面外轮廓生成，中间挖出机库开口
  const outline = new THREE.Shape();
  const N = 72;
  for (let i = 0; i <= N; i++) {
    const p = fn(1, i / N);
    if (i === 0) outline.moveTo(p.x, p.y); else outline.lineTo(p.x, p.y);
  }
  const hole = new THREE.Path();
  hole.moveTo(-18, -69);
  hole.lineTo(18, -69);
  hole.lineTo(18, -49);
  hole.lineTo(-18, -49);
  hole.closePath();
  outline.holes.push(hole);
  const tail = new THREE.Mesh(new THREE.ShapeGeometry(outline, 6), m.hull);
  tail.position.z = -321;
  tail.rotation.y = Math.PI;
  group.add(tail);

  group.add(deflector(m));
  group.add(shuttlebayExterior(m));
  group.add(aftDrive(m));
  group.add(surfaceDetails(m));

  return { group, surface: fn };
}
