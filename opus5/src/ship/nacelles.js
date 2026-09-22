import * as THREE from 'three';
import { parametricSurface, surfaceBand, mix, makeRng } from '../lib/geom.js';
import { scatterOnSurface, orientToNormal, greebleKit, InstanceBuilder } from '../lib/greeble.js';
import { materials, bussardMaterial, warpGrilleMaterial } from '../materials/library.js';
import { decalTexture } from '../materials/textures.js';

export const NACELLE = { x: 97, y: 52, front: -112, back: -318 };

/** [z, 半宽, 半高, 中心y] */
const SECTIONS = [
  [-112, 4.0, 4.0, 52.0],
  [-118, 9.0, 9.0, 52.0],
  [-126, 13.0, 12.2, 52.3],
  [-140, 15.0, 13.4, 52.5],
  [-180, 15.2, 13.6, 52.4],
  [-230, 15.0, 13.3, 52.0],
  [-270, 14.4, 12.8, 51.6],
  [-300, 13.2, 11.6, 51.0],
  [-312, 11.4, 9.8, 50.6],
  [-318, 8.0, 7.0, 50.2],
];

function sectionAt(u) {
  const f = THREE.MathUtils.clamp(u, 0, 1) * (SECTIONS.length - 1);
  const i = Math.min(Math.floor(f), SECTIONS.length - 2);
  const t = f - i;
  const a = SECTIONS[i];
  const b = SECTIONS[i + 1];
  return { z: mix(a[0], b[0], t), w: mix(a[1], b[1], t), h: mix(a[2], b[2], t), cy: mix(a[3], b[3], t) };
}

const _p = new THREE.Vector3();
export function nacelleSurface(sx) {
  return (u, v) => {
    const s = sectionAt(u);
    const a = v * Math.PI * 2;
    const ct = Math.cos(a);
    const st = Math.sin(a);
    const e = 2.9;
    const x = Math.sign(ct) * Math.pow(Math.abs(ct), 2 / e) * s.w;
    const y = Math.sign(st) * Math.pow(Math.abs(st), 2 / e) * s.h;
    return _p.set(sx * NACELLE.x + x * sx, s.cy + y, s.z).clone();
  };
}

function bussardAssembly(m, sx) {
  const g = new THREE.Group();
  const z = -119;
  const cowl = new THREE.Mesh(
    new THREE.CylinderGeometry(13.6, 10.0, 9, 40, 1, true).rotateX(Math.PI / 2),
    m.hullDark,
  );
  cowl.position.set(sx * NACELLE.x, 52.2, z - 2);
  g.add(cowl);

  const lens = new THREE.Mesh(
    new THREE.SphereGeometry(12.4, 44, 26, 0, Math.PI * 2, 0, Math.PI * 0.46),
    bussardMaterial(),
  );
  lens.rotation.x = -Math.PI / 2;
  lens.scale.set(1, 1, 0.78);
  lens.position.set(sx * NACELLE.x, 52.2, z - 1);
  lens.name = 'bussard';
  g.add(lens);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(13.1, 1.15, 10, 44), m.trim);
  ring.position.set(sx * NACELLE.x, 52.2, z - 1.4);
  g.add(ring);

  const light = new THREE.PointLight(0xff5a22, 420, 150, 2);
  light.position.set(sx * NACELLE.x, 52.2, z + 4);
  g.add(light);

  // 进气栅格
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const v = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.0, 6.5), m.darkMetal);
    v.position.set(sx * NACELLE.x + Math.cos(a) * 12.4, 52.2 + Math.sin(a) * 12.4, z - 5);
    v.lookAt(sx * NACELLE.x, 52.2, z - 5);
    g.add(v);
  }
  return g;
}

function warpGrilles(m, sx) {
  const g = new THREE.Group();
  const len = 168;
  const cz = -218;
  for (const side of [-1, 1]) {
    const x = sx * NACELLE.x + side * 15.1 * sx;
    const housing = new THREE.Mesh(new THREE.BoxGeometry(1.6, 12.4, len), m.darkMetal);
    housing.position.set(x - side * sx * 0.9, 52.2, cz);
    g.add(housing);

    const grille = new THREE.Mesh(new THREE.PlaneGeometry(len, 9.4), warpGrilleMaterial());
    grille.rotation.y = side * sx > 0 ? Math.PI / 2 : -Math.PI / 2;
    grille.position.set(x + side * sx * 0.35, 52.2, cz);
    grille.name = 'warp-grille';
    g.add(grille);

    // 线圈分段肋：只做浅浅的分隔，别做成梳齿
    for (let i = 0; i <= 12; i++) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.9, 11.6, 0.55), m.trim);
      rib.position.set(x - side * sx * 0.25, 52.2, cz - len / 2 + (i / 12) * len);
      g.add(rib);
    }
  }
  const light = new THREE.PointLight(0x5590ff, 520, 190, 2);
  light.position.set(sx * NACELLE.x, 52.2, cz);
  g.add(light);
  return g;
}

