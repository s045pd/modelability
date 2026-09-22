import * as THREE from 'three';
import { surfaceNormal, makeRng } from './geom.js';

const UP = new THREE.Vector3(0, 1, 0);
const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _n = new THREE.Vector3();

/**
 * 把一堆同几何体的小结构收集成 InstancedMesh，保持 draw call 低。
 */
export class InstanceBuilder {
  constructor() {
    this.groups = new Map();
  }

  /** key 决定一个 InstancedMesh；matrix 会被拷贝。 */
  add(key, geometry, material, matrix) {
    let g = this.groups.get(key);
    if (!g) {
      g = { geometry, material, matrices: [] };
      this.groups.set(key, g);
    }
    g.matrices.push(matrix.clone());
    return this;
  }

  build(parent, { castShadow = false, receiveShadow = false } = {}) {
    const meshes = [];
    for (const [key, g] of this.groups) {
      if (!g.matrices.length) continue;
      const mesh = new THREE.InstancedMesh(g.geometry, g.material, g.matrices.length);
      mesh.name = `greeble:${key}`;
      for (let i = 0; i < g.matrices.length; i++) mesh.setMatrixAt(i, g.matrices[i]);
      mesh.instanceMatrix.needsUpdate = true;
      mesh.castShadow = castShadow;
      mesh.receiveShadow = receiveShadow;
      mesh.frustumCulled = false;
      parent.add(mesh);
      meshes.push(mesh);
    }
    return meshes;
  }
}

/** 生成把物体贴在曲面上的变换：几何体的 +Y 朝外法线。 */
export function orientToNormal(matrix, position, normal, scale, spin = 0, lift = 0) {
  _n.copy(normal).normalize();
  _q.setFromUnitVectors(UP, _n);
  _q2.setFromAxisAngle(UP, spin);
  _q.multiply(_q2);
  if (typeof scale === 'number') _s.set(scale, scale, scale);
  else _s.copy(scale);
  matrix.compose(
    new THREE.Vector3(
      position.x + _n.x * lift,
      position.y + _n.y * lift,
      position.z + _n.z * lift,
    ),
    _q,
    _s,
  );
  return matrix;
}

/**
 * 在参数曲面上按网格抖动散布采样点。
 * fn(u,v)->Vector3；返回 [{position, normal, u, v}]
 */
export function scatterOnSurface(fn, {
  uRange = [0, 1], vRange = [0, 1],
  uCount = 10, vCount = 40,
  jitter = 0.4, density = 1, seed = 7, flip = false,
  mask = null,
} = {}) {
  const rng = makeRng(seed);
  const out = [];
  for (let i = 0; i < uCount; i++) {
    for (let j = 0; j < vCount; j++) {
      if (rng() > density) continue;
      const u = THREE.MathUtils.lerp(uRange[0], uRange[1], (i + 0.5 + (rng() - 0.5) * jitter) / uCount);
      const v = THREE.MathUtils.lerp(vRange[0], vRange[1], (j + 0.5 + (rng() - 0.5) * jitter) / vCount);
      const uu = THREE.MathUtils.clamp(u, 0.001, 0.999);
      const vv = ((v % 1) + 1) % 1;
      if (mask && !mask(uu, vv)) continue;
      const position = fn(uu, vv).clone();
      const normal = surfaceNormal(fn, uu, vv, flip).clone();
      out.push({ position, normal, u: uu, v: vv, rand: rng() });
    }
  }
  return out;
}

/** 常用 greeble 原型：底面在 y=0，向 +Y 生长。 */
export function greebleKit() {
  const box = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const slab = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const cyl = new THREE.CylinderGeometry(0.5, 0.5, 1, 10).translate(0, 0.5, 0);
  const hex = new THREE.CylinderGeometry(0.5, 0.5, 1, 6).translate(0, 0.5, 0);
  const dome = new THREE.SphereGeometry(0.5, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  const cone = new THREE.CylinderGeometry(0.22, 0.5, 1, 8).translate(0, 0.5, 0);
  const ring = new THREE.TorusGeometry(0.45, 0.1, 6, 14).rotateX(Math.PI / 2).translate(0, 0.12, 0);
  const plate = new THREE.BoxGeometry(1, 0.12, 1).translate(0, 0.06, 0);
  return { box, slab, cyl, hex, dome, cone, ring, plate };
}

/**
 * 在曲面上铺一圈窗：返回 InstancedMesh 用的矩阵数组。
 * rows: 沿 u 的位置列表；perRow: 每行窗户数量
 */
export function windowBand(fn, {
  rows = [0.5], perRow = 60, vRange = [0, 1], size = [1.6, 0.9],
  lift = 0.06, flip = false, skip = null, seed = 11,
} = {}) {
  const rng = makeRng(seed);
  const mats = [];
  const m = new THREE.Matrix4();
  for (const u of rows) {
    for (let k = 0; k < perRow; k++) {
      const v = THREE.MathUtils.lerp(vRange[0], vRange[1], (k + 0.5) / perRow);
      const vv = ((v % 1) + 1) % 1;
      if (skip && skip(vv, u)) continue;
      const p = fn(u, vv);
      const n = surfaceNormal(fn, u, vv, flip);
      // 让窗户的长边沿 v 方向（周向）
      const tangent = fn(u, (vv + 0.002) % 1).clone().sub(p).normalize();
      const bitan = new THREE.Vector3().crossVectors(n, tangent).normalize();
      const basis = new THREE.Matrix4().makeBasis(tangent, n, bitan);
      const q = new THREE.Quaternion().setFromRotationMatrix(basis);
      const jitter = 0.85 + rng() * 0.3;
      m.compose(
        new THREE.Vector3(p.x + n.x * lift, p.y + n.y * lift, p.z + n.z * lift),
        q,
        new THREE.Vector3(size[0] * jitter, 1, size[1]),
      );
      mats.push(m.clone());
    }
  }
  return mats;
}

/** 由矩阵数组直接构造 InstancedMesh。 */
export function instancedFrom(geometry, material, matrices, name = 'instances') {
  const mesh = new THREE.InstancedMesh(geometry, material, matrices.length);
  for (let i = 0; i < matrices.length; i++) mesh.setMatrixAt(i, matrices[i]);
  mesh.instanceMatrix.needsUpdate = true;
  mesh.frustumCulled = false;
  mesh.name = name;
  return mesh;
}
