import * as THREE from 'three';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// 沿 Y 轴车削。points: [r, y, crease?]；约定“行进方向的右手侧”为外侧法线
export function latheGeo(points, segments = 96, opts = {}) {
  const { phiStart = 0, phiLength = Math.PI * 2 } = opts;
  const n = points.length;
  const segN = [];
  for (let i = 0; i < n - 1; i++) {
    const dr = points[i + 1][0] - points[i][0];
    const dy = points[i + 1][1] - points[i][1];
    const l = Math.hypot(dr, dy) || 1;
    segN.push([dy / l, -dr / l]);
  }
  const rows = [];
  let acc = 0;
  for (let i = 0; i < n; i++) {
    if (i > 0) acc += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
    const p = points[i];
    const prev = segN[i - 1];
    const next = segN[i];
    if (!prev || !next || p[2]) {
      if (prev) rows.push({ r: p[0], y: p[1], n: prev, v: acc });
      if (next) rows.push({ r: p[0], y: p[1], n: next, v: acc, breakBefore: !!prev });
    } else {
      let nr = prev[0] + next[0];
      let ny = prev[1] + next[1];
      const l = Math.hypot(nr, ny) || 1;
      rows.push({ r: p[0], y: p[1], n: [nr / l, ny / l], v: acc });
    }
  }
  const pos = [], nor = [], uv = [], idx = [];
  const cols = segments + 1;
  for (const row of rows) {
    for (let k = 0; k < cols; k++) {
      const phi = phiStart + (k / segments) * phiLength;
      const s = Math.sin(phi), c = Math.cos(phi);
      pos.push(row.r * s, row.y, row.r * c);
      nor.push(row.n[0] * s, row.n[1], row.n[0] * c);
      uv.push(k / segments, row.v);
    }
  }
  const flip = latheFlip(rows, pos, nor, cols);
  for (let j = 0; j < rows.length - 1; j++) {
    if (rows[j + 1].breakBefore) continue;
    for (let k = 0; k < segments; k++) {
      const a = j * cols + k, b = a + 1, c = (j + 1) * cols + k, d = c + 1;
      if (flip) idx.push(a, b, c, b, d, c);
      else idx.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

function latheFlip(rows, pos, nor, cols) {
  for (let j = 0; j < rows.length - 1; j++) {
    if (rows[j + 1].breakBefore) continue;
    const a = j * cols, c = (j + 1) * cols, b = a + 1;
    const pa = V(pos[a * 3], pos[a * 3 + 1], pos[a * 3 + 2]);
    const pb = V(pos[b * 3], pos[b * 3 + 1], pos[b * 3 + 2]);
    const pc = V(pos[c * 3], pos[c * 3 + 1], pos[c * 3 + 2]);
    const cr = pb.clone().sub(pa).cross(pc.clone().sub(pa));
    if (cr.lengthSq() < 1e-12) continue;
    const nrm = V(nor[a * 3], nor[a * 3 + 1], nor[a * 3 + 2]);
    return cr.dot(nrm) > 0; // (a,b,c) 已朝外则 flip=true
  }
  return false;
}

// 超椭圆截面：|x/a|^p+|y/b|^p=1
export function superSection(center, axU, axV, a, b, p = 3, m = 48, phase = 0) {
  const pts = [];
  const e = 2 / p;
  for (let i = 0; i < m; i++) {
    const t = phase + (i / m) * Math.PI * 2;
    const c = Math.cos(t), s = Math.sin(t);
    const x = a * Math.sign(c) * Math.pow(Math.abs(c), e);
    const y = b * Math.sign(s) * Math.pow(Math.abs(s), e);
    pts.push(center.clone().addScaledVector(axU, x).addScaledVector(axV, y));
  }
  return pts;
}

// 放样：sections 为等点数闭合环数组
export function loftGeo(sections, { capStart = true, capEnd = true } = {}) {
  const S = sections.length, M = sections[0].length;
  const pos = [], uv = [], idx = [];
  for (let s = 0; s < S; s++) {
    for (let i = 0; i <= M; i++) {
      const p = sections[s][i % M];
      pos.push(p.x, p.y, p.z);
      uv.push(i / M, s / (S - 1));
    }
  }
  const cols = M + 1;
  const tri = (a, b, c) => idx.push(a, b, c);
  for (let s = 0; s < S - 1; s++) {
    for (let i = 0; i < M; i++) {
      const a = s * cols + i, b = a + 1, c = (s + 1) * cols + i, d = c + 1;
      tri(a, c, b); tri(b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  // 若法线朝内则整体翻转
  const centroid = sections[Math.floor(S / 2)].reduce((acc, p) => acc.add(p), V(0, 0, 0)).divideScalar(M);
  const s0 = Math.floor(S / 2), i0 = 0;
  const vi = s0 * cols + i0;
  const nrm = V(g.attributes.normal.getX(vi), g.attributes.normal.getY(vi), g.attributes.normal.getZ(vi));
  const out = sections[s0][i0].clone().sub(centroid);
  let geo = g;
  if (nrm.dot(out) < 0) {
    const ix = g.index.array;
    for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; }
    g.computeVertexNormals();
  }
  const parts = [geo];
  const cap = (sec, dirSign) => {
    const c = sec.reduce((acc, p) => acc.add(p), V(0, 0, 0)).divideScalar(M);
    const cg = new THREE.BufferGeometry();
    const cp = [c.x, c.y, c.z];
    for (const p of sec) cp.push(p.x, p.y, p.z);
    const ci = [];
    for (let i = 0; i < M; i++) ci.push(0, 1 + i, 1 + ((i + 1) % M));
    cg.setAttribute('position', new THREE.Float32BufferAttribute(cp, 3));
    cg.setIndex(ci);
    cg.computeVertexNormals();
    const want = c.clone().sub(centroid).multiplyScalar(dirSign);
    const n0 = V(cg.attributes.normal.getX(0), cg.attributes.normal.getY(0), cg.attributes.normal.getZ(0));
    if (n0.dot(want) < 0) {
      const ix = cg.index.array;
      for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; }
      cg.computeVertexNormals();
    }
    const uvs = new Float32Array((M + 1) * 2);
    cg.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    return cg;
  };
  if (capStart) parts.push(cap(sections[0], 1));
  if (capEnd) parts.push(cap(sections[S - 1], 1));
  return parts.length === 1 ? geo : mergeSimple(parts);
}

function mergeSimple(list) {
  let total = 0, itotal = 0;
  for (const g of list) { total += g.attributes.position.count; itotal += g.index.count; }
  const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), uv = new Float32Array(total * 2);
  const idx = new Uint32Array(itotal);
  let vo = 0, io = 0;
  for (const g of list) {
    pos.set(g.attributes.position.array, vo * 3);
    nor.set(g.attributes.normal.array, vo * 3);
    uv.set(g.attributes.uv.array, vo * 2);
    const ix = g.index.array;
    for (let i = 0; i < ix.length; i++) idx[io + i] = ix[i] + vo;
    vo += g.attributes.position.count; io += ix.length;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  return out;
}

// 由二维折线 [r,y] 取样：单调 r 的线性插值
export function makeProfileLookup(samples) {
  return {
    y(r) {
      if (r <= samples[0][0]) return samples[0][1];
      for (let i = 1; i < samples.length; i++) {
        if (r <= samples[i][0]) {
          const t = (r - samples[i - 1][0]) / (samples[i][0] - samples[i - 1][0] || 1);
          return samples[i - 1][1] + (samples[i][1] - samples[i - 1][1]) * t;
        }
      }
      return samples[samples.length - 1][1];
    },
    slope(r) {
      const d = 0.4;
      return (this.y(r + d) - this.y(r - d)) / (2 * d);
    },
  };
}

export function smoothCurve(ctl, n = 120) {
  const curve = new THREE.SplineCurve(ctl.map((p) => new THREE.Vector2(p[0], p[1])));
  return curve.getSpacedPoints(n).map((p) => [p.x, p.y]);
}
