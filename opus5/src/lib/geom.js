import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const EPS = 1e-4;
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();

/** 解析法线：对参数曲面做有限差分，避免接缝处法线断裂。 */
export function surfaceNormal(fn, u, v, flip = false, target = new THREE.Vector3()) {
  const back = u > 0.5;
  const du = back ? -EPS : EPS;
  const dv = v > 0.5 ? -EPS : EPS;
  const p = fn(u, v);
  _a.copy(fn(u + du, v)).sub(p).multiplyScalar(back ? -1 : 1);
  _b.copy(fn(u, v + dv)).sub(p).multiplyScalar(dv < 0 ? -1 : 1);
  target.copy(_a).cross(_b);
  if (target.lengthSq() < 1e-16) {
    // 退化极点：沿远离极点的方向取两个更大的步长
    const step = back ? -0.004 : 0.004;
    _c.copy(fn(u + step, v)).sub(p);
    _b.copy(fn(u + step, v + 0.25)).sub(p);
    target.copy(_c).cross(_b).multiplyScalar(back ? -1 : 1);
  }
  target.normalize();
  if (!Number.isFinite(target.x) || !Number.isFinite(target.y) || !Number.isFinite(target.z)) {
    target.set(0, 1, 0);
  }
  if (flip) target.negate();
  return target;
}

/**
 * 通用参数曲面。fn(u, v) -> Vector3。
 * u/v ∈ [0,1]；若曲面在 v 上闭合，令 fn(u,1) === fn(u,0)。
 */
export function parametricSurface(fn, uSegs, vSegs, opts = {}) {
  const { flip = false, uvScale = [1, 1], uvOffset = [0, 0] } = opts;
  const uCount = uSegs + 1;
  const vCount = vSegs + 1;
  const positions = new Float32Array(uCount * vCount * 3);
  const normals = new Float32Array(uCount * vCount * 3);
  const uvs = new Float32Array(uCount * vCount * 2);
  const n = new THREE.Vector3();

  let pi = 0;
  let ui = 0;
  for (let i = 0; i < uCount; i++) {
    const u = i / uSegs;
    for (let j = 0; j < vCount; j++) {
      const v = j / vSegs;
      const p = fn(u, v);
      positions[pi] = p.x; positions[pi + 1] = p.y; positions[pi + 2] = p.z;
      surfaceNormal(fn, u, v, flip, n);
      normals[pi] = n.x; normals[pi + 1] = n.y; normals[pi + 2] = n.z;
      uvs[ui] = u * uvScale[0] + uvOffset[0];
      uvs[ui + 1] = v * uvScale[1] + uvOffset[1];
      pi += 3; ui += 2;
    }
  }

  const index = [];
  for (let i = 0; i < uSegs; i++) {
    for (let j = 0; j < vSegs; j++) {
      const a = i * vCount + j;
      const b = a + vCount;
      const c = b + 1;
      const d = a + 1;
      if (flip) index.push(a, d, b, b, d, c);
      else index.push(a, b, d, b, c, d);
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  g.setIndex(index);
  return g;
}

export function mergeAll(geometries) {
  const list = geometries.filter(Boolean);
  if (list.length === 1) return list[0];
  for (const g of list) {
    if (!g.getAttribute('normal')) g.computeVertexNormals();
    if (!g.getAttribute('uv')) {
      const c = g.getAttribute('position').count;
      g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(c * 2), 2));
    }
    g.deleteAttribute('tangent');
    g.deleteAttribute('color');
  }
  return mergeGeometries(list, false);
}

/** 平滑过渡工具。 */
export const smoothstep = (a, b, x) => {
  const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
export const mix = (a, b, t) => a + (b - a) * t;

/** 确定性伪随机，保证每次加载几何一致。 */
export function makeRng(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

/**
 * 从参数曲面上切出一条带状几何（相位炮列、涂装带、格栅等）。
 * lift 沿法线抬起，避免 z-fighting。
 */
export function surfaceBand(fn, u0, u1, {
  vRange = [0, 1], lift = 0.25, uSegs = 2, vSegs = 160, flip = false, uvScale = [1, 1],
} = {}) {
  const n = new THREE.Vector3();
  const band = (a, b) => {
    const u = mix(u0, u1, a);
    const v = mix(vRange[0], vRange[1], b);
    const p = fn(u, v).clone();
    surfaceNormal(fn, u, v, flip, n);
    return p.addScaledVector(n, lift);
  };
  return parametricSurface(band, uSegs, vSegs, { flip, uvScale });
}

/**
 * 非均匀 Catmull-Rom(Hermite) 纵剖面：points = [[t, r, y], ...]，t 递增。
 * 返回 (t) => {r, y}，C1 连续，保证解析法线平滑。
 */
export function profileCurve(points) {
  const ts = points.map((p) => p[0]);
  const rs = points.map((p) => p[1]);
  const ys = points.map((p) => p[2]);
  const n = points.length;
  const tang = (arr) => {
    const m = new Array(n);
    for (let i = 0; i < n; i++) {
      if (i === 0) m[i] = (arr[1] - arr[0]) / (ts[1] - ts[0]);
      else if (i === n - 1) m[i] = (arr[n - 1] - arr[n - 2]) / (ts[n - 1] - ts[n - 2]);
      else m[i] = (arr[i + 1] - arr[i - 1]) / (ts[i + 1] - ts[i - 1]);
    }
    return m;
  };
  const mr = tang(rs);
  const my = tang(ys);
  return (t) => {
    const x = THREE.MathUtils.clamp(t, ts[0], ts[n - 1]);
    let i = 0;
    while (i < n - 2 && ts[i + 1] < x) i++;
    const h = ts[i + 1] - ts[i];
    const s = (x - ts[i]) / h;
    const s2 = s * s;
    const s3 = s2 * s;
    const h00 = 2 * s3 - 3 * s2 + 1;
    const h10 = s3 - 2 * s2 + s;
    const h01 = -2 * s3 + 3 * s2;
    const h11 = s3 - s2;
    return {
      r: h00 * rs[i] + h10 * h * mr[i] + h01 * rs[i + 1] + h11 * h * mr[i + 1],
      y: h00 * ys[i] + h10 * h * my[i] + h01 * ys[i + 1] + h11 * h * my[i + 1],
    };
  };
}