function aftEmitter(m, sx) {
  const g = new THREE.Group();
  const z = -319.5;
  const plate = new THREE.Mesh(new THREE.CircleGeometry(7.4, 32), new THREE.MeshBasicMaterial({
    color: 0x4e7fc4, toneMapped: false,
  }));
  plate.rotation.y = Math.PI;
  plate.position.set(sx * NACELLE.x, 50.4, z);
  g.add(plate);
  const halo = new THREE.Mesh(new THREE.CircleGeometry(12, 32), new THREE.MeshBasicMaterial({
    color: 0x3f7fff, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
  }));
  halo.rotation.y = Math.PI;
  halo.position.set(sx * NACELLE.x, 50.4, z - 1.2);
  g.add(halo);
  return g;
}

export function buildNacelles() {
  const m = materials();
  const group = new THREE.Group();
  group.name = 'nacelles';
  const surfaces = [];
  const rng = makeRng(707);

  for (const sx of [-1, 1]) {
    const fn = nacelleSurface(sx);
    surfaces.push(fn);
    const body = new THREE.Mesh(parametricSurface(fn, 70, 60, { uvScale: [4.3, 2.0], flip: sx < 0 }), m.hullShell);
    body.name = `nacelle-${sx > 0 ? 'stbd' : 'port'}`;
    group.add(body);

    group.add(bussardAssembly(m, sx));
    group.add(warpGrilles(m, sx));
    group.add(aftEmitter(m, sx));

    // 顶部脊线与检修盖板
    group.add(new THREE.Mesh(
      surfaceBand(fn, 0.10, 0.96, { vRange: [0.235, 0.265], lift: 0.22, uSegs: 40, vSegs: 3, uvScale: [24, 1], flip: sx < 0 }),
      m.trim,
    ));

    const kit = greebleKit();
    const builder = new InstanceBuilder();
    const mat4 = new THREE.Matrix4();
    for (const s of scatterOnSurface(fn, { uRange: [0.12, 0.95], uCount: 16, vCount: 22, jitter: 0.9, density: 0.4, seed: 900 + sx, flip: sx < 0 })) {
      if (s.rand < 0.7) {
        orientToNormal(mat4, s.position, s.normal, new THREE.Vector3(2.5 + s.rand * 7, 0.28, 2 + s.rand * 4), s.rand * 6.28);
        builder.add('plate', kit.plate, m.hullDark, mat4);
      } else {
        orientToNormal(mat4, s.position, s.normal, new THREE.Vector3(1.4, 0.5 + s.rand, 1.4), 0);
        builder.add('hex', kit.hex, m.trim, mat4);
      }
    }
    builder.build(group);

    // 航行灯
    const navMat = sx > 0 ? m.lightGreen : m.lightRed;
    const nav = new THREE.Mesh(new THREE.SphereGeometry(1.5, 12, 10), navMat);
    nav.position.set(sx * (NACELLE.x + 15.6), 52.2, -150);
    nav.name = 'beacon:nav';
    group.add(nav);
    const strobe = new THREE.Mesh(new THREE.SphereGeometry(1.2, 12, 10), m.lightWhite);
    strobe.position.set(sx * NACELLE.x, 66.2, -200);
    strobe.name = 'beacon:strobe';
    group.add(strobe);

    // 外侧舷号
    const tex = decalTexture(['1701-D'], { w: 512, h: 256, color: '#5a6069' });
    const decal = new THREE.Mesh(new THREE.PlaneGeometry(34, 14), new THREE.MeshBasicMaterial({
      map: tex, transparent: true, depthWrite: false, opacity: 0.75, toneMapped: false, color: 0x9aa0ab,
    }));
    decal.position.set(sx * (NACELLE.x + 15.4), 58.5, -160);
    decal.rotation.y = sx > 0 ? Math.PI / 2 : -Math.PI / 2;
    group.add(decal);
  }
  return { group, surfaces };
}
